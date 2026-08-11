/**
 * Outbound disclosure policy for Agent JHN WhatsApp.
 *
 * Audience:
 * - self: light identification only (no verbose notice noise)
 * - third_party: unambiguous chatbot / non-human principal disclosure
 *
 * Locale:
 * - default English
 * - French when the relevant phone country code is +33 (extensible later)
 */

import { DEFAULT_NOTICE_URL, VISIBLE_AGENT_ID, DIRECT_CONTACT_EMAIL } from "./constants.js";
import { phoneDigitsFromJid } from "./inbound-normalizer.js";

export const AUDIENCE = Object.freeze({
  SELF: "self",
  THIRD_PARTY: "third_party",
});

/**
 * Infer UI language from E.164 digits or JID.
 * FR when country code 33; else English. Extend map later.
 */
export function resolveDisclosureLocale(phoneOrJid) {
  const digits = String(phoneOrJid || "").includes("@")
    ? phoneDigitsFromJid(phoneOrJid)
    : String(phoneOrJid || "").replace(/\D/g, "");
  if (digits.startsWith("33")) return "fr";
  // National FR 0X… already normalized elsewhere to 33… when possible
  if (digits.length === 10 && digits.startsWith("0")) return "fr";
  return "en";
}

export function resolveAudienceFromScope(config, options = {}) {
  if (options.audience === AUDIENCE.THIRD_PARTY || options.audience === AUDIENCE.SELF) {
    return options.audience;
  }
  // MVP mode is self_only; explicit third_party only when caller says so.
  if (config?.mode === "self_chat_only" && options.audience !== AUDIENCE.THIRD_PARTY) {
    return AUDIENCE.SELF;
  }
  return options.audience || AUDIENCE.SELF;
}

/**
 * Build final outbound text for a given audience/locale.
 * @param {string} body - human content
 * @param {object} options
 * @param {'self'|'third_party'} options.audience
 * @param {'en'|'fr'} [options.locale]
 * @param {string} [options.noticeUrl]
 * @param {string} [options.phoneOrJid] - used to infer locale if not set
 * @param {boolean} [options.hasRecentDisclosure] - if true, use light tag instead of full verbose disclaimer block
 * @param {boolean} [options.includeEmailContact] - if true, include direct contact email unless already in recent history
 * @param {boolean} [options.hasRecentEmailContact] - true if email was sent in recent turns
 */
export function formatOutboundText(body, options = {}) {
  const content = String(body || "").trim();
  const notice = options.noticeUrl || DEFAULT_NOTICE_URL;
  const locale =
    options.locale ||
    resolveDisclosureLocale(options.phoneOrJid || options.localeHint || "");
  const audience = options.audience || AUDIENCE.SELF;

  if (audience === AUDIENCE.SELF) {
    return formatSelfText(content, locale);
  }
  return formatThirdPartyText(content, locale, notice, options);
}

function formatSelfText(content, locale) {
  // Minimal: identification only — user already knows the experimental context.
  const tag = locale === "fr" ? `— ${VISIBLE_AGENT_ID}` : `— ${VISIBLE_AGENT_ID}`;
  if (!content) return tag;
  // Avoid double-tagging if body already identifies the agent.
  if (contentIncludesAgentId(content)) return content;
  return `${content}\n${tag}`;
}

