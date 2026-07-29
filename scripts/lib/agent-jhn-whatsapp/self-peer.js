/**
 * Remember the last working self-chat peer JID (often @lid for Message yourself).
 * Sending only to PN (@s.whatsapp.net) may not surface in the same phone UI thread.
 */

import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "last-self-peer.json";

export function resolveSelfPeerPath(config) {
  return path.join(path.resolve(config.state_dir), FILE_NAME);
}

export function loadPreferredSelfPeer(config) {
  if (!config?.state_dir) return null;
  const p = resolveSelfPeerPath(config);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (raw?.remote_jid && typeof raw.remote_jid === "string") return raw;
  } catch {
    return null;
  }
  return null;
}

/**
 * Persist peer after a successful self-chat inbound (safe: jid only, no message body).
 */
export function rememberSelfPeer(config, normalized) {
  if (!config?.state_dir || !normalized?.ok) return;
  if (normalized.conversation_kind !== "direct") return;
  const remote = String(normalized.remote_jid || "").trim();
  if (!remote) return;
  // Prefer LID when present; also store PN bare.
  const record = {
    remote_jid: remote,
    remote_jid_bare: normalized.remote_jid_bare || null,
    is_lid: Boolean(normalized.is_lid),
    from_me: Boolean(normalized.from_me),
    updated_at: new Date().toISOString(),
  };
  const p = resolveSelfPeerPath(config);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

/**
 * Resolve destination for self-chat send: last LID/peer if known, else allowed self PN.
 */
export function resolveSelfSendJid(config) {
  const preferred = loadPreferredSelfPeer(config);
  if (preferred?.remote_jid) return preferred.remote_jid;
  return String(config.allowed_self_jid || "").trim();
}
