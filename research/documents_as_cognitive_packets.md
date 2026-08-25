---
title: "Documents as Cognitive Packets"
subtitle: "Document-backed packet capsules, human-routed handoffs, lifecycle, recovery, and a recursive Reality Test"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica, France"
date: "2026-08-25"
last_modified_at: "2026-08-25"
version: "0.1"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
document_function: "research"
visibility: "public"
lifecycle_state: "working"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/documents_as_cognitive_packets.md"
methodology:
  - "Second Method"
  - "Reactive Corpus"
  - "Cognitive Packet Switching"
  - "Reality Test"
ai_assisted_by:
  - "GPT-5.6 Sol (research synthesis and initial redaction)"
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
  status: "unreviewed"
  reviewed_by: []
update_policy: "UP-DEFAULT-REVIEWED"
x-cognitive-packet:
  candidate: true
  profile: "document-backed-capsule"
  transmission_modes:
    - "git-reference"
    - "markdown-file"
    - "copy-paste"
  closure_claim: "materializable"
  ithaca: "research/documents_as_cognitive_packets.md"
  current_phase: "initial-redaction"
  next_handler_capability: "decorrelated-review"
  retention_policy_for_review_artifacts: "transient-until-assimilated"
---

# Documents as Cognitive Packets

## 1. Status and experiment

This document studies a working hypothesis:

> **Some documents can serve as human-readable, transportable representations of Cognitive Packets, especially as document-backed Packet Capsules.**

It also attempts to be its own first serious test case.

The claim is deliberately weaker than:

> every document is a Cognitive Packet.

A document may instead be:

```text
Map
Artifact
Packet Capsule
Trace
Projection
```

and these roles must not be collapsed.

Likewise, a GitHub file is not automatically the identity of a Cognitive Packet. It may be one durable placement or representation of work whose identity must survive renaming, movement, replication, storage changes, and handler substitution.

This document is therefore marked as a **candidate document-backed Cognitive Packet Capsule**, not declared one by fiat.

Its first Reality Test is recursive:

```text
this document
→ Redactor
→ Git / Markdown transport
→ decorrelated Reviewer
→ review.md
→ human routing and arbitration
→ Redactor
→ assimilation into this document
```

The experiment succeeds only to the extent that another admissible handler can understand, criticize, continue, and return the work without relying on undocumented private conversational state.

---

## 2. Existing practice: document ping-pong already behaves like packet switching

The Corpus already contains a recurring production workflow in which documents move between at least two process roles:

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

The concrete handlers are often different agents. For example, one AI may act as Redactor and another as Reviewer. Transport may happen through:

```text
GitHub links
Markdown files
file download/upload
plain copy/paste
```

The human operator frequently performs the routing manually.

This is already a primitive form of **human-routed Cognitive Packet Switching**.

The Redactor and Reviewer contracts make the packet interpretation unusually plausible because they already require handler substitution. The artifact must survive the original executor's absence: another admissible processor should be able to understand, criticize, continue, and return the work without relying on the previous processor's private state.

That is very close to an operational requirement for **Packet Closure**.

---

## 3. Packet, document, placement, and transport must remain distinct

A useful model is:

```text
Cognitive Packet
    identity
    objective
    closure
    lineage
    constraints
    continuation semantics
    authority context
    expected return
        ↓
Packet Capsule
        ↓
Document representation
        ↓
Placement / transport
    Git file
    downloaded Markdown
    clipboard text
    attachment
    SQLite / PostgreSQL record
```

Therefore:

```text
Packet identity
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

must not, by itself, create a new logical packet.

The same packet may also have several placements simultaneously.

---

## 4. Markdown as a lowest-common-denominator packet capsule

Markdown plus ordinary text transport is attractive because it degrades gracefully.

A rich native packet may be projected as:

```text
native packet
→ Markdown/YAML capsule
→ Git / file / copy-paste / email / chat
→ foreign handler
→ materialization / continuation
```

This makes **copy/paste** a surprisingly general orchestration primitive.

With a human operator, the minimal interoperability layer can be as small as:

```text
Unicode text
+
human routing
```

Structured protocols such as COP, ACP, MCP, APIs, durable stores and automated schedulers can later add:

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

but the manual transport is already sufficient to prototype and stabilize the semantics.

This suggests a useful engineering rule:

> **Manual copy/paste can serve as a universal bootstrap and fallback transport for Cognitive Packet Capsules before richer orchestration is available.**

---

## 5. What must travel for a document to be packet-like

A candidate document-backed Packet Capsule should make at least the following reconstructible or materializable:

```text
Object
Current state
Established decisions
Assumptions
Constraints
Relevant references
Open questions
Expected next action
Admissible handler capability
Return destination / Ithaca
Resumption risks
```

The practical Packet Closure question is:

> **Can another admissible handler continue the work from this document and its resolvable references without undocumented conversational context?**

Closure can be:

```text
INLINE
    context embedded directly

REFERENTIAL
    context reachable through stable references

MATERIALIZABLE
    enough information exists to resolve and verify the needed state
```

A document that merely says:

```text
continue what we discussed yesterday
use the second idea
apply the same correction as before
```

is not closed merely because it has metadata.

---

## 6. The review is often a packet, but not durable Corpus memory

A significant practical observation comes from the Redactor/Reviewer workflow.

The Reviewer is normally expected to produce a full Markdown review:

```text
review.md
```

The human operator downloads or otherwise transports that file to the Redactor.

However, the full review is usually **not** retained in Git after assimilation. This is deliberate: keeping every intermediate review would degrade the Corpus signal/noise ratio and turn the repository into an archive of the entire drafting process.

The actual lifecycle is closer to:

```text
document_n
→ Reviewer
→ review.md                 transient work object
→ human routing
→ Redactor
→ findings classified / arbitrated
→ document_n+1
→ compact review yield / residue if useful
→ raw review may disappear
```

This produces an important distinction:

> **Packet durability is not Corpus retention.**

A Cognitive Packet must persist long enough to be continued. It does not necessarily deserve permanent preservation after its useful yield has been assimilated.

The human Principal remains responsible for the retention decision.

---

## 7. Assimilation boundary and governed forgetting

The previous observation exposes a dangerous ambiguity in the word `forget`.

At least four different operations must be distinguished:

```text
DISCARD
    destroy work that was explicitly transient
    after its obligations have been satisfied

COOL / DEINDEX / ARCHIVE
    reduce cognitive availability while preserving history

SUPERSEDE
    replace the current reference state without deleting the past

ERASE
    intentionally remove durable historical content
```

`ERASE` is categorically different from `DISCARD`.

A raw `review.md` declared transient may legitimately be discarded after its material yield and unresolved residue have been assimilated.

A durable Event, decision, canonical Artifact, EffectReceipt, or historical evidence must not silently disappear through the same operation.

A useful working invariant is:

> **Crossing an assimilation boundary changes default retention semantics: transient work may be discarded; assimilated history may not be erased by an ordinary continuation.**

This also means that the generic word `forget` is probably too ambiguous for a normative lifecycle API.

When durable content must legitimately be erased, the normal model should preserve a proportionate **Erasure Event**:

```text
content existed
→ authorized erasure
→ payload removed
→ erasure event remains
```

The trace must be sufficient to establish that an authorized erasure occurred while not reconstructing information whose erasure was itself required.

Exceptional authority to erase even the erasure trace must itself be predefined, narrow, attributable, and non-self-extending.

This is structurally similar to the Corpus doctrine of **express mandates** for exceptional powers.

### Propagation residue

`research/cognitive_packet_closure_and_packet_native_semantics.md` currently lists `forget` among lifecycle operations. This document records a semantic residue: that term should later be revisited and decomposed rather than silently reinterpreted here.

---

## 8. Recovery does not rewrite causality

Document workflows also expose a broader issue: a failed or harmful operation cannot generally be modeled as if an inverse operation made it never happen.

The distributed-systems literature already offers several distinct recovery regimes:

```text
ACID rollback
    uncommitted state restoration

