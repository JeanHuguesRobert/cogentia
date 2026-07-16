---
title: Trusted Boundaries
subtitle: A fractal doctrine for public, private, local, and agentic access
version: '0.1'
status: source document — operational doctrine
date: '2026-07-08'
author: Jean Hugues Noël Robert
license: CC BY-SA 4.0
language: en
repository: cogentia
canonical_path: cogentia/research/trusted_boundaries.md
tags:
  - cogentia
  - fractanet
  - trust
  - boundaries
  - tailscale
  - agents
  - public-private
  - traceability
  - authorization
document_role: source
document_kind: method-note
visibility: public
lifecycle_state: working
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# Trusted Boundaries

## A fractal doctrine for public, private, local, and agentic access

**Version 0.1 — 2026-07-08**
**Repository:** `JeanHuguesRobert/cogentia`
**Path:** `research/trusted_boundaries.md`

---

## 1. Occam formulation

A trusted boundary is a membrane where:

```text
visibility
authority
capability
traceability
liability
```

change.

The same pattern repeats at many scales. That is why trusted boundaries are
fractal in Cogentia and Fractanet.

Core rule:

> **Total cognitive access does not imply total public exposure, and total
> public exposure does not imply total action power.**

Short form:

```text
cognitive access != public exposure != action power
```

---

## 2. What trust does not mean

Trust is scoped. It is never absolute.

```text
Trusted does not mean public.
Trusted does not mean unlimited.
Private does not mean untraced.
Public does not mean writable.
Local does not mean harmless.
Tailnet does not mean omnipotent.
Read authority does not imply action authority.
Context access does not imply source-of-truth access.
Transport trust does not imply execution trust.
Execution trust does not imply publication trust.
```

This is the practical doctrine. It avoids two symmetric errors:

1. treating every protected space as if it were safe for any operation;
2. treating every non-public space as if it were outside governance.

---

## 3. Fractal levels

### 3.1 Internet boundary

The public Internet is a read-only exposure boundary by default.

Public callers may receive:

- public search results;
- public context packs;
- public citations;
- public health/status summaries.

Public callers must not receive:

- local filesystem paths;
- private repository paths;
- secrets;
- raw SQLite access;
- stack traces;
- admin routes;
- write or rebuild actions;
- command runners;
- shell access.

### 3.2 Daemon boundary

The Cogentia daemon is an access authority, not a convenience wrapper.

Agents, MCP tools, browsers, scripts and public clients should call the daemon
or the CLI. They should not bypass it to query SQLite or read arbitrary files.

The daemon decides:

- which view is allowed;
- which routes are public;
- which routes require local/admin authority;
- which fields are exposed;
- which private/public distinctions are enforced.

### 3.3 Tailnet boundary

A Tailscale mesh is a trusted transport and membership boundary.

It can justify admin or operational tools, such as local/remote benchmarks
between trusted nodes, because traffic stays inside an authenticated private
network.

But Tailnet membership does not erase local discipline:

- bearer tokens still matter;
- endpoint identity still matters;
- logs still matter;
- command scope still matters;
- tool capability still matters;
- provider boundaries still matter.

Tailscale protects the channel. It does not by itself authorize every action.

### 3.4 Host boundary

Each host has a different trust and capability profile.

Examples:

| Host class | Typical role | Boundary concern |
|---|---|---|
| public VPS such as `fracta` | public facade, low-cost always-on node | expose only filtered read paths |
| personal PC | high-capability workbench | may hold broad corpus and credentials |
| ThinkPad / capable Tailnet host | agent gateway or tool host | strong action power, admin-only |
| Android / Termux | mobile recovery node | minimal but important resumption path |
| Raspberry Pi | local appliance or sensor node | constrained but persistent |

A Fractanet node is not trusted because it exists. It is trusted for specific
capabilities under specific routes and mandates.

### 3.5 Process and tool boundary

Not all tools have the same authority.

| Tool kind | Typical authority |
|---|---|
| context search | read public or local governed excerpts |
| context pack | assemble bounded citations |
| SQLite adapter | query a scoped local database |
| psql adapter | query a scoped external database |
| shell adapter | execute local commands |
| coding-agent adapter | edit code and run tools |
| Git adapter | alter versioned state |

The shell adapter is not "just another retrieval tool". It crosses into action.

