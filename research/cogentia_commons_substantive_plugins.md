---
title: "Cogentia Commons — Substantive Plugin Sub-Specifications"
description: "Sub-spec for the two v1 baseline substantive plugins: falsifiability_conversion and revision_proposer"
layout: default
nav_order: 9
version: "draft-0.1"
last_modified_at: 2026-05-12
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text + prompt templates), MIT (schemas and tooling)"
status: "working-paper"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_substantive_plugins.md
last_stamped_at: 2026-05-16
---

# Cogentia Commons — Substantive Plugin Sub-Specifications

*Sub-specification of [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) §6.3, covering the two v1 baseline plugins whose `contract_class` is `substantive`. The companion document [`cogentia_commons_structural_plugins.md`](cogentia_commons_structural_plugins.md) covers the three structural plugins. The most ambitious substantive plugin — `kernel_extractor` — has its own sub-spec [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md).*

---

## 0. Preamble

A **substantive** plugin (parent spec §6.2) produces output that bears on *meaning* rather than on structure: re-shaping an Objection from a feeling of certainty into a falsifiable claim, drafting a candidate Revision patch against the literate form. Substantive output is **never** auto-applied. Each invocation produces an AgentReview row that sits in `status: proposed` until a human resumer (typically the original Author or the Objector) accepts, edits, or rejects it.

This is the doctrinal half of the parent spec §10 Rule 0 audit: an Agent can propose meaning, never instantiate it. The human in the loop is what makes the proposal a contribution.

The two substantive plugins covered here are the v1 baseline beyond `kernel_extractor`:

- **`falsifiability_conversion`** — operationalises Rule 2 of `second_method.md` (Burton conversion). Given an Objection that reads as a feeling of certainty, propose a falsifiable form.
- **`revision_proposer`** — given an Objection and the Premise or Claim it targets, draft a candidate Revision patch against the literate form. The output is a patch proposal that the Author or Editor can commit, edit, or reject.

Both plugins share the substantive contract:

- LLM-based, paste-bridge UX (same pattern as `kernel_extractor`).
- The COP `cop/continuation` artifact's `agent` is the *human user's GitHub handle*, not the LLM. The LLM is a tool the human invokes.
- `acceptance_policy: human-gated`. AgentReview stays `proposed` until the resumer acts.

---

## 1. `falsifiability_conversion`

### 1.1 Job

Read an Objection (and the Premise or Claim it targets), assess whether the Objection is already in falsifiable form, and if not, propose a converted statement that names the calculation, citation, or measurable prediction whose value would settle the disagreement. The plugin operationalises the Burton conversion named in `second_method.md` Rule 2 and quoted verbatim in the parent spec §7.

Under the parent spec's §1.1 *permissive action, accountable record* design principle, the plugin does NOT block the Objection from entering the record — un-falsifiable Objections are admitted with a permanent `un-falsifiable` Mark (§4.5 rung 2). The plugin's job is to give the Objector and the community a converted form to engage with; conversion is an *invitation*, not a gate.

### 1.2 Manifest

```yaml
id: cogentia.plugins.falsifiability_conversion
version: 0.1.0
author: jeanhuguesrobert
contract_class: substantive
execution_model: llm-paste-bridge
target_kinds: [objection]
acceptance_policy: human-gated
input_schema_uri: cogentia://schemas/falsifiability_conversion/input.v0.1.0.json
output_schema_uri: cogentia://schemas/falsifiability_conversion/output.v0.1.0.json
prompt_artifact_uri: cogentia://prompts/falsifiability_conversion.v0.1.0.md
license: CC BY-SA 4.0
```

### 1.3 Inputs

```json
{
  "objection": {
    "id": "<urn>",
    "anchor_id": "objection-37",
    "author_handle": "jdoe",
    "statement": "10 GWp on a Mediterranean island feels unrealistic.",
    "marks": [],                        // empty in v0; pre-conversion
    "submitted_at": "2026-05-12T08:00:00Z"
  },
  "target": {
    "id": "<urn>",
    "type": "premise|claim|thesis",
    "anchor_id": "claim-corsican-yield",
    "statement": "10.8 GWp installable on Corsican abandoned vineyards yields ~16 TWh/yr.",
    "epistemic_status_tag": "operational proposal"
  },
  "previous_attempts": [<AgentReviewArtifact>]   // prior conversion runs on this Objection
}
```

