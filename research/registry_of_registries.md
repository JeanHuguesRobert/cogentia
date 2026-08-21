---
title: "Registry of Registries — Inventory and Multidimensional Distributed Model"
author: "Jean Hugues Noël Robert"
language: en
date: "2026-08-21"
last_modified_at: "2026-08-21"
version: "0.1"
status: "working source — inventory and architecture framing"
document_role: "source"
document_kind: "architecture"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
classification_source: "explicit-metadata"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "ChatGPT conversation 2026-08-21 — Registry of Registries"
  origin_date: "2026-08-21"
  derived_from:
    - "docs/knowledge_mesh.md"
    - "docs/corpus-responsibility-contract.md"
    - "research/propagation_register.md"
    - "docs/update-policy-registry.md"
    - "research/open_knowledge_format_alignment.md"
    - "https://github.com/JeanHuguesRobert/operium/blob/main/research/federated-capacity-registry.md"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/interactions_registry_and_multichannel_messaging.md"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/cogentia_accounting_architecture.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Registry of Registries

## 1. Purpose

The Living Corpus contains a growing number of explicit registries, registers, ledgers, catalogues, indexes, maps and registry-like runtime structures. They already solve related problems, but they do not yet share a first-class semantic model.

The goal is not to create a central registry that owns the others. The goal is to make registries themselves discoverable, classifiable and linkable so that a **distributed multidimensional registry graph** can be projected from local authoritative declarations.

Canonical working principle:

> **Facts stay local. Claims stay with their legitimate authority. Relations are declared. Graphs are projected. Views are reconstructible.**

A registry is itself an entity that can be registered. Fractality therefore follows from self-description rather than from an infinite hierarchy of `registry-of-registry-of-registries` files.

## 2. Scope and inventory method

This v0.1 inventory covers the main repositories currently visible in the active Corpus and searches explicit uses of `registry`, `register`, `registre`, `ledger`, act/event stores, document/concept indexes, responsibility maps and closely related structures.

It is intended to be **broad and operationally useful, not a proof of absolute exhaustiveness**. Code search has two important blind spots:

1. registry-like structures may exist without any registry-related vocabulary;
2. generated, historical or unindexed repository content may not be returned by connector search.

The inventory therefore distinguishes confirmed registries from quasi-registries and low-level runtime registries rather than pretending every candidate has equal semantic status.

## 3. Registry classes observed in the Corpus

### 3.1 Domain / governance registries

These are the strongest candidates for the future Registry Graph because they preserve or project governed domain state.

| Registry / candidate | Canonical location | What it records | Authority form | Current status |
|---|---|---|---|---|
| Propagation Register | `cogentia/research/propagation_register.md` | pending and completed corpus propagation obligations | reconstructible projection from source facts | explicit registry, active |
| Corpus Update Policy Registry | `cogentia/docs/update-policy-registry.md` | identifiers and minimum rules governing document updates | policy definition authority in Cogentia | explicit registry, working |
| Concept Registry / Concept Index | per-repo `research/concepts.md` | typed concepts, status, references and semantic relations | structural registry; not semantic truth authority | explicit registry/index |
| Interaction Registry | `cogentia/interaction_packets/` + subject-owned stores | consequential interactions and follow-ups | method in Cogentia; traces stay with subject | distributed explicit registry |
| Private Mariani Registry | private `JeanHuguesRobert/registre-mariani` | private operational memory, facts, interpretations and actions | private local source subject to explicit publication boundary | explicit private registry |
| Federated Capacity Registry | `operium/research/federated-capacity-registry.md` | usable compute, inference, storage, network, tools, human and other capacities | local authority + federated projections | explicit federated registry, working |
| Corpus Responsibility Graph | distributed `*.responsibility.yaml` + `cogentia/docs/corpus-responsibility-contract.md` | typed ownership/responsibility/routing claims | source-local claims + generated graph | explicit graph, registry-like |
| Autonomy Organic Law Work Register | `barons-Mariani/research/autonomia/registre_chantier_loi_organique_autonomie_corse.md` | work state around a bounded legal/political chantier | local project register | explicit domain register |
| Civic Acts system | `inseme/apps/platform/docs/CIVIC_ACTS_SYSTEM.md` and `packages/brique-actes/` | municipal acts, versions, requests, evidence, outgoing actions and responsibility log | application database with immutable/versioned evidence | strong quasi-registry |
| Accounting / resource ledgers | `inseme/packages/cop-core/COP_ACCOUNTING.md`, `inseme/research/cogentia_accounting_architecture.md` | conserved resources, transactions, commitments, budgets, analytical imputations | packet/event-local accounting facts + reconciled projections | strong ledger family |
| FractaLog profile | `inseme/research/cop_fractalog_profile.md` and FractaVolta sources | packet/event trace facts and higher-level federated views | source facts packet-local; views projected | distributed ledger/log candidate |

