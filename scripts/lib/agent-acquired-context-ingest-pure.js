import { projectDocument } from "./agent-acquired-context-project.js";

function rawMeasurement(text, sha256Prefixed) {
  const exact = String(text ?? "");
  return {
    role: "immutable_raw_measurement",
    text: exact,
    sha256: sha256Prefixed(exact),
    media_type: "text/plain",
  };
}

export function ingestAgentAcquiredContextWith(text, dependencies) {
  const {
    schema,
    sha256Prefixed,
    parseReplyDocument,
    validateAgentAcquiredContext,
  } = dependencies;
  const raw = rawMeasurement(text, sha256Prefixed);
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

  const extensions = [];
  const projection = projectDocument(parsed.data, schema, extensions);
  const report = validateAgentAcquiredContext(projection, schema);

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
