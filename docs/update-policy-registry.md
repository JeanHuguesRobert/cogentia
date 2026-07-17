---
title: "Corpus Update Policy Registry"
author: "Jean Hugues Noël Robert"
date: "2026-07-16"
status: "working-paper"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/update-policy-registry.md"
document_role: "operational"
document_kind: "policy-registry"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DECISION-REVIEW"
provenance:
  origin_type: "repository"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "unknown"
  origin_date: "2026-07-16"
  derived_from: []
review:
  status: "under-review"
  reviewed_by: []
---

# Corpus Update Policy Registry

This registry keeps tracked corpus documents alive and accountable. Provenance says where a
document came from; an update policy says how it may change, who is responsible, and what evidence
must accompany a refresh.

## Frontmatter clause

Tracked documents should declare an `update_policy` identifier. When absent, the default policy is
`UP-DEFAULT-REVIEWED`, but the omission is a maintenance gap to report rather than silently ignore.

```yaml
update_policy: "UP-DEFAULT-REVIEWED"
```

## Policy registry

| Identifier | Applies to | Minimum maintenance rule |
|---|---|---|
| `UP-DEFAULT-REVIEWED` | General source and working documents | Update only from traceable evidence; preserve provenance; review on substantive change. |
| `UP-GENERATED-REBUILD` | Generated indexes, status views, backlinks, and reports | Rebuild from declared inputs; record generator and date; never hand-edit generated blocks. |
| `UP-DECISION-REVIEW` | ADRs, policies, mandates, and boundary decisions | Require human review before acceptance; record supersession rather than erasing history. |
| `UP-DERIVED-SOURCE-LOCKED` | Derived or intentionally adapted products and publication packages | Keep source ref, derivation/adaptation purpose, reviewer, and publication state; do not silently rewrite source claims. |
| `UP-HISTORICAL-PRESERVE` | Archives and historical evidence | Preserve original wording and origin; append contextual notes instead of normalizing history. |
| `UP-INFRASTRUCTURE-HEALTH` | Services, deployments, nodes, and operational infrastructure | Use Operium health and deployment evidence; do not infer availability from configuration or hidden access. |

## Infrastructure-health authority

Cogentia owns the corpus-level mandate, provenance, and traceability invariant. The
[Operium repository](https://github.com/JeanHuguesRobert/operium) owns evidence about operational
health, service state, deployment reality, recovery checks, and infrastructure capability.

Security must not depend on hidden filenames, private repositories, undocumented environment
variables, or accidental obscurity. It must come from explicit mandates, bounded capabilities,
secret separation, observable health, and auditable enforcement.

For an operational action, the minimum evidence is:

```text
valid mandate
+ available capability
+ healthy service or explicit degraded state
+ traceable effective configuration
+ recorded action
= eligible operation
```

An available capability is not a mandate, and a valid mandate does not imply that a machine or
service is available. Operium health records are therefore evidence, not corpus doctrine.

## Required update trace

Every substantive update should leave a trace in a commit message, immutable commit reference,
version-history entry, generated run report, or issue/review/ADR reference. State what changed, why,
what was checked, and what remains uncertain.

## Maintenance loop

```text
discover drift -> plan update -> apply narrowly -> validate -> record trace -> review
```

Staleness is a visible state, not a reason to invent facts. A maintainer may mark a document
`under-review`, `deprecated`, or `superseded` while preserving its history.

The current read-only machine report is generated per repository with:

```text
npm run metadata:audit > metadata-audit.json
```

The report declares schema `cogentia.metadata-audit.v1`, includes every tracked Markdown/YAML/JSON
artifact in scope, and is safe to run repeatedly. It is an audit baseline, not an apply operation.

For bounded one-shot maintenance triage, use:

```text
node scripts/metadata-maintain.js --changed --max-files 100 --max-ms 30000 --json --no-network
```

This command inspects changed Markdown files only, reports a resumable cursor, and never writes
content. Dry-run migration and apply remain separate future operations.

## Scope

This registry defines policy identifiers and minimum expectations. It does not authorize publication,
credential handling, schema implementation, or automatic rewriting of existing documents.

## Dry-run planner

Generate a machine-readable migration proposal with:

```text
node scripts/metadata-plan.js --json > metadata-plan.json
```

The planner proposes only additive metadata, records content hashes, marks every proposal for
review, and never writes source files. A future apply command must reject stale hashes and become a
no-op when the plan has already been applied.

The guarded apply command defaults to preview and requires an explicit `--apply` flag to write:

```text
node scripts/metadata-apply.js --plan metadata-plan.json --json
node scripts/metadata-apply.js --plan metadata-plan.json --apply --json
```

It refuses stale hashes, skips continuation records, adds only fields still absent, and is
idempotent after successful application.

Documents without usable frontmatter are emitted as `provenance-continuation` records using the
existing Cogentia `frontmatter_review` continuation pattern. The continuation carries questions,
evidence commands, explicit unknowns, and a next actor; it is not an automatic rejection and does
not authorize the planner to guess.
