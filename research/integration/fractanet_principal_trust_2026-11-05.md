---
title: "Fractanet principal trust — one COP authority, existing authentication"
date: 2026-11-05
status: working-paper
author: Jean Hugues Noël Robert
affiliation: Institut Mariani / C.O.R.S.I.C.A.
license: CC BY-SA 4.0
language: en
document_role: operational
document_kind: design-note
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: 2026-11-05
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Principal identity reuse across the Fractanet (Cogentia #299)

**Design correction:** offline Ed25519 approval, implemented in
`john-root-mandate.js`, is an *optional* issuance channel, not a mandatory new
personal key for every Mandate or every operation. Prefer existing verified
Principal sessions and identities. All channels feed one canonical COP
Mandate/Grant/Budget authority and inherit the same reserved-act prohibitions.

## Channels, separated from authority

- **SSH:** a *dedicated* authenticated Principal session or independently
  verified SSH/PAM key-to-principal mapping can provide evidence of who
  approved the exact proposal. An unprivileged shared `ubuntu` session that
  Cogentia agents can use is **not** sufficient to authenticate JHN as a
  human. Server-side identity mapping, user-presence policy and exact proposal
  confirmation must be enforced by a trusted boundary, not shell output.
- **Tailscale / Fractanet:** authenticated node identity and network ACLs
  establish where a request came from, not automatically which person is
  acting. For human authority, bind the originating peer to a verified user
  via Tailscale's identity source or a Principal session on that device.
  Node authentication alone must not make background agents human Principals.
- **ChatGPT / MCP:** the fact that the user is logged into ChatGPT is not in
  itself delivered as an authenticated Principal claim to the connected MCP.
  Prefer per-user OAuth/OIDC authorization with access-token validation,
  `aud`, `iss`, `sub`, expiry and user-to-principal mapping at the Cogentia
  server. A tunnel/shared bearer, `X-Cogentia-Principal` or LLM text alone
  proves no user identity or mandate. Keep client/proxy headers untrusted
  unless inserted by an authenticated, trusted gateway.

## Common boundary and budget

`trusted principal session` → `confirm exact EXPOSE payload` → `COP issuance`
→ `mandate verification + atomic resource reservation` → `scoped effect` →
`receipt + accounting`. The authenticated session can avoid an extra signing
key or approval ceremony for ordinary, in-mandate acts. It cannot mint an
unbounded mandate or bypass root-broker/COP controls. For reserved acts,
require an independent act-specific confirmation, regardless of network.

`principal-trust-context.js` is a **non-issuing**, dependency-injected
verification boundary: it rejects unsupported channels, missing trusted
verifiers, unmatched identities/audience and expired assertions, and returns
identity context with `grants_mandate_authority: false`. The actual SSH/
Tailscale/OAuth issuer verifiers, replay control, trust-anchor enrollment and
production wiring are still outstanding. Do not turn mocked tests into a
production Principal proof or accept a caller-supplied `verified` flag.

**Acceptance:** one verified human may use SSH, trusted tailnet session or
per-user MCP OAuth, without enrolling an additional key; John cannot issue
a root mandate from its own shell or tunnel token; revoked or expired
sessions, non-human nodes and claimed identity headers are rejected;
ordinary operations under a standing mandate avoid repeated consultations;
external commitments remain reserved even from the Fractanet.
