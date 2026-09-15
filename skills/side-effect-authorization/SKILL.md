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
