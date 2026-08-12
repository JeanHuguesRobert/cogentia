/**
 * Draft producer for Agent JHN WhatsApp.
 * Supports Guide reuse and corpus-librarian retrieval (explore → packet → synth).
 *
 * Retrieval modes (AGENT_JHN_WHATSAPP_RETRIEVAL):
 *   guide     — POST /guide/chat then OpenAI (default; website path reuse)
 *   librarian — Context Gateway tools → evidence packet → synthesizer
 *   shadow    — live answer stays guide; librarian runs for compare only
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
import { analyzeQuestion, createAnswerEngine } from "./answer-core.js";
import { answerWithLibrarian as defaultAnswerWithLibrarian } from "../corpus-librarian/pipeline.js";

const RETRIEVAL_MODES = new Set(["guide", "librarian", "shadow"]);

/**
 * Resolve WhatsApp cognitive retrieval mode.
 * Unknown values fall back to guide (safe default).
 *
 * @param {NodeJS.ProcessEnv | Record<string, string|undefined>} [env]
 * @param {{ retrievalMode?: string }} [options]
 * @returns {"guide"|"librarian"|"shadow"}
 */
export function resolveRetrievalMode(env = process.env, options = {}) {
  const raw = String(
    options.retrievalMode ??
    env?.AGENT_JHN_WHATSAPP_RETRIEVAL ??
    "guide",
  ).trim().toLowerCase();
  if (RETRIEVAL_MODES.has(raw)) return raw;
  return "guide";
}

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
  const asksContact = /\b(joindre|contacter|email|courriel|contact|reach|mail)\b/i.test(userText);
  const includeEmailContact = options.includeEmailContact || asksContact;

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
    hasRecentDisclosure: options.hasRecentDisclosure,
    hasRecentEmailContact: options.hasRecentEmailContact,
    includeEmailContact,
  });

  return {
    text,
    provenance_class: "deterministic_stub",
    sources: audience === AUDIENCE.THIRD_PARTY ? [notice] : [VISIBLE_AGENT_ID],
    stub: true,
    audience,
    locale,
    retrieval_mode: resolveRetrievalMode(process.env, options),
    continuation: {
      kind: "model_draft_integration",
      note: "Replace stub with Cogentia-sourced draft when model path is wired; policy and transport must remain independent of LLM.",
    },
  };
}

/**
 * Build a cognitive draft via Guide and/or corpus librarian retrieval.
 */
export async function buildCognitiveDraft(normalized, config, options = {}) {
  const userText = (normalized?.text || "").trim();
  if (!userText) return buildDeterministicDraft(normalized, config, options);

  const questionAnalysis = analyzeQuestion({
    text: userText,
    locale: resolveDisclosureLocale(config.allowed_self_jid || normalized?.remote_jid || ""),
    channel: "whatsapp",
  });
  const mode = resolveRetrievalMode(process.env, options);

  if (mode === "librarian") {
    return buildLibrarianDraft(normalized, config, options, questionAnalysis, userText);
  }

  if (mode === "shadow") {
    const [guideDraft, shadow] = await Promise.all([
      buildGuideDraft(normalized, config, options, questionAnalysis, userText),
      runLibrarianShadow(userText, questionAnalysis, options),
    ]);
    if (typeof options.onShadowCompare === "function") {
      try {
        options.onShadowCompare(shadow);
      } catch {
        /* non-fatal observer */
      }
    }
    return {
      ...guideDraft,
      retrieval_mode: "shadow",
      shadow,
    };
  }

  const guideDraft = await buildGuideDraft(normalized, config, options, questionAnalysis, userText);
  return { ...guideDraft, retrieval_mode: "guide" };
}

