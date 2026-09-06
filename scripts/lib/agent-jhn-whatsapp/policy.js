/**
 * Pure policy for Agent JHN WhatsApp MVP.
 * Inputs are untrusted; outputs default to reject.
 * No side effects, no network, no secrets.
 */

import {
  CONVERSATION_KINDS,
  DECISIONS,
  ENGAGING_PATTERNS,
  GROUP_POLICY_MODES,
} from "./constants.js";
import {
  bareJid,
} from "./inbound-normalizer.js";
import { evaluateUsageGrant } from "./usage-grant.js";
import {
  AUDIENCE,
  draftIncludesSelfIdentification,
  draftIncludesThirdPartyDisclosure,
  looksLikeAgentJhnOutbound,
  outboundDisclosureOk,
} from "./disclosure.js";
import { checkRateLimit } from "./rate-limiter.js";
import { isExplicitlyAddressed } from "./mention-address.js";
import { detectEmergency } from "./emergency-detect.js";
import { PERM_SEND_GROUP_WHEN_POLICY_ALLOWS } from "./constants.js";
import { isAllowedSelfPeer } from "./self-peer.js";
import { admitTurn } from "./turn-admission.js";

export { isAllowedSelfPeer } from "./self-peer.js";

/**
 * Evaluate inbound (or intended outbound) against policy.
 *
 * @param {object} normalized - from inbound-normalizer
 * @param {object} config - from loadConfig
 * @param {object} [context]
 * @param {string} [context.draftText] - candidate reply text
 * @param {boolean} [context.intentIsEngaging]
 * @param {string} [context.now]
 * @returns {{
 *   decision: string,
 *   rule_id: string,
 *   reason: string,
 *   allow_send: boolean,
 *   group_policy_mode: string|null,
 *   details: object
 * }}
 */
