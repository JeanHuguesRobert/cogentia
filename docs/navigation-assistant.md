---
document_role: "operational"
document_kind: "guide"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "guide"
classification_confidence: "medium"
---

# Local Brave navigation assistant (CDP POC)

This local-first Windows CLI attaches to a Brave tab through the loopback Chrome
DevTools Protocol (CDP) endpoint. It can list tabs, capture a bounded page
context, fill the Windows clipboard, and insert explicitly supplied text into
the currently focused editable field.

## Start Brave for the POC

Keep the endpoint on loopback. The assistant is designed to attach to the
user-controlled Brave session, including the normal daily-use profile. A
separate profile remains an optional operational choice, not a safety
requirement or a substitute for the Agent mandate.

```powershell
& "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" `
  --remote-debugging-port=9222
```

Do not add `--user-data-dir` unless you deliberately want a separate Brave
profile; the assistant does not require one.

Open the intended page in that Brave window, then start the resident TUI from
the repository:

```powershell
pnpm navigation-assistant
```

For a supervised development session, use `pnpm navigation-assistant:supervisor`.
It restarts the TUI after a non-zero exit. In the TUI, `r` requests that
restart; `q` or `Ctrl+C` stops the supervisor cleanly.

The resident TUI refreshes the selected tab, title, URL, and active field. Put
the draft in `.\draft.txt`, focus the intended editable field, then press `i`
to insert it. The TUI uses optimistic locking: if the page, field, or selection
changed since the displayed context, insertion is refused. Press `c` to
refresh, `t` to reset the selected tab, `r` to restart, and `q` to quit. The
low-level one-shot CLI remains available for scripts and diagnostics:

Prepare the local Brave extension with:

```powershell
pnpm navigation-assistant:install --open
```

Then, once from `chrome://extensions` (or Brave's **More tools → Extensions** menu), enable
**Developer mode**, choose **Load unpacked**, and select
`C:\tweesic\cogentia\browser-extension`. The extension connects only to the
loopback WebSocket exposed by the TUI. Disable or remove it at any time from
the same Brave page.

```powershell
pnpm navigation-assistant:cli tabs
pnpm navigation-assistant:cli context
pnpm navigation-assistant:cli copy --file .\draft.txt
pnpm navigation-assistant:cli insert --file .\draft.txt --confirm
```

Use `--target-id ID` with the one-shot CLI when more than one page target is
available. Without it, the first page target returned by CDP is used as a
deliberate POC fallback. `CDP_ENDPOINT` may override the default
`http://127.0.0.1:9222` endpoint.

The loopback WebSocket on `http://127.0.0.1:8765` is the **local hold**.
When Operium Node Agent is running it imports this repo's gateway and
listens there so the extension stays connected while the TUI is down.
`GET /health` then reports `extensionConnected` / `assistants`. If that hold
is not up, the TUI serves `:8765` itself (`GET /health` reports `bridge`).
`GET /version` reports the assistant, bridge-protocol and connected-extension
versions.
`GET /state` exposes the current tab/context snapshot, while
`GET /diagnostics` returns the recent extension and bridge events.
`POST /control/refresh` asks the extension to re-announce the active tab
without restarting the resident process. `POST /stop` (aliases `POST /control/stop`, `POST /control/restart`)
restarts the resident process, equivalent to `r`. `POST /quit` (alias
`POST /control/quit`) stops it cleanly, equivalent to `q`.
`POST /control/reload-extension` asks the unpacked extension to reload itself.
`POST /control/evaluate` with `{"expression":"..."}` sends JavaScript to the
minimal extension bridge for execution in the active page and exposes the
result through `GET /state` as `lastEvaluation`. Keep this endpoint
loopback-only during development.
`POST /control/assistant-evaluate` accepts `{"code":"..."}` and starts a
JavaScript task in the Assistant daemon itself. It returns a `runId`; retrieve
its intermediate events and terminal result from `GET /script-runs/<runId>`.
The task receives an `assistant` capability object: `memory()`, `emit(type,
value)`, `page.context()`, `page.evaluate(code)`, `clipboard.read()/write()`,
`draft.read()`, and `page.facebookFeed()`. This is the first instance of the general daemon-programming
contract: a task can inspect daemon state, invoke capabilities, await another
interpreter (the browser Extension), emit intermediate observations, and return
a final value. It is a local development capability, not a network security
boundary; retain loopback binding and apply the Mandated Agent model before any
remote exposure.
The Facebook adapter is deliberately separate from the generic browser stdlib;
it classifies visible `role=article` elements as `post`, `comment`, `reply`, or
`unknown` using semantic labels and exposes bounded text/permalink candidates.
`page.facebookPost()` reads the post associated with a Facebook permalink;
`page.facebookPost({ expand: true })` may explicitly activate its local
"En voir plus" control before extraction. It never submits, reacts, or replies.

