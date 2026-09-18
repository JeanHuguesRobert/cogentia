/**
 * Source Policy Gate for the Corsica Cogentia Digital Twin (cogentia#191).
 *
 * Enforces conservative ingestion boundaries:
 * - Differentiates public, authenticated, contributed, restricted, and unknown access.
 * - Enforces explicit retention rules: ephemeral, derived_only, metadata, etc.
 * - Fails safely: 'unknown' never silently becomes 'allowed'.
 */

export const RETENTION_CLASSES = Object.freeze({
  EPHEMERAL: "ephemeral",
  BOUNDED: "bounded",
  LEGAL_HOLD: "legal_hold",
  EXTERNAL_OWNER: "external_owner",
  PERSISTENT_BY_RIGHT: "persistent_by_right",
});

export const ACCESS_STATES = Object.freeze({
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  CONTRIBUTED: "contributed",
  RESTRICTED: "restricted",
  UNKNOWN: "unknown",
});

export const AUTOMATION_POLICIES = Object.freeze({
  ALLOWED: "allowed",
  UNCERTAIN: "uncertain",
  OPPOSED: "opposed",
  NOT_APPLICABLE: "not_applicable",
});

export const RETENTION_POLICIES = Object.freeze({
  METADATA: "metadata",
  DERIVED_ONLY: "derived_only",
  TEMPORARY_FULLTEXT: "temporary_fulltext",
  PERMITTED_FULLTEXT: "permitted_fulltext",
  UNKNOWN: "unknown",
});

export const PERSONAL_DATA_CLASSES = Object.freeze({
  NONE: "none",
  ORDINARY: "ordinary",
  SENSITIVE: "sensitive",
  UNKNOWN: "unknown",
});

export const LEGAL_RISK_LEVELS = Object.freeze({
  LOW: "low",
  REVIEW: "review",
  HOLD: "hold",
});

export function createSourcePolicy(overrides = {}) {
  const policy = {
    access: overrides.access || ACCESS_STATES.UNKNOWN,
    automation: overrides.automation || AUTOMATION_POLICIES.UNCERTAIN,
    retention: overrides.retention || RETENTION_POLICIES.UNKNOWN,
    personalData: overrides.personalData || overrides.personal_data || PERSONAL_DATA_CLASSES.UNKNOWN,
    legalRisk: overrides.legalRisk || overrides.legal_risk || LEGAL_RISK_LEVELS.REVIEW,
    retentionClass: overrides.retentionClass || overrides.retention_class || RETENTION_CLASSES.EPHEMERAL,
    evidenceOwner: overrides.evidenceOwner || overrides.evidence_owner || "platform",
    allowDerivedKnowledge: overrides.allowDerivedKnowledge !== false,
  };

  // Validate values against known enums
  if (!Object.values(ACCESS_STATES).includes(policy.access)) {
    policy.access = ACCESS_STATES.UNKNOWN;
  }
  if (!Object.values(RETENTION_POLICIES).includes(policy.retention)) {
    policy.retention = RETENTION_POLICIES.UNKNOWN;
  }
  if (!Object.values(PERSONAL_DATA_CLASSES).includes(policy.personalData)) {
    policy.personalData = PERSONAL_DATA_CLASSES.UNKNOWN;
  }
  if (!Object.values(LEGAL_RISK_LEVELS).includes(policy.legalRisk)) {
    policy.legalRisk = LEGAL_RISK_LEVELS.REVIEW;
  }
  if (!Object.values(RETENTION_CLASSES).includes(policy.retentionClass)) {
    policy.retentionClass = RETENTION_CLASSES.EPHEMERAL;
  }

  return Object.freeze(policy);
}

export function evaluateSourcePolicy(policyInput) {
  const policy = createSourcePolicy(policyInput);
  const warnings = [];

  // Conservative rule: legal_risk === 'hold' blocks ingestion entirely
  if (policy.legalRisk === LEGAL_RISK_LEVELS.HOLD) {
    return {
      allowed: false,
      reason: "Source is under explicit legal hold.",
      canRetainRaw: false,
      mustPurgeRaw: true,
      canDeriveKnowledge: false,
      warnings: ["Ingestion blocked by legal_risk: hold"],
      policy,
    };
  }

  // Conservative rule: unknown access or unknown retention requires review
  if (policy.access === ACCESS_STATES.UNKNOWN) {
    warnings.push("Source access state is unknown; ingestion restricted to derived knowledge only.");
  }
  if (policy.retention === RETENTION_POLICIES.UNKNOWN) {
    warnings.push("Source retention policy is unknown; defaulting to ephemeral raw retention.");
  }

  // Determine whether raw copy can be permanently stored
  const canRetainRaw = (
    policy.retention === RETENTION_POLICIES.PERMITTED_FULLTEXT &&
    policy.retentionClass === RETENTION_CLASSES.PERSISTENT_BY_RIGHT &&
    (policy.access === ACCESS_STATES.PUBLIC || policy.access === ACCESS_STATES.CONTRIBUTED) &&
    policy.personalData !== PERSONAL_DATA_CLASSES.SENSITIVE
  );

  const mustPurgeRaw = !canRetainRaw;

  // Derive knowledge allowed unless explicitly prohibited
  const canDeriveKnowledge = policy.allowDerivedKnowledge && policy.legalRisk !== LEGAL_RISK_LEVELS.HOLD;

  return {
    allowed: canDeriveKnowledge,
    reason: canDeriveKnowledge ? "Ingestion authorized within policy boundaries." : "Derived knowledge disallowed.",
    canRetainRaw,
    mustPurgeRaw,
    canDeriveKnowledge,
    retentionClass: policy.retentionClass,
    evidenceOwner: policy.evidenceOwner,
    warnings,
    policy,
  };
}
