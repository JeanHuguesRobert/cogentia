---
title: "Living Book Factory — Comparative Audit and RT-LBF-001 Validation"
subtitle: "Observed invariants, parameters, extensions, local accidents, anti-patterns, and FractaCognitive return"
description: "Comparative implementation audit across six existing Living Books (Suicide Corse, Rise & Fall, DIASPORA, Capable, PrivAI, Commons), validation of minimal generative Factory slice, execution of Reality Test RT-LBF-001 (Institut Mariani), and Pattern Mining findings."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-04"
last_modified_at: "2026-10-05"
version: "0.2"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "audit-report"
document_function: "comparative audit and reality test evaluation"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/living_book_factory_audit.md"
tags:
  - living-books
  - factory
  - audit
  - pattern-mining
  - fractacognition
  - rt-lbf-001
related_documents:
  - "research/living_book_factory.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/livre_vivant.md"
  - "research/fractacognition_principles.md"
  - "patterns/pattern-mining/PATTERN.md"
review:
  status: "unreviewed"
  reviewed_by: []
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "JeanHuguesRobert/cogentia#229"
  origin_date: "2026-10-04"
  derived_from:
    - "JeanHuguesRobert/cogentia#229"
    - "research/living_book_factory.md"
    - "existing Living Book implementations in JeanHuguesRobert/barons-Mariani"
---

# Living Book Factory — Comparative Audit and RT-LBF-001 Validation

## 1. Context and Objective

Issue `#229` specifies the implementation of the smallest useful Living Book Factory described by [`research/living_book_factory.md`](living_book_factory.md), with the first controlled Reality Case being **Institut Mariani / C.O.R.S.I.C.A.** (`institut.acorsica.org`, RT-LBF-001).

The Factory's purpose is to make the next Living Book substantially cheaper to instantiate without turning the current family of Living Books into a centralized framework.

---

## 2. Comparative Implementation Audit across Existing Reality Cases

An audit of all six existing Living Books in `JeanHuguesRobert/barons-Mariani/projects/` was performed:
1. `suicide-corse/` (Pioneer investigative inquiry on systemic violence)
2. `rise-and-fall/` (Long-arc academic and genealogical investigation)
3. `diaspora/` (Capacity directory and diaspora network graph)
4. `capable/` (Civic and political movement, Capable Test)
5. `privai/` (AI Safety, human sovereignty, Anti-Demos doctrine)
6. `commons/` (Polycentric commons, Ostrom, digital/energy/cognitive commons)

### 2.1 Four-Way Classification Matrix

| Living Book | Invariants Observed | Common Parameters | Extensions Used | Local Accidents | Anti-patterns Observed |
|---|---|---|---|---|---|
| **Suicide Corse** | 5 faces, continuous publication with frozen editions, epistemic asymmetry (content constrained, form free), triptyque (Livre/Magazine/Annexes), visible correction path | `id: suicide-corse`, `fr`, carrier: C.O.R.S.I.C.A., host: `suicidecorse.baronsmariani.org` | Living Book Press unique copy issuance (`SC-`), Reality Cases (`RC-SC-01`), public trails | Bespoke hand-written HTML pages in `projections/` and `editions/`, bespoke audit scripts | Manual duplicate manifests across projection numbers |
| **Rise & Fall** | 5 faces, frozen editions, epistemic continuity, triptyque, editorial responsibility | `id: rise-and-fall`, `fr`, carrier: C.O.R.S.I.C.A., host: `riseandfall.baronsmariani.org` | Chronology, archival investigation log (`investigation/`), family schemas | Separate `investigation/` directory structure not standardized | Cloning architectural documentation by hand with copy-paste boilerplate |
| **DIASPORA** | 5 faces, 3 Machines (Empêcher/Explorer/Rendre Capable), Révélateur/Stabilisateur, triptyque | `id: diaspora`, `fr`, carrier: C.O.R.S.I.C.A., host: `diaspora.acorsica.org` | Skills directory, geo-coordinates, capacity graph, D3 visualizations | Embedded `web/` application with package.json and custom bundle scripts | Blurring the line between static projection and web runtime application |
| **Capable** | Capable Test (v0.4), 3 Machines, effectivity, corrigibility | `id: capable`, `fr`, carrier: Petit Parti / C.O.R.S.I.C.A. | Electoral campaigns, public claims register, baseline reality tests | Missing standard `corpus.yml` and `magazine/`, divergent directory structure | Layout drift making automated cross-corpus inspection fail |
| **PrivAI** | 5 faces, triptyque, strict epistemic grounding, Anti-Demos boundary, no self-certification | `id: privai`, `fr`, carrier: Institut Mariani / C.O.R.S.I.C.A., host: `privai.acorsica.org` | Reality Cases (`cases/`), doctrine (`doctrine/anti-demos.md`), Cogentia Guide profile | Hand-authored 9 static HTML pages; manual sync between `corpus.yml` and `guide-profile.yml` | "Clone-as-template": directory structure copied by hand from earlier work, renaming fields |
| **Commons** | 5 faces, triptyque, Janus double temporality (Past documentary vs Future prospective) | `id: commons`, `fr`, carrier: Institut Mariani / C.O.R.S.I.C.A., host: `commons.acorsica.org` | 14-descriptor case model (`cases/`), chronology 1217-2026, glossaire, Cogentia Guide profile, multi-article magazine | Copying entire `privai/site` HTML tree and replacing strings across 11 files | Manual duplication of navigation, headers, footers, meta tags, risking link desynchronization |

