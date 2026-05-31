---
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/derived_products.md
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
last_stamped_at: 2026-05-26
title: "Derived Products"
date: "2026-05-24"
status: "working-paper — auto-filled (frontmatter cleanup)"
---
# Derived Products
## Versioned Source Corpora, Situated Forms, and Publication Agents

**Status:** Working paper v0.2 draft — consolidated  
**Repository target:** `cogentia/research/derived_products.md`  
**Language:** English  
**Authorial context:** Cogentia / Cogentia Commons / Ubikia / Jean Hugues Noël Robert  
**Date:** 2026-05-23  

---

## Abstract

This working paper proposes a conceptual and operational framework for understanding *derived products* as situated forms of a versioned source corpus. It argues against the classical hierarchy in which an academic article is treated as the sovereign source and all other publications as simplified descendants. Instead, the paper proposes a source-first architecture: the substantive content belongs to a versioned corpus, while academic papers, public essays, technical briefs, political notes, social posts, video scripts, and continuation prompts are derived forms adapted to specific audiences, platforms, personas, and constraints.

The framework distinguishes between substance, form, platform, and publication. The *source corpus* carries the substance. The *derived product* organizes the form. The *platform* provides a scene or channel of publication. The *persona* governs the mode of appearance. The *publication agent* manages distribution, metadata, timing, traceability, and coherence across scenes.

Within the Cogentia ecosystem, this paper positions Ubikia as an editorial derivation workshop and Ubikia Publisher as a publication agent: not the author of the corpus, but the intermediary that helps derived products appear in the right scene, under the right form, with the right provenance.

The central rule is: do not popularize from the academic paper; derive from the corpus.

---

## 1. Introduction

Modern publishing workflows often assume an implicit hierarchy.

At the top stands the academic paper, technical report, official document, or book. From it, one produces a public summary, a blog post, a social media announcement, a slide deck, or a video script.

This workflow is familiar, but it is conceptually misleading for a living, versioned corpus.

If the source of a thought is a versioned corpus, then no single publication form should be treated as the sovereign origin. An academic article is not the source itself. A public essay is not merely a degraded academic article. A social post is not simply a shortened essay. Each is a situated form, produced under constraints, for an audience, on a platform, through a persona.

This paper calls such forms *derived products*.

A derived product is not secondary in the sense of being inferior. It is secondary in the precise sense that it derives from a source. Its quality depends not on its position in a prestige hierarchy, but on its fidelity, adequacy, clarity, traceability, and fitness for its scene.

The goal is to formalize this reversal.

---

## 2. Positioning Note

This paper is part of the Cogentia and Ubi research track.

It builds on the framework developed in `personas.md`, where a persona is defined as a situated mode of appearance of a person, institution, project, corpus, or agent before a given audience.

Here, the same logic is applied to publications.

A publication is not only a container of information. It is an appearance of a source through a form, a persona, and a platform.

The paper therefore has two layers:

1. a general theory of derived products;
2. an operational proposal for Cogentia / Ubi workflows.

The general theory can be understood independently of the internal terminology. Ubikia and Ubikia Publisher are introduced as possible implementation tools.

---

## 3. Related Operational Concepts

This framework is adjacent to several existing operational traditions, but it should not be reduced to any one of them.

### 3.1 Content Management Systems

Content management systems organize publication, editing rights, pages, posts, media, and users. They usually start from the published object.

Ubikia starts from the source corpus and tracks derivation from source to form.

### 3.2 Static Site Generators

Static site generators transform structured files into websites. They are useful for reproducible publication, but they do not necessarily track persona, audience, provenance, or cross-platform derivation.

### 3.3 Single-Source Publishing

Single-source publishing is close to the present framework. It allows several outputs to be generated from one source. The difference is that derived products are not only output formats. They are situated appearances governed by persona, audience, platform, and responsibility.

### 3.4 Documentation-as-Code

Documentation-as-code provides an important precedent: version control, review, plain text, reproducibility, and traceable changes. The present framework extends that logic from technical documentation to public, political, academic, editorial, and agentic forms.

### 3.5 Digital Asset Management

Digital asset management tracks reusable assets. Derived product governance tracks not only assets but transformations: why a source became a form, through which persona, for which audience, on which platform, under which constraints.

### 3.6 Editorial Calendars

Editorial calendars organize timing and planning. They do not usually preserve deep source provenance. Ubikia may include calendar functions, but its primary role is publication agency and provenance management.

