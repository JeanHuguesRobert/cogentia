---
title: "Living Book Press — Architecture and Unique-Copy Issuance"
subtitle: "Generic web architecture, registry-before-render protocol, and singular copy materialization for Living Books"
description: "Architecture specification for the Living Book Press, separating edition source, copy allocation, registry, PDF rendering, public verification, and copy biography, with the Exemplaire Singulier modality."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-04"
last_modified_at: "2026-10-04"
version: "0.1"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "architecture-note"
document_function: "specification"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/living_book_press_architecture.md"
tags:
  - living-books
  - living-book-press
  - cognitive-packets
  - copy-issuance
  - singular-copy
  - registry
  - pdf-rendering
  - anti-capture
related_documents:
  - "research/cognitive_packets.md"
  - "research/cognitive_packet_switching.md"
  - "research/locality_principle.md"
  - "research/fractacognition_principles.md"
  - "docs/continuations_and_cognitive_packets_for_agents.md"
  - "patterns/packet-backed-projection/PATTERN.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/suicide-corse/editorial-architecture.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "JeanHuguesRobert/cogentia#227"
  origin_date: "2026-10-04"
  derived_from:
    - "JeanHuguesRobert/cogentia#227"
    - "JeanHuguesRobert/cogentia#213"
    - "JeanHuguesRobert/barons-Mariani:projects/suicide-corse/editorial-architecture.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Living Book Press — Architecture and Unique-Copy Issuance

## 1. Purpose

The **Living Book Press** provides generic, provider-neutral infrastructure allowing any reader to materialize an individually addressable, genuinely unique physical copy of any participating Living Book (such as *Suicide Corse*, *Capable*, *Diaspora*, *PrivAI*, or *Commons*).

Core invariant:

~~~text
book ≠ edition ≠ copy

book_id
  → edition_id
      → copy_id
~~~

> **Every materialized copy is an addressable unique incarnation, not merely another reprint of an undifferentiated PDF.**

---

## 2. Core Distinctions and Incarnation Doctrine

Building directly on Cognitive Packet doctrine (`#213`):

~~~text
content
≠ edition
≠ packet identity
≠ incarnation
≠ mission
≠ trajectory
≠ route
≠ handler
≠ holder
≠ effect
~~~

And between nominal and biographical uniqueness:

- **Nominal uniqueness:** an allocated, collision-safe, registered `copy_id`.
- **Biographical uniqueness:** the accumulated trajectory, missions, annotations, handoffs, and physical provenance acquired by that specific physical object over time.

---

## 3. Editorial Modalities — The "Exemplaire Singulier"

Living Books introduce a clear separation between **material profile** and **singularization mode**:

~~~text
Material profile:
  - Accessible: optimizes cost, ease of home printing, wide distribution, lightweight paper.
  - Luxe: optimizes physical binding, paper weight, professional finishing, durability.

Singularization mode:
  - Standard: general reading copy without assigned identity.
  - Singulier: uniquely identified, registered incarnation with visible copy_id and QR verification point.
~~~

These dimensions combine freely:

~~~text
accessible + singulier  (e.g., unique home-printed numbered copy)
luxe + singulier        (e.g., numbered master copy from a professional binder)
accessible + standard   (e.g., disposable leaflet / reading print)
luxe + standard         (e.g., standard bookstore volume)
~~~

Candidate definition:

> **An Exemplaire Singulier is an identified materialization of an edition, endowed with its own identity and capable of acquiring a distinct biography.**

---

## 4. System Decomposition

The Living Book Press separates six distinct concerns:

```text
┌────────────────────────────────────────────────────────┐
│ 1. Edition Source (Git commit, Quarto manifest, text) │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 2. Copy Allocation (atomic, collision-safe copy_id)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 3. Durable Registry (packet-backed state projection)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 4. PDF Rendering (colophon, QR, fingerprint, pages)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 5. Public Verification (/copies/<copy_id> URL)        │
└──────────────────────────┬─────────────────────────────┘
                           │ (optional / opt-in)
┌──────────────────────────▼─────────────────────────────┐
│ 6. Biography & Trajectory (missions, handoffs, notes)  │
└────────────────────────────────────────────────────────┘
```

### 4.1. Edition Source
An immutable, frozen edition snapshot identified by:
- `book_id` (e.g. `suicide-corse`);
- `edition_id` (e.g. `2026-09-17-anniversaire`, `2026-09-20-n2`);
- `commit_sha` (the exact source commit in the host repository);
- `manifest_ref` (hash or URL of the frozen edition manifest).

