---
title: Stalwart Community multi-tenancy — feasibility, licensing and implementation boundaries
subtitle: Study of a free-software path for Cogentia multi-twin mail
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-11-10'
last_modified_at: '2026-11-10'
version: '0.1'
status: working-paper
document_role: operational
document_kind: research-paper
visibility: public
lifecycle_state: working
language: en
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/stalwart-community-multitenancy-feasibility-2026-11-10.md
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: principal_instruction
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 2026-11-10 Cogentia inter-agent multi-tenancy discussion
  origin_date: '2026-11-10'
  derived_from:
    - research/federated_twin_interagent_mail.md
review:
  status: unreviewed
  reviewed_by: []
---

# Stalwart Community multi-tenancy — feasibility and licensing boundaries

## Principal requirement

Study *exactly what is needed* to make the **AGPL open-source Stalwart Community foundation** support several independently governed Cogentia Digital Twin instances, each with separate agent mailboxes and controlled inter-twin communications, without assuming a commercial licence indefinitely. This is an **architecture and due-diligence study**, not a mandate to circumvent a licence, modify deployed binary or activate external SMTP.

## Verified facts as of 2026-11-10 (Stalwart v1.1.0)

1. The same upstream binary and data format implement Community and Enterprise. Enterprise is activated through a paid licence. Its native `Tenant` object and tenant administrators, isolation and quotas are **Enterprise features**; multiple domains/accounts in Community do not establish tenant isolation. Official docs: <https://stalw.art/docs/server/enterprise/>, <https://stalw.art/docs/auth/authorization/tenants/>, <https://stalw.art/docs/ref/object/tenant/>.
2. The public upstream GitHub source tree for tag `v1.1.0` is available; `git/trees/v1.1.0?recursive=1` contains 2,155 entries and is not truncated. But **publicly visible does not mean AGPL-licensed**. File headers inspected directly on 2026-11-10:
   - `crates/common/src/enterprise/mod.rs`: `SPDX-License-Identifier: LicenseRef-SEL`, expressly *not open source software*.
   - `crates/common/src/enterprise/license.rs`: `LicenseRef-SEL`, explicit legal warning against modifying/bypassing licence enforcement.
   - `crates/smtp/src/queue/tenant.rs`: `LicenseRef-SEL`; its `assign_tenants` returns if `!server.is_enterprise_edition()`.
   - `crates/common/Cargo.toml`: the `enterprise` Cargo feature aggregates enterprise flags in other crates, rather than proving this feature is free.
   - The tree contains `LICENSES/AGPL-3.0-only.txt` and `LICENSES/LicenseRef-SEL.txt` and the upstream README states that the source is **dual-licensed with per-file notices**. Inspect each source file's SPDX header before reuse.
3. Enterprise licence expiration causes tenant administrators to lose tenant-administrator privileges and quotas to cease being enforced; data persists. This can compromise tenant operational governance even if mailboxes survive. Official docs: <https://stalw.art/docs/server/enterprise/>.
4. Stalwart Community contains valuable AGPL-licensed JMAP, SMTP, IMAP and account/domain primitives, but an independent multi-tenant guarantee requires proof across the entire control and data path. Transport and UI filtering alone are not credible tenant isolation.

**Legal boundary:** do not remove/patch commercial licence checks to activate SEL code, relicense SEL code as AGPL, or copy proprietary tenant implementation into an AGPL fork without permission. Whether an original clean-room implementation may recreate interoperable *behaviour*, while independently respecting copyright and relevant contract law, needs legal review before publication. Licensing is assessed **per file/component**, not inferred from the root repository's AGPL badge. This note is engineering analysis, not legal advice.

## Options compared

