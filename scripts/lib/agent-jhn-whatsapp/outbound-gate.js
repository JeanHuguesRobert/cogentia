/**
 * Unique frontier authorized to request material WhatsApp send.
 * Re-checks every precondition. Agents never call sendMessage directly.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  enqueueOutbox,
  listPendingOutbox,
  markOutboxDelivered,
  markOutboxFailed,
  markOutboxInFlight,
  outboxStats,
  ensureOutboxDirs,
} from "../../ops/edge/lib/outbox.js";
import { evaluatePolicy, draftIncludesNotice } from "./policy.js";
import { evaluateUsageGrant } from "./usage-grant.js";
import { bareJid } from "./inbound-normalizer.js";
import { buildWhatsappArtifact, appendTrace, validateWhatsappArtifact } from "./trace.js";
import { ARTIFACT_TYPES, DECISIONS } from "./constants.js";
import { resolveSentLedgerPath } from "./config.js";
import { resolveSelfSendJid } from "./self-peer.js";
import { AUDIENCE, outboundDisclosureOk } from "./disclosure.js";

const OUTBOX_KIND = "whatsapp.send";
const OUTBOX_TARGET = "whatsapp.self_chat";

/**
 * Build idempotent action request id for a reply to an inbound message.
 */
export function buildActionRequestId(platformMessageId, attempt = 1) {
  const id = String(platformMessageId || "unknown").replace(/[/\\:]/g, "_");
  return `wa-action:${id}:reply:${attempt}`;
}

/**
 * True if this action_request_id was already enqueued or marked sent.
 */
export function isActionAlreadyHandled(stateDir, actionRequestId, config) {
  const { pending, failed } = ensureOutboxDirs(stateDir);
  const safe = `${String(actionRequestId).replace(/[/\\:]/g, "_")}.json`;
  if (fs.existsSync(path.join(pending, safe))) return { handled: true, where: "pending" };
  if (fs.existsSync(path.join(failed, safe))) return { handled: true, where: "failed" };

  const ledger = resolveSentLedgerPath(config);
  if (fs.existsSync(ledger)) {
    const lines = fs.readFileSync(ledger, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const row = JSON.parse(line);
        if (row.action_request_id === actionRequestId) {
          return { handled: true, where: "sent_ledger" };
        }
      } catch {
        /* skip */
      }
    }
  }
  return { handled: false };
}

/**
 * Enqueue a send request after policy allows draft→send path.
 * Always re-evaluates policy. Never sends itself.
 *
 * @returns {{ ok: boolean, enqueued?: boolean, reason?: string, action_request_id?: string, record?: object }}
 */
