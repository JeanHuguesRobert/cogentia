---
title: ChatGPT browser as Magistral OpenAI-shaped upstream
date: 2026-11-16
document_role: operational
document_kind: runbook
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
status: experimental — source committed, not deployed
---

# ChatGPT browser → canonical CPS → OpenAI Chat Completions

Tracking: [cogentia#335](https://github.com/JeanHuguesRobert/cogentia/issues/335).

## Goal and architectural ownership

This implements a **private, loopback-only** text-generation upstream for the
existing Magistral router. It does **not** call OpenAI's paid API and is
**not** a claim of authorization to repurpose the ChatGPT website.

1. Magistral accepts OpenAI-style HTTP and selects the opt-in
   \`chatgpt-browser\` model/tier.
2. A local bridge creates an assigned Cognitive Packet continuation in the
   **existing canonical JHN COP event store**, using
   \`prepareAssignedChatgptCpsContinuation\`.
3. The **existing resident ONA worker** (if independently configured and
   admitted) delivers the assigned question through the already governed
   \`browser.chatgpt.turn\` capability / Navigation Assistant.
4. ChatGPT's designated JudgmentHandler invokes
   \`cogentia_continuation_result_submit\`; Cogentia validates correlation,
   claim, budget and receipt, and appends \`cop.continuation-result/v1\`
   with \`phase=returned\`.
5. The bridge reads that durable result and returns one OpenAI-shaped JSON
   response. The turn's answer does **not** complete a parent mandate.

No second scheduler, browser extension, direct CDP bridge, browser cookie
scraper or copied COP state machine is introduced. The bridge does not
deliver prompts itself: a running HTTP process alone does not enable ONA.

Source:
- \`scripts/lib/chatgpt-openai-cps-bridge.mjs\` — validation, deterministic
  assignment reference, returned-result projection
- \`scripts/lib/chatgpt-openai-cps-http.mjs\` — authenticated HTTP surface,
  bounded concurrency and buffered SSE
- \`scripts/ops/serve-chatgpt-openai-cps-provider.mjs\` — loopback host,
  canonical SQLite binding
- \`scripts/test-chatgpt-openai-cps-provider.mjs\` — isolated tests
- \`inseme/packages/magistral/src/router.js\` — no fallback on ambiguous
  browser outcome and HTTP status preservation
- \`operium/profiles/magistral-chatgpt-browser-node.v1.json\` — additive,
  **not automatically deployed**, map node

## Local-only setup (operator-controlled)

Prerequisites: use a Fracta2 checkout with sibling \`cogentia\` and \`inseme\`
repos; verify the canonical COP journal path and JHN root mandate;
independently verify provider/channel permission and resident ONA worker
configuration. Do not infer any of those from the existence of this file.

Choose a deployment secret, supplied to the process securely. It must be
the same **internal upstream** secret that Magistral loads under the
\`COGENTIA_API_KEY\` slot; do not commit it or print it to logs.

\`\`\`bash
# On the owner-governed Fracta2 deployment host, after reviewing permissions:
cd /srv/cogentia/repos/cogentia
COGENTIA_COP_STORE=/var/lib/cogentia/cop/john-root-v1.sqlite \
  node scripts/ops/serve-chatgpt-openai-cps-provider.mjs
# listens only on 127.0.0.1:8898 (also requires a secret in its environment)
\`\`\`

The runtime reads \`COGENTIA_BROWSER_CHAT_PROVIDER_KEY\`, falling back to
\`COGENTIA_API_KEY\` as its bearer. Service installation and lifecycle
belong to Operium, not this source module.

**Map activation is a separate operator action.** Merge the *single* node
from \`operium/profiles/magistral-chatgpt-browser-node.v1.json\` into
the live Magistral map; **do not replace** the existing model map with the
one-element file. The provider entry opts out of automatic fallback,
and uses a dedicated tier, \`chatgpt-browser\`.

## Client contract

\`\`\`http
POST /v1/chat/completions
Authorization: Bearer <MAGISTRAL_API_KEY>
X-Client-Request-Id: <stable unique client request ID>
Content-Type: application/json

{
  "model": "chatgpt-browser",
  "messages": [
    {"role":"user","content":"Expliquez la distinction entre un paquet et un mandat."}
  ],
  "stream": false
}
\`\`\`

Client → Magistral authentication uses \`MAGISTRAL_API_KEY\`;
Magistral → local CPS provider uses \`COGENTIA_API_KEY\` (configured
through \`apiKeyEnv\`). The client never receives either upstream key.

Also exposed:
- \`GET /v1/models\`: advertises \`chatgpt-browser\`.
- \`POST /v1/completions\`: string \`prompt\` to one text completion;
  legacy streaming intentionally unsupported.
- \`stream:true\` on chat: buffered SSE role/content/stop chunks **only after**
  the correlated MCP result exists, not genuine token streaming.
- \`GET /health\` on the bridge: verifies the HTTP service only, **not** a
  live browser session, signed mandate, result connector or ONA worker.

Limits: text only, no reliable native system/developer role hierarchy,
unsupported function/tool calling, image/audio and structured-output tools.
Sampling parameters such as \`temperature\` are accepted for broad client
interoperability but ignored and reported as \`parameters_not_enforced\`.
No trustworthy ChatGPT UI token usage or exact model-version pin is available;
\`usage\` is \`null\`. A response contains \`_cps.continuation_id\` and
\`_cps.receipt_ref\` for provenance.

The browser-dispatch recipe is currently bounded by ChatGPT's 6,000-character
prompt and assignment's 4,500-character question; this adapter imposes a
smaller request limit to reserve room for delivery instructions.

A timeout is **not** a cancellation. HTTP 504
\`error.code=cps_result_pending\` includes a continuation ID; the
canonical result may arrive later. Never automatically switch to an
alternative model after submission or dispatch ambiguity. Repeating the
same payload with the same \`X-Client-Request-Id\` gives the same
durable assignment; new client IDs intentionally produce new assignments.
Avoid timeouts/reverse proxies that drop long-running requests without
preserving their durable continuation references.

## Verification / acceptance

\`\`\`bash
node --test scripts/test-chatgpt-openai-cps-provider.mjs
# From sibling inseme checkout (workspace dependencies installed):
node --test packages/magistral/tests/router.test.js
\`\`\`

A production Reality Test must separately prove:
1. Signed current JHN mandate, provider permission, budget and ONA worker
   **authorized** and **reachable**, not merely advertised.
2. Authenticated Magistral request reaching the loopback upstream.
3. ONE canonical assignment and ONE governed Navigation Assistant browser
   submission; no duplicate send after a timeout.
4. Real ChatGPT MCP result accepted into the canonical COP journal;
   the resulting HTTP answer has the same text and receipt.
5. No hidden fallback, and no false assertion that an HTTP reply or browser
   composer state completed the parent Cognitive Packet.

**As of source creation, this document does not certify a live end-to-end
test, service installation, permanent worker readiness or provider permission.**
