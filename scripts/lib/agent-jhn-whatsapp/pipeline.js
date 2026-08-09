/**
 * Inbound pipeline: normalize → policy → draft → trace → optional outbox request.
 * Material send only via outbound-gate drain + transport (never here directly).
 */

import { createHash } from "node:crypto";
import { normalizeInboundEvent } from "./inbound-normalizer.js";
import { evaluatePolicy } from "./policy.js";
import { buildDeterministicDraft, buildCognitiveDraft } from "./draft.js";
import {
  buildWhatsappArtifact,
  appendTrace,
  storeRawPrivate,
  validateWhatsappArtifact,
} from "./trace.js";
import {
  requestOutboundSend,
  buildActionRequestId,
} from "./outbound-gate.js";
import { ARTIFACT_TYPES, DECISIONS } from "./constants.js";
import { ensureStateDirs } from "./config.js";
import { rememberSelfPeer } from "./self-peer.js";
import { recordConversationTurn } from "./conversation-store.js";
import { isCockpitCommand, processCockpitCommand } from "./cockpit-commands.js";
import { formatOutboundText } from "./disclosure.js";

/**
 * Process one inbound event (synthetic or Baileys).
 *
 * @param {object} rawEvent
 * @param {object} config
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function handleInbound(rawEvent, config, options = {}) {
  if (config.state_dir) {
    ensureStateDirs(config);
  }

  const normalized = normalizeInboundEvent(rawEvent, {
    source: options.source || "runtime",
  });

  if (normalized.ok && config.state_dir) {
    storeRawPrivate(
      config,
      {
        platform_message_id: normalized.platform_message_id,
        conversation_id: normalized.conversation_id,
        text: normalized.text,
        observed_at: normalized.observed_at,
      },
      normalized.integrity.raw_message_sha256,
    );
  }

  let draft = normalized.ok
    ? (options.enableCognitiveSynthesis
        ? await buildCognitiveDraft(normalized, config, options)
        : buildDeterministicDraft(normalized, config, options))
    : null;

  // Process self-chat control cockpit commands (list, inspect, approve, reject, close)
  if (normalized.ok && normalized.text && isCockpitCommand(normalized.text)) {
    const cmdResult = processCockpitCommand(normalized.text, config);
    if (draft) {
      draft.text = formatOutboundText(cmdResult, { audience: "self" });
    }
  }

  // Record turn into persistent conversation thread
  if (normalized.ok && config.state_dir) {
    try {
      recordConversationTurn(config, normalized.conversation_id, {
        role: normalized.from_me ? "user_self" : "third_party",
        text: normalized.text,
        platform_message_id: normalized.platform_message_id,
      });
    } catch {
      /* non-fatal */
    }
  }

  // Remember Message-yourself peer (@lid) for later proactive sends.
  if (normalized.ok && config.state_dir) {
    try {
      rememberSelfPeer(config, normalized);
    } catch {
      /* non-fatal */
    }
  }

  const policy = evaluatePolicy(normalized, config, {
    draftText: draft?.text,
    now: options.now,
  });

  let receiveArtifact = null;
  if (config.state_dir && normalized.ok) {
    receiveArtifact = buildWhatsappArtifact({
      artifact_type: ARTIFACT_TYPES.RECEIVED,
      direction: "inbound",
      platform_message_id: normalized.platform_message_id,
      agent_id: config.agent_id,
      visible_agent_id: config.visible_agent_id,
      mandate_id: config.mandate_id,
      account_custodian_id: config.account_custodian_id,
      beneficiary_instance_id: config.usage_grant?.beneficiary_instance_id,
      principal_id: config.principal_id,
      persona_id: config.persona_id,
      conversation_kind: normalized.conversation_kind,
      conversation_id: normalized.conversation_id,
      group_id: normalized.group_id,
      group_member_id: normalized.group_member_id,
      visibility: "raw_private",
      raw_message_sha256: normalized.integrity.raw_message_sha256,
      raw_message_ref: normalized.integrity.raw_message_ref,
      raw_message_size: normalized.integrity.raw_message_size,
      transport_status: "received",
      policy,
      usage_grant: config.usage_grant,
      observed_at: normalized.observed_at,
    });
    const v = validateWhatsappArtifact(receiveArtifact);
    if (v.ok) appendTrace(config, receiveArtifact);
  }

  let outbound = null;
  if (
    policy.decision === DECISIONS.SEND &&
    policy.allow_send &&
    draft &&
    config.state_dir
  ) {
    outbound = requestOutboundSend({
      config,
      normalized,
      draftText: draft.text,
      actionRequestId: buildActionRequestId(normalized.platform_message_id),
      now: options.now,
    });
  }

  return {
    ok: true,
    normalized: summarizeNormalized(normalized),
    policy: {
      decision: policy.decision,
      rule_id: policy.rule_id,
      reason: policy.reason,
      allow_send: policy.allow_send,
      group_policy_mode: policy.group_policy_mode,
    },
    draft: draft
      ? {
          text_length: draft.text.length,
          includes_notice:
            draft.text.includes("agent-jhn-experimental") ||
            draft.text.includes("Agent JHN") ||
            draft.text.includes("agent-jhn-experimental-notice") ||
            (config.notice_url && draft.text.includes(config.notice_url)),
          audience: draft.audience,
          locale: draft.locale,
          provenance_class: draft.provenance_class,
          stub: draft.stub,
          // full text available in local draft path only when state_dir set
          text: options.includeDraftText ? draft.text : undefined,
        }
      : null,
    draft_text_for_local: options.includeDraftText ? draft?.text : undefined,
    outbound,
    receive_occurrence_id: receiveArtifact?.occurrence_id || null,
  };
}

function summarizeNormalized(n) {
  if (!n?.ok) {
    return { ok: false, error: n?.error, rule_id: n?.rule_id };
  }
  return {
    ok: true,
    conversation_kind: n.conversation_kind,
    conversation_id: n.conversation_id,
    group_id: n.group_id,
    group_member_id: n.group_member_id,
    remote_jid_suffix: String(n.remote_jid_bare || "").slice(-18),
    author_jid_suffix: String(n.author_jid || "").slice(-18),
    from_me: n.from_me,
    is_lid: Boolean(n.is_lid),
    platform_message_id: n.platform_message_id,
    text_length: n.text_length,
    has_media: n.has_media,
    is_protocol_only: Boolean(n.is_protocol_only),
    has_links: n.has_links,
    integrity_sha256: n.integrity?.raw_message_sha256,
  };
}

/**
 * Content hash helper for tests.
 */
export function sha256Text(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}
