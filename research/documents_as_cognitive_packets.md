---
title: "Documents as Cognitive Packets"
subtitle: "Document-backed packet capsules, human-routed handoffs, lifecycle, recovery, and recursive Reality Tests"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica, France"
date: "2026-08-25"
last_modified_at: "2026-08-26"
version: "0.2"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
document_function: "research"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-ARCHAEOLOGY-LIVING"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/documents_as_cognitive_packets.md"
methodology:
  - "Second Method"
  - "Reactive Corpus"
  - "Cognitive Packet Switching"
  - "Reality Test"
ai_assisted_by:
  - "GPT-5.6 Sol (research synthesis, redaction, and review assimilation)"
related_documents:
  - "research/cognitive_packets.md"
  - "research/cognitive_packet_switching.md"
  - "research/cognitive_packet_closure_and_packet_native_semantics.md"
  - "prompts/cognitive_packet.md"
  - "prompts/redactor.md"
  - "prompts/reviewer.md"
  - "research/pipeline.md"
  - "research/memory_and_corpus_sleep_cycle.md"
  - "research/mneme_memory_architecture.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/AGENTS.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md"
tags:
  - cognitive-packets
  - documents
  - packet-closure
  - packet-capsule
  - redactor
  - reviewer
  - human-routing
  - copy-paste
  - compensation
  - sagas
  - repair
  - damage-control
  - triage
  - eventual-reconciliation
  - reactive-corpus
provenance:
  origin_type: "conversation"
  origin_repository: "unknown"
  origin_ref: "unknown"
  origin_date: "2026-08-25"
  derived_from:
    - "research/cognitive_packet_closure_and_packet_native_semantics.md"
    - "prompts/cognitive_packet.md"
    - "prompts/redactor.md"
    - "prompts/reviewer.md"
review:
  status: "reviewed"
  reviewed_by:
    - "Grok (xAI), decorrelated Reviewer, reviewer contract v0.5, 2026-08-25"
changelog:
  - "v0.1 (2026-08-25) — initial source note and recursive document-backed packet experiment."
  - "v0.2 (2026-08-26) — assimilated RT-001 decorrelated review; tightened Packet Capsule definition, lowered closure claim, added minimal capsule contract, lifecycle authority/evidence rules, first handoff measurements, and explicit review dispositions."
x-cognitive-packet:
  candidate: true
  profile: "document-backed-capsule"
  transmission_modes:
    - "git-reference"
    - "markdown-file"
    - "copy-paste"
  identity_claim: "provisional-no-storage-independent-packet-id-yet"
  closure_claim: "referential-partial-materializable"
  ithaca: "research/documents_as_cognitive_packets.md"
  current_phase: "post-rt001-review-assimilation"
  next_handler_capability: "foreign-handler-by-copy-test"
  retention_policy_for_review_artifacts: "transient-until-assimilated"
  rt001:
    result: "partial"
    private_context_required: false
    material_findings: 9
    prior_art_risk: "medium"
---

# Documents as Cognitive Packets

## 1. Status, hypothesis, and recursive experiment

This document studies a deliberately bounded working hypothesis:

> **Some documents can serve as human-readable, transportable representations of Cognitive Packets, especially as document-backed Packet Capsules.**

It does **not** claim that every document is a Cognitive Packet.

A document may instead be, or simultaneously project, a:

```text
Map
Artifact
Packet Capsule
Trace
Projection
```

These roles must not be collapsed.

Likewise, a GitHub file is not automatically the identity of a Cognitive Packet. It may be one placement or representation of work whose logical identity should survive renaming, movement, replication, storage changes, and handler substitution.

This document is itself a candidate under test rather than proof by declaration.

Its first recursive experiment was:

```text
this document v0.1
→ Git reference
→ decorrelated Reviewer (Grok / xAI)
→ transient review.md
→ human routing
→ Redactor
→ this document v0.2
```

### RT-001 result

The Reviewer declared no access to the originating conversation or private drafting state. It reconstructed the thesis and performed a substantive review from the public Git reference and public Corpus references alone.

The result was nevertheless **partial**, not full Packet Closure:

```text
private conversational context required: no
public reference materialization required: yes
closure for contract-aware Corpus handler: good
closure for completely foreign handler: incomplete
```

The strongest empirical correction from RT-001 is therefore:

> **This document currently demonstrates referential and partial materializable closure, not complete materializable closure for an arbitrary foreign admissible handler.**

