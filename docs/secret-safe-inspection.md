---
title: Secret-safe operational inspection
description: A general rule for diagnosing systems without reading, printing or serializing secret values.
date: 2026-07-12T00:00:00.000Z
license: MIT
document_role: operational
document_kind: security-method
visibility: public
lifecycle_state: active
author: unknown
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

# Secret-safe operational inspection

Operational diagnosis should inspect the **metadata and behavior around a
secret**, not the secret value itself.

The governing rule is:

> Inspect location, ownership, permissions, presence, scope and behavior;
> never inspect or print the credential value unless its value is itself the
> explicit, authorized object of the operation.

This distinction applies to API keys, bearer tokens, passwords, SSH private
keys, cookies, provider credentials and any value that grants capability by
possession.

## Why this matters

A credential can leave its intended custody without being published or observed
by an attacker. Printing it into a terminal, agent transcript, CI log or support
record is an **unnecessary disclosure into a broader system**, not proof of
compromise. The evidence-bounded description is important:

- `stored only in designated secret storage`;
- `printed in a controlled operational transcript`;
- `published or accessible outside the trust boundary`;
- `known or suspected unauthorized use`.

Do not collapse these states into one alarmist claim. Rotation is a conservative
response to loss of provable exclusive custody, not evidence that an attack
occurred.

## Safe diagnostic questions

Prefer questions that return booleans or metadata:

- Does the credential exist?
- Which file or secret reference supplies it?
- Who owns that file and what are its permissions?
- Is the file inside a Git worktree or tracked by Git?
- Which service consumes the credential?
- What scope does it grant?
- When was it last rotated?
- Does an authenticated request succeed without logging the value?

Avoid unrestricted inspection commands such as:

- `env` or `printenv`;
- `systemctl show --property=Environment`;
- unredacted `systemctl cat` when units may contain literal values;
- printing `.env` files;
- reading `/proc/<pid>/environ`;
- verbose HTTP output containing `Authorization` headers.

## Presence, redaction and comparison

Check presence without returning the value:

```sh
grep -q '^SERVICE_TOKEN=' /path/to/service.env \
  && echo configured \
  || echo missing
```

Inspect only non-secret systemd metadata:

```sh
systemctl show service-name \
  --property=EnvironmentFiles \
  --property=FragmentPath \
  --property=DropInPaths
```

If a unit must be inspected, redact before output crosses the host boundary:

```sh
systemctl cat service-name \
  | sed -E 's/^(Environment=[^=]+=).*/\1<redacted>/'
```

When equality must be tested, compare locally computed digests or use a
constant-time verifier. Do not move the underlying values into the transcript.

## Storage rule

Versioned configuration should contain variable names and `EnvironmentFile=`
references, never literal credentials. Secret files should remain outside Git,
with the narrowest ownership and permissions compatible with service startup.

Agents and runbooks must treat output minimization as part of the security
boundary: a read-only diagnostic command can still disclose a secret.

## Incident language

Use the narrowest claim supported by evidence:

- **disclosed in a controlled transcript** — value appeared outside its secret
  store, but no unauthorized observer or use is known;
- **exposed** — value became accessible beyond the intended trust boundary;
- **compromised** — unauthorized knowledge or use is known or reasonably
  suspected.

Record what happened, where the value travelled, who could access that surface,
and why rotation was or was not chosen.