### 3.2 Navigation and knowledge registries

These structures primarily answer what exists and how to find or connect it.

| Registry / candidate | Canonical location | Function | Authority form | Status |
|---|---|---|---|---|
| Document Catalogue | generated `research/documents.md` views | catalogue tracked corpus documents | generated projection | quasi-registry |
| Research indexes | per-repo `research/index.md` | progressive disclosure/navigation | curated or generated projection | quasi-registry |
| Corpus Status | per-repo/global `research/corpus-status.md` | summarized corpus state and gaps | generated projection | quasi-registry |
| Global Corpus Map | `JeanHuguesRobert/research/corpus-map.md` | repository roles and human orientation | curated orientation view | quasi-registry/map |
| Knowledge Mesh | `cogentia/docs/knowledge_mesh.md` | cross-repo links, backlinks, trails and concept graph | structural projection from corpus links | graph infrastructure |
| Cogentia Index Layer | local `.cogentia/index/corpus.sqlite` | searchable document/chunk metadata and retrieval cache | reconstructible local cache only | index, explicitly non-authoritative |
| Views Store | exported Cogentia views | published generated state | export projection | presentation registry-like surface |

### 3.3 Runtime / capability registries

These are real software registries, but their role is narrower: they register executable components or runtime instances rather than corpus knowledge.

| Runtime registry | Location | Registered object | Semantic weight |
|---|---|---|---|
| COP Node Registry | `inseme/packages/cop-kernel/src/nodeRegistry.js` | runtime nodes | implementation registry |
| COP Handler Registry | `inseme/packages/cop-kernel/src/handlerRegistry.js` | packet/continuation handlers | implementation registry |
| COP Capability Registry | `inseme/packages/cop-kernel/src/capabilityRegistry.js` | available capabilities | implementation registry; related but not identical to Operium capacity authority |
| Model Registry | `inseme/packages/models/registry.js` | AI/model definitions | implementation registry |
| Ophelia Role Registry | `inseme/packages/brique-ophelia/edge/roles/registry.js` | roles | implementation registry |
| Cogentia daemon plugin registry | `cogentia/scripts/daemon_plugins/registry.js` | daemon plugins | implementation registry |
| Operium runtime registry | `operium/lib/registry.js` | operational components/entries | implementation/operations registry |
| Inseme hub / instance registries | Supabase migrations including `hub_registry` and historical `instance_registry` | platform hubs/instances | application/runtime registry |

These runtime registries should be discoverable by the Registry Graph, but they should not automatically inherit the governance semantics of a domain registry. In particular:

```text
capability registry != capacity authority
plugin registry != corpus policy registry
model registry != semantic model authority
```

### 3.4 Registry-adjacent stores that should remain distinct

Some structures are highly relevant to the graph but should not be renamed into registries merely for uniformity:

- Git history: immutable/versioned source history;
- GitHub Issues: work/continuation projections, not canonical registry state;
- Cognitive Packets and Continuations: transportable work/state objects;
- audit JSONL / event logs: traces;
- mandate stores: authority artifacts;
- evidence stores: source material;
- archives: preservation containers;
- trails: curated navigation paths.

The Registry Graph should link these objects rather than collapse their semantics.

## 4. Dimensions emerging empirically

The inventory suggests that the minimum useful classification is multidimensional. No single hierarchy can represent the observed cases without losing important information.

### 4.1 Record kind

What does the registry primarily record?

```text
concept
interaction
act
evidence
responsibility
propagation
capacity
resource transaction
policy
component
node
handler
model
document
asset
other
```

### 4.2 Function

```text
source-memory
operational-state
governance
audit
catalogue
routing
discovery
accounting
publication
projection
cache
runtime-dispatch
```

A registry may carry several functions.

### 4.3 Authority mode

This is one of the most important dimensions.

```text
source-authority
local-authority
policy-authority
federated-local-authority
curated-view
generated-projection
reconstructible-cache
runtime-local-state
mixed
```

The distinction prevents a generated global view from silently becoming a competing source of truth.

### 4.4 Topology

```text
local
per-repository
subject-owned
distributed
federated
centralized-application
runtime-local
```

### 4.5 Temporality

```text
append-only
versioned
stateful-evolving
ephemeral
slow-changing
high-volatility
event-sourced
reconstructible
```

### 4.6 Visibility / disclosure

```text
public
private
mixed
restricted
projection-redacted
```

Visibility is independent from authority and topology.

### 4.7 Canonical substrate

```text
git-markdown
git-yaml
git-jsonl
sql-database
runtime-memory
filesystem
packet/event
external-evidence
mixed
```

