---
title: "John canonical authority preflight — scope and evidence"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-06
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: design-note
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-06-issue-299-preflight"
  origin_date: 2026-11-06
  derived_from:
    - research/integration/john_cop_mandate_authority_gap_2026-11-01.md
    - research/integration/fractanet_principal_trust_2026-11-05.md
review:
  status: unreviewed
  reviewed_by: []
---

# Canonical authority preflight (Cogentia #299)

`assessJohnCopAuthority()` is a **non-executing, non-issuing** adapter against the existing Inseme `resolveMandate()` and `evaluateMandate()`. It accepts an already-resolved, provenance-marked JHN transport identity and an **independently configured server-side issuer verifier**. A caller-provided verification callback would defeat this boundary and MUST NOT be exposed over MCP. No issuer is configured in production by this patch.

It checks the binding between transport mandate reference, Principal `principal:jhn`, actor `agent:jhn`, version pin, live canonical MandateDeclaration, issuer provenance, capability and revocation/validity as determined by Inseme. With budget checking enabled it requires a matching funded ledger snapshot. Its success reports `preflight_ok:true` but `admitted:false`, `authorized_to_execute:false` and `reservation:null`. A real dispatcher must additionally reserve and reconcile a canonical hard budget, enforce permissions for sensitive data and third-party effects, and verify the downstream receipt. Neither the MCP credential nor the preflight result is an issuance mechanism.

Tests use the real Inseme in-memory event store, canonical evaluator and a **fixture** issuer verifier. Negative tests include missing mandate, untrusted caller, forged issuer identity, transport mismatch, unfunded budget, forbidden payment, mismatched version and expiration. This establishes code behavior only; it does not establish production issuer/store availability.

The earlier private MCP/browser Reality Test remains valid for read-only inspection. This patch intentionally does not deploy an admission policy or change service availability. Next: locate and verify a production COP store and independent issuing identity, then implement atomic budget reservation and the private read-only acceptance test under that real mandate, followed by reserved-act denial tests.

## Reality probe, 2026-11-06 (production remains untouched)

Read-only Supabase SQL against the already identified JHN project returned `cop_mandates=0`, `cop_accounting_budget=0`, and `cop_event_log` records whose `event_type` contains mandate/budget = `0`. This is a count of those sources, **not** a proof that no other authority store exists. The live Fracta2 `mcp-cogentia.service` and `navigation-assistant-gateway.service` are active; the MCP unit references several EnvironmentFiles, but inspected non-secret service metadata and a bounded filename search have not established a configured canonical mandate/event store to which John is bound. No protected environment values were extracted.

The new regression for `recordMandateControl(...,action:'revoke')` demonstrates that a previously acceptable fixture mandate becomes `mandate_inactive` at the Inseme evaluator before execution. **Do not issue a production root mandate or activate a new ingress gate** until an actual, independently authenticated issuer, authoritative event store, revocation channel and hard-budget ledger are identified. Preserve the already working private-read browser path pending controlled cutover, while forbidding any inference that transport auth alone authorizes consequential acts.

## Signed issuer and budget integration test — 2026-11-06

`scripts/lib/john-cop-authority-integration.test.js` exercises the actual Inseme SQLite event store with the existing `issueVerifiedJohnRoot()` issuer pathway, version-pinned `assessJohnCopAuthority()`, a genuine event-sourced hard-budget ledger, one successful reserve/settle cycle, a forbidden payment test and `recordMandateControl(revoke)`. No external provider is invoked. The new `john-offline-issuer-verifier.js` verifies the original Ed25519 signature against a separately pinned public key, reconstructing the original proposal from the canonical declaration and verifying its exact hash: forged scope, altered signature and false fingerprint all fail. Metadata flags or hashes alone are deliberately insufficient.

**This is an optional offline issuance channel and an integration fixture, not an instruction to create a new personal key.** Existing trusted SSH, OAuth and Fractanet principal-authentication channels remain preferred when they can attest an actual Principal approval. The demonstration key lives only in the test process. The real principal key/trust-anchor, issuer-controlled act confirmation, persistent production COP store and service binding have not been established; no root grant was issued in production. Read-only browser access through Cogentia Private remains available under its existing narrower mechanism, not this not-yet-connected store.