### 3.7 Agentic Workflows

Agentic workflows can automate tasks across tools. The risk is that automation optimizes production without preserving fidelity. Ubikia should use agents only under derivation rules: source primacy, persona explicitness, provenance, review, and anti-capture.

The key distinction is therefore:

> Ubikia is not primarily a CMS, a static site generator, or a social media manager. It is a derivation and provenance system for versioned corpora.


## 4. Core Distinction: Substance, Form, Platform

The framework rests on a simple distinction.

```text
Substance
  = what the corpus says, explores, claims, doubts, remembers, or tests

Form
  = how the substance is shaped for a specific use

Platform
  = where and under what technical/social conditions the form appears
```

This distinction prevents category errors.

A public essay is a form.  
An academic paper is a form.  
A technical brief is a form.  
A social media post is a form.  
A video script is a form.  
A continuation prompt is a form.

Substack is not a form. It is a platform.  
Medium is not a form. It is a platform.  
GitHub is both a platform and, in this architecture, a source infrastructure.  
Facebook, LinkedIn, X, YouTube, podcast platforms, newsletters, and journals are scenes or channels of appearance.

The fundamental distinction is therefore:

```text
versioned source corpus
  = substance-bearing infrastructure

derived product
  = situated form

publication platform
  = scene or channel of appearance
```

---

## 5. Definition of a Derived Product

A derived product may be defined as follows:

> A derived product is a situated form generated from a versioned source corpus for a specific audience, platform, persona, and purpose, while preserving traceable coherence with the source.

This definition includes several requirements.

### 4.1 Source Dependence

A derived product derives from a source. It should be possible to identify the source file, version, commit, or corpus state from which it was produced.

### 4.2 Formal Autonomy

A derived product is not a mere excerpt. It may reorganize, translate, compress, expand, dramatize, formalize, contextualize, or operationalize the source.

### 4.3 Persona Mediation

A derived product appears through a persona: scholarly, public, political, technical, legal, memorial, pedagogical, or agentic.

### 4.4 Audience Fit

A derived product is addressed to a specific audience. A text for a peer-review committee, a local elected official, a citizen, a developer, a journalist, or an AI agent should not have the same form.

### 4.5 Platform Awareness

A derived product must account for the platform or channel where it will appear: length, metadata, formatting, discoverability, interaction model, archival stability, and audience expectations.

### 4.6 Traceable Fidelity

A derived product should preserve the core claims, uncertainties, limitations, and conceptual structure of the source. Its transformations should be reconstructible when stakes justify it.

---


## 6. Symmetric and Asymmetric Derived Products

The previous sections define derived products as situated forms generated from a
versioned source corpus. A further distinction is needed: not all derived
products preserve the same degree of reconstructibility.

Some derived products are close transpositions of a source. Others are
performative condensations of a broader thesis. Both may be legitimate. They
should not be confused.

### 6.1 Symmetric Derived Products

A **symmetric derived product** preserves enough of the source structure for
the source, or another symmetric product, to be approximately reconstructed
from it.

In this case, the transformation mainly affects:

- language;
- tone;
- audience;
- format;
- density;
- scene of publication;
- persona;
- platform constraints.

The conceptual structure remains largely recoverable.

For example, a source article, an academic version, and a critical essay may be
symmetric derived products if each preserves substantially the same thesis,
the same main distinctions, and the same argumentative structure.

A symmetric product transposes a thesis.

Its purpose is not to reduce the thesis, but to make it appear under another
form.

### 6.2 Asymmetric Derived Products

An **asymmetric derived product**, by contrast, does not preserve the full
structure of the source corpus.

It selects, condenses, applies, dramatizes, operationalizes, or performs one
conclusion of a broader thesis.

It may be fully faithful while being non-reversible.

From the corpus, the asymmetric product can be derived.

From the asymmetric product alone, the corpus cannot be fully reconstructed.

This non-reversibility is not a defect. It is often the condition of practical
effectiveness.

A declaration must declare.

A slogan must focus.

A public post must make one point audible.

A speech must orient action.

A prompt must trigger an operation.

A manifesto must gather and intensify.

An asymmetric product does not need to carry all its premises. It must remain
traceable to them.

### 6.3 Mono-Source and Multi-Source Derivations

A derived product may also be **mono-source** or **multi-source**.

A **mono-source derived product** is mainly derived from one clearly identified
source document.

