#!/usr/bin/env bash
# Owner-operated activation. No credentials, mandate, or user tokens passed in.
# Requires an existing owner SSH session with legitimate sudo privileges.
set -euo pipefail
cd /srv/cogentia/repos/cogentia
if [[ -z "${SSH_CONNECTION:-}" || ! -t 0 ]]; then
  echo 'REFUSED: interactive owner SSH terminal required' >&2
  exit 2
fi
if [[ "$(git branch --show-current)" != main ]]; then
  echo 'REFUSED: cogentia is not on main' >&2
  exit 2
fi
if [[ -n "$(git status --porcelain -- scripts/lib/jhn-repository-mandate-plan.js scripts/lib/jhn-consent-http-handler.js scripts/ops/jhn-consent-local-server.js)" ]]; then
  echo 'REFUSED: JHN consent sources have local edits' >&2
  exit 2
fi
# Do not restart into stale code, nor deploy untested changes.
git fetch origin main --quiet
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo 'REFUSED: refresh Cogentia main first (git pull --ff-only)' >&2
  exit 2
fi
node --test scripts/lib/jhn-repository-mandate-plan.test.js scripts/lib/jhn-repository-http-consent.test.js scripts/lib/jhn-consent-http-handler.test.js >/tmp/jhn-repository-consent-activation-test.log
# A non-privileged process must not impersonate an administrative consent issuer.
# sudo here executes only when the human owner invokes this script in SSH.
sudo systemctl restart cogentia-jhn-consent.service
systemctl is-active --quiet cogentia-jhn-consent.service
status=$(curl -sS --max-time 8 -o /tmp/jhn-repository-anon-check.json -w '%{http_code}' \
  -X POST -H 'Host: jhn.baronsmariani.org' -H 'Origin: https://jhn.baronsmariani.org' \
  -H 'Content-Type: application/json' --data '{}' \
  http://127.0.0.1:8796/api/cop/principal-consent/repository-request)
if [[ "$status" != 401 ]]; then
  echo "REFUSED: unexpected anonymous request status $status (expected 401)" >&2
  exit 3
fi
printf 'Backend activated; anonymous request correctly denied (HTTP %s).\n' "$status"
printf 'Next: deploy Inseme JHN dist-jhn + Netlify edge, then authenticate as Principal in /cop/consent/repository.\n'
