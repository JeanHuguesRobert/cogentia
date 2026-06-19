---
title: "Ideas to Explore as GitHub Issues"
subtitle: "A lightweight memory category for open-ended explorations"
author: "Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
status: "working-note"
version: "0.4"
license: "CC BY-SA 4.0"
canonical_repo: "JeanHuguesRobert/cogentia"
canonical_path: "research/ideas_to_explore_as_issues.md"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/ideas_to_explore_as_issues.md
last_stamped_at: 2026-06-01
document_role: "source"
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "working-note"
classification_confidence: "medium"
---

# Ideas to Explore as GitHub Issues

## 1. Purpose

This note defines a lightweight category for capturing **ideas to explore** as GitHub Issues.

The purpose is simple: some ideas pass through the mind during a conversation, an observation, a walk, a technical test, or a public controversy. They are not yet doctrines, projects, papers or prototypes. But some of them are fertile enough that losing them would be wasteful.

An **Idea to Explore** is a small memory device for such cases.

The goal is not to transform every intuition into a project, nor every project into a roadmap. The goal is to avoid losing fertile possibilities while preserving a clear distinction between:

- an idea;
- a hypothesis;
- a prototype;
- a decision;
- a committed implementation.

An **Idea to Explore** is therefore a documented possible continuation, not a promise of execution.

## 2. Doctrine

An idea should be captured as an issue when it satisfies at least one of the following conditions:

1. it may become technically, doctrinally, politically, or institutionally important;
2. it connects several parts of the corpus;
3. it is too early to implement, but too fertile to forget;
4. it can later become a working note, prototype, research document, public article, or software module;
5. it clarifies a possible path toward autonomy of capacity, traceability of acts, open-source infrastructure, or circular economy.

The issue is not a backlog item in the narrow software sense. It is a **memory packet for continuation**.

The act of opening an issue is therefore closer to taking a note than to starting a project. It captures a possible. It does not decide its future.

## 3. Occam discipline — the smallest sufficient container

The corpus must avoid uncontrolled documentary proliferation.

The working rule is:

> Choose the smallest sufficient container.

In practical terms:

```text
conversation
  before local note;
local note
  before GitHub issue;
GitHub issue
  before source document;
issue comment
  before new issue;
source document update
  before new document;
commit
  only after checkpoint.
```

This is the corpus-level application of Occam's razor:

> Do not create a new documentary entity if an existing one is sufficient.

Operational consequences:

- do not create an issue if the conversation is still sufficient;
- do not create a new issue if an existing issue can receive a comment;
- do not create a document if an issue still holds the idea adequately;
- do not create a new concept if an existing concept already covers the case;
- do not create a commit if no checkpoint has been crossed;
- do not create a doctrine if a working rule is still enough.

This discipline protects the corpus from becoming a stream of well-intentioned noise.

## 4. Checkpoint discipline

GitHub commits are durable public traces. They should not become noise.

The system must therefore respect a **checkpoint** discipline.

A checkpoint is not only a point d'étape. It is a cognitive routing node where an idea is checked before being routed further.

A checkpoint may decide that an idea should be:

```text
kept in conversation;
captured as an issue;
continued as an issue comment;
postponed;
rejected;
routed to research;
routed to prototype;
routed to a source document;
routed to a derived product;
stabilized by commit.
```

In short:

> A checkpoint verifies whether moving thought is ready to change container.

For practical purposes:

- use conversation, comments, local notes, or draft text for raw exploration;
- create or update a GitHub Issue when an idea becomes worth remembering;
- commit a doctrinal or technical document only at a meaningful checkpoint;
- avoid producing many small repository commits for every minor refinement;
- prefer issue comments for incremental continuation when the doctrine itself has not changed;
- consolidate several related adjustments into a single commit when possible.

This preserves the repository as a transmissible corpus rather than a stream of noise.

## 5. Occam + checkpoint rule

Occam and checkpoint discipline are complementary.

```text
Occam chooses the smallest sufficient container.
Checkpoint verifies whether a change of container is justified.
```

Operational formula:

