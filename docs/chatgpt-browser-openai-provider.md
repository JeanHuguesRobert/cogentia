---
title: Conversational adapters — primitive SQLite continuations and ChatGPT OpenAI provider
date: 2026-11-16
document_role: operational
document_kind: runbook
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
status: experimental — unit and mock-transport tests verified; no real hosted-browser delivery
---

# OpenAI-compatible conversation adapters and primitive continuations

## Architectural boundary

The OpenAI-compatible HTTP surface, conversational request bridge, primitive
continuation persistence, and conversational service transport are **separate
components**. The generic machinery has no Cogentia MCP or COP dependency.
ChatGPT is the first real browser-specific prompt/runner adapter; tests
exercise generic Claude/Grok-like adapters with injected fake turn runners.

```text
Magistral (or direct client) -> generic OpenAI HTTP bridge
  -> generic per-adapter conversation store -> primitive SQLite continuations
  -> adapter-specific renderer / action transport -> conversation service
```

Ordinary text completion creates a local primitive continuation. It does
**not** create a governed COP packet or mandate. A primitive local *claim*
arbitrates incompatible use of one conversation/browser resource; it is
not a COP PacketClaim. Other work and other adapter scopes continue.
The state machine supports optimistic revisions, per-slot memoization,
immutable transition history, checked portable snapshots, and historical
source variants.

A continuation is a resumable computation, not an entire serialized
JavaScript call stack. Side-style memoized replay and explicitly bounded
effects are suitable primitive mechanisms. A governed continuation is the
composition of such a primitive with **optional** COP authority, budget,
judgment and effect controls. A Cogentia MCP tool that requests a judgment
continues to use the pre-existing Cogentia handler; ordinary OpenAI
completions do not impersonate that handler.

## Provider-neutral interface and locality

- `scripts/lib/primitive-continuations.mjs`: SQLite-local primitive
  identity, versioned compare-and-swap, scoped claims, memo slots, sources,
  event history, checked snapshot export/import and interrupted-runner marking.
- `scripts/lib/conversation-local-store.mjs`: provider-scoped durable
  turn records, idempotency, bounded resource arbitration, and recovery.
- `scripts/lib/openai-conversation-bridge.mjs`: provider-neutral
  text-only OpenAI completion projection, recursion lineage and local
  suspension.
- `scripts/lib/chatgpt-openai-local-store.mjs` and
  `scripts/lib/chatgpt-openai-bridge.mjs`: small ChatGPT-specific adapters.
- `scripts/lib/chatgpt-openai-browser-runner.mjs`: UI observation, send,
  response observation. Requires an injected action callback, not COP.
- `scripts/lib/chatgpt-openai-http.mjs`: generic authenticated loopback
  HTTP server with a ChatGPT compatibility constructor.
- `scripts/ops/serve-chatgpt-openai-provider.mjs`: concrete ChatGPT server.
- `scripts/ops/migrate-json-continuations-sqlite.mjs`: one-way import tool.

The provider stores state in **SQLite on the machine running that provider**,
default `~/.local/state/cogentia/chatgpt-browser-provider.sqlite`,
overridable via `COGENTIA_BROWSER_CHAT_STATE_DB`. There is no global
continuation database, mandatory GitHub Issue, or automatic cross-machine
storage migration. A checked snapshot contains the durable work identity,
causal history, memoized slots and original source variants, and can be
imported elsewhere. **Import is not yet an atomic ownership handoff**:
caller coordination is needed before claiming that execution authority has
moved or that concurrent effects cannot occur across machines.

`X-Client-Request-Id` is the retry identity. The preferred recursion header
is `X-Continuation-Call-Chain`, with
`X-Cogentia-Call-Chain` accepted as a legacy integration spelling.
Magistral forwards the generic header on explicitly pinned
`no_fallback_on_error` providers. When the target adapter token appears
in its inherited call chain, a request is deferred locally and returns
HTTP 409 `local_continuation_required`, not a recursive browser call.
Use `GET /v1/continuations/local_<id>` and then retry the same request
with the same idempotency key after the recursion clears. Unknown browser
delivery stays `uncertain` rather than being blindly replayed.

Local SQLite compare-and-swap detects actual conflicts; it does **not**
guarantee eventual convergence. Reconciling incompatible semantic results
or cross-machine competing effects is a separate higher-level operation.
Non-idempotent external effects require their own admission/deduplication
boundary. A local process lock cannot prevent independent remote callers
from sending into the very same physical browser. The actual browser
executor must enforce access to that shared resource.

## Choosing an action transport (with or without Cogentia)

The ChatGPT server has two mutually exclusive boot routes:

1. `CHATGPT_BROWSER_ACTION_MODULE=/absolute/path/to/adapter.mjs`:
   the operator supplies a local module exporting
   `createBrowserAction({adapter})`. This may be asynchronous and must
   return `invoke(action,request_id,args)`, where results are shaped as
   `{ok:true,observation:{...}}`. Actions are
   `ensure_tab`, `status`, `observe`, and `submit`.
   This route needs **no Cogentia token**. The operator still has to supply
   a separately authorized browser transport; the module is an explicit
   local execution dependency, never a user-input URL.
2. Otherwise, the optional historical John bridge is selected through
   `COGENTIA_MCP_JHN_TOKEN`. Its existing upstream COP controls are
   retained for browser actions; this is an **integration choice**, not
   a core primitive mandate.

