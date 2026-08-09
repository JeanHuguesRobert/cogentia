/**
 * Self-Chat Remote Control Cockpit Command Processor for Agent JHN WhatsApp.
 * Allows Jean-Hugues Robert to manage conversations and continuations from his mobile phone.
 */

import fs from "node:fs";
import path from "node:path";
import { listActiveConversations, loadConversation, saveConversation } from "./conversation-store.js";
import { requestOutboundSend, buildActionRequestId } from "./outbound-gate.js";

import { loadContactsStore, upsertContact, findContactByPhoneOrJid } from "./contacts-manager.js";

import { resetRateLimiter } from "./rate-limiter.js";

/**
 * Check if inbound text is a self-chat control command.
 */
export function isCockpitCommand(text) {
  const t = String(text || "").trim().toLowerCase();
  return (
    t === "help" ||
    t === "list" ||
    t === "list conversations" ||
    t === "list chats" ||
    t === "contacts" ||
    t === "contact list" ||
    t === "reset rate limit" ||
    t === "reset limit" ||
    t === "unblock" ||
    t.startsWith("contact ") ||
    t.startsWith("inspect ") ||
    t.startsWith("approve ") ||
    t.startsWith("reject ") ||
    t.startsWith("close ")
  );
}

/**
 * Execute a self-chat control command.
 *
 * @param {string} text - Command text
 * @param {object} config - Agent JHN config
 * @returns {string} Reply summary text for self-chat
 */