export function evaluatePolicy(normalized, config, context = {}) {
  const details = {
    account_custodian_id: config.account_custodian_id,
    beneficiary_instance_id: config.usage_grant?.beneficiary_instance_id,
    visible_agent_id: config.visible_agent_id,
    mandate_id: config.mandate_id,
    persona_id: config.persona_id,
  };

  // 1. persona forbidden
  if (config.persona_id !== null && config.persona_id !== undefined) {
    return reject("policy.persona_forbidden", "persona_id must be null", details);
  }

  // 2. mode
  if (config.mode !== "self_chat_only") {
    return reject("policy.mode", `mode ${config.mode} not allowed`, details);
  }

  // 3. invalid normalization
  if (!normalized?.ok) {
    return reject(
      normalized?.rule_id || "policy.invalid_event",
      normalized?.error || "invalid normalized event",
      details,
    );
  }

  // 3b. pure protocol / empty sync noise — hold without media false-positive
  if (normalized.is_protocol_noise) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.protocol_noise",
      reason: "protocol-only or empty sync event",
      allow_send: false,
      group_policy_mode: null,
      details,
    };
  }

  // 3c. Rate Limiter & Circuit Breaker Check (Loop & Runaway Send Protection)
  const rateLimitCheck = checkRateLimit(config, { now: context.now });
  if (!rateLimitCheck.allowed) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: rateLimitCheck.rule_id,
      reason: rateLimitCheck.reason,
      allow_send: false,
      group_policy_mode: null,
      details: { ...details, rate_limiter: rateLimitCheck },
    };
  }

  // 4. media forbidden (real media only)
  if (normalized?.has_media) {
    return reject("policy.media_forbidden", "media messages are forbidden", details);
  }

  // 5. usage grant (always re-checked; blocks outbox before transport)
  const grantResult = evaluateUsageGrant(config.usage_grant, {
    now: context.now,
    requestedInstanceId: config.agent_id || "agent-jhn",
    requireSend: false,
  });
  if (!grantResult.ok) {
    return reject(grantResult.rule_id, grantResult.reason, {
      ...details,
      grant: grantResult,
    });
  }

  const admission = context.admission && typeof context.admission === "object"
    ? context.admission
    : admitTurn(normalized, config, context);
  details.turn_admission = {
    admitted: admission.admitted,
    trigger: admission.trigger,
    observed_author: admission.observed_author,
    explicitly_addressed: admission.explicitly_addressed,
  };
  if (!admission.admitted) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: admission.rule_id,
      reason: admission.reason,
      allow_send: false,
      group_policy_mode: null,
      details,
    };
  }

  const addressed = context.explicitlyAddressed === true ||
    (context.explicitlyAddressed !== false && isExplicitlyAddressed(normalized.text));
  const channelPolicy = resolveChannelPolicy(normalized, config, addressed);

  // 6. groups: stealth unless explicitly addressed as John/JHN; emergency override
  const groupPolicyMode = resolveGroupPolicyMode(normalized, config);
  if (normalized.conversation_kind === CONVERSATION_KINDS.GROUP) {
    return evaluateGroupPolicy(normalized, config, { ...context, channelPolicy }, details, groupPolicyMode);
  }

  // 7. self_only contact scope for direct chats
  const selfJid = bareJid(config.allowed_self_jid || "");
  if (!selfJid) {
    return reject(
      "policy.self_jid_unconfigured",
      "allowed_self_jid not configured",
      details,
    );
  }

  const peer = bareJid(normalized.remote_jid_bare || normalized.remote_jid);
  const selfOk = isAllowedSelfPeer(normalized, config, selfJid, peer);
  if (!selfOk.ok) {
    if (channelPolicy.action === "silent" &&
        ["self_and_direct", "all"].includes(config.usage_grant?.conversation_scope)) {
      return hold("policy.direct_channel_silent", "direct third-party message was not explicitly addressed to John", channelPolicy);
    }
    if (channelPolicy.action !== "silent" &&
        ["self_and_direct", "all"].includes(config.usage_grant?.conversation_scope)) {
      if (channelPolicy.action === "draft") {
        return hold("policy.direct_channel_draft", "direct channel policy requests a draft only", channelPolicy);
      }
      if (channelPolicy.action === "reply_on_address" && !addressed) {
        return hold("policy.direct_unaddressed", "direct third-party message was not addressed to John", channelPolicy);
      }
      if (channelPolicy.action === "agent_decides" && context.agentDecision !== true) {
        return hold("policy.direct_agent_decision_required", "direct third-party intervention requires an explicit suitability decision", channelPolicy);
      }
      return finalizeDirectThirdParty(normalized, config, context, details, channelPolicy);
    }
    return reject(
      "policy.third_party_forbidden",
      selfOk.reason || `contact ${maskJid(peer)} is not the allowed self JID`,
      {
        ...details,
        peer_suffix: peer.slice(-16),
        peer_domain: peer.includes("@") ? peer.split("@")[1] : null,
        from_me: Boolean(normalized.from_me),
        is_lid: Boolean(normalized.is_lid),
      },
    );
  }

  // fromMe self-notes may be observed; still only self chat.
  // Empty text → hold
  if (!normalized.text || !String(normalized.text).trim()) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.empty_text",
      reason: "empty text; no auto reply",
      allow_send: false,
      group_policy_mode: null,
      details,
    };
  }

  // 7b. do not auto-reply to our own agent messages (loop guard)
  if (looksLikeAgentJhnOutbound(normalized.text)) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.ignore_own_agent_echo",
      reason: "inbound looks like Agent JHN outbound; skip to avoid loops",
      allow_send: false,
      group_policy_mode: null,
      details,
    };
  }

  // 8. engaging intent on draft (if provided) or inbound markers
  const draftText = context.draftText || "";
  const engaging =
    context.intentIsEngaging === true ||
    isEngagingText(normalized.text) ||
    isEngagingText(draftText);
  if (engaging) {
    return reject(
      "policy.engaging_intent",
      "engaging / committing intent cannot be auto-sent",
      details,
    );
  }

  // 9. send_enabled gate — if false, only draft/hold
  if (!config.send_enabled) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id: "policy.send_disabled",
      reason: "SEND_ENABLED=false; draft only",
      allow_send: false,
      group_policy_mode: null,
      details,
    };
  }

  // 10. dry_run never materializes
  if (config.dry_run) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id: "policy.dry_run",
      reason: "dry_run active; no material send",
      allow_send: false,
      group_policy_mode: null,
      details,
    };
  }

  // 11. grant must allow send
  const grantSend = evaluateUsageGrant(config.usage_grant, {
    now: context.now,
    requestedInstanceId: config.agent_id || "agent-jhn",
    requireSend: true,
  });
  if (!grantSend.ok) {
    return reject(grantSend.rule_id, grantSend.reason, {
      ...details,
      grant: grantSend,
    });
  }

  // 12. disclosure: self = light identification; third_party = full chatbot notice
  const audience = context.audience || AUDIENCE.SELF;
  if (draftText && !outboundDisclosureOk(draftText, config, { audience })) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id:
        audience === AUDIENCE.THIRD_PARTY
          ? "policy.missing_third_party_disclosure"
          : "policy.missing_self_identification",
      reason:
        audience === AUDIENCE.THIRD_PARTY
          ? "third-party draft must clearly identify experimental chatbot + disclosure"
          : "self-chat draft must identify Agent JHN (verbose notice optional)",
      allow_send: false,
      group_policy_mode: null,
      details: { ...details, audience },
    };
  }

  // All preconditions satisfied for self-chat auto-reply path
  return {
    decision: DECISIONS.SEND,
    rule_id: "policy.self_chat_send",
    reason: "self_chat_only preconditions satisfied",
    allow_send: true,
    group_policy_mode: null,
    details,
  };
}