That downgrade is evidence from the experiment, not a failure of the hypothesis.

---

## 2. Existing practice already behaves like human-routed packet switching

The Corpus already contains a recurring production workflow:

```text
Human Principal
    ↓
Redactor
    ↓
document.md
    ↓
Reviewer
    ↓
review.md
    ↓
Human Principal / router / arbiter
    ↓
Redactor
    ↓
revised document.md
```

Concrete handlers may be different AI providers or humans. Transport may be:

```text
GitHub reference
Markdown file
file download / upload
plain copy / paste
```

The human operator frequently performs routing manually.

This is usefully interpretable as **primitive human-routed Cognitive Packet Switching** because the work survives a process boundary and is resumed by a replaceable handler.

The interpretation becomes stronger when the artifact satisfies the substitution requirement already present in the Redactor contract:

> another admissible processor must be able to understand, criticize, continue, and return the work without relying on the previous processor's private state.

That is close to an operational test of Packet Closure.

However, the interpretation must remain falsifiable. If ordinary Git documents, Issues, ADRs, or task artifacts provide the same continuation semantics with less machinery, the additional Packet Capsule ontology may be unnecessary.

---

## 3. Packet, Capsule, Document, Artifact, Placement, and Transport

A useful separation is:

```text
Cognitive Packet
    stable identity of the work
    objective
    lineage
    authority context
    continuation semantics
    expected return
        ↓
Packet Capsule
    bounded representation of that Packet
    at a declared causal frontier
        ↓
Document representation
    one human-readable serialization
        ↓
Placement / transport
    Git file
    downloaded Markdown
    clipboard text
    attachment
    SQLite / PostgreSQL row
```

Therefore:

```text
Packet identity
≠ Packet Capsule
≠ file path
≠ Git blob
≠ GitHub Issue
≠ Markdown serialization
≠ transport channel
```

A rename such as:

```text
research/foo.md
→ research/bar.md
```

must not, by itself, create a new logical Packet.

The same Packet may have several simultaneous placements or several successive Capsules.

---

## 4. Minimal definition of a Packet Capsule

RT-001 exposed an under-definition in v0.1. The following is the current working definition:

> **A Packet Capsule is a bounded, transportable representation of an identified Cognitive Packet at a declared causal frontier, carrying or verifiably materializing enough state, constraints, continuation, routing, and return semantics for an admissible handler to resume the work without undocumented private context.**

The words **identified Packet** and **declared causal frontier** distinguish a Capsule from a merely well-written or self-contained Artifact.

A document-backed Packet Capsule should make at least the following available or materializable:

```text
Packet identity or stable packet reference
Causal frontier / represented version of the work
Object / objective
Current state
Established decisions
Assumptions
Constraints
Relevant authority context when consequential
Relevant references and closure mode
Open questions / unresolved residue
Expected next action
Admissible next-handler capability
Return destination / Ithaca
Resumption risks
```

### Qualification test

A Markdown document is **not** a Packet Capsule merely because it has good metadata or complete prose.

A useful test is:

1. **Identity** — does it represent identified continuing work rather than merely a file?
2. **Frontier** — can a receiver tell which state/history frontier the representation claims to cover?
3. **Closure** — can required context be obtained without undocumented private state?
4. **Continuation** — is it clear what kind of handler can advance the work and what remains to do?
5. **Return** — is it clear where the yield belongs?
6. **Constraints** — are material authority, policy, budget, or resumption constraints preserved when relevant?

A closed reference document that lacks continuation and return semantics may be an excellent **Artifact** without being a Packet Capsule.

### Minimal illustrative capsule

The exact schema remains experimental, but a document-backed representation could expose something as small as:

```yaml
x-cognitive-packet:
  packet_id: "cp:stable-logical-id"
  capsule_id: "cap:representation-id"
  causal_frontier: "event-or-snapshot-ref"
  closure:
    mode: materializable
    refs:
      - "stable-ref"
  routing:
    next_handler_capability: "decorrelated-review"
  return:
    ithaca: "stable-return-ref"
  payload:
    object: "what this work is about"
    state: "current resumable state"
    next_action: "what should happen next"
    resumption_risks:
      - "known risk"
```

This is an illustration, not a normative schema.

The present document intentionally does **not** yet claim a storage-independent `packet_id`. Its candidate status is therefore still provisional.

---

## 5. Markdown and copy/paste as low-tech transport