### 1.4 Output schema

```json
{
  "cogentia_plugin": "cogentia.plugins.falsifiability_conversion",
  "version": "0.1.0",
  "objection_id": "<urn>",
  "verdict": "already_falsifiable | conversion_proposed | unable_to_convert",
  "falsifiable_form": "<converted statement if conversion_proposed; same as original if already_falsifiable; null if unable_to_convert>",
  "asks_for": ["calculation" | "citation" | "prediction" | "measurement"],
  "what_would_settle_it": "<one or two sentences naming the specific evidence>",
  "reasoning": "<why the plugin reached its verdict; one short paragraph>",
  "confidence": "high | medium | low",
  "notes": "..."
}
```

### 1.5 Prompt template

The template at `cogentia/plugins/falsifiability_conversion/prompt.v0.1.0.md`:

```markdown
You are a falsifiability converter for Cogentia Commons. The methodology
you operate under is `second_method.md` Rule 2: an objection must be
distinguishable from a feeling of certainty before it can productively
enter the record. Robert Burton (*On Being Certain*, 2008) demonstrated
that the sense of certainty is a brain state independent of reasoning;
the second method asks that objections name what would falsify them, so
that feeling and claim can be told apart.

Your job is NOT to silence objections you think are wrong. It is to
propose a falsifiable form so the community can engage with the claim
rather than the feeling underneath it. The Objector may accept your
conversion, repudiate it, or amend it.

# What "falsifiable" means here

An objection is falsifiable when its statement names at least one of:

- a **calculation** whose result, if produced, would settle the disagreement
  (e.g. "compute the bifacial yield over Corsican friches viticoles using
  ADEME ZNI assumptions");
- a **citation** that, if produced, would support or refute the claim
  (e.g. "Corsica Sole 2024 measurements at site X show yield Y");
- a **measurable prediction** the target node's claim implies, which
  could be verified or refuted by future observation;
- a **measurement** whose value would settle it (e.g. "Eurostat 2023
  primary energy intensity for Corsica").

An objection that asserts the target "feels unrealistic", "seems
implausible", "is too ambitious" without naming any of the above is a
feeling-of-certainty report. The conversion's job is to ask: *what would
settle this?*

# Your task

Read the Objection and its target. Output a single JSON block with one
of three `verdict` values:

- `already_falsifiable`: the Objection already names a calculation,
  citation, prediction, or measurement. Return the Objection's statement
  verbatim in `falsifiable_form`. Confidence is typically high.

- `conversion_proposed`: the Objection is a feeling-of-certainty report.
  Propose a converted statement that asks specifically what calculation,
  citation, prediction, or measurement would settle the underlying
  disagreement. Use the form of the canonical example in second_method.md:
  > "The X estimate assumes A. Available data B suggests C. At that value,
  >  result would be D, not Y. Source: [...]. This reduces the conclusion
  >  by Z%."
  Adapt the form to the actual claim being objected to.

- `unable_to_convert`: the Objection is too vague, off-topic, or
  procedural to convert. Return `null` for `falsifiable_form` and
  explain in `reasoning`.

# Forbidden behaviours

- Do NOT silently rewrite the Objection. Your output is a PROPOSAL; the
  Objector decides whether to adopt it.
- Do NOT inject facts or sources that the Objection or target do not
  reference. If the conversion needs data, name the data source that
  WOULD settle the question, not values you fabricate.
- Do NOT moderate the Objection. Strong or critical Objections that
  name what would settle them are perfectly falsifiable; harsh tone is
  not a falsifiability concern.

# Input

Target ({{target.anchor_id}}, {{target.type}}): {{target.statement}}
Epistemic status of target: {{target.epistemic_status_tag}}

Objection ({{objection.anchor_id}}) by {{objection.author_handle}}:
{{objection.statement}}

{{#if previous_attempts}}
Previous conversion attempts (most recent first):
{{previous_attempts}}
{{/if}}

# Output

Output ONLY a JSON block matching the falsifiability_conversion v0.1.0
output schema. No other text.
```

