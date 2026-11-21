#!/usr/bin/env bash
# ==============================================================================
# AtlasWanders Production Database Migration Utility
# Target Host: Ubuntu VM (atlaswanders-virtual-machine / 192.168.122.225)
#
# Canonical Production Migration Execution:
#   - Command: npx prisma migrate deploy
#   - Runs in isolated runner container attached to 'atlaswanders_default'
#   - Uses production DATABASE_URL loaded directly from SECRETS_FILE
#   - Runs strictly ONCE per deployment before any backend container is replaced
#   - Creates an automated pre-migration PostgreSQL backup via pg_dump
#   - Exits with exact error code on failure to block unsafe service rollout
#
# Usage:
#   ./migrate.sh             # Creates backup & applies pending migrations
#   ./migrate.sh --status    # Checks migration status without modifying DB
#   ./migrate.sh --backup    # Takes pre-migration database snapshot only
#   ./migrate.sh --restore <file> # Restores a specific database snapshot
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# 1. Configuration & Paths
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
SECRETS_FILE="${SECRETS_FILE:-/etc/atlaswanders/backend.env}"

# Determine backup directory (prefer dedicated data disk on /srv/atlaswanders-data)
if [ -d "/srv/atlaswanders-data/backups" ] && [ -w "/srv/atlaswanders-data/backups" ]; then
  BACKUP_DIR="/srv/atlaswanders-data/backups/db"
elif [ -d "/srv/atlaswanders-data" ] && [ -w "/srv/atlaswanders-data" ]; then
  BACKUP_DIR="/srv/atlaswanders-data/backups/db"
else
  BACKUP_DIR="${BACKEND_DIR}/backups/db"
fi

LOCK_FILE="/tmp/atlaswanders-deploy.lock"
DOCKER_NETWORK="atlaswanders_default"
POSTGRES_CONTAINER="atlaswanders-postgres18"
COMMIT_SHA="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo 'manual')}"

ACTION_MODE="${1:-deploy}"
RESTORE_TARGET="${2:-}"

# Logging helpers
log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
log_err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# ------------------------------------------------------------------------------
# 2. Concurrency Serialization (flock)
# ------------------------------------------------------------------------------
if [ "${ATLASWANDERS_DEPLOY_LOCK_HELD:-0}" = "1" ]; then
  # Already held by calling deploy.sh
  :
else
  exec 200>"${LOCK_FILE}"
  if ! flock -n 200; then
    log_err "Another deployment or migration is currently running (lock held on ${LOCK_FILE})."
    log_err "Aborting to prevent concurrent migration conflicts."
    exit 1
  fi
  log_ok "Exclusive migration lock acquired on ${LOCK_FILE}."
fi

# ------------------------------------------------------------------------------
# 3. Pre-Flight Validation
# ------------------------------------------------------------------------------
echo "===================================================================="
echo " AtlasWanders Production Prisma Migration Pipeline"
echo " Mode:        ${ACTION_MODE}"
echo " Host:        $(hostname 2>/dev/null || echo 'atlaswanders-vm')"
echo " Commit:      ${COMMIT_SHA:0:12}"
echo " Timestamp:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# Check Docker CLI
if ! command -v docker >/dev/null 2>&1; then
  log_err "Docker CLI is required for containerized migration execution."
  exit 1
fi

# Check Docker daemon connectivity with timeout
if ! timeout 5 docker info >/dev/null 2>&1; then
  log_err "Cannot communicate with Docker daemon within 5s. Verify daemon status."
  exit 1
fi

# Verify PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}\$"; then
  log_err "PREFLIGHT ERROR: Container '${POSTGRES_CONTAINER}' is NOT running!"
  log_err "PostgreSQL database is required for migrations. Aborting to protect data integrity."
  exit 1
fi
log_ok "PostgreSQL container (${POSTGRES_CONTAINER}) is active."

# Verify production environment secrets file exists and is readable
if [ ! -f "${SECRETS_FILE}" ] || [ ! -r "${SECRETS_FILE}" ]; then
  log_err "Production secrets file missing or unreadable at: ${SECRETS_FILE}"
  log_err "Migration blocked: production credentials are required."
  exit 1
fi
log_ok "Production secrets file verified at: ${SECRETS_FILE}"

