/**
 * Public surface for Agent JHN WhatsApp MVP modules.
 * Agents must not call transport.sendText; only outbound-gate drain may.
 */

export {
  loadConfig,
  validateConfig,
  publicConfigSnapshot,
  ensureStateDirs,
  resolveAuthDir,
  resolveTracesDir,
} from "./config.js";

export {
  PRINCIPAL_ID,
  ACCOUNT_CUSTODIAN_ID,
  VISIBLE_AGENT_ID,
  AGENT_ID,
  MANDATE_ID,
  DEFAULT_NOTICE_URL,
  DECISIONS,
  GROUP_POLICY_MODES,
  CONVERSATION_KINDS,
  ARTIFACT_TYPES,
  SCHEMA_VERSION,
} from "./constants.js";

export { normalizeInboundEvent, bareJid, isGroupJid } from "./inbound-normalizer.js";
export {
  evaluatePolicy,
  resolveGroupPolicyMode,
  listRepresentableGroupPolicyModes,
  isEngagingText,
  draftIncludesNotice,
} from "./policy.js";
export {
  AUDIENCE,
  formatOutboundText,
  resolveDisclosureLocale,
  outboundDisclosureOk,
  draftIncludesSelfIdentification,
  draftIncludesThirdPartyDisclosure,
} from "./disclosure.js";
export { evaluateUsageGrant, defaultUsageGrant } from "./usage-grant.js";
export { buildDeterministicDraft } from "./draft.js";
export {
  buildWhatsappArtifact,
  validateWhatsappArtifact,
  appendTrace,
  redactForDiagnostics,
  assertNoSecretsInDiagnostics,
} from "./trace.js";
export {
  requestOutboundSend,
  drainWhatsappOutbox,
  buildActionRequestId,
  isActionAlreadyHandled,
} from "./outbound-gate.js";
export {
  createMockTransport,
  createBaileysTransport,
  createTransport,
} from "./baileys-transport.js";
export { handleInbound } from "./pipeline.js";
export {
  getEmergencyContacts,
  notifyHumanAttention,
} from "./emergency-notification.js";
export {
  loadContactsStore,
  saveContactsStore,
  findContactByPhoneOrJid,
  upsertContact,
  importGoogleContactsJson,
  syncGoogleContactsMcpResult,
  TRUST_TIERS,
} from "./contacts-manager.js";