Markdown plus ordinary text transport degrades gracefully:

```text
rich native Packet
→ Markdown / YAML Capsule
→ Git / file / copy-paste / email / chat
→ foreign handler
→ materialization / continuation
```

With a human operator, the minimum interoperability layer may be little more than:

```text
Unicode text
+
human routing
```

Structured protocols such as COP, ACP, MCP, APIs, durable stores, and automated schedulers can later add:

```text
identity
routing
closure validation
lineage
accounting
authority
automated return
scale
```

but manual transport is sufficient to prototype and Reality-test the semantics.

> **Manual copy/paste can serve as a universal bootstrap and fallback transport for Cognitive Packet Capsules before richer orchestration is available.**

This is a fallback and experimental baseline, not an argument against structured protocols.

---

## 6. Packet Closure and the first measured handoff

Closure can be:

```text
INLINE
    required context embedded directly

REFERENTIAL
    required context reachable through stable references

MATERIALIZABLE
    the Capsule provides enough resolver information
    to retrieve and verify required state
```

A document that says:

```text
continue what we discussed yesterday
use the second idea
apply the same correction as before
```

is not closed merely because it has metadata.

### RT-001 qualitative measurement

The first handoff produced an initial measurement rather than only a metaphor:

```text
transport to Reviewer:
    1 human routing action (Git reference + reviewer instruction)

private explanatory context supplied:
    0

private context requested by Reviewer:
    0

public Corpus references materialized by Reviewer:
    several, including packet and Redactor/Reviewer contracts

returned artifact:
    1 complete Markdown review

material findings:
    9

closure_result:
    partial
```

This is not yet a time-and-cost benchmark. It is enough to establish one useful fact:

> **The handoff did not require conversational context repair, but the foreign-handler contract remains under-specified at the Capsule level.**

---

## 7. Review Packet, assimilation, and retention

The Reviewer normally produces a full Markdown artifact:

```text
review.md
```

That object may be a transient Cognitive Packet or Packet yield without deserving permanent Corpus retention.

The lifecycle is:

```text
document_n
→ Reviewer
→ review.md                    transient
→ human routing
→ Redactor
→ explicit dispositions
→ document_n+1
→ compact durable review yield / residue
→ raw review may be discarded
```

This yields a central distinction:

> **Packet durability is not Corpus retention.**

A Packet must persist long enough to be continued. It does not necessarily deserve permanent preservation after assimilation.

The raw RT-001 review is therefore **not committed to Git by default**. Its material findings, review identity, dispositions, and unresolved residue are assimilated here. The human may retain the raw file elsewhere without changing the Corpus policy.

---

## 8. Assimilation boundary and lifecycle operations

The word `forget` is too ambiguous for a normative lifecycle API.

At least four operations should remain distinct:

| Operation | Meaning | Minimum authority / evidence expectation |
|---|---|---|
| `DISCARD` | Destroy explicitly transient work after its useful obligations are satisfied | Standing retention policy or explicit decision; evidence that material findings, unresolved obligations, and required residue were assimilated or transferred |
| `COOL / DEINDEX / ARCHIVE` | Reduce cognitive availability while preserving content/history | Lifecycle/placement authority; durable placement or recoverability trace where material |
| `SUPERSEDE` | Replace the current reference state while preserving prior history | Authority to accept the successor state; explicit old→new relation / supersession event |
| `ERASE` | Intentionally remove durable historical content | Separate explicit erasure authority or legal basis; materiality/privacy check; deletion evidence where feasible; proportionate non-reconstructive Erasure Event by default |

`ERASE` is categorically different from `DISCARD`.

A raw review declared transient may legitimately be discarded after its material yield and unresolved residue have been assimilated.

A durable Event, decision, canonical Artifact, EffectReceipt, or historical evidence must not silently disappear through the same operation.

> **Crossing an assimilation boundary changes default retention semantics: transient work may be discarded; assimilated history may not be erased by an ordinary continuation.**

When durable content must legitimately be erased, a normal historical model is:

```text
content existed
→ authorized erasure
→ payload removed
→ non-reconstructive Erasure Event remains
```

Exceptional authority to erase even the erasure trace must be distinct, predefined, narrow, attributable, and non-self-extending.

### Propagation residue

`research/cognitive_packet_closure_and_packet_native_semantics.md` still lists `forget` among lifecycle operations. This remains a propagation item: the term should later be decomposed there rather than silently reinterpreted from this document.

