---
title: "Act, mandate and responsibility"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-06-05"
license: "CC BY-SA 4.0"
status: "working-note"
corpus_role: "source"
---

# Act, mandate and responsibility

## Purpose

This note defines a minimal doctrine for imputing responsibility to acts in a DHITL context.

It applies to human acts, institutional acts, hybrid human/AI acts, and traced interactions such as emails, decisions, commitments, GitHub issues, packets or publications.

## Core principle

An act should be described as:

```text
actor
  + role
  + mandate
  + represented entity
  + beneficiary
  + decision chain
  + responsibility
```

The same physical person, legal person, association, company or institution may act under several roles or mandates.

A traceability system must therefore avoid treating the actor name alone as sufficient.

## Mandate is necessary for imputation

To impute responsibility, it is not enough to know that an act occurred.

One must also know, as far as possible:

- who materially acted;
- under what role;
- under what mandate;
- on behalf of whom;
- for whose benefit;
- with what human validation;
- with what known ambiguity.

## Practical ambiguity

In practice, roles are often unclear.

The same person may confuse roles, intentionally or not.

A single material action may partly belong to several roles.

In a legal dispute, a judge or competent authority may have to determine after the fact under which framework the act must be analysed.

A traceability system should therefore not erase ambiguity.

It should record it.

## Reconstruction of acts

Sometimes one material action may need to be reconstructed as several conceptual acts.

Example:

```text
one email sent by one person
  → personal act
  → association act
  → preparatory act for a future fund
```

This does not mean that the factual trace is duplicated.

It means that the same trace may support several responsibility analyses.

## Personal responsibility of the mandatary

Acting under a mandate does not automatically erase the personal responsibility of the actor.

The mandatary acts on behalf of another person or entity, but the mandatary materially performs the act.

The trace should therefore distinguish:

- the material actor;
- the mandate invoked;
- the represented entity;
- the beneficiary;
- the level of human decision;
- the possible residual personal responsibility.

## DHITL implication

In DHITL, responsibility cannot be imputed merely to the tool that generated a sentence, suggested a decision, or executed an operation.

The relevant question is:

```text
Who decided what,
under which role,
under which mandate,
on behalf of whom,
with which validation,
and with which traceable responsibility?
```

This is especially important when AI agents, assistants, scripts or workflows participate in producing or executing acts.

## Minimal metadata

```yaml
actor: ""
actor_type: "physical_person|legal_person|association|company|institution|ai_agent|workflow|other"
role: ""
mandate: "personal|association|institute|enterprise|future_fund|political|property|other|mixed|unclear"
mandate_label: ""
represented_entity: ""
beneficiary: ""
material_actor: ""
decision_maker: ""
human_review_required: true
human_review_status: "draft|reviewed|approved|rejected|unclear"
role_ambiguity: false
role_ambiguity_note: ""
responsibility_note: ""
```

## Relation to Interaction Packets

Interaction Packets should include mandate and responsibility metadata when an interaction may have institutional, associative, political, patrimonial, legal or public-interest consequences.

The packet does not decide legal responsibility.

It preserves the structured facts and ambiguities needed to analyse responsibility later.

## Rule

Do not wait for the perfect future protocol.

Every trace created now should already move toward explicit act, role, mandate and responsibility metadata.