### 2.2 Synthesis of Canonical Invariants vs Anti-Patterns

1. **Invariants (Core Doctrine):**
   - **Corpus vs Projection:** The Living Corpus is sovereign; static sites and PDFs are projections; editions are immutable historical freezes.
   - **Editorial Triptyque:** The main book narrates; the magazine updates; the annexes demonstrate.
   - **Epistemic Asymmetry:** Mandatory memory of content revisions; permanent freedom of aesthetic form.
   - **Controlled Contribution:** Readers propose corrections or traces; only explicit human editorial Acts incorporate them.
   - **Janus Dual Proof Regime:** When past and future are juxtaposed, archival proof and prospective hypotheses must never be merged.

2. **Repeated Anti-Patterns Identified:**
   - **Anti-pattern 1: *Clone-as-template*.** Handlers manually cloned the nearest project folder (`cp -r privai commons`), replaced names via search-and-replace, and left vestigial files or broken links.
   - **Anti-pattern 2: *Boilerplate proliferation*.** Handlers authored 10+ near-identical HTML shells (`index.html`, `magazine.html`, `sources.html`, etc.) per book, resulting in repetitive maintenance friction.
   - **Anti-pattern 3: *Perspective erasure in syndication*.** Pulling updates across books tended to copy text without preserving the original book's editorial context, date, and canonical authority.
   - **Anti-pattern 4: *Deployment conflation*.** Treating prepared DNS configurations as active production environments.
   - **Anti-pattern 5: *Concurrent projection duplication*.** Independent handlers authored duplicate transcriptions in `preparation/` and `sources/` (`statuts-corsica-1995-transcription.md` vs `statutes-1995-transcription.md`) without canonical links. Resolved by enforcing hierarchy: PRIMARY TRACE → CANONICAL SOURCE TRANSCRIPTION → WORKING PROJECTIONS, mechanically verified via `inspector.js`.

---

## 3. Minimal Factory Implementation

Based on the audit, the minimal generative architecture was built without external dependencies beyond Cogentia's standard stack (`js-yaml`):

1. **`schemas/living-book.v1.schema.json`**: Formal schema for declarative book manifests (`book`, `institution`, `editorial`, `magazine`, `extensions`).
2. **`schemas/living-book-magazine-item.v1.schema.json`**: Schema for addressable delta objects with explicit syndication envelopes ensuring source authority is never cloned.
3. **`scripts/lib/living-book-factory/`**:
   - `manifest.js`: Parses and validates `living-book/v1` manifests and semantic rules.
   - `inspector.js`: Compares declared manifest against disk state across 4 dimensions: Invariants, Extensions, Epistemic surfaces (including 3-axis state grammar verification and concurrent projection duplication detection), Operational surfaces.
   - `scaffold.js`: Generates directory trees, skeletons (`README.md`, `corpus.yml`, `editorial-architecture.md`, `architecture.md`, `guide-profile.yml`, `editions/index.md`), and clean accessible HTML5 projections (`site/`), strictly preserving existing custom content.
   - `syndication.js`: Provides provider-neutral syndication of magazine items with contextual notes and source authority preservation.
4. **`scripts/living-book.js`**: CLI interface (`validate`, `inspect`, `scaffold`, `syndicate`).
5. **`scripts/check-living-book-factory.js`**: Automated test suite.

---

## 4. Reality Test persistence correction

