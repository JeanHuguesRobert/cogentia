---
title: "Portable Agent Guidance and Capability Classification"
date: "2026-10-09"
document_role: operational
document_kind: design-note
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - research/agent_configuration_layer.md
  - instructions/AGENTS.shared.md
  - docs/agent-skills-contract.md
  - docs/agent-skills-compatibility.md
  - docs/agent-gateway-invocation.md
  - research/agent_working_conventions.md
---

# Portable agent guidance — preserve semantics, adapt delivery

## Decision

Reuse the existing **Agent Configuration Layer**. Canonical knowledge and governance stay in the Corpus; agent instruction files are short, governed *projections*, not competing source authorities. Do not construct a separate universal agent runtime or duplicate full rules in every adapter.

Portable guidance has three layers:

1. **Corpus/mandate** — intentions, evidence, governing principles and hard constraints; no agent-specific syntax.
2. **Small operational contract** — `AGENTS.md` + relevant `SKILL.md` + Cognitive Packet resume links: portable human-readable Markdown.
3. **Delivery adapters** — CLI, MCP, web/chat, GitHub Actions, hosted coding agents and REPL runners. They translate tools, identity, input/output envelopes and access rules without changing authority.

## Agent classification — independent axes, not marketing names

An agent may occupy different cells on different tasks. Classify the **concrete handler instance in its current environment**, not just its model or vendor.

| Axis | Values to record | Why it matters |
|---|---|---|
| Role | principal proxy / planner / observer / coding handler / executor / verifier / scheduler / REPL tool | Disentangles responsibility from model |
| Execution | conversational / local interactive / autonomous CLI / cloud job / continuous service / delegated subagent | Predicts lifetime and resumability |
| Input access | no Corpus / read-only snapshot / live Corpus read / exact durable artifacts | Prevents false claims of reading source |
| Mutation authority | none / draft-only / versioned repository writes / scoped external effects | Tool possession is not authorization |
| State | volatile context / resumable packet / durable shared-store claim | Distinguishes remembered intention from coordination |
| Concurrency | observer / optimistic writer / claim holder / provider-fenced writer | Characterizes actual write guarantees |
| Protocol | Markdown / MCP / GitHub issue+Compute / CLI stdio / HTTP / other | Selects adapter |
| Evidence | self-report / local tests / durable provider receipt / end-to-end Reality Test | Prevents inflated capability claims |
| Recovery | retry-only / CAS conflict / reconcile / compensating act / governed human escalation | Selects measured-risk handling |

Maintain statuses `verified`, `partial`, `unknown`, `incompatible` with dated receipts. Do not infer compatibility from a model name. Existing adapter inventory lives at [agent-gateway/adapter-registry.js](../scripts/lib/agent-gateway/adapter-registry.js); existing verification log: [agent-skills-compatibility.md](agent-skills-compatibility.md).

## Initial concrete families (capabilities must be reverified)

| Family | Examples present in Corpus | Portable projection / adapter | Evidence status |
|---|---|---|---|
| Coding CLI handlers | Codex, Claude, Grok, Antigravity | AGENTS.md + relevant SKILL.md; agent-gateway adapters | adapter code exists; per-provider live feature coverage varies/unknown |
| Conversational agents | ChatGPT conversations and other chat UIs | Brief with durable links, continuation contract, explicit tool inventory | conversational context is not authoritative Store |
| Automated compute handlers | GitHub Actions typed Compute | bounded `cop.compute-request/v1` + result/receipt in issue | concrete runs verified for node tests; repository write off in Compute profile |
| Logical agents / services | Agent JHN/John | mandate + LogicalAgent identity, governed step harness, trace | architecture exists; test particular deployment separately |
| REPL/tool workers | Python, Node, Inox, shell, SQL | structured capability invocation via gateway adapter | listed in adapter registry; authority and durability vary |
| Human principal or relay | human user | decision brief / explicit authorization / concise unresolved conflicts | not a machine execution adapter |

This list classifies integration surfaces, not model intelligence, safety rating or legal capacity.

## Fractal specialization by composition (experimental)

The generic contract above is the **base interface**, not a superclass from which model brands inherit authority. Reuse Cogentia's [Agent Configuration Layer](../research/agent_configuration_layer.md), [FractaCognition](../research/fractacognition_principles.md), and the non-normative [FractaXXXX](../research/fractaxxxx.md) grammar: the same observe–judge–adapt–act–trace discipline can recur at multiple situated scales without assuming mathematical fractality.

Resolve an **effective handler profile** as a *governed composition*, not as a growing inheritance hierarchy:

```text
Corpus-wide invariants / authority ceiling
  + capability-family traits (conversation, coding, job, service, human)
  + provider/runtime adapters (ChatGPT, Codex, Claude, Grok, Actions, etc.)
  + instance evidence (actual tools, scopes, state, receipts, version)
  + repository / project / Packet / operation specialization
  + situated risk, budget and Operational Stance
    → bounded effective profile for this one invocation
```

The hierarchy here is **resolution scope**, not a license to override hard constraints. Across each nested context: capabilities must be *observed*, obligations may become stricter, and authority/budget/exposure may only be attenuated unless a separately valid higher authority explicitly changes the mandate. Conflicts are exposed, not resolved by silently choosing the most permissive configuration. Model identity alone is not a capability certificate.