export function processCockpitCommand(text, config) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();

  if (lower === "help") {
    return [
      "📱 *Agent JHN Self-Chat Control Cockpit*",
      "Available commands:",
      "• `list conversations` - List active WhatsApp conversation threads",
      "• `contact list` - List saved contacts & trust tiers",
      "• `contact add <phone> <name> [tier]` - Add or update a contact",
      "• `inspect <conv_id|ctn_id>` - Show recent turns or continuation details",
      "• `approve <ctn_id>` - Resolve continuation & send approved reply",
      "• `reject <ctn_id> [reason]` - Reject request & send polite refusal",
      "• `reset rate limit` - Reset circuit breaker & unblock outbound sends",
      "• `close <conv_id>` - Conclude thread & archive to corpus",
    ].join("\n");
  }

  if (lower === "reset rate limit" || lower === "reset limit" || lower === "unblock") {
    const res = resetRateLimiter(config);
    return `⚡ *Circuit Breaker Reset:* ${res.message}`;
  }

  if (lower === "contacts" || lower === "contact list") {
    const store = loadContactsStore(config);
    if (!store.contacts || store.contacts.length === 0) {
      return "📇 *No contacts in store.*";
    }
    const lines = ["📇 *Agent JHN Contact Book:*"];
    for (const c of store.contacts) {
      const tierBadge = c.trust_tier === "principal" ? "👑" : c.trust_tier === "vip" ? "⭐️" : "👤";
      lines.push(`${tierBadge} *${c.name}* (${c.trust_tier}) - ${c.phones.join(", ")}`);
    }
    return lines.join("\n");
  }

  if (lower.startsWith("contact add ")) {
    const parts = raw.slice(12).trim().split(/\s+/);
    if (parts.length < 2) {
      return "❌ Usage: `contact add <phone> <name> [tier]`";
    }
    const phone = parts[0];
    const name = parts.slice(1, parts.length > 2 ? -1 : parts.length).join(" ");
    const tier = parts.length > 2 ? parts[parts.length - 1] : "standard";
    const updated = upsertContact(config, { phone, name, trust_tier: tier });
    return `✅ Saved contact *${updated.name}* (${updated.trust_tier}) - ${updated.phones.join(", ")}`;
  }

  if (lower === "list" || lower === "list conversations" || lower === "list chats") {
    const convs = listActiveConversations(config);
    if (convs.length === 0) {
      return "📱 *No active conversation threads.*";
    }
    const lines = ["📱 *Active Conversation Threads:*"];
    for (const c of convs) {
      const statusIcon = c.status === "waiting_for_human" ? "⚠️" : "💬";
      const ctnInfo = c.active_continuation ? ` (Pending: ${c.active_continuation})` : "";
      lines.push(`${statusIcon} \`${c.conversation_id}\` [${c.status}]${ctnInfo} - Turns: ${c.turns.length}`);
    }
    return lines.join("\n");
  }

  if (lower.startsWith("inspect ")) {
    const target = raw.slice(8).trim();
    const conv = loadConversation(config, target);
    if (!conv.turns || conv.turns.length === 0) {
      return `📱 *No history found for* \`${target}\`.`;
    }
    const lines = [`📱 *Inspection: ${conv.conversation_id}* (${conv.status})`];
    const recent = conv.turns.slice(-5);
    for (const turn of recent) {
      lines.push(`• *${turn.role}*: ${turn.text.slice(0, 100)}`);
    }
    if (conv.active_continuation) {
      lines.push(`\n⚠️ *Pending Continuation:* \`${conv.active_continuation}\``);
    }
    return lines.join("\n");
  }

  if (lower.startsWith("approve ")) {
    const ctnId = raw.slice(8).trim();
    const continuationsDir = path.join(process.cwd(), ".cogentia", "continuations");
    const ctnPath = path.join(continuationsDir, `${ctnId}.json`);

    if (!fs.existsSync(ctnPath)) {
      return `❌ Continuation \`${ctnId}\` not found.`;
    }

    try {
      const ctn = JSON.parse(fs.readFileSync(ctnPath, "utf8"));
      ctn.status = "closed";
      ctn.resolved_at = new Date().toISOString(),
      ctn.resolution = { ok: true, decision: "approved_by_human_via_whatsapp" };
      fs.writeFileSync(ctnPath, JSON.stringify(ctn, null, 2), "utf8");

      // Update associated conversation if any
      if (ctn.sender_jid) {
        const conv = loadConversation(config, ctn.sender_jid);
        conv.status = "active";
        conv.active_continuation = null;
        saveConversation(config, conv);
      }

      return `✅ Continuation \`${ctnId}\` *APPROVED* and marked closed.`;
    } catch (e) {
      return `❌ Failed to resolve \`${ctnId}\`: ${e.message}`;
    }
  }

  if (lower.startsWith("reject ")) {
    const ctnId = raw.slice(7).trim();
    const continuationsDir = path.join(process.cwd(), ".cogentia", "continuations");
    const ctnPath = path.join(continuationsDir, `${ctnId}.json`);

    if (!fs.existsSync(ctnPath)) {
      return `❌ Continuation \`${ctnId}\` not found.`;
    }

    try {
      const ctn = JSON.parse(fs.readFileSync(ctnPath, "utf8"));
      ctn.status = "closed";
      ctn.resolved_at = new Date().toISOString();
      ctn.resolution = { ok: false, decision: "rejected_by_human_via_whatsapp" };
      fs.writeFileSync(ctnPath, JSON.stringify(ctn, null, 2), "utf8");

      if (ctn.sender_jid) {
        const conv = loadConversation(config, ctn.sender_jid);
        conv.status = "closed";
        conv.active_continuation = null;
        saveConversation(config, conv);
      }

      return `🚫 Continuation \`${ctnId}\` *REJECTED* and marked closed.`;
    } catch (e) {
      return `❌ Failed to reject \`${ctnId}\`: ${e.message}`;
    }
  }

  if (lower.startsWith("close ")) {
    const target = raw.slice(6).trim();
    const conv = loadConversation(config, target);
    conv.status = "closed";
    saveConversation(config, conv);
    return `📁 Conversation \`${target}\` closed & queued for corpus distillation.`;
  }

  return "Type `help` for available Agent JHN control commands.";
}
