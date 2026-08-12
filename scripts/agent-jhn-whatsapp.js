#!/usr/bin/env node
/**
 * Agent JHN WhatsApp MVP CLI
 *
 * Commands:
 *   help | status | pair | run [--dry-run] | wipe-session | revoke-grant-check
 *
 * Safety:
 * - SEND_ENABLED defaults to false
 * - pair requires --i-am-present
 * - run without --dry-run still refuses send unless SEND_ENABLED and session
 * - never prints session secrets or QR to stdout logs beyond ephemeral pair display
 *
 * Issue: https://github.com/JeanHuguesRobert/cogentia/issues/75
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  loadConfig,
  validateConfig,
  publicConfigSnapshot,
  ensureStateDirs,
  resolveAuthDir,
} from "./lib/agent-jhn-whatsapp/config.js";
import { handleInbound } from "./lib/agent-jhn-whatsapp/pipeline.js";
import {
  drainWhatsappOutbox,
  requestOutboundSend,
  buildActionRequestId,
} from "./lib/agent-jhn-whatsapp/outbound-gate.js";
import {
  createBaileysTransport,
  createMockTransport,
} from "./lib/agent-jhn-whatsapp/baileys-transport.js";
import { normalizeInboundEvent } from "./lib/agent-jhn-whatsapp/inbound-normalizer.js";
import { draftIncludesNotice } from "./lib/agent-jhn-whatsapp/policy.js";
import {
  AUDIENCE,
  formatOutboundText,
  outboundDisclosureOk,
} from "./lib/agent-jhn-whatsapp/disclosure.js";
import {
  redactForDiagnostics,
  assertNoSecretsInDiagnostics,
} from "./lib/agent-jhn-whatsapp/trace.js";
import {
  printPairMaterial,
  clearPhoneOnlyPairFile,
} from "./lib/agent-jhn-whatsapp/pair-display.js";
import { outboxStats } from "./ops/edge/lib/outbox.js";
import { evaluateUsageGrant } from "./lib/agent-jhn-whatsapp/usage-grant.js";

const HELP = `
Agent JHN WhatsApp MVP (self-chat only)

Usage:
  node scripts/agent-jhn-whatsapp.js <command> [options]

Commands:
  help              Show this help
  status            Safe local status (no secrets)
  pair              Interactive pairing (requires --i-am-present)
  run               Controlled runtime
  send              One-shot self-chat send (requires --i-am-present --text)
  wipe-session      Delete local Baileys auth files only

Options:
  --dry-run         No material transport send; policy + outbox inspectable
  --i-am-present    Confirm Jean Hugues Robert is present for pair/run real session
  --text <msg>      Message body for send (self-chat only; notice appended if missing)
  --pairing-code    Prefer short phone linking code (best for SSH / no camera scan)
  --phone <digits>  Number for pairing code (E.164 digits, e.g. 33678059481)
  --mock            Use mock transport (never touches WhatsApp)
  --once            Process synthetic self-ping then exit (with --mock/--dry-run)
  --json            Machine-readable status

Pairing note:
  The QR payload is NOT a browser URL to copy/paste. Prefer --pairing-code:
  WhatsApp → Linked devices → Link a device → Link with phone number → enter code.

Environment (see docs/agent-jhn-whatsapp-mvp.md):
  AGENT_JHN_WHATSAPP_STATE_DIR          absolute private path (required)
  AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID   self JID for self_chat_only
  AGENT_JHN_WHATSAPP_SEND_ENABLED       default false
  AGENT_JHN_WHATSAPP_MODE               must be self_chat_only
  AGENT_JHN_WHATSAPP_NOTICE_URL         experimental disclosure URL
  AGENT_JHN_WHATSAPP_GRANT_REVOKED      set true to revoke send capacity
  AGENT_JHN_WHATSAPP_RETRIEVAL          guide|librarian|shadow (default guide)
  AGENT_JHN_WHATSAPP_GATEWAY_URL        Context Gateway for librarian path

Invariants:
  - No third-party send, no media, no public HTTP server
  - Persona forbidden; Agent JHN is not the human principal
  - Baileys is experimental unofficial WhatsApp Web transport
`.trim();

function parseArgs(argv) {
  const args = {
    command: "help",
    dryRun: false,
    iAmPresent: false,
    mock: false,
    once: false,
    json: false,
    pairingCode: false,
    phone: null,
    text: null,
  };
  const rest = argv.slice(2);
  if (rest.length === 0) return args;
  args.command = rest[0];
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--i-am-present") args.iAmPresent = true;
    else if (a === "--pairing-code") args.pairingCode = true;
    else if (a === "--qr") { args.pairingCode = false; args.qr = true; }
    else if (a === "--text") {
      args.text = rest[i + 1] || null;
      i += 1;
    } else if (a.startsWith("--text=")) {
      args.text = a.slice("--text=".length);
    } else if (a === "--phone" || a === "--phone-number") {
      args.phone = rest[i + 1] || null;
      i += 1;
      args.pairingCode = true;
    } else if (a.startsWith("--phone=")) {
      args.phone = a.slice("--phone=".length);
      args.pairingCode = true;
    } else if (a === "--mock") args.mock = true;
    else if (a === "--once") args.once = true;
    else if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") args.command = "help";
  }
  return args;
}

/**
 * Self-chat wrap: light identification only (FR if +33).
 * Third-party wrap (when used later): full chatbot disclosure.
 */
