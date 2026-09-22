---
title: "Janus — Cognitive Transition Contract"
subtitle: "A falsifiable interface hypothesis for qualified Cognitive Packet transitions and Future-to-Past settlement"
description: "Working conceptual architecture for Janus as a candidate transition contract preserving qualification basis, unresolved residue, revision conditions, and settlement links around Cognitive Packets."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-22"
last_modified_at: "2026-09-22"
last_stamped_at: "unknown"
version: "0.3"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
document_function: "conceptual-architecture"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/janus_cognitive_gatekeeper.md"
ai_assisted_by:
  - "GPT-5.6 Sol"
provenance:
  origin_type: "conversation"
  origin_repository: "unknown"
  origin_ref: "unknown"
  origin_date: "2026-09-22"
  derived_from:
    - "research/cognitive_packets.md"
    - "research/cognitive_packet_switching.md"
    - "research/documents_as_cognitive_packets.md"
    - "research/mneme_memory_architecture.md"
    - "research/memory_and_corpus_sleep_cycle.md"
    - "research/interroger_le_reel.md"
    - "research/interrogating_reality.md"
    - "research/measured_risk.md"
    - "research/locality_principle.md"
    - "research/packet_continuation_machine.md"
    - "research/level2_continuation_scheduler_r1b.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/potentics.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/principe_rossignol.md"
review:
  status: "under-review"
  reviewed_by:
    - "Grok 4.6 (xAI) — reviewer contract v0.5 — external pass 1, 2026-09-22"
tags:
  - janus
  - cognitive-packets
  - transition-contract
  - provenance
  - revision
  - settlement
  - foresight
  - reality
  - measured-risk
  - synthetic-skin-in-the-game
  - belief-revision
  - non-monotonic
changelog:
  - "v0.1 (2026-09-22) — initial formulation of Janus as a bidirectional Cognitive Packet gatekeeper."
  - "v0.2 (2026-09-22) — integrated three internal review passes and added embodiment, Synthetic Skin, philosophical ancestry, and external Reviewer contract."
  - "v0.3 (2026-09-22) — response to Grok external review pass 1: narrowed Janus from governor/component to falsifiable transition-contract hypothesis; removed scalar embodiment, Black Packet, and Spirit of Synthesis from runtime architecture; added settlement semantics, deletion criterion, named friends, and Test J-Delta."
---

# Janus — Cognitive Transition Contract

## Abstract

**Janus** is a candidate interface contract for qualifying and recording transitions around Cognitive Packets.

It is deliberately smaller than the v0.2 proposal.

Janus does not define a new universal cognitive component. It does not perform belief revision, simulation, planning, risk estimation, authorization, synthesis, memory storage or execution.

Its candidate contribution is limited to preserving, across a transition:

```text
what is being promoted
why it is being promoted
what remains unresolved
what could revise the decision
and, for prospective transitions,
which later Reality traces may settle it
```

The central hypothesis is:

> **A prospective cognitive commitment should remain linked to the later evidence that can confirm, revise or defeat it, while unresolved residue and revision conditions survive the transition.**

The corresponding retrospective discipline is:

> **A trace may be associated, retained and routed without being silently promoted into truth or canonical knowledge.**

Janus is therefore first a **logical role and interface contract**.

Whether it deserves a dedicated runtime layer is explicitly left to Reality.

# 1. The claim under test

The v0.2 formulation treated Janus as a bidirectional governor.

External review showed that most of the implied mechanisms already have mature or emerging implementations:

```text
truth maintenance
belief revision
provenance
memory-update control
world models
predictive guards
policy decision points
execution tracing
Measured Risk
```

Janus therefore has no right to exist merely because these mechanisms need coordination.

The remaining candidate contribution is narrower:

```text
qualified transition
+
unresolved residue
+
revision conditions
+
prospective settlement link
```

The falsifiable question becomes:

> **Does making this contract explicit improve cognitive continuity, accountability or reconstruction compared with adding the same fields to existing Packet / continuation structures without a distinct Janus layer?**