```text
source document
  → derived product
```

A **multi-source derived product** is derived from several documents within the
corpus.

```text
source document A
source document B
source document C
  → derived product
```

Multi-source derivation is especially common when a product condenses a
political, operational, or strategic conclusion from several conceptual
sources.

In such cases, the product should, whenever possible, make its source lineage
explicit through metadata, notes, or references to the relevant source
documents.

This does not mean that every public-facing product must display its whole
genealogy. A short public post or a declaration may remain formally concise.
But the corpus should preserve enough traceability for the relation between
product and sources to be reconstructed by a human reader or by an agent.

### 6.4 Faithfulness Without Reversibility

The core epistemic rule is:

> **Faithfulness does not imply reversibility.**

A derived product may faithfully derive from a corpus while preserving only a
subset of the premises that generated it.

The corpus remains the sovereign source of the thesis.

The derived product is one situated form of that thesis.

A faithful product must not contradict its source corpus unless the
contradiction is explicit, justified, and treated as a revision of the corpus.

A faithful product should also avoid presenting a partial conclusion as if it
contained the whole argument from which it derives.

This is especially important for public, political, artistic, or operational
forms, where the need for force, clarity, and memorability may require
asymmetry.

### 6.5 Operational Classification

A derived product may be classified along several dimensions.

| Dimension | Category | Meaning |
|---|---|---|
| Relation to source | Symmetric | The product preserves enough structure for approximate reconstruction of the source or another symmetric product. |
| Relation to source | Asymmetric | The product condenses, applies, dramatizes, operationalizes, or performs one conclusion and is not fully reversible. |
| Source lineage | Mono-source | The product derives mainly from one identified source document. |
| Source lineage | Multi-source | The product derives from several documents in the corpus. |
| Function | Expository | The product explains a thesis. |
| Function | Performative | The product enacts or declares a conclusion. |
| Function | Operational | The product enables an action, workflow, interface, or decision. |
| Function | Public-facing | The product makes a thesis audible in a specific public scene. |
| Reversibility | High | The product preserves most of the source structure. |
| Reversibility | Partial | The product preserves some structure but omits important premises. |
| Reversibility | Low | The product mainly performs, condenses, or signals a conclusion. |

### 6.6 Minimal Metadata for Reversibility

When useful, a derived product may include lightweight metadata.

```yaml
status: derived_product
relation_to_source: symmetric | asymmetric
source_lineage: mono-source | multi-source
primary_sources:
  - repository: example-repository
    path: path/to/source_1.md
  - repository: example-repository
    path: path/to/source_2.md
target_scene: academic | public | political | operational | artistic | internal
function: expository | performative | operational | public-facing
reversibility: high | partial | low
```

This metadata is not bureaucratic.

It is a traceability device.

It helps human readers and agents distinguish between the corpus as source and
the product as situated appearance.

### 6.7 Corpus-maintained derived products (delegated to agents)

Not every derived product faces outward to a paper, a post, or a campaign scene. Some live *inside* the corpus and must be kept in sync with it as it evolves. These form a small but growing **typology of corpus-maintained derived products**, and they split cleanly along the symmetric/asymmetric line of §6.

**Symmetric, machine-generated views** can be regenerated by a deterministic tool with no judgment: backlink lists, trail navigation banners, `documents.md`, `corpus-status.md` auto-blocks, and a README's `readme_index` block. They are produced mechanically (`cogentia backlinks | trails | documents | corpus-status | readme`) and overwrite themselves idempotently.

**Asymmetric, judgment-requiring products** cannot be safely regenerated by a regex — they carry voice, selection, ordering, or public stakes. The pipeline therefore does not write them mechanically; it *delegates* their refresh to an intelligent agent through typed continuations (`cogentia.continuation.v1`), the same way a judgment is suspended and resumed in §10. This is implemented by `cogentia readme` and `cogentia derived` (both run inside `cogentia refresh`); see [`pipeline.md`](pipeline.md) §4.14.

