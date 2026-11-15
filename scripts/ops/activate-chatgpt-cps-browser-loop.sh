#!/usr/bin/env bash
# Owner-only, one-shot activation of the signed 3-turn hosted-browser Reality Test.
# Requires established root sudo access on the Principal's own Fracta2.
# No broad EnvironmentFile import, no secret in command-line arguments/logs,
# no new daemon, no change to Principal COP mandates or provider policy.
set -euo pipefail
ROOT=/srv/cogentia/repos/cogentia
NODE=/usr/local/node-v26.5.0/bin/node
ENV_FILE=/srv/cogentia/repos/inseme/.env
SCRIPT="$ROOT/scripts/ops/run-chatgpt-cps-browser-loop.mjs"
TAB=94450542

if [[ "${1:-}" == '--check' && $# -eq 1 ]]; then
  "$NODE" --check "$SCRIPT"
  "$NODE" --check "$ROOT/scripts/lib/chatgpt-cps-browser-loop.js"
  printf '%s\n' 'source_syntax_verified; owner-run activation not started'
  exit 0
fi
if [[ $# -ne 1 || "$1" != '--run-three-turns' ]]; then
  echo 'Usage: activate-chatgpt-cps-browser-loop.sh --check | --run-three-turns' >&2
  exit 2
fi
if [[ "$(id -u)" != 0 ]]; then
  echo 'owner_administrator_required: run under established sudo on Fracta2' >&2
  exit 77
fi
if [[ ! -f "$ENV_FILE" || ! -f "$SCRIPT" ]]; then
  echo 'canonical_runtime_files_missing' >&2
  exit 1
fi
# Parse one exact dotenv key as DATA; never eval/source a general .env file.
# Only the credential required for the existing authenticated local MCP
# transport is passed to the child. Node parsing avoids shell injection.
token="$($NODE --input-type=module - "$ENV_FILE" <<'JS'
import {readFileSync} from 'node:fs';
const file=process.argv[2];
const rows=readFileSync(file,'utf8').split(/\r?\n/);
const match=rows.filter(s=>s.startsWith('COGENTIA_MCP_JHN_TOKEN='));
if(match.length!==1)process.exit(2);
let token=match[0].slice('COGENTIA_MCP_JHN_TOKEN='.length).trim();
if(token.length>=2&&(token[0]==='"'||token[0]==="'")&&token.at(-1)===token[0])token=token.slice(1,-1);
if(token.length<12||token.length>4096||/[\r\n\0]/.test(token))process.exit(2);
process.stdout.write(token);
JS
)" || { echo 'jhn_mcp_token_not_available' >&2; exit 1; }
if [[ -z "$token" ]]; then echo 'jhn_mcp_token_empty' >&2; exit 1; fi
export COGENTIA_MCP_JHN_TOKEN="$token"
unset token
cd "$ROOT"
# Verify the credential is visible to the *unprivileged* child without
# displaying it. No browser attempt precedes this check.
status="$(runuser -u ubuntu -- "$NODE" "$SCRIPT" --status)"
if [[ "$status" != *'"mcp_token_present":true'* ]]; then
  echo 'unprivileged_jhn_mcp_token_not_inherited' >&2
  exit 1
fi
systemctl restart mcp-cogentia.service
for i in {1..20}; do
  if curl -fs --max-time 2 http://127.0.0.1:8791/health >/dev/null; then break; fi
  sleep 1
done
if ! curl -fs --max-time 2 http://127.0.0.1:8791/health >/dev/null; then
  echo 'mcp_service_not_healthy_after_restart' >&2
  exit 1
fi
# Foreground, at most three turns. Browser actions are still independently
# signed/budget-gated by John, and results must arrive by the native MCP tool.
exec runuser -u ubuntu -- "$NODE" "$SCRIPT" --run --tab-id "$TAB" --three-turns
