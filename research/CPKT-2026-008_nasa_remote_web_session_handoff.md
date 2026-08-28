---
document_role: source
document_kind: cognitive-packet
visibility: public
lifecycle_state: working
update_policy: UP-REALITY-EVIDENCE
language: en
packet_id: CPKT-2026-008
packet_kind: cognitive-packet/v0.1
packet_version: 1
created: "2026-08-28"
home_of_record: "Jean Hugues Noël Robert"
subscribing_homes:
  - "JeanHuguesRobert/cogentia"
  - "JeanHuguesRobert/operium"
status: "in transit — awaiting a coding-capable handler"
---

# CPKT-2026-008 — NASA, Remote Web Session, Hosted Browser, and Pi Remote Access

**You are receiving a cross-machine, cross-agent continuation packet.** Do not
depend on the preceding chat transcript. Read the cited GitHub issues and the
applicable `AGENTS.md` files before changing code, services, or operational
records. A connected process is not evidence of a visible result: physical
operator observation is authoritative for the Pi display.

## Envelope

### Goal

Continue the progressive implementation of four deliberately separate
capabilities:

1. **NASA** — Networked Agency Situational Awareness, represented as an
   observer-relative view.
2. **Remote Web Session** — transport-neutral interactive access to a web
   application running elsewhere.
3. **Hosted Browser** — a better-provisioned browser exposed through Remote
   Web Session to an Ultra Light Client.
4. **Remote Access** — a human controls an entire machine session locally or
   remotely; this is not Hosted Browser.

### Mandate and constraints

- Preserve local Firefox as a usable Pi baseline; it is the only
  human-validated La Nasa display result so far.
- Do not treat socket reachability, a systemd active state, or a viewer process
  as proof of physical Pi output. Ask the operator to validate a visible result.
- Do not expose VNC, KasmVNC, CDP, SSH, or credentials publicly. Keep secrets
  out of repository artifacts and issue comments.
- Do not revive the tested native VNC viewer as the default projection without
  a materially different configuration and physical-screen acceptance evidence.
- Do not confuse the Pi's WayVNC Remote Access service with the Hosted Browser
  transport.
- Do not commit, push, or publish local source changes without a scoped human
  authorization. GitHub comments and issue #27 were already created under the
  operator's instruction.

### Durable GitHub anchors

- Hosted Browser projection experiment: [Operium #24](https://github.com/JeanHuguesRobert/operium/issues/24)
  and its 2026-08-28 evidence update.
- Observer-relative NASA display: [Operium #26](https://github.com/JeanHuguesRobert/operium/issues/26)
  and its 2026-08-28 architecture update.
- Independent Pi Remote Access validation: [Operium #27](https://github.com/JeanHuguesRobert/operium/issues/27).

## Conceptual decision

```text
NASA
  -> situated awareness: view(observer, subject, scope, observed_at)

Remote Web Session
  -> visual surfaces + mouse + keyboard + clipboard + resize + lifecycle
  -> transport adapters are replaceable

Hosted Browser
  -> a browser provider using Remote Web Session

Remote Access
  -> a complete, human-operable machine/session desktop
```

NASA has human HTML projections and symmetric machine-facing API, CLI, MCP, and
ACP projections. An observer-relative view must preserve identity, freshness,
provenance, and observed/reported/inferred/unavailable distinctions.

## Verified operational facts — 2026-08-28

### Pi (`rpi3-view`)

- `http://127.0.0.1:8794/boot.html` returned HTTP 200.
- Firefox ESR was visibly displaying La Nasa after explicit navigation. It is
  now intentionally in normal window mode; F11 provides voluntary fullscreen.
- `labwc` and `wayvnc` were active. WayVNC reported `enable_auth=true`.
- The human operator had already used the Pi's graphical package manager. Do
  not claim it is absent merely because a particular executable name is absent.
- A Pi SSH tunnel endpoint on loopback port 5902 accepted TCP connections.
- Native TigerVNC and TightVNC viewer attempts established connections but did
  not yield a human-visible viewer surface. An independent X11 `xmessage` was
  visibly displayed, narrowing the failure to the viewer path.

### Fracta2

- A hosted-browser service and Chrome process targeting the mesh-reachable Pi
  NASA URL were observed during the investigation.
- An x11vnc RFB route was observed through the Pi tunnel.
- Existing Operium documentation also records a KasmVNC hosted-browser
  architecture. The relation between this documented KasmVNC deployment and
  the live x11vnc route is unresolved; it requires an explicit audit before
  service changes.

## Source artifacts to inspect

### Cogentia

- `research/nasa_situated_views_and_interactive_surfaces.md` — architecture
  proposal for the four capabilities.
- This packet.

### Operium

- `docs/remote-web-session-status.md` — facts, discrepancy, and acceptance
  evidence.
- `backlog/items.yaml`: `OP-BUG-008` records the rejected native-viewer path
  and its replacement by the validated Firefox baseline.
- Experimental Pi-display work may coexist in
  `scripts/ops/deploy-rpi3-edge-portal.sh`, `templates/rpi3-view/`, and related
  files. Inspect the diff before changing or committing it; do not discard it
  or treat it as the active deployment.

### Checks

- `git diff --check` passed for Cogentia and Operium after the documentation
  edits.
- `node scripts/test-operium-backlog.js` failed because existing `OP-BUG-001`
  is marked `in_progress` although its test requires `done`. Do not silently
  change that unrelated issue; determine whether its reopening has new evidence.

## Next bounded work

1. Read Operium #24, #26, and #27 and current repository instructions.
2. Apply Operium Fix Bugs First (`backlog list`, then the relevant subsystem
   gate) before an implementation change.
3. Audit Fracta2: identify the actual KasmVNC services, ports, browser display,
   and their relationship to x11vnc. Record facts without secrets.
4. If the existing KasmVNC web projection is available, run the smallest
   reversible Pi Firefox reality test. Do not replace local Firefox first.
5. Human acceptance requires: visible hosted Chrome on the physical Pi,
   mouse/keyboard input, measurable latency/resource behaviour, reconnection,
   and automatic/manual local Firefox fallback.
6. Separately validate WayVNC Remote Access through an authenticated SSH tunnel
   while preserving physical local keyboard and mouse use.

## Stop and return conditions

- Stop and report if a service audit shows a security exposure, missing
  authority, or an ambiguity about the live KasmVNC/x11vnc topology.
- Do not call a transport successful without physical-screen validation.
- Return results through issues #24, #26, and #27, then update this packet by
  an append-only hop when it becomes a committed corpus artifact.

## Resumability report

- **R0:** Packet is by copy for conceptual state and by reference for GitHub
  issues/live services.
- **R1:** A handler can begin without the chat transcript by reading the cited
  issues and repository instructions.
- **R2:** Exact current service configuration and secret references are not
  embedded; they must be safely re-observed on the authorized hosts.
- **R3:** Native viewer command variations are intentionally omitted; the
  conclusion and evidence boundary are sufficient.
- **R4:** No instruction conflict identified. Operium owns live operational
  evidence; Cogentia owns architecture/provenance.
- **R5:** Portability target: 9/10 once this file is committed and pushed.

## Hop log

### Hop 0 — Packaging, 2026-08-28

Prepared after the operator requested a continuation that can move to another
machine or coding agent. GitHub issues #24 and #26 received factual updates;
#27 was opened for Remote Access. Native VNC autostart was removed and a clean
Pi reboot visibly restored local Firefox La Nasa.
