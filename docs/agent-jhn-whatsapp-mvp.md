---
document_role: operational
document_kind: operational-note
visibility: public
lifecycle_state: active
title: Agent JHN WhatsApp MVP (Baileys, self-chat only)
related_issue: https://github.com/JeanHuguesRobert/cogentia/issues/75
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Agent JHN WhatsApp MVP

First direct WhatsApp adapter for Agent JHN. Narrow by design.

## What this MVP does

- Optional local WhatsApp Web session via **Baileys** (unofficial, experimental, replaceable).
- **Self-chat only**: one allowed JID = Jean Hugues Robert’s own number / self conversation.
- Receive → normalize → pure policy → private trace → optional outbox → **outbound gate** (sole material send path).
- Deterministic non-engaging draft stub with mandatory experimental disclosure.
- Group conversation **shape** and graduated policy modes are represented and tested with synthetic events; **group activation is out of scope** for the first real test.

## What it excludes

- OpenClaw runtime, public REST, CRM, UI, multi-tenancy, Personas.
- Third-party send, media handling, campaign automation, commercial bots.
- Linking WhatsApp to Agent Gateway, shell, browser, or general action tools.
- Representation mandate: Agent JHN is **not** Jean Hugues Robert and does not speak in his name.
- Concurrent multi-agent use of the same account (architecture allows future grants; MVP activates only `agent-jhn`).

## Architecture

```text
Baileys          = session, pairing, events, material send
Cogentia policy  = mandate, usage grant, pure decisions, provenance, trace
outbound-gate    = unique frontier that may authorize material send
```

Baileys never sees corpus policy. Cognitive code never holds session secrets or calls `sendMessage` directly.

**Strategic placement (anti-capture):** message channels and free-tier hosts are *placements*, not prisons. Prefer cheap external capacity when reasonable, without locking the principal into a vendor; keep a sovereign path. See `research/digital_twin_trust_model.md` §9.1.

**John (Inseme platform / JHN instance):** non-session WhatsApp config is stored in the personal instance vault (`public.instance_config` on the JHN Supabase project). Workstation SoT remains `inseme/.env` → `push-env-to-vault --apply`. Baileys session files stay under `STATE_DIR` on disk (not vault). See Inseme `apps/platform/docs/CONFIGURATION_VAULT.md` (Agent JHN WhatsApp section).

### Identity separation

| Field | Role |
|-------|------|
| `account_custodian_id` | Human account holder (JHN) |
| `beneficiary_instance_id` | Instance holding a usage grant (`agent-jhn`) |
| `visible_agent_id` | Public experimental label |
| `mandate_id` | Non-commitment experimental mandate |
| `persona_id` | Always `null` in this MVP |

Usage is a **mediated grant**, not transfer of the account or of secrets. See issue #75 amendment (commodat / non-exclusive capacity vocabulary is internal governance only).

## Commands

```bash
node scripts/agent-jhn-whatsapp.js --help
node scripts/agent-jhn-whatsapp.js status
node scripts/agent-jhn-whatsapp.js pair --i-am-present
node scripts/agent-jhn-whatsapp.js run --dry-run
node scripts/agent-jhn-whatsapp.js run --dry-run --once --mock
node scripts/agent-jhn-whatsapp.js wipe-session --i-am-present
```

npm test target:

```bash
npm run test:agent-jhn-whatsapp
```

## Configuration (example, no secrets)

### Occam placement (do not invent a third home)

| Concern | Existing container |
|---------|-------------------|
| Adapter code, schemas, offline tests | **`cogentia`** (public method) |
| Private living traces, curated interaction memory | **`registre-mariani`** (private registry precedent) |

Do **not** create a parallel workspace dump (e.g. ad-hoc `C:\tweesic\.local\…`) when `registre-mariani` already exists for private operational memory. That would violate corpus Occam discipline (smallest sufficient container).

Recommended paths on this machine:

```text
AGENT_JHN_WHATSAPP_STATE_DIR=C:\tweesic\registre-mariani\runtime\agent-jhn-whatsapp
AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID=336xxxxxxxx@s.whatsapp.net
AGENT_JHN_WHATSAPP_NOTICE_URL=https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/agent-jhn-experimental-notice.md
AGENT_JHN_WHATSAPP_MODE=self_chat_only
AGENT_JHN_WHATSAPP_SEND_ENABLED=false
```

### What must not be committed vs what may be versioned

Even inside the **private** `registre-mariani` repo, session keys and raw bodies stay gitignored (same rule as `secrets/`).

| Layer | Location | Git? |
|-------|----------|------|
| Baileys session (`creds.json`, keys) | `registre-mariani/runtime/agent-jhn-whatsapp/baileys-auth/` | **Never** |
| Raw private message bodies | `…/raw-private/` | **Never** |
| Machine outbox / delivery ledger | `…/outbox/`, `sent-ledger.jsonl` | **Never** |
| Technical NDJSON traces | `…/traces/` | **Never** by default |
| Curated private Interaction Packets | `registre-mariani/interaction_packets/packets/` | **Yes**, after human curation |
| Channel registry rows (mail today; WhatsApp when useful) | `registre-mariani/interaction_packets/mail_trace.md` (+ optional sibling table) | **Yes**, curated |
| Method / public protocol copies | `cogentia/interaction_packets/` | method only, not private dumps |

`STATE_DIR` = transport custody. `registre-mariani/interaction_packets/` = intentional private memory (mail already lives there).

### WhatsApp number vs active SIM

WhatsApp identity follows the **account registration number**, not whichever SIM is currently in the handset.

- If the WhatsApp account is still tied to an old MSISDN, `ALLOWED_SELF_JID` must use that number (`33` + national number without leading `0` + `@s.whatsapp.net`).
- A new Lyca (or other) SIM can provide data/calls while WhatsApp multi-device still uses the old account over Wi‑Fi/data — until WhatsApp forces SMS re-verification on the old number.
- Self-chat is the “Message yourself” thread of **that WhatsApp account**, not SMS to the Lyca line.

See `registre-mariani/runtime/README.md` and `cogentia/interaction_packets/architecture.md`.

Optional:

```text
AGENT_JHN_WHATSAPP_GRANT_REVOKED=false
AGENT_JHN_WHATSAPP_GRANT_EXPIRES_AT=
AGENT_JHN_WHATSAPP_GROUPS_ENABLED=false
AGENT_JHN_WHATSAPP_GROUP_POLICIES_JSON=
```

- `self_chat_only` is mandatory.
- **Send is off at install.** Enable only with explicit local `SEND_ENABLED=true` and a valid grant.
- `STATE_DIR` must be absolute and private (sessions, raw payloads, traces).

Copy reference: `scripts/lib/agent-jhn-whatsapp/env.example`.

## Baileys disclaimer

[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) is a **community WhatsApp Web multi-device client**, not an official Meta API. It is experimental, may break, and may violate WhatsApp terms if abused. This adapter treats it as a **swappable transport**. Prefer official channels if/when a governed product path exists.

## Pairing without committing QR/session

1. Jean Hugues Robert must be present (and control the phone that holds the WhatsApp account).
2. `pair --i-am-present` only.

### Important: phone-only links

Baileys may print a **WhatsApp multi-device link**. WhatsApp will say it can only be used on a phone if you open it in a **PC browser**. That is expected — open the link **on the phone**, not on the PC.

The CLI will:

- label the material as phone-only when it looks like a URL;
- try to copy it to the **PC clipboard** (so you can paste into a channel the phone can open);
- write an ephemeral file `STATE_DIR/OPEN-ON-PHONE-ONLY.txt` (gitignored; deleted after successful link).

### Prefer pairing code (no link to transfer)

