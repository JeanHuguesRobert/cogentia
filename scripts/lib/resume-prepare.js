// Read-only external Issue resume preparation. Registration is evidence, not authority.
import fs from "node:fs";

export const RESUME_REQUIRED_CAPABILITIES = Object.freeze(["agent.handler", "cop.capability-discovery"]);

export function prepareExternalResume({ issue, handlersFile, requiredCapabilities = RESUME_REQUIRED_CAPABILITIES }) {
  const base = {
    schema: "cogentia.external-resume-prepare/v1",
    phase: "PREPARE",
    issue: { repository: issue.repository, number: issue.number, url: issue.url },
    required_capabilities: [...requiredCapabilities],
    selected_handler: null,
    execution_authorized: false,
    execution_receipt: null,
    effects: { handler_spawned: false, command_executed: false, git_commit: false, github_mutation: false },
  };
  if (!handlersFile) return { ...base, status: "WAITING_CAPABILITY_DISCOVERY", blockers: ["resolver_manifest_not_supplied"] };
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(handlersFile, "utf8"));
  } catch (error) {
    return { ...base, status: "BLOCKED", blockers: ["resolver_manifest_unreadable_or_invalid"], detail: error.code || "invalid_json" };
  }
  if (manifest?.schema !== "cogentia.resolver-manifest/v1" || !Array.isArray(manifest.handlers)) {
    return { ...base, status: "BLOCKED", blockers: ["unsupported_resolver_manifest_schema"] };
  }
  const eligible = manifest.handlers.filter(h =>
    h && typeof h.id === "string" && h.id.trim()
    && h.available === true
    && Array.isArray(h.capabilities)
    && requiredCapabilities.every(cap => h.capabilities.includes(cap))
  );
  if (!eligible.length) return { ...base, status: "WAITING_HANDLER", blockers: ["no_available_capability_match"] };
  if (eligible.length !== 1) return { ...base, status: "WAITING_HANDLER_SELECTION", blockers: ["ambiguous_matching_handlers"], candidate_ids: eligible.map(h => h.id) };
  const handler = eligible[0];
  // A local manifest is only a declaration. No endpoint probe has happened.
  const evidenceLevel = handler.evidence?.level === "configured" ? "configured" : "declared";
  // Manifest declarations cannot mint a mandate. Authority must be checked
  // independently at the eventual provider/adapter effect boundary.
  return {
    ...base,
    status: "WAITING_MANDATE_VERIFICATION",
    selected_handler: { id: handler.id, capabilities: requiredCapabilities, evidence: evidenceLevel },
    reachability: "not_probed",
    readiness: "not_probed",
    blockers: ["handler_reachability_not_verified", "mandate_not_verified", "execution_adapter_not_connected", "provider_effect_fence_not_verified"],
    next_action: "Resolve mandate and claim/fencing through an authorized COP adapter before any execution",
  };
}

/**
 * Read-only Magistral service identity discovery. Only loopback HTTP is accepted:
 * neither a GitHub Issue nor a resolver manifest may direct this probe to an
 * arbitrary network destination. The returned map is an offer, not a mandate.
 */
export async function discoverMagistralResume({ endpoint = "http://127.0.0.1:8880/service-info", fetchImpl = fetch } = {}) {
  const base = { source: "magistral.service-info", endpoint, reachability: "unverified", readiness: "not_probed", execution_authorized: false };
  let url;
  try { url = new URL(endpoint); } catch { return { ...base, status: "BLOCKED", blockers: ["invalid_discovery_endpoint"] }; }
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/service-info" || url.username || url.password || url.search || url.hash) {
    return { ...base, status: "BLOCKED", blockers: ["discovery_endpoint_must_be_loopback_service_info"] };
  }
  let response, body;
  try {
    response = await fetchImpl(url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error("http_" + response.status);
    body = await response.json();
  } catch {
    return { ...base, status: "WAITING_CAPABILITY_DISCOVERY", blockers: ["magistral_service_unreachable_or_invalid"] };
  }
  if (body?.protocol !== "cogentia.service-identity/v1" || body?.service?.id !== "magistral" || !Array.isArray(body.capabilities)) {
    return { ...base, status: "BLOCKED", blockers: ["unexpected_magistral_identity_schema"] };
  }
  const offers = body.capabilities.filter(x => x?.id === "local-codex-acp" && x.adapter === "acp_stdio");
  if (offers.length !== 1) return { ...base, reachability: "http_verified", status: "WAITING_HANDLER", blockers: ["local_codex_acp_offer_missing_or_ambiguous"] };
  return {
    ...base, status: "WAITING_HANDLER_PROBE", reachability: "http_verified",
    selected_handler: { id: "local-codex-acp", adapter: "acp_stdio", tier: offers[0].tier, evidence: "magistral_live_declaration" },
    blockers: ["acp_invocation_not_probed", "mandate_not_verified", "execution_adapter_not_connected", "provider_effect_fence_not_verified"],
  };
}

