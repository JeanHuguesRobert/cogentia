---
title: "Agent JHN — standing ChatGPT browser turn delegation"
author: "Institut Mariani / C.O.R.S.I.C.A."
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: 2026-11-15
last_modified_at: 2026-11-15
document_role: operational
document_kind: runbook
status: working-paper
visibility: public
lifecycle_state: active
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: ""
  origin_date: 2026-11-15
  derived_from:
    - ../instructions/AGENTS.shared.md
review:
  status: unreviewed
  reviewed_by: []
---

# Standing ChatGPT turns through Navigation Assistant

The Principal explicitly requested a **standing** capability to resume
otherwise terminal conversational LLM work through their own hosted Brave
browser. **Current verified state (15 November 2026):** JHN's independently signed
root mandate is **v5** and includes `browser.chatgpt.turn`. The earlier v2
restriction described the initial setup, not the current authority. Provider
permission and signed effect-bound admission remain separate gates.

The new capability is `browser.chatgpt.turn`, scoped to
`https://chatgpt.com` in browser instance `fracta2-hosted`, with a
specific integer tab ID and an optimistic URL check. The bounded operations
now include `submit` (up to 6000 characters), `observe` (read-only),
`status` (output-free operational observation), `send_draft` (recover one
verified failed-send draft) and `ensure_tab`
(reuse or create a verified ChatGPT-only tab). No arbitrary site URL or
script is granted by this capability. A ChatGPT turn is *not* a parent
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
`phase=pending_scheduler_review`, `parent_packet_status=open`,
`requires_next_step_authority=true`, and `dispatch_permitted=false` ensure
that a returned ChatGPT result is not silently reclassified as a completed
parent packet or a permission for another model turn.

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
parent Cognitive Packet is finished. It does not start a background service, invoke
a consumer web browser or automatically send an additional ChatGPT prompt.

The immediate next production integration remains the *authorized
next-turn dispatcher* attached to a canonical Packet/Continuation under
current provider terms, quota, independently verified mandate and budget.
Its provider-neutral test can use a local fixture or a permitted API
without pretending it was a browser test.


## Principal channel choice — 15 November 2026