---

## 9. Recovery does not rewrite causality

Document workflows expose a wider principle that applies to external Acts as well.

Existing recovery regimes include:

```text
ACID rollback
    restore uncommitted controlled state

TCC — Try / Confirm / Cancel
    preserve options before commitment

Saga
    perform compensating transactions after local commits

BPMN compensation
    attach explicit compensation handlers

Event Sourcing
    append corrective / reversal events without rewriting history

Selective Undo
    counteract an operation while respecting causal dependencies
```

The common lesson is:

> **Compensation is not necessarily undo, and state restoration is not historical erasure.**

A general history remains:

```text
S0
→ Act A
→ S1
→ Recovery Act R
→ S2
```

Even when `S2 ≈ S0`, the causal history remains `A happened; R happened`, and external consequences may survive.

A more reality-sensitive chain is:

```text
EffectIntent
→ authority / budget gate
→ Act
→ EffectReceipt
→ Reality Response
→ Observation
```

If the result is undesirable:

```text
Recovery assessment
→ retry forward
  OR cancel
  OR reverse controlled state
  OR compensate
  OR rectify
  OR restitute
  OR repair
```

Then:

```text
Recovery Act
→ Receipt
→ Reality Observation
→ Residual consequences
→ Damage assessment
→ Repair / Remedy if justified
→ Residue
```

Two invariants follow:

> **EffectReceipt is not Reality.**

> **CompensationReceipt is not Restored Reality.**

A compensation is itself a governed Act. It can fail, propagate, create new damage, require retry, or require its own compensation.

---

## 10. Reversibility Envelope

A Boolean such as:

```text
reversible = true / false
```

is too weak for externally consequential work.

An Act can be simultaneously:

```text
locally state-reversible
historically irreversible
externally partially compensable
informationally propagated
financially restitutable
legally repairable
physically irreversible
```

A **Reversibility Envelope** asks:

```text
what can be restored?
by whom?
until when?
at what cost?
what has propagated?
what cannot be restored?
what can be compensated?
what can be repaired?
what evidence must remain?
```

The envelope changes with time and propagation.

```text
draft email
→ sent email
→ read email
→ forwarded email
→ action taken because of email
```

Each step reduces some recovery options and may shift the problem from rollback toward compensation and repair.

> **Reversibility is a time-dependent property of reachable consequences, not an intrinsic Boolean property of the originating command.**

---

## 11. Pivot, option preservation, and dispositive Acts

Saga and TCC practice suggest a useful **Pivot** or commitment boundary.

Before the Pivot:

```text
preserve options
reserve
prepare
pause
cancel
```

After the Pivot:

```text
manage consequences
retry
compensate
repair
preserve residue
```

This leads to a broader governance rule:

> **The greater the option loss caused by an Act, the stronger the mandate and ex-ante scrutiny should be.**

A technically reversible Act may still close important possibilities or create propagated dependencies that are expensive to recover.

A useful distinction is therefore:

```text
PRESERVATIVE ACT
    keeps future options open

DISPOSITIVE ACT
    deliberately closes or consumes meaningful options
```

---

## 12. Losses, profits, costs, and damage

High-frequency systems cannot treat every negative micro-effect as a defect requiring individual repair.

Human institutions already reason with:

```text
losses & profits
operating cost
friction
expected failure
reserves
netting
```

The practical saying that one cannot make an omelette without breaking eggs captures a real engineering point:

> **Some negative consequences are constitutive costs of producing a desired transformation.**

But responsibility boundaries remain decisive.

```text
COST
    anticipated and proportionate consequence
    of the intended transformation

LOSS
    negative outcome tolerated within an explicit envelope

DAMAGE
    materially relevant harm to a protected interest or Principal
```

Losses and gains are not freely nettable across Principals:

```text
Alice: -100
Bob:   +120
system total: +20
```

does not establish admissibility.

> **A system may absorb losses within its own mandate more freely than it may externalize losses onto another Principal.**

---

## 13. Repair Frontier and accepted residue

Repair should not be an absolute requirement to restore every last unit of state.

A first approximation is:

```text
continue repair while marginal value of further repair
exceeds marginal cost of further repair
```

subject to:

```text
rights
mandate
responsibility
safety
non-externalization
protected evidence
```

The optimum is often partial:

```text
0 → 80% repaired      cheap
80 → 95%              moderate
95 → 99%              expensive
99 → 100%             disproportionate
```

