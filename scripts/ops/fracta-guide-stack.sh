#!/usr/bin/env bash
# Supervised health and restart for the public Guide stack on fracta.
# Services: cogentia.service (8790) -> mcp-cogentia.service (8791)

set -euo pipefail

DAEMON_HEALTH_URL="${COGENTIA_DAEMON_HEALTH_URL:-http://127.0.0.1:8790/api/status}"
MCP_HEALTH_URL="${COGENTIA_MCP_HEALTH_URL:-http://127.0.0.1:8791/tools}"
DAEMON_UNIT="${COGENTIA_DAEMON_UNIT:-cogentia.service}"
MCP_UNIT="${COGENTIA_MCP_UNIT:-mcp-cogentia.service}"
PROBE_TIMEOUT_SEC="${COGENTIA_HEALTH_PROBE_TIMEOUT_SEC:-5}"
WAIT_ATTEMPTS="${COGENTIA_HEALTH_WAIT_ATTEMPTS:-24}"
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
  local timeout="${2:-${PROBE_TIMEOUT_SEC}}"
  curl -fsS -m "${timeout}" -H "Accept: application/json" "$url"
}

daemon_healthy() {
  local body
  body="$(fetch_json "${DAEMON_HEALTH_URL}")"
  echo "${body}" | jq -e '.ok == true' >/dev/null
}

mcp_healthy() {
  local body
  body="$(fetch_json "${MCP_HEALTH_URL}")"
  echo "${body}" | jq -e '(.tools | type) == "array" and (.tools | length) > 0' >/dev/null
}

healthcheck() {
  log "Checking daemon at ${DAEMON_HEALTH_URL}"
  daemon_healthy
  log "Daemon healthy"
  log "Checking MCP adapter at ${MCP_HEALTH_URL}"
  mcp_healthy
  log "MCP adapter healthy"
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

wait_for_mcp() {
  local attempt=1
  while (( attempt <= WAIT_ATTEMPTS )); do
    if mcp_healthy >/dev/null 2>&1; then
      log "MCP adapter ready after ${attempt} attempt(s)"
      return 0
    fi
    sleep "${WAIT_SLEEP_SEC}"
    attempt=$((attempt + 1))
  done
  log "MCP adapter did not become healthy in time"
  return 1
}

record_restart() {
  mkdir -p "${STATE_DIR}"
  date +%s > "${LAST_RESTART_FILE}"
}

unit_main_pid() {
  systemctl show -p MainPID --value "$1" 2>/dev/null || true
}

unit_main_state() {
  local pid="$1"
  [[ -n "${pid}" && "${pid}" != "0" ]] || return 0
  ps -p "${pid}" -o stat= 2>/dev/null || true
}

stop_unit_hard() {
  local unit="$1"
  local pid state waited=0

  if ! systemctl is-active --quiet "${unit}"; then
    return 0
  fi

  pid="$(unit_main_pid "${unit}")"
  state="$(unit_main_state "${pid}")"
  if [[ "${state}" == D* ]]; then
    log "${unit} PID ${pid} is in uninterruptible I/O wait (${state}); sending SIGKILL"
    systemctl kill -s SIGKILL "${unit}" || true
    sleep 2
    return 0
  fi

  systemctl stop "${unit}" || true
  while systemctl is-active --quiet "${unit}" && (( waited < 15 )); do
    sleep 1
    waited=$((waited + 1))
  done

  if systemctl is-active --quiet "${unit}"; then
    log "${unit} stop timed out; sending SIGKILL"
    systemctl kill -s SIGKILL "${unit}" || true
    sleep 2
  fi
}

start_unit() {
  local unit="$1"
  systemctl start "${unit}"
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
  log "Stopping ${DAEMON_UNIT}"
  stop_unit_hard "${DAEMON_UNIT}"
  log "Starting ${DAEMON_UNIT}"
  start_unit "${DAEMON_UNIT}"
  wait_for_daemon
  log "Stopping ${MCP_UNIT}"
  stop_unit_hard "${MCP_UNIT}"
  log "Starting ${MCP_UNIT}"
  start_unit "${MCP_UNIT}"
  wait_for_mcp
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