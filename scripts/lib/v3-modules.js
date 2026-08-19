/**
 * v3 module/capability seam (Cogentia #80 / #108).
 *
 * Additive-by-policy: this does NOT replace, wrap, or require migrating any
 * existing v2 command in scripts/cogentia.js. v2 keeps running exactly as
 * it is. From v3 onward, *new* capabilities register here instead of being
 * added as another ad-hoc cmd* function -- CLI/daemon/MCP surfaces then
 * call the registered module rather than reimplementing its logic.
 *
 * Kept intentionally small: only what the first real module (corpus.locate)
 * actually needs. Expand only when a second module needs more -- do not
 * pre-build fields nothing calls yet.
 *
 * @typedef {{locker: "public"|"private", mode: "read"|"write"}} AccessRequirement
 *
 * @typedef {Object} ModuleDescriptor
 * @property {string} id - unique module id, e.g. "corpus.locate"
 * @property {string} kind - e.g. "capability_provider"
 * @property {{capabilities: string[]}} provides
 * @property {(input: object) => Promise<object>|object} run
 * @property {object} [governance]
 * @property {AccessRequirement[] | ((input: object) => AccessRequirement[])} [governance.requires]
 *   Static list, or a function of the call's own input (e.g. a target repo),
 *   for capabilities whose required locker isn't known until called -- see
 *   "one key, two lockers" in research/intent.md S13.2. Empty/absent means
 *   no permission required (today's public-read baseline).
 * @property {string} [governance.trace_minimum] - e.g. "none" (descriptive only, not yet enforced)
 */

const registry = new Map();

export function registerModule(descriptor) {
  if (!descriptor || typeof descriptor !== "object") {
    throw new Error("registerModule: descriptor object required");
  }
  if (!descriptor.id) throw new Error("registerModule: descriptor.id required");
  if (typeof descriptor.run !== "function") {
    throw new Error(`registerModule(${descriptor.id}): descriptor.run must be a function`);
  }
  if (!descriptor.provides?.capabilities?.length) {
    throw new Error(`registerModule(${descriptor.id}): provides.capabilities (non-empty array) required`);
  }
  registry.set(descriptor.id, descriptor);
  return descriptor;
}

export function listModules() {
  return [...registry.values()].map(d => ({
    id: d.id,
    kind: d.kind || "capability_provider",
    provides: d.provides,
    governance: d.governance || null,
  }));
}

export function findModulesByCapability(capability) {
  return [...registry.values()].filter(d => d.provides.capabilities.includes(capability));
}

export function getModule(id) {
  return registry.get(id) || null;
}

const DEFAULT_LOCKERS = {
  public: { read: true, write: false },
  private: { read: false, write: false },
};

function resolveRequirements(module, input) {
  const requires = module.governance?.requires;
  if (typeof requires === "function") return requires(input) || [];
  return requires || [];
}

/**
 * Check a module's declared access requirements against the caller's
 * lockers grant (see cogentia-mcp-auth.js: deriveLockers, "one key, two
 * lockers"). Throws error_class "tier_forbidden" -- same shape the MCP
 * layer's requireMutate already throws, so nothing downstream needs to
 * special-case where the check happened.
 */
function checkGovernance(module, input, auth) {
  const requirements = resolveRequirements(module, input);
  if (!requirements.length) return;
  const lockers = auth?.lockers || DEFAULT_LOCKERS;
  for (const { locker, mode } of requirements) {
    const grant = lockers[locker];
    if (!grant?.[mode]) {
      const err = new Error(
        `tier_forbidden: ${module.id} requires ${locker}.${mode}. reason=${auth?.reason || "no_auth_context"}`
      );
      err.error_class = "tier_forbidden";
      throw err;
    }
  }
}

/**
 * Invoke the (first) module providing `capability`. Single-provider only
 * for now -- multi-provider routing/selection is out of scope until a
 * second module actually needs it (Occam rule, #108).
 *
 * `auth` (optional) is the caller's resolved lockers grant. Every surface
 * (CLI, daemon, MCP) is expected to resolve its own `auth` and pass it here
 * -- this is the one enforcement point all of them share, so none of them
 * has to re-derive permission logic on its own.
 */
export async function invokeCapability(capability, input, { auth } = {}) {
  const candidates = findModulesByCapability(capability);
  if (!candidates.length) {
    throw new Error(`No v3 module provides capability "${capability}"`);
  }
  const module = candidates[0];
  checkGovernance(module, input, auth);
  return module.run({ ...input, auth });
}
