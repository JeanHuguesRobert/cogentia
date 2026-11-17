---
title: Conversational adapters — primitive SQLite continuations and ChatGPT OpenAI provider
date: 2026-11-16
last_modified_at: 2026-11-17
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
A separate non-public registry was also checked locally; its path,
identity and counts are deliberately **not published** in this public
runbook. The counts above cover only the two public registry roots.
Three isolated test-only resolver databases were verified by fixture
IDs and removed; no operational continuation database was deleted.

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
completed. No **pre-existing operational continuation** was copied,
deleted or overwritten. A separate, entirely synthetic continuation
was later created in temporary SQLite stores on both nodes for an
explicit cross-platform migration test; those test artifacts were
removed afterwards. The Android mobile node and the older FractaNode
were not reachable during this check.

The Fracta2 and Operium source checkouts were fast-forwarded to
GitHub `main` without overwriting pre-existing local changes.
The Cogentia daemon was restarted on 2026-11-16 at 18:36:57 UTC
through the governed ThinkPad → owner SSH/sudo maintenance route after
diagnosing recurrent cgroup OOM kills under 250 MB RAM / 50 MB swap.
Systemd's effective persistent limits are now 768 MiB RAM / 192 MiB
swap (`NeedDaemonReload=no`). The daemon returned live MCP cockpit
and continuation-list results after restart. Other long-running
processes must be verified independently when their code changes.

**Remaining boundary:** atomic cross-host ownership transfer,
automatic semantic reconciliation after partitions, and real hosted
browser delivery have not been validated. None is implied by a
successful SQLite import.

## Portable snapshots and causal return (cross-platform test, 2026-11-16)

The primitive kernel now exposes an explicit local CLI with no
transport, mandate or global scheduler dependency:

```bash
# At the source node: export a single named continuation to a private
# snapshot. The file is created mode 0600 and is NEVER overwritten.
node scripts/ops/continuation-snapshot-local.mjs export \
  --db /local/state/continuations.sqlite \
  --id ctn_example --out /private/ctn_example.snapshot.json

# Transfer the snapshot through an independently authenticated transport.
# At the destination node, import a NEW logical identity into local SQLite:
node scripts/ops/continuation-snapshot-local.mjs import \
  --db /local/state/continuations.sqlite \
  --in /private/ctn_example.snapshot.json --scope local-node

# When the successor comes back to a store which ALREADY holds that ID:
node scripts/ops/continuation-snapshot-local.mjs reconcile \
  --db /local/state/continuations.sqlite \
  --in /private/ctn_example.returned.json --scope local-node
```

The reconciliation operation conditionally advances the original state
when the incoming history contains the **exact local causal prefix**,
and unions compatible memo slots and historical sources. A concurrent
branch or conflicting cache input is retained as a content-addressed
`divergent-snapshot:sha256:…` source record, while the live continuation
remains unchanged. A genuinely stale snapshot is rejected, rather than
replaying its earlier state. The operation is idempotent.

**Actual host test:** a synthetic `ctn_crosshost_smoke_20261116`
was exported from an isolated SQLite database on Fracta2,
transported to the ThinkPad using the existing owner-authenticated SSH
route, imported under Windows Node.js/SQLite, resumed from a memoized
result without recalculation, and returned to Fracta2. The **original
Fracta2 database**, not a duplicate empty database, was successfully
advanced from revision 1 to revision 2 by causal reconciliation.
The test also confirmed checksum validation, cache retention,
idempotent repeated merge and stale-state rejection. Original
operational databases were not involved.

**Important boundary:** snapshots and causal reconciliation prove
portable *state*, not atomic transfer of execution custody. Callers
must independently fence simultaneous non-idempotent effects and
preserve the actual COP authority envelope whenever governance applies.
An SHA-256 snapshot checksum is evidence of integrity, not identity or
authorization. Network partition convergence and automatic repair of
`uncertain` effects remain future work.

## Tests and limitations

```bash
node --test scripts/test-primitive-continuations.mjs \
  scripts/test-conversation-adapters.mjs \
  scripts/test-chatgpt-openai-provider.mjs \
  scripts/test-chatgpt-provider-bootstrap.mjs \
  scripts/test-primitive-snapshot-reconciliation.mjs
```

The bootstrap test launches the **actual standalone provider** with
a fake locally injected browser action and no John/Cogentia token.
It tests HTTP request/response handling, not a real ChatGPT login
or real hosted-browser DOM. ChatGPT browser output is not a native
OpenAI API response: model pinning, actual token usage, native tool
calls, role hierarchy and token-by-token streaming remain unsupported.
SSE responses are buffered rather than incremental.

Portable continuation state and memo reuse have now been tested on
two **different physical hosts and operating systems**. Cross-host
*exclusive execution custody*, distributed irreversible effects,
network-partition convergence and automatic `uncertain`-state repair
remain to be implemented and tested.

## Operational checkpoint — 17 November 2026 (#335 under #330)

