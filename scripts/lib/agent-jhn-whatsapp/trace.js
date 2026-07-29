/**
 * Private local WhatsApp artifacts / traces.
 * Never commits raw private content to git; stores under state_dir only.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  ARTIFACT_TYPES,
  SCHEMA_VERSION,
} from "./constants.js";
import { resolveTracesDir } from "./config.js";
import { SECRET_KEY_PATTERN } from "./constants.js";

/**
 * Build a whatsapp artifact record (schema cogentia.whatsapp-artifact.v1).
 */
export function buildWhatsappArtifact(input = {}) {
  const now = input.observed_at || new Date().toISOString();
  const rawSha =
    input.raw_message_sha256 ||
    createHash("sha256").update(String(input.raw_body || ""), "utf8").digest("hex");
  const occurrenceId =
    input.occurrence_id ||
    `urn:cogentia:whatsapp-occurrence:${randomUUID()}`;

  const artifact = {
    schema_version: SCHEMA_VERSION,
    occurrence_id: occurrenceId,
    artifact_type: input.artifact_type || ARTIFACT_TYPES.RECEIVED,
    platform_message_id: input.platform_message_id || null,
    observed_at: now,
    direction: input.direction || "inbound",
    agent_id: input.agent_id || "agent-jhn",
    visible_agent_id: input.visible_agent_id || "agent-jhn-experimental",
    mandate_id: input.mandate_id || "jhn-experimental-non-commitment-v1",
    action_request_id: input.action_request_id || null,
    account_custodian_id: input.account_custodian_id || "jean-hugues-noel-robert",
    beneficiary_instance_id: input.beneficiary_instance_id || "agent-jhn",
    principal_id: input.principal_id || "jean-hugues-noel-robert",
    persona_id: input.persona_id === undefined ? null : input.persona_id,
    conversation_kind: input.conversation_kind || "direct",
    conversation_id: input.conversation_id || null,
    group_id: input.group_id || null,
    group_member_id: input.group_member_id || null,
    visibility: input.visibility || "raw_private",
    integrity: {
      algorithm: "sha256",
      raw_message_sha256: rawSha,
      raw_message_ref: input.raw_message_ref || `private-local-reference:sha256:${rawSha}`,
      raw_message_size: input.raw_message_size ?? undefined,
    },
    transport: {
      stage: "whatsapp_web",
      status: input.transport_status || "received",
    },
    policy: input.policy
      ? {
          decision: input.policy.decision,
          rule_id: input.policy.rule_id,
          reason: input.policy.reason,
        }
      : undefined,
    usage_grant: input.usage_grant
      ? {
          grant_id: input.usage_grant.grant_id,
          beneficiary_instance_id: input.usage_grant.beneficiary_instance_id,
          conversation_scope: input.usage_grant.conversation_scope,
          revoked: Boolean(input.usage_grant.revoked),
        }
      : undefined,
    notes: input.notes || undefined,
  };

  // Drop undefined nested size
  if (artifact.integrity.raw_message_size === undefined) {
    delete artifact.integrity.raw_message_size;
  }
  if (!artifact.policy) delete artifact.policy;
  if (!artifact.usage_grant) delete artifact.usage_grant;
  if (!artifact.notes) delete artifact.notes;
  if (!artifact.action_request_id) artifact.action_request_id = null;
  if (!artifact.platform_message_id) artifact.platform_message_id = null;

  return artifact;
}

/**
 * Lightweight schema validation without external AJV dependency.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateWhatsappArtifact(artifact) {
  const errors = [];
  if (!artifact || typeof artifact !== "object") {
    return { ok: false, errors: ["artifact must be object"] };
  }
  if (artifact.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }
  if (!/^urn:cogentia:whatsapp-occurrence:[A-Za-z0-9._:-]+$/.test(String(artifact.occurrence_id || ""))) {
    errors.push("occurrence_id pattern invalid");
  }
  const types = Object.values(ARTIFACT_TYPES);
  if (!types.includes(artifact.artifact_type)) {
    errors.push(`artifact_type invalid: ${artifact.artifact_type}`);
  }
  if (!["inbound", "outbound", "internal"].includes(artifact.direction)) {
    errors.push("direction invalid");
  }
  if (!["raw_private", "private", "restricted", "do_not_publish"].includes(artifact.visibility)) {
    errors.push("visibility invalid");
  }
  if (!artifact.integrity || artifact.integrity.algorithm !== "sha256") {
    errors.push("integrity.algorithm must be sha256");
  }
  if (!/^[a-f0-9]{64}$/.test(String(artifact.integrity?.raw_message_sha256 || ""))) {
    errors.push("integrity.raw_message_sha256 must be 64 hex chars");
  }
  if (!artifact.integrity?.raw_message_ref) {
    errors.push("integrity.raw_message_ref required");
  }
  if (artifact.transport?.stage !== "whatsapp_web") {
    errors.push("transport.stage must be whatsapp_web");
  }
  const statuses = ["received", "queued", "sent", "delivered", "failed", "deferred"];
  if (!statuses.includes(artifact.transport?.status)) {
    errors.push("transport.status invalid");
  }
  if (artifact.policy) {
    const decisions = ["send", "draft_only", "hold_for_human", "reject"];
    if (!decisions.includes(artifact.policy.decision)) {
      errors.push("policy.decision invalid");
    }
    if (!artifact.policy.rule_id) errors.push("policy.rule_id required when policy present");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Append artifact as NDJSON line under state traces dir.
 */
export function appendTrace(config, artifact) {
  const dir = resolveTracesDir(config);
  fs.mkdirSync(dir, { recursive: true });
  const day = String(artifact.observed_at || new Date().toISOString()).slice(0, 10);
  const filePath = path.join(dir, `whatsapp-${day}.ndjson`);
  const line = `${JSON.stringify(artifact)}\n`;
  fs.appendFileSync(filePath, line, "utf8");
  return { path: filePath, occurrence_id: artifact.occurrence_id };
}

/**
 * Store raw private payload separately (local only). Returns ref only.
 */
export function storeRawPrivate(config, rawBody, sha256) {
  const root = path.join(path.resolve(config.state_dir), "raw-private");
  fs.mkdirSync(root, { recursive: true });
  const name = `${sha256}.json`;
  const filePath = path.join(root, name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody), "utf8");
  }
  return `private-local-reference:sha256:${sha256}`;
}

/**
 * Redact diagnostics for status output — strip secret-looking keys.
 */
export function redactForDiagnostics(obj, depth = 0) {
  if (depth > 6) return "[truncated]";
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map((x) => redactForDiagnostics(x, depth + 1));
  if (typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_PATTERN.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 40)}…[truncated ${v.length} chars]`;
      continue;
    }
    out[k] = redactForDiagnostics(v, depth + 1);
  }
  return out;
}

/**
 * Assert a diagnostics object contains no obvious secrets.
 */
export function assertNoSecretsInDiagnostics(obj) {
  const json = JSON.stringify(obj);
  const issues = [];
  // QR payloads are long base64-ish; session keys patterns
  if (/"qr"\s*:\s*"[^"]{20,}"/i.test(json)) issues.push("qr_payload_present");
  if (/"privateKey"\s*:\s*"/i.test(json)) issues.push("privateKey_present");
  if (/"noiseKey"/i.test(json)) issues.push("noiseKey_present");
  if (/"creds"\s*:\s*\{/i.test(json) && !/"creds"\s*:\s*"\[redacted\]"/.test(json)) {
    // allow redacted
    if (!json.includes("[redacted]")) issues.push("creds_object_present");
  }
  return { ok: issues.length === 0, issues };
}