| Route | True per-twin isolation? | Engineering work | Vendor dependency | Decision |
|---|---|---|---|---|
| Purchase/maintain Enterprise subscription | Native tenant objects, delegated admins and quotas, subject to validation | Low | Recurring licence and loss of features at expiry | Baseline/reference implementation |
| Community, several domains and accounts in one server | **Not inherently**; shared admin and missing tenant boundary | Low initial, high risk | Low monetary; security gap | **Reject as equivalent to multi-tenant** |
| Community with **one independent server process and independent data/credentials per twin**, behind a private proxy/router | Potentially strong isolation if network, filesystem, auth and management are independently bounded | Medium | Little commercial dependency; increased operations overhead | Best short-term AGPL fallback |
| Community + **original AGPL tenant isolation implementation** across backend services, using only reusable AGPL components | Potentially true isolation when comprehensively audited | High to very high | Low after maintenance, but large divergence from upstream | Research/fork only if sustained need justifies investment |
| Community + Cogentia gateway mediating all user actions on one shared server | Only if every unmediated protocol/API/store path is blocked; ordinary shared accounts still create hazards | Medium–high | Low licence dependency | Not sufficient alone; only supplementary control |

## Functional decomposition for an original AGPL multi-tenant implementation

Minimum independently specified components, without copying SEL source:

1. **Tenant registry**: opaque `twin_instance_id` mapped to internal `tenant_id`, tenant lifecycle, domains, principals, groups, alias namespaces and administrator roles; migration and archival rules.
2. **Authentication and authorization**: every API/service request resolves authenticated tenant and actor, enforces scoped role and denies cross-tenant object lookups. Distinguish system operator, tenant administrator and agent mailbox user. No raw API route may bypass checks.
3. **Message and directory storage**: tenant-qualified indexes, object IDs, mailbox operations, attachment/blob access, search, quotas and cleanup; enforce isolation in backend, not only at HTTP handlers.
4. **Transport policy**: check both SMTP envelope and resolved recipients, including aliases, group expansions, Sieve forwards, DSNs/bounces, relay routing and local queue. Explicitly allow inter-twin messages only under trust policy; never treat arbitrary inbound email as COP grant.
5. **Provisioning and lifecycle**: tenant/domain/mailbox creation, atomic removal, password/key rotation, backup/export/import, storage migrations, namespace collision prevention and per-twin retention.
6. **Observability and limits**: per-tenant usage, throughput, queue quotas, rate limiting, anti-abuse, redacted tenant-bound logs, failed-delivery receipts and independent recovery.
7. **Inter-twin security**: authenticated identities and signed/sealed semantic envelopes as needed, traceable `packet_ref` and idempotency keys; never confuse stable twin identity with email alias or machine address.
8. **Test and review**: at least two distinct tenants, two admins and multiple users; negative tests across JMAP, IMAP, SMTP, management API, shared mailbox, calendars/contacts if enabled, alias expansion, all query/search/blob paths and backup recovery; inspect authorization bypasses. Security review required before claiming production-grade isolation.

This is much larger than a configuration change or a couple of Rust patches.

## Private-only scope and proportionate security (Principal clarification 2026-11-10)

**Scope reduction:** Cogentia's inter-agent mail is not an Internet-facing email hosting offer. Stalwart transports messages **only inside explicitly configured Trust Perimeters**, with no inbound public SMTP/IMAP/JMAP, no public MX dependency and no unrestricted outbound relay. Therefore public-mail deliverability, internet spam/abuse processing, DKIM/SPF/DMARC, general webmail public TLS and public tenant self-service provisioning are **out of scope for the initial use case**. Do not import the broad Enterprise feature set as a minimum product requirement.

Apply **proportionate protection** to the actual boundary:

| Scope | Minimal appropriate protection | Not presumed necessary |
|---|---|---|
| Same twin, same Unix host/process trust boundary | Loopback or local IPC; service-account/process permissions; stable actor IDs and delivery receipts; a bounded actor routing policy | End-to-end message encryption and independently credentialed SMTP for each internal handler |
| Different twin instances sharing one Stalwart process | Distinct mailbox ownership and access checks *enforced at the shared service boundary*, mailbox isolation and tenant-aware routing; auditable administrator role | Public MTA features, independent commercial-billing tenants or complete hosted-mail UI |
| Different machines within one trusted mesh | Authenticated machine/twin admission and private connectivity; authorize recipient/actor separately from network reachability | A second application-level encrypted envelope **when** the lower-level trusted transport supplies adequate confidentiality/integrity |
| Different Trust Perimeters / Principals | Explicit cross-perimeter trust, sender authentication, least-privilege mailbox admission, policy on which private data may cross, revocation | Global public SMTP, unless federation intentionally selects it |

