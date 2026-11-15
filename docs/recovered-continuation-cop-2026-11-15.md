---
title: "Continuation COP — recovery of guarded terminal WIP"
date: "2026-11-15"
document_role: operational
document_kind: wip-recovery-note
visibility: public
lifecycle_state: working
status: working-paper
related_issues:
  - https://github.com/JeanHuguesRobert/cogentia/issues/299
  - https://github.com/JeanHuguesRobert/cogentia/issues/305
  - https://github.com/JeanHuguesRobert/cogentia/issues/309
  - https://github.com/JeanHuguesRobert/inseme/issues/111
review:
  status: unreviewed
  reviewed_by: []
---

# Recovering guarded COP continuation resolution

The historical branch feat/inseme-111-resolver-next (draft PR #306) contained
experimental terminal settlement, independent COP signed-authority and
execution-budget checks, durable reconciliation, and a John Supabase identity
binding. Its modules and **three passing isolated synthetic checks** have now
been recovered into canonical main as WIP.

FBF: the previously active legacy CLI resolve/cancel code path permitted
out-of-band terminal writes to a continuation that already had a COP
PacketClaim epoch. The new CLI and HTTP resolve guards refuse legacy
terminal mutation when a claim epoch exists, including an expired one:
this is a refusal condition, not an authorization gate. It applies to
cancellation as well and avoids bypassing witnessed settlement.

Validation: the historical terminal settlement, signed COP-budget,
reconciliation, existing claim/routing and F3 closure tests pass using
synthetic work. This is **not** a production grant of continuation.resolve,
nor approval of any John Root Mandate, nor permission to transmit data,
send email, publish, execute shell, or modify a third party.

The following three historical branch-only test scripts failed against
the canonical current CLI/daemon and remain in the draft branch:
check-continuation-acp-capability.js,
check-continuation-daemon-routing.js and
check-continuation-routing-e2e.js.
They reported respectively a changed timeout reason, a changed HTTP
status, and an absent next-preview CLI subcommand. Reconcile those
contracts and independent safety requirements before enabling a
production route or closing PR #306.

The recovered John mandate plan document is expressly a **proposed,
unissued delta**; the source of authority remains the live COP mandate
and verified principal consent, never a GitHub document.