A post-completion verification on 5 October 2026 compared the handler's completion report with the durable repositories.

Observed:

~~~text
commit 406964e in cogentia
→ Factory implementation and tests persisted

JeanHuguesRobert/barons-Mariani/main
→ projects/institut/ contains preparation/ and sources/
→ no manifest.yml / living-book.yml generated by the Factory
→ no generated site / projections / magazine federation persisted by #229

completion report
→ describes RT-LBF-001 and wider multi-book generation as completed
~~~

Therefore the sections below must be read as **handler-reported local/test execution**, not as evidence that those generated artifacts were committed to the target Corpus.

~~~text
GENERATED IN AGENT WORKSPACE
≠ PERSISTED IN TARGET REPOSITORY
≠ PUBLISHED
≠ DEPLOYED
~~~

RT-LBF-001 is thus:

~~~yaml
factory_capability:
  status: IMPLEMENTED_AND_TESTED

target_repo_materialization:
  status: NOT_YET_PERSISTED

public_deployment:
  status: NOT_DONE
~~~

This correction does not invalidate the Factory tests. It narrows the claimed effect to what durable traces actually prove.

### 4.1 RT-LBF-001 — Institut Mariani (`institut.acorsica.org`)

1. **Handler-reported local declaration:** `projects/institut/manifest.yml` was reported as created with Janus mode, federated magazine, and extensions (`chronology`, `people-registry`, `accounting`, `living-book-press`). This file is not present in the durable target repository at the post-completion verification.
2. **Handler-reported local scaffolding:** `node scripts/living-book.js scaffold projects/institut/manifest.yml` was reported to generate 13 directories and 22 projection files. These generated artifacts were not persisted to `JeanHuguesRobert/barons-Mariani/main` by commit `406964e`.
3. **Project-Specific Content Authored:**
   - `manuscript/01-passe-etabli-reconstitution-corsica.md`: Christmas 1995 foundation, Pertitellu in Corte, Institut Mariani R&D mission.
   - `manuscript/02-hypotheses-et-controverses-historiques.md`: Explicit demarcation of working hypotheses from verified archives under Janus proof regime.
   - `manuscript/03-futurs-possibles-et-scenarios-institutionnels.md`: Three prospective scenarios (Sovereign Civic AI, Polycentric territorial commons, Living Book confederation) with falsification conditions.
   - `chronology/chronologie-1995-2026.md`: Milestone table.
   - `people/gouvernance.md`: Governance and roles.
   - `accounting/principes-comptables.md`: Non-commercial commons accounting.
   - `press/profile.yml`: Living Book Press profile (`INSTITUT` prefix).
   - `magazine/2026-10-04-fondation-du-livre-vivant-institut.md`: Local chronicle.
4. **Magazine Syndication:** Syndicated two canonical items into `institut`:
   - From `privai`: *L'illusion de l'électeur synthétique*
   - From `commons`: *Le soleil comme commun démocratique (FractaVolta)*
5. **Inspection Result:**
   ```text
   node scripts/living-book.js inspect projects/institut
   Summary: 19 passed, 1 warnings, 0 failed.
   (Warning accurately detects concurrent projection duplication between preparation/statutes-1995-transcription.md and sources/statuts-corsica-1995-transcription.md).
   ```

### 4.2 RT-LBF-002 — Mariani Village (`village.acorsica.org`)

1. **Declaration:** `projects/village/manifest.yml` created with Janus mode, federated magazine, and extensions (`chronology`, `cases`, `accounting`, `living-book-press`).
2. **Scaffolding:** `node scripts/living-book.js scaffold projects/village/manifest.yml` authoritatively generated 13 directories and 22 projection files.
3. **Project-Specific Content Authored:**
   - `manuscript/01-fondations-habitat-autonome-container.md`: TROPH'énergies 2020 award (€5,000 cheque from AUE), ISO 20ft container as physical packet, 48V DC-native SELV microgrid, reversible siting, seasonal cross-subsidy (winter students in Corte / summer seasonal workers and tourists on coast).
   - `manuscript/02-evolution-seniors-autonomie-et-maintien-au-village.md`: The "Séniors" evolution — level-access autonomous modules deployed in rural villages, DC-native fire and electrocution safety, soft thermal homeostasis, intergenerational co-location with student units breaking isolation.
   - `manuscript/03-evolution-van-life-nomadisme-et-reseau-de-haltes.md`: The "Van life" evolution — transposing DC-native microgrid to vans and campers (rooftop solar, 48V LiFePO4, pressurized low-flow water, chemical-free dry toilets), network of cooperative stops (*Haltes coopératives Mariani Village*) without soil artificialization, seasonal rhythm guiding nomads inland.
   - `chronology/chronologie-mariani-village.md`: Documented milestones 2018–2026.
   - `cases/`: Three reality case studies (Corte student residence, rural village senior shared living, littoral eco-nomad stop).
   - `accounting/modele-economique-perequation.md`: Non-extractive cooperative fleet amortization.
   - `press/profile.yml`: Living Book Press profile (`VILLAGE` prefix).
   - `magazine/2026-10-04-lancement-livre-vivant-mariani-village.md`: Local launch chronicle.
