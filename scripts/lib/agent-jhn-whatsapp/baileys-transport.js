/**
 * Baileys transport boundary.
 * Knows session, pairing, events, material send.
 * Does not know corpus, models, or editorial policy.
 *
 * Lazy-loads @whiskeysockets/baileys only when connect/pair is invoked.
 * Tests use createMockTransport — no network, no QR, no real account.
 */

import fs from "node:fs";
import path from "node:path";
import { resolveAuthDir } from "./config.js";

/**
 * Mock transport for offline tests and dry-run pipelines.
 */
export function createMockTransport(options = {}) {
  const sent = [];
  let connected = Boolean(options.connected);
  return {
    kind: "mock",
    async connect() {
      connected = true;
      return { ok: true, connected: true };
    },
    async disconnect() {
      connected = false;
      return { ok: true };
    },
    isConnected() {
      return connected;
    },
    async sendText(jid, text) {
      if (options.failSend) {
        return { ok: false, error: options.failSendMessage || "mock_send_failed" };
      }
      if (!connected) return { ok: false, error: "not_connected" };
      const id = `mock-send-${sent.length + 1}`;
      sent.push({ jid, text, id, at: new Date().toISOString() });
      return { ok: true, id };
    },
    getSent() {
      return [...sent];
    },
    clearSent() {
      sent.length = 0;
    },
  };
}

/**
 * Create a Baileys-backed transport.
 * Does not connect until connect() is called.
 * pair() is interactive and must only run with human present.
 *
 * @param {object} config loadConfig result
 * @param {object} [hooks]
 * @param {(qr: string) => void} [hooks.onQr] — QR is displayed only; never logged to files by this module
 * @param {(msg: object) => void|Promise<void>} [hooks.onMessage]
 * @param {(update: object) => void} [hooks.onConnectionUpdate]
 */
