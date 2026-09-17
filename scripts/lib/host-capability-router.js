/**
 * Host capability router (Cogentia #184).
 *
 * semantic capability != provider != transport != node
 *
 * COP/mandate/budget/trace sit between the requesting agent and the
 * machine effecter. Desktop Commander is one provider, selected by target.
 */
import fs from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { registerModule, invokeCapability } from "./v3-modules.js";
import {
  DesktopCommanderProvider,
  fakeDesktopCommanderSpawn,
  defaultDesktopCommanderSpawn,
  HOST_CAPABILITY_MAP,
} from "./desktop-commander-provider.js";
import {
  isEffectfulCapability,
  validateSideEffectAuthorization,
  consumeSideEffectAuthorization,
  canonicalPayloadHash,
  buildEffectPayload,
  buildHostFsWritePayload,
} from "./side-effect-authorization.js";

export const HOST_CAPABILITIES = Object.keys(HOST_CAPABILITY_MAP);

const providers = new Map();
let modulesRegistered = false;

function normalizeFsPath(p) {
  let norm = path.resolve(p).replace(/\\/g, "/");
  if (process.platform === "win32") {
    norm = norm.toLowerCase();
  }
  return norm;
}

/**
 * Filesystem-aware containment check (Cogentia #192 Finding B).
 * Canonicalizes roots and targets using realpathSync to prevent symlink/junction/traversal escapes.
 * For non-existent files (new writes), canonicalizes the nearest existing ancestor.
 *
 * @param {string} candidate
 * @param {string} root
 * @returns {boolean}
 */
export function pathInsideRoot(candidate, root) {
  if (!candidate || !root) return false;

  try {
    const resolvedCandidate = path.resolve(candidate);
    const resolvedRoot = path.resolve(root);

    // 1. Canonicalize root with realpath
    let canonicalRoot;
    try {
      canonicalRoot = fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot);
    } catch {
      // If root does not exist, fail closed
      return false;
    }

    // 2. Canonicalize candidate target
    let canonicalCandidate;
    if (fs.existsSync(resolvedCandidate)) {
      canonicalCandidate = fs.realpathSync.native ? fs.realpathSync.native(resolvedCandidate) : fs.realpathSync(resolvedCandidate);
    } else {
      // Traverse up to find nearest existing parent directory
      let current = path.dirname(resolvedCandidate);
      const remainingSegments = [path.basename(resolvedCandidate)];
      while (!fs.existsSync(current)) {
        const parent = path.dirname(current);
        if (parent === current) {
          return false;
        }
        remainingSegments.unshift(path.basename(current));
        current = parent;
      }
      const canonicalParent = fs.realpathSync.native ? fs.realpathSync.native(current) : fs.realpathSync(current);
      canonicalCandidate = path.join(canonicalParent, ...remainingSegments);
    }

    // 3. Normalized containment comparison
    const normRoot = normalizeFsPath(canonicalRoot);
    const normCandidate = normalizeFsPath(canonicalCandidate);

    const rel = path.relative(normRoot, normCandidate);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  } catch {
    // Fail closed on any resolution error
    return false;
  }
}

function boundedPath(args, root) {
  if (!args?.path) return args;
  if (!pathInsideRoot(args.path, root)) {
    const err = new Error(`path_outside_root: ${args.path}`);
    err.error_class = "path_outside_root";
    throw err;
  }
  return { ...args, path: path.resolve(args.path) };
}

function argumentHash(capability, args) {
  const copy = { ...args };
  if (typeof copy.content === "string") {
    copy.content_bytes = Buffer.byteLength(copy.content, "utf8");
    copy.content_sha256 = `sha256:${createHash("sha256").update(copy.content).digest("hex")}`;
    delete copy.content;
  }
  return canonicalPayloadHash({ capability, ...copy });
}

export function ensureHostCapabilityModules() {
  if (modulesRegistered) return;
  modulesRegistered = true;
  registerModule({
    id: "host.desktop-commander",
    kind: "capability_provider",
    provider: "desktop-commander",
    provides: { capabilities: HOST_CAPABILITIES },
    governance: {
      requires: (input) => {
        if (isEffectfulCapability(input.capability)) {
          return [{ locker: "private", mode: "write" }];
        }
        return [{ locker: "private", mode: "read" }];
      },
      trace_minimum: "host_capability_trace",
    },
    run: async (input) => {
      const provider = input._providerInstance;
      if (!provider) {
        const err = new Error("host provider instance missing");
        err.error_class = "provider_unavailable";
        throw err;
      }
      return provider.invoke(input.capability, input.args || {});
    },
  });
}

