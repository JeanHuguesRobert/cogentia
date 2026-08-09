/**
 * Conversation Thread Store & Lifecycle Manager for Agent JHN WhatsApp.
 *
 * Manages:
 * - Thread persistence (conversations/<id>.json)
 * - Sliding-window turn history
 * - Active continuation tracking
 * - Automatic attention escalation for third-party holds
 */

import fs from "node:fs";
import path from "node:path";
import { notifyHumanAttention } from "./emergency-notification.js";

function getConversationsDir(config) {
  const base = config.state_dir || path.join(process.cwd(), ".cogentia", "runtime", "agent-jhn-whatsapp");
  const dir = path.join(base, "conversations");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getConversationPath(config, conversationId) {
  const safeId = String(conversationId || "").replace(/[^a-z0-9_-]/gi, "_");
  return path.join(getConversationsDir(config), `${safeId}.json`);
}

export function loadConversation(config, conversationId) {
  const p = getConversationPath(config, conversationId);
  if (!fs.existsSync(p)) {
    return {
      conversation_id: conversationId,
      participant: conversationId,
      status: "active",
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      active_continuation: null,
      turns: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {
      conversation_id: conversationId,
      participant: conversationId,
      status: "active",
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      active_continuation: null,
      turns: [],
    };
  }
}

export function saveConversation(config, conversation) {
  conversation.last_updated = new Date().toISOString();
  const p = getConversationPath(config, conversation.conversation_id);
  fs.writeFileSync(p, JSON.stringify(conversation, null, 2), "utf8");
  return conversation;
}

export function recordConversationTurn(config, conversationId, turn) {
  const conv = loadConversation(config, conversationId);
  conv.turns.push({
    timestamp: new Date().toISOString(),
    role: turn.role || "user",
    text: turn.text || "",
    platform_message_id: turn.platform_message_id || null,
    continuation: turn.continuation || null,
    citations: turn.citations || [],
  });

  // Keep sliding window of last 30 turns
  if (conv.turns.length > 30) {
    conv.turns = conv.turns.slice(-30);
  }

  if (turn.active_continuation) {
    conv.active_continuation = turn.active_continuation;
    conv.status = "waiting_for_human";

    // Trigger human attention alert across PC + WhatsApp ping + Continuation Packet
    notifyHumanAttention({
      title: `WhatsApp Attention: ${conversationId}`,
      message: `Message from ${conversationId}: "${(turn.text || "").slice(0, 80)}"`,
      senderJid: conversationId,
      config,
    });
  }

  saveConversation(config, conv);
  return conv;
}

export function listActiveConversations(config) {
  const dir = getConversationsDir(config);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