```text
Ideas move.
Issues capture memory in tension.
Checkpoints verify routing.
Commits record stabilized memory.
Source documents anchor the corpus.
```

A stricter form:

```text
Everything that passes through the mind does not deserve GitHub.
Everything that deserves GitHub does not deserve a commit.
Everything that deserves a commit does not deserve doctrine.
```

## 6. Minimal issue format

Each issue in this category should use a normalized title:

```text
[Idea to explore] Short explicit title
```

The body should contain at least:

```markdown
---
category: idea-to-explore
status: open-question
corpus_area: <cogentia | fractavolta | inox | marenostrum | barons-mariani | inseme | cross-corpus>
source: <conversation | note | observation | external source | prototype>
continuation_level: <low | medium | high>
checkpoint_policy: issue-first
---

## Idea

## Why it matters

## Connections to the corpus

## First questions

## Possible next artefacts

## Risks / objections

## Continuation clause
```

This front matter makes the issue searchable even without GitHub labels.

## 7. Recommended labels

When GitHub labels are available, the preferred label is:

```text
idea-to-explore
```

Optional secondary labels:

```text
continuation
cross-corpus
prototype
research
frugality
open-source
mode-degrade
traceability
```

If labels do not yet exist in the repository, the title prefix and front matter remain sufficient.

## 8. Relationship with the corpus

The issue is not the source of doctrine. It is an entry point.

The normal life cycle is:

```text
conversation / observation
        ↓
raw capture / local note / comment
        ↓
GitHub Issue: Idea to explore
        ↓
issue comments and small continuations
        ↓
checkpoint
        ↓
working note in /research or /docs
        ↓
prototype / example / script
        ↓
public article or operational deployment
        ↓
return to corpus with corrections
```

The issue keeps the continuation open. The corpus stabilizes what has become clear enough to transmit.

## 9. Registers of openings

A long conversation may produce several unfinished but fertile continuations. Creating one issue per opening too early can fragment the corpus. Creating no trace at all risks losing the continuations.

In such cases, the preferred container is an **opening register**: a single GitHub Issue that gathers the open continuations produced by one conversation, investigation, document review, or conceptual checkpoint.

An opening register is not a roadmap. It is a routing table for possible continuations.

It should be used when:

- several ideas emerge from the same conversation or checkpoint;
- the ideas are connected but not yet mature enough for separate issues;
- the main risk is losing the openings rather than failing to execute them;
- the next step is routing, not implementation.

Minimal format:

```markdown
---
category: opening-register
status: open
corpus_area: cross-corpus
source: conversation
continuation_level: high
checkpoint_policy: register-first
---

## Context

## Open continuations

| # | Opening | Status | Target repo | Possible artefact | Next checkpoint |
|---|---|---|---|---|---|

## Routing notes

## What should decay

## What should be renewed

## What may deserve a dedicated issue

## Continuation clause
```

The register may later split into separate issues if one opening becomes autonomous.

Operational rule:

```text
long conversation
  -> one opening register
  -> comments for continuations
  -> dedicated issues only when branches become autonomous
  -> source documents only after checkpoint
```

This prevents two opposite failures:

```text
no register
  -> loss of fertile openings

too many issues
  -> fragmentation and documentary noise
```

Formula:

> An opening is not yet a task. It is an orienting trace with controlled half-life.

## 10. Status taxonomy

Suggested values for `status:`:

| Status | Meaning |
|---|---|
| `raw` | captured quickly, not yet structured |
| `open-question` | idea is intelligible but unresolved |
| `to-prototype` | worth testing materially |
| `to-research` | requires documentation, sources, or comparison |
| `to-integrate` | mature enough to enter corpus architecture |
| `not-now` | preserved but deliberately postponed |
| `closed` | resolved, superseded, or rejected |

## 11. Continuation levels

| Level | Meaning |
|---|---|
| `low` | interesting but peripheral |
| `medium` | useful continuation, no urgency |
| `high` | strong connection to current corpus direction |
| `critical` | should become part of active doctrine or architecture |

## 12. Commit discipline

A commit should normally correspond to one of these cases:

1. creation of a stable doctrine note;
2. correction of a factual or architectural error;
3. integration of several issue-level continuations into a clearer document;
4. creation of a prototype or example that can be tested;
5. update of an index, README, or map when it improves navigation.

A commit should normally be avoided when:

1. the thought is still in free exploration;
2. the change is merely stylistic and not yet part of a larger checkpoint;
3. the same issue can receive a comment instead;
4. the repository would become harder to read because of excessive micro-commits.

In short:

> Issues capture motion. Checkpoints verify routing. Commits stabilize steps.

## 13. Checkpoint and judgment

Some checkpoints are purely mechanical: link checks, schema validation, formatting, index regeneration.

Other checkpoints require judgment: prioritization, rejection, doctrinal stabilization, public positioning, ethical risk, political implication, institutional commitment.

When a checkpoint requires final judgment that engages responsibility, the judgment must be imputable to a living physical human person.

Working distinction:

| Checkpoint type | Examples | Human judgment required? |
|---|---|---|
| Mechanical | links, frontmatter, schema, formatting | generally no |
| Epistemic | evidence quality, objection handling, claim level | often yes |
| Doctrinal | corpus stabilization, public position | yes |
| Ethical / political | publication, institutional stance, governance | yes |
| Operational critical | expenditure, safety, material action | yes |

Rule:

```text
No anonymous stabilization.
No non-human final judgment where human responsibility is required.
```

## 14. Example: circular command center

A typical issue in this category could capture the following idea:

> Reuse a Wacom Intuos tablet as a physical command surface, with stickers and a captive stylus, and combine it with a recycled digital photo frame driven by a dongle that dynamically generates MP4 files. Together, they form an open-source, low-cost, degraded-mode command center for a FractaVolta / Fractanet node.

This belongs to the `idea-to-explore` category because it connects:

- FractaVolta: energy, nodes, circular command infrastructure;
- Inox: future runtime for small autonomous Fractanet nodes;
- Cogentia: continuation packets, traceability of acts, local decision rules;
- Home Assistant / MQTT: pragmatic integration layer;
- circular economy: second life for screens and interfaces.

## 15. Anti-capture principle

The issue mechanism must not become a closed managerial backlog that captures the thought process.

An Idea to Explore remains:

- forkable;
- revisable;
- rejectable;
- transformable into another artefact;
- explicitly non-prescriptive.

It is a trace of a possible, not a command.

Occam discipline is part of anti-capture: a corpus can be captured not only by secrecy or central authority, but also by excess structure, excessive traces, and premature stabilization.

## 16. Short public formulation

> An “Idea to Explore” is a GitHub Issue used as a memory packet for a possible continuation: structured enough not to be lost, open enough not to become a premature commitment.

## 17. Short operational formulations

```text
Issues capture passing ideas.
Checkpoints verify routing.
Commits mark stabilized steps.
```

```text
Occam chooses the smallest sufficient container.
Checkpoint verifies whether the idea is ready to move.
```

```text
Conversation for motion.
Issue for memory in tension.
Checkpoint for routing.
Commit for stabilized memory.
Source document for corpus anchoring.
```

## 18. Consolidation note, 2026-06-09

This note remains doctrinally current. It should not be read as a requirement to convert every opening into a GitHub Issue. The current `scripts/cogentia.js` v2 CLI exposes generic continuations, document queries, generated-view verification, and git drift checks; it does not currently expose a full `issues` command group. GitHub Issues remain a valid container for memory in tension when they are the smallest sufficient public container.

Open continuations:

1. Decide whether issue adapters return as CLI commands, move to the future Web workspace, or stay as GitHub-native work handled by agents.
2. Keep opening registers available for long conversations so the corpus does not fragment into premature micro-issues.
3. Periodically close, merge, or downgrade issues whose possible has decayed.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [AGENTS.md — Cogentia methodology shortcut](../AGENTS.md)
- [Research Index — Cogentia](index.md)
- [Simplicité d'action](simplicite_action.md)
- [The Cogentia Commons Living Corpus](cogentia_commons_living_corpus.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
<!-- END_AUTO: backlinks -->