function wrapOutboundText(text, config, options = {}) {
  const audience = options.audience || AUDIENCE.SELF;
  return formatOutboundText(String(text || "").trim(), {
    audience,
    noticeUrl: config.notice_url,
    phoneOrJid: options.phoneOrJid || config.allowed_self_jid,
  });
}

function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function cmdStatus(config, args) {
  const validation = validateConfig(config, {
    requireStateDir: false,
    requireSelfJid: false,
  });
  const snap = publicConfigSnapshot(config);
  let outbox = null;
  let session = null;
  if (config.state_dir && fs.existsSync(config.state_dir)) {
    try {
      outbox = outboxStats(config.state_dir);
    } catch {
      outbox = { pending: 0, failed: 0, error: "unreadable" };
    }
    const authDir = resolveAuthDir(config);
    session = {
      auth_dir_exists: fs.existsSync(authDir),
      session_files_present: fs.existsSync(path.join(authDir, "creds.json")),
    };
  }
  const grant = evaluateUsageGrant(config.usage_grant, {
    requestedInstanceId: config.agent_id,
    requireSend: true,
  });
  const payload = redactForDiagnostics({
    ok: true,
    validation,
    config: snap,
    outbox,
    session,
    usage_grant_send_check: grant,
    send_path: "outbound-gate only; agents cannot call sendMessage",
  });
  const secretCheck = assertNoSecretsInDiagnostics(payload);
  if (args.json) {
    printJson({ ...payload, secret_check: secretCheck });
  } else {
    console.log("Agent JHN WhatsApp — status");
    console.log(`  mode: ${snap.mode}`);
    console.log(`  send_enabled: ${snap.send_enabled}`);
    console.log(`  dry_run: ${snap.dry_run}`);
    console.log(`  state_dir_configured: ${snap.state_dir_configured}`);
    console.log(`  self_jid_configured: ${snap.allowed_self_jid_configured}`);
    console.log(`  grant_revoked: ${snap.usage_grant?.revoked}`);
    console.log(`  grant_send_ok: ${grant.ok} (${grant.rule_id})`);
    if (outbox) console.log(`  outbox pending/failed: ${outbox.pending}/${outbox.failed}`);
    if (session) console.log(`  session files present: ${session.session_files_present}`);
    if (!validation.ok) {
      console.log("  config errors:");
      for (const e of validation.errors) console.log(`    - ${e}`);
    }
    for (const w of validation.warnings || []) console.log(`  warning: ${w}`);
  }
  return validation.ok ? 0 : 1;
}

