/**
 * OAuth 2.1 MCP resource-server JWT verification.
 * Fail-closed: requires configured issuer, audience/resource, JWKS URL and scope.
 * No auth-server is invented here: configure values from an actual issuer.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";

function decodePart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}
function fail(code) {
  const err = new Error(code);
  err.code = code;
  throw err;
}
function containsAudience(aud, expected) {
  return typeof aud === "string" ? aud === expected : Array.isArray(aud) && aud.includes(expected);
}
export async function verifyMcpOAuthToken(token, options = {}) {
  const issuer = String(options.issuer || "");
  const audience = String(options.audience || "");
  const jwksUrl = String(options.jwksUrl || "");
  const requiredScopes = options.requiredScopes || [];
  if (!issuer || !audience || !jwksUrl) fail("oauth_not_configured");
  const jwksUri = new URL(jwksUrl);
  if (jwksUri.protocol !== "https:" || jwksUri.username || jwksUri.password) fail("invalid_jwks_url");
  if (!Array.isArray(requiredScopes)) fail("invalid_scopes");
  const parts = String(token || "").split(".");
  if (parts.length !== 3) fail("invalid_token_format");
  let header, claims;
  try {
    header = decodePart(parts[0]);
    claims = decodePart(parts[1]);
  } catch {
    fail("invalid_token_encoding");
  }
  if (!["RS256", "ES256"].includes(header.alg) || !header.kid) fail("unsupported_token_algorithm");
  const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (claims.iss !== issuer || !containsAudience(claims.aud, audience)) fail("invalid_token_issuer_or_audience");
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= now) fail("token_expired");
  if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now)) fail("token_not_yet_valid");
  if (typeof claims.sub !== "string" || !claims.sub) fail("missing_token_subject");
  const scopes = new Set(String(claims.scope || "").split(/\s+/).filter(Boolean));
  if (requiredScopes.some(s => !scopes.has(s))) fail("insufficient_scope");

  const response = await (options.fetch || fetch)(jwksUri, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    redirect: "error",
  });
  if (!response.ok) fail("jwks_unavailable");
  const data = await response.json();
  const matches = Array.isArray(data.keys) ? data.keys.filter(k =>
    k.kid === header.kid &&
    (!k.alg || k.alg === header.alg) &&
    (!k.use || k.use === "sig") &&
    (!k.key_ops || k.key_ops.includes("verify"))
  ) : [];
  if (matches.length !== 1) fail("jwks_key_not_found");
  const key = createPublicKey({ key: matches[0], format: "jwk" });
  const input = Buffer.from(parts[0] + "." + parts[1]);
  const sig = Buffer.from(parts[2], "base64url");
  const valid = header.alg === "RS256"
    ? verifySignature("RSA-SHA256", input, key, sig)
    : verifySignature("sha256", input, { key, dsaEncoding: "ieee-p1363" }, sig);
  if (!valid) fail("invalid_token_signature");
  return { subject: claims.sub, issuer, audience, scopes: [...scopes], claims: { sub: claims.sub, iss: claims.iss, aud: claims.aud, exp: claims.exp } };
}
