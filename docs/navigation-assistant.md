---
title: "Navigation Assistant — local Brave and hosted browser operations"
author: unknown
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-07"
last_modified_at: "2026-11-27"
status: working-paper
license: MIT
language: en
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/navigation-assistant.md
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: edaf9f3271f6f24fc146b79642fd2a19de153662
  origin_date: "2026-09-07"
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
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

For identity-aware structure inspection, the Core now projects a reviewed site
role such as `facebook.comment-composer` (not the personalized label). Use
`browser.hosted.inspect` with `action: structure`, the exact URL, instance/tab
and `include_element_identity: true`. The ordinary UID-bound
`browser.form.fill` may carry that `semantic_role` and the existing
`field_kind: contenteditable`; the role is rechecked on the same element
before editing, without submitting. The default site-role
`prepareFormAssistRequest` planner uses the composed, pinned Inox runtime
and returns the existing John request, still requiring canonical admission.
The shared recognition function lives in `browser-stdlib/adapters/facebook-editor.js`.
The old TUI adapter is assembled with this function, not maintained as a
second recognition implementation. New sites extend the same role library,
not the extension protocol.

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

## Credential lookup and fill: trusted capability boundary (2026-11-07)

The browser has a non-secret `browser.form.fill` primitive; it **must not** be used for passwords, OTPs, bank data or vault-backed secrets. `scripts/lib/browser-credential-capabilities.js` introduces a *fixture-tested, fail-closed foundation*, not a production-enabled connector:

- `credential.lookup` returns only a bounded reference, exact HTTPS origin and available field names (`username`, `password`). No secret bytes or masked value are returned.
- `credential.fill` accepts only `browser_instance_id`, `tab_id`, `expected_origin`, `credential_ref`, `field`. It requires verified COP actor/principal/mandate and effect authorization plus budget reservation. The trusted vault callback transfers the value to a trusted browser adapter **without passing through the language model**, and exposes a redacted result only after a matching insertion receipt; no submit, navigation, OTP or payment capability.
- Both operations fail closed if independent authority verification or vault/browser adapters are missing. They are **not yet registered as callable JHN/MCP capabilities** and no production vault, secret delivery bridge, issuer verification or end-to-end evidence adapter has been connected. Fixture tests do not establish readiness or permission to use secrets.

Integration prerequisites: an audited `authorize()` adapter calling the canonical COP issuer/grant/budget validation, a per-Principal `vault.describe`/`vault.withSecret` adapter with server-held secrets, a trusted `browser.fillSecret` operation that rechecks the *actual* browser instance, top-level document URL and field type immediately before injection, and account-specific access controls. Sensitive return values and thrown errors must be redacted inside those trusted adapters; the generic WebSocket `page.evaluate`, `page.form.fill`, `page.insertText` and agent-provided scripting APIs **are not approved secret conduits**. A full implementation also requires reliable navigation-race rejection, per-origin allowlisting, bounded effect receipt and revocation/settlement, as well as adversarial non-disclosure tests. This is a capability development step only; it confers neither authentication nor transaction authority.

Fixture test: `node scripts/lib/browser-credential-capabilities.test.js`.

### Trust-directory binding for Principal JHN and FractaNodes — 2026-11-07

Read-only live Supabase inventory (project *JHN*, metadata-only, **no decrypted secrets or credential values accessed**) found `public.instances`, `public.instance_config`, `public.cop_nodes`, `public.cop_mandates` and `vault.secrets`. At audit time the `jhn` instance had a `NULL principal_id`; `cop_nodes` and `cop_mandates` had no records. This is **not** an authenticated principal-to-node-to-mandate chain. SSH/Tailscale connectivity authenticates, at most, a technical endpoint according to its key trust policy: it does **not** prove the human Principal, ownership of a Supabase project, permission to decrypt a secret or COP grant to use it.

Implemented as explicitly injectable server-side modules:

