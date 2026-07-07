---
title: "Agent Configuration Layer"
subtitle: "From AGENTS.md to governed corpus projections"
version: "0.2"
status: "working-paper — method note"
date: "2026-06-13"
author: "Jean Hugues Noël Robert"
license: "CC BY-SA 4.0"
language: "en"
repository: "cogentia"
canonical_path: "cogentia/research/agent_configuration_layer.md"
tags:
  - cogentia
  - agent-configuration
  - agents-md
  - dot-agents
  - corpus-governance
  - pipeline
  - traceability
  - anti-capture
  - blocked-tools
  - tool-failure
related_research:
  - "cogentia/AGENTS.md"
  - "cogentia/research/pipeline.md"
  - "cogentia/research/conversation_to_corpus_pipeline.md"
  - "cogentia/COGENTIA.md"
  - "barons-Mariani/research/traceabilite_des_actes.md"
  - "barons-Mariani/research/second_method.md"
  - "cogentia/research/blocked_tool_rule.md"
related_repositories:
  - "cogentia"
  - "barons-Mariani"
  - "FractaVolta"
  - "marenostrum"
  - "inseme"
  - "Inox"
  - "registre-mariani"
  - "ubikia"
continuations:
  - "homogenize AGENTS.md files across the current structural repository map"
  - "integrate private/transmission repositories without leaking private data"
  - "test .agents/ as an experimental container, not as corpus memory"
  - "define machine-checkable conformance rules for repository-local agent mandates"
document_role: "source"
document_kind: "research-paper"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "research-paper"
classification_confidence: "medium"
---

# Agent Configuration Layer

## From AGENTS.md to governed corpus projections

**Version 0.2 — 2026-06-13**  
**Repository:** `JeanHuguesRobert/cogentia`  
**Path:** `research/agent_configuration_layer.md`

---

## 1. Purpose

This document defines the **Agent Configuration Layer** within the Cogentia method.

The practical trigger is the rise of repository-level agent instruction files such as `AGENTS.md`, and the more experimental convention of `.agents/` directories grouping agent instructions, skills, tasks, memories, MCP configuration, and local tool descriptors.

The Cogentia question is not simply:

```text
Where should agent instructions be placed?
```

It is:

```text
How can agent instructions be produced, versioned, criticized, authorized, and traced without becoming an opaque substitute for the corpus?
```

Core thesis:

> **Agent configuration files are not the corpus.  
> They are governed operational projections of the corpus.**

French formulation:

> **Les fichiers de configuration agentique ne sont pas le corpus.  
> Ils sont des projections opérationnelles gouvernées du corpus.**

---

## 2. Status of the standards landscape

As of 2026-06-13, the distinction is important:

- `AGENTS.md` should be treated as an emerging cross-tool convention for repository-local agent instructions.
- `.agents/` should be treated as a promising but still experimental directory convention.
- Neither replaces the corpus, Git history, Issues, Pull Requests, or explicit human authorization.

External reference points:

- `AGENTS.md`: <https://agents.md/>
- OpenAI Codex guidance on `AGENTS.md`: <https://developers.openai.com/codex/guides/agents-md>
- `.agents Protocol`: <https://dotagentsprotocol.com/>

The Cogentia position is therefore conservative:

```text
Adopt AGENTS.md now.
Experiment with .agents/ carefully.
Never allow hidden agent memory to outrank the versioned corpus.
```

---

## 3. Core distinction

### 3.1 Corpus source

A **source document** is part of the corpus. It carries concepts, claims, genealogy, objections, references, and revision history.

It may be doctrinal, technical, legal, political, patrimonial, methodological, personal, private, or experimental.

It is meant to remain evaluable beyond one tool, one prompt, one model, or one moment.

### 3.2 Agent configuration

An **agent configuration** is not a source document.

It is a short operational mandate telling an agent how to act in a bounded context:

```text
repository
→ scope
→ invariants
→ permissions
→ forbidden actions
→ routing rules
→ validation expectations
→ references
```

It is a projection of the corpus into action constraints.

### 3.3 Derived products / produits déclinés

A public article, memo, letter, prompt, slide deck, social-media post, publication package, or platform-specific version may be a **derived product** from the corpus.

An agent configuration file is different. It is not primarily a product for a public audience. It is a control surface for human-agent cooperation.

Ubikia is the dedicated repository for progressively automating and governing those derived products.

---

## 4. Position in the Cogentia pipeline

The existing Conversia chain is:

```text
conversation
→ stabilisation
→ corpus
→ modèle
→ agent
→ suggestion
→ conversation
```

The Agent Configuration Layer makes one step explicit:

```text
conversation
→ stabilisation
→ corpus
→ agent configuration
→ agent
→ suggestion
→ conversation
```

For collective action, the chain becomes:

```text
conversation
→ options
→ decision candidate
→ mandate
→ situated agent configuration
→ action
→ trace
→ control
→ feedback
→ corpus
```

For publication and derivation, Ubikia adds another explicit loop:

```text
source corpus
→ derivation constraints
→ persona / audience / platform
→ derived product
→ publication record
→ feedback
→ corpus
```

This matters because an agent does not act from the whole corpus directly. It acts from a **bounded operational projection** of the corpus.

The layer prevents two symmetrical failures:

```text
Too little configuration  → agent guesses the doctrine.
Too much configuration    → agent obeys an opaque pseudo-corpus.
```

The target is:

```text
short mandate
+ explicit references
+ traceable action
+ reversible stabilization
```

---

## 5. Minimal structure of a repository AGENTS.md

Each structural repository should have a root `AGENTS.md`.

Minimum useful sections:

1. **Repository role** — what this repository is in the corpus ecosystem.
2. **Core instruction** — the one rule that agents must apply first.
3. **Boundaries** — what agents must not do without explicit authorization.
4. **Routing discipline** — issue, branch, document, prompt, source, derived product.
5. **Validation** — tests, factual checks, uncertainty, review requirements.
6. **References** — documents that outrank the instruction file.
7. **Completion report** — what an agent must report after substantial work.

Minimal completion report:

```text
Scope:
Files changed:
Reason:
Validation:
Known risks:
Next step:
Human validation needed: yes/no
```

---

## 6. Corpus-wide invariants

The following invariants should appear, in repository-specific form, across the current structural repository map:

```text
The corpus is the source of truth.
AGENTS.md is an operational projection, not doctrine itself.
Use the smallest sufficient container.
Distinguish source document, derived product, issue, prompt, script, and temporary trace.
Distinguish public corpus, private register, and derived publication layer.
Do not invent facts, references, commitments, partners, legal positions, or institutional mandates.
Do not stabilize anything without explicit scoped authorization.
Report uncertainty instead of hiding it.
Prefer reversible, traceable changes.
Do not imply that a tool operation succeeded when it was blocked.
Report blocked tools, preserve partial work, and ask for manual intervention when it could unblock the work.
```

These are not stylistic preferences. They are anti-capture rules.

### 6.1 Blocked-tool invariant

A blocked tool, connector, permission denial, API limit, repository access problem, policy check, or failed GitHub operation is a first-class operational signal.

It must not be hidden, minimized, or reinterpreted as success.

The correct behavior is:

```text
blocked operation
  -> report what was attempted
  -> report what failed
  -> classify the failure when possible
  -> preserve partial work
  -> propose the smallest safe continuation
  -> ask whether manual intervention is desired when it could unblock the work
```

This rule is governed by [`blocked_tool_rule.md`](blocked_tool_rule.md).

---

## 7. `.agents/` as experiment

The `.agents/` directory may become useful for grouping:

```text
.agents/
  agents.md
  skills/
  tasks/
  prompts/
  mcp.json
  local-context/
```

However, Cogentia should not adopt `.agents/` as authoritative memory at this stage.

Rules for any `.agents/` experiment:

1. `.agents/` must not contain hidden doctrine that contradicts the corpus.
2. `.agents/` must not become a private memory bypassing GitHub Issues or source documents.
3. Every durable claim in `.agents/` must point back to a corpus source or be marked as temporary.
4. Tool-specific instructions must remain subordinate to repository-level and corpus-level instructions.
5. No agent memory should outrank a signed, versioned, human-owned corpus document.
6. Private or sensitive material must remain governed by its repository-specific confidentiality rules.

Recommended initial posture:

```text
AGENTS.md = adopted convention.
.agents/ = experimental container.
Corpus = authority.
Private register = governed sensitive memory, not default public corpus.
Ubikia = governed derivation and publication layer.
Human mandate = final authorization.
```

---

## 8. Structural repository implementation map

This map is current, extensible, and not closed. It replaces the earlier six-repository formulation.

| Repository | Visibility | Agent configuration role |
|---|---:|---|
| `cogentia` | public | Method, pipeline, corpus governance, continuations, agent-resumable knowledge production. |
| `barons-Mariani` | public | Source doctrine, patrimonial memory, political and legal method, public long-form texts. |
| `FractaVolta` | public | Energy, compute, packetization, operational design, anti-capture infrastructure. |
| `marenostrum` | public | Mediterranean capacity, consortium logic, solar-to-inference sovereignty, long-term doctrine. |
| `inseme` | public | Platform, COP, Conversia, Cellula, coordination, events, traces, implementation discipline. |
| `Inox` | public | Language/runtime layer, capabilities, controlled execution, programmable composition, gateway logic. |
| `registre-mariani` | private | Private register, sensitive memory, patrimonial/successoral continuity, controlled future transmission. |
| `ubikia` | public | Derived products, publication layer, provenance, persona/platform packaging, reduction of manual publication drift. |

