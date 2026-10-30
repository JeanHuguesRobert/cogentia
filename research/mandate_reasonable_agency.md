---
title: "Mandate — Reasonable Agency, Judgment, and Accountable Delegation"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-10-30"
version: "0.2"
status: "working-note — synthesis for critical review"
document_role: source
document_kind: doctrinal-note
visibility: public
lifecycle_state: working
update_policy: UP-DECISION-REVIEW
language: en
license: CC BY-SA 4.0
provenance:
  origin_type: conversation
  origin_date: "2026-10-30"
  derived_from:
    - research/intent.md
    - research/act_mandate_responsibility.md
    - research/measured_risk.md
    - research/operational_stance.md
    - research/janus_cognitive_gatekeeper.md
    - research/learning_computer_genese_et_architecture.md
    - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/commons/architecture.md
    - https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/COP_ACCOUNTING.md
    - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/traceabilite_des_actes.md
    - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/personne_numerique_mandatee.md
review:
  status: proposed — requires human and adversarial review
  reviewed_by: []
---

# Mandate — Reasonable Agency, Judgment, and Accountable Delegation

## Status and scope

Working synthesis of the 2026-10-30 discussion. It records an architectural hypothesis, **not** a declaration that this behavior is already implemented, validated, or universally legally effective. This source complements, and does not replace, `intent.md`, COP/Accounting, the Trace doctrine, and Measured Risk.

## Core thesis

A **mandate** is a conditional, bounded and traceable delegation of authority to a reasonably competent mandatary, pursuing a purpose on behalf of one or more legitimate principals. It grants meaningful discretion, not a complete program of instructions. A mandate is not automatically valid merely because an agent claims to have one.

**Presume reasonable competence within demonstrated capabilities; do not presume infallibility.** Autonomous judgment is the normal mode within a valid mandate; consultation is demanded by the mandate or by material uncertainty, stakes, competence limits, or credible irreversibility. Do not re-create an exhaustive rule-based expert system through endless per-action gates.

An AI system does not acquire independent legal personality through this architecture. Consequential acts must retain a path to an identifiable authorized human or legal person, subject to the applicable legal regime.

## Two pillars

1. **Judgment under uncertainty.** Interpret intent, mandate, current context, feasible alternatives, known unknowns, risk of ruin, reversibility, and repair. Seek *admissible*, not imaginary perfect, decisions. Predictions must not feign probability estimates for unquantifiable tails.
2. **Strict COP/Accounting.** Resource grants, reservations, commitments, settlements, releases and actual usage have distinct accounting semantics. The ledger, rather than the LLM's recollection, is authoritative for observed spending. Budgets can include compute, money, time, energy, attention, and separately modeled external exposure; they must not be collapsed to one implicit scalar.

Forecasting is the bridge: a responsible agent predicts its resource needs and likelihood of completing the proposed work **conditional on the chosen execution policy and available resources**. Budget forecast, enforceable reservation, and observed settlement are different objects. Record forecast ranges, evidence, calibration and forecast/actual divergence. An inaccurate forecast should trigger learning or renegotiation, not retroactive alteration of ledger facts.

## Lifecycle and validity

A mandate may be **proposed → examined → negotiated/counteroffered or declined → accepted → effective → amended/suspended/revoked/completed**. These are conceptual phases, not a normative universal state machine. Acceptance attaches to a determinate version; neither the LLM's statement nor a signature-free software record automatically binds a third-party legal person.

Validity merits separate examination:
- Principal's authority and provenance, including governing rules for collectives;
- genuine assent/acceptance where applicable; legality; intelligible and achievable purpose;
- effective dates, constraints, revocation and applicable amendments;
- authority for further delegation and preservation of upstream restrictions;
- applicable procedures for consulting principals, committees, experts or authorities.

Separate **formation validity**, **current effectiveness**, **interpretability**, **compliance of action**, **legal effect of action**, and **allocation of responsibility**. Ambiguity is not synonymous with nullity. Evaluate and cache stable findings with evidence/version dependencies; rejudge only when material assumptions change.

## Delegation and open batches

Authority of each sub-mandate must be a subset of the effective authority of its parent, with inherited restrictions, budget ceilings, time limits and required consultations. A delegator must itself be permitted to subdelegate. Revocation cascades to dependent mandates unless they receive genuinely independent authority. Preserve the full principal→delegate→subdelegate→act chain.

Within the mandate an **open batch** is a dynamically evolving class of admissible actions, not a frozen command list. Reusable contextual judgments can specify bounds and material re-evaluation triggers. A judgment of an open batch cannot silently expand the mandate.

An expert's **competence** and **authority to decide** are independent. Advice, independent review, committee decisions, mandatory principal consent, ratification, and an authority's legally effective position have different status. A consulted mandant's silence is not automatically consent.

## Fractal delegation, locality and abstraction

The same general pattern recurs at multiple scales: purpose → authority → resource envelope → situated judgment → acts → trace → accounting → answerability. This **fractal** property is about recursive composition and scale-aware decision-making, not a demand for endlessly nested approval bureaucracy.

**Principle of locality:** make the decision at the closest effective level possessing sufficient mandate, competence, context and budget. Escalate only what cannot be resolved locally: material scope ambiguity, missing powers or resources, binding consultation obligations, cross-boundary effects, credible ruin exposure, or a dispute requiring a more independent authority. Locality is not an exemption from non-local constraints or the accountability chain.

