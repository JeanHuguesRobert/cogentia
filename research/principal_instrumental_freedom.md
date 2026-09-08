---
title: "Principal Instrumental Freedom"
subtitle: "A bounded Cogentia doctrine for choosing instruments without manufacturing authority"
description: "A bounded source doctrine for instrument choice, mandate attenuation, responsibility, and interoperability."
author: "Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-08"
version: "0.1"
status: "working-paper — normative candidate"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "doctrinal-note"
visibility: "public"
lifecycle_state: "working"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/principal_instrumental_freedom.md"
last_stamped_at: unknown
ai_assisted_by:
  - "Codex (Redactor drafting under cogentia#161)"
provenance:
  origin_type: "repository"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/161"
  origin_date: "2026-09-08"
  derived_from:
    - "research/act_mandate_responsibility.md"
    - "research/monotonic_mandate_attenuation.md"
    - "research/intent.md"
    - "research/agent_configuration_layer.md"
    - "research/artificial_representation_and_mandated_voice.md"
review:
  status: "unreviewed"
  reviewed_by: []
update_policy: "UP-DEFAULT-REVIEWED"
tags:
  - "principal"
  - "mandate"
  - "agency"
  - "interoperability"
  - "anti-capture"
  - "responsibility"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Principal Instrumental Freedom

## Status and scope

This v0.1 proposes a **Cogentia normative doctrine**. It is not legal advice,
and it does not assert an existing universal right in French, EU, or other
positive law. It concerns the architecture and governance of systems acting
for a Principal: natural persons, legal persons, and other represented entities
within a valid mandate.

The proposed doctrine is deliberately narrow. It is a presumption against a
restriction whose only material basis is that a Principal uses a software or
robotic instrument. It is not a right to make any act, bypass a control, share
an account, obtain another person's data, or compel every service to expose an
interface.

## 1. The proposition

> **An instrument does not enlarge a Principal's authority; its interposition
> should not, by itself, diminish the Principal's legitimate capacity to act.**

In its operational form:

> A Principal remains responsible for the finality of an action and may choose
> human, software, or robotic instruments through which a legitimate capability
> is exercised, unless a restriction is attached to the act, risk, resource,
> security, third-party right, or applicable legal requirement and is justified
> in that context.

The word *legitimate* is load-bearing. The proposition does not convert a
capability into authority, an intention into a mandate, or an instruction into
consent. It also does not settle whether a particular restriction is lawful,
necessary, or proportionate; that remains a context-specific legal and factual
question.

## 2. Relation to existing Cogentia doctrine

This note introduces no new source of authority. It connects existing concepts.

| Existing concept | Consequence for instrumental freedom |
| --- | --- |
| [Anti-capture and the agent configuration layer](agent_configuration_layer.md) | Provider, runtime, and interface choices should remain replaceable where practicable; a convenient shell must not silently become the Principal's sovereign. |
| [Act, mandate and responsibility](act_mandate_responsibility.md) | The trace must distinguish the material actor, decision maker, mandate, represented entity, beneficiary, validation, and residual responsibility. Naming a tool is not an imputation rule. |
| [Monotonic mandate attenuation](monotonic_mandate_attenuation.md) | An instrument receives at most the authority validly inherited through its chain. Delegation cannot amplify rights, budget, exposure, duration, or delegation depth. |
| [Intent](intent.md) | A change of instrument must preserve, or visibly revise, the declared intent and its interpretation. A locally successful automated step is not sufficient evidence of intent preservation. |
| [Artificial representation and mandated voice](artificial_representation_and_mandated_voice.md) | Fidelity, representation, and execution are distinct. A system's apparent autonomy, style, or competence neither makes it the Principal nor grants legal personality or authority. |

Thus sovereignty here is not exclusive control over every technical layer. It is
the ability to retain a traceable decision and mandate chain, to replace an
instrument where the surrounding rules allow it, and to challenge capture by an
otherwise avoidable intermediary.

## 3. Agency taxonomy and traceability

The following taxonomy is descriptive, not a ladder of personhood or a ranking
of legal status. A mode may change the evidence, validation, safety controls,
and applicable law required for an act.