The **Repair Frontier** is the point beyond which further repair is not justified under the applicable mandate and constraints.

Residue therefore has at least two states:

```text
unresolved residue
    still requires action or arbitration

accepted residue
    explicitly known and judged not to justify further repair
```

> **No remaining consequence warrants further action under the current mandate, evidence, responsibility boundaries, and proportionality threshold.**

This is a more realistic closure condition than perfect restoration.

---

## 14. Damage control, urgency, and triage

Sometimes the immediate objective changes before repair can begin.

```text
normal mode
    optimize outcome

repair mode
    restore what can still be restored

damage-control mode
    prevent the situation from becoming worse
```

Damage control prioritizes:

```text
contain propagation
preserve critical invariants
preserve evidence and future options
accept bounded sacrificial losses if necessary
stabilize
```

Only after stabilization should the system normally return to assessment, repair, responsibility, residue, and learning.

Because damage control creates exceptional authority, it should resemble an express mandate:

```text
predefined trigger
bounded scope
containment-only purpose
time limit / exit condition
traceability
non-self-extension
mandatory return to ordinary governance
```

> **Damage-control authority is justified by containment, not by convenience.**

### Urgency is not importance

A useful working interpretation is:

> **Urgency measures how rapidly delay destroys available options.**

Informally:

```text
Urgency ≈ rate of option loss with time
```

This explains why emergency action should often be preservative rather than dispositive:

```text
rescue now → judge later
stabilize now → diagnose more completely later
isolate now → investigate later
preserve evidence now → decide the merits later
```

> **Emergency action should preserve the possibility of later ordinary judgment whenever proportionate.**

> **In an emergency, do not solve everything. Save what would otherwise become impossible.**

### Triage

Triage is temporal compression of governance, not a final judgment of worth.

It asks:

```text
what cannot wait?
what can safely wait?
what can continue automatically?
what needs containment?
what crosses a material / dispositive boundary?
```

A candidate flow is:

```text
Event / Packet
→ harmless / local              → continue
→ safely deferrable             → defer
→ option loss imminent          → preservative act
→ propagation dangerous         → damage control
→ material / high option loss   → escalate
```

A future scheduler should therefore resist collapsing everything into one `priority` number. Relevant dimensions include:

```text
Importance
Urgency / time-to-option-loss
Materiality
Risk
Repairability
Cost
Human Attention Budget
```

`time_to_option_loss` remains a candidate concept rather than a stabilized field.

---

## 15. Scale changes the economics of consistency — hypothesis, not demonstrated threshold

The present Redactor/Reviewer loop is low-volume enough for a human to route, arbitrate, and decide retention directly.

Agentic systems can raise the rate of proposed and executed Acts dramatically. A simple pressure model is:

```text
λ = Acts / unit time
h = human review cost / Act
H = available human attention
```

Act-by-act governance becomes infeasible when:

```text
λ × h > H
```

But RT-001 did **not** measure a quantitative threshold at which this transition occurs. The following progression is therefore a research hypothesis, not an established law:

```text
REGIME I — transaction governance
    inspect acts individually

REGIME II — exception governance
    automate normal flow, escalate anomalies

REGIME III — invariant governance
    make most local acts harmless / monotone / bounded
    coordinate genuine pivots and invariant violations

REGIME IV — learning governance
    adapt governance from observed residue
```

The hypothesized qualitative shift is:

> **When transaction frequency grows faster than reconciliation capacity, scalable governance must change the granularity of what requires reconciliation.**

Future work should measure this rather than infer it solely from analogy.

---

## 16. Eventual reconciliation and the solution reservoir

Many human and natural systems tolerate temporary divergence and reconcile later:

```text
accounting
legal appeal and repair
financial netting
quality control
homeostatic regulation
immune escalation
DNA repair and damage tolerance
```

The shared pattern is broader than database Eventual Consistency:

> **Allow bounded local divergence, detect what matters, reconcile or repair proportionately, and reserve strong coordination for selected boundaries.**

A working term is **eventual reconciliation**.

Scalable mechanism families include:

```text
batching
netting
sampling
thresholds
local autonomy
compartmentalization
circuit breakers
buffers
statistical monitoring
periodic settlement
```

The biological examples are **illustrative solution reservoirs**, not accountability analogies. Biological systems do not provide the mandate, attribution, rights, or imputability semantics required for governed human/agent Acts.