| Type | Examples in this corpus | Relation to source | Detection | Maintained by |
|---|---|---|---|---|
| Profile README | `JeanHuguesRobert/README.md` | Asymmetric (public identity / campaign) | Convention: `github.com/<user>/<user>` root README | Per-artefact continuation (`cogentia readme`) |
| Auto-generated tutorials | `cogentia_js_tutorial.md`, `Inox/research/learning-inox.md` | Asymmetric (derived from source code + doctrine) | Frontmatter `derived_by: agent` (+ `derived_from`) | Grouped continuation (`cogentia derived`) |
| Curated reading trails | `cogentia/research/trails/*.md` | Asymmetric (selection + ordering) | Convention: `research/trails/*.md` | Grouped continuation (`cogentia derived`) |
| Websites | Jekyll roots (`_config.yml`), incl. subdirectories (e.g. `FractaVolta/`, `FractaVolta/docs/`) | Asymmetric (situated public surface) | Convention: directory contains `_config.yml` | Grouped continuation (`cogentia derived`) |

The list is open. A new type joins it by declaring itself — a document with `derived_by: agent` in its frontmatter, or a convention recognised by the tool — and the soundness test of the continuation protocol still binds: the delegated agent must be replaceable by a human or another agent without modifying `cogentia.js`.

This open, self-declaring set of live artefacts is what turns a static collection of files into a **reactive corpus**: each derived product — Markdown document, README, trail, or website — is scheduled to re-react to its sources rather than drift away from them. The reaction is still on-demand (triggered when `refresh` emits the delegations and an agent resumes them) rather than continuous, but the loop is closed: source changes now have a defined path back into every situated surface the corpus exposes.


## 7. The Methodological Reversal

The classical hierarchy is:

```text
academic paper
        ↓
popular article
        ↓
summary
        ↓
social media post
```

The source-first hierarchy is:

```text
versioned source corpus
        ↓
situated derived products
        ├── academic paper
        ├── public essay
        ├── blog essay
        ├── technical brief
        ├── policy note
        ├── political statement
        ├── legal argument
        ├── social media post
        ├── video script
        ├── podcast outline
        ├── conference abstract
        ├── slide deck
        └── continuation prompt
```

The practical rule is:

> Do not popularize from the academic paper. Derive from the corpus.

This does not diminish academic writing. It clarifies its status. The academic paper is the scholarly persona of the corpus. It is valuable because it imposes discipline: references, caution, method, contestability, explicit claims, and peer recognition.

But it is not the source of all other forms.

A public essay may legitimately derive from the same corpus without being a simplification of the academic article. A technical brief may derive from the same corpus without passing through the essay. A social post may announce the essay, but it may also announce a research source, a campaign note, a prototype, or a continuation.

The source is the corpus.

The forms are multiple.

---

## 7. Academic Papers as Derived Products

An academic paper is a derived product governed by academic constraints.

These constraints include:

- explicit research question;
- relation to existing literature;
- method or conceptual framework;
- discipline-specific vocabulary;
- argumentative caution;
- references;
- contestability;
- formal structure;
- institutional or peer review expectations.

These constraints are useful. They help make a claim discussable by a scholarly community.

But they are constraints of form, not proof that the academic paper is the primary substance.

The academic paper selects from the corpus. It frames. It disciplines. It tones down. It cites. It removes local or narrative elements. It may delay applications. It may avoid strategic language. It may convert a living thought into a stable argumentative object.

This is a mask.

A legitimate mask, but a mask.

The academic article is the corpus appearing before the scholarly scene.

---

## 8. Blog Essays and Blogging Platforms

A blog essay is a derived form.

A blogging platform is a publication scene.

These should not be confused.

A Substack article, a Medium article, a WordPress post, or a Ghost newsletter may all host similar forms. The platform affects the audience, circulation, metadata, monetization, discoverability, and interaction model. But the form remains conceptually distinct from the platform.

A blog essay may emphasize:

- readability;
- narrative force;
- concrete examples;
- public relevance;
- memorable formulations;
- cultural references;
- continuity with previous posts;
- shareability.

In the current practical workflow, Substack may be the main blogging platform. Medium may become a secondary platform later. This is an operational decision, not a conceptual hierarchy.

The correct abstraction is:

```text
Form: public / blog essay
Platform: Substack, Medium, WordPress, Ghost, etc.
```

---

## 9. Social Media Posts as Derived Products

Social media posts are often treated as low-value fragments. This is another category error.

A social media post may be a poor fragment. But it may also be a precise derived product.

Its constraints are real:

- short attention window;
- algorithmic distribution;
- platform-specific formatting;
- audience heterogeneity;
- risk of decontextualization;
- rhetorical compression;
- image or link preview behavior;
- interaction through comments;
- tendency toward persona capture.

