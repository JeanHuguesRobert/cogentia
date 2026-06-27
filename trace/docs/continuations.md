---
document_role: "operational"
document_kind: "operational-note"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "operational-note"
classification_confidence: "medium"
---

# Cogentia Trace — Continuations

A continuation records a suspended processing state and a judgment request.

It must contain enough information to resume execution, but not more sensitive data than necessary.

## Minimal continuation fields

- `continuation_id`
- `tool`
- `reason`
- `source_event_id`
- `state_ref`
- `question`
- `context`
- `allowed_responses`
- `default_response`
- `resume_command`

## Example flow

```text
cogentia-trace import chatgpt ./raw/openai-export.zip

Processing suspended.
Continuation written to ./continuations/cont-0001.json

Question:
Can this conversation be classified as public_candidate?

Resume:
cogentia-trace resume ./continuations/cont-0001.json --decision private
```

## Design rule

The continuation is not a chat transcript. It is a compact resumption packet.

It should contain hashes, identifiers and limited excerpts when possible, rather than raw private content.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Documents - All Tracked Repos](../../research/documents.md)
- [Research Index — Cogentia](../../research/index.md)
<!-- END_AUTO: backlinks -->
