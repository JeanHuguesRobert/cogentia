---
title: "Living Book Factory"
subtitle: "Minimal generative architecture for instantiating, validating, federating, and learning from Living Books"
description: "Operational specification derived from existing Living Book Reality Cases. Separates doctrine, invariants, parameters, extensions, local accidents, build-time generation, runtime commons, federation, and FractaCognitive feedback."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-04"
last_modified_at: "2026-10-04"
version: "0.2"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "architecture-note"
document_function: "operational specification"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/living_book_factory.md"
tags:
  - living-books
  - factory
  - generative-architecture
  - pattern-mining
  - fractacognition
  - metacognition
  - federation
  - publishing
  - cognitive-packets
related_documents:
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/livre_vivant.md"
  - "research/living_book_press_architecture.md"
  - "research/fractacognition_principles.md"
  - "patterns/pattern-mining/PATTERN.md"
  - "patterns/packet-backed-projection/PATTERN.md"
  - "research/locality_principle.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/suicide-corse/editorial-architecture.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/rise-and-fall/editorial-architecture.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/diaspora/architecture.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/privai/editorial-architecture.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/commons/editorial-architecture.md"
review:
  status: "unreviewed"
  reviewed_by: []
provenance:
  origin_type: "repository"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "unknown"
  origin_date: "2026-10-04"
  derived_from:
    - "existing Living Book implementations in JeanHuguesRobert/barons-Mariani"
    - "research/living_book_press_architecture.md"
    - "research/fractacognition_principles.md"
    - "patterns/pattern-mining/PATTERN.md"
---

# Living Book Factory

## 0. Status and authority boundary

This document is an operational specification for producing Living Books. It does not redefine the doctrine of the Living Book.

The canonical doctrinal source remains JeanHuguesRobert/barons-Mariani/research/livre_vivant.md.

~~~text
Living Book doctrine
→ defines what a Living Book is

Living Book Factory
→ operationalizes repeated implementation knowledge

Living Book instance
→ applies both locally
~~~

Canonical governance rule:

> **Consolidate relationships, not authority.**

A Factory change MUST NOT silently become a doctrinal change. Repeated implementation experience MAY reveal a doctrinal question, but that question must be propagated explicitly to the doctrinal source.

## 1. Why a Factory now

The first Living Books were intentionally built through local experimentation: Suicide Corse, Rise & Fall, DIASPORA, Capable, PrivAI, Commons, and related work around the Musée Mariani des Possibles and #1755.

Across these instances, handlers repeatedly recreated similar structures:

~~~text
README / project entry point
corpus manifest
architecture
editorial architecture
manuscript
magazine
annexes / sources / chronology / cases
working projections
edition registry
static public site
Guide profile
contribution surface
legal / editorial responsibility surface
sitemap / robots / llms.txt
~~~

The Commons bootstrap already made the latent architecture explicit by classifying work as GENERIC, PARAMETRIC, PROJECT-SPECIFIC, MISSING, and DO NOT REBUILD.

The Factory turns this repeated experience into a reusable operational layer while preserving local sovereignty.

> **Make the project-specific intellectual and editorial work dominate the cost of creating a new Living Book.**

## 2. Four-way classification

Every candidate Factory feature MUST first be classified as one of four kinds.

### 2.1 Invariant

A property required by canonical Living Book doctrine, or required to preserve a constitutive distinction.

Examples: identifiable living Corpus distinct from projections; Book / Magazine / Site / Guide / engaging contribution surfaces; provenance; editorial responsibility; living projection versus frozen edition; visible correction path; source versus derived distinction where material; contribution preparation versus engaging Act.

### 2.2 Parameter

A common function whose value changes by Living Book.

Examples: title, book_id, canonical host, language, editorial carrier, visual identity, cadence, Guide corpus scope, Janus mode, public contribution channels.

### 2.3 Extension

A capability useful to some Living Books but not constitutive of all.

Examples: capability directory, genealogy, maps, campaign observatory, people registry, accounting views, Reality Case registry, federated Magazine, Living Book Press, singular-copy issuance, specialized simulators.

### 2.4 Local accident

A project-specific implementation choice that must not be generalized merely because it exists.

Examples: one particular hand-written HTML layout; a filename convention not required elsewhere; one project's domain ontology; a temporary deployment workaround; an implementation produced only because a previous handler lacked another capability.

Canonical test:

~~~text
required by doctrine
→ CORE invariant

independently needed by >= 2 Reality Cases
→ candidate reusable Pattern

needed by one project only
→ keep local

repeated but harmful / high-friction
→ candidate Anti-pattern, not Factory feature
~~~

