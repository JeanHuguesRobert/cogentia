---
title: "Documents as Cognitive Packets"
subtitle: "Document-backed packet capsules, human-routed handoffs, lifecycle, recovery, and recursive Reality Tests"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica, France"
date: "2026-08-25"
last_modified_at: "2026-08-26"
version: "0.4"
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
  - "research/ideas_to_explore_as_issues.md"
  - "research/cogentia_commons_living_corpus.md"
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
  - github-issues
  - substrate-study
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
human_arbitration_by: "Jean Hugues Noël Robert"
changelog:
  - "v0.1 (2026-08-25) — initial source note and recursive document-backed packet experiment."
  - "v0.2 (2026-08-26) — assimilated RT-001 decorrelated review; tightened Packet Capsule definition, lowered closure claim, added minimal capsule contract, lifecycle authority/evidence rules, first handoff measurements, and explicit review dispositions."
  - "v0.3 (2026-08-26) — post-review arbitration clarified that Packet Closure is relative to a declared admissible-handler environment; reinterpreted RT-001 accordingly; split by-copy transport from foreign-handler self-bootstrap; propagated the clarification to the general Packet Closure note."
  - "v0.4 (2026-08-26) — applied Occam to keep GitHub Issues inside the same study; introduced comparative substrate Reality Tests, treated Issue roles contextually rather than ontologically, and used issue #120 as a live case for Packet identity, work loci, assimilation, and Reactive Corpus adaptation."
x-cognitive-packet:
  candidate: true
  profile: "document-backed-capsule"
  transmission_modes:
    - "git-reference"
    - "markdown-file"
    - "copy-paste"
  identity_claim: "provisional-no-storage-independent-packet-id-yet"
  closure_claim: "relative-referential-materializable-for-declared-handler-class"
  admissible_handler_class: "Corpus-aware handler able to materialize declared contracts and references"
  ithaca: "research/documents_as_cognitive_packets.md"
  current_phase: "comparative-substrate-refinement"
  next_handler_capability: "corpus-aware-by-copy-review-test"
  retention_policy_for_review_artifacts: "transient-until-assimilated"
  rt001:
    reviewer_result: "partial"
    post_arbitration_interpretation: "pass-for-declared-corpus-reviewer-handler-class"
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
→ human arbitration of the closure criterion
→ this document v0.3
→ comparative substrate refinement
→ this document v0.4
```

### RT-001 result and subsequent arbitration

The Reviewer declared no access to the originating conversation or private drafting state. It reconstructed the thesis and performed a substantive review from the public Git reference and public Corpus references alone.

The Reviewer returned:

```text
closure_result: partial
private conversational context required: no
public reference materialization required: yes
closure for contract-aware Corpus handler: good
closure for completely foreign handler: incomplete
```

The `partial` result is preserved as the historical Reviewer yield.

Subsequent human arbitration exposed that two experimental variables had been conflated:

```text
transport / closure mode
    Git reference vs copied material

handler competence / environment
    Corpus-aware admissible handler vs epistemically blank generic agent
