---
title: "Living Book Checklist"
subtitle: "Normative Specification and Verification Checklist for Living Books"
description: "Authoritative criteria, substantive constraints, and formal structural requirements governing the conception, instantiation, validation, and federation of a Living Book."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-05"
version: "1.0"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "operational"
document_kind: "specification"
document_function: "normative checklist and validation protocol"
visibility: "public"
lifecycle_state: "active"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/living_book_checklist.md"
tags:
  - living-books
  - checklist
  - normative-specification
  - rfc2119
  - epistemology
  - publication
  - factory
  - reality-tests
related_documents:
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/livre_vivant.md"
  - "research/living_book_factory.md"
  - "research/living_book_factory_audit.md"
  - "research/living_book_press_architecture.md"
  - "https://github.com/JeanHuguesRobert/operium/blob/main/docs/living-books-deployment.md"
review:
  status: "unreviewed"
  reviewed_by: []
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "conversation checkpoint 2026-10-05"
  origin_date: "2026-10-05"
  derived_from:
    - "barons-Mariani/research/livre_vivant.md"
    - "cogentia/research/living_book_factory.md"
    - "cogentia/research/living_book_factory_audit.md"
---

# Living Book Checklist
## Normative Specification and Verification Protocol

---

## 0. Conformance and Terminology

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.

This checklist establishes both:
1. **Substantive Constraints (*Le Fond*)**: Ontological nature, epistemic regimes, feedback loop with Reality, and editorial doctrine.
2. **Formal / Structural Constraints (*La Forme*)**: Manifest declarations, directory hierarchy, projection formats, addressability, and machine inspectability.

An artifact that fails ANY **MUST** requirement SHALL NOT be qualified or marketed as a **Living Book** within the Cogentia / Barons-Mariani confederation.

---

## Part I — Substantive Constraints (Content, Doctrine & Epistemology)

```text
                               ┌──────────────────────────┐
                               │         REALITY          │
                               └─────────────┬────────────┘
                                     traces  │  ▲  effects
                                             ▼  │
                     ┌──────────────────────────────────────────────┐
                     │                 LIVING BOOK                  │
                     │  ┌───────────┐ ┌───────────┐ ┌────────────┐  │
                     │  │   BOOK    │ │ MAGAZINE  │ │  ANNEXES   │  │
                     │  │(Enduring) │ │  (Delta)  │ │ (Evidence) │  │
                     │  └───────────┘ └───────────┘ └────────────┘  │
                     │  ┌───────────────────────┐ ┌──────────────┐  │
                     │  │ CONVERSATIONAL AGENT  │ │  COLLECTION  │  │
                     │  │   (Bounded Inquiry)   │ │ (Engagement) │  │
                     │  └───────────────────────┘ └──────────────┘  │
                     └──────────────────────────────────────────────┘
```

### 1. Ontological Nature and Reality Feedback Loop

A Living Book is fundamentally an editorial system coupled to an identifiable, evolving Corpus, its readers, and Reality. It is neither a dead static text nor merely a blog.

- [ ] **REQ-SUB-01 (Continuous Feedback Loop)**: A Living Book **MUST** maintain an operational, accountable feedback loop with Reality:
  $$\text{Reality} \longrightarrow \text{Traces} \longrightarrow \text{Corpus} \longrightarrow \text{Projections} \longrightarrow \text{Action / Reading} \longrightarrow \text{New Traces} \longrightarrow \text{Reality}$$
- [ ] **REQ-SUB-02 (Corpus vs. Projection vs. Edition Distinction)**:
  - The **Corpus** **MUST** remain the sovereign, living source of facts and models.
  - A **Projection** **MUST** be treated as a calculated, transient rendering at time $t$.
  - An **Edition** **MUST** be a dated, selected, composed, and permanently sealed state of the Corpus.
- [ ] **REQ-SUB-03 (Cardinal Invariant)**: Editors and automated tools **MUST** follow the cardinal rule:
  > **Freeze the edition, never the next projection.**
  Sealing a past edition SHALL NOT freeze, hinder, or prevent the continuous evolution of upcoming working projections.

