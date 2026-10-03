import { validateAgentAcquiredContext } from "./agent-acquired-context.js";
import { parseReplyDocument } from "./agent-acquired-context-parse.js";

export { parseReplyDocument };
export const PASTE_START = "<!-- BEGIN_PASTE -->";
export const PASTE_END = "<!-- END_PASTE -->";

export function extractPastePrompt(markdown) {
  const start = markdown.indexOf(PASTE_START);
  const end = markdown.indexOf(PASTE_END);
  if (start < 0 || end < 0 || end <= start) {
    return {
      ok: false,
      prompt: null,
      after: "",
      errors: ["prompt file is missing the paste markers"],
    };
  }
  const prompt = markdown.slice(start + PASTE_START.length, end).trim();
  const after = markdown.slice(end + PASTE_END.length);
  if (!prompt) {
    return { ok: false, prompt: null, after, errors: ["paste prompt is empty"] };
  }
  return { ok: true, prompt, after, errors: [] };
}

function fail(errors) {
  return {
    ok: false,
    errors,
    warnings: [],
    data: null,
    kind: null,
    layer: null,
    counts: { items: 0 },
  };
}

export function readAgentAcquiredContextReply(text) {
  const parsed = parseReplyDocument(text);
  if (!parsed.ok) return fail(parsed.errors);

  const report = validateAgentAcquiredContext(parsed.data);
  if (report.errors.some((error) => error.includes("unexpected property"))) {
    report.errors.push("Remove properties that are not in cogentia.agent-acquired-context.v0. Do not add completeness or truth flags.");
  }
  return { ...report, data: parsed.data };
}