> **Engineer the system so that most events remain locally harmless; reconcile aggregates asynchronously; spend scarce coordination and human attention only where invariants, Pivots, option loss, or material consequences require it.**

---

## 17. Micro-effects, material Acts, and settlement

Document editing already gives a small example.

A Redactor may perform hundreds of internal transformations:

```text
word substitutions
reordered paragraphs
abandoned formulations
self-corrections
```

It would be counterproductive to historicize each as a sovereign Act.

A useful boundary is:

```text
MICRO-EFFECT
    local, provisional, cheap,
    not independently governed

MATERIAL ACT
    crosses a governance boundary
    or creates external consequence

SETTLEMENT / ASSIMILATION
    durable state accepted into the Corpus
```

A document or Packet can therefore act as a unit of **semantic netting**: many micro-effects remain internal while only the material delta crosses a governed boundary.

The exact boundary between micro-effect and material Act remains to be operationalized and Reality-tested.

---

## 18. Human responsibility remains explicit

In the current low-tech loop, one human may simultaneously act as:

```text
Principal
Router / scheduler
Transport operator
Arbiter
Authority gate
Retention decision-maker
Ithaca controller
```

Automation may later separate these functions.

What must remain attributable is:

```text
who authorized?
who executed?
what caused the transition?
who decided what was retained or discarded?
who accepted residue?
```

Automation of transport and reconciliation does not make the machine sovereign over doctrine, history, third-party harm, or exceptional erasure.

---

## 19. Dogfooding protocol and current results

### RT-001 — Git-by-reference continuation — **PARTIAL**

Input:

```text
Git reference to this document
+
instruction to apply the Corpus Reviewer contract
```

Observed:

```text
no private drafting context available to Reviewer
no private context requested
substantive review completed
9 material findings returned
closure judged partial
```

Conclusion:

> Referential handoff works for a contract-aware Corpus handler, but a fully foreign handler still needs stronger Capsule scaffolding.

### RT-002 — Review Packet return and Redactor assimilation — **IN PROGRESS / v0.2 is the test output**

The Reviewer returned a complete Markdown review whose frontmatter declared itself transient, named its Ithaca, and requested a Redactor as next handler.

This v0.2 revision tests whether the Redactor can classify the material findings, revise the source, and preserve unresolved residue without requiring the Reviewer to reconstruct hidden conversational context.

Because the Redactor is the original drafting executor, RT-002 tests **handoff completeness**, not decorrelation from the original authoring frame.

### RT-003 — Transient review retention — **NOT YET CLOSED**

The raw review has not been committed to the Corpus. This v0.2 preserves its material yield and review identity.

The stronger test remains whether the raw artifact can later disappear from active working storage without losing any material obligation or causal evidence.

### RT-004 — Copy/paste fallback — **NEXT**

Transport a bounded by-copy Packet Capsule to a handler with no Git access.

Test:

> Can the handler continue from the text alone, and what extra information must the human add?

### RT-005 — Handler substitution — **PARTIALLY DEMONSTRATED**

The Reviewer was a different provider with no shared conversational state. Further tests should vary handler capability and Corpus familiarity.

### RT-006 — File identity test — **OPEN**

Rename or move the Markdown representation while preserving logical work identity.

### RT-007 — Recovery test — **OPEN**

Introduce or detect a substantive error after stabilization and verify that correction, compensation, supersession, repair, and historical trace remain distinct.

---

## 20. Measurements

### Closure Cost

```text
ClosureCost
    = additional information required after handoff
      before an admissible handler can continue correctly
```

For RT-001:

```text
private conversational additions: 0
public reference materialization: non-zero
semantic underspecification discovered: Packet Capsule definition
result: low private-context cost, non-zero protocol/materialization cost
```

### Human Routing Cost

```text
HumanRoutingCost
    = human effort required to transport,
      explain, repair context, arbitrate,
      and return the work
```

For the first loop, the observable routing operations were approximately:

```text
1. route Git reference + review instruction to Reviewer
2. retrieve / upload returned review artifact to Redactor
3. no explanatory context-repair message required
4. human arbitration remains relevant for load-bearing open points
```

This is a first instrumented instance, not a performance benchmark. Future cycles should record time, number of context-repair interventions, bytes/tokens transported, and number of human arbitration decisions.

The intended direction is to move the human role from:

```text
transporter
parser
context repairer
```

toward:

```text
Principal
arbiter
exception handler
```

---

## 21. Falsification conditions

