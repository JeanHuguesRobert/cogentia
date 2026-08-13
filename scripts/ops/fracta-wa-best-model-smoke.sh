#!/usr/bin/env bash
# One-shot: WhatsApp COP smoke with best OpenAI model (no WhatsApp send).
# Usage on Fracta: bash scripts/ops/fracta-wa-best-model-smoke.sh
set -euo pipefail
cd /srv/cogentia/repos/cogentia

# Best model available on the live OpenAI key (2026-08-13 probe):
# sol-pro / terra-pro → model_not_found; sol and terra → 200.
BEST_MODEL="${AGENT_JHN_WHATSAPP_OPENAI_MODEL:-gpt-5.6-sol}"
FALLBACK_MODEL="${AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL:-gpt-5.6-terra}"

# OpenAI key from unit source if present
if [ -z "${OPENAI_API_KEY:-}" ] && [ -r /etc/cogentia/magistral.env ]; then
  # shellcheck disable=SC1091
  set -a
  # parse only OPENAI_API_KEY line safely
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      OPENAI_API_KEY=*) export "$line" ;;
    esac
  done < /etc/cogentia/magistral.env
  set +a
fi

export AGENT_JHN_WHATSAPP_OPENAI_MODEL="$BEST_MODEL"
export AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL="$FALLBACK_MODEL"
export AGENT_JHN_WHATSAPP_GUIDE_URL="${AGENT_JHN_WHATSAPP_GUIDE_URL:-http://127.0.0.1:8791/guide/chat}"
export COGENTIA_COP_ACCOUNTING_PERSIST=1
export COGENTIA_COP_SPEND_SPOOL="${COGENTIA_COP_SPEND_SPOOL:-/var/lib/cogentia/accounting/spend.ndjson}"
export COGENTIA_OPS_STATE_DIR="${COGENTIA_OPS_STATE_DIR:-/var/lib/cogentia}"

echo "BEST_MODEL=$BEST_MODEL"
echo "FALLBACK_MODEL=$FALLBACK_MODEL"
echo "OPENAI_API_KEY=$( [ -n "${OPENAI_API_KEY:-}" ] && echo present || echo missing )"

node scripts/ops/smoke-whatsapp-cop-accounting.mjs \
  --env /srv/cogentia/repos/inseme/.env \
  --mode guide \
  --question "In two precise sentences: what is Agent John, and how does he differ from Jean Hugues Robert?"
