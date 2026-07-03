#!/usr/bin/env bash
# Supervised health and restart for the public Guide stack on fracta.
# Services: cogentia.service (8790) -> mcp-cogentia.service (8791)

set -euo pipefail

DAEMON_HEALTH_URL="${COGENTIA_DAEMON_HEALTH_URL:-http://127.0.0.1:8790/api/context/health}"
GUIDE_HEALTH_URL="${COGENTIA_GUIDE_HEALTH_URL:-http://127.0.0.1:8791/guide/health}"
DAEMON_UNIT="${COGENTIA_DAEMON_UNIT:-cogentia.service}"
MCP_UNIT="${COGENTIA_MCP_UNIT:-mcp-cogentia.service}"
TIMEOUT_SEC="${COGENTIA_HEALTH_TIMEOUT_SEC:-20}"
WAIT_ATTEMPTS="${COGENTIA_HEALTH_WAIT_ATTEMPTS:-30}"
WAIT_SLEEP_SEC="${COGENTIA_HEALTH_WAIT_SLEEP_SEC:-2}"
COOLDOWN_SEC="${COGENTIA_RESTART_COOLDOWN_SEC:-1800}"
STATE_DIR="${COGENTIA_OPS_STATE_DIR:-/var/lib/cogentia/.ops}"
LAST_RESTART_FILE="${STATE_DIR}/guide-stack-last-restart.epoch"

log() {
  echo "[cogentia-ops] $(date -Is) $*"
}

usage() {
  cat <<'EOF'
Usage: fracta-guide-stack.sh <command>

Commands:
  healthcheck   Exit 0 if daemon index and Guide MCP are healthy.
  restart       Restart cogentia then mcp-cogentia and wait for health.
  ensure-healthy
                Run healthcheck; restart on failure (respects cooldown).
EOF
}

fetch_json() {
  local url="$1"
  curl -fsS -m "${TIMEOUT_SEC}" -H "Accept: application/json" "$url"
}

daemon_healthy() {
  local body
  body="$(fetch_json "${DAEMON_HEALTH_URL}")"
  echo "${body}" | jq -e '.ok == true and .index_available == true' >/dev/null
}

guide_healthy() {
  local body
  body="$(fetch_json "${GUIDE_HEALTH_URL}")"
  echo "${body}" | jq -e '.ok == true and (.context.daemon.ok == true)' >/dev/null
}

healthcheck() {
  log "Checking daemon at ${DAEMON_HEALTH_URL}"
  daemon_healthy
  log "Daemon healthy"
  log "Checking Guide MCP at ${GUIDE_HEALTH_URL}"
  guide_healthy
  log "Guide MCP healthy"
}

wait_for_daemon() {
  local attempt=1
  while (( attempt <= WAIT_ATTEMPTS )); do
    if daemon_healthy >/dev/null 2>&1; then
      log "Daemon ready after ${attempt} attempt(s)"
      return 0
    fi
    sleep "${WAIT_SLEEP_SEC}"
    attempt=$((attempt + 1))
  done
  log "Daemon did not become healthy in time"
  return 1
}

wait_for_guide() {
  local attempt=1
  while (( attempt <= WAIT_ATTEMPTS )); do
    if guide_healthy >/dev/null 2>&1; then
      log "Guide MCP ready after ${attempt} attempt(s)"
      return 0
    fi
    sleep "${WAIT_SLEEP_SEC}"
    attempt=$((attempt + 1))
  done
  log "Guide MCP did not become healthy in time"
  return 1
}

record_restart() {
  mkdir -p "${STATE_DIR}"
  date +%s > "${LAST_RESTART_FILE}"
}

cooldown_active() {
  local now last elapsed
  [[ -f "${LAST_RESTART_FILE}" ]] || return 1
  now="$(date +%s)"
  last="$(cat "${LAST_RESTART_FILE}")"
  elapsed=$((now - last))
  if (( elapsed < COOLDOWN_SEC )); then
    log "Restart cooldown active (${elapsed}s < ${COOLDOWN_SEC}s); skipping auto-restart"
    return 0
  fi
  return 1
}

restart_stack() {
  log "Restarting ${DAEMON_UNIT}"
  systemctl restart "${DAEMON_UNIT}"
  wait_for_daemon
  log "Restarting ${MCP_UNIT}"
  systemctl restart "${MCP_UNIT}"
  wait_for_guide
  healthcheck
  record_restart
  log "Guide stack restart completed"
}

ensure_healthy() {
  if healthcheck >/dev/null 2>&1; then
    log "Guide stack already healthy"
    return 0
  fi
  log "Guide stack unhealthy"
  if cooldown_active; then
    return 1
  fi
  restart_stack
}

main() {
  local command="${1:-}"
  case "${command}" in
    healthcheck) healthcheck ;;
    restart) restart_stack ;;
    ensure-healthy) ensure_healthy ;;
    -h|--help|help|"") usage ;;
    *)
      log "Unknown command: ${command}"
      usage
      exit 2
      ;;
  esac
}

main "$@"