### 4.8 Granularity

```text
corpus
repository
institution
person/twin
project
service
packet/treatment
act/event
resource
component
```

### 4.9 Governance / mutation model

```text
human-reviewed
agent-maintained-under-mandate
automatically-generated
append-with-correction
mutable-versioned
immutable-event
runtime-managed
```

### 4.10 Confidence / freshness

A projected registry view should be able to expose at least:

```text
confidence
observed_at
valid_until
source_ref
projection_generated_at
freshness_state
```

This is already required in spirit by the Capacity Registry and responsibility freshness work.

## 5. Registry versus graph

A useful generic definition emerging from the Corpus is:

> **A registry is a governed collection of records, claims or references sharing declared authority, provenance, access and update rules.**

A registry can therefore be represented as a node in the Corpus Graph, while its records and relationships form additional nodes and edges.

Conversely:

> **The Corpus Graph is a reconstructible federation of typed relations declared or evidenced by distributed corpus sources and registries.**

This creates the desired recursion without hierarchy:

```text
local registries
      ↓ project
 distributed typed graph
      ↓ query
 registry views
      ↓ may be materialized
 new registries / projections
```

A `Registry of Registries` is simply the graph view selecting entities classified as registries. A registry whose records include registries creates another recursive level without requiring a new architectural primitive.

## 6. Relation vocabulary — seed, not ontology

The Responsibility Graph already proves the value of a small reviewed vocabulary. A registry-specific seed can remain similarly small:

```text
records
projects
federates
indexes
references
derived_from
depends_on
governed_by
operated_by
supersedes
overlaps
exposes_view
must_not_duplicate
```

Important boundary:

> Do not attempt to freeze a complete ontology before real registry cases require it.

Unknown relation types may be preserved as extensions, but machine routing should use a reviewed vocabulary where ambiguity matters.

## 7. Candidate Registry Descriptor v0.1

The smallest useful source-local declaration could mirror the existing responsibility-claim pattern:

```yaml
schema: cogentia.registry.v1
registry:
  id: registry:propagation
  name: Propagation Register

  records:
    kinds:
      - propagation-obligation

  facets:
    function:
      - operational-state
      - governance
    authority: generated-projection
    topology: distributed
    temporality: stateful-evolving
    visibility: public
    substrate: git-markdown
    granularity: corpus

  canonical_source:
    repo: JeanHuguesRobert/cogentia
    path: research/propagation_register.md

  relations:
    - predicate: projects
      object: corpus:propagation-obligations
```

Possible bootstrap storage:

```text
*.registry.yaml
```

located beside the legitimate owning source, just as responsibility claims currently live beside their owning subsystem.

This is a candidate shape only. It should be tested against the inventory before becoming normative.

## 8. First classification matrix

The following deliberately compresses the strongest cases to test whether the dimensions discriminate usefully.

| Registry | Record kind | Authority | Topology | Temporality | Visibility | Substrate |
|---|---|---|---|---|---|---|
| Propagation Register | propagation | generated projection | distributed | evolving | public | Git/Markdown/YAML |
| Capacity Registry | capacity | federated local authority | federated | high volatility | mixed | Git + advertisements + local projections |
| Interaction Registry | interaction | subject-owned source | distributed | append/versioned | mixed | Git/packets |
| Mariani Registry | personal operational memory | local source authority | local/private | evolving | private | Git/Markdown |
| Concept Registry | concept | structural registry | per-repository + projection | slow-changing | public | Git/Markdown |
| Responsibility Graph | responsibility claim | source-local claims | distributed | evolving | public/mixed | Git/YAML + generated graph |
| Update Policy Registry | policy | policy authority | local defining / corpus-wide use | slow-changing | public | Git/Markdown |
| Civic Acts | civic act/evidence | application source with versioned evidence | application-local | event/versioned | controlled/public projections | SQL + evidence |
| COP Accounting | resource transaction | packet/event-local source | distributed | append/corrective | mixed | packet/event + projections |
| Document Catalogue | document | generated projection | corpus-wide | reconstructible | public/mixed view | generated Markdown/index |
| COP Capability Registry | capability | runtime-local | runtime-local | volatile | internal/runtime | code/memory |
| Model Registry | model | runtime/config authority | runtime-local | mutable/versioned | internal/public code | code/config |

The matrix already shows why `registry` cannot be modeled as one rigid class with one authority or storage semantics.

## 9. Architectural invariants suggested by existing Corpus doctrine

### 9.1 Local-source invariant

A global registry view MUST NOT become more authoritative than the legitimate local sources it projects.

### 9.2 Projection invariant