async function cmdPair(config, args) {
  if (!args.iAmPresent) {
    console.error("pair refused: pass --i-am-present (Jean Hugues Robert must be present).");
    console.error("No QR / pairing code will be generated without this flag.");
    return 2;
  }
  const validation = validateConfig(config, { requireStateDir: true });
  if (!validation.ok) {
    console.error("config invalid:", validation.errors.join("; "));
    return 1;
  }
  ensureStateDirs(config);

  // Prefer pairing code when requested (SSH / typing on phone).
  // Default may still emit a WhatsApp link that works ONLY when opened on a phone.
  const wantCode = args.pairingCode === true;
  console.log("Starting interactive pairing.");
  console.log("Session files stay under STATE_DIR only. Do not commit them.");
  if (wantCode) {
    console.log("Mode: pairing CODE (type it on the phone).");
    console.log("CRITICAL: use the WhatsApp ACCOUNT number (here: 06 78 05 94 81 / 33678059481),");
    console.log("NOT a different SIM (e.g. Lyca 07…) unless WhatsApp itself was migrated to it.");
    console.log("On phone: WhatsApp → Linked devices → Link a device → Link with phone number.");
    console.log("If WhatsApp says 'check the phone number', the code expired or the number mismatch.");
  } else {
    console.log("Mode: multi-device link / QR from Baileys.");
    console.log("If WhatsApp shows a link: open it ON THE PHONE — a PC browser will refuse it.");
    console.log("Easiest without transfer hassle: re-run with --pairing-code.");
  }
  console.log("Press Ctrl+C after successful link to stop.");

  let linked = false;
  let qrNoiseCount = 0;
  const transport = createBaileysTransport(config, {
    onQr: (qr) => {
      if (wantCode) {
        // Do not flood the human with wa.me links when pairing-code is the path.
        qrNoiseCount += 1;
        if (qrNoiseCount === 1) {
          console.log("[info] Link/QR noise suppressed in --pairing-code mode; use the CODE only.");
        }
        return;
      }
      console.log("\n============================================================");
      console.log("SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE (Linked Devices):");
      console.log("============================================================\n");
      try {
        const qrcodeTerminal = require("qrcode-terminal");
        qrcodeTerminal.generate(qr, { small: true });
      } catch {
        try {
          import("qrcode-terminal").then((m) => {
            (m.default || m).generate(qr, { small: true });
          });
        } catch {
          console.log(`[QR raw string]: ${qr}`);
        }
      }
    },
    onPairingCode: (code, phone) => {
      // Ultra-visible block (also written to STATE_DIR + Desktop for humans).
      const block = [
        "",
        "############################################################",
        "#                                                          #",
        `#   PAIRING CODE:  ${String(code).padEnd(28)}#`,
        `#   PHONE:         ${String(phone).padEnd(28)}#`,
        "#                                                          #",
        "############################################################",
        "",
        "ON THE PHONE NOW:",
        "  WhatsApp → Settings → Linked devices → Link a device",
        "  → Link with phone number  (NOT camera QR)",
        `  → type: ${code}`,
        "",
        "(Ephemeral. Do not commit. No browser link needed.)",
        "",
      ].join("\n");
      console.log(block);
      try {
        const body = [
          "CODE A SAISIR MAINTENANT DANS WHATSAPP (telephone)",
          "================================================",
          String(code),
          "",
          `Numero: ${phone}`,
          "WhatsApp → Parametres → Appareils lies → Lier un appareil",
          "→ Lier avec un numero de telephone → saisir le code",
          "",
        ].join("\n");
        const stateFile = path.join(config.state_dir, "PAIRING-CODE.txt");
        fs.writeFileSync(stateFile, body, "utf8");
        console.log(`Also written: ${stateFile}`);
        const desk = path.join(os.homedir(), "Desktop", "WHATSAPP-PAIRING-CODE.txt");
        try {
          fs.writeFileSync(desk, body, "utf8");
          console.log(`Also written: ${desk}`);
        } catch {
          /* desktop may not exist */
        }
      } catch (err) {
        console.log(`[warn] could not write PAIRING-CODE.txt: ${err.message}`);
      }
    },
    onConnectionUpdate: (u) => {
      if (u.connection) console.log(`[connection] ${u.connection}`);
      if (u.connection === "open") {
        linked = true;
        clearPhoneOnlyPairFile(config.state_dir);
        console.log("Linked successfully. Ephemeral pair file cleared if present.");
        console.log("You can Ctrl+C and later: run --i-am-present");
      }
    },
  });

  const result = await transport.pair({
    confirmHumanPresent: true,
    pairingCode: wantCode,
    phoneNumber: args.phone || config.allowed_self_jid,
  });
  if (!result.ok) {
    console.error(result.error);
    await transport.disconnect();
    return 1;
  }
  if (result.mode === "already_registered") {
    console.log(result.note);
    await transport.disconnect();
    return 0;
  }

  await new Promise((resolve) => {
    const onSig = async () => {
      await transport.disconnect();
      resolve();
    };
    process.once("SIGINT", onSig);
    process.once("SIGTERM", onSig);
    // Auto-exit shortly after successful link so SSH sessions are not stuck forever.
    const timer = setInterval(async () => {
      if (linked) {
        clearInterval(timer);
        console.log("Exiting pair after successful link.");
        await transport.disconnect();
        resolve();
      }
    }, 1000);
  });
  return 0;
}