TCC — Try / Confirm / Cancel
    preserve options before commitment

Saga
    perform compensating transactions after local commits

BPMN compensation
    explicit compensation handlers

Event Sourcing
    append corrective/reversal events without rewriting history

Selective Undo
    remove or counteract an operation while respecting causal dependencies
```

The common lesson is:

> **Compensation is not necessarily undo, and state restoration is not historical erasure.**

A general causal history remains:

```text
S0
→ Act A
→ S1
→ Recovery Act R
→ S2
```

Even when:

```text
S2 ≈ S0
```

history is still:

```text
A happened
R happened
```

and external consequences may remain.

---

## 9. From rollback to compensation, damage, repair, and residue

A more reality-sensitive recovery chain is:

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

and:

> **CompensationReceipt is not Restored Reality.**

A compensation is itself a governed Act. It may fail, propagate, create new damage, require retry, or require its own compensation.

---

## 10. Reversibility is an envelope, not a Boolean

The common metadata pair:

```text
reversible = true / false
```

is too weak for externally consequential work.

An Act can be simultaneously:

```text
locally reversible
historically irreversible
externally partially compensable
informationally propagated
financially restitutable
legally repairable
physically irreversible
```

A better working concept is the **Reversibility Envelope**:

```text
what can be restored?
by whom?
until when?
at what cost?
what has already propagated?
what cannot be restored?
what can be compensated?
what can be repaired?
what evidence must remain?
```

The envelope changes with time and propagation.

For example:

```text
draft email
    highly reversible

sent email
    less reversible

read email
    less reversible

forwarded email
    less reversible again

action taken because of email
    recovery becomes compensation / repair
```

Thus:

> **Reversibility is a time-dependent property of reachable consequences, not an intrinsic Boolean property of the originating command.**

---

## 11. Pivot and option preservation

Saga and TCC practice suggests a useful distinction around a **Pivot** or commitment boundary.

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

This aligns with a broader governance rule:

> **The greater the option loss caused by an Act, the stronger the mandate and ex-ante scrutiny should be.**

This can be more informative than technical reversibility alone.

A technically reversible Act may still close important options or propagate consequences that are expensive to recover.

---

## 12. Losses, profits, and the cost of acting

High-frequency systems cannot treat every negative micro-effect as a defect requiring individual repair.

Human institutions already reason in terms such as:

```text
losses & profits
operating cost
friction
expected failure
reserves
netting
```

Likewise, the practical saying that one cannot make an omelette without breaking eggs captures a real engineering fact:

> **Some negative consequences are constitutive costs of producing a desired transformation.**

But this principle is safe only when responsibility boundaries remain visible.

A useful distinction is:

```text
COST
    anticipated and proportionate consequence of the intended transformation

LOSS
    negative outcome tolerable within an explicit operating envelope

DAMAGE
    materially relevant harm to a protected interest or Principal
```

Losses and gains are not freely nettable across Principals.

```text
Alice: -100
Bob:   +120
system total: +20
```

does not establish that the outcome is admissible.

A system may absorb losses within its own mandate more freely than it may externalize losses onto another Principal.

---

## 13. Repair Frontier and accepted residue

Repair should not be treated as an absolute requirement to restore every last unit of state.

A first approximation is:

```text
repair while marginal value of further repair
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

The optimum is often partial.

```text
0 → 80% repaired      cheap
80 → 95%              moderate
95 → 99%              expensive
99 → 100%             disproportionate
```

This suggests a **Repair Frontier**: the point beyond which further repair is no longer justified under the applicable mandate and constraints.

Residue therefore has at least two states:

```text
unresolved residue
    still requires action or arbitration

accepted residue
    explicitly known and judged not to justify further repair
```

Closure does not necessarily mean perfect restoration.

A stronger closure condition is:

> **No remaining consequence warrants further action under the current mandate, evidence, responsibility boundaries, and proportionality threshold.**

---

## 14. Damage control is a distinct governance regime

Sometimes the objective changes before repair can even begin.

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

Only after stabilization should the system normally return to:

```text
assessment
→ compensation / repair
→ responsibility
→ residue
→ learning
```

Because damage control creates exceptional authority, it should be governed like an express mandate:

```text
predefined trigger
bounded scope
containment-only purpose
time limit / exit condition
traceability
non-self-extension
mandatory return to ordinary governance
```

A useful rule is:

> **Damage-control authority is justified by containment, not by convenience.**

---

## 15. Urgency is not importance

Damage control also exposes the distinction between **urgency** and **importance**.

A problem may be:

```text
important but not urgent
urgent but limited
both urgent and important
neither
```

A useful working interpretation is:

> **Urgency measures how rapidly delay destroys available options.**

This can be expressed informally as:

```text
Urgency ≈ rate of option loss with time
```

This explains why emergency action should often be **preservative** rather than dispositive.

Examples:

```text
rescue a drowning person now
judge later

stabilize a patient now
diagnose more completely later

isolate a compromised machine now
investigate and adjudicate later

preserve evidence now
decide the merits later
```

The principle is:

> **Emergency action should preserve the possibility of later ordinary judgment whenever proportionate.**

Or more compactly:

> **In an emergency, do not solve everything. Save what would otherwise become impossible.**

---

## 16. Triage as temporal compression of governance

At high event rates, every Packet cannot receive the same depth of human deliberation.

Triage is not a final judgment of value. It asks:

```text
what cannot wait?
what can safely wait?
what can continue automatically?
what needs containment?
what crosses an irreversible/material boundary?
```

A candidate triage flow is:

```text
Event / Packet
→ harmless/local
      → continue
→ safely deferrable
      → defer
→ option loss imminent
      → preservative act
→ propagation dangerous
      → damage control
→ material / dispositive / high option loss
      → escalate
```

This suggests that a future Packet scheduler should not collapse everything into a single `priority` number.

Relevant dimensions include:

```text
Importance
Urgency / time-to-option-loss
Materiality
Risk
Repairability
Cost
Human Attention Budget
```

A useful candidate field is therefore conceptually:

```text
time_to_option_loss
```

rather than merely:

```text
priority: high
```

---

## 17. Scale changes the economics of consistency

The document workflow is currently human-routed and low enough in volume that a person can still perform transport, arbitration, and retention decisions directly.

Agentic systems change the transaction rate dramatically.

Let:

```text
λ = Acts / unit time
h = human review cost / Act
H = available human attention
```

Act-by-act governance fails when:

```text
λ × h > H
```

Even exception-based governance eventually fails if the Act rate rises faster than the anomaly rate falls.

This suggests a progression:

```text
REGIME I — transaction governance
    inspect acts individually

REGIME II — exception governance
    automate normal flow, escalate anomalies

REGIME III — invariant governance
    make most local acts harmless / monotone / bounded
    coordinate only genuine pivots and invariant violations

REGIME IV — learning governance
    adapt the governance mechanisms from observed residue
```

The important shift is not merely to reconcile faster, but to **change the granularity of what requires reconciliation**.

---

## 18. Eventual reconciliation rather than universal synchronous consistency

Many pre-computer and non-computer systems already tolerate temporary divergence and reconcile later:

```text
accounting
legal appeal and repair
financial netting
quality control
biological homeostasis
immune escalation
DNA repair and damage tolerance
```

The shared pattern is broader than database Eventual Consistency:

> **Allow bounded local divergence, detect what matters, reconcile or repair proportionately, and reserve strong coordination for selected boundaries.**