A good social media derived product should not merely “promote” a text. It should preserve a minimal coherent appearance of the source.

In this framework, a social post should ideally include:

- source reference;
- main claim;
- target audience;
- platform-specific adaptation;
- controlled tone;
- optional call to action;
- avoidance of distortion;
- traceability to a source or published form.

For some platforms, typography may itself be part of the form. For example, Unicode bolding may be used in Facebook posts to compensate for weak formatting tools. Such choices belong to the product layer, not to the source layer.

---

## 10. Continuation Prompts as Derived Products

A continuation prompt is a special derived product designed for another agent.

It is not a public essay. It is not a summary. It is a transferable state of work.

A continuation prompt may include:

- current thesis;
- source files;
- definitions;
- open questions;
- constraints;
- next actions;
- preferred style;
- known objections;
- unresolved choices;
- provenance;
- expected output.

In a multi-agent environment, continuation prompts are essential. They allow work to move from one agent to another without relying on hidden memory or platform-specific continuity.

A continuation prompt is therefore a derived product whose audience is not primarily human, but agentic.

This makes it central to Cogentia.

---

## 11. Personas and Derived Products

Every derived product appears through a persona.

Examples:

| Derived product | Persona |
|---|---|
| Academic paper | scholarly persona |
| Public essay | public intellectual persona |
| Campaign note | political persona |
| Legal argument | claimant / legal persona |
| Technical brief | builder / architect persona |
| Memorial text | witness / guardian persona |
| Social post | platform-specific public persona |
| Continuation prompt | agentic coordination persona |

The persona determines what can be said, how directly, with what vocabulary, and under what responsibility.

A derived product can fail in two ways:

1. **Source betrayal**  
   The product no longer preserves coherence with the corpus.

2. **Persona mismatch**  
   The product speaks in the wrong mode for its audience or scene.

For example, an academic article written like a campaign post fails by persona mismatch. A campaign note that distorts the source fails by source betrayal. A social post optimized for engagement at the expense of meaning risks persona capture.

---

## 12. Platforms as Scenes of Appearance

Platforms are not neutral containers.

Each platform defines a scene of appearance through:

- audience composition;
- formatting constraints;
- recommendation algorithms;
- identity norms;
- moderation rules;
- monetization logic;
- archival stability;
- interaction patterns;
- metadata fields;
- searchability;
- link behavior;
- reputation mechanisms.

A derived product must account for the platform, but it should not be governed by the platform alone.

This is where persona capture often begins. The platform rewards a certain form of appearance. The author or agent adapts. The rewarded form becomes habitual. Eventually, the platform-optimized persona may rewrite the source.

A source-first architecture protects against this risk by ensuring that platforms receive derived products but do not become the source.

---

## 13. Provenance and Traceability

A derived product should carry provenance.

At minimum, provenance should answer:

- What source corpus was used?
- Which file or files?
- Which version or commit?
- Which persona?
- Which audience?
- Which platform?
- Which constraints?
- Which agent or human produced the draft?
- Who reviewed it?
- Where was it published?
- Has it been updated?
- Does it supersede a previous version?

For low-stakes outputs, this can be lightweight. For high-stakes outputs, it should be explicit.

A minimal metadata header may look like:

```yaml
derived_product:
  id: machines_public_essay_v1
  source:
    repository: barons-Mariani
    file: research/machines_apparition.md
    commit: pending
  form: public_essay
  platform: substack
  persona: public_intellectual
  audience: general_public_cultivated
  status: draft
  reviewed_by: Jean Hugues Noël Robert
```

---

## 14. Quality Criteria

A derived product should be evaluated according to criteria different from both raw originality and platform performance.

### 13.1 Fidelity

Does it preserve the core claims, distinctions, uncertainties, and limits of the source?

### 13.2 Fitness

Is the form appropriate to its audience and scene?

### 13.3 Traceability

Can its relation to the source be reconstructed?

### 13.4 Legibility

Can the intended audience understand it?

### 13.5 Responsibility

Is authorship, review, or accountability clear enough for the stakes?

### 13.6 Non-Capture

Does the product resist platform or persona incentives that would distort the source?

### 13.7 Reusability

Can the product be reused, forked, translated, summarized, or continued without losing the source relation?

### 13.8 Return Value

Does the publication generate feedback that can improve the corpus?

---

## 15. Ubikia as Derivation Infrastructure