The hypothesis is weakened if repeated tests show that:

- independent handlers require substantial undocumented conversation context;
- Packet identity collapses into file identity or placement;
- closure requires recursively embedding impractical history;
- Packet Capsule adds vocabulary but no measurable continuation or routing benefit;
- ordinary GitHub Issues, ADRs, tasks, or structured documents provide the same semantics with less machinery;
- review handoffs repeatedly lose dispositions, constraints, authority, or return semantics;
- transient retention destroys material residue needed for responsibility;
- richer packet semantics increase HumanRoutingCost rather than reducing it.

The possibility that a well-formed GitHub Issue or ADR already provides the simplest viable Capsule remains **load-bearing prior art / simplification residue**, not a dismissed objection.

Failure is useful evidence, not a reason to redefine success.

---

## 22. Assimilation of the first decorrelated review

The RT-001 Reviewer reported 0 hard factual errors, 5 novel objections, 3 material blind spots, and 1 unassimilated residue, for 9 material findings total.

The Redactor dispositions for those material findings are:

| # | Reviewer finding | Disposition | v0.2 treatment |
|---:|---|---|---|
| 1 | Packet Capsule under-defined relative to base Packet ontology | `integrated` | Added a crisp working definition, qualification test, and minimal illustrative Capsule |
| 2 | Recursive experiment only partially succeeds under strict foreign-handler substitution | `corrected` | Lowered frontmatter closure claim from `materializable` to `referential-partial-materializable`; recorded RT-001 result |
| 3 | High-frequency Regime I→IV argument stronger than its evidence | `reformulate` | Recast as a research hypothesis; added explicit measurement requirement |
| 4 | `forget` decomposition lacked authority/evidence semantics | `integrated` | Added lifecycle authority/evidence expectations for DISCARD, COOL/ARCHIVE, SUPERSEDE, ERASE |
| 5 | Biological analogy can overreach accountability semantics | `integrated` | Marked biology as illustrative solution reservoir only, not authority/imputability analogy |
| 6 | Missing concrete minimal Packet Capsule format | `integrated` | Added minimal YAML illustration and qualification test |
| 7 | ClosureCost / HumanRoutingCost not instrumented | `integrated` | Recorded first qualitative/operational RT-001 measurements; quantitative benchmarking remains open |
| 8 | Neighboring portable knowledge/capsule artifacts need more systematic comparison | `piste` | Preserved for dedicated prior-art exploration rather than asserting novelty here |
| 9 | Simplest viable Capsule may be an ordinary structured GitHub Issue or ADR | `conceded:load-bearing` | Preserved explicitly as a falsification/simplification condition |

No Reviewer marker was dropped: the review contained no `[unverified]` or `[provisional]` findings.

### Correlation risk preserved

The Reviewer noted that both Redactor and Reviewer share a preference for explicit packet-like resumability and may therefore under-weight simpler existing artifacts. This remains a live correlation risk and motivates the Issue/ADR simplification test.

### Review retention decision

The raw review remains a **transient working artifact by standing policy** and is not copied into the Git Corpus. Its material yield is represented by the review frontmatter, this disposition table, RT-001 result, and remaining open items.

This does not erase the historical fact that a review occurred.

---

## 23. Current continuation state

### Established

- Some Corpus documents already move between replaceable Redactor and Reviewer handlers.
- Markdown, Git references, files, and copy/paste are working transport channels.
- Human routing currently supplies orchestration, arbitration, and retention decisions.
- Packet Closure gives a falsifiable criterion for handoff quality.
- RT-001 required no private conversational context, but exposed incomplete foreign-handler materialization.
- A Packet Capsule must be distinguished from a merely closed Artifact by identified work/frontier plus continuation and return semantics.
- Raw review artifacts may be transient; durable Corpus retention is a separate decision.
- Recovery requires distinctions among rollback, compensation, rectification, restitution, repair, damage control, and residue.
- Reversibility is better modeled as a time- and consequence-dependent envelope than a Boolean.
- Urgency, importance, option loss, and damage control are distinct governance dimensions.
- High transaction-rate governance is a live scaling hypothesis requiring measurement rather than assertion.

### Open / load-bearing

