---
title: "Fracta2 Unix normal/super — Frederic pilot closure"
author: "Institut Mariani / C.O.R.S.I.C.A."
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: '2026-11-05'
last_modified_at: '2026-11-05'
version: '1.0'
status: "working-paper — verified operational receipt"
license: "CC BY-SA 4.0"
language: en
document_role: operational
document_kind: design-note
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: '2026-11-05'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Completed Fracta2 hosted-account pilot (5 November 2026)

The temporary bootstrap MCP's **`execution_mode: super`** created the Unix
account `hosted-fred2b20250` through the root-owned Cogentia broker. It was
**not** a direct SSH `useradd` execution. Verified postconditions: UID/GID
`1003:1003`, `/bin/bash`, home `/home/hosted-fred2b20250` owned by this
user and group with `0750`, GECOS `Hosted Browser - Frederic Lecourtois`.
The broker returned `ok:true`, `exit_code:0`, `cop_reserved:true`.

Authorized exact effect hash:
`sha256:9997c677d88aa2fa26c7252e6a4c616c9a81f1c93e3e03233e80af1ff8a4716e`.
One-use root-side grant: `sea_583fcbd7-d6b5-4978-bfcd-71f4dcb1c5a7`,
`authority_origin:verified_mission`, `mandate:chatgpt-corpus-coding`;
readback confirmed `consumed_at:2026-11-05T14:20:24.971Z` in the root-owned
store `/var/lib/cogentia-super/authorizations.json` (`0600`). Both services
remained active and the pilot-specific systemd override was removed before
execution.

The root-side issuer independently recomputed the preapproved hash using a
Fractanet SSH administrative channel and issued a fresh, short-lived grant.
It did **not** copy an `ubuntu`-writable MCP grant into the root store. The
bootstrap MCP then invoked the broker, which checked and consumed that grant
before executing the script. `normal` continues to run as `ubuntu`; `super`
requires a trusted exact grant and does not inherit implicit root power.

**Trust caveat:** the administrative SSH channel used for issuance was itself
reachable from the bootstrap shell environment. This pilot therefore proves
the *mechanism* of exact effect-binding, root-store consumption and execution,
not a human identity boundary independent of every agent with bootstrap shell
access. The Principal elected a temporary single-human-user assumption for
MCP Cogentia. It is not a general issuer policy. Durable authenticated
Principal issuance, funded COP budgets and delegation remain open (#299).

**Source disposition:** the temporary source-only `isApprovedFredPilot`
hardcoded exception and test have been removed after the successful pilot.
Generic broker trust checks and node/resource target compatibility remain.
The deployed broker's unused pilot hook was disabled; pushing the revised
code to GitHub does **not** update the live systemd executable.

**Out of scope:** Fred's hosted-browser authentication, session isolation,
credential provision and account retirement. These require separate work.

Related: [#292](https://github.com/JeanHuguesRobert/cogentia/issues/292),
[#294](https://github.com/JeanHuguesRobert/cogentia/issues/294),
[#295](https://github.com/JeanHuguesRobert/cogentia/issues/295),
[#299](https://github.com/JeanHuguesRobert/cogentia/issues/299).