The two-Reality-Case threshold is a heuristic, not an axiom.

## 3. Minimal system decomposition

~~~text
Living Book Factory
│
├── 1. Doctrine references
│      no duplicated sovereignty
├── 2. Canonical schemas
│      manifest + reusable event/item shapes
├── 3. Profiles
│      parameter sets for one Living Book
├── 4. Extensions
│      optional local capabilities
├── 5. Build / validation pipeline
│      inspect, validate, render, freeze
└── 6. Runtime commons
       Guide, collection, registry, Press, federation
~~~

The Factory SHOULD remain useful without a central application server.

## 4. Candidate living-book/v1 manifest

The first implementation SHOULD test a small declarative manifest before introducing a richer ontology.

~~~yaml
schema: living-book/v1

book:
  id: institut
  title: Institut Mariani
  canonical_host: institut.acorsica.org
  language: fr

institution:
  publisher: C.O.R.S.I.C.A.
  research_unit: Institut Mariani

editorial:
  book: true
  magazine: true
  site: true
  guide: true
  contributions: true
  janus: true

magazine:
  mode: federated
  sources:
    - privai
    - commons
    - capable
    - diaspora

extensions:
  - chronology
  - people-registry
  - accounting
  - living-book-press
~~~

The manifest is not the Corpus and is not the full project model. It is a minimum self-description sufficient for generation, validation, and introspection.

## 5. Self-description as executable metacognitive instrumentation

A Living Book SHOULD be able to declare what it claims to implement. The Factory can then compare declared state with observed implementation.

Candidate command:

~~~text
living-book inspect <book-id>
~~~

Candidate output:

~~~text
Doctrine / invariant coverage
✓ Book
✓ Magazine
✓ Site
✓ provenance
✓ contribution boundary

Declared extensions
✓ Janus
⚠ Federated Magazine partially implemented
✗ Press profile missing

Epistemic surfaces
✓ source / projection distinction
✓ correction path
⚠ no frozen edition

Operational surfaces
✓ site source
✓ Guide profile
✗ deployment not evidenced
~~~

This is not merely linting. It is a FractaCognitive property:

~~~text
system describes itself
→ observes implementation
→ detects divergence
→ prepares bounded correction
~~~

> **Self-description is evidence about intended structure, not proof that the structure exists.**

## 6. Generic generation targets

A minimal Factory SHOULD generate or validate the common shell without owning project-specific content.

Candidate surfaces:

~~~text
README.md
corpus.yml or equivalent manifest projection
architecture.md skeleton
editorial-architecture.md skeleton
manuscript/
magazine/
annexes/
cases/
chronology/
sources/
projections/
editions/
guide-profile.yml
site/
  index
  book / edition access
  magazine
  annexes / sources
  guide
  contribute
  legal / editorial responsibility
  sitemap.xml
  robots.txt
  llms.txt
journals/
~~~

Not every directory must physically exist when unused. Apply Occam and Minimum Sufficient Locality.

Generated files are projections. When a generator becomes authoritative for a generated surface, handlers MUST change the source/generator rather than silently patching generated output.

## 7. Profiles versus extensions

Profiles package recurring parameter choices without creating new doctrine.

~~~text
profile: static-publication
profile: janus-historical-prospective
profile: investigation
profile: institutional
profile: campaign
~~~

Extensions add optional capability.

~~~text
extension: directory
extension: map
extension: genealogy
extension: people-registry
extension: accounting
extension: federated-magazine
extension: living-book-press
~~~

A profile MAY activate extensions, but activation MUST remain inspectable. An extension MUST NOT widen editorial or external-action authority.

## 8. The Janus profile

The Janus Principle should be represented explicitly when a Living Book treats both reconstruction and possible futures.

~~~text
PAST
→ sources
→ provenance
→ chronology
→ causal reconstruction

PRESENT
→ current state
→ deltas
→ Reality Tests

FUTURE
→ scenarios
→ possible capacities
→ experiments
→ falsification / revision conditions
~~~

> **Past reconstruction and future projection may coexist, but their proof regimes must never be silently merged.**

institut.acorsica.org is the first intended Factory Reality Case using Janus as an explicit profile.


## 8 bis. Three-axis state grammar: knowledge, institution, effect

RT-LBF-001 exposes a recurring ambiguity that the Factory SHOULD make explicit when institutional or procedural objects are represented.