async function cmdRun(config, args) {
  const dryRun = args.dryRun || config.dry_run;
  config = { ...config, dry_run: dryRun };

  const validation = validateConfig(config, {
    requireStateDir: true,
    requireSelfJid: Boolean(config.send_enabled && !dryRun),
  });
  if (!validation.ok) {
    console.error("config invalid:", validation.errors.join("; "));
    return 1;
  }
  ensureStateDirs(config);

  if (!dryRun && !args.mock && !args.iAmPresent) {
    console.error("run without --dry-run/--mock requires --i-am-present.");
    console.error("Prefer: node scripts/agent-jhn-whatsapp.js run --dry-run");
    return 2;
  }

  if (args.mock || dryRun) {
    return runOffline(config, args, dryRun);
  }

  // Real session path — still send_enabled must be true for material send
  console.log("Real Baileys run. Material send only if SEND_ENABLED=true and grant valid.");
  if (!config.send_enabled) {
    console.log("SEND_ENABLED=false: will receive/normalize/draft only; no material send.");
  }

  let stopping = false;
  const transport = createBaileysTransport(config, {
    onQr: () => {
      console.error("Session needs re-pair. Stop and run: pair --i-am-present");
    },
    onMessage: async (msg) => {
      if (stopping) return;
      const result = await handleInbound(msg, config, {
        source: "baileys",
        enableCognitiveSynthesis: true,
        onCognitiveError: (_error, diagnostics = {}) => console.error(JSON.stringify({
          event: "cognitive_error",
          ...diagnostics,
        })),
      });
      // Safe diagnostics only (no message body, no secrets).
      console.log(JSON.stringify({
        event: "inbound_handled",
        decision: result.policy.decision,
        rule_id: result.policy.rule_id,
        allow_send: result.policy.allow_send,
        enqueued: result.outbound?.enqueued || false,
        conversation_kind: result.normalized?.conversation_kind,
        from_me: result.normalized?.from_me,
        text_length: result.normalized?.text_length,
        has_media: result.normalized?.has_media,
        remote_suffix: result.normalized?.remote_jid_suffix,
        is_lid: result.normalized?.is_lid,
      }));
      if (config.send_enabled) {
        const drained = await drainWhatsappOutbox(config, { transport, dryRun: false });
        if (drained.sent > 0) {
          console.log(JSON.stringify({ event: "outbox_sent", count: drained.sent }));
        }
        if (drained.results?.length) {
          for (const r of drained.results) {
            if (!r.sent) {
              console.log(JSON.stringify({ event: "outbox_item", ...r, text: undefined }));
            }
          }
        }
      }
    },
    onConnectionUpdate: (u) => {
      if (u.connection) console.log(`[connection] ${u.connection}`);
    },
  });

  const conn = await transport.connect({ confirmHumanPresent: true });
  if (!conn.ok) {
    console.error(conn.error);
    return 1;
  }

  console.log("Running. Ctrl+C for clean stop.");
  await new Promise((resolve) => {
    const onSig = async () => {
      stopping = true;
      await transport.disconnect();
      resolve();
    };
    process.once("SIGINT", onSig);
    process.once("SIGTERM", onSig);
  });
  return 0;
}

async function runOffline(config, args, dryRun) {
  console.log(JSON.stringify({
    event: "run_offline",
    dry_run: dryRun,
    mock: true,
    send_enabled: config.send_enabled,
  }));

  const transport = createMockTransport({ connected: true });

  if (args.once) {
    const selfJid = config.allowed_self_jid || "00000000000@s.whatsapp.net";
    const synthetic = {
      key: {
        id: `dryrun-${Date.now()}`,
        remoteJid: selfJid,
        fromMe: false,
      },
      message: { conversation: "experimental dry-run ping" },
      messageTimestamp: Math.floor(Date.now() / 1000),
    };
    const result = await handleInbound(synthetic, config, {
      source: "dry-run-once",
      includeDraftText: false,
    });
    const drained = await drainWhatsappOutbox(config, {
      transport,
      dryRun: true,
    });
    printJson({
      inbound: result,
      drain: drained,
      mock_sent: transport.getSent(),
      note: "No real WhatsApp account touched; no external message sent",
    });
    return 0;
  }

  console.log("Offline/mock idle. Use --once for a synthetic self-ping, or Ctrl+C to stop.");
  console.log("No real WhatsApp network activity in this mode.");
  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await transport.disconnect();
  return 0;
}

/**
 * One-shot self-chat send via outbound-gate (never sendMessage from agents directly).
 * Requires human presence flag and local SEND_ENABLED (or we force enable for this explicit command only after --i-am-present).
 */
