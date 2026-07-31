/**
 * Draft producer for Agent JHN WhatsApp.
 * Supports S7 Cogentia Retrieval & Magistral AI Router synthesis over the 7,391 pure vector embeddings.
 *
 * Self-chat: short identification only (no disclosure noise).
 * Third-party: full chatbot disclosure + locale.
 */

import { DEFAULT_NOTICE_URL, VISIBLE_AGENT_ID } from "./constants.js";
import {
  AUDIENCE,
  formatOutboundText,
  resolveAudienceFromScope,
  resolveDisclosureLocale,
} from "./disclosure.js";
import { loadDigitalTwinInstance, formatInstanceOutboundDisclosure } from "../digital-twin-engine.js";
import { guideResolve } from "../navigation.js";

/**
 * Build a non-engaging experimental reply (synchronous, deterministic).
 *
 * @param {object} normalized inbound
 * @param {object} config
 * @param {object} [options]
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
  const userText = (normalized?.text || "").trim();
  const inboundPreview = summarizeInbound(userText);

  let body;
  if (audience === AUDIENCE.SELF) {
    if (locale === "fr") {
      body = inboundPreview ? `Reçu.\n${inboundPreview}` : "Reçu.";
    } else {
      body = inboundPreview ? `Received.\n${inboundPreview}` : "Received.";
    }
  } else {
    body = inboundPreview
      ? locale === "fr" ? `Reçu : ${inboundPreview}` : `Received: ${inboundPreview}`
      : locale === "fr" ? "Message reçu." : "Message received.";
  }

  const text = formatOutboundText(body, {
    audience,
    agentTag: config.visible_agent_id || VISIBLE_AGENT_ID,
    noticeUrl: notice,
    locale,
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

/**
 * Build a cognitive draft via S7 Cogentia Retrieval & Magistral AI Router synthesis.
 */
export async function buildCognitiveDraft(normalized, config, options = {}) {
  const userText = (normalized?.text || "").trim();
  if (userText) {
    try {
      const guideResult = await guideResolve({
        query: userText,
        mode: "conversational",
        root: config.root || process.cwd()
      });
      if (guideResult && guideResult.answer) {
        const syncDraft = buildDeterministicDraft(normalized, config, options);
        return {
          ...syncDraft,
          text: formatInstanceOutboundDisclosure(
            { disclosure_tag: config.visible_agent_id || "— agent-jhn-experimental" },
            guideResult.answer
          ),
          provenance_class: "s7-cognitive-retrieval",
          sources: guideResult.sources || [],
          stub: false
        };
      }
    } catch {
      /* Fall back to sync draft */
    }
  }
  return buildDeterministicDraft(normalized, config, options);
}

function summarizeInbound(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 120) return s;
  return `${s.slice(0, 117)}…`;
}
