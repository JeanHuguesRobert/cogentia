# Semantic Mutation Type Checking

## Overview

**Semantic Mutation Type Checking** is Cogentia's deterministic guardrail system designed to enforce epistemic invariants across the corpus. It prevents agents, automated passes, and human editors from silently altering document roles, weakening update policies, or creating contradictions between declared versions and changelog entries.

It operationalizes the Triad Pattern:
> **Desired Present states. Archaeology explains. Reality tests.**

---

## The Triad Update Policies

| Policy | Target Documents | Rules & Invariants | Directional Tendency |
|---|---|---|---|
| **`UP-DESIRED-PRESENT`** | Normative conformance specifications (e.g. `jhn_architecture.md`) | Forbids silent `document_kind` mutation to `working-note`. Forbids narrative chapters (`Prior Art`, `Rationale`). | **Directional compression**: tends toward conciseness as invariants are clarified. |
| **`UP-ARCHAEOLOGY-LIVING`** | Conceptual rationale, prior art, lineage (e.g. `the_network_is_the_learning_computer.md`) | Allows accumulative growth and deep explanations. Forbids declaring new sovereign normative specifications. | **Permissive growth**: historical and conceptual accumulation. |
| **`UP-REALITY-EVIDENCE`** | Empirical logs, failure residue, test receipts | Verifies implementation evidence. Immutable against retroactive sanitization or convenience rewriting. | **Append-only / Immutable trace**. |

---

## Capabilities and Invocations

### 1. v3 Module / Capability Seam (`docs.check-mutation`)
Registered under the Cogentia v3 capability provider registry (`scripts/lib/v3-modules.js`):
* **Module ID**: `docs.check-mutation`
* **Provided Capabilities**: `["docs.check-mutation", "corpus.check-mutation"]`
* **Governance**: `read_only` (public access baseline)

### 2. CLI Interface
```bash
# Audit the entire 20-repository tracked corpus
node scripts/cogentia.js docs check-mutation all

# Audit a single repository
node scripts/cogentia.js docs check-mutation barons-Mariani

# Audit a specific document before commit (fails with exit code 2 on BLOCK)
node scripts/cogentia.js docs check-mutation barons-Mariani/research/jhn_architecture.md --strict

# Explicitly permit a protected mutation with an audit warning
node scripts/cogentia.js docs check-mutation barons-Mariani/research/jhn_architecture.md --override
```

### 3. Machine Agent MCP Tool (`cogentia_docs_check_mutation`)
Available to all MCP-connected agents (Codex, Antigravity, Claude, Cursor):
```json
{
  "name": "cogentia_docs_check_mutation",
  "arguments": {
    "target": "barons-Mariani/research/jhn_architecture.md",
    "strict": true
  }
}
```

### 4. Machine Agent Skill (`cogentia.semantic-mutation-checking`)
Exposed via `cogentia_skill_get` / `cogentia_skill_list` and located at `skills/semantic-mutation-checking/SKILL.md`.

---

## Checked Invariants

1. **Protected `document_kind` Mutation (`MUTATION_BLOCKED_PROTECTED_KIND`)**:
   * Blocking error if a normative specification (`architecture-specification`, `spec`) is silently mutated into a `working-note`.
2. **Document Role Demotion (`MUTATION_BLOCKED_ROLE_DEMOTION`)**:
   * Blocking error if a `source` document is demoted to non-source without `--override`.
3. **Policy Weakening (`MUTATION_BLOCKED_POLICY_WEAKENING`)**:
   * Blocking error if `UP-DESIRED-PRESENT` or `UP-REALITY-EVIDENCE` is relaxed to `UP-DEFAULT-REVIEWED`.
4. **Version vs Changelog Alignment (`INCONSISTENCY_VERSION_CHANGELOG_MISMATCH`)**:
   * Blocking error if the YAML frontmatter `version` contradicts the highest version in `changelog`.
5. **Changelog Chronological Monotonicity (`INCONSISTENCY_CHANGELOG_ORDER`)**:
   * Warning if changelog entries are not sorted in monotonic chronological order.
6. **Normative Specification Narrative Bloat (`TENDENCY_DESIRED_PRESENT_NARRATIVE_BLOAT`)**:
   * Warning if extensive explanatory sections (`# Prior Art`, `# Rationale`, `# Implementation Lineage`) are added to a `UP-DESIRED-PRESENT` document instead of the Archaeology document.
