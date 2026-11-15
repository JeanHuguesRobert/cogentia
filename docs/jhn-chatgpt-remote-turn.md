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

## Live two-turn Reality Test — 15 November 2026

Standing capability browser.chatgpt.turn was approved independently by the
Principal through Supabase authenticated consent, amending canonical JHN
root v2 to v3. The provenance verifier was corrected to accept the actual
signed SSH v1 + SSH amendment v2 + consumed Supabase authenticated v3
lineage without accepting fabricated declarations. Readiness returned true.

Hosted Brave instance: fracta2-hosted, tab 94450542, verified by the
governed browser.hosted.inspect capability. A first prompt created
https://chatgpt.com/c/6af94e1d-8d10-83ed-8daf-27251cc9fd90
with the title Verification livraison Cogentia.

First continuation: ctn_chatgpt_browser_bc0bf4f22e1749e58057c58cf2013e1d
- A composer-selector defect initially inserted the prompt but did not send.
  The fix used the actual form submission button; send_draft sent the
  already staged prompt without insertion duplication.
- ChatGPT used the actual Cogentia connector and replied in the page:
  READY cop:event:a76df3c7-3097-4ef7-9a55-37802acebd94
- Canonical result went through observed, correlated, accepted, returned.
  Exactly one reserved budget settlement was recorded:
  cop:event:232ae8ad-3eff-47bc-974a-dc87c2797ee3.
- Browser UI showed Response complete and returned to the composer.

Second continuation: ctn_chatgpt_browser_a05ddff3e414402c87033382de86c791
- Without a new Principal message, the controlling agent prepared a new
  CPS packet, claim, correlation challenge and independent budget reserve.
- The SAME signed browser.chatgpt.turn capability submitted a second prompt
  in the SAME ChatGPT conversation tab after the prior response completed.
  John independently settled two steps for that browser effect.
- The ChatGPT browser actually replied:
  READY cop:event:c2529909-f42a-4d6f-8fd4-dad64e6fa124
- The second canonical result was returned and its reservation was
  settled exactly once at cop:event:e3c3dd06-5658-4a21-a1a6-8b0e306e656b.
  Browser UI again showed Response complete with an available composer.

PROVEN: Native browser teleoperation, real ChatGPT tool delivery, COP
correlation, budget settlement, and a second turn launched after the
previous conversational end without a Principal intervention.

NOT YET PROVEN: a permanently unattended CPS scheduler consuming returned
continuations and automatically selecting/starting subsequent ChatGPT
turns while the controlling agent is inactive. The second turn here was
initiated by the live controlling agent using existing governed tools.
A future worker must check parent acceptance, authorization, available
budget and stable composer before issuing any next step. The standing
browser authority does not require per-turn approval.

### Final live browser stability projection

The initial DOM selector for data-message-author-role returned zero in the
actual hosted ChatGPT application even though browser text contained two
completed assistant replies. FBF: the browser observer now falls back to
the visible ChatGPT transcript markers and checks the actual composer and
generation status. Under the existing signed browser.chatgpt.turn mandate,
the live tab returned:

- stable_composer: true
- transcript_assistant_count: 2
- transcript_answer: READY cop:event:c2529909-f42a-4d6f-8fd4-dad64e6fa124
- generating: false
- composer_chars: 1 (whitespace only)

This supplies a concrete stable-state signal for subsequent CPS dispatch;
it does NOT itself run an unattended scheduling service.

## Automatic ChatGPT tab recovery / creation (2026-11-15)

An agent may use the **already signed** browser.chatgpt.turn capability
with `input.arguments={"action":"ensure_tab"}`; no tab ID is needed. The
operation belongs to the signed `submit_prompt` preparation within the
existing fixed `https://chatgpt.com/` policy. It has no general browser-open
permission or caller-supplied URL.

The implementation lists tabs of the specific `fracta2-hosted` instance,
then checks each matching ChatGPT document under an explicit tab lease. A
reusable tab must have an accessible, blank composer and no active generation.
If found it returns `{created:false,reused:true,tab_id}`; it never overwrites
an existing draft or interrupts an unfinished answer. If none qualifies, it
uses Navigation Assistant's existing generic `tabs.create` protocol with the
literal URL `https://chatgpt.com/` and `active:false`, then verifies the new
tab by a fresh list. It returns `{created:true,reused:false,tab_id}`.

The next `submit`/`observe` operation carries that returned `tab_id` and
runs under a **separate ordinary John request and COP budget admission**.
A created tab does not imply a ChatGPT message has been sent. If the newly
created page fails exact-origin verification, the action fails rather than
marking the tab ready. No extension protocol or browser installation change
is required; `tabs.create` already exists in the installed extension.


## Durable scheduler wake from a ChatGPT return — 15 November 2026

The MCP result host now emits, **after** acceptance and actual COP budget
settlement, one idempotent `cop.continuation-scheduler-wake/v1` event on the
existing `continuation:<id>` journal topic. This is a durable **request for
scheduler review**, not a new authorization to send a browser prompt. Its
`phase=pending_scheduler_review`, `parent_mandate_status=open`,
`requires_next_step_authority=true`, and `dispatch_permitted=false` ensure
that a returned ChatGPT result is not silently reclassified as a completed
parent mandate or a permission for another model turn.