export function createBaileysTransport(config, hooks = {}) {
  let sock = null;
  let connected = false;
  let baileysModule = null;
  let stopRequested = false;
  let reconnectEnabled = false;
  let suppressQrHooks = false;
  let openSocketOptions = {};
  let pairingCodeIssued = false;
  /** @type {((u: object) => void) | null} */
  let connectionWaiter = null;

  async function loadBaileys() {
    if (baileysModule) return baileysModule;
    try {
      baileysModule = await import("@whiskeysockets/baileys");
      return baileysModule;
    } catch (err) {
      throw new Error(
        `Failed to load @whiskeysockets/baileys: ${err.message}. Install dependency first.`,
      );
    }
  }

  async function openSocket(options = {}) {
    openSocketOptions = { ...openSocketOptions, ...options };
    const B = await loadBaileys();
    const authDir = resolveAuthDir(config);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await B.useMultiFileAuthState(authDir);
    const version = B.fetchLatestBaileysVersion
      ? (await B.fetchLatestBaileysVersion()).version
      : undefined;

    const makeWASocket = B.default || B.makeWASocket;

    // WhatsApp rejects odd companion platform labels; use a known Baileys browser profile.
    let browser = ["Ubuntu", "Chrome", "22.04.4"];
    try {
      if (B.Browsers?.ubuntu) browser = B.Browsers.ubuntu("Chrome");
      else if (B.Browsers?.macOS) browser = B.Browsers.macOS("Desktop");
    } catch {
      /* keep default */
    }
    if (openSocketOptions.browser) browser = openSocketOptions.browser;

    let silentLogger = undefined;
    try {
      const pino = (await import("pino")).default;
      silentLogger = pino({ level: "silent" });
    } catch {
      silentLogger = {
        level: "silent",
        child: () => silentLogger,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      };
    }

    suppressQrHooks = openSocketOptions.suppressQr === true;

    sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      logger: silentLogger,
      browser,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr && typeof hooks.onQr === "function" && !suppressQrHooks) {
        hooks.onQr(qr);
      }
      if (connection === "open") {
        connected = true;
      }
      if (connection === "close") {
        connected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode ?? null;
        const DisconnectReason = B.DisconnectReason || {};
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        if (typeof hooks.onConnectionUpdate === "function") {
          hooks.onConnectionUpdate({
            connection,
            statusCode,
            hasQr: Boolean(qr),
            willReconnect: reconnectEnabled && !stopRequested && !loggedOut,
          });
        }
        // Keep pairing session alive: WhatsApp often closes once; Baileys expects reconnect.
        if (reconnectEnabled && !stopRequested && !loggedOut) {
          await sleep(2000);
          if (!stopRequested) {
            try {
              await openSocket(openSocketOptions);
            } catch (err) {
              if (typeof hooks.onHandlerError === "function") {
                hooks.onHandlerError(err);
              }
            }
          }
        }
        return;
      }
      if (typeof hooks.onConnectionUpdate === "function") {
        hooks.onConnectionUpdate({
          connection,
          statusCode: lastDisconnect?.error?.output?.statusCode ?? null,
          hasQr: Boolean(qr),
        });
      }
      // Prefer waiting for QR (socket fully ready for multi-device handshake).
      if (connectionWaiter && (qr || connection === "open")) {
        const w = connectionWaiter;
        connectionWaiter = null;
        w(update);
      }
    });

    sock.ev.on("messages.upsert", async (upsert) => {
      if (stopRequested) return;
      if (upsert.type !== "notify" && upsert.type !== "append") return;
      const messages = upsert.messages || [];
      for (const msg of messages) {
        if (typeof hooks.onMessage === "function") {
          try {
            await hooks.onMessage(msg);
          } catch (err) {
            if (typeof hooks.onHandlerError === "function") {
              hooks.onHandlerError(err);
            }
          }
        }
      }
    });

    return sock;
  }

  function waitForSocketReady(timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        connectionWaiter = null;
        reject(new Error("timeout waiting for WhatsApp QR/socket ready"));
      }, timeoutMs);
      connectionWaiter = (update) => {
        clearTimeout(timer);
        resolve(update);
      };
    });
  }

  return {
    kind: "baileys",
    /**
     * Interactive pairing. Requires human with phone.
     * Modes:
     * - default: QR/link via hooks.onQr (open/scan ON PHONE)
     * - pairingCode: short code via requestPairingCode
     */
    async pair(options = {}) {
      if (options.confirmHumanPresent !== true) {
        return {
          ok: false,
          error: "pair requires confirmHumanPresent:true — Jean Hugues Robert must be present",
        };
      }
      stopRequested = false;
      reconnectEnabled = true;
      pairingCodeIssued = false;
      const useCode = options.pairingCode === true;

      await openSocket({ suppressQr: useCode });

      if (useCode) {
        const phone = normalizePairingPhone(
          options.phoneNumber || options.phone || config.allowed_self_jid,
        );
        if (!phone) {
          return {
            ok: false,
            error:
              "pairing code requires digits with country code (e.g. 33678059481), or ALLOWED_SELF_JID",
          };
        }
        if (!/^\d{10,15}$/.test(phone)) {
          return {
            ok: false,
            error: `phone digits look invalid: ${phone} (want E.164 without +, e.g. 33678059481)`,
          };
        }
        try {
          // Wait until multi-device QR handshake is ready (not just "connecting").
          await waitForSocketReady(35000);
          await sleep(300);
        } catch (err) {
          return { ok: false, error: err.message || "socket_not_ready" };
        }
        if (!sock?.authState?.creds?.registered) {
          try {
            // Issue code only once per pair session; reconnect keeps same auth/pairingCode.
            if (!pairingCodeIssued && !sock.authState.creds.pairingCode) {
              const code = await sock.requestPairingCode(phone);
              pairingCodeIssued = true;
              if (typeof hooks.onPairingCode === "function") {
                hooks.onPairingCode(code, phone);
              }
              return {
                ok: true,
                mode: "pairing_code",
                phone_digits: phone,
                note: "Enter the pairing code now; socket will reconnect if WhatsApp drops the first link.",
                phone_display_hint: formatFrMobileHint(phone),
              };
            }
            const existing = sock.authState.creds.pairingCode;
            if (existing && typeof hooks.onPairingCode === "function") {
              hooks.onPairingCode(existing, phone);
            }
            return {
              ok: true,
              mode: "pairing_code",
              phone_digits: phone,
              note: "Reusing existing pairing code from session auth",
              phone_display_hint: formatFrMobileHint(phone),
            };
          } catch (err) {
            return {
              ok: false,
              error: err.message || "requestPairingCode_failed",
            };
          }
        }
        return {
          ok: true,
          mode: "already_registered",
          note: "Session already registered; no pairing code needed. Use run.",
        };
      }

      return {
        ok: true,
        mode: "qr",
        note: "QR/link must be opened or scanned ON THE PHONE. Prefer --pairing-code when possible.",
      };
    },

    async connect(options = {}) {
      if (options.confirmHumanPresent !== true && options.allowUnattendedReconnect !== true) {
        return {
          ok: false,
          error: "connect requires confirmHumanPresent or allowUnattendedReconnect",
        };
      }
      stopRequested = false;
      await openSocket();
      return { ok: true, mode: "connect" };
    },

    async disconnect() {
      stopRequested = true;
      reconnectEnabled = false;
      connected = false;
      try {
        if (sock) {
          sock.end?.(undefined);
          sock = null;
        }
      } catch {
        sock = null;
      }
      return { ok: true };
    },

    isConnected() {
      return connected;
    },

    /**
     * Material send — ONLY call from outbound-gate drain path.
     * Not exported for agents.
     */
    async sendText(jid, text) {
      if (!sock) return { ok: false, error: "socket_not_open" };
      if (!connected) return { ok: false, error: "not_connected" };
      try {
        const result = await sock.sendMessage(jid, { text: String(text) });
        const id = result?.key?.id || null;
        return { ok: true, id };
      } catch (err) {
        return { ok: false, error: err.message || "sendMessage_failed" };
      }
    },

    /**
     * Status without secrets.
     */
    status() {
      const authDir = resolveAuthDir(config);
      const hasCreds = fs.existsSync(path.join(authDir, "creds.json"));
      return {
        kind: "baileys",
        connected,
        auth_dir_configured: Boolean(config.state_dir),
        session_files_present: hasCreds,
        // never return creds content
      };
    },

    /**
     * Local session wipe (revocation). Does not call WhatsApp logout unless requested.
     */
    async wipeLocalSession(options = {}) {
      await this.disconnect();
      const authDir = resolveAuthDir(config);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
      if (options.logoutRemote && sock) {
        // remote logout only with explicit flag
        try {
          await sock.logout?.();
        } catch {
          /* ignore */
        }
      }
      return { ok: true, wiped: authDir };
    },
  };
}

