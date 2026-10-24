---
title: Governed KYS/AMI memory capture
author: unknown
affiliation: unknown
date: "2026-10-23"
last_modified_at: "2026-10-24"
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

Publication scope for #281: the Principal explicitly authorized commit and push of this
five-file patch to `JeanHuguesRobert/cogentia`, branch `main`, on 2026-10-23.
The resulting Git commit and verified remote ref supply the execution receipts;
this document does not independently establish a successful push. Issue comments
and closure remain gated by separate authorization. No production execution or
live provider-memory access is claimed. That patch was published as
[`8cbb3a3`](https://github.com/JeanHuguesRobert/cogentia/commit/8cbb3a3e6ad319eab5ae2a73d747d6fdffa28f83);
the subsequent [completion receipt](https://github.com/JeanHuguesRobert/cogentia/issues/281#issuecomment-6374754883)
records #281's authorized closure and its verification.
Preserve concurrent unrelated work, including `apps/personal` edits.

## CLI and MCP surfaces (#282)

[MEMSYNC-SURFACES #282](https://github.com/JeanHuguesRobert/cogentia/issues/282)
reuses that same capability via `scripts/lib/memory-capture-surface.js`.
The common surface boundary accepts exactly `{ text: string }`, with a limit
of 262144 UTF-8 bytes. The v3 call explicitly selects `memory.capture.kys-ami`.
It does not forward the supplied text to a daemon, provider, logger or store.

CLI invocation:

```text
node scripts/cogentia.js memory capture --stdin --json
```

Command help is available without reading stdin:

```text
node scripts/cogentia.js memory capture --help
node scripts/cogentia.js memory --help
```

From PowerShell at the Cogentia repository root, this example uses an authored
synthetic fixture and native input redirection to preserve its exact bytes:

```powershell
cmd /c "node scripts\cogentia.js memory capture --stdin --json < prompts\fixtures\agent-acquired-context\rich-memory.yaml"
```

The fixture is synthetic; its successful ingestion is not a live provider-memory
extraction. On shells supporting native stdin redirection, the equivalent is:

```sh
node scripts/cogentia.js memory capture --stdin --json < prompts/fixtures/agent-acquired-context/rich-memory.yaml
```

Supply UTF-8 text through stdin, using a pipe or the caller's stdin API.
Capture text and file paths are not accepted as command arguments. The local
CLI uses the existing trusted-local grant. It emits only the ingestion JSON to
stdout, including unchanged raw evidence. Exit status is 0 for an accepted
capture, 2 for a rejected string capture, and 1 for a surface/input failure.
Treat stdout as private. Surface errors omit input, stack traces and local
paths; malformed-capture diagnostics remain part of the private result.

MCP tool: `cogentia_memory_capture`, with arguments `{ "text": "..." }`.
The existing MCP envelope contains the same ingestion JSON in
`structuredContent.data`; capture results are marked `view: full` after
authorization, even for an attested caller of an otherwise public server.
The tool is read-only, hidden from unauthenticated discovery, and rejected
before argument inspection without private-read access. No mutate grant is
required for a trusted local full-view stdio process.

For stdio, explicitly configure `COGENTIA_MCP_VIEW=full` and the existing
`COGENTIA_ADMIN_TOKEN`. For HTTP `POST /mcp`, the server's full-view configuration
alone grants no capture access: a matching admin credential must be presented
on that request. Existing verified JHN token/actor attestation also works.
Wrong credentials and self-reported identity alone are rejected. Modern tool
catalogues containing the private capture tool carry a private cache scope.
HTTP capture replies, including batches containing a capture, use
`Cache-Control: no-store`.

The legacy `POST /tools/cogentia_memory_capture` shortcut is explicitly blocked
with HTTP 403 because it bypasses request authentication. Use authenticated
`POST /mcp`. HTTP's existing 1 MiB request-body limit remains in effect;
JSON escaping/transport overhead may hit it before the capture-text byte limit.
Only send private captures over a transport already authorized for that data;
this patch does not establish TLS, proxy logging policy or deployment authority.

Surface failures use stable `invalid_input`, `payload_too_large` and
`tier_forbidden` classes. CLI surface failures and MCP envelope errors expose
the same error class/message where the transport permits the same input.
The core's existing string-ingestion results remain unchanged.

### #282 prepared verification receipt

- PASS: `node --test scripts/check-memory-capture-surfaces.js` — 8/8 tests,
  covering six synthetic fixtures, access denials, per-request HTTP credentials,
  UTF-8 limits and safe errors, absence of forwarding/logging/writes, cold stdio
  execution and an actual isolated loopback HTTP server.
- PASS: `node --test scripts/check-memory-capture.js` — 6/6 core tests.
- PASS: `node scripts/check-agent-acquired-context-ingest.js`.
- PASS: `node scripts/check-mcp-dual-era.js` — protocol/authorization checks;
  its optional live-daemon probe reports unavailable, so it supplies no live
  daemon health proof.
- PASS: `node scripts/check-capability-inventory.js`.
- PASS: `node scripts/check-v3-corpus-locate.js`.
- PASS: `node scripts/check-guide-http.js` — synthetic Guide HTTP regression.

Correction trace, 2026-10-24: the old HTTP tool shortcut calls `callTool`
without request authentication, and legacy private reads can inherit static
full-view configuration. The new capture refuses that shortcut and verifies
per-request HTTP credentials before input inspection. This boundary is tested
with mutation enabled and disabled. Existing tools' authorization behavior is
preserved; a broader audit of legacy routes is outside #282.

Publication scope: on 2026-10-24 the Principal explicitly authorized commit and
push of the seven-file #282 patch to `JeanHuguesRobert/cogentia`, branch `main`.
The resulting Git commit and verified remote ref supply execution receipts;
this document does not independently establish a successful push. Issue receipt
and closure remain subject to separate authorization. Next cold action after
publication: record the issue receipt and closure under authorization, then
continue with [#283](https://github.com/JeanHuguesRobert/cogentia/issues/283).
Only #282 hunks in `scripts/cogentia.js` belong to this patch; preserve
concurrent consolidation work.
No production rollout, live-account capture or provider-memory change is claimed.
