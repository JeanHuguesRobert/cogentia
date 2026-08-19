/**
 * MCP caller authentication for tiered mutate access.
 *
 * Paths:
 * 1) Admin full view: COGENTIA_MCP_VIEW=full + COGENTIA_ADMIN_TOKEN + COGENTIA_MCP_ALLOW_MUTATE=1
 * 2) Agent JHN (or subagent under JHN): COGENTIA_MCP_JHN_MUTATE=1 + COGENTIA_MCP_JHN_TOKEN
 *    + request attestation (header and/or _meta)
 *
 * Skills never grant this — only verified tokens + actor claim.
 */
import { timingSafeEqual } from "node:crypto";

export const ACTOR_META_KEY = "cogentia.actor";
export const MANDATE_META_KEY = "cogentia.mandate_ref";
export const PRINCIPAL_META_KEY = "cogentia.principal_ref";
export const JHN_TOKEN_META_KEY = "cogentia.jhn_token";
export const LOGICAL_AGENT_META_KEY = "cogentia.logical_agent_ref";

/** @param {string} a @param {string} b */
export function safeEqualString(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length || left.length === 0) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function parseBearer(authHeader) {
  const raw = String(authHeader || "").trim();
  if (!raw) return "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : raw;
}

/**
 * Agent JHN identity claims (direct or subagent).
 * Accepts:
 *   agent:jhn
 *   agent:jhn.subagent:<id>
 *   agent:jhn/handler:<id>
 *   logical_agent:jhn
 *   John (conversational surface — only with token)
 */
export function isJhnActorClaim(actor) {
  const a = String(actor || "").trim().toLowerCase();
  if (!a) return false;
  if (a === "agent:jhn" || a === "logical_agent:jhn" || a === "john" || a === "agent_jhn") {
    return true;
  }
  if (a.startsWith("agent:jhn.subagent:")) return true;
  if (a.startsWith("agent:jhn/handler:")) return true;
  if (a.startsWith("agent:jhn.")) return true;
  if (a.startsWith("subagent:jhn.")) return true;
  return false;
}

function headerGet(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (String(k).toLowerCase() === lower) {
      return String(Array.isArray(v) ? v[0] : v || "").trim();
    }
  }
  return "";
}

/**
 * Derive the "two lockers" grant (public/private x read/write) from an
 * already-resolved {allowMutate, auth} pair. One credential (one key) is
 * resolved once, by whichever path (admin token, JHN attestation, or a
 * narrower future credential); this just projects that resolution onto the
 * two independent access axes -- it does not add a second authentication
 * mechanism. See research/intent.md S13.2 and the "one key, two lockers"
 * design discussion.
 *
 * Deliberately reusable beyond MCP: the daemon (and, later, any other
 * surface) can call this on its own resolved auth so read/write x
 * public/private is checked the same way everywhere, not just here.
 * @returns {{ public: {read:boolean, write:boolean}, private: {read:boolean, write:boolean} }}
 */
export function deriveLockers({ allowMutate = false, auth = "none" } = {}) {
  const canReadPrivate = auth === "admin" || auth === "jhn";
  return {
    public: { read: true, write: Boolean(allowMutate) },
    private: { read: canReadPrivate, write: Boolean(allowMutate) && canReadPrivate },
  };
}

/**
 * Resolve caller mutate authorization for one JSON-RPC request.
 * @returns {{
 *   allowMutate: boolean,
 *   auth: 'none'|'admin'|'jhn',
 *   actor: string|null,
 *   mandate_ref: string|null,
 *   principal_ref: string|null,
 *   logical_agent_ref: string|null,
 *   reason: string,
 *   lockers: {public: {read:boolean,write:boolean}, private: {read:boolean,write:boolean}}
 * }}
 */
export function resolveCallerAuth(env, { meta = {}, headers = {}, view = "public", staticAllowMutate = false } = {}) {
  const finish = (result) => ({ ...result, lockers: deriveLockers(result) });
  const actor =
    String(meta[ACTOR_META_KEY] || meta.actor || "").trim() ||
    headerGet(headers, "x-cogentia-actor") ||
    headerGet(headers, "x-agent-actor") ||
    null;
  const mandate_ref =
    String(meta[MANDATE_META_KEY] || meta.mandate_ref || "").trim() ||
    headerGet(headers, "x-cogentia-mandate") ||
    null;
  const principal_ref =
    String(meta[PRINCIPAL_META_KEY] || meta.principal_ref || "").trim() ||
    headerGet(headers, "x-cogentia-principal") ||
    null;
  const logical_agent_ref =
    String(meta[LOGICAL_AGENT_META_KEY] || meta.logical_agent_ref || "").trim() ||
    headerGet(headers, "x-cogentia-logical-agent") ||
    null;

  if (staticAllowMutate && view === "full") {
    return finish({
      allowMutate: true,
      auth: "admin",
      actor: actor || "admin",
      mandate_ref,
      principal_ref,
      logical_agent_ref,
      reason: "admin_full_view_mutate",
    });
  }

  const jhnMutateOn = /^(1|true|yes)$/i.test(String(env.COGENTIA_MCP_JHN_MUTATE || "").trim());
  const expected = String(env.COGENTIA_MCP_JHN_TOKEN || "").trim();
  if (!jhnMutateOn || !expected) {
    return finish({
      allowMutate: false,
      auth: "none",
      actor,
      mandate_ref,
      principal_ref,
      logical_agent_ref,
      reason: jhnMutateOn ? "jhn_token_not_configured" : "jhn_mutate_disabled",
    });
  }

  const presented =
    parseBearer(headerGet(headers, "authorization")) ||
    headerGet(headers, "x-cogentia-jhn-token") ||
    String(meta[JHN_TOKEN_META_KEY] || "").trim();

  if (!presented || !safeEqualString(presented, expected)) {
    return finish({
      allowMutate: false,
      auth: "none",
      actor,
      mandate_ref,
      principal_ref,
      logical_agent_ref,
      reason: presented ? "jhn_token_mismatch" : "jhn_token_missing",
    });
  }

  const effectiveActor = actor || logical_agent_ref || "agent:jhn";
  if (!isJhnActorClaim(effectiveActor) && !isJhnActorClaim(logical_agent_ref)) {
    return finish({
      allowMutate: false,
      auth: "none",
      actor: effectiveActor,
      mandate_ref,
      principal_ref,
      logical_agent_ref,
      reason: "actor_not_jhn",
    });
  }

  return finish({
    allowMutate: true,
    auth: "jhn",
    actor: effectiveActor,
    mandate_ref: mandate_ref || "mandate:jhn:mcp_default",
    principal_ref: principal_ref || "principal:jhn",
    logical_agent_ref: logical_agent_ref || "agent:jhn",
    reason: "jhn_attested",
  });
}