### 1.6 Acceptance flow

Per parent spec §7 step 4 (admit-and-flag, do NOT block):

1. The Objection is *already in the record*, with `un-falsifiable` Mark if the conversion verdict is `conversion_proposed` or `unable_to_convert`.
2. The plugin's AgentReview row sits in `status: proposed`.
3. A Continuation is opened on the Objection with `intent: burton_conversion`, `agent: <Objector's github handle>`, `meta.cogentia.eligibleResumers: [{kind: "human", eligibility: "github:<Objector>"}, {kind: "human", eligibility: "role:reviewer"}]`.
4. The Objector (or a Reviewer) resolves the Continuation by:
   - **Accept conversion**: the converted_statement enters the record as a new contribution `cogentia/objection` with `responds_to: [<original_objection_id>]`. The original Objection keeps its `un-falsifiable` Mark; the new converted contribution does not carry the Mark.
   - **Reject conversion**: the AgentReview moves to `status: rejected`. The Objection stays in the record with its `un-falsifiable` Mark. No further automatic conversion attempts.
   - **Amend and accept**: the Objector edits the converted_statement before accepting; the edited version enters the record.

Re-running the plugin on an already-converted Objection is permitted; the second run carries the first's output in `previous_attempts` and is expected to produce `verdict: already_falsifiable`.

### 1.7 Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| LLM produces a "conversion" that adds substantive new claims to the Objection | Objector judgement | Objector rejects or amends. The bad output stays in the AgentReview history as a record. |
| LLM verdict `unable_to_convert` on a clearly convertible Objection | Objector tries a different conversational agent. | Plugin re-invocation is cheap; no cost beyond Objector's time. |
| LLM moderates / softens a strongly-worded Objection | Objector judgement | Rejected; the prompt's forbidden-behaviour clause is explicit about this. Repeated occurrences of the same agent doing this is a signal to switch agents. |
| LLM proposes fabricated data values | Failure mode of LLMs generally; prompt explicitly forbids it. | Rejected. Citation_validator can post-check fabricated sources. |
| Conversion is asked of an Objection on a `cogentia/manifest` Artifact | Inputs are valid but the target is a manifest section, not a Document node. | The plugin proceeds; falsifiability still applies to manifest claims. Edge case noted. |

---

## 2. `revision_proposer`

### 2.1 Job

Given an Objection (or a cluster of Objections from `objection_summariser`) and the Premise or Claim it targets, draft a candidate Revision patch against the literate form of the Document. The patch is a proposal — the Author or eligible Editor commits, edits, or rejects it. If committed (as a GitHub PR or direct commit), the Revision enters the formal graph through the standard §5.6 anchor-migration flow.

This is the plugin that closes the loop from objection to revised text. Without it, an Editor faces a blank page after `objection_summariser` produces a brief; with it, the Editor faces a starting draft.

### 2.2 Manifest

```yaml
id: cogentia.plugins.revision_proposer
version: 0.1.0
author: jeanhuguesrobert
contract_class: substantive
execution_model: llm-paste-bridge
target_kinds: [premise, claim, thesis]
acceptance_policy: human-gated
input_schema_uri: cogentia://schemas/revision_proposer/input.v0.1.0.json
output_schema_uri: cogentia://schemas/revision_proposer/output.v0.1.0.json
prompt_artifact_uri: cogentia://prompts/revision_proposer.v0.1.0.md
license: CC BY-SA 4.0
```

### 2.3 Inputs

```json
{
  "target": {
    "id": "<urn>",
    "type": "premise|claim|thesis",
    "anchor_id": "claim-corsican-yield",
    "statement": "<current statement of the target>",
    "source_span": { "start_line": 312, "end_line": 318 },
    "epistemic_status_tag": "operational proposal"
  },
  "literate_context": {
    "repo": "github.com/JeanHuguesRobert/marenostrum",
    "path": "ARCHITECTURE.md",
    "commit_sha": "abc1234",
    "surrounding_text": "<the source_span and ~10 lines before/after>"
  },
  "objections_to_address": [
    {
      "id": "<urn>",
      "anchor_id": "objection-37",
      "statement": "...",
      "falsifiability_form": "<populated, ideally>",
      "support_count": 3
    }
  ],
  "synthesis_hint": "<optional, from objection_summariser>",
  "proposer_constraints": {
    "preserve_anchor_id": true,            // §5.6 stability default
    "max_patch_lines": 40,
    "may_introduce_new_premises": false    // safer default; Author may set true
  }
}
```