**Levels of abstraction:** a general intention is progressively instantiated as a mandate, a derived mandate or mission, an open batch, a particular action, and a concrete tool operation. The relationship is not necessarily a rigid hierarchy: lateral composition and consultation are allowed, and several independent mandates may be relevant. At each lower level the applicable authority remains bounded by the parent, including restrictions and aggregate resource envelopes. More specificity must not confer more permission.

The familiar computer-science aphorism that a problem can be solved by another level of indirection is a **design heuristic, not a theorem**. A level of indirection is worthwhile only when it reduces coupling, localizes uncertainty or cost, improves reuse or traceability, or makes an otherwise intractable decision tractable. Each additional layer incurs overhead and can create accountability gaps. Prefer the *minimum sufficient abstraction* over proliferation of wrappers or gates.

**Knowledge and accounting locality:** keep locally useful context, derived judgments, forecasts and caches near execution while maintaining provenance references to authoritative mandates and ledger records. Child budgets are allocations within parent envelopes, not money or attention created by delegation. Forecasts may be refined at a lower level and summarized upward; actual settlement remains authoritative and must not be counted twice. Material changes propagate upward to the extent necessary for decisions and accountability, not as exhaustive replay of local reasoning.

**Upward learning, not upward authority:** localized Reality Tests generate traces, corrections and evidence. These may inform higher-level mandates, strategies or reusable doctrines through review, but do not automatically confer authority or turn a local observation into a universal truth. Likewise, a general rule must be interpreted against local conditions rather than copied mechanically.

A minimal recursive interface is sufficient:

```text
decide(context, effective_mandate, budget, exposure)
  -> act locally | delegate within authority | consult/escalate | defer/refuse
  -> trace + accounting + outcomes
  -> feedback when materially useful
```

Illustrative progression for Fracta2: maintain availability (general intent) → maintenance mandate → coding sub-mandate → reversible test batch → shell operation. Most tool decisions remain local; only constraints that genuinely exceed the local envelope or require a reserved decision-maker propagate outward.

The fractal hypothesis is empirical: compare flatter and more layered compositions on completion, overhead, forecast calibration, information loss, violation rate, escalation frequency, repair, and human-attention cost. Do not claim an optimal number of levels in advance.

## Measured Risk; ruin; remediation

Do not minimize risk blindly: seek the smallest **sufficient** exposure that still makes a Reality Test informative. Assess identifiable paths to harm, irreversibility, recovery envelope, external exposure, tail uncertainty and systemic coupling. A numerical expected loss cannot bound Black Swan or ruin risk; avoid unbounded catastrophic exposure and use structural containment where warranted.

A failed outcome does not by itself prove that an ex-ante decision violated the mandate. Conversely, a breach can occur without measurable damage. Distinguish rollback/restitution, repair, compensation, contestation and accountability. Money cannot always restore the harm; compensation never authorizes violation of mandatory rights or categorical constraints.

## Traceability and Synthetic Skin in the Game

Record prospective mandate version, evidence available when deciding, uncertainty, predicted cost, rationale, consultation where required, chosen act, executor, actual costs and observed consequences. Keep decision-time evidence distinct from hindsight. An action trace without an answerable principal is not sufficient.

**Synthetic Skin in the Game** is non-resettable answerability, not supposed artificial suffering. Avoid erasure by restarting the agent, forking a subprocess, or shifting a failed mission to a sister instance. Persistent consequences may influence autonomy, review needs, resources, routing and repair obligations, with independent oversight and contestability. Sanctioning an AI instance is not a substitute for accountability of the actual legal bearer or principal.

## Minimal decision policy

For a proposed action or open batch:
1. Is the mandate effective and the contemplated action within its authority, including required consultation?
2. Is the action feasible with the current competence and resources; what are forecast ranges and the accounting reservation requirements?
3. What do we know, not know, and risk losing? Is the exposure bounded and recoverable, or could it reach ruin?
4. Select among act, limited experiment, seek evidence/expert/mandant, renegotiate, defer, or refuse, under the mandate.
5. Trace prospective reasons and realized consequences; settle accounting; repair and learn where appropriate.

Deterministic invariants (identity, expiry, authoritative budget ceilings, recorded revocation) are mechanically checked; semantic interpretations and tradeoffs are judged contextually. **No unnecessary approval theatre** for bounded, reversible action under a standing mandate. **No LLM-only self-certification** for exceptionally consequential boundaries.

## Empirical falsification program

Compare (A) per-act permission gates, (B) standing mandate and contextual judgment, (C) standing mandate plus measured risk/accounting/feedback, on matched tasks. Measure successful outcomes, mandate breaches, severity and reversibility of harm, intervention and human-attention cost, resource prediction calibration, quality of escalation, recovery and accountability. Use adversarial mandates, misleading evidence, correlated reviewers, shifting context and simulated tail incidents. Do not claim reliability before evidence.

## Unresolved research

- Formal acceptance and authority evidence for human, corporate and purely operational agent mandates.
- Appropriate default limits on implicit interpretation and subdelegation.
- Practical representation and calibration of multi-dimensional budget forecasts and probability of completion.
- Independent durability and challengeability of non-resettable traces.
- Decision-making under deep uncertainty and credible ruin pathways.
- Legal comparison: agency, representation, insurance, auditors, expert committees, tax ruling/rescrit; distinguish analogy from actual law.
- Up-to-date prior art on agent authorization, agent autonomy, verifiable delegation, risk governance and accountability; independent novelty analysis.
- Concrete integration into COP accounting, continuation and FractaNode shell surfaces; current implementation coverage requires a separate audit.