This is an evidence checkpoint, **not a production activation**. The dated
execution plan is recorded at [Cogentia #335](https://github.com/JeanHuguesRobert/cogentia/issues/335#issuecomment-6948046557),
coordinated by [#330](https://github.com/JeanHuguesRobert/cogentia/issues/330).

### Architecture and authority boundary (P0)

- An **ordinary completion** is an OpenAI-shaped, text-only request to a
  provider-neutral adapter and a **primitive local SQLite continuation**.
  It does not automatically create a COP packet or submit an MCP result.
- A governed **CPS Judgment** is separately assigned under a current COP
  mandate/budget/channel and returns via the existing correlated **MCP result
  receipt** under #330. A successful browser click does not prove a returned
  Judgment result. These mechanisms must not be conflated.
- The existing ChatGPT ordinary-completion runner currently uses browser
  `observe` with the assistant answer to project HTTP content. It is **not**
  the direct-MCP result path used by the governed CPS test. Neither an active
  browser tab nor the signed JHN v5 mandate proves third-party permission.
- The [European OpenAI Terms of Use](https://openai.com/policies/eu-terms-of-use/)
  (updated 16 January 2026, verified 17 November 2026) prohibit automatic or
  programmatic extraction of data or Output. The existing
  [Fair Usage doctrine](../research/integration/conversational_agents_fair_usage_cop_2026-11-13.md)
  already identifies this restriction. No express applicable exception for
  this ChatGPT consumer-browser-to-HTTP-provider use has been established.
  **Do not activate the real consumer-browser extraction path or conduct a
  live automated extraction test in the absence of such permission.**
  Low volume, Principal approval and COP accounting do not themselves grant
  provider permission; do not bypass channel restrictions.

### Verified on Fracta2 (17 November 2026)

| Check | Evidence and state |
| --- | --- |
| Existing runtime | `magistral.service`, `mcp-cogentia.service` and `cogentia.service` active at inspection |
| Active Magistral command | `--map local-codex-acp`; `chatgpt-browser` not enabled in that active map |
| Source locality | Cogentia `main`; dirty/untracked work from other tasks preserved, no reset or forced pull |
| Provider port | No resident listener on `127.0.0.1:8898` at inspection |
| Node tests | 25/25 Cogentia primitive/adapter/provider tests PASS, 10/10 Magistral router tests PASS |
| Isolated actual-port smoke | Real provider process listened on loopback `8898` against injected **fake** browser action and disposable SQLite; health, models and text completion passed |
| Restart/idempotence | Process restarted on the same disposable SQLite; same `X-Client-Request-Id` returned cached answer with **one** synthetic submit in total; changed payload with same key returned HTTP 409 |
| Cleanup | Disposable provider stopped and temporary fixture/state deleted; no real ChatGPT invocation and no real MCP result submission |

### Four independently assessed gates

| Dimension | Ordinary ChatGPT-browser completion | Governed CPS Judgment (#330) |
| --- | --- | --- |
| Advertised | Source adapter and opt-in node descriptor exist | Existing canonical browser/COP/MCP worker exists |
| Reachable | Fake local transport smoke passed; real provider not resident | Previous real MCP-return CPS chain documented under #330, **not** a #335 HTTP E2E test |
| Authorized | JHN mandate is not a provider license; **consumer-browser output extraction not cleared** | JHN v5 capability/COP evidence exists; separate provider/channel permission still required |
| Tested | Unit tests and fake local end-to-end provider smoke only | Three-continuation CPS chain reported with real receipts under #330; unrelated to ordinary Chat Completions acceptance |

### Next admissible execution steps (P1–P5)

1. **P1:** preserve current code/runtime and monitor local preflight. Only after
   independently verified permission for the actual channel, recheck Principal,
   signed mandate, budget, origin, tab, existing browser transport, loopback
   authentication, and SQLite state before a resident startup.
2. **P2:** install only an opt-in **additive** Magistral map after that gate;
   retain `local-codex-acp`, embeddings, client request ID/call chain,
   `no_fallback_on_error=true`, and a tested rollback. Source node descriptor
   is not proof of an installed effective process map.
3. **P3:** require one genuinely authorized client → Magistral → 8898 →
   browser → correlated result → client trace, then same-key replay and
   timeout/ambiguity test with no duplicate send; a synthetic HTTP response
   is insufficient to close this acceptance criterion.
4. **P4:** expose only verified four-dimensional capability statuses. Ordinary
   HTTP response and governed MCP receipt remain distinct, with measured
   latency, rate and accounting evidence where available.
5. **P5:** re-run `research/evaluations/prior-art-navigation-blind.md` only
   **after** the genuine permitted E2E succeeds. Do not invent a reasoning
   benchmark result from fake responses.

Until the permission gate changes, #335 remains **source-tested and locally
smoke-tested but blocked for live browser activation**. A separately permitted
API or a provider-authorized integration is an alternative channel, not a
silent substitution for the browser provider requested in this issue.
