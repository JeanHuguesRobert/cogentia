---
title: "Cogentia Commons — Structural Plugin Sub-Specifications"
description: "Sub-spec for the three v1 baseline structural plugins: citation_validator, consistency_scanner, objection_summariser"
layout: default
nav_order: 8
version: "draft-0.1"
last_modified_at: 2026-05-12
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text + prompt templates), MIT (schemas and tooling)"
status: "Working sub-specification — companion to cogentia_commons_mvp_spec.md §6.3"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_structural_plugins.md
last_stamped_at: 2026-05-16
---

# Cogentia Commons — Structural Plugin Sub-Specifications

*Sub-specification of [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) §6.3, covering the three v1 baseline plugins whose `contract_class` is `structural`. The companion document [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) covers the two substantive plugins.*

---

## 0. Preamble

A **structural** plugin (parent spec §6.2) produces output whose nature is mechanical or report-oriented: citation existence, link liveness, schema validity, internal consistency, objection summarisation. Structural output MAY be auto-applied to the AgentReview row without an Author acceptance step — but **never** to the underlying Thesis / Premise / Claim / Objection. This is the data-layer realisation of Rule 0 for plugins: an Agent may close its own AgentReview, but cannot close any Continuation whose attached node is a substantive contribution.

The three plugins below all share that contract. Where they differ is execution: some run deterministically (no LLM), some are hybrid (deterministic detection + LLM judgement on residual cases), one is fully LLM-driven (objection_summariser, which has to write prose). The plugin manifest declares the execution model so the Commons UI knows whether to render a paste-bridge prompt or to display a result returned by an internal call.

Each plugin section below specifies: job, manifest, inputs, output JSON schema, execution model (algorithm or prompt template), acceptance / auto-application rules, and failure modes.

---

## 1. `citation_validator`

### 1.1 Job

Resolve every URL, DOI, GitHub path, and `cogentia://` URI referenced by the target node. Mark each citation as `live | dead | unstable | unreachable`. Produce an AgentReview row that downstream plugins, Editors, and Authors can read.

Doctrinal anchor: Working Paper §7.4 (hallucination contamination) — citation verification against live databases is the structural safeguard against fabricated references. The plugin is what makes "Sources can be verified" (second method, §"Why Infrastructure Is AI Safety") operational.

### 1.2 Manifest

```yaml
id: cogentia.plugins.citation_validator
version: 0.1.0
author: jeanhuguesrobert
contract_class: structural
execution_model: deterministic         # no LLM; pure HTTP + regex
target_kinds: [thesis, premise, claim, constraint, objection, revision]
acceptance_policy: auto-apply-to-agent-review
input_schema_uri: cogentia://schemas/citation_validator/input.v0.1.0.json
output_schema_uri: cogentia://schemas/citation_validator/output.v0.1.0.json
license: CC BY-SA 4.0
```

Pinned in the community manifest's plugin allow-list per [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) §4.

### 1.3 Inputs

```json
{
  "target": {
    "id": "<urn>",
    "type": "thesis|premise|claim|constraint|objection|revision",
    "statement": "<text of the node's statement, may contain inline citations>",
    "explicit_references": ["<list of URIs the node carries in its references field, if any>"],
    "commit_sha": "abc1234"
  },
  "freshness_floor_days": 30,             // SLA: citations older than this re-validate
  "previous_review": <AgentReviewArtifact> | null
}
```

When `previous_review` is supplied and is younger than `freshness_floor_days`, the plugin returns it unchanged with a `cached: true` marker — re-validation budget is preserved.

### 1.4 Output schema

```json
{
  "cogentia_plugin": "cogentia.plugins.citation_validator",
  "version": "0.1.0",
  "target_id": "<urn>",
  "validated_at": "2026-05-12T10:00:00Z",
  "cached": false,
  "citations": [
    {
      "raw": "https://example.org/paper.pdf",
      "kind": "url | doi | github_path | cogentia_uri | bare_reference",
      "resolved_to": "https://example.org/paper.pdf",
      "status": "live | dead | unstable | unreachable | unresolved_kind",
      "http_status_code": 200,
      "last_checked_at": "2026-05-12T10:00:00Z",
      "redirect_chain": [],
      "stable_url_proposal": null         // for `unstable`, a wayback or DOI proposal
    }
  ],
  "summary": {
    "total": 8,
    "live": 6,
    "dead": 1,
    "unstable": 1,
    "unreachable": 0,
    "unresolved_kind": 0
  },
  "notes": "..."
}
```

### 1.5 Execution — deterministic

