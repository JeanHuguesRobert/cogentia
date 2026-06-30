---
title: "Trustable Digital Twin Agile Roadmap"
description: "Living roadmap for raising a trustable owner-facing digital twin through reversible, traceable capability increments."
layout: default
nav_order: 7
date: 2026-06-30
last_modified_at: 2026-06-30
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/digital-twin-agile-roadmap.md
document_role: "operational"
document_kind: "roadmap"
visibility: "public"
lifecycle_state: "active"
---

# Trustable Digital Twin Agile Roadmap

This is a living roadmap, not a waterfall specification.

The goal is to raise a **trustable digital twin of the owner**. The current
dogfood instance is Jean Hugues Robert's twin, raised on Jean Hugues Robert's
corpus. The intended product is generic: another owner should be able to raise
their own twin from their own corpus, boundaries, feedback, and mandates.

The twin should become progressively more capable as the owner's corpus becomes
richer, better curated, better indexed, and better governed.

This roadmap applies the second-method distinction:

```text
When the error is irreversible, filter before action.
When the trial is reversible, learn by traceable action.
```

Therefore the plan advances by small reversible slices, acceptance checks,
owner feedback, and correction. The roadmap itself is expected to change.

## Governing Documents

- Trust model: `research/digital_twin_trust_model.md`
- Optimistic governance: `research/optimistic_mainline_governance.md`
- Agent-resumable CLI: `research/agent_resumable_cli.md`
- MCP connection tutorial: `docs/connect-mcp-clients.md`
- Semantic/index roadmap: `operium/docs/cogentia-agent-indexing-roadmap.md`
- Agile doctrine: `barons-Mariani/research/agile.md`

## Working Model

```text
owner
  teaches, corrects, mandates, approves

owner corpus
  educates the twin

cogentia.js command registry
  shared substrate for CLI and MCP

local owner node
  freshest and potentially private view

stable public node
  Fracta in the dogfood instance; another VPS/service in the generic case

ChatGPT/Codex/other clients
  faces that invoke capabilities through MCP or CLI
```

The public relay face must remain governed and read-only by default. In the
dogfood instance, that public relay is Fracta. The owner-facing local twin may
become much more capable, but only through maturity profiles, explicit scopes,
trace, and reversible action.

In the generic product, "Fracta" becomes a deployable node role, not a hard
dependency. The same roadmap should work for another owner using another
public relay or using only a local node.

## Maturity Path

### 0. Conception: Doctrine and Boundary

Purpose: define what a trustable owner-facing digital twin is allowed to become.

Acceptance checks:

- the trust model exists and names the goal explicitly;
- sharp tools and maturity profiles are documented;
- public/private/operator profiles are distinguished;
- MCP/CLI work references the trust model.

Current status: started.

### 1. Infant: Read, Retrieve, Cite

Purpose: the twin can answer from the corpus without pretending to know more
than its sources.

Capabilities:

- public search;
- context packs;
- line retrieval;
- health/status;
- citation discipline;
- uncertainty reporting.

Acceptance checks:

- local MCP stdio works;
- HTTP MCP `POST /mcp` works locally;
- Fracta exposes HTTPS `/mcp`;
- ChatGPT can call `cogentia_search`;
- ChatGPT can call `cogentia_get_lines` for a cited result;
- public view cannot widen into private or admin view;
- semantic search uses stored embeddings and continuation-produced query
  embeddings when needed.

Next useful slice:

```text
Deploy repo-owned scripts/cogentia-mcp-http.js on Fracta.
Enable HTTPS for cogentia.fractavolta.com.
Run ChatGPT connector smoke tests.
```

### 2. Child: Explain, Compare, Ask

Purpose: the twin can reason over retrieved material while remaining grounded.

Capabilities:

- compare sources;
- summarize with source IDs;
- ask clarifying questions;
- identify missing corpus material;
- propose corpus improvements;
- capture owner corrections as feedback events.

Acceptance checks:

- context-pack answers cite all source IDs used;
- the twin can say "not enough corpus evidence";
- corrections are logged as teachable events;
- repeated retrieval tests improve or at least remain stable;
- no mutation occurs without owner approval.

Next useful slices:

- add a lightweight owner feedback log;
- add retrieval evaluation prompts for recurring questions;
- add a `trust report` format to context-pack answers.

### 3. Teenager: Dry-Run Operator

Purpose: the twin can prepare action but not apply it alone.

Capabilities:

- inspect git status;
- inspect index/cache status;
- estimate embedding work and cost;
- dry-run repo sync;
- dry-run cache import;
- prepare issues;
- prepare patches;
- prepare commit messages;
- identify precondition conflicts.

Acceptance checks:

- command metadata declares risk class and profile;
- MCP tools are generated from the same registry as CLI commands;
- dry-runs include expected HEAD, dirty state, cost, privacy exposure,
  reversibility, and approval requirement;
- no raw arbitrary CLI command string is exposed remotely.

Next useful slices:

- define a first command registry for read-only and dry-run commands;
- expose `trusted-read` and `operator-dry-run` MCP profiles locally;
- add precondition checks for repo/cache actions.