export function requestOutboundSend({
  config,
  normalized,
  draftText,
  actionRequestId,
  now,
}) {
  if (!config?.state_dir) {
    return { ok: false, enqueued: false, reason: "state_dir missing" };
  }

  const action_request_id = actionRequestId || buildActionRequestId(normalized?.platform_message_id);

  const dup = isActionAlreadyHandled(config.state_dir, action_request_id, config);
  if (dup.handled) {
    return {
      ok: true,
      enqueued: false,
      idempotent_skip: true,
      reason: `already handled in ${dup.where}`,
      action_request_id,
    };
  }

  // Grant must be valid before outbox (amendment tests 16–18)
  const grant = evaluateUsageGrant(config.usage_grant, {
    now,
    requestedInstanceId: config.agent_id || "agent-jhn",
    requireSend: true,
  });
  if (!grant.ok) {
    return {
      ok: false,
      enqueued: false,
      reason: grant.reason,
      rule_id: grant.rule_id,
      action_request_id,
      blocked_before_outbox: true,
    };
  }

  if (!config.send_enabled) {
    return {
      ok: false,
      enqueued: false,
      reason: "SEND_ENABLED=false",
      rule_id: "gate.send_disabled",
      action_request_id,
      blocked_before_outbox: true,
    };
  }

  if (config.dry_run) {
    return {
      ok: false,
      enqueued: false,
      reason: "dry_run: no outbox enqueue for material send",
      rule_id: "gate.dry_run",
      action_request_id,
      blocked_before_outbox: true,
    };
  }

  const policy = evaluatePolicy(normalized, config, {
    draftText,
    now,
  });
  if (!policy.allow_send || policy.decision !== DECISIONS.SEND) {
    return {
      ok: false,
      enqueued: false,
      reason: policy.reason,
      rule_id: policy.rule_id,
      decision: policy.decision,
      action_request_id,
      blocked_before_outbox: true,
    };
  }

  const audience = AUDIENCE.SELF; // MVP gate is self-chat only
  if (!outboundDisclosureOk(draftText, config, { audience })) {
    return {
      ok: false,
      enqueued: false,
      reason: "draft missing Agent JHN self-identification",
      rule_id: "gate.missing_self_identification",
      action_request_id,
      blocked_before_outbox: true,
    };
  }

  // Prefer Message-yourself @lid when remembered; else bare ALLOWED_SELF_JID.
  const toJid = resolveSelfSendJid(config) || bareJid(config.allowed_self_jid);
  const record = enqueueOutbox(config.state_dir, {
    id: action_request_id,
    kind: OUTBOX_KIND,
    target: OUTBOX_TARGET,
    payload: {
      action_request_id,
      to_jid: toJid,
      text: draftText,
      conversation_id: normalized.conversation_id,
      in_reply_to: normalized.platform_message_id,
      visible_agent_id: config.visible_agent_id,
      mandate_id: config.mandate_id,
      grant_id: config.usage_grant?.grant_id,
      account_custodian_id: config.account_custodian_id,
      beneficiary_instance_id: config.usage_grant?.beneficiary_instance_id,
      policy: {
        decision: policy.decision,
        rule_id: policy.rule_id,
        reason: policy.reason,
      },
    },
  });

  const art = buildWhatsappArtifact({
    artifact_type: ARTIFACT_TYPES.SEND_REQUESTED,
    direction: "outbound",
    platform_message_id: normalized.platform_message_id,
    action_request_id,
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
    visibility: "private",
    raw_message_sha256: normalized.integrity?.raw_message_sha256,
    raw_message_ref: normalized.integrity?.raw_message_ref,
    transport_status: "queued",
    policy,
    usage_grant: config.usage_grant,
  });
  validateWhatsappArtifact(art);
  appendTrace(config, art);

  return {
    ok: true,
    enqueued: true,
    action_request_id,
    record,
    policy,
  };
}

/**
 * Drain outbox: re-verify policy + grant, then optionally call transport.sendText.
 * When dryRun or no transport, does not send.
 *
 * @param {object} config
 * @param {object} [options]
 * @param {{ sendText: (jid: string, text: string) => Promise<{ok:boolean, id?:string, error?:string}> }} [options.transport]
 * @param {boolean} [options.dryRun]
 */
