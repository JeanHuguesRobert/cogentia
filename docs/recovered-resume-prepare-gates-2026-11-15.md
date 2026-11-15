---
title: "Historical experimental read-only gate modules — recovery note"
date: "2026-11-15"
document_role: operational
document_kind: wip-recovery-note
visibility: public
lifecycle_state: working
status: working-paper
related_issues:
  - https://github.com/JeanHuguesRobert/cogentia/issues/309
  - https://github.com/JeanHuguesRobert/cogentia/issues/299
review:
  status: unreviewed
  reviewed_by: []
---

# Experimental resume-prepare modules recovered from historical branch

Source: feat/resume-prepare-capability-gate-20261014, not a production
release. Six unmerged files were absent from canonical main:

- scripts/lib/read-only-relay.js, with tests: an advisory allowlist,
  budget and scope classification that always returns allowed:false.
  An untrusted assertion of a verified mandate does not grant authority.
- scripts/lib/read-only-sandbox.js, with tests: a design for a bounded
  Bubblewrap probe; repository mounts and network isolation must be
  independently reality-tested before relying upon it on a specific host.
- scripts/lib/trusted-handler-analysis.js, with mocked tests: pilot
  advisory analysis, with durable receipts and a particular issue allowlist.

The modules are retained under their original names to preserve compatibility
with their test fixtures, but have no new registration or production route.
The trusted-handler-analysis function can, if explicitly called with a
real token and fetch implementation, make a network request; recovering
its code is not authority to invoke that function or disclose information.

Validated on 15 November 2026: nine isolated Node tests passed, with
mocked network results; no production transport, independent COP mandate,
real sandbox enforcement or live external effect was tested. Any activation
requires separate review of the current provider and effect authorization.
The older branch and its experiments remain intact while its other sources,
including retrieval session adapters, are evaluated for compatibility.