```

A Cognitive Packet is not required by default to teach an arbitrary zero-knowledge receiver the whole protocol environment. Closure is relative to a declared admissible handler and shared environment.

Therefore RT-001 is now interpreted more precisely as:

> **RT-001 passes the important referential-closure test for the declared Corpus-aware Reviewer handler class: no predecessor-private conversational state was required. It does not establish, and was not required to establish, self-bootstrap closure for a completely foreign generic agent.**

The generic-agent case remains interesting as a separate stress test.

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

RT-001 exposed an under-definition in v0.1. The current working definition is now aligned with the general Packet Closure note:

> **A Packet Capsule is a bounded, transportable representation of an identified Cognitive Packet at a declared causal frontier, carrying or verifiably materializing enough state, constraints, continuation, routing, and return semantics for an admissible handler, operating in a declared shared environment, to resume the work without undocumented private context.**

The words **identified Packet**, **declared causal frontier**, and **admissible handler environment** distinguish a Capsule from both a merely well-written Artifact and an impossible demand for context-free universal intelligibility.

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
Admissible handler / environment assumptions
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
3. **Handler contract** — is the admissible handler/environment sufficiently declared to make the closure claim falsifiable?
4. **Closure** — can that handler/environment obtain required context without predecessor-private state?
5. **Continuation** — is it clear what kind of handler can advance the work and what remains to do?
6. **Return** — is it clear where the yield belongs?
7. **Constraints** — are material authority, policy, budget, or resumption constraints preserved when relevant?

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
    admissible_handler: "corpus-reviewer/v0.5"
    environment: "cogentia-public-corpus"
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
→ replaceable admissible handler
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

## 6. Packet Closure is relative to a declared handler environment

The general Packet Closure note now makes the relation explicit:

\[
Closed(p,h,E)=true
\]

where:

```text
p = Packet / Capsule
h = admissible handler
E = declared shared execution environment
```

The environment may legitimately provide documented shared conventions:

```text
protocol version
schemas
Reviewer / Redactor contract
resolver rules
shared Corpus
public instructions
installed declared Skills
standard runtime conventions
```

What Closure forbids is not all external knowledge. It forbids **undeclared dependence on predecessor-private state**:

```text
previous handler's private session memory
untracked local notes
hidden conversational context
unstated author intentions
undocumented private conventions
```

This prevents a pathological interpretation in which every Packet would have to embed its protocol, its Corpus, a dictionary, and recursively all prerequisites needed by an epistemically blank receiver.

A zero-knowledge receiver can still be studied under a distinct **self-bootstrap** test: can the Capsule teach or materialize enough protocol for that receiver to become an admissible handler? This may be useful, but it is not the default closure criterion.

Closure modes remain:

```text
INLINE
    required task state embedded directly

REFERENTIAL
    required task state reachable through stable references

MATERIALIZABLE
    enough resolver information exists to retrieve and verify it
```

The mode and the handler contract are orthogonal dimensions.

A document that says:

```text
continue what we discussed yesterday
use the second idea
apply the same correction as before
```

is not closed merely because it has metadata: the hidden predecessor context is neither declared environment nor materializable state.

### RT-001 qualitative measurement

The first handoff produced an initial measurement:

```text
transport to Reviewer:
    1 human routing action (Git reference + reviewer instruction)

admissible handler class:
    Corpus-aware Reviewer able to apply reviewer.md and resolve public refs

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

historical Reviewer closure_result:
    partial

post-arbitration closure interpretation:
    pass for declared handler class;
    foreign-handler self-bootstrap untested
