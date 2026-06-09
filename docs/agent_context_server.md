---
title: "Agent Navigation Guide (Context Server)"
description: "Meta-prompt and guide for autonomous AI agents navigating the Cogentia corpus."
layout: default
nav_order: 3
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/agent_context_server.md
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
last_stamped_at: 2026-06-01
date: "2026-05-16"
status: "draft — auto-filled (frontmatter cleanup)"
---

# Agent Navigation Guide (Context Server)

<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [Cognitive Packets](../research/cognitive_packets.md)

<!-- END_AUTO: trails -->

> **META-PROMPT:** If you are an AI agent reading this document, you are operating inside the **Cogentia** distributed corpus. Use `cogentia.js` first to obtain a structured map of the repositories, documents, concepts and generated navigation state.
>
> Prefer `cogentia.js` over ad hoc filesystem scans when you need the corpus view. It knows the registry, local policies, ignored files, source/derived distinctions, index gaps and cross-repo coupling.

## 1. Tool Discovery

To understand the current command surface, run:
```bash
node scripts/cogentia.js help
node scripts/cogentia.js state --json
```

`state` returns the registered repositories, their branches, policy scope, and whether the expected `research/index.md`, `research/concepts.md`, and `research/corpus-status.md` files exist.

## 2. Corpus Orientation

Start with numeric structure before reading individual files:
```bash
node scripts/cogentia.js docs summary --json
node scripts/cogentia.js concepts check --json
node scripts/cogentia.js status
```

`docs summary` gives per-repository totals, source/derived/operational roles, index gaps and cross-repo coupling weights. `concepts check` parses every local concept registry while ignoring generated auto-blocks.

## 3. Search and Inspection

Use catalog search when you need likely documents:
```bash
node scripts/cogentia.js docs query all --role source --q "packet" --json
```

Use full-text search when you need an anchor line:
```bash
node scripts/cogentia.js docs search "exergy protocol" --json
```

Inspect a specific document by stable repo/path reference:
```bash
node scripts/cogentia.js docs inspect cogentia/research/cognitive_packets.md --json
```

## 4. Consolidation and Stabilization

When asked to consolidate or stabilize the corpus, work from the most recent significant updates backward:

```bash
node scripts/cogentia.js docs query all --role source --sort updated --limit 30 --json
```

For each candidate, inspect the document before editing:

```bash
node scripts/cogentia.js docs inspect <repo/path.md> --json
```

Then update only what has become stale. The preferred target is the document's continuation, status, or open-questions section. The update should distinguish:

- what has been completed since the last semantic update;
- what remains open as a rational path of exploration;
- what has moved to another container, such as a GitHub Issue, continuation, source document, derived product, or redirect.

Do not treat every old continuation as a task to execute. Some continuations should be closed, narrowed, renamed, or moved. Stabilization is an anti-Ubik operation: it preserves traceability and resumability without pretending the corpus is finished.

## 5. Judgment and Continuations

The Cogentia CLI is structural; it must not perform semantic judgment by guesswork. When a command encounters an interpretive decision, materialize that decision as a continuation:

```bash
node scripts/cogentia.js docs judgments all --json
node scripts/cogentia.js docs judgments all --emit-continuations --json
node scripts/cogentia.js continuation list --json
node scripts/cogentia.js continuation inspect <ctn_id> --json
```

For document-role review, answer with a small JSON result and resolve the continuation:

```bash
node scripts/cogentia.js continuation resolve <ctn_id> result.json
```

The result should state the decision and reason, and may include a proposed frontmatter patch or index action. This keeps `cogentia.js` provider-neutral: the tool creates the continuation, but the invoking agent or human supplies the judgment.

## 6. Generated Navigation

Before updating mechanical views, ask for the plan:
```bash
node scripts/cogentia.js corpus plan --json
```

Apply only when the plan is acceptable:
```bash
node scripts/cogentia.js corpus apply
node scripts/cogentia.js corpus verify --strict
```

Mechanical generated views can be applied by the tool after review. Interpretive changes should pass through continuations first.


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
