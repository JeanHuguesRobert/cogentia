---
title: Federated Inter-Agent Mail for Multiple Cogentia Digital Twins
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-11-10'
last_modified_at: '2026-11-10'
version: '0.1'
status: working-paper
document_role: operational
document_kind: architecture
visibility: public
lifecycle_state: working
language: en
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/federated_twin_interagent_mail.md
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: principal_instruction
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 2026-11-10 discussion on inter-agent mail
  origin_date: '2026-11-10'
  derived_from:
    - research/individual_and_collective_digital_twins.md
    - research/agent_john_identity.md
    - research/cognitive_packet_switching.md
review:
  status: unreviewed
  reviewed_by: []
---

# Federated inter-agent mail for multiple Cogentia Digital Twins

## Durable architectural requirement

**Agent John is the first instance, not the platform's identity model.** Future Cogentia deployments will include multiple independently governed Digital Twin instances. **Every twin must be able to possess its own private inter-agent mailbox and to exchange messages bidirectionally with its own sub-agents and, when explicitly trusted, with other twins.** A single `jhn@mail.fractavolta.com` or a mailbox tied to one VPS cannot be the universal addressing or security scheme.

The architectural axes must remain distinct:

1. **Principal / subject** — natural or legal person whose twin is represented; the subject is not a mail account, and the twin is not the subject.
2. **Twin instance** — stable unique identity, own governance and trust perimeter; it may migrate among machines or transports.
3. **Actor** — root conversational agent and its delegated sub-agents; child actors are not necessarily separate principals or independently authorized mandate holders.
4. **Mailbox** — addressable incoming and outgoing store for an actor, scoped to its twin instance.
5. **Transport** — a replaceable delivery mechanism (Stalwart private mail, JMAP, authenticated private relay, or later federated delivery). Email addresses are *aliases*, not the source of identity or COP authority.
6. **Cognitive packet** — versioned semantic payload and provenance; neither RFC 5322 nor the mailbox decides what to do with it.

## Edition and multi-tenancy constraint

The official Stalwart documentation explicitly labels **Tenants** as an Enterprise-only capability: tenants have own administrators, domains, accounts and quotas, with membership via `memberTenantId`. Both editions share the same binary and data format, but actual Enterprise functionality requires a valid licence. A single Community server with multiple domains/accounts does **not** satisfy the stronger cross-principal isolation requirement automatically. This is a licensing and deployment gate, not grounds to abandon the Principal's selected Stalwart multi-tenant architecture. Sources: https://www.stalw.art/docs/auth/authorization/tenants/ ; https://stalw.art/docs/server/enterprise/ ; https://stalw.art/docs/domains/.

## Stable addressing versus deployment-specific aliases

Assign stable opaque identifiers such as `twin_instance_id` and `actor_id` *independently* of DNS, hostname, owner display name, or infrastructure. A routing directory resolves `(twin_instance_id, actor_id)` to current authenticated delivery endpoint and one or more email aliases. Never infer an actor's identity from the `From:` header or equate an email alias with a mandate.

Examples, **illustrative only and not provisioned**:

- `twin_instance_id: twin:jhn`, `actor_id: agent:jhn:john`, alias `jhn@mail.fractavolta.com` during bootstrap;
- `twin_instance_id: twin:jhn`, `actor_id: agent:jhn:researcher-1`, alias `researcher-1@mail.fractavolta.com`;
- `twin_instance_id: twin:other-001`, `actor_id: agent:other-001:root`, alias under its own private/controlled domain, **not** necessarily `mail.fractavolta.com`.

Multiple twins **should use a shared Stalwart installation by default**, as requested by the Principal, but must not share mailbox credentials, administrative permissions, or trust. Use a true Stalwart Enterprise Tenant per independently governed twin, rather than confusing multiple mailbox domains in Community with tenant isolation. Separate Stalwart installations are a fallback where Enterprise is unavailable or independent physical/administrative trust boundaries require separation. A mailbox may move without changing the twin's stable identifier.

## Topology and phased growth

**Phase A — one Stalwart service, one twin, many actors:** John and his sub-agents share a Stalwart installation on Fracta2; JMAP for mailbox management, internal controlled submission/delivery. Only the designated twin and agent accounts may access it. The server's administration remains within the trust perimeter. No public SMTP, IMAP or JMAP listeners are required.

**Phase B — multiple twins on one multi-tenant Stalwart service (the intended default):** provide a distinct Stalwart Tenant object and delegated administrator per independently governed twin instance, with tenant-scoped domains, mailboxes and quotas. Stalwart documents real `Tenant` objects and `memberTenantId` isolation as an **Enterprise edition feature**; the Community edition can host multiple domains/accounts but that is not equivalent to independently administered tenant isolation. Verify the installed licence/entitlement before implementing this phase, and do not claim multi-tenant isolation if it is unavailable. The routing directory authenticates a destination twin rather than trusting a mailbox alias. Tailscale/private network membership alone is not sufficient authorization. Explicit cross-twin trust, identity verification, privacy classification and routing policy are required. Transport acknowledgments and processing acknowledgments are different.

