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
