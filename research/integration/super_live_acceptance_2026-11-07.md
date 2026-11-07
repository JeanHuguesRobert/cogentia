---
title: "Live privileged executor super — capability and authorization acceptance"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-07
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
  origin_ref: "2026-11-07-super-after-plugin-refresh"
  origin_date: 2026-11-07
  derived_from:
    - docs/connectors/cogentia-private-host-process-publish.md
    - research/integration/coding_super_and_navigation_extension_architecture_review_2026-11-06.md
review:
  status: unreviewed
  reviewed_by: []
---

# Live super acceptance — 2026-11-07

## Confirmed directly

The three connected tools in this ChatGPT environment have refreshed: Cogentia public (64 tools), Cogentia Private (86), Cogential Unix Shell Exec (one). Cogentia Private now exposes `execution_mode:normal|super` on both host_process_prepare/run, with command max 32768 and timeout max 120000. Actual EXPOSE-only preparations for harmless `id -un` in normal and super both returned successful with **distinct hashes**; neither ran the command. The regular Unix shell's `id -un` ran as ubuntu, uid 1001.

The shell-exec connector now exposes a separately governed super entry requiring `authorization_id`, `actor`, `principal`, and `mandate`. A super call without authorization was rejected at argument/tool validation. An explicit super call using a **known nonexistent test authorization ID** with `agent:jhn`, `principal:jhn` and `mandate:chatgpt-corpus-coding` traversed to the root broker and returned `cop_authorization_denied`, with no verified command execution. This is the correct fail-closed response; it is not a completed positive root execution.

The Fracta2 `cogentia-super.service` and `mcp-cogentia.service` are active and the MCP has `COGENTIA_SUPER_COP_ENABLED=1`. Broker binary `/usr/local/libexec/cogentia-super/broker.mjs` has the same SHA256 as repository `scripts/super/broker.mjs`: `a8cee53ef7f3267b47a68349bef472ca347f96b6a022b366c0125ea6c76cb235`. The broker runs as root. `/var/lib/cogentia-super` is root-owned (0700), so the ordinary shell cannot inspect `/var/lib/cogentia-super/authorizations.json`; broker socket is root:ubuntu (0660). The broker verifies authorization ID, exact payload hash, mode, actor, principal, mandate, target, expiry, one-use status and allowed issuer origins before atomically consuming a grant. The broker runs scripts as `ubuntu` by default; `sudo` inside an authorized script must be explicit for root effects. This intentional least-privilege behavior now has a regression test.

## Tests and precise remaining boundary

`node --test scripts/super/broker.test.mjs scripts/super/broker-route.test.mjs scripts/lib/cop-super-admission.test.js scripts/lib/cop-super-inseme-integration.test.js scripts/lib/host-process-cop-integration.test.js`: 15 PASS, including altered actor, mandate, mode, target, command and replay denial. These are test fixtures, not a claim of live privileged positive execution. A real positive requires an **existing or independently signed Principal-issued effect-specific authorization in the protected root store**, with budget reservation and exact hash, then a read-only, non-secret super command and verification of its receipt and consumed grant. The user utterance and tunnel bearer are not Principal-issued grants; do not mint one merely to force a green test. No production authorizations were issued, modified or consumed in this investigation.

## Engineering note

The old broker pilot's test grants run in-process as the unprivileged tester and therefore do not reproduce the production root-owned store's ownership check. Production denial was verified via the real broker; a **real positive** is the outstanding acceptance criterion. Note also that the generic `assessCopSuperAdmission` helper returns `requires_canonical_reservation:true` and no reservation; it must not be interpreted as executed or budget-settled. The broker's root-owned consumed state and the higher-level canonical COP accounting must be reconciled in the eventual positive recipe.
