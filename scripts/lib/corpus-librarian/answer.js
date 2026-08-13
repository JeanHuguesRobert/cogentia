/**
 * Cycle C: synthesize a grounded answer from an evidence packet only.
 * Reuses answer-core contracts; does not call tools.
 */

import {
  analyzeQuestion,
  createAnswerEngine,
  renderAnswer,
} from "../agent-jhn-whatsapp/answer-core.js";
import { buildWhatsAppRepresentationMessages } from "../agent-jhn-whatsapp/representation-brief.js";

/** Map librarian packet → answer-core retrieval shape. */
export function packetToRetrieval(packet = {}) {
  const excerpts = Array.isArray(packet.excerpts) ? packet.excerpts : [];
  const sources = (packet.source_ids || excerpts.map(item => item.source_id)).filter(Boolean).map(source_id => ({
    source_id: String(source_id).slice(0, 240),
    title: "",
    url: "",
  }));
  return {
    ok: excerpts.length > 0,
    answer: "",
    sources,
    warnings: Array.isArray(packet.gaps) ? packet.gaps : [],
    context: {
      excerpts: excerpts.map(item => ({
        source_id: String(item.source_id || "").slice(0, 240),
        text: String(item.text || "").replace(/\s+/g, " ").trim().slice(0, 1800),
      })).filter(item => item.source_id && item.text),
      web_search: {
        attempted: Boolean(packet.freshness?.required),
        ok: Boolean(packet.freshness?.verified),
      },
    },
  };
}

export function buildCorpusContextFromEvidence(evidence) {
  return (evidence?.claims || []).map(item => {
    const sourceId = String(item?.source_id || "source").slice(0, 240);
    const text = String(item?.text || "").replace(/\s+/g, " ").trim().slice(0, 1800);
    return text ? `[${sourceId}]\n${text}` : "";
  }).filter(Boolean).join("\n\n").slice(0, 10000);
}

export function createOpenAiPacketSynthesizer(options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) throw new Error("OpenAI API key is required for packet synthesis");
  const model = String(options.model || "gpt-5.6-terra");
  const request = typeof options.fetch === "function" ? options.fetch : globalThis.fetch;
  const timeoutMs = Number.isInteger(options.timeoutMs) ? options.timeoutMs : 20000;
  const maxChars = Number.isInteger(options.maxChars) ? options.maxChars : 1200;

  const channel = String(options.channel || "api");
  return {
    provider: "openai",
    model,
    async synthesize({ text, analysis, evidence, retrieval }) {
      const corpusContext = buildCorpusContextFromEvidence(evidence);
      const useRepresentation = channel === "whatsapp" || options.injectAgentBrief === true;
      const systemMessages = useRepresentation
        ? buildWhatsAppRepresentationMessages(analysis || {}, {
            ...options,
            maxChars,
            currentInformationVerified: Boolean(evidence?.current_information_verified),
          })
        : [{
            role: "system",
            content: [
              "You answer only from the supplied public corpus excerpts.",
              "Lead with a useful answer; do not merely list sources.",
              "Separate established facts from proposals and unknowns.",
              "Support material corpus-grounded claims with exact source_id in square brackets.",
              "Never invent a source_id or claim a project is operational unless an excerpt says so.",
              "If evidence is insufficient, state the precise limit instead of filling the gap.",
              analysis?.needsCurrentWeb && !evidence?.current_information_verified
                ? "The supplied evidence is not verified as current; say so explicitly."
                : "Use each excerpt only within its stated scope.",
              `Intent: ${analysis?.intent || "explain"}. Preferred shape: ${analysis?.answerShape || "direct_answer"}.`,
              `Stay within about ${maxChars} characters. Short paragraphs.`,
              `Reply only in ${analysis?.locale === "fr" ? "French" : "English"}.`,
            ].join(" "),
          }];
      if (useRepresentation) {
        // Grounding still requires corpus excerpts; representation brief is mandate/voice.
        systemMessages[0] = {
          role: "system",
          content: `${systemMessages[0].content} Prefer cited public corpus excerpts for project facts.`,
        };
      }
      const response = await request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...systemMessages,
            ...(corpusContext ? [{ role: "system", content: `Public corpus excerpts:\n${corpusContext}` }] : []),
            { role: "user", content: String(text || "") },
          ],
          max_completion_tokens: 700,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error("OpenAI packet synthesis failed");
        error.code = String(body?.error?.code || body?.error?.type || "OPENAI_HTTP_ERROR").slice(0, 80);
        error.http_status = response.status;
        throw error;
      }
      return {
        answer: String(body?.choices?.[0]?.message?.content || "").trim(),
        model,
        sources: retrieval?.sources || [],
        finish_reason: body?.choices?.[0]?.finish_reason,
        prompt_tokens: body?.usage?.prompt_tokens,
        completion_tokens: body?.usage?.completion_tokens,
      };
    },
  };
}

/**
 * Answer from a librarian evidence packet (no tool calls).
 */
export async function synthesizeFromPacket(packet, options = {}) {
  const question = String(packet?.question || options.question || "").trim();
  const retrieval = packetToRetrieval(packet);
  const analysis = analyzeQuestion({
    text: question,
    locale: packet?.locale || options.locale,
    channel: options.channel || "api",
  });
  const apiKey = String(options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  const synthesizers = [];
  if (apiKey || options.synthesizer) {
    synthesizers.push(options.synthesizer || createOpenAiPacketSynthesizer({
      apiKey,
      model: options.model,
      fetch: options.fetch,
      timeoutMs: options.timeoutMs,
      maxChars: options.maxChars,
      channel: options.channel,
      injectAgentBrief: options.injectAgentBrief,
      agentBriefText: options.agentBriefText,
      agentBriefPath: options.agentBriefPath,
    }));
  }

  const engine = createAnswerEngine({
    analyze: () => analysis,
    retrieve: async () => retrieval,
    synthesizers,
    extractFallback: (ret) => extractiveFromRetrieval(ret, analysis.locale),
  });

  const result = await engine.answer({
    text: question,
    locale: analysis.locale,
    channel: options.channel || "api",
    maxChars: options.maxChars,
  });

  return {
    ...result,
    answer: renderAnswer(result.answer, {
      analysis,
      channel: options.channel || "api",
      maxChars: options.maxChars || 1200,
    }),
    packet_coverage: packet?.coverage || null,
    packet_source_ids: packet?.source_ids || [],
  };
}

function extractiveFromRetrieval(retrieval, locale) {
  const excerpts = retrieval?.context?.excerpts || [];
  if (!excerpts.length) return "";
  const header = locale === "fr"
    ? "D'après le corpus public (extraits) :"
    : "From the public corpus (excerpts):";
  const lines = excerpts.slice(0, 4).map((item, index) => {
    const text = String(item.text || "").replace(/\s+/g, " ").trim().slice(0, 280);
    return `${index + 1}. ${text} [${item.source_id}]`;
  });
  return `${header}\n${lines.join("\n")}`;
}
