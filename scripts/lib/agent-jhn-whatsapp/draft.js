/**
 * Deterministic draft producer for Agent JHN WhatsApp.
 * Does not call an LLM; leaves a clear continuation point for model integration.
 * Transport and policy must not depend on a model.
 *
 * Self-chat: short identification only (no disclosure noise).
 * Third-party (when authorized later): full chatbot disclosure + locale.
 */

import { DEFAULT_NOTICE_URL, VISIBLE_AGENT_ID } from "./constants.js";
import {
  AUDIENCE,
  formatOutboundText,
  resolveAudienceFromScope,
  resolveDisclosureLocale,
} from "./disclosure.js";

/**
 * Build a non-engaging experimental reply.
 *
 * @param {object} normalized inbound
 * @param {object} config
 * @param {object} [options]
 * @param {'self'|'third_party'} [options.audience]
 * @returns {{ text: string, provenance_class: string, sources: string[], stub: boolean, audience: string, locale: string }}
 */
export function buildDeterministicDraft(normalized, config, options = {}) {
  const notice = config.notice_url || DEFAULT_NOTICE_URL;
  const audience = resolveAudienceFromScope(config, options);
  const localeHint =
    options.phoneOrJid ||
    config.allowed_self_jid ||
    normalized?.remote_jid ||
    normalized?.remote_phone_digits ||
    "";
  const locale = resolveDisclosureLocale(localeHint);
  const inboundPreview = summarizeInbound(normalized?.text);

  let body;
  if (audience === AUDIENCE.SELF) {
    // Minimal self reply: useful content + light agent tag (FR/EN).
    if (locale === "fr") {
      body = inboundPreview
        ? `Reçu.\n${inboundPreview}`
        : "Reçu.";
    } else {
      body = inboundPreview ? `Received.\n${inboundPreview}` : "Received.";
    }
  } else {
    body = inboundPreview
      ? locale === "fr"
        ? `Reçu : ${inboundPreview}`
        : `Received: ${inboundPreview}`
      : locale === "fr"
        ? "Message reçu."
        : "Message received.";
  }

  const text = formatOutboundText(body, {
    audience,
    locale,
    noticeUrl: notice,
    phoneOrJid: localeHint,
  });

  return {
    text,
    provenance_class: "deterministic_stub",
    sources: audience === AUDIENCE.THIRD_PARTY ? [notice] : [VISIBLE_AGENT_ID],
    stub: true,
    audience,
    locale,
    continuation: {
      kind: "model_draft_integration",
      note: "Replace stub with Cogentia-sourced draft when model path is wired; policy and transport must remain independent of LLM.",
    },
  };
}

function summarizeInbound(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 120) return s;
  return `${s.slice(0, 117)}…`;
}
