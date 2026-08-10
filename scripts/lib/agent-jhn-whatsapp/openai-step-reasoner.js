/** OpenAI adapter for the provider-neutral governed step harness. */

export function createOpenAiStepReasoner(options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) throw new Error("OpenAI API key is required");
  const model = String(options.model || "gpt-5.6-terra");
  const request = typeof options.fetch === "function" ? options.fetch : globalThis.fetch;
  const timeoutMs = boundedInteger(options.timeoutMs, 15000, 1000, 120000);

  return {
    provider: "openai",
    model,
    async nextStep(state = {}) {
      const response = await request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: JSON.stringify(reasonerView(state)) },
          ],
          max_completion_tokens: 700,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error("OpenAI step reasoner request failed");
        error.name = "ProviderError";
        error.code = safeName(body?.error?.code || body?.error?.type) || "OPENAI_HTTP_ERROR";
        error.http_status = response.status;
        throw error;
      }
      const content = String(body?.choices?.[0]?.message?.content || "").trim();
      try {
        return normalizeProviderStep(JSON.parse(stripFence(content)));
      } catch {
        const error = new Error("OpenAI step reasoner returned invalid JSON");
        error.name = "ProviderError";
        error.code = "INVALID_STEP_JSON";
        throw error;
      }
    },
  };
}

function systemPrompt() {
  return [
    "You are the replaceable reasoner inside a governed agent harness.",
    "Choose exactly one next step. The harness, not you, authorizes and executes capabilities.",
    "Return one JSON object only; never return markdown or hidden chain-of-thought.",
    "Use a capability only when its result can materially improve the answer.",
    "Never invent a capability. A denied observation means choose another step or clarify.",
    "Do not propose external writes unless the user explicitly requested that act.",
    "Kinds and fields:",
    '{"kind":"capability_call","capability":"registered.name","input":{}}',
    '{"kind":"answer","answer":"final answer"}',
    '{"kind":"clarify","question":"necessary question"}',
    '{"kind":"reason","note":"brief non-sensitive progress summary"}',
    '{"kind":"stop","reason":"safe_machine_token"}',
  ].join("\n");
}

function reasonerView(state) {
  return {
    input: state.input || {},
    observations: Array.isArray(state.observations) ? state.observations.slice(-8) : [],
    prior_steps: Array.isArray(state.steps) ? state.steps.slice(-8).map(item => ({
      sequence: item?.step?.sequence,
      kind: item?.step?.kind,
      capability: item?.step?.capability,
      status: item?.result?.status,
    })) : [],
    capabilities: Array.isArray(state.capabilities) ? state.capabilities.map(item => ({
      name: item.name,
      description: item.description,
      inputSchema: item.inputSchema,
      risk: item.risk,
      kind: item.kind,
      costUnits: item.costUnits,
      resultVisibility: item.resultVisibility,
    })) : [],
    bounds: state.bounds || {},
    usage: { nextSequence: state.nextSequence, capabilityCalls: state.capabilityCalls, costUnits: state.costUnits },
  };
}

function normalizeProviderStep(value = {}) {
  const kind = String(value.kind || "");
  if (kind === "capability_call") return { kind, capability: String(value.capability || ""), input: objectOrEmpty(value.input) };
  if (kind === "answer") return { kind, answer: String(value.answer || "") };
  if (kind === "clarify") return { kind, question: String(value.question || "") };
  if (kind === "reason") return { kind, note: String(value.note || "").slice(0, 500) };
  if (kind === "stop") return { kind, reason: safeName(value.reason) || "reasoner_stop" };
  throw new Error("Invalid step kind");
}

function stripFence(value) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}
function objectOrEmpty(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function safeName(value) {
  const name = String(value || "").trim();
  return /^[A-Za-z0-9_.:-]{1,120}$/.test(name) ? name : null;
}
function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
