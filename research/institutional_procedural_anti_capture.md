---
title: Institutional and Procedural Anti-Capture
subtitle: Preserving observability, optionality and recoverability across protective and remedial processes
author: Jean Hugues Noël Robert
date: 2026-09-26
document_role: source
document_kind: operational-research
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
language: en
license: CC BY-SA 4.0
canonical_repo: JeanHuguesRobert/cogentia
canonical_path: research/institutional_procedural_anti_capture.md
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/institutional_procedural_anti_capture.md
related_research:
  - instructions/AGENTS.shared.md
  - research/agent_local_memory_anti_capture.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_date: 2026-09-26
  derived_from:
    - JeanHuguesRobert/barons-Mariani:memory/marie-louise/procedures_2024_2026_reactivation_register.md
review:
  status: unreviewed
  reviewed_by: []
---

# Institutional and Procedural Anti-Capture

## 1. Problem

A mechanism created to protect a right, provide a remedy, assist a person,
or correct an institutional failure can itself become a mechanism that
reduces the person's effective possibilities.

This does not require hostile intent.

Capture may emerge from individually ordinary and apparently reasonable
steps:

```text
request
→ registration
→ reclassification
→ transfer
→ mediation
→ waiting
→ fragmentation
→ partial resolution
→ closure
```

At the end of such a sequence, the original route may have disappeared,
parallel routes may have become harder to use, deadlines may have elapsed,
or the person may no longer be able to reconstruct what happened.

The relevant question is therefore not only:

> Does the protective mechanism formally exist?

but also:

> Does using it preserve the person's effective capacity to understand,
> verify, continue, correct, exit, or pursue other available routes?

## 2. Capture without conspiracy

"Capture" in this document does not imply conspiracy, bad faith, or even
intentional conduct.

A process is captured when its evolution materially reduces the Principal's
effective agency while that reduction remains insufficiently visible,
explicit, reversible, or attributable.

Possible causes include:

- ordinary administrative failure;
- fragmented responsibilities;
- incompatible information systems;
- local incentives;
- procedural defaults;
- excessive specialization;
- automated workflow;
- vendor or portal dependency;
- ambiguous consent;
- unobserved reclassification;
- silent substitution of one procedure for another.

Intent and mechanism must therefore be investigated separately.

```text
observed loss of agency
≠ proof of hostile intent
```

The Anti-Capture response is primarily architectural and evidentiary, not
accusatory.

## 3. Core invariant

> **Never allow a channel, intermediary, transfer, mediation,
> reclassification, confidentiality regime, partial resolution, or closure
> to silently substitute one route for another or materially reduce future
> options.**

When a material transition occurs, its nature and consequences should be
observable.

A high-stakes process should tend toward:

```text
known input
→ identifiable state
→ attributable act
→ explicit effect
→ recoverable trace
→ preserved next options
```

## 4. Unknown capture modes

An exhaustive catalogue of capture mechanisms is impossible.

The objective is therefore not to predict every failure.

The objective is to build procedures that remain informative and recoverable
when an unforeseen failure occurs.

Canonical rule:

> **When the capture mode cannot be predicted, preserve observability,
> recoverability and optionality.**

This is a form of procedural fault tolerance.

## 5. Anti-capture dimensions

For each material transition, inspect at least the following dimensions.

### Channel

Has a particular portal, account, device, vendor, physical office or
communication method become effectively mandatory?

Can the record be exported and reconstructed independently?

### Qualification

Has the request changed legal, administrative or operational nature?

Examples:

```text
complaint → information request
claim → mediation
appeal → informal correspondence
investigation → orientation
```

A change may be legitimate. It must not be silent when it changes effects.

### Scope

Has part of the original request disappeared, been separated, or been treated
as resolved without an explicit decision?

### Consent

Has a narrow authorization silently become a broad mandate?

Prefer granular consent for materially different actions.

### Transmission

What was sent, by whom, to whom, when, under what authority, and with what
effect?

A declared transmission is not equivalent to a verified handoff.

### Time

Which independent deadlines continue to run?

Entering one mechanism must not be assumed to suspend another unless that
effect is established.

