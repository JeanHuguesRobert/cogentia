/**
 * Provider-agnostic answer orchestration.
 * No network, WhatsApp, filesystem, environment, or secret access.
 */

export function createAnswerEngine(options = {}) {
  const analyze = typeof options.analyze === "function" ? options.analyze : analyzeQuestion;
  const retrieve = typeof options.retrieve === "function" ? options.retrieve : async () => null;
  const buildEvidence = typeof options.buildEvidence === "function" ? options.buildEvidence : buildEvidencePacket;
  const synthesizers = Array.isArray(options.synthesizers) ? options.synthesizers : [];
  const critique = typeof options.critique === "function" ? options.critique : critiqueAnswer;
  const render = typeof options.render === "function" ? options.render : renderAnswer;
  const extractFallback = typeof options.extractFallback === "function" ? options.extractFallback : defaultExtractFallback;
  const clock = typeof options.clock === "function" ? options.clock : Date.now;
  const onDiagnostic = typeof options.onDiagnostic === "function" ? options.onDiagnostic : () => {};

  return {
    async answer(input = {}) {
      const startedAt = clock();
      const text = String(input.text || "").trim();
      const diagnostics = [];
      let analysis;
      try {
        analysis = await analyze({ ...input, text });
      } catch (error) {
        analysis = analyzeQuestion({ ...input, text });
        recordDiagnostic(diagnostics, onDiagnostic, { stage: "analysis", provider: "answer-core", ...safeErrorFields(error) });
      }

      let retrieval = null;
      try {
        retrieval = await retrieve({ text, locale: analysis.locale, analysis, conversationId: input.conversationId || null });
      } catch (error) {
        recordDiagnostic(diagnostics, onDiagnostic, { stage: "retrieval", provider: "retriever", ...safeErrorFields(error) });
      }
      const evidence = buildEvidence(retrieval, analysis);

      for (let index = 0; index < synthesizers.length; index += 1) {
        const candidate = synthesizers[index] || {};
        const attemptStartedAt = clock();
        try {
          const result = await candidate.synthesize({
            text,
            locale: analysis.locale,
            analysis,
            evidence,
            conversationId: input.conversationId || null,
            retrieval,
          });
          const rawAnswer = normalizedAnswer(result);
          if (!rawAnswer) {
            recordDiagnostic(diagnostics, onDiagnostic, {
              stage: "empty_response", provider: candidate.provider || "unknown",
              model: candidate.model || result?.model || null, attempt: index + 1,
              elapsed_ms: clock() - attemptStartedAt, ...safeResultFields(result),
            });
            continue;
          }
          const review = await critique({ answer: rawAnswer, text, analysis, evidence, retrieval });
          const reviewedAnswer = normalizedAnswer(review) || rawAnswer;
          const answer = render(reviewedAnswer, { analysis, channel: input.channel || "api", maxChars: input.maxChars });
          if (!answer) {
            recordDiagnostic(diagnostics, onDiagnostic, { stage: "render_empty", provider: "answer-core", attempt: index + 1 });
            continue;
          }
          return {
            ok: true, answer, provider: candidate.provider || result?.provider || "unknown",
            model: result?.model || candidate.model || null, fallbackLevel: index,
            sources: normalizeSources(result?.sources || retrieval?.sources),
            latencyMs: clock() - startedAt, diagnostics, analysis, evidence,
            critique: normalizeCritique(review),
          };
        } catch (error) {
          recordDiagnostic(diagnostics, onDiagnostic, {
            stage: isTimeoutError(error) ? "timeout" : "synthesis_error",
            provider: candidate.provider || "unknown", model: candidate.model || null,
            attempt: index + 1, elapsed_ms: clock() - attemptStartedAt, ...safeErrorFields(error),
          });
        }
      }

      const fallback = String(extractFallback(retrieval, { text, locale: analysis.locale }) || "").trim();
      if (fallback) {
        return {
          ok: true,
          answer: render(fallback, { analysis, channel: input.channel || "api", maxChars: input.maxChars }),
          provider: "extractive-fallback", model: null, fallbackLevel: synthesizers.length,
          sources: normalizeSources(retrieval?.sources), latencyMs: clock() - startedAt,
          diagnostics, analysis, evidence,
          critique: { accepted: false, issues: ["extractive_fallback"] },
        };
      }
      return {
        ok: false, answer: "", provider: null, model: null, fallbackLevel: synthesizers.length + 1,
        sources: [], latencyMs: clock() - startedAt, diagnostics, analysis, evidence,
        critique: { accepted: false, issues: ["no_answer"] },
      };
    },
  };
}

