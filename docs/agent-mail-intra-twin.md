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

## 2026-11-10 — Canonical runtime wiring (Cogentia #304)

The first implementation has been extended with a nonroot, service-owned integration seam. `scripts/lib/agent-mail-credential-broker.js` reads the **existing, single** `/etc/stalwart/jhn-agent-mailboxes.json` file on each bounded request; it does not copy, mirror or publish secrets. In the current Fracta2 deployment, the MCP runs as `ubuntu` while that file remains root-only. A one-time owner operation in Operium, `scripts/ops/enable-agent-mail-cogentia-fracta2.sh --apply`, grants the service OS group read-only access to this file and turns on `COGENTIA_AGENT_MAIL_RUNTIME=1` in `mcp-cogentia.service`. The Stalwart listener remains `127.0.0.1:8080` HTTP, with no new SMTP listener. The Operium provisioner now preserves the file's existing group and mode when updating its contents; no extra credential copy is made.

`agent-mail-auth-binding.js` maps the **verified and server-resolved** MCP actor `agent:jhn` → `john@mail.fractavolta.com` and `agent:jhn.subagent:worker` → `john-worker@mail.fractavolta.com`. No request `from` or `agent` string can bypass this bound identity. The canonical root mandate currently authorizes only `agent:jhn`; the subagent's independent/delegated mandate must be resolved before production subagent mailbox operations are enabled. A technical mailbox or attested MCP bearer never grants COP authority by itself.

`agent-mail-runtime.js` composes the broker, the existing `COGENTIA_JHN_CANONICAL_STORE_PATH` (fixed, pre-existing `/var/lib/cogentia/cop/john-root-v1.sqlite`), the existing independently pinned JHN issuer SSH key, and `agent-mail-cop-authority.js`. This latter adapter calls the existing `assessJohnCopAuthority`, applies the canonical active version, checks actor/Principal/effect scope, reserves an optimistic **Inseme execution budget** and settles the reservation after JMAP returns. Settlement evidence contains the bounded JMAP submission identifier and a hash of the subject, **not the message body or credentials**. The JMAP sender result means *submitted*, not *recipient-delivered*; an independent receiver receipt remains necessary.

The issuer lineage verifier accepts the original independently signed v1 root, then only subsequent versioned amendments with a complete, linked `PrincipalConsentRequested` → `PrincipalConsentApproved` (Supabase-authenticated decision) → `PrincipalConsentConsumed` lineage and exact SHA-256 proposal hash, as written by the existing canonical COP consent workflow. It does not treat an unauthenticated MCP Apps intention as an issued mandate. The service's trusted canonical store still requires appropriate writer custody.

**Concrete current authorization block:** direct inspection of the *real existing store* on Fracta2 (read-only) shows the latest signed root scope contains only `browser.navigation.instances` and `browser.hosted.inspect`, **not** `agent.mail.send` or `agent.mail.receive`. This is a genuine **COP mandate-scope block**, not a missing JMAP transport or missing tool schema. The protected consent listener currently has `COGENTIA_JHN_CONSENT_ENABLE_DECISION=0`; the authenticated request/decision/apply workflow is existing code but not yet activated for this amendment. Do **not** manufacture a grant, silently amend the signed root, or claim mail sending is executable by MCP now. Consent is a one-time *mandate extension*, not a human approval for every intra-Twin email.

Source and test levels: local tests with genuine generated test signatures, Inseme SQLite, Supabase-authentication *fixtures*, optimistic budget and mock JMAP pass. Fracta2 canonical DB/issuer paths were opened successfully in **read-only runtime bootstrap**. The source has not yet been restarted into the live MCP process with the mail feature enabled; the service account still cannot read the root-only Stalwart credential file until the one-time operator operation. No new live intra-Twin messages were sent by this implementation work.

Operational next steps after published commit: (1) execute the owner activation command, which only wires transport and reports MCP tool discovery, never sends; (2) use the existing trusted Principal-consent workflow to approve/apply a **specific** bounded v2 scope extension (`agent.mail.send`, `agent.mail.receive`) with its budget limit, then verify the live MCP can send as John; (3) issue a separately scoped subagent delegation for `john-worker`; (4) reconcile a real recipient-side receipt, then extend CLI/API/Web surfaces through the same service rather than introducing new authorization paths.