### 4. Young Adult: Approved Apply

Purpose: the twin can perform low-risk reversible changes under explicit owner
mandate.

Capabilities:

- apply cache imports;
- replay continuation artifacts;
- create GitHub issues;
- update documentation;
- create small commits;
- push only when scoped authorization exists;
- emit completion reports.

Acceptance checks:

- every apply action has an owner mandate or standing policy;
- every apply action produces a trust report;
- actions are reversible by commit/revert/cache rebuild when possible;
- provider-cost actions remain continuation/COP-mediated;
- private data exposure is declared before action.

Next useful slices:

- implement approval tokens or explicit per-action confirmation packets;
- add trust reports to apply commands;
- add a local-only operator MCP profile for approved actions.

### 5. Relay: Local Owner Node Through Public Node

Purpose: ChatGPT and other remote clients can benefit from the fresher local
owner node without turning the public relay into an uncontrolled tunnel.

Capabilities:

- local daemon opens outbound authenticated relay to the public node;
- local daemon advertises capabilities, maturity, branch, dirty state,
  index hash, and view;
- public node routes allowed requests to the local node when online;
- public node falls back to stable public cache when local node is offline.

Acceptance checks:

- local client handles reconnect with exponential backoff and jitter;
- public node expires stale local leases;
- relay never upgrades a public request into full local authority;
- relay status is visible: connected, stale, offline, last_seen, capabilities;
- requests and results are traceable.

Next useful slices:

- write the relay protocol sketch;
- implement heartbeat and registration only;
- add read-only delegated search as the first relay action.

### 6. Adult Domains: Bounded Autonomy

Purpose: the twin can act autonomously inside narrow, explicitly delegated
domains where it has proven maturity.

Capabilities:

- routine cache maintenance;
- routine corpus navigation updates;
- scheduled health reports;
- bounded provider-cost work under quota policy;
- safe publication within delegated rules.

Acceptance checks:

- autonomy is domain-specific, not global;
- standing policies are visible and revocable;
- audit logs are complete;
- owner override is immediate;
- mistake recovery is tested.

No adult capability should be granted merely because the transport works.

## Iteration Backlog

### A. Fracta ChatGPT Compatibility

Goal: make the public connector endpoint actually usable by ChatGPT for the
dogfood instance, then generalize the deployment recipe for other owners.

Acceptance checks:

```bash
curl -fsS https://cogentia.fractavolta.com/health
curl -fsS https://cogentia.fractavolta.com/mcp
```

And through ChatGPT:

```text
Use the Cogentia connector to search the corpus for
"Fracta VPS Caddy Cogentia MCP". Give me the top 3 cited results and fetch the
exact lines for the best result.
```

### B. Command Registry

Goal: avoid duplicated CLI/MCP documentation by making commands declare their
metadata once.

First commands:

- `context health`
- `context search`
- `context pack`
- `context lines`
- `index status`
- `embeddings status`
- `continuation status`
- `git status`

Acceptance checks:

- CLI and MCP share name, description, schema, profile and risk class;
- public MCP exposes only public commands;
- local operator MCP can expose dry-run commands.

### C. Trust Reports

Goal: every significant answer/action can explain why it was allowed.

Acceptance checks:

- report includes capability, maturity profile, owner mandate, inputs, sources,
  private data touched, cost, validation, risk, reversibility and next step;
- public read-only reports are concise;
- operator reports are detailed enough for audit.

### D. Owner Feedback Loop

Goal: let the owner teach the twin explicitly.

Acceptance checks:

- corrections can be captured as structured feedback;
- feedback is citable and reviewable;
- feedback does not overwrite source documents silently;
- maturity estimates can reference feedback history.

### E. Reverse Relay

Goal: connect the local owner node to the public relay without a manual tunnel.

Acceptance checks:

- local node can register and heartbeat;
- public node can show relay status;
- first delegated request is read-only;
- offline fallback is tested.

### F. Maturity Estimate

Goal: make the twin's "age" explainable and useful.

Acceptance checks:

- maturity is per domain;
- maturity signal explains evidence and limits;
- maturity never grants authority by itself;
- owner can downgrade or freeze a domain.

## Change Rule

This roadmap should be changed when an iteration teaches something material.

Use the smallest sufficient change:

- edit this roadmap for operational plan changes;
- create an issue for uncertain future work;
- create a source document when a doctrine or concept stabilizes;
- commit only scoped, reversible, validated changes.

## Current Best Next Steps

1. Stabilize the trust model and this roadmap.
2. Finish Fracta HTTPS plus `/mcp` deployment for the dogfood instance.
3. Test ChatGPT against `cogentia_search` and `cogentia_get_lines`.
4. Create the first command registry slice for read-only and dry-run commands.
5. Add trust reports before exposing any operator apply capability.

This order is intentionally modest. It lets the twin grow by proving itself
before it receives sharper tools.

The dogfood instance is allowed to be specific. The architecture it proves must
remain portable to other owners.
