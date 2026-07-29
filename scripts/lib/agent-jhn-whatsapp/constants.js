/**
 * Fixed identity and mandate constants for Agent JHN WhatsApp MVP.
 * These are not secrets; they are governance identifiers.
 */

export const PRINCIPAL_ID = "jean-hugues-noel-robert";
export const ACCOUNT_CUSTODIAN_ID = "jean-hugues-noel-robert";
export const VISIBLE_AGENT_ID = "agent-jhn-experimental";
export const AGENT_ID = "agent-jhn";
export const MANDATE_ID = "jhn-experimental-non-commitment-v1";
export const DEFAULT_GRANT_ID = "jhn-whatsapp-self-chat-experimental-v1";
export const BENEFICIARY_INSTANCE_ID = "agent-jhn";
export const BENEFICIARY_PRINCIPAL_ID = "jean-hugues-noel-robert";

export const DEFAULT_NOTICE_URL =
  "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/agent-jhn-experimental-notice.md";

export const SCHEMA_VERSION = "cogentia.whatsapp-artifact.v1";
export const MODE_SELF_CHAT_ONLY = "self_chat_only";

export const DECISIONS = Object.freeze({
  SEND: "send",
  DRAFT_ONLY: "draft_only",
  HOLD_FOR_HUMAN: "hold_for_human",
  REJECT: "reject",
});

export const GROUP_POLICY_MODES = Object.freeze({
  DISABLED: "disabled",
  OBSERVE: "observe",
  DRAFT_ON_MENTION: "draft_on_mention",
  APPROVAL_REQUIRED: "approval_required",
  MANDATED_AUTONOMY: "mandated_autonomy",
});

export const CONVERSATION_KINDS = Object.freeze({
  DIRECT: "direct",
  GROUP: "group",
});

export const ARTIFACT_TYPES = Object.freeze({
  RECEIVED: "whatsapp_received",
  SEND_REQUESTED: "whatsapp_send_requested",
  SENT: "whatsapp_sent",
  DELIVERY_FAILED: "whatsapp_delivery_failed",
});

/** Phrases that make an intent "engaging" (must never auto-send). */
export const ENGAGING_PATTERNS = [
  /\bje (t['']?|vous )?engage\b/i,
  /\bje (te|vous) promets?\b/i,
  /\bje (signe|accepte|refuse|valide|autorise)\b/i,
  /\bau nom de\b/i,
  /\bmandat de représentation\b/i,
  /\bcontrat\b/i,
  /\bengagem?ent (juridique|contractuel)\b/i,
  /\bje décide\b/i,
  /\bnégocie\b/i,
];

/** Keys that must never appear in diagnostics (exact or obvious secret suffixes). */
export const SECRET_KEY_PATTERN =
  /^(auth|authstate|creds|secret|token|password|qr|pairing|privatekey|private_key|private-key|recovery|noisekey|signedprekey|advsecretkey|me|account|signalidentities|appstate|session)$/i;
