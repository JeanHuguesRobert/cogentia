---
title: "One-shot signed super verification proposal and remaining issuer boundary"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-07
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: runbook
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-07-super-probe-expose"
  origin_date: 2026-11-07
  derived_from:
    - research/integration/super_live_acceptance_2026-11-07.md
review:
  status: unreviewed
  reviewed_by: []
---

# One-use super probe — Principal approval and hard budget

Real connected Cogentia Private returned EXPOSE for `id -u; sudo -n id -u`, provider `unix-process`, target `node:fracta2`, mode `super`, timeout 10000ms, **effect payload hash** `sha256:eab4081a5a62a1c34fcb8a3abc67e283c58ed7df5f632665bf7307374b4af11a`. EXPOSE does not execute anything.

Independent canonical Inseme store was inspected: it contains the signed John read and form-assistance mandates but **no `host.process.run` authority**. The general JHN MCP's #171 side-effect grant tool labels token-generated decisions `mcp_jhn_attested_mutate`, which the root broker explicitly rejects as an inadequate issuer for super. It would be unsafe and ineffective to mint a generic #171 grant merely by passing the EXPOSE hash from this same ChatGPT session. Instead, an independent Principal SSHSIG is required for this specific operation.

The immutable proposal file is `research/integration/approvals/jhn-super-probe-2026-11-07.proposal.json`. SHA256 of its exact bytes: `77404ea29444623148489128ec57642301480e18a1ac48398409400d2413f848`. Namespace: `cogentia-super-probe-v1`, different from the previous root-read and form-assist mandates. The proposal binds Principal `principal:jhn`, actor `agent:jhn`, exact effect hash, command, mode, target/provider, 10s deadline per execution, mandate `mandate:jhn:super-read-probe-v1`, max delegation 0, `single_use=true`, budget `max_steps=1`, validity 2026-11-07 through 2026-11-14 UTC. The test script is read-only but will ask sudo for a root UID; no account/file mutation is authorized.

The offline SSHSIG proof validator `scripts/lib/super-probe-approval.js` was tested with disposable keys, altered command/hash/scope and expiry/refused. The pure issuance library `scripts/lib/super-probe-issuance.js` was tested with disposable signing keys and an isolated SQLite Inseme event store: atomic declaration plus budget grant, one-unit reservation before root issuance, one-use receipt, duplicate issuance refusal. No production store was changed. This offline signature validator alone is **only preparation**. The issuance library can write a COP MandateDeclaration and reserve a budget, but no trusted root-owned production issuer currently invokes it. No real production broker authorization was issued. A ROOT-OWNED, audited issuer must verify the personal signature, install the narrowly signed one-use mandate with its hard budget in Inseme, and then place a 10-minute one-use effect grant in the broker's root-only store. The pure issuance library is available for that trusted issuer; it must not be invoked from the ordinary unprivileged MCP tool. The issuer must not be an untrusted ubuntu-writable script executed with sudo without independently checking its integrity. Reconcile broker consumption with Inseme settlement and test replay refusal. A personal signature alone does not make the broker run.

### Principal workstation action, once proposal is reviewed

From Windows PowerShell on tweesic, retrieve the pinned proposal from the immutable commit, check SHA256 and inspect its JSON; only then sign using the same personal key used for earlier SSHSIG mandates:

```powershell
$proposal = "$env:TEMP\\jhn-super-probe-2026-11-07.proposal.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/JeanHuguesRobert/cogentia/52f1863/research/integration/approvals/jhn-super-probe-2026-11-07.proposal.json" -OutFile $proposal
(Get-FileHash $proposal -Algorithm SHA256).Hash
Get-Content $proposal
ssh-keygen -Y sign -f "$HOME\\.ssh\\oci-fracta-instance-jh1" -n cogentia-super-probe-v1 $proposal
scp "$proposal.sig" fracta2:/home/ubuntu/jhn-super-probe-2026-11-07.proposal.json.sig
```

Do not share or move the private key. The signature is not itself a live authorization. Never try to use an expired approval or broaden the same proposal after signing; a different effect requires a new independently signed proposal.