**Threat-model clarification:** a Trust Perimeter excludes untrusted outside parties, but it does not magically give every sub-agent permission to read a sibling's mail, impersonate a different Principal or issue COP mandates. A shared process or daemon is itself a trust boundary: if all tenants are equally trusted by one operator and merely need routing separation, a simple AGPL gateway and restricted local accounts may be adequate; if independently sovereign Principals require non-access by each other or the operator, strong isolation and possibly separate Community processes/data stores remain necessary. Do not describe a simple alias mapping as security isolation. No external attacker model, hostile Internet tenants, strong cryptography or multi-principal distrust should be invented without an actual requirement; conversely, do not waive confidentiality of a Principal's private corpus simply because the network is private.

**Reduced free-software MVP:** a single Community Stalwart service on a private interface, a registry mapping stable `twin_instance_id` and `actor_id` to local mailbox aliases, mailbox-scoped credentials/capabilities where the Community API supports them, default-deny outbound/inbound Internet, and a Cogentia handler that converts messages to cognitive packets. Test agent A cannot read agent B's mailbox and twin A cannot address twin B under a forbidden route. Use multiple isolated processes or Enterprise only if actual trust boundaries require guarantees a shared Community daemon cannot provide. This is a design candidate, **not** a claim that Community currently supplies native tenant isolation.

## Suggested engineering sequence

- **Now:** continue bootstrapping John's Stalwart Community mail for *one twin* on Fracta2, private endpoints only; keep canonical `twin_instance_id` distinct from mailbox address. No commercial feature dependency yet.
- **Then:** use the Enterprise feature as an *observable behavioural specification*, not a code source. Compare a licensed reference installation if lawfully available, plus public API docs, to an AGPL-only implementation; track independently developed acceptance tests.
- **When second independently governed twin is genuinely needed:** compare operating separate Community processes/stores versus Enterprise subscription economics. Prefer the separable Community instance path if cost/maintenance matters and isolation is urgent; do not claim multiple mail domains in one Community daemon are separate tenants.
- **Long term:** decide whether a truly AGPL tenant extension is justified by a wider public-interest need, maintenance capacity and legal review. Design identity/routing abstractions to permit changing mail backend without changing twin identifiers.

## Open questions (to investigate in source before coding)

- Which authorization, directory, JMAP, message-store and queue modules are specifically AGPL versus SEL in v1.1.0? Build an SPDX inventory (do not assume from directory name alone).
- Can one Stalwart Community daemon be configured with separate directories/data stores per domain without Enterprise? Docs currently list per-domain directories as Enterprise; verify concrete API capabilities rather than inferring.
- Can per-twin private Stalwart daemons be provisioned efficiently using Operium without port conflicts or N-way operational burden?
- What are the exact SEL licence terms for the pieces needed, and what independently implementable protocol/behaviour interfaces are available?
- Would a maintainer-backed upstream AGPL enhancement be accepted? Upstream README indicates contributions focus mainly on fixes/translations, making an uncoordinated multi-tenant feature PR unlikely to be accepted.

## Source trail

- <https://github.com/stalwartlabs/stalwart/tree/v1.1.0>
- <https://github.com/stalwartlabs/stalwart/blob/v1.1.0/crates/common/src/enterprise/mod.rs>
- <https://github.com/stalwartlabs/stalwart/blob/v1.1.0/crates/common/src/enterprise/license.rs>
- <https://github.com/stalwartlabs/stalwart/blob/v1.1.0/crates/smtp/src/queue/tenant.rs>
- <https://github.com/stalwartlabs/stalwart/blob/v1.1.0/crates/common/Cargo.toml>
- <https://stalw.art/docs/server/enterprise/>
- <https://stalw.art/docs/auth/authorization/tenants/>
- <https://stalw.art/open-source/>

**Evidence status:** source headers and public documentation verified; no full source audit, fork, paid-licence activation, cross-tenant tests or implementation claimed.
