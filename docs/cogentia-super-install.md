# Installing the Cogentia super broker on Fracta2

Status: experimental root broker; **not yet connected to live MCP**. The
broker accepts arbitrary POSIX shell scripts under root-issued, revocable,
time-limited, use-limited mandates. Scripts start as `ubuntu` and may
explicitly use `sudo -n` for privileged commands, just as in SSH. No command
allowlist is maintained. The `execution_mode: super` request is mandatory.
A successful grant does
not convey authority beyond the broker's lifetime, target or scope.

## OS security boundary

The current `mcp-cogentia.service` and unrestricted normal shell run as
`ubuntu`. Do not give `ubuntu` membership in the `cogentia-super` group;
do not store a live super credential in files, environment or services
readable by `ubuntu`. That would make the super authority technically reusable by any normal
shell command. The broker can be installed and tested by the administrator
now. Automatic MCP activation must first consume the **canonical COP mandate**
with accurate identity, mode and effect scope; a separate gateway hierarchy
is not an additional policy prerequisite in FractaTrust v0. The repo working
tree is writable by ubuntu: **never run the checkout itself as root**.

## SSH administrator installation

Run after inspecting and verifying the published repository commit.

```bash
ssh fracta2
cd /srv/cogentia/repos/cogentia
git pull --ff-only
node --test scripts/super/broker.test.mjs
sudo groupadd --system cogentia-super 2>/dev/null || getent group cogentia-super
sudo install -d -o root -g root -m 0755 /usr/local/libexec/cogentia-super
sudo install -o root -g root -m 0755 scripts/super/broker.mjs /usr/local/libexec/cogentia-super/broker.mjs
sudo install -o root -g root -m 0755 scripts/super/client.mjs /usr/local/libexec/cogentia-super/client.mjs
sudo install -o root -g root -m 0644 scripts/super/cogentia-super.service /etc/systemd/system/cogentia-super.service
sudo systemctl daemon-reload
sudo systemctl enable --now cogentia-super.service
systemctl is-active cogentia-super.service
sudo stat -c '%U %G %a %n' /run/cogentia-super /run/cogentia-super/broker.sock /usr/local/libexec/cogentia-super/broker.mjs
```

Expect root/cogentia-super ownership for runtime socket, 0750 directory,
0660 socket. Verify *no* ordinary users belong to cogentia-super.

## Root-only smoke test

Run through SSH. Credential lives under /root and is never pasted into
ChatGPT or placed under /home/ubuntu. Here the mandate permits **one** script
for five minutes, regardless of its contents. The administrator uses sudo
to issue it. Do not leave sensitive credentials in command arguments.

```bash
sudo sh -c '/usr/local/node-v26.5.0/bin/node /usr/local/libexec/cogentia-super/broker.mjs grant agent:admin-smoke mandate:fr2-smoke 5 1 > /root/cogentia-super-smoke.json'
sudo /usr/local/node-v26.5.0/bin/node /usr/local/libexec/cogentia-super/client.mjs check /root/cogentia-super-smoke.json
sudo sh -c 'printf "id -u\nsudo -n id -u\n" > /root/cogentia-super-smoke.sh'
sudo /usr/local/node-v26.5.0/bin/node /usr/local/libexec/cogentia-super/client.mjs run /root/cogentia-super-smoke.json /root/cogentia-super-smoke.sh
sudo /usr/local/node-v26.5.0/bin/node /usr/local/libexec/cogentia-super/client.mjs run /root/cogentia-super-smoke.json /root/cogentia-super-smoke.sh
sudo rm -f /root/cogentia-super-smoke.json /root/cogentia-super-smoke.sh
```

The first run should report two user IDs in order: `1001` (`ubuntu`) then `0`
(the explicitly sudo-prefixed command). The second run should
return `mandate_denied` (one-use). Examine audit records with
`sudo tail /var/lib/cogentia-super/audit.jsonl` (no secrets recorded).

Do not use a general-purpose long-lived root grant. Root scripts can change
the mandate store, logs, system binaries and service itself. Independent
infrastructure is required if the threat model includes a hostile root actor.
This limitation cannot be solved by software policies on the same root host.

## Privilege semantics

