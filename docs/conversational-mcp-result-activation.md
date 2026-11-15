---
title: "Conversational JudgmentHandler — MCP result submission activation"
date: "2026-11-13"
status: "source-ready, not deployed"
document_role: "operational"
document_kind: "integration-runbook"
visibility: "public"
lifecycle_state: "active"
license: "CC BY-SA 4.0"
---

# Conversational JudgmentHandler — MCP result submission activation

**Owner:** [Cogentia #330](https://github.com/JeanHuguesRobert/cogentia/issues/330).
**COP result semantics:** [Inseme #113](https://github.com/JeanHuguesRobert/inseme/issues/113).
**Claim/fencing:** [Inseme #121](https://github.com/JeanHuguesRobert/inseme/issues/121).
**Budget/Accounting:** [Inseme #161–164](https://github.com/JeanHuguesRobert/inseme/issues/161).
**Fair Usage:** [source analysis](../research/integration/conversational_agents_fair_usage_cop_2026-11-13.md).

## Verified source implementation

The Cogentia MCP core defines a protected tool named
`cogentia_continuation_result_submit` using
`cop.continuation-result-submit/v0`, which accepts a structured
`cogentia.step_result/v1` candidate. It never invokes continuation
`resolve` or assumes that an observed answer is correct. The tool is a
mutating capability and is not advertised to anonymous clients.

The host uses the existing Inseme append-only SQLite event log and packet
claim coordinator, not a second database or scheduler. New result observations
require a current claim/epoch/generation, checked inside the same SQLite
transaction as the append. A durable receipt can be reread after a lost ACK,
subject to authenticated actor + receipt scope; replay creates no second
event.

An optional canonical host resolver rehydrates the continuation from durable
COP declaration/result events; verifies the authenticated JHN Principal/actor,
independently signed mandate, current version, active COP execution-budget
reservation, and provider/channel policy supplied by the trusted service; and
then submits to the existing atomic receipt adapter. It cannot create a new
mandate, issue a budget, or assert provider permission.

## Existing HTTP server integration (disabled by default)

`scripts/cogentia-mcp-http.js` composes
`createMcpJudgmentResultRuntime()`, enabled only with
`COGENTIA_MCP_JUDGMENT_RESULT_ENABLED=1`. The composition requires:

- the **already existing**, pinned canonical store at
  `/var/lib/cogentia/cop/john-root-v1.sqlite`, referenced through
  `COGENTIA_JHN_CANONICAL_STORE_PATH`;
- the independent, previously authorized JHN issuer key via
  `COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS` (fingerprint pinned in source);
- a signed canonical mandate authorizing the **exact** capability
  `cogentia.continuation.result.submit`, and a funded canonical budget with a
  reservation for the dispatched continuation;
- an explicit operator-reviewed `COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS`
  allowlist of exact `provider:channel` pairs. This is a technical gate, NOT
  evidence that provider legal terms permit automation.
- an independently attested JHN MCP caller bound to the signed mandate label.

If any mandatory configuration is absent or invalid, the host fails closed.
Do **not** set the flag merely to demonstrate that the tool appears.
No consumer account, provider subscription or browser session is permission
to synthesize a signed COP mandate.

**Live source audit (2026-11-13):** the canonical JHN root mandate exists
at version `v1`, but its current signed scope does **not** include
`cogentia.continuation.result.submit`. Consequently this capability is
NOT authorized in production. Introducing it requires the existing versioned, independently signed amendment workflow and matching
budget authority, not an undocumented test override.

**FBF correction (2026-11-13):** Inseme `amendMandate()` now optionally
persists a bounded self-contained public approval proof supplied only by its
independently trusted verifier. Cogentia `amendVerifiedJohnRoot()` verifies
an Ed25519 or SSH-signature against the exact canonical amendment proposal
and pinned issuer key; `createOfflineJohnIssuerVerifier()` reconstructs
the *full* chain v1→v2→… on a cold read, checking each previous event ID,
version, principal, scope, dates, signature, and verified proof reference.
It rejects opaque-only unsigned amendments for use as JHN's canonical
authority. Following the 2026-11-14 FBF correction, the active mandate
version is resolved dynamically at every admission
from the canonical COP journal. The old v1 signature cannot silently grant
an additional capability. No change to the MCP tool schema or connector is
required for a mandate amendment, issuance or revocation.

Historical state on 2026-11-13: JHN root v1 was not yet amended. As
verified on 2026-11-14 (§12), the Principal subsequently signed v2;
its MCP runtime is not yet activated. Do not fabricate an issuer signature, or use the MCP
transport token as Principal approval.

## Source tests performed on Fracta2

- `node --test scripts/lib/cogentia-mcp-continuation-result.test.js`:
  MCP tool discovery, deny by default, verified transport caller, direct
  `tools/call` JSON-RPC, receipt replay, idempotency conflicts.
- `node --test scripts/lib/cogentia-mcp-judgment-result-host.test.js`:
  locally signed test mandate, real COP grant/reservation, claim, channel
  refusal, successful receipt and duplicate read. Test keys/mandates are
  ephemeral fixtures, not operational authority.
- `node --test scripts/lib/cogentia-mcp-judgment-result-runtime.test.js`:
  runtime disabled by default and startup failure on absent canonical authority.
- `node scripts/check-mcp-dual-era.js` and
  `node scripts/check-mcp-public-effect-boundary.js`: existing protocol-era
  compatibility and anonymous mutation denial.

An additional three-continuation fixture reuses the same signed test
mandate, ledger and claim coordinator. It submits three distinct MCP
candidate results to the existing event store and uses Inseme #113's
recognizer for separate `observed/correlated/accepted/returned` Events.
Three unique observations and three terminal `returned` events are
verified. The driver is a test harness, **not** an autonomous dispatcher.

These are source-level tests on Fracta2, **not** a proof of the live hosted
browser, third-party provider terms, production Accounting settlement or an
autonomous three-continuation CPS loop. The fixture records three budget
reservations but does not settle observed vendor usage; reservation does
not prove resource consumption. Provider-side usage estimates and
cost imputation still need integration with #161–164.

## Next legitimate Reality Test

1. Extend the current canonical mandate with a narrowly scoped signed version
   that admits the result-return capability and account for its budget. Do not
   overwrite the signed v1 declaration.
2. Select a provider/channel with verified automation permission. Record the
   evidence and fair-use ceilings. A local MCP-capable worker is the simplest
   controlled baseline.
3. Create three low-risk packet/continuation declarations with their own
   reserved budgets, current claims and exact MCP return contracts.
4. Activate the explicitly pinned runtime version and feature flag through the
   authorized deploy workflow; observe an authenticated MCP `tools/call`
   invocation from the worker and a durable receipt.
5. Feed observed results through the canonical Inseme #113 recognizer,
   independently accept/return/resume via the existing #165 consumer, and
   demonstrate subsequent dispatch without human intervention.
6. Test lost ACK, stale claim, budget exhaustion, quota/circuit breaker,
   provider policy deny and service restart. Record source/deployed SHAs,
   receipts, resource spend, provider permission and remaining limitations.

**Do not claim end-to-end autonomous operation until all six steps have
been demonstrated on the actual runtime.**

## 11. Principal attention — prepared one-confirmation path (2026-11-13)

The Principal explicitly reported the excessive attention cost of repeated
manual setup. The ownership of that cost belongs to the agents/infrastructure,
not to the Principal. Avoid requesting terminal commands or multiple approval
steps until the entire technical proposal and its verification are ready.

**Prepared on the actual Fracta2 canonical JHN root (read-only):**
`node scripts/ops/john-result-mandate.mjs inspect` reports current
`mandate:jhn:john-root@v1`, an exact `v2` proposal that *only* appends
`cogentia.continuation.result.submit` to the two existing read capabilities,
and confirms that forbidden actions, budget ceiling and validity are unchanged.
The signed bytes are deterministically produced by
`node scripts/ops/john-result-mandate.mjs prepare`. The proposal's current
SHA-256 was checked against the actual canonical output, **without modifying
COP**. A deliberately invalid signature was refused by `apply`; the number
of live mandate declarations stayed **1 before and after**.

**One-time interim user action (not yet performed):** on a reachable ThinkPad
with PowerShell and the existing RSA SSH issuer key, review
`scripts/ops/john-result-mandate-sign.ps1`, then execute it once. It
reads and displays the exact proposal via SSH, identifies the existing issuer
key by its pinned fingerprint, independently checks the bytewise SHA-256,
asks the Principal to type `OUI` **once**, signs in the dedicated SSH
namespace, uploads **only the signature**, and invokes the server's
`apply` routine. The server recomputes the proposal from the *current* COP
state, verifies the pinned public key and signature, records only the
v2 amendment, and cold-verifies its lineage. It leaves the MCP runtime
**disabled**. No private SSH key is sent anywhere. The PowerShell orchestration
has not yet been executed on the ThinkPad; source-level preparation and
cryptographic proof tests passed on Fracta2. If the ThinkPad is unavailable,
do not repeatedly ask the Principal to operate Fracta2 manually.

The existing Supabase-authenticated JHN Principal consent flow is a
promising **future one-click** issuer interface and is already designed in
`docs/cop-supabase-authenticated-consent-2026-11-09.md`, but its authenticated
HTTP/App deployment and independent *portable* amendment-proof lineage are
not yet integrated. Do not mistake a Supabase service-role credential, a
MCP Apps UI click, or an unverified COP ledger event for issuer authority.
Fixing this UX should eventually retire the recurring terminal-signature
ceremony **without weakening Principal consent**.

The operator should report one narrow decision at a time; after that the
agent must continue with canonical COP budget admission, provider/channel
permission proof, deployment and CPS Reality Test without imposing a
series of unrelated human operations. This reduces Human Attention and
repeated context switching, not accountability.

**ThinkPad verification (2026-11-13):** The existing
`i7-thinkpad-jhr` is online through Tailscale, SSH from Fracta2 works,
SSH from ThinkPad to `ubuntu@fracta2` works, and the ThinkPad's existing
`~/.ssh` public-key catalog contains exactly one public key matching the
already-pinned JHN issuer fingerprint, with its private key file present.
No private-key contents were read or exported and **no signing operation was
performed**. The PowerShell helper's syntax was parsed by the real ThinkPad
PowerShell engine with **zero parse errors**, without executing its body.
This is a tested *readiness* check, not a demonstration of interactive
key-unlock/sign/import. If/when the Principal chooses to run it, it still
must display and obtain one explicit confirmation before signing.

**Verified one-command staging (2026-11-13):** The reviewed signer script
was staged (NOT executed) at `$env:TEMP\cogentia-john-result-mandate-sign.ps1`
in the authenticated Windows SSH account on ThinkPad. The bytes there match
the source file SHA-256, and its source parsed with **zero PowerShell errors**
on the actual ThinkPad. The script uses noninteractive `ssh -n` for read-only
transport calls, preventing SSH from consuming the signing session input.
The canonical proposal was also read successfully using an SSH roundtrip
ThinkPad→Fracta2; no signature was produced. When the Principal chooses to
review and approve, he can run one PowerShell command:

`powershell -NoProfile -ExecutionPolicy RemoteSigned -File "$env:TEMP\cogentia-john-result-mandate-sign.ps1"`

**A failed staging or signing run must not be represented as consent.**
This file is only a temporary convenience copy; it can be deleted after the
signed amendment is duly recorded. The authoritative source remains GitHub,
and the authority after signing remains only the existing COP journal.

## 12. Live signed v2 and post-approval FBF (2026-11-14)

**Principal action completed; do not ask for another signature.** JHN signed
only the reviewed exact proposal SHA-256
`088bf80ebda0b2f8265b450ea3bc0c3671f2af500add5677e8a3709b1a955d13`
via the already enrolled ThinkPad SSH issuer key. The canonical SQLite COP
journal records the amendment event
`897fdac6-bd6a-43ce-b34f-327246155981`. Independent Fracta2 read-only
inspection reconstructs `v1 → v2` and validates the full SSH-signature
lineage. Scope: existing `browser.navigation.instances` and
`browser.hosted.inspect` unchanged; one new
`cogentia.continuation.result.submit` capability; all 15 explicit forbidden
actions and original validity preserved.

At the same inspection, the root budget ledger had a signed grant of
2048 max steps, 15 already settled, 2033 available, zero reserved. No new
budget grant or reservation was needed to validate the **mandate** itself.
A fully signed-root, funded COP preflight for the exact new capability on
`v2` passed with an isolated **test transport identity** (no live caller
attestation claimed), with zero event writes and zero external execution.

**Regression found and fixed (FBF):** the existing canonical browser-read
vertical had hard-coded `version_pin:'v1'`, and its activation check called
the issuer verifier without passing the COP store required for a v2 chain.
After legitimate v2 issuance, `activate-john-root-read.sh --check` failed
with `canonical_read_authority_unavailable`; the fix makes the read
vertical use the currently resolved, independently verified mandate version
and passes the store to the checker. `--check` now reports
`SIGNED_ROOT_AND_CANONICAL_BUDGET=VALID`, with no effect or budget spend.
Source commit `e48e448`.

**Remaining deployment status:** `mcp-cogentia.service` active on Fracta2,
with process started 2026-11-12 (before these changes). Its unauthenticated
loopback `/tools` surface currently lists 64 tools and does not advertise
`cogentia_continuation_result_submit`. The runtime has NO
`COGENTIA_MCP_JUDGMENT_RESULT_ENABLED`, permitted channel allowlist, or
runtime activation configured (the version pin is no longer needed).
Local `sudo -n` is denied by `no new privileges`;
this session has not restarted or changed systemd. No remote ChatGPT,
Claude or Grok invocation was attempted. Enabling without a permitted,
independently reviewed provider/channel and authorized restart remains
blocked. The already signed v2 alone is NOT a reason to enable arbitrary
consumer-provider web automation.

**Next FBF without Principal toil:** prepare a local, provider-independent
worker MCP Reality Test and a healthchecked, reversible activation plan for
one narrowly defined `provider:channel` pair. Respect the operator's existing
restart channel; do not bypass root broker or ask Principal to sign another
broad mandate. Actual CPS redispatch, authenticated consumer transport,
usage settlement and provider-specific terms remain separately testable.


## 13. Dynamic mandate control plane (2026-11-14)

**Architectural invariant:** The MCP server exposes stable technical tools;
COP mandates authorize their use dynamically. Issuing, amending, revoking or
expiring a mandate **must never require an MCP connector refresh, a tool
schema change, or a service restart**. Retain independent cryptographic
issuer verification and exact capability/budget/claim checks on every fresh
admission; do not reuse a previously allowed decision without revalidation.

FBF implemented in `createCanonicalMcpJudgmentResultHost`: remove startup
`version_pin`, read `resolveMandate(store, mandate_ref)?.version` on each
incoming result and run `assessJohnCopAuthority` against the currently signed,
validated and non-revoked lineage. The HTTP runtime no longer reads the
`COGENTIA_MCP_JUDGMENT_RESULT_MANDATE_VERSION` environment variable.
An integration test keeps the **same MCP host instance** while applying a
signed `v1→v2` amendment, then a COP revocation; admission succeeds after
the valid amendment and fails immediately after revocation, without a reload.
No actual Principal key, real database or provider account is changed by this
test.

One-time service deployment of a new server implementation may require a
service restart or a hot-code deployment. Likewise changes to MCP tool
names/schemas may require a client refresh. These are **software deployments**,
not mandate operations. Provider-channel approval is a separate operator
configuration and must not be mistaken for a mandate or silently opened by
an agent.


## 14. Consolidated doctrine (2026-11-14)

The shared architectural decision is [COP / FractaLog — Mandats et continuité historique proportionnée](https://github.com/JeanHuguesRobert/inseme/blob/main/docs/mandates-fractalog-historical-continuity.md). Mandates are dynamically verified control-plane data, not MCP connector configuration. Acts are represented by timestamped locally chained records and corrections are additional events. Full storage compromise is a consciously accepted residual risk, not a reason to impose blockchain, global ordering or external time authority before useful capability deployment.

## 15. Live readiness diagnostic — 2026-11-14

Run **without root, no service restart and no COP mutations**:

```sh
node scripts/ops/check-continuation-result-activation.mjs
```

The command prints only a redacted JSON readiness report and exits 0 when
all **local configuration/preflight** checks pass, 2 otherwise. It:
- cold-verifies the signed JHN root mandate and available event-sourced budget
  from the existing read-only COP adapter;
- checks the running systemd unit, service start relative to the result-runtime
  source, loopback tool discovery, activation flag, reviewed provider/channel
  allowlist, and whether JHN authenticated mutate configuration is **visible
  in the unit Environment property**;
- does **not** output token values or inspect EnvironmentFile contents, which
  means a transport credential supplied through a separate EnvironmentFile is
  conservatively **unverified**, not necessarily absent;
- does **not** prove external provider permission, real authenticated caller,
  claim, durable result delivery or autonomous scheduler redispatch.

Observed Fracta2: canonical mandate v2 and budget ready; service active;
runtime newer than current MCP process, feature flag/channel list absent,
mutate transport not verifiable in the unit environment, and the tool omitted
from **anonymous** loopback discovery by design (not an absence of the
source capability). The previously documented one-time deployment
and provider/channel authority are therefore still pending. Ordinary
future mandate changes must **not** restart or reload the MCP.

The minimal next *operational* step is an authorized, healthchecked
deployment of the existing code with a **concretely reviewed** channel and
authenticated JHN transport. Do not configure an arbitrary consumer-provider
channel merely to make this report green. The separate end-to-end receipt and
autonomous CPS wake/redispatch test must follow before reporting this capacity
as live.

## 16. FBF — public catalogue is not authenticated discovery (2026-11-14)

The prior readiness diagnostic mistakenly treated absence of
`cogentia_continuation_result_submit` from anonymous GET `/tools` as
proof that the tool was not registered in the live MCP. This was wrong:
`MUTATE_TOOLS` are intentionally hidden from **anonymous** discovery.
An authenticated JHN caller may see them via MCP `tools/list` while
the public catalogue continues to omit them.

`check-continuation-result-activation.mjs` now reports the anonymous
discovery as **informational**, checks the *source contract* separately,
and explicitly marks authenticated JHN discovery as `not_checked`
rather than inventing an authorization result. The readiness output is
versioned `cogentia.continuation-result-readiness/v2`.
Do not switch the entire service to `COGENTIA_MCP_VIEW=full` or enable
anonymous mutate merely to make the public `/tools` response display
a protected capability.

A new **disposable local HTTP loopback** regression covers actual
`POST /mcp` with JSON-RPC `tools/list` and `tools/call`, using a
test-signed COP issuer, actual budget reservation, live packet claim
and SQLite event receipt store. It asserts: anonymous refusal,
authenticated JHN discovery, rejection of the bad token without a
write, one successful candidate receipt, and idempotent replay without
duplicate write. This is a realistic HTTP transport **test fixture**,
not the production service or an external provider test.

**Actual deployment blocker:** the live MCP has not reloaded the new
source runtime, the optional result feature flag and reviewed
provider/channel allowlist are absent, and authenticated write transport
is not verified in its unit Environment property. External channel
permission, an authorized one-time deployment and end-to-end CPS
autonomous redispatch still require separate evidence.

## 17. 15 November 2026 — HTTP result through actual kernel resumption, in a disposable COP fixture

Expanded the existing Cogentia #330 test (not a new pipeline/service) to
connect the complete chain:

1. authenticated JHN `POST /mcp` and signed fixture MandateDeclaration;
2. COP budget reservation + valid packet claim + one durable idempotent
   candidate receipt; anonymous/bad-token refusal and duplicate replay;
3. the **existing** Inseme continuation recognizer persists
   `observed → correlated → accepted → returned` events;
4. `resumeContinuationFromReturnedEvent` from Inseme's COP kernel invokes
   the test handler with the recovered candidate yield; handler explicitly
   accepts the value;
5. the existing COP event-sourced budget ledger settles that one reserved
   step, while two unrelated reservations remain open;
6. the same host continues evaluating mandate v2 dynamically and refuses
   subsequent authority after revocation, without re-instantiation.

This is the first connected source-level fixture for result → returned →
kernel handler resume → accounting settlement. It is **not** a statement
that an actual CPS autonomous daemon subscribes to the returned event on
Fracta2, that a provider account is authorized, that production events
were written or that production MCP has been restarted.

Live Fracta2 still has no result opt-in, no reviewed provider/channel
allowlist, no verified authenticated JHN write client and an MCP process
started before the current source. The privileged broker probe remains
`real_super_broker_available_but_effect_authority_unverified`. Do not
manufacture privileged restart authority or treat a local fixture as a
real provider session; the next integration milestone is the authorized
one-time activation and an observed persistent CPS wake/re-dispatch.

## 18. 15 November 2026 — **production runtime activated, local test channel only**

The Principal explicitly requested activation after refreshing both MCP
connectors. The existing owner-admin SSH route `ssh fracta2` with sudo
was used; no new key, Principal mandate or privileged broker enrollment
was required.

Actual systemd drop-in:
`/etc/systemd/system/mcp-cogentia.service.d/95-continuation-result-local.conf`

```ini
[Service]
Environment=COGENTIA_MCP_JUDGMENT_RESULT_ENABLED=1
Environment=COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS=local-fixture:mcp
```

The pre-existing service environment already contains
`COGENTIA_MCP_JHN_MUTATE=1` and a nonempty JHN token (its **value was
never printed or copied into documentation**). The previous diagnostic
incorrectly reported these as unverified because they come from a
systemd EnvironmentFile. The readiness probe now inspects only boolean
presence in the live process environment, never the token value in
output, and its source-only regression verifies that behavior.

After healthchecked systemd restart, MCP PID `275336` (2026-11-15
04:53:38 UTC) responded successfully. A real authenticated JHN HTTP
`POST /mcp` `tools/list` yielded **100** tools and included
`cogentia_continuation_result_submit`. The same call with a deliberately
bad token did **not** advertise it. A `tools/call` referencing a
nonexistent continuation failed closed with `unauthenticated_actor`
and no admissible result receipt. The control gate is live.

`node scripts/ops/check-continuation-result-activation.mjs` now reports
`ready:true`, meaning service, local runtime, issuer/budget, channel
configuration and JHN transport credentials are present. This does NOT
mean a valid real continuation has been returned, nor any consumer
browser provider is permitted or any CPS autonomous event listener has
processed a `returned` event. The only permitted production
`provider:channel` is the bounded test fixture
`local-fixture:mcp`. User-facing ChatGPT connector schemas may need
a further refresh before showing the new tool.

Rollback, from the owner's SSH administrative session:

```sh
sudo rm /etc/systemd/system/mcp-cogentia.service.d/95-continuation-result-local.conf
sudo systemctl daemon-reload
sudo systemctl restart mcp-cogentia.service
```

Next: a *valid* local fixture continuation, claim, reserved budget,
authenticated MCP result, durable receipt and CPS subscriber wake,
without expanding the allowlist to a third-party provider.

## 19. 15 November 2026 — first *actual* live local-channel COP result receipt

Following the Principal's repeated criticism of avoidable abstention, a
bounded Reality Test was executed immediately, rather than deferring
another already feasible step. Canonical operator command:

```sh
node scripts/ops/reality-test-mcp-local-result.mjs --live-local-fixture
```

The test creates **one** clearly marked local fixture continuation in the
existing Fracta2 COP SQLite store, makes a **one-step** reservation under
the already signed JHN v2 mandate and already funded budget, claims its
packet, and sends `cogentia_continuation_result_submit` to the **running
production HTTP MCP** under the pre-existing JHN transport identity.
It checks a durable first receipt and exact duplicate replay with only
one MCP observation; applies the canonical Inseme result recognizer,
persists `returned` and settles that one reserved step. It does not
sign/amend authority or contact any browser, consumer account or external
provider. The credential is read inside the local trusted executor and
never printed or written to a file. The fixture must be invoked
explicitly with `--live-local-fixture` and may consume **one** existing
COP budget step per run.

**Observed successful live event:**
- continuation:
  `ctn_local_mcp_reality_cd319cd8b948418c8911a9e2c5ba918b`
- durable receipt:
  `cop:event:0b925d9a-d0bb-43c7-90a2-ae9b9e439df4`
- `idempotent_retry=true`; `phase=returned`;
  `budget_settled=true`.

This constitutes a real **live MCP ingress → COP journal →
recognition/return → accounting** Reality Test. It is still **not**
evidence of an autonomous CPS subscription and redispatch after
`returned`; the explicitly invoked local test performed recognition.
That separate wiring is the remaining functional part of #330.

## 20. 15 November 2026 — automatic local MCP receipt → COP return → handler resumption

The production MCP runtime now opts in to `autoProcess` on its canonical
result host. After a valid durable receipt the same MCP `tools/call`
automatically folds the existing Inseme #113 recognizer into the canonical
COP log, producing the `observed/correlated/accepted/returned` chain.
The authenticated caller cannot specify or bypass its authority and claim.

For the single existing approved `local-fixture:mcp` channel, a declared
`resumeTo:handler:local-result-evaluator` additionally routes the
journaled `returned` event into the Inseme CPS
`resumeContinuationFromReturnedEvent()` kernel function. The local,
non-effectful handler assesses the answer and emits a durable
`cop.continuation-resumption/v1` event with
`parent_mandate_status:open` and `next_action:continue`. This is **not**
a declaration that the parent mandate is complete; a production worker
dispatch to its next independently governed capability is distinct.

Other channels and handler names do not acquire new execution rights.
A valid receipt remains durable even if later recognition/wake fails;
a re-submission with the same idempotency key can retry post-commit
processing. The caller receives `processing_pending` instead of a
fabricated completion.

The opt-in production Reality Test script asserts that the MCP server,
rather than the script, has independently recorded both the `returned`
and `resumed` events before the script inspects the journal. It uses one
canonical COP budget step and leaves parent mandate status open.