A single field named \`status\` is often insufficient because three independent questions coexist:

~~~text
EPISTEMIC STATE
What do we know about this object?

INSTITUTIONAL STATE
Where is this object in a human / organizational decision process?

EFFECT STATE
Is the object actually producing the effects attributed to it?
~~~

Canonical candidate invariant:

> **Epistemic state ≠ institutional state ≠ effective state.**

This is a cross-cutting grammar candidate, not yet a mandatory frontmatter vocabulary.

### Epistemic state candidate values

~~~text
ESTABLISHED
REPORTED
RECONSTRUCTED
INFERRED
HYPOTHESIS
SCENARIO
UNKNOWN
~~~

The values describe support, not institutional authority.

### Institutional state candidate values

~~~text
DRAFT
PREPARATORY
PROPOSED
SUBMITTED
ADOPTED
REJECTED
WITHDRAWN
SUPERSEDED
EXPIRED
UNKNOWN
N/A
~~~

The values describe a decision lifecycle. They do not prove legal effectiveness.

### Effect state candidate values

~~~text
NOT_EFFECTIVE
PARTIALLY_EFFECTIVE
EFFECTIVE
SUSPENDED
CEASED
UNKNOWN
N/A
~~~

The values describe observed or legally/operationally established effect, not merely adoption.

Example:

~~~yaml
object:
  id: corsica-statutes-2026-draft
  type: institutional-document

epistemic_status:
  value: ESTABLISHED
  basis:
    - document_exists

institutional_status:
  value: PREPARATORY
  authority: C.O.R.S.I.C.A.

effect_status:
  value: NOT_EFFECTIVE
~~~

A draft can therefore be a perfectly established document while remaining institutionally preparatory and without present effect.

### Event-sourced preference

When state changes matter, handlers SHOULD preserve the transition as an event rather than silently overwrite history:

~~~text
PREPARATORY
→ submission event
→ SUBMITTED
→ decision event
→ ADOPTED
→ effect / formalization event
→ EFFECTIVE
~~~

The current status is then a projection of durable events.

This aligns with Packet-Backed Projection and COP-style event accounting without requiring every Living Book to adopt a database or event runtime.

### Minimum Sufficient Locality

Not every object needs all three axes.

~~~text
historical photograph
→ epistemic status useful
→ institutional status N/A
→ effect status N/A

draft statutes
→ all three axes useful

future scenario
→ epistemic SCENARIO
→ institutional DRAFT or N/A
→ effect NOT_EFFECTIVE
~~~

Do not add empty metadata merely for uniformity.

### Frontmatter relation

The canonical frontmatter schema remains authoritative for document metadata. These three axes are domain-state fields, not replacements for document-level \`status\`, \`review.status\`, or \`lifecycle_state\`.

Under the Living Frontmatter optimistic rule, they MAY appear as local fields when materially useful, because their semantics are explicit, reversible and linked to this active Factory Reality Test. Promotion into shared frontmatter vocabulary requires further recurrence and review.


## 9. Magazine items as federatable objects

The Magazine is not only a page. A reusable Factory needs a minimal addressable delta object.

~~~yaml
schema: living-book.magazine-item/v1
id: ...
source_book: privai
published_at: ...
event_at: ...
title: ...
summary:
  short: ...
  medium: ...
topics: [...]
epistemic_status: ...
canonical_ref: ...
provenance: ...
~~~

A federation consumer MAY subscribe, select, summarize, and cite a canonical item. It MUST NOT silently clone source authority.

~~~text
origin_item
→ canonical source in Book A

syndicated_item
→ contextual projection in Book B
~~~

> **Syndication preserves editorial perspective and provenance.**

## 10. Living Book federation

Living Books form a confederation, not a super-book.

Candidate relations:

~~~text
DERIVES_FROM
SYNDICATES
CITES
CONTRADICTS
SHARES_METHOD
REUSES_EXTENSION
REALITY_CASE_OF
~~~

A future graph MAY expose these relations, but the first Factory MUST NOT require a graph database.

## 11. Living Book Press boundary

The Factory and Living Book Press are complementary.

~~~text
Factory
→ create / validate / render editorial system

Press
→ frozen edition
→ copy allocation
→ registry-before-render
→ singular materialization
~~~

Identity hierarchy:

~~~text
book_id
→ edition_id
→ copy_id
~~~

The Factory MAY generate Press configuration when enabled. It MUST NOT duplicate Press issuance semantics.

## 12. FractaCognition: two feedback loops

### 12.1 Editorial feedback

~~~text
Reality
→ trace
→ Corpus
→ Living Book projection
→ correction / new edition
~~~

This loop learns about the object domain.

### 12.2 Factory feedback

~~~text
Factory
→ Living Book instance
→ friction / repetition / workaround / success
→ Pattern Mining
→ invariant / parameter / extension / anti-pattern
→ Factory vNext
~~~

This loop learns about how the instruments are built.

> **Editorial feedback ≠ Factory feedback.**

A historical correction in Rise & Fall does not imply a Factory change. A recurrent implementation problem in several Living Books may.

## 13. Metacognitive promotion rule

Factory evolution SHOULD apply existing FractaCognition principles.

- **Talleyrand:** make recurring material assumptions explicit and inspectable.
- **Occam:** do not build a universal ontology when a local extension is sufficient.
- **Minimum Sufficient Locality:** keep specialized state local until repeated Reality Cases justify crossing the boundary.
- **Metacognitive Initiative:** notice reusable process lessons during object-level work and propose the smallest useful trace or Reality Test.
- **Pattern Mining:** promote repeated experience only when reuse reduces future friction or improves rigor.

## 14. Generalization must itself face Reality

A reusable abstraction is a hypothesis.

~~~text
candidate generalization
→ implement minimally
→ use on next independent Living Book
→ measure friction and exceptions
→ keep | revise | de-generalize
~~~

Candidate effectiveness dimensions:

~~~text
time_to_instantiate
manual_boilerplate
copied_generic_files
cross-book_divergence
handler_clarifications
manual_fixes
project_specific_effort_ratio
validation_failures
reversibility
~~~

The goal is increased effective capacity with preserved rigor, not abstraction for its own sake.

## 15. Anti-patterns

The Factory MUST resist:

1. Clone-as-template.
2. Framework-first design.
3. Universalizing a local ontology.
4. Silent edits to generated projections.
5. Authority capture by infrastructure.
6. Perspective erasure in syndication.
7. Deployment conflation.
8. Conversation-to-contribution collapse.
9. Metacognitive recursion for its own sake.
10. Concurrent projection duplication (independent handlers creating competing unlinked transcriptions or projections across `sources/` and `preparation/`; the hierarchy must remain PRIMARY TRACE → CANONICAL SOURCE TRANSCRIPTION → WORKING PROJECTIONS).

## 16. RT-LBF-001 — Institut Mariani

The first controlled Factory Reality Test is the intended Living Book:

~~~text
book_id: institut
target: institut.acorsica.org
theme:
  operation and history of C.O.R.S.I.C.A.
  Institut Mariani R&D activity
  future institutional scenarios
  federation of Magazine deltas from Living Books using Institut technology
~~~

The Reality Test asks:

> **Can a new complete Living Book be instantiated mainly from declaration and project-specific content, without reconstructing common infrastructure by hand?**

Initial acceptance direction:

~~~text
manual generic boilerplate         → near zero
generic files copied by hand       → zero
project-specific intellectual work → dominant effort
site navigation                    → generated or validated
Guide profile                      → generated or validated
Magazine feed                      → generated or validated
Janus separation                   → explicit and validated
federated provenance               → preserved
human editorial judgment           → retained
deployment                         → separate authorized act
~~~

Failure is informative. If the Factory needs many one-off exceptions for institut, revise the abstraction rather than forcing the project to fit it.

## 17. Minimal implementation sequence

~~~text
Phase 0
→ audit existing instances and fixtures
→ record observed common shapes

Phase 1
→ define living-book/v1 manifest candidate
→ implement inspect / validate

Phase 2
→ generate smallest common static shell
→ no production deployment

Phase 3
→ implement federated Magazine item schema / feed adapter

Phase 4
→ instantiate Institut as RT-LBF-001
→ record friction and exceptions

Phase 5
→ Pattern Mining review
→ keep / revise / de-generalize
~~~

No database, service mesh, authentication system, or central runtime should be introduced merely to satisfy the Factory abstraction.

## 18. Cognitive Packet / agent handoff contract

Implementation should be resumable by a cold coding agent. A handler must be able to recover from durable references: objective, current Factory specification, source doctrine, relevant existing instances, explicit no-go boundaries, first actionable step, acceptance criteria, and return contract.

The handler SHOULD use existing tools and Patterns before introducing new primitives.

> **Dogfood first. Runtime later, if Reality justifies it.**

## 19. Expected generative effect

The Factory succeeds when adding a Living Book increasingly means:

~~~text
declare identity and editorial profile
→ connect sovereign Corpus
→ provide project-specific content
→ select justified extensions
→ inspect / validate
→ build projection
→ confront Reality
~~~

rather than:

~~~text
copy another project
→ rename files
→ rediscover invariants
→ manually repair divergence
→ repeat
~~~

The Factory is therefore not only a publication tool. It is a reusable **capacity multiplier** whose own abstractions remain corrigible by the Living Books it helps create.