Prefer composable **interfaces/traits** over concrete inheritance:

| Trait/interface | Optional implementation behavior | Non-claim |
|---|---|---|
| `CorpusReader` | fresh links, source retrieval, cited excerpts | local context does not establish full Corpus access |
| `PacketObserver` | snapshots, generation, provenance | observation grants no mutation |
| `VersionedWriter` | provider CAS, conflict receipt, reconcile | CAS is not mandate enforcement |
| `ClaimHolder` | acquire/renew/release + fenced effect adapter | in-memory lease is not distributed enforcement |
| `EvidenceReporter` | immutable/testable receipts, limits | self-report is not provider verification |
| `ContinuationCarrier` | resumable handoff through durable reference | agent memory is not authoritative Store |
| `EffectExecutor` | bounded provider effect under mandate | tool possession is not authorization |

**Behavior can be specialized independently:** an agent can have `CorpusReader + EvidenceReporter` without `VersionedWriter`; a GitHub Actions runner can execute read-only typed Compute without permission to mutate. A particular ChatGPT conversation may have connected GitHub tools; another may not. The effective profile is per execution, not per brand.

### Candidate minimal profile (illustration, not a new required schema)

```yaml
handler_family: conversational
provider_adapter: chatgpt-with-github
instance:
  corpus_read: observed
  versioned_write: observed
  semantic_authority_fence: unsupported
packet:
  ref: https://github.com/JeanHuguesRobert/inseme/issues/121
  mode: OBSERVE
governance:
  mandate: reference-required
  exposure: bounded
  uncertainty: explicitly-reported
```

**Resolution/optimistic-locking rule:** capture the initial evidence/version, do useful bounded work, refresh before a material write, reconcile deltas, and publish the actual receipt. If tools or policies differ from the profile, downgrade or reroute the operation; never imitate an unavailable capability. Specialization is recursive only while it adds discriminating value; cap traversal by time, attention, cost, and the smallest sufficient locality.

**First adoption, no framework build:** use the existing [#121 portable resume](https://github.com/JeanHuguesRobert/inseme/blob/main/docs/issue121-portable-handler-resume.md) to compare two *actual* handler instances. Record which of the traits above are verified, partial, unsupported or unknown; apply one task-specific adjustment, then observe the outcome in ordinary work. Only formalize a shared machine-readable registry if repeated real divergence warrants it.

## Small agent-facing contract (portable by copy or link)

1. **Freshness:** fetch current canonical state and relevant scoped instructions before acting; distinguish observations from cached assumptions.
2. **Mandate and Exposure:** identify authorization, hard boundaries and resource budget; do not mistake capability/tool availability for permission.
3. **Resume:** identify Packet/issue, objective, inputs, baseline revision, what was already done and what remains; do not depend on hidden chat memory.
4. **One useful step:** choose the smallest useful action; avoid paralysis by analysis, duplicate work and unjustified extra infrastructure.
5. **Concurrency:** compare baseline/current; on conflict refresh and reconcile; no force overwrite. Packet claim/fencing must be enforced at actual effect boundary if claimed.
6. **Evidence:** distinguish planned, attempted, provider-committed, independently verified; keep a clickable durable receipt.
7. **Recovery:** if blocked or wrong, report, preserve work and trace, rectify/compensate when authorized; never silently erase history.
8. **Peripheral attention:** notice potentially valuable unexpected outcomes but do not convert every surprise into a new task.
9. **Return:** short verdict, exact changed artifacts, tests, residual risk, next minimal action.

### F4.4-specific safety warning

For a GitHub Contents update, a correct blob SHA is **not** proof of authority. In synthetic F4.4, A with stale Packet epoch wrote successfully using current SHA. Reference: https://github.com/JeanHuguesRobert/inseme/issues/121#issuecomment-6077259774 .

Where no server-side authority gate is proven, label operation as `version-guarded, authority-not-provider-enforced`. Treat an in-process preflight as advisory rather than an atomic cross-resource fence. Do not export a universal `safe_to_write` claim based only on CAS.

## Adapter contract (minimal)

An adapter should expose:
- `identify`: provider, runtime instance, role, protocol, provenance;
- `capabilities`: read/write/effect scopes, limits and **verification status**;
- `receive`: canonical Packet reference and bounded instruction projection;
- `act`: only authorized tool invocations within supported scope;
- `report`: normalized outcome, changed resources, citations/receipts, costs/unknowns and continuation.

The adapter cannot widen a mandate, impersonate another holder, forge durability or claim an untested guarantee. Unsupported features must yield an explicit capability gap and resumable continuation rather than a fake success.

## Immediate adoption for Inseme #121

Use the existing `AGENTS.md` and the issue's resume contract as the normative delivery surface, with a short pointer to this document. The next handler should first look up the F4.5 receipt, inspect existing code, and classify enforcement boundaries before creating a replacement mechanism.

Conformance pilot: give the same #121 resume brief to two different handler families; compare **what they actually can read, change, verify and report**, not their prose agreement. No dedicated A/B study or broad agent adapter rewrite is required.
