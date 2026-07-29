/**
 * Deterministic normalization of WhatsApp inbound events (Baileys-shaped or synthetic).
 * No private content leaves this module except via explicit returned fields for local use.
 */

import { createHash } from "node:crypto";
import { CONVERSATION_KINDS } from "./constants.js";

function sha256Hex(text) {
  return createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

/**
 * Extract bare user JID (without device suffix).
 * e.g. "33600000000:12@s.whatsapp.net" → "33600000000@s.whatsapp.net"
 */
export function bareJid(jid) {
  if (!jid) return "";
  const s = String(jid);
  if (s.endsWith("@g.us")) return s;
  const [userPart, domain = "s.whatsapp.net"] = s.split("@");
  const user = userPart.includes(":") ? userPart.split(":")[0] : userPart;
  return `${user}@${domain}`;
}

/** Digits only from a JID/user part (for PN matching across device suffixes). */
export function phoneDigitsFromJid(jid) {
  if (!jid) return "";
  const s = String(jid).split("@")[0] || "";
  const user = s.includes(":") ? s.split(":")[0] : s;
  return user.replace(/\D/g, "");
}

export function isGroupJid(jid) {
  return String(jid || "").endsWith("@g.us");
}

export function isLidJid(jid) {
  return String(jid || "").includes("@lid");
}

/**
 * True if both JIDs refer to the same phone-number account (PN domain).
 * LID-only peers cannot match by digits; caller may use fromMe heuristics.
 */
export function samePhoneAccount(a, b) {
  const da = phoneDigitsFromJid(a);
  const db = phoneDigitsFromJid(b);
  return Boolean(da && db && da === db);
}

/**
 * Unwrap nested Baileys message containers (ephemeral, view-once, …).
 */
export function unwrapMessageContent(raw) {
  let msg = (raw && raw.message) || raw || {};
  // Walk a few nesting levels only.
  for (let i = 0; i < 4; i++) {
    if (!msg || typeof msg !== "object") break;
    const next =
      msg.ephemeralMessage?.message ||
      msg.viewOnceMessage?.message ||
      msg.viewOnceMessageV2?.message ||
      msg.viewOnceMessageV2Extension?.message ||
      msg.documentWithCaptionMessage?.message ||
      msg.templateMessage?.hydratedTemplate?.hydratedContentText ||
      null;
    if (!next || typeof next !== "object") break;
    // hydratedContentText is a string, not a message object
    if (typeof next === "string") {
      return { conversation: next };
    }
    msg = next;
  }
  return msg;
}

/**
 * Normalize a Baileys-like message event or a synthetic test event.
 *
 * Synthetic shape accepted:
 * {
 *   key: { id, remoteJid, fromMe, participant? },
 *   message: { conversation? | extendedTextMessage?: { text } },
 *   messageTimestamp?,
 *   pushName?
 * }
 *
 * @returns {object} normalized event
 */
export function normalizeInboundEvent(raw, options = {}) {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error: "invalid_event",
      rule_id: "normalize.invalid",
    };
  }

  const key = raw.key || {};
  const remoteJid = String(key.remoteJid || raw.remoteJid || "").trim();
  const fromMe = Boolean(key.fromMe ?? raw.fromMe);
  const platformMessageId = String(key.id || raw.id || "").trim();
  const participant = key.participant || raw.participant || null;

  if (!remoteJid) {
    return {
      ok: false,
      error: "missing_remote_jid",
      rule_id: "normalize.missing_remote_jid",
    };
  }

  const conversationKind = isGroupJid(remoteJid)
    ? CONVERSATION_KINDS.GROUP
    : CONVERSATION_KINDS.DIRECT;

  const content = unwrapMessageContent(raw);
  const text = extractText(raw, content);
  const hasMedia = detectMedia(raw, content);
  const isProtocolOnly = isProtocolOnlyMessage(raw, content, text);
  const hasLinks = Boolean(text && /https?:\/\//i.test(text));

  const conversationId =
    conversationKind === CONVERSATION_KINDS.GROUP
      ? `whatsapp:${remoteJid}`
      : `whatsapp:${bareJid(remoteJid)}`;

  const groupId =
    conversationKind === CONVERSATION_KINDS.GROUP
      ? `whatsapp-group:${remoteJid}`
      : null;

  const groupMemberId =
    conversationKind === CONVERSATION_KINDS.GROUP && participant
      ? `whatsapp-member:${bareJid(participant)}`
      : null;

  // Author of the human message: for direct, remoteJid; for group, participant.
  const authorJid =
    conversationKind === CONVERSATION_KINDS.GROUP
      ? bareJid(participant || "")
      : bareJid(remoteJid);

  const rawCanonical = JSON.stringify({
    remoteJid,
    id: platformMessageId,
    fromMe,
    participant: participant || null,
    text: text || "",
  });
  const rawSha = sha256Hex(rawCanonical);

  const observedAt = resolveTimestamp(raw);

  return {
    ok: true,
    platform: "whatsapp",
    transport_stage: "whatsapp_web",
    direction: "inbound",
    conversation_kind: conversationKind,
    conversation_id: conversationId,
    group_id: groupId,
    group_member_id: groupMemberId,
    remote_jid: remoteJid,
    remote_jid_bare: bareJid(remoteJid),
    remote_phone_digits: phoneDigitsFromJid(remoteJid),
    is_lid: isLidJid(remoteJid),
    author_jid: authorJid,
    from_me: fromMe,
    platform_message_id: platformMessageId || `synthetic:${rawSha.slice(0, 16)}`,
    text: text || "",
    text_length: (text || "").length,
    has_media: hasMedia,
    is_protocol_only: isProtocolOnly,
    has_links: hasLinks,
    push_name: raw.pushName || null,
    observed_at: observedAt,
    integrity: {
      algorithm: "sha256",
      raw_message_sha256: rawSha,
      raw_message_size: Buffer.byteLength(rawCanonical, "utf8"),
      raw_message_ref: `private-local-reference:sha256:${rawSha}`,
    },
    // Preserve group metadata for future policy without activating groups.
    group_meta: conversationKind === CONVERSATION_KINDS.GROUP
      ? {
          remote_jid: remoteJid,
          participant: participant ? bareJid(participant) : null,
          subject: raw.subject || raw.groupSubject || null,
        }
      : null,
    source: options.source || "synthetic",
  };
}

