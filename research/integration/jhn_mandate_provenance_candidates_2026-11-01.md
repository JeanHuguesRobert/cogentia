---
title: JHN mandate provenance mapping — candidates only
status: proposed-unissued
date: 2026-11-01
document_role: operational
document_kind: audit
language: en
visibility: public
related_issue: https://github.com/JeanHuguesRobert/cogentia/issues/299
---

# JHN mandate mapping: evidence, not new authority

**Not** a MandateDeclaration, MandateGranted event, execution budget grant or principal-issued instruction. Do not import into an authoritative COP store as an active grant. Transport credentials, GitHub issues and configuration constants do not mint root mandates.

| Source trace | Known scope | Proposed interpretation | Missing proof |
| --- | --- | --- | --- |
| [Cogentia #75](https://github.com/JeanHuguesRobert/cogentia/issues/75), commit `545b963` | Experimental, non-representational WhatsApp self-chat, originally without general browser/shell or third-party send | `jhn-experimental-non-commitment-v1` is a *historical channel-specific reference*; `jhn-whatsapp-self-chat-experimental-v1` is a **non-transferable account usage grant** | No signed durable parent grant or funded, general navigation authority proven |
| [Cogentia #291](https://github.com/JeanHuguesRobert/cogentia/issues/291) | Separate Navigation Assistant integration and bounded browser tests | Navigation work *mandate candidate*, not inherited from the #75 WhatsApp usage grant | Issuer, scope/version/expiry, child delegation and parent budget not resolved into canonical authority |
| [Cogentia #299](https://github.com/JeanHuguesRobert/cogentia/issues/299) | Inspect and connect COP authority controls, repair generic fail-open defects | **Implementation mandate for current work**, not general browser-operational authority | Does not itself authorize minting any standing principal-issued grant |

## Candidate fields, deliberately unresolved

Each proposed mapping requires source references, issuer evidence, principal and agent identities, mandate and parent identifiers, scope of capabilities/resources/audiences, inherited prohibitions/obligations, validity/revocation, risk and delegation depth, evidence level, and actual *reserved* budget. Unknown fields are **unresolved**, not a wildcard grant, inferred issuer approval or arbitrary ceiling.

## Evidence limits and independent grants

The one-shot MCP inventory probe proved authenticated transport, an actual read-only tool call and COP receipts, **not** resolution of a funded parent mandate. Inseme `evaluateMandate()` now rejects missing/mismatched parent identity ([e3a12d9](https://github.com/JeanHuguesRobert/inseme/commit/e3a12d9)), and `ExecutionBudgetGrant` no longer mints mandate authority ([4cfa355](https://github.com/JeanHuguesRobert/inseme/commit/4cfa355)).

The next implementation must fetch a **real principal-issued grant** from the existing authoritative store, check lineage and reserve available budget. Historical issues provide provenance and human intent, not an automatic durable runtime mandate. Until positive and negative contract tests pass, do not switch production authorisation or create grants in the principal's name.
