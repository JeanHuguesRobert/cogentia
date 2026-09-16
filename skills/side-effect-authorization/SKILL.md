---
schema: cogentia.agent_skill/v1
id: cogentia.side-effect-authorization
version: 1
status: experimental
name: side-effect-authorization
description: >
  Two-phase authorization for sends and other external side effects (cogentia#171).
  Use before gmail.send, GitHub write, host.fs.write, or any effectful adapter.
effects: prepare_only
sources:
  - docs/host_fs_desktop_commander.md
  - docs/cogentia-mcp.md
  - instructions/AGENTS.shared.md
  - scripts/lib/side-effect-authorization.js
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
---

# Side-effect authorization

```text
PREPARE → EXPOSE → AUTHORIZE → EXECUTE → VERIFY
```

Never mint a grant from chat. `authorizationFromUtterance` is always false.

## Gmail

Do **not** call Grok MCP `gmail__send_message`, `gmail__send_draft`, `gmail__forward_message`, or `gmail__reply_all`. Those tools are denied in this workstation's Grok config.

1. `cogentia_communication_prepare` — show the Principal the exact to/subject/body.
2. After an explicit execute directive on **that** payload, mint `side_effect_authorization` via Cogentia (`grantSideEffectAuthorization` / CLI).
3. `cogentia_communication_send` with the prepared envelope and the grant.
4. Default transport is dry-run (no Google). Replay of the same grant must fail.

Drafts (`gmail__create_draft`) are PREPARE, not EXECUTE.

## GitHub writes

Do **not** call Grok MCP `github__add_issue_comment`, `github__issue_write`, or other `*_write` GitHub tools. Those are denied in this workstation's Grok config. Reads (`github__issue_read`, `github__list_issues`, …) stay allowed.

1. `cogentia_github_prepare` — show owner/repo/issue and the exact body or state change.
2. After an explicit execute directive on **that** payload, mint `side_effect_authorization`.
3. `cogentia_github_write` with the prepared envelope and the grant.
4. Default transport is dry-run (no GitHub API). Replay must fail.

`git commit` / `git push` are not covered yet.

## WhatsApp

Agent JHN never calls Baileys `sendMessage` directly. `requestOutboundSend` is the unique enqueue frontier.

1. `prepareWhatsappSend` — EXPOSE `to_jid` and stamped text.
2. Mint `side_effect_authorization` bound to that payload.
3. `requestOutboundSend` with the grant. Usage-grant + SEND_ENABLED + policy still apply.
4. The inbound pipeline does **not** auto-enqueue. Missing grant → `authorization_missing` and a prepared envelope.

Self-chat `SEND_ENABLED` is not a per-payload grant.
