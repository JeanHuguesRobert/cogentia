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
2. Mint via the mint UI, not chat. CLI: `node scripts/cogentia.js effect grant --from expose.json` (prints hash), then `--confirm <payload_hash>`. MCP: `cogentia_side_effect_grant` with `prepared` + `confirm` equal to that hash. Utterances never mint.
3. EXECUTE with the native tool **or** the Cogentia adapter.
4. VERIFY: if you used a Cogentia `*_write`/`_send` adapter, consume already happened. If you used a **native** tool (`gmail__send_message`, `github__add_issue_comment`, `git commit`, …), call `cogentia_side_effect_record` with the same grant, action_class, target, payload, and a redacted receipt (`message_id` / `sha`). That hops `effect-verified`. Do not invent a third trace protocol. Without record, mandate and budget are fiction.

Reads stay ungated. Drafts are PREPARE, not EXECUTE.

## Mandate-derived low-risk autonomy and reserved acts (Cogentia #285)

The blanket phrase "before any write-class execute" below describes the legacy grant path and MUST NOT be construed as a demand for repetitive Principal approval for recoverable, in-mandate internal operations. The intended rule permits a traceable mandate-derived authorization for low-exposure internal changes with verified recovery. **The implementation is currently fail-closed:** `mintMandateDerivedGrant` rejects all requests because the repository has no trusted adapter verifier for mandate provenance, budget, privacy, exposure, and recovery. Caller-supplied references and policy fields are descriptive data, not evidence. Keep the legacy authorization gate until such a verifier is wired and tested end to end; never fabricate a Principal grant.

**Hard boundary:** email is draft-only. Prepare/update the draft, identify it to the Principal, and leave sending to the Principal. Neither a general mandate nor a previous approval can authorize an outbound email. The implementation rejects every agent send grant, including caller-supplied claims of explicit consent, until a trusted interface can verify an exceptionally justified, current, act-specific approval. The same preparation-without-emission rule governs other acts comparably committing the Principal to third parties, including public postings and formal submissions.

At intermediate milestones, continue useful allowed work automatically instead of asking for "continue"; request human judgment only when a substantive decision or hard gate requires it. Stop on successful verified completion, not on an arbitrary substep.

## Gmail

`gmail__create_draft` / `list_drafts` / `get_message` are fine without a grant.
`gmail__send_message` / `send_draft` / `forward` / `reply_all` are disabled in the current implementation; prepare a draft and notify the Principal. `direct_send_exception` fields supplied by a caller are not accepted as proof of approval.
Prefer `cogentia_communication_prepare` then execute (native send or `cogentia_communication_send`).

## GitHub writes

`github__issue_read` / `list_issues` are ungated.
`github__add_issue_comment` / `issue_write` / other writes need a grant on the exact owner/repo/body.
Prefer `cogentia_github_prepare` then execute.

## WhatsApp

Agent JHN still does not call Baileys `sendMessage` directly. `requestOutboundSend` is the enqueue frontier. In-mandate self-chat replies: JHN mints and consumes the COP grant itself (no Principal judgment). Out-of-mandate never reaches send (policy / usage-grant / `SEND_ENABLED`). Principal mint is for effects outside that mandate (e.g. Grok + Gmail), not for every JHN ping.

## Git commit / push

`git status` / `diff` / `log` are ungated.
`git commit` / `git push` need a grant on the exact message/files/remote.
Prefer `cogentia_git_prepare` then execute (native git or `cogentia_git_write`).