```bash
node scripts/agent-jhn-whatsapp.js pair --i-am-present --pairing-code --phone 33678059481
```

On the phone: WhatsApp → Linked devices → Link a device → **Link with phone number** → type the short code.

### How to get a phone-only link from the PC to the phone

| Method | How |
|--------|-----|
| Clipboard + self channel | After `pair`, paste from PC into email/SMS/note to yourself → open on phone |
| Ephemeral file | Read `registre-mariani/runtime/agent-jhn-whatsapp/OPEN-ON-PHONE-ONLY.txt` if synced/accessible |
| SSH from phone | SSH into the PC, run `pair`, long-press the URL in the mobile SSH app → Open |
| Pairing code | No link; type digits shown in the terminal into WhatsApp |

Do **not** post the link or code in a public chat or public QR website.

5. Session files live only under `STATE_DIR/baileys-auth/` (gitignored under `registre-mariani/runtime/…`).
6. Never commit `creds.json`, keys, pair links, pairing codes, or private messages.

## Offline tests

All acceptance tests are deterministic and network-free regarding WhatsApp:

```bash
npm run test:agent-jhn-whatsapp
```

They cover normalization, third-party and group rejection, persona/engaging refuse, notice in draft, send disabled, self-chat authorize path (mock transport), outbox idempotence and backoff, traces, secret redaction, and usage-grant rules.

## Stop, revoke, wipe

| Action | How |
|--------|-----|
| Stop process | Ctrl+C / SIGTERM (CLI disconnects socket) |
| Disable send immediately | `AGENT_JHN_WHATSAPP_SEND_ENABLED=false` or `AGENT_JHN_WHATSAPP_GRANT_REVOKED=true` |
| Wipe local session | `wipe-session --i-am-present` (deletes `baileys-auth` only) |
| Full local wipe | Delete entire `STATE_DIR` offline |

Revoking the usage grant blocks outbox drain **before** transport.

## Human presence rule

Before any real account access (pair, non-dry-run run, wipe):

- Jean Hugues Robert must be present and pass `--i-am-present`.
- Coding agents must **not** pair or send without his explicit decision.

## WhatsApp is a channel only

The corpus, mandate, memory, and decision authority **do not live in WhatsApp**. WhatsApp carries messages; Cogentia owns context, policy, and private traces under local state.

## Module layout

```text
scripts/agent-jhn-whatsapp.js
scripts/lib/agent-jhn-whatsapp/
  config.js
  baileys-transport.js
  inbound-normalizer.js
  policy.js
  usage-grant.js
  outbound-gate.js
  trace.js
  draft.js
  pipeline.js
  constants.js
  index.js
  env.example
trace/schemas/whatsapp-artifact.schema.json
scripts/test-agent-jhn-whatsapp.js
```

## Experimental disclosure (audience + locale)

| Audience | What the recipient sees |
|----------|-------------------------|
| **Self** (Message yourself / own JID) | Light identification only (`— agent-jhn-experimental`). No verbose notice noise. |
| **Third party** (when later authorized) | Clear chatbot framing: not Jean Hugues Robert in person; non-binding; full disclosure URL |

Locale: **French** when the relevant number is country code **+33**; otherwise **English**. Other country codes can be added later in `disclosure.js`.

Notice URL (third-party / docs):

https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/agent-jhn-experimental-notice.md

### Direct contact email & Thread History Awareness

- **Reliable direct contact email**: `jeanhuguesrobert@gmail.com` is established as the official direct human contact method for Jean-Hugues Robert.
- **Thread History-Aware Suppression**: To avoid annoying respondents with redundant notice headers or repeated email addresses, the pipeline inspects thread history (`conversations/<id>.json` sliding turn window). If full disclosure or direct contact email was sent recently in the active thread, the system suppresses repeating full disclosure disclaimers and uses light identification (`— agent-jhn-experimental`).