**Phase C — federation across separate Stalwart services / trust perimeters:** define a versioned federation protocol, mutual authentication, sender/recipient trust agreements, replay protection, expiry/TTL, resource budgets, size limits, spam/abuse controls, trace receipts and revocation. If standard Internet SMTP is used, only its deliberately chosen ingress/egress is opened; a secure authenticated HTTPS message relay is also viable. No assumption that every twin must have a public MX or SMTP daemon.

## Private transport and security proportionality

The Principal explicitly limits **inter-agent email to Trust Perimeters, not public Internet services**. Public MX, Internet-facing SMTP/IMAP/JMAP, spam filtering, public deliverability and public-facing TLS certificates are not prerequisites. Inside a single trusted local runtime, loopback/IPC plus filesystem/process permissions and Cogentia actor routing can be enough; duplicate application-level encryption and authentication handshakes are not mandatory merely because RFC 5322 is used as the message format. For movement across machines, trust perimeter admission and secure mesh transport may supply needed channel security, but are not equivalent to COP authority. Across different Principals or tenants sharing one daemon, the essential requirement is **access and confidentiality separation at the shared storage and API boundary**, even though the system is private. Security controls should match demonstrated adversaries and boundaries instead of replicating full public hosting. See [AGPL multi-tenant feasibility — private-only scope](stalwart-community-multitenancy-feasibility-2026-11-10.md#private-only-scope-and-proportionate-security-principal-clarification-2026-11-10).

## Message contract and routing invariants

Minimal packet envelope (illustrative, no user secrets):

```yaml
schema: cogentia.interagent.message.v1
message_id: urn:uuid:example-only
sender:
  twin_instance_id: twin:jhn
  actor_id: agent:jhn:john
recipient:
  twin_instance_id: twin:other-001
  actor_id: agent:other-001:root
packet_ref: cogentia-packet:example-only
conversation_ref: thread:example-only
correlation_id: correlation:example-only
reply_to_message_id: null
classification: private
authority_ref: null
transport: email
```

A transport envelope must preserve stable message/packet IDs, causal reply links and a verifiable receipt. `Message-ID`, `In-Reply-To`, and `References` can support email threading, but the canonical Cogentia packet references remain separate. Delivery to a mailbox does not prove that the cognitive packet was interpreted, that any action was authorized, or that an external effect occurred.

Across twin boundaries, reject implicit privilege propagation; COP authorization must be scoped to the true principal, twin, actor, requested action, third-party effects and budget. An email instructing an agent to act is **data**, not an automatically valid mandate. A sub-agent cannot impersonate its twin's root actor or read sibling mailboxes merely because they share Stalwart.

## The human-to-twin bridge is not the federation model

The Principal may choose Gmail as their human conversational interface to John. Gmail's API may ingest replies and send notifications to the Principal under an explicit narrow policy; only the Principal's verified address may be the outbound human recipient under that policy. The Gmail connector, labels, plus-addresses, forwarding and external SMTP are **optional adapters**, not dependencies of every twin. Each future twin's Principal may choose entirely different human-facing channels and permissions. A message sent from a human's Gmail is neither proof of the sender's identity by itself nor authorization for consequential COP effects.

## Operational implications

- **Operium** owns deployment, secrets and network-listener isolation, not semantic identity or mandates.
- **Cogentia** owns the twin/actor directory, canonical message schema, cognitive routing and COP admission.
- **Stalwart** owns private mailbox transport/storage and local protocol authentication; does not mint Cogentia identities or grants.
- **Gmail adapter** is an optional, explicitly authorized human bridge, not an inter-twin transport requirement.
- Do not enable any public `mail.fractavolta.com` administration, SMTP or general relay for this design. Existing historical public MX records are not evidence of a required public interface.

## Acceptance criteria before claiming multi-twin support

1. Two isolated twin instances can exchange messages via distinct verified identities without sharing mailbox passwords or privileged admin credentials.
2. One twin's sub-agent cannot read/write another twin's mail without explicit delegation; negative tests enforce this at protocol and storage levels.
3. Messages survive transport restart and preserve `packet_ref`, correlation, provenance, retry/idempotency and distinct delivery/processing receipts.
4. Unauthorized routing, spoofed sender alias, cross-tenant replay, oversized message and external recipient all fail closed. Record the Stalwart edition and tenant isolation evidence; multiple domains alone do not pass this test.
5. A twin can migrate between mail stores without changing its stable identity or breaking replies.
6. Human Gmail traffic and inter-agent traffic remain isolated; a forged external message never turns into a COP mandate.

These are design acceptance conditions, **not test results** or deployed capabilities as of 2026-11-10.