Both routes require the separate loopback HTTP bearer credential
`COGENTIA_BROWSER_CHAT_PROVIDER_KEY` (or existing `COGENTIA_API_KEY`).
Do not put credentials in Git, logs or prompts. Port
`127.0.0.1:8898` can be changed through
`COGENTIA_BROWSER_CHAT_PORT`.

## Migration of historical JSON state

The original `.cogentia/continuations/*.json` files are a **different**
legacy operational population, not merely old browser requests. The importer
preserves each original kind, status, entire JSON payload, filename and hash;
when two files refer to the same logical continuation, both are retained as
distinct source versions, **without fabricating a second work identity**.

```bash
node scripts/ops/migrate-json-continuations-sqlite.mjs \
  --source .cogentia/continuations \
  --db /absolute/local/path/continuations.sqlite

# After verifying report and destination, import without deleting originals:
node scripts/ops/migrate-json-continuations-sqlite.mjs \
  --source .cogentia/continuations \
  --db /absolute/local/path/continuations.sqlite --apply
```

### Operational migration state — 16 November 2026

The **live operational readers and writers** in `cogentia.js`, the
embedding and semantic-search workers, the weekly consolidation flow,
the WhatsApp cockpit, packet relations and terminal settlement now
use `continuation-sqlite-repository.mjs` with conditional revisions.
The old `cogentia.v1-history.js` remains historical, not a runtime
entrypoint. The Operium weekly release check also uses SQLite.

On Fracta2, two registry-local SQLite stores were verified using
`continuations-local.mjs health` and `PRAGMA quick_check`:
- Corpus root `/srv/cogentia/repos/JeanHuguesRobert`: **467 logical
  continuations**, 467 historical source versions, integrity `ok`.
- Cogentia root `/srv/cogentia/repos/cogentia`: **20 logical
  continuations**, 21 historical source versions, integrity `ok`.

The original JSON snapshots remain readable archival evidence and must
not be treated as concurrently authoritative live records. One
logical ID can have several historical source incarnations; this is
not a reason to manufacture a second work ID. The first migration
was dry-run-first and its apply pass was idempotent.

The legacy local resolver capability registry, its primitive claim
records and the **COP PacketClaim epoch / terminal receipt filesystem
stores** have also been converted to local SQLite tables. The latter
remain COP-governed in semantics; moving the storage does not remove
mandate, budget or effect-boundary controls. Independent tests cover
cross-process claim races, expiry, fencing, interrupted settlement,
recovery and budget reconciliation. The two inspected Fracta2 registry
roots had **zero** legacy `claims-v1` epoch files and zero terminal
receipts awaiting import.

For an additional FractaNode, perform the migrations **locally** and
report only inventories, checksums and provenance across the network.
Do not replicate the entire continuation database by default.

```bash
# On each node, against each *actual* registry root:
node scripts/ops/migrate-json-continuations-sqlite.mjs \
  --source /path/to/registry/.cogentia/continuations
node scripts/ops/migrate-json-continuations-sqlite.mjs \
  --source /path/to/registry/.cogentia/continuations --apply

node scripts/ops/migrate-legacy-resolvers-sqlite.mjs \
  --root /path/to/registry
node scripts/ops/migrate-legacy-resolvers-sqlite.mjs \
  --root /path/to/registry --apply

node scripts/ops/migrate-legacy-cop-claims-sqlite.mjs \
  --root /path/to/registry
node scripts/ops/migrate-legacy-cop-claims-sqlite.mjs \
  --root /path/to/registry --apply

node scripts/ops/continuations-local.mjs health \
  --root /path/to/registry
```

The ThinkPad was verified reachable as `i7-thinkpad-jhr` with
Node.js 24.5 and SQLite 3.50, but no legacy continuation directory or
operational database was found in the principal locations inspected.
That is **not** a claim that an exhaustive full-disk search has
completed. No remote continuation data was copied, deleted or created.
The Android mobile node and the older FractaNode were not reachable
during this check.

The Fracta2 and Operium source checkouts were fast-forwarded to
GitHub `main` without overwriting pre-existing local changes.
Long-running Cogentia daemons must be restarted or otherwise reloaded
through their already-authorized operations channel before claiming
that newly edited JavaScript modules are active in those processes.

**Remaining boundary:** atomic cross-host ownership transfer,
automatic semantic reconciliation after partitions, and real hosted
browser delivery have not been validated. None is implied by a
successful SQLite import.

## Tests and limitations

```bash
node --test scripts/test-primitive-continuations.mjs \
  scripts/test-conversation-adapters.mjs \
  scripts/test-chatgpt-openai-provider.mjs \
  scripts/test-chatgpt-provider-bootstrap.mjs
```

The bootstrap test launches the **actual standalone provider** with
a fake locally injected browser action and no John/Cogentia token.
It tests HTTP request/response handling, not a real ChatGPT login
or real hosted-browser DOM. ChatGPT browser output is not a native
OpenAI API response: model pinning, actual token usage, native tool
calls, role hierarchy and token-by-token streaming remain unsupported.
SSE responses are buffered rather than incremental.

The present primitive handoff test verifies checked snapshots between
two local SQLite databases. Cross-host custody, distributed effects,
network-partition convergence and automatic `uncertain`-state repair
remain to be implemented and tested.
