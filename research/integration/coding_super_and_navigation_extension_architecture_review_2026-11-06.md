---
title: "Coding-agent privileged execution and dynamic browser extension architecture retrospective"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-06
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: engineering-note
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-06-post-form-assist-architecture-review"
  origin_date: 2026-11-06
  derived_from:
    - docs/navigation-assistant.md
    - research/integration/frederic_unix_super_pilot_closure_2026-11-05.md
review:
  status: unreviewed
  reviewed_by: []
---

# Coding-agent privileged execution and browser extension architecture review

## 1. Shell execution versus privileged authority

The connected Cogential Unix Shell Exec runs real commands on Fracta2 as `ubuntu` (uid 1001). Its `/proc/self/status` reports `NoNewPrivs: 1`, effective capabilities zero. `sudo -n true` fails explicitly due to `no new privileges`. Therefore this **particular shell transport** cannot elevate through sudo, but ordinary source edits, tests, GitHub updates, and unprivileged operations worked throughout.

A separate root-owned `cogentia-super.service` is running, with a root:ubuntu socket mode 0660. The 2026-11-05 Frederic pilot did use `execution_mode:super` via temporary bootstrap MCP and root broker to create a hosted Unix account, with a one-use bound grant and receipt. Its administrative-SSH issuer path was reachable from bootstrap and did NOT prove an independent human issuer security boundary; general COP approval/budget rules must not be inferred from one pilot. The available Cogentia_Private `host_process_prepare`, `side_effect_grant`, `host_process_run` family is also a possible governed route, not an automatic power to mint Principal authorization. The actual grant and issuer path for each privileged systemd/extension operation still requires an independent reality test.

Failure: the assistant treated the normal shell's sudo denial as sufficient reason to ask the Principal to run each root task, **without first discovering/checking the separate super broker that the Corpus already documented**. That violated the shared instructions to discover alternatives and minimize Principal attention. It is NOT established that all those root tasks would have passed actual authority verification, but checking was required.

In contrast, the Principal-side SSHSIG signature for each new mandate was necessary: the RSA private key remained on tweesic, and the Fracta2-shared mesh private key could not establish independent Principal approval.

Going forward report separately `advertised / reachable / authorized / tested` for normal shell, broker-super and independent personal signing. Prepare the exact command and recovery plan, check real authorization and budget, then execute via broker when demonstrably permitted; ask for Principal-side execution only on a real remaining boundary. Never bypass `NoNewPrivs` or counterfeit human-issued grants.

## 2. The original extension is a stable bridge with dynamic client libraries