- What is the canonical storage-independent identity mechanism for a document-backed Packet?
- Is `Packet Capsule` genuinely useful beyond a disciplined Issue/ADR/document format?
- Which metadata belongs in the document versus an external Packet store?
- Which transitions deserve durable Packet identity?
- How should Reversibility Envelope and time-to-option-loss be represented without schema inflation?
- What operational test separates MICRO-EFFECT from MATERIAL ACT?
- How much review history is the minimum sufficient causal frontier?
- How should compensation, repair, accepted residue, and Damage Control interact with COP accounting and lifecycle?
- Can document-backed Packets scale beyond human-routed workflows while remaining inspectable?
- What do neighboring 2026 "Knowledge Capsule" / portable agent handoff artifacts already solve?

### Next action

> **Run RT-004: create a bounded by-copy representation of this work using the minimal Capsule criteria, give it to a capable handler with no Git access and no prior Corpus context, and measure exactly what additional information, if any, the human must provide before correct continuation.**

This next action is intentionally executable from the document itself.

---

## 24. Prior-art map — non-exhaustive

This document does not claim novelty for the mechanisms below. They are part of the solution reservoir to be explored and recombined carefully.

### Distributed transactions and recovery

- Hector Garcia-Molina and Kenneth Salem, **Sagas**, ACM SIGMOD, 1987: https://doi.org/10.1145/38713.38742
- Microsoft Azure Architecture Center, **Saga distributed transactions pattern**: https://learn.microsoft.com/azure/architecture/patterns/saga
- Microsoft Azure Architecture Center, **Compensating Transaction pattern**: https://learn.microsoft.com/azure/architecture/patterns/compensating-transaction
- Oracle Transaction Manager for Microservices, **TCC transaction model**: https://docs.oracle.com/en/database/oracle/transaction-manager-for-microservices/26.1/tmmdv/tcc-transaction-model.html
- Camunda 8, **Compensation events and handlers**: https://docs.camunda.io/docs/components/modeler/bpmn/compensation-events/

### Durable execution and agentic recovery

- Temporal, durable execution and compensating patterns: https://temporal.io/
- Restate, durable execution and Sagas: https://docs.restate.dev/guides/sagas
- DeepSeek Harness / Cordis reversible effects: https://deepseek-harness.github.io/deepseek-harness/en/reference/cordis-primer
- Model Context Protocol, current tool annotations: https://modelcontextprotocol.io/specification/2025-11-25/schema
- MCP SEP-3172, proposed recovery / compensation metadata: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/3172

### History, correction, and evidence

- Microsoft Azure Architecture Center, **Event Sourcing pattern**: https://learn.microsoft.com/azure/architecture/patterns/event-sourcing
- Martin Fowler, **Reversal Adjustment**: https://martinfowler.com/eaaDev/ReversalAdjustment.html
- NIST SP 800-61r2, **Computer Security Incident Handling Guide**: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf
- WHO, **Triage**: https://www.who.int/tools/triage

### Legal and institutional analogies

Relevant concepts include:

```text
provisional / conservatory measures
nullity
restitution
compensation
repair of damage
right to erasure
traceability of erasure
appeal
finality
accounting netting
loss reserves
```

These are analogical resources, not evidence that software recovery, biological regulation, accounting, and legal responsibility are identical domains.

### Portable knowledge / handoff artifacts — open comparison

The RT-001 Reviewer identified contemporary `Knowledge Capsule` and portable agent-capsule work as neighboring prior art. A systematic comparison is still required before making novelty claims about document-backed Packet Capsules.

---

## 25. Working compression

> **A document can be more than stored knowledge: when it represents identified continuing work at a causal frontier and carries enough closure, constraints, routing, continuation, and return semantics to survive handler substitution, it can function as a human-readable Cognitive Packet Capsule.**

> **A well-closed Artifact is not automatically a Packet Capsule; continuation and return semantics matter.**

> **Packet durability is not Corpus retention. Persist work long enough to continue it; preserve knowledge when assimilation gives it durable value.**

> **Before commitment, preserve options. After commitment, preserve causality. When reversal is incomplete, compensate. When consequences become damage, repair. When further repair is disproportionate, preserve and attribute accepted residue.**

> **In an emergency, do not solve everything. Save what would otherwise become impossible.**

> **At scale, do not govern every event equally. Keep most micro-effects local and harmless, reconcile aggregates, and spend scarce coordination and human attention on Pivots, invariant violations, option loss, material consequences, and responsibility.**

RT-001 did not prove the document-backed Packet hypothesis. It did something more useful: it showed that the handoff can work without private conversational state while exposing exactly where the current Capsule concept is still incomplete.