---

### 2. The Three Machines & Revelator/Stabilizer Meta-Loop

- [ ] **REQ-SUB-04 (Three Operational Functions)**: A Living Book **SHOULD** organize its analysis through three operational functions:
  1. **The Inhibit Machine (*Machine à Empêcher*)**: Identifies, exposes, and analyzes mechanisms that destroy, reduce, or compromise effective human and communal capacities.
  2. **The Explore Machine (*Machine à Explorer*)**: Investigates unclosed bifurcations, latent alternatives, competing hypotheses, and counterfactual possibilities.
  3. **The Make-Capable Machine (*Machine à Rendre Capable*)**: Formulates and instruments reproducible methods, tools, and shared commons that convert possibilities into practicable capacities.
- [ ] **REQ-SUB-05 (Revelator / Stabilizer Dynamic)**:
  - A Living Book **MUST** act as a **Revelator** by rendering systemic discrepancies, epistemic gaps, and policy failures falsifiable and reconstructible.
  - A Living Book **MUST** act as a **Stabilizer** by preserving provenance, verified methods, evidentiary records, and frozen editions.
  - *Doctrinal Invariant:* **No Revelator without a stabilization perspective; no Stabilizer without the capacity to reveal its own failures.**

---

### 3. Epistemic Regimes & The Janus Temporal Architecture

- [ ] **REQ-SUB-06 (Strict Dual Temporal Regimes — Janus Profile)**: When a Living Book addresses both historical grounding and future trajectories, it **MUST** maintain watertight segregation between its two evidentiary regimes:
  - **Backward-looking (History)**: Governed strictly by empirical proof, primary archival records, verifiable dates, and causal demonstration.
  - **Forward-looking (Prospective)**: Governed by bounded counterfactuals, scenario modeling, testable hypotheses, and documented pilot experiments.
  - Editors **MUST NOT** contaminate historical accounts with prospective extrapolations, nor dress speculative futures as established past facts.
- [ ] **REQ-SUB-07 (Visibility of Gaps and Contradictions)**:
  - Known gaps in documentation **MUST** remain explicitly visible using standardized markers (e.g., `UNKNOWN`, `UNRESOLVED`, `CONTRADICTION`).
  - Automated tools (including Large Language Models) **MUST NOT** smooth over, fabricate, or hallucinate answers to bridge historical voids.
- [ ] **REQ-SUB-08 (Public, Accountable Correction Path)**:
  - A Living Book **MUST** maintain a visible, public trail of corrections, objections, errata, and retractions.
  - Substantive factual corrections **MUST** be credited, dated, and linked to the evidence that motivated the change.

---

### 4. Editorial Responsibility & Confederal Governance

- [ ] **REQ-SUB-09 (Named Editorial Carrier)**:
  - A Living Book **MUST** declare an identifiable human editorial director (*Directeur de publication*).
  - A Living Book **MUST** declare its institutional publisher/carrier (e.g., *C.O.R.S.I.C.A.*, *Institut Mariani*, *Le Petit Parti*).
  - A Living Book **MUST** state its open license clearly (default: `CC BY-SA 4.0`).
- [ ] **REQ-SUB-10 (Friends Before Competitors — The Confederal Mandate)**:
  - Living Books **MUST** operate under the confederal principle *“Friends before competitors”* (*Amis avant concurrents*).
  - Living Books **SHOULD** provide explicit navigational bridges and cross-citations to peer books across the confederation.
- [ ] **REQ-SUB-11 (Respectful Syndication)**:
  - When syndicating articles or sections between Living Books, the receiving book **MUST** preserve original source authority (`source_authority_preserved: true`).
  - Syndicated content **MUST** include an explicit local contextual note explaining why this peer work is projected here.
  - Unmediated automated echo-chambers or uncontextualized cross-posting **MUST NOT** be implemented.

---

## Part II — Structural & Technical Constraints (Form, Architecture & Delivery)

