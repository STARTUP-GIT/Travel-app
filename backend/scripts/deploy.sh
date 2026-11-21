#!/usr/bin/env bash
# ==============================================================================
# AtlasWanders Production Backend Deployment Script
# Target Host: Ubuntu VM (atlaswanders-virtual-machine / 192.168.122.225)
#
# Canonical Deployment Architecture:
#   - Single canonical deployment mechanism: Docker Compose (backend/compose.vm.yml).
#   - Real image preservation: existing image is preserved as atlaswanders-backend:previous.
#   - Immutable image tagging using Git commit SHA (${COMMIT_SHA}).
#   - Exclusive flock locking (/tmp/atlaswanders-deploy.lock) preventing race conditions.
#   - Automated pre-build disk check and Docker builder cache pruning preventing disk fill.
#   - Automated pre-migration database snapshot (pg_dump) via migrate.sh.
#   - Automated rollback to previous image on container start or health check failure.
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
LOCK_FILE="/tmp/atlaswanders-deploy.lock"
DOCKER_NETWORK="atlaswanders_default"
POSTGRES_CONTAINER="atlaswanders-postgres18"
COMMIT_SHA="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo 'manual')}"

log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
log_err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# ------------------------------------------------------------------------------
# 2. Concurrency Serialization (flock)
# ------------------------------------------------------------------------------
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
  log_err "Another deployment is currently running (lock held on ${LOCK_FILE})."
  log_err "Aborting to prevent concurrent deployment conflicts."
  exit 1
fi
export ATLASWANDERS_DEPLOY_LOCK_HELD=1
log_ok "Exclusive deployment lock acquired on ${LOCK_FILE}."

echo "===================================================================="
echo " AtlasWanders Production Deployment Pipeline"
echo " Host:        $(hostname 2>/dev/null || echo 'atlaswanders-vm')"
echo " Commit:      ${COMMIT_SHA:0:12}"
echo " Timestamp:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# ------------------------------------------------------------------------------
# 3. Pre-Flight Validation
# ------------------------------------------------------------------------------
log_info "Running pre-flight infrastructure checks..."

# Check Docker daemon connectivity with 5s timeout
if ! timeout 5 docker info >/dev/null 2>&1; then
  log_err "Cannot communicate with Docker daemon within 5s. Deployment blocked."
  exit 1
fi
log_ok "Docker daemon is responsive."

# Check Docker network
if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  log_err "Required Docker network '${DOCKER_NETWORK}' not found!"
  log_err "The database network must exist before deploying backend. Deployment blocked."
  exit 1
fi
log_ok "Docker network '${DOCKER_NETWORK}' verified."

# Check PostgreSQL container
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}\$"; then
  log_err "Required container '${POSTGRES_CONTAINER}' is not running! Deployment blocked."
  exit 1
fi
log_ok "PostgreSQL container '${POSTGRES_CONTAINER}' is active."

# Check Environment Secrets File
if [ ! -f "${SECRETS_FILE}" ]; then
  log_err "Production environment file '${SECRETS_FILE}' not found! Deployment blocked."
  exit 1
fi

if [ ! -s "${SECRETS_FILE}" ]; then
  log_err "Production environment file '${SECRETS_FILE}' is empty (0 bytes)! Deployment blocked."
  exit 1
fi

FILE_PERMS="$(stat -c '%a' "${SECRETS_FILE}" 2>/dev/null || echo "unknown")"
if [ "${FILE_PERMS}" != "600" ]; then
  log_err "Production environment file has unsafe permissions: ${FILE_PERMS} (expected 600)."
  exit 1
fi
log_ok "Production environment file verified (${SECRETS_FILE}, perms: 600)."

# ------------------------------------------------------------------------------
# 4. Proactive Disk Space Check & Docker Cache Prune
# ------------------------------------------------------------------------------
log_info "Verifying disk space and cleaning build cache..."