Commit [`edaf9f3`](https://github.com/JeanHuguesRobert/cogentia/commit/edaf9f3), September 7, 2026, already implemented extension `page.evaluate` through CDP `Runtime.evaluate`, `page.insertText` through CDP `Input.insertText`, `browser-stdlib/navigation.js` and a separate Facebook adapter. `scripts/ops/navigation-assistant-tui.js` loads the stdlib and Facebook / Corse-Matin adapters dynamically from disk and forwards their JavaScript by RPC `page.evaluate`. `window.__cogentiaNavigationAssistant.adapters` is explicitly extensible while the generic API remains frozen. The [original guide](https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/navigation-assistant.md) documents the client-side script interpreter, and [#291](https://github.com/JeanHuguesRobert/cogentia/issues/291#issuecomment-6474435778) independently confirms this intended separation.

On Nov 6 the first form-assist prototype used the existing bridge in two steps: fixed JavaScript focus through `page.evaluate`, then `page.insertText`. The subsequent version `e853c7f` instead introduced a new extension RPC `page.form.fill` to combine the focus and native CDP insertion in one extension operation. Benefit: tighter grouping and one gateway request. Cost: extension version 1.0.18, privileged sync to a separate hosted checkout and worker reload. The running worker remained 1.0.17, producing a failed first real attempt (2 Inseme steps charged). This deployment coupling is precisely what the original dynamic-library architecture sought to avoid.

**Decision:** favor the thin, stable extension + dynamic client/daemon-owned, versioned capability recipes. The bridge should own transport, tab and document identity, CDP primitives and redacted receipts, not add a method for each site or form action. The MCP/COP gate authorizes **semantic operations and specific recipes**, not arbitrary `page.evaluate` scripts: arbitrary page JavaScript can submit or exfiltrate. A client recipe must not be able to bypass its mandate merely because the bridge can execute code.

### Atomicity and implementation direction

The original two-RPC focus/insert sequence has a race: another client or page script may change focus/navigation between calls. Lease coordination is not a security boundary. Design a **small generic transactional browser action protocol** (candidate `browser.actions.execute`) capable of validating tab, expected URL/origin and document epoch, then applying a bounded whitelist (`focus(fieldRef)`, `insertText(textRef)`, etc.) with one operation ID and redacted receipt. The client/daemon dynamically assembles typed workflows and context adapters; no new extension RPC should be needed for each recipe. A generic interpreter may require **one** protocol change to the extension, but later recipe changes should not. A single `Runtime.evaluate` with `document.execCommand('insertText')` may work in some editors; it is not equivalent to native CDP text insertion everywhere. Strict atomicity should not be claimed until tested.

Retain v1.0.18 `page.form.fill` as a tested transitional primitive; avoid adding specialized `select`, `click`, `login`, or bank-specific handlers in the extension. Treat external scripts and untrusted page content as data, not authority. Keep user secrets on separately protected channels, and prevent input text leaking through TUI/gateway event logs.

Acceptance: (1) add a new bounded recipe without modifying/reloading the extension; (2) prove no arbitrary JS authorization bypass; (3) fail closed on wrong tab/document epoch and concurrent clients; (4) retain canonical signed mandate, budget and redacted receipts. For privileged Unix effects, test existing super broker plus legitimate effect-specific authority before imposing human SSH, while preserving personal-signature requirements.

## FBF implementation on 6 November 2026

`scripts/lib/fracta-execution-route.js` explicitly differentiates normal shell, discovery of super, broker-reachable-but-unfunded authority, verified effect-specific super grants and independent Principal SSHSIG signatures. `scripts/ops/fracta-execution-route-check.js` probes `/proc/self/status` and sends **only** an unsupported read-only operation to the root broker, without an execution grant or effect. Live observation: `normal.uid=1001`, `NoNewPrivs=true`; broker socket reachable and answered `unsupported_operation`; decision `super_prepare`, `executable=false` because no exact issuer/payload/budget evidence was presented. A real `Cogentia_Private.cogentia_host_process_prepare` call for harmless `id -un` succeeded (EXPOSE only, never run); it did not mint permission. This is a repaired discovery/preflight path, **not** a proof that unattended super execution is authorized. A real positive super route still needs separately approved issuer and exact effect evidence.

`scripts/lib/browser-form-recipes.js` implements a small versioned **data-only** recipe registry in the daemon with explicit field-type selection and restrictions against secret autofill contexts. `scripts/lib/browser-form-recipe-runner.js` compiles a trusted recipe and bounded DOM structure into the already signed `john.request.v1` for `browser.form.fill`; it cannot grant permissions itself. This reuses the existing 1.0.18 generic operation, with **no extension source or installed worker modification**. A second real recipe `generic.first-email` selected field index 2 on the public httpbin form, and `Cogentia_Private` completed `fbf-recipe-demo-20261106-001`, 2 steps settled under the existing signed `mandate:jhn:form-assist`. Independent DOM readback confirmed the expected fictitious email (29 characters), `not_submitted:true`; budget changed to 6 steps settled / 506 available. The loaded extension remained 1.0.18. This proves the client-side recipe extension mechanism. The more ambitious generic script/transaction protocol, cross-origin frames, concurrency/epoch security and secret handling still need separate bounded implementation, not new business RPCs.

The canonical `instructions/AGENTS.shared.md` now instructs future agents to check the alternate governed super route before asking for Principal sudo and to preserve a stable browser extension while extending daemon/Core libraries. Tests cover missing grant, inability to infer authorization from broker reachability, independent personal signatures, recipe selection/refusals and existing governed John form routing.
