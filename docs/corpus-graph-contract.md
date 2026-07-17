---
title: Living Corpus graph contract
author: unknown
date: '2026-07-17'
document_role: source
document_kind: service-contract
visibility: public
lifecycle_state: working
update_policy: UP-DECISION-REVIEW
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: pending
  origin_date: '2026-07-17'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Living Corpus graph contract

This contract defines a dynamic, read-only view over Corpus provenance and work
state. It is reconstructible from tracked files, Git history, registry data, and
continuation reports. The graph is not a new canonical source.

## Model

Nodes represent declared artifacts or work items:

- `artifact`: a tracked file or external publication;
- `repository`: a registered Corpus repository;
- `continuation`: an unresolved judgment or follow-up;
- `publication`: a declared external target;
- `snapshot`: an observed graph state.

Edges are directed and may form cycles. Supported relations include:

- `derived_from`;
- `adapted_from`;
- `adapted_product`;
- `references`;
- `blocks`;
- `supersedes`;
- `published_as`.

An edge carries its declaration source, observed-at timestamp, repository commit,
confidence, and unresolved status when applicable.

## Identity and snapshots

Node identity is content- and repository-aware: repository identity, normalized
path, and (when available) commit or external URL. A snapshot records the
registry revision, source commits, generation time, visibility mandate, and
builder version. Snapshots are disposable views and must be reproducible within
the same source state.

## Read-only queries

An implementation should support equivalent operations, whether exposed by CLI
or HTTP:

```text
node(id)
ancestors(id, depth?)
descendants(id, depth?)
path(from, to, max_depth?)
continuations(filters?)
snapshot(filters?)
```

Cycles must be reported, not treated as fatal errors. Missing or invalid edges
remain visible with an explicit status such as `unresolved` or `broken`.

## Authority and safety

The graph service is read-only by default. It may propose propagation work or
continuations, but it does not rewrite sources, publish externally, or resolve
human judgment. Visibility filtering and operational mandates are enforced by
the concrete service layer (Operium).
