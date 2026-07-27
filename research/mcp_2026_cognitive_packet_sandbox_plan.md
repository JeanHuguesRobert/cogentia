---
title: MCP 2026-07-28 / Cognitive Packet sandbox plan
date: "2026-07-27"
document_role: operational
document_kind: continuation-plan
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_date: "2026-07-27"
  derived_from:
    - research/cognitive_packet_switching.md
    - JeanHuguesRobert/inseme:sandbox/cop-continuation-bac-a-sable/README.md
---

# MCP 2026-07-28 / Cognitive Packet sandbox plan

## Mandate

Build a local, reproducible and interruptible sandbox that tests the structural convergence between
MCP revision `2026-07-28` and Cogentia Cognitive Packets.

The sandbox must use real Cogentia and COP components as early as is safe, but must not silently
change either protocol or production runtime. Its results are experimental evidence, not a
normative redefinition of MCP, COP or Cognitive Packets.

## Motivation

The MCP `2026-07-28` revision introduces a substantially more stateless protocol era, modern
discovery through `server/discover`, explicit request metadata, typed results and resumable
multi-round-trip work. These properties appear strongly aligned with the existing Cognitive Packet
model: identifiable envelopes, explicit routing metadata, typed payloads, durable provenance,
continuations and traceable handling.

Email provides a concrete asynchronous transport case. The first target demonstration is a
governed round trip from an `email.received` artifact to a decision and then an `email.sent`
artifact, without sending a real message during the initial phases.

## FractaLog / OpenTelemetry convergence to explore

The `2026-07-28` MCP revision standardizes W3C Trace Context propagation in request `_meta` through
the `traceparent`, `tracestate` and `baggage` keys. It also deprecates MCP's protocol-level logging
feature in favor of `stderr` for stdio diagnostics and OpenTelemetry for structured observability.

This creates a potentially important convergence point with **FractaLog**, which currently remains
mostly an idea. The sandbox should explore whether FractaLog can become the durable, cognitive and
governance-aware projection of ordinary distributed traces, rather than inventing an unrelated
observability transport.

The architectural hypothesis to test is:

```text
OpenTelemetry trace/span
  = operational causality and timing

Cognitive Packet / COP Event / Artifact
  = semantic identity, mandate, provenance and durable meaning

FractaLog
  = correlated projection joining both levels without collapsing them
```

This is deliberately exploratory. OpenTelemetry traces are not automatically durable cognitive
artifacts, and Cognitive Packets must not be reduced to telemetry spans. The useful invariant may
instead be a stable correlation: packet, tool call, email artifact and downstream operation share
trace context while retaining distinct schemas, retention rules and authority.

The initial sandbox should therefore:

- accept and propagate valid `traceparent`, `tracestate` and `baggage` metadata;
- attach the resulting trace/span correlation to Cognitive Packet lifecycle events;
- preserve packet identity independently from trace and span identifiers;
- show one causal tree across MCP client, Cogentia server, packet router and dry-run email handler;
- redact secrets and personal data from telemetry;
- record which evidence belongs in short-lived telemetry and which becomes a durable artifact;
- avoid making an OpenTelemetry backend mandatory for the first in-memory tests.

## Precedent

Follow the method established by
`inseme/sandbox/cop-continuation-bac-a-sable`:

- one CLI entry point;
- clear executable scenarios;
- structured and replayable traces;
- real implementation code rather than a disposable simulation whenever practical;
- each experiment should harden or clarify the eventual implementation;
- explicit separation between protocol invariants and implementation choices.

The existing `cognitive-packet-router-demo` scenario is the reference for envelope-only routing,
capability checks, `cop.packet.created`, `cop.packet.routed`, continuations and deterministic test
cleanup.

## Proposed location

```text
sandbox/mcp-2026-cognitive-packet/
├── README.md
├── SESSION_RESUME.md
├── index.js
├── src/
│   ├── modern-mcp-server.js
│   ├── legacy-mcp-server.js
│   ├── packet-adapter.js
│   └── trace-recorder.js
├── scenarios/
│   ├── discover-modern.js
│   ├── legacy-fallback.js
│   ├── cognitive-packet-roundtrip.js
│   └── email-artifact-roundtrip.js
└── test/
```

This location is provisional. The experiment belongs initially in Cogentia because MCP is the
tested facade. Reusable COP behavior must remain owned by Inseme and must not be copied silently
into Cogentia.

## Phases and safe stopping points

### Phase 0 — durable mandate and acceptance matrix

- Preserve this plan and a `SESSION_RESUME.md`.
- Record the tested MCP revision and the legacy revisions.
- Define observable pass/fail criteria for every scenario.
- Record locally installed client versions and evidence levels.

