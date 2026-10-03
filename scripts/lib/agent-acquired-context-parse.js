import * as yaml from "js-yaml";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseReplyDocument(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return { ok: false, data: null, errors: ["Reply is empty. Send one YAML document and nothing else."] };
  }

  let body = trimmed;
  const fenced = trimmed.match(/^```(?:yaml|yml|json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/);
  if (fenced) {
    body = fenced[1];
  } else if (trimmed.startsWith("```")) {
    return {
      ok: false,
      data: null,
      errors: ["Reply uses a code fence that is not a single YAML block. Send one YAML document and nothing else."],
    };
  }

  let docs;
  try {
    docs = yaml.loadAll(body);
  } catch (error) {
    const label = trimmed.startsWith("{") || trimmed.startsWith("[") ? "Malformed JSON" : "YAML parse error";
    return {
      ok: false,
      data: null,
      errors: [`${label}: ${error.message}. Send one YAML or JSON document and nothing else.`],
    };
  }

  const meaningful = docs.filter((doc) => doc !== null && doc !== undefined);
  if (meaningful.length !== 1 || !isObject(meaningful[0])) {
    return {
      ok: false,
      data: null,
      errors: ["Reply must be one YAML object for cogentia.agent-acquired-context.v0, not prose, a list, or several documents."],
    };
  }

  return { ok: true, data: meaningful[0], errors: [] };
}
