---
title: "Plural-Source Provenance Contract"
subtitle: "Keeping independent sources, derived memories, indexes, and disclosure views distinct"
description: "A minimal provenance and disclosure contract for Cogentia's independent source domains."
author: "Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
date: "2026-09-03"
last_modified_at: "2026-09-03"
language: "en"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/plural-source-provenance-contract.md"
last_stamped_at: "unknown"
version: "0.1"
status: "working-paper"
ai_assisted_by:
  - "Codex (GPT-5)"
document_role: "source"
document_kind: "architecture-contract"
document_function: "privacy-and-provenance-contract"
target_audience: "Cogentia maintainers and source-adapter implementers"
target_scene: "local-first multi-source retrieval and governed agent recall"
visibility: "public"
lifecycle_state: "working"
classification_source: "explicit-metadata"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "strong"
provenance:
  origin_type: "conversation"
  origin_repository: "unknown"
  origin_ref: "unknown"
  origin_date: "2026-09-03"
  derived_from: []
review:
  status: "unreviewed"
  reviewed_by: []
related_documents:
  - "docs/corpus-graph-contract.md"
  - "docs/corpus-responsibility-contract.md"
  - "research/conversation_to_corpus_pipeline.md"
update_policy: "UP-DEFAULT-REVIEWED"
---

# Plural-Source Provenance Contract

## Purpose

Cogentia works across a plurality of sources.  A repository corpus, a private
registry, an exported conversation archive, an agent's task memory, and a
search index do not have the same authority, retention policy, visibility, or
freshness properties.

This contract prevents a convenient aggregate index or an agent response from
silently flattening those differences into one alleged "memory".

## Core invariant

> Sources remain independent.  Cogentia may relate, normalize, index, and
> project them, but a projection never becomes the authority it represents.

```text
independent sources
        |
        +--> declared provenance and visibility boundary
        |
        +--> authorized derived records
        |
        +--> rebuildable per-boundary indexes
        |
        `--> caller-specific disclosure view
```

No single full-text, vector, graph, or agent-memory index is a substitute for
source identity, provenance, review, or authorization.

## Source roles

The following roles are deliberately distinct.  A concrete source MAY have
more than one role only when each role is explicitly declared.

| Role | Meaning | Authority consequence |
| --- | --- | --- |
| `primary_record` | Original record or imported raw export. | Retains original attribution and context; it is not automatically verified. |
| `private_registry` | Protected canonical record governed by its owning registry. | Its owner and access policy decide retention and disclosure. |
| `derived_memory` | Curated operational learning, summary, or continuation aid. | Useful for recall, but must preserve its source links and may be stale. |
| `stabilized_corpus` | Reviewed, versioned corpus document. | Authoritative only for the claim and scope it explicitly stabilizes. |
| `retrieval_index` | FTS, vector, graph, cache, or other retrieval acceleration. | Rebuildable projection; never independent evidence. |
| `public_view` | A caller-facing publication or response. | Must respect the source's disclosure policy and say less when necessary. |

For example, a locally stored conversation archive is a `primary_record`; an
agent-maintained task summary is `derived_memory`; and a `zg` index built from
either is a `retrieval_index`.

## Minimal source descriptor

Source adapters and index builders SHOULD retain at least this information.
The private locator is never copied into a public projection.

```yaml
schema: cogentia.source-descriptor.v1
source_id: "private:conversation-archive:example"
role: primary_record
trust_domain: personal-private
authority: source-owner
origin:
  kind: provider-export
  provider: chat-provider
  acquired_at: "2026-09-03T00:00:00Z"
integrity:
  content_hash: "sha256:..."
  source_revision: "provider-or-import-revision"
visibility:
  maximum: private_referenceable
  public_disclosure: private_opaque
freshness:
  observed_at: "2026-09-03T00:00:00Z"
  state: observed
```

`source_id` is stable within its trust domain.  A public view MUST use a
separate opaque reference where correlation would reveal protected identity or
activity.

## Disclosure is not Boolean

An adapter or response policy MUST select an allowed disclosure view rather
than treating visibility as simply public or private.

| Disclosure level | What may be revealed |
| --- | --- |
| `private_opaque` | Only that protected evidence exists, where disclosure of existence is authorized. |
| `private_referenceable` | A controlled internal reference and admissible metadata. |
| `redacted` | An explicitly derived statement, with a declared redaction policy. |
| `publishable` | Source identity and content within its declared publication scope. |

`private_opaque` does **not** imply that title, provider, author, time,
quantity, path, identifier, or excerpt is safe to reveal.  Absence of a
disclosed source must not be represented as absence of evidence.

A redacted view is a derived product.  It SHOULD retain, within its permitted
trust domain, the source reference, transformation/redaction policy, generator
or reviewer identity, and creation time.

## Retrieval and agent boundary

Retrieval is permitted to find candidate evidence; it is not permission to
disclose, act on, or write back to that source.

```text
caller + mandate
       -> source-boundary routing
       -> retrieval index or source adapter
       -> candidate evidence with provenance
       -> disclosure policy
       -> response / Cognitive Packet
```

An agent-facing endpoint MUST receive the least revealing evidence view that
can serve the authorized purpose.  In particular, a general-purpose vault MCP
with read/write/delete capabilities MUST NOT be handed directly to a public
surface or to an agent whose mandate requires read-only, redacted, or opaque
access.

## Index separation and federation

Indexes MUST be scoped by trust domain.  Initial examples are:

```text
public-corpus index
personal-private conversation index
private-registry index
```

Federated search is a policy operation over independent indexes, not a merge of
their raw documents.  The federation result retains the responding source
domain and may return an opaque or redacted result instead of text.

This is the privacy boundary relevant to the `zg` evaluation: an experiment
may compare retrieval methods inside one authorized workspace, but it MUST NOT
make a mixed public/private workspace the implicit default.

## Freshness, conflict, and promotion

Every derived record SHOULD identify its source revision or content hash and
the time it was observed.  A derived memory may be useful while stale; it must
not silently override a newer primary record or live operational observation.

Promotion is explicit:

```text
primary record or derived memory
        -> human/reviewed stabilization decision
        -> stabilized corpus or private registry record
        -> new derived views and indexes
```

Conflicting sources remain visible as conflicting claims unless an authorized
review resolves them.  An index rank is not a resolution mechanism.

## First implementation boundary

The first implementation is intentionally small:

1. declare source descriptors beside new adapters or workspaces;
2. require every retrieval result to carry `source_id`, `role`, `trust_domain`,
   `content_hash` or revision when available, and the retrieval route;
3. build separate local indexes for separate trust domains;
4. expose only a policy-filtered read interface to agents;
5. record a continuation when a requested disclosure exceeds the caller's
   mandate.

This contract does not yet prescribe a universal database, an automatic import
of private archives, or a shared cloud service.  Those would be later,
separately authorized adapters built on this boundary.
