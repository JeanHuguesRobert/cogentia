---
title: ChatGPT browser — local OpenAI-compatible Magistral provider
date: 2026-11-16
document_role: operational
document_kind: runbook
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
status: experimental — source verified, no live browser deployment
---

# Local ChatGPT browser provider

## Principle

Ordinary completion:

    OpenAI client -> Magistral -> loopback ChatGPT provider
           -> existing authorized browser-turn transport -> ChatGPT UI
           -> observed ChatGPT answer -> OpenAI completion

The **provider itself** has NO COP packet, mandate, claim, scheduler, MCP
result submission or GitHub Issue. The existing John browser transport is
governed **upstream**, outside the provider. This separation does not
remove or bypass the real browser executor's existing authorization gate.

MCP judgment continuation:

    ChatGPT -> Cogentia MCP tool -> continuation_required
             -> existing Cogentia COP/mandate/continuation handler

A tool-side judgment continuation stays within the Cogentia mechanism
(see \`skills/continuation-handling/SKILL.md\` and the existing
\`cogentia_continuation_result_submit\` endpoint), not within the ordinary
completion adapter. A provider response is not evidence of a Cogentia
continuation receipt.

## Locality and recursion

The provider persists requests in SQLite **on the host that runs it**.
Default: \`~/.local/state/cogentia/chatgpt-browser-provider.sqlite\`;
override with \`COGENTIA_BROWSER_CHAT_STATE_DB\`. No persistent work
records are exported to GitHub or a remote shared COP journal.

The local store tracks \`queued|running|deferred|done|uncertain\`.
A browser turn acquires the only available local running slot.
While a turn is running, nested calls to the same provider return HTTP
409 \`local_continuation_required\` with a local job ID **without
dispatching a second browser turn**. Explicit
\`X-Cogentia-Call-Chain: chatgpt-browser,cogentia-mcp\` also causes a
suspension even when the browser appears idle.

The caller can inspect \`GET /v1/continuations/local_<id>\` with the
provider's bearer credential and later retry the same request with the
same \`X-Client-Request-Id\`; a deferred job can then resume, subject to
the same local single-flight check. A job whose actual browser outcome
is unknown stays \`uncertain\` after restart and is NEVER replayed
blindly. Reconciliation is an operator/higher-level handler responsibility.

When a Cogentia tool needs judgment, its caller must use the **existing
governed Cogentia continuation mechanism**. Its API router client now
preserves the local provider's \`continuation\` metadata on HTTP 409; a
409 is not a new COP mandate, and the bridge does not create one.

If multiple hosts deliberately share a single hosted ChatGPT browser,
their local locks alone cannot prevent cross-host simultaneous sends:
the higher-level router must preserve call lineage and arbitrate shared
browser access. The deployed Navigation Assistant tab lease remains
the transport-level defense.

## Source

- \`scripts/lib/chatgpt-openai-local-store.mjs\`: local durable state
- \`scripts/lib/chatgpt-openai-bridge.mjs\`: OpenAI projection and reentrancy
- \`scripts/lib/chatgpt-openai-browser-runner.mjs\`: ChatGPT UI turn/observation
- \`scripts/lib/chatgpt-openai-http.mjs\`: bearer-protected local HTTP
- \`scripts/ops/serve-chatgpt-openai-provider.mjs\`: server binding
- \`scripts/lib/chatgpt-cps-john-dispatch.js\`: shared existing governed
  transport, also used by the separate Cogentia CPS handler
- \`operium/profiles/magistral-chatgpt-browser-node.v1.json\`: additive map

## Running and testing

Only from a reviewed, host-local checkout with the already authorized
John browser transport and its existing authenticated MCP token:

    node --test scripts/test-chatgpt-openai-provider.mjs

    COGENTIA_BROWSER_CHAT_STATE_DB=<local cache directory>/chatgpt-provider.sqlite \
      node scripts/ops/serve-chatgpt-openai-provider.mjs

The service requires \`COGENTIA_BROWSER_CHAT_PROVIDER_KEY\` (or the
existing \`COGENTIA_API_KEY\`) and \`COGENTIA_MCP_JHN_TOKEN\` in its
process environment. Never copy them into Git, prompts or log output.

The endpoint is loopback \`127.0.0.1:8898\` by default, separate from
the already occupied port 8798. Add the Operium map entry to the
existing Magistral map; do not replace other model nodes.

Supported: bounded text Chat Completions, legacy text completions,
\`GET /v1/models\`, and buffered SSE. Actual model pinning,
OpenAI token usage, tool-call shapes, native role hierarchy and
real token-level streaming are **not** available through the browser UI.

**Verification:** source and isolated tests are not a live Reality Test.
No production service restart, map mutation or automated ChatGPT turn
was performed by this change.
