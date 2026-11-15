---
title: "Agent JHN — standing ChatGPT browser turn delegation"
date: 2026-11-15
document_role: operational
status: working-paper
---

# Standing ChatGPT turns through Navigation Assistant

The Principal explicitly requested a **standing** capability to resume
otherwise terminal conversational LLM work through their own hosted Brave
browser. Agent JHN's current signed root v2 authorizes only browser reads and
MCP result ingress; it does not yet grant browser prompts. Do not confuse
this absence with an inability of Navigation Assistant to control the tab.

The new capability is `browser.chatgpt.turn`, scoped to
`https://chatgpt.com` in browser instance `fracta2-hosted`, with a
specific integer tab ID and an optimistic URL check. Only two operations
exist: `submit` (up to 6000 characters, fixed code) and `observe` (read
the latest assistant message and generation status). No arbitrary JS or
writes to other domains are provided. A ChatGPT turn is *not* a parent
Cognitive Packet completion.

The canonical executor:
- verifies authenticated `agent:jhn` and existing root issuer proof;
- evaluates the latest signed mandate and its exact ChatGPT target policy;
- reserves from the pre-existing canonical COP `max_steps` budget;
- runs one bounded governed handler through the existing Navigation
  Assistant gateway, under the same tab lease;
- settles the budget; returns action receipts and cannot silently
  reexecute a duplicate request ID.

**One-time standing amendment**, not approval per prompt:
- `node scripts/ops/jhn-chatgpt-turn-consent-cli.js --plan` is read-only.
- Owner SSH runs `--request` and obtains one ten-minute private
  consent URL. This does not grant authority.
- The Principal authenticates via the existing Supabase-linked JHN
  account at that URL, reviews the precise delta and approves.
- The already deployed canonical consent workflow checks the exact
  current mandate version and proposal hash and applies vN+1 once.
- Later approved turns require no human reconfirmation while within
  the mandate, tab, purpose and remaining budget.

The existing `cogentia_john_run` MCP tool accepts the raw bounded
`john.request.v1` envelope, `capability=browser.chatgpt.turn`,
`handler.kind=governed_reasoner`,
`handler.allowed_capabilities=['browser.chatgpt.turn']`,
`exposure=bounded`, `max_internal_effects=1`,
`max_external_effects=0`, `max_tool_calls=1`, and
`input.arguments={action:'submit'|'observe',tab_id,prompt?}`.
The server branch enforces the independently signed mandate before any
browser RPC; the normal generic John route cannot be used to bypass this.
The target prompt can instruct its ChatGPT agent to report through a
claimed COP continuation using the already installed
`cogentia_continuation_result_submit` tool. It must use *actual*
continuation/attempt/binding/version identifiers, not fabricated placeholders.

An external CPS reconciler will still need to observe a returned
result or the stable composer and decide whether to launch another
turn. A running browser tab alone cannot prevent ChatGPT's host process
from terminating its own turn.

## ChatGPT browser results over MCP

The previously deployed canonical MCP result host recognizes only the
`local-fixture:mcp` channel. An independently authenticated JHN agent
may submit under the already issued
`cogentia.continuation.result.submit` capability, but a ChatGPT
browser CPS continuation also needs the reviewed channel pair
`chatgpt:browser`. The owner-only, idempotent deployment recipe is:

```bash
ssh fracta2 'cd /srv/cogentia/repos/cogentia && bash scripts/ops/enable-chatgpt-browser-result-channel.sh --apply'
```

It adds the pair to the existing MCP host's explicitly configured channel
allowlist. **No new principal rights are granted by this environment flag**.
An actual submission still requires signed root mandate scope, live
funded reservation, current packet claim, correct execution-binding
correlation and idempotence key; otherwise no receipt is issued.

A browser conversation's ChatGPT model may use the existing
`cogentia_continuation_result_submit` tool to return a correlated
result if that connector is actually available in its session. If not,
Agent JHN must observe the response through the governed browser read
and record that observation separately, never fabricate a model-issued
tool receipt. The browser reply alone is not proof of a COP return.

## First claimed browser continuation

After the standing browser mandate is approved, the owner-side command

```bash
node scripts/ops/prepare-chatgpt-browser-cps-turn.mjs --prepare
```

reserves one funded step in the existing canonical COP journal and claims
a new `chatgpt:browser` continuation for Agent JHN (15-minute claim).
Its JSON output contains an exact first-test prompt with the genuine
continuation ID, binding, version, challenge and idempotence key. The
model is asked to call the existing Cogentia result-submit MCP tool. A
missing tool must be reported as unavailable, **not simulated**.

The submit handler recognizes the result, preserves the durable receipt
and settles that reserved step exactly once. Later retries are
idempotent; the next CPS decision remains separate from simple
turn completion. This script refuses to reserve a task while
`browser.chatgpt.turn` is absent from the active canonical mandate.
No application credentials or browser cookies are embedded in the prompt.

The specific existing ChatGPT blank tab at first inspection was
`94450542` with exact URL `https://chatgpt.com/`. Never treat the
tab ID as permanent; resolve the current tab ID through the read-only
signed `browser.hosted.inspect` capability at dispatch time and
verify the expected origin.