The Press never mutates the frozen edition.

### 4.2. Copy Allocation & Registry-Before-Render
To ensure genuine uniqueness, identity is never minted offline and hoped to be unique:

~~~text
User requests copy
  → Authoritative allocation of copy_id
  → Record status: RESERVED
  → Render copy-specific PDF (colophon + QR + fingerprint)
  → Hash rendered artifact (SHA-256)
  → Record status: GENERATED (with render fingerprint)
  → Deliver PDF
  → User confirms physical print → status: MATERIALIZED
~~~

### 4.3. Durable Registry
Stores copy state using the **Packet-Backed Projection** pattern (`patterns/packet-backed-projection/PATTERN.md`). The relational or JSON store is a reconstructible projection of immutable issuance events.

Minimum record:
- `copy_id`: globally unique composite identifier (e.g., `SC-20260917-C0042`);
- `book_id`: identifier of the book;
- `edition_id`: identifier of the frozen edition;
- `edition_source`: commit SHA and manifest fingerprint;
- `singularization`: `singulier` | `standard`;
- `material_profile`: `accessible` | `luxe` | `custom`;
- `issued_at`: ISO timestamp;
- `render`: `{ format: "A4"|"A5", sha256: "...", byte_length: N, generated_at: "..." }`;
- `status`: `RESERVED` | `GENERATED` | `MATERIALIZED` | `VOID`;
- `verification_url`: public verification endpoint;
- `optional`: dedication, initial mission, parent copy ID (for forks).

### 4.4. PDF Rendering Engine
Generates a portable, printer-neutral PDF that can be printed on an ordinary home duplex printer or handed to a local print shop.
The PDF visibly includes an **Identity & Colophon Page**:
- Book title & subtitle;
- Frozen edition name and source commit;
- Unique `copy_id`;
- Issuance timestamp;
- Render SHA-256 fingerprint;
- Verification URL and QR code.

### 4.5. Public Verification Surface
Stable endpoint: `/copies/<copy_id>`
Public response exposes only non-sensitive verification facts:
- Book & edition title;
- Copy identifier & issuance date;
- Edition source reference;
- Render hash/fingerprint;
- Current registration status.

### 4.6. Copy Biography & Trajectory (Optional)
An addressable copy can later acquire an independent mission:
> *« À faire parvenir à un lecteur de la diaspora à Montréal. »*

The physical copy may record handoff events, witness scans, or annotations. These events accumulate in the copy's trajectory without changing the shared frozen edition.

---

## 5. Duplicate-Print Semantics (RC4 Resolution)

What happens if a user downloads an issued PDF and prints it twice?

1. **Physical Rematerialization:** If the second print is made because the first was damaged or lost, it is an authorized re-materialization of the *same* physical incarnation.
2. **Incarnation Fork:** If both physical copies circulate concurrently as separate objects, the second physical copy constitutes an *incarnation fork* (`fork(incarnation)`). To preserve documentary integrity and biographical traceability, concurrent objects should each carry their own `copy_id`.

The registry records issuance of the digital artifact; the physical holder remains responsible for not circulating duplicate objects under one nominal identity unless documented as an intentional twin or backup.

---

## 6. Privacy & Anti-Capture Invariants

- **No Person Tracking by Default:** `copy identity ≠ holder identity ≠ owner identity`. A copy is fully verified without demanding the reader's real name, email, or credentials.
- **No Blockchain / NFTs:** Unique identity and provenance rely on cryptographic hashing, durable registries, and signed verification URLs—not tokens, gas fees, or artificial scarcity.
- **No Vendor Lock-in:** The PDF is standard PDF/A or PDF-1.4, compatible with any printer worldwide.

---

## 7. Reality Cases

- **RC1 — Home Print:** Reader selects edition, requests unique copy, downloads copy-specific PDF, prints locally on A4/A5. Verified against registry.
- **RC2 — Professional Printer:** User hands the exact same generated PDF to an arbitrary print shop.
- **RC3 — Concurrent Issuance:** Near-simultaneous issuance requests for the same edition receive strictly sequential, collision-free identifiers.
- **RC4 — Duplicate Print:** Explicit distinction between rematerialization and incarnation fork.
- **RC5 — Biographical Event:** Attaching an optional mission to an existing copy without mutating the edition.
