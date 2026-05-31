---
title: "Ideas to Explore as GitHub Issues"
subtitle: "A lightweight memory category for open-ended explorations"
author: "Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
status: "working-note"
version: "0.2"
license: "CC BY-SA 4.0"
canonical_repo: "JeanHuguesRobert/cogentia"
canonical_path: "research/ideas_to_explore_as_issues.md"
---

# Ideas to Explore as GitHub Issues

## 1. Purpose

This note defines a lightweight category for capturing **ideas to explore** as GitHub Issues.

The purpose is simple: some ideas pass through the mind during a conversation, an observation, a walk, a technical test, or a public controversy. They are not yet doctrines, projects, papers or prototypes. But some of them are fertile enough that losing them would be wasteful.

An **Idea to Explore** is a small memory device for such cases.

The goal is not to transform every intuition into a project, nor every project into a roadmap. The goal is to avoid losing fertile possibilities while preserving a clear distinction between:

- an idea;
- an hypothesis;
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

## 3. Checkpoint discipline

GitHub commits are durable public traces. They should not become noise.

The system must therefore respect a **point d'étape** discipline:

> commit when a step has been stabilized enough to be useful later; do not commit every transient variation of thought.

For practical purposes:

- use conversation, comments, local notes, or draft text for raw exploration;
- create or update a GitHub Issue when an idea becomes worth remembering;
- commit a doctrinal or technical document only at a meaningful checkpoint;
- avoid producing many small repository commits for every minor refinement;
- prefer issue comments for incremental continuation when the doctrine itself has not changed;
- consolidate several related adjustments into a single commit when possible.

This preserves the repository as a transmissible corpus rather than a stream of noise.

## 4. Minimal issue format

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

## 5. Recommended labels

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

## 6. Relationship with the corpus

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
point d'étape
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

## 7. Status taxonomy

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

## 8. Continuation levels

| Level | Meaning |
|---|---|
| `low` | interesting but peripheral |
| `medium` | useful continuation, no urgency |
| `high` | strong connection to current corpus direction |
| `critical` | should become part of active doctrine or architecture |

## 9. Commit discipline

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

> Issues capture motion. Commits stabilize steps.

## 10. Example: circular command center

A typical issue in this category could capture the following idea:

> Reuse a Wacom Intuos tablet as a physical command surface, with stickers and a captive stylus, and combine it with a recycled digital photo frame driven by a dongle that dynamically generates MP4 files. Together, they form an open-source, low-cost, degraded-mode command center for a FractaVolta / Fractanet node.

This belongs to the `idea-to-explore` category because it connects:

- FractaVolta: energy, nodes, circular command infrastructure;
- Inox: future runtime for small autonomous Fractanet nodes;
- Cogentia: continuation packets, traceability of acts, local decision rules;
- Home Assistant / MQTT: pragmatic integration layer;
- circular economy: second life for screens and interfaces.

## 11. Anti-capture principle

The issue mechanism must not become a closed managerial backlog that captures the thought process.

An Idea to Explore remains:

- forkable;
- revisable;
- rejectable;
- transformable into another artefact;
- explicitly non-prescriptive.

It is a trace of a possible, not a command.

## 12. Short public formulation

> An “Idea to Explore” is a GitHub Issue used as a memory packet for a possible continuation: structured enough not to be lost, open enough not to become a premature commitment.

## 13. Short operational formulation

> Issues capture passing ideas. Commits mark points d'étape.
