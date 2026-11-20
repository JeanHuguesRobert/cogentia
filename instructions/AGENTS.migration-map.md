---
title: "AGENTS.shared v58 to v59 migration map"
author: unknown
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: '2026-11-20'
last_modified_at: '2026-11-20'
status: "working-paper — active operational documentation"
document_role: operational
document_kind: agent-instructions
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
license: CC BY-SA 4.0
language: en
review:
  status: unreviewed
  reviewed_by: []
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.migration-map.md
generated_by: "ChatGPT GPT-6 (user-directed corpus refactoring)"
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "10811ad610306a75fe7c748126baddd0d2280688"
  origin_date: '2026-11-20'
  derived_from:
    - instructions/AGENTS.shared.md
---

# AGENTS.shared migration map

This file is a **non-loaded preservation index**. The original 1,874-line version 58 remains available in [Git history](https://github.com/JeanHuguesRobert/cogentia/blob/10811ad610306a75fe7c748126baddd0d2280688/instructions/AGENTS.shared.md). Its 43 top-level sections and every nested subsection were transposed without alteration into scoped modules. Read the current [constitution](AGENTS.shared.md) for universal rules.

| v58 section | New policy location |
| --- | --- |
| 1. Mandate-first security: trust, observability, and response to infractions (Principal decision, 2026-11-18) | [authority](AGENTS.policy-authority.md) |
| 2. Corpus prior-art and navigation before claiming novelty | [epistemics](AGENTS.policy-epistemics.md) |
| 3. Compute capability self-discovery before declaring an execution blocker | [execution](AGENTS.policy-execution.md) |
| 4. Capability, mandate, and effect authority are separate (COP invariant) | [authority](AGENTS.policy-authority.md) |
| 5. Capability granularity — administer machines, do not invent a capability per task (FBF 2026-11-15) | [authority](AGENTS.policy-authority.md) |
| 6. Missing-capability growth versus exceptional recovery (operational modes) | [execution](AGENTS.policy-execution.md) |
| 7. Rational detour under third-party execution blockers (Potentics / Reality Test) | [execution](AGENTS.policy-execution.md) |
| 8. Direct Supabase-authenticated mandate application (FBF, 2026-11-15) | [authority](AGENTS.policy-authority.md) |
| 9. Long-lived Principal consent links (FBF, 2026-11-15) | [authority](AGENTS.policy-authority.md) |
| 10. Principal attention, presumed authority, and continuation (Cogentia #285) | [execution](AGENTS.policy-execution.md) |
| 11. Conversation routing sanity check — prevent accidental cross-thread work | [continuations](AGENTS.policy-continuations.md) |
| 12. Anti-jeu: abstention is not prudence — continuation is the default | [execution](AGENTS.policy-execution.md) |
| 13. Main-first Git operation: optimistic locking, no branch/worktree proliferation | [engineering](AGENTS.policy-engineering.md) |
| 14. No ritual backups, copies, or precautionary isolation | [engineering](AGENTS.policy-engineering.md) |
| 15. Fix Bugs First — agent attention signal, not Principal constraint | [engineering](AGENTS.policy-engineering.md) |
| 16. Mandatory two-channel GitHub Actions discipline (FBF) | [engineering](AGENTS.policy-engineering.md) |
| 17. CI modes for work in progress | [engineering](AGENTS.policy-engineering.md) |
| 18. Clickable references invariant | [engineering](AGENTS.policy-engineering.md) |
| 19. Source Before Projection — mandatory derivation gate | [engineering](AGENTS.policy-engineering.md) |
| 20. Capability autodiscovery — recall before declaring inability | [execution](AGENTS.policy-execution.md) |
| 21. Pair programming — observable execution, shared review | [execution](AGENTS.policy-execution.md) |
| 22. Cognitive Packets, Continuations, and Handlers (read early) | [continuations](AGENTS.policy-continuations.md) |
| 23. Optimistic Execution by Contract — bounded autonomy | [authority](AGENTS.policy-authority.md) |
| 24. Invariants | [epistemics](AGENTS.policy-epistemics.md) |
| 25. Email draft supersession — one active candidate per thread | [engineering](AGENTS.policy-engineering.md) |
| 26. Bounded initiative and verified handoffs | [effects](AGENTS.policy-effects.md) |
| 27. Tools, Skills, Patterns, and Anti-patterns | [epistemics](AGENTS.policy-epistemics.md) |
| 28. Living evidence / state-of-the-art invariant | [epistemics](AGENTS.policy-epistemics.md) |
| 29. Open-Possible / Booster invariant | [epistemics](AGENTS.policy-epistemics.md) |
| 30. Measured Risk invariant | [authority](AGENTS.policy-authority.md) |
| 31. Monotonic mandate attenuation | [authority](AGENTS.policy-authority.md) |
| 32. Language and audience selection | [epistemics](AGENTS.policy-epistemics.md) |
| 33. README topology and maintenance | [engineering](AGENTS.policy-engineering.md) |
| 34. Stabilisation | [engineering](AGENTS.policy-engineering.md) |
| 35. Delivery policy — Optimistic Locking | [engineering](AGENTS.policy-engineering.md) |
| 36. Operational agility, conflicts, and incidents | [engineering](AGENTS.policy-engineering.md) |
| 37. Stigmergic correction | [engineering](AGENTS.policy-engineering.md) |
| 38. Read order | [engineering](AGENTS.policy-engineering.md) |
| 39. Local specialization contract | [engineering](AGENTS.policy-engineering.md) |
| 40. Capability is not authority — orthogonality of technical power and COP rights (2026-11-10) | [authority](AGENTS.policy-authority.md) |
| 41. ⛔ INTERDICTION ABSOLUE D'ENVOYER DES COURRIELS SANS VALIDATION EXPRESSE | [authority](AGENTS.policy-authority.md) |
| 42. Minimum sufficient human contribution — prepared last-mile handoff (2026-11-01) | [continuations](AGENTS.policy-continuations.md) |
| 43. Operator expertise and attention budget — Agent John / digital twin (2026-10-26) | [continuations](AGENTS.policy-continuations.md) |

## Migration invariants

- Exactly one category for each former top-level section; nested body text preserved verbatim.
- Historical observations remain attached to their dates and do not imply current capability or permission.
- Referencing documents and runtime route pointers are adjusted to the new policy location.
- Regression scenarios: no unauthorized email; continued execution within a standing mandate; private/public separation; capability versus authority; version-guarded updates; evidence-grounded claims; non-defensive communication; respect for first-hand testimony.
- Do not duplicate the whole historical file: Git already holds its prior content.
