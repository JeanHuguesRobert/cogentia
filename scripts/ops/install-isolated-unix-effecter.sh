#!/usr/bin/env bash
# #299 — Unix host.process.run child runs as a non-COP-writing identity.
# Existing mandate issuer / protected canonical store remain on ubuntu.
# Owner-operated bootstrap, bounded to one system user and one sudoers rule.
set -Eeuo pipefail
USER_NAME="cogentia-effect"
SUDOERS="/etc/sudoers.d/99-cogentia-effect"
DROPIN="/etc/systemd/system/mcp-cogentia.service.d/98-isolated-unix-user.conf"
SUDO_CONTENT="ubuntu ALL=($USER_NAME) NOPASSWD: /bin/sh"
OVERRIDE_CONTENT=$'[Service]\nEnvironment=COGENTIA_HOST_UNIX_ISOLATED_USER=cogentia-effect\n'
usage() { echo "Usage: $0 [--check|--apply]" >&2;exit 2; }
[[ $# == 1 && ( "$1" == "--check" || "$1" == "--apply" ) ]] || usage
[[ -f /var/lib/cogentia/cop/john-root-v1.sqlite ]] || { echo "BLOCKED: canonical COP DB absent" >&2; exit 2; }
[[ -d /etc/systemd/system/mcp-cogentia.service.d ]] || { echo "BLOCKED: MCP drop-ins absent" >&2; exit 2; }
for f in "$SUDOERS" "$DROPIN";do
 if [[ -e "$f" ]];then
   if [[ "$f" == "$SUDOERS" ]];then
     [[ "$(cat "$f")" == "$SUDO_CONTENT" ]] || { echo "BLOCKED: sudo policy conflict" >&2;exit 2; }
   else [[ "$(cat "$f")" == "$(printf '%s' "$OVERRIDE_CONTENT")" ]] || { echo "BLOCKED: service override conflict" >&2;exit 2; }
   fi
 fi
done
if getent passwd "$USER_NAME" >/dev/null;then
 [[ "$(getent passwd "$USER_NAME" | cut -d: -f7)" == "/usr/sbin/nologin" ]] || { echo "BLOCKED: unexpected effecter login shell" >&2; exit 2; }
 [[ "$(getent passwd "$USER_NAME" | cut -d: -f6)" == "/nonexistent" ]] || { echo "BLOCKED: unexpected effecter home" >&2; exit 2; }
 [[ "$(id -G "$USER_NAME" | wc -w)" == 1 ]] || { echo "BLOCKED: unexpected effecter supplementary groups" >&2; exit 2; }
fi
if [[ "$1" == "--check" ]];then
 echo "PREFLIGHT=PASS: dedicated non-login account, one fixed lower-privilege sudo target, canonical DB unchanged"
 exit 0
fi
[[ "$(id -u)" == 0 ]] || { echo "BLOCKED: owner root required" >&2; exit 3; }
created_account=0
created_sudoers=0
created_dropin=0
rollback() {
  local code=$?
  trap - ERR
  [[ "$created_dropin" == 1 ]] && rm -f "$DROPIN"
  [[ "$created_sudoers" == 1 ]] && rm -f "$SUDOERS"
  systemctl daemon-reload || true
  systemctl restart mcp-cogentia.service || true
  echo "ROLLED_BACK: isolated Unix actor activation error=$code" >&2
  exit "$code"
}
trap rollback ERR
if ! getent passwd "$USER_NAME" >/dev/null;then
 useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$USER_NAME"
 created_account=1
fi
if [[ ! -e "$SUDOERS" ]];then
 printf '%s\n' "$SUDO_CONTENT" > "$SUDOERS"
 chmod 0440 "$SUDOERS"
 created_sudoers=1
fi
visudo -cf "$SUDOERS" >/dev/null
runuser -u ubuntu -- sudo -n -u "$USER_NAME" -- /bin/sh -c \
 'test "$(id -u)" != 0 && test "$(id -un)" = cogentia-effect && test ! -w /var/lib/cogentia/cop && test ! -w /var/lib/cogentia/cop/john-root-v1.sqlite'
if [[ ! -e "$DROPIN" ]];then
 printf '%s' "$OVERRIDE_CONTENT" > "$DROPIN"
 chmod 0644 "$DROPIN"
 created_dropin=1
fi
systemctl daemon-reload
systemctl restart mcp-cogentia.service
systemctl is-active --quiet mcp-cogentia.service
for i in $(seq 1 30);do
 status="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:8791/tools 2>/dev/null || true)"
 if [[ "$status" == 200 ]];then
   grep -q "COGENTIA_HOST_UNIX_ISOLATED_USER=$USER_NAME" <(systemctl show mcp-cogentia -p Environment --value)
   trap - ERR
   echo "ACTIVATED: MCP_HTTP=200 Unix executor=$USER_NAME COP authority=ubuntu; custody verified"
   exit 0
 fi
 sleep 0.25
done
echo "BLOCKED: MCP not ready after activation" >&2
false