The Corse-Matin adapter (`browser-stdlib/adapters/corsematin.js`) provides territorial
media source extraction feeding the Corsica Cogentia Digital Twin (initially exposed
via Agent JHN). `page.corseMatinArticle()` normalizes visible article semantics
(precedence: JSON-LD `NewsArticle` > OpenGraph/meta > semantic DOM) into a canonical
article record (`provider`, `kind`, `canonicalUrl`, `headline`, `description`, `author`,
`publishedAt`, `modifiedAt`, `section`, `text`, `access`, `evidence`).
`page.corseMatinLinks()` discovers candidate article links on section and index pages.
The adapter follows a strict **no-bypass boundary**: it never circumvents paywalls,
never solves CAPTCHAs, and extracts no cookies or session secrets. When a paywall
or subscriber gate is active, it faithfully reports `access: "restricted"` with only
the currently accessible excerpt text.

`POST /control/connect` with `{"endpoint":"wss://host.example/ws"}` asks the
extension to switch its outbound bridge endpoint; localhost remains the
default. A hosted deployment must add authentication and instance binding
before exposing such an endpoint publicly.
`GET /resource/draft.txt` serves the
current local draft to page code when a use case needs to load it as a resource.
`GET /stdlib/navigation.js` serves the first functional page-navigation
stdlib (`window.__cogentiaNavigationAssistant`, version `0.1.0`).

When a draft is inserted, the assistant also copies that exact draft to the
local Windows clipboard. This is a convenience for an explicit later `Ctrl+V`;
it does not send or publish anything.

The resident TUI also provides `p`: it saves the current Windows clipboard in
`draft_out.txt`. `draft.txt` remains the input draft for insertion, while
`draft_out.txt` is an explicit capture of a pasted or copied result.

The resident journal retains 5,000 structured in-memory events (heartbeats
are not stored) and appends the same stream to
`.local/navigation-assistant-journal.jsonl` (gitignored; override with
`NAV_ASSIST_JOURNAL_PATH`, or `off` to disable). Sequence numbers continue
across `[r]` restart and a graceful `[q]` quit; the file is fsync'd on those
exits and compacted to the last 50,000 events (`NAV_ASSIST_JOURNAL_PERSIST`).
`GET /event-sequence` returns the ordered behavioural sequence; `e` writes
the same local snapshot to `navigation-event-sequence.json` for macro analysis. Page-focus events include an accessibility signature:
semantic role, accessible name, ARIA relationships and state, `data-testid`,
native field metadata, and meaningful ancestor roles. Unpacked extension
`1.0.14+` also records `click` (target signature, no coordinates) and
coalesced `fieldInput` (typing occurred, not the characters) from a content
script, without waiting for a TUI context probe. Reload the unpacked
extension after upgrading. Macro discovery should
prefer these semantic anchors over screen coordinates or volatile CSS classes.
In the TUI, `d` starts a manual demonstration and `f` ends it (`[` / `]` remain aliases; they are awkward on AZERTY). Afterwards `e`
exports precisely that marked interval (including its start/end markers) to
`navigation-event-sequence.json`; without markers, it exports the whole retained
sequence. Those brackets are scheduled to become **hints** for episode
detection rather than the exclusive cut used to build macros — see
[`research/navigation_assistant_episode_hints.md`](../research/navigation_assistant_episode_hints.md).
Whether a slice is worth turning into a macro is a separate, operator-activated
**judgment** (continuation, not a hidden model call in the TUI):
[`research/navigation_assistant_macro_opportunity.md`](../research/navigation_assistant_macro_opportunity.md),
schema [`schemas/navigation.macro-opportunity.v0.schema.json`](../schemas/navigation.macro-opportunity.v0.schema.json).
All endpoints are loopback-only.

