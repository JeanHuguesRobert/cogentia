---
title: "Agent John root mandate — offline authenticated issuance design"
date: 2026-11-05
author: Jean Hugues Noël Robert
affiliation: Institut Mariani / C.O.R.S.I.C.A.
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: 2026-11-05
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
status: working-paper
document_role: operational
document_kind: design-note
visibility: public
language: en
related_issue: https://github.com/JeanHuguesRobert/cogentia/issues/299
---

# Agent John — authenticated root mandate proposal, NOT ISSUED

This is the **B + C integration design**, not an active authority declaration.
A sentence from a chat, an MCP bearer, a GitHub issue or a mere hash confirmation
is insufficient to mint John a durable root mandate.

## Offline signing boundary

`src`: `scripts/lib/john-root-mandate.js` and
`scripts/ops/john-root-approval.mjs` provide deterministic canonical bytes,
SHA-256 proposal hash, Ed25519 signature verification and prohibited-act
checks. The verifier expects a **separately pinned** public key that cannot
be substituted by the requesting agent or ordinary Unix account. **Neither
this code nor its test-generated ephemeral keys is an issuing authority.**

A future authenticated Principal reviews a complete, bounded `proposal.json`
(scope, forbidden acts, delegation depth, expiry and integer hard-budget
limits); `node scripts/ops/john-root-approval.mjs inspect proposal.json`
prints its material fields. `... bytes proposal.json > proposal.canonical`
produces the exact bytes to sign on a **Principal-controlled device** using
an independently protected private Ed25519 key. The Principal may then return
an approval JSON with `kind: cogentia.principal-signature/v1`,
`principal_ref`, `payload_hash`, `key_fingerprint` and
`signature_base64`; `... verify proposal.json approval.json trusted-key.pem`
checks it against the independently pinned public key. The command deliberately
has no `issue`, `grant`, or `deploy` mode.

## Mandatory next work before issuance

1. Provide an independently controlled identity enrollment process and pin the
   correct Principal public key in a root-protected trust configuration.
   Do not enroll a key submitted by an agent as proof of Principal identity.
2. Decide the explicit capability catalogue, exclusions, term, revocation,
   delegated depth and **calibrated** hard-budget dimensions and ceilings;
   avoid granting wildcard capabilities or arbitrary shell power as an alias
   for unrestricted authority. The broad intent is not consent to unspecified
   thresholds.
3. Bind the verified signature and exact proposal hash to a *single* append to
   the **existing canonical Inseme event store**, with issuer provenance,
   version and replay protection. Issue the budget grant through the same
   governed store with atomicity/compensation and CAS. No parallel register.
4. Enforce a live signature/mandate/revocation check and budget reservation at
   the actual MCP→broker boundary before any `super` effect, and verify
   cancellation/replay/expiry with negative tests and factual receipts.

The same restrictions (especially no third-party engagement, publication,
representation, formal legal/financial action or payments) must follow every
sub-mandate. A separately authorized concrete privileged maintenance task is
not the same as issuing John a standing root mandate.
