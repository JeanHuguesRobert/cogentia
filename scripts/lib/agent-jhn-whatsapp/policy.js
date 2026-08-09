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
  isGroupJid,
  isLidJid,
  phoneDigitsFromJid,
  samePhoneAccount,
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

  // 6. groups: representable modes, effective reject for real groups in MVP
  const groupPolicyMode = resolveGroupPolicyMode(normalized, config);
  if (normalized.conversation_kind === CONVERSATION_KINDS.GROUP) {
    // Always reject material send/auto-reply for groups in this MVP lot.
    // Modes may be represented for future activation tests.
    if (!config.groups_explicitly_enabled) {
      return reject(
        "policy.group_disabled",
        "group runtime disabled for first real test",
        { ...details, group_policy_mode: GROUP_POLICY_MODES.DISABLED, group_id: normalized.group_id },
      );
    }
    // Even with groups_explicitly_enabled, first lot does not auto-send in groups.
    if (groupPolicyMode === GROUP_POLICY_MODES.DISABLED) {
      return reject(
        "policy.group_mode_disabled",
        "group_policy_mode is disabled for this group",
        { ...details, group_policy_mode: groupPolicyMode, group_id: normalized.group_id },
      );
    }
    if (groupPolicyMode === GROUP_POLICY_MODES.OBSERVE) {
      return {
        decision: DECISIONS.HOLD_FOR_HUMAN,
        rule_id: "policy.group_observe",
        reason: "group observe mode: no auto reply",
        allow_send: false,
        group_policy_mode: groupPolicyMode,
        details: { ...details, group_id: normalized.group_id },
      };
    }
    if (groupPolicyMode === GROUP_POLICY_MODES.DRAFT_ON_MENTION) {
      return {
        decision: DECISIONS.DRAFT_ONLY,
        rule_id: "policy.group_draft_on_mention",
        reason: "group draft_on_mention: draft only, no send in MVP",
        allow_send: false,
        group_policy_mode: groupPolicyMode,
        details: { ...details, group_id: normalized.group_id },
      };
    }
    if (groupPolicyMode === GROUP_POLICY_MODES.APPROVAL_REQUIRED) {
      return {
        decision: DECISIONS.HOLD_FOR_HUMAN,
        rule_id: "policy.group_approval_required",
        reason: "group approval_required",
        allow_send: false,
        group_policy_mode: groupPolicyMode,
        details: { ...details, group_id: normalized.group_id },
      };
    }
    if (groupPolicyMode === GROUP_POLICY_MODES.MANDATED_AUTONOMY) {
      return {
        decision: DECISIONS.DRAFT_ONLY,
        rule_id: "policy.group_mandated_autonomy_mvp_draft",
        reason: "mandated_autonomy representable but not activated for send in this MVP",
        allow_send: false,
        group_policy_mode: groupPolicyMode,
        details: { ...details, group_id: normalized.group_id },
      };
    }
    return reject(
      "policy.group_unknown_mode",
      `unknown group policy mode ${groupPolicyMode}`,
      { ...details, group_policy_mode: groupPolicyMode },
    );
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
  return GROUP_POLICY_MODES.DISABLED;
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

/**
 * Self-chat acceptance for MVP:
 * - exact bare JID match
 * - same phone digits (device suffix / formatting)
 * - Message Yourself / notes: fromMe on direct non-group, including @lid peers
 */
export function isAllowedSelfPeer(normalized, config, selfJid, peer) {
  const self = selfJid || bareJid(config.allowed_self_jid || "");
  const p = peer || bareJid(normalized?.remote_jid_bare || normalized?.remote_jid || "");
  if (!self) return { ok: false, reason: "self jid unconfigured" };
  if (isGroupJid(normalized?.remote_jid || p)) {
    return { ok: false, reason: "group jid" };
  }
  if (p === self) return { ok: true, via: "exact_jid" };
  if (samePhoneAccount(p, self)) return { ok: true, via: "phone_digits" };
  // WhatsApp "Message yourself" often uses @lid or fromMe on own chat.
  if (
    normalized?.from_me &&
    normalized?.conversation_kind === CONVERSATION_KINDS.DIRECT &&
    !isGroupJid(normalized.remote_jid)
  ) {
    if (isLidJid(normalized.remote_jid) || isLidJid(p)) {
      return { ok: true, via: "from_me_lid_self_chat" };
    }
    // fromMe direct to own PN (already covered) or status-like — only allow if digits match or empty peer domain is self
    if (samePhoneAccount(p, self) || phoneDigitsFromJid(p) === phoneDigitsFromJid(self)) {
      return { ok: true, via: "from_me_same_phone" };
    }
    // Last resort for self_chat_only: fromMe + direct + configured single self account
    // (Message Yourself may not expose PN on the peer jid.)
    if (config.mode === "self_chat_only" && config.allowed_self_jid) {
      return { ok: true, via: "from_me_direct_self_chat_only" };
    }
  }
  return {
    ok: false,
    reason: `contact ${maskJid(p)} is not the allowed self JID`,
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
