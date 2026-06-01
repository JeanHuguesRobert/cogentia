---
title: "The Knowledge Mesh (Decentralized Wiki)"
description: "How humans and agents curate, cross-reference, and navigate the Cogentia corpus."
layout: default
nav_order: 4
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/knowledge_mesh.md
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
last_stamped_at: 2026-06-01
date: "2026-05-16"
status: "draft — auto-filled (frontmatter cleanup)"
---

# The Knowledge Mesh (Decentralized Wiki)

Cogentia is designed to operate as a seamless, decentralized "Wikipedia" across multiple repositories (`cogentia`, `FractaVolta`, `marenostrum`, etc.). 

To maintain semantic coherence without relying on external databases, `cogentia.js` automatically weaves structural connections directly into the Markdown files.

## 1. The Concept Registry

Every repository contains a [`research/concepts.md`](../research/concepts.md) file. This is the local glossary.
When you write a new theoretical memo, you should formally register its key concepts in this file. 

The `cogentia.js concepts graph` command mathematically parses all these local registries to build a global **Mermaid Graph**, which is auto-injected into [`research/corpus-status.md`](../research/corpus-status.md).

## 2. Automatic Backlinks (Cross-References)

In a true Wiki, if Document A links to Document B, Document B should proudly display "I am referenced by Document A."

Cogentia automates this. By running:
\`\`\`bash
node scripts/cogentia.js backlinks
\`\`\`
The CLI scans all Markdown links across all registered repositories. It builds an inverted index and automatically injects a `<!-- BEGIN_AUTO: backlinks -->` list at the bottom of every referenced document.

## 3. Curated Pathways (Trails)

The raw concept graph can be overwhelming. To guide humans (or agents) through complex subjects step-by-step, you can create "Trails".

Create a markdown file in `research/trails/`, for example `ai_governance.md`:
\`\`\`markdown
# Trail: AI Governance
1. [Democratic AI Safety](../../cogentia/research/democratic_ai_safety.md)
2. [Sovereign Digital Twin](../../cogentia/research/cogentia-digital-twin.md)
\`\`\`

When you run:
\`\`\`bash
node scripts/cogentia.js trails
\`\`\`
The CLI will automatically inject `⬅️ Previous` and `➡️ Next` navigation headers into the actual target documents, allowing readers to seamlessly follow your curated logic.

## 4. Web Rendering (Jekyll)

Because all references are standard relative Markdown links and metadata is managed as Jekyll Front-Matter, the entire corpus can be rendered instantly into a website.

Run:
\`\`\`bash
node scripts/cogentia.js init-jekyll
\`\`\`
This command generates the necessary `_config.yml` files. Activating "GitHub Pages" on your repository will then transform your raw Markdown into a beautiful, searchable website using the `just-the-docs` theme.
