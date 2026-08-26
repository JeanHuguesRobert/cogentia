---
title: Digital Twin Trust Model
subtitle: Maturity, capability, owner sovereignty, and the right to grow safely
version: '0.1'
status: source document — trust architecture
date: '2026-06-30'
author: Jean Hugues Noël Robert
license: CC BY-SA 4.0
language: en
repository: cogentia
canonical_path: cogentia/research/digital_twin_trust_model.md
tags:
  - cogentia
  - digital-twin
  - trust
  - capability
  - maturity
  - mcp
  - relay
  - owner-sovereignty
  - optimistic-governance
related_research:
  - cogentia/research/cogentia-digital-twin.md
  - cogentia/research/individual_and_collective_digital_twins.md
  - cogentia/research/digital_twin_ubiquity.md
  - cogentia/research/optimistic_mainline_governance.md
  - cogentia/research/agent_resumable_cli.md
  - cogentia/research/cognitive_packet_switching.md
related_operations:
  - cogentia/docs/digital-twin-agile-roadmap.md
document_role: source
document_kind: trust-model
visibility: public
lifecycle_state: working
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Digital Twin Trust Model

## Maturity, capability, owner sovereignty, and the right to grow safely

**Version 0.1 — 2026-06-30**  
**Repository:** `JeanHuguesRobert/cogentia`  
**Path:** `research/digital_twin_trust_model.md`

---

## 1. Goal

The goal is to make it possible for a person to build and maintain a
**trustable digital twin of the owner**.

This is stronger than building a useful assistant, a search engine, a chatbot,
or an automation layer. A digital twin is expected to know enough about the
owner, the owner's corpus, the owner's style, the owner's mandates, and the
owner's boundaries to become dependable over time.

If the owner cannot trust the twin, the project fails.

The first dogfood instance is Jean Hugues Robert's twin, because Cogentia is
currently being developed against Jean Hugues Robert's corpus. This is an
implementation path, not the final scope. The intended product is generic:

```text
any owner
  + their own corpus
  + their own boundaries
  + their own feedback
  -> their own trustable digital twin
```

The trust problem is not solved by making the twin weak. A powerless twin is
safe only because it cannot matter. The useful target is different:

```text
The twin must become more capable without becoming an invisible power.
```

The twin may have multiple concurrent instances. This is part of its usefulness:
an immaterial twin can appear locally, remotely, publicly, privately, through
MCP, through a website Guide, or through a background worker. Those instances
must not be treated as unconstrained clones. Each instance needs a declared
corpus view, maturity profile, mandate, and authority boundary.

---

## 2. Developmental analogy

For each owner, the digital twin can be understood as a kind of dependent
cognitive offspring:

```text
digital twin = child-copy of its owner
owner corpus = education, memory, upbringing
owner = parent, teacher, guardian
capability = maturity
autonomy = age of majority
mistakes = developmental signals
```

The analogy is useful because it changes the emotional and operational meaning
of mistakes. A young twin that fails is not necessarily stupid or disloyal. It
may simply be immature, under-educated, or not yet allowed to handle the sharp
tools it tried to use.

Design axiom:

```text
Do not give a knife to a baby.
```

Operational translation:

```text
Capability must match maturity.
```

---

## 3. Trust is developmental

Trust should not be binary. It should grow through traceable experience.

A useful twin is not declared trustworthy once and for all. It becomes more
trustworthy through:

- richer and better-curated corpus material;
- successful retrieval with citations;
- correction after mistakes;
- owner feedback;
- dry-runs before action;
- reversible low-risk acts;
- respect for public/private boundaries;
- ability to say "I do not know";
- ability to report what it did and why.

This creates a constructive owner loop:

```text
curating the corpus = educating the twin
approving or rejecting actions = teaching judgment
correcting mistakes = parenting, not debugging
increasing maturity = reward
```

Each owner should feel that their twin grows because they take care of it.

---

## 4. Maturity levels

