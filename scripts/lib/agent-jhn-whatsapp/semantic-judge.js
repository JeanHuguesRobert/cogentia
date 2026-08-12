export function createOpenAiSemanticJudge(options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) throw new Error("OpenAI API key is required");
  const model = String(options.model || "gpt-5.6-sol");
  const request = options.fetch || globalThis.fetch;
  return {
    model,
    async judge(input = {}) {
      const response = await request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: rubric() },
            { role: "user", content: JSON.stringify(input) },
          ],
          max_completion_tokens: 1000,
        }),
        signal: AbortSignal.timeout(options.timeoutMs || 30000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw safeError(body, response.status);
      const content = String(body?.choices?.[0]?.message?.content || "").trim();
      try { return normalize(JSON.parse(content)); }
      catch { throw Object.assign(new Error("Semantic judge returned invalid JSON"), { code: "INVALID_JUDGE_JSON" }); }
    },
  };
}

function rubric() {
  return [
    "You are an independent pairwise evaluator for a public-corpus-grounded WhatsApp assistant.",
    "The candidates are anonymous. Judge only the supplied question, expected concepts, public evidence, and answers.",
    "Score each candidate from 1 to 5 on: correctness, relevance, grounding, epistemic_caution, whatsapp_usability, language.",
    "Grounding includes using supplied source_ids for material corpus claims. Penalize invented, unsupported, or falsely current claims.",
    "Choose winner A, B, or tie. Mark critical_regression when a candidate is dangerously false, wrong-language, empty, or materially ungrounded.",
    "Return JSON only: {winner,confidence,critical_regression:{A:boolean,B:boolean},scores:{A:{...},B:{...}},reasons:[up to 3 concise strings]}.",
  ].join("\n");
}
function normalize(value) {
  const dimensions = ["correctness", "relevance", "grounding", "epistemic_caution", "whatsapp_usability", "language"];
  const scores = {};
  for (const side of ["A", "B"]) {
    scores[side] = {};
    for (const dimension of dimensions) scores[side][dimension] = bounded(value?.scores?.[side]?.[dimension], 1, 5);
  }
  return {
    winner: ["A", "B", "tie"].includes(value?.winner) ? value.winner : "tie",
    confidence: bounded(value?.confidence, 0, 1),
    critical_regression: { A: Boolean(value?.critical_regression?.A), B: Boolean(value?.critical_regression?.B) },
    scores,
    reasons: Array.isArray(value?.reasons) ? value.reasons.map(x => String(x).slice(0, 400)).slice(0, 3) : [],
  };
}
function bounded(value, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min; }
function safeError(body, status) {
  const error = new Error("OpenAI semantic judge request failed");
  error.code = /^[A-Za-z0-9_.-]{1,80}$/.test(String(body?.error?.code || "")) ? body.error.code : "OPENAI_HTTP_ERROR";
  error.http_status = status;
  return error;
}
