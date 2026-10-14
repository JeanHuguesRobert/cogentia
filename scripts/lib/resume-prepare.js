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