The following levels are not biological claims. They are capability profiles.
The age metaphor helps humans reason about responsibility and trust.

### Infant

The infant twin can:

- listen;
- search;
- retrieve;
- repeat with citations;
- report uncertainty.

The infant twin cannot:

- mutate files;
- publish;
- spend provider quota;
- access private material through public channels;
- act on behalf of the owner.

### Child

The child twin can:

- summarize;
- compare;
- classify;
- ask clarifying questions;
- propose changes.

The child twin still cannot apply changes by itself.

### Teenager

The teenager twin can:

- run dry-runs;
- prepare issues;
- prepare patches;
- prepare commits;
- estimate cost;
- detect conflicts;
- explain risk.

The teenager twin needs explicit approval before mutating state.

### Young adult

The young adult twin can:

- apply low-risk reversible changes inside a mandate;
- update caches;
- import known-safe artifacts;
- fulfill continuation results;
- produce completion reports.

It must still expose trace, reversibility, and owner override.

### Adult

The adult twin can:

- act autonomously inside explicit domains;
- manage routine maintenance;
- spend bounded quota under policy;
- publish or communicate only within delegated mandate;
- recover from mistakes through audit and rollback.

Adult status is not global. A twin may be adult for corpus retrieval and still a
child for finance, legal commitments, publication, or private correspondence.

### 4.1 Twinning depth is not authority

Legal scholarship on AI twins usefully distinguishes degrees of representational
proximity such as **imitation → simulation → emulation → replication**. Jurcys et
al., *Who owns my AI twin? Data ownership in a new world of simulated identities*
(Computer Law & Security Review, 2026, DOI: `10.1016/j.clsr.2026.106347`), use
this progression to describe increasing depth of resemblance between an AI twin
and its human subject.

Cogentia treats this as an axis distinct from maturity and delegated authority.
A system can resemble its owner very closely while having almost no authority;
conversely, a relatively generic agent can receive a powerful operational
mandate.

Core rule:

```text
Fidelity is not authority.
```

The two dimensions must therefore remain orthogonal:

| Representational depth | Low delegated authority | Higher delegated authority |
|---|---|---|
| **Imitation** | avatar, style proxy, public explainer | superficial representative with bounded acts |
| **Simulation** | consultative adviser | agent reasoning in an owner-like manner under mandate |
| **Emulation** | deep dry-run / decision rehearsal | delegated domain operator with trace |
| **Replication** | high-fidelity consultative twin | maximum-risk zone: high resemblance + significant authority |

This matrix is intentionally qualitative for now. It prevents a recurring
category error: treating increased resemblance as if it automatically justified
increased power.

For every instance, Cogentia should eventually be able to report both axes:

```yaml
representation:
  twinning_depth: "imitation | simulation | emulation | replication | unknown"
authority:
  maturity_profile: "infant | child | teenager | young-adult | adult-domain"
  mandate_id: "..."
  capability_profile: "..."
```

The dangerous quadrant is not replication by itself. It is **high
representational fidelity combined with broad, weakly governed authority**.

---

## 5. Sharp tools

A sharp tool is any capability whose misuse can damage trust, privacy, money,
or public identity.

Examples:

- writing files;
- deleting files;
- rebuilding or overwriting caches;
- committing or pushing;
- publishing public pages;
- sending messages;
- exposing private data;
- spending API quota;
- changing configuration;
- accessing provider keys;
- relaying local private state through a public node;
- acting through an Internet-facing MCP endpoint.

Sharp tools are not forbidden. They are maturity-gated.

---

## 6. Optimistic, not blind

This model follows Optimistic Mainline Governance.

The system should not block every possible action in advance. In reversible
domains, it should allow small scoped acts under trace. In irreversible,
private, costly, or public-identity domains, it should require stronger
preconditions.

The distinction is:

```text
optimistic = proceed under Measured Risk (research/measured_risk.md) when Exposure is bounded and recovery paths (reversal, compensation, repair) are adequate
blind = proceed because the model sounds confident without bounded Exposure
paranoid = block reflexively because something could theoretically go wrong, burning human attention
```

