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
changed since the displayed context, insertion is refused. Press `c` or `r` to
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

The resident journal retains 5,000 structured in-memory events, including
active-tab, window-focus, page-focus and selection transitions. `GET
/event-sequence` returns the ordered behavioural sequence without heartbeat
noise; `e` writes the same local snapshot to `navigation-event-sequence.json`
for macro analysis. Page-focus events include an accessibility signature:
semantic role, accessible name, ARIA relationships and state, `data-testid`,
native field metadata, and meaningful ancestor roles. Macro discovery should
prefer these semantic anchors over screen coordinates or volatile CSS classes.
In the TUI, `[` starts a manual demonstration and `]` ends it. Afterwards `e`
exports precisely that marked interval (including its start/end markers) to
`navigation-event-sequence.json`; without markers, it exports the whole retained
sequence.
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