| Mode | Decision and execution | Minimum trace question |
| --- | --- | --- |
| Human direct action | The Principal or authorised human both decides and materially acts. | Who acted, in what role, and under which mandate? |
| Computer-assisted action | A human decides; software presents, calculates, drafts, or performs bounded mechanics. | What assistance affected the action and what did the human validate? |
| Delegated execution | A human or system executes a sufficiently specified instruction under mandate. | What instruction, mandate, scope, and revocation condition governed execution? |
| Bounded delegated decision | A delegate chooses among defined alternatives or applies stated rules inside a bounded mandate. | What discretion, budget, exposure ceiling, and escalation condition were granted? |
| Autonomous action | A system selects or sequences acts with varying autonomy under an operational configuration. | Who deployed it, what valid mandate constrains it, and what assurance, stop, and accountability mechanisms apply? |

The last category describes an operating mode, not an independent legal subject.
For every mode, the model in `act_mandate_responsibility.md` remains applicable:

```yaml
decision_maker: "the entity that adopted or validly delegated the decision"
material_actor: "human, workflow, or system that materially performed the act"
mandate: "the scoped authority chain, including limits and revocation"
responsibility_note: "known residual responsibility and uncertainty"
```

Where a system makes a bounded choice, the trace must not replace the decision
maker with the system merely because the system selected the immediate means.
Conversely, calling an action "automated" must not erase an operator's actual
design, deployment, supervisory, or validation responsibilities.

## 4. Instrument choice and interoperability are related but distinct

Instrumental freedom asks whether a Principal may use a chosen permissible
instrument. Interoperability asks whether systems can exchange and make use of
information through interfaces or other technical means. Neither entails the
other.

- A Principal can be permitted to use an instrument even when no interoperable
  interface exists; human copy/paste may remain a legitimate low-tech transport
  as described in the [Human Copy/Paste Transport pattern](../patterns/human-copy-paste-transport/PATTERN.md).
- An interoperable API may exist while its use remains subject to authentication,
  mandate, rate limits, privacy, contractual scope, and safety controls.
- A portability or interoperability rule may attach only to a defined object,
  service, actor, or technical condition. It must not be generalized into a
  right to automate all interactions with an AI or SaaS service.

The design consequence is modest: Cogentia should prefer inspectable,
replaceable, documented interfaces and portable artifacts where this does not
defeat legitimate controls. It must preserve a governed fallback rather than
treating proprietary API access as the sole form of agency.

## 5. Legal evidence: what it does and does not establish

The following material informs the doctrine, but the evidential classes must
remain separate.

### 5.1 Cogentia normative doctrine

Cogentia ought to preserve a Principal's ability to change admissible tools
without losing intent, mandate, provenance, or responsibility. This is a design
commitment, not a statement that every platform restriction is unlawful.

### 5.2 Positive-law examples with bounded scope