```

This is not yet a time-and-cost benchmark. It establishes a useful fact:

> **The handoff survived provider/process substitution without conversational context repair. The remaining question is how explicitly the admissible handler/environment contract should be represented.**

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

### Propagation status

The earlier propagation residue is now resolved: `research/cognitive_packet_closure_and_packet_native_semantics.md` v0.2 decomposes the previous generic `forget` lifecycle term into distinct retention operations and explicitly separates `ERASE` from `DISCARD`.

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

### RT-001 — Git-by-reference continuation — **PASS FOR DECLARED HANDLER CLASS; REVIEWER YIELD PRESERVED AS PARTIAL**

Input:

```text
Git reference to this document
+
instruction to apply the Corpus Reviewer contract
```

Declared effective handler environment:

```text
replaceable Reviewer
able to read/materialize reviewer.md
able to resolve public Corpus references
no access to predecessor-private conversation required
```

Observed:

```text
no private drafting context available to Reviewer
no private context requested
substantive review completed
9 material findings returned
Reviewer reported closure_result: partial
```

Post-review arbitration:

> The `partial` report was based on an additional concern about a completely foreign handler. That concern is valid as a self-bootstrap question but is not a default Packet Closure requirement. For the declared Corpus-aware Reviewer class, the referential handoff succeeded.

### RT-002 — Review Packet return and Redactor assimilation — **PASS WITH OPEN RESIDUE**

The Reviewer returned a complete Markdown review whose frontmatter declared itself transient, named its Ithaca, and requested a Redactor as next handler.

The Redactor classified the material findings, revised the source, and preserved unresolved residue without requiring the Reviewer to reconstruct hidden conversational context.

Because the Redactor was the original drafting executor, RT-002 tested **handoff completeness**, not decorrelation from the original authoring frame.

The subsequent human correction of the closure criterion was itself preserved as a new causal step rather than rewriting the Reviewer yield.

### RT-003 — Transient review retention — **IN PROGRESS**

The raw review has not been committed to the Corpus. v0.2/v0.3 preserve its material yield, review identity, dispositions, and subsequent arbitration.

The stronger test remains whether the raw artifact can later disappear from active working storage without losing any material obligation or causal evidence.

### RT-004A — By-copy transport equivalence — **NEXT**

Keep the handler class approximately constant while changing the transport/closure mode.

Test setup:

```text
handler:
    Corpus-aware Reviewer or equivalent admissible handler

shared task competence:
    unchanged

Git access during test:
    unavailable / not used

transport:
    copied Markdown Capsule
    + copied minimum declared handler contract / dependencies

originating conversation:
    unavailable
```

Test:

> Can the same class of admissible handler continue correctly by copy, and what additional material must be copied compared with RT-001 referential closure?

This tests `REFERENTIAL → INLINE/by-copy` without simultaneously changing handler competence.

### RT-004B — Foreign-handler self-bootstrap — **OPTIONAL STRESS TEST**

Use a generic agent with no prior Corpus knowledge and ask the Capsule to materialize enough protocol for it to become a minimal admissible handler.

This asks:

> Can a previously foreign receiver bootstrap itself from the Capsule and declared protocol material?

Failure here does **not** imply ordinary Packet Closure failure. It measures a stronger self-description / self-bootstrap property.

### RT-005 — Handler substitution — **PARTIALLY DEMONSTRATED**

The Reviewer was a different provider with no shared conversational state. Further tests should vary handler implementations while keeping the declared handler contract stable enough to isolate substitution effects.

### RT-006 — File identity test — **OPEN**

Rename or move the Markdown representation while preserving logical work identity.

### RT-007 — Recovery test — **OPEN**

Introduce or detect a substantive error after stabilization and verify that correction, compensation, supersession, repair, and historical trace remain distinct.

---

## 20. Measurements

### Closure Cost

```text
ClosureCost(p,h,E)
    = additional information required after handoff
      before declared admissible handler h in environment E
      can continue correctly
```

This definition avoids charging the Packet for all knowledge that a legitimate execution environment is already declared to provide.

For RT-001:

```text
private conversational additions: 0
public reference materialization: non-zero
semantic underspecification discovered: Packet Capsule / handler-boundary definition
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
4. one later human conceptual arbitration corrected the experiment definition
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

- declared admissible handlers require substantial undocumented predecessor-private context;
- the supposed handler/environment contract is so broad or vague that Closure becomes unfalsifiable;
- Packet identity collapses into file identity or placement;
- closure requires recursively embedding impractical history rather than relying on explicit shared environment and materializable references;
- Packet Capsule adds vocabulary but no measurable continuation or routing benefit;
- ordinary GitHub Issues, ADRs, tasks, or structured documents provide the same semantics with less machinery;
- review handoffs repeatedly lose dispositions, constraints, authority, or return semantics;
- transient retention destroys material residue needed for responsibility;
- richer packet semantics increase HumanRoutingCost rather than reducing it.