Ubikia may be positioned as an editorial derivation infrastructure for versioned corpora.

Its purpose should not be generic content generation. It should be governed derivation.

Ubikia should help answer:

- What is the source?
- What form is needed?
- Which persona should appear?
- Which audience is addressed?
- Which platform will host it?
- What constraints apply?
- What should be preserved?
- What should be avoided?
- What metadata should be attached?
- What review is required?
- What publication history should be recorded?

Ubikia should therefore manage not only text generation but the structured relation between source, form, persona, audience, platform, and provenance.

Its central principle may be:

> Derive without betraying.

---

## 16. Ubikia Publisher as Publication Agent

Ubikia Publisher may be understood as the publication agent of Ubikia. It is not a writing agent. It is a publication agent.

The analogy is an artistic agent.

An artistic agent does not create the artist’s work. The agent helps the work appear in the right venues, under the right conditions, to the right audiences, with the right agreements and timing.

Similarly, Ubikia should not be the author of the corpus. It should be the agent that helps derived products appear in publication scenes.

Possible functions:

- prepare platform-specific metadata;
- adapt titles, subtitles, tags, excerpts, and previews;
- manage publication checklists;
- prepare announcements;
- track where each product appears;
- avoid duplicate manual labor;
- ensure source links are preserved;
- warn when a platform version diverges;
- propose cross-publication only when useful;
- coordinate Substack, Medium, LinkedIn, Facebook, GitHub, and other channels;
- maintain a publication ledger.

In the current practical stage, using only one blogging platform may be rational. Publishing manually to Substack, Medium, and other platforms without automation creates duplication, fatigue, and inconsistency.

Ubikia becomes necessary when multi-platform appearance should no longer mean manual repetition.

---

## 17. Minimal Data Structures

A simple file-based MVP can start with YAML metadata.

### 16.1 Source

```yaml
id: personas_source_v021
repository: cogentia
file: research/personas.md
status: working_paper
substance:
  core_claim: >
    Personas are situated modes of appearance, and digital/AI systems require
    governance of masks, cloaks, and certification.
  key_terms:
    - persona
    - mask
    - cloak
    - KYS
    - persona_capture
```

### 16.2 Derived Product

```yaml
id: personas_public_essay_v1
source: personas_source_v021
form: public_essay
platform: substack
persona: public_intellectual
audience: general_public_cultivated
status: draft
constraints:
  - explain without excessive internal vocabulary
  - preserve mask/cloak distinction
  - avoid reducing persona to fake identity
review:
  required: true
  reviewer: Jean Hugues Noël Robert
```

### 16.3 Publication

```yaml
id: personas_substack_publication_v1
derived_product: personas_public_essay_v1
platform: substack
status: planned
metadata:
  title: "Personas, masks and cloaks"
  subtitle: "Why AI agents will need governed visibility"
  tags:
    - AI
    - digital identity
    - Cogentia
    - persona
```

### 16.4 Cross-Platform Publication

```yaml
id: personas_medium_publication_v1
derived_product: personas_public_essay_v1
platform: medium
status: deferred
reason: >
  Medium publication is postponed until Ubikia can automate metadata,
  formatting, source links, and publication tracking.
```

---

## 18. Mini-Case 1: `personas.md`

The working paper `personas.md` can serve as a first concrete test of the framework.

### Source

```yaml
source:
  repository: cogentia
  file: research/personas.md
  status: working_paper
  core_claim: >
    Personas are situated modes of appearance. AI-mediated systems require
    governance of masks, cloaks, KYS certification, and persona capture.
```

### Possible Derived Products

```yaml
derived_products:
  - id: personas_academic_paper
    form: academic_paper
    persona: scholarly
    audience: digital_identity_and_ai_governance_researchers
    platform: journal_or_conference
    purpose: peer_discussion

  - id: personas_public_essay
    form: blog_essay
    persona: public_intellectual
    audience: general_public_cultivated
    platform: substack
    purpose: public_explanation

  - id: personas_facebook_post
    form: social_media_post
    persona: public_author
    audience: existing_facebook_network
    platform: facebook
    purpose: announce_and_test_reception

  - id: personas_ubikia_spec_fragment
    form: technical_specification
    persona: builder_architect
    audience: developers_and_agents
    platform: github
    purpose: implementation

  - id: personas_continuation_prompt
    form: continuation_prompt
    persona: agentic_coordination
    audience: another_ai_agent
    platform: copy_paste_or_agent_protocol
    purpose: continue_the_work
```

