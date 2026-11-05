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

## OAuth adapter implementation — 2026-11-05

Existing `mcp-oauth-token.js` already verifies signed JWTs against the
configured issuer, audience, expiry, required scopes and HTTPS JWKS;
`mcp-oauth-identity.js` already resolves issuer+subject to a pinned Principal
mapping. Rather than creating a new key hierarchy,
`scripts/lib/principal-oauth-session.js` composes these existing facilities
with the read-only `principal-trust-context.js` identity classifier. It
requires a separate `cogentia.principal.approve` scope: a JWT with only
`cogentia.private.read` cannot approve a mandate. It returns proof of
identity only, **never a COP mandate/grant/reservation**. Negative tests use
real signed RSA tokens with wrong subject, audience, scope or expiry.

**Production truth:** current MCP HTTP OAuth route (if configured) checks
`cogentia.private.read` and projects a read-only identity; it does not
provide a human approval endpoint or issue the extra scope. Live systemd
service inspection did not expose any declared `COGENTIA_MCP_OAUTH_*`
configuration (EnvironmentFiles may hold undisclosed values). No live
OAuth issuer/subject binding was independently established. This adapter is
therefore source-level tested but deliberately **not exposed as a mutation
verb**. An actual OAuth issuer, principal binding, explicit challenge tied
to the approved payload and replay-safe canonical COP issuance must be
verified before operator activation.

## Bounded one-use confirmation challenge — 2026-11-05

`scripts/lib/principal-approval-challenge.js` now stages and consumes an
EXPOSE-bound, short-lived (max. 10 minutes) challenge in the **existing**
canonical Inseme COP event store. The confirmation is an atomic topic-sequence
append and refuses a different payload, expiry or replay. The only currently
accepted identity proof is a server-verified OAuth session produced by the
existing JWT verifier; an object copied from that session cannot pass the
in-process identity provenance check. A separate `verifyHumanConfirmation`
callback is **required** before recording confirmation. Possessing a scoped
OAuth bearer alone is not a human gesture or an authorization to approve any
arbitrary operation. The proof callback in tests is deliberately a fixture,
not an implemented trusted web approval surface.

**Not production-ready:** there is no authenticated approval screen, trusted
human-gesture verifier, registered Principal OAuth issuer, or live issuer
endpoint. Confirmation events neither grant a mandate nor mint a super-broker
authorization. The service remains unchanged. Wiring this library directly
into an agent-callable MCP mutate tool, accepting a caller-supplied verifier,
or treating a COP challenge event as an active mandate would be unsafe. It
must remain an internal trusted-server component pending a human-controlled
approval endpoint and end-to-end authority checks.

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