async function cmdSend(config, args) {
  if (!args.iAmPresent) {
    console.error("send refused: pass --i-am-present");
    return 2;
  }
  if (!args.text || !String(args.text).trim()) {
    console.error("send requires --text \"...\"");
    return 1;
  }

  // Explicit human-directed one-shot: enable send for this process only.
  config = {
    ...config,
    send_enabled: true,
    dry_run: false,
  };

  const validation = validateConfig(config, {
    requireStateDir: true,
    requireSelfJid: true,
  });
  if (!validation.ok) {
    console.error("config invalid:", validation.errors.join("; "));
    return 1;
  }
  ensureStateDirs(config);

  const outboundText = wrapOutboundText(args.text, config, {
    audience: AUDIENCE.SELF,
    phoneOrJid: config.allowed_self_jid,
  });
  const selfJid = config.allowed_self_jid;
  const syntheticId = `proactive-${Date.now()}`;
  const normalized = normalizeInboundEvent({
    key: {
      id: syntheticId,
      remoteJid: selfJid,
      fromMe: false,
    },
    message: { conversation: "(human-directed proactive send)" },
    messageTimestamp: Math.floor(Date.now() / 1000),
  });

  console.log(JSON.stringify({
    event: "send_start",
    to: "self_only",
    text_length: outboundText.length,
    self_identification_ok: outboundDisclosureOk(outboundText, config, {
      audience: AUDIENCE.SELF,
    }),
    // legacy field for older log greps
    includes_notice: draftIncludesNotice(outboundText, config.notice_url),
  }));

  let openResolve;
  const openPromise = new Promise((resolve) => {
    openResolve = resolve;
  });

  const transport = createBaileysTransport(config, {
    onQr: () => {
      console.error("Session needs re-pair first: pair --i-am-present --pairing-code");
    },
    onConnectionUpdate: (u) => {
      if (u.connection) console.log(`[connection] ${u.connection}`);
      if (u.connection === "open") openResolve(true);
    },
  });

  const conn = await transport.connect({ confirmHumanPresent: true });
  if (!conn.ok) {
    console.error(conn.error);
    return 1;
  }

  // Wait for open (or timeout)
  const opened = await Promise.race([
    openPromise,
    new Promise((resolve) => setTimeout(() => resolve(false), 45000)),
  ]);
  if (!opened && !transport.isConnected()) {
    console.error("Timed out waiting for WhatsApp connection open");
    await transport.disconnect();
    return 1;
  }

  // Brief settle after open
  await new Promise((r) => setTimeout(r, 1500));

  const req = requestOutboundSend({
    config,
    normalized,
    draftText: outboundText,
    actionRequestId: buildActionRequestId(syntheticId),
  });
  if (!req.enqueued) {
    console.error(JSON.stringify({
      event: "send_blocked",
      reason: req.reason,
      rule_id: req.rule_id,
      decision: req.decision,
    }));
    await transport.disconnect();
    return 1;
  }

  const drained = await drainWhatsappOutbox(config, { transport, dryRun: false });
  console.log(JSON.stringify({
    event: "send_done",
    enqueued: true,
    sent: drained.sent,
    results: drained.results,
  }));

  await transport.disconnect();
  return drained.sent > 0 ? 0 : 1;
}

async function cmdWipeSession(config, args) {
  if (!args.iAmPresent) {
    console.error("wipe-session requires --i-am-present");
    return 2;
  }
  if (!config.state_dir) {
    console.error("STATE_DIR required");
    return 1;
  }
  const authDir = resolveAuthDir(config);
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
    console.log(JSON.stringify({ ok: true, wiped: "local baileys-auth only", path_configured: true }));
  } else {
    console.log(JSON.stringify({ ok: true, wiped: false, reason: "no auth dir" }));
  }
  return 0;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  let config = loadConfig(process.env, {
    dryRun: args.dryRun || undefined,
  });
  if (args.dryRun) config = { ...config, dry_run: true };

  let code = 0;
  switch (args.command) {
    case "status":
      code = await cmdStatus(config, args);
      break;
    case "pair":
      code = await cmdPair(config, args);
      break;
    case "run":
      code = await cmdRun(config, args);
      break;
    case "send":
      code = await cmdSend(config, args);
      break;
    case "wipe-session":
      code = await cmdWipeSession(config, args);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      console.log(HELP);
      code = 1;
  }
  process.exit(code);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