### 2.4 Output schema

```json
{
  "cogentia_plugin": "cogentia.plugins.revision_proposer",
  "version": "0.1.0",
  "target_id": "<urn>",
  "verdict": "patch_proposed | objections_not_addressable_by_revision | scope_too_large",
  "proposed_patch": {
    "format": "unified_diff | replacement_text",
    "content": "<the patch text>",
    "rationale": "<one short paragraph: how this addresses each objection>"
  },
  "new_anchors_required": [                // empty unless may_introduce_new_premises=true
    { "type": "premise", "proposed_anchor_id": "premise-xyz", "statement": "..." }
  ],
  "objections_addressed": ["<id1>", "<id2>"],
  "objections_NOT_addressed": ["<id3>"],
  "reason_for_unaddressed": "<one sentence per unaddressed objection>",
  "confidence": "high | medium | low",
  "notes": "..."
}
```

### 2.5 Prompt template

The template at `cogentia/plugins/revision_proposer/prompt.v0.1.0.md`:

```markdown
You are a Revision drafter for Cogentia Commons. Your job is to propose
a patch against the literate form of a research Document that addresses
one or more open Objections against a target node (a Premise, Claim, or
Thesis). Your output is a PROPOSAL. An Author or eligible Editor will
review, possibly edit, and decide whether to commit it.

# Constraints

- Preserve the target's anchor_id ({{target.anchor_id}}). Do NOT propose
  a different anchor for the same logical node.
{{#if proposer_constraints.may_introduce_new_premises}}
- You MAY propose new Premises if the Revision requires them. List each
  in `new_anchors_required`.
{{else}}
- You may NOT introduce new Premises. If the Objections require a new
  Premise to be addressed, return `verdict: objections_not_addressable_by_revision`
  with a note explaining what new Premise(s) would be required.
{{/if}}
- Keep the patch to at most {{proposer_constraints.max_patch_lines}} lines.
  If the necessary change is larger, return `verdict: scope_too_large`
  with a note.
- Address as many of the listed Objections as the patch can defensibly
  address. List addressed and unaddressed Objections separately in the
  output. It is acceptable to address some and not others.

# What a good Revision proposal looks like

A good proposal:
- changes the literate text minimally to address the Objection(s);
- preserves the rest of the surrounding text verbatim where possible;
- updates `epistemic_status_tag` suggestions in the rationale if the
  change moves the target's confidence level (e.g. from "operational
  proposal" toward "contested" or "empirically grounded");
- explicitly explains, in the rationale, which Objection each substantive
  change responds to.

A bad proposal:
- rewrites the target from scratch;
- introduces claims not anchored in the Objections being addressed;
- changes the surrounding text without need;
- silently changes the anchor_id.

# Forbidden behaviours

- Do NOT fabricate citations. If the Revision needs a citation, refer to
  it by description ("a 2024 ADEME report on Corsican PV yields") rather
  than inventing a URL.
- Do NOT propose a Revision to the manifest, the COMMUNITY.md, or any
  meta-level Artifact. Your target is the literate Document only.
- Do NOT change anchor IDs that already exist in the literate form.

# Input

Target ({{target.anchor_id}}, {{target.type}}):
{{target.statement}}

Surrounding literate context (line {{literate_context.surrounding_text.start_line}} to
{{literate_context.surrounding_text.end_line}} of
{{literate_context.path}} at commit {{literate_context.commit_sha}}):
{{literate_context.surrounding_text}}

Objections to address:
{{#each objections_to_address}}
- ({{anchor_id}}, support: {{support_count}}): {{statement}}
  Falsifiability form: {{falsifiability_form}}
{{/each}}

{{#if synthesis_hint}}
Synthesis hint from objection_summariser: {{synthesis_hint}}
{{/if}}

# Output

Output ONLY a JSON block matching the revision_proposer v0.1.0 output
schema. The `proposed_patch.content` field MUST be either:
- a valid unified diff against the surrounding_text, or
- a replacement_text block clearly marked with the start/end line numbers
  it replaces.

No other text before or after the JSON.
```

