> **Décision du 8 novembre 2026 :** la maintenance de Fracta2 par son propriétaire passe directement par SSH/sudo. Aucune installation d'issuer ou signature COP ne doit être exigée pour cet usage. Voir [administration du propriétaire](fractanode-owner-administration-2026-11-08.md).

> **2026-11-07 — Note de sécurité :** le vieux `scripts/super/install.sh` ci-dessous est un protocole historique de bootstrap et ne réalise PAS l'enrôlement signé ni le stockage root-owned du nouvel issuer COP. Ne l'exécutez pas pour résoudre le refus actuel de `sudo`. La procédure d'approbation proportionnée est documentée dans [le pont d'issuer Principal](cop-trusted-principal-issuer-bridge.md), qui exige un paquet figé, une clé publique du Principal authentifiée et un mandat initial signé. Ce texte historique est conservé pour l'audit, pas comme instruction d'installation actuelle.

# Cogentia Super — COP authority, Unix execution

Status: implementation candidate, pending root-owned deployment and live smoke test.
FractaTrust v0 assumes agents inside the Principal's trust perimeter are cooperative.
**COP is the sole authority**: no second broker mandate store, root token,
command allowlist, reputation scoring or agent quarantine.

## Contract

- `normal` runs scripts as `ubuntu` under the ordinary shell limits.
- `super` is an explicit execution mode under a canonical COP effect grant.
  Scripts still start as `ubuntu`. Commands requiring root explicitly use
  `sudo -n`; this is an anti-accident syntax, not a second permission check.
- The broker verifies one **stored COP effect grant** against actor, mandate,
  target, provider, exact script hash, execution mode and expiry, and marks the
  **same COP grant** consumed *before* executing anything. It records an effect
  receipt; the host router posts COP accounting. No independent grant database.
- The local Unix socket is reachable by the existing trusted `ubuntu` account,
  but an arbitrary socket request without a matching stored COP grant is denied.
  This is a deliberate FractaTrust v0 trade-off, not a hardened defense against
  a malicious administrator or a compromised trusted host.
- The current COP file store does not coordinate writers transactionally between
  unrelated processes. Within the broker, reservations are synchronous and
  serialized by the event loop. This is sufficient for the initial single-node
  experiment, not a claim of global atomicity.
- Never equate a valid grant with a permission to commit acts towards third
  parties contrary to the Principal's mandate.

## Installation on Fracta2

After the commit is pushed, from the Principal's ordinary SSH session:

```bash
cd /srv/cogentia/repos/cogentia
git pull --ff-only
bash scripts/super/install.sh
```

This script runs as `ubuntu`, uses `sudo` **only** for the system
installation and service restarts, and does not require a root shell.
It tests first, installs the root-owned broker, performs a live
`1001\n0\n` / replay-denied COP smoke test, then enables the governed
COP transport on the main MCP and updates the existing one-tool shell MCP.
The normal shell remains under `NoNewPrivileges=true`.

The previous `/var/lib/cogentia-super/mandates.json` belongs to the obsolete
experimental broker. The revised service neither reads nor writes it.
Once live tests succeed, it can be removed by the Principal using
`sudo rm -f /var/lib/cogentia-super/mandates.json`.
The audit log should be retained.

## MCP activation

The MCP core constructs the COP broker transport when enabled with
`COGENTIA_SUPER_COP_ENABLED=1` (installed service drop-in). The host
capability router still requires a valid COP authorization for effects;
the broker reserves that same authorization before running `super`.
The installer enables the flag and restarts `mcp-cogentia.service`
only **after** the root service and live smoke test succeed.
The temporary `jhn-shell-mcp.service` is also updated and restarted;
it retains its normal default and accepts `super` only with an existing
COP effect authorization ID and matching actor, Principal and mandate.

The prototype's independently minted root-local grants and the extra
`credentialResolver` adapter are retired. No ongoing SSH intervention is
required once the two services are activated.
