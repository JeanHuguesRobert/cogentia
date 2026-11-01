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