If not, Janus should be demoted to vocabulary or pattern.

# 2. Janus is not a universal evaluator

Janus may consume assessments produced elsewhere.

It must not become their source.

## Janus must not itself compute

```text
truth
belief revision
world-model prediction
potentiality
expected value
risk
authorization
permission
budget
consent
moral value
memory retention policy
synthesis
execution
```

A possible flow is:

```text
belief-revision system ─┐
world model ────────────┤
risk model ─────────────┤
capability model ───────┤
policy context ─────────┤
                        ▼
                qualified transition record
```

Janus is therefore closer to a **governed semantic interface** than to a reasoning engine.

# 3. One envelope, two procedures

Past and Future share a useful record structure.

They do **not** necessarily share an evaluation theory.

## Janus.Past

Retrospective procedure:

```text
trace
→ attribution hypothesis
→ relation qualification
→ possible canonical promotion
```

Questions include:

```text
Does this trace concern Packet A?
What relation does it support?
How strong is the attribution?
What remains unresolved?
What could revise the attribution?
```

## Janus.Future

Prospective procedure:

```text
current Packet
→ candidate continuation
→ qualification
→ optional test / Act
→ later Reality return
```

Questions include:

```text
What continuation is being promoted?
On what basis?
What uncertainty remains?
What conditions would change the decision?
What later observation can settle the prospective claim?
```

Thus:

> **One transition envelope; two different qualification procedures.**

# 4. Core transition record

A minimal candidate representation is:

```yaml
qualified_transition:
  direction: past | future

  subject: <reference>
  relation: <type>
  status: <qualified-status>

  basis:
    evidence: []
    assessments: []
    constraints: []

  epistemic_status: <status>

  unresolved:
    - <open hypothesis or residue>

  revision_conditions:
    - <observation or condition that may change qualification>

  settlement:
    expected: <optional>
    settled_by: <later trace reference or null>
```

The schema is intentionally implementation-neutral.

A Cognitive Packet store, continuation runtime, memory layer, provenance graph or specialized controller may write the same logical structure.

# 5. Qualification is not authorization

A transition may be:

```text
well supported
promising
low uncertainty
technically feasible
```

without being authorized.

The existing Corpus distinction remains:

```text
Intent
≠ Mandate
≠ Capability
≠ Authorization
```

Therefore:

```text
Janus-like qualification
→ epistemic / operational record

PDP / Mandate layer
→ authorization decision
```

Existing policy systems such as Cedar- or OPA-like policy decision points are friends, not things Janus should replace.

# 6. Attribution is not truth

The retrospective side must preserve:

```text
Trace → Packet attribution
```

separately from:

```text
TraceContent → Claim truth status
```

Example:

```text
"This letter belongs to CP-42"
```

may be strongly established while:

```text
"The factual claim made in the letter is true"
```

remains contested.

This distinction is invariant.

> **Reliable provenance does not imply reliable content.**

# 7. Unknown is not absent

The architecture must preserve:

\[
UnknownRelation(T) \neq NoRelation(T)
\]

The v0.2 notion of a **Black Cognitive Packet** is withdrawn as a Packet-like object.

Use explicit uncertainty instead:

```yaml
relation:
  status: unresolved

  hypotheses:
    - packet: CP-A
      basis: [...]
    - packet: CP-B
      basis: [...]

  residue:
    - "insufficient evidence to discriminate A from B"
```

This is compatible with open-world semantics and ATMS-style competing environments.

No pseudo-Packet is required merely to own ignorance.

# 8. Canonical remains revisable

Canonicalization is operational.

It does not mean eternal truth.

A relation may evolve:

```text
candidate
→ accepted
→ challenged
→ revised
→ superseded
```

This non-monotonicity is primarily a property of the governed knowledge store.

It is not claimed as Janus's unique invention.

Janus merely requires that transition records do not erase the conditions under which later revision becomes legitimate.

# 9. Dead-end is not impossible

The distinction remains:

\[
DeadEnd(Map_t) \not\Rightarrow Impossible(Reality)
\]

Useful statuses include:

```text
open
deferred
dead-end-candidate
blocked-under-current-regime
closed-by-evidence
```

Every strong closure should preserve its scope.

The rule remains:

> **Gate promotion, not possibility.**

# 10. Future commitments must become answerable

The strongest surviving Janus hypothesis concerns **settlement**.

A prospective claim should not disappear after it influences a continuation.

Instead:

```text
prospective claim
→ transition promoted
→ action / probe / non-action
→ Reality
→ trace
→ settlement
→ retrospective revision
```

Example:

```yaml
qualified_transition:
  direction: future
  subject: CP-57
  relation: continuation_of
  status: probe-first

  basis:
    assessments:
      - "branch A expected to outperform B"

  revision_conditions:
    - "observed result favors B"

  settlement:
    expected:
      observation: "metric M after probe"
      horizon: "after bounded execution"
    settled_by: null
```

Later:

```yaml
settlement:
  expected:
    observation: "metric M after probe"
  settled_by: trace:T-991
  result: contradicted
```

This creates the coupling:

> **Janus.Future makes a claim answerable; Janus.Past records how Reality answered.**

# 11. Prediction accuracy is not decision utility

A prediction can be:

```text
correct but useless
wrong but decision-useful
well calibrated but irrelevant
informative but expensive
```

The architecture must therefore distinguish:

```text
accuracy
calibration
decision utility
information gain
resource cost
Exposure
capability gain
```

Settlement should attach to the **decision-relevant claim**, not to arbitrary easy-to-score predictions.

# 12. Synthetic Skin in the Game — revised claim

Synthetic Skin in the Game remains a useful research hypothesis.

It must no longer be stated as automatically improving reasoning.

Synthetic mechanisms may impose:

```text
finite resource consumption
prediction settlement
persistent causal trace
authority constraints
mandatory escalation
non-resettable history
```

These mechanisms clearly shape behaviour.

Whether they improve:

```text
calibration
learning
decision utility
foresight
```

is empirical.

Therefore:

> **Synthetic Skin can make consequences persistent and opposable. Whether that persistence improves reasoning rather than merely proxy compliance must be tested.**

This avoids confusing:

```text
behaviour shaping
with
cognitive improvement
```

# 13. Synthetic Skin failure modes

A synthetic consequence system can be gamed.

Examples include:

```text
micro-prediction spam
selection of only easy claims
identity reset
session reset
proxy optimization
trust-score gaming
budget theatre
agreement with reviewer models
memory provenance laundering
```

Therefore the settlement target should be:

```text
decision-relevant claim
→ actual consequence
→ Reality return
```

rather than:

```text
generic agent score
```

# 14. From Embodiment Ladder to factored test regimes

The v0.2 E0–E4 ladder mixed several orthogonal dimensions.

The scalar ladder is withdrawn.

A prospective test should instead be described across dimensions such as:

```yaml
test_regime:
  representation_fidelity: low | medium | high
  reality_coupling: none | sandbox | operational
  stake_persistence: resettable | persistent
  propagation: local | bounded | broad
  affected_principals: []
  moral_patienthood: none | human | animal | other
  reversibility: <reference to Reversibility Envelope>
  recovery_path: <reference>
  mandate_basis: <reference>
```

Two tests may therefore invert on different axes.

Example:

```text
high-fidelity simulation involving public personal data
```

may create more real Exposure than:

```text
private operational test on an isolated throwaway system
```

No single “height” determines which is safer.

# 15. Test selection and Measured Risk

The v0.2 expression:

\[
\min(Embodiment)
\]

is withdrawn.

The correct principle is multi-dimensional:

> **Choose a test regime whose discrimination, Exposure, affected Principals, reversibility, recovery structure and mandate are jointly acceptable.**

A useful heuristic remains:

> **Do not expose Reality more than necessary — but do not hide in simulation when only Reality can discriminate the question.**

This is not a scalar optimization law.

It is a Measured Risk discipline.

# 16. Real stakes increase obligations

When living or human Principals are exposed, the architecture must at least preserve or reference:

```text
affected_principals
loss_bearer
mandate_basis
consent where applicable
Exposure envelope
stop conditions
recovery path
compensation path where relevant
```

Janus does not decide these matters.

But a transition record should not discard them when they are material.

The principle remains:

> **More real skin in the game creates stronger duties of care, not stronger permission to experiment.**

# 17. Closure for action vs epistemic revisability

Non-monotonic knowledge must not imply endless operational reopening.

Keep separate:

```text
epistemically revisable
```

from:

```text
operationally closed for present action
```

A system may validly say:

```text
decision closed under current mandate and deadline
```

while preserving:

```text
revision_condition = new evidence E
```

This prevents revision machinery from becoming paralysis.

# 18. Friends before competitors

Janus should reuse adjacent systems before defining new machinery.

## 18.1 ATMS / truth-maintenance systems

Strong friend for:

```text
competing hypotheses
justifications
revision
residue preservation
```

Potential reuse:

```text
Janus.Past competing Packet identities
```

Janus should not reinvent ATMS environments.

## 18.2 Memory-update controllers

Contemporary memory controllers — including systems using the name Janus — are close friends of retrospective promotion.

A useful specialization is:

```text
candidate memory update
→ accept new state
or
→ retain previous state
```

This resembles the Canonicalization Gate.

The research question is what a Cognitive Packet transition contract adds beyond the memory controller itself.

## 18.3 Predictive guards and world models

Predictive guards can supply:

```text
expected consequences
delayed-risk assessments
counterfactual trajectories
```

to a Future qualification record.

They are assessment providers, not Janus itself.

## 18.4 Execution-settled prediction systems

Systems such as DreamLedger-like execution-settled prediction credit are especially close friends of the Future→Past settlement hypothesis.

The relevant pattern is:

```text
claim
→ execution
→ observation
→ settlement
→ future weighting
```

Janus should reuse this idea rather than invent a generic prediction score.

## 18.5 Policy decision points

Cedar-, OPA- and similar policy systems are friends of:

```text
qualified
→ authorized / forbidden
```

They occupy a boundary Janus must not absorb.

## 18.6 Friends named Janus

The name has several 2026 collisions.

They should be separated into:

### Architectural kinship

```text
memory update gating
predictive safety gating
permission gating
restart-safe consistency checks
```

### Naming coincidence

```text
multimodal understanding/generation
Jacobian-related methods
unrelated serving or infrastructure systems
```

Repeated use of the name is not evidence that the Corpus architecture is necessary.

It is only evidence worth investigating.

# 19. Minimal Janus differentia

After external review, the strongest possible differentia is no longer:

```text
two-faced governor
```

but:

> **explicit settlement-bearing transition continuity across prospective and retrospective cognitive work.**

In compact form:

```text
Future qualification
   │
   ├── basis
   ├── unresolved residue
   ├── revision conditions
   └── settlement expectation
              │
              ▼
            Reality
              │
              ▼
Past qualification
   └── settlement result
```

If existing Packet machinery already provides this cleanly, Janus may collapse into that machinery.

# 20. Test J-Δ — deletion test

Janus must be exposed to a direct falsifier.

## 20.1 Corpus sample

Select a bounded set of existing GitHub Issues / continuations containing sufficiently rich traces.

Use the same evidence and same frozen handler/model for both conditions.

## 20.2 Condition A — minimal fields

Existing Packet / continuation representation plus only:

```text
epistemic_status
unresolved[]
revision_conditions[]
settlement
```

No Janus vocabulary required.

## 20.3 Condition B — Janus contract

Use the explicit:

```text
qualified_transition
direction: past | future
basis
epistemic_status
unresolved[]
revision_conditions[]
settlement
```

## 20.4 Metrics

Compare:

```text
false attribution
residue preservation
competing-hypothesis preservation
settlement completeness
reviewer agreement
time-to-review
schema burden
implementation complexity
```

## 20.5 Pre-registered deletion criterion

> **If Condition B does not materially improve residue preservation or settlement quality over Condition A while maintaining comparable attribution quality and acceptable complexity, Janus should not be promoted as a distinct architectural layer.**