Each repository should have a short `AGENTS.md` reflecting its role.

The files should be consistent but not identical.

Uniformity is useful at the invariant level, not at the content level.

---

## 9. Special rule for `registre-mariani`

`registre-mariani` is not simply another public corpus repository.

It is private because it may contain information that cannot yet be made public: personal, patrimonial, family, legal, operational, sensitive, or third-party material.

Its long-term function includes controlled transmission. Some contents may become public or transmissible after Jean Hugues Noël Robert’s death, if and only if the relevant legal, testamentary, patrimonial, and ethical instruments have been properly prepared.

Agent rule:

```text
Do not leak private register contents into public repositories.
Do not summarize sensitive private material into public documents unless explicitly instructed.
Do not treat future publication as already authorized.
Mark testamentary or posthumous publication requirements as legal/to-verify unless a valid instrument exists.
```

Strategic continuation:

```text
Prepare the legal and testamentary framework for the controlled posthumous opening, transfer, or publication of the appropriate parts of the private register.
```

---

## 10. Special rule for `ubikia`

`ubikia` is the publication and derivation layer.

Its problem is practical and strategic:

```text
The corpus produces more valuable material than can be manually adapted, formatted, published, tracked, and re-integrated without drift.
```

Ubikia must therefore govern:

- source-to-product derivation;
- product-to-platform adaptation;
- persona and audience selection;
- publication packages;
- metadata;
- provenance;
- publication ledger;
- feedback return to corpus.

Agent rule:

```text
Do not optimize for volume.
Optimize for faithful derivation, provenance, and reduction of manual drift.
```

Ubikia should help publish more efficiently without allowing publication automation to capture the corpus.

---

## 11. Anti-capture rule

A configuration file can capture a corpus if it silently changes what agents are allowed to see, do, or ignore.

Capture patterns:

```text
- hidden memory outranking public corpus;
- private register contents leaking into public outputs;
- publication automation becoming authorship;
- tool-specific prompt overriding doctrine;
- stale AGENTS.md contradicting updated source documents;
- generated summaries treated as sources;
- private task files creating obligations not authorized by Jean Hugues Robert;
- agent convenience replacing traceability;
- direct publication without checkpoint;
- public institutional claim without mandate.
```

Counter-rule:

> **Every agentic shortcut must remain inspectable, reversible, and subordinate to the corpus.**

---

## 12. Review checklist for future agents

Before acting in any structural repository, an agent should answer:

```text
1. What repository am I in?
2. What role does this repository play in the corpus ecosystem?
3. Have I read the root AGENTS.md?
4. Is there a local AGENTS.md closer to the files I will change?
5. Am I touching a source document, a derived product, code, prompt, issue, temporary trace, or private register entry?
6. What authority allows the change?
7. What uncertainty remains?
8. What validation can be performed?
9. What must be reported back to the human author?
10. Is this a reversible trace or a stabilization?
11. Is the material public, private, sensitive, or intended for posthumous transmission?
```

If the agent cannot answer, it should prepare a proposal rather than act.

---

## 13. Minimal prompt

Reusable prompt:

```text
Respect the Cogentia Agent Configuration Layer. Treat AGENTS.md as a bounded operational mandate, not as the corpus itself. Use the smallest sufficient container. Distinguish source document, derived product, issue, prompt, script, private register entry, and temporary trace. Do not stabilize anything without explicit scoped authorization. Do not leak private register material into public corpus outputs. Report uncertainty, validation, known risks, and the next reversible step.
If a tool, connector, permission, policy check, API limit, repository access problem, or GitHub operation blocks the work, report the blockage explicitly, preserve partial work, and ask whether manual intervention is desired when it could unblock the operation.
```

---

## 14. Conclusion

`AGENTS.md` can become the local mandate of the agent.

`.agents/` can become the agent's tool bag.

`registre-mariani` can become the governed private register and transmission layer.

`ubikia` can become the governed derivation and publication layer.

Cogentia must remain the constitution of the system:

```text
corpus first
configuration second
agent third
human mandate above stabilization
trace after every meaningful action
```

This is the practical rule:

> **Configure agents, but govern configurations.**