## Hosted Browser (same protocol, later extension)

The assistant on the workstation talks to the **local** unpacked extension (`ws://127.0.0.1:8765`, the extension initiates). A small **gateway** on fracta2 (`navigation-assistant-gateway.js`, port 8776) sits on loopback plus the Tailscale address only. The hosted extension connects to `ws://127.0.0.1:8776/extension` **before any assistant is present**; the TUI then joins `ws://fracta2:8776/assistant` (override with `NAV_ASSIST_GATEWAY`). Locally the same hold lives in Operium Node Agent on `:8765`; the TUI joins `ws://127.0.0.1:8765/assistant` when that process already owns the port. Keys `[l]` / `[h]` choose local vs hosted. URLs stay redacted unless `NAV_ASSIST_SHOW_LOCATION=1`. Do not publish 8776 on the public Internet.

## Safety boundary

The POC never clicks **Send** or **Publish**, never extracts cookies or session
data, and refuses insertion unless the active page element is an input,
textarea, or contenteditable field. The operator remains responsible for
reviewing and submitting the final text. Context output is bounded to 12,000
characters and is only produced by an explicit command.

The durable protection is the Cogentia **Mandated Agent** boundary: each future
macro or Agent John request must carry an explicit capability and mandate, and
child actions may only attenuate that authority. The local assistant is a
projection of that mandate, not an independent authority. Optimistic locking
also prevents an action from applying to a page or field that changed after it
was observed.

### 2026-11-01 — Outbound multi-browser inventory and no-focus tab selection (pilot)

The extension **always dials out**; it never listens. `browser-extension/endpoint.json`
now accepts `browser_instance_id` in addition to `endpoint`. The default local
configuration identifies `thinkpad-chrome` and `endpoint.hosted.json` identifies
`fracta2-hosted` when installed as `endpoint.json` in the hosted browser's own
extension directory. They are routing labels, not distinct human Principals:
Agent John operates on behalf of the same Principal across both browsers.
An instance announces itself with `browser.register` on each connection.

The gateway's `browser.instances` RPC lists connected browser instance labels.
`tabs.list` can target a given `browser_instance_id` and enumerates all tabs in
all windows of that browser. `page.evaluate` / `page.insertText` accept integer
`tabId` to address a specific tab without changing the active tab or window.
Optionally pass `expectedUrl` to reject a stale target. Omit `tabId` only for
legacy single-active-tab use. RPC IDs are remapped end-to-end to isolate clients;
when more than one browser is connected, uncategorized commands are rejected.

**Operator recipe (not performed automatically):** sync each installation to
version 1.0.15, verify its `endpoint.json` before reloading the unpacked
extension at `chrome://extensions`. On the hosted account, install
`endpoint.hosted.json` as `endpoint.json` rather than using the ThinkPad default.
The hosted browser account and service use a separate filesystem checkout;
changing `/srv/cogentia/repos/cogentia` does not update that installation.
Do not restart the live gateway with an unverified checkout; confirm the new
code, then restart it under the owner account's existing operational control.
Once loaded, test `browser.instances`, per-browser `tabs.list`, a harmless
synthetic web tab addressed by `tabId` while another tab is active, a wrong
`expectedUrl`, a brief disconnect and worker recovery. Do not use a protected
site as a test target. Never infer that the current user's ChatGPT tab is
accessible merely because the extension exists; the Browser host has explicitly
blocked access to `chatgpt.com` in this session.