Safe stop: the experiment is completely specified and resumable without code.

### Phase 1 — sandbox skeleton

- Add the dependency-light CLI and scenario loader.
- Add an in-memory JSONL-compatible trace recorder.
- Add deterministic tests for listing, running and cleaning scenarios.
- Do not modify `scripts/lib/cogentia-mcp-core.js`.

Safe stop: an empty but tested experimental harness exists.

### Phase 2 — modern MCP minimum

- Implement the smallest `2026-07-28` server needed for `server/discover`.
- Exercise per-request metadata and typed results.
- Preserve raw request and response envelopes in the trace.
- Use a minimal in-process client before testing external agents.

Safe stop: modern discovery passes independently of legacy MCP.

### Phase 3 — dual-era negotiation

- Add the historical `initialize` path without weakening the modern path.
- Test modern-first negotiation and deterministic legacy fallback.
- Make the selected protocol era explicit in every trace.

Safe stop: both protocol eras pass the same semantic scenario.

### Phase 4 — Cognitive Packet adapter

- Project MCP request metadata into a Cognitive Packet envelope.
- Keep application payload inaccessible to envelope-only routing policy.
- Preserve stable packet identity, correlation, causation, provenance and result type.
- Emit inspectable packet lifecycle events.

Safe stop: an in-memory MCP request can complete a fully traced Cognitive Packet round trip.

### Phase 5 — governed email artifact scenario

- Represent `email.received` and `email.sent` as durable artifact-shaped test fixtures.
- Route the received artifact through the JHN gatekeeper policy.
- Require explicit mandate, recipient, budget and risk metadata.
- Produce an `email.sent` artifact as a dry-run result only.
- Prove that no SMTP or JMAP mutation occurs.

Safe stop: the complete email workflow passes without external side effects.

### Phase 6 — real client probes

Test in this order:

1. minimal conformance client;
2. Codex CLI;
3. Grok;
4. Claude Code;
5. Gemini CLI;
6. Cursor when available.

For each client record:

- exact version;
- modern discovery attempted or not;
- selected protocol era;
- fallback behavior;
- tools discovered and called;
- raw trace or failure evidence;
- support classification: verified, partial, legacy-only, incompatible or unknown.

Safe stop: each tested client has a reproducible evidence record.

### Phase 7 — promotion decision

- Decide which components, if any, belong in `cogentia-mcp-core`.
- Propose any COP adapter separately in Inseme.
- Do not alter COP invariants or production mail behavior without human validation.
- Publish a concise compatibility report.

Safe stop: experimental findings are durable even if no production promotion is approved.

## Acceptance criteria

The sandbox is successful when:

- modern `server/discover` works and is traceable;
- legacy fallback works without ambiguity;
- the same semantic tool can be called through both eras;
- MCP requests and results have stable Cognitive Packet identities;
- W3C trace context propagates across the MCP and Cognitive Packet boundary without becoming the
  packet identity;
- routing policy reads only the envelope;
- payload interpretation happens only in the selected handler;
- the email scenario produces correlated `email.received` and dry-run `email.sent` artifacts;
- replay produces the same routing and governance decisions;
- Codex and Grok have explicit verified or falsified compatibility results;
- no production email is sent and no production MCP deployment is changed.

## Commit strategy

Prefer small direct commits to `main`, each independently useful:

1. plan and continuation anchor;
2. sandbox skeleton and trace recorder;
3. modern MCP scenario;
4. legacy fallback;
5. Cognitive Packet adapter;
6. dry-run email artifacts;
7. external-client compatibility evidence;
8. promotion decision and final report.

Never stage unrelated local modifications. Update `SESSION_RESUME.md` before any stop caused by
quota, external dependency, unresolved protocol ambiguity or human validation.

## Known risks and decisions requiring human validation

- The final MCP specification may differ from the release candidate.
- A client binary may contain `2026-07-28` code without enabling it in its normal MCP path.
- FractaLog has no stabilized implementation or canonical storage model yet; the sandbox must
  preserve the distinction between telemetry, audit trace and durable cognitive artifact.
- Cross-repository imports can make the sandbox non-portable; prefer explicit adapters and document
  any workspace assumption.
- Promoting adapter behavior into COP could affect protocol invariants and requires human
  validation.
- Enabling real email delivery crosses a gatekeeper and external-side-effect boundary and requires
  a separate explicit mandate.

## Next resumable action

Create `sandbox/mcp-2026-cognitive-packet/` with its README, `SESSION_RESUME.md`, CLI skeleton,
scenario loader and trace-recorder tests. Keep the first commit dependency-light and do not modify
the existing production MCP core.
