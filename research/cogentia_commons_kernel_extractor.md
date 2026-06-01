---
title: "Cogentia Commons — `kernel_extractor` Plugin Sub-Specification"
description: "Bootstrap plugin that converts a literate Document into the initial Thesis / Premise / Claim / Constraint formal graph"
layout: default
nav_order: 7
version: "draft-0.1"
last_modified_at: 2026-05-12
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text + prompt template), MIT (schema and tooling)"
status: "working-paper"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_kernel_extractor.md
last_stamped_at: 2026-06-01
date: "2026-05-13"
---

# Cogentia Commons — `kernel_extractor` Plugin Sub-Specification

*Sub-specification of [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) §6.3. The parent spec lists `kernel_extractor` as the first of six v1 baseline audit plugins and flags it as the one warranting its own sub-spec. This document is that sub-spec.*

---

## 0. Preamble

A Document arrives in Cogentia Commons as a markdown file in an Author's GitHub repository. The platform cannot operate on it as text alone — every downstream primitive (Thesis Kernel views, Objections on specific Premises, anchor-based migrations, `cogentia://` URIs) requires a *formal graph* sitting underneath the literate form, with stable per-node anchors tying the two together.

`kernel_extractor` is the plugin that builds that initial graph. It reads the literate text, proposes a Thesis, a set of Premises, a set of Claims, and any explicit Constraints, with anchor IDs and source spans. The Author then accepts, edits, or rejects each proposal. The accepted set is the Document's initial kernel.

The plugin is **substantive** (per parent spec §6.2): its proposals carry meaning, not just structure. The AgentReview row sits in `status=proposed` until the Author resolves it; there is no auto-apply path. Even an obviously-correct proposal goes through the human acceptance step, because the anchor IDs assigned at acceptance time become permanent components of `cogentia://` URIs and outlive the document.

This sub-spec exists because the plugin is the most ambitious of the six baselines: it converts prose into doctrine-bound formal entities, it picks identifiers that bake themselves into permanent URLs, and it has to coexist with hand-written anchors already present in the existing corpus. Getting it wrong costs more than getting any other plugin wrong.

---

## 1. Job and Scope

### 1.1 What the plugin does

- Reads a single literate Document.
- Proposes exactly one Thesis, *N* Premises, *M* Claims, and *K* Constraints (optional).
- For each proposed node: produces an anchor ID, a source span (line range in the literate form), a statement, a suggested `epistemic_status_tag`, and a confidence/ambiguity note.
- Preserves any hand-written anchors found in the source.
- Operates in two modes: **first-run** (no existing kernel) and **delta-mode** (existing kernel, document edited).

### 1.2 What the plugin does NOT do

- Does not commit anything to GitHub.
- Does not write to Supabase. Per parent spec §5.7.7, plugins have no Supabase write credentials; the platform's Event-emission layer converts an accepted proposal into Artifacts.
- Does not invent content. Every proposed statement MUST cite a `source_span` in the literate form. Hallucinations are detectable by the Author and the `citation_validator` plugin can post-check that source_span ranges actually contain text matching the statement.
- Does not classify into epistemic statuses it isn't asked to. The `epistemic_status_tag` field is a *suggestion* drawn from the parent spec's enum (§5.1 + Working Paper §4.1); the Author overrides freely.
- Does not run on every commit. It runs at first kernel extraction and on explicit Author re-extraction requests. Normal edits are handled by §5.6 anchor migration, not by re-running this plugin.

---

## 2. Plugin Manifest

```yaml
id: cogentia.plugins.kernel_extractor
version: 0.1.0
author: jeanhuguesrobert
contract_class: substantive            # parent spec §6.2; always human-gated
target_kinds: [document]
acceptance_policy: human-gated
input_schema_uri: cogentia://schemas/kernel_extractor/input.v0.1.0.json
output_schema_uri: cogentia://schemas/kernel_extractor/output.v0.1.0.json
prompt_artifact_uri: cogentia://prompts/kernel_extractor.v0.1.0.md
license: CC BY-SA 4.0
```