/** Consistent top-level projection for all PREPARE adapters. */
export function projectResumeRouting(plan, source = "magistral") {
  return {
    capability_discovery: source === "magistral"
      ? plan.reachability
      : (source === "manifest" ? "manifest_declaration" : "not_connected"),
    selected_handler: plan.selected_handler || null,
    required_next: plan.blockers?.join(", ") || "Further verification required",
  };
}

/**
 * A capability probe receipt is never an execution receipt or mandate.
 * A successful HTTP response alone is insufficient: content must match.
 */
export function createCapabilityProbeReceipt({ handlerId, model, httpStatus, responseText, observedAt, evidenceSource = "operator_observation" }) {
  if (typeof handlerId !== "string" || !handlerId.trim() || typeof model !== "string" || !model.trim()) throw new TypeError("handlerId and model are required");
  if (!observedAt || !Number.isFinite(Date.parse(observedAt))) throw new TypeError("observedAt must be an ISO timestamp");
  if (!["operator_observation", "local_http_probe"].includes(evidenceSource)) throw new TypeError("invalid evidenceSource");
  const passed = httpStatus === 200 && responseText === "ACP_PROBE_OK";
  return Object.freeze({
    schema: "cogentia.capability-probe-receipt/v1",
    handler_id: handlerId, model, observed_at: observedAt,
    evidence_source: evidenceSource,
    http_status: httpStatus,
    result: passed ? "PASS" : "FAIL",
    response_matched: responseText === "ACP_PROBE_OK",
    proves: passed ? ["magistral_route_invocation", "acp_text_response"] : [],
    does_not_prove: ["packet_mandate", "cop_claim", "provider_effect_fencing", "packet_execution"],
    execution_authorized: false, execution_receipt: null,
  });
}

/**
 * Advisory-only governed-effect preflight. Inputs are untrusted snapshots,
 * including claims: no local JSON object can establish provider-side fencing.
 * No true execution_authorized result is representable here.
 */
export function assessResumeEffectBoundary({ packetRef, handlerRef, mandate, claim, observedAt } = {}) {
  const blockers = [];
  if (typeof packetRef !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/[1-9][0-9]*$/.test(packetRef)) blockers.push("invalid_packet_reference");
  if (typeof handlerRef !== "string" || !handlerRef.trim()) blockers.push("handler_not_identified");
  if (mandate?.packet_ref !== packetRef || mandate?.handler_ref !== handlerRef ||
      mandate?.explicit_authority !== true || !Array.isArray(mandate?.allowed_effects)) blockers.push("mandate_not_verified");
  const now = Date.parse(observedAt);
  if (!Number.isFinite(now)) blockers.push("observation_time_not_verified");
  const claimShape = claim?.schema === "cop.packet-claim/v1" &&
    claim.packet_ref === packetRef && claim.handler_ref === handlerRef &&
    typeof claim.claim_id === "string" && claim.claim_id.length > 0 &&
    Number.isInteger(claim.epoch) && claim.epoch >= 1 &&
    claim.mode === "MUTATE" && claim.scope === "packet" &&
    Number.isFinite(Date.parse(claim.expires_at)) && Date.parse(claim.expires_at) > now;
  if (!claimShape) blockers.push("current_claim_not_verified");
  // Even a well-formed mandate/claim JSON can be forged or stale:
  // authoritative provider verification and an effect fence are indispensable.
  blockers.push("provider_effect_fence_not_verified");
  blockers.push("authoritative_claim_validation_not_connected");
  return Object.freeze({
    schema: "cogentia.resume-effect-boundary/v1",
    packet_ref: packetRef || null, handler_ref: handlerRef || null,
    phase: "PREFLIGHT", status: "BLOCKED",
    evidence: "untrusted_snapshot_advisory_only",
    blockers, execution_authorized: false, execution_receipt: null,
    effects: { handler_spawned: false, command_executed: false, git_commit: false, github_mutation: false },
  });
}

/**
 * Portable, advisory execution plan. It never runs a handler, claims a Packet,
 * or confers authority from a GitHub Issue's text.
 */