- `browser-supabase-trust-directory.js`: read-only, narrowly selected Supabase `instances` and `cop_nodes` metadata, matching a previously authenticated Principal UUID to an active instance and an operator-pinned node identity. It never selects `instance_config.value`, `vault.secrets`, `vault.decrypted_secrets` or a credential field. The service key must remain exclusively server-side. No instance or node record is created by a lookup.
- `browser-credential-bound-authority.js`: requires **independent** verified Principal authentication and node attestation (node identity is operator-pinned to a browser instance); then a directory match; then an independent canonical COP issuer, mandate, exact browser-instance/tab/origin/credential/field grant with effect authorization and actual budget reservation for `fill`. Missing any element fails closed, even if an SSH connection succeeds.
- `browser-credential-composition.js`: composes this trust binding with the existing metadata-only lookup / trusted fill interface; it does not register agent-visible production tools or create credentials. `browser-credential-capabilities.js` now also rejects vault metadata belonging to a different Principal from the verified COP grant.
- `digital-twin-engine.js`: hardens the legacy Supabase manifest projection: only `is_public=true`, `is_secret=false`, allowlisted metadata keys, and a pinned Supabase instance UUID may enter a model-visible manifest. Without a pinned instance UUID it falls back to a local manifest rather than reading a cross-instance/unscoped `instance_config` table. This corrects a pre-existing potential secret-projection channel.

**Remaining before any real credential fill:** prove Principal identity with a verified auth session or offline issuer signature and bind it to a specific instance; securely enroll/attest the Fracta2 and ThinkPad node keys (SSH host-key possession alone is insufficient); issue an appropriate COP mandate and effect budget through the genuine Principal-controlled issuer; implement server-side vault secret access with least privilege; implement a dedicated trusted browser secret sink (never generic extension RPC, `page.evaluate`, or model-facing text) with atomic target checks, race rejection, redacted receipt, cancellation and settlement. Each requires separate Reality Tests. A Secret Vault key or Supabase `service_role` is technical access only, never proof of the Principal's legal or operational authority. Do not activate production simply because fixtures pass.

Tests: `node scripts/lib/browser-supabase-trust-directory.test.js`, `node scripts/lib/browser-credential-bound-authority.test.js`, `node scripts/lib/browser-credential-composition.test.js`, `node scripts/lib/browser-credential-capabilities.test.js`, `node scripts/lib/digital-twin-instance-public-projection.test.js`.

## 2026-11-22 — Generic contenteditable and governed file inputs (Core only)

Following the audio-video publication of *La Marche du Soleil* on YouTube,
the Navigation Assistant supports two site-neutral operations without changing
the already installed extension:

- **Rich text:** the existing COP-admitted 'browser.form.fill' accepts
  'field_kind: "contenteditable"' in addition to its previous plain input
  contract. It uses the existing 'page.evaluate' transport with a
  Core-compiled recipe. 'tab_id', 'field_index' and exact 'expected_url' bind
  the intended field; the recipe focuses and replaces its entire contents,
  verifies the replacement, and never submits the form. The bounded canonical
  form envelope accepts this *explicit* field kind, while rejecting all
  unspecified extensions (passwords, file input and other sensitive types
  remain excluded). The default native input path is unchanged.
- **File input:** the new capability 'browser.form.upload' is **not** an
  extension message. It uses the existing Core 'createHostedFrameTransport'
  to correlate the Navigation Assistant tab with its CDP target and hold a
  tab lease; it selects the numbered native 'input[type=file]' by
  'DOM.setFileInputFiles'. The selected local path must resolve to an ordinary
  nonempty file strictly inside an operator-configured allowlist of roots,
  'COGENTIA_BROWSER_UPLOAD_ROOTS' (Linux path-delimited absolute directories)
  or the injected 'uploadRoots' capability configuration. Symlinks escaping
  these roots are rejected; files are limited to 300 MiB. No roots configured
  means no upload is permitted. Receipts contain no file path or file contents.

**Effect boundary:** selecting a file may instantly start a remote upload, so
'browser.form.upload' has 'risk: external_write', *not*
'internal_recoverable'. Unlike plain text entry, its invocation requires
the corresponding independent COP mandate, explicit target and file
authorization and external-effect accounting. In particular, permission to
fill a form, or an older 'browser.form.fill' mandate, **does not** grant file
upload or publication. The tool does not click Submit/Publish; its receipt
reports 'upload_completion: unverified', because the site may continue
processing the file asynchronously.

**Examples of semantic inputs (no credentials):**

    browser.form.fill:
      tab_id: 42
      expected_url: https://example.org/editor
      field_index: 0
      field_kind: contenteditable
      text: "Texte public à insérer"

    browser.form.upload:
      tab_id: 42
      expected_url: https://example.org/editor
      file_index: 0
      file_path: /absolute/approved/artifacts/episode.mp4