async function buildGuideDraft(normalized, config, options, questionAnalysis, userText) {
  let guideResult = null;
  const guideUrl = String(
    options.guideUrl ||
    process.env.AGENT_JHN_WHATSAPP_GUIDE_URL ||
    "http://127.0.0.1:8791/guide/chat",
  );
  const guideStartedAt = Date.now();
  try {
    const response = await fetch(guideUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        question: userText,
        locale: questionAnalysis.locale,
        web_search: questionAnalysis.needsCurrentWeb,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) guideResult = await response.json();
    else {
      const error = new Error("Guide retrieval returned an error response");
      emitCognitiveError(options, error, {
        provider: "cogentia-guide", stage: "retrieval_response", endpoint_host: hostOf(guideUrl),
        elapsed_ms: Date.now() - guideStartedAt, timeout_ms: 8000, http_status: response.status,
      });
    }
  } catch (error) {
    emitCognitiveError(options, error, {
      provider: "cogentia-guide", stage: "retrieval_request", endpoint_host: hostOf(guideUrl),
      elapsed_ms: Date.now() - guideStartedAt, timeout_ms: 8000, timed_out: isTimeoutError(error),
    });
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const models = apiKey ? [
    process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL || "gpt-5.6-terra",
    process.env.AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL || "gpt-4.1-mini",
  ].filter((model, index, all) => model && all.indexOf(model) === index) : [];
  const engine = createAnswerEngine({
    retrieve: async () => guideResult,
    synthesizers: models.map((model) => ({
      provider: "openai",
      model,
      synthesize: async ({ retrieval, analysis, evidence }) => requestOpenAiModelDraft(
        userText, retrieval, analysis, evidence, apiKey, model,
      ),
    })),
    extractFallback: retrieval => retrieval?.answer || "",
    onDiagnostic: diagnostics => {
      if (typeof options.onCognitiveError === "function") {
        options.onCognitiveError(new Error("answer core diagnostic"), diagnostics);
      }
    },
  });
  const answerResult = await engine.answer({
    text: userText,
    locale: questionAnalysis.locale,
    channel: "whatsapp",
    maxChars: 1200,
    conversationId: normalized?.conversation_id || null,
  });
  if (answerResult.ok && answerResult.answer) {
    const syncDraft = buildDeterministicDraft(normalized, config, options);
    return {
      ...syncDraft,
      text: formatInstanceOutboundDisclosure(
        { disclosure_tag: config.visible_agent_id || "— agent-jhn-experimental" },
        answerResult.answer,
      ),
      provenance_class: answerResult.provider === "extractive-fallback"
        ? "s7-cognitive-retrieval"
        : guideResult ? "openai-corpus-grounded" : "openai-direct",
      sources: answerResult.sources,
      stub: false,
    };
  }
  return buildDeterministicDraft(normalized, config, options);
}

async function buildLibrarianDraft(normalized, config, options, questionAnalysis, userText) {
  const startedAt = Date.now();
  let librarian;
  try {
    librarian = await invokeLibrarian(userText, questionAnalysis, options);
  } catch (error) {
    emitCognitiveError(options, error, {
      provider: "corpus-librarian",
      stage: "librarian_request",
      endpoint_host: hostOf(gatewayBaseUrl(options)),
      elapsed_ms: Date.now() - startedAt,
      timed_out: isTimeoutError(error),
    });
    return {
      ...buildDeterministicDraft(normalized, config, options),
      retrieval_mode: "librarian",
    };
  }

  if (librarian?.ok && librarian.answer) {
    const syncDraft = buildDeterministicDraft(normalized, config, options);
    return {
      ...syncDraft,
      text: formatInstanceOutboundDisclosure(
        { disclosure_tag: config.visible_agent_id || "— agent-jhn-experimental" },
        librarian.answer,
      ),
      provenance_class: librarian.provider === "extractive-fallback"
        ? "librarian-extractive"
        : "librarian-corpus-grounded",
      sources: normalizeDraftSources(librarian.sources),
      stub: false,
      retrieval_mode: "librarian",
      librarian: summarizeLibrarian(librarian),
    };
  }

  emitCognitiveError(options, new Error("librarian produced no answer"), {
    provider: "corpus-librarian",
    stage: "librarian_empty",
    endpoint_host: hostOf(gatewayBaseUrl(options)),
    elapsed_ms: Date.now() - startedAt,
  });
  return {
    ...buildDeterministicDraft(normalized, config, options),
    retrieval_mode: "librarian",
    librarian: librarian ? summarizeLibrarian(librarian) : { ok: false },
  };
}

async function runLibrarianShadow(userText, questionAnalysis, options) {
  const startedAt = Date.now();
  try {
    const librarian = await invokeLibrarian(userText, questionAnalysis, options);
    return {
      ...summarizeLibrarian(librarian),
      elapsed_ms: Date.now() - startedAt,
    };
  } catch (error) {
    emitCognitiveError(options, error, {
      provider: "corpus-librarian",
      stage: "shadow_librarian",
      endpoint_host: hostOf(gatewayBaseUrl(options)),
      elapsed_ms: Date.now() - startedAt,
      timed_out: isTimeoutError(error),
    });
    return {
      ok: false,
      path: "librarian_c",
      error_name: String(error?.name || "Error").slice(0, 80),
      error_code: safeToken(error?.code),
      elapsed_ms: Date.now() - startedAt,
    };
  }
}

async function invokeLibrarian(userText, questionAnalysis, options) {
  const answerFn = typeof options.answerWithLibrarian === "function"
    ? options.answerWithLibrarian
    : defaultAnswerWithLibrarian;
  const apiKey = String(options.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
  const model = String(
    options.model ||
    process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL ||
    "gpt-5.6-terra",
  );
  return answerFn(
    {
      question: userText,
      text: userText,
      locale: questionAnalysis.locale,
      channel: "whatsapp",
    },
    {
      baseUrl: gatewayBaseUrl(options),
      fetch: options.fetch,
      tools: options.librarianTools,
      apiKey,
      model,
      mode: options.librarianSearchMode || "keyword",
      maxChars: options.maxChars || 1200,
      channel: "whatsapp",
      preferOpen: options.preferOpen === true,
      openTopK: options.openTopK,
      searchLimit: options.searchLimit,
      minOpenChars: options.minOpenChars,
      toolTimeoutMs: options.toolTimeoutMs,
      synthTimeoutMs: options.synthTimeoutMs,
      synthesizer: options.synthesizer,
    },
  );
}

function gatewayBaseUrl(options = {}) {
  return String(
    options.gatewayUrl ||
    process.env.AGENT_JHN_WHATSAPP_GATEWAY_URL ||
    process.env.COGENTIA_CONTEXT_GATEWAY_URL ||
    "http://127.0.0.1:8790",
  ).replace(/\/$/, "");
}

function summarizeLibrarian(librarian) {
  if (!librarian || typeof librarian !== "object") {
    return { ok: false, path: "librarian_c" };
  }
  const sourceIds = [];
  for (const source of normalizeDraftSources(librarian.sources)) {
    const id = typeof source === "string" ? source : source?.source_id;
    if (id) sourceIds.push(String(id).slice(0, 240));
  }
  for (const id of librarian.packet?.source_ids || []) {
    const value = String(id || "").slice(0, 240);
    if (value && !sourceIds.includes(value)) sourceIds.push(value);
  }
  return {
    ok: Boolean(librarian.ok && librarian.answer),
    path: librarian.path || "librarian_c",
    provider: librarian.provider || null,
    model: librarian.model || null,
    answer_length: String(librarian.answer || "").length,
    source_ids: sourceIds.slice(0, 20),
    explore: librarian.explore || null,
    latency_ms: Number.isFinite(librarian.latencyMs) ? librarian.latencyMs : null,
    coverage: librarian.packet?.coverage || null,
  };
}

function normalizeDraftSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.filter(Boolean).slice(0, 20);
}

async function requestOpenAiModelDraft(
  userText, guideResult, analysis, evidence, apiKey, model,
) {
  const corpusContext = buildCorpusContext(evidence);
  const timeoutMs = 15000;
  let response;
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
              "Lead with the useful answer; do not merely summarize the excerpts.",
              "Separate established facts from proposals, intentions, and unknowns.",
              "Support each important corpus-grounded claim with its source_id in square brackets.",
              "Never invent a source or claim that an announced project is already operational.",
              "If evidence is insufficient, state the precise limit instead of filling the gap.",
              analysis.needsCurrentWeb && !evidence.current_information_verified
                ? "The supplied evidence is not verified as current; say so explicitly."
                : "Use the supplied evidence according to its stated scope.",
              `Intent: ${analysis.intent}. Preferred answer shape: ${analysis.answerShape}.`,
              "This is WhatsApp: answer in at most 900 characters, with short paragraphs or compact steps.",
              `Reply only in ${analysis.locale === "fr" ? "French" : "English"}.`,
            ].join(" "),
          },
          ...(corpusContext ? [{ role: "system", content: `Public corpus excerpts:\n${corpusContext}` }] : []),
          { role: "user", content: userText },
        ],
        max_completion_tokens: 700,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error("OpenAI synthesis returned an error response");
    error.code = safeToken(body?.error?.code || body?.error?.type) || "OPENAI_HTTP_ERROR";
    error.http_status = response.status;
    throw error;
  }
  const content = String(body?.choices?.[0]?.message?.content || "").trim();
  return {
    answer: content,
    model,
    sources: guideResult?.sources || [],
    finish_reason: body?.choices?.[0]?.finish_reason,
    prompt_tokens: body?.usage?.prompt_tokens,
    completion_tokens: body?.usage?.completion_tokens,
    reasoning_tokens: body?.usage?.completion_tokens_details?.reasoning_tokens,
    request_id: response.headers.get("x-request-id"),
  };
}

function buildCorpusContext(evidence) {
  return (evidence?.claims || []).map((item) => {
    const sourceId = String(item?.source_id || "source").slice(0, 240);
    const text = String(item?.text || "").replace(/\s+/g, " ").trim().slice(0, 1800);
    return text ? `[${sourceId}]\n${text}` : "";
  }).filter(Boolean).join("\n\n").slice(0, 10000);
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
    finish_reason: safeToken(details.finish_reason),
    prompt_tokens: numberOrNull(details.prompt_tokens),
    completion_tokens: numberOrNull(details.completion_tokens),
    reasoning_tokens: numberOrNull(details.reasoning_tokens),
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

function hostOf(url) {
  try {
    return new URL(String(url)).hostname || null;
  } catch {
    return null;
  }
}

function summarizeInbound(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 120) return s;
  return `${s.slice(0, 117)}…`;
}