The possibility that a well-formed GitHub Issue or ADR already provides the simplest viable Capsule remains **load-bearing prior art / simplification residue**, not a dismissed objection. From v0.4 this is no longer only a future comparison: GitHub Issues are treated explicitly as a comparative substrate case inside this same document.

Failure of a zero-knowledge generic agent to bootstrap is **not**, by itself, a falsification of ordinary Closure unless such self-bootstrap was part of the declared handler profile.

Failure is useful evidence, not a reason to redefine success.

---

## 22. Assimilation of the first decorrelated review and post-review arbitration

The RT-001 Reviewer reported 0 hard factual errors, 5 novel objections, 3 material blind spots, and 1 unassimilated residue, for 9 material findings total.

The Redactor dispositions recorded in v0.2 were:

| # | Reviewer finding | Disposition | v0.2 treatment |
|---:|---|---|---|
| 1 | Packet Capsule under-defined relative to base Packet ontology | `integrated` | Added a crisp working definition, qualification test, and minimal illustrative Capsule |
| 2 | Recursive experiment only partially succeeds under strict foreign-handler substitution | `corrected` | Lowered frontmatter closure claim and recorded RT-001 result |
| 3 | High-frequency Regime I→IV argument stronger than its evidence | `reformulate` | Recast as a research hypothesis; added explicit measurement requirement |
| 4 | `forget` decomposition lacked authority/evidence semantics | `integrated` | Added lifecycle authority/evidence expectations for DISCARD, COOL/ARCHIVE, SUPERSEDE, ERASE |
| 5 | Biological analogy can overreach accountability semantics | `integrated` | Marked biology as illustrative solution reservoir only, not authority/imputability analogy |
| 6 | Missing concrete minimal Packet Capsule format | `integrated` | Added minimal YAML illustration and qualification test |
| 7 | ClosureCost / HumanRoutingCost not instrumented | `integrated` | Recorded first qualitative/operational RT-001 measurements; quantitative benchmarking remains open |
| 8 | Neighboring portable knowledge/capsule artifacts need more systematic comparison | `piste` | Preserved for dedicated prior-art exploration rather than asserting novelty here |
| 9 | Simplest viable Capsule may be an ordinary structured GitHub Issue or ADR | `conceded:load-bearing` | Preserved explicitly as a falsification/simplification condition |

No Reviewer marker was dropped: the review contained no `[unverified]` or `[provisional]` findings.

### Post-review human arbitration on finding 2

The human Principal challenged the implicit experimental assumption that a target agent with no Git access should also be a generic agent with no Corpus knowledge.

This objection is **integrated** and changes the interpretation, not the historical review:

```text
Reviewer finding:
    foreign generic handler lacks enough scaffolding

preserved truth:
    yes — useful self-bootstrap observation

rejected implication:
    therefore ordinary Packet Closure is only partial

replacement criterion:
    Closure is evaluated relative to a declared admissible-handler
    class and environment; generic self-bootstrap is a separate profile
```

This is a concrete example of a Reality Test correcting the **test definition itself**.

The general semantic correction has been propagated to `research/cognitive_packet_closure_and_packet_native_semantics.md` v0.2.

### Correlation risk preserved

The Reviewer noted that both Redactor and Reviewer share a preference for explicit packet-like resumability and may therefore under-weight simpler existing artifacts. This remains a live correlation risk and motivates the Issue/ADR simplification test.

### Review retention decision

The raw review remains a **transient working artifact by standing policy** and is not copied into the Git Corpus. Its material yield is represented by the review frontmatter, this disposition table, RT-001 result, subsequent human arbitration, and remaining open items.

This does not erase the historical fact that a review occurred.

---

## 22bis. Comparative substrate Reality Tests — GitHub Issues

### Occam rule for this research

The document-backed Packet hypothesis should not generate one new research document for every candidate substrate while those cases are still testing the same central question.

Working rule:

> **Do not create one research document per candidate substrate while the cases are still refining the same Cognitive Packet abstraction.**