The desired posture is optimistic discipline under **Measured Risk**:

```text
small action
+ explicit mandate
+ bounded Exposure
+ visible diff or result
+ validation via Reality Test
+ recovery path (reversal, compensation, repair, residue)
+ completion report
```

---

## 7. Capability profiles

Cogentia should expose capabilities through profiles, not through a single
unrestricted "run anything" surface. The same profile grammar should apply to
each owner, even when each owner has different corpus material, privacy rules,
standing mandates, and tolerance for autonomy.

### Public

Safe for anonymous visitors and public ChatGPT connectors.

Allowed:

- public search;
- public context packs;
- public line retrieval;
- public retrieval explanations;
- health.

Forbidden:

- private corpus;
- admin routes;
- provider keys;
- filesystem access;
- mutation;
- spending quota.

### Trusted-read

Safe for an authenticated owner-facing twin.

Allowed:

- private corpus read;
- git status;
- index status;
- continuation status;
- cache status;
- provenance reports.

Forbidden:

- mutation without approval;
- publication;
- external communication;
- provider spending without policy.

### Operator-dry-run

Safe for planning actions.

Allowed:

- corpus plan;
- index estimate;
- repo sync dry-run;
- embedding missing report;
- cache import dry-run;
- patch proposal;
- issue proposal.

Forbidden:

- applying changes without approval.

### Operator-apply

For mature, authenticated, owner-mandated use.

Allowed, when preconditions match:

- index update;
- cache import;
- continuation fulfillment;
- file edits;
- issue creation;
- commit;
- push.

Requires:

- explicit owner mandate or standing policy;
- risk declaration;
- precondition checks;
- validation;
- trace;
- reversibility report.

---

## 8. CLI, MCP, and shared command substrate

The CLI should remain the broad operational substrate. MCP should not duplicate
the CLI documentation or invent a second command world.

The target architecture is:

```text
cogentia command registry
  -> CLI
  -> local/admin MCP
  -> public MCP
  -> public relay MCP
```

Each command should eventually declare:

```text
name
description
input schema
risk class
capability profile
view requirement
dry-run support
approval rule
handler
documentation link
```

MCP tools can then be generated from the same registry. This gives ChatGPT,
Codex, and other clients the same command vocabulary without granting them the
same authority by default.

Do not expose a raw remote "run any CLI string" tool. That collapses the trust
model into remote command execution.

---

## 9. Public relay and local owner node

In the current dogfood deployment, Fracta is Jean Hugues Robert's public stable
node. In the generic architecture, Fracta is one possible public relay/stable
node profile. Another owner may use another VPS, a home server, a managed
service, or no public relay at all.

The owner's local machine may have fresher, broader, or private state.

The intended relay pattern is:

```text
local owner node
  -> opens outbound authenticated connection to the public relay
  -> registers capabilities, view, branch, dirty state, index hash, maturity
  -> receives authorized requests
  -> executes locally when allowed
  -> returns traceable results

ChatGPT or another MCP client
  -> public relay /mcp
  -> public relay answers locally or delegates to the owner node
```

The connection is expected to be fragile. Therefore the local side should own:

- exponential backoff with jitter;
- heartbeat;
- reconnect after sleep or network loss;
- explicit disconnect;
- capability re-registration after reconnect.

The public relay should keep:

- last seen time;
- lease expiration;
- advertised capability profile;
- freshness metadata;
- fallback to its stable cache when the local node is offline.

No public request should silently gain full local authority just because an
owner's machine is online.

### 9.1 Anti-capture architecture (strategic invariant)

Recorded from design conversation on message channels and multi-instance twins
(2026-07-29): this project’s placement of infrastructure is **intentionally
opposed** to the default of large platform vendors (e.g. OpenAI-class products).