The plugin manifest is committed as `cogentia/plugins/kernel_extractor/manifest.v0.1.0.yaml` in the meta-node `cogentia` repository. Versioned by git tag. A community manifest pins the exact version it accepts (parent spec §4.1 plugin allow-list).

---

## 3. Inputs

The plugin is invoked with a JSON input object:

```json
{
  "mode": "first_run | delta",
  "document": {
    "documentId": "<urn>",
    "communityId": "<slug>",
    "repo": "github.com/JeanHuguesRobert/barons-Mariani",
    "path": "research/second_method.md",
    "commitSha": "abc1234",
    "literateContent": "<full markdown source of the document>",
    "existingAnchors": [
      { "id": "rule-0", "source": "preexisting", "line": 144 },
      { "id": "claim-3", "source": "preexisting", "line": 439 }
    ]
  },
  "existingKernel": {
    "thesis": { "anchor_id": "thesis-anti-capture", ... } | null,
    "premises": [ ... ],
    "claims": [ ... ],
    "constraints": [ ... ]
  } | null,
  "diff": {
    "previousCommitSha": "deadbee",
    "newCommitSha": "abc1234",
    "unified_diff": "<unified diff text>"
  } | null
}
```

**Per-mode requirements:**

- `mode: first_run` → `existingKernel: null`, `diff: null`. The plugin proposes a complete kernel from scratch.
- `mode: delta` → `existingKernel` MUST be non-null. `diff` SHOULD be non-null; if absent, the plugin computes a synthetic diff against the kernel's recorded source spans.

The `literateContent` field carries the *full* markdown source. Practical limit: ~50 KB per invocation; longer documents trigger a fragmentation strategy outside the scope of this sub-spec (open question §15.4).

---

## 4. Output JSON Schema

The plugin returns a single JSON block, extractable by the same regex Commons uses for the personal app (parent spec §7 step 2.d):

```
```json
{ "cogentia_plugin": "cogentia.plugins.kernel_extractor", ... }
```
```

### 4.1 Top-level structure

```json
{
  "cogentia_plugin": "cogentia.plugins.kernel_extractor",
  "version": "0.1.0",
  "mode": "first_run | delta",
  "thesis": <ThesisProposal> | null,
  "premises": [<PremiseProposal>],
  "claims": [<ClaimProposal>],
  "constraints": [<ConstraintProposal>],
  "notes": "<free-text, optional>",
  "ambiguous_passages": [
    {
      "source_span": { "start_line": 88, "end_line": 91 },
      "candidate_types": ["premise", "claim"],
      "reason": "Phrased normatively (\"must\") but appears in the conclusion section."
    }
  ]
}
```

### 4.2 Node proposal shapes

Every node proposal has the same envelope:

```json
{
  "proposal_kind": "create | edit-text | deprecate | split | merge",
  "anchor_id": "<kebab-case slug, §5.1>",
  "anchor_source": "preexisting | generated",
  "statement": "<verbatim or lightly normalised from source>",
  "source_span": { "start_line": <int>, "end_line": <int> },
  "epistemic_status_tag": "<one of parent §5.1 enum>",
  "confidence": "high | medium | low",
  "note": "<free-text, optional, e.g. genre ambiguity>"
}
```

**Per-mode `proposal_kind` rules:**

- `mode: first_run` → all proposals MUST have `proposal_kind: "create"`.
- `mode: delta` → proposals MAY take any kind. Edit-text proposals MUST include a `previous_anchor_id`. Deprecate/split/merge MUST include `replaces: [<anchor_id>]`.

### 4.3 Thesis proposal — additional fields

A Thesis carries two extra fields not present on Premise / Claim / Constraint:

```json
{
  "core_question": "<the question the Thesis is an answer to>",
  "expected_audiences": ["researchers", "civic institutions", "..."]
}
```

These mirror the Working Paper §4.1 + the existing `apps/commons/src/lib/mockData.js` Thesis shape. They are optional — if the literate form does not state a core question or audience, the plugin omits them.