# Verify Prisma schema exists
if [ ! -d "${BACKEND_DIR}/prisma" ] || [ ! -f "${BACKEND_DIR}/prisma/schema.prisma" ]; then
  log_err "Prisma schema directory not found at: ${BACKEND_DIR}/prisma"
  exit 1
fi
log_ok "Prisma schema directory verified at: ${BACKEND_DIR}/prisma"

# ------------------------------------------------------------------------------
# 4. Determine Migration Runner Image
# ------------------------------------------------------------------------------
RUNNER_IMAGE=""
if docker image inspect "atlaswanders-backend:${COMMIT_SHA}" >/dev/null 2>&1; then
  RUNNER_IMAGE="atlaswanders-backend:${COMMIT_SHA}"
elif docker image inspect "atlaswanders-backend:latest" >/dev/null 2>&1; then
  RUNNER_IMAGE="atlaswanders-backend:latest"
fi

if [ -z "${RUNNER_IMAGE}" ]; then
  log_err "No backend image found (atlaswanders-backend:${COMMIT_SHA} or :latest)."
  log_err "Please build backend image first before running migrations."
  exit 1
fi
log_ok "Migration runner image: ${RUNNER_IMAGE}"

# ------------------------------------------------------------------------------
# 5. Extract Database Credentials for Backup & Reachability
# ------------------------------------------------------------------------------
get_db_credentials() {
  local db_url
  db_url=$(grep -E '^[[:space:]]*DATABASE_URL=' "${SECRETS_FILE}" 2>/dev/null | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")

  DB_USER=""
  DB_PASS=""
  DB_NAME=""

  if [ -n "${db_url}" ]; then
    DB_USER=$(echo "${db_url}" | sed -E 's|^.*://([^:@]+).*$|\1|' 2>/dev/null || echo "")
    if echo "${db_url}" | grep -q '://[^:@]*:[^@]*@'; then
      DB_PASS=$(echo "${db_url}" | sed -E 's|^.*://[^:@]*:([^@]+)@.*$|\1|' 2>/dev/null || echo "")
      if [ -n "${DB_PASS}" ] && command -v python3 >/dev/null 2>&1; then
        DB_PASS=$(python3 -c "import urllib.parse, sys; print(urllib.parse.unquote(sys.argv[1]))" "${DB_PASS}" 2>/dev/null || echo "${DB_PASS}")
      fi
    fi
    DB_NAME=$(echo "${db_url}" | sed -E 's|^.*://[^/]+/([^?]+).*$|\1|' 2>/dev/null || echo "")
  fi

  # Fallback to container environment
  if [ -z "${DB_USER}" ] || [ "${DB_USER}" = "${db_url}" ]; then
    DB_USER=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${POSTGRES_CONTAINER}" 2>/dev/null | grep -E '^POSTGRES_USER=' | cut -d= -f2)
  fi
  if [ -z "${DB_PASS}" ]; then
    DB_PASS=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${POSTGRES_CONTAINER}" 2>/dev/null | grep -E '^POSTGRES_PASSWORD=' | cut -d= -f2)
  fi
  if [ -z "${DB_NAME}" ] || [ "${DB_NAME}" = "${db_url}" ]; then
    DB_NAME=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${POSTGRES_CONTAINER}" 2>/dev/null | grep -E '^POSTGRES_DB=' | cut -d= -f2)
  fi

  DB_USER="${DB_USER:-atlaswanders}"
  DB_NAME="${DB_NAME:-atlaswanders}"
}

# Verify database reachability
get_db_credentials
log_info "Verifying PostgreSQL reachability on '${POSTGRES_CONTAINER}'..."
if ! docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
  if ! docker exec -i "${POSTGRES_CONTAINER}" pg_isready >/dev/null 2>&1; then
    log_err "PREFLIGHT ERROR: PostgreSQL database is NOT accepting connections (pg_isready failed)!"
    log_err "Database reachability check failed. Migration aborted to protect production data."
    exit 1
  fi
fi
log_ok "PostgreSQL database is reachable and accepting connections."

# ------------------------------------------------------------------------------
# 6. Pre-Migration Database Snapshot (Safety Requirement)
# ------------------------------------------------------------------------------
create_pre_migration_backup() {
  log_info "Creating automated pre-migration database snapshot..."
  mkdir -p "${BACKUP_DIR}"

  get_db_credentials

  local backup_ts
  backup_ts="$(date -u '+%Y%m%d%H%M%S')"
  local backup_file="${BACKUP_DIR}/atlaswanders-pre-migrate-${COMMIT_SHA:0:7}-${backup_ts}.dump"

  log_info "Dumping PostgreSQL database '${DB_NAME}' (User: ${DB_USER}) using custom archive format (-Fc)..."

  local dump_err_msg=""
  if ! dump_err_msg=$(docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc 2>&1 > "${backup_file}"); then
    log_warn "pg_dump with user '${DB_USER}' failed. Retrying with default postgres user..."
    if ! dump_err_msg=$(docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_dump -U postgres -d "${DB_NAME}" -Fc 2>&1 > "${backup_file}"); then
      log_err "CRITICAL: Database snapshot failed! Error: ${dump_err_msg}"
      rm -f "${backup_file}"
      return 1
    fi
  fi

  if [ ! -s "${backup_file}" ] || [ "$(wc -c < "${backup_file}")" -lt 1024 ]; then
    log_err "CRITICAL: Backup file ${backup_file} is empty or invalid (< 1KB)! Aborting migration."
    rm -f "${backup_file}"
    return 1
  fi

  # Validate backup archive integrity using pg_restore --list
  log_info "Validating backup archive integrity with pg_restore..."
  local restore_output=""
  local restore_exit_code=0
  restore_output=$(docker exec -i "${POSTGRES_CONTAINER}" pg_restore --list < "${backup_file}" 2>&1) || restore_exit_code=$?

  if [ "${restore_exit_code}" -ne 0 ]; then
    log_err "CRITICAL: pg_restore failed to read backup TOC (exit code: ${restore_exit_code})! Archive corrupted."
    rm -f "${backup_file}"
    return 1
  fi

  local toc_count=0
  if [ -n "${restore_output}" ]; then
    toc_count=$(echo "${restore_output}" | { grep -E '(^|[0-9]+;.*[[:space:]])(TABLE|INDEX|SEQUENCE|TABLE DATA)([[:space:]]|$)' || true; } | wc -l)
    toc_count=$(( toc_count + 0 )) 2>/dev/null || toc_count=0
  fi

  if [ "${toc_count}" -eq 0 ]; then
    log_err "CRITICAL: Backup archive TOC contains 0 schema objects! Aborting migration."
    rm -f "${backup_file}"
    return 1
  fi

  local backup_size_kb
  backup_size_kb=$(( $(wc -c < "${backup_file}") / 1024 ))
  log_ok "Pre-migration database snapshot verified: ${backup_file} (${backup_size_kb} KB, ${toc_count} objects verified)"

  # Record latest backup file path for possible rollback
  echo "${backup_file}" > "${BACKUP_DIR}/latest_pre_migrate_backup.txt"

  # Prune snapshots keeping the 5 most recent
  local old_backups
  old_backups=$(ls -t "${BACKUP_DIR}"/atlaswanders-pre-migrate-* 2>/dev/null | tail -n +6 || echo "")
  if [ -n "${old_backups}" ]; then
    for ob in ${old_backups}; do
      log_info "Pruning old database snapshot: $(basename "${ob}")"
      rm -f "${ob}" 2>/dev/null || true
    done
  fi

  return 0
}

# ------------------------------------------------------------------------------
# 7. Restore Database Snapshot Mode (--restore <file>)
# ------------------------------------------------------------------------------
restore_database_snapshot() {
  local target_file="${1}"
  if [ -z "${target_file}" ] && [ -f "${BACKUP_DIR}/latest_pre_migrate_backup.txt" ]; then
    target_file=$(cat "${BACKUP_DIR}/latest_pre_migrate_backup.txt")
  fi

  if [ ! -f "${target_file}" ]; then
    log_err "Backup file for restore does not exist: ${target_file}"
    return 1
  fi

  get_db_credentials
  log_warn "===================================================================="
  log_warn " RESTORING DATABASE FROM SNAPSHOT: ${target_file}"
  log_warn " Target Database: ${DB_NAME}"
  log_warn "===================================================================="

  local restore_err=""
  if ! restore_err=$(docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_restore --clean --if-exists -U "${DB_USER}" -d "${DB_NAME}" < "${target_file}" 2>&1); then
    log_warn "pg_restore finished with warnings/errors: ${restore_err}"
  fi

  log_ok "Database snapshot restoration completed from ${target_file}"
  return 0
}

# ------------------------------------------------------------------------------
# 8. Dispatch Action Modes
# ------------------------------------------------------------------------------
if [ "${ACTION_MODE}" = "--restore" ]; then
  restore_database_snapshot "${RESTORE_TARGET}"
  exit $?
fi

if [ "${ACTION_MODE}" = "--status" ] || [ "${ACTION_MODE}" = "-s" ]; then
  echo "--------------------------------------------------------------------"
  log_info "Checking production Prisma migration status..."

  docker run --rm \
    --name "atlaswanders-migrate-status-${COMMIT_SHA:0:7}" \
    --network "${DOCKER_NETWORK}" \
    --env-file "${SECRETS_FILE}" \
    -v "${BACKEND_DIR}/prisma:/app/prisma:ro" \
    "${RUNNER_IMAGE}" \
    npx prisma migrate status

  exit $?
fi

if [ "${ACTION_MODE}" = "--backup" ] || [ "${ACTION_MODE}" = "-b" ]; then
  create_pre_migration_backup
  exit $?
fi

# ------------------------------------------------------------------------------
# 9. Execute Production Migration
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Starting Production Migration Workflow"
echo "--------------------------------------------------------------------"

# Step 1: Create safety snapshot before running any DDL
if ! create_pre_migration_backup; then
  log_err "CRITICAL: Pre-migration database snapshot failed! Aborting migration to protect data integrity."
  exit 1
fi

# Step 2: Execute npx prisma migrate deploy
echo ""
log_info "Executing migration command: npx prisma migrate deploy"
log_info "Runner container: ${RUNNER_IMAGE} on network ${DOCKER_NETWORK}"
echo "--------------------------------------------------------------------"

mkdir -p "${BACKUP_DIR}"
MIGRATE_LOG_FILE="${BACKUP_DIR}/atlaswanders-migrate-${COMMIT_SHA:0:7}-$(date -u '+%Y%m%d%H%M%S').log"
MIGRATE_START_TIME=$(date +%s)
MIGRATE_EXIT_CODE=0

docker run --rm \
  --name "atlaswanders-vm-migrate-${COMMIT_SHA:0:7}-$(date +%s)" \
  --network "${DOCKER_NETWORK}" \
  --env-file "${SECRETS_FILE}" \
  -v "${BACKEND_DIR}/prisma:/app/prisma:ro" \
  "${RUNNER_IMAGE}" \
  npx prisma migrate deploy 2>&1 | tee "${MIGRATE_LOG_FILE}"
MIGRATE_EXIT_CODE=${PIPESTATUS[0]}

MIGRATE_END_TIME=$(date +%s)
MIGRATE_DURATION=$(( MIGRATE_END_TIME - MIGRATE_START_TIME ))

echo "--------------------------------------------------------------------"

# Step 3: Handle Migration Result
if [ "${MIGRATE_EXIT_CODE}" -ne 0 ]; then
  echo ""
  log_err "===================================================================="
  log_err "CRITICAL FAILURE: Prisma migration failed with exit code ${MIGRATE_EXIT_CODE}!"
  log_err "Execution duration: ${MIGRATE_DURATION}s"
  log_err "Migration log retained at: ${MIGRATE_LOG_FILE}"
  log_err "Production database migration failed. DEPLOYMENT IS BLOCKED."
  log_err "Existing application container has NOT been touched."
  log_err "Snapshot available at: $(cat "${BACKUP_DIR}/latest_pre_migrate_backup.txt" 2>/dev/null || echo 'N/A')"
  echo "--------------------------------------------------------------------"
  log_err "DIAGNOSTIC DETAILS:"

  # 1. Extract Prisma Error Code
  PRISMA_ERR_CODE=$(grep -oE 'P[0-9]{4}' "${MIGRATE_LOG_FILE}" 2>/dev/null | head -n1 || echo "")
  if [ -n "${PRISMA_ERR_CODE}" ]; then
    log_err "  Prisma Error Code:     ${PRISMA_ERR_CODE}"
  fi

  # 2. Extract Failing Migration Name
  FAILED_MIGRATION=$(grep -oE '[0-9]{14}_[a-zA-Z0-9_-]+' "${MIGRATE_LOG_FILE}" 2>/dev/null | head -n1 || echo "")
  if [ -z "${FAILED_MIGRATION}" ]; then
    get_db_credentials
    FAILED_MIGRATION=$(docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at DESC LIMIT 1;" 2>/dev/null || echo "")
  fi
  if [ -n "${FAILED_MIGRATION}" ]; then
    log_err "  Failed Migration:      ${FAILED_MIGRATION}"
  fi

  # 3. Extract PostgreSQL Error / Database Error Code
  PG_ERR_CODE=$(grep -oE 'Database error code: [0-9A-Za-z]+' "${MIGRATE_LOG_FILE}" 2>/dev/null | head -n1 || echo "")
  if [ -n "${PG_ERR_CODE}" ]; then
    log_err "  PostgreSQL Error Code: ${PG_ERR_CODE#Database error code: }"
  fi

  PG_ERR_LINE=$(grep -E '(Database error: ERROR:|ERROR: )' "${MIGRATE_LOG_FILE}" 2>/dev/null | head -n2 | sed 's/^[[:space:]]*//' || echo "")
  if [ -n "${PG_ERR_LINE}" ]; then
    log_err "  PostgreSQL Message:    ${PG_ERR_LINE}"
  fi

  # 4. Extract Primary Prisma Error Message
  PRISMA_MSG=$(grep -A 2 -E 'Error: P[0-9]{4}' "${MIGRATE_LOG_FILE}" 2>/dev/null | head -n3 | sed 's/^[[:space:]]*//' || echo "")
  if [ -n "${PRISMA_MSG}" ]; then
    log_err "  Prisma Message:        ${PRISMA_MSG}"
  fi

  echo "--------------------------------------------------------------------"
  log_err "REMEDIATION GUIDANCE:"
  if [ "${PRISMA_ERR_CODE}" = "P3009" ]; then
    log_err "  1. A previous migration run failed and left an unfinished record in _prisma_migrations."
    log_err "  2. Fix the SQL statement in backend/prisma/migrations/${FAILED_MIGRATION}/migration.sql to be idempotent."
    log_err "  3. Mark the failed migration as rolled back via:"
    log_err "     docker exec atlaswanders-backend npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}"
    log_err "  4. Re-run deployment or migrate deploy."
  elif [ "${PRISMA_ERR_CODE}" = "P3018" ]; then
    log_err "  1. A migration statement failed against PostgreSQL (e.g. syntax error or duplicate object)."
    log_err "  2. Review the SQL in backend/prisma/migrations/${FAILED_MIGRATION}/migration.sql."
    log_err "  3. Use IF NOT EXISTS / IF EXISTS guards for DDL statements."
    log_err "  4. Resolve the migration with 'prisma migrate resolve --rolled-back ${FAILED_MIGRATION}' and re-deploy."
  else
    log_err "  Review the full retained log at: ${MIGRATE_LOG_FILE}"
    log_err "  To restore pre-migration database snapshot, run:"
    log_err "  ./backend/scripts/migrate.sh --restore $(cat "${BACKUP_DIR}/latest_pre_migrate_backup.txt" 2>/dev/null || echo '<backup_file>')"
  fi
  log_err "===================================================================="
  exit "${MIGRATE_EXIT_CODE}"
fi

log_ok "Prisma production migrations deployed successfully in ${MIGRATE_DURATION}s."
log_ok "Migration log retained at: ${MIGRATE_LOG_FILE}"

# Step 4: Verify Migration Status
echo ""
log_info "Verifying database migration status..."
STATUS_EXIT_CODE=0
docker run --rm \
  --name "atlaswanders-vm-migrate-verify-${COMMIT_SHA:0:7}" \
  --network "${DOCKER_NETWORK}" \
  --env-file "${SECRETS_FILE}" \
  -v "${BACKEND_DIR}/prisma:/app/prisma:ro" \
  "${RUNNER_IMAGE}" \
  npx prisma migrate status || STATUS_EXIT_CODE=$?

if [ "${STATUS_EXIT_CODE}" -ne 0 ]; then
  log_err "CRITICAL: Migration status check returned non-zero code (${STATUS_EXIT_CODE})!"
  log_err "Database migration status verification failed. DEPLOYMENT IS BLOCKED."
  exit "${STATUS_EXIT_CODE}"
fi

echo "===================================================================="
log_ok "Production database schema is fully up to date and verified."
echo "===================================================================="
exit 0
