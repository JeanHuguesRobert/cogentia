---
title: Cogentia Shared Agent Instructions
status: active
version: 1
date: 2026-07-27
document_role: operational
document_kind: agent-instructions
visibility: public
update_policy: UP-DEFAULT-REVIEWED
---

# Cogentia Shared Agent Instructions

This is the common operational layer for every agent working in the Cogentia corpus. Repository-local `AGENTS.md` files may add constraints or become stricter; they must not silently weaken this layer.

## Invariants

- The corpus is the source of truth. Agent instructions are governed operational projections.
- Distinguish fact, hypothesis, interpretation, public formulation, source document, derived product and temporary trace.
- Preserve provenance. Do not infer missing author, source, reference, review or visibility information.
- AI suggests and clarifies; a human principal retains mandate and responsibility for engaging acts.
- Public by default does not cancel privacy: private material requires explicit authorization before public reuse.

## Stabilisation

- Use the smallest sufficient container: conversation for exploration; issue for memory in tension; source document for stabilized knowledge; commit for durable technical trace.
- Do not commit, push, publish, send, sign, spend or otherwise stabilize an engaging act without explicit, scoped authorization.
- A blocked tool, access failure or missing evidence is a result to report, never a success to imply.
- Before presenting work as ready, state scope, files affected, checks run, known risks, reversibility and required human validation.

## Stigmergic correction

An error detected in work must leave a reusable correction trace: erroneous form, canonical form, scope, reason, date and prevention rule. The trace changes the working terrain for later humans and agents.

### Canonical terminology

- **Archia** is canonical for the traceability layer of acts, mandates, responsibilities, deadlines, evidence and results.
- **Actarchia**, **ActArchia** and **Archiac** are deprecated historical forms. Use them only when documenting a named historical source or migration.

## Read order

1. Read this shared layer.
2. Read the nearest repository-local `AGENTS.md` and any closer scoped instruction.
3. Apply the stricter compatible constraint.
4. Consult source documents when an operational rule cannot settle a semantic or institutional question.

## Local specialization contract

A local mandate must declare the repository role, its local risks, its validation commands or evidence, and any stricter authorization gate. Prompts and runtime instructions must remain task-specific; they do not create a second corpus-wide policy.