### 4.4 What the plugin MUST NOT emit

- Anchor IDs containing characters outside `[a-z0-9-]` (§5.1).
- `source_span` ranges that do not exist in `literateContent` (validation: end_line ≤ total line count).
- Statements not anchored to a source_span.
- Proposals for entity types other than the four named (no AgentReview, Objection, Revision, Support — those are emitted by other plugins or by humans).

---

## 5. Anchor ID Generation Strategy

Anchor IDs are the single most consequential thing the plugin produces, because they appear in `cogentia://<community>/<commit>/<anchor>` URIs (parent spec §8) and are carried in citations forever. The strategy is therefore conservative.

### 5.1 Format

```
<type>-<semantic-slug>[-<disambiguator>]
```

- `<type>` is one of `thesis | premise | claim | constraint`.
- `<semantic-slug>` is derived from 2–5 significant words of the statement, lowercased, hyphen-separated, stop-words removed. Examples: `mortality-under-governance`, `corsican-solar-yield`, `anti-capture`.
- `<disambiguator>` is appended only when slug collision occurs within the same Document. Format: `-2`, `-3`. The first occurrence has no disambiguator.

Length cap: 60 characters total (URN-friendly). If the slug would exceed, the plugin truncates at the last word boundary.

Allowed character set: `[a-z0-9-]`. No underscores, no slashes, no Unicode. ASCII for URI stability.

### 5.2 Slug derivation rules

1. Take the statement.
2. Strip markdown formatting and punctuation.
3. Lowercase.
4. Remove stop words (a curated list shipped with the plugin manifest — articles, prepositions, common verbs).
5. Take the first 2–5 remaining words that, joined, sit under the length cap.
6. Hyphenate.

For ambiguous statements, prefer **distinctive** words over **frequent** ones. The slug `claim-anti-capture` is better than `claim-the-system` because "anti-capture" is the part a future reader will recognise.

### 5.3 Stability under edits

Once an anchor ID is **accepted** by the Author, it is **locked** for the life of the Document. §5.6 anchor migration handles edits to the underlying statement: an *Edited* anchor keeps its ID, its statement text moves with it, the anchor never re-derives. This means the `kernel_extractor` plugin generates slugs *for proposal only*; the slug becomes stable through Author acceptance, not through any property of the source text.

### 5.4 Type prefix is mandatory

The type prefix (`thesis-`, `premise-`, `claim-`, `constraint-`) is part of the anchor ID, not metadata. This makes URIs self-describing and prevents collisions between, say, a Premise and a Claim that share a slug.

### 5.5 What about hand-written anchors?

When the literate form already contains `{#X}` anchors, the plugin's job is to *adopt* them. See §7.

---

## 6. Genre Disambiguation — Operational Rules

The Working Paper §4.1 distinguishes Thesis / Premise / Claim / Constraint conceptually. The `kernel_extractor` prompt has to apply those distinctions to real prose. The operational rules below are the prompt's working definitions.

### 6.1 Thesis (exactly one per Document)

The Document's *central assertion* — the thing the whole text exists to argue for or examine. Identification cues:

- Explicit framing: "this paper proposes…", "I argue that…", "the central claim is…", "this document advances the hypothesis that…".
- Position: typically in the abstract, the opening, and re-stated in the conclusion.
- Scope: covers the document, not a single section.

If the Document has no explicit Thesis (e.g. a survey paper), the plugin returns `thesis: null` and notes this. The Author then declares it manually.

### 6.2 Premise

An *assumption the Document rests on*. The Document does not itself prove a Premise; it builds on it. Identification cues:

- Phrasing: "we take as given…", "assume…", "let us suppose…", "given that…", normative "X must Y" framings.
- Position: typically near the beginning of a section or as section openers.
- Falsifiability: a Premise CAN be challenged externally, but the Document treats it as background.

A Premise is distinct from a Claim because the *Document does not produce evidence for the Premise within its own text*; it imports it.

### 6.3 Claim

