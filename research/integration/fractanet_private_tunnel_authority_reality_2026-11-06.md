---
title: "Fractanet private tunnel — transport attestation versus COP authority"
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
  origin_ref: "2026-11-06-issue-299-tunnel-probe"
  origin_date: 2026-11-06
  derived_from:
    - research/integration/fractanet_principal_trust_2026-11-05.md
    - research/integration/john_canonical_authority_preflight_2026-11-06.md
review:
  status: unreviewed
  reviewed_by: []
---

# Private tunnel authority boundary (#299)

The existing Fracta2 `cogentia-private-tunnel.service` is active and points to `mcp-cogentia.service`. Its non-secret unit configuration injects a **server-side file-backed Authorization header**, the actor label `agent:jhn`, and the reference `mandate:chatgpt-corpus-coding`. This is a trustworthy observation of how that service is configured; the token itself was neither inspected nor exported. A local service credential authenticates the tunnel/application. It does **not** independently bind an individual ChatGPT user to a human Principal, and the mandate name is **not** a persisted Inseme MandateDeclaration. Multi-user access would require the same user-binding question, even if only one user currently operates the connector.

Fracta2 has running `cogentia-super.service` and `mcp-cogentia.service`. The broker's root-owned authorization file serves its existing privileged-effect purpose; it is not a canonical Inseme root-mandate issuing authority and should not be silently promoted into one. The inspected JHN Supabase candidate has zero mandate and budget records. We have not verified a different production canonical COP authority store; do not infer absence beyond inspected candidates.

## Least-friction follow-up

1. Continue trusted low-risk operations in Cogentia Private under the existing technical access controls while retaining their scope and explicit third-party-effect gates.
2. Select an existing, independently verified Principal authentication and approval channel (personal SSH with protected user key or suitably scoped OAuth/OIDC) rather than generating a new key by default.
3. Store issuance and hard budget in the **same canonical Inseme event log**, with verified issuer provenance and revocation. Do not derive those records from a tunnel bearer or a conversation assertion alone.
4. Perform a controlled cutover of one read-only browser operation to verified durable authority, then test refusal for messages, payment and sensitive disclosures. Preserve the existing usable read path throughout.

`browser.hosted.inspect(action='structure')` is a smaller usable step: fixed JavaScript retrieves only bounded DOM control metadata and no input values, links, page text or arbitrary code. It is read-only and does not imply authority to edit or submit a form. It requires MCP service reload to become active; no production services were restarted in this change.