The 30-second alarm and bounded jitter support retries after MV3 worker
suspension; browser/computer sleep and certain network faults still require
live verification. This remains a single-Principal pilot, with scoped
subscriptions and leases pending in #291.

#### ThinkPad connection to the common Fracta2 gateway (opt-in pilot)

The ordinary ThinkPad `endpoint.json` continues to point to the **local**
Operium bridge `ws://127.0.0.1:8765/ws`. This does **not** participate in the
Fracta2 gateway's multi-browser inventory. To test both browsers together,
choose the separate `endpoint.thinkpad-gateway.json` template as the **active**
`endpoint.json` for the ThinkPad extension and establish a private SSH local
port forward (PowerShell, while the test is running):

```powershell
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18776:127.0.0.1:8776 fracta2
```

This leaves port 8765 for Operium's existing local bridge; the SSH forward
connects local 18776 to Fracta2 loopback 8776. `browser_instance_id` remains
`thinkpad-chrome`, whereas the hosted browser should use `fracta2-hosted`.
Only use this mode **after** the separately maintained hosted gateway checkout
has been updated and its service safely reloaded; the older gateway does not
implement `browser.instances` or isolated multi-browser routing. The extension
only supports one configured outbound endpoint at a time. Return to the local
mode by restoring the default `endpoint.json` and reloading the extension.

This is a private connectivity recipe, **not** permission to read prohibited
browser pages or bypass provider-specific host restrictions.

#### Recommended ThinkPad permanent connection (direct Tailscale)

**Preferred over a long-lived SSH terminal/tunnel:** the gateway already binds
`100.84.109.87:8776` on Fracta2's Tailscale interface. The Chrome extension
initiates the WebSocket directly on Tailscale, without opening any inbound
listener on the laptop. The unpacked extension's `manifest.json` version
`1.0.16` explicitly permits `ws://100.84.109.87:8776` in its CSP, and
`endpoint.thinkpad-tailscale.json` specifies the instance ID `thinkpad-chrome`.

On the ThinkPad: fetch the revision, copy
`browser-extension/endpoint.thinkpad-tailscale.json` to
`browser-extension/endpoint.json`, reload the unpacked extension from
`chrome://extensions`; verify with `Test-NetConnection 100.84.109.87 -Port
8776`. Only when the gateway confirms `thinkpad-chrome` registered, close the
old `ssh -N -L ...` terminal. The local Operium port 8765 remains unchanged.

On Windows, verify the **Tailscale service** starts automatically and Chrome
reopens after login; the extension cannot connect while Chrome is closed or
the laptop is asleep, but reconnects on revival. This requires no new Windows
startup task or permanent SSH process. The specific Tailscale address is
currently `100.84.109.87`; if this node is re-enrolled/readdressed, the
endpoint must be updated (MagicDNS can be a later improvement).

Security: `ws://` is unencrypted WebSocket framing *inside encrypted Tailscale*
transport, not a public ws endpoint. The gateway listens only on loopback and
Tailscale; do not allow the corresponding port from the public Internet. Tailscale
network membership is not by itself a fine-grained mandate: continue to enforce
John's normal action permissions and make no attempts to access host-restricted
browser pages.

### Scoped event subscriptions and cooperative tab leases (gateway pilot)

The shared gateway supports selective event subscriptions per assistant WebSocket:

- `events.subscribe` with `{browser_instance_id, methods?: ["page.navigationCompleted", ...], tabIds?: [tabId, ...]}`. A missing method filter means all `page.*` events, while an omitted tab filter covers any tab of that browser. At most 32 subscriptions per connection; a filtered notification includes its `browser_instance_id` and is never copied to unrelated assistant connections.
- `events.unsubscribeAll` removes the connection's subscriptions. Disconnecting also removes them.
- `tabs.lease.acquire` with `{browser_instance_id, tabId, ttlMs?: 30000}` acquires or renews a tab lease for the assistant connection. Duration 1–120 seconds. `tabs.lease.release` relinquishes it. Conflicts return JSON-RPC error `-32026`. Leases expire automatically on lookup and are removed on owner or browser disconnection.
- An active lease blocks `page.evaluate`, `page.insertText`, `tabs.activate` and `tabs.close` **when the competing command explicitly contains the same `tabId`**. Legacy commands without an explicit `tabId` are not protected yet, nor are operations implemented by other APIs. These are cooperative coordination leases **not** a security boundary or an authorization grant. They do not supersede the Principal's existing mandated-action checks.

