/**
 * Turn-admission gate for the shared, non-exclusive WhatsApp account.
 *
 * Observing a message is not authorization to speak. Custodian (human)
 * outbound on the shared account never, by itself, invites Agent JHN.
 */

import { CONVERSATION_KINDS } from "./constants.js";
import { bareJid } from "./inbound-normalizer.js";
import { isExplicitlyAddressed } from "./mention-address.js";
import { looksLikeAgentJhnOutbound } from "./disclosure.js";
import { isAllowedSelfPeer } from "./self-peer.js";

/**
 * @param {object} normalized
 * @param {object} config
 * @param {object} [context]
 * @returns {{
 *   admitted: boolean,
 *   rule_id: string,
 *   reason: string,
 *   trigger: string,
 *   observed_author: string,
 *   explicitly_addressed: boolean
 * }}
 */
export function admitTurn(normalized, config, context = {}) {
  const addressed =
    context.explicitlyAddressed === true ||
    (context.explicitlyAddressed !== false && isExplicitlyAddressed(normalized?.text));
  const base = {
    admitted: false,
    trigger: "none",
    observed_author: normalized?.from_me ? "custodian_human" : "peer",
    explicitly_addressed: Boolean(addressed),
  };

  if (!normalized?.ok) {
    return {
      ...base,
      rule_id: "admission.invalid",
      reason: "invalid normalized event",
    };
  }

  if (looksLikeAgentJhnOutbound(normalized.text)) {
    return {
      ...base,
      observed_author: "agent",
      rule_id: "policy.ignore_own_agent_echo",
      reason: "inbound looks like Agent JHN outbound; skip to avoid loops",
    };
  }

  const selfJid = bareJid(config.allowed_self_jid || "");
  const peer = bareJid(normalized.remote_jid_bare || normalized.remote_jid);
  const selfOk = isAllowedSelfPeer(normalized, config, selfJid, peer);
  const cockpit = context.cockpitCommand === true || looksLikeCockpitCommand(normalized.text);
  const proactive =
    config.proactive_opt_in === true && context.proactiveAuthorized === true;

  if (normalized.from_me) {
    if (normalized.conversation_kind === CONVERSATION_KINDS.GROUP) {
      return {
        ...base,
        rule_id: "policy.custodian_outbound_silent",
        reason: "custodian group outbound is not an invitation to speak",
      };
    }
    if (!selfOk.ok) {
      return {
        ...base,
        rule_id: "policy.custodian_outbound_silent",
        reason:
          "custodian outbound on the shared non-exclusive account is not an invitation to speak",
      };
    }
    if (cockpit) {
      return {
        ...base,
        admitted: true,
        trigger: "cockpit_command",
        rule_id: "admission.cockpit_command",
        reason: "self-chat cockpit command from the custodian",
      };
    }
    if (addressed) {
      return {
        ...base,
        admitted: true,
        trigger: "explicit_invocation",
        rule_id: "admission.explicit_invocation",
        reason: "custodian explicitly invoked Agent JHN in self-chat",
      };
    }
    return {
      ...base,
      rule_id: "policy.custodian_self_echo",
      reason: "human self-chat without explicit invocation; no automatic generation or reply",
    };
  }

  if (proactive) {
    return {
      ...base,
      admitted: true,
      trigger: "proactive_opt_in",
      rule_id: "admission.proactive_opt_in",
      reason: "separately mandated proactive policy",
    };
  }

  return {
    ...base,
    admitted: true,
    trigger: selfOk.ok ? "self_chat_inbound" : "peer_inbound",
    observed_author: selfOk.ok ? "self_peer" : "third_party",
    rule_id: "admission.observe",
    reason: "inbound observation admitted for policy evaluation",
  };
}

function looksLikeCockpitCommand(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return false;
  if (
    t === "help" ||
    t === "list" ||
    t === "list conversations" ||
    t === "list chats" ||
    t === "contacts" ||
    t === "contact list" ||
    t === "reset rate limit" ||
    t === "reset limit" ||
    t === "unblock"
  ) {
    return true;
  }
  return /^(contact|inspect|approve|reject|close)\s+\S/i.test(t);
}
