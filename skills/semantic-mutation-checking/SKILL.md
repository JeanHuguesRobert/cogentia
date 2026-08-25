---
schema: cogentia.agent_skill/v1
id: cogentia.semantic-mutation-checking
version: 1
status: stable
name: semantic-mutation-checking
description: >
  Verify that proposed document changes respect epistemic boundaries and protected
  update policies (UP-DESIRED-PRESENT, UP-ARCHAEOLOGY-LIVING, UP-REALITY-EVIDENCE).
  Blocks silent document_kind mutations, document_role demotions, version/changelog
  drift, and narrative bloat in normative specifications. Slash: /semantic-mutation-check.
triggers:
  - before committing changes to research/ or docs/ specifications
  - during consolidation or corpus convergence passes
  - when modifying documents under UP-DESIRED-PRESENT or UP-REALITY-EVIDENCE
  - when upgrading frontmatter version or adding changelog entries
  - detecting silent document_kind or document_role changes
inputs:
  - target_document_or_repo
  - explicit_override
  - strict_mode
outputs:
  - mutation_status (PASS, WARN, BLOCK)
  - policy_verdict
  - violations_and_warnings
effects: read_only
requires:
  capabilities:
    - docs.check-mutation
governance:
  minimum_mandate: read_public
  may_disclose: false
  may_resolve_without_mandate: false
  may_widen_authority: false
  trace_minimum: material
sources:
  - docs/update-policy-registry.md
  - patterns/desired-present-archaeology-reality/PATTERN.md
  - docs/semantic-mutation-checking.md
document_role: "operational"
document_kind: "agent-skill"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# Skill: semantic-mutation-checking

## Purpose

Enforce the epistemic triad invariant:
```text
Desired Present states. Archaeology explains. Reality tests.
```

This skill prevents machine agents and automated workflows from making silent destructive semantic regressions, such as:
1. Turning a short normative conformance specification into an informal working note.
2. Demoting a canonical source document without human authorization.
3. Weakening a strict preservation policy (`UP-DESIRED-PRESENT` or `UP-REALITY-EVIDENCE`).
4. Creating frontmatter metadata contradictions (e.g. declaring `version: 0.5` while changelog has entries up to `v0.8`).
5. Inflating normative specifications with historical narratives instead of routing them to Archaeology.

## When to Run

* **Always before submitting or committing changes** to files in `research/` or `docs/`.
* **During corpus convergence and consolidation cycles** to guard generated views and edits.
* **When reviewing pull requests or agent patches** across any of the 20 tracked repositories.

## Procedure

### 1. Identify Target Scope
Determine whether checking a single file, a whole repository, or the entire corpus.

### 2. Invoke Verification
* **Via CLI**:
  ```bash
  node scripts/cogentia.js docs check-mutation <path-or-repo-or-all> [--strict] [--override]
  ```
* **Via MCP Tool**:
  ```json
  {
    "name": "cogentia_docs_check_mutation",
    "arguments": { "target": "barons-Mariani/research/jhn_architecture.md", "strict": true }
  }
  ```
* **Via v3 Capability Seam**:
  ```javascript
  const result = await invokeCapability("docs.check-mutation", { target: "all" }, { auth });
  ```

### 3. Interpret Verdict
* **`PASS`**: Changes comply with all policy constraints and invariants. Proceed.
* **`WARN`**: Informational warning (e.g. non-monotonic changelog order or explanatory section in normative spec). Review and consider routing explanations to Archaeology.
* **`BLOCK`**: Critical violation (e.g. forbidden `document_kind` mutation or version/changelog contradiction). **Must not commit** without explicitly resolving the conflict or obtaining human override.

## Anti-Patterns

* ❌ **Normative Expansion**: Expanding a `UP-DESIRED-PRESENT` specification with pages of rationale and history. (Fix: Move rationale to `the_network_is_the_learning_computer.md` under `UP-ARCHAEOLOGY-LIVING`).
* ❌ **Silent Kind Mutation**: Changing `document_kind: "architecture-specification"` to `"working-note"` to bypass strict checks.
* ❌ **Version Desynchronization**: Adding a `v0.8` entry to changelog without updating frontmatter `version: "0.8"`.