Indexes, graphs, SQL caches and generated views SHOULD be reconstructible whenever their inputs are canonical Corpus sources.

### 9.3 Authority is explicit

The existence of an entry in a registry does not itself grant authority. In particular:

```text
registered capability != authorized capability
registered capacity != mandate
registered responsibility != hidden semantic inference
```

### 9.4 Registry identity is not storage identity

One logical registry may span several repositories, files or runtime stores. Conversely one database may contain several logical registries.

### 9.5 Fractal self-description

A registry MAY record or reference registry entities. No special meta-level is required.

### 9.6 Multidimensional classification

Registry classification MUST NOT require a single parent category. Facets and typed relations are the normal model.

### 9.7 Privacy is an independent axis

Private registries may participate structurally in the graph without leaking private contents. Public projections may expose existence, role or redacted metadata only when policy allows it.

## 10. Relationship to existing architectures

### Knowledge Mesh

The Knowledge Mesh already supplies the distributed link graph, backlinks, trails and concept registries. The Registry Graph should reuse this substrate rather than create a parallel knowledge system.

### Responsibility Graph

The Responsibility Graph is the closest existing implementation pattern:

```text
source-local typed claims
→ registry-aware collection
→ typed graph
→ generated views
→ routing/tests
```

The Registry Graph should generalize this pattern while retaining `must_not_duplicate` boundaries.

### Open Knowledge Format

The current OKF alignment supports Markdown + YAML + links + Git as an interoperable source surface. Registry metadata can remain a Cogentia extension and later be projected into external graph or catalogue formats.

### Cogentia Index Layer

SQLite/FTS/vector structures remain derived retrieval accelerators. They are useful projection targets for Registry Graph queries but are not authority layers.

### Accounting

Cogentia Accounting independently reached the same structural conclusion: no single ledger can represent statutory, resource, analytical and budgetary truth; analytical accounting is explicitly multidimensional. The Registry Graph should preserve the same separation rather than forcing unrelated registries into one table.

## 11. Implementation path

### Phase 0 — inventory (this document)

- [x] identify explicit domain/governance registries;
- [x] identify knowledge/navigation quasi-registries;
- [x] identify runtime registries;
- [x] distinguish registry-adjacent stores;
- [x] derive candidate classification dimensions from observed cases.

### Phase 1 — descriptors

- [ ] validate the dimension set against additional repositories and private structural stubs without disclosing private content;
- [ ] create 3–5 experimental `*.registry.yaml` descriptors beside existing registries;
- [ ] start with maximally different cases: Propagation, Capacity, Interaction, Concept, Capability;
- [ ] refuse schema fields that are not needed by at least one observed case.

### Phase 2 — read-only scanner

Candidate commands:

```text
registries list [repo|all]
registries check [repo|all]
registries show <registry-id>
registries related <registry-id>
registries query --facet <dimension=value>
```

The first scanner should only read declared descriptors and known bootstrap sources. It should not infer semantic registry status silently.

### Phase 3 — generated Registry Graph

Produce reconstructible views:

```text
Registry Catalogue
Registry Graph
Registry Facet Matrix
Registry Authority Map
Registry Freshness Report
```

The graph may later merge with the broader Corpus Graph rather than remain a permanently separate subsystem.

### Phase 4 — integration with routing and agents

Agents should be able to ask:

```text
Where is the authoritative registry for X?
Which registries project X?
Which registry contains records of kind Y?
Which registries are stale?
Which registries overlap?
Which registry must not be duplicated?
```

Ambiguity should be surfaced, not automatically resolved by semantic guesswork.

## 12. Open-Possible check

Current frame: Git/Markdown/YAML remains the canonical Corpus substrate and graph/database layers remain projections.

Assumption challenged: a registry descriptor must necessarily live in a dedicated `*.registry.yaml` file. It may eventually be cleaner to represent registry identity in normalized frontmatter, packet-native artifacts, or generic typed claims shared with the responsibility system.

What becomes thinkable if the assumption moves: responsibility claims, registry descriptions, provenance and other typed Corpus claims could converge on one generic claim substrate rather than multiplying sidecar formats.

Small reversible Booster: create only a handful of descriptors first and implement a read-only normalizer capable of consuming both sidecar YAML and equivalent frontmatter. Let actual usage determine whether a generic claim model is warranted.

## 13. Immediate conclusion

The Corpus does not need a central Registry of Registries database. It already contains the necessary architectural pattern:

```text
local legitimate source
→ typed local declaration
→ federated collection
→ reconstructible multidimensional graph
→ human/agent views and routing
```

The next discriminating step is therefore not a larger ontology. It is **dogfooding a minimal registry descriptor across a deliberately heterogeneous sample of existing registries** and observing which dimensions and relations survive contact with Reality.
