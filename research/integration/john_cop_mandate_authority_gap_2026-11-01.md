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

## 2026-11-01 JHN Supabase authoritative-store discovery (read-only)

Connected Supabase project **JHN** (`ndiysuhzmztatpxbkezn`) is active. Read-only information-schema and aggregate count queries found tables `public.cop_event_log`, `public.cop_mandates`, `public.cop_accounting_budget`, `public.cop_accounting_epoch`, `public.cop_accounting_epoch_reservation` and `public.cop_accounting_epoch_authority_audit`. Current totals: 555 event log rows, **zero** `cop_mandates`, **zero** `cop_accounting_budget`, one accounting epoch and one epoch reservation. Query of `cop_event_log.event_type` for values containing `mandate` or `budget` returned no groups. These queries did not read the private payloads or mandates of any user.

Thus this project has durable COP tables and event activity, but **no observed actionable mandate grants or generic execution-budget allocations**. The epoch accounting reservation is not proof of a delegated John execution budget. The production MCP attachment to this Supabase project remains unverified; no production store endpoint is declared directly in the inspected MCP systemd environment. Do **not** create provisional mandates or infer grants from account ownership. Next: reconcile the source of existing JHN mandate declarations and runtime authority with this persistent project, inspect any other authoritative COP store and adapters, then define an approved migration/attachment path. Keep the live MCP ingress unchanged until valid authority and budget data have been established, tested and reconciled.

### Crucial correction to prior positive probe interpretation

The successful production `check-navigation-john-production.js` selected `jhn-experimental-non-commitment-v1` from `scripts/lib/agent-jhn-whatsapp/constants.js`; `cogentia-mcp-auth.js` also has a fallback mandate *label* (`mandate:jhn:mcp_default`). These strings identify claimed/requested mandates but are **not** sufficient evidence of a stored valid MandateDeclaration, delegation chain or budget reservation. No declaration for that identifier was established in the inspected JHN Supabase project. The positive probe proved authenticated MCP transport + actual tool call + internally consistent receipts, **not** full authority verification against the canonical COP evaluator. This precise limitation must remain in issue and test reporting until #299 is implemented and independently verified.

## 2026-11-01 provenance reconciliation