### Lesson

The academic paper is not the origin of the others. It is one possible scholarly appearance of the same source. The public essay, technical specification, social post, and continuation prompt should all derive from the source corpus, not from one another by degradation.

---

## 19. Mini-Case 2: `machines_apparition.md`

A second test case is the planned work on science fiction, AI, masks, personas, and the politics of appearance.

### Source

```yaml
source:
  repository: barons-Mariani
  file: research/machines_apparition.md
  status: planned_source
  core_claim: >
    Major works of science fiction and modern literature can be read as
    laboratories of situated appearance: machines redistribute what can be
    seen, heard, counted, archived, erased, masked, or recognized as living.
```

### Possible Derived Products

```yaml
derived_products:
  - id: machines_academic_article
    form: academic_article
    persona: scholarly
    audience: science_fiction_studies_or_philosophy_of_technology
    platform: journal
    possible_venues:
      - ReS_Futurae
      - Appareil

  - id: machines_blog_essay
    form: blog_essay
    persona: public_intellectual
    audience: readers_interested_in_AI_culture_and_politics
    platform: substack
    title: "Machines to Explore, Machines to Erase"

  - id: machines_facebook_post
    form: social_media_post
    persona: public_author
    audience: local_and_existing_network
    platform: facebook
    purpose: announce_the_blog_essay

  - id: machines_linkedin_post
    form: social_media_post
    persona: professional_public_author
    audience: AI_governance_and_innovation_network
    platform: linkedin
    purpose: professional_positioning

  - id: machines_conference_abstract
    form: conference_abstract
    persona: scholarly
    audience: conference_reviewers
    platform: conference_submission_system
    purpose: obtain_discussion_slot
```

### Lesson

The same source can appear as cultural criticism, academic argument, AI-governance reflection, public essay, and social announcement. Each form selects and frames the source differently. None should become the source itself.


## 20. Workflow

A source-first derivation workflow may follow these steps.

### Step 1 — Select Source

Choose a source file or corpus state.

```text
cogentia/research/personas.md
```

### Step 2 — Select Form

Choose a derived form.

```text
public essay
academic paper
technical brief
social post
continuation prompt
```

### Step 3 — Select Persona

Choose the mode of appearance.

```text
scholarly
public intellectual
political
technical
legal
agentic
```

### Step 4 — Select Audience

Define who is addressed.

```text
scholars
citizens
developers
elected officials
journalists
AI agents
partners
```

### Step 5 — Select Platform

Define the scene of publication.

```text
GitHub
Substack
Medium
LinkedIn
Facebook
X
conference proceedings
journal
```

### Step 6 — Apply Constraints

Length, style, references, formatting, metadata, disclaimers, calls to action.

### Step 7 — Generate Draft

Human, AI-assisted, or agent-assisted.

### Step 8 — Review

Check fidelity, persona fit, risks, provenance, and publication readiness.

### Step 9 — Publish

Publish or export to platform.

### Step 10 — Record

Update publication ledger.

### Step 11 — Return to Corpus

Integrate feedback, objections, corrections, or new insights into the source corpus.

---

## 21. Publication Ledger

A publication ledger records appearances of a source.

It may include:

| Field | Meaning |
|---|---|
| source_id | source corpus element |
| derived_id | derived product |
| platform | publication scene |
| url | public location |
| publication_date | date |
| persona | active persona |
| audience | intended audience |
| status | draft / published / archived / superseded |
| feedback | relevant reactions |
| return_to_corpus | whether feedback modified the source |

The ledger prevents dispersion.

It also enables later reconstruction of how a concept traveled across forms and platforms.

---

## 22. Risks

### 19.1 Form Capture

A form becomes dominant and reshapes the source.

Example: the academic article becomes treated as the source, while the corpus becomes invisible.

### 19.2 Platform Capture

A platform rewards a style that distorts the source.

Example: a Facebook post becomes more polarizing than the corpus it derives from.

### 19.3 Persona Capture

The persona used for one scene begins to dominate all scenes.

Example: a campaign persona contaminates academic writing.

### 19.4 Metadata Loss

The derived product circulates without source reference.

Example: screenshots, reposts, summaries, copied text.

### 19.5 Manual Drift

Multiple platform versions are edited manually and become inconsistent.

### 19.6 Agentic Drift

A publication agent optimizes for reach, engagement, or convenience rather than fidelity.

