/**
 * Local configuration loader for Agent JHN WhatsApp MVP.
 * Never prints secrets, session material, or private message bodies.
 */

import fs from "node:fs";
import path from "node:path";
import {
  ACCOUNT_CUSTODIAN_ID,
  AGENT_ID,
  BENEFICIARY_INSTANCE_ID,
  BENEFICIARY_PRINCIPAL_ID,
  DEFAULT_GRANT_ID,
  DEFAULT_NOTICE_URL,
  DEFAULT_EMERGENCY_EMAIL,
  DEFAULT_EMERGENCY_PHONE,
  DIRECT_CONTACT_EMAIL,
  GROUP_POLICY_MODES,
  MANDATE_ID,
  MODE_SELF_CHAT_ONLY,
  PRINCIPAL_ID,
  VISIBLE_AGENT_ID,
} from "./constants.js";
import { getEmergencyContacts } from "./emergency-notification.js";

function envBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return defaultValue;
}

function envString(value, defaultValue = "") {
  if (value === undefined || value === null) return defaultValue;
  return String(value).trim();
}

/**
 * Parse optional group policy map from JSON env.
 * Format: {"whatsapp-group:xyz":"observe",...}
 * Modes other than disabled require explicit local enable flag.
 */
function parseGroupPolicies(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const mode = String(v || GROUP_POLICY_MODES.DISABLED).trim();
      if (!Object.values(GROUP_POLICY_MODES).includes(mode)) continue;
      out[String(k).trim()] = mode;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Load and validate configuration from env (and optional overrides).
 * @param {NodeJS.ProcessEnv|Record<string,string>} [env]
 * @param {object} [overrides]
 */
export function loadConfig(env = process.env, overrides = {}) {
  const stateDir = envString(
    overrides.stateDir ?? env.AGENT_JHN_WHATSAPP_STATE_DIR,
    "",
  );
  const allowedSelfJid = envString(
    overrides.allowedSelfJid ?? env.AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID,
    "",
  );
  const noticeUrl = envString(
    overrides.noticeUrl ?? env.AGENT_JHN_WHATSAPP_NOTICE_URL,
    DEFAULT_NOTICE_URL,
  );
  const mode = envString(
    overrides.mode ?? env.AGENT_JHN_WHATSAPP_MODE,
    MODE_SELF_CHAT_ONLY,
  );
  const sendEnabled = envBool(
    overrides.sendEnabled ?? env.AGENT_JHN_WHATSAPP_SEND_ENABLED ?? env.AGENT_JHN_WHATSAPP_SELF_READ_WRITE,
    true,
  );
  const dryRun = envBool(overrides.dryRun ?? env.AGENT_JHN_WHATSAPP_DRY_RUN, false);
  const groupsExplicitlyEnabled = envBool(
    overrides.groupsExplicitlyEnabled ?? env.AGENT_JHN_WHATSAPP_GROUPS_ENABLED,
    false,
  );
  const groupPolicies = parseGroupPolicies(
    overrides.groupPoliciesJson ?? env.AGENT_JHN_WHATSAPP_GROUP_POLICIES_JSON,
  );
  const personaIdRaw = envString(
    overrides.personaId ?? env.AGENT_JHN_WHATSAPP_PERSONA_ID,
    "",
  );
  const personaId = personaIdRaw === "" || personaIdRaw === "null" ? null : personaIdRaw;

  const grant = {
    grant_id: envString(
      overrides.grantId ?? env.AGENT_JHN_WHATSAPP_USAGE_GRANT_ID,
      DEFAULT_GRANT_ID,
    ),
    beneficiary_instance_id: envString(
      overrides.beneficiaryInstanceId ?? env.AGENT_JHN_WHATSAPP_BENEFICIARY_INSTANCE_ID,
      BENEFICIARY_INSTANCE_ID,
    ),
    beneficiary_principal_id: envString(
      overrides.beneficiaryPrincipalId ?? env.AGENT_JHN_WHATSAPP_BENEFICIARY_PRINCIPAL_ID,
      BENEFICIARY_PRINCIPAL_ID,
    ),
    purpose: envString(
      overrides.grantPurpose ?? env.AGENT_JHN_WHATSAPP_GRANT_PURPOSE,
      "experimental-digital-twin-self-chat",
    ),
    conversation_scope: envString(
      overrides.grantScope ?? env.AGENT_JHN_WHATSAPP_GRANT_SCOPE,
      "self_only",
    ),
    permissions: ["receive", "draft", "send_when_locally_enabled"],
    transferable: false,
    revocable: true,
    revocation_effect: "immediate_send_stop",
    revoked: envBool(overrides.grantRevoked ?? env.AGENT_JHN_WHATSAPP_GRANT_REVOKED, false),
    expires_at: envString(
      overrides.grantExpiresAt ?? env.AGENT_JHN_WHATSAPP_GRANT_EXPIRES_AT,
      "",
    ) || null,
  };

  const config = {
    state_dir: stateDir,
    allowed_self_jid: allowedSelfJid,
    notice_url: noticeUrl,
    contact_email: envString(overrides.contactEmail ?? env.AGENT_JHN_WHATSAPP_CONTACT_EMAIL, DIRECT_CONTACT_EMAIL),
    mode,
    send_enabled: sendEnabled,
    dry_run: dryRun,
    groups_explicitly_enabled: groupsExplicitlyEnabled,
    group_policies: groupPolicies,
    group_runtime_mode: groupsExplicitlyEnabled ? "configured" : "disabled_for_first_real_test",
    media: "forbidden",
    links_and_attachments: "ignored_or_escalated",
    third_party_send: "forbidden",
    external_side_effects: "forbidden",
    allowed_contact_scope: "self_only",
    principal_id: PRINCIPAL_ID,
    account_custodian_id: ACCOUNT_CUSTODIAN_ID,
    account_usage_mode: "non_exclusive",
    custodian_priority: "highest",
    credential_access: "mediated_only",
    agent_id: AGENT_ID,
    visible_agent_id: VISIBLE_AGENT_ID,
    mandate_id: MANDATE_ID,
    persona_id: personaId,
    usage_grant: grant,
    emergency_contacts: getEmergencyContacts(env),
    auth_dir_name: "baileys-auth",
    traces_dir_name: "traces",
    sent_ledger_name: "sent-ledger.jsonl",
  };

  return config;
}

/**
 * Structural validation. Returns { ok, errors[], warnings[] }.
 * Does not require a real WhatsApp session.
 */
export function validateConfig(config, options = {}) {
  const errors = [];
  const warnings = [];
  const requireStateDir = options.requireStateDir !== false;
  const requireSelfJid = options.requireSelfJid === true;

  if (requireStateDir) {
    if (!config.state_dir) {
      errors.push("AGENT_JHN_WHATSAPP_STATE_DIR is required");
    } else if (!path.isAbsolute(config.state_dir)) {
      errors.push("AGENT_JHN_WHATSAPP_STATE_DIR must be an absolute path");
    }
  }

  if (config.mode !== MODE_SELF_CHAT_ONLY) {
    errors.push(`mode must be ${MODE_SELF_CHAT_ONLY}; got ${config.mode}`);
  }

  if (config.persona_id !== null && config.persona_id !== undefined) {
    errors.push("persona_id must be null for this MVP");
  }

  if (requireSelfJid && !config.allowed_self_jid) {
    errors.push("AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID is required for send paths");
  }

  if (config.send_enabled && !config.allowed_self_jid) {
    errors.push("send_enabled requires AGENT_JHN_WHATSAPP_ALLOWED_SELF_JID");
  }

  if (!config.notice_url || !String(config.notice_url).startsWith("https://")) {
    errors.push("notice_url must be an https URL");
  }

  if (config.usage_grant?.conversation_scope !== "self_only") {
    errors.push("usage_grant.conversation_scope must be self_only for MVP");
  }

  if (config.usage_grant?.transferable === true) {
    errors.push("usage_grant.transferable must be false");
  }

  if (config.send_enabled) {
    warnings.push("SEND_ENABLED=true: material send requires human presence and a real session");
  }

  if (config.groups_explicitly_enabled) {
    warnings.push("GROUPS_ENABLED=true is outside first real-test scope; group send still blocked in MVP policy");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Safe diagnostic snapshot — never includes session secrets or raw messages.
 */
export function publicConfigSnapshot(config) {
  return {
    state_dir_configured: Boolean(config.state_dir),
    state_dir_exists: config.state_dir ? fs.existsSync(config.state_dir) : false,
    allowed_self_jid_configured: Boolean(config.allowed_self_jid),
    allowed_self_jid_suffix: config.allowed_self_jid
      ? `…${String(config.allowed_self_jid).slice(-8)}`
      : null,
    notice_url: config.notice_url,
    mode: config.mode,
    send_enabled: Boolean(config.send_enabled),
    dry_run: Boolean(config.dry_run),
    groups_explicitly_enabled: Boolean(config.groups_explicitly_enabled),
    group_runtime_mode: config.group_runtime_mode,
    group_policy_count: Object.keys(config.group_policies || {}).length,
    media: config.media,
    principal_id: config.principal_id,
    account_custodian_id: config.account_custodian_id,
    account_usage_mode: config.account_usage_mode,
    agent_id: config.agent_id,
    visible_agent_id: config.visible_agent_id,
    mandate_id: config.mandate_id,
    persona_id: config.persona_id,
    usage_grant: {
      grant_id: config.usage_grant?.grant_id,
      beneficiary_instance_id: config.usage_grant?.beneficiary_instance_id,
      conversation_scope: config.usage_grant?.conversation_scope,
      revoked: Boolean(config.usage_grant?.revoked),
      expires_at: config.usage_grant?.expires_at,
      transferable: config.usage_grant?.transferable,
      permissions: config.usage_grant?.permissions,
    },
    credential_access: config.credential_access,
  };
}

export function resolveAuthDir(config) {
  return path.join(path.resolve(config.state_dir), config.auth_dir_name || "baileys-auth");
}

export function resolveTracesDir(config) {
  return path.join(path.resolve(config.state_dir), config.traces_dir_name || "traces");
}

export function resolveSentLedgerPath(config) {
  return path.join(path.resolve(config.state_dir), config.sent_ledger_name || "sent-ledger.jsonl");
}

export function ensureStateDirs(config) {
  if (!config.state_dir) throw new Error("state_dir required");
  const root = path.resolve(config.state_dir);
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(resolveAuthDir(config), { recursive: true });
  fs.mkdirSync(resolveTracesDir(config), { recursive: true });
  fs.mkdirSync(path.join(root, "outbox", "pending"), { recursive: true });
  fs.mkdirSync(path.join(root, "outbox", "failed"), { recursive: true });
  fs.mkdirSync(path.join(root, "raw-private"), { recursive: true });
  return root;
}