/**
 * Normalize to digits-only E.164 without + (Baileys pairing requirement).
 * Accepts JID (336…@s.whatsapp.net) or national forms.
 */
export function normalizePairingPhone(input) {
  if (!input) return "";
  let s = String(input).trim();
  if (s.includes("@")) s = s.split("@")[0];
  if (s.includes(":")) s = s.split(":")[0];
  s = s.replace(/\D/g, "");
  // Drop leading 00 international prefix
  if (s.startsWith("00")) s = s.slice(2);
  // French national 0X… → 33X…
  if (s.length === 10 && s.startsWith("0")) {
    s = `33${s.slice(1)}`;
  }
  return s;
}

/** Human hint for FR mobiles (display only). */
export function formatFrMobileHint(digits) {
  const d = String(digits || "");
  if (d.startsWith("33") && d.length === 11) {
    const n = `0${d.slice(2)}`;
    return `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)} (compte WhatsApp, pas forcément la SIM active)`;
  }
  return d;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Factory: mock if dry-run / explicit mock, else baileys shell (not connected).
 */
export function createTransport(config, hooks = {}, options = {}) {
  if (options.mock || config.dry_run || options.forceMock) {
    return createMockTransport(options.mockOptions || {});
  }
  return createBaileysTransport(config, hooks);
}
