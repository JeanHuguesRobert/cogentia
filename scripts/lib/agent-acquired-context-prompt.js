import * as yaml from "js-yaml";
import { validateAgentAcquiredContext } from "./agent-acquired-context.js";

export const PASTE_START = "<!-- BEGIN_PASTE -->";
export const PASTE_END = "<!-- END_PASTE -->";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return fail(["Reply is empty. Send one YAML document and nothing else."]);
  }

  let body = trimmed;
  const fenced = trimmed.match(/^```(?:yaml|yml)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/);
  if (fenced) {
    body = fenced[1];
  } else if (trimmed.startsWith("```")) {
    return fail(["Reply uses a code fence that is not a single YAML block. Send one YAML document and nothing else."]);
  }

  let docs;
  try {
    docs = yaml.loadAll(body);
  } catch (error) {
    return fail([`YAML parse error: ${error.message}. Send one YAML document and nothing else.`]);
  }

  const meaningful = docs.filter((doc) => doc !== null && doc !== undefined);
  if (meaningful.length !== 1 || !isObject(meaningful[0])) {
    return fail(["Reply must be one YAML object for cogentia.agent-acquired-context.v0, not prose, a list, or several documents."]);
  }

  const report = validateAgentAcquiredContext(meaningful[0]);
  if (report.errors.some((error) => error.includes("unexpected property"))) {
    report.errors.push("Remove properties that are not in cogentia.agent-acquired-context.v0. Do not add completeness or truth flags.");
  }
  return { ...report, data: meaningful[0] };
}