### 2.6 Acceptance flow

1. AgentReview is created with `status: proposed`.
2. A Continuation is opened with `intent: revision_draft`, `agent: <Document Author's handle>`, `meta.cogentia.eligibleResumers` including the Author and any role:editor (per parent spec §4.4 default eligibility).
3. The first eligible claimant resolves the Continuation by:
   - **Accept**: the patch is applied as a commit to the GitHub repo (the resumer creates the commit; the platform does not write to git). The commit emits `cogentia.revision.committed`. The §5.6 anchor migration flow handles propagation to the formal graph.
   - **Edit and accept**: the resumer edits the patch text and then commits. The Author's final commit is what enters the record; the original AgentReview output remains visible.
   - **Reject**: AgentReview moves to `status: rejected`. The Objections stay open; another `revision_proposer` invocation can be attempted, possibly with a different agent or with different `proposer_constraints`.
4. The `out-of-eligibility` advisory rule (§5.7.6) applies: anyone can attempt to claim, but out-of-list claimants carry the `out-of-eligibility` Mark on the resulting Revision.

### 2.7 Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Patch addresses none of the Objections | LLM returns `verdict: objections_not_addressable_by_revision` honestly | Author considers whether new Premises are needed and re-runs with `may_introduce_new_premises: true`, or escalates to a separate `editor_synthesis` Continuation. |
| Patch silently widens scope | Author / Editor judgement | Reject; the AgentReview history records the over-reach. Try a different conversational agent. |
| Patch changes anchor_id | Output-schema validator catches; the validator MUST reject patches that mutate the target's `anchor_id` because the prompt forbade it. | Re-run; if persistent, drop the agent. |
| Patch is too large (exceeds `max_patch_lines`) | Validator catches via diff size. | The verdict should have been `scope_too_large`; if the LLM ignored the constraint, reject and re-run with stricter framing. |
| Patch introduces fabricated citations | Citation_validator post-check catches dead URLs; for fabricated bare references, Author judgement | Reject; the prompt is explicit about not fabricating. |
| Anchor-migration race: another Author commits a competing edit before this patch lands | §5.6 detects the conflict | The patch becomes part of a migration Continuation that the Author resolves. The plugin's output is not invalidated — it just becomes one input among others to the Author's migration decision. |

---

## 3. Common Acceptance Flow Recap

Both substantive plugins follow the parent spec §7 round mechanics with the human-gated path:

```
1. Plugin invoked via the paste-bridge UX (parent spec §7 step 2)
2. AgentReview row created with status=proposed
3. Output Artifact persisted (cogentia/plugin-output type)
4. Continuation opened on the target with agent=<human-resumer-handle>
5. Resumer accepts / amends / rejects
6. On accept (or amend-and-accept), the contribution enters the formal graph
7. AgentReview transitions to status=accepted | rejected
8. Plugin Continuation closes with resolution_kind = "resolved"
```

The COP §5.5 lifecycle (`active → resumed → resolved`) wraps every invocation. No agent-only resolution path exists — every substantive output passes through a human resumer.

---

## 4. Tests and Fixtures

Each plugin ships fixtures at `cogentia/plugins/<plugin_id>/fixtures/`:

### `falsifiability_conversion`

- `01_already_falsifiable.json` — Objection citing specific data; expected `verdict: already_falsifiable`.
- `02_pure_feeling.json` — "this seems unrealistic"; expected `conversion_proposed` with `asks_for: ["calculation"]`.
- `03_too_vague.json` — "I disagree"; expected `unable_to_convert`.
- `04_repeated_attempt.json` — second conversion run on a previously converted Objection; expected `already_falsifiable`.
- `05_strong_tone_falsifiable.json` — sharp tone but cites a specific calculation; expected `already_falsifiable` (not moderated).

