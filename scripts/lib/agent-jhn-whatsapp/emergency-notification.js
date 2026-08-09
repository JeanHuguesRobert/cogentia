/**
 * Emergency contact awareness & human attention notification subsystem.
 *
 * Provides:
 * 1. Emergency contact registry (phone, email, messenger accounts).
 * 2. Multi-channel attention alerts (PC local toast/bell + Continuation Packet emission + Self-Chat WhatsApp ping).
 */

import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { DEFAULT_EMERGENCY_EMAIL, DEFAULT_EMERGENCY_PHONE } from "./constants.js";

/**
 * Default Emergency Contacts structure attached to instance_config.
 */
export function getEmergencyContacts(env = process.env) {
  const rawJson = env.AGENT_JHN_EMERGENCY_CONTACTS_JSON;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fallback */
    }
  }

  return {
    phone: env.AGENT_JHN_EMERGENCY_PHONE || env.HUMAN_USER_PHONE || DEFAULT_EMERGENCY_PHONE,
    email: env.AGENT_JHN_EMERGENCY_EMAIL || env.HUMAN_USER_EMAIL || DEFAULT_EMERGENCY_EMAIL,
    whatsapp_jid: env.AGENT_JHN_EMERGENCY_WHATSAPP_JID || `${DEFAULT_EMERGENCY_PHONE.replace(/\+/g, "")}@s.whatsapp.net`,
    messenger: env.AGENT_JHN_EMERGENCY_MESSENGER || "@JeanHuguesRobert",
  };
}

/**
 * Trigger multi-channel notification when human attention is required.
 *
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Summary message text
 * @param {string} [options.senderJid] - Sender JID if incoming party
 * @param {object} [options.config] - Agent JHN config
 * @returns {{ pcNotified: boolean, continuationId: string|null }}
 */
export function notifyHumanAttention(options = {}) {
  const { title = "Agent JHN Attention Required", message = "A party requires your attention.", senderJid = "", config = {} } = options;

  // 1. PC Local Sound & Toast Notification
  let pcNotified = false;
  try {
    // Sound bell in console
    process.stdout.write("\u0007");

    // PowerShell Toast Notification (Windows OS)
    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
      $textNodes = $template.GetElementsByTagName("text")
      $textNodes.Item(0).AppendChild($template.CreateTextNode("${title.replace(/"/g, '\"')}")) | Out-Null
      $textNodes.Item(1).AppendChild($template.CreateTextNode("${message.replace(/"/g, '\"')}")) | Out-Null
      $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Agent JHN")
      $notifier.Show([Windows.UI.Notifications.ToastNotification]::$template)
    `.trim();

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`, (err) => {
      if (err) {
        // Fallback: console alert box
        console.log(`\n======================================================`);
        console.log(`⚠️  [HUMAN ATTENTION REQUIRED] ${title}`);
        console.log(`    ${message}`);
        console.log(`======================================================\n`);
      }
    });
    pcNotified = true;
  } catch {
    pcNotified = false;
  }

  // 2. Emit Durable Continuation Packet into .cogentia/continuations/
  let continuationId = null;
  try {
    const continuationsDir = path.join(process.cwd(), ".cogentia", "continuations");
    if (!fs.existsSync(continuationsDir)) {
      fs.mkdirSync(continuationsDir, { recursive: true });
    }
    const cId = `ctn_${randomBytes(4).toString("hex")}`;
    const ctnPath = path.join(continuationsDir, `${cId}.json`);
    const ctnData = {
      id: cId,
      kind: "human_attention_request",
      status: "alive",
      created_at: new Date().toISOString(),
      sender_jid: senderJid,
      title,
      message,
      emergency_contacts: getEmergencyContacts(),
      expected_continuation: "human_review",
    };
    fs.writeFileSync(ctnPath, JSON.stringify(ctnData, null, 2), "utf8");
    continuationId = cId;
  } catch {
    continuationId = null;
  }

  return { pcNotified, continuationId };
}