A **normal** job executes under the unprivileged shell with
`NoNewPrivileges=true`; typing `sudo` there does not grant privilege.
A **super** job requires verified elevated authority *to enter the governed
session*, but executes the script as `ubuntu`. Each command requiring root
must explicitly use `sudo -n`. This is an attention/error-prevention guard,
not a second mandate nor a command-by-command allowlist. An intentionally
malicious script can still invoke sudo; mandate governance is the real
authorization boundary.

This design relies on an existing, operator-approved noninteractive sudo
configuration for the ubuntu account. If `sudo -n` requires authentication,
the root command fails; do not disable authentication globally merely to
make this smoke test pass.

Never execute a writable repository `.mjs` with `sudo node`: install a
root-owned immutable copy of both client and broker first. The smoke script
and credential should likewise live in root-only storage.

## FractaTrust v0 — trust-perimeter simplification

FractaTrust v0 assumes that agents and services admitted by the Principal
within the Trust Perimeter cooperate in good faith. This is a conscious,
revisable *bootstrap assumption*, not a claim that compromised agents cannot
exist. For normal and super, **COP remains the only mandate authority**.
A separate compromise-detection engine, reputation scoring, mandatory
segmentation of every agent, or independent permissions catalog must not be
made a prerequisite to initial operation without concrete evidence that
the added complexity is justified.

The root broker and Unix permissions are an execution implementation, not
another authorization doctrine. Likewise, `sudo -n` explicitly marks
privileged commands to prevent accidental elevation, not to demand another
Principal decision. The existing experimental root-local grant database must
still be retired in favour of COP rather than accepted as a second authority.

**Accepted limitation:** a malicious or compromised in-perimeter agent with
access to effective administrative credentials could cause significant harm;
trust alone does not technically prevent this. If actual incident evidence or
a demonstrated high-impact flaw calls the bootstrap assumption into question,
revise FractaTrust with a focused Reality Test and a proportionate corrective
measure. Do not presume an unobserved attack has occurred.

Canonical context: Operium
`research/fractatrust-v0-binary-perimeter.md` and Cogentia
`research/measured_risk.md`.

## Single mandate authority — integration decision (1 November 2026)

**COP is the sole authority** for both `normal` and `super`. The broker
executes; it does not define a new mandate policy. The ordinary shell, MCP
facade, router, privileged broker and OS do not each get their own independently
configurable authorization rules.

Canonical flow:

```text
Principal → COP mandate (actor, scope, mode, target, validity, budget)
                 ↓
             COP authorize/reserve  ← single decision, atomic and revocable
                 ↓
      host.process.run(normal | super)
                 ↓
         execution provider / sudo-style broker
                 ↓
          COP effect receipt + audit
```

`super` may contain arbitrary scripts: no command allowlist. A mandate
authorizing `normal` cannot be promoted to `super`. Inside a `super` script,
ordinary commands still run as `ubuntu`; privileged commands require
explicit `sudo -n`. This explicit syntax prevents accidental elevation,
but does not constitute a second authorization policy.

The prototype broker already installed on Fracta2 has a root-local
`mandates.json` for its SSH smoke test. **This is temporary test scaffolding,
not a second production mandate service and not a source of COP authority.**
Do not expose the prototype grant mechanism as a permanent public MCP
capability. Remove the duplicate registry once the broker consumes the
canonical COP execution decision.

OS permissions keep untrusted processes from modifying the verifier or
impersonating its responses. They are an implementation property of the
*same* COP decision, not an independent policy for what the agent may do.
No additional user-facing ceremony, approval layer or command whitelist
should be introduced.

**Outstanding implementation:** a single trusted COP
`authorize_and_reserve` operation must bind actor, Principal, mandate,
`execution_mode`, target and execution effect. The broker must consume
that verified decision and report the execution receipt to COP without
creating, modifying or interpreting its own grants. The current
`side-effect-store` file implementation is not an atomic concurrent
reservation service, so this transition must not be declared completed
until its race/replay/revocation tests pass end to end.

The previous socket-adapter prototype with an additional
`credentialResolver` has deliberately been removed: it was adding
another credential layer rather than completing COP's authority path.
The already-installed root broker is left running unchanged pending its
migration to the single COP protocol.
