#!/usr/bin/env bash
# Read-only preflight: verify Fracta2 -> ThinkPad SSH alias and actual Windows execution.
# Run from Fracta2: bash scripts/ops/check-thinkpad-ssh-route.sh
set -euo pipefail

alias_name="${THINKPAD_SSH_ALIAS:-thinkpad}"
expected="i7-thinkpad-jhr"
command -v ssh >/dev/null || { echo 'FAIL: ssh unavailable' >&2; exit 1; }
command -v iconv >/dev/null || { echo 'FAIL: iconv unavailable' >&2; exit 1; }
command -v base64 >/dev/null || { echo 'FAIL: base64 unavailable' >&2; exit 1; }

echo "Route: SSH alias ${alias_name} (configured identity, no raw IP)"
echo 'Configured SSH destination (non-secret):'
ssh -G "$alias_name" 2>/dev/null | grep -E '^(hostname|user|port|identitiesonly) ' || true

remote_host="$(ssh -n -o BatchMode=yes -o ConnectTimeout=8 "$alias_name" hostname | tr -d '\r\n')"
if [[ "$remote_host" != "$expected" ]]; then
  echo "FAIL: expected ${expected}, got ${remote_host:-<empty>}; refusing wrong-host execution" >&2
  exit 1
fi
echo "PASS: SSH identity = ${remote_host}"

# Windows PowerShell -EncodedCommand requires UTF-16LE; no local or remote mutation.
probe='[Console]::WriteLine("COGENTIA_WINDOWS_POWERSHELL_OK:" + $env:COMPUTERNAME)'
encoded="$(printf '%s' "$probe" | iconv -f UTF-8 -t UTF-16LE | base64 -w 0)"
output="$(ssh -n -o BatchMode=yes -o ConnectTimeout=8 "$alias_name" "powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}" 2>/dev/null | tr -d '\r')"
if [[ "$output" != "COGENTIA_WINDOWS_POWERSHELL_OK:${expected}" && "$output" != "COGENTIA_WINDOWS_POWERSHELL_OK:${expected^^}" ]]; then
  echo "FAIL: Windows PowerShell identity mismatch or unavailable: ${output}" >&2
  exit 1
fi
echo 'PASS: Windows PowerShell invoked on verified host (read-only)'