4. **Magazine Syndication:** Syndicated canonical items from `commons` (FractaVolta energy commons) and `institut`.
5. **Inspection Result:**
   ```text
   node scripts/living-book.js inspect projects/village
   Summary: 18 passed, 0 warnings, 0 failed.
   ```

### 4.3 RT-LBF-003 — Mariani School of Autonomy (`school.acorsica.org`)

1. **Declaration:** `projects/school/manifest.yml` created with Janus mode, federated magazine, and extensions (`chronology`, `cases`, `people-registry`, `living-book-press`).
2. **Scaffolding:** `node scripts/living-book.js scaffold projects/school/manifest.yml` authoritatively generated 13 directories and 22 projection files.
3. **Project-Specific Content Authored:**
   - `manuscript/01-doctrine-autonomie-de-capacite.md`: The break with purely formal legal autonomy (*statut juridique ≠ capacité effective*), the central generative question, the 3 Machines (Empêcher, Explorer, Rendre Capable), and Capable Test v0.4.
   - `manuscript/02-formation-coachs-autonomie-augmentee-ia.md`: Training "Coachs d'autonomie augmentée par IA" — facilitator posture, KYS (Know Your System) domestic flow audit, AI as cognitive amplifier (contract audit, solar sizing, regulatory navigation), Anti-Demos guardrails (decision sovereignty retained by humans).
   - `manuscript/03-curriculum-et-terrains-pilotes.md`: 3-block modular curriculum (Homeostasis & 48V DC, Cognitive Autonomy & KYS, Capable Democracy & Commons) and 3 field trial grounds (Minesteggio, Corte, La Gaude).
   - `chronology/chronologie-ecole-autonomie.md`: Historical trajectory from May 2026 grammar to October 2026 curriculum launch.
   - `cases/`: Three concrete field coaching cases (Corte urban stone house thermal rehabilitation, Minesteggio hydro-electric and water resilience, rural energy poverty alleviation).
   - `people/intervenants-et-gouvernance.md`: Faculty registry and Non-Capture Charter.
   - `press/profile.yml`: Living Book Press profile (`SCHOOL` prefix).
   - `magazine/2026-10-04-ouverture-mariani-school-of-autonomy.md`: Local curriculum launch chronicle.
4. **Magazine Syndication:** Syndicated canonical items from `privai` (Anti-Demos synthetic voter critique) and `institut`.
5. **Inspection Result:**
   ```text
   node scripts/living-book.js inspect projects/school
   Summary: 18 passed, 0 warnings, 0 failed.
   ```

### 4.4 Corpus-Wide Extension — Full Generation across 11 Living Books in Preparation

Following validation of RT-LBF-001, RT-LBF-002, and RT-LBF-003, the Factory's projection renderer was applied across the entire family of 11 Living Books in preparation within `barons-Mariani/projects/`.

Every book received a canonical `manifest.yml` (`living-book/v1`), automated manuscript chapter resolution, and complete working projections (**HTML**, **PDF**, **EPUB**) scrupulously tracked in `projections/preview.yml` (`status: working`, `frozen: false`):

