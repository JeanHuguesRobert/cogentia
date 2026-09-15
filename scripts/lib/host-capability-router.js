/**
 * Host capability router (Cogentia #184).
 *
 * semantic capability != provider != transport != node
 *
 * COP/mandate/budget/trace sit between the requesting agent and the
 * machine effecter. Desktop Commander is one provider, selected by target.
 */
import { randomUUID } from "node:crypto";
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
} from "./side-effect-authorization.js";

export const HOST_CAPABILITIES = Object.keys(HOST_CAPABILITY_MAP);

const providers = new Map();
let modulesRegistered = false;

export function pathInsideRoot(candidate, root) {
  if (!root) return false;
  const resolved = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  const rel = path.relative(resolvedRoot, resolved);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
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
  if (typeof copy.content === "string") copy.content = `[redacted ${copy.content.length} chars]`;
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

    const traceBase = {
      protocol: "cogentia.host_capability_trace/v1",
      trace_id: traceId,
      actor: ctx.actor || ctx.auth?.actor || null,
      principal: ctx.principal || ctx.auth?.principal_ref || null,
      mandate: ctx.mandate || ctx.auth?.mandate_ref || null,
      capability,
      target,
      provider: providerName,
      argument_hash: argumentHash(capability, argsIn),
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

      const effectful = isEffectfulCapability(capability);
      if (effectful) {
        const payload = { capability, path: argsIn.path, command: argsIn.command };
        validateSideEffectAuthorization(ctx.authorization, {
          action_class: capability,
          target: { node: target, path: argsIn.path || null },
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