No LLM is invoked. The plugin runs as a backend function with HTTP access:

1. Extract every URL-like token from `target.statement` (regex against `https?://`, `doi:`, `10.[0-9]+/`, `github.com/...`, `cogentia://...`).
2. Merge with `target.explicit_references`.
3. For each citation, classify `kind` and resolve:
   - `url`: HEAD request with 5-second timeout, follow up to 3 redirects.
   - `doi`: resolve via doi.org, then HEAD the resolved URL.
   - `github_path`: GET via the GitHub raw URL; check 200.
   - `cogentia_uri`: resolve via the community's local resolver service (parent spec §8).
   - `bare_reference` (e.g. `Ostrom (1990)`): classify as `unresolved_kind`. The plugin does NOT attempt to look up named references — that is the Author's responsibility.
4. Classify status:
   - `live`: 200 in under 5 seconds, no redirect to a known parking page.
   - `dead`: 404, 410, or 5xx persistent over 3 attempts.
   - `unstable`: 200 today but the URL is on a known-volatile host (medium.com, twitter.com, pastebin, etc., per a shipped allow-list); the plugin proposes a `stable_url_proposal` (wayback snapshot).
   - `unreachable`: timeout or DNS failure on every attempt.
5. Cache the result keyed by `(target_id, commit_sha)`.

### 1.6 Acceptance / auto-application

The AgentReview row is auto-applied (per parent spec §6.2). It carries the validation result, is visible to anyone reading the target node, and is the input to:

- The Author's *Publish* decision (parent spec §8): a community manifest MAY require `dead == 0` before allowing a Publication of `artifact_type: improved` or higher.
- Downstream plugins (consistency_scanner reads it to avoid re-flagging dead citations).

The AgentReview does NOT modify the target node. It is a *report*, not a contribution.

### 1.7 Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Network unreachable from the plugin runtime | Every HEAD request fails identically. | Plugin returns `status: "unreachable"` for all citations and a top-level `notes` flag. Author can re-run later. |
| Citation source rate-limits the plugin | 429 responses. | Exponential backoff; if 3 retries fail, mark `unreachable` with a `rate_limited: true` note. |
| URL legitimately changed (link rot) | `dead` classification. | Surface to the Author; Author can replace the citation in a Revision. No automatic rewrite of the target. |
| Plugin disagrees with the Author about staleness | Author rejects the `unstable` classification. | Author submits a contribution Objection on the AgentReview row; this is a v1.1 surface (objections-on-AgentReviews not yet specified). v1 workaround: Author edits the target node to add a justification note. |

---

## 2. `consistency_scanner`

### 2.1 Job

