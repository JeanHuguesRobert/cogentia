---
title: Governed KYS/AMI memory capture
author: unknown
affiliation: unknown
date: "2026-10-23"
license: CC BY-SA 4.0
language: en
status: draft
document_role: operational
document_kind: capability-contract
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/memory-capture.md
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: https://github.com/JeanHuguesRobert/cogentia/issues/281
  origin_date: "2026-10-23"
  derived_from:
    - prompts/agent-acquired-context.md
    - schemas/agent-acquired-context.v0.schema.json
    - scripts/lib/agent-acquired-context-ingest.js
    - scripts/lib/v3-modules.js
review:
  status: unreviewed
  reviewed_by: []
---

# Governed KYS/AMI memory capture

[MEMSYNC-CORE #281](https://github.com/JeanHuguesRobert/cogentia/issues/281)
adds `memory.capture` to the v3 registry without introducing another memory
engine. The namespace audit found no existing registration of that capability.
The wrapper reuses [KYS/AMI ingestion](../prompts/agent-acquired-context.md#ingestion).

Importing `scripts/lib/memory-capture.js` registers module
`memory.capture.kys-ami`, implementation provider `kys-ami`. The normal
`scripts/cogentia.js` entry point also imports it. Other embedded callers can
discover and invoke the module without running CLI dispatch:

```js
import "./scripts/lib/memory-capture.js";
import { listModules, invokeCapability } from "./scripts/lib/v3-modules.js";

const descriptors = listModules(); // Metadata only; no captured text.
const result = await invokeCapability("memory.capture", { text: suppliedReply }, {
  moduleId: "memory.capture.kys-ami",
  auth: callerAuth,
});
```

`callerAuth` must be resolved by the trusted calling surface and grant
`lockers.private.read`. No write permission is needed. Missing authorization,
public access alone, and private write without private read are rejected before
reading the capture input. An `auth` field inside input cannot supply the grant.

Input `text` must be a string; other types raise `invalid_input` without echoing
their content. String captures return the existing ingestion result unchanged:
`raw.text`, `raw.sha256`, `normalized`, `extensions`, `diagnostics`, `warnings`
and `ok`. Malformed strings retain their raw evidence and return
`ok: false, normalized: null`. Extra schema fields stay in `extensions` rather
than disappearing. Unknowns and contradictions retain their existing semantics.
The existing contract also accepts human annotations; this wrapper preserves it.

The implementation provider is distinct from the captured `source.provider`
and `source.agent`. These source fields come only from the submitted document;
unknown identity remains unknown. With multiple registry candidates, calls must
select a unique provider or module ID. Even an explicit provider label is
rejected with `provider_ambiguous` if it matches several modules. Conflicting
provider/module selectors fail with `provider_not_found`.

Capture performs no storage writes, provider calls, logging, retention-policy
changes, or Corpus promotion. The result, including parse diagnostics, can
contain private text: calling surfaces must keep the entire result inside the
authorized private response boundary and must not log it or publish it.
[MEMSYNC-SURFACES #282](https://github.com/JeanHuguesRobert/cogentia/issues/282)
owns CLI/MCP exposure; this module adds no new public route.

## Verification and continuation receipt

Inspected baseline: `3dcf5fa33dd76ccd3bb40739d39440f241dbefdd` on `main`,
after fetching and synchronizing with `origin/main` on 2026-10-23.
All captures in the checks are authored synthetic fixtures.

- PASS: `node --test scripts/check-memory-capture.js` (six tests): discovery,
  positive/negative authorization, ingestion parity and raw hash, source
  identity/unknowns/contradictions, malformed/non-string input, no observable
  logging/network/storage writes, and explicit/ambiguous dispatch.
- PASS: `node scripts/check-agent-acquired-context-ingest.js`.
- PASS: `node scripts/check-agent-acquired-context-prompt.js`.
- PASS: `node scripts/check-agent-acquired-context.js`.
- PASS: `node scripts/check-v3-corpus-locate.js`.
- PASS: `node scripts/check-host-desktop-commander-provider.js`.
- PASS: `node scripts/check-capability-inventory.js`.
- PASS: `node scripts/cogentia.js frontmatter verify docs/memory-capture.md --strict-role`
  (zero errors or warnings) and `git diff --check`.

Correction trace, 2026-10-23: the old registry silently used the first matching
module. It now rejects unresolved ambiguity across capabilities. This prevents
registration order from deciding identity or selecting a different governance
requirement. Existing single-provider calls retain their behavior; callers
relying on implicit multi-provider routing must provide a selector. Recovery is
to revert this bounded patch; it creates no retained capture state.

Publication scope: the Principal explicitly authorized commit and push of this
five-file patch to `JeanHuguesRobert/cogentia`, branch `main`, on 2026-10-23.
The resulting Git commit and verified remote ref supply the execution receipts;
this document does not independently establish a successful push. Issue comments
and closure remain gated by separate authorization. No production execution or
live provider-memory access is claimed. Cold next action after publication:
resume the dependent surfaces packet #282 from the registry contract above.
Preserve concurrent unrelated work, including `apps/personal` edits.