function formatThirdPartyText(content, locale, notice, options = {}) {
  const contactEmail = options.contactEmail || DIRECT_CONTACT_EMAIL;
  const emailContactStr =
    options.includeEmailContact && !options.hasRecentEmailContact
      ? locale === "fr"
        ? `\n(Pour joindre le principal directement de façon fiable : ${contactEmail})`
        : `\n(For reliable direct contact with principal: ${contactEmail})`
      : "";

  // If full disclosure header was delivered recently in thread history, do not spam it
  if (options.hasRecentDisclosure) {
    let resultText = content;
    if (!contentIncludesAgentId(content)) {
      resultText = content ? `${content}\n— ${VISIBLE_AGENT_ID}` : `— ${VISIBLE_AGENT_ID}`;
    }
    return emailContactStr ? `${resultText}${emailContactStr}` : resultText;
  }

  if (locale === "fr") {
    const header = [
      `[${VISIBLE_AGENT_ID}] Message automatique d’un assistant expérimental.`,
      "Ceci n’est pas Jean Hugues Robert en personne ; l’agent ne parle pas en son nom",
      "et n’engage aucun engagement en son lieu.",
      `Divulgation : ${notice}`,
    ].join("\n");
    const base = content ? `${header}\n\n${content}` : header;
    return emailContactStr ? `${base}${emailContactStr}` : base;
  }

  const header = [
    `[${VISIBLE_AGENT_ID}] Automated message from an experimental assistant.`,
    "This is not Jean Hugues Robert in person; the agent does not speak in his name",
    "and makes no commitments on his behalf.",
    `Disclosure: ${notice}`,
  ].join("\n");
  const base = content ? `${header}\n\n${content}` : header;
  return emailContactStr ? `${base}${emailContactStr}` : base;
}

function contentIncludesAgentId(text) {
  const s = String(text || "");
  return (
    s.includes(VISIBLE_AGENT_ID) ||
    s.includes("agent-jhn") ||
    /\bAgent JHN\b/i.test(s)
  );
}

/**
 * Self path: agent identification is enough.
 */
export function draftIncludesSelfIdentification(text) {
  return contentIncludesAgentId(text);
}

/**
 * Third-party path: clear non-human / chatbot framing + notice URL (or known notice slug).
 */
export function draftIncludesThirdPartyDisclosure(text, noticeUrl) {
  const d = String(text || "");
  if (!d.trim()) return false;
  const hasAgent = contentIncludesAgentId(d);
  const hasNonHuman =
    /experimental assistant|assistant expérimental|chatbot|automated message|message automatique|n’est pas Jean Hugues|is not Jean Hugues/i.test(
      d,
    );
  const hasNotice =
    (noticeUrl && d.includes(noticeUrl)) ||
    d.includes("agent-jhn-experimental-notice") ||
    /Divulgation\s*:/i.test(d) ||
    /Disclosure\s*:/i.test(d);
  return hasAgent && (hasNonHuman || hasNotice || d.includes("— agent-jhn"));
}

/**
 * Audience-aware disclosure check for policy / outbound-gate.
 */
export function outboundDisclosureOk(text, config, options = {}) {
  const audience = resolveAudienceFromScope(config, options);
  if (audience === AUDIENCE.THIRD_PARTY) {
    if (options.hasRecentDisclosure) {
      return draftIncludesSelfIdentification(text) || draftIncludesThirdPartyDisclosure(text, config?.notice_url || DEFAULT_NOTICE_URL);
    }
    return draftIncludesThirdPartyDisclosure(text, config?.notice_url || DEFAULT_NOTICE_URL);
  }
  return draftIncludesSelfIdentification(text);
}

/**
 * True if text looks like our own outbound (loop guard).
 */
export function looksLikeAgentJhnOutbound(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (s.includes(VISIBLE_AGENT_ID)) return true;
  if (s.includes("agent-jhn-experimental-notice")) return true;
  if (/^—\s*agent-jhn/im.test(s)) return true;
  if (/I am Agent JHN/i.test(s)) return true;
  if (/Je suis Agent JHN/i.test(s)) return true;
  if (/Automated message from an experimental assistant/i.test(s)) return true;
  if (/Message automatique d’un assistant expérimental/i.test(s)) return true;
  if (/Experimental disclosure:/i.test(s)) return true;
  if (/Divulgation\s*:/i.test(s) && /agent-jhn/i.test(s)) return true;
  if (/^Reçu\b/i.test(s) || /^Received\b/i.test(s)) return true;
  if (/^📱\s*\*Agent JHN/i.test(s) || /^📱\s*\*Active/i.test(s) || /^📇\s*\*Agent JHN/i.test(s)) return true;
  if (/^✅ Saved contact/i.test(s) || /^✅ Continuation/i.test(s) || /^🚫 Continuation/i.test(s) || /^📁 Conversation/i.test(s)) return true;
  if (/agent-jhn/i.test(s)) return true;
  return false;
}