The `scripts/check-navigation-gateway-isolation.js` regression exercises two
extensions and two assistants, event subscription by browser/method/tab,
unsubscription, tab lease conflict and release, and response correlation.
These are tests against an ephemeral gateway, **not** evidence that the live
8776 service has been updated. Deploy the gateway code only after synchronizing
the separately owned hosted checkout, with operator-controlled systemd restart.

### 2026-11-01 — Agent John coordination sessions

The gateway rejects implicit-target `page.evaluate`, `page.insertText`, `tabs.activate` and `tabs.close` with `-32027` when any lease for the selected browser is active. Explicit `tabId` commands still reject a conflicting owner's lease (`-32026`). This blocks the historical active-tab bypass during a lease; leases are still cooperative, not a mandate or strict security boundary.

`scripts/lib/navigation-assistant/gateway-session.js` adds a correlated WebSocket session with `call()` and `withTabLease()` (acquire/operate/release on the same socket). Agent John's capability catalogue adds `browser.navigation.instances` (read-only instance IDs) and `browser.navigation.coordination` (bounded lease, optionally tab metadata only, URL redacted to origin by default). Historical `browser.hosted.*` now explicitly target `fracta2-hosted` in the multi-browser gateway. Sensitive insert/evaluate calls require `tab_id`; existing capability risk classifications remain.

Extension 1.0.17 verifies the target URL a second time after debugger attachment and before CDP execution. This is an optimistic URL guard, not a full navigation-epoch lock. Both unpacked browser extensions need manual reload and the separately maintained gateway checkout needs its normal owner-controlled update. None of these changes is yet deployed in the live 8776 service. Test: `node scripts/check-navigation-john-session.js` plus existing navigation suites.

### 2026-11-01 — MCP Agent John: internal budget and target checks

The MCP adapter includes `browser.navigation.coordination` among bounded
internal-recoverable effects **only** for resolved John callers that explicitly
request this allowed capability with exposure `bounded` or `consequential`.
It defaults to at most two internal effects when no caller budget is specified,
and respects an explicit zero budget. It does not authorize a new Principal or
increase external-write permissions. The hosted `inspect(context)` and
`evaluate` capabilities require `tab_id`; they fail before opening a browser
connection if the target is absent. These are compatibility safeguards for the
shared multi-browser gateway and do not bypass the host's restrictions on
ChatGPT page access.

Live gateway event test: a temporary inactive `https://example.org/` tab
produced one `page.navigationCompleted` notification at the subscribed
assistant; a second un-subscribed assistant received none. Test tab was closed,
and no page content was read. The MCP process is a separate `mcp-cogentia`
service with ExecStart rooted in `/srv/cogentia/repos/cogentia`; it must be
restarted through existing operator control to load new JavaScript modules.

### 2026-11-01 — COP delegated read-only inventory smoke test

`node scripts/check-navigation-john-cop.js` drives the actual `runJohnRequest`
COP/governed harness through `browser.navigation.instances`, contacting the
live shared gateway **without reading tabs**. The test intentionally uses an
isolated, nonproduction JHN token fixture to verify resolution and an
unverified caller to verify denial. It asserts the authorized capability
receipt, `john.accounting.settled`, `john.run.completed` and Ithaca return;
it also asserts an unauthorized capability request yields
`not_in_authorization_envelope` and **no** `john.tool.receipt`.

