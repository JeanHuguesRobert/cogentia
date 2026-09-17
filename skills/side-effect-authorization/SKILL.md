---
schema: cogentia.agent_skill/v1
id: cogentia.side-effect-authorization
version: 2
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
  - research/cop_side_effect_packets.md
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
---

# Side-effect authorization

```text
PREPARE → EXPOSE → AUTHORIZE → EXECUTE → VERIFY
```

The gate is **tracing, mandate, and budget** — not amputating tools.
Tool availability is not authority. Native Gmail/GitHub/git capacities stay.

Never mint a grant from chat. `authorizationFromUtterance` is always false.

Before any write-class execute (send, comment, commit, push, WhatsApp enqueue):

1. EXPOSE the exact payload (Cogentia `*_prepare` tools, or an equivalent preview).
2. Mint `side_effect_authorization` bound to that payload (Principal / explicit execute on **that** payload).
3. EXECUTE with the native tool **or** the Cogentia adapter.
4. VERIFY: if you used a Cogentia `*_write`/`_send` adapter, consume already happened. If you used a **native** tool (`gmail__send_message`, `github__add_issue_comment`, `git commit`, …), call `cogentia_side_effect_record` with the same grant, action_class, target, payload, and a redacted receipt (`message_id` / `sha`). That hops `effect-verified`. Do not invent a third trace protocol. Without record, mandate and budget are fiction.

Reads stay ungated. Drafts are PREPARE, not EXECUTE.

## Gmail

`gmail__create_draft` / `list_drafts` / `get_message` are fine without a grant.
`gmail__send_message` / `send_draft` / `forward` / `reply_all` need a grant on the exact to/subject/body.
Prefer `cogentia_communication_prepare` then execute (native send or `cogentia_communication_send`).

## GitHub writes

`github__issue_read` / `list_issues` are ungated.
`github__add_issue_comment` / `issue_write` / other writes need a grant on the exact owner/repo/body.
Prefer `cogentia_github_prepare` then execute.

## WhatsApp

Agent JHN still does not call Baileys `sendMessage` directly. `requestOutboundSend` is the enqueue frontier and requires the grant. Usage-grant + `SEND_ENABLED` + policy still apply. The inbound pipeline does not auto-enqueue.

## Git commit / push

`git status` / `diff` / `log` are ungated.
`git commit` / `git push` need a grant on the exact message/files/remote.
Prefer `cogentia_git_prepare` then execute (native git or `cogentia_git_write`).
