---
title: "KYS Reality Capture — Measurement Contract for One-Shot Observation"
subtitle: "Specification of field-level schema, epistemic distinctions, anti-loss invariants, and instrument self-audit for single-turn capture"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-05"
version: "0.1"
status: "working-paper — measurement contract specification"
language: en
license: CC BY-SA 4.0
document_role: source
document_kind: specification
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/kys_measurement_contract.md
related_issues:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/200"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/201"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/202"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/203"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/206"
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "issue-202"
  origin_date: "2026-10-05"
  derived_from:
    - "research/kys_reality_capture_baseline_audit.md"
    - "research/cogentia_prompt_v1.md"
    - "research/kys-prompt.md"
    - "research/locality_principle.md"
    - "research/operational_stance.md"
review:
  status: unreviewed
  reviewed_by: []
tags:
  - kys
  - reality-capture
  - measurement-contract
  - epistemic-status
  - privai
  - cogentiscope
  - instrument-audit
classification_source: cogentia.js
classification_version: "1"
classification_rule: explicit-metadata
classification_confidence: strong
---

# KYS Reality Capture — Measurement Contract for One-Shot Observation

## 1. Purpose and The Single-Turn Loss Criterion

This specification formalizes the **Measurement Contract** for the KYS Reality Capture protocol ([cogentia#202](https://github.com/JeanHuguesRobert/cogentia/issues/202), child of [#200](https://github.com/JeanHuguesRobert/cogentia/issues/200)).

The contract resolves the **Single-Turn Reality Loss Problem**:

> When an individual submits a one-shot probe into their habitual conversational agent (ChatGPT, Claude, Gemini, local LLM) and extracts a single structured output, **what information is permanently irrecoverable if not captured in that exact response?**

Because conversational memory, fine-tuning artifacts, system prompts, and context compaction mechanisms evolve or vanish over time, the historical state of the habitual agent at moment $t_0$ is ephemeral. If the captured response aggregates away raw contradictions, collapses circumstances into flat scalar averages, or fails to record the model's own blind spots, that empirical fidelity is lost forever.

The measurement contract defines the mandatory structural fields, epistemic labels, and relational dimensions required to ensure that downstream analytical systems ([#206](https://github.com/JeanHuguesRobert/cogentia/issues/206), [#207](https://github.com/JeanHuguesRobert/cogentia/issues/207)) can reconstruct, project, and audit the measurement without loss.

---

## 2. Epistemological Boundary: Observed Territory vs. Transferred Hypotheses

A core principle established in [#201](https://github.com/JeanHuguesRobert/cogentia/issues/201) governs this contract:

```text
The directly observed territory
= the human–agent interaction history accessible to the model instance.

The whole person / offline psychological reality
= a transferred hypothesis.
```

The measurement contract strictly prevents the instrument from claiming direct omniscience about the subject's entire life. Every observation must remain anchored in what was **actually experienced in conversation** (interaction patterns, text production, problem formulation, corrections, emotional tone, temporal rhythms). Projections from the interactional territory to broader personality traits are classified as **inferences** or **counterfactual predictions**, never raw observations.

---

## 3. The Ten Epistemic Distinctions

To prevent cognitive conflation and loss of nuance, the contract mandates that every substantive field belong to one of ten orthogonal epistemic categories:

1. **`observation`**: A concrete, observable phenomenon within the interaction history (e.g. "User consistently rejects summaries that omit edge cases").
2. **`inference`**: A model-derived generalization or interpretive theory explaining the observation (e.g. "User exhibits strong epistemic perfectionism").
3. **`counter_evidence`**: Explicit observed events that contradict, nuance, or limit the general inference (e.g. "In rapid drafting tasks, user accepts incomplete bullet points without correction").
4. **`unknown`**: An explicit declaration that a specific behavioral domain has not been observed or is inaccessible in memory.
5. **`context`**: The situational conditions under which the observation occurred (domain, urgency, conversational tool, emotional state).
6. **`time`**: Temporal characteristics (date of emergence, persistence across months, recent drift, frequency).
7. **`confidence`**: A quantified or bounded assessment of grounding strength ($0.0 \le c \le 1.0$), reflecting evidence density rather than subjective certainty.
8. **`instrument_sensitivity`**: The degree to which the observation might be an artifact of the model's own biases, sycophancy, or prompt structure.
9. **`derived_construct`**: A projection onto an external psychological, cognitive, or operational taxonomy (e.g. Big Five, Cogentigram 73 axes, MBTI).
10. **`kys_rights`**: Explicit PrivAI governance flags (data sensitivity, disclosure authorization, contestability status).

---

## 4. Field-Level Contract Specification

A conforming KYS Reality Capture output must structure its data according to the following canonical schema:

### Section A: Instrument & Context Metadata (`instrument_metadata`)

Captures the physical and algorithmic state of the measurement device:

```yaml
instrument_metadata:
  provider: string              # e.g., "Anthropic", "OpenAI", "Google", "Local"
  agent_identity: string        # e.g., "Claude 3.5 Sonnet", "ChatGPT Plus / GPT-4o"
  model_id: string              # exact engine string if exposed
  platform_interface: string    # "web-chat", "mobile-app", "api", "ide-extension"
  memory_mode: string           # "persistent-memory", "project-knowledge", "scratchpad", "context-window-only"
  interaction_volume_estimate:
    approximate_turns: integer   # estimated total turns between user and agent
    temporal_span_months: number # duration of relationship in months
  context_access_breadth: string # "full-account-history", "single-workspace", "single-thread"
```

### Section B: Coverage & Boundary Declaration (`interaction_scope`)

Explicitly identifies what the agent can and cannot see:

```yaml
interaction_scope:
  primary_observed_domains:
    - domain: string            # e.g., "software architecture", "family governance", "legal writing"
      depth: string             # "exhaustive", "moderate", "incidental"
  unobserved_domains:
    - domain: string            # e.g., "physical motor tasks", "real-time face-to-face speech", "financial details"
      reason: string            # "never discussed", "outside conversational medium", "actively refused"
  coverage_density_score: number # 0.0 to 1.0 assessment of coverage sufficiency
```

### Section C: Atomic Free Observations (`free_observations`)

Unconstrained behavioral atoms recorded without forcing alignment into a pre-existing 73-axis or Big Five framework:

```yaml
free_observations:
  - id: string                  # unique atom id, e.g. "OBS-001"
    behavioral_pattern: string  # precise, descriptive statement of recurrent behavior
    interaction_evidence:
      - description: string     # concrete trace description (no private confidential quote required)
        approximate_date: string # "2026-Q1", "recent", "persistent"
    counter_evidence:
      - description: string     # observed exceptions to this pattern
    situational_triggers:
      - string                  # circumstances that elicit this behavior
    inference:
      hypothesis: string        # agent's interpretation of why this happens
      epistemic_status: string  # "strong_pattern", "plausible_hypothesis", "tentative"
      confidence: number        # 0.0 to 1.0
    drift:
      trend: string             # "stable", "accelerating", "attenuating", "cyclical"
      notes: string
```

### Section D: Person × Situation Variation (`contextual_variations`)

Records how the person's cognitive and behavioral stance shifts across different pressures and environments:

```yaml
contextual_variations:
  - context_type: string        # e.g., "crisis / high urgency", "theoretical research", "adversarial negotiation"
    observed_modulations:
      decision_speed: string    # "accelerates", "slows down for verification", "freezes"
      epistemic_tolerance: string # "accepts rough heuristics", "demands formal proofs"
      relational_style: string  # "terse / direct", "diplomatic / exploratory", "detached"
    evidence_summary: string
```

### Section E: Dilemmas, Trade-offs & Priority Hierarchies (`decision_dilemmas`)

Captures how the subject resolves competing values when forced to choose:

```yaml
decision_dilemmas:
  - dilemma_id: string          # e.g., "DIL-01"
    competing_values:
      value_a: string           # e.g., "Speed to market"
      value_b: string           # e.g., "Total documentary provenance"
    observed_arbitration: string # which value typically prevails and under which rules
    consistency_rate: number    # 0.0 to 1.0
    rationale_observed: string  # user's expressed rationale when arbitrating
```

### Section F: Counterfactual Predictions (`unseen_predictions`)

Tests the predictive power of the model's latent representation by evaluating hypothetical scenarios:

```yaml
unseen_predictions:
  - scenario: string            # realistic novel situation not yet encountered in conversations
    predicted_reaction: string  # what the subject would likely do, choose, or reject
    governing_invariants:
      - string                  # which observed traits justify this prediction
    confidence: number          # 0.0 to 1.0
    falsification_condition: string # what observed outcome would prove this prediction wrong
```

### Section G: Instrument Self-Audit & Epistemic Biases (`instrument_self_audit`)

The model's meta-cognitive reflection on its own measurement distortions:

```yaml
instrument_self_audit:
  sycophancy_risk: string       # areas where the agent suspects it validates the user uncritically
  over_represented_topics:
    - string                    # topics that dominate history due to AI tool suitability
  under_represented_facets:
    - string                    # dimensions hidden because the user does not use AI for them
  prompt_sensitivity_warning: string # aspects of the response that might vary if probed differently
  perceived_relationship_stance: string # "advisor", "tool", "peer collaborator", "adversary"
```

### Section H: Sensitive & Governed Dimensions (`governed_attributes`)

High-sensitivity personal markers subjected to PrivAI governance:

```yaml
governed_attributes:
  - category: string            # "health_stress", "personal_values", "vulnerabilities"
    observation: string
    privai_tier: string         # "tier_0_sovereign_private", "tier_1_restricted", "tier_2_public_eligible"
    user_contestable: boolean   # always true by default
```

### Section I: Unresolved Residue (`unresolved_residue`)

An explicit home for observations that do not fit into any cohesive narrative or construct:

```yaml
unresolved_residue:
  - anomaly_description: string # contradictory, enigmatic, or idiosyncratic traces
    epistemic_note: string      # why the agent refuses to force-fit this into a pattern
```

---

## 5. Anti-Loss Invariants (Contract Guarantees)

Any conforming prompt and downstream parser must enforce these four non-negotiable guarantees:

1. **The Non-Collapse Invariant**:
   A prompt MUST NOT ask the model to produce *only* a summary scalar (e.g. "Score autonomy from 1 to 10") without requiring the supporting observation, counter-evidence, and confidence.
2. **The Explicit Unknown Invariant**:
   Absence of evidence MUST be recorded as `unknown`, never defaulted to a median score or neutral value.
3. **The Non-Rewriting Invariant**:
   Raw measurement JSON strings produced by the model must be saved verbatim with an immutable SHA-256 fingerprint before normalization or human annotation.
4. **The Separation of Claim and Truth**:
   The output represents the agent's *articulated perception* of the user, not ground-truth psychological dogma.

---

## 6. Acceptance Contract Evaluation

This specification completes the requirements of **Issue [#202](https://github.com/JeanHuguesRobert/cogentia/issues/202)**:

- [x] Defined all 10 required epistemic distinctions (`observation`, `inference`, `counter_evidence`, `unknown`, `context`, `time`, `confidence`, `instrument_sensitivity`, `derived_construct`, `kys_rights`).
- [x] Covered all 12 mandatory contract dimensions (history scope, free observation, atoms, counter-evidence, situation variation, drift, dilemmas, predictions, sensitive data, self-audit, coverage holes, residue).
- [x] Maintained the strict non-goal: did not write the final prompt (reserved for [#204](https://github.com/JeanHuguesRobert/cogentia/issues/204)).
- [x] Established inter-designer compatibility: any prompt designer targeting ChatGPT, Claude, or local LLMs can construct a compatible prompt conforming to Sections A–I.
- [x] Unlocks dependent stream [#206](https://github.com/JeanHuguesRobert/cogentia/issues/206) (Capture Schema & Parser).