A working term is **eventual reconciliation**.

At very high rates, scalable mechanisms include:

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

The goal is not to govern every microscopic event equally.

A useful design rule is:

> **Engineer the system so that most events remain locally harmless; reconcile aggregates asynchronously; spend scarce coordination and human attention only where invariants, Pivots, option loss, or material consequences require it.**

---

## 19. Micro-effects, material Acts, and settlement

Document editing already provides a small example.

A Redactor may perform hundreds of internal transformations:

```text
word substitutions
reordered paragraphs
abandoned formulations
self-corrections
```

It would be counterproductive to historicize each as a sovereign Act.

The useful boundary is closer to:

```text
MICRO-EFFECT
    local, provisional, cheap, not independently governed

MATERIAL ACT
    crosses a governance boundary or creates external consequence

SETTLEMENT / ASSIMILATION
    durable state accepted into the Corpus
```

The document or Cognitive Packet can therefore act as a unit of **semantic netting**: many micro-effects occur internally, while only the material delta crosses the governed boundary.

This is likely important if Cognitive Packet Switching must scale to machine-level transaction rates.

---

## 20. Human responsibility remains explicit

In the current Redactor/Reviewer workflow, one human may simultaneously act as:

```text
Principal
Router / scheduler
Transport operator
Arbiter
Authority gate
Retention decision-maker
Ithaca controller
```

This concentration is an implementation property of the current low-tech workflow, not necessarily an architectural requirement.

Automation may later separate the functions.

What must remain stable is attribution:

```text
who authorized?
who executed?
what caused the transition?
who decided what was retained or discarded?
who accepted residue?
```

The system may automate transport and reconciliation without making the machine sovereign over doctrine, history, third-party harm, or exceptional erasure.

---

## 21. Dogfooding protocol for this document

This document is itself the candidate under test.

### RT-001 — Git-by-reference continuation

Give a decorrelated Reviewer only:

```text
https://github.com/JeanHuguesRobert/cogentia/blob/main/research/documents_as_cognitive_packets.md
```

plus the instruction to apply the Corpus Reviewer contract.

Test:

> Can the Reviewer reconstruct the thesis, constraints, open questions, and expected return without access to the drafting conversation?

### RT-002 — Review Packet return

The Reviewer should produce a full `review.md`.

The human operator transports that file to a Redactor.

Test:

> Can the Redactor classify every material finding, preserve markers and unresolved residue, and revise the document without undocumented context repair?

### RT-003 — Transient review retention

After human arbitration and assimilation:

```text
review.md
```

is transient by default.

Test:

> Can the raw review be discarded while preserving the materially necessary causal frontier: adopted corrections, unresolved objections, arbitration, significant residue, and review status?

### RT-004 — Copy/paste fallback

Transport the document or a bounded by-copy Packet Capsule through plain text to an agent with no Git access.

Test:

> Is the work still continuable, and what additional information must the human add?

### RT-005 — Handler substitution

Use a Redactor and Reviewer from different providers or process contexts.

Test:

> Does the work survive provider substitution without reliance on private model/session memory?

### RT-006 — File identity test

Rename or move the Markdown document while preserving its logical experiment.

Test:

> Does the workflow still recognize one continuing work object rather than invent a new identity from the path?

### RT-007 — Recovery test

Introduce or detect a substantive drafting/review error after it has affected a stable version.

Test:

> Can the system distinguish correction, compensation, supersession, repair, and historical trace instead of pretending the error never occurred?

---

## 22. Measurements

Two simple measurements are useful.

### Closure Cost

```text
ClosureCost
    = additional information required after handoff
      before an admissible handler can continue correctly
```

Ideal direction:

```text
ClosureCost → low
```

not necessarily zero, because independent verification may still be appropriate.

### Human Routing Cost

```text
HumanRoutingCost
    = human effort required to transport,
      explain, repair context, arbitrate,
      and return the work
```