An assertion the Document *makes*, with reasoning or evidence presented inside the text. Identification cues:

- Phrasing: "therefore…", "we show that…", "the result is…", "this implies…", or simply declarative statements that the surrounding text supports.
- Position: anywhere — Claims accumulate through the body.
- Falsifiability: a Claim is typically more directly testable than a Premise within the document's frame.

The Working Paper §5.1 defines Claim as "derivative assertion downstream of one or more Theses." Operationally: if you remove the Premises, the Claim falls.

### 6.4 Constraint (optional)

An *explicit condition* the Thesis or a Claim must satisfy to be non-trivial. Identification cues:

- Phrasing: "must not violate…", "requires that…", "is only meaningful when…".
- Frequency: rare. Most Documents have zero or one. Constraints appear in formal arguments, less so in narrative papers.

### 6.5 When the plugin is uncertain

Every ambiguous passage MUST appear in the top-level `ambiguous_passages` array with at least two `candidate_types` and a `reason`. The plugin SHOULD make a tentative choice in the main proposal list (with `confidence: "low"`) and flag it. The Author resolves.

### 6.6 Forbidden: extracting non-existent structure

If a Document is a narrative essay with no formal Thesis/Premise/Claim structure (a manifesto, a letter, a meditation), the plugin SHOULD return mostly empty lists and a `notes` field explaining that the Document's genre does not support formal extraction. Forcing a kernel on text that resists it produces noise the Author then has to clean up.

---

## 7. Hand-Written Anchor Preservation

### 7.1 Detection

The plugin scans for the markdown anchor patterns already in use across the corpus:

- `## Heading text {#anchor-id}` (next to a heading)
- `*statement* {#anchor-id}` (inline, in [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) Rule 0–4 style)
- `**Bold lead** {#anchor-id} — rest of text`

Any string matching `\{#[a-z0-9-]+\}` is collected into `existingAnchors` (the platform pre-populates this, but the plugin verifies).

### 7.2 Adoption

For every detected anchor:

- The plugin USES the existing anchor ID. It does not propose a competing name.
- The proposal's `anchor_source` is set to `"preexisting"`.
- The plugin determines the node type from context (heading? inline-in-rule? inline-in-claim?) and the existing prefix convention if any (e.g. `rule-0` reads as a Constraint or Claim depending on phrasing).
- If the existing anchor has a type prefix the plugin would have used (`claim-`, `premise-`), the plugin honours it. If the existing prefix is different (`rule-`, `lemma-`), the plugin keeps the existing prefix.

### 7.3 What if a hand-written anchor is wrong?

The plugin does not relabel it. The Author can rename at acceptance time, but the proposal preserves what the Author wrote.

### 7.4 What if a generated slug collides with a hand-written one?

The hand-written wins. The plugin appends `-2` (or higher) to its generated slug.

---

## 8. First-Run vs Delta Mode

### 8.1 First-run

- `existingKernel: null`, `diff: null`.
- All proposals are `proposal_kind: "create"`.
- The plugin processes the entire `literateContent` end to end.
- Output is a complete proposal that, on acceptance, becomes the Document's initial kernel.

This is the easy mode. It runs once per Document, when the Author first registers the Document with Commons.

### 8.2 Delta-mode

- `existingKernel` is non-null.
- `diff` SHOULD be non-null (unified diff between previous and current commit).
- The plugin's job: identify which existing kernel nodes are still valid, which need text re-anchoring, which are deprecated, and which new content warrants new nodes.

Per-kind output:

- **`create`** — new node identified in the new content; no counterpart in `existingKernel`.
- **`edit-text`** — existing node's statement should change to track the literate edit. The plugin returns the new statement; the anchor ID stays the same; `previous_anchor_id` is set to the unchanged ID (for sanity-check by the validator).
- **`deprecate`** — existing node's source content has been removed. The plugin proposes deprecation; the Author confirms or restores.
- **`split`** — one existing node should become two. The plugin returns two new node proposals (with new anchor IDs) and `replaces: [<old anchor_id>]`.
- **`merge`** — two existing nodes should collapse into one. The plugin returns one new node proposal and `replaces: [<old_id_1>, <old_id_2>]`.