```text
project-root/
├── manifest.yml                # Mandatory: living-book/v1 declaration
├── architecture.md             # Project architecture specification
├── editorial-architecture.md   # Editorial guidelines and governance
├── corpus.yml                  # Machine-readable corpus graph descriptor
├── manuscript/                 # Face 1 (Part A): Enduring narrative chapters
├── annexes/                    # Face 1 (Part B): Evidentiary records & datasets
├── magazine/                   # Face 2: Chronological deltas & syndication
│   └── federated/              # Inbound syndicated envelopes
├── site/                       # Face 3: Static web projection assets
├── guide/                      # Face 4: Bounded conversational agent profile
├── contributions/              # Face 5: Intake queue and trace processing
├── projections/                # Working projections (preview.html, .pdf, .epub)
│   └── preview.yml             # Projection tracking metadata
└── editions/                   # Sealed, immutable frozen editions
```

### 5. The Five Constitutive Faces

Every fully realized Living Book **MUST** instantiate the five structural faces derived from the canonical model:

#### Face 1 — The Book (*Le Livre: Corps & Annexes*)
- [ ] **REQ-TEC-01 (Enduring Narrative Body)**: The primary manuscript **MUST** reside in `manuscript/` and focus on conceptual clarity, foundational arguments, and narrative intelligibility.
- [ ] **REQ-TEC-02 (Evidentiary Annexes)**: Supporting documentation **MUST** reside in `annexes/` (or dedicated extensions like `cases/`, `chronology/`, `data/`) giving direct access to primary proof.

#### Face 2 — The Magazine (*Le Magazine: Delta Temporel*)
- [ ] **REQ-TEC-03 (Temporal Delta Tracking)**: The magazine **MUST** reside in `magazine/` and chronicle recent developments, newly uncovered traces, institutional replies, and emerging disputes since the prior edition.

#### Face 3 — The Public Web Portal (*Le Site Web: Espace Composable*)
- [ ] **REQ-TEC-04 (Public Addressability)**: The portal **MUST** be deployed to an authoritative canonical FQDN (e.g., `https://village.acorsica.org/`, `https://capable.lepp.fr/`).
- [ ] **REQ-TEC-05 (Addressable Atomic Units)**: Every chapter, case study, evidentiary document, and tool **MUST** have a permanent, addressable URL.
- [ ] **REQ-TEC-06 (No JavaScript Lock-In)**: All core textual, evidentiary, and navigational components **MUST** be fully readable and operable without JavaScript enabled.

#### Face 4 — Bounded Conversational Agent (*L'Agent Conversationnel*)
- [ ] **REQ-TEC-07 (Corpus Boundedness)**: The conversational profile (Guide profile) **MUST** strictly confine agent responses to the verified corpus.
- [ ] **REQ-TEC-08 (Constitutive Boundary)**: The agent interface **MUST** visually and contractually state:
  $$\text{Agent} \neq \text{Corpus} \quad\wedge\quad \text{Agent Output} \neq \text{Primary Source}$$

#### Face 5 — Engaging Collection Surface (*La Collecte Engageante*)
- [ ] **REQ-TEC-09 (Structured Intake)**: The book **MUST** provide a public contribution surface (`contribuer.html` or equivalent form) allowing humans to submit testimonies, objections, and evidence.
- [ ] **REQ-TEC-10 (Intake Separation)**: Exploratory conversations with the agent **MUST NOT** be silently converted into evidentiary traces. An explicit human act of submission (*Act*) is **REQUIRED**.

---

### 6. Declarative Manifest (`manifest.yml`)

