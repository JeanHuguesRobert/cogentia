---
title: Baileys SQLite auth migration — controlled candidate and cutover
status: working-paper
version: 1
date: 2026-11-10
last_modified_at: 2026-11-10
language: en
document_kind: operations-runbook
visibility: public
lifecycle_state: active
---

# Baileys SQLite authentication — controlled migration (#301)

## Current deployment / risk

Fracta2 runs Cogentia's JHN WhatsApp daemon under `ubuntu`, with Baileys `7.0.0-rc14` and legacy `useMultiFileAuthState()`. The legacy key store contains >1.4 million pre-keys consuming ~5.6 GiB on ext4. This repository change **does not migrate, prune, re-pair or restart the current session**. Production defaults to `multifile` if the backend env var is unset.

The live Signal authentication files are **unique private operational state**, not Git-recoverable. A coherent snapshot is required before cutover because credentials and session keys evolve while the service is active. Treat copied keys and SQLite/WAL/SHM as secrets. A stale rollback may destroy cryptographic continuity.

## Components

- `scripts/lib/agent-jhn-whatsapp/sqlite-auth-store.js`: built-in `node:sqlite` (`DatabaseSync`), `SignalKeyStore` compatible `get(type,ids)` and `set(dataset)`, atomic `null` deletions, `saveCreds`, schema version and integrity guards. Uses Baileys `BufferJSON` serialization and protobuf `app-state-sync-key` hydration. WAL and `synchronous=FULL`. One daemon process is the sole intended writer; **no multi-process/shared-network DB support**.
- `scripts/ops/import-baileys-multifile-to-sqlite.js`: explicit offline importer. Aborts if the WhatsApp systemd service is active (unless called programmatically with `requireOffline:false` for synthetic tests). Refuses to overwrite a target, malformed/missing credentials, unknown entries, count mismatches and source-creds mutation. Never prints crypto material. Old filename escaping (`/` -> `__`, `:` -> `-`) is retained as DB index normalization.
- `AGENT_JHN_WHATSAPP_AUTH_BACKEND=sqlite`: explicit *future* opt-in. Database path is `${AGENT_JHN_WHATSAPP_STATE_DIR}/baileys-sqlite/state.sqlite`; missing or malformed database **fails closed, never silently pairs anew**. Without this environment variable, the daemon keeps its existing multifile behavior.

## Controlled acceptance sequence — not yet performed

1. Confirm sufficient free disk for SQLite candidate **and** legacy auth retention, or use an adequately sized secured external volume; the root disk is only ~45 GiB and was 92% used after initial cleanup.
2. Verify last successful WhatsApp receive/decrypt and check `registered:false` discrepancy without logging decrypted content. Establish zero message sends caused by migration.
3. Schedule a bounded maintenance interruption, stop daemon through the owner's authenticated systemd administration, and verify the process is fully stopped (no alternate writers). Maintain the legacy directory unaltered and protected (`0700` dir; keys private).
4. Make a private coherent recovery copy on an adequately sized volume; preferably keep that volume detached/off-host. The copy must include `creds.json` and **all** crypto keys. Check ownership/modes and restoration path.
5. Run import on the **quiescent copy** using the Node 26 daemon runtime, with `--offline-confirmed --source COPY --target STATE_DIR/baileys-sqlite/state.sqlite`. Never run the importer on a live writer. Compare record counts to source; run `quick_check` and synthetic key roundtrip verification **without disclosure**. Keep the old source and recovery copy unchanged.
6. Install environment override only after candidate validated, start daemon and inspect successful connection and inbound decrypt without sending messages. Watch new prekey growth and SQLite db+WAL usage.
7. Keep original files and recovery copy until stable continuity is demonstrated. **Do not automatically roll back to an old snapshot after SQLite has advanced Signal credentials**; prepare coordinated recovery from the latest consistent store.
8. Remove old authentication files only after a reviewed and verified safe-retention decision, not simply by file age. Fix upstream pre-key accumulation separately; SQLite eliminates inode overhead but not unbounded logical key growth.

## Offline test commands

```bash
/usr/local/node-v26.5.0/bin/node scripts/check-agent-jhn-sqlite-auth.js
/usr/local/node-v26.5.0/bin/node scripts/check-agent-jhn-sqlite-import.js
npm run test:agent-jhn-whatsapp
```

Status: implementation & synthetic tests complete; **real multi-file import, live selection, and post-cutover decrypt NOT tested**. Linked to #301 and infrastructure #77.

## Simplified disposable-state option (Principal decision 2026-11-10)

The Principal clarified that the JHN WhatsApp service is **non-critical at present**, and that loss of the current account-linked local Signal state or messages has no operational impact. Therefore, **do not incur the expense of importing 1.43M pre-key JSON files unless continuity becomes a requirement**. Prefer creating a fresh SQLite identity and re-pairing on demand.

1. Stop the systemd service using the owner's authenticated host administration; verify it is inactive. No Agent or outbound mail is triggered.
2. On Fracta2, run the new tool as `ubuntu` with the Node 26 daemon runtime:

   ```bash
   /usr/local/node-v26.5.0/bin/node scripts/ops/init-baileys-sqlite-fresh.js --fresh-unpaired --target /var/lib/cogentia/agent-john-whatsapp/baileys-sqlite/state.sqlite
   ```

   The command makes **new, unpaired** credentials, not a clone of the former identity. It refuses to overwrite any existing DB.
3. Configure the systemd service to select `AGENT_JHN_WHATSAPP_AUTH_BACKEND=sqlite` through a root-owned systemd drop-in (do not change unrelated service variables). Verify with `systemctl show -p Environment` after `daemon-reload`.
4. Keep the daemon stopped until a human is present for explicit WhatsApp pairing. Pair under `ubuntu` with the same state-directory and backend environment; pairing with phone code is documented by the existing CLI. Do not emit pairing codes to generic logs or public tools.
5. Start the daemon, verify `open` and a real *inbound* operational event without a test message from the agent. Then, and only then, remove the obsolete multi-file auth folder to release about 5.6 GiB. Confirm the target backend is SQLite and the old directory is not open by any process. The Principal accepts permanent loss of the old state, but unlinking before successful SQLite pairing adds no useful benefit unless disk pressure is urgent.
6. Observe the new DB size, connection stability and pre-key count over time. Re-pairing should not be automated without human presence.

This disposable-state option is **simpler and cheaper** than bulk migration, but intentionally sacrifices the prior WhatsApp cryptographic state. The original importer remains available for future situations where continuity matters.