export async function drainWhatsappOutbox(config, options = {}) {
  const dryRun = options.dryRun === true || config.dry_run === true;
  const transport = options.transport || null;
  const pending = listPendingOutbox(config.state_dir, { limit: options.limit || 20 });
  const results = [];

  for (const row of pending) {
    if (row.kind !== OUTBOX_KIND) {
      markOutboxFailed(row, `unsupported_kind:${row.kind}`);
      results.push({ id: row.id, ok: false, error: "unsupported_kind" });
      continue;
    }

    const recheck = recheckOutboundPreconditions(config, row.payload || {}, options.now);
    if (!recheck.ok) {
      // Grant revocation / policy fail: fail permanently-ish with inspectable error
      const fail = markOutboxFailed(row, recheck.reason, { maxAttempts: 1 });
      results.push({
        id: row.id,
        ok: false,
        blocked: true,
        reason: recheck.reason,
        rule_id: recheck.rule_id,
        state: fail.state,
      });
      continue;
    }

    if (dryRun || !transport) {
      results.push({
        id: row.id,
        ok: true,
        dry_run: true,
        sent: false,
        reason: dryRun ? "dry_run" : "no_transport",
      });
      continue;
    }

    try {
      markOutboxInFlight(row);
      // Reload file path for subsequent marks — markOutboxInFlight mutates file but row still has _filePath
      const sendResult = await transport.sendText(row.payload.to_jid, row.payload.text);
      if (sendResult?.ok) {
        markOutboxDelivered(row);
        appendSentLedger(config, {
          action_request_id: row.payload.action_request_id || row.id,
          platform_send_id: sendResult.id || null,
          at: new Date().toISOString(),
          to_jid_suffix: String(row.payload.to_jid || "").slice(-12),
        });
        const art = buildWhatsappArtifact({
          artifact_type: ARTIFACT_TYPES.SENT,
          direction: "outbound",
          action_request_id: row.payload.action_request_id || row.id,
          platform_message_id: sendResult.id || null,
          agent_id: config.agent_id,
          visible_agent_id: config.visible_agent_id,
          mandate_id: config.mandate_id,
          account_custodian_id: config.account_custodian_id,
          beneficiary_instance_id: config.usage_grant?.beneficiary_instance_id,
          principal_id: config.principal_id,
          conversation_kind: "direct",
          conversation_id: row.payload.conversation_id,
          visibility: "private",
          raw_message_sha256: createPlaceholderSha(row.payload.text),
          transport_status: "sent",
          policy: row.payload.policy,
          usage_grant: config.usage_grant,
        });
        appendTrace(config, art);
        results.push({ id: row.id, ok: true, sent: true, platform_send_id: sendResult.id });
      } else {
        const fail = markOutboxFailed(row, sendResult?.error || "send_failed");
        const art = buildWhatsappArtifact({
          artifact_type: ARTIFACT_TYPES.DELIVERY_FAILED,
          direction: "outbound",
          action_request_id: row.payload.action_request_id || row.id,
          agent_id: config.agent_id,
          visible_agent_id: config.visible_agent_id,
          mandate_id: config.mandate_id,
          account_custodian_id: config.account_custodian_id,
          beneficiary_instance_id: config.usage_grant?.beneficiary_instance_id,
          principal_id: config.principal_id,
          conversation_kind: "direct",
          visibility: "private",
          raw_message_sha256: createPlaceholderSha(row.payload.text),
          transport_status: "failed",
          policy: row.payload.policy,
          usage_grant: config.usage_grant,
          notes: String(sendResult?.error || "send_failed").slice(0, 200),
        });
        appendTrace(config, art);
        results.push({
          id: row.id,
          ok: false,
          sent: false,
          error: sendResult?.error,
          attempts: fail.attempts,
          state: fail.state,
          next_attempt_at: fail.next_attempt_at,
        });
      }
    } catch (err) {
      const fail = markOutboxFailed(row, err.message || "send_exception");
      results.push({
        id: row.id,
        ok: false,
        error: err.message,
        attempts: fail.attempts,
        state: fail.state,
      });
    }
  }

  return {
    ok: true,
    drained: results.length,
    sent: results.filter((r) => r.sent).length,
    stats: outboxStats(config.state_dir),
    results,
  };
}

function recheckOutboundPreconditions(config, payload, now) {
  if (!config.send_enabled) {
    return { ok: false, rule_id: "gate.send_disabled", reason: "SEND_ENABLED=false at drain" };
  }
  const grant = evaluateUsageGrant(config.usage_grant, {
    now,
    requestedInstanceId: config.agent_id || "agent-jhn",
    requireSend: true,
  });
  if (!grant.ok) {
    return { ok: false, rule_id: grant.rule_id, reason: grant.reason };
  }
  const toJid = String(payload.to_jid || "");
  const selfJid = bareJid(config.allowed_self_jid || "");
  if (!selfJid) {
    return { ok: false, rule_id: "gate.third_party", reason: "allowed self JID missing" };
  }
  // Allow PN bare match, same phone digits, or remembered self LID peer.
  const preferred = resolveSelfSendJid(config);
  const toBare = bareJid(toJid);
  const okTarget =
    toBare === selfJid ||
    toJid === preferred ||
    toBare === bareJid(preferred) ||
    (toJid.includes("@lid") && preferred && preferred.includes("@lid"));
  if (!okTarget) {
    return { ok: false, rule_id: "gate.third_party", reason: "to_jid is not allowed self JID/peer" };
  }
  if (!outboundDisclosureOk(payload.text, config, { audience: AUDIENCE.SELF })) {
    return {
      ok: false,
      rule_id: "gate.missing_self_identification",
      reason: "payload text missing Agent JHN identification",
    };
  }
  return { ok: true };
}

function appendSentLedger(config, row) {
  const p = resolveSentLedgerPath(config);
  fs.appendFileSync(p, `${JSON.stringify(row)}\n`, "utf8");
}

function createPlaceholderSha(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}
