---
title: "Registry Descriptor Dogfood — v0.2 Findings"
author: "Jean Hugues Noël Robert"
language: en
date: "2026-08-22"
last_modified_at: "2026-08-22"
version: "0.1"
status: "working source — dogfood findings"
document_role: "source"
document_kind: "research-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "ChatGPT continuation after Registry of Registries v0.1"
  origin_date: "2026-08-22"
  derived_from:
    - "research/registry_of_registries.md"
    - "research/propagation_register.registry.yaml"
    - "research/concepts.registry.yaml"
    - "https://github.com/JeanHuguesRobert/operium/blob/main/research/federated-capacity-registry.registry.yaml"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/interactions_registry_and_multichannel_messaging.registry.yaml"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-kernel/src/capabilityRegistry.registry.yaml"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Registry Descriptor Dogfood — v0.2 Findings

## 1. Purpose

This note records the first reality test of the candidate Registry Descriptor against five deliberately different registry forms:

1. Propagation Register;
2. Operium Federated Capacity Registry;
3. Interactions Registry;
4. Cogentia Concept Registry;
5. COP Capability Registry.

The test is intentionally small. Its purpose is not to freeze a schema, but to discover which distinctions survive contact with heterogeneous real cases.

## 2. Main result

The initial `cogentia.registry.v1` sketch was too compressed around a single `canonical_source` field.

Reality immediately forced a more precise distinction:

```text
definition_source
!= record_authority
!= record_sources
!= generated/global projection
```

This is now the main structural lesson of `cogentia.registry.v0.2`.

A logical registry may be defined in one place while its authoritative records live elsewhere or across several layers.

## 3. Findings by case

### 3.1 Propagation Register

The Propagation Register is not the source of the facts that create propagation obligations. It consolidates obligations derived from acts, packets, commits, reviews, issues, experiments and evidence.

Therefore its descriptor uses:

```text
authority = generated-projection
record_authority = distributed-source-facts
```

This validates the source/projection distinction already present in Corpus doctrine.

### 3.2 Federated Capacity Registry

The Capacity Registry breaks any model that assumes one registry has one temporal layer or one physical store.

Its logical registry spans at least:

```text
slow catalogue   = declared durable resource truth
fast blackboard  = volatile observation / advertisement
node-local cache = reconstructible hot projection
```

Therefore `record_sources` must be able to describe multiple layers with distinct authority and temporality.

This also confirms:

```text
logical registry identity != storage identity
```

### 3.3 Interactions Registry

The Interactions Registry breaks any model that assumes method ownership and record ownership are the same.

Current doctrine is:

```text
method lives in Cogentia
traces live with the subject
```

The same logical registry therefore spans public and private subject-owned stores while its generic schema/method is maintained elsewhere.

This validates `definition_source`, `architecture_source`, `record_authority`, and multiple `record_sources` as genuinely independent concerns.

### 3.4 Concept Registry

The Concept Registry demonstrates a third authority mode: structural authority without semantic truth authority.

Cogentia can maintain:

- identifiers;
- links;
- scopes;
- statuses;
- graph edges;
- generated views;

without claiming that the index itself defines semantic truth.

Therefore authority cannot be reduced to `authoritative: true|false`.

### 3.5 COP Capability Registry

The COP Capability Registry is an intentionally resettable in-memory runtime registry.

Its records are valid only for the relevant runtime instance and are not durable Corpus truth.

It proves that runtime registries belong in the Registry Graph for discovery and architecture, but require explicit boundaries:

```text
registered capability != durable capacity
registered capability != mandate
registered capability != semantic authority
```

This case also validates `runtime-local`, `ephemeral`, `resettable`, and `runtime-instance` freshness semantics.

## 4. Dimensions that survived all five cases

The following dimensions remain useful after dogfood and should be considered strong candidates for the minimal common model:

```text
id
name
registry_class
record kinds
function
authority mode
topology
temporality
visibility
substrate
granularity
mutation/governance mode
definition_source
record_authority
relations
freshness
```

`record_sources` is optional but necessary for distributed or layered registries.

## 5. Dimensions that should not be forced into one scalar

Dogfood shows that several facets naturally require sets or structured values.

### Temporality

A capacity registry can simultaneously contain slow, volatile and reconstructible layers.

### Substrate

One logical registry may span Git, packets, runtime advertisements and local caches.

### Granularity

A registry may cover node, service and resource levels at once.

### Function

A registry may simultaneously support routing, discovery, audit and projection.

Therefore the generic model should prefer multi-valued facets where the domain requires them.

## 6. Authority should become a first-class structured concept

The five cases suggest that `facets.authority` is useful for compact filtering but insufficient as the full authority model.

A later version should probably normalize something like:

```yaml
authority:
  mode: federated-local-authority
  subject: operium
  scope: operational-capacity
  source_policy: local-declaration-or-observation
  projection_policy: no-global-view-stronger-than-source
```

while preserving a compact facet for simple graph queries.

Do not freeze this shape yet.

## 7. Registry class is descriptive, not hierarchical

The current seed values:

```text
domain-governance
knowledge-navigation
runtime
```

are useful coarse filters, but they MUST NOT become a parent-child ontology.

A future registry may legitimately belong to several classes or resist these labels. Facets and relations remain primary.

## 8. The first graph edges now exist in source-local descriptors

The five descriptors already create a small distributed graph.

Examples include:

```text
registry:propagation
  projects -> corpus:propagation-obligations
  depends_on -> corpus:source-evidence

registry:federated-capacity
  federates -> registry:local-capacity-views
  exposes_view -> view:global-capacity
  must_not_duplicate -> cogentia:capacity-operational-authority

registry:interactions
  governed_by -> cogentia:interaction-packet-method
  projects -> view:interaction-dashboard

registry:concepts:cogentia
  indexes -> corpus:concepts
  projects -> graph:concept-relations

registry:cop-capabilities
  references -> cop:handlers
  must_not_duplicate -> registry:federated-capacity
```

This is already the beginning of the Registry of Registries as a graph, without creating a central registry database.

## 9. Next implementation step

The next useful step is a **read-only deterministic collector/checker** in Cogentia.

Target commands:

```text
registries list
registries check
registries show <id>
registries related <id>
```

First implementation constraints:

- scan configured repositories for `*.registry.yaml`;
- parse only the small declared schema;
- preserve unknown fields;
- detect duplicate registry IDs;
- detect malformed relations;
- report unresolved targets as warnings, not invented fixes;
- never infer authority from repository location alone;
- never mutate descriptors in the first version;
- emit a generated projection only after the collector is stable.

The collector should follow the same architectural rule as responsibility scanning:

> source-local declarations first; global graph second.

## 10. Success criterion for the next phase

A cold agent should be able to ask:

```text
What registries exist?
Which registry records capacities?
Which registry is authoritative for operational capacity?
Which registries are runtime-only?
Which registry projects interaction state?
What depends on the federated capacity registry?
```

and obtain deterministic answers from declared source-local descriptors, without semantic guessing and without relying on one private memory or provider-specific index.

## 11. Status

Dogfood result: **promising, schema not frozen**.

The v0.2 descriptors survived five heterogeneous cases, but the authority model and relation vocabulary should remain provisional until the read-only collector exposes the next concrete mismatches.