**Validation:** Node fixture tests cover selection and replacement,
Unicode/multiline preservation, refusal of noneditable/sensitive targets,
tab/URL guards, allowed path and symlink enforcement, disabled fields and
redacted receipts. Real Chromium Reality Tests on Fracta2 used temporary
*inactive* tabs at https://example.org/, inserted a synthetic editor
and an inert file input and confirmed both operations. A native file
'change' event was observed; no form was submitted. Both temporary tabs and
their upload fixture were removed.

This section describes implemented Core source and bounded live probes; it
does **not** by itself imply that a running agent service has loaded the new
commit, that its runtime upload roots are configured, or that the separate
COP upload mandate has been issued.


## 2026-11-27 — Document-local element identity and multi-engine reality tests

Packet [Cogentia #349](https://github.com/JeanHuguesRobert/cogentia/issues/349)
extends the existing semantic capabilities, not the extension RPC catalogue.
The standard library has a document-local object UID registry (WeakMap,
WeakRef and a document epoch). A UID is not a durable selector or an
authorization.

The source-level top-document contract is opt-in:
`browser.hosted.inspect` with `action: "structure"`,
`include_element_identity: true`, explicit `tab_id` and exact HTTPS
`expected_url` returns an `element_target` for each observed control.
The target binds browser instance, tab, frame ("top"), document epoch and UID.
Pass it to the existing `browser.form.fill` instead of `field_index`.
The existing COP admission, non-secret field rules and tab lease remain in
force. A stale target is refused without selecting another control by index.
The receipt contains target identity and insertion length, not text.

For real Firefox, the reusable Core BiDi frame evaluator
(`scripts/lib/browser-frame-bidi-evaluate.js`) binds a child browsing context
to the selected root context, exact top URL and expected frame origin, then
pins the actual named-sandbox realm for execution. It rechecks the frame
and realm after dispatch and does not retry an unconfirmed effect.
The common UID and fill recipes run in that realm, including in cross-origin
frames. This is backend-level evidence; the public hosted capability and
canonical COP argument gate remain top-document-only for UID targets pending
frame integration. The existing Chromium frame route is unchanged.

Reproduce with `node scripts/check-browser-worker-context-reality.js --firefox`
or `--chromium`. The Firefox 158.0.1 run on Fracta2 uses real browser
contexts, the actual navigation gateway and a disposable fixture transport.
It passes top-document UID fill and stale refusal, assistant reconnection,
cross-origin frame UID fill, wrong-root/origin refusal, clone replacement
and frame reload invalidation. Chromium remains blocked at launch by the
sandbox issue tracked in [#285](https://github.com/JeanHuguesRobert/cogentia/issues/285).
This is not an installed Firefox extension or a production deployment.


### Managed BiDi provider — I3 source increment

The foreground provider can attach to an explicitly started Firefox with
a loopback WebDriver BiDi endpoint and to the existing trusted gateway:

```sh
node scripts/ops/navigation-assistant-bidi.js \
  --bidi-endpoint ws://127.0.0.1:PORT/session \
  --gateway ws://HOST:8776/extension
```

No default browser or profile is selected. The provider creates a session,
registers a session-scoped browser instance, and advertises only `tabs.list`
and `page.evaluate` via the existing `browser.instances` discovery. Numeric
tab IDs remain associated with actual top-level BiDi contexts; retired IDs
are not reused. It does not infer an active tab or collect titles.
Evaluation requires an explicit tab, checks the URL, pins the actual realm,
and verifies the receipt. An expected URL, when supplied, must match exactly.
The existing gateway leases and upstream COP admission remain authoritative.
Unsupported methods are rejected, not forwarded to another browser.

The reusable provider preserves its instance ID and tab mapping when its
gateway peer reconnects to the same live engine session. A lost BiDi session
retires the provider; a new session gets a different instance ID. There is
no automatic reconnect or replay of uncertain effects. The foreground CLI
exits on disconnection; no service installation is implied.

Reality test on Fracta2: Firefox 158.0.1 and the real gateway discover the
managed provider, locate and invoke the existing Worker, observe and fill a
DOM UID, reconnect the provider while retaining live targets, reject a
retired tab ID, and remove the provider after engine disconnection.
The installed Chromium extension's protocol and legacy registration are
unchanged. The next increment below adds managed frame routing.

### Managed frame routing — I3 second increment

The existing `browser.hosted.inspect` now accepts an explicit
`browser_instance_id` discovered with `browser.navigation.instances`.
The configured Chromium route remains the default; a non-default instance
must identify a registered managed Firefox BiDi provider. Missing or
unsupported instances are rejected, never substituted.

The managed provider advertises `page.frameTree` in addition to its existing
gateway methods. It projects the bounded frame tree without URL paths or
queries. The existing `frame_tree` and `frame_structure` inspection actions
use that provider, with a tab lease, exact top URL, explicit child context,
and exact frame origin. Set `include_element_identity: true` on
`frame_structure` to receive the document-local UID target.

The existing `browser.form.fill` accepts the explicit instance, the UID
target, exact top URL and (for a child frame) exact expected frame origin.
No index fallback or new MCP tool. The caller cannot mix an index and a UID;
the instance and tab must match the observed target. The same canonical
form envelope and signed mandate verification remain required. Only the
managed Firefox route accepts frame UID targets in this increment. The
legacy Chromium paths, upload and other interaction capabilities are
unchanged. Provider metadata is routing information, not a grant.

The Firefox reality fixture uses two loopback HTTPS origins, a temporary
CA and leaf certificate generated by OpenSSL, and certutil to trust that
CA only inside the disposable NSS profile. It exercises the actual hosted
capability, provider, gateway, realm and John bounded runner; denial
without the trusted runner option, one internal effect on admitted fill,
wrong-instance/origin refusal, stale UID refusal and parent isolation.
No production signing key or mandate is exercised. The fixture needs
OpenSSL and certutil; no application dependency or system trust store
change is required. The temporary profile is removed.


### Programmable composition and navigation — I3 third increment

The disposable Firefox reality fixture now runs an Alan program through
the existing MultiMCP runtime, COP bridge, SQLite packet source and
scheduler. The fixture MCP catalog exposes the actual semantic capability
descriptors; its two admitted reads call the real hosted capabilities.
The governed fill suspends before execution. The fixture independently
dispatches the bounded John runner and records the observed, redacted
receipt and accounting in the temporary packet source. A fixture-only
verifier accepts the matching receipt; forged returns fail. Recovery of
the scheduler preserves the suspended or completed packet without
replaying the reads or effect. This proves the composition mechanics,
not a production mandate or a production browser CPS verifier. Alan
currently declares the effect conservatively as P3 private-data access
because its effect vocabulary has no internal-recoverable literal.

The managed provider also implements the existing gateway methods
`tabs.create`, `tabs.activate` and `tabs.close`. Select an explicit
discovered Firefox instance in `browser.hosted.interact`; the managed
activation/close routes require the exact current URL and tab lease.
Opening creates a fresh tab and navigates it; the receipt reports the
observed destination (including redirects). Uncertain operations are
not replayed or silently compensated. The legacy Chromium path is unchanged.

BiDi events for already inventoried top-level contexts are projected onto
the existing `page.navigationStarted`, `page.navigationCompleted` and
`page.tabRemoved` notifications. The gateway preserves instance/tab
subscription filtering; `createGatewaySession().onEvent(listener)`
receives subscribed notifications. No iframe events, historical replay,
or event persistence is implied. Reconnecting a provider does not
re-subscribe the same engine session. Native focused text insertion and
file upload are not yet routed to Firefox.


### Native input and file selection — I3 fourth increment

The managed provider now advertises the existing `page.insertText` RPC,
selected through `browser.hosted.interact` with an explicit Firefox
instance, tab and exact HTTPS URL under the existing lease. The BiDi
implementation sends native keyDown/keyUp pairs, not a DOM value setter.
It pins the initially focused ordinary top-document input or textarea in
its actual realm and checks focus, value and caret before each character
and after dispatch. A site-driven focus change stops the remaining keys;
a partial insertion is an unconfirmed effect, not a reason to replay.
This first bounded variant accepts at most 128 Unicode scalars and excludes
control, WebDriver private-use, format and combining characters. It does
not claim parity with CDP's arbitrary text insertion or contenteditable.
The Firefox reality test verifies trusted input events, Unicode, tab
isolation and interruption on focus redirection.

The local BiDi file-selection backend uses the shared native node reference
with `input.setFiles`, then verifies the same node/realm, one selected file,
expected size and actual byte readability. The existing generic upload
capability can accept a host-injected selector while retaining the exact
same allowed-root, realpath, size and redacted-receipt checks. The real
Firefox fixture uses only a synthetic local file and a tab lease, never
sends it over the network, and verifies its contents and change event.

The production upload capability remains CDP-backed: its signed policy
explicitly names `fracta2-hosted`, not a dynamically discovered Firefox
instance. No new gateway file-path primitive, signed policy amendment,
production grant or deployment is introduced. A future operational
extension requires explicit instance and file locality binding within
the existing COP authority, not a bypass or silent substitution.


### I4 — graphical hosted Firefox reality and integration boundary

Run `node scripts/check-firefox-hosted-graphical-reality.js` on a
FractaNode with KasmVNC, Openbox, Firefox, xauth and OpenSSL installed.
The test allocates a new display via Xvnc's displayfd, a temporary
Xauthority, KasmVNC credential and TLS certificate, an isolated home,
a new Firefox profile and a loopback-only gateway. It never kills
existing displays or reads personal browser profiles. KasmVNC's web
root is explicit (`/usr/share/kasmvnc/www` on the tested package);
Firefox's headless environment variable is removed, not set to "0".

Verified on Fracta2: unauthenticated HTTPS returns 401, authenticated
HTTPS returns 200 with certificate validation, listener is loopback,
an actual Firefox window is visible in the X11 tree, the independent
`navigation-assistant-bidi.js` CLI registers and drives hosted
inspection, stopping the CLI retires the instance without closing
Firefox, and temporary profile/credentials are removed. This is not
an interactive remote framebuffer or public router acceptance test.
The earlier headless Reality Test remains the evidence for DOM UID,
frames, events, composition and native input.

Production placement belongs to
[Operium's Hosted Browser architecture](https://github.com/JeanHuguesRobert/operium/blob/main/docs/hosted-browser-kasmvnc-cdp.md).
Its current launcher, supervisor, URL-opening and restart helpers are
Chromium-specific; setting only the Firefox binary would be incorrect.
The live gateway inventory on 2026-11-27 contained legacy registrations
only; managed provider support in the deployed executable was not
verified. No production workspace was changed.

Proposed first dogfooding placement: a separate Firefox profile in the
existing operator's hosted graphical workspace, without replacing the
default Chromium profile or starting another VNC/router control plane.
Validate available memory, same-Unix-user provider lifecycle, unique
loopback BiDi endpoint, trusted gateway deployment and explicit instance
discovery. Keep the provider foreground/supervised; a lost engine
session must generate a new instance identity, never replay effects.
Do not use a shared loopback port as proof of Unix-user isolation.
The existing network authentication, workspace policy, Operium
deployment procedure and signed COP permissions remain authoritative.
An actual authenticated VNC framebuffer interaction and recovery
test, then explicit bounded dogfooding, are the next acceptance steps.


### I4 — managed graphical companion and explicit activation

The source-level owner-facing companion is
`scripts/ops/navigation-assistant-firefox.js`. It runs in the foreground
as the selected unprivileged graphical workspace user. It requires
explicit X11 DISPLAY/XAUTHORITY, an absolute private directory owned by
that user, an explicitly selected new profile, and the local gateway.
It never chooses an existing default browser profile. The invocation is:

```sh
node scripts/ops/navigation-assistant-firefox.js \
  --profile-dir "$HOME/.hosted-browser/firefox-managed" \
  --gateway ws://127.0.0.1:8776/extension
```

The private parent must already exist. On subsequent intentional starts,
add `--reuse-managed-profile`; only a profile marked by the companion
and owned by the caller is admitted. The sibling launch lock excludes
concurrent starts. Never remove Firefox's own profile locks or clear
an uncertain companion lock automatically. No profile content is
copied from another browser.

Before creating any profile or browser the companion checks the existing
`browser.instances` reply for `managed_provider_registration: 1`.
This additive reply field is independent of how many providers are
registered. Legacy gateways refuse the preflight without browser effects.
The companion starts Firefox with a dynamic loopback BiDi port, verifies
its provider descriptor from the gateway, and remains foreground.
Gateway/provider loss leaves the graphical browser available to the
human, without automatic reconnect or replay. An explicit stop closes
the provider and requests native `browser.close`; an unconfirmed
graceful close is reported, and only the owned browser process group
can be terminated by the companion. The profile survives normal stop
and the next session obtains a new browser instance ID.

The graphical reality fixture now verifies rejection of a legacy
gateway, exclusion of concurrent launch, a persistent localStorage
marker after native close and restart, fresh instance identity,
and preservation of the window on gateway loss. It additionally
opens the KasmVNC TLS WebSocket with its synthetic credentials and
validates the RFB version greeting; the unauthenticated upgrade
is refused with HTTP 401. This does not yet prove full framebuffer
decoding or remote pointer/keyboard interaction.

Read-only live observation (2026-11-27) showed that neither the hosted
gateway (:8776) nor ONA's local gateway (:8765) advertised the new
preflight marker. Hosted gateway and ONA are separate services.
The existing owner-delegated service.deploy descriptors cover MCP and
ONA, not the hosted gateway, which runs as its dedicated workspace
Unix user. Do not reuse the ONA delegation for the hosted gateway.
For actual dogfooding, Operium must first stage the exact published
gateway revision with its pinned runtime and existing execution
identity; verify old extension compatibility and active leases, obtain
the node owner's explicit deployment authority, replace only the
gateway service through the reviewed deployment path, and verify
health, the marker, and reconnection of the previous instances.
Then the workspace owner can explicitly launch the companion in
the existing X11 workspace. A successful source test is not
authorization or evidence of that production migration.


### I4 — versioned gateway release preparation

The hosted gateway uses a different Unix identity from the MCP and ONA
services. Do not add it to the current Ubuntu-role deployment descriptors:
their agent-writable release tree would then allow code from one account
to execute as the hosted workspace account. Reuse the existing versioned
release, baseline, receipt and rollback conventions, not that delegation.

Prepare an exact published Git revision in ordinary Unix context:

```sh
mkdir -m 700 PRIVATE_STAGING_DIRECTORY
node scripts/ops/prepare-navigation-gateway-release.js FULL_COMMIT PRIVATE_STAGING_DIRECTORY
```

This produces a gateway-only archive with its revision, source hash,
minimal module manifest and the exact ws tarball from the committed lock.
The cached npm tarball is checked against its SHA-512 integrity before
extraction, with no lifecycle scripts or new dependency. The archive
SHA-256 is the transfer checksum, not evidence of owner approval.
Extract the checked archive in a fresh private temporary directory as
the ordinary preparation user and run
`node scripts/check-navigation-gateway-release.js EXTRACTED_RELEASE`.
This tests legacy and managed registration/routing and a restart/reconnect
fixture, without touching the actual gateway.

For the first live migration, Operium and the node owner must review the
exact release artifact and the old unit, retain the existing service
identity and environment, and stage the reviewed tree under a root-owned,
non-agent-writable release base (for example
`/opt/operium/releases/navigation-assistant-gateway/FULL_COMMIT`).
Transfer and verify the reviewed archive hash in a private owner stage
before extracting without inherited ownership. Ensure all installed
files and ancestor directories are non-writable by the agent and hosted
workspace user; the node owner, not the Ubuntu-role broker, controls
publication of executable releases. Do not execute the archive as root.
A minimal service drop-in can select the pinned working directory and
fixed Node entrypoint while preserving the existing user, group, port and
mesh routing. Verify effective configuration and unprivileged runtime.
No owner policy or additional systemd service is implied by preparation.

The new /health reply adds only aggregate registered-instance,
pending-request and active-lease counts plus the managed-provider marker.
These support future planned restarts, but a quiet sample is not a drain
lock. The old live gateway lacks these counters. Therefore schedule an
explicit maintenance window for the first restart, suspend agent dispatch,
capture the registered instance IDs privately and baseline health, and
retain a rollback copy of the original unit/configuration. Do not infer
idle from a connection count. After the restart, require healthy service,
managed marker and re-registration of the expected still-online legacy
instances; account separately for unregistered or offline connections.
Never automatically replay an interrupted browser operation. On failure
restore the previous configuration and verify reconnection. Record the
actual restart, release hash, verified runtime and remaining exceptions
in Operium. The live migration remains separate from this source work.


### I4 — one-time owner migration procedure

`scripts/ops/migrate-navigation-gateway.py` is a one-time owner-operated
installer for the observed Fracta2 baseline, not an agent-callable
deployment API. It requires a root-private staging directory containing
the independently reviewed installer and exact prepared archive, with
the published full revision and expected SHA-256 supplied explicitly.
Run without `--apply` for validation only. After pausing browser agent
dispatch and choosing the maintenance window, repeat with `--apply`.
It refuses unexpected unit configuration, existing drop-ins, a
previous candidate or an unresolved migration lock.

It verifies the archive before extracting only bounded regular files
and directories under the fixed root-controlled release base. It
retains the workspace service UID and environment, adds a single
hardened systemd drop-in and restarts only the hosted gateway. The
acceptance checks the effective configuration, actual process UID,
empty capability sets, working directory, loopback/mesh listeners,
health and managed marker, and re-registration of every previously
registered instance. An offline previously registered instance can
therefore cause conservative rollback. The old gateway's unregistered
connections cannot be correlated individually; their count is recorded
without claiming they all returned. The procedure never replays a
browser operation.

Private `migration-before.json` and `migration-result.json` in the
owner staging directory retain the baseline and outcome. On failure
the installer removes its own drop-in, restores the original service
configuration and verifies reconnection. A failed verification retains
the migration lock for owner reconciliation; the candidate release is
kept for inspection. Never retry blindly after an interrupted run.
Fixture tests exercise archive safety, exact baseline, listener boundary,
reconnection predicate, receipts, rollback and lock retention; actual
owner invocation and production recovery remain untested until migration.


### I4 — hosted gateway migrated, companion preparation

On 2026-11-27 the node owner executed the reviewed migration of gateway
revision `5e95dbeed67f25d88f81919cdf9762127a903666`. The reported
receipt is verified; an independent read-only probe confirmed the exact
release working directory, active hardened service under the original
workspace identity, managed-provider marker, two registered instances,
zero pending requests and zero active leases at observation. The eleven
prior connections included nine unregistered connections; two registered
instances were recovered, not eleven individually verified sessions.

The source preparation script now also accepts `--companion` and packages
only the Firefox companion and its transitive local modules, with the
same verified ws tarball and per-source SHA-256 manifest. This is a
separate release from the gateway. The owner selects the existing X11
workspace, installs the checked bundle as read-only executable source
under the owner-controlled release base, and starts the companion under
the original non-root workspace identity with a new dedicated profile.
Use synthetic content first; loopback BiDi alone does not establish
isolation from other local Unix accounts. No personal browser profile
is imported, and no additional VNC service is needed.


### I4 — first live Firefox dogfooding (FBF)

The owner launched the separate Firefox companion in BYX on revision
`a7b9948deea844571d54bce3d3af24b946f78d78`. The live hosted gateway
registered three browser instances, including managed Firefox; its
inventory returned three tabs. Synthetic dogfooding opened an additional
loopback HTTP fixture tab, verified an actual HTTP request and the BiDi
frame tree, and closed only the new tab. However page.evaluate failed
even for constant 1, both background and foreground. All three synthetic
tabs were closed successfully; no pre-existing tab was evaluated or
changed. The underlying cause is not yet known. The disposable graphical
fixture still passes under Node 22.

The provider now reports fixed, allowlisted evaluation failure stages
(realm probe, execution, post-inventory/realm verification, decoding).
The existing RPC error code remains unchanged; no exception text, page
contents, script source or stack crosses the gateway. No target check
or authority requirement is relaxed. The new
`scripts/check-firefox-bidi-production.js INSTANCE --synthetic-live-test`
is explicitly opt-in, opens its own randomized loopback fixture and
uses exact target-bound cleanup. It tests transport and local semantic
capability integration, not canonical John/COP admission. The tool
connector schema observed at this point does not expose the newly
supported browser_instance_id read argument; do not silently route
a John read to the default Chromium instance.

Prepare a new versioned companion release and test it in a separate
dedicated profile in the same graphical workspace before replacing the
existing Firefox. Live evaluation diagnosis remains open.
