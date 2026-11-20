#!/usr/bin/env bash
# Deploy an exact committed revision of 3Code without changing a dirty checkout.
set -euo pipefail
REPO=/srv/cogentia/repos/cogentia
STABLE=/srv/cogentia/services/contributive
DATABASE=/srv/cogentia/data/contributive/campaigns.sqlite
UNIT=cogentia-contributive.service
SHA="$1"
if [[ ! "$SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Usage: upgrade-fracta2.sh <40-char Git SHA> [--preflight]" >&2
  exit 64
fi
git -c safe.directory="$REPO" -C "$REPO" cat-file -e "$SHA^{commit}"
if ! git -c safe.directory="$REPO" -C "$REPO" merge-base --is-ancestor "$SHA" refs/remotes/origin/main; then
  echo "Requested commit is not within origin/main" >&2
  exit 65
fi
if [ "$#" -gt 1 ] && [ "$2" = "--preflight" ]; then
  git -c safe.directory="$REPO" -C "$REPO" archive "$SHA" apps/contributive-service/ |
    tar -tf - | grep -Fx 'apps/contributive-service/references.mjs' >/dev/null
  printf 'PREFLIGHT_OK=%s\n' "$SHA"
  exit 0
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "Root needed via the owner's authorized SSH session (sudo)" >&2
  exit 77
fi
old="$(readlink "$STABLE/current" || true)"
if [ -z "$old" ] || [ ! -f "$STABLE/current/server.mjs" ]; then
  echo "Current release absent; aborting" >&2
  exit 66
fi
release="$STABLE/releases/$SHA"
stage=""
swapped=0
rollback() {
  rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ]; then
    echo "Deployment failed ($rc); restoring $old" >&2
    if [ "$swapped" = 1 ] && [ -n "$old" ]; then
      ln -sfn "$old" "$STABLE/.rollback.$$"
      mv -Tf "$STABLE/.rollback.$$" "$STABLE/current"
      systemctl restart "$UNIT" || true
    fi
  fi
  if [ -n "$stage" ] && [ -d "$stage" ]; then rm -rf "$stage"; fi
  exit "$rc"
}
trap rollback EXIT
if [ ! -f "$release/server.mjs" ]; then
  stage="$(mktemp -d "$STABLE/releases/.build.XXXXXXXX")"
  git -c safe.directory="$REPO" -C "$REPO" archive "$SHA" apps/contributive-service/ |
    tar -xf - -C "$stage" --strip-components=2
  test -f "$stage/references.mjs"
  /usr/local/bin/node --check "$stage/server.mjs"
  /usr/local/bin/node --check "$stage/references.mjs"
  if cmp -s "$stage/package-lock.json" "$STABLE/current/package-lock.json"; then
    cp -a "$STABLE/current/node_modules" "$stage/node_modules"
  else
    (cd "$stage" && /usr/local/bin/npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
  fi
  test -d "$stage/node_modules/qrcode"
  chown -R root:root "$stage"
  chmod 755 "$stage"
  mv -T "$stage" "$release"
  stage=""
fi
backup_dir="$(dirname "$DATABASE")/backups"
install -d -m 700 -o ubuntu -g ubuntu "$backup_dir"
backup="$backup_dir/campaigns-before-$SHA-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
python3 - "$DATABASE" "$backup" <<'PY'
import os,sqlite3,sys
src,dest=sys.argv[1:]
source=sqlite3.connect(f'file:{src}?mode=ro',uri=True,timeout=10)
target=sqlite3.connect(dest,timeout=10)
source.backup(target)
result=target.execute('PRAGMA integrity_check').fetchone()[0]
target.close();source.close()
os.chmod(dest,0o600)
if result!='ok': raise RuntimeError('Backup integrity check failed: '+result)
PY
chown ubuntu:ubuntu "$backup"
ln -sfn "releases/$SHA" "$STABLE/.next.$$"
mv -Tf "$STABLE/.next.$$" "$STABLE/current"
swapped=1
systemctl restart "$UNIT"
systemctl is-active --quiet "$UNIT"
test "$(systemctl show "$UNIT" -p MainPID --value)" -gt 0
for i in $(seq 1 20); do
  if curl -fsS --max-time 2 http://127.0.0.1:8879/3code/api/health >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fsS --max-time 8 http://127.0.0.1:8879/3code/api/health >/dev/null
curl -fsS --max-time 10 https://services.acorsica.org/3code/api/health >/dev/null
status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 'https://services.acorsica.org/3code/api/references/parse?ref=invalid')"
if [ "$status" != 400 ]; then
  echo "New route not confirmed on public proxy: HTTP $status" >&2
  exit 84
fi
curl -fsS --max-time 8 https://services.acorsica.org/3code/app.js | grep -F 'updateCopy' >/dev/null
printf 'DEPLOYED_SHA=%s\nBACKUP=%s\nOLD_RELEASE=%s\nMAINPID=%s\nPUBLIC_REFERENCE_API_HTTP=%s\n' \
  "$SHA" "$backup" "$old" "$(systemctl show "$UNIT" -p MainPID --value)" "$status"
trap - EXIT
