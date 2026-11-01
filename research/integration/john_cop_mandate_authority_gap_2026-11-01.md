---
title: John MCP to COP mandate authority — integration audit
date: 2026-11-01
status: working
document_role: operational
document_kind: audit
language: en
visibility: public
---

# John MCP → COP authority: reuse existing controls

**Normative authority:** `instructions/AGENTS.shared.md#monotonic-mandate-attenuation`, `research/monotonic_mandate_attenuation.md`, `research/intent.md`, Inseme COP contracts. Authority(child) is a subset of Authority(parent); child obligations cannot be weakened. Browser leases and transport tokens coordinate execution but do not grant authority.

## Verified code map

- **Mandate evaluator:** `inseme/packages/cop-core/src/governed-act.js` exports `evaluateMandate(store, options)` (existence, status/revocation, validity, principal/actor, capability, budget ceilings and partial parent attenuation), and `invokeGovernedCapability()` for governed effects. Requires authoritative durable store.
- **Budget:** `inseme/packages/cop-core/src/delegated-budget.js` exports `reserveEventSourcedDelegatedBudget()`; reserves on the parent with CAS and idempotency before issuing the child budget grant. `execution-budget.js` contains the event-sourced ledger.
- **Delegated execution:** `inseme/packages/cop-core/src/distributed-packet-handler.js` exports `executeDelegatedPacket()`, integrating the above as a reference pilot, requiring a declared child mandate.
- **Packet lineage:** `inseme/packages/cop-kernel/src/accounting/packetAccounting.js` and `cogentia/scripts/lib/cop-surface-accounting.js` project packets/spend. A budget reservation ID field does **not** itself reserve funds.
- **Attenuation comparator:** `cogentia/scripts/lib/mandate-attenuation.js`, available via `cogentia_mandate_attenuation_check`. `WARN` is not an authorization and comparator output alone is not a grant.
- **Current ingress:** `cogentia/scripts/lib/cogentia-mcp-core.js` filters `allowed_capabilities` using authenticated JHN identity, surface and effect budgets, then calls `runJohnRequest()`; no actual call to the Inseme evaluator or delegated reservation found on this path. `john-run.js` emits receipts from request mandate/budget IDs without resolving the underlying authority. `schemas/john.request.v1.schema.json` has runtime drift (`capability_once` missing).

## Integration boundary

Do not invent another browser authorization policy. Resolve valid parent and child grants, validate inherited constraints and revocation/freshness, reserve the child's full hard-budget vector against available parent balance before dispatch, and invoke the existing governed act with its grant and budget. Return typed refusal or verified receipt referencing grant, parent/child packets, reservation and settlement. Fail closed on missing store, missing grant or incomparable required dimensions. Read-only public orientation continues only under its own public authority.

## Minimal vertical test: browser.navigation.instances

1. Valid authoritative parent and attenuated child: one inventory call, receipt, reservation, settlement and Ithaca, without reading tabs.
2. Child grants more authority than parent: deny before gateway execution.
3. Revoked/expired/stale parent, wrong actor or missing authoritative store: deny.
4. Two concurrent children exceed aggregate available parent budget: only the funded child may proceed; retry idempotency must not double-reserve.
5. Missing required mandate constraint: do not treat `WARN` or missing scope as authority.
6. Preserve actual COP evidence chain and existing platform constraints. Never give the child the MCP credential merely to execute its work.

**Scope:** The Inseme distributed packet handler is a pilot, not proof that the production John MCP ingress already uses it. First establish authoritative store connectivity and contract compatibility; verify with fixtures and actual runtime receipts before changing live policy.

## 2026-11-01 production attachment check (Fracta2)

- `mcp-cogentia.service` is running, but its *declared* environment exposes `COGENTIA_COP_ACCOUNTING_PERSIST`, `COGENTIA_COP_SPEND_SPOOL`, and `COGENTIA_SUPER_COP_ENABLED`, **not an identified authoritative mandate/event-store endpoint**. Some EnvironmentFiles are protected and were not read. This establishes a *missing verified attachment*, not proof that no remote COP store exists.
- `/var/lib/cogentia/accounting/spend.ndjson` exists and is populated. Its role is accounting/spend trace, **not proof of mandate, revocation or atomically reserved available parent balance**.
- No local COP SQLite event DB was discovered by bounded filename inspection under `/var/lib/cogentia` and `/srv/cogentia`. This check cannot rule out a differently named database or remote store.
- From the current Inseme checkout on Fracta2, all four imports execute: `evaluateMandate`, `reserveEventSourcedDelegatedBudget`, `createSqliteCopEventStore`, `executeDelegatedPacket` (Node 22 SQLite experimental warning only). Available runtime modules are not evidence of a wired service.
- Inseme `docs/cop-persistence-source-vs-projection.md` explicitly distinguishes the authoritative append-only `Event` source from spool, projection and cache; `packages/cop-core/COP_STORE_AND_PERSISTENCE.md` advises against multiplying persistence entities. Supabase COP event-log SQL and the SQLite COP event-store adapter are available candidates, **not yet a verified John production attachment**.

**Next acceptance dependency:** identify the existing authoritative event-store instance, authority-grant source, connection/ownership and CAS semantics, then test real mandate lookup and budget reservation in read-only discovery mode **before** enabling an ingress guard. If a private store has to be attached, use the existing service configuration mechanism; do not infer authority from transport credentials, fabricated local MandateDeclarations or the spend spool. No production policy change made by this audit.
