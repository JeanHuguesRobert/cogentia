---
title: The Knowledge Mesh (Decentralized Wiki)
description: How humans and agents curate, cross-reference, and navigate the Cogentia corpus.
layout: default
nav_order: 4
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/knowledge_mesh.md
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
last_stamped_at: 2026-06-01T00:00:00.000Z
date: '2026-05-16'
status: draft — auto-filled (frontmatter cleanup)
document_role: source
document_kind: guide
visibility: public
lifecycle_state: working
classification_source: cogentia.js
classification_version: '1'
classification_rule: guide
classification_confidence: medium
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# The Knowledge Mesh (Decentralized Wiki)

Cogentia is designed to operate as a seamless, decentralized "Wikipedia" across multiple repositories (`cogentia`, `FractaVolta`, `marenostrum`, etc.).

To maintain semantic coherence without relying on external databases, `cogentia.js` v2 builds a structural map directly from the Markdown files and can refresh generated navigation views.

## 1. The Concept Registry

Every repository contains a [`research/concepts.md`](../research/concepts.md) file. This is the local glossary.
When you write a new theoretical memo, you should formally register its key concepts in this file.

The `concepts check` command parses all these local registries, ignoring generated auto-blocks, and reports missing fields, duplicate names and undefined references:

```bash
node scripts/cogentia.js concepts check --json
```

The generated concept summary and graph are refreshed through the corpus plan/apply cycle:

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
```

## 2. Automatic Backlinks (Cross-References)

In a true Wiki, if Document A links to Document B, Document B should proudly display "I am referenced by Document A."

Cogentia automates this. By running:
```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
```

The CLI scans Markdown links across all registered repositories. It refreshes existing managed backlink blocks by default. Use `--create-backlinks` when you explicitly want missing backlink blocks created.

## 3. Curated Pathways (Trails)

The raw concept graph can be overwhelming. To guide humans (or agents) through complex subjects step-by-step, you can create "Trails".

Create a markdown file in `research/trails/`, for example `ai_governance.md`:
```markdown
# Trail: AI Governance
1. [Democratic AI Safety](../../cogentia/research/democratic_ai_safety.md)
2. [Sovereign Digital Twin](../../cogentia/research/cogentia-digital-twin.md)
```

In v2, trails remain plain Markdown documents and are visible through `docs query --role trail` / `docs search`. Their navigation banners are refreshed through the normal corpus cycle:

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
```

This keeps trail handling inside the same smaller `plan/apply/verify` model as backlinks and corpus status, instead of reviving a separate legacy command surface.

## 4. Web Rendering (Jekyll)

Because all references are standard relative Markdown links and metadata is managed as Jekyll Front-Matter, the entire corpus can be rendered instantly into a website.

The v2 CLI does not generate Jekyll configuration. The repositories keep their normal GitHub Pages / Jekyll files under version control; `cogentia.js` focuses on corpus structure and generated navigation blocks.