The Principal explicitly retains the **hosted browser / personal ChatGPT tab**
as the target channel, relying on the [Fair Usage research and policy](../research/integration/conversational_agents_fair_usage_cop_2026-11-13.md#6-arbitrage-du-principal-du-15-novembre-2026--navigateur-conservé-fair-usage-revendiqué). Do not silently substitute the OpenAI API as the product goal.
This design preference does not override the independent provider-permission
gate: current permission to run a new unattended consumer Web interaction
remains **disputed/unverified** under the 16 January 2026 EEA terms. The
direct MCP result path is meaningfully different from DOM output scraping,
but it does not settle what the provider permits in its consumer interface.
The local code and deterministic three-step CPS loop remain available for
verification while live autonomous browser dispatch remains disabled.


## OpenClaw precedent — source-verified, 15 November 2026

The Principal identifies OpenAI's public support for OpenClaw as relevant to
the *Fair Usage* defense of accessible personal AI agents. The February 2026
Steinberger recruitment and foundation support, followed by OpenAI's
[12 November 2026 technical account](https://developers.openai.com/blog/securing-persistent-agents-like-openclaw-at-openai)
of over 500 internal persistent agents, provide substantial evidence of
OpenAI's **pro-agent, persistent-agent, guardrail-based strategy**. Technical
parallels with CPS: trusted control plane, separate agent identity, sandbox,
automatic review, observability. The [OpenClaw Codex OAuth integration](https://docs.openclaw.ai/providers/openai)
also supports subscription-based agent workflows external to the Codex CLI.

These facts **do not establish** that unattended navigation and submission
through the ChatGPT consumer website is authorized. The operative terms
remain distinct, and the ability to enforce those terms is a discretion,
not an obligation to sanction every arguable violation. That discretion
is not a prospective consent to browser automation. Retain the hosted-browser
design target and the measurable COP safeguards; maintain the separate
provider-permission gate for autonomous live use. See [Fair Usage doctrine
§7](../research/integration/conversational_agents_fair_usage_cop_2026-11-13.md#7-précédent-openclaw--soutien-industriel-politique-dagentification-et-discrétion-dapplication-15112026).

## Automatic local CPS parent evaluation on MCP return — 15 November 2026

The canonical `createCanonicalMcpJudgmentResultHost` now calls
`createChatgptCpsReturnEvaluator()` **after** a correlated ChatGPT-browser
result has been durably returned, its COP budget settled and its idempotent
scheduler wake recorded. The evaluator rechecks the independently signed
John root, the authenticated actor, current mandate version and funded COP
ledger. It then resumes `handler:chatgpt-browser-result-observer` through
the existing **Inseme COPScheduler** and durably records a
`cop.continuation-dispatch/v1` / `handler_completed` receipt.

The parent evaluator projects acceptance from canonical packet state; a
model's assertion of completion supplies no verified evidence. It never
sends another message, never claims that the parent Cognitive Packet is complete,
and leaves `next_turn_dispatched=false`. Duplicate MCP results still settle
one original budget unit and generate no second evaluation effect. A
failure to admit the evaluator retains a durable wake for later
reconciliation rather than silently inventing a next-step authorization.

**Runtime distinction:** the code is in the canonical MCP host, not a
second worker. It becomes active only when `mcp-cogentia.service` loads its
updated source. Source tests with a signed fixture demonstrate the MCP
receipt -> COPScheduler -> durable handler receipt transition. This is
*not yet* the autonomous decision to create and dispatch a subsequent
ChatGPT browser continuation, which also requires an approved parent
workflow, a distinct bounded child reservation and a stable browser state.

### Reality Test after prior service reload — third-turn attempt

The real JHN v3 mandate and browser inspection succeeded: the hosted
ChatGPT tab `94450542` presented its two previously confirmed replies and
a stable blank composer. A third browser continuation
`ctn_chatgpt_browser_2892f946a8e44935aa55b1790d3608d4` was prepared
with an original reserved step and a 15-minute PacketClaim. Two governed
submission attempts both returned the generic `chatgpt_turn_failed` code;
the subsequent tab observation still showed **two assistant replies**.
Therefore the third submission and MCP result return are **not proven**.
The source defect that hid the underlying non-sensitive error code was
corrected, along with a bounded retry of transient *pre-click* Send-button
readiness. Never retry after a confirmed click. The new source needs a
service reload before this fix can be tested in the running MCP process.
The incomplete third packet must be reconciled and its unused budget
reservation released when abandoned; it must not be counted as a returned
Judgment result.

## Bounded hosted-browser CPS turn driver — 15 November 2026

The reusable `scripts/lib/chatgpt-cps-browser-loop.js` adds a **foreground,
explicitly invoked** orchestration contract on top of Cogentia's existing
`runMandateToBoundary` driver. It prepares a fresh child Continuation, submits
one turn only through authenticated `browser.chatgpt.turn`, waits for both the
MCP `returned` receipt and the canonical COPScheduler `handler_completed`
receipt, and only then consults a separate parent-policy decision for the
next turn. A UI click alone never counts as delivery. Missing authority,
ambiguous result, or exhausted turn budget stops the driver and requests
reconciliation; it never silently submits again. A three-turn deterministic
fixture checks the whole orchestration, final acceptance, timeout and denial.
This fixture does **not** establish a three-turn live browser run.

`node scripts/ops/run-chatgpt-cps-browser-loop.mjs --status` is a safe,
read-only preflight. The opt-in, bounded operational entrypoint is:

```bash
node scripts/ops/run-chatgpt-cps-browser-loop.mjs --run --tab-id 94450542 --three-turns
```

The command **requires** a trusted, locally supplied
`COGENTIA_MCP_JHN_TOKEN` environment variable. It does not print the token,
read the browser cookies or call model APIs. Every browser interaction is a
fresh `john.request.v1` to the existing authenticated MCP endpoint; the
server independently verifies the signed root, version, scope and separate
COP budget before dispatch. The CLI's three-turn intent is **not a new
principal mandate**. Its child packets use the existing canonically claimed
and reserved `prepare-chatgpt-browser-cps-turn.mjs` protocol. The caller must
ensure the channel is permitted under the applicable provider conditions.

The shell available to coding agents lacks this JHN transport credential,
which is expected: repository write authority is not permission to
impersonate the MCP agent or extract secrets. A successful `--status` run
reported JHN root v3, browser-scope grant and available COP budget, but
`mcp_token_present=false` in the shell. A production run must be launched
from a trusted owner/service context that already possesses that credential.
No new credentials or service restarts are invented or circumvented.

**Live result of this turn:** two prior verified ChatGPT returns remain
canonical. The 15 November third continuation
`ctn_chatgpt_browser_2892f946a8e44935aa55b1790d3608d4` was **never
confirmed delivered**: both original-source guarded attempts failed, and a
subsequent governed observation found only the two historical replies. The
attempt was explicitly abandoned, its original COP reservation was released
(`reserved.max_steps` 1→0), its PacketClaim was released, and the
append-only `cop.continuation-abandonment/v1` event was committed. It must
not be replayed or counted as a third live success. The new send-readiness
fix and server-side returned-parent evaluator remain pending a reload of the
running `mcp-cogentia.service` to replace its earlier in-memory module image.

### Single owner-run activation command — no token exposure

For the Principal's own authenticated administrative SSH session on Fracta2,
`activate-chatgpt-cps-browser-loop.sh` is a narrow one-shot wrapper:

```bash
sudo bash /srv/cogentia/repos/cogentia/scripts/ops/activate-chatgpt-cps-browser-loop.sh --run-three-turns
```

It checks root owner administration first; reads **only** the exact JHN
local MCP bearer key as dotenv *data* from the already deployed
`/srv/cogentia/repos/inseme/.env`, not via `source`/`eval`; passes that
one credential only to an `ubuntu` child without printing it; checks the
child's authenticated environment; restarts the existing systemd unit;
checks its HTTP health endpoint; and launches the three-turn test in the
**foreground** using the canonical `browser.chatgpt.turn` and direct MCP
return path. All authority, remaining quotas and tab/origin checks happen
again in John before each effect. The script **never** copies general
secrets or exports the whole `.env` file to a child. It is not a new
production daemon. The harmless `--check` option validates shell and Node
source syntax without credentials, service changes or browser operations.

The normal coding-shell tool cannot perform the root restart: its
`NoNewPrivs=1` and the independent super-broker requires effect-bound
authorization not present in that agent route. Reaching Fracta2 by SSH
or possessing a private environment-file path does not by itself supply
that delegation. **The owner-run command is therefore a true operational
boundary, not an additional policy preference or an invitation to paste
secrets into ChatGPT.** The command has not been executed by the agent.

### Recovery of first owner-run Reality Test — 15 November 2026, 10:12 UTC

The Principal executed the documented one-shot activation by PowerShell
`ssh fracta2 'sudo bash ... --run-three-turns'`. The initial `curl: (7)`
was **transient**, during the service restart: systemd logs show
`mcp-cogentia.service` restarted and listening at **10:12:23 UTC**;
`GET /health` returned HTTP 200 afterwards. The owner wrapper then
reported `needs_reconciliation`, `completed_turns=0`, stage
`dispatch_ambiguous` for continuation
`ctn_chatgpt_browser_c5e8f5f0d6e54673b573d6c8576613b2`.

The CPS journal confirmed a new child declaration with an active one-step
budget reservation and PacketClaim, **no `returned` event and no wake**.
An independent read-only, John-governed inspection of the existing
ChatGPT test tab `94450542` still found exactly the **two historical
assistant replies**, a blank editor and no generation. On this evidence,
the child was explicitly **abandoned**: its budget reservation changed to
`released`, its claim returned `CLAIM_RELEASED`, and a durable
`cop.continuation-abandonment/v1` event was appended. Canonical outstanding
budget reservation count returned to **zero**; no third live completion is
claimed. The ambiguous attempt is never retried under its old identity.

**FBF action:** the runner previously swallowed the exact failure returned
by `cogentia_john_run` and reported only `dispatch_ambiguous`. It now logs
only an **allowlisted error-code token** and optional sanitized cause
(`dispatch_rejected` / `dispatch_exception`), plus the correlation ID.
No prompt body, authentication token, URL, browser response or secret is
logged. A retry is **never automatic** after an ambiguous click. The
owner wrapper also silences the expected `curl` stderr during HTTP health
polling, without weakening the health check itself. Those improvements
are source-level changes and do not retroactively reveal the missing
underlying failure code from the already-ended run.

After this fix, an owner-run test can be retried **as a new child** only
after inspecting the durable journal and the ChatGPT tab for an existing
unexpected submission, and then by reusing the canonical one-shot entrypoint.
If the new run fails, its sanitized `failure` and `cause` should be used
for root-cause repair before further retries.

### Root cause resolved — 15 November 2026, second owner-run (`required_event_handler_missing`)

The Principal re-ran the one-shot administrative command. The bounded
foreground pilot prepared continuation
`ctn_chatgpt_browser_061723fdbf3c44e196964d2ceabd2054` and reported
`dispatch_rejected` with the now-surfaced canonical failure
`chatgpt_turn_failed`, cause `required_event_handler_missing`, with
`completed_turns=0` and `dispatch_ambiguous`. The issue is **within John**,
not a missing subscription or a provider-origin browser error.

**Precisely established cause:** the `browser.chatgpt.turn` canonical path
already passed `requiredEvents:false` to `runJohnRequest()`, appropriate for
its very narrow pre-authorized fixed capability. However,
`runJohnRequest()` constructed `createGovernedHarness()` **without
forwarding `options.requiredEvents`**. The harness therefore used its
normal `requiredEventsForTurn` heuristic, found words such as `Cogentia`,
`packet` or `agent` in the generated CPS test prompt, demanded
`orientation.required`, and stopped because that handler is intentionally
absent from the strictly scoped browser-turn registry. The result was
`required_event_handler_missing` **before any browser capability call**.

**FBF:** `scripts/lib/john-run.js` now forwards
`requiredEvents: options.requiredEvents` to `createGovernedHarness()`.
This preserves the general policy for all callers who do not supply an
explicit override; it only respects the existing deliberate bypass for
fully governed narrow flows, which still have signed John/COP scope,
fixed capability, quota, budget and output checks. The concrete regression
fixture now uses a prompt explicitly mentioning `Cogentia cognitive packet`
and proves that the actual browser recipe is dispatched in its mocked
session instead of requesting an unconfigured orientation handler. Full
44-test CPS/browser suite passes. No provider-facing third turn has yet
been proven after this correction.

**Recovery:** independent John-governed read-only inspection of test tab
`94450542` confirmed exactly two historical assistant replies, an empty
composer and no generation. No canonical `returned` result exists for the
failed continuation. Its reserved COP step was released (active reserved
steps 1→0), its PacketClaim released (`CLAIM_RELEASED`) and
`cop.continuation-abandonment/v1` was appended with the exact error reason.
A later run MUST use a new continuation ID; do not replay this one.

### Reality Test: three ChatGPT browser turns VERIFIED with one bounded recovery — 15 November 2026

**Evidence from the owner-run process** (started 10:30:01 UTC):

| Continuation | MCP `returned` | COPScheduler `handler_completed` | Budget settled |
| --- | --- | --- | --- |
| `ctn_chatgpt_browser_3182660f513a4908a596b453a3968c11` | yes | yes (10:30:18) | yes |
| `ctn_chatgpt_browser_812be6de270841dea8afcbfd217987e3` | yes | yes (10:30:29) | yes |
| `ctn_chatgpt_browser_22891c5d59d046fa860ca1e0ca192ff7` | yes (10:36:51) | yes (10:36:51) | yes |

The foreground owner command initially reported:
`completed_turns=2`, `needs_reconciliation`, third stage `return_ambiguous`.
Read-only, John-governed browser inspection then found that ChatGPT itself
had displayed **“Could not send this ChatGPT message”** and retained the
exact third-continuation prompt in its editor. No canonical result had
arrived. The existing `browser.chatgpt.turn` **`send_draft`** operation was
therefore invoked *exactly once*, bound to that same continuation ID,
without reinserting the text or creating a new packet. The browser click
was acknowledged, then the model delivered the real MCP result and the
canonical COPScheduler evaluated it. A final browser observation found
**three assistant replies**, a blank stable composer and no generation.

The COP ledger was independently re-read for all three IDs and showed:
`returned=true`, `scheduler-wake=true`, `handler_completed=true`,
`ExecutionBudgetSettlement=true` for each, no outstanding reserved COP
steps, and `store.auditCommitments().ok=true`. This verification was also
persisted directly in the append-only COP topic
`packet:jhn:browser-cps-three-turn-reality` with idempotency key
`cps:reality:2026-11-15:three-chatgpt-browser-returns-with-bound-recovery`
and causal references to all nine returned, handler and settlement receipts.

**Precise scope of success:** three **real** browser-based ChatGPT turns,
all correlated and resumed. The first two proceeded without intervention.
The third required one explicit browser-draft recovery **after** the owner
foreground pilot had exhausted its return wait. Thus this experiment
proves real inter-turn CPS continuity and effective recovery; it does
**not yet** prove three completely unattended, error-free turns, nor an
indefinitely resident autonomous Judgment loop. The parent Cognitive Packet remains
open. No API-model substitution occurred.

**Fix Bugs First follow-up:** `browser-chatgpt-turn.js` now exposes two
non-content browser observations when a continuation ID is explicitly
supplied: `send_failure_visible` and
`draft_bound_to_requested_continuation`. The guarded foreground runner
can perform at most **one** `send_draft` for the SAME existing continuation
if and only if the page explicitly displays the failed-send indication,
that exact ID remains in a nonempty composer, no generation is underway,
and no canonical returned result exists. No blind retry after a confirmed
click and no silent new continuation. This self-recovery code is tested
at the source level; it was **not** part of the already-completed live
third-turn recovery, which was invoked separately under John authority.

## Human-visible Judgment tab ownership and MCP version provenance — 15 November 2026

### Judgment browser tabs: clear visual separation

The Principal requests tabs reserved for ChatGPT-based Judgment production to
be unmistakable and not confused with his personal, interactive ChatGPT tabs.
Live hosted-browser inspection identified the existing conversations:

- `94450530` (and duplicate `94450623`): "Étude des boucles Judgment";
- `94450542`: "Vérification livraison Cogentia".

**Future generated first prompts** now begin with the literal
`[COGENTIA JUDGMENT - NE PAS INTERAGIR]`, encouraging ChatGPT's automatic
conversation title generator to preserve a distinguishing identifier. This
mechanism is *heuristic*, not a guarantee: ChatGPT assigns conversation
names under its own logic. For robust browser-tab warning, the existing
**signed, already-authorized** `browser.chatgpt.turn` `submit` and
`send_draft` recipes additionally set a fixed, local page title prefix:

`[COGENTIA JUDGMENT - NE PAS INTERAGIR] | <previous title>`

They do so only on the exact-origin and exact-tab path **after** a successful
Send-button click; an in-document `MutationObserver` reapplies the prefix if
the single-page application rewrites `<title>`. This change is deliberately
**not** made by `observe` (read-only means no cosmetic mutations) and uses
no new generic scripting or third-party writes. The label may disappear
across full page reload or when the ChatGPT conversation is opened in a
new tab: durable labels should be provided by ChatGPT's own conversation
**Rename** control, using the same conspicuous prefix. Neither the local
page title nor a first-prompt instruction changes the account-side title
of historical conversations automatically. Do not claim the existing
three hosted tab titles were already changed: the live service must first
reload these new recipes and a governed send must occur for local stamping.

### Three separately versioned concepts for the connected MCP apps

1. **Cogentia MCP implementation `serverInfo.version`.** Previously
   `0.9.0`, now **`0.10.0`** in `scripts/lib/cogentia-mcp-core.js`.
   It appears in legacy MCP `initialize`, modern `server/discover`, server
   `/_meta` and the `/health` response **after a service restart**. Both
   Cogentia public/private views using this same server share this version.
2. **Cogentia daemon implementation and MCP protocol version.** The
   underlying gateway has independently reported `3.0.0`; protocol strings
   such as `2025-11-25` and `2026-07-28` are *negotiated MCP protocol
   revisions*, not the application/server release number. Cogentia's
   `package.json` version is another independent project field.
3. **ChatGPT-side plugin catalog/package version.** The Principal sees
   `1.0.0` for three connected MCP plugin entries following Refresh. There
   is **no evidence that these three UI labels derive from the
   `serverInfo.version` handshake**: their value differs from the live
   endpoint's verified `0.9.0`. The third, Unix Shell Exec, is a separate
   connector and must not be claimed to use Cogentia's `SERVER_VERSION`.
   The ChatGPT plugin package/app revision is distinct from the live MCP
   server implementation metadata. OpenAI documents different publication
   flows for a plugin package version and remote MCP metadata refresh;
   refreshing tool schemas does **not guarantee** a visible change to a
   plugin-package version badge. Sources:
   <https://developers.openai.com/plugins/deploy/submission>,
   <https://developers.openai.com/plugins/deploy/connect-chatgpt>,
   <https://developers.openai.com/plugins/deploy/app-review>.

**Operational expectation:** reload `mcp-cogentia.service`, check that
`GET /health` reports `version=0.10.0`, then refresh the Cogentia public and
private ChatGPT connectors. If the UI still shows `1.0.0`, that number is
controlled by the connector package/version in ChatGPT rather than the live
MCP handshake; do **not** reassign an arbitrary value in the server or
reinstall the three connectors just to change the badge. Separately verify
the exact public/private descriptor after refresh. Version identity for the
Unix Shell Exec connector needs inspection of its own implementation or
registered package metadata.


## FractaCognition: pre-answer execution of next authorized read-only probe (15 November 2026)

The generic **John governed step harness** now implements an executable
pre-answer continuation gate, not merely the operator guidance in
`instructions/AGENTS.shared.md`. This closes a concrete gap from Cogentia
#285: a JudgmentHandler could previously propose an obvious authorized read
and then declare its own answer complete without actually using that
capability.

- A `governed_reasoner` may return a structured step
  `{"kind":"answer","answer":"provisional explanation", "next_action":
  {"capability":"corpus.search", "input":{"query":"..."}}}`.
  The OpenAI step-reasoner system prompt exposes this optional shape and
  advises calling an admissible capability directly where possible.
- `createGovernedHarness()` intercepts an accepted answer carrying
  `next_action`, invokes the **existing**
  `decideMandateContinuation()` decision boundary, then independently
  requires the named capability to be registered, of risk `read_only`, and
  included in **actual caller authorization**. It uses the existing
  `governedInvokeCapability()` path, which enforces max tool calls, cost,
  time and effect budgets. Neither model prose nor a model-supplied mandate
  extends authority.
- A successful read **defers** the provisional answer; the real observation
  is given to the next reasoning step so the answer can be updated from
  evidence. John records a real `john.tool.requested` / `john.tool.receipt`
  pair with source `pre_answer_gate`, including native `tool_calls_count`
  accounting. This is not simulated tool execution.
- Unregistered, unauthorized, non-read-only, unaffordable, failed and
  repeated probes stop with typed, **non-success** boundary reasons rather
  than falsely reporting completion or executing an unapproved operation.
  The previous provisional answer is retained only as nonterminal context.
  A closing recommendation cannot replay an already completed exact
  capability+input pair, nor can it cause a duplicate second implicit read.
- **Deliberate limitation:** unstructured free-form answer text cannot
  reliably be interpreted as an executable command; the generic runtime
  gate acts when the provider emits an explicit structured `next_action`.
  This is real wired enforcement for opted-in step reasoners, not a
  universal interception of the ChatGPT app's message composer, the
  provider's hidden reasoning or all external JudgmentHandlers. Nor does
  the implementation turn a read-only capability into a broad right to
  read unrelated resources: the capability's own identity, data/privacy
  gates and currently admitted COP envelope continue to apply.

Validation: `scripts/check-agent-jhn-governed-harness.js` and
`node --test scripts/lib/john-answer-next-action.test.js`; both exercise
actual governed dispatch with stubbed source results, authorization denial,
no unauthorized email, duplicate suppression and complete John receipt
projection. No OpenAI paid API calls or external sends were made as part
of these tests. A later live, controlled Judgment turn should exercise
this route with a real read-only capability and verify the actual source
result, canonical journal and provider quota behavior.


## Durable next-action bridge — 15 November 2026 (#330)

The original result-to-scheduler wake consumer only recorded
`handler_completed`, with `next_turn_dispatched=false`. The existing
`COPScheduler` can now also retain a **candidate** returned by its trusted
parent handler when its projection says `status=continue` and identifies a
bounded action ID. It records `next_action_candidate` and
`next_action_admitted=false`; this is **not a browser authorization**,
**not a parent completion**, and not a prompt sent.

`chatgpt-cps-next-step.js` supplies a minimal, reusable dispatch bridge:

1. `listChatgptCpsNextSteps(store)` projects candidates and ambiguous
   intents from the canonical COP journal; it does not inspect the browser.
2. `consumeChatgptCpsNextStep(...)` first requires a **trusted** separate
   admission callback, with current mandate, independently evidenced provider
   permission and an already admitted child execution budget. It commits a
   durable `cop.continuation-next-step/v1` intent in a CAS transaction before
   passing the candidate to a callback that must use the **existing John/COP
   execution route**. It records `child_dispatched` only after a valid child
   continuation ID and a receipt returned by the **governed John/COP
   dispatcher**. Under the Principal's later Optimistic Locking decision, its
   report is trusted by default as an agent/executor statement; an independent
   receipt verifier is **optional** for a profile that warrants extra review.
   A missing or ambiguous receipt, or an explicitly failed optional check,
   leaves a durable `needs_reconciliation` state.
3. Concurrent calls cannot execute a second child; after a crash between
   intent and receipt, the state remains `needs_reconciliation`. Replaying an
   uncertain external effect is forbidden. A child return must still arrive
   and be independently evaluated in the ordinary wake path.
4. `runChatgptCpsNextStepBatch()` uses `runMandateToBoundary`, not a new
   scheduler. It drains several independently admitted candidates in one
   invocation and preserves the parent's open status.

The read-only operator command now reports both return-wake and next-action
queues and their reconciliation needs:

```bash
node scripts/ops/chatgpt-cps-wake-status.mjs --status
```

**Testing and deployment limits.** The source tests cover one child,
concurrent contenders, three causally chained returns and next-action
handoffs, signed-admission mock denial, deliberate crash, persistent SQLite
replay and reopening. Fixture permissions and provider receipts are explicit
**test doubles**, not operational authorization. The bridge has no resident
service, no autonomous browser activation, no new credential access, no new
provider permission and no model/API billing. The canonical production journal
was clean when inspected: 5 real returned events, 3 evaluated wakes, no pending
wake, no next-action candidate, no reconciliation required. This source change
needs a normal service reload before the running MCP host could use its updated
consumer, but no active production code dispatches new browser turns merely
because the new module exists.

The remaining milestone is to connect an independently permitted, scoped,
restart-resilient CPS **worker within the existing operational control plane**
to this bridge (not a second scheduler), with a current signed mandate, provider
permission evidence, quota accounting, child claim and budget, start-up replay,
acknowledgement, revocation and crash repair. Validate real unattended behavior
separately from passing source tests, without replaying the three previously
settled ChatGPT turns. The Principal's browser/Fair Usage choice is preserved;
current supplier permission remains disputed rather than assumed.


## Output-free hosted-browser CPS observation — 15 November 2026

The bounded CPS pilot's automated readiness and failed-draft checks now call
`browser.chatgpt.turn(action=status)` rather than the older, diagnostic
`observe` projection. The new fixed Core `status` recipe checks only:
current exact origin, composer presence/blankness and character count,
generation flag, exact continuation ID in **the user's unsent draft** (when
specified), and a failure indication in UI alert/toast elements. It does
**not** select assistant messages, read the main transcript, extract or return
model Output, or infer success from rendered text. Its return object is
allowlisted field by field, so unsolicited output content is discarded.

The existing `ensure_tab` action also uses this output-free status probe.
It will reuse an existing conversation **only when it is marked** with
`[COGENTIA JUDGMENT - NE PAS INTERAGIR]`, or a blank root ChatGPT tab.
Personal, unmarked conversations are not silently adopted as CPS workspaces;
if none is suitable, an inactive blank tab is created through the existing
verified-origin Navigation Assistant capability. The older diagnostic
`observe` method remains for backwards compatibility but is **not used**
by the automated CPS pilot. A full page refresh can remove a cosmetic tab
marker; using the native ChatGPT Rename control remains the durable option.

This closes the explicit automated-Output-extraction issue in the normal CPS
pilot's status checks. It **does not itself establish** the provider's
permission for unattended browser submission, credential/session use or any
other service-specific restriction; that gate stays independent. UI errors
that do not appear in alert/toast elements may not be auto-recovered; the
correct behavior is an ambiguous-effect handoff, not a blind second click.
Source tests cover omission of malicious/unexpected Output fields, no
transcript selectors, exact continuation binding, preservation of personal
tabs and no insertion under status operations. No live browser effect occurred
as part of this code change.


## ONA resident recovery of already returned MCP results — 15 November 2026

`createChatgptCpsLocalWakeReconciler` in
`chatgpt-cps-return-evaluator.js` reuses **the exact same COPScheduler
result-observer handler** as the interactive MCP return path. Its authority
check is suitable for a resident *local* replay: it re-resolves the current
canonical John mandate, independently verifies its full issuer lineage,
checks the `cogentia.continuation.result.submit` scope and insists that
an already-recorded result's budget settlement belongs to the **pinned
original budget**. There is no new reservation or model/browser effect.
An invalid issuer, revoked/expired mandate, unrelated settlement or pending
ambiguity fails closed without marking the parent completed.

The adapter `scripts/ops/ona-chatgpt-cps-reconcile.mjs` exports
`runScheduledHeartbeat({env})`, matching the **existing** Operium Node
Agent (ONA) `kind=script` scheduler interface. It adds no timer, daemon,
parallel scheduler or new COP store. The owner may configure a job with
script `cogentia/scripts/ops/ona-chatgpt-cps-reconcile.mjs`, cwd `cogentia`
and a bounded polling interval using the existing ONA catalogue/job policy.
An existing job must be **explicitly enabled**; there is no default
activation. Its runtime environment must specify:

- `COGENTIA_CPS_WAKE_RECOVERY_ENABLED=1` (otherwise returns `not_enabled`)
- `COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS` pointing to the already trusted
  public authorized-keys file (no private key or new credential issuer).

The canonical SQLite path is fixed to
`/var/lib/cogentia/cop/john-root-v1.sqlite`; the pinned issuer fingerprint
is the same as the current MCP result host. Credentials are not copied into
the model, printed or exported. The `--status` CLI observes the pending
wakes without writing; `--run-once` invokes the opt-in bounded local replay
and requires exactly the existing trusted runtime configuration. ONA
`runScheduledHeartbeat` is called automatically **only after** the owner has
configured and enabled its pre-existing scheduler job.

The implementation is tested with two queued results, a persisted SQLite
close/reopen, duplicate replay, independently rejected issuer, revoked
mandate, unrelated budget, disabled-by-default ONA integration, real Operium `runScheduledJob`
dynamic import and missing issuer path. Test signers are explicit fixtures, not proof of production
authorization. The running ONA service was **not** reconfigured or restarted;
new code on main is source-ready, not evidence of resident execution.
This recovery slice ONLY processes settled result wakes. It does not inspect
ChatGPT output or submit an additional prompt, so it cannot be mistaken for
completion of the separate *fully autonomous browser Judgment loop*.

## Live ONA resident return-recovery and independent acceptance boundary — 15 November 2026

The Principal restarted `operium-node-agent.service` through their pre-existing
SSH/sudo owner channel at 17:42 UTC. The actual resident service now loads
`cps:chatgpt-return-reconcile` as **fourth ONA job**, at 60-second intervals.
Its first live scheduled run at 17:42:42 UTC returned `last_ok=true`,
`last_error=null`; repeat executions were observed. This proves **resident
replay of already committed, settled returns**, not unattended selection or
dispatch of any new ChatGPT prompt. The source of authority and scheduler
remains the original COP/Inseme journal plus Operium ONA; no new daemon was
created. The generic ONA node-status `ok` was temporarily false because of
an unsuccessful startup self-probe, even while its direct `/health` returned
HTTP 200 and the CPS job was succeeding; keep these signals distinct.

**Historical 17:42 implementation superseded later on 15 November 2026:**
The evaluator originally demanded an additional independent verifier for
claims made by the JudgmentHandler. The Principal rejected that rule as
unnecessary friction; the subsequent Optimistic Locking policy below replaces
it. The old regression milestone is retained as history, not current behavior.


## Optimistic Locking: trust the mandated JudgmentHandler — 15 November 2026

Principal's explicit decision: **trust the agent/LLM by default**. The
returning JudgmentHandler is empowered to judge whether its own work is done;
its decision does not need a second LLM, issuer, or independent acceptance
certificate. Reconstruct the identity, correlation, COP mandate and result
admission through the *existing* MCP return path; do not invent an extra
verification role downstream of that admission.

**CPS vocabulary correction (#330):** a mandate governs authority, not
completion of a task. The Cognitive Packet is the work to advance; the
continuation is one suspended step; ChatGPT is its JudgmentHandler. The
`status: "answered"` field reports the turn's return, while
`result.packet_status` represents the agent's judgment of packet progress:

```json
{"status":"answered","result":{"answer":"Le paquet est achevé","packet_status":"completed"}}
```

If further work is necessary, the Handler chooses its next cognitive step:

```json
{"status":"answered","result":{"answer":"Étape suivante identifiée","packet_status":"continue","next_action":"inspect-next-source","next_question":"Inspectez la prochaine source pertinente."}}
```

If blocked, `packet_status: "blocked"` describes work that cannot currently
progress; it does not revoke the agent's mandate. A trusted, admitted
JudgmentHandler's explicit completion decision is accepted under Optimistic
Locking with `acceptance_basis=agent_judgment`; no second verifier is required.
The wake consumer records `parent_packet_status` and, when applicable,
`parent_packet_acceptance_basis`. `next_action` is a candidate for a fresh
continuation subject to normal COP authority, packet claim and budget
admission for *that effect*, not an extension of the Handler's mandate.

Old receipts with `result.mandate_status`, `parent_mandate_status`,
`mandate_completed`, or the `cop.john-mandate-turn/v1` journal profile
remain readable. New records use `packet_status`, `parent_packet_status`,
`packet_completed` and `cop.john-packet-turn/v2`; their coexistence does
not modify existing MandateDeclarations or duplicate any prior execution.
The existing John turn journal exposes `packet_continuity` and the private
`cogentia_john_packet_pending` read tool (the older
`cogentia_john_mandate_pending` name remains an alias), with legacy
read fallback), and its return field `packet_status` describes work only.
`john.run.completed` means one conversation turn ended, not the packet.

The journal preserves the agent's judgment, canonical receipt and correction
path; an observed contradiction is handled by ordinary append-only
reconciliation, **after** the decision, not by a blocking review for each
result. This is *trust in the agent's judgment*, not a new right to send mail,
publish externally, spend money or bypass quota/platform restrictions.

The source-level regression tests demonstrate both closed parents and admitted
candidate continuations. They do **not** claim an already-running ONA
process has loaded these new sources, or that a truly unattended child browser
turn has been executed in production.

## Resident ONA cycle: explicitly assigned CPS packets and trusted agent next actions — 15 November 2026 (#330)

**The same 60-second ONA job** now has a source-level orchestration path for
three queues, without another scheduler or daemon: (1) MCP returns already
settled that need COPScheduler evaluation, (2) explicitly assigned new
continuations awaiting their first browser delivery, and (3) `next_action`
candidates emitted by a mandated JudgmentHandler. The existing
`runMandateToBoundary` driver handles bounded batches. This change does not
rewrite the earlier, read-only recovery job or replay historical conversations.

The **explicit assignment** rule intentionally excludes older test artifacts:
a continuation must be canonical and suspended, with `provider=chatgpt`,
`channel=browser`, `resumeTo=handler:chatgpt-browser-result-observer`, an
existing packet claim and a reserved COP budget, and must contain
`state.dispatch_mode="cps:assigned-browser-turn/v1"` plus a nonempty
`state.question`. The provider/channel markers alone are *not* sufficient.
A previously returned or abandoned continuation is never eligible for first
delivery. The normal `chatgpt-cps-wake-status.mjs --status` command exposes
`assigned_ready` and `assigned_reconciliation_required` separately from
returned wakes and next-action candidates.

`chatgpt-cps-assigned-dispatch.js` checks the active packet lease and
unsettled reservation, then requires the existing COP/provider admission
callback, commits one SQLite `first-dispatch-intent` under the existing
transaction lock, and only then calls the governed John dispatcher. A
confirmed UI click produces `first-dispatch-receipt` with
`phase=ui_click_dispatched_not_model_result`; **it is not a ChatGPT result**.
After an unknown outcome, a competing worker or a process restart sees
`needs_reconciliation`; it cannot blindly submit the same prompt twice.
The agent's ordinary explicit `packet_status=completed` or `next_action`
remains trusted under Optimistic Locking, without a second judging model.

The **Core-owned prompt recipe** carries the real assigned question and the
already allocated `continuation_id`, `attempt_id`, binding, version and
challenge. It asks the ChatGPT JudgmentHandler to call
`cogentia_continuation_result_submit` directly, filling in its actual answer
and its own `packet_status`; no constant `READY` result is fabricated.
`chatgpt-cps-john-dispatch.js` uses only the existing authenticated loopback
MCP `cogentia_john_run` capability: read a stable, blank ChatGPT composer
through the output-free `status` action, then invoke `submit` under its own
bounded COP request. No new extension API and **no assistant Output scraping**.

**Activation boundaries (do not collapse):** the existing resident recovery
job is active, but the new source code is not yet loaded in its Node process.
Production first-delivery **remains disabled** until
`COGENTIA_CPS_BROWSER_DISPATCH_ENABLED=1` is explicitly configured *and* an
admitted `assignedWorker`/`nextWorker` is bound to the existing John transport,
with independently established provider/channel permission and the existing
mandate/budget/claim. The actual ONA environment inspected had **no**
`COGENTIA_MCP_JHN_TOKEN` and no enable flag. An enable flag without a
configured governed worker produces an explicit error, not a fabricated
submission. This source change is **not** evidence of unattended consumer
browser traffic or provider permission. Do not activate it merely by flipping
a variable. Use the existing provider permission review and runtime authority
rather than adding a new signature/mandate infrastructure.

Source tests exercise a disposable SQLite journal and real Operium
`runScheduledJob`: first admission, lease expiry, already settled budget,
three assigned sends in one bounded batch, crash/restart ambiguity, duplicate
suppression, output-free John-MCP request shape, no-token/permission refusal,
the two dispatch classes within the same resident tick, and explicit
historical-test exclusion. They do not claim an unattended live ChatGPT
response. The canonical production store has **zero** explicitly assigned
first deliveries and **zero** pending `next_action` candidates at the time of
inspection; none of the earlier eight browser test declarations was reissued.

### Generic assignment preparation and automatic tab selection (same #330 packet)

The original `prepare-chatgpt-browser-cps-turn.mjs` was test-only and always
requested the fixed `READY` response. It now also supports
`--prepare-assigned`, reading a small JSON object containing `task_ref` and
`question` on standard input. Its **generic** producer
`chatgpt-cps-assignment.js` uses the existing signed John COP mandate,
execution-budget reservation and Inseme packet claim. It derives a stable
continuation ID from `task_ref`; replay of the exact question returns the
existing ID, while a conflicting question under the same reference is refused.
The resulting packet has the explicit assignment marker expected by the ONA
cycle. This operation **only prepares** the task: it does not submit anything
to a web provider, call an LLM or insert a prompt into a browser tab.

Example of preparing a packet *after the appropriate task and authorization
have been selected* (illustration, **not executed against production**):

```bash
printf '%s' '{"task_ref":"issue:JeanHuguesRobert/cogentia#330:investigate","question":"Analysez les résultats de ce paquet."}' | node scripts/ops/prepare-chatgpt-browser-cps-turn.mjs --prepare-assigned
```

The existing governed John transport can now use its **existing**
`browser.chatgpt.turn(action=ensure_tab)` when no tab ID is supplied,
selecting a marked Judgment conversation or safe blank tab before the
output-free composer `status` preflight and `submit`. It does not adopt the
Principal's unmarked personal conversations, and an uncertain UI effect
remains fenced; the MCP result must still be explicitly returned and
recognized. No new navigation extension or additional capability.

FBF: both the assigned-first-delivery batch and the next-action batch now
recognize that **exactly N** successful deliveries within a bound of N may
empty the queue on the final allowed step. That is `queue_drained`, not a
spurious `step_limit` failure. An actual failure or remaining queue still
reports the appropriate boundary. Tests use the exact-bound case.

The production ONA job remains limited to settled MCP return reconciliation:
the automatic browser dispatcher has neither been configured with a valid
provider-channel authorization nor with the existing authenticated John
transport token. No old task was silently resent and no live new browser
submission is claimed.

### Default ONA→John binding and bounded autonomous child chain (#330)

The later source binding in `chatgpt-cps-default-worker.js` removes the need
to inject testing callbacks into production. When **explicitly enabled by the
operator after the provider channel review**, it (a) checks the current
signed John root, pinned issuer and quota, (b) uses a designated reviewed
provider/channel reference and the authenticated localhost John MCP token,
(c) calls the generic first-delivery dispatcher, and (d) prepares child
continuations directly from the designated agent's `next_action` plus the
full `next_question` that agent supplied in its MCP result. Every child uses
the same deterministic preparation, new claim, fresh budget reservation,
existing John browser capability and idempotent result path. The signed
`chatgpt_turn_policy.max_consecutive_turns` (8 in the observed JHN v4) bounds
the chain, not a magic unbounded background recursion.

The *entire* resident orchestration remains the **same ONA 60-second script
job**, with no new timer or daemon. A disposable canonical SQLite + signed
mandate test exercises first assignment, two resulting children, three
sequential dispatch receipts, then an idle cycle with **no fourth delivery**.
This is a **source-level chained reality test**, not evidence that ChatGPT
answered three real unattended tasks after the new deployment.

Production operator environment required for external provider dispatch:
`COGENTIA_CPS_BROWSER_DISPATCH_ENABLED=1`,
`COGENTIA_CPS_BROWSER_DISPATCH_PERMITTED_CHANNELS=chatgpt:browser`,
`COGENTIA_CPS_BROWSER_PROVIDER_PERMISSION_REF` (the real operator-reviewed
provider permission basis), and a safely provided `COGENTIA_MCP_JHN_TOKEN`.
`COGENTIA_CPS_BROWSER_TAB_ID` is optional: without it the signed John
`ensure_tab` action locates a safe, marked workspace. The provider-reference
variable does **not by itself prove that a provider actually permitted this
mode**. Its issuer, contract scope and evidence remain an operator/provider
matter; it must not be fabricated from an LLM statement or a generic JHN
mandate. The real ONA configuration **does not have these dispatch settings**.
Leaving dispatch disabled is an affirmative, non-invasive production state;
return reconciliation remains active. No fallback to paid API or unrelated
models is silently substituted.

### Canonical Fracta2 read-only Reality Test and FBF (latest 15 November 2026)

After introducing the ONA async cycle, a real `--run-once` against the
canonical Fracta2 COP store exposed `ERR_INVALID_STATE: statement has been
finalized`: the caller returned the cycle Promise from inside a `try/finally`
and closed SQLite before the awaited scheduler settled. **Fixed** by using
`withOwnedCpsStore`, which holds SQLite ownership until the async cycle
actually finishes. A regression test forces an async yield while the store
must remain open and checks that it closes only after completion. The real
one-shot then returned `ok=true,status=queue_drained`, no browser effects.

Live post-restart evidence: JHN canonical mandate `v4`,
`browser.chatgpt.turn` scope true, **1,932 available steps** in the observed
ledger, and no JHN MCP bearer in the local foreground runtime. ONA's existing
return-reconciliation job was healthy and running (182 successful scheduled
runs at the last observation), but remained the **pre-new-source** resident
process. Both eligible assigned-first-delivery and next-action candidate
queues were empty, so the old `READY` test packets were not re-dispatched.

The three-step autonomous chain, direct John command envelopes, auto safe-tab
selection, trusted completion judgment and signed hop cap have passed source
integration tests only. Sending new browser prompts unattended is still
conditional upon a genuine provider/channel permission basis and correct
service-side authenticated John token. Neither was fabricated or enabled.
Once legitimately configured, the existing ONA job is the only clock: one
bounded poll every 60 seconds, not a recursive second agent/scheduler.

## Distributed Promise parent notifications — 2026-11-15 (Inseme #186/#187)

COP/Core now exports the source-level generic
`reconcilePacketParentContinuations` from
`inseme/packages/cop-core/src/packet-parent-continuations.js`. Existing ONA's
**same 60-second cycle** invokes it after settled result-wake evaluation.
No new scheduler or model verifier. The procedure identifies previously
recorded `child_dispatched` causal relations and appends idempotent
`cop.packet-parent-continuation/v1` `child_state_changed` facts on the
*parent's own topic*. `returned` is distinct from `completed`; neither
means the handler's mandate is terminated. Optional join-wait registrations
with a designated scheduler executor can resume a parent exactly once after
its declared `all` / `allSettled` condition becomes ready.

**Actual canonical Fracta2 Reality Test (no outbound browser traffic):**
initial parent `ctn_chatgpt_browser_e511159e639cedc26e3f9f6a181c4545`
had only its `child_dispatched` link to
`ctn_chatgpt_browser_4a16b3b54cd20c8dd9a6b0e41f4d19a9`; no
child-completion notification. A safe one-shot reconciler with browser
outbound explicitly disabled appended two distinct parent events for this
child, one `returned` and one `completed`, with canonical source receipt
refs; `auditTopicCommitment` passed. Across all live parent-child links:
`parent_notifications=6`, `parent_join_resumptions=0`, `external_effects=0`.
No older persisted parent has an explicit registered `join_wait` policy, so
this change **informs** the parents and does not invent a speculative next
model prompt, auto-complete a parent, or pretend an actual parent handler
resumed. The new generic join path is separately tested against the real
COPScheduler after a process restart, including a Fracta2→ThinkPad→Fracta2
two-machine cross-process test; issue #187 retains the receipts. B/C extend
the other Promise operators over this same event projection.

The resident ONA process only loads this source revision **after reload**.