---

## 23. Governance Rules

A derived product system should follow these rules.

### 20.1 Source Primacy Rule

The source corpus carries the substance.

### 20.2 Form Plurality Rule

No single form, including the academic paper, is sovereign over all others.

### 20.3 Platform Separation Rule

A platform is a scene of appearance, not a conceptual form.

### 20.4 Persona Explicitness Rule

Every consequential derived product should specify its persona.

### 20.5 Provenance Rule

Derived products should maintain a reconstructible link to their source.

### 20.6 Review Rule

Consequential derived products require human review.

### 20.7 Anti-Capture Rule

No audience, platform, persona, or form should be allowed to rewrite the source merely because it performs better.

### 20.8 Return Rule

Publication feedback should be able to return to the corpus.

---

## 24. Open Questions

1. **Granularity**  
   What is the correct source unit: file, section, commit, branch, corpus snapshot, or concept graph?

2. **Automation**  
   Which steps can be safely automated, and which require human review?

3. **Versioning**  
   Should derived products be versioned independently from the source?

4. **Cross-platform identity**  
   How should one track the same derived product across Substack, Medium, LinkedIn, Facebook, X, or other platforms?

5. **Citation**  
   How should derived products cite source corpus files in a way that remains readable for non-technical audiences?

6. **Legal status**  
   How should licenses, copyright, and republication rights be handled across platforms?

7. **Agent authority**  
   What exactly may Ubikia publish automatically, and what must remain under explicit human approval?

8. **Feedback integration**  
   How should comments, criticism, peer review, and public reactions return to the source corpus?

9. **Posthumous corpora**  
   Who may derive products from the corpus of a deceased person?

10. **Collective corpora**  
   How should derived products be governed when the source belongs to a collective, association, or open-source project?

---

## 25. Continuation

This working paper should be continued in five directions.

### 22.1 Specification

Define schemas for:

- `source.yaml`;
- `persona.yaml`;
- `derived_product.yaml`;
- `publication.yaml`;
- `publication_ledger.yaml`;
- `review.yaml`.

### 22.2 Prototype

Build a minimal CLI:

```bash
ubikia derive research/personas.md --form public_essay --platform substack
ubikia derive research/personas.md --form academic_paper --platform journal
ubikia derive research/personas.md --form facebook_post --platform facebook
```

### 22.3 Repository Integration

Define a standard directory structure:

```text
research/
sources/
derived/
public/
social/
publication/
templates/
```

### 22.4 Ubikia Publisher Agent

Design Ubikia Publisher as a publication agent able to prepare, track, and later publish derived products under human supervision.

### 22.5 Case Studies

Apply the framework to actual derivation chains:

- a research paper and public essay from the same source;
- a Substack article and Medium article from the same blog essay;
- a Facebook post announcing a public essay;
- an academic conference abstract derived from a working paper;
- a continuation prompt derived from an ongoing conversation.

---


## 26. Relation to the Second Method

This note belongs to Cogentia as an operational method for corpus-based
production and transformation.

It should not be confused with the Second Method itself.

The Second Method remains more general. It requires that knowledge production
make its premises, objections, limits, and continuations explicit enough to be
criticized, resumed, and improved.

Cogentia is one possible operational implementation of that requirement.

Other methods may satisfy the same general constraints differently.

This distinction matters because a general epistemic method should not be
reduced to one specific machinery for producing, tracking, and deriving texts.


## 27. Conclusion

A corpus is not a publication.

A publication is an appearance of a corpus.

This distinction changes the hierarchy of intellectual production.

The academic paper is not the sovereign source. It is the scholarly persona of a source. A blog essay is not a degraded academic article. It is a public form of appearance. A social post is not necessarily a fragment. It can be a precise, traceable, situated derived product. A continuation prompt is not merely a prompt. It is a transferable state of work.

The source carries the substance.

Derived products organize the form.

Platforms provide scenes of appearance.

Personas govern the mode of address.

Publication agents manage distribution and traceability.

The task is therefore not to multiply content.

It is to make a corpus appear without losing itself.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [cogentia.js — Tutorial and Near-Specification](cogentia_js_tutorial.md)
- [Cogentigraphic Distillation](cogentigraphic_distillation.md)
- [Concept Index — cogentia](concepts.md)
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)
- [Pipeline](pipeline.md)

<!-- END_AUTO: backlinks -->