export function planGovernedResume({ issue, discovery, proposedEffects = [] }) {
  const handler = discovery?.selected_handler || null;
  const candidateReady = discovery?.status === "WAITING_HANDLER_PROBE" && discovery?.reachability === "http_verified";
  const effects = proposedEffects.map((e, index) => {
    const boundary = e?.boundary || "unknown";
    const local = boundary === "local_transactional" && e?.provider === "sqlite-governed-effect-gateway" && e?.kind === "synthetic_state_update";
    return {
      index, kind: typeof e?.kind === "string" ? e.kind : "unknown",
      provider: typeof e?.provider === "string" ? e.provider : "unknown",
      boundary,
      status: local ? "ADVISORY_ONLY" : "BLOCKED",
      reason: local ? "local_commit_requires_authoritative_claim" : "provider_effect_fence_not_verified",
      execution_authorized: false,
    };
  });
  return {
    schema: "cogentia.governed-resume-plan/v1",
    packet_ref: issue?.url || null,
    handler,
    handler_evidence: candidateReady ? "live_declared; acp_probe_receipt_not_attached" : "unverified",
    analysis: {
      status: candidateReady ? "WAITING_READ_ONLY_MANDATE" : "WAITING_HANDLER",
      allowed_without_mandate: false,
      required: ["explicit_read_only_scope", "workspace_boundary", "budget_and_timeout", "durable_result_channel"],
    },
    effects,
    status: candidateReady ? "WAITING_READ_ONLY_MANDATE" : "WAITING_HANDLER",
    blockers: [
      ...(candidateReady ? [] : ["handler_not_ready"]),
      "read_only_mandate_not_verified",
      "execution_adapter_not_connected",
      ...(effects.length ? ["effects_not_authorized"] : []),
    ],
    execution_authorized: false,
    execution_receipt: null,
  };
}

/**
 * Read-only delegation security contract. A prompt or ACP permission callback
 * is not an OS sandbox. No execution path can be unlocked by self-asserted
 * JSON evidence; require a future independently verified isolation adapter.
 */
export function assessReadOnlyDelegation({ issue, discovery, requested = false } = {}) {
  const discovered = discovery?.selected_handler?.id === "local-codex-acp" &&
    discovery?.reachability === "http_verified";
  return Object.freeze({
    schema: "cogentia.read-only-delegation/v1",
    packet_ref: issue?.url || null,
    requested,
    handler_id: discovered ? "local-codex-acp" : null,
    scope: { repositories: ["JeanHuguesRobert/inseme", "JeanHuguesRobert/cogentia"],
      effects: [], network: "disabled_except_necessary_provider_auth",
      source_access: "read_only", output: "durable_local_receipt" },
    controls: {
      mandate: "not_verified",
      os_filesystem_isolation: "not_verified",
      agent_tool_restriction: "advisory_only",
      credential_separation: "not_verified",
      provider_network_isolation: "not_verified",
      bounded_execution: "not_connected",
      durable_result: "not_connected",
    },
    status: discovered ? "WAITING_ISOLATED_READ_ONLY_ADAPTER" : "WAITING_HANDLER",
    blockers: [
      ...(!discovered ? ["handler_not_discovered"] : []),
      "read_only_mandate_not_verified",
      "os_filesystem_isolation_not_verified",
      "credential_separation_not_verified",
      "bounded_execution_not_connected",
      "durable_receipt_not_connected",
    ],
    execution_authorized: false,
    execution_receipt: null,
    effects: { handler_spawned: false, command_executed: false, git_commit: false, github_mutation: false },
  });
}

/** Trusted handler policy: isolation is risk-based, not a universal prerequisite.
 * This is a planning decision, never an authority token or executor.
 */
export function planTrustedHandlerResume({ issue, discovery, trust = "unknown", effect = "worktree_edit", mandate = null } = {}) {
  const handler = discovery?.selected_handler?.id === "local-codex-acp" ? discovery.selected_handler : null;
  const recognized = handler && discovery?.reachability === "http_verified" && trust === "trusted_local_handler";
  const permittedTypes = ["analysis", "worktree_edit", "git_commit", "github_update", "publish", "external_communication"];
  const sensitive = ["publish", "external_communication"].includes(effect);
  const blockers = [];
  if (!recognized) blockers.push("trusted_handler_not_verified");
  if (!permittedTypes.includes(effect)) blockers.push("unknown_effect");
  if (mandate?.packet_ref !== issue?.url || mandate?.handler_id !== handler?.id ||
      !Array.isArray(mandate?.allowed_effects) || !mandate.allowed_effects.includes(effect) ||
      mandate?.explicit_authority !== true) blockers.push("bounded_mandate_not_verified");
  if (sensitive) blockers.push("sensitive_effect_requires_specific_review");
  if (effect === "github_update") blockers.push("provider_optimistic_write_adapter_not_connected");
  // Local working changes are recoverable but must stay in an isolated worktree.
  // A user-supplied JSON mandate cannot independently prove authorization.
  return {
    schema: "cogentia.trusted-handler-resume-plan/v1", packet_ref: issue?.url || null,
    handler_id: handler?.id || null, trust_policy: "trusted_handler_optimistic_effects",
    isolation: "risk_based", worktree: "required_for_mutations",
    optimistic_locking: { baseline_sha: "required", conflict: "stop_refresh_reconcile", force_push: "forbidden" },
    effect, blockers: [...blockers,"trusted_mandate_adapter_not_connected","execution_adapter_not_connected"],
    status: "WAITING_TRUSTED_MANDATE_ADAPTER", execution_authorized: false,
    execution_receipt: null,
  };
}
