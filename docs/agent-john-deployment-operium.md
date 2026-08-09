---
title: "Operium Deployment Guide — Agent John on Fracta VPS & Mobile Phone"
author: "Jean-Hugues Robert & Antigravity"
date: "2026-08-09"
document_role: source
document_kind: deployment-handbook
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: docs/agent-john-deployment-operium.md
---

# Operium Deployment Guide — Agent John (JHN)

This document is the official Operium operational handbook for deploying **Agent John** (`agent:jhn:john`) as an always-on 24/7/365 Personal Digital Twin on the **Fracta VPS** node and linking it to Jean-Hugues Robert's **Mobile Phone** (via WhatsApp, Tailscale, and Termux).

---

## 1. Network & Node Topology

```text
                                [TAILSCALE SECURE MESH NETWORK]
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
+-----------------------------------------------+             +-----------------------------------------------+
| FRACTA VPS NODE (Oracle Cloud - 100% Uptime)  |             | MOBILE PHONE (Android + Termux)               |
| • Tailscale IP: 100.x.y.z                     |             | • Tailscale IP: 100.a.b.c                     |
| • Services:                                   |             | • Services:                                   |
|   - cogentia-daemon.service (Port 8790)       |             |   - Termux OpenSSH daemon (Port 8022)         |
|   - agent-john-whatsapp.service (Baileys)     |             |   - Termux:Boot autostart script              |
| • State Dir: /var/lib/cogentia/agent-john     |             |   - WhatsApp Mobile App                       |
+-----------------------------------------------+             +-----------------------------------------------+
```

### Roles & Responsibilities by Node:
1. **Fracta VPS (Always-On 24/7):**
   * Captures WhatsApp events 24/7.
   * Manages the Hot SQLite database (`conversations.db`).
   * Evaluates policy gates & generates candidate drafts.
   * Emits Continuation Packets (`ctn_[hex]`) into `.cogentia/continuations/`.
2. **Mobile Phone (Connected when awake):**
   * Acts as the **Mobile Remote Control Cockpit** over WhatsApp self-chat (`+33753976287`).
   * Receives instant attention alerts when a third party requires approval.
   * Runs Termux + `sshd` (Port 8022) over Tailscale for direct SSH access from your PC or Fracta.

---

## 2. Fracta VPS Deployment (Step-by-Step)

### A. Directory Layout on Fracta VPS
```text
/srv/cogentia/repos/cogentia      # Main repository code
/srv/cogentia/repos/JeanHuguesRobert # Public twin definition & registry
/var/lib/cogentia/agent-john-whatsapp # State directory (auth, DB, logs)
```

### B. Systemd Service Unit Configuration
On Fracta VPS, create `/etc/systemd/system/agent-john-whatsapp.service`:

```ini
[Unit]
Description=Agent John WhatsApp Daemon (Cogentia Personal Digital Twin)
After=network.target cogentia-daemon.service
Wants=cogentia-daemon.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/srv/cogentia/repos/cogentia
Environment=NODE_ENV=production
Environment=AGENT_JHN_WHATSAPP_STATE_DIR=/var/lib/cogentia/agent-john-whatsapp
Environment=AGENT_JHN_WHATSAPP_SEND_ENABLED=true
Environment=AGENT_JHN_EMERGENCY_PHONE=+33753976287
Environment=AGENT_JHN_EMERGENCY_EMAIL=jeanhuguesrobert@gmail.com
Environment=HUMAN_USER_PHONE=+33753976287
Environment=HUMAN_USER_EMAIL=jeanhuguesrobert@gmail.com
ExecStart=/usr/bin/node scripts/agent-jhn-whatsapp.js run
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable agent-john-whatsapp
sudo systemctl start agent-john-whatsapp
sudo systemctl status agent-john-whatsapp
```

### C. One-Time WhatsApp Pairing Procedure
To link Fracta VPS to your mobile phone without scanning a QR code:

1. On Fracta VPS, run:
   ```bash
   node scripts/agent-jhn-whatsapp.js pair --pairing-code --phone 33753976287
   ```
2. Agent John will output an **8-digit pairing code** (e.g. `ABCD-1234`).
3. Open WhatsApp on your Android phone $\rightarrow$ **Settings** $\rightarrow$ **Linked Devices** $\rightarrow$ **Link a Device** $\rightarrow$ **Link with Phone Number instead**.
4. Type the 8-digit code.
5. The session credentials will persist in `/var/lib/cogentia/agent-john-whatsapp/baileys-auth/`. Fracta is now paired!

---

## 3. Mobile Phone Automation (Termux + Tailscale + SSHD)

### A. Automated SSHD & Tailscale Startup
On your Android phone in Termux:

1. Install OpenSSH and Termux:Boot addon:
   ```bash
   pkg update -y && pkg install -y openssh tailscale
   ```
2. Set up password or SSH key:
   ```bash
   passwd
   ```
3. Create auto-start script in Termux:Boot directory (`~/.termux/boot/start-sshd.sh`):
   ```bash
   mkdir -p ~/.termux/boot
   cp /srv/cogentia/repos/cogentia/scripts/lib/agent-jhn-whatsapp/termux-sshd-autostart.sh ~/.termux/boot/start-sshd.sh
   chmod +x ~/.termux/boot/start-sshd.sh
   ```
4. Start SSHD manually or launch via Termux:Boot:
   ```bash
   sshd -p 8022
   ```

### B. Accessing Mobile Phone Termux via Tailscale
From your PC or Fracta VPS, connect directly over Tailscale:
```bash
ssh -p 8022 u0_a...@100.x.y.z
```

---

## 4. Mobile Remote Control Cockpit (WhatsApp Verbs)

Once paired, open your WhatsApp **"Message Yourself"** thread (`+33753976287`) and type any command:

| Command | Action |
| :--- | :--- |
| `help` | Displays the mobile control cockpit menu |
| `list conversations` | Lists active threads and pending continuations |
| `inspect <conv_id\|ctn_id>` | Inspects recent turns or continuation details |
| `approve <ctn_id>` | Fulfills a continuation & sends the approved reply |
| `reject <ctn_id> [reason]` | Rejects a request & sends polite refusal |
| `contact list` | Displays your contact book & trust badges |
| `contact add <phone> <name> [tier]` | Adds a new contact record |

---

## 5. Operium Verification & Health Checks

Verify operational health from Fracta VPS:

```bash
# Check systemd service
sudo systemctl status agent-john-whatsapp

# Inspect active traces
node scripts/agent-jhn-whatsapp.js inspect-traces --limit 5

# Inspect emergency contact config
node scripts/agent-jhn-whatsapp.js inspect-config
```

Agent John is now 100% operational on Fracta VPS and paired with your mobile phone! 🚀