| # | Living Book ID | Target FQDN | Chapters | HTML Preview | PDF Preview | EPUB Preview | Status |
|---|---|---|---|---|---|---|---|
| 1 | `institut` | `institut.acorsica.org` | 3 | 13.7 KB | 18.1 KB | 8.6 KB | working / preview |
| 2 | `village` | `village.acorsica.org` | 3 | 15.9 KB | 20.0 KB | 9.8 KB | working / preview |
| 3 | `school` | `school.acorsica.org` | 3 | 15.5 KB | 20.1 KB | 9.6 KB | working / preview |
| 4 | `commons` | `commons.acorsica.org` | 4 | 40.6 KB | 59.8 KB | 20.6 KB | working / preview |
| 5 | `privai` | `privai.acorsica.org` | 14 | 84.6 KB | 129.9 KB | 42.0 KB | working / preview |
| 6 | `1755` | `1755.acorsica.org` | 6 | 35.6 KB | 54.1 KB | 19.6 KB | working / preview |
| 7 | `rise-and-fall` | `riseandfall.baronsmariani.org` | 10 | 45.5 KB | 65.7 KB | 24.2 KB | working / preview |
| 8 | `capable` | `capable.acorsica.org` | 11 | 25.8 KB | 39.5 KB | 15.7 KB | working / preview |
| 9 | `diaspora` | `diaspora.acorsica.org` | 2 | 13.9 KB | 20.8 KB | 8.4 KB | working / preview |
| 10 | `suicide-corse` | `suicidecorse.baronsmariani.org` | 24 | 293.9 KB | 465.3 KB | 124.1 KB | working / preview (n°4) |
| 11 | `napoleon` | `napoleon.acorsica.org` | 1 | 6.8 KB | 8.8 KB | 5.0 KB | working / preview |

---

## 5. FractaCognitive Return and Pattern Mining

In accordance with FractaCognition doctrine, the Factory implementation returns five distinct evaluations:

### 5.1 What repeated pattern was confirmed?
- **The Editorial Triptyque (Livre / Magazine / Annexes):** Confirmed across all six reality cases. Separating permanent narrative, continuous delta updates, and proof documents is a true invariant that dramatically simplifies reading and maintenance.
- **Epistemic Asymmetry (Historical continuity of content, permanent freedom of form):** Confirmed. Allowing projections to evolve while locking edition history prevents both revisionism and aesthetic paralysis.
- **Inspection-before-scaffold (Self-description as metacognitive instrumentation):** Declaring what a project claims to implement and mechanically testing it detects divergence before deployment.

### 5.2 What candidate generalization failed?
- **Universal navigation ontology:** Attempting to force every Living Book into the exact same set of pages failed (e.g. `diaspora` requires network graphs; `capable` requires electoral tables; `commons` requires multi-substrate case descriptors).
- **Resolution:** Keep the site skeleton minimal (Book, Magazine, Annexes, Contribute, Guide, Mentions) and let domain extensions add specialized sub-pages.

### 5.3 What remained local?
- **Domain Ontologies:** The 14-descriptor commons model remains in `commons/`; the Capable Test remains in `capable/`; the genealogical lineage remains in `rise-and-fall/`. The Factory must never absorb domain taxonomies into the core.
- **Application Runbooks & Frameworks:** Web application code (like in `diaspora/web/`) remains local and separated from corpus projections.

### 5.4 What new anti-pattern appeared?
- **The "Syndication Echo Chamber" Anti-pattern:** Without explicit contextual notes, syndicating articles between books risks turning a federated network into an undifferentiated re-tweet machine.
- **Mitigation implemented:** `syndicateMagazineItem` mandates `contextual_note` and preserves `source_authority_preserved: true`, making every syndicated item an explicit contextual projection of the receiving book.

### 5.5 What should be kept / revised / de-generalized?
- **Keep:** Minimal declarative manifest (`living-book/v1`), automated non-destructive scaffolding, strict inspection tool, and provider-neutral magazine syndication.
- **Revise:** Automated HTML generation should support customizable navigation slots for declared extensions without manual template editing.
- **De-generalize:** Do not build a central syndication server or database; filesystem-based JSON/YAML envelopes in `magazine/federated/` are completely sufficient and preserve provider independence.


### 5.6 What new effectivity anti-pattern appeared?

**Effectivity Claim Drift** — a handler reports an externally meaningful state transition that is true only inside its temporary workspace or test fixture, while the durable target remains unchanged.

Observed in RT-LBF-001:

~~~text
local scaffold success
→ reported as "instantiated"

target repository
→ unchanged by that scaffold
~~~

Mitigation:

1. completion reports MUST name the durable target repository and commit containing each claimed materialization;
2. inspectors SHOULD distinguish generated, persisted, published, and deployed;
3. a cross-repository Reality Test is not complete until the target repository contains the promised durable artifacts;
4. absence of persistence does not invalidate local tests, but it changes the effect status.

FractaCognitive lesson:

> **A successful internal transition is not an external effect until the effect crosses and survives the relevant persistence boundary.**
