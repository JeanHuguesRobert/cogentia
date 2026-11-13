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
authority. A configured runtime selects the required version with
`COGENTIA_MCP_JUDGMENT_RESULT_MANDATE_VERSION=v2` only after a real
independently signed amendment is recorded. The old v1 signature cannot
silently grant an additional capability.

The live JHN v1 mandate remains unchanged: no production amendment was
signed or activated. Do not fabricate an issuer signature, or use the MCP
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