- [ ] **REQ-TEC-11 (Canonical Schema)**: Every Living Book project root **MUST** contain a valid `manifest.yml` adhering to the `living-book/v1` schema.
- [ ] **REQ-TEC-12 (Required Manifest Properties)**: The manifest **MUST** declare:
  - `schema`: exactly `living-book/v1`.
  - `book.id`: unique kebab-case identifier.
  - `book.title`: complete human title.
  - `book.canonical_host`: authoritative FQDN.
  - `book.language`: primary ISO 639-1 code (e.g., `fr`, `en`, `co`).
  - `institution.publisher`: institutional publisher.
  - `institution.editorial_director`: named responsible director.
  - `institution.license`: open license string.
  - `editorial`: explicit boolean map for faces (`book`, `magazine`, `site`, `guide`, `contributions`, `janus`).

---

### 7. Triple Projection Standard

- [ ] **REQ-TEC-13 (Triple Projection Generation)**: The projection engine **MUST** be capable of rendering from source markdown into three distinct standalone formats:
  1. **Web Reading Projection (`preview.html` / `/book.html`)**: Clean semantic HTML5, zero external trackers, print-friendly stylesheet.
  2. **Print-Ready Vector Projection (`preview.pdf` / `/book.pdf`)**: Paginated vector layout with table of contents, running headers, and page numbering.
  3. **Portable Offline Projection (`preview.epub` / `/book.epub`)**: Valid EPUB3 document suited for mobile and e-reader hardware.
- [ ] **REQ-TEC-14 (Projection Metadata Tracking)**: Projections **MUST** be accompanied by a `preview.yml` tracking status (`working` vs `frozen`), timestamp, and source Git commit hash.

---

### 8. Living Book Press & Physical Embodiment

- [ ] **REQ-TEC-15 (`edition_id` vs. `copy_id` Segregation)**:
  - `edition_id` **MUST** identify the frozen state of the intellectual corpus.
  - `copy_id` **MUST** identify the individual, numbered physical copy.
- [ ] **REQ-TEC-16 (Message-in-a-Bottle Device / *Bouteille à la Mer*)**:
  - Each physical copy **SHOULD** feature a dedicated inscription area and an addressable marker (QR code or persistent URL) enabling the physical holder to transmit new observations back to the Living Book.

---

### 9. Discovery, Machine Metadata & Zero-Lock-In

- [ ] **REQ-TEC-17 (Semantic Discovery Artifacts)**: The public web root **MUST** expose:
  - `sitemap.xml`: Complete inventory of all canonical pages.
  - `robots.txt`: Explicit crawl directives preserving AI search access while blocking abusive scrapers.
  - `llms.txt`: Standardized, curated summary designed for LLM context injection.