The goal of richer orchestration is not necessarily to remove the human.

It is to move the human role from:

```text
transporter
parser
context repairer
arbiter
```

toward:

```text
Principal
arbiter
exception handler
```

where human judgment has the greatest value.

---

## 23. Falsification conditions

The document-backed Cognitive Packet hypothesis is weakened if repeated tests show that:

- independent handlers cannot continue without substantial undocumented conversation context;
- packet identity collapses into file identity or Git placement;
- closure requires recursively embedding an impractical amount of history;
- the Packet/Artifact distinction creates complexity without improving continuation, routing, accountability, or recovery;
- ordinary task/issue/document mechanisms already provide the same semantics with less machinery;
- review handoffs repeatedly lose disposition markers, constraints, authority, or return semantics;
- transient retention policy destroys material residue needed for later responsibility;
- richer packet semantics increase human routing cost rather than reducing it.

Failure is therefore useful evidence, not a reason to redefine success.

---

## 24. Current continuation state

### Established

- Some Corpus documents already travel repeatedly between Redactor and Reviewer handlers.
- Markdown files, GitHub references, and copy/paste already provide working transport channels.
- Human routing currently supplies orchestration, arbitration, and retention decisions.
- Packet Closure gives a falsifiable criterion for document portability.
- Raw review artifacts are often intentionally transient; durable Corpus retention is a separate decision.
- Recovery semantics require distinctions among discard, archive, supersede, erase, rollback, compensation, repair, damage control, and residue.
- High transaction rates make act-by-act governance increasingly expensive and push toward triage, aggregation, invariant governance, and local harmlessness.

### Open

- Which metadata belongs in the document itself versus an external Packet store?
- When does a document represent a Packet Capsule versus merely an Artifact used by a Packet?
- Which transitions deserve durable packet identity?
- How should Reversibility Envelope, option loss, and time-to-option-loss be represented without schema inflation?
- Which retention decisions require explicit human arbitration versus standing policy?
- How much review history is the minimum sufficient causal frontier?
- How should compensation, repair, and accepted residue interact with COP lifecycle and accounting?
- Can document-backed packets scale beyond human-routed workflows without losing their inspectability?

### Next action

> **Submit this document, by Git reference, to a decorrelated Reviewer using `prompts/reviewer.md`. Ask the Reviewer to treat the document both as a research note and as a candidate document-backed Cognitive Packet Capsule. The review must explicitly assess Packet Closure, hidden-context dependency, conceptual prior art, lifecycle/retention semantics, recovery semantics, and whether the dogfooding protocol can genuinely falsify the hypothesis. Return the full review as a Markdown file to the Redactor.**

This next action is intentionally executable from the document itself.

---

## 25. Prior-art map — non-exhaustive

This note does not claim novelty for the mechanisms below. They are part of the solution reservoir to be explored and recombined carefully.

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

### Legal analogies

Relevant legal concepts include:

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
```

These concepts are analogical resources, not evidence that software recovery and legal responsibility are identical domains.

---

## 26. Working compression

The current exploration can be compressed as follows:

> **A document can be more than stored knowledge: when it carries enough closure, state, constraints, routing and return semantics to survive handler substitution, it can function as a human-readable Cognitive Packet Capsule.**

> **The Packet need not preserve every intermediate trace. It must preserve enough causal, authority and semantic state for continuation and responsibility.**

> **Before commitment, preserve options. After commitment, preserve causality. When reversal is incomplete, compensate. When consequences become damage, repair. When repair is disproportionate or incomplete, preserve and attribute the residue.**

> **In an emergency, do not solve everything. Save what would otherwise become impossible.**

> **At scale, do not govern every event equally. Keep most micro-effects local and harmless, reconcile aggregates, and spend scarce coordination and human attention on Pivots, invariant violations, option loss, material consequences, and responsibility.**

The document now has to survive its own next hop.
