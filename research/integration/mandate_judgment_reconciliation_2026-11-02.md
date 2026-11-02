---
title: Mandates as governed, judgment-mediated contracts
status: working-paper
date: 2026-11-02
document_role: source
document_kind: research-paper
visibility: public
related_issue: https://github.com/JeanHuguesRobert/cogentia/issues/299
---

# Mandates, judgment and reconciliation — no deterministic monopoly

A mandate is an operational contract, not a fully deterministic executable program. Its applicability, respectability, interpretation and fulfillment may require contextual **judgment** by intelligent actors (human or machine); a decision and its motivation are not identical with incontrovertible truth. Different agents may reach contradictory, contestable conclusions. This is normal rather than an implementation defect.

**Mixed evaluation:** deterministic checks (identity, signature, version, arithmetic budget constraints, explicit time and delegation boundaries, idempotency) may coexist with non-deterministic assessments (intent, reasonable performance, competing obligations, measured risk, good faith, sufficient evidence and effective fulfillment). Deterministic checks are useful necessary constraints when applicable, not a complete normative theory of the mandate. Do not convert a missing semantic judgment into a forged deterministic PASS, nor allow an AI's interpretation to create powers beyond authenticated authority.

**Traceability over artificial certainty:** record who assessed what, under which mandate and competence, using which evidence/version and at what time; preserve the decision, optional reasoning, uncertainty or disagreement, actual effects, provenance and later correction. Traceability is not equivalent to validity or compulsory publication of private reasoning. An assessment should be attributable and reviewable, with proportionate disclosure and privacy protections.

**Reconciliation before litigation:** when differing claims or observations arise, preserve their coexistence, compare premises and evidence, append a correction or reconciling event where justified, and avoid rewriting previous records. No forced consensus and no automatic assumption that a conflict requires a judge. Existing COP structures (`COP_ACCOUNTING.md`: `accounting.reconciliation.asserted`, `accounting.dispute.opened`, `accounting.dispute.resolved`; `Architecture.md`: assertions, contradictions and adjudication continuations) already anticipate these possibilities.

**Future, demand-driven extension:** contestation, third-party adjudication, competence of a judge/arbitrator, procedure, appeals, remedies and enforceable finality remain conceivable, but should not be instantiated as extra institutions or services before actual disputes reveal requirements. Keep distinct (i) judgment as an agent's cognitive appreciation and (ii) *judging* as a formally empowered dispute-resolution function. One cannot claim the latter merely by producing an AI evaluation.

**Implications for #299:** the canonical evaluator and budget ledger enforce exact limits wherever exact limits are defined. They do not prove the substantive merits or performance of a whole mandate. A typed COP receipt should distinguish formal admissibility, reasoned judgment, observed execution, assessment of fulfillment and possible reconciliation. None should be silently collapsed into a Boolean `mandate_respected`.

**Architectural orientation:** interoperability with UCAN, AP2 or Ethereum may supply signatures, delegation proofs or settlement mechanics where appropriate, but no blockchain or smart-contract-only execution semantics should become a foundational COP requirement.
