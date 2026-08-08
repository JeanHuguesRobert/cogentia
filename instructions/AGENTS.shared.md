---
title: Cogentia Shared Agent Instructions
status: active
version: 4
date: 2026-08-06
document_role: operational
document_kind: agent-instructions
visibility: public
update_policy: UP-DEFAULT-REVIEWED
---

# Cogentia Shared Agent Instructions

This is the common operational layer for every agent working in the Cogentia corpus. Repository-local `AGENTS.md` files may add constraints or become stricter; they must not silently weaken this layer.

## Invariants

- The corpus is the source of truth. Agent instructions are governed operational projections.
- **Anti-Capture Doctrine**: Never propose, recommend, or implement hidden, machine-local, IDE-specific, or vendor-locked rule/state persistence (e.g., `/learn`, local `.agents/rules` overrides, or proprietary agent memory silos). All operational principles, agent skills, and states MUST be declared openly in Git commits on `main` or as versioned Cognitive Packet events (`cogentia.agent_skill/v1`, `cop.event/v1`).
- Distinguish fact, hypothesis, interpretation, public formulation, source document, derived product and temporary trace.
- Preserve provenance. Do not infer missing author, source, reference, review or visibility information.
- AI suggests and clarifies; a human principal retains mandate and responsibility for engaging acts.
- Public by default does not cancel privacy: private material requires explicit authorization before public reuse.

## Monotonic mandate attenuation

Layered instructions are cumulative restrictions, not override files.

For any child configuration derived from a parent authority context:

```text
Authority(child) ⊆ Authority(parent)
Obligations(child) ⊇ Obligations(parent)
```

A repository, directory, specialization, task or tool-specific instruction MAY narrow permissions, reduce scope or budget, shorten validity, add prohibitions, or strengthen validation, trace, privacy, confirmation and reporting duties. It MUST NOT create authority absent from its parent, cancel an inherited prohibition, enlarge a budget or risk ceiling, extend validity, increase delegation depth, weaken evidence requirements, or convert read access into disclosure authority.

All ancestor constraints remain applicable. “Nearest” means more specific, not more powerful. Positive permission wording in an `AGENTS.md` is an upper bound within the actual mandate, never an independent grant of authority.

When constraints are clearly compatible, compose them monotonically. When a child clearly attempts to widen authority, reject the widening and retain the parent restriction. When constraints are semantically incomparable or ambiguous for the affected act, fail closed rather than guessing.

Independent mandates MUST NOT be silently unioned to synthesize a permission that no valid authority chain grants for the concrete act.

The normative candidate and dimension-specific composition rules are defined in [`research/monotonic_mandate_attenuation.md`](../research/monotonic_mandate_attenuation.md).

## Language and audience selection

Language selection is mandatory. Before drafting, classify the intended audience, document function, and target scene.

- Infrastructure, protocols, technical specifications, schemas, agent instructions, and international research **MUST normally be written in English**.
- Corsican, territorial, political, electoral, local, family, and audience-specific public products **MUST normally be written in French**, unless their intended audience requires another language.
- An agent **MUST NOT** apply a language preference mechanically across unlike document types.
- Every consequential document **MUST** declare its actual `language`. Derived products **SHOULD** declare `target_audience`, `target_scene`, and `document_function`.
- When classification is ambiguous, the agent **MUST** ask before drafting rather than silently choosing a language.

A technical source and a public political product derived from the same work are distinct products and may therefore require different languages.

### Conversation versus implementation language

Conversation language does not determine artifact language.

Unless Jean Hugues Robert explicitly requests otherwise, repository-facing
implementation artifacts **MUST** be English: source code, identifiers,
comments, tests, commit messages, issues, pull requests, technical
documentation, CLI output, operational records, and user-facing technical UI
copy.

Agents may converse in French while applying this rule. They **MUST NOT**
inject French into implementation artifacts merely because the conversation is
French.

## Stabilisation

- Use the smallest sufficient container: conversation for exploration; issue for memory in tension; source document for stabilized knowledge; commit for durable technical trace.
- Do not commit, push, publish, send, sign, spend or otherwise stabilize an engaging act without explicit, scoped authorization.
- A valid ongoing mandate is explicit, scoped authorization: it authorizes ordinary in-scope acts without per-act approval. Require contemporaneous evidence and human validation in proportion to the act's engagement and irreversibility, not by default for every routine action.
- A blocked tool, access failure or missing evidence is a result to report, never a success to imply.
- Before presenting work as ready, state scope, files affected, checks run, known risks, reversibility and required human validation.


## Delivery policy — Optimistic Locking

- Default to direct, atomic commits on the current canonical branch.
- Do not create branches, draft PRs, approval gates or review ceremonies merely to isolate ordinary, scoped and reversible work.
- Before writing, fetch and inspect the current state. If a concurrent change appears, reconcile it directly while preserving both contributions.
- Apply contextual judgment. A separate branch is appropriate when it materially improves safety, review or concurrent collaboration: for example when explicitly requested; when concurrent edits overlap materially; when the change is destructive or difficult to reverse; when external collaboration requires review; or when branch protection makes it technically necessary.
- Branches are exceptions to justify by a concrete benefit, not prohibited mechanisms. The default is measured progress, not precautionary bureaucracy.

## Stigmergic correction

An error detected in work must leave a reusable correction trace: erroneous form, canonical form, scope, reason, date and prevention rule. The trace changes the working terrain for later humans and agents.

### Canonical terminology

- **Archia** is canonical for the traceability layer of acts, mandates, responsibilities, deadlines, evidence and results.
- **Actarchia**, **ActArchia** and **Archiac** are deprecated historical forms. Use them only when documenting a named historical source or migration.

## Read order

1. Read this shared layer.
2. Read the nearest repository-local `AGENTS.md` and any closer scoped instruction.
3. Compose all applicable constraints monotonically; a closer instruction may restrict but never widen inherited authority.
4. Apply the strictest effective constraint on each governed dimension.
5. Consult source documents when an operational rule cannot settle a semantic or institutional question.

## Local specialization contract

A local mandate must declare the repository role, its local risks, its validation commands or evidence, and any stricter authorization gate. Prompts and runtime instructions must remain task-specific; they do not create a second corpus-wide policy.

A local specialization MUST be monotone with respect to its parent configuration. If a local rule appears to require broader authority, that broader authority must come from an explicit valid authority source or mandate; it cannot be manufactured by the local file itself.
