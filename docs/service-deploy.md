---
title: "Service deployment: bounded FractaNode owner delegation"
date: 2026-11-26
last_modified_at: 2026-11-26
document_role: operational
document_kind: runbook
visibility: public
lifecycle_state: active
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
---

# service.deploy — first fixed-function provider on Fracta2

Owning pilot: [Cogentia #342](https://github.com/JeanHuguesRobert/cogentia/issues/342).
This follows [the active node-owner administration decision](fractanode-owner-administration-2026-11-08.md).
It does not reactivate the retired maintenance issuer or widen generic super execution.

## Contract and authority

The existing root-owned SuperCOP broker accepts a separate typed operation:
`{op:"service.deploy",service:"mcp-cogentia.service",revision:"<40 lowercase hex>",request_id:"<unique ticket>"}`.
No client-provided path, shell, Unix user, service other than the fixed one, or asserted Principal identity is accepted.
The implementation is disabled by default. Only the authenticated node owner can install
the root-owned provider and opt into the fixed local socket role. The policy is
not a second COP grant store and is not a general root grant: it expresses one
OS-level node-owner delegation. The generic `run` operation still requires its
existing exact COP grant. The socket is root-owned, mode 0660, with its existing
local group. **All processes able to access that Ubuntu role can invoke this one
operation**; it is not individual cryptographic authentication of John.
If that scope is not acceptable, do not enable the policy. Named John-only
admission requires an independently authenticated execution identity; do not
pretend a client-supplied actor or a shared Unix group proves it.

The existing John mandate v7 permits normal host execution; that is the
transport for the unprivileged client, not itself privileged authorization.
No mandate amendment is issued by these files. The distinct owner policy must
be installed before the client can act. A future named semantic COP route
must evaluate the relevant canonical mandate and account for its acts; do not
claim a typed COP grant or canonical budget settlement from this provider's
local receipt alone.

## Preparation and deployment

Prepare a release directory at
`/srv/cogentia/releases/mcp-cogentia/<sha>/cogentia` using the exact published
Git tree, a `REVISION` file containing the full SHA and newline, pinned
dependencies, safe import preflight and focused tests.
The revision marker and fixed path are consistency checks, not a cryptographic
attestation of the mutable files owned by Ubuntu. Root never imports or runs
the release as root. The provider changes only the existing
`/etc/systemd/system/mcp-cogentia.service.d/zz-release-330.conf` release slot.
It rejects unexpected unit configuration, non-Ubuntu execution, privileged
ExecStart flags and hooks, and ensures both the new release and any automatic
rollback run with `NoNewPrivileges=yes`, empty capability bounding and
ambient sets. These hardening flags intentionally persist on rollback.
The verification checks effective unit configuration, PID, actual process
UID/no-new-privs/capabilities and working directory, and the fixed loopback
MCP health endpoint. Other services are not restarted.

Once the owner has installed and enabled the provider, invoke from an
ordinary Unix context with a stable unique ticket:

```sh
node scripts/super/service-deploy-client.mjs mcp-cogentia.service FULL_SHA deploy-342-first
```

If transport is interrupted, query by repeating the **same ticket and same
revision**, not by inventing a new ticket. The broker survives the target MCP
restart and records the before/after state in
`/var/lib/cogentia-super/service-deploy-receipts/<ticket>.json`.
A same-revision repeat returns its existing receipt without another effect.
A distinct ticket for an already active hardened revision verifies without a
restart. An unsuccessful new revision restores the previous one. If rollback
cannot be verified, or the broker crashes mid-effect, the lock remains:
the owner inspects the actual systemd state and receipt before reconciling.
Do not automatically delete the lock or retry a new ticket.

## One-time owner activation and revocation

Review the published pinned versions of `scripts/super/broker.mjs`,
`scripts/super/service-deploy.mjs`, and `scripts/super/install-service-deploy.sh`.
Use the already authenticated SSH/sudo owner channel, not the agent's
unprivileged shell. Transfer a Git archive of those three exact files, verify
its SHA256 in a root-owned private staging directory **before extracting**,
and run the staged installer:

```sh
bash ROOT_PRIVATE_STAGE/scripts/super/install-service-deploy.sh \
  --enable-local-ubuntu-role --expected-broker-sha256 CURRENT_BROKER_SHA256
```

The installer installs the two root-owned modules, checks that the current
broker matches the inspected baseline, restarts only the broker and verifies
the new handler refuses deployment before enabling the owner policy. It keeps
a private backup of the old broker and restores it on activation failure.
It neither deploys the MCP release nor changes any COP grant.
Revocation of new deployments is immediate by owner removal of
`/var/lib/cogentia-super/service-deploy-policy.json`; receipts remain.
The currently admitted operation can finish or recover. This is not a general
sudoers entry and does not change the generic super admission.

## Evidence and acceptance

Run:
```sh
node --test scripts/super/service-deploy.test.mjs scripts/super/broker.test.mjs \
  scripts/super/broker-route.test.mjs scripts/super/broker-trust.test.mjs
```
Fixture tests cover rejection, scope, revocation, restart, non-escalation,
idempotency, rollback and uncertain outcome. Installation and live deployment
are separate evidence: verify the actual broker response, receipt and active
MCP revision before declaring #342 deployed. Re-run the public John corpus
search from the connected MCP afterwards.