[Cogentia #75](https://github.com/JeanHuguesRobert/cogentia/issues/75), committed in `545b963` on 2026-07-29, introduced `jhn-experimental-non-commitment-v1` for **narrow WhatsApp self-chat** without general browser/shell, third-party engagement, publication or representation. The coding-agent authorization to build the WhatsApp adapter is distinct from its operational usage grant. Its name in `agent-jhn-whatsapp/constants.js` is not a signed, durable COP mandate.

The WhatsApp `usage_grant` `jhn-whatsapp-self-chat-experimental-v1` restricts account/channel use and has `transferable:false`; `usage-grant.js` rejects transferable grants. It must not be treated as the parent of a general-purpose John sub-agent. [Cogentia #291](https://github.com/JeanHuguesRobert/cogentia/issues/291) later authorizes distinct navigation integration work and bounded reality tests, but its issue content alone does not constitute an all-purpose standing COP authority grant. The successful MCP inventory probe using the #75 label proved authentication and actual execution, not this substantive mandate linkage.

Read-only JHN Supabase count checks additionally found `cop_event` 0, `cop_events` 0, `cop_accounting_event` 1719, `cop_agents` 0, and `cop_accounting_epoch_authority_audit` 1. The accounting audit record is not a general parent mandate. No persistent mandate or budget was issued during investigation.

**Next canonical step:** build a **proposed/unissued** mapping from #75 and #291 to separately defined purposes and capabilities, with issuer, principal, valid parent, actors, scope, inherited prohibitions, risk, expiry/revocation, and actual available budget explicitly resolved. Do not mint a principal grant from historic issue text or a token. Reuse Inseme event-sourced grants and reserves after provenance confirmation; negative tests must show revoked/missing parents and unfunded children are denied.

### 2026-11-01 upstream Inseme authority defect and fix

A local deterministic reality test exposed a fail-open condition in canonical `evaluateMandate()`: a caller-provided child `mandate` carrying a nonempty `parent_mandate_ref` previously returned `granted:true` when the parent could not be resolved. A supplied different `parent_mandate` also bypassed the expected parent identity comparison. Fixed **at source**, not in the browser: Inseme commit [`e3a12d9`](https://github.com/JeanHuguesRobert/inseme/commit/e3a12d9) now refuses `parent_mandate_not_found` and `parent_mandate_mismatch`, with two regression tests. Full `packages/cop-core` suite: 20 files, 156/156 passing.

**Remaining trust boundary:** A directly supplied parent object, even when its ID matches, is not independently authenticated by this low-level evaluator; mandate issuers, source provenance, active ancestor status and budget reservations must still be verified by the authoritative store/adapter before allowing John to execute private capabilities. This fix does not create a root grant, make the #75 WhatsApp usage grant transferable, or prove a funded navigation mandate exists.

## 2026-11-10 FBF update — existing SQLite authority, and Unix execution custody

**Correction to the 2026-11-01 discovery snapshot:** the absence of generic mandate and budget rows in the JHN Supabase tables does **not** mean no canonical COP authority exists. The separately maintained `/var/lib/cogentia/cop/john-root-v1.sqlite` was issued on Fracta2 on 2026-11-06, with independently verified SSHSIG provenance and canonical reservation/settlement recorded for limited browser reads. See `research/integration/john_root_sshsig_procedure_2026-11-06.md`, `scripts/lib/john-cop-read-execution.js`, `scripts/ops/activate-john-root-read.sh` and the independent evidence linked in cogentia#299. Other distinct, scoped declarations (form assistance and privileged read probes) have also been reported in that same store; their mere presence grants no Unix development authority. The direct inspection performed in this update was **source and public receipt inspection**, not a new dump of that protected live SQLite store.

**Live private-connector observations:** `cogentia_host_fs_read` and `cogentia_host_fs_list` now work against the bounded checkout `/srv/cogentia/repos/cogentia` using Desktop Commander 0.2.50; `/etc` remains rejected as `path_outside_root`. Both normal and super `cogentia_host_process_prepare` work (no execution). A real `host.process.run` attempt using `/usr/bin/id -un`, mode normal, with a claimed but unverified development mandate and no effect grant was rejected as `authorization_missing` before execution. This is a confirmed runtime boundary, not an absence of source capability.

**Critical trust boundary before enabling a general-purpose shell:** `scripts/lib/unix-process-provider.js` currently executes `setsid /bin/sh -c <command>` using the MCP service's Unix identity, and `COGENTIA_HOST_FS_ROOT` bounds `host.fs.*` only: it does **not** confine a shell. The documented canonical SQLite store is owned by `ubuntu`, mode 0600, while the MCP service also runs as `ubuntu`. If a delegated agent receives unrestricted `host.process.run` with this same UID, its process can potentially alter the mandate database it should be governed by, and access other account-readable data. A nominal capability scope or payload hash alone does not establish an OS integrity boundary. **Do not enable unrestricted production development shell on this shared UID as if COP alone isolated it.**

**Smallest justified next increment:** reuse the existing canonical Inseme evaluator, issuer lineage and optimistic reservation/settlement, but place effect execution under a distinct least-privileged OS identity or effective process sandbox with no write access to the canonical authority store, issuer material or privileged broker. Admit only an independently authorized, bounded development mandate with explicit actor, target, allowed operations, lifetime, budget and revocation. Preserve the existing owner SSH/sudo administrative path separately; do not resurrect the abandoned 48h/12-restart broker scheme. Once the separation and authority exist, perform an ordinary real project operation and inspect its effect receipt; no artificial simulation campaign is required. Existing read capability remains operational in the interim.

## 2026-11-10 FBF code increment — deny the unisolated built-in Unix executor

The concrete shared-UID COP database defect is now guarded in source, without touching the deployed MCP process or the canonical database:

- `scripts/lib/unix-process-cop-custody.js` checks the native executor UID against the canonical SQLite store owner, parent-directory owner and actual file/directory write permissions. Root execution is not accepted as the ordinary executor. A configured but inaccessible store fails closed; absence of the default path elsewhere is explicitly inconclusive rather than claimed safe.
- `scripts/lib/host-capability-router.js` rejects the built-in normal `unix-process` effecter **before dispatch**, even if a nominal effect grant has passed its existing checks, when that UID can rewrite the COP store. Trusted injected provider implementations retain their separate custody obligations. This is a mitigation for the existing vulnerability, not a substitute for independently verified mandates, budget reservations or full process isolation.
- `scripts/lib/host-process-prepare.js` now exposes the **read-only custody observation** as `executor_custody` alongside the existing EXPOSE/hash-bound payload, so the connected Cogentia Private tool can report the blocker without a privileged shell. This observation is not an authorization.
- `scripts/lib/unix-process-cop-custody.test.js` and the existing COP integration regression cover the shared-account denial and preservation of granted execution where the known store cannot be rewritten.

Published commits: `2ed368e`, `0d7061c`, `bacd88a`, `ae53af8`, `5982b5e`. A standalone local Node 22 reproduction of the custody logic passed six focused cases; **the complete repository suite, actual Fracta2 service restart and connected-tool recheck have not yet been performed**. This code is not a new independent authorization system.

Next operational boundary: an owner-installed, distinct unprivileged execution identity / confinement with no write access to the COP store or other sensitive resources, plus an existing Inseme-issued, versioned, revocable development mandate and budget. Until those are verified, do not claim end-to-end autonomous `host.process.run` is active. No change to the owner's SSH/sudo rights.