export function analyzeQuestion(input = {}) {
  const text = String(input.text || "").trim();
  const explicitLocale = String(input.locale || "").toLowerCase();
  const detectedLocale = detectLanguage(text);
  const locale = detectedLocale || (explicitLocale.startsWith("fr") ? "fr" : "en");
  const lower = text.toLocaleLowerCase(locale === "fr" ? "fr" : "en");
  const needsCurrentWeb = /\b(current|currently|latest|recent|today|maintenant|actuel|actuelle|récent|recente|aujourd'hui)\b/i.test(lower);
  let intent = "explain";
  if (/\b(compare|versus|vs\.?|différence|difference|comparer)\b/i.test(lower)) intent = "compare";
  else if (/\b(how|what should|where.*start|comment|que faire|par o[uù] commencer|quel r[oô]le)\b/i.test(lower)) intent = "advise";
  else if (needsCurrentWeb) intent = "current_info";
  else if (/\b(is it|est[- ]il|vraiment|seulement)\b/i.test(lower)) intent = "challenge";
  return {
    intent, locale, detectedLocale, needsCurrentWeb,
    needsClarification: text.length < 8 && !/par o[uù] commencer/i.test(lower),
    answerShape: intent === "advise" ? "actionable_steps" : intent === "compare" ? "comparison" : "direct_answer",
    channel: String(input.channel || "api"),
    visitorChars: text.length,
    attention: inferAttention(text, intent),
  };
}

function inferAttention(text, intent) {
  const t = String(text || "").trim();
  if (!t) return "compact";
  if (/^(ok|oui|non|merci|thanks|d'accord|go|yes|no)\.?$/i.test(t) || t.length < 24) return "brief";
  if (intent === "compare" || intent === "advise" || t.length > 280) return "developed";
  if (t.length < 160) return "compact";
  return "developed";
}

export function buildEvidencePacket(retrieval, analysis = {}) {
  const excerpts = Array.isArray(retrieval?.context?.excerpts) ? retrieval.context.excerpts : [];
  const claims = excerpts.slice(0, 8).map((item) => ({
    source_id: String(item?.source_id || "").slice(0, 240),
    text: String(item?.text || "").replace(/\s+/g, " ").trim().slice(0, 1800),
  })).filter(item => item.source_id && item.text);
  return {
    claims,
    source_ids: [...new Set(claims.map(item => item.source_id))],
    current_information_verified: analysis.needsCurrentWeb ? Boolean(retrieval?.context?.web_search?.ok) : null,
    retrieval_available: claims.length > 0,
  };
}

export function critiqueAnswer({ answer, analysis, evidence }) {
  const issues = [];
  const language = detectLanguage(answer);
  if (language && language !== analysis.locale) issues.push("language_mismatch");
  let reviewedAnswer = answer;
  if (analysis.needsCurrentWeb && !evidence.current_information_verified) {
    issues.push("current_information_unverified");
    const warning = analysis.locale === "fr" ? "Attention : ces informations publiques ne sont pas vérifiées comme actuelles." : "Caution: this public information has not been verified as current.";
    if (!reviewedAnswer.startsWith(warning)) reviewedAnswer = `${warning}\n\n${reviewedAnswer}`;
  }
  if (
    (analysis.channel === "whatsapp" || analysis.channel === "short_messages")
    && analysis.attention === "brief"
    && answer.length > 900
  ) {
    issues.push("attention_mismatch");
  }
  if (evidence.retrieval_available && !/\[[^\]]+\]/.test(answer)) issues.push("missing_citations");
  return { answer: reviewedAnswer, accepted: issues.length === 0, issues };
}

export function renderAnswer(answer, options = {}) {
  const text = String(answer || "").trim();
  if (!text) return text;
  const channel = String(options.channel || "");
  const isShort = channel === "whatsapp" || channel === "short_messages";
  if (!isShort) return text;
  // Transport safety only (WhatsApp payload), not a style quota.
  const transportCap = 60000;
  if (text.length <= transportCap) return text;
  return `${text.slice(0, transportCap - 1).replace(/\s+\S*$/, "")}…`;
}

function defaultExtractFallback(retrieval) { return retrieval?.answer || ""; }
function normalizedAnswer(result) {
  if (typeof result === "string") return result.trim();
  return String(result?.answer || result?.text || "").trim();
}
function normalizeSources(sources) { return Array.isArray(sources) ? sources.filter(Boolean).slice(0, 20) : []; }
function recordDiagnostic(target, sink, event) {
  const safe = JSON.parse(JSON.stringify(event));
  target.push(safe);
  sink(safe);
}
function safeErrorFields(error) {
  return {
    error_name: safeToken(error?.name) || "Error", error_code: safeToken(error?.code),
    http_status: Number.isInteger(error?.http_status) ? error.http_status : null,
    timed_out: isTimeoutError(error),
  };
}
function safeResultFields(result) {
  return {
    finish_reason: safeToken(result?.finish_reason), prompt_tokens: safeNumber(result?.prompt_tokens),
    completion_tokens: safeNumber(result?.completion_tokens), reasoning_tokens: safeNumber(result?.reasoning_tokens),
    request_id: /^req_[A-Za-z0-9_-]{1,120}$/.test(String(result?.request_id || "")) ? result.request_id : null,
  };
}
function normalizeCritique(review) {
  if (!review || typeof review !== "object") return { accepted: true, issues: [] };
  return {
    accepted: review.accepted !== false,
    issues: Array.isArray(review.issues) ? review.issues.map(safeToken).filter(Boolean).slice(0, 12) : [],
  };
}
function detectLanguage(text) {
  const value = String(text || "").toLocaleLowerCase();
  if (!value) return null;
  const french = (value.match(/\b(le|la|les|un|une|des|de|du|est|pour|avec|dans|comment|quel|quelle|pourquoi|commencer|peut|faire|explique|simplement)\b/g) || []).length;
  const english = (value.match(/\b(the|a|an|is|are|for|with|in|how|what|why|should|start|can|do|does|explain|simply|first|visitor)\b/g) || []).length;
  if (/[àâçéèêëîïôùûüÿœ]/.test(value)) return "fr";
  if (french > english) return "fr";
  if (english > french) return "en";
  return null;
}
function isTimeoutError(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError" || error?.code === "ETIMEDOUT";
}
function safeToken(value) {
  const token = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,80}$/.test(token) ? token : null;
}
function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
