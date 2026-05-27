---
title: "Agent Navigation Guide (Context Server)"
description: "Meta-prompt and guide for autonomous AI agents navigating the Cogentia corpus."
layout: default
nav_order: 3
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/agent_context_server.md
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
last_stamped_at: 2026-05-26
---

# Agent Navigation Guide (Context Server)

<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [Cognitive Packets](../research/cognitive_packets.md)

<!-- END_AUTO: trails -->

> **META-PROMPT:** If you are an AI agent (e.g., Ophélia, OpenAI Assistant, local LLM) reading this document, you are currently operating within the **Cogentia** distributed corpus. Cogentia is a zero-dependency, structure-validating infrastructure designed specifically to facilitate your navigation.
> 
> **Do not use naive CLI tools like `grep` or `find` to explore this corpus.** Instead, use the specialized `cogentia.js` Context Server commands detailed below to instantly download structured sub-graphs of knowledge.

## 1. Tool Discovery (`manifest`)

To understand the full capabilities of the Cogentia CLI, run:
\`\`\`bash
node scripts/cogentia.js manifest --json
\`\`\`
This returns a JSON array of all available tools formatted as standard OpenAI function definitions (name, description, parameters, side_effects).

## 2. Ingesting Semantic Context (`bundle`)

As an AI, your primary constraint is context window efficiency and API call limits. Do not call `view_file` on 20 different documents to understand a concept.

Use the Context Bundler:
\`\`\`bash
node scripts/cogentia.js bundle --concept "Cogentia Commons" --json
\`\`\`
This command automatically traverses the Concept Graph. It locates the definition of "Cogentia Commons", finds all of its parent concepts, child concepts, and related documents, and concatenates their raw Markdown content into a single, highly structured JSON output.

You can also ingest an entire curated pathway (Trail) in order:
\`\`\`bash
node scripts/cogentia.js bundle --trail "AI Governance"
\`\`\`

## 3. Structural Searching (`query`)

Standard `grep` searches often crash on massive `node_modules` folders or return unstructured gibberish.

Use the Structural Query Engine:
\`\`\`bash
node scripts/cogentia.js query "exergy protocol" --json
\`\`\`
This command strictly searches only the valid Markdown files registered in the Cogentia corpus, respecting all `.cogentiaignore` rules. It returns a clean JSON array containing the `repo`, `file`, `line`, and a `snippet` of the surrounding text, allowing you to instantly locate semantic anchors.

## 4. The Golden Rule: Inversion of Control

The Cogentia CLI is purely structural; it does not "think." **You are the semantic engine.**

If you encounter a task requiring human judgment, or if a multi-step operation takes too long, you must emit a continuation. Do not try to fake a decision.

\`\`\`bash
node scripts/cogentia.js continuation emit --task "Explain what the KYS protocol implies for local governance"
\`\`\`
*(See [Agent-Resumable CLI](../research/agent_resumable_cli.md) for details on the Continuation Protocol).*


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Agent Navigation Guide (Context Server)](agent_context_server.md)
- [Agent-Resumable CLI](../research/agent_resumable_cli.md)
- [cogentia.js — Tutorial and Near-Specification](../research/cogentia_js_tutorial.md)
- [Cognitive Packets](../research/cognitive_packets.md)
- [Corpus Status — cogentia](../research/corpus-status.md)
- [Research Index — Cogentia](../research/index.md)
- [Trail: From Method to Machine](../research/trails/from_method_to_machine.md)

<!-- END_AUTO: backlinks -->
