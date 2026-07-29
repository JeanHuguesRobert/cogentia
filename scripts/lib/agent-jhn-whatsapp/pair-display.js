/**
 * How to surface pairing material for a human on a *phone*.
 * WhatsApp multi-device links often work only when opened on a phone, not a PC browser.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function classifyPairMaterial(raw) {
  const s = String(raw || "").trim();
  if (!s) return { kind: "empty", value: "" };
  if (/^https?:\/\//i.test(s) || /^whatsapp:\/\//i.test(s)) {
    return { kind: "phone_only_url", value: s };
  }
  // Common WA / multi-device deep links without scheme
  if (/^(www\.)?whatsapp\.com\//i.test(s) || /^wa\.me\//i.test(s)) {
    return { kind: "phone_only_url", value: s.startsWith("http") ? s : `https://${s}` };
  }
  return { kind: "qr_payload", value: s };
}

/**
 * Write ephemeral open-on-phone file under STATE_DIR (gitignored runtime).
 * @returns {string|null} path written
 */
export function writePhoneOnlyPairFile(stateDir, material) {
  if (!stateDir) return null;
  const dir = path.resolve(stateDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "OPEN-ON-PHONE-ONLY.txt");
  const classified = classifyPairMaterial(material);
  const body = [
    "OPEN THIS ON YOUR PHONE — not on the PC browser.",
    "WhatsApp will reject the link if opened from a desktop browser.",
    "",
    `kind: ${classified.kind}`,
    `created_at: ${new Date().toISOString()}`,
    "",
    "--- material ---",
    classified.value,
    "--- end ---",
    "",
    "Ways to open on the phone:",
    "1) Copy the material line to the phone (see docs), then open it there.",
    "2) SSH from the phone to this PC, re-run pair, long-press/open the URL in the mobile client.",
    "3) Prefer pairing CODE instead of a link:",
    "   node scripts/agent-jhn-whatsapp.js pair --i-am-present --pairing-code --phone 33678059481",
    "",
    "Delete this file after linking. Do not commit it.",
    "",
  ].join("\n");
  fs.writeFileSync(filePath, body, "utf8");
  return filePath;
}

export function clearPhoneOnlyPairFile(stateDir) {
  if (!stateDir) return;
  const filePath = path.join(path.resolve(stateDir), "OPEN-ON-PHONE-ONLY.txt");
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

/**
 * Best-effort copy to Windows clipboard (no secrets committed; ephemeral pair only).
 */
export function tryCopyToClipboard(text) {
  try {
    if (process.platform === "win32") {
      execFileSync("cmd", ["/c", "clip"], {
        input: String(text),
        windowsHide: true,
        stdio: ["pipe", "ignore", "ignore"],
      });
      return { ok: true, method: "clip" };
    }
  } catch {
    /* fall through */
  }
  return { ok: false };
}

/**
 * Print clear human instructions for phone-only URLs vs raw QR.
 */
export function printPairMaterial(raw, options = {}) {
  const classified = classifyPairMaterial(raw);
  const lines = [];

  if (classified.kind === "phone_only_url") {
    lines.push("");
    lines.push("========== OPEN ON THE PHONE (not the PC) ==========");
    lines.push("WhatsApp deliberately rejects this link in a desktop browser.");
    lines.push("You must open it with the phone that holds the WhatsApp account.");
    lines.push("");
    lines.push(classified.value);
    lines.push("");
    lines.push("How to get the link onto the phone:");
    lines.push("  A) Copy from PC → paste into a note/email/SMS to yourself → open on phone.");
    lines.push("  B) SSH from the phone to this PC, select the URL in the SSH app, Open.");
    lines.push("  C) Prefer a short pairing CODE (no link at all):");
    lines.push("     pair --i-am-present --pairing-code --phone 33678059481");
    lines.push("====================================================");
  } else {
    lines.push("");
    lines.push("========== QR payload (camera) ==========");
    lines.push("If this looks like random text, scan a rendered QR or use --pairing-code.");
    lines.push("If it is actually a link, open that link ON THE PHONE only.");
    lines.push(classified.value);
    lines.push("=========================================");
  }

  for (const line of lines) console.log(line);

  if (options.stateDir) {
    const p = writePhoneOnlyPairFile(options.stateDir, classified.value);
    if (p) console.log(`Also written (ephemeral, local): ${p}`);
  }

  if (options.copy !== false && classified.kind === "phone_only_url") {
    const clip = tryCopyToClipboard(classified.value);
    if (clip.ok) {
      console.log("Copied to PC clipboard — paste into a channel your phone can open (not a public chat).");
    }
  }

  return classified;
}