export function resolveChannelPolicy(normalized, config, addressed = false) {
  const kind = normalized?.conversation_kind === CONVERSATION_KINDS.GROUP ? "group" : "direct";
  const phase = addressed ? "addressed" : "unaddressed";
  const defaults = config.channel_policies?.defaults || {};
  const override = config.channel_policies?.overrides?.[normalized?.remote_jid] ||
    config.channel_policies?.overrides?.[normalized?.conversation_id] || {};
  return { ...(defaults[`${kind}_${phase}`] || defaults.self || { action: "silent" }), ...override,
    channel_key: normalized?.conversation_id || normalized?.remote_jid || kind };
}

function hold(rule_id, reason, channelPolicy) {
  return { decision: DECISIONS.HOLD_FOR_HUMAN, rule_id, reason, allow_send: false,
    group_policy_mode: null, details: { channel_policy: channelPolicy } };
}

function finalizeDirectThirdParty(normalized, config, context, details, channelPolicy) {
  const draftText = context.draftText || "";
  if (context.intentIsEngaging === true || isEngagingText(normalized.text) || isEngagingText(draftText)) {
    return reject("policy.engaging_intent", "engaging / committing intent cannot be auto-sent", {
      ...details, channel_policy: channelPolicy, audience: AUDIENCE.THIRD_PARTY,
    });
  }
  if (!config.send_enabled || config.dry_run) return {
    decision: DECISIONS.DRAFT_ONLY, rule_id: "policy.direct_channel_draft", reason: "direct channel policy permits intervention; sending is disabled", allow_send: false,
    group_policy_mode: null, details: { ...details, channel_policy: channelPolicy, audience: AUDIENCE.THIRD_PARTY },
  };
  const grant = evaluateUsageGrant(config.usage_grant, { now: context.now, requestedInstanceId: config.agent_id || "agent-jhn", requireSend: true, requiredScope: "self_and_direct" });
  if (!grant.ok) return reject(grant.rule_id, grant.reason, { ...details, channel_policy: channelPolicy, grant });
  if (draftText && !outboundDisclosureOk(draftText, config, { audience: AUDIENCE.THIRD_PARTY })) return {
    decision: DECISIONS.DRAFT_ONLY, rule_id: "policy.missing_third_party_disclosure", reason: "direct third-party draft must identify experimental chatbot + disclosure", allow_send: false,
    group_policy_mode: null, details: { ...details, channel_policy: channelPolicy, audience: AUDIENCE.THIRD_PARTY },
  };
  return { decision: DECISIONS.SEND, rule_id: "policy.direct_channel_send", reason: "direct channel policy permits this intervention", allow_send: true, group_policy_mode: null,
    details: { ...details, channel_policy: channelPolicy, audience: AUDIENCE.THIRD_PARTY } };
}

/**
 * Resolve declared group policy mode (representable even when disabled globally).
 */
export function resolveGroupPolicyMode(normalized, config) {
  if (normalized?.conversation_kind !== CONVERSATION_KINDS.GROUP) {
    return null;
  }
  if (!config.groups_explicitly_enabled) {
    return GROUP_POLICY_MODES.DISABLED;
  }
  const gid = normalized.group_id;
  if (gid && config.group_policies && config.group_policies[gid]) {
    return config.group_policies[gid];
  }
  // Also allow lookup by raw remote jid key
  const rawKey = normalized.remote_jid;
  if (rawKey && config.group_policies && config.group_policies[rawKey]) {
    return config.group_policies[rawKey];
  }
  return GROUP_POLICY_MODES.REPLY_ON_ADDRESS;
}

