#!/usr/bin/env bash
# Idempotent operator recipe, owner-authorized root via existing host administration.
set -euo pipefail
test "$(id -u)" -eq 0 || { echo "requires authorized root execution" >&2; exit 77; }
REPO=/srv/cogentia/repos/cogentia
APP=apps/contributive-service
sha="$(git -C "$REPO" rev-parse HEAD)"
stable=/srv/cogentia/services/contributive
release="$stable/releases/$sha"
mkdir -p "$stable/releases" /srv/cogentia/data/contributive
if [ ! -e "$release/server.mjs" ]; then
  mkdir -p "$release"
  cp -a "$REPO/$APP"/server.mjs "$REPO/$APP"/package.json "$REPO/$APP"/package-lock.json "$REPO/$APP"/public "$release/"
  cd "$release"
  /usr/local/bin/npm ci --omit=dev --ignore-scripts --no-audit --no-fund --silent
  chown -R root:root "$release"
fi
chown ubuntu:ubuntu /srv/cogentia/data/contributive
chmod 750 /srv/cogentia/data/contributive
ln -sfn "releases/$sha" "$stable/.next"
mv -Tf "$stable/.next" "$stable/current"
cat > /etc/systemd/system/cogentia-contributive.service <<'UNIT'
[Unit]
Description=Cogentia neutral contributive campaigns / 3Code MVP
After=network.target
[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/srv/cogentia/services/contributive/current
Environment=HOST=127.0.0.1
Environment=PORT=8879
Environment=CAMPAIGNS_DB=/srv/cogentia/data/contributive/campaigns.sqlite
ExecStart=/usr/local/bin/node /srv/cogentia/services/contributive/current/server.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/srv/cogentia/data/contributive
PrivateTmp=true
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now cogentia-contributive.service
systemctl restart cogentia-contributive.service
curl -fsS --max-time 8 http://127.0.0.1:8879/3code/api/health > /dev/null
site=/etc/caddy/fracta2-edge-https/services.caddy
candidate="$(mktemp)"
saved="$(mktemp)"
trap 'rm -f "$candidate" "$saved"' EXIT
cp "$site" "$saved"
python3 - "$site" "$candidate" <<'PY'
import sys
p,out=sys.argv[1:];text=open(p).read()
if '@contributive path /3code /3code/*' in text:
    open(out,'w').write(text);sys.exit(0)
needle='https://services.acorsica.org {\n'
assert text.count(needle)==1, 'cannot locate unique services vhost'
insert='''    # neutral 3Code and contributive campaigns, separate from KYS SPA
    @contributive path /3code /3code/*
    handle @contributive {
        reverse_proxy 127.0.0.1:8879
    }
'''
open(out,'w').write(text.replace(needle,needle+insert))
PY
chmod --reference="$site" "$candidate"
chown --reference="$site" "$candidate"
cp "$candidate" "$site"
if ! /usr/bin/caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  cp "$saved" "$site"
  echo "Caddy candidate invalid; restored prior config" >&2
  exit 78
fi
if ! systemctl reload caddy; then
  cp "$saved" "$site"
  systemctl reload caddy || true
  echo "Caddy reload failed; restored prior config" >&2
  exit 79
fi
printf 'CODE_SHA=%s\n' "$sha"
curl -fsS --max-time 10 https://services.acorsica.org/3code/api/health
printf '\n'
curl -fsS --max-time 10 https://services.acorsica.org/3code/ | grep -m1 '3Code et Bouteilles'
