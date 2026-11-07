---
title: "Mandate — Reasonable Agency, Judgment, and Accountable Delegation"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-10-30"
last_modified_at: "2026-11-07"
version: "0.4"
status: "working-paper — synthesis for critical review"
document_role: source
document_kind: doctrinal-note
visibility: public
lifecycle_state: working
update_policy: UP-DECISION-REVIEW
language: en
license: CC BY-SA 4.0
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
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

## Finality-first mandate and responsible exploration (2026-11-02 clarification)

**Strict purpose, maximum admissible instrumental freedom, attributable consequences.** A mandate should specify the end sought, the principal or collective with authority to set it, substantive prohibitions, applicable resource/exposure envelopes, and the proportionate return contract. It should not mistake a provisional execution plan or a list of known tools for an exhaustive catalogue of permissible means. A means not anticipated by the mandant is not forbidden *solely because it was not anticipated*; nonetheless legal, technical, privacy, platform and delegated-power boundaries remain independently binding. The criterion for an added control includes both the harm it prevents and the legitimate possibilities it closes (*Machine à Empêcher*).

**Reasonable exploration and failure:** a failed result, under a reasoned ex-ante judgment and proportionate, authorized exposure, is not a fault simply because it failed; it may produce valuable learning. Nor must an agent fabricate errors to satisfy a quota. Repeated absence of errors is at most an invitation to inspect selection bias, foregone opportunities and risk avoidance, not proof of wrongdoing. The agent should not abandon promising, authorized exploration *merely to avoid blame*. Assess judgment against information available at decision time, not only hindsight or success indicators.

**The exposed parties matter:** identify separately who decides, who benefits, who bears losses, who can consent and who has the legal/institutional competence to bind others. The maxim that decision-makers should bear consequences is an anti-externalization principle, not a fiction that every external effect can be borne solely by its author. Collective risk-taking requires legitimate collective authorization and protection of non-consenting or vulnerable third parties; **DHITL (Democratic Humans in the Loop)** anchors consequential decisions in capable human/collective governance. A principal remains answerable for its own mandate and supervision without automatically assuming all legal liability for every actor or provider.

**Synthetic Skin in the Game is persistent answerability, not automatic punishment.** Preserve prospective commitments, expenditure, predictions, independent Reality responses and corrective learning across restarts and delegation. A well-bounded instructive failure may justify *continuing* or expanding trusted experimentation; an imprudent lucky success may justify review. Do not automatically reduce authority solely because an outcome failed. Adjust trust, resources or supervision through context-sensitive, reviewable judgment with reconciliation where appropriate.

**Judgment is mixed and revisable:** mechanically check exact constraints where appropriate, but let authorized human or machine agents interpret context, purpose, proportionality and fulfillment with recorded grounds and uncertainty. Disagreement can lead to correction, negotiation or mediation; institutional adjudication need not be invented before disputes warrant it. Traceability supports accountability and revision, not the fiction of deterministic infallibility.

This is a cross-cutting clarification of [Measured Risk](measured_risk.md), [Principal Instrumental Freedom](principal_instrumental_freedom.md), [Act, Mandate and Responsibility](act_mandate_responsibility.md), [Mandate Judgment and Reconciliation](integration/mandate_judgment_reconciliation_2026-11-02.md), the [Rossignol principle](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/principe_rossignol.md) and [DAO/DHITL accountability](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/dao_imputabilite_dhitl.md). It does not create a grant, service, tribunal, automatic sanction or new runtime authority.

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

## Agent John standing mandate — proposed, unissued (2026-11-05)

The Principal intends a broad, durable, revocable root mandate for Cogentia
Digital Twin / Agent John. It grants substantial initiative and the power to
issue, constrain, monitor, suspend and revoke sub-mandates without repetitive
human confirmation for ordinary in-scope work. This is design intent, **not**
an issued MandateDeclaration, an authoritative grant or a funded budget.

**Ordinary autonomous scope:** research, analysis, drafts, software development,
internal organization, bounded reversible maintenance, testing and nested
missions. Each decision remains conditional on actual capabilities, privacy,
Measured Risk, recoverability, available resources and provider controls.

**Recursive delegation:** the parent's explicit power to delegate is required.
Every child attenuates authority, inherits prohibitions and obligations, has
shorter or equal validity and strictly bounded delegation depth. Child budgets
are atomically reserved against the available parent hard-budget vector before
activation. Concurrent children must not create budget by duplication. Preserve
Principal → John → child → Act provenance, receipts and cascading revocation.