Detect structural inconsistencies in the formal graph: circular dependencies in `derived_from` edges, undefined terms (Premises referenced by Claims that don't resolve to any anchored node), and surface candidate contradictions between Claims. The first two are deterministic; the third requires LLM judgement.

### 2.2 Manifest

```yaml
id: cogentia.plugins.consistency_scanner
version: 0.1.0
author: jeanhuguesrobert
contract_class: structural
execution_model: hybrid                # deterministic graph analysis + LLM contradiction scan
target_kinds: [document]               # operates on the Document's full kernel
acceptance_policy: auto-apply-to-agent-review
input_schema_uri: cogentia://schemas/consistency_scanner/input.v0.1.0.json
output_schema_uri: cogentia://schemas/consistency_scanner/output.v0.1.0.json
prompt_artifact_uri: cogentia://prompts/consistency_scanner_contradictions.v0.1.0.md
license: CC BY-SA 4.0
```

### 2.3 Inputs

```json
{
  "document_id": "<urn>",
  "commit_sha": "abc1234",
  "kernel": {
    "thesis": { "anchor_id": "...", "statement": "...", "epistemic_status_tag": "..." },
    "premises": [ ... ],
    "claims": [ ... ],
    "constraints": [ ... ]
  },
  "edges": [
    { "from": "<anchor>", "to": "<anchor>", "type": "derived_from|supports|contradicts|qualifies|extends" }
  ],
  "previous_review": <AgentReviewArtifact> | null
}
```

### 2.4 Output schema

```json
{
  "cogentia_plugin": "cogentia.plugins.consistency_scanner",
  "version": "0.1.0",
  "document_id": "<urn>",
  "scanned_at": "2026-05-12T10:00:00Z",
  "findings": {
    "cycles": [
      {
        "path": ["claim-a", "claim-b", "claim-c", "claim-a"],
        "edge_types": ["derived_from", "derived_from", "derived_from"]
      }
    ],
    "undefined_references": [
      {
        "referencing_node": "claim-x",
        "missing_target": "premise-y",
        "edge_type": "derived_from"
      }
    ],
    "candidate_contradictions": [
      {
        "node_a": "claim-corsican-yield",
        "node_b": "claim-corsican-yield-bound",
        "confidence": "high|medium|low",
        "agent_reasoning": "<short sentence from the LLM>"
      }
    ]
  },
  "summary": {
    "cycles_count": 0,
    "undefined_references_count": 0,
    "candidate_contradictions_count": 1
  },
  "notes": "..."
}
```

### 2.5 Execution — hybrid

**Step 1 — Deterministic cycle detection.** A DFS over the `derived_from` and `qualifies` edge types. Any cycle is reported. Edge types `contradicts` and `refutes` are intentionally cyclic by design and are excluded from cycle detection.

**Step 2 — Deterministic undefined-reference detection.** For each edge, check both endpoints exist in `kernel`. If not, report the missing target with the referencing node and the edge type.

**Step 3 — LLM contradiction scan.** For every pair of Claims sharing at least one common `derived_from` ancestor (the deterministic filter that bounds the pair-count), send a prompt asking whether the two Claims could simultaneously be true. The prompt template is at `cogentia/plugins/consistency_scanner/prompts/contradictions.v0.1.0.md` and is short:

```markdown
You are checking two Claims from the same research Document for potential
contradiction. Both are presented below. Your task is to assess whether
both can simultaneously be true under any reasonable reading.

Output ONLY a JSON block:

```json
{
  "cogentia_plugin": "cogentia.plugins.consistency_scanner",
  "version": "0.1.0",
  "subroutine": "contradiction_check",
  "verdict": "consistent | candidate_contradiction | unable_to_assess",
  "confidence": "high | medium | low",
  "reasoning": "<one short sentence>"
}
```

Do NOT propose changes to either Claim. Do NOT invent context not present
in the statements. If the statements are too short or context-free to
judge, return `unable_to_assess` with `confidence: low`.

Claim A ({{node_a.anchor_id}}): {{node_a.statement}}
Claim B ({{node_b.anchor_id}}): {{node_b.statement}}
```

The LLM output is **NOT** authoritative — it is a *candidate flag*. The Author or Editor decides whether the flagged pair is a real contradiction worth addressing, a false positive, or a tension the Document acknowledges.

### 2.6 Acceptance / auto-application

The AgentReview is auto-applied. Cycle and undefined-reference findings are deterministic and exact; Authors who disagree with them have either renamed an anchor without migrating its edges or have not yet committed an in-flight edge correction. Candidate contradictions are advisory only — they appear in the Author's pending-work view with the `candidate_contradictions_count` badge but do not block anything.

### 2.7 Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| LLM unavailable for contradiction scan | The contradictions sub-routine returns nothing or times out. | The plugin returns the cycle and undefined-reference findings only; `candidate_contradictions: []` with a `notes` flag. The deterministic findings are independently valuable. |
| LLM produces inconsistent verdicts across runs | Detected when re-running and getting different `verdict` on the same pair. | The Commons UI shows the most recent verdict but preserves prior verdicts in the AgentReview history. Persistent disagreement is a signal that the pair *is* genuinely ambiguous. |
| Pair-count blows up on a large kernel | n² pairs filtered by common-ancestor heuristic still produces too many. | Plugin caps at 50 LLM calls per invocation; remaining pairs are deferred to the next invocation. The `notes` field reports the cap was hit. |

---

## 3. `objection_summariser`

### 3.1 Job

Given a target node with multiple open Objections, produce a single Editor-facing brief that bundles the Objections by theme, identifies overlap, distinguishes substantive from procedural concerns, and suggests an ordering for a synthesis Revision. This is the plugin an Editor runs *before* claiming an `editor_synthesis` Continuation (parent spec §4.4), to understand what they would be synthesising.

### 3.2 Manifest

```yaml
id: cogentia.plugins.objection_summariser
version: 0.1.0
author: jeanhuguesrobert
contract_class: structural
execution_model: llm
target_kinds: [thesis, premise, claim]
acceptance_policy: auto-apply-to-agent-review
input_schema_uri: cogentia://schemas/objection_summariser/input.v0.1.0.json
output_schema_uri: cogentia://schemas/objection_summariser/output.v0.1.0.json
prompt_artifact_uri: cogentia://prompts/objection_summariser.v0.1.0.md
license: CC BY-SA 4.0
```

### 3.3 Inputs

```json
{
  "target": {
    "id": "<urn>",
    "type": "thesis|premise|claim",
    "anchor_id": "claim-corsican-yield",
    "statement": "...",
    "current_status_flags": ["candidate_contradiction"]
  },
  "objections": [
    {
      "id": "<urn>",
      "anchor_id": "objection-37",
      "author_handle": "...",
      "statement": "...",
      "falsifiability_form": "...",        // null if un-falsifiable
      "marks": ["un-falsifiable" | "out-of-eligibility" | "withdrawn" | ...],
      "submitted_at": "...",
      "support_count": 3
    }
  ],
  "constraints_for_synthesis": {
    "max_objection_clusters": 5,
    "language": "en"
  }
}
```

### 3.4 Output schema

```json
{
  "cogentia_plugin": "cogentia.plugins.objection_summariser",
  "version": "0.1.0",
  "target_id": "<urn>",
  "scanned_at": "2026-05-12T10:00:00Z",
  "clusters": [
    {
      "theme": "<short label>",
      "objection_ids": ["<urn>", "<urn>"],
      "synthesis_hint": "<one sentence framing of what a Revision would need to address>",
      "priority": "high | medium | low",
      "marks_present": ["un-falsifiable"]
    }
  ],
  "ungrouped": ["<urn>", "<urn>"],
  "procedural_concerns": ["<urn>"],
  "suggested_synthesis_order": ["<theme1>", "<theme2>"],
  "notes": "..."
}
```

### 3.5 Execution — LLM with prompt template

The prompt at `cogentia/plugins/objection_summariser/prompt.v0.1.0.md`:

```markdown
You are bundling outstanding Objections against a single target node in
the Cogentia Commons formal graph. Your output is a brief for an Editor
considering a synthesis Revision — it is NOT a Revision itself, and you
do NOT propose changes to the target or to any Objection.

# Your task

1. Group the Objections below into at most {{constraints.max_objection_clusters}}
   thematic clusters. Two Objections belong in the same cluster if they
   challenge the target node on overlapping grounds (same Premise, same
   evidential gap, same scope question, etc.).
2. For each cluster, write a one-sentence `synthesis_hint` framing what
   a Revision would need to address.
3. Assign a `priority` per cluster based on:
   - the substance of the objections (substantive > procedural);
   - the presence or absence of `un-falsifiable` marks
     (marked Objections drop in priority);
   - the support_count (advisory; high Support is not validity, but it
     signals community engagement).
4. List separately:
   - `ungrouped`: Objections that do not cluster.
   - `procedural_concerns`: Objections that challenge the process of
     contribution rather than the content of the target.
5. Propose a `suggested_synthesis_order` over the cluster themes.

# Forbidden

- Do NOT rewrite or paraphrase any Objection.
- Do NOT propose Revisions to the target.
- Do NOT invent themes not present in the Objections.
- Do NOT assess validity. You are clustering, not adjudicating.

# Target

({{target.anchor_id}}, {{target.type}}): {{target.statement}}

Current status flags on target: {{target.current_status_flags}}

# Objections

{{#each objections}}
- ({{anchor_id}}) by {{author_handle}} {{#if marks}}[{{marks}}]{{/if}}: {{statement}}
  Falsifiability form: {{falsifiability_form}}
  Support count: {{support_count}}
{{/each}}

# Output

Output ONLY a JSON block matching the objection_summariser v0.1.0
output schema. No other text before or after.
```

### 3.6 Acceptance / auto-application

The AgentReview is auto-applied. It is *informational input* to a future synthesis. An Editor who disagrees with the clustering simply ignores it and clusters mentally; the AgentReview's existence does not constrain the Editor's freedom to synthesise differently. The Editor's eventual Revision is what carries the substantive contribution, not the summariser's output.

The plugin's output is **explicitly non-binding**. This is the most important property of the plugin — it does the prep work for the synthesis, it does not *do* the synthesis.

### 3.7 Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| LLM produces empty clusters | Output has all objections in `ungrouped` | Accept as-is; signals the Objections are genuinely heterogeneous and an Editor should not attempt a single synthesis. |
| LLM fabricates a cluster theme not supported by any objection | Editor judgement | The Editor ignores the cluster. The AgentReview history preserves the bad output as a record. |
| LLM clusters substantive and procedural objections together | Author / Editor judgement | Manual override at synthesis time. v0.2.0 may add a deterministic pre-filter that flags procedural-only Objections (those tagged `out-of-eligibility` or attacking metadata rather than content) before the LLM sees them. |
| LLM over-clusters across the constraint limit | The output exceeds `max_objection_clusters`. | Output-schema validator rejects; Commons UI prompts a re-run. |

---

## 4. Common Acceptance Flow

All three structural plugins follow the parent spec §7 round mechanics with the auto-apply path:

```
1. Plugin invoked (typically as part of a round opened on the target Document or node)
2. AgentReview row created with status=accepted (no human gate)
3. Output Artifact persisted (cogentia/plugin-output type)
4. Plugin Continuation closed with resolution_kind = "resolved"
5. AgentReview rendered in the target node's "agent findings" view in the UI
```

The Author and any Editor can read these AgentReviews at any time. They do not block any other action. They inform but do not gate.

---

## 5. Tests and Fixtures

Each plugin ships with fixtures at `cogentia/plugins/<plugin_id>/fixtures/`:

### `citation_validator`

- `01_all_live.json` — 5 live URLs and one DOI.
- `02_dead_link.json` — one 404, rest live.
- `03_unstable_host.json` — twitter.com link, expects `unstable` + wayback proposal.
- `04_unreachable.json` — DNS failure simulated.
- `05_bare_reference.json` — `Ostrom (1990)` style references, expects `unresolved_kind`.

### `consistency_scanner`

- `01_clean_kernel.json` — no findings expected.
- `02_simple_cycle.json` — three Claims forming a `derived_from` cycle.
- `03_undefined_reference.json` — Claim refers to a missing Premise.
- `04_candidate_contradiction.json` — two Claims that should flag; the LLM call is mocked in CI.

### `objection_summariser`

- `01_two_objections_one_cluster.json` — both Objections on the same Premise grounds.
- `02_heterogeneous_objections.json` — five Objections, expected to ungroup or thin-cluster.
- `03_procedural_only.json` — Objections about plugin choice or anchor IDs; expected in `procedural_concerns`.

CI runs each plugin against its fixtures and compares output JSON (modulo timestamps, ordering of equal-priority items).

---

## 6. Open Questions

1. **Plugin runtime location.** Structural plugins with HTTP access (`citation_validator`) need a backend runtime; LLM-based ones (`consistency_scanner` contradictions, `objection_summariser`) need credentialed LLM access. v1 could host both as Netlify Functions; v1.1 might split them out. Out of scope for this sub-spec.
2. **Caching policy beyond `freshness_floor_days`.** `citation_validator` caches per `(target_id, commit_sha)`. When a target's text is `edit-text`ed (per §5.6) but its anchor stays, do prior validations survive? v1 says no — anchor moves invalidate prior caches; v1.1 may distinguish text-level edits that don't touch citations.
3. **LLM model pinning for the two LLM-using structural plugins.** A community manifest pins the plugin version. Should it also pin the LLM model? v0.1.0 leaves the LLM choice to the Author (via the paste bridge for the substantive plugins) or to the platform's backend LLM provider (for `objection_summariser`). Pinning would improve replayability but compromise the human-paste-bridge flexibility. Defer.
4. **Auto-application boundary.** Structural plugins auto-apply to AgentReview rows. v1 forbids them from auto-applying to the target node, which is correct. But there are edge cases — e.g. could `citation_validator` auto-add a `citation_dead` Mark (§4.5 rung 2) to a target whose citation is dead? v1 says no — Marks are reserved for human-issued or Burton-conversion-flow contributions. A "citation dead" Mark would be useful and is a candidate for v0.2.0.
5. **Multi-language support.** `objection_summariser` accepts `constraints_for_synthesis.language: "en"`. v0.2.0 should accept `"fr"` and detect Objection language per-Objection. The Working Paper's bilingual corpus (FR preamble, EN body) is the test case.

---

## 7. Relationship to Existing Artifacts

- [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) §6.3 — names these three plugins as the structural members of the v1 baseline.
- [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md) — the substantive plugin that produces the kernel these structural plugins operate over. `consistency_scanner` is most useful immediately after a `kernel_extractor` acceptance.
- [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) §4 — the allow-list mechanism that pins these plugin versions.
- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §4.4 (multi-agent critique loop) — these plugins are the structural members of that loop; the substantive members live in the companion sub-spec.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) §4.2 — the read-only COPStore that all three plugins consume. None of these plugins receive a write-capable Store.

---

## 8. License

This sub-specification (prose, prompt templates, schemas): **CC BY-SA 4.0**.
JSON Schema files, fixtures, and reference implementations: **MIT**.

---

*Premier commit : 2026-05-12 — Corte. Sub-spec draft v0.1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Research Index — Cogentia](index.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Cogentia Commons — Substantive Plugin Sub-Specifications](cogentia_commons_substantive_plugins.md)

<!-- END_AUTO: backlinks -->
