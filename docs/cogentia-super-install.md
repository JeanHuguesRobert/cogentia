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
readable by `ubuntu`. That would allow any normal shell command to steal
the credential. The root service can be installed and tested by the human
administrator now, but automatic MCP activation must wait for a separately
isolated, root-owned trusted gateway/mandate verifier. The repo working tree
is writable by ubuntu: **never run the checkout itself as root**.

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