This test is an integrated *fixture*, not proof that a live production MCP
caller is authorized. Separately, an actual call to the live Cogentia MCP
`cogentia_john_run` using `mock.echo` returned a canonical COP packet,
accounting (zero effects), and Ithaca; `mock.echo` does not exercise the browser.
A true production-authorized agent invocation requires an existing resolved
JHN caller, a granted capability and normal bounded execution. Never forge
production claims or copy service credentials into the test or Git repository.

### 2026-11-01 — Production `cogentia_john_run` no longer silently mocks

When an MCP caller requests an explicit executable capability and omits the
handler, `cogentia_john_run` now chooses `capability_once` instead of `mock.echo`.
This deterministic governed handler calls **exactly one** real `read_only`
capability by its exact name, using `request.input.arguments` (if supplied),
then returns the actual JSON observation. It follows the existing capability
registry, caller auth, mandate envelope, step and tool budgets, COP receipts,
and Ithaca return. Non-read-only capabilities cannot use this handler. Denied
or failed calls produce a failed run; they never yield a fabricated success.

An MCP caller with neither an explicit handler nor a named executable
capability now gets an error instead of a deceptively successful mock result.
`mock.echo` remains explicitly selectable for isolated compatibility tests,
never an implicit production fallback. To exercise the new path, the normal
JHN-authenticated client may request `capability=browser.navigation.instances`
with a read-only budget and no handler. A non-JHN client does not get the
private browser capability. The test `node scripts/check-navigation-john-cop.js`
now verifies `capability_once` against the live gateway using **fixture auth**,
including a denial case with zero execution receipts. Production MCP requires
restarting its process to load this change; no browser service restart needed.

### 2026-11-01 — Production-authenticated JHN positive probe

The live MCP `initialize` advertises `jhn_mutate_configured=yes`, but this
shell channel does not have JHN production credentials or mandate references.
Never copy the MCP service token from systemd/proc/env files or impersonate an
agent to produce a positive result. A separate **opt-in, fail-closed** probe is
available: `npm run test:navigation-john-production`. It only operates when
invoked inside an already authorized JHN execution context with its native
`COGENTIA_MCP_JHN_TOKEN` and `COGENTIA_JHN_MANDATE_REF`; it only connects to
`127.0.0.1:8791/mcp`, requests `browser.navigation.instances` (no tab access),
and checks the actual MCP/COP receipt, settlement, one tool call, zero external
effects and Ithaca return. It prints no secrets and will exit 2 (`NOT_RUN`)
without credentials. A successful fixture test **is not** a production JHN
positive. The CLI does not elevate authority or alter MCP settings.

### 2026-11-01 — One-shot JHN production proof without broadening the WhatsApp daemon

On Fracta2, `mcp-cogentia.service` already has an `EnvironmentFile` for the
production JHN MCP attestation, whereas `agent-john-whatsapp.service` does
**not**. Avoid adding the powerful shared MCP token to the long-running
WhatsApp process solely to run a read-only verification. The authorized
operator can instead run a transient, self-collecting **one-shot** unit:

```bash
sudo systemd-run --unit=cogentia-jhn-nav-probe --wait --collect --pipe \
  -p User=ubuntu \
  -p WorkingDirectory=/srv/cogentia/repos/cogentia \
  -p EnvironmentFile=/srv/cogentia/secrets/jhn-mcp.env \
  /usr/local/node-v26.5.0/bin/node \
  scripts/check-navigation-john-production.js
```

This must be invoked by the operator under the existing mandate; the env file
must already exist and contain the matching JHN token. The script uses the
canonical `MANDATE_ID` and `PRINCIPAL_ID` defined by Agent John, acts as the
explicit technical `agent:jhn/handler:navigation-probe`, calls **only**
`browser.navigation.instances` through the local MCP, and checks the COP
receipt, accounting and principal/mandate association. It does not inspect
pages, print tokens, modify browser state, or install a persistent systemd
service. A missing credential makes the run fail closed. The output of this
one-shot proves an authenticated *operator-invoked delegated test*, not that
the permanent WhatsApp daemon itself invoked the MCP, and not that broader
interactive navigation permissions are authorized. Never use `set -x` to
expose the command environment, or pass a token as an argument.