export function createHostCapabilityRouter(options = {}) {
  ensureHostCapabilityModules();
  const traces = [];
  const env = options.env || process.env;
  const fsRoot = options.fsRoot || env.COGENTIA_HOST_FS_ROOT || "";
  const defaultTarget = options.target || env.COGENTIA_HOST_NODE_ID || "node:local";
  const defaultProviderName = options.providerName || env.COGENTIA_HOST_FS_PROVIDER || "desktop-commander";
  const providerFactory = options.providerFactory || null;
  const cacheKey = options.cacheKey || "default";

  async function resolveProvider(providerName) {
    const key = `${cacheKey}:${providerName}`;
    if (providers.has(key)) return providers.get(key);
    if (providerFactory) {
      const created = await providerFactory(providerName);
      providers.set(key, created);
      await created.start();
      return created;
    }
    if (providerName === "desktop-commander") {
      const useFake = /^(1|true|yes|fake)$/i.test(String(env.COGENTIA_DC_MCP_FAKE || ""));
      const spawned = new DesktopCommanderProvider({
        spawn: useFake ? fakeDesktopCommanderSpawn() : defaultDesktopCommanderSpawn(env),
        cwd: options.cwd,
        env,
        timeoutMs: options.timeoutMs,
      });
      providers.set(key, spawned);
      await spawned.start();
      return spawned;
    }
    const err = new Error(`provider_not_found: ${providerName}`);
    err.error_class = "provider_not_found";
    throw err;
  }

  async function invoke(capability, rawArgs = {}, ctx = {}) {
    const started = new Date().toISOString();
    const traceId = ctx.trace_id || `hct_${randomUUID()}`;
    const providerName = ctx.provider || rawArgs.provider || defaultProviderName;
    const target = ctx.target || rawArgs.target || defaultTarget;
    const argsIn = { ...rawArgs };
    delete argsIn.provider;
    delete argsIn.target;
    delete argsIn.side_effect_authorization;
    delete argsIn.authorization;
    delete argsIn.mandate;

    const actor = ctx.actor || ctx.auth?.actor || null;
    const principal = ctx.principal || ctx.auth?.principal_ref || null;
    const mandate = ctx.mandate || ctx.auth?.mandate_ref || rawArgs.mandate || null;
    const budget = ctx.budget || options.budget || null;

    const traceBase = {
      protocol: "cogentia.host_capability_trace/v1",
      trace_id: traceId,
      actor,
      principal,
      mandate,
      capability,
      target,
      provider: providerName,
      argument_hash: argumentHash(capability, argsIn),
      budget: budget ? {
        budget_id: budget.budget_id || "bounded_operations",
        remaining: typeof budget.remaining === "number" ? budget.remaining : undefined,
        used: budget.used_operations || undefined,
      } : null,
      started_at: started,
    };

    const finish = (fields) => {
      const trace = {
        ...traceBase,
        ...fields,
        ended_at: new Date().toISOString(),
      };
      traces.push(trace);
      return trace;
    };

    try {
      if (!HOST_CAPABILITY_MAP[capability]) {
        const err = new Error(`unknown_capability: ${capability}`);
        err.error_class = "unknown_capability";
        throw err;
      }

      // Cogentia #192 Finding C: Identity and Mandate context must not remain optional
      if (!actor && !principal) {
        const err = new Error(`identity_required: capability ${capability} requires authenticated principal or authorized actor`);
        err.error_class = "identity_required";
        throw err;
      }

      if (!mandate) {
        const err = new Error(`mandate_required: capability ${capability} requires explicit or inherited mandate`);
        err.error_class = "mandate_required";
        throw err;
      }

      // Cogentia #192 Finding D: Bounded COP budget enforcement / seam
      if (budget) {
        if (typeof budget.check === "function") {
          const checkResult = budget.check({ capability, actor, principal, mandate, target, args: argsIn });
          if (!checkResult?.allowed) {
            const err = new Error(`budget_exhausted: ${checkResult?.reason || "budget denied"}`);
            err.error_class = "budget_exhausted";
            throw err;
          }
        } else if (typeof budget.remaining === "number") {
          if (budget.remaining <= 0) {
            const err = new Error(`budget_exhausted: budget ${budget.budget_id || "bounded_operations"} has no remaining capacity`);
            err.error_class = "budget_exhausted";
            throw err;
          }
          budget.remaining -= 1;
        } else if (typeof budget.max_operations === "number") {
          budget.used_operations = (budget.used_operations || 0) + 1;
          if (budget.used_operations > budget.max_operations) {
            const err = new Error(`budget_exhausted: operation count exceeded limit (${budget.max_operations})`);
            err.error_class = "budget_exhausted";
            throw err;
          }
        }
      }

      const effectful = isEffectfulCapability(capability);
      if (effectful) {
        // Cogentia #192 Finding A: Exact payload binding including content digest, mode, and target
        const payload = buildEffectPayload(capability, argsIn, { target });
        validateSideEffectAuthorization(ctx.authorization, {
          action_class: capability,
          target: { node: target, path: payload.path || null },
          payload,
        });
      }

      if (!fsRoot) {
        const err = new Error("COGENTIA_HOST_FS_ROOT is required; refusing blanket filesystem export");
        err.error_class = "fs_root_required";
        throw err;
      }
      const args = argsIn.path ? boundedPath(argsIn, fsRoot) : argsIn;
      if (args.command && effectful && !ctx.allowProcess) {
        // Process execution is never implicit merely because DC exposes it.
        if (capability === "host.process.run" && !ctx.authorization) {
          const err = new Error("host.process.run requires authorization");
          err.error_class = "authorization_missing";
          throw err;
        }
      }

      const providerInstance = ctx.providerInstance || await resolveProvider(providerName);
      const result = await invokeCapability(
        capability,
        { capability, args, _providerInstance: providerInstance },
        { auth: ctx.auth, provider: providerName }
      );

      if (effectful) consumeSideEffectAuthorization(ctx.authorization);

      const trace = finish({
        status: "ok",
        upstream_tool: result.upstream_tool,
        authorization_id: ctx.authorization?.authorization_id || null,
        verification: { ok: true },
      });
      return { ...result, trace };
    } catch (err) {
      const trace = finish({
        status: "error",
        error_class: err.error_class || "host_capability_error",
        error: err.message,
        authorization_id: ctx.authorization?.authorization_id || null,
        verification: { ok: false },
      });
      err.trace = trace;
      throw err;
    }
  }

  async function stop() {
    for (const [key, provider] of providers) {
      if (key.startsWith(`${cacheKey}:`) && provider?.stop) {
        await provider.stop();
        providers.delete(key);
      }
    }
  }

  return {
    invoke,
    stop,
    traces,
    fsRoot,
    defaultTarget,
    defaultProviderName,
  };
}
