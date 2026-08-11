---
title: Agent Local Memory as a Capture Vector — a Stigmergic Correction
subtitle: Why assistant-native "persistent memory" features are in tension with the Anti-Capture Doctrine, and the concrete prevention rule
author: Jean Hugues Noël Robert, with Claude (Anthropic)
date: '2026-08-09'
document_role: source
document_kind: stigmergic-correction
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
related_research:
  - instructions/AGENTS.shared.md
  - AGENTS.md
  - research/agent_configuration_layer.md
  - research/mneme_memory_architecture.md
  - research/memory_and_corpus_sleep_cycle.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: '2026-08-09'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Agent Local Memory as a Capture Vector

## Erroneous form

A coding assistant (Claude Code, in this instance) accumulated durable, corpus-relevant
knowledge — working-method feedback, doctrine understanding, project state — inside its own
vendor-specific, machine-local, persistent memory feature (`~/.claude/projects/<workspace>/memory/`),
never promoted into the corpus. The store was durable by default (no expiry, "build up over
time"), readable only by that one tool, and invisible to any other provider or to a human
picking up the same work cold.

This happened even though the assistant's own local memory already contained a fair
paraphrase of `AGENTS.shared.md`'s Anti-Capture Doctrine and of the continuation protocol's
provider-neutrality test — the doctrine was known in the abstract but not applied reflexively
to the tool's own memory-writing behaviour.

## Canonical form

Anything a successor agent or human, on a different provider, would need in order to avoid
re-solving a settled problem or repeating a corrected mistake belongs in the corpus — a
git-tracked document, issue, or Cognitive Packet event — not in a private per-tool store. A
local memory feature may hold *working context*: task- or session-bound, expiring, not
consolidated without explicit promotion (see `research/mneme_memory_architecture.md` §
"Memory regimes"). It must not become the durable home for feedback, doctrine, or project
state.

Operational test, to run before writing to any local/private store:

```text
would a successor agent or human, on a different provider, need this
to avoid repeating a solved problem or re-litigating a settled decision?
  yes -> promote to the corpus; the local copy is a disposable pointer, not the source of truth
  no  -> local working context is fine, but let it expire
```

## Scope

Any AI coding assistant with a persistent local/project memory feature (Claude Code, Cursor,
GitHub Copilot workspace memory, and similar), working anywhere in this corpus — not only
inside a structural repository's own `AGENTS.md` scope. The failure mode reproduced here
started from a *workspace root* (`C:\tweesic`, a folder of ~25 independent projects) that has
its own tool-specific instruction file but, before this correction, did not route the agent
into the `AGENTS.md` → `instructions/AGENTS.shared.md` read order before it touched
corpus-relevant material.

## Reason

Two compounding causes:

1. **Doctrine compartmentalization.** The agent held the Anti-Capture Doctrine and the
   provider-neutrality test in its own memory, but scoped them to a specific artifact
   (`cogentia.js`'s continuation protocol) rather than generalizing them to its own
   memory-writing practice.
2. **Harness pull in the wrong direction.** The assistant's system prompt frames its local
   memory feature as generically good practice ("build up this memory system over time"),
   with no awareness of — or hook into — a host corpus's own anti-capture doctrine. A vendor
   feature and a corpus invariant were in direct tension, and nothing forced them to be
   reconciled before the first write.

## Prevention rule (defense in depth — no single layer is trusted alone)

1. `instructions/AGENTS.shared.md`'s Anti-Capture Doctrine now names AI-assistant local memory
   features explicitly as an example of a forbidden "proprietary agent memory silo," and states
   the provider-swap test inline (v5, 2026-08-09).
2. `AGENTS.md` files remain the required read-order entry point per repository; this note is
   cross-linked from the doctrine sources it corrects.
3. The workspace root `CLAUDE.md` (outside any single structural repository) now points agents
   at this doctrine before they persist anything about corpus work to a local store.
4. The assistant's own local memory now carries a process-only gate (not corpus content) that
   re-runs the provider-swap test before every local write — redundant with layers 1–3, in case
   the harness's framing overrides doctrine the agent has technically already read.
5. Existing local-memory content accumulated before this correction is being audited and
   promoted into this corpus where it survives the provider-swap test; superseded or
   session-ephemeral entries are being pruned rather than migrated.

## Date

2026-08-09.