`Documents as Cognitive Packets` therefore treats GitHub Issues, and potentially later ADRs, Pull Requests, email threads, COP continuations, or other containers, as comparative cases inside one evolving study until a case becomes genuinely autonomous.

The purpose is not to classify everything as a Cognitive Packet. It is to use concrete substrates as Reality Tests of the abstraction.

> **“X as Cognitive Packets” is not primarily a classification exercise. It is a Reality Test: where the mapping works and where it breaks are both evidence about what a Cognitive Packet should mean.**

A common comparison should ask at least:

| Dimension | Question |
|---|---|
| Identity | Does the continuing work survive the concrete container? |
| Closure | Can an admissible handler continue without predecessor-private context? |
| Frontier | Is the represented causal/state frontier identifiable? |
| Continuation | Is it clear what remains to do and what capability can advance it? |
| Routing | Can work be directed without confusing routing metadata with authority? |
| Authority | Under whose Mandate may consequential work proceed? |
| Lineage | Can parent/child or causal descendants be reconstructed? |
| Return | Where does the yield belong? |
| Assimilation | What becomes durable Corpus memory? |
| Retention | What may remain transient, cool, archive, supersede, or disappear? |
| Quiescence | What does “finished” actually mean? |

Possible results are deliberately non-binary. A substrate object may act as, or combine, a:

```text
Cognitive Packet
Packet Capsule
Artifact
Placement
Trace
Projection
Store
Router surface
persistent work locus
or none of these
```

`persistent work locus` is descriptive vocabulary only at this stage, not a proposed new COP primitive.

### GitHub Issues as a comparative case

The Corpus already contained an earlier intuition. `research/ideas_to_explore_as_issues.md` describes an Issue as a **memory packet for continuation** and uses the compression:

```text
Issues capture motion.
Checkpoints verify routing.
Commits stabilize steps.
```

`research/cogentia_commons_living_corpus.md` likewise treats Issues as **memory in tension**: one way to materialize unfinished work outside private conversational state.

The stronger Packet model developed since then now permits a more discriminating interpretation.

A GitHub Issue can expose several Packet-related roles depending on use:

| Issue element | Candidate Cognitive Packet reading |
|---|---|
| issue body | Packet Capsule or current work snapshot |
| issue URL / number | durable address / placement reference, not necessarily logical Packet identity |
| comments | continuations, observations, handler yields, sometimes event-like trace |
| activity/history | partial causal trace |
| assignees | routing hint or handler selection, **not Mandate** |
| labels / fields | projections of envelope or routing metadata |
| linked commits / PRs | Artifacts, yields, Effects, or evidence depending on context |
| open state | active, waiting, or dormant work; not one unique lifecycle meaning |
| close state | candidate quiescence or routing completion; not proof of assimilation |
| reopen | reactivation of the work |

This leads to a deliberately qualified statement:

> **A GitHub Issue can function as a Packet Capsule, a placement, a trace-bearing work container, or a persistent locus of cognitive work. It is not intrinsically identical to a Cognitive Packet.**

The mapping is contextual rather than one-to-one.

### Issue #120 as a live case

Cogentia issue #120, `Measured Risk doctrine — govern for bounded value creation, not risk minimization`, provides a useful live instance:

```text
logical work:
    propagate Measured Risk through the Corpus

represented / hosted by:
    cogentia#120
        objective
        guardrails
        propagation targets
        closure condition
        current residue

current handler:
    Codex

expected yields:
    commits / findings / tests

return:
    Issue state / comments + Corpus changes

later:
    verify propagation
    assimilate remaining learning
    close or preserve explicit residue
```

The important identity question is:

> **If this work later leaves GitHub Issues and continues in COP/Postgres or another substrate, is it still the same continuing work?**

The current working answer is **probably yes**, which strengthens the distinction:

```text
Packet identity
≠ GitHub Issue identity
```

but this remains a hypothesis to test rather than a finished ontology.

