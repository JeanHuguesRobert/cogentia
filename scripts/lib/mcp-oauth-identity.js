import { isVerifiedMcpOAuthToken } from "./mcp-oauth-token.js";
/**
 * Provider-neutral OAuth identity binding.
 * Operator-managed JSON: [{"issuer":"https://id.example","subject":"opaque-sub","principal":"principal:jhn"}]
 * No implicit identity by email, display name, or unregistered issuer.
 */
export function resolveOAuthIdentity(verifiedToken, bindingsJson) {
  if (verifiedToken?.verified !== true) return null;
  const issuer = verifiedToken.issuer;
  const subject = verifiedToken.subject;
  if (typeof issuer !== "string" || !issuer || typeof subject !== "string" || !subject) return null;
  let bindings;
  try {
    bindings = JSON.parse(String(bindingsJson || "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(bindings)) return null;
  const matches = bindings.filter(item =>
    item && item.issuer === issuer && item.subject === subject &&
    typeof item.principal === "string" && item.principal.length > 0
  );
  if (matches.length !== 1) return null;
  return { principal: matches[0].principal, issuer, subject };
}

// Identity-only projection. A verified OAuth client and its human subject
// are independent. This projection grants neither private read nor effects.
export function resolveVerifiedOAuthContext(token, bindingsJson, nowMs = Date.now()) {
  if (!isVerifiedMcpOAuthToken(token) || !Number.isFinite(nowMs) ||
      token.claims.exp * 1000 <= nowMs) return null;
  const identity = resolveOAuthIdentity(token, bindingsJson);
  if (!identity || !token.claims.client_id) return null;
  let bindings;
  try { bindings = JSON.parse(bindingsJson); } catch { return null; }
  const binding = bindings.find(b => b?.issuer === identity.issuer &&
    b.subject === identity.subject && b.principal === identity.principal);
  if (!Array.isArray(binding?.client_ids) ||
      !binding.client_ids.includes(token.claims.client_id)) return null;
  return Object.freeze({ authenticated: true, principal_ref: identity.principal,
    authentication: "oauth", mandate_ref: null, grants_authority: false });
}
