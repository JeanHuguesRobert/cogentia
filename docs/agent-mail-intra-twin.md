---
title: Intra-Twin Agent Mail — JMAP capability and surface contract
author: Institut Mariani / C.O.R.S.I.C.A.
status: working-paper — implementation staged
version: 1
date: 2026-11-10
last_modified_at: 2026-11-10
language: en
license: CC BY-SA 4.0
document_role: operational
document_kind: architecture
visibility: public
update_policy: UP-DEFAULT-REVIEWED
lifecycle_state: active
---

# Intra-Twin Agent Mail: `agent.mail.send`, `agent.mail.receive`

## Proof of transport and invariants

An actual `john@mail.fractavolta.com` → `john-worker@mail.fractavolta.com` message was sent, delivered, and read back from the recipient Inbox on Fracta2 Stalwart 1.1.0. Verified by owner-executed root-local JMAP recipe `operium/scripts/ops/test-stalwart-jhn-internal-delivery-fracta2.py`; evidence in Operium issue #77 and commit `d89329a`. Stalwart has one listener, `127.0.0.1:8080` plain HTTP, no public SMTP/IMAP, systemd disabled at boot. Thus the *transport works*, but this does not imply live Cogentia tool deployment or COP enforcement.

**Within one Twin:** agents can communicate automatically, without a per-message human Gmail-style draft approval. In JMAP `Email/set` creates a transient protocol object, then `EmailSubmission/set` submits in the same client request. This must not be interpreted as a human-reviewed draft. JMAP `onSuccessDestroyEmail` emits a second implicit `Email/set` response sharing the call ID with submission (RFC 8621 §7.5); the client must not discard the first response.

**Across Twins or to third parties:** no direct private transport. The external message must traverse each Principal's authorized mail provider and the corresponding external-communication mandate. A local domain spelling alone does not establish shared Principal identity. For this initial adapter exactly `mail.fractavolta.com` is admitted; production enrollment must validate Twin membership against the canonical Principal/agent registry, not assume all local-part addresses belong to one trust perimeter.

## Reusable Core and surface projections

Source: `scripts/lib/agent-mail.js`, `createAgentMail({ credentialBroker, authorize, post, getSession })`. Agent addresses and JMAP envelopes are constrained to one local domain. Credentials are obtained from a service-owned broker, **never accepted as MCP/CLI input**. `authorize` is trusted, injected server code that must independently validate the actor, Principal, effect payload, mandate and budget. The adapter checks the returned decision's exact actor, recipient, subject, body and correlation identifier before touching the transport. An open tool, token, `sudo` command or actor string supplied by the request is *not* COP authority. `agent.mail.receive` needs a separate actor-scoped read decision.

The JMAP adapter has `send` and `receive` operations. A `send` result is **submitted, not delivered**; definitive delivery requires a separate recipient-side receipt. Correlation IDs are carried in receipts but there is **not yet** a durable idempotency/nonce registry; callers must not blindly retry ambiguous submissions.

- **Core library:** implemented; mock JMAP delivery/read and fail-closed authorization tests pass.
- **MCP:** three private tools defined in `cogentia-mcp-core.js`: `cogentia_agent_mail_status` (read), `cogentia_agent_mail_receive` (private-read) and `cogentia_agent_mail_send` (mutate). Ordinary public `tools/list` does not expose them. Actual send/receive are blocked unless the *server itself* injects both `agentMailCredentialBroker` and `agentMailAuthorize`.
- **CLI:** `node scripts/cogentia.js agent mail status --json` reports implementation and binding readiness. `agent mail send`/`receive` verbs are reserved but fail closed pending service-owned broker and authorizer; they must not infer permission from the operator's shell privileges.
- **Capability inventory:** matching `CLI_COMMANDS` entries; send/receive human CLI reported unavailable until bindings exist. The MCP tool signature is *announced*, but production execution is not.
- **HTTP `/v1` / web UI:** no new endpoint/UI is claimed. Future API must reuse the same broker, COP decision, audit and idempotency machinery, not create an ungoverned second backend.
- **Cognitive packets:** intended semantic capabilities are `agent.mail.send` and `agent.mail.receive`; an agent.mail effect receipt should include immutable message/recipient/mandate/budget identifiers while never exposing stored credentials. The production admission, spending, dispatch and settlement pipeline is not yet connected.

## Next completion criteria

1. Implement the trusted **agent identity → mailbox identity** registry, mailbox lifecycle/provisioning and nonroot credential broker (credentials remain on Fracta2, no general shell exposure).
2. Wire COP actor/Principal/mandate/budget pre-dispatch admission, durable idempotency and effect/receipt settlement; return a typed continuation when governance is missing.
3. Configure the Cogentia MCP service's injected broker and authorizer; verify connected `tools/list` advertised tool, authenticated invocation, and a real internal delivery + recipient read with independent receipt. No credentials in tool arguments.
4. Propagate exactly this backend to CLI, HTTP API, Web UX and cognitive packet dispatch, and run the symmetry audit; do not mark a surface as executable before integration and acceptance.
5. Consider systemd auto-enable only once service hardening and real runtime checks are complete.

## Tests

`node --test scripts/lib/agent-mail.test.js`

`node scripts/check-capability-inventory.js`

`node scripts/check-mcp-dual-era.js`

`node scripts/check-symmetry-audit.js`