Possible outcomes:

```text
B clearly better
→ retain Janus as interface contract

A equivalent
→ demote Janus to pattern / vocabulary

A better
→ withdraw distinct Janus architecture
```

This criterion is intentionally capable of killing the concept.

# 21. Secondary Future test

If Janus survives J-Δ, a later test should compare:

```text
execution-settled prediction credit only
```

against:

```text
execution-settled credit
+
explicit prospective Janus qualification
```

Endpoint:

```text
decision utility
```

not merely accuracy.

# 22. Pangloss Loop

Retain the operational anti-pattern:

```text
Reality contradicts model
→ contradiction rationalized
→ model unchanged
```

For Janus itself, the anti-Pangloss condition is Test J-Δ.

If Janus fails its own deletion criterion and remains architecturally privileged anyway, the project has entered its own Pangloss Loop.

# 23. Huxley Optimization

Retain only in bounded form:

```text
reduce uncertainty / risk
→ suppress useful exploration
→ reduce effective option space
→ call result safety
```

This anti-pattern must not be applied to legitimate rights-based refusal.

Refusing an experiment because it violates rights or mandate is not “Huxley Optimization.”

The anti-pattern concerns **unnecessary possibility closure**, not principled limits.

# 24. Hall of Mirrors

A particularly important failure mode remains:

```text
model
→ simulator
→ reviewer model
→ evaluator model
→ consensus
```

without an adequately independent Reality return.

Multiple agents do not automatically provide independent evidence.

This motivates settlement against external consequences where proportionate and lawful.

# 25. Gate capture

Because Janus uses gate language, a persistent drift risk is:

```text
qualification
→ authority
→ centralized veto
```

The safeguard remains:

> **Janus records promotion status; it does not manufacture jurisdiction.**

Distributed implementations are explicitly allowed.

There need not be a central Janus service.

# 26. Minimal implementation hypothesis

The smallest implementation should not begin with:

```text
new daemon
new CLI
new database
new orchestration service
```

Start with fields on existing structures.

Candidate Booster:

```yaml
epistemic_status: candidate

unresolved:
  - "Packet identity ambiguous between CP-A and CP-B"

revision_conditions:
  - "new trace explicitly links issue to CP-A"

settlement:
  expected: null
  settled_by: null
```

Only promote toward a dedicated Janus object if the Reality Test demonstrates value.

# 27. Research questions

1. Does Janus add anything beyond existing Packet/continuation fields?
2. Does explicit Future→Past settlement improve decision utility?
3. Which parts of Past qualification are already solved by ATMS or memory controllers?
4. Which parts of Future qualification are already solved by predictive guards?
5. Can one envelope serve both directions without encouraging one shared evaluation algorithm?
6. What is the smallest settlement structure worth keeping?
7. What counts as sufficient Reality independence from the model producing the prediction?
8. How should identity-reset gaming be prevented without over-centralizing identity?
9. When should an unresolved relation remain unresolved indefinitely?
10. How should closure-for-action coexist with later epistemic reopening?
11. Can OpenTelemetry or another existing trace model carry Janus records without a parallel standard?
12. Does a named Janus interface improve human review time?
13. Does it reduce false canonicalization?
14. Does it improve preservation of competing hypotheses?
15. Does it improve later settlement completeness?
16. Does the concept survive Test J-Δ?

# 28. Working definition

> **Janus is a candidate interface contract for recording and qualifying transitions around Cognitive Packets. It preserves the basis, epistemic status, unresolved residue and revision conditions of a transition, and may link a prospective qualification to the later Reality traces that settle it. Janus does not itself perform belief revision, prediction, risk estimation, authorization, synthesis or execution. Whether Janus deserves a distinct architectural layer rather than remaining a shared transition record is an explicit empirical question.**

Short form:

> **Janus records why a transition may be promoted, what remains unresolved, and what later evidence may revise it.**

Prospective-retrospective compression:

> **Future commitments become Past evidence.**

# 29. Current status

