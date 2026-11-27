---
title: "Service deployment: bounded FractaNode owner delegation"
date: 2026-11-26
last_modified_at: 2026-11-27
document_role: operational
document_kind: runbook
visibility: public
lifecycle_state: active
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
---

# service.deploy — bounded service descriptors on Fracta2

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


## Second Reality Test — ONA (prepared 2026-11-27; not enabled)

The same engine now has a second reviewed descriptor for
`operium-node-agent.service`. It uses its own protected owner policy
`/var/lib/cogentia-super/service-deploy-ona-policy.json` and drop-in
`/etc/systemd/system/operium-node-agent.service.d/zz-release.conf`.
The MCP policy is unchanged and grants no ONA authority. The broker request
still accepts only service, full revision and unique ticket. It accepts no
caller-supplied executable, service definition, root command, health URL
or configuration path. Both services share the receipt and lock protocol.

ONA currently runs from the mutable Operium checkout with
`NoNewPrivileges=no`. Do not bootstrap a versioned baseline through the
ordinary deploy operation: it requires an already hardened ONA release,
an owner-installed drop-in and an independent owner policy. First migration
must be owner-operated, separately reviewed and reversible. Preserve the
existing state directory, registry, service identity, environment and
credentials; test actual ONA jobs, recovery and navigation before enabling
delegation. The normal deployment engine will not restore an unhardened
ONA baseline. The root broker module is not updated by preparing sources.

The release layout is
`/srv/cogentia/releases/operium-node-agent/<operium-sha>/operium`.
ONA imports sibling Cogentia and Inseme code; bind those to existing tested
release paths, record all three revision markers plus the lock digest in
a release manifest and do not retarget those links in place. For this pilot
one Operium commit identifies one prepared dependency combination; a later
dependency-only deployment requires an explicit composite release identity,
not silent mutation of that combination.

The first prepared baseline uses Operium `7ce7c20`, Cogentia `91da47a2`,
and Inseme `f4fa82ed`. The health acceptance requires both ONA's loopback
`8794/health` with the expected node identity and the navigation gateway's
`8765/health` with the expected instance. A real deployment additionally
checks fleet and scheduled jobs, preserves SQLite state, and verifies
recovery. The existing #81 preflight and restart receipt work is reused;
no new MCP tool is required. The initial release and the generalized
engine passed focused local tests; no claim of live ONA deployment follows.


### One-time ONA owner activation

The separately reviewed `scripts/super/install-ona-service-deploy.sh` accepts
the digest of the currently installed deployment module and an explicit
`--enable-local-ubuntu-role` owner opt-in. Stage only the installer and the
new deployment module from the exact published revision; verify the archive
digest before extracting into a root-owned private directory. The script
refuses an unexpected unit, an existing ONA drop-in/policy or a pending
deployment lock. It migrates the baseline and waits for **fresh successful
executions of all four currently enabled jobs**, in addition to ONA health,
navigation health and the fleet view. It keeps the former module and a
baseline receipt in a protected backup. Only then does it update the broker
module, observe that ONA is still disabled, verify that the existing MCP
policy is unchanged, and install the separate ONA owner policy. On failure,
it removes its own new policy and drop-in and restores the former module.
The owner must inspect a failed or interrupted migration before repeating it.
This is a one-time owner action, not a new authorization for each release.
After success, the same client can verify the current ONA release without
restarting it, and a subsequent distinct prepared revision provides the
positive autonomous deployment Reality Test.