# Clean leftover failed runner debris if present (reclaims up to 900MB)
if [ -d "/opt/actions-runner-failed-20261116-080120" ]; then
  rm -rf /opt/actions-runner-failed-20261116-080120/* >/dev/null 2>&1 || true
fi

# Always prune all unreferenced build cache and dangling images before build
docker builder prune -a -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

# Check available disk space on root filesystem (in MB)
AVAIL_MB=$(df -BM / | awk 'NR==2 {gsub("M","",$4); print $4}')
log_info "Available disk space on root filesystem: ${AVAIL_MB} MB"

if [ "${AVAIL_MB}" -lt 800 ]; then
  log_err "CRITICAL: Insufficient disk space on / (${AVAIL_MB} MB available, minimum 800MB required)."
  log_err "Deployment aborted to protect system stability."
  exit 1
fi
log_ok "Disk space check passed (${AVAIL_MB} MB available)."

# ------------------------------------------------------------------------------
# 5. Image Rollback Preservation
# ------------------------------------------------------------------------------
log_info "Preserving current running container image for rollback..."
PREV_IMAGE_ID=$(docker inspect --format='{{.Image}}' atlaswanders-backend 2>/dev/null || true)
HAS_PREVIOUS="false"
if [ -n "${PREV_IMAGE_ID}" ]; then
  docker tag "${PREV_IMAGE_ID}" atlaswanders-backend:previous
  HAS_PREVIOUS="true"
  log_ok "Preserved current image (${PREV_IMAGE_ID:0:19}) as atlaswanders-backend:previous"
else
  log_warn "No previous atlaswanders-backend container found. Initial deployment mode."
fi

# ------------------------------------------------------------------------------
# 6. Build Backend Docker Image (Timeout: 10m)
# ------------------------------------------------------------------------------
log_info "Building backend Docker image tagged as atlaswanders-backend:${COMMIT_SHA}..."
BUILD_START=$(date +%s)

BUILD_CMD="docker compose -f ${REPO_ROOT}/docker-compose.yml build backend"
if [ -f "${COMPOSE_FILE}" ]; then
  BUILD_CMD="docker compose -f ${COMPOSE_FILE} build backend"
fi

if ! timeout 600 env IMAGE_TAG="${COMMIT_SHA}" ${BUILD_CMD}; then
  log_err "CRITICAL: Docker image build timed out after 10 minutes or failed!"
  # Prune any half-built cache layers to protect disk
  docker builder prune -f >/dev/null 2>&1 || true
  exit 1
fi

docker tag "atlaswanders-backend:${COMMIT_SHA}" atlaswanders-backend:latest
BUILD_DURATION=$(( $(date +%s) - BUILD_START ))
log_ok "Backend image built successfully in ${BUILD_DURATION}s."

# Immediately prune builder cache to release intermediate layers and keep disk lean
docker builder prune -f >/dev/null 2>&1 || true

# ------------------------------------------------------------------------------
# 7. Execute Database Migration Pipeline (Pre-Deployment Guard)
# ------------------------------------------------------------------------------
log_info "Executing database migration pipeline (migrate.sh)..."
if ! bash "${SCRIPT_DIR}/migrate.sh"; then
  log_err "===================================================================="
  log_err "CRITICAL: Database migration failed! Halting deployment."
  log_err "The live application container has NOT been touched."
  log_err "===================================================================="
  exit 1
fi
log_ok "Database migration pipeline completed successfully."

# ------------------------------------------------------------------------------
# 8. Deploy Backend Container
# ------------------------------------------------------------------------------
log_info "Deploying new backend container..."
DEPLOYMENT_STARTED=true

if [ -f "${COMPOSE_FILE}" ]; then
  IMAGE_TAG="${COMMIT_SHA}" docker compose -f "${COMPOSE_FILE}" up -d --no-deps backend
else
  IMAGE_TAG="${COMMIT_SHA}" docker compose -f "${REPO_ROOT}/docker-compose.yml" up -d --no-deps backend
fi

# Verify container process status
STATUS=$(docker inspect --format='{{.State.Status}}' atlaswanders-backend 2>/dev/null || echo "not_found")
if [ "${STATUS}" != "running" ]; then
  log_err "Backend container failed to start! Actual status: ${STATUS}"
  if [ "${HAS_PREVIOUS}" = "true" ]; then
    log_warn "Triggering automatic rollback..."
    bash "${SCRIPT_DIR}/rollback.sh" previous || true
  fi
  docker logs --tail=50 atlaswanders-backend 2>/dev/null || true
  exit 1
fi
log_ok "Backend container started. Status: ${STATUS}"

# ------------------------------------------------------------------------------
# 9. Health Check Verification (up to 60s)
# ------------------------------------------------------------------------------
log_info "Polling http://localhost:8080/api/health ..."
HEALTHY=false
for i in $(seq 1 12); do
  HTTP=$(curl -sf -m 5 -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null || echo "000")
  if [ "${HTTP}" = "200" ]; then
    log_ok "Health check passed on attempt ${i}/12 (HTTP ${HTTP})"
    HEALTHY=true
    break
  fi
  echo "  Attempt ${i}/12: HTTP ${HTTP} — retrying in 5s..."
  sleep 5
done

if [ "${HEALTHY}" != "true" ]; then
  log_err "===================================================================="
  log_err "CRITICAL: Backend container failed health check after 60s!"
  log_err "===================================================================="
  if [ "${HAS_PREVIOUS}" = "true" ]; then
    log_warn "Executing automatic rollback to atlaswanders-backend:previous..."
    bash "${SCRIPT_DIR}/rollback.sh" previous
  else
    log_err "No previous image exists for automatic rollback."
  fi
  docker logs --tail=50 atlaswanders-backend 2>/dev/null || true
  exit 1
fi

# ------------------------------------------------------------------------------
# 10. Deployment Complete
# ------------------------------------------------------------------------------
echo "===================================================================="
echo " AtlasWanders Backend Deployed Successfully"
echo " Commit:    ${COMMIT_SHA:0:12}"
echo " Status:    Running & Healthy (HTTP 200)"
echo " Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="
exit 0