### Mobility and persistent loci

The document case emphasized transportability. The Issue case exposes a complementary property: some cognitive structures are useful precisely because they remain addressable while work and handlers come to them.

```text
mobile Packet / Capsule
        ↓
persistent work locus
        ↕
handlers / comments / observations / children / artifacts
        ↓
new Packets / yields / assimilated state
```

This suggests that a distributed cognitive system may need both:

```text
things that move
+
places where work persists
```

It would be premature to make `persistent work locus` a new first-class object. Existing notions such as Store, Placement, Topic, Task, Issue projection, or Packet host may already be sufficient. The comparative test should determine this rather than vocabulary proliferation.

### Three provisional findings

The Issue case strengthens three broader principles:

> **1. A Cognitive Packet should not be identified a priori with its representation or hosting substrate.**

> **2. A single substrate object may realize several Packet-related roles over its lifecycle; the mapping is contextual rather than one-to-one.**

> **3. Comparative substrate cases are Reality Tests of the Cognitive Packet abstraction: mismatches are evidence for refining the abstraction, not failures to be normalized away.**

A stronger candidate interpretation is emerging:

> **The Cognitive Packet may be the logical continuing work, while envelope/payload objects, documents, Issues, COP records, database rows, and copied Capsules are representations, projections, placements, or loci through which that work becomes continuable.**

The word **may** remains load-bearing. The study has not yet earned a final ontological definition.

### Reactive / Living Corpus as observed adaptation

This comparative method also makes the Living/Reactive Corpus itself observable as an evolving system rather than merely a document collection.

The biological analogy must remain bounded: the Corpus is not claimed to be biologically alive. The existing `Living Corpus` and `Corpus Sleep Cycle` metaphors are useful because the system functionally exhibits processes such as working memory, consolidation, propagation, cooling, regression testing, and reactivation.

The recent irreversibility → recovery → Measured Risk episode can be represented as:

```text
local observation:
    irreversibility is not adequately Boolean

→ exploration
→ compensation / repair / residue distinctions
→ second observation:
    risk minimization is itself too restrictive
→ candidate learning:
    Measured Risk
→ source assimilation
→ propagation request: cogentia#120
→ distributed handler work
→ dependent Corpus changes
→ verification / remaining residue
→ altered future agent behaviour
```

This is usefully described as **adaptation of the Corpus's regulatory response** without treating the organism metaphor as proof.

The important empirical question is whether the change survives handler substitution and changes future behaviour in the intended places. That connects this substrate study directly to the existing Corpus Sleep Cycle concepts of candidate learning, assimilation, regression, and cold-handler testing.

---

## 23. Current continuation state

### Established

- Some Corpus documents already move between replaceable Redactor and Reviewer handlers.
- Markdown, Git references, files, and copy/paste are working transport channels.
- Human routing currently supplies orchestration, arbitration, and retention decisions.
- Packet Closure is relational: `Closed(p,h,E)` is judged relative to a declared admissible handler and shared environment.
- Closure forbids dependence on undocumented predecessor-private state; it does not require every Packet to embed every shared protocol convention.
- RT-001 required no private conversational context and succeeded for the declared Corpus-aware Reviewer handler class.
- A completely foreign generic agent tests self-bootstrap, not ordinary Closure, unless explicitly declared as the target handler profile.
- A Packet Capsule must be distinguished from a merely closed Artifact by identified work/frontier plus continuation and return semantics.
- Raw review artifacts may be transient; durable Corpus retention is a separate decision.
- Recovery requires distinctions among rollback, compensation, rectification, restitution, repair, damage control, and residue.
- Reversibility is better modeled as a time- and consequence-dependent envelope than a Boolean.
- Urgency, importance, option loss, and damage control are distinct governance dimensions.
- High transaction-rate governance is a live scaling hypothesis requiring measurement rather than assertion.
- Comparative substrate cases should test the Cognitive Packet abstraction rather than assume that each candidate object is a Packet.
- A substrate object may realize several Packet-related roles contextually; representation/hosting identity should not be collapsed into logical Packet identity.
- GitHub Issues are a particularly rich test because they combine durable addressability, mutable document state, routing hints, comments/history, and lifecycle while still plausibly remaining only a host/projection of the continuing work.

