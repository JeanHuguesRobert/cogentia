---
title: ThinkPad remote execution discovery via Fracta2 SSH mesh
date: "2026-11-12"
status: "operational — observed"
document_role: operational
document_kind: runbook
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
related:
  - ../instructions/AGENTS.shared.md
  - ../docs/host_fs_desktop_commander.md
  - ../scripts/ops/verify-fractanet-ssh-mesh.ps1
---

# ThinkPad remote execution: discovery and verified route

## Observed reality (12 November 2026)

A Cogentia agent incorrectly concluded that it lacked remote access to the Principal's Windows ThinkPad after trying direct `ssh admin@<tailscale-ip>` and `host.process.run` with a Windows target but a Linux Desktop Commander provider. Both tests were inconclusive: the raw SSH invocation omitted a **configured host alias and identity**, and the generic provider actually executed on a Linux environment, despite accepting the Windows target metadata.

The working, **actually tested** route on Fracta2 is:

```text
agent with bounded Fracta2 shell authority
  -> SSH on Fracta2: ssh -o BatchMode=yes thinkpad hostname
  -> ~/.ssh/config alias thinkpad (also thinkpad-ts / i7-thinkpad-jhr)
  -> dedicated IdentityFile ~/.ssh/fractanet-mesh
  -> OpenSSH Server on Windows, user admin
  -> hostname = i7-thinkpad-jhr
  -> powershell.exe -NoProfile -NonInteractive -EncodedCommand <UTF-16LE base64>
```

The endpoint IP and private key material are **not** part of this document: use the local SSH config; never hard-code a changing Tailscale address, reveal credentials, or distribute a private key. The public alias is not an authorization grant.

A read-only disk probe succeeded via that SSH alias: PowerShell reported drive C: total 236.45 GiB, free 17.12 GiB (time-specific observation; not an ongoing metric). `cowork-svc` was also running. These observations were produced on the **verified Windows host**, not inferred from the Fracta2 host.

## Mandatory discovery sequence

1. Enumerate the available connected tools, Cogentia capability catalog, and the Fracta2 bounded shell route. Prefer governed semantic host capabilities when their actual execution target/provider is verified.
2. On Fracta2, run `ssh -G thinkpad` to see effective host, user, port, `identityfile`, and `identitiesonly`, without displaying secret key content.
3. Try `ssh -o BatchMode=yes -o ConnectTimeout=8 thinkpad hostname`; require **exactly** `i7-thinkpad-jhr` as the remote host identity before further operations. If the alias succeeds, do not repeat a raw-IP SSH attempt.
4. Only after identity verification, use `ssh thinkpad 'powershell.exe -NoProfile -NonInteractive -EncodedCommand <BASE64>'`. Encode PowerShell source as **UTF-16LE** before base64 to avoid nested-shell quoting problems. A remote SSH session defaults to Windows `cmd.exe` here: bare PowerShell cmdlets are not valid.
5. For any effectful operation, separately resolve the scoped Principal mandate/authority, COP controls where applicable, safeguards, and evidence. Functional SSH access is **technical reachability**, not an unrestricted mandate. Check for live processes and preservation/backup needs before deleting VM images or session files.
6. Record `advertised / reachable / authorized / tested` independently and capture the exit status and host identity in the receipt. A successful transport call with wrong effective host is a **routing failure**.

## Regression / fast preflight

From Fracta2 run:

```bash
bash scripts/ops/check-thinkpad-ssh-route.sh
```

This test is read-only. It checks the SSH alias and expected Windows identity, then tests a minimal PowerShell command remotely. Failure must not be silently reinterpreted as a missing Windows SSH server. Consult `scripts/ops/verify-fractanet-ssh-mesh.ps1` for the original Windows mesh validation (some legacy checks still reference the retired Fracta node).

## Follow-up engineering gap

`cogentia_host_process_run` with `target=node:i7-thinkpad-jhr` and provider `desktop-commander` had invoked `/bin/bash` on a Linux node. Fix the semantic router/provider to attest the actual host identity and reject mismatches, rather than treating a target string as proof of execution locality. Expose a discoverable Windows execution provider routed to the ThinkPad, with the existing COP effect checks and receipt semantics; do not promote unrestricted SSH to a universal semantic capability.

This entry captures one verified operational route. It does **not** certify that the generic Cogentia host-process connector now reaches Windows.