Janus v0.3 is an **under-review interface hypothesis**.

It is not stabilized doctrine.

The next sequence is:

```text
v0.3
→ commit
→ verified immutable handoff
→ Grok Reviewer pass 2
→ Redactor response
→ possible J-Δ implementation
→ stabilization or demotion
```

The next Reviewer should receive:

```text
v0.3 source
+
Grok pass 1
+
Redactor response to pass 1
```

and must not restart from zero.

# Appendix A — Genealogy, not runtime architecture

This appendix records conceptual ancestry without making it part of the executable Janus architecture.

## A.1 Potentics

Potentics distinguishes:

```text
The Possible
The Realized
potentiality
actualization
capability
```

Janus may operate inside systems informed by those concepts.

It does not depend on them for implementation.

## A.2 Spirit of Synthesis

An older Corpus formulation interprets the Christian Trinity structurally:

```text
Father
→ The Possible

Son
→ The Realized

Holy Spirit
→ Spirit of Synthesis
```

where synthesis names the generative movement through which separate elements combine and new accessible possibilities may become actual.

This is a personal, structural interpretation.

It is not presented as Christian doctrine.

The concept is deliberately **not represented as a Janus runtime component**.

Operational Janus does not invoke or require the Spirit of Synthesis.

## A.3 Leibniz

Leibniz's “best of all possible worlds” supplies historical ancestry for the problem that global value cannot be reduced mechanically to zero local cost.

Measured Risk already handles the operational problem more directly.

Leibniz is therefore genealogy, not an architectural dependency.

## A.4 Voltaire

The useful operational extraction from *Candide* is the Pangloss Loop:

```text
evidence contradicts theory
→ theory explains away evidence
→ theory survives unchanged
```

This remains directly relevant to Janus.

## A.5 Huxley

The useful extraction from *Brave New World* / *Le Meilleur des mondes* is a warning against eliminating uncertainty, divergence or suffering by unnecessarily eliminating freedom and possibility.

The reference is illustrative, not required for the technical contract.

# Appendix B — Review history

## Internal review

Three internal passes preceded v0.2:

```text
1. conceptual boundaries and prior art
2. Friends before competitors
3. Synthetic Skin / Measured Risk / philosophical ancestry
```

These were internal reviews by the drafting environment and did not clear `review.status`.

## External review pass 1

Reviewer:

```text
Grok 4.6 (xAI)
```

Target:

```text
v0.2
commit e4449227bef1d061a9a5e902764044a3c891779f
```

Main accepted corrections:

```text
Synthetic Skin effect becomes empirical hypothesis
remove min(Embodiment)
factor embodiment dimensions
Black Packet withdrawn
one envelope / two procedures
Spirit of Synthesis removed from runtime diagrams
Janus distinct-layer claim becomes load-bearing and falsifiable
Test J-Delta adopted
named friends required
PDP / authorization boundary strengthened
```

The review did not stabilize the source.

It produced v0.3.

# Appendix C — Pass 2 Reviewer brief

Apply the current `cogentia/prompts/reviewer.md`.

Do not restart from zero.

Review:

```text
v0.3 source
+
Grok external review pass 1
+
Redactor response to pass 1
```

Priority questions:

1. Did v0.3 genuinely answer the Delete-Janus objection, or merely rename Janus as an interface?
2. Is the scalar Embodiment error fully removed?
3. Are orthogonal test-regime dimensions now sufficiently separated?
4. Is Past/Future symmetry limited to the shared envelope?
5. Is Spirit of Synthesis fully absent from runtime architecture?
6. Is Synthetic Skin explicitly empirical rather than asserted?
7. Is settlement decision-relevant rather than proxy-relevant?
8. Does Test J-Δ genuinely permit Janus to fail and disappear?
9. Are external friends reused architecturally rather than cited ornamentally?
10. Did the revision introduce any new super-component responsibility?

The Reviewer may reopen any prior finding whose repair is incomplete.

Plateau should not be declared merely because the document has become smaller.

The governing question remains:

> **What does Janus still add after everything reusable has been reused?**
