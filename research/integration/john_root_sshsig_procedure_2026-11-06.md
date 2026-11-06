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

## Actual issuance and first canonical read on Fracta2, 2026-11-06

The Principal signed the exact approved proposal with their personal RSA SSH key on `tweesic` and uploaded only its detached SSHSIG. The server independently verified signature, namespace, pinned SSH key fingerprint and SHA-256. A narrowly scoped issuance CLI `scripts/ops/issue-john-root-sshsig.js` was tested on a disposable canonical store, including a refused duplicate issuance, then issued **exactly once** into `/var/lib/cogentia/cop/john-root-v1.sqlite` (directory `0700`, DB `0600`, Unix owner ubuntu). Canonical event IDs: declaration `20921a3f-1689-44f7-a811-0dbd7f6147b5`, execution-budget grant `7d51adab-68a1-4b9d-b635-f8a94ad6fbfa`. The issuance response explicitly reported `activated_in_mcp:false`.

The preflight was independently exercised against that *persistent* store for both permitted reads and a rejected payment. A first **real, non-mock** browser inventory run used the new `executeJohnCanonicalRead()` helper with actual browser gateway capability under the signed root. Canonical reservation was created before the read, with a matching settlement of 2 `max_steps`. Receipt, run completion and internal accounting events were all observed. A subsequent **read-only** ledger snapshot showed `settled.max_steps=2`, `reserved.max_steps=0`, `available.max_steps=2046`, 4 events total. The test supplied an authenticated **local JHN fixture transport**, not this ChatGPT conversation's production MCP credential. Therefore this is a confirmed real capability + real canonical store/budget integration test, **not** proof of live MCP ingress activation.

**Remaining production boundary:** add and deploy a narrowly guarded `cogentia_john_run` dispatch branch selecting this verified read budget path for the private tunnel only; test actual invocation from Cogentia Private; verify refusal for unissued/revoked/wrong-capability cases and no privilege expansion. Do not automatically promote any token into human approval, and do not expose the signing private key. The current SQLite store is writable by `ubuntu`; that Unix user is shared with execution agents, so production-hardening the writer's integrity boundary remains necessary before broad effectful mandates. This first root explicitly contains read-only browser capabilities only.

## Opt-in MCP dispatch implementation (not yet enabled)

`scripts/lib/john-cop-read-execution.js` now implements the narrow write-authority bridge for **read-only** browser requests: trusted pinned issuer key, live Inseme mandate check, exact tunnel label, capability allowlist, request read-only budget envelope, atomic CAS reservation **before** the browser call, reconciliation using the real John accounting event, and bounded settlement afterward. It denies duplicate request IDs before dispatch; if accounting evidence is missing, charges the reserved maximum and does not claim success. A settlement failure is reported as a possibly executed act with uncertain accounting, not as a harmless failure. It neither sends messages nor permits interactive browser operations.

The MCP `cogentia_john_run` now has a **disabled-by-default** branch controlled by `COGENTIA_JHN_CANONICAL_READ_ENABLED=1`, requiring the already-existing `COGENTIA_JHN_CANONICAL_STORE_PATH` and `COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS` to reference a valid persistent registry and trusted public key. The existing read route is unchanged when disabled. The branch retains the real `orientation.required` event handler instead of substituting a mock. The service must be deliberately configured and reloaded after host ownership and isolation have been checked. Until that happens, the only complete real read+budget proof is the direct bounded test documented above, not a live ChatGPT→MCP receipt.