/**
 * List all representable group policy modes (for tests / docs).
 */
export function listRepresentableGroupPolicyModes() {
  return Object.values(GROUP_POLICY_MODES);
}

export function isEngagingText(text) {
  const s = String(text || "");
  if (!s.trim()) return false;
  return ENGAGING_PATTERNS.some((re) => re.test(s));
}

/**
 * Backward-compatible helper:
 * - with audience self (default): agent identification
 * - if text has full notice URL, also ok (legacy verbose self messages)
 */
export function draftIncludesNotice(draftText, noticeUrl, options = {}) {
  const audience = options.audience || AUDIENCE.SELF;
  if (audience === AUDIENCE.THIRD_PARTY) {
    return draftIncludesThirdPartyDisclosure(draftText, noticeUrl);
  }
  if (draftIncludesSelfIdentification(draftText)) return true;
  // Legacy verbose self drafts still pass
  const d = String(draftText || "");
  if (noticeUrl && d.includes(noticeUrl)) return true;
  if (d.includes("agent-jhn-experimental-notice")) return true;
  return false;
}

function evaluateGroupPolicy(normalized, config, context, details, groupPolicyMode) {
  const groupDetails = {
    ...details,
    group_policy_mode: groupPolicyMode,
    group_id: normalized.group_id,
  };

  if (!config.groups_explicitly_enabled) {
    return reject(
      "policy.group_disabled",
      "group runtime disabled; principal may still be alerted on emergency",
      { ...groupDetails, group_policy_mode: GROUP_POLICY_MODES.DISABLED },
    );
  }

  if (groupPolicyMode === GROUP_POLICY_MODES.DISABLED) {
    return reject(
      "policy.group_mode_disabled",
      "group_policy_mode is disabled for this group",
      groupDetails,
    );
  }

  const addressed =
    context.explicitlyAddressed === true ||
    (context.explicitlyAddressed !== false && isExplicitlyAddressed(normalized.text));
  const emergency =
    context.emergency && typeof context.emergency === "object"
      ? context.emergency
      : detectEmergency(normalized.text);
  const emergencyFollowUp = context.emergencyFollowUp === true;
  const emergencyHit = Boolean(emergency?.hit) || emergencyFollowUp;
  const channelAction = context.channelPolicy?.action;
  if (channelAction === "silent") {
    return reject("policy.channel_silent", "channel policy requests silence", { ...groupDetails, channel_policy: context.channelPolicy });
  }
  if (channelAction === "draft") {
    return { decision: DECISIONS.DRAFT_ONLY, rule_id: "policy.channel_draft", reason: "channel policy requests a draft only", allow_send: false,
      group_policy_mode: groupPolicyMode, details: { ...groupDetails, channel_policy: context.channelPolicy } };
  }
  if (channelAction === "agent_decides" && context.agentDecision !== true && !detectEmergency(normalized.text).hit) {
    return hold("policy.group_agent_decision_required", "group intervention requires an explicit suitability decision", context.channelPolicy);
  }
  groupDetails.addressed = addressed;
  groupDetails.emergency = Boolean(emergencyHit);
  groupDetails.emergency_precision = emergency?.precision || (emergencyFollowUp ? "follow_up" : "none");

  const canAutoSendOnAddress =
    groupPolicyMode === GROUP_POLICY_MODES.REPLY_ON_ADDRESS ||
    groupPolicyMode === GROUP_POLICY_MODES.MANDATED_AUTONOMY;

  if (!addressed && !emergencyHit) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.group_stealth_silent",
      reason: "not addressed as John/JHN; stay silent so unaware members do not see the agent",
      allow_send: false,
      group_policy_mode: groupPolicyMode,
      details: groupDetails,
    };
  }

  if (looksLikeAgentJhnOutbound(normalized.text)) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.ignore_own_agent_echo",
      reason: "inbound looks like Agent JHN outbound; skip to avoid loops",
      allow_send: false,
      group_policy_mode: groupPolicyMode,
      details: groupDetails,
    };
  }

  if (normalized.from_me && !emergencyHit) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.group_own_message",
      reason: "own group message; no auto reply unless emergency",
      allow_send: false,
      group_policy_mode: groupPolicyMode,
      details: groupDetails,
    };
  }

  // Emergency overrides observe / draft-only / approval — still not a 15/112 substitute.
  if (emergencyHit) {
    return finalizeGroupSend(normalized, config, context, groupDetails, {
      rule_id: "policy.group_emergency_send",
      reason:
        "possible emergency: intervene, gather facts, alert principal, redirect to authorities",
      group_policy_mode: groupPolicyMode,
      skipEngaging: true,
    });
  }

  if (groupPolicyMode === GROUP_POLICY_MODES.OBSERVE) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.group_observe",
      reason: "group observe mode: no auto reply",
      allow_send: false,
      group_policy_mode: groupPolicyMode,
      details: groupDetails,
    };
  }

  if (groupPolicyMode === GROUP_POLICY_MODES.DRAFT_ON_MENTION) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id: "policy.group_draft_on_mention",
      reason: "group draft_on_mention: draft only, no send",
      allow_send: false,
      group_policy_mode: groupPolicyMode,
      details: groupDetails,
    };
  }

  if (groupPolicyMode === GROUP_POLICY_MODES.APPROVAL_REQUIRED) {
    return {
      decision: DECISIONS.HOLD_FOR_HUMAN,
      rule_id: "policy.group_approval_required",
      reason: "group approval_required",
      allow_send: false,
      group_policy_mode: groupPolicyMode,
      details: groupDetails,
    };
  }

  if (!canAutoSendOnAddress) {
    return reject(
      "policy.group_unknown_mode",
      `unknown group policy mode ${groupPolicyMode}`,
      groupDetails,
    );
  }

  const draftText = context.draftText || "";
  const engaging =
    context.intentIsEngaging === true ||
    isEngagingText(normalized.text) ||
    isEngagingText(draftText);
  if (engaging) {
    return reject(
      "policy.engaging_intent",
      "engaging / committing intent cannot be auto-sent",
      groupDetails,
    );
  }

  return finalizeGroupSend(normalized, config, context, groupDetails, {
    rule_id: "policy.group_address_send",
    reason: "explicitly addressed as John/JHN in group",
    group_policy_mode: groupPolicyMode,
    skipEngaging: false,
  });
}

