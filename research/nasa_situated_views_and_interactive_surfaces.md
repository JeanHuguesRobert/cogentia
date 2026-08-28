---
title: "NASA Situated Views and Interactive Surfaces"
document_role: research
document_kind: architecture-proposal
visibility: public
lifecycle_state: working
update_policy: UP-DESIRED-PRESENT
language: en
provenance:
  origin_type: conversation
  origin_date: "2026-08-28"
  derived_from: []
review:
  status: under-review
  reviewed_by: []
---

# NASA Situated Views and Interactive Surfaces

## Purpose

This proposal separates four capabilities that can otherwise be confused in
small-node and Fractanet deployments. It is an architecture proposal, not a
claim that every capability is already implemented.

## 1. NASA is situated awareness

NASA means **Networked Agency Situational Awareness**. A NASA view is not a
global, omniscient dashboard. It is a projection made from the position of a
particular observing node and its currently available evidence.

```text
NASA-view(observer=A, subject=A, scope=S, observed_at=t)
NASA-view(observer=B, subject=A, scope=S, observed_at=t)
```

The two views may differ legitimately. A node can be intermittent, unreachable,
newly discovered, forgotten, or only known through an indirect report. Every
material item in a NASA view should therefore preserve, where available:

- observer and subject identity;
- observation time and freshness;
- provenance and route of the evidence;
- reachability and confidence state;
- the distinction between observed, reported, inferred, and unavailable.

HTML is one human-oriented NASA projection. The same underlying capability
should remain available through ordinary machine-oriented surfaces, including
API, CLI, MCP, and ACP, without creating a separate semantic world for agents.

## 2. Remote Web Session

**Remote Web Session** is the proposed name for the logical capability that
allows an interactive web application to run on one machine and be used on
another. It is more than remote HTML rendering: it includes visual surfaces,
keyboard and pointer input, clipboard, resize, lifecycle, and potentially
multiple tabs or windows.

Its conceptual contract is:

```text
create(url | browser-profile | application)
observe(session)
list-surfaces(session)
send-input(session, pointer | keyboard | clipboard)
resize(session, viewport)
close(session)
```

This contract does not prescribe a transport. VNC/RFB, KasmVNC, Xpra, a browser
protocol, or a future Fractanet-native adapter are interchangeable
implementations with different resource, latency, security, and compatibility
properties.

## 3. Hosted Browser

A **Hosted Browser** is a provider built on Remote Web Session. It runs a
modern browser on a better-provisioned host and exposes that browser session to
an Ultra Light Client. It trades client memory and CPU for transport latency and
server-side resource use.

Hosted Browser does not produce NASA and does not replace Remote Access. NASA
is one application that a hosted browser can display. A local browser remains a
valid and often faster fallback.

## 4. Remote Access

**Remote Access** gives a human operator control of a whole machine session (or
one session among several). It includes the desktop, native administration
tools, package management, terminals, and browsers. It can mirror the physical
keyboard/mouse session or provide another authorized session.

Remote Access is distinct from Remote Web Session even when both use a related
low-level transport. A Remote Web Session carries one web application; Remote
Access carries a human-operable desktop environment.

## 5. Symmetric capability surfaces

Each capability should be discoverable and controllable, subject to mandate and
authorization, through congruent human and machine surfaces:

```text
human UI | CLI | JavaScript package/API | MCP | ACP
```

The projections may differ for accessibility and safety, but their object
identity, state, provenance, capability limits, and authority boundaries should
remain intelligible across surfaces.

## 6. Progressive implementation

1. Preserve NASA evidence and provenance semantics before adding presentation.
2. Specify Remote Web Session independently of a chosen transport.
3. Keep the local browser as a functional baseline for constrained nodes.
4. Evaluate adapters through bounded reality tests with visual human validation.
5. Build Hosted Browser on the validated Remote Web Session contract.
6. Keep Remote Access independently usable for local and remote administration.

## Open questions

- What capability-discovery schema represents NASA and Remote Web Session?
- Which session and surface identifiers support tabs, windows, and reconnection?
- How should latency, freshness, and degraded mode be reported to a human and
  to an agent?
- Which adapter is sufficient for each Ultra Light Client class?
