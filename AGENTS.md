---
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/AGENTS.md
title: AGENTS.md — Cogentia local specialization
document_role: operational
document_kind: agent-mandate
visibility: public
lifecycle_state: active
shared_instructions: https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md
---

# Cogentia local specialization

Read [`instructions/AGENTS.shared.md`](instructions/AGENTS.shared.md) first. It is the corpus-wide operational layer. This file only adds rules specific to the `JeanHuguesRobert/cogentia` repository.

## Repository role

Cogentia is the cognitive-infrastructure tooling of the multi-repository corpus: registry, navigation, continuations, context retrieval, governed prompts and agent-facing gateways. It implements Layer 4 of DHITL; it does not replace the human democratic layer.

## Local invariants

- Preserve the distinction between source corpus, generated navigation, caches, prompts and application runtime.
- Keep `scripts/cogentia.js` dependency-free unless the human principal explicitly authorizes a dependency change.
- Generated files are projections: change their generator or source, not their generated body by hand.
- Treat `research/agent_configuration_layer.md` as the source doctrine for this instruction architecture.
- Treat `research/monotonic_mandate_attenuation.md` as the source rule for hierarchical specialization: child configuration may restrict authority and strengthen duties, never widen inherited authority.
- Run `node scripts/agent-instructions-audit.js` to inventory instruction artefacts and detect drift between shared and local layers.
- Use `node scripts/cogentia.js agent mandates plan|apply|verify` to create missing minimal mandates and verify their shared reference. `apply` preflights every target directory and does not attempt any creation if one is not writable.
- Multi-file local writes (`agent mandates apply`, `corpus apply`, `classify apply`, `corpus-state export`, and `issues sync`) must preflight every planned target and refuse the entire batch when one target is not writable.

## Operational routing

Operium owns live operational deployment evidence and the service control plane. Do not make `deploy/fracta/` or ad-hoc SSH the sole source of operational truth.

- Use Operium profiles, decisions and `operium up` / `operium invoke tool` for operational deployment work.
- Keep Cogentia responsible for mandate, provenance, instruction governance and corpus navigation.
- See `research/operium_owns_operational_deploy.md` and Operium’s `docs/magistral-coding-agent-routing.md`.

## Local validation

For changes to agent-instruction tooling, run the focused audit against a configured corpus and `git diff --check`. Report any broader suite not run.

For new or changed operational documents, preserve frontmatter provenance and an `update_policy`; do not infer missing fields.

## Local references

- [`research/agent_configuration_layer.md`](research/agent_configuration_layer.md)
- [`research/monotonic_mandate_attenuation.md`](research/monotonic_mandate_attenuation.md)
- [`research/agentic_commit_transparency.md`](research/agentic_commit_transparency.md)
- [`research/optimistic_mainline_governance.md`](research/optimistic_mainline_governance.md)
- [`docs/update-policy-registry.md`](docs/update-policy-registry.md)
