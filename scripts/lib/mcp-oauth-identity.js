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
