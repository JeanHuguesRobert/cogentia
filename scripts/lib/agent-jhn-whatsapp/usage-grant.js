/**
 * Usage grant validation — mediated capacity, not account ownership transfer.
 * Secrets never leave the transport layer; grants only authorize usage.
 */

import {
  BENEFICIARY_INSTANCE_ID,
  DEFAULT_GRANT_ID,
  PERM_SEND_GROUP_WHEN_POLICY_ALLOWS,
} from "./constants.js";

/**
 * @param {object} grant
 * @param {object} [options]
 * @param {string} [options.now] ISO timestamp
 * @param {string} [options.requestedInstanceId]
 * @param {string} [options.requiredScope]
 * @returns {{ ok: boolean, rule_id: string, reason: string }}
 */
export function evaluateUsageGrant(grant, options = {}) {
  if (!grant || typeof grant !== "object") {
    return {
      ok: false,
      rule_id: "grant.missing",
      reason: "usage_grant absent",
    };
  }

  if (!grant.grant_id) {
    return {
      ok: false,
      rule_id: "grant.missing_id",
      reason: "usage_grant.grant_id required",
    };
  }

  if (grant.revoked === true) {
    return {
      ok: false,
      rule_id: "grant.revoked",
      reason: "usage_grant revoked; immediate_send_stop",
    };
  }

  if (grant.expires_at) {
    const now = options.now ? new Date(options.now) : new Date();
    const exp = new Date(grant.expires_at);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() <= now.getTime()) {
      return {
        ok: false,
        rule_id: "grant.expired",
        reason: `usage_grant expired at ${grant.expires_at}`,
      };
    }
  }

  const requested =
    options.requestedInstanceId || BENEFICIARY_INSTANCE_ID;
  if (grant.beneficiary_instance_id !== requested) {
    return {
      ok: false,
      rule_id: "grant.instance_mismatch",
      reason: `beneficiary_instance_id ${grant.beneficiary_instance_id} !== ${requested}`,
    };
  }

  // MVP only accepts agent-jhn; refuse any other instance even with same phone.
  if (grant.beneficiary_instance_id !== BENEFICIARY_INSTANCE_ID) {
    return {
      ok: false,
      rule_id: "grant.instance_not_mvp",
      reason: `only ${BENEFICIARY_INSTANCE_ID} is allowed in MVP`,
    };
  }

  // self_only = no third-party DMs. self_and_groups = same, plus policy-gated groups.
  const scope = grant.conversation_scope;
  if (scope !== "self_only" && scope !== "self_and_groups") {
    return {
      ok: false,
      rule_id: "grant.scope",
      reason: `conversation_scope ${scope} out of MVP self_only / self_and_groups`,
    };
  }

  const requiredScope = options.requiredScope || "self_only";
  const scopeCovers =
    grant.conversation_scope === requiredScope ||
    (requiredScope === "self_only" &&
      (grant.conversation_scope === "self_only" ||
        grant.conversation_scope === "self_and_groups")) ||
    (requiredScope === "self_and_groups" &&
      grant.conversation_scope === "self_and_groups");
  if (!scopeCovers) {
    return {
      ok: false,
      rule_id: "grant.scope_mismatch",
      reason: `grant scope ${grant.conversation_scope} does not cover ${requiredScope}`,
    };
  }

  if (grant.transferable === true) {
    return {
      ok: false,
      rule_id: "grant.not_transferable",
      reason: "sub-delegation / transferable grants are forbidden",
    };
  }

  const perms = Array.isArray(grant.permissions) ? grant.permissions : [];
  if (options.requireSend && !perms.includes("send_when_locally_enabled")) {
    return {
      ok: false,
      rule_id: "grant.no_send_permission",
      reason: "send_when_locally_enabled not in grant.permissions",
    };
  }

  if (options.requireGroupSend) {
    const groupOk =
      perms.includes(PERM_SEND_GROUP_WHEN_POLICY_ALLOWS) ||
      grant.conversation_scope === "self_and_groups";
    if (!groupOk) {
      return {
        ok: false,
        rule_id: "grant.no_group_send_permission",
        reason: `${PERM_SEND_GROUP_WHEN_POLICY_ALLOWS} not in grant.permissions`,
      };
    }
  }

  if (options.requireSend && grant.grant_id !== DEFAULT_GRANT_ID && options.strictDefaultGrant) {
    // Allow alternate grant ids only if still self_only and non-transferable (already checked).
  }

  return {
    ok: true,
    rule_id: "grant.ok",
    reason: "usage_grant valid",
  };
}

/**
 * Build the canonical experimental grant object (documentation / default).
 */
export function defaultUsageGrant() {
  return {
    grant_id: DEFAULT_GRANT_ID,
    beneficiary_instance_id: BENEFICIARY_INSTANCE_ID,
    beneficiary_principal_id: "jean-hugues-noel-robert",
    purpose: "experimental-digital-twin-self-chat",
    conversation_scope: "self_only",
    permissions: ["receive", "draft", "send_when_locally_enabled"],
    transferable: false,
    revocable: true,
    revocation_effect: "immediate_send_stop",
    revoked: false,
    expires_at: null,
  };
}