- [Directive 2009/24/EC, Arts. 5(3) and 6](https://eur-lex.europa.eu/eli/dir/2009/24/oj?locale=en)
  permits, under stated conditions, observation, study, or testing by a person
  entitled to use a copy and decompilation indispensable to interoperability of
  an independently created program. It is not a general right to access any
  service, source code, credential, or interface.
- [French CPI art. L122-6-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044365559/2026-05-11)
  contains related software-use and interoperability exceptions with conditions
  and limits. Its rule for an act done on behalf of a person entitled to use the
  software is relevant by analogy to delegation, but does not itself establish a
  general automation right.
- [GDPR art. 20](https://eur-lex.europa.eu/eli/reg/2016/679/ojv) gives a data
  subject a conditional portability right for personal data provided to a
  controller, where processing rests on consent or contract and is automated.
  It is not a claim to another controller's functionality, inferred data, or a
  universal right to direct machine-to-machine transmission.

### 5.3 Case-law / analogy

In [Cass. 1re civ., 20 Oct. 2011, no. 10-14.069](https://www.courdecassation.fr/decision/607967b99ba5988459c49987),
the Court upheld the analysis that migration by persons authorised by licensees
to retrieve files for a move to another program could fall within the strict
necessities of software interoperability. The case supports a bounded analogy:
interoperability can include a transition that lets an authorised user leave a
system without losing data. It does not decide the lawfulness of scraping,
credential sharing, CAPTCHA circumvention, or automation of online services.

### 5.4 Regulatory direction and current technical regulation

- The [Data Act](https://eur-lex.europa.eu/eli/reg/2023/2854/oj?locale=en)
  addresses switching between defined data-processing services in Article 30
  and interoperability in later provisions, subject to its definitions,
  exclusions, and staged application. It is not evidence that every AI or SaaS
  service is within that regime.
- The [DMA](https://eur-lex.europa.eu/eli/reg/2022/1925/oj?locale=en) defines
  virtual assistants and provides targeted gatekeeper obligations; the
  Commission describes Article 6(7) as access to the same operating-system
  hardware and software features under its scope. These are targeted
  contestability rules, not a general entitlement to a chosen agent in every
  service.
- The [AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en)
  defines AI systems by machine operation with varying autonomy and regulates
  operators such as providers and deployers. Its terminology does not create a
  separate legal personality for an AI agent.

These sources show a regulatory trajectory toward selected portability,
interoperability, and accountable deployment. They do not establish a
universal, instrument-neutral freedom in positive law.

## 6. Adversarial limits: the restriction-attachment test

Before treating an instrument-specific restriction as capture, identify the
object to which it actually attaches.

| Limiting case | Why the doctrine is bounded |
| --- | --- |
| Authentication, signatures, and personal consent | A rule may require a personal manifestation, qualified credential, or non-delegable consent. An instrument cannot silently stand in for it. |
| Payments, banking, and regulated professions | Financial controls, professional qualifications, consumer protection, and anti-money-laundering duties can attach to the act and actor, not merely to the interface. |
| Dangerous or safety-critical machinery | Automation can alter speed, scale, predictability, and physical exposure; additional authorization, supervision, or certification may be justified. |
| CAPTCHA, anti-abuse, quotas, and cybersecurity | A control may protect availability, accounts, fraud prevention, or other users. The doctrine is not a license to bypass it. Its necessity and proportionality remain contestable facts. |
| Account sharing and delegated credentials | A credential can be personal, non-transferable, or limited by contract or law. A valid mandate does not automatically authorize credential delegation. |
| Third-party data and privacy | The Principal's choice of tool cannot erase another person's data-protection, confidentiality, intellectual-property, or access-control interests. |
| Material scaling | Repetition, speed, and aggregation can turn an otherwise permissible individual act into a different risk profile; limits may therefore be instrument-sensitive without being arbitrary. |

The test has two directions. A restriction is not justified merely because a
machine is involved. But a system is also not captured merely because it must
respect a control attached to a protected interest. A reviewer should challenge
both mistaken inferences.

## 7. Operational consequences for Cogentia

For an action involving a substitute or autonomous instrument, Cogentia should:

1. record the Principal or represented entity, `decision_maker`,
   `material_actor`, mandate, intended effect, and known limits;
2. preserve the attenuation chain, revocation path, budget, and escalation
   conditions rather than inferring authority from technical ability;
3. make the use of the instrument and relevant automation scale visible where
   it changes risk or accountability;
4. prefer portable, self-describing artifacts and replaceable interfaces where
   legitimate controls permit; and
5. stop or escalate when personal consent, regulated qualification, third-party
   rights, safety, security, or a higher-priority mandate requires it.

This is a source doctrine only. It does not amend `AGENTS.shared.md`, COP,
the Seconde Methode, or runtime policy. Any such propagation requires a later,
separately reviewed decision.

## 8. Open questions for a decorrelated Reviewer

1. Is the central presumption sufficiently precise to avoid confusing a design
   preference with a legal claim?
2. Does the agency taxonomy properly separate bounded delegated decision from
   autonomous action, or should it be expressed only through existing metadata?
3. Are the legal examples accurately scoped, especially Data Act Article 30,
   DMA Article 6(7), and the Fiducial/Athena decision?
4. Which restrictions are genuinely attached only to the instrument, rather
   than to a legitimate protected interest, and what evidence would distinguish
   them?
5. Does the proposed trace model adequately allocate responsibility without
   anthropomorphising a system or obscuring human and institutional duties?

## References

- [Directive 2009/24/EC on the legal protection of computer programs](https://eur-lex.europa.eu/eli/dir/2009/24/oj?locale=en).
- [Code de la propriete intellectuelle, art. L122-6-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044365559/2026-05-11).
- [Regulation (EU) 2016/679 (GDPR), art. 20](https://eur-lex.europa.eu/eli/reg/2016/679/ojv).
- [Cass. 1re civ., 20 Oct. 2011, no. 10-14.069](https://www.courdecassation.fr/decision/607967b99ba5988459c49987).
- [Regulation (EU) 2023/2854 (Data Act)](https://eur-lex.europa.eu/eli/reg/2023/2854/oj?locale=en).
- [Regulation (EU) 2022/1925 (DMA)](https://eur-lex.europa.eu/eli/reg/2022/1925/oj?locale=en).
- [European Commission DMA interoperability information](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability_en).
- [Regulation (EU) 2024/1689 (AI Act)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en).