function finalizeGroupSend(normalized, config, context, details, spec) {
  if (!config.send_enabled) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id: "policy.send_disabled",
      reason: "SEND_ENABLED=false; draft only",
      allow_send: false,
      group_policy_mode: spec.group_policy_mode,
      details,
    };
  }
  if (config.dry_run) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id: "policy.dry_run",
      reason: "dry_run active; no material send",
      allow_send: false,
      group_policy_mode: spec.group_policy_mode,
      details,
    };
  }

  const grantSend = evaluateUsageGrant(config.usage_grant, {
    now: context.now,
    requestedInstanceId: config.agent_id || "agent-jhn",
    requireSend: true,
    requireGroupSend: true,
  });
  if (!grantSend.ok) {
    return reject(grantSend.rule_id, grantSend.reason, {
      ...details,
      grant: grantSend,
    });
  }

  const audience = AUDIENCE.THIRD_PARTY;
  const draftText = context.draftText || "";
  if (draftText && !outboundDisclosureOk(draftText, config, { audience })) {
    return {
      decision: DECISIONS.DRAFT_ONLY,
      rule_id: "policy.missing_third_party_disclosure",
      reason: "group draft must identify experimental chatbot + disclosure",
      allow_send: false,
      group_policy_mode: spec.group_policy_mode,
      details: { ...details, audience },
    };
  }

  return {
    decision: DECISIONS.SEND,
    rule_id: spec.rule_id,
    reason: spec.reason,
    allow_send: true,
    group_policy_mode: spec.group_policy_mode,
    details: {
      ...details,
      audience,
      grant_permission: PERM_SEND_GROUP_WHEN_POLICY_ALLOWS,
    },
  };
}

function reject(rule_id, reason, details) {
  return {
    decision: DECISIONS.REJECT,
    rule_id,
    reason,
    allow_send: false,
    group_policy_mode: details?.group_policy_mode ?? null,
    details,
  };
}

function maskJid(jid) {
  const s = String(jid || "");
  if (s.length <= 12) return "***";
  return `…${s.slice(-12)}`;
}

// looksLikeAgentJhnOutbound imported from disclosure.js
