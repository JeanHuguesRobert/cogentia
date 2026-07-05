#!/data/data/com.termux/files/usr/bin/bash
# Mirror fracta /srv/cogentia/repos onto Termux (poco-jhr).
# Run on phone when Tailscale + WAN available:
#   bash ~/fractanet-sync-repos-from-fracta.sh
#
# Optional env:
#   FRACTA_HOST=fracta
#   FRACTA_REPOS=/srv/cogentia/repos
#   LOCAL_REPOS=~/srv/cogentia/repos

set -euo pipefail

FRACTA_HOST="${FRACTA_HOST:-fracta}"
FRACTA_REPOS="${FRACTA_REPOS:-/srv/cogentia/repos}"
LOCAL_REPOS="${LOCAL_REPOS:-${HOME}/srv/cogentia/repos}"

if ! command -v rsync >/dev/null 2>&1; then
  pkg install -y rsync openssh
fi

mkdir -p "${LOCAL_REPOS}"

echo "[sync] ${FRACTA_HOST}:${FRACTA_REPOS}/ -> ${LOCAL_REPOS}/"
rsync -avz --delete \
  -e "ssh -o BatchMode=yes -o ConnectTimeout=30 -i ${HOME}/.ssh/fractanet-mesh" \
  "ubuntu@${FRACTA_HOST}:${FRACTA_REPOS}/" \
  "${LOCAL_REPOS}/"

echo "[sync] done"
du -sh "${LOCAL_REPOS}"
ls -1 "${LOCAL_REPOS}"