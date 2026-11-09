---
title: "JHN Vault identity evidence and low-friction mandate amendment"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: source
document_kind: integration-report
visibility: public
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
---

# Supabase identity discovery, instance binding and mandate authority

## Observations (live, 2026-11-09)

The current Inseme Supabase project has **exactly two** Auth accounts (checked
with the existing server-side `supabase.auth.admin.listUsers`). One is a
confirmed smoke-test user; the other is a confirmed account corresponding to
the Principal's existing address `jhr@baronsmariani.org`, with a `public.users`
profile whose role is `admin`. Neither password nor session token nor user
UUID is reproduced here. The canonical `public.instances` JHN root row is
unique, `autonomous`, has `subject:jhn` and `twin:jhn`, but its `principal_id`
remains **NULL**. The account exists; the link does not.

The separate existing Inseme `apps/platform/scripts/principal-enrollment.js`
already provides `prepare()` and compare-and-set `claim()` to bind a user to an
instance. It explicitly demands (a) a real project-local Supabase Auth session
via `auth.getUser(accessToken)`; (b) confirmed non-anonymous user and existing
profile; (c) an independently verified, instance-scoped root claim; and (d) an
unclaimed, eligible instance. It never matches by email to auto-claim. Use this
existing implementation, NOT a new direct `instances` SQL update.

## Distinct authority strata

- **Workload identity**: successful Vault query proves technical control of
  a project/server credential. This identifies a trusted *workload context*,
  not the human behind the process. A stolen or shared service-role key would
  pass this check. Key ownership and key scope require separate governance.
- **Principal identity**: a project-local Auth session identifies a Supabase
  account. The canonical `instances.principal_id` binding must link that UUID
  to JHN. The smoke account is explicitly not a valid substitute.
- **Mandate issuance/amendment**: a current Principal session by itself does
  not authorize an arbitrary mandate change. The exact proposed scope/version
  must be approved through a trusted human-confirmation surface, with a fresh
  single-use proof that is verified by an issuer.
- **Execution**: a newly approved mandate does not itself reserve a hard
  budget or grant effects. COP enforces capability, time, version, issuer,
  revocation, budget and receipts at dispatch.

## Implemented library seam, no production claim or mandate was issued

- Inseme `lib/vault-principal-preflight.js` checks the canonical JHN instance
  record and refuses NULL/mismatched Principal links. Human authentication is
  an injected trusted verifier; even successful preflight returns
  `may_issue:false` because it is not a transaction approval.
- Cogentia `lib/vault-anchored-mandate-amendment.js` composes this preflight
  with the **existing** append-only `amendMandate()` in Inseme COP. The exact
  proposal is passed to an independently trusted verification callback, which
  must verify the separate Principal approval and consume one-use evidence.
  This composition is NOT an MCP endpoint or production issuer; no default
  verifier and no default mandate store are provided.

## Required operations before claiming working human issuance

1. Authenticate the JHN human Auth account through an authenticated client
   under the Principal's control. Do not pass Supabase Auth tokens through
   a chatbot, public MCP args or git.
2. Bind that authenticated account through `createPrincipalEnrollment.claim`
   with a trusted root-claim verifier, then independently read the resulting
   `instances.principal_id`. Do not use administrative email lookup as approval.
3. Use existing `principal-oauth-session.js`, `principal-approval-challenge.js`
   and `principal-step-up.js` or an equivalent trusted human approval surface
   to verify the precise immutable amendment, not a generic transport token.
4. Compose the verifier with the canonical append-only COP mandate store and
   budget ledger. Verify version conflicts, revocations, costs and receipts.
   No new signing ceremony is needed when an existing authenticated human
   confirmation channel can deliver this proof, but the proof itself cannot
   be waived simply because Vault access exists.

**Status:** the *identity discrepancy is evidenced* and a bounded code seam is
implemented and tested with synthetic accounts. The root link remains NULL;
there was no real human session in this operation and therefore no legitimate
production enrollment or mandate amendment. A signed-in, verified claim and
actual issuer wiring remain outstanding. This avoids treating an agent's own
service-role privilege as authority to enlarge its mandates.

## 2026-11-09 — Supabase Principal is now bound; application bridge implemented

Following the Principal's explicit owner-SSH confirmation, independent live
readback verified the `public.instances` JHN root row now has `principal_id`
equal to the **only** verified Supabase Auth account for
`jhr@baronsmariani.org` (existing `public.users` role `admin`). The initial
identity-link blocker described above is **resolved**. The JHN database owner
binding is persistent; this is not a general issuer credential.

The reusable server-side approval composition is now:

1. Inseme `apps/platform/scripts/lib/jhn-auth-session-verifier.js`: verify
   actual human access token through `authClient.auth.getUser(accessToken)`;
   reject missing, anonymous, unconfirmed and invalid Auth sessions. The token
   is **not** accepted from the LLM or MCP and does not appear in the receipt.
2. Inseme `vault-principal-preflight.js`: compare authenticated user UUID to
   the authoritative `instances.principal_id` for autonomous root JHN.
   `may_issue:false` remains explicit on identity success.
3. Cogentia `scripts/lib/jhn-supabase-mandate-approval-service.js`: compose
   the two checks with `vault-anchored-mandate-amendment.js` and an **injected
   separate issuer** `verifyExactApproval`.
4. Existing Inseme `amendMandate()` produces the exact canonical proposal in
   a *non-writing* preparation pass. The trusted issuer must independently
   confirm that proposal's `sha256` hash, the human Principal, a consumed
   single-use approval and an evidence reference. The kernel revalidates the
   same proposal/hash and current version/expiry/revocation immediately
   before writing a new versioned append-only declaration. Failed proof never
   appends anything; stale versions fail even after issuer approval.
5. Return only the existing COP amendment receipt; no secrets or user tokens.

This implementation supports **amendment composition**, not first issuance:
initial mandate creation still needs a canonical separately approved budget
and atomic append. Creating a `MandateDeclaration` from Vault access or from
the JHN `principal_id` link alone would be a privilege-escalation bug.

**Activation gate:** neither the current private MCP bearer nor the already
connected Cogentia Private tunnel is a configured human approval issuer.
Existing `principal-oauth-session.js`, `principal-approval-challenge.js`,
`principal-step-up.js` provide the exact signed one-use challenge pattern, but
no verified live step-up issuer/binding is configured in production yet. The
active SQLite COP event store was explicitly created for a pilot and still
needs review of writer isolation, canonical ledger and irreversible effects
before enabling mandate issuance. No new mutation endpoint, public OAuth
claims handling, unsigned signature substitute, or self-minted authority was
deployed. Tests use synthetic human session and issuer proof only.

Next minimal operational sequence: configure an actual authenticated
Principal-controlled approval surface that can emit a fresh, transaction-bound
step-up proof; bind its issuer/JWKS and audience server-side; use a reviewed
canonical COP writer; deploy the protected service adapter (not a generic
MCP permission to amend). Verify a benign real amendment with explicit
Principal confirmation, replay/refusal tests and actual accounting receipt.
For ordinary future amendments, the approved transaction can be confirmed
in the existing authenticated session without new SSHSIG workstation rituals.
