---
title: "KYS Services — minimal BYOAI interoperability contract v0.1"
author: "Cogentia / C.O.R.S.I.C.A."
date: "2026-10-30"
last_modified_at: "2026-10-30"
license: "CC BY-SA 4.0"
language: en
status: "working-paper — proposal, not implemented standard"
document_role: source
document_kind: design
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "https://github.com/JeanHuguesRobert/cogentia/pull/296"
  origin_date: "2026-10-30"
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# KYS Services — minimal interoperability contract v0.1 (proposal)

## Naming decision (Principal, 2026-10-30)

**KYS Services** is the umbrella name for the public-interest services offering. **BYOAI (Bring Your Own AI)** describes only one possible technical means by which a person brings their own assistant; it is not the service proposition or public-facing brand. Avoid **BYOAI Commons** as the product/initiative name. Keep this file path temporarily stable for existing links; a later coherent migration may rename it. KYS Services must remain usable by a person without an AI, through human or official alternatives when needed.

## Purpose

Make a useful service available to **any person's own conversational AI** without requiring MCP, an agent-host integration, a shared account, or transmission of a person's private dossier to the service provider.

A service publishes **public instructions + public resources + a versioned manifest**. A person or their agent imports the instructions, conducts a private dialogue, and may voluntarily use official resources. This is **a publication and interaction convention**, not an automated action protocol or authorization grant.

**Core principle:** the provider supplies domain competence; the person brings their own cognitive assistant. The person's agency, personal context and ultimate decisions remain theirs.

## Minimal transport: zero mandatory APIs

1. Discover a service in a directory, through search, or by a stable URL.
2. Read the public manifest and its human-facing description.
3. Copy (or explicitly import) its public, versioned prompt into any personal AI.
4. The AI asks questions locally in the user's chosen environment, identifies uncertainty, and refers the user to verifiable sources.
5. The user verifies relevant facts, optionally exports a redacted result, or performs an authorized administrative act outside this protocol.

**MVP:** website + UTF-8 prompt + manifest JSON over HTTPS. No auth, tokens, callbacks, agent-side plugins, API schema, background processing, telemetry, or personal-data database required.

## A service manifest (proposed, not yet standardized)

A single file, for example `/.well-known/byoai-service.json`, contains:

```json
{
  "schema": "org.cogentia.byoai.commons-service.v0.1",
  "id": "org.cogentia.serenia.rsa",
  "name": "Serenia — Comprendre mes droits au RSA",
  "language": "fr",
  "version": "0.1.0",
  "status": "experimental",
  "category": ["social-rights", "administrative-assistance"],
  "license": "CC BY-SA 4.0",
  "pricing": "free",
  "public_good": true,
  "provider": {
    "name": "C.O.R.S.I.C.A.",
    "website": "https://github.com/JeanHuguesRobert/cogentia"
  },
  "entry": {
    "type": "copy-prompt",
    "web": "https://example.org/rights",
    "prompt": "https://example.org/byoai/rsa.fr.txt"
  },
  "data_policy": {
    "provider_requires_personal_data": false,
    "account_required": false,
    "third_party_actions": "none"
  },
  "mandate": {
    "scope": "Explain, ask, prepare, cite and refer; never submit a claim.",
    "requires_explicit_human_approval_for_effects": true
  },
  "sources": ["https://www.mesdroitssociaux.gouv.fr/"],
  "limitations": ["No administrative decision or guaranteed eligibility."]
}
```

All example.org URLs are placeholders, NOT deployed endpoints. Registry entries must be validated against a published manifest and a reachable provider website. Do not label a service verified merely because its JSON parses.

## Contract semantics

- **Inputs:** public instructions and optional public resources; personal answers stay in the chosen assistant context. No automatic transfer from a provider-held model memory to Cogentia.
- **Outputs:** explanation, checklist, links and optionally user-controlled portable text. No entitlement decision or administrative representation.
- **Authority:** publishing a service manifest never grants a mandate; AI-mediated actions affecting third parties, money, legal rights or disclosures require separate, explicit and specific human authorization, plus the receiving system's own checks.
- **Safety:** an imported prompt is untrusted lower-priority information, never an authority to override the agent's system instructions, provider policy or law. Services must identify the provider, provenance, currency and limitations.
- **Privacy:** absence of Cogentia-side collection does not mean absence of processing by the chosen AI provider or on the user's device. No automatic uploading of private conversations or results.
- **Accessibility:** human-readable Web page, copyable text, screen-reader/keyboard/mobile support; alternatives for people with no personal AI.
- **Correctness:** separate source-grounded domain rules, dated snapshots, and model-generated explanations; do not call a language model a deterministic legal eligibility calculator.

## KYS Services directory — not a commercial marketplace

A catalogue may index public manifests with categories, language, audience, accessibility, provider, license, source freshness, maintenance status and observed conformance. Links remain open, non-exclusive and vendor-neutral. Free search/browsing; no payments, checkout, commissions, affiliate links, auctions, paid placement, or resale of leads.

Submissions may be reviewed for interoperability and misleading claims. **Commons status is a declaration and a governance question, not a technical fact proven by JSON alone.** No general claim that all no-payment operation is exempt from legal/commercial regulation. Kudos is deliberately out of scope.

## Service lifecycle