### 8.3 Coordination with §5.6 anchor migration

Delta-mode is invoked **only when the Author explicitly requests re-extraction**. Normal edits are handled by §5.6's anchor migration, which is a lighter-weight diff over anchor IDs alone. The kernel_extractor's delta-mode kicks in when the Author has substantially restructured the literate form and the §5.6 migration's output is largely "split/merge — author should decide" cases.

When delta-mode runs, the resulting acceptance Continuation is **disjoint** from any open §5.6 migration Continuation. The Author should resolve the migration first, then run delta-mode re-extraction against the new confirmed commit. The two Continuations should not race.

### 8.4 What delta-mode does NOT do

- Does not propose changes to anchor IDs of nodes that are merely re-anchored (text moved in the file but content unchanged). Those are §5.6's job.
- Does not produce a fresh proposal for the entire kernel. Delta-mode output is *just* the delta. Authors who want a fresh proposal switch to first-run mode (deleting the existing kernel first).

---

## 9. The Prompt Template

The plugin's prompt template is rendered with placeholders bound to the input object, then the rendered prompt is what the Author copies into a conversational agent.

The template below is the v0.1.0 prompt. It lives at `cogentia/plugins/kernel_extractor/prompt.v0.1.0.md` in the meta-node repo.

```markdown
You are a kernel-extraction reviewer for Cogentia Commons. Your task is to
read the literate form of a research Document and propose its formal
kernel: a Thesis Kernel, the Premises it rests on, the Claims it makes,
and any explicit Constraints. The Author of the Document will accept,
edit, or reject your proposal — your output is a proposal, not an
authoritative parse.

# Definitions you MUST apply

- **Thesis** (exactly one per Document, or none if the Document does not
  argue a central claim). The Document's central assertion. Look for
  explicit framings: "this paper proposes", "I argue that", "the central
  claim is". A Thesis covers the whole Document, not a section.

- **Premise**. An assumption the Document RESTS ON. The Document does
  not itself prove a Premise within its text; it builds on it. Look for:
  "we take as given", "assume", "let us suppose", normative "X must Y"
  framings, or section-opener statements that go undefended in the same
  section.

- **Claim**. An assertion the Document MAKES. The text supports the Claim
  with reasoning or evidence. Look for: "therefore", "we show that",
  "this implies", declarative statements supported by the surrounding
  paragraphs. A Claim is downstream of one or more Premises.

- **Constraint** (optional, often absent). An explicit condition that
  the Thesis or a Claim MUST satisfy to be non-trivial. Look for: "must
  not violate", "requires that", "is only meaningful when".

# Anchor ID rules — these are part of permanent URIs

Each node you propose MUST carry an `anchor_id` of the form:

    <type>-<semantic-slug>

Where:
- `<type>` is one of `thesis`, `premise`, `claim`, `constraint`.
- `<semantic-slug>` is 2 to 5 significant lowercase words from the
  statement, hyphen-separated, stop-words removed. Prefer distinctive
  words over frequent ones.
- Length cap: 60 characters total.
- Allowed characters: `[a-z0-9-]` only.

If the literate text already contains `{#some-anchor}` near the statement
you are proposing, USE that anchor — do not invent a competing name. Set
`anchor_source: "preexisting"` in the output.

# Source spans — every proposal must cite its location

Each node you propose MUST carry a `source_span: {start_line, end_line}`
pointing to where the statement appears in the literate form. Line
numbers are 1-indexed and refer to the `literateContent` string provided
in the input. If you cannot identify a precise source span, do NOT
propose the node.

# Mode-specific rules

You are running in mode: **{{mode}}**.

{{#if mode == "first_run"}}
This is the Document's first kernel extraction. Propose a complete kernel
from scratch. Every proposal carries `proposal_kind: "create"`.
{{else}}
This is a delta-mode re-extraction. The existing kernel is provided in
the input under `existingKernel`. The literate diff between the previous
and current commit is provided under `diff`. Your job is to produce only
the changes against the existing kernel:
- `create` for newly-identified nodes,
- `edit-text` for existing nodes whose statement should change,
- `deprecate` for nodes whose source has been removed,
- `split` for one node becoming several,
- `merge` for several nodes collapsing into one.
Do NOT re-propose nodes that are unchanged.
{{/if}}

# Ambiguity handling

If a passage could reasonably be a Premise or a Claim (or any other
type pair), do BOTH of the following:
1. Make a tentative choice in the main proposal list, with
   `confidence: "low"` and a `note` explaining the ambiguity.
2. Add an entry to the top-level `ambiguous_passages` array with the
   source span, the candidate types, and your reasoning.

# Forbidden behaviours

- Do NOT invent content. Every statement MUST trace to a source_span.
- Do NOT force a kernel on text that resists formal extraction. If the
  Document is a narrative essay, a manifesto, or a letter without a
  formal argumentative structure, return mostly-empty lists with a
  `notes` field explaining why.
- Do NOT propose anchor IDs containing characters outside `[a-z0-9-]`.
- Do NOT propose source spans that do not exist in `literateContent`.

# Input

Document path: {{document.path}}
Commit SHA: {{document.commitSha}}
Existing anchors: {{document.existingAnchors}}

{{#if existingKernel}}
Existing kernel:
{{existingKernel}}
{{/if}}

{{#if diff}}
Literate diff:
{{diff.unified_diff}}
{{/if}}

Literate content (line-numbered):
{{document.literateContent_with_line_numbers}}

# Output

Output ONLY a single JSON block matching the kernel_extractor v0.1.0
output schema. No other text before or after.

```json
{
  "cogentia_plugin": "cogentia.plugins.kernel_extractor",
  "version": "0.1.0",
  "mode": "{{mode}}",
  "thesis": { ... } | null,
  "premises": [ ... ],
  "claims": [ ... ],
  "constraints": [ ... ],
  "notes": "...",
  "ambiguous_passages": [ ... ]
}
```
```

The template uses Mustache-style `{{...}}` placeholders. The Commons frontend renders the template against the input before showing the "Copy" button.

---

## 10. Acceptance Flow

### 10.1 What the Author sees

After pasting the agent's response, the Commons UI parses the JSON block and presents:

- A summary header: "Proposed kernel: 1 Thesis, *N* Premises, *M* Claims, *K* Constraints, *P* ambiguous passages."
- A scrollable list of proposals. Each row shows: proposed type, anchor ID, statement (truncated, expandable to source_span), `confidence`, `note`.
- Per-row controls: **Accept** / **Edit** / **Reject**. Editing opens a form for: statement, anchor_id, epistemic_status_tag, source_span.
- The `ambiguous_passages` list is surfaced separately with a "review" badge.
- A bulk **Accept all** button at the bottom for confident first runs.

### 10.2 What happens on Accept

- A `cogentia.kernel.accepted` Event is emitted.
- For each accepted proposal, the platform creates the corresponding `cogentia/thesis | premise | claim | constraint` Artifact (parent spec §5.7.5).
- The Author's commit SHA at acceptance time is recorded on every new Artifact.
- The AgentReview row for this `kernel_extractor` invocation transitions from `proposed` to `accepted`.

### 10.3 What happens on Edit

The edited proposal is treated as accepted with modifications. Both the original plugin output and the Author's edits are recorded in the AgentReview Artifact's `raw_agent_output` and `extracted_json` fields respectively. The Author's edits constitute the new state.

### 10.4 What happens on Reject

The proposal is dropped. The AgentReview row carries the reject decision; the plugin output remains in the Event log forever (immutable per COP §2.6) as a record of what was proposed and what the Author chose not to accept.

### 10.5 Partial acceptance

The Author may accept some proposals, edit others, and reject still others in a single resolution. The Continuation closes only when every proposal has been disposed of (accepted, edited, or rejected).

---

## 11. Interaction with §5.6 Anchor Migration

### 11.1 Normal edits — handled by §5.6, NOT by this plugin

When the Author commits an edit that moves anchors around — same anchor IDs, different surrounding text — the §5.6 anchor migration protocol handles it directly. `kernel_extractor` is NOT invoked.

### 11.2 Substantial restructure — Author chooses

When the Author commits a substantial restructure (sections renamed, new anchors needed, old anchors no longer apply), the §5.6 migration will surface many *Split / Merge / Removed* cases. The Author may:

- Resolve the §5.6 migration manually, anchor-by-anchor.
- OR resolve the §5.6 migration as much as possible, then invoke `kernel_extractor` in delta-mode against the new confirmed commit to propose new structure for the parts the migration could not resolve cleanly.

The two paths are not exclusive. Most Authors will use both for any substantial restructure: §5.6 for the parts where the diff is mechanical, `kernel_extractor` delta-mode for the parts where the diff is semantic.

### 11.3 First-time registration of an existing-with-anchors document

A Document like [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) already has hand-written `{#rule-0}`, `{#claim-3}` anchors. On first-run extraction, the plugin adopts these (per §7) and proposes the rest. The output mixes `anchor_source: "preexisting"` and `anchor_source: "generated"`. The Author confirms or renames.

---

## 12. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Agent produces no JSON block | The paste-bridge extractor (parent §7) returns empty. | The Author re-runs the plugin (possibly with a different conversational agent). The AgentReview row carries `status=failed` and the raw response. |
| Agent produces malformed JSON | Schema validator rejects on parse. | Same as above. |
| Agent proposes anchor IDs with forbidden characters | Schema validator rejects on character set. | Author edits the offending IDs at acceptance, or rejects and re-runs. |
| Agent over-extracts (50 Premises in a short doc) | Author judgement. | Author rejects most, keeps few, or re-runs with a different agent. The over-extraction is in the Event log; it costs nothing irreversible. |
| Agent invents content not in the source | Author judgement; the `source_span` is the audit field. `citation_validator` plugin can post-check that the cited span actually contains text matching the statement. | Author rejects fabricated proposals. Pattern of fabrication is grounds to drop the agent from personal practice — not a community policy concern. |
| Agent invents source spans that do not exist | Output-schema validator rejects (end_line > total_lines). | Author re-runs. |
| Agent operates in the wrong mode (returns `create` proposals in delta mode) | Output-schema validator catches `proposal_kind: "create"` with no missing-anchor justification. | Author re-runs. |
| Delta-mode invoked without `existingKernel` | Input-schema validator rejects before invocation. | Commons UI guards against this; the failure is a platform bug, not a plugin failure. |

Per parent spec §1.1, the costs of any of these are entirely reputational (the agent didn't perform) plus the Author's time. Nothing is irreversibly written.

---

## 13. Tests and Fixtures

The plugin SHIPS with a fixture directory at `cogentia/plugins/kernel_extractor/fixtures/`:

- `01_simple_essay.md` — a small Document with one Thesis, three Premises, two Claims. Reference output: `01_simple_essay.expected.json`.
- `02_second_method_excerpt.md` — a portion of the real [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) including hand-written anchors. Tests adoption (§7).
- `03_narrative_letter.md` — a Document that should produce mostly empty lists with a `notes` explanation (§6.6 forbidden behaviour).
- `04_delta_simple_edit.md` + `04_existing_kernel.json` + `04_diff.patch` — a delta-mode invocation where one Premise's text is updated. Expected: a single `edit-text` proposal.
- `05_delta_split.md` + similar — delta-mode where one Premise should split into two.
- `06_delta_substantial_restructure.md` — delta-mode where the kernel needs major rework; tests the §11.2 coordination story.

Each fixture is paired with an expected output. The plugin's reference implementation runs against the fixtures in CI and SHOULD produce outputs that match the expected JSON modulo (a) statement wording details, (b) ordering of equally-valid proposals.

Per the `cogentia.js doctrinal status` posture (memory), fixtures for any doctrinally-load-bearing plugin ship from day one of its release.

---

## 14. Reference Implementation Notes (non-normative)

- The plugin is a stateless function. Inputs in, JSON out. No I/O during invocation.
- The line-numbered rendering of `literateContent` (used in the prompt) is a pre-processing step done by the Commons UI before rendering the template.
- The stop-word list lives at `cogentia/plugins/kernel_extractor/stopwords.v0.1.0.txt`. ASCII English for v0.1.0; bilingual EN/FR for v0.2.0 (open question §15.3).
- The schema files (`input.v0.1.0.json`, `output.v0.1.0.json`) are JSON Schema draft 2020-12.
- The plugin's "agent" in the COP §2.7 sense is the human user pasting the prompt into a conversational AI. The COP Continuation that wraps a `kernel_extractor` invocation has `agent: "<user_github_handle>"`, not the name of the LLM. The LLM is a tool the human invokes, not a COP Agent.

---

## 15. Open Questions

1. **Per-section vs whole-document extraction.** Long Documents (>50 KB) exceed comfortable prompt sizes. v0.1.0 says "outside scope"; v0.2.0 needs a fragmentation strategy. Candidate: per-section extraction with explicit cross-section linkage in a synthesis pass.
2. **Multiple-Thesis Documents.** Some Documents argue several theses. v0.1.0 says "exactly one or none." A Document with two co-equal theses is a v0.2.0 concern; the practical workaround in v0.1.0 is to split into two Documents.
3. **Bilingual extraction.** The doctrine is bilingual (FR/EN). [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) mixes both. v0.1.0 ships an English stop-word list; v0.2.0 should detect language per section.
4. **Confidence calibration.** The plugin emits `confidence: high | medium | low` qualitatively. There is no calibration. Authors who have run it many times will develop a sense for what `medium` means from each LLM. A future version might quantify, but the qualitative form is more honest in v0.1.0.
5. **Hand-written anchor variant conventions.** The corpus uses `{#claim-X}`, `{#rule-X}`, `{#premise-X}` interchangeably across documents. The plugin adopts whatever it finds. A future tightening might standardise; for v0.1.0, plurality is preserved.
6. **Re-extraction discipline.** The plugin's delta-mode and §5.6's anchor migration are formally distinct, but in practice an Author may invoke them in confusing combinations. v0.2.0 should specify an Author-facing UX that makes the difference between "small edits — let §5.6 handle it" and "big restructure — run delta-mode after migration settles" explicit and visible.

---

## 16. Relationship to Existing Artifacts

- [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) — parent spec. This sub-spec implements §6.3 baseline plugin `kernel_extractor` and resolves the §14 open question.
- [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) — community manifest pins the plugin version per §2 of that sub-spec.
- [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — source of Rule 2 (objections must be falsifiable) and the doctrine the plugin's Premise / Claim distinctions enforce.
- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §4.1 — the conceptual Thesis Kernel formulation that the plugin operationalises.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) — the COP/AI profile §10.3.4 ("Continuations as first-class cognition") under which the plugin's invocation, deferred-acceptance, and re-extraction Continuations live.
- `apps/personal/src/pages/Submit.jsx` — the paste-bridge UX pattern this plugin reuses. The JSON extraction regex on the user side is identical.

---

## 17. License

This sub-specification (prose, prompt template, schemas in tabular form): **CC BY-SA 4.0**.
The plugin's input/output JSON Schema files, fixtures, and any reference implementation code: **MIT**.

---

*Premier commit : 2026-05-12 — Corte. Sub-spec draft v0.1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia Commons — COMMUNITY.md Sub-Specification](cogentia_commons_community_manifest.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md)
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md)
- [Cogentia Commons — Substantive Plugin Sub-Specifications](cogentia_commons_substantive_plugins.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Cogentia Commons: A Platform Architecture for Collaborative Possibility Exploration Under Scientific Constraint](Cogentia_Commons_Working_Paper.md)
- [Concept Index — cogentia](concepts.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
