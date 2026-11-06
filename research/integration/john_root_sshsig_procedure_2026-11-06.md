---
title: "John root v1 — Principal SSH signature issuance procedure"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-06
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: runbook
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-06-issue-299-first-production-root"
  origin_date: 2026-11-06
  derived_from:
    - research/integration/john_canonical_authority_preflight_2026-11-06.md
review:
  status: unreviewed
  reviewed_by: []
---

# John root v1 — SSHSIG signed approval

The Principal confirmed the RSA public key fingerprint `SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c` for a private key present on their Windows machine. Unlike the mesh ED25519 key, no corresponding private key was found in the examined SSH directories on Fracta2. This is a **bounded observation**, not absolute proof that no agent has another copy. Before acceptance, verify that the private key has remained under Principal-only control.

The immutable proposal bytes are in `research/integration/approvals/john-root-v1.proposal.json`; digest is `sha256:0e984f4f0f52dee4242e99df60bb910a43ab3d2b10053e5105f0fbbb4fecb7a0`. Validity ends 2027-11-06 UTC; allowed actions are precisely `browser.navigation.instances` and `browser.hosted.inspect`, forbidden actions include all root reserved third-party commitments, budget `max_steps=2048`, maximum delegation depth 1. **This mandate does not grant repository writes, browser interaction, deployment or messaging.** Other actions require distinct authority.

Sign with OpenSSH `ssh-keygen -Y sign -f <principal-only RSA private key> -n cogentia-john-root-v1 <exact proposal file>`. This creates a detached `.sig` file; the private key does not leave the user's machine. OpenSSH checks the entire proposal bytes and its namespace independently of SSH login. The signature must be delivered to the issuance authority; it alone is not a deployed mandate. The root issuing adapter must verify it against a trusted, independently pinned public key and exact fingerprint, then append MandateDeclaration and ExecutionBudgetGrant atomically in the canonical Inseme store, with received event IDs. A separately configured runtime verifies signature provenance, version and budget per call.

The source includes `verifyRootSshsig` (OpenSSH signature verification), an issuance path and regression tests with disposable RSA keys. **No service, canonical production store, personal signature or actual root grant has been configured or created by this commit.** Staging on a real registered store, cancellation/revocation and negative-case checks are still needed before production cutover. Never place private keys, credentials or signing passphrases in an issue, chat or repository.