- [ ] **REQ-TEC-18 (Infrastructure Independence)**:
  - The static projection **MUST** be servable from any standard HTTP static file server (Caddy, Nginx, GitHub Pages, IPFS) without requiring proprietary application servers.
  - DNS resolution **MUST** support direct challenge resolution (e.g., DNS-only grey cloud on Cloudflare) to ensure portable, vendor-neutral automated TLS certificate issuance (ACME Let's Encrypt / ZeroSSL).

---

### 10. Automated Factory Inspection

- [ ] **REQ-TEC-19 (Machine Inspectability)**: The project **MUST** pass automated inspection with zero blocking errors:
  ```bash
  node scripts/living-book.js inspect projects/<book-id>
  ```
  The inspector validates directory completeness, frontmatter consistency, manifest compliance, internal link integrity, and projection timestamps.

---

## Part III — Living Book Maturity & Verification Matrix

To evaluate where a specific initiative stands, the following 4-level maturity matrix is applied:

| Level | Designation | Required Substantive & Technical Criteria | Typical Output |
|:---:|:---|:---|:---|
| **Level 0** | **Dead / Traditional Publication** | Fails `REQ-SUB-01` and `REQ-SUB-03`. Static brochure or paper print with no feedback loop, no temporal delta tracking, and no evidentiary annexes. | Static PDF or blog post |
| **Level 1** | **Open Projection** | Meets `REQ-SUB-02`, `REQ-SUB-03`, `REQ-TEC-11`, and `REQ-TEC-13`. Version-controlled corpus in Git, automated triple projection (HTML/PDF/EPUB), and public web availability, but intake and magazine remain informal. | Working paper repository with build scripts |
| **Level 2** | **Operational Living Book** | Meets **ALL** Level 1 criteria plus **ALL** 5 Faces (`REQ-TEC-01` through `REQ-TEC-10`), public delta magazine, structured intake queue, and automated factory verification (`REQ-TEC-19`). | Fully functioning Living Book (e.g., *PrivAI*, *Village*, *Capable*) |
| **Level 3** | **Federated & Embodied Living Book** | Meets **ALL** Level 2 criteria plus strict Janus epistemic partitioning (`REQ-SUB-06`), confederal syndication (`REQ-SUB-11`), Living Book Press numbered physical copies (`REQ-TEC-15`), and live interaction with a Digital Twin. | Exemplary Sovereign Living Book (e.g., *Suicide Corse*, *Rise & Fall*) |

---

## Summary Verification Sheet

```text
LIVING BOOK VERIFICATION AUDIT
Project Identifier   : ___________________________
Authoritative Domain : https://___________________
Editorial Director   : ___________________________
Carrying Entity      : ___________________________
Inspection Date      : ____-____-____

SUBSTANTIVE COMPLIANCE:
[ ] REQ-SUB-01  Reality Feedback Loop Active
[ ] REQ-SUB-02  Corpus / Projection / Edition Segregation
[ ] REQ-SUB-03  Cardinal Rule ("Freeze Edition, Never Next Projection")
[ ] REQ-SUB-04  Three Machines Formulated (Inhibit / Explore / Capable)
[ ] REQ-SUB-05  Revelator / Stabilizer Meta-Loop Balanced
[ ] REQ-SUB-06  Janus Epistemic Segregation (Past vs Future)
[ ] REQ-SUB-07  Visible UNKNOWNs & Zero Hallucination Policy
[ ] REQ-SUB-08  Public, Dated Correction Trail
[ ] REQ-SUB-09  Named Editorial Carrier & Open License
[ ] REQ-SUB-10  Confederal Spirit ("Friends Before Competitors")
[ ] REQ-SUB-11  Syndication with Contextual Notes

TECHNICAL & STRUCTURAL COMPLIANCE:
[ ] REQ-TEC-01  Face 1A: Enduring Narrative Manuscript
[ ] REQ-TEC-02  Face 1B: Evidentiary Annexes & Data
[ ] REQ-TEC-03  Face 2:  Temporal Delta Magazine
[ ] REQ-TEC-04  Face 3A: Authoritative Canonical Domain
[ ] REQ-TEC-05  Face 3B: Addressable Units of Capacity
[ ] REQ-TEC-06  Face 3C: No JavaScript Dependency for Core Reading
[ ] REQ-TEC-07  Face 4A: Bounded Conversational Agent Profile
[ ] REQ-TEC-08  Face 4B: Agent != Corpus Epistemic Notice
[ ] REQ-TEC-09  Face 5A: Structured Engagement Intake
[ ] REQ-TEC-10  Face 5B: Intentional Act Requirement
[ ] REQ-TEC-11  living-book/v1 manifest.yml Present
[ ] REQ-TEC-12  Required Manifest Fields Populated
[ ] REQ-TEC-13  Triple Projection Output (HTML + PDF + EPUB)
[ ] REQ-TEC-14  preview.yml Tracking Generation State
[ ] REQ-TEC-15  Living Book Press edition_id vs copy_id
[ ] REQ-TEC-16  Physical Message-in-a-Bottle Device
[ ] REQ-TEC-17  Discovery Assets (sitemap.xml, robots.txt, llms.txt)
[ ] REQ-TEC-18  Static Portability & Direct ACME DNS Resolution
[ ] REQ-TEC-19  node scripts/living-book.js inspect PASS

OVERALL ASSESSMENT:
[ ] LEVEL 0: Dead Publication
[ ] LEVEL 1: Open Projection
[ ] LEVEL 2: Operational Living Book
[ ] LEVEL 3: Federated & Embodied Living Book

Auditor Signature: ___________________________
```