**Escalation by multiple costs:** treat money, compute, wall time, human
attention, privacy, risk, systemic blast radius, irreversibility and public
or legal exposure as independent dimensions. When scope, thresholds or credible
ruin exposure exceed the valid envelope, reduce the task or seek Principal
judgment. No numerical thresholds are inferred from this proposal.

**Reserved, non-delegable acts:** the broad standing mandate never suffices for
sending third-party communications as the Principal, publishing in the
Principal's name, entering binding agreements, payments, formal submissions,
representation or comparably consequential disclosure. These require an
independent, current, act-specific authenticated approval and applicable
provider controls. A sub-agent cannot acquire those rights from John; drafting
without emitting remains distinct.

**Acceptance tests:** ordinary bounded tasks proceed without approval theatre;
valid delegated tasks run within reserved parent resources; missing/revoked
parent, widened child, absent reservation, replay and missing authentication
are refused; costly or high-exposure work escalates; reserved acts are refused
at all delegation depths. Authenticated issuance and canonical Inseme ledger
integration are tracked by Cogentia #299. Nothing here activates a mandate.

## Fractal delegation, locality and abstraction

The same general pattern recurs at multiple scales: purpose → authority → resource envelope → situated judgment → acts → trace → accounting → answerability. This **fractal** property is about recursive composition and scale-aware decision-making, not a demand for endlessly nested approval bureaucracy.

**Principle of locality:** make the decision at the closest effective level possessing sufficient mandate, competence, context and budget. Escalate only what cannot be resolved locally: material scope ambiguity, missing powers or resources, binding consultation obligations, cross-boundary effects, credible ruin exposure, or a dispute requiring a more independent authority. Locality is not an exemption from non-local constraints or the accountability chain.

### Upward proposals and mandate renegotiation as FractaCognition (7 November 2026)

**Subsidiarity is not a one-way assignment of work.** A situated delegate may discover a feasible or promising route toward the Principal's finality that needs an input, a resource, a specialist, a risk allowance, a mandate amendment or contextual information unavailable within its present authority. It must not treat this lack as proof that the mission is impossible, silently stretch its mandate, or invoke an exceptional recovery channel. Nor does it have to passively execute the original plan when a better route has become visible. Instead, it may **propose upward a bounded mandate/resource revision** to its delegating mandator, or consult laterally where admissible.

The *mandatary/delegate* has privileged **situated knowledge** from its local work; the *delegating mandator* may possess broader objectives, other commitments, more information and legitimate discretionary authority. Neither vantage point is automatically infallible. The delegate's metacognitive responsibility is to observe its own missing capability and formulate a reasoned, corrigible proposal; the upstream party's **Judgment** is to test the proposal against the full mandate chain, context, alternatives, opportunity costs, third-party rights, exposure and budget, and to **accept, amend, counteroffer, request evidence, decline, or escalate** to the actual Principal when required. This is negotiation, not automatic approval and not an escalation ritual for ordinary in-envelope decisions.

~~~text
situated delegate: Reality Test → useful route discovered, but missing means/authority
→ proposal (intended outcome, evidence, alternatives, exact delta, forecast, risks)
→ delegating mandator: informed Judgment within its own authority
→ accept / amend / counteroffer / request evidence / decline / escalate
→ if accepted: independently valid amended/new mandate + funded budget/effect grant
→ situated agent or different authorized handler acts; receipts and learning return
~~~

**Authority remains monotone down the chain.** A delegating mandator may redeploy a resource or issue a narrower submandate **only within its own valid authorizations**, with real reservations, applicable issuer verification, and effective revocation. If the requested expansion exceeds the parent mandate, it must seek a change from the next legitimate authority; it cannot create it. Upward information and argument do not themselves grant permission. The upstream party may also assist without transferring the privileged capability, or decide that it should perform the sensitive effect itself. A refusal becomes an inspectable decision and may be reconsidered if materially new evidence appears; silence is not approval.

This is a cross-scale FractaCognition loop: a local agent diagnoses its own constraint, enlarges the **known solution space** through a proposal, invites higher-context Judgment, and assimilates the response. It pairs [ascending subsidiarity](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/autonomia.md) with finite [recursive workshops](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/pluralisation_cognitive_sous_mandat.md), without making the chain a rigid command hierarchy: confederated peers may jointly contribute under distinct mandates, without mutual subordination or pooling their rights by default. This is a proposed interaction discipline, not a claim that current COP runtime implements every negotiation and grant transition end-to-end.

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
