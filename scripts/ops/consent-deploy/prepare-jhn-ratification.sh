#!/usr/bin/env bash
# Owner-only bounded one-shot, no mandate/grant modifications.
# Do not activate decisions if the public JHN UI still lacks ratification copy.
set -euo pipefail
site=https://jhn.baronsmariani.org
page=$(mktemp)
js=$(mktemp)
trap 'rm -f "$page" "$js"' EXIT
curl --fail --silent --show-error --max-time 12 "$site/" -o "$page"
asset=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$page" | head -1)
if [[ -z "$asset" ]]; then
  echo 'REFUS: bundle JHN indisponible, aucune activation COP.' >&2
  exit 1
fi
curl --fail --silent --show-error --max-time 16 "$site$asset" -o "$js"
if ! grep -q 'Ratifier le mandat existant' "$js"; then
  echo 'REFUS: la nouvelle interface de ratification JHN n’est pas encore déployée. Aucune activation COP.' >&2
  exit 1
fi
if [[ -z "${SSH_CONNECTION:-}" || -z "${SSH_TTY:-}" ]]; then
  echo 'REFUS: session SSH interactive du propriétaire requise.' >&2
  exit 1
fi
echo 'Interface JHN de ratification vérifiée sur le site de production.'
sudo python3 /srv/cogentia/repos/cogentia/scripts/ops/consent-deploy/enable-jhn-consent-decisions.py --apply
cd /srv/cogentia/repos/cogentia
node scripts/cogentia.js cop consent ratify --mandate mandate:jhn:john-root --json