Implementation: `scripts/lib/chatgpt-cps-return-wake.js`, invoked in
`cogentia-mcp-judgment-result-host.js` only for the signed, recognized
`chatgpt:browser` channel. Actual settlement is checked using the
existing canonical COP budget event by **reservation ID** rather than
assuming an unprefixed event idempotency key. Duplicate MCP result
submissions create no additional wake or settlement. Independent tests
cover three sequential return-wake projections, replay and rejected
unsettled/non-returned input. These are in-memory source-level tests,
**not** a three-turn unattended browser run.

The scheduler consumer is deliberately **not** duplicated here: Inseme
`COPScheduler` and the existing event-driven/claimed consumer remain its
owners. The next integration must (1) read the actual durable wake from
the COP journal, (2) reconstruct and evaluate the parent continuation,
mandate, quota/budget, claim and handler admission, (3) admit a new bounded
ChatGPT turn using the existing `browser.chatgpt.turn` executor only if
permitted, (4) correlate the next result, and (5) verify retries and
interruption/restart. The wake alone neither starts a worker nor demonstrates
unattended autonomous continuation. Do not activate a background third-party
browser scheduler solely because these tests are green; consult the applicable
provider terms and separate operational mandate.

## Existing COPScheduler integration and repeatability — 15 November 2026

`chatgpt-cps-wake-consumer.js` now reads the durable
`cop.continuation-scheduler-wake/v1` events, reconstructs their **canonical**
`cop/continuation` and `cop.continuation-result/v1` journal records, and
checks the original budget settlement. With an **independently trusted**
`admit` callback returning current authority evidence, it routes the verified
result to the existing Inseme `COPScheduler.execute()` bridge. The callback
is a service-side authority boundary, **not** an LLM-generated boolean.
Importantly, a settled budget for the *returned* turn is not a reservation
for the *next* turn; the next effect still requires a separate John/COP
admission and signed mandate verification.

The consumer writes one durable SQLite dispatch intent through the existing
COP transaction boundary before invoking a handler. On duplicate or
concurrent arrival it does not call that handler twice. On interruption after
the intent but before a completed receipt it reports `needs_reconciliation`;
it must NOT blindly send another browser prompt. On completion it persists a
separate `handler_completed` record, with `next_turn_dispatched=false`. A
successful resume here is **parent evaluation**, not a new ChatGPT invocation.
A narrow read-only operational inspection tool is available:

```
node scripts/ops/chatgpt-cps-wake-status.mjs --status
```

The source-level suite exercises: a signed MCP result passing through the
actual result host into the Inseme COP scheduler, three causally linked
returned packets in a persistent SQLite journal, replay/reopen, crash
reconciliation after restart, competing consumers, negative admission and
browser turn regression tests. **17 tests pass.** The live journal at the
moment of inspection contained **2 original browser continuation declarations
and 2 returned events; 0 wake events**: the two earlier Reality Test returns
predate deployment of the wake producer. Do not backfill or redispatch these
historic completions as pending new work.

**Deployment boundary:** publishing these files to main does not restart or
update the running MCP HTTP adapter. A process reload and read-only runtime
validation are separate actions. No unattended consumer service, recurring
job, browser submission or third-party output extraction is activated by this
commit. A production worker would additionally require authenticated local
service identity, live issuer verification, budget and rate-limit admission,
provider-policy compatibility, and recovery of ambiguous effects.

**Provider-policy check:** the [OpenAI EU Terms of Use](https://openai.com/policies/eu-terms-of-use/),
applicable to consumer ChatGPT use in the EEA as of the 2026 review, restrict
automatic or programmatic extraction of Output. A personal subscription and
a signed JHN mandate do not by themselves grant an exception from these
third-party terms. This source implementation stays testable without an
unattended production activation that would require independent contractual
clarification or a permitted official API alternative. Do not confuse this
constraint with a limitation of COP's ability to schedule continuations.

### Bounded continuation driver, without manual per-packet ticks

`runChatgptCpsWakeBatch()` in `scripts/lib/chatgpt-cps-wake-batch.js`
composes the durable consumer with the existing
`runMandateToBoundary()` driver (Cogentia #285) and the same Inseme
`COPScheduler`. Its bounded local execution observes a returned wake,
performs one authorized parent-handler evaluation, re-inspects durable
state, and advances to another return if one became available. There is
**no separate per-packet human or agent-control call** in the three-step
fixture test. The driver stops at its step ceiling, permission denial,
ambiguous effect or empty queue. `queue_drained` **does not mean** the
parent mandate is finished. It does not start a background service, invoke
a consumer web browser or automatically send an additional ChatGPT prompt.

The immediate next production integration remains the *authorized
next-turn dispatcher* attached to a canonical Packet/Continuation under
current provider terms, quota, independently verified mandate and budget.
Its provider-neutral test can use a local fixture or a permitted API
without pretending it was a browser test.