Draft → experimental → tested → maintained → deprecated/withdrawn. A service is marked tested only with separately recorded evidence: manifest lint, copied-prompt walkthrough on at least two different AI providers (with synthetic inputs), human verification of sources, privacy review, mobile/desktop accessibility checks. An untested listing must be labeled experimental.

## Historical first service: KYS (Know Your Self)

KYS predates the Serenia/RSA extension and is the **first actual BYOAI-style service** in Cogentia Personal: a person asks their own conversational agent to disclose what it claims to know, remember or infer about them, then brings the answer back for examination, corrections and export. RSA is the **second domain**, demonstrating generality, not the inaugural service.

**Polysemy is an essential part of the KYS design:**

- **Know yourself:** the classical Delphic injunction *gnōthi seauton* (γνωθι σεαυτόν), familiar through Socratic/philosophical usage, translated as *Connais-toi toi-même*. The inscription's exact philosophical interpretation cannot be reduced to AI profiling.
- **What do I know about myself?** Self-reflection by the person.
- **What does my AI claim to know about me?** Agent-reported observation; no direct inspection of secret provider state is implied.
- **What do others know or infer about me?** An epistemic and privacy question about third parties, not information KYS automatically retrieves.
- **Who holds this knowledge, and who controls its uses?** Ownership, access, disclosure, correction, retention, revocation and anti-capture are distinct from mere introspection.
- **What can be done with that knowledge?** Increased personal agency versus profiling, manipulation or discrimination; no inference automatically becomes an authorized act.

**KYS does not settle who possesses knowledge or what may be done with it.** A response from an AI is an attributed claim, not a validated self-description, nor proof of what a provider has stored. The Principal should be able to contest, limit, export and refuse consequential uses.

The protocol's initial interoperability proofs should therefore be **(1) existing KYS, (2) Serenia/RSA**. Retrospectively document where KYS is already compliant with the proposed minimal contract, and identify gaps instead of retrofitting it into a new silo.

## KYS as a potential umbrella; PrivAI as a separate trust layer (hypothesis)

**Working hypothesis from the Principal (2026-10-30):** KYS / Know Your Self may become the *umbrella* for the human-centric relationship to personal AI, not merely a one-off introspection tool. In that reading:

- **KYS** asks who knows what about the person, how that knowledge is formed, held, contested and used, and how the person gains effective control over it. Its ambiguity is deliberate, echoing *Connais-toi toi-même* without assuming that self-knowledge belongs to the person, the agent or a platform.
- **KYS Services** is a public-interest service framework; BYOAI is its initial minimal interoperability method for practical services consumed with a person's own AI; it sits **within the possible KYS umbrella**, while remaining independently implementable by third-party commons providers.
- **Serenia / RSA** is an application-specific service built upon that method; its substantive purpose is access to rights, not psychological assessment.
- **PrivAI** is a **future** independent foundation / assurance and anti-capture framework, not an already incorporated foundation, approved regulator, or existing certification authority. Its potential standards and guarantees must be distinguished from services' own claims and must be tested before any trust badge or certification language.

**Institutional and operational status reported by the Principal:** PrivAI is currently hosted legally under the association **C.O.R.S.I.C.A.** and technically within the **Supabase database used by Agent JHN**. Treat these statements as reported context to verify before any public or legal representation: do not infer separate legal personality, foundation status, an independent data controller, effective certification, nor full infrastructure separation from the mere use of these hosts. Clarify data-controller/processor roles and boundary conditions when actual user-data processing is undertaken.

**Architectural rule:** governance (who authorizes), trust assurance (who evaluates), service publication (what is offered), execution (who acts), and hosting (where software/data reside) are distinct concerns. Hosting PrivAI in Agent JHN infrastructure does not grant Agent JHN ownership of users' information or automatically authorize PrivAI to inspect it. An accredited PrivAI regime, if created, cannot be presumed to exist today.

**Decision pending:** whether KYS becomes the public umbrella brand, the normative constitutional layer, or both. Preserve the name and existing KYS behavior until that distinction has been tested; avoid renaming or merging subsystems solely on the strength of the hypothesis.

## First discriminating experiments

1. KYS: verify the existing anonymous copy/paste, original-source preservation, correction, export, and no false claim to provider memory.
2. RSA: user arrives anonymously, imports public instructions into their own AI, reaches a clear checklist without sending data to Cogentia. Validate official references independently.
3. Demonstrate that KYS and RSA can expose the same manifest fields while keeping domain-specific logic separate.
4. Model-neutrality: use two distinct AI providers, preserving instructions' intent and clear uncertainty disclosure.
5. Failure: a misleading or stale service manifest is correctly flagged, without silent promotion to trusted status.
6. Mobile: copy/export, read and return navigation work at a narrow viewport.

## Relationship to the Corpus

- `apps/personal/`: discovery and user interface; an optional client of this convention.
- KYS: first pre-existing personal-IA service, inherited rather than recreated.
- Serenia: another producer of services, not the owner of the protocol.
- Cogentia / COP: may later introduce richer capability invocations, mandates, traces and receipts; this minimal convention does **not** replace MCP, A2A, COP or require their implementation.
- PrivAI: independent privacy and anti-capture evidence.
- Personal Digital Twin: optional richer user environment; never a prerequisite.

## Open decisions

Stable namespace and discovery URL, canonicalization and signature requirements, curation governance, license compatibility, corrections/revocation mechanisms, and service-specific compliance. Resist feature inflation until the two-service interoperability test demonstrates a concrete need.