The same is true for coding-agent gateways. They do not merely answer; they may
change files, run tests, commit, push, or trigger external services. They belong
to a stronger trust boundary than public retrieval.

### 3.6 Model-context boundary

What the model sees is not what exists.

A context pack is a governed excerpt. It is not the raw corpus, not the
filesystem, not the database, and not the owner's whole memory.

The model may receive:

- selected excerpts;
- citations;
- source identifiers;
- instructions;
- limits and warnings.

The model should not receive:

- raw private material;
- irrelevant secrets;
- unbounded file access;
- unfiltered database rows;
- hidden operational authority.

### 3.7 Corpus boundary

The corpus has multiple visibility classes:

- public source documents;
- public derived documents;
- generated public views;
- public candidate notes;
- private documents;
- confidential documents;
- secrets and credentials;
- scratch files;
- local caches.

Git and Markdown remain canonical for source material. SQLite indexes and
generated views are reconstructible caches or projections.

Public navigation may point to public material. It must not link from public
views into private contents. Private views may link outward to public material.

### 3.8 Packet boundary

Every routed packet should eventually carry enough metadata to answer:

```text
who may read it?
who may route it?
who may transform it?
who may publish it?
who may archive it?
who may act on it?
who is accountable for the action?
```

This is the packet-level version of the same trusted-boundary rule.

---

## 4. Operational tests

When deciding whether an action crosses a boundary, ask:

1. Does visibility change?
2. Does action power change?
3. Does local state become public?
4. Does a private source influence a public output?
5. Does a read-only request become a write-capable action?
6. Does a model receive more context than it needs?
7. Does a transport trust assumption become an execution trust assumption?
8. Is the boundary traceable after the fact?
9. Is the responsible human, agent, node, or mandate identifiable?

If the answer is unclear, the tool should stop guessing and emit a
continuation or require an explicit human/agent decision.

---

## 5. Application to Cogentia components

### Context Gateway

The public Context Gateway is a public read boundary.

It may expose governed search, context packs, citations and health status. It
must not expose raw SQL, local paths, private documents or write routes.

### MCP adapter

The MCP adapter is not an authority. It is an adapter.

It should call the daemon HTTP API. It should not read SQLite directly and
should not bypass visibility policy.

### Agent CLI Gateway

The Agent CLI Gateway is an action boundary.

It may be appropriate inside a Tailnet or localhost admin context. It is not a
public Internet service by default.

It should:

- bind locally or behind a trusted private network;
- require bearer-token or equivalent protection;
- log operations without secrets;
- separate read tools from action tools;
- fail closed when cwd, model, session or tool authority is invalid.

### Local/remote benchmark

The local/remote benchmark is trusted-admin tooling.

It is acceptable when it runs inside the Tailscale mesh between trusted hosts.
The benchmark measures the operational difference between a local gateway and a
remote Tailnet gateway.

It remains scoped:

- it should not embed token values;
- it should not become a public route;
- it should not publish transcripts;
- it should not imply that all Tailnet tools are safe for all actions.

---

## 6. Minimal policy vocabulary

Cogentia and Fractanet should converge on a small vocabulary:

| Term | Meaning |
|---|---|
| `public` | safe for public read exposure |
| `local` | available on a local host only |
| `tailnet` | available to authenticated private-network members |
| `admin` | requires explicit operational authority |
| `private` | not public; may still be traced |
| `secret` | never exposed as content |
| `read` | observe or retrieve |
| `write` | change state |
| `act` | execute commands, spend resources, call tools, or affect systems |
| `publish` | make public or public-candidate material externally visible |

This vocabulary is intentionally small. It can be extended later, but the
first discipline is to avoid confusing these words.

---

## 7. Design invariant

The invariant can be written as:

```text
For every boundary crossing:
  declare the view,
  declare the authority,
  declare the capability,
  preserve a trace,
  and fail closed when the mandate is unclear.
```

Or shorter:

```text
view + authority + capability + trace + mandate
```

This is the operational form of trusted boundaries.

---

## 8. Consequence for Fractanet

Fractanet should not be understood as a flat trusted network.

It is a network of bounded capabilities. A node attracts packets because it is
capable and legitimate for a class of work, not because it is globally trusted.

The right model is not:

```text
inside Fractanet = trusted for everything
```

The right model is:

```text
inside Fractanet = eligible for governed routing,
subject to declared capability, authority, trace and mandate
```

That is the fractal trusted-boundary doctrine.
