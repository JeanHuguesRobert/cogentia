---
title: "Corpus Responsibility Map Contract"
subtitle: "Typed, source-grounded responsibility routing across the Living Corpus"
author: "Jean Hugues Noël Robert"
date: "2026-08-16"
last_modified_at: "2026-08-16"
document_role: "source"
document_kind: "architecture-contract"
visibility: "public"
lifecycle_state: "working"
classification_source: "explicit-metadata"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "strong"
related_documents:
  - "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/corpus-map.md"
  - "research/concepts.md"
  - "research/index.md"
  - "research/propagation_register.md"
  - "research/cogentia_js_tutorial.md"
update_policy: "UP-DEFAULT-REVIEWED"
---

# Corpus Responsibility Map Contract

## Purpose

The Living Corpus already has several navigation surfaces: repository `research/index.md` files, typed `concepts.md` registries, a global `corpus-map.md`, generated document/catalogue views, backlinks, trails and the local/search indexes maintained by `cogentia.js`.

They answer **where things are** and **how documents/concepts relate** reasonably well. They do not yet answer, with sufficient precision and machine readability:

> **Who is responsible for what, at which architectural layer, and where should a new piece of work be routed?**

This contract adds that missing relation without creating a new doctrinal authority.

## Core invariant

> **Responsibility truth is declared at, or directly beside, the source that legitimately owns the responsibility. Global maps are projections.**

Therefore:

```text
source responsibility claims
        ↓
registry-aware collection
        ↓
typed responsibility graph
        ↓
generated responsibility views
        ↓
agent routing / audits / regression tests
```

A generated responsibility map MUST NOT become a second authority competing with the source declarations.

## Relation vocabulary v0.1

The first deliberately small vocabulary is:

- `defines` — doctrinal or semantic definition authority;
- `implements` — implementation owner for a concept/protocol/capability;
- `operates` — operational authority for a running resource or service;
- `experiments` — canonical experimental/test surface;
- `projects` — produces a derived/federated view without owning source truth;
- `consumes` — uses another component's capability or projection;
- `depends_on` — explicit architectural dependency;
- `must_not_duplicate` — negative boundary preventing a competing authority or control plane.

New relation types require reviewed extension of this contract; agents MUST NOT silently invent synonyms.

## Claim shape

Bootstrap source claims MAY be stored in a small `*.responsibility.yaml` file located beside the owning subsystem. The intended long-term representation may move into normalized frontmatter or another packet-native substrate, but the semantic shape remains:

```yaml
schema: cogentia.responsibility-claims.v1
claims:
  - subject: cop-behavioral-testing
    relation: experiments
    repo: inseme
    path: sandbox/cop-continuation-bac-a-sable
    scope: public
    confidence: high
    evidence:
      - sandbox/cop-continuation-bac-a-sable/README.md
```

Required fields per claim:

- `subject`
- `relation`
- `repo`

Optional fields:

- `path`
- `scope`
- `confidence`
- `evidence`
- `note`

## Routing semantics

A routing query MUST remain explicit about the requested relation. For example:

```text
subject = cop-behavioral-testing
relation = experiments
```

should resolve to the canonical experimental surface, not merely to a document that mentions COP.

When multiple claims conflict at the same relation/scope, the tool MUST report ambiguity; it MUST NOT choose semantically by itself.

`must_not_duplicate` is a first-class negative edge. It exists precisely to prevent errors such as creating a second capacity authority in Cogentia when Operium already owns the operational capacity view.

## Freshness

`index.md`, `concepts.md` and responsibility projections are **views**. Their frontmatter timestamps are not sufficient evidence of freshness.

Freshness SHOULD be measured against source activity, preferably from Git history:

```text
latest relevant source commit
vs
latest projection commit
```

A view is `stale` when relevant source changes are newer than its last rebuild/commit and no explicit exemption applies.

The check MUST distinguish:

- content freshness;
- declared metadata freshness;
- generated-view freshness.

## Regression routing

The incident that motivated this contract becomes the first permanent routing regression case:

```yaml
query:
  subject: cop-behavioral-testing
  relation: experiments
expected:
  repo: inseme
  path: sandbox/cop-continuation-bac-a-sable
```

A future handler or navigator that recommends creating an unrelated new COP sandbox fails this regression.

A second seed case is:

```yaml
query:
  subject: federated-capacity-registry
  relation: operates
expected:
  repo: operium
```

These tests validate navigation/routing, not doctrinal truth itself.

## `cogentia.js` integration target

The bootstrap implementation is a read-only scanner/test harness. The target integration into `cogentia.js` is:

```text
responsibilities list [repo|all]
responsibilities check [repo|all]
responsibilities route <subject> --relation <relation>
responsibilities freshness [repo|all]
```

and, later, a generated responsibility section/view produced by `corpus plan/apply/verify`.

The existing rule remains unchanged:

> `cogentia.js` maintains structure and verified declarations; it does not infer semantic truth.

## Relationship to the existing global Corpus map

`JeanHuguesRobert/research/corpus-map.md` remains the short human-facing global orientation map and already carries the coarse repository responsibility table. This contract does **not** replace it.

The responsibility graph adds a finer machine-readable layer below that map. Eventually, the human-facing map SHOULD consume generated responsibility projections where useful instead of manually duplicating detailed subsystem assignments.

## Success criterion

A cold handler with access only to the Corpus should be materially less likely to create a duplicate subsystem because it can ask the Corpus where a responsibility already lives.
