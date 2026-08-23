/**
 * Explicit address detection for Agent John on WhatsApp.
 *
 * Stealth rule: a bystander who does not know John exists must not see
 * him speak. Matching "Jean" (the principal) is therefore not an address.
 * Only vocative / agent-name forms count (e.g. "john, qu'en penses-tu ?").
 */

const AGENT_NAME_FORMS = [
  /\bagent[\s-]?john\b/i,
  /\bagent[\s-]?jhn\b/i,
  /\bagent-jhn-experimental\b/i,
];

/** @john / @jhn as a mention token, not the account @ of Jean Hugues. */
const AT_MENTION = /(^|[\s,;:])@(john|jhn)\b/i;

/**
 * Vocative "john" / "jhn": start of turn, after punctuation, comma, or
 * directed 2nd-person / question particle. Not "Johnson", not "jean".
 */
const VOCATIVE = [
  /(^|[.!?]\s+|\n)(john|jhn)\s*[,:?!]/i,
  /\b(john|jhn)\s*,/i,
  /\b(hey|hi|hello|salut|coucou|dis|dites|allo|allô|hé|eh)\s+(john|jhn)\b/i,
  /\b(john|jhn)\s+(tu|toi|vous|you)\b/i,
  /\b(john|jhn)\s+qu['’]/i,
  /[,:]\s*(john|jhn)\s*[?!]?\s*$/i,
  /\b(john|jhn)\s*[?!]\s*$/i,
];

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isExplicitlyAddressed(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (AGENT_NAME_FORMS.some((re) => re.test(s))) return true;
  if (AT_MENTION.test(s)) return true;
  if (VOCATIVE.some((re) => re.test(s))) return true;
  return false;
}

/**
 * True if the token looks like the principal's given name, not the agent.
 * Used in tests / docs; policy never treats "jean" as an address.
 */
export function looksLikePrincipalNameOnly(text) {
  const s = String(text || "");
  if (isExplicitlyAddressed(s)) return false;
  return /\bjean([- ]hugues)?\b/i.test(s);
}
