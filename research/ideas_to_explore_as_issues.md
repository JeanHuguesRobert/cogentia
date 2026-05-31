---
title: "Ideas to Explore as GitHub Issues"
subtitle: "A lightweight memory category for open-ended explorations"
author: "Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
status: "working-note"
version: "0.1"
license: "CC BY-SA 4.0"
canonical_repo: "JeanHuguesRobert/cogentia"
canonical_path: "research/ideas_to_explore_as_issues.md"
---

# Ideas to Explore as GitHub Issues

## 1. Purpose

This note defines a lightweight category for capturing **ideas to explore** as GitHub Issues.

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

## 3. Minimal issue format

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

## 4. Recommended labels

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

## 5. Relationship with the corpus

The issue is not the source of doctrine. It is an entry point.

The normal life cycle is:

```text
conversation / observation
        ↓
GitHub Issue: Idea to explore
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

## 6. Status taxonomy

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

## 7. Continuation levels

| Level | Meaning |
|---|---|
| `low` | interesting but peripheral |
| `medium` | useful continuation, no urgency |
| `high` | strong connection to current corpus direction |
| `critical` | should become part of active doctrine or architecture |

## 8. Example: circular command center

A typical issue in this category could capture the following idea:

> Reuse a Wacom Intuos tablet as a physical command surface, with stickers and a captive stylus, and combine it with a recycled digital photo frame driven by a dongle that dynamically generates MP4 files. Together, they form an open-source, low-cost, degraded-mode command center for a FractaVolta / Fractanet node.

This belongs to the `idea-to-explore` category because it connects:

- FractaVolta: energy, nodes, circular command infrastructure;
- Inox: future runtime for small autonomous Fractanet nodes;
- Cogentia: continuation packets, traceability of acts, local decision rules;
- Home Assistant / MQTT: pragmatic integration layer;
- circular economy: second life for screens and interfaces.

## 9. Anti-capture principle

The issue mechanism must not become a closed managerial backlog that captures the thought process.

An Idea to Explore remains:

- forkable;
- revisable;
- rejectable;
- transformable into another artefact;
- explicitly non-prescriptive.

It is a trace of a possible, not a command.

## 10. Short public formulation

> An “Idea to Explore” is a GitHub Issue used as a memory packet for a possible continuation: structured enough not to be lost, open enough not to become a premature commitment.