function extractText(raw, content) {
  if (typeof raw.text === "string") return raw.text;
  if (typeof raw.body === "string") return raw.body;
  const msg = content || unwrapMessageContent(raw);
  if (typeof msg.conversation === "string") return msg.conversation;
  if (msg.extendedTextMessage && typeof msg.extendedTextMessage.text === "string") {
    return msg.extendedTextMessage.text;
  }
  if (typeof msg.conversation === "string") return msg.conversation;
  if (msg.imageMessage?.caption) return String(msg.imageMessage.caption);
  if (msg.videoMessage?.caption) return String(msg.videoMessage.caption);
  if (msg.buttonsResponseMessage?.selectedDisplayText) {
    return String(msg.buttonsResponseMessage.selectedDisplayText);
  }
  if (msg.listResponseMessage?.title) return String(msg.listResponseMessage.title);
  if (msg.templateButtonReplyMessage?.selectedDisplayText) {
    return String(msg.templateButtonReplyMessage.selectedDisplayText);
  }
  return "";
}

function detectMedia(raw, content) {
  if (raw.hasMedia === true) return true;
  const msg = content || unwrapMessageContent(raw);
  // Pure protocol / reaction / revoke are not "media" for MVP policy.
  if (msg.protocolMessage || msg.reactionMessage || msg.senderKeyDistributionMessage) {
    return false;
  }
  const mediaKeys = [
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "documentMessage",
    "stickerMessage",
    "pttMessage",
  ];
  return mediaKeys.some((k) => msg[k]);
}

function isProtocolOnlyMessage(raw, content, text) {
  if (text && String(text).trim()) return false;
  const msg = content || unwrapMessageContent(raw);
  if (!msg || typeof msg !== "object") return true;
  if (msg.protocolMessage || msg.reactionMessage || msg.senderKeyDistributionMessage) return true;
  if (Object.keys(msg).length === 0) return true;
  return false;
}

function resolveTimestamp(raw) {
  const ts = raw.messageTimestamp ?? raw.timestamp;
  if (ts == null) return new Date().toISOString();
  if (typeof ts === "number") {
    // Baileys uses seconds
    const ms = ts > 1e12 ? ts : ts * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof ts === "string" && ts.includes("T")) return ts;
  const n = Number(ts);
  if (!Number.isNaN(n)) {
    const ms = n > 1e12 ? n : n * 1000;
    return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}
