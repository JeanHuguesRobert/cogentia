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
