#!/usr/bin/env bash
# One immutable already-public Museum release; root-owned semantic helper.
# No untrusted agent revision or shell content is ever executed as root.
set -Eeuo pipefail
SOURCE='/srv/cogentia/repos/operium/scripts/ops/publish-museum-static.sh'
SHA='9bcb161f840bd6025c0883c2a039d673042a98a0f7978f652d50ce17eacc92c2'
DIR='/usr/local/libexec/cogentia'
PINNED="$DIR/publish-museum-static.sh"
WRAPPER="$DIR/museum-static-release"
SUDOERS='/etc/sudoers.d/98-cogentia-museum-release'
SUDO_CONTENT='ubuntu ALL=(root) NOPASSWD: /usr/local/libexec/cogentia/museum-static-release'
usage(){ echo "Usage: $0 --check|--apply" >&2; exit 2; }
[[ $# == 1 && ( "$1" == '--check' || "$1" == '--apply' ) ]] || usage
[[ -f "$SOURCE" ]] || { echo 'BLOCKED: source publisher missing' >&2; exit 2; }
actual="$(sha256sum "$SOURCE" | cut -d' ' -f1)"
[[ "$actual" == "$SHA" ]] || { echo 'BLOCKED: source publisher not pinned' >&2; exit 2; }
bash -n "$SOURCE"
[[ "$(grep "^REV=" "$SOURCE")" == "REV='f7f8ef131b5fc81d5a68e11cb404e886ad865861'" ]] || {echo 'BLOCKED: release pin changed' >&2;exit 2;}
bash "$SOURCE" --check | grep -q 'PREFLIGHT=PASS'
for f in "$PINNED" "$WRAPPER" "$SUDOERS"; do
  if [[ -e "$f" ]];then
    [[ "$f" == "$PINNED" ]] && [[ "$(sha256sum "$f" |cut -d' ' -f1)" == "$SHA" ]] && continue
    if [[ "$f" == "$SUDOERS" && "$(cat "$f")" == "$SUDO_CONTENT" ]];then continue;fi
    if [[ "$f" == "$WRAPPER" ]] && grep -qx "exec /bin/bash $PINNED --apply" "$f";then continue;fi
    echo "BLOCKED: unmanaged or conflicting helper $f" >&2;exit 2
  fi
done
if [[ "$1" == '--check' ]];then
  echo 'PREFLIGHT=PASS: pinned Museum script, no conflicting semantic root helper'
  exit 0
fi
[[ "$(id -u)" == 0 ]] || { echo 'BLOCKED: root required' >&2; exit 3; }
made=()
rollback(){
 local rc=$?
 trap - ERR
 for file in "${made[@]}";do rm -f "$file";done
 echo "ROLLED_BACK: $rc" >&2
 exit "$rc"
}
trap rollback ERR
install -d -m 0755 -o root -g root "$DIR"
if [[ ! -e "$PINNED" ]];then
  install -m 0755 -o root -g root "$SOURCE" "$PINNED"
  made+=("$PINNED")
fi
if [[ ! -e "$WRAPPER" ]];then
  cat > "$WRAPPER" <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail
[[ \\$# -eq 0 ]] || exit 2
exec /bin/bash $PINNED --apply
EOF
  chmod 0755 "$WRAPPER"
  chown root:root "$WRAPPER"
  made+=("$WRAPPER")
fi
bash -n "$WRAPPER"
if [[ ! -e "$SUDOERS" ]];then
  printf '%s\n' "$SUDO_CONTENT" > "$SUDOERS"
  chown root:root "$SUDOERS"
  chmod 0440 "$SUDOERS"
  made+=("$SUDOERS")
fi
visudo -cf "$SUDOERS" >/dev/null
runuser -u ubuntu -- sudo -n -l -- /usr/local/libexec/cogentia/museum-static-release >/dev/null
trap - ERR
echo 'INSTALLED=PASS pinned root-owned Museum release helper; other vhosts and records untouched'
