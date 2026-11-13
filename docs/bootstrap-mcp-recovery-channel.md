---
title: Bootstrap MCP as a voluntary outbound recovery channel
description: Provider-independent recovery architecture for FractaNodes, including NAT traversal and SSH failure.
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: '2026-11-13'
last_modified_at: '2026-11-13'
version: '1.0'
status: working-paper
license: CC BY-SA 4.0
language: en
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/bootstrap-mcp-recovery-channel.md
document_role: operational
document_kind: architecture-decision
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: '2026-11-13'
  derived_from:
    - docs/cogentia-mcp.md
    - docs/fractanode-owner-administration-2026-11-08.md
review:
  status: unreviewed
  reviewed_by: []
---

# Bootstrap MCP: voluntary outbound administrative recovery

## Decision

Retain the Bootstrap MCP as a **separate, persistent recovery path**, even for nodes with a public IPv4 address and working SSH. Its primary properties are (1) outbound-only connectivity behind NAT, private networks or changing addresses; (2) independence from `sshd`; (3) operational redundancy when the normal administration path fails; and (4) owner-controlled opt-in and revocation at the node. An assigned public IP does **not** make this channel obsolete.

The machine initiates an authenticated outbound tunnel to a remote control provider. This establishes deliberate node enrollment rather than requiring an inbound public port. The owner can disable the local service or revoke its tunnel credential. A tunnel is not, by itself, evidence that *every* arbitrary remote party is authorized; identify the enrolled controller at the existing trust boundary without a redundant per-command approval ceremony.

The Bootstrap MCP is distinct from the ordinary Cogentia MCP `https://cogentia.fractavolta.com/mcp`. The latter is a general application/corpus interface and may use HTTPS/OAuth. Do not collapse recovery into that application endpoint or make bootstrap depend on the Cogentia daemon.

## Operational requirements

- Start and recover independently of `sshd`, the public reverse proxy, the ordinary MCP server and the application daemon.
- Reconnect automatically after a VM reboot or temporary outbound outage; report live tunnel health.
- Support host diagnostics, service repair and existing Unix administration according to the machine owner's explicitly delegated operating-system privileges; preserve effect receipts.
- Treat existing, authenticated owner delegation within the Trust Perimeter as the authority boundary. Avoid synthetic per-restart/per-command issuers when no distinct threat is mitigated. Narrower delegated agents retain their own applicable scope.
- Keep credential material outside Git and published logs. Provide a local disable/revoke route.
- Verify actual recovery with normal SSH unavailable **in a controlled test**, rather than treating a listening port or connected tunnel as proof.
- The outbound tunnel may be provider-specific initially; its architectural role must not depend on a particular AI vendor.

## Three complementary recovery layers

| Layer | Depends on guest OS | Depends on SSH | Needs public guest IP | Main purpose |
| --- | --- | --- | --- | --- |
| SSH / Fractanet | Yes | Yes | No with mesh/VPN | Normal administration |
| Bootstrap MCP outbound tunnel | Yes | No | No | Remote administration and SSH repair |
| Provider serial console / boot-volume rescue | Console: guest OS not necessarily; volume rescue: separate helper | No | No | Recover from broken boot, networking and failed bootstrap |

A Bootstrap MCP cannot repair a VM that does not boot far enough to run its service, lacks outbound networking, or has lost its tunnel credentials. This is why **provider-console recovery is a normal provisioning requirement**, not a reason to discard the Bootstrap MCP.

## Historical motivating incident

On the former Oracle node `fracta`, SSH ceased to be usable. OCI serial transport actually reached a Linux `login:` prompt, but the instance had no verified local-console administrative authentication; a live connection was therefore not a working repair path. Do not describe this as merely an unconfigured Oracle console. The Principal retired the older node in favor of `fracta2` after considering recovery cost and architectural simplification. See [Operium's evidence and acceptance criteria](https://github.com/JeanHuguesRobert/operium/blob/main/docs/oracle-vps-recovery-readiness.md).

## Provisioning rule

Operium owns host provisioning. Every new FractaNode must have: normal network administration; independently deployed and exercised outbound Bootstrap MCP; and a provider recovery route **proven usable**, not merely configured. OCI provisioning must inspect/create a console connection and verify guest-side interactive recovery. Record the evidence and remaining gaps in a machine-readable provisioning receipt. See [Operium Oracle recovery readiness](https://github.com/JeanHuguesRobert/operium/blob/main/docs/oracle-vps-recovery-readiness.md).

## Status, 2026-11-13

On `fracta2`, the Bootstrap shell listener `127.0.0.1:8798` and its outbound tunnel were observed active; the regular public MCP endpoint also answered over HTTPS. OCI serial console *usable repair access* remains unverified: the guest-side presence of `ttyAMA0` and `serial-getty` alone does not prove console login and `sudo`. No claim is made here that a controlled SSH-outage recovery test succeeded.
