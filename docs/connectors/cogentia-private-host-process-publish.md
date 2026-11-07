---
title: "Cogentia Private host process connector schema publication"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-06
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: runbook
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "issue-300-connector-schema-drift"
  origin_date: 2026-11-06
  derived_from:
    - research/integration/coding_super_and_navigation_extension_architecture_review_2026-11-06.md
review:
  status: unreviewed
  reviewed_by: []
---

# Connector schema parity for Cogentia host process tools

ChatGPT's connected Cogentia_Private tool rejects `execution_mode:super` at client argument validation (`Additional properties are not allowed`). Its observed command and timeout limits (4096 characters, 15 seconds) also differ from the source MCP (32768 characters, 120 seconds). This is a tool publication drift, not a Unix or COP grant error.

`node scripts/ops/export-cogentia-private-host-process-schema.js --write` creates the source-derived canonical definition in `docs/connectors/cogentia-private-host-process-schema.json`. It is an export, NOT a plugin manifest or an authorization grant. `node scripts/ops/check-connected-host-process-contract.js --strict` compares this source with the dated observed tool signature and intentionally fails until the live connector is reconciled. The observation fixture must only be updated after an actual live connector readback.

The connector publisher must determine whether the narrower contract is intentional. If it is, document it as a restricted normal-only interface and publish a separately governed super interface if appropriate. Otherwise republish the canonical tool schemas through the actual plugin publication mechanism. Restarting the MCP server or pushing to GitHub alone will not necessarily refresh ChatGPT's already registered tool definitions.

## Reality-test acceptance

1. From a new ChatGPT connector tool declaration verify both host-process tools accept `execution_mode:super` and intended command/timeout bounds. Don't assume that merely seeing source changes implies updated connected tools.
2. Test `cogentia_host_process_prepare` with harmless `id -un`, `execution_mode:super`, only in EXPOSE mode. Verify `phase:EXPOSE` and an effect hash DIFFERENT from the normal-mode hash; no command execution.
3. Test a privileged effect only after a genuinely Principal-issued, independently verified, payload-bound one-use authorization and a canonical COP budget reservation. Reject a normal grant used for super and reject replay.
4. Then update the dated observed schema fixture, run the contract parity check and close #300. The source-level tests alone cannot close the connected-client incident.

**Security:** never hide an unadvertised parameter inside `command`, `provider`, or another accepted field, contact the broker directly without a legitimate grant, or forge a Principal-issued authority. Independent human approval and a valid plugin schema are different prerequisites.

## Live server verification — 2026-11-07

Fracta2 `mcp-cogentia.service` and `cogentia-private-tunnel.service` are active. `tunnel-client doctor --profile cogentia-private --explain` reports the MCP target `http://127.0.0.1:8791/mcp`, HTTP 200, and `RESULT ok`. A **local authenticated** `tools/list` request to this live target (the tunnel's exact upstream) returned HTTP 200, 86 tools, including BOTH `cogentia_host_process_prepare` and `cogentia_host_process_run`. Both live declarations expose `execution_mode.enum=[normal,super]`, `command.maxLength=32768` and `timeout_ms.maximum=120000` — matching the exported source schema. No bearer token was printed or stored in this document. This establishes **source and live MCP server parity**; the known ChatGPT tool signature remains frozen at `command=4096`, `timeout_ms=15000`, no `execution_mode`.

A subsequent local MCP `tools/call` prepare-only reality probe was blocked by the current tool execution boundary, with no verified result. Do not claim that the super preparation call itself has succeeded. A separate ChatGPT connector refresh and new tool-schema readback is required.

Current OpenAI guidance for a custom MCP connection: go to ChatGPT **Plugins**, open the connected Cogentia Private app, select **Refresh** to fetch updated tool schemas and review changes, then start a fresh conversation for the affected test. Depending on workspace/app publishing type, refresh can require app-management permissions; published Business apps may need to be recreated and republished, Enterprise/Edu admins can review refreshed action definitions. Do not recreate or disconnect this working tunnel unless the app settings specifically require it. Authoritative references:

- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels

After Refresh, verify that the actual **ChatGPT-connected** `cogentia_host_process_prepare` and `cogentia_host_process_run` both expose the optional `execution_mode` argument; this validation must happen on the client, not from the repo. Then test a harmless super EXPOSE proposal with no execution. COP-verified issuer, effect-bound grant and budget remain independent prerequisites for any privileged `run`.
