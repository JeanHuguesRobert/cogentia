---
packet_id: CPKT-2026-005
packet_kind: cognitive-packet/v0.1
packet_version: 1
created: "2026-07-30"
title: "Session handoff — Agent JHN WhatsApp message channel (mechanism + John vault)"
home_of_record: "the human author (Jean Hugues Noël Robert)"
subscribing_homes:
  - "JeanHuguesRobert/cogentia (adapter code, tests, schemas, trust model)"
  - "JeanHuguesRobert/inseme (John/platform vault mapping; .env never in this packet)"
  - "JeanHuguesRobert/registre-mariani (private runtime STATE_DIR only; not git session secrets)"
carrier: "the human author (opens the next session with any coding agent)"
status: "mechanism shipped; twin ops / always-on presence deferred"
visibility: public
document_role: operational
document_kind: cognitive-packet-handoff
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/75"
  - "docs/agent-jhn-whatsapp-mvp.md"
  - "docs/agent-jhn-whatsapp-interaction-register.md"
  - "research/digital_twin_trust_model.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/apps/platform/docs/CONFIGURATION_VAULT.md"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# CPKT-2026-005 — Agent JHN WhatsApp channel handoff

**You are a cognitive processor receiving a continuation packet.** Resume from
**published commits and files**, not from a chat transcript or any agent
“personal memory.” Do not store new invariants only in tool memory — write them
to the owner’s corpus or registry.

## One-line status

WhatsApp is the **second message channel** (after mail) for Agent JHN: **self-chat
only** mechanism is on `cogentia` main, live-proven under human supervision;
**config (not Baileys session)** is in the **John / JHN Supabase vault**; always-on
daemon / multi-twin ops **not** done.

## Published code (mechanism)

| Repo | Commit (approx.) | What |
|------|------------------|------|
| `cogentia` | `545b963` | Adapter MVP + tests + Baileys `7.0.0-rc13` |
| `cogentia` | `e1c6296` | Docs → Inseme JHN vault |
| `inseme` | `6f66f3c` | Vault ENV mapping for WhatsApp keys |

Issue: [cogentia#75](https://github.com/JeanHuguesRobert/cogentia/issues/75) — mechanism comment posted; product/twin wiring remains open.

### Layout (cogentia)

```text
scripts/agent-jhn-whatsapp.js          # status | pair | run | send | wipe-session
scripts/lib/agent-jhn-whatsapp/        # transport, policy, grant, gate, disclosure, …
scripts/test-agent-jhn-whatsapp.js     # npm run test:agent-jhn-whatsapp (23 offline)
trace/schemas/whatsapp-artifact.schema.json
docs/agent-jhn-whatsapp-mvp.md
```

### Architecture invariants (do not re-litigate without human)

```text
Baileys          = WhatsApp Web transport only (replaceable)
policy + grant   = pure decisions; default reject
outbound-gate    = sole material send path
self_chat_only   = MVP contact scope
persona_id       = null
agent ≠ principal
channel ≠ corpus / mandate residence
```

Disclosure:

- **Self:** light id (`— agent-jhn-experimental`), no verbose notice noise.
- **Third party (later):** clear chatbot framing + notice URL.
- **Locale:** French if country code **+33**, else English (`disclosure.js`).

Anti-capture (strategic): `research/digital_twin_trust_model.md` **§9.1** — free tiers OK when reversible; sovereign path required; opposite of vendor client-capture.

## Runtime placement (John / Occam)

| Layer | Where | Git? |
|-------|--------|------|
| Adapter code | `cogentia` | yes |
| Config/PII (JID, peer, paths, flags) | JHN Supabase `instance_config` + workstation `inseme/.env` SoT | env/vault only |
| Baileys session | `STATE_DIR/baileys-auth/` under principal registry runtime | **never** |
| Curated interaction memory | `registre-mariani/interaction_packets/` when human curates | yes (curated) |

Canonical local STATE_DIR (this workstation):

```text
C:\tweesic\registre-mariani\runtime\agent-jhn-whatsapp
```

Vault keys (names only — **no values in this packet**):

```text
agent_jhn_whatsapp_allowed_self_jid
agent_jhn_whatsapp_preferred_self_peer
agent_jhn_whatsapp_state_dir
agent_jhn_whatsapp_mode
agent_jhn_whatsapp_send_enabled   # default false in vault
agent_jhn_whatsapp_notice_url
agent_jhn_whatsapp_grant_id
agent_jhn_whatsapp_mandate_id
```

Push path: `inseme/apps/platform` → `node scripts/push-env-to-vault.js --apply`  
with JHN `SUPABASE_URL` + `SERVICE_ROLE` (project ref pattern `ndiysuh…`).

**Not in vault:** Baileys multi-device creds (re-pair on new host unless a dedicated
encrypted session-export is designed later).

## Live proof (supervised; do not treat as automated CI)

- Pairing via **pairing code** (not PC-openable link alone).
- Receive + auto-reply on **Message yourself** (`@lid` peer matters for proactive send).
- Proactive `send` works when preferred self peer is known.
- Human confirmed disclosure link on self-chat.

During development a real account was used **only under explicit human decision**.
No third-party messaging implemented/authorized.

## Explicit non-goals (still out of scope)

- Always-on daemon / Fracta systemd / Netlify Deno long-window as product runtime.
- Multi-twin provisioning; third-party or group send.
- OpenClaw runtime; Agent Gateway ↔ WhatsApp.
- LLM-dependent draft (deterministic stub only; continuation left for model path).

## Strategic context (for next agent)

1. **Mail** = first message channel; **WhatsApp** = second — extend via shared
   channel invariants, not a second brain.
2. **OpenClaw-class** = multi-channel gateway + high action surface; **we** =
   transport + mandate + traces (anti-capture of principal).
3. **Scaling idea (not implemented):** per-principal cheap placements
   (GitHub + Supabase + Netlify) vs single Fracta overload; always keep sovereign
   option.
4. Twin product use = **tests first**, priority instance **John** (Inseme platform /
   Agent JHN), not production autonomy.

## Safe resume commands (no network WhatsApp required)

```powershell
cd C:\tweesic\cogentia
npm run test:agent-jhn-whatsapp
node scripts/agent-jhn-whatsapp.js status
```

Live (human present only):

```powershell
# env from inseme/.env or vault-derived; SEND_ENABLED only when intentionally testing
node scripts/agent-jhn-whatsapp.js pair --i-am-present --pairing-code --phone <E164 digits>
node scripts/agent-jhn-whatsapp.js run --i-am-present
node scripts/agent-jhn-whatsapp.js send --i-am-present --text "…"
```

## Suggested next steps (ordered)

1. Human: decide presence model for **tests** (local `run` vs later daemon).
2. Optional: curated `registre-mariani` interaction packet for the first self-chat experiment (no raw bodies).
3. Optional: thin `docs/message-channel-invariants.md` binding mail + WA.
4. Later: John twin product path reads vault keys → runs adapter without re-hardcoding.
5. Do **not** enable third-party send without new mandate + grant.

## Handoff hygiene (anti-capture)

| Do | Do not |
|----|--------|
| Resume from this packet + git | Rely on prior chat “memory” |
| Keep secrets in vault / local STATE_DIR | Commit `baileys-auth`, QR, pairing codes |
| Write new decisions into corpus/registry | Store architecture only in agent product memory |

## Report stub for next closed session

```text
Issue/ref:
Commits:
Real WhatsApp touched: yes/no
External third-party message: yes/no
Secrets committed: yes/no
Next human decision:
```
