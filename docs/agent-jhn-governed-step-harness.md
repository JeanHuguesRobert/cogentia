---
title: Agent JHN Governed Step Harness
author: Codex
date: '2026-08-10'
language: en
document_role: source
document_kind: technical-design
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  derived_from:
    - scripts/lib/agent-jhn-whatsapp/answer-core.js
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Agent JHN Governed Step Harness

## Stable abstraction

The stable orchestration abstraction is the **step**, not a separate planner.
A replaceable reasoner proposes the next step from the turn state, available
capabilities, previous observations, and remaining bounds. The deterministic
harness does not choose a capability on the reasoner's behalf.

```text
reasoner.nextStep(state)
  -> proposed agent_step
  -> deterministic authorization and bounds
  -> capability execution or terminal handling
  -> step_result
  -> next state
```

The reasoner may be an LLM, a deterministic procedure, another agent, or a
future implementation. That choice does not change the step protocol.

## Protocols

Proposed steps use `cogentia.agent_step/v1`. Results use
`cogentia.step_result/v1`.

Supported step kinds:

- `reason`: record a bounded reasoning transition without a capability call;
- `capability_call`: invoke a registered tool, skill, MCP connector, or model;
- `answer`: submit a candidate answer to review;
- `clarify`: stop and request necessary human input;
- `stop`: terminate explicitly without an answer.

Capabilities have a uniform public description regardless of implementation:

- name and description;
- input schema;
- implementation kind (`tool`, `skill`, `mcp`, or `model`);
- risk (`read_only` or `external_write`);
- cost units.

Registration describes availability. It never grants authorization.

## Deterministic kernel

The harness retains deterministic control over:

- authorization envelopes;
- explicit confirmation for external writes;
- step, capability-call, time, and cost bounds;
- capability name and schema boundaries;
- result status and trace structure;
- secret-safe diagnostics;
- terminal clarification and stopping.

The reasoner retains cognitive control over which authorized capability to
mobilize, in which order, and when enough evidence exists to answer.

## Current boundary

`scripts/lib/agent-jhn-whatsapp/governed-harness.js` implements the portable
kernel and deterministic tests. It does not yet connect an LLM reasoner or MCP
adapter to the WhatsApp runtime. That integration is a later adapter milestone,
not part of the protocol itself.

`scripts/lib/agent-jhn-whatsapp/openai-step-reasoner.js` is the first concrete
reasoner adapter. It asks a model for exactly one JSON step and never executes
that step itself. Capability results are private by default and become visible
to an external reasoner only when the capability explicitly declares

`scripts/lib/agent-jhn-whatsapp/guide-step-capability.js` is the first
read-only capability adapter. It exposes normalized public Guide evidence as
`corpus.search`. The complete isolated loop is now testable as reasoner step →
Guide capability → reasoner-visible public observation → answer step, without
changing the production WhatsApp path.

## Open-Possible check

Current frame: a reasoner mobilizes uniformly described capabilities while a
deterministic kernel controls authority and bounds. The implementation kind is
not an invariant: tools, skills, MCP connectors, models, and future executors
can share the same step contract.

Preserved residue: result visibility is currently whole-result and binary
(`private` or `reasoner`). Field-level disclosure envelopes may later preserve
more useful evidence without exposing an entire capability result. This is
unsupported now, not impossible under the protocol.

Small Booster / Reality test: the cached-public-Guide smoke loop verifies the
full reasoner → capability → observation → answer transition without deploying
or enabling a WhatsApp-side tool. Its successful trace justifies proceeding to
runtime integration while keeping that integration independently reversible.
`resultVisibility: reasoner`.

## Historical Reality tests — August 2026 (reconciled from ThinkPad)

The ThinkPad's detached historical work was **four unique commits** ending at
`713997ab879a6a26d42f0d95aceb2427bf00a7e5` (12 August 2026), never
merged into the current `main`. Its version-specific WhatsApp code is **not**
a valid patch against the later runtime. The recoverable Git history is held in
a **single verified private bundle** on the ThinkPad, and twelve ignored local
evaluation files in one private archive; neither is a live feature or a mandate.

The older harness experiments contrasted:

- **L0**, legacy retrieval and final synthesis, kept as the outbound reference;
- **S1/S2**, where a step reasoner writes or iteratively revises the final
  answer: insufficient quality or convergence in the recorded experiments;
- **H1**, reasoner-first with one `corpus.search`: 1 hybrid win, 8 legacy wins,
  1 tie and 1 critical regression in the ten-case blind review; reject
  activation, since reformulation added cost without new capability value;
- **H2**, evidence-first handoff (retrieve first, reason only on evidence gaps,
  then let the existing finalizer answer): on a six-case shadow comparison,
  2 hybrid wins, 3 legacy wins, 1 tie and zero critical hybrid regressions.
  The **gap path was not tested** in that comparison. H2 was therefore
  **not activation-ready**, despite its more promising structure.

**Interpretation:** keep useful negative results and the distinction between
*capability mobilization* and *answer synthesis*. Do not restore historical
`draft.js`, `answer-core.js`, `package.json`, test harnesses, environment
switches or model adapters by cherry-picking the four commits. A future H2
proposal must first rebase its **semantics** onto the currently deployed
reasoning loop, mandates and test contracts, then compare quality, latency,
cost and critical regressions against a current baseline. The old six-case
sample is neither a new CI gate nor proof of deployment.

Provenance: ThinkPad branch `agent/handoff-20260812-jhn-step`; archived
research `research/agent_jhn_step_loop_solution_rating_2026-08-12.md` and
`research/agent_jhn_shadow_eval_h2_2026-08-12_summary.json` are marked
**private** in the historical branch, so their full content must not be
reintroduced into this public repository without a separate disclosure review.
Cleanup and durable inventory: [Cogentia #310](https://github.com/JeanHuguesRobert/cogentia/issues/310).

## Correction trace

An earlier working draft named the cognitive dependency `planner`. That name
suggested a durable deterministic planning layer and duplicated the LLM's role.
The canonical contract is now `reasoner.nextStep()`, while the durable runtime
unit is the versioned step. Scope: Agent JHN reusable harness and future
capability adapters. Date: 2026-08-10.
