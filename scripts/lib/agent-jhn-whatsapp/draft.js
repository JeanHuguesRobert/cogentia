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
import { formatInstanceOutboundDisclosure } from "../digital-twin-engine.js";

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
      const directAnswer = await requestOpenAiDraft(userText, config, normalized, options);
      if (directAnswer) {
        const syncDraft = buildDeterministicDraft(normalized, config, options);
        return {
          ...syncDraft,
          text: formatInstanceOutboundDisclosure(
            { disclosure_tag: config.visible_agent_id || "— agent-jhn-experimental" },
            directAnswer,
          ),
          provenance_class: "openai-direct",
          sources: [],
          stub: false,
        };
      }
    } catch (error) {
      if (!error?.cognitiveReported && typeof options.onCognitiveError === "function") {
        options.onCognitiveError(error, safeCognitiveDiagnostics(error));
      }
    }
    try {
      const guideUrl = String(
        options.guideUrl ||
        process.env.AGENT_JHN_WHATSAPP_GUIDE_URL ||
        "http://127.0.0.1:8791/guide/chat",
      );
      const response = await fetch(guideUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          locale: resolveDisclosureLocale(config.allowed_self_jid || normalized?.remote_jid || ""),
          web_search: false,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const guideResult = await response.json();
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
    } catch (error) {
      if (typeof options.onCognitiveError === "function") options.onCognitiveError(error);
      /* Fall back to sync draft */
    }
  }
  return buildDeterministicDraft(normalized, config, options);
}

async function requestOpenAiDraft(userText, config, normalized, options = {}) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return "";
  const locale = resolveDisclosureLocale(config.allowed_self_jid || normalized?.remote_jid || "");
  const model = process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL || "gpt-5-mini";
  const timeoutMs = 15000;
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: [
              "You are Agent John (JHN), the experimental personal digital twin assistant of Jean Hugues Noël Robert.",
              "You are not Jean Hugues and cannot make commitments for him.",
              "Answer the owner directly, helpfully, and concisely.",
              `Reply in ${locale === "fr" ? "French" : "English"}.`,
            ].join(" "),
          },
          { role: "user", content: userText },
        ],
        max_completion_tokens: 800,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    emitCognitiveError(options, error, {
      provider: "openai", stage: "request", model, endpoint_host: "api.openai.com",
      elapsed_ms: Date.now() - startedAt, timeout_ms: timeoutMs, timed_out: isTimeoutError(error),
    });
    error.cognitiveReported = true;
    throw error;
  }
  const body = await response.json();
  if (!response.ok) {
    const error = new Error("OpenAI synthesis returned an error response");
    emitCognitiveError(options, error, {
      provider: "openai", stage: "response", model, endpoint_host: "api.openai.com",
      elapsed_ms: Date.now() - startedAt, timeout_ms: timeoutMs, timed_out: false,
      http_status: response.status,
      provider_error_code: body?.error?.code || body?.error?.type || null,
      request_id: response.headers.get("x-request-id"),
      processing_ms: numberOrNull(response.headers.get("openai-processing-ms")),
    });
    error.cognitiveReported = true;
    throw error;
  }
  return String(body?.choices?.[0]?.message?.content || "").trim();
}

function emitCognitiveError(options, error, details) {
  if (typeof options.onCognitiveError === "function") {
    options.onCognitiveError(error, safeCognitiveDiagnostics(error, details));
  }
}

export function safeCognitiveDiagnostics(error, details = {}) {
  return {
    provider: details.provider || "unknown",
    stage: details.stage || "unknown",
    model: details.model || null,
    endpoint_host: details.endpoint_host || null,
    elapsed_ms: Number.isFinite(details.elapsed_ms) ? details.elapsed_ms : null,
    timeout_ms: Number.isFinite(details.timeout_ms) ? details.timeout_ms : null,
    timed_out: Boolean(details.timed_out),
    http_status: Number.isInteger(details.http_status) ? details.http_status : null,
    provider_error_code: safeToken(details.provider_error_code),
    request_id: /^req_[A-Za-z0-9_-]{1,120}$/.test(String(details.request_id || "")) ? details.request_id : null,
    processing_ms: Number.isFinite(details.processing_ms) ? details.processing_ms : null,
    error_name: String(error?.name || "Error").slice(0, 80),
    error_code: safeToken(error?.code),
  };
}

function isTimeoutError(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError" || error?.code === "ETIMEDOUT";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeToken(value) {
  const token = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,80}$/.test(token) ? token : null;
}

function summarizeInbound(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 120) return s;
  return `${s.slice(0, 117)}…`;
}
