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
  // Manifest declarations cannot mint a mandate. Authority must be checked
  // independently at the eventual provider/adapter effect boundary.
  return {
    ...base,
    status: "WAITING_MANDATE_VERIFICATION",
    selected_handler: { id: handler.id, capabilities: requiredCapabilities, evidence: "manifest_declaration_only" },
    blockers: ["mandate_not_verified", "execution_adapter_not_connected", "provider_effect_fence_not_verified"],
    next_action: "Resolve mandate and claim/fencing through an authorized COP adapter before any execution",
  };
}
