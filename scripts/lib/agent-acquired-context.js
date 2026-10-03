import { createHash } from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { validateAgentAcquiredContextDocument } from "./agent-acquired-context-validate.js";

const SCHEMA_PATH = fileURLToPath(
  new URL("../../schemas/agent-acquired-context.v0.schema.json", import.meta.url),
);

export function loadAgentAcquiredContextSchema(customPath = null) {
  const schemaPath = customPath ? customPath : SCHEMA_PATH;
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

export function sha256Prefixed(text) {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export function validateAgentAcquiredContext(data, schema = loadAgentAcquiredContextSchema()) {
  return validateAgentAcquiredContextDocument(data, schema, sha256Prefixed);
}

export function validateAgentAcquiredContextFile(file, options = {}) {
  const schema = loadAgentAcquiredContextSchema(options.schemaPath || null);
  if (!fs.existsSync(file)) {
    return {
      ok: false,
      file,
      schema_id: schema.$id || null,
      errors: [`file not found: ${file}`],
      warnings: [],
      kind: null,
      layer: null,
      counts: { items: 0 },
    };
  }

  let data = null;
  try {
    data = yaml.load(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return {
      ok: false,
      file,
      schema_id: schema.$id || null,
      errors: [`YAML parse error: ${error.message}`],
      warnings: [],
      kind: null,
      layer: null,
      counts: { items: 0 },
    };
  }

  const report = validateAgentAcquiredContext(data, schema);
  return { file, schema_id: schema.$id || null, ...report };
}
