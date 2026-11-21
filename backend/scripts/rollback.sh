#!/usr/bin/env bash
# ==============================================================================
# AtlasWanders Production Rollback Utility
# Target Host: Ubuntu VM (atlaswanders-virtual-machine / 192.168.122.225)
#
# Usage:
#   ./rollback.sh                     # Restores backend from atlaswanders-backend:previous
#   ./rollback.sh <IMAGE_TAG_OR_SHA>  # Restores backend using a specific tag
#   ./rollback.sh --list              # Lists available recovery images and DB backups
#   ./rollback.sh --db [BACKUP_FILE]  # Restores database from latest or specified backup
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# 1. Configuration & Paths
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
COMPOSE_FILE="${BACKEND_DIR}/compose.vm.yml"
SECRETS_FILE="${SECRETS_FILE:-/etc/atlaswanders/backend.env}"

if [ -d "/srv/atlaswanders-data/backups/db" ]; then
  BACKUP_DIR="/srv/atlaswanders-data/backups/db"
elif [ -d "/srv/atlaswanders-data/backups" ]; then
  BACKUP_DIR="/srv/atlaswanders-data/backups/db"
else
  BACKUP_DIR="${BACKEND_DIR}/backups/db"
fi

LOCK_FILE="/tmp/atlaswanders-deploy.lock"
DOCKER_NETWORK="atlaswanders_default"
POSTGRES_CONTAINER="atlaswanders-postgres18"

TARGET_TAG="${1:-previous}"

log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
log_err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# ------------------------------------------------------------------------------
# 2. Handle --list Request
# ------------------------------------------------------------------------------
if [ "${TARGET_TAG}" = "--list" ] || [ "${TARGET_TAG}" = "-l" ]; then
  echo "===================================================================="
  echo " AtlasWanders Available Rollback Targets"
  echo "===================================================================="
  echo "Available Backend Docker Images:"
  docker images --filter "reference=atlaswanders-backend" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}"
  echo ""
  echo "Available Pre-Migration Database Backups:"
  if [ -d "${BACKUP_DIR}" ]; then
    ls -lh "${BACKUP_DIR}"/atlaswanders-pre-migrate-* 2>/dev/null || echo "No pre-migration backups found in ${BACKUP_DIR}"
  else
    echo "No backup directory at ${BACKUP_DIR}"
  fi
  echo "===================================================================="
  exit 0
fi

# ------------------------------------------------------------------------------
# 3. Handle --db Database Restore Request
# ------------------------------------------------------------------------------
if [ "${TARGET_TAG}" = "--db" ]; then
  SPECIFIED_DUMP="${2:-}"
  bash "${SCRIPT_DIR}/migrate.sh" --restore "${SPECIFIED_DUMP}"
  exit $?
fi

echo "===================================================================="
echo " AtlasWanders Production Rollback"
echo " Target Image Tag: ${TARGET_TAG}"
echo " Timestamp:        $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# ------------------------------------------------------------------------------
# 4. Acquire Exclusive Lock
# ------------------------------------------------------------------------------
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
  log_err "Another deployment or rollback is in progress (lock held on ${LOCK_FILE})."
  exit 1
fi
log_ok "Exclusive lock acquired on ${LOCK_FILE}."

# ------------------------------------------------------------------------------
# 5. Pre-Flight Checks
# ------------------------------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  log_err "Docker daemon is unreachable. Verify Docker service."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}\$"; then
  log_err "PostgreSQL container (${POSTGRES_CONTAINER}) is not running! Rollback cannot complete."
  exit 1
fi

# Determine image to rollback to
ROLLBACK_IMAGE="atlaswanders-backend:${TARGET_TAG}"
if ! docker image inspect "${ROLLBACK_IMAGE}" >/dev/null 2>&1; then
  log_err "Target rollback image '${ROLLBACK_IMAGE}' does not exist on this host!"
  log_err "Use './rollback.sh --list' to see available images."
  exit 1
fi
log_ok "Verified target rollback image: ${ROLLBACK_IMAGE}"

# ------------------------------------------------------------------------------
# 6. Execute Rollback via Docker Compose
# ------------------------------------------------------------------------------
log_info "Deploying container from ${ROLLBACK_IMAGE}..."

if [ -f "${COMPOSE_FILE}" ]; then
  IMAGE_TAG="${TARGET_TAG}" docker compose -f "${COMPOSE_FILE}" up -d --no-deps backend
else
  IMAGE_TAG="${TARGET_TAG}" docker compose -f "${REPO_ROOT}/docker-compose.yml" up -d --no-deps backend
fi

# ------------------------------------------------------------------------------
# 7. Health Check Verification
# ------------------------------------------------------------------------------
log_info "Verifying health of restored backend (http://localhost:8080/api/health)..."
HEALTHY=false
for i in $(seq 1 12); do
  HTTP_CODE=$(curl -sf -m 5 -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null || echo "000")
  if [ "${HTTP_CODE}" = "200" ]; then
    log_ok "Rollback verified: backend is healthy and returned HTTP 200 (attempt ${i}/12)."
    HEALTHY=true
    break
  fi
  echo "  Attempt ${i}/12: HTTP ${HTTP_CODE} - retrying in 5s..."
  sleep 5
done

if [ "${HEALTHY}" != "true" ]; then
  log_err "CRITICAL: Restored backend failed HTTP health check after rollback!"
  docker logs --tail=50 atlaswanders-backend 2>/dev/null || true
  exit 1
fi

echo "===================================================================="
log_ok "AtlasWanders backend rollback to '${TARGET_TAG}' completed successfully."
echo "===================================================================="
exit 0