### Confidentiality

Does entering the process create a new confidentiality, secrecy, privilege,
non-disclosure, or evidentiary regime?

Does that regime affect later publication, reuse, proof or litigation?

### Closure

What exactly is being closed?

```text
one question
one branch
one incident
one request
the whole matter
```

Partial resolution must not silently become global closure.

### Evidence

Can an independent observer later reconstruct:

```text
who knew what
when
under what mandate
what was done
what was not done
what effect followed
what remained possible
```

### Exit and continuation

Can the Principal leave the mechanism or continue through another route
without losing the state already acquired?

## 6. Independent trace

A system should not be the sole custodian of the evidence needed to evaluate
that same system.

For material processes, preserve an independent trace proportionate to the
stakes:

```text
outgoing act
incoming act
timestamp
channel
recipient
reference
attachments
acknowledgement
declared state
observed state
next deadline
next available route
```

A proprietary interface may be used as a transport mechanism.

It should not silently become the only memory of the process.

## 7. Granular authority

Authorization to enter a process does not automatically authorize every
subsequent transformation of that process.

Where consequences are material, distinguish:

```text
register
inspect
request information
transmit
contact a third party
mediate
settle
publish
close
waive
```

One permission should not silently imply another.

## 8. No silent substitution

A recurring capture pattern is substitution:

```text
A is requested
B is proposed as helpful
B is performed
A disappears
```

The substitution may be benign and B may even be useful.

The anti-capture requirement is therefore not "never transform a procedure".

It is:

```text
A remains identifiable
B is explicitly characterized
the relation A ↔ B is known
the consequences are stated
the Principal retains the relevant choice
```

## 9. Protective mechanisms are not exempt

A mediator, ombudsman, regulator, court-access mechanism, appeal channel,
trusted intermediary, safety system or rights-protection institution must not
be exempt from the Reality tests applied to the system it is meant to correct.

Its formal mission is evidence about its intended role.

Its actual operation is an empirical question.

Therefore:

> **A mechanism designed to make rights effective must itself be tested for
> effectiveness.**

Possible observations include:

```text
accessibility
response time
continuity
traceability
ability to correct records
ability to reach a human
quality of reasons
handoff reliability
preservation of parallel routes
recoverability after closure
```

Failure on such a test does not by itself establish misconduct.

It establishes an observable difference between formal capability and
effective capability.

## 10. Relationship with the Machine à Empêcher

A *Machine à Empêcher* need not be a designed machine.

It may emerge from the composition of locally defensible rules and actions.

Institutional Anti-Capture therefore provides an operational way to observe
one important class of Machine à Empêcher:

```text
formal possibility exists
+
successive procedural transformations
+
effective capacity decreases
+
the decrease is difficult to observe or reverse
```

The response is not primarily suspicion.

It is instrumentation.

## 11. Relationship with Archia

For a material institutional interaction, the minimum reconstructible unit is:

```text
Act
→ author
→ mandate / competence
→ date / deadline
→ information available
→ decision or abstention
→ evidence
→ produced effect
→ result
→ possibility of correction
```

Anti-Capture and Archia therefore reinforce each other:

```text
Anti-Capture preserves the possible.
Archia preserves the trace.
```

Together they make procedural transformations contestable, correctable and
learnable.

## 12. Reality-test protocol

For any protective or remedial mechanism:

```text
1. identify the formal promise;
2. identify the available entry routes;
3. make the smallest sufficient probe;
4. preserve an independent copy of the input;
5. observe the resulting state;
6. record every material transition;
7. test whether the trace is recoverable;
8. verify whether parallel options remain open;
9. distinguish failure from intent;
10. update the model from observed behaviour.
```

The goal is not to prove in advance that the mechanism works or fails.

The goal is to make either outcome informative.

## 13. Canonical compression

> **Do not trust a process merely because it is protective, and do not
> distrust it merely because it is institutional. Instrument it.**

> **When the failure mode is unknown, preserve observability,
> recoverability and optionality.**

> **Never let an intermediary silently replace one route with another.**

> **A protective mechanism must remain subject to its own Reality tests.**