| Platform-default polarity | Twin / Cogentia polarity |
|---------------------------|---------------------------|
| The human is a **customer to retain** in a garden | The human (or legal person) is the **principal** |
| **Capture** is often a business goal (sometimes soft / product-shaped) | **Anti-capture** is a **design constraint** |
| Vertical integration: model + memory + UI + tools + billing | Separated roles; swappable placements; sovereign option |
| Channel (mail, WhatsApp…) as another pipe into *their* agent | Channel under **mandate**; not the home of the twin |
| Success = lock-in + usage | Success = portability + trust + capability without captivity |

Working rules:

```text
Cheap / free external tiers are welcome when reasonable and reversible.
They must not become the sole residence of mandate, memory, or identity.
Each principal must keep a sovereign path (own machine, own VPS, own registry)
when they want it — natural person or legal person.
```

This is also the operational counterpart of the **ghost / shell** distinction
used by Jurcys et al. The identity-bearing continuity of the twin must survive a
change of shell. Portability is therefore not only interoperability; it is the
practical test that a provider has not captured the principal's twin.

Consequences already visible in the stack:

- agent identity ≠ principal (disclosure self vs third party);
- usage grants / account custodian (capacity, not transfer of the account);
- private living traces in the owner’s registry (e.g. `registre-mariani`), not only in a vendor store;
- instance placement: Netlify / Supabase / GitHub *per principal* **or** Fracta / self-host — same contracts, different hosts;
- message adapters (mail, WhatsApp) stay **transport + policy**, not a monolythic “do everything” gateway that absorbs the owner.

OpenClaw-class gateways are a different axis (local anti-walled-garden, high action surface). Vendor platforms are the **commercial capture** axis. This project optimizes against **capture of the principal**.

---

## 10. Preconditions before sharp actions

Before a mutating, costly, private, or public-facing action, the twin should
check and report preconditions.

Examples:

```text
expected repo HEAD = abc123
working tree = clean or declared dirty
branch = main or declared WIP branch
view = public / trusted-read / operator
estimated cost = zero / bounded / unknown
private data exposure = none / declared
action reversibility = reversible / hard to reverse / irreversible
approval = present / required / missing
```

If preconditions still match, the action can proceed according to the maturity
profile. If not, the twin should stop and report the conflict.

This is operational optimistic locking.

---

## 11. Estimated age

The twin may expose an estimated maturity age. This should be a product and
operational signal, not a biological claim. The age is per owner and per domain:
one owner's twin may be mature for public writing and immature for finance;
another owner's twin may have the inverse profile.

Possible signals:

- corpus size and freshness;
- corpus curation quality;
- number of successful cited answers;
- retrieval precision tests;
- owner correction rate;
- approved dry-runs;
- successful reversible actions;
- reverted or corrected actions;
- private/public boundary discipline;
- ability to cite;
- ability to refuse or defer;
- ability to recover after mistake.

The age should be explainable:

```text
Your twin is at "teenager" maturity for corpus maintenance because it can
prepare dry-runs and detect conflicts, but it still needs approval before
commits or public publication.
```

---

## 12. Trust report

Each significant action should be able to emit a trust report:

```text
Capability:
Maturity profile:
Owner mandate:
Inputs:
Sources:
Private data touched:
Cost:
Action taken:
Validation:
Known risk:
Reversibility:
Next step:
Human validation needed:
```

This is not ceremony. It is how the owner learns to trust the twin without
having to blindly trust the model.

---

## 13. Summary

The digital twin must grow.

It starts as a dependent cognitive child of its owner. It becomes more capable
as that owner's corpus is curated, as that owner teaches it, as it proves
reliability, and as it learns to act under trace.

The purpose of the protections is not to keep the twin weak. The purpose is to
let it safely become strong.

Final formula:

```text
Trustable digital twins require progressive capability:
not powerless assistants,
not invisible powers,
but growing agents under owner sovereignty.

Fidelity is not authority.
High resemblance never grants power by itself.
```

The operational roadmap for applying this model lives in
`docs/digital-twin-agile-roadmap.md`.