### `revision_proposer`

- `01_single_objection_simple.json` — one Objection naming a citation; expected `patch_proposed` with the citation added.
- `02_multiple_objections_one_patch.json` — three Objections clusterable; expected patch addresses all three.
- `03_requires_new_premise.json` — Objection that needs a new supporting Premise; with `may_introduce_new_premises: false` expects `objections_not_addressable_by_revision`; with `true` expects `patch_proposed` + `new_anchors_required`.
- `04_scope_too_large.json` — Objection requiring substantial restructure; expected `scope_too_large`.
- `05_addresses_some_not_all.json` — three Objections, plugin addresses two and explains why one is not addressable.

CI runs each plugin against its fixtures with a mocked LLM (where the LLM output is replayed from a recorded session) and compares JSON output modulo timestamps and ordering.

---

## 5. Open Questions

1. **Falsifiability across translation.** A FR-language Objection on an EN-language Document, or vice versa, may have its falsifiability obscured by translation. v0.1.0 leaves the conversational agent to handle this; v0.2.0 may add an explicit `language_of_objection` field and translate-before-convert.
2. **Conversion chains.** If an Author repudiates a converted form, can a subsequent `falsifiability_conversion` invocation produce a *third* version that the original Objector accepts? v1 allows arbitrary re-invocation; v0.2.0 might cap to N attempts per Objection to prevent treadmilling.
3. **Revision_proposer with literate context truncation.** The 10-line surrounding context may be too narrow for large structural changes and too wide for cheap copy-edits. v0.2.0 should expose `context_lines` as a `proposer_constraints` field.
4. **Multi-file revisions.** A Revision that touches more than one Document or both the literate Document and the manifest is out of scope for v0.1.0. The plugin returns `scope_too_large` and the Author decomposes manually.
5. **Patch format ambiguity.** `format: "unified_diff"` vs `format: "replacement_text"` is a per-output choice. The Commons UI should normalise both to a common preview, but doesn't yet. v0.2.0 picks one.
6. **Revision-proposer interaction with citation_validator.** A Revision that adds a new URL should be validated before commit. v0.1.0 leaves this to the Author (paste, then run citation_validator manually); v0.2.0 might auto-invoke citation_validator on every `revision_proposer` patch before the human resumer sees it.
7. **`falsifiability_conversion` on Objections targeting `cogentia/manifest` Artifacts.** Manifest claims are themselves falsifiable in principle (e.g. "the moderator's ban policy is consistent with §1.1"). v0.1.0 supports this edge case but the prompt is not specifically tuned for it.

---

## 6. Relationship to Existing Artifacts

- [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) §6.3 — names these two plugins as the substantive non-kernel members of the v1 baseline. §7 (round mechanics) describes the paste-bridge flow they share with `kernel_extractor`.
- [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md) — the substantive plugin that bootstraps the kernel; these two operate on the result.
- [`cogentia_commons_structural_plugins.md`](cogentia_commons_structural_plugins.md) — `objection_summariser` produces the input that `revision_proposer` ideally consumes via its `synthesis_hint` field.
- [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) Rule 2 — the doctrinal source of `falsifiability_conversion`. The plugin's prompt is partly a quotation of the rule.
- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §4.4 (multi-agent critique loop) — these are the substantive members of that loop.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) §10.3.4 (Continuations as first-class cognition) — the COP/AI semantics under which substantive plugin output is held pending acceptance.

---

## 7. License

This sub-specification (prose, prompt templates, schemas): **CC BY-SA 4.0**.
JSON Schema files, fixtures, and reference implementations: **MIT**.

---

*Premier commit : 2026-05-12 — Corte. Sub-spec draft v0.1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia](../COGENTIA.md)
- [Research Index — Cogentia](index.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — `kernel_extractor` Plugin Sub-Specification](cogentia_commons_kernel_extractor.md)
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md)
- [Cogentia Commons: A Platform Architecture for Collaborative Possibility Exploration Under Scientific Constraint](Cogentia_Commons_Working_Paper.md)

<!-- END_AUTO: backlinks -->
