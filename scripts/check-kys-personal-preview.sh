#!/bin/sh
# Local-only browser smoke: run Vite preview, then close it on exit.
set -eu
if [ -z "$(printenv CHROME_BIN || true)" ]; then
  if command -v google-chrome >/dev/null 2>&1; then
    CHROME_BIN=google-chrome
  elif command -v chromium >/dev/null 2>&1; then
    CHROME_BIN=chromium
  else
    echo "Browser smoke requires local Chrome or Chromium" >&2
    exit 1
  fi
  export CHROME_BIN
fi
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
export KYS_SMOKE_URL="http://127.0.0.1:$port"
(cd apps/personal && exec node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port "$port" --strictPort) &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true' EXIT
node scripts/check-kys-personal-browser.mjs
