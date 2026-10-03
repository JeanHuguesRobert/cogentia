import {
  loadAgentAcquiredContextSchema,
  sha256Prefixed,
  validateAgentAcquiredContext,
} from "./agent-acquired-context.js";
import { parseReplyDocument } from "./agent-acquired-context-prompt.js";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pointerGet(root, ref) {
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((value, key) => value?.[key], root);
}

function resolveNode(node, root, value) {
  let current = node;
  if (current?.$ref) current = pointerGet(root, current.$ref);
  if (!Array.isArray(current?.oneOf)) return current;

  if (isObject(value) && typeof value.kind === "string") {
    for (const branch of current.oneOf) {
      const resolved = branch.$ref ? pointerGet(root, branch.$ref) : branch;
      if (resolved?.properties?.kind?.const === value.kind) return resolved;
    }
  }
  return null;
}

function copyValue(value) {
  return value === undefined ? value : structuredClone(value);
}

function projectValue(value, node, root, at, extensions) {
  const schema = resolveNode(node, root, value);
  if (!schema) return copyValue(value);

  if (Array.isArray(value)) {
    if (!schema.items) return value.map((item) => copyValue(item));
    return value.map((item, index) => projectValue(item, schema.items, root, `${at}[${index}]`, extensions));
  }

  if (!isObject(value) || !schema.properties) return copyValue(value);

  const projected = {};
  for (const [key, child] of Object.entries(value)) {
    if (!(key in schema.properties)) {
      if (schema.additionalProperties === false) {
        extensions.push({ path: `${at}.${key}`, value: copyValue(child) });
        continue;
      }
    }
    projected[key] = projectValue(child, schema.properties[key] || {}, root, `${at}.${key}`, extensions);
  }
  return projected;
}

function rawMeasurement(text) {
  const exact = String(text ?? "");
  return {
    role: "immutable_raw_measurement",
    text: exact,
    sha256: sha256Prefixed(exact),
    media_type: "text/plain",
  };
}

export function ingestAgentAcquiredContext(text) {
  const raw = rawMeasurement(text);
  const parsed = parseReplyDocument(text);
  if (!parsed.ok) {
    return {
      schema_version: "cogentia.agent-acquired-context.v0",
      kind: "agent_acquired_context_ingestion",
      ok: false,
      raw,
      normalized: null,
      extensions: [],
      diagnostics: parsed.errors,
      warnings: [],
    };
  }

  const schema = loadAgentAcquiredContextSchema();
  const extensions = [];
  const projection = projectValue(parsed.data, schema, schema, "$", extensions);
  const report = validateAgentAcquiredContext(projection);

  return {
    schema_version: "cogentia.agent-acquired-context.v0",
    kind: "agent_acquired_context_ingestion",
    ok: report.ok,
    raw,
    normalized: report.ok ? projection : null,
    extensions,
    diagnostics: report.errors,
    warnings: report.warnings,
  };
}
