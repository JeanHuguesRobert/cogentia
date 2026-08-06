#!/data/data/com.termux/files/usr/bin/bash
# Resume the Fix Bugs First dashboard handoff on a trusted Termux node.
#
# This script performs no destructive operation and never commits, pushes,
# deploys, or changes GitHub/Supabase state. With connectivity it fast-forwards
# clean main checkouts; --offline only verifies the already checked-out state.
#
# Usage:
#   bash scripts/ops/termux-resume-fix-bugs-first-dashboard.sh [--offline] [--show-packet]

set -euo pipefail

OFFLINE=0
SHOW_PACKET=0

for arg in "$@"; do
  case "$arg" in
    --offline) OFFLINE=1 ;;
    --show-packet) SHOW_PACKET=1 ;;
    -h|--help)
      sed -n '1,16p' "$0"
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      exit 64
      ;;
  esac
done

REPOS_ROOT="${COGENTIA_REPOS_ROOT:-${HOME}/srv/cogentia/repos}"
COGENTIA_ROOT="${COGENTIA_ROOT:-${REPOS_ROOT}/cogentia}"
OPERIUM_ROOT="${OPERIUM_ROOT:-${REPOS_ROOT}/operium}"
STATE_DIR="${COGENTIA_DATA_DIR:-${HOME}/.cogentia/var}/state"
PACKET_REL="research/CPKT-2026-006_fix_bugs_first_dashboard_handoff.md"

log() { printf '[fbf-handoff] %s\n' "$*" >&2; }
fail() { printf '[fbf-handoff] ERROR: %s\n' "$*" >&2; exit 1; }

require_checkout() {
  local root="$1"
  [[ -d "$root/.git" ]] || fail "not a Git checkout: $root"
}

sync_checkout() {
  local name="$1"
  local root="$2"
  local branch dirty remote_head local_head

  require_checkout "$root"
  branch="$(git -C "$root" branch --show-current)"
  [[ "$branch" == "main" ]] || fail "$name is on '$branch', expected clean main; refusing to switch branches"
  dirty="$(git -C "$root" status --porcelain)"
  [[ -z "$dirty" ]] || fail "$name has uncommitted changes; refusing to update it"

  if [[ "$OFFLINE" -eq 0 ]]; then
    log "$name: fetching origin"
    git -C "$root" fetch --prune origin >&2
    remote_head="$(git -C "$root" rev-parse origin/main)"
    local_head="$(git -C "$root" rev-parse HEAD)"
    if [[ "$local_head" != "$remote_head" ]]; then
      log "$name: fast-forwarding main"
      git -C "$root" pull --ff-only origin main >&2
    fi
  else
    log "$name: offline; leaving checkout untouched"
  fi

  git -C "$root" diff --check
  printf '%s' "$(git -C "$root" rev-parse HEAD)"
}

log "starting (offline=$OFFLINE)"
COGENTIA_COMMIT="$(sync_checkout cogentia "$COGENTIA_ROOT")"
printf '\n'
OPERIUM_COMMIT="$(sync_checkout operium "$OPERIUM_ROOT")"
printf '\n'

PACKET_PATH="${COGENTIA_ROOT}/${PACKET_REL}"
[[ -f "$PACKET_PATH" ]] || fail "packet missing: $PACKET_PATH"
grep -q '^packet_id: CPKT-2026-006$' "$PACKET_PATH" || fail "unexpected packet identity"

command -v node >/dev/null 2>&1 || fail "node is required"
node "$COGENTIA_ROOT/scripts/cogentia.js" --help >/dev/null
node "$OPERIUM_ROOT/bin/operium.js" backlog list --kind bug --status openish --human

mkdir -p "$STATE_DIR"
RECEIPT_PATH="${STATE_DIR}/fix-bugs-first-dashboard-handoff.json"
cat > "$RECEIPT_PATH" <<EOF
{
  "schema": "cogentia.handoff-receipt.v1",
  "packet_id": "CPKT-2026-006",
  "created_at": "$(date -Is)",
  "offline": $([[ "$OFFLINE" -eq 1 ]] && printf true || printf false),
  "cogentia": { "path": "${COGENTIA_ROOT}", "commit": "${COGENTIA_COMMIT}" },
  "operium": { "path": "${OPERIUM_ROOT}", "commit": "${OPERIUM_COMMIT}" }
}
EOF
chmod 600 "$RECEIPT_PATH"

log "continuity receipt: $RECEIPT_PATH"
log "packet: $PACKET_PATH"
log "next: read the packet, then create/select one bounded issue before writing"

if [[ "$SHOW_PACKET" -eq 1 ]]; then
  printf '\n'
  sed -n '1,260p' "$PACKET_PATH"
fi
