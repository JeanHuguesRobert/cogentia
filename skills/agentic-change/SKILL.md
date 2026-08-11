---
schema: cogentia.agent_skill/v1
id: cogentia.agentic-change
version: 1
status: experimental
name: agentic-change
description: >
  Prepare repository or corpus changes under mandate: inspect local instructions,
  preserve source vs generated distinction, validate, report trace. Use for
  patches, navigation gaps, privacy leak remediation proposals, agentic commits.
  Slash: /agentic-change. Does not grant write authority.
triggers:
  - prepare a repository patch or PR
  - close navigation gaps (docs_gaps)
  - remediate privacy leaks (corpus_privacy)
  - agentic commit / generated vs source care
  - consolidate readiness issues
inputs:
  - change_request
  - applicable_mandate
  - optional_repo_paths
outputs:
  - change_plan
  - validation_report
  - trace
  - optional_prepared_diff
effects: prepare_only
requires:
  capabilities:
    - repository.inspect
    - corpus.docs_gaps
    - corpus.privacy
    - corpus.consolidate
governance:
  minimum_mandate: prepare
  may_disclose: false
  may_resolve_without_mandate: false
  may_widen_authority: false
  trace_minimum: material
sources:
  - docs/agent-skills-contract.md
  - research/agentic_commit_transparency.md
  - research/monotonic_mandate_attenuation.md
  - research/agent_configuration_layer.md
  - AGENTS.md
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# Skill: agentic-change

## Purpose

Prepare **safe, reviewable** changes. Default effect is **prepare_only** — proposals and traces, not silent production mutation.

## Procedure

1. **Read instructions** — `AGENTS.md`, shared mandates, issue mandate; apply #79 attenuation (never widen).
2. **Observe debt** — MCP: `cogentia_docs_gaps`, `cogentia_corpus_privacy`, `cogentia_consolidate` (quick).
3. **Preserve distinctions** — source corpus vs generated navigation; do not hand-edit generated bodies.
4. **Plan smallest change** — list files, risk, reversibility, tests.
5. **Validate** — lint/tests available for the sub-project; report what was not run.
6. **Trace** — mandate, provenance, human review expectation (`agentic_commit_transparency`).
7. **Write only under explicit mandate** — git commit/push or MCP mutate only when authorized (e.g. Agent JHN attestation for continuation writes; Principal for production code).

## MCP tools (read)

```text
cogentia_docs_gaps
cogentia_corpus_privacy
cogentia_consolidate
cogentia_docs_inspect
cogentia_git_verify   # when available
```

## Stop conditions

- Mandate missing or ambiguous for write → prepare plan only.
- Change would widen authority or disclose secrets → refuse.
- Generated file needs change → fix generator/source, not the projection alone.

## Non-goals

- Not an autonomous merger or publisher.
- Not a substitute for COP Acts on consequential external effects.