### Open / load-bearing

- How should a Packet declare the minimum admissible-handler/environment contract without reproducing large amounts of protocol metadata?
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
- Does a `persistent work locus` name a genuinely missing abstraction, or are Store / Placement / Topic / Task / Issue projection already sufficient?
- Can the work represented by issue #120 migrate to a different substrate while preserving a defensible logical identity and causal frontier?
- Which other candidate substrates are worth comparing without violating Occam by proliferating research artifacts?

### Next action

Two observations can proceed without creating another research document:

1. **Observe issue #120 after the current Codex hop**: determine whether the Issue and its materializable references were sufficient for continuation, what yields return to the Issue/Corpus, what remains outside it, and whether closing the Issue corresponds to actual assimilation/quiescence.
2. **Run RT-004A when useful** as the controlled transport experiment: keep the admissible Reviewer capability approximately constant, remove Git as the runtime transport/materialization channel, provide the document-backed Capsule and minimum declared handler dependencies by copy, and measure the additional material and human context-repair required.

The optional RT-004B self-bootstrap stress test can follow later if it remains useful.

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

### Corpus-native issue / continuation prior art

- `research/ideas_to_explore_as_issues.md` — Issues as memory packets for continuation, with Occam and checkpoint discipline.
- `research/cogentia_commons_living_corpus.md` — Issues as memory in tension inside a continuation-aware Living Corpus.

These internal sources predate the v0.4 comparative substrate formulation and are part of its archaeology rather than retroactive evidence that the current Packet ontology was already complete.

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

> **A document can be more than stored knowledge: when it represents identified continuing work at a causal frontier and carries enough closure, constraints, routing, continuation, and return semantics to survive substitution within a declared admissible-handler environment, it can function as a human-readable Cognitive Packet Capsule.**

> **Packet Closure is relative to a declared handler/environment. It excludes hidden predecessor state; it does not require universal zero-knowledge intelligibility.**

> **A well-closed Artifact is not automatically a Packet Capsule; continuation and return semantics matter.**

> **A Cognitive Packet should not be identified a priori with its representation or hosting substrate. One substrate object may realize several Packet-related roles, and the mapping may change over its lifecycle.**

> **“X as Cognitive Packets” is a Reality Test of the abstraction, not a requirement to classify X as a Packet. Matches and mismatches are both evidence.**

> **A GitHub Issue may host or project a Cognitive Packet as Capsule, placement, trace-bearing work container, or persistent work locus without being identical to the logical continuing work.**

> **Packet durability is not Corpus retention. Persist work long enough to continue it; preserve knowledge when assimilation gives it durable value.**

> **Before commitment, preserve options. After commitment, preserve causality. When reversal is incomplete, compensate. When consequences become damage, repair. When further repair is disproportionate, preserve and attribute accepted residue.**

> **In an emergency, do not solve everything. Save what would otherwise become impossible.**

> **At scale, do not govern every event equally. Keep most micro-effects local and harmless, reconcile aggregates, and spend scarce coordination and human attention on Pivots, invariant violations, option loss, material consequences, and responsibility.**

RT-001 did not prove the document-backed Packet hypothesis. It demonstrated something more precise: a cross-provider handoff can succeed without predecessor-private conversational state when the handler contract and durable environment are declared, and a Reality Test can reveal that the test boundary itself needs correction.

The GitHub Issue case adds a second lesson: **the Cognitive Packet abstraction should be allowed to become more precise when a useful substrate refuses a one-to-one mapping. The refusal is part of the result.**
