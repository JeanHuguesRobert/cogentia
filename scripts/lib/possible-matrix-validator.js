import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const DEFAULT_SCHEMA_PATH = fileURLToPath(
  new URL("../../schemas/possible-matrix.v0.schema.json", import.meta.url),
);

export function loadPossibleMatrixSchema(customPath = null) {
  const schemaPath = customPath ? path.resolve(customPath) : DEFAULT_SCHEMA_PATH;
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeMatches(value, expected) {
  if (expected === "object") return isObject(value);
  if (expected === "array") return Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  if (expected === "string") return typeof value === "string";
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "null") return value === null;
  return true;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pointerGet(root, ref) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Only local JSON Schema references are supported: ${ref}`);
  }
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((value, key) => value?.[key], root);
}

function validateSchemaNode(value, node, rootSchema, at, errors) {
  if (!node || typeof node !== "object") return;

  if (node.$ref) {
    const target = pointerGet(rootSchema, node.$ref);
    if (!target) {
      errors.push(`${at}: unresolved schema reference ${node.$ref}`);
      return;
    }
    validateSchemaNode(value, target, rootSchema, at, errors);
    return;
  }

  if ("const" in node && !deepEqual(value, node.const)) {
    errors.push(`${at}: expected constant ${JSON.stringify(node.const)}`);
  }

  if (Array.isArray(node.enum) && !node.enum.some((candidate) => deepEqual(value, candidate))) {
    errors.push(`${at}: value ${JSON.stringify(value)} is not in the allowed enum`);
  }

  if (node.type && !typeMatches(value, node.type)) {
    errors.push(`${at}: expected type ${node.type}`);
    return;
  }

  if (typeof value === "string") {
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      errors.push(`${at}: value does not match pattern ${node.pattern}`);
    }
    if (Number.isInteger(node.minLength) && value.length < node.minLength) {
      errors.push(`${at}: expected minimum length ${node.minLength}`);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof node.minimum === "number" && value < node.minimum) {
      errors.push(`${at}: expected minimum ${node.minimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(node.minItems) && value.length < node.minItems) {
      errors.push(`${at}: expected at least ${node.minItems} items`);
    }
    if (node.uniqueItems) {
      const seen = new Set();
      value.forEach((item, index) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) errors.push(`${at}[${index}]: duplicate item violates uniqueItems`);
        seen.add(key);
      });
    }
    if (node.items) {
      value.forEach((item, index) => validateSchemaNode(item, node.items, rootSchema, `${at}[${index}]`, errors));
    }
  }

  if (isObject(value)) {
    for (const required of node.required || []) {
      if (!(required in value)) errors.push(`${at}: missing required property "${required}"`);
    }

    const properties = node.properties || {};
    for (const [key, child] of Object.entries(properties)) {
      if (key in value) validateSchemaNode(value[key], child, rootSchema, `${at}.${key}`, errors);
    }

    if (node.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) errors.push(`${at}: unexpected property "${key}"`);
      }
    }
  }
}

export function validateAgainstPossibleMatrixSchema(data, schema) {
  const errors = [];
  validateSchemaNode(data, schema, schema, "$", errors);
  return errors;
}

function duplicates(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

function detectPossibleCycles(possibles) {
  const parents = new Map(possibles.map((node) => [node.id, node.parent_ids || []]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function walk(id, stack) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;

    visiting.add(id);
    stack.push(id);
    for (const parent of parents.get(id) || []) {
      if (parents.has(parent)) walk(parent, stack);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of parents.keys()) walk(id, []);
  return cycles;
}

export function validatePossibleMatrixGraph(data) {
  const errors = [];
  const warnings = [];
  const possibles = Array.isArray(data?.possible_registry) ? data.possible_registry : [];
  const events = Array.isArray(data?.events) ? data.events : [];

  const possibleIds = possibles.map((node) => node?.id).filter(Boolean);
  const eventIds = events.map((event) => event?.id).filter(Boolean);
  const possibleSet = new Set(possibleIds);

  for (const id of duplicates(possibleIds)) errors.push(`duplicate possible id: ${id}`);
  for (const id of duplicates(eventIds)) errors.push(`duplicate event id: ${id}`);

  possibles.forEach((node) => {
    for (const parent of node?.parent_ids || []) {
      if (!possibleSet.has(parent)) errors.push(`${node.id}: unresolved parent possible id ${parent}`);
    }
  });

  events.forEach((event, index) => {
    if (event?.sequence !== index + 1) {
      errors.push(`${event?.id || `events[${index}]`}: sequence must be ${index + 1}, got ${event?.sequence}`);
    }
    for (const id of event?.possible_ids || []) {
      if (!possibleSet.has(id)) errors.push(`${event.id}: unresolved possible id ${id}`);
    }
    for (const id of event?.descendant_possible_ids || []) {
      if (!possibleSet.has(id)) errors.push(`${event.id}: unresolved descendant possible id ${id}`);
    }
  });

  const declaredDynamics = new Set(data?.dynamic_vocabulary?.dynamics || []);
  const declaredScopeDelta = new Set(data?.dynamic_vocabulary?.scope_delta || []);
  events.forEach((event) => {
    for (const dynamic of event?.dynamics || []) {
      if (!declaredDynamics.has(dynamic)) errors.push(`${event.id}: dynamic "${dynamic}" is not declared in dynamic_vocabulary.dynamics`);
    }
    if (event?.scope_delta && !declaredScopeDelta.has(event.scope_delta)) {
      errors.push(`${event.id}: scope_delta "${event.scope_delta}" is not declared in dynamic_vocabulary.scope_delta`);
    }
  });

  const cycles = detectPossibleCycles(possibles);
  for (const cycle of cycles) errors.push(`possible graph cycle: ${cycle.join(" -> ")}`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      events: events.length,
      possibles: possibles.length,
    },
    graph: {
      ok: errors.length === 0,
      cycles,
    },
  };
}

function rawGitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

function gitRootFor(file) {
  try {
    return execFileSync("git", ["-C", path.dirname(file), "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function computeGitBlobSha(file) {
  const absolute = path.resolve(file);
  const root = gitRootFor(absolute);

  if (root) {
    try {
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      return execFileSync(
        "git",
        ["-C", root, "hash-object", "--path", relative, absolute],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    } catch {
      // Fall back to the exact bytes below.
    }
  }

  return rawGitBlobSha(fs.readFileSync(absolute));
}

function resolveProjectionDocument(matrixFile, documentRef) {
  if (path.isAbsolute(documentRef)) return documentRef;
  const root = gitRootFor(matrixFile);
  if (root) return path.resolve(root, documentRef);
  return path.resolve(path.dirname(matrixFile), documentRef);
}

export function verifyPossibleMatrixProjection(data, matrixFile, { checkSource = true } = {}) {
  if (!checkSource) return { ok: true, status: "skipped", source: null, expected_blob_sha: null, actual_blob_sha: null };

  const documentRef = data?.source_projection?.document;
  const expected = data?.source_projection?.blob_sha;
  if (!documentRef || !expected) {
    return { ok: false, status: "invalid_projection_metadata", source: null, expected_blob_sha: expected || null, actual_blob_sha: null };
  }

  const source = resolveProjectionDocument(path.resolve(matrixFile), documentRef);
  if (!fs.existsSync(source)) {
    return { ok: false, status: "source_missing", source, expected_blob_sha: expected, actual_blob_sha: null };
  }

  const actual = computeGitBlobSha(source);
  return {
    ok: actual === expected,
    status: actual === expected ? "verified" : "source_blob_mismatch",
    source,
    expected_blob_sha: expected,
    actual_blob_sha: actual,
  };
}

export function validatePossibleMatrixFile(file, options = {}) {
  const matrixFile = path.resolve(file);
  const schema = loadPossibleMatrixSchema(options.schemaPath || null);
  const errors = [];
  const warnings = [];
  let data = null;

  if (!fs.existsSync(matrixFile)) {
    return {
      ok: false,
      file: matrixFile,
      schema_id: schema.$id || null,
      errors: [`file not found: ${matrixFile}`],
      warnings,
      counts: { events: 0, possibles: 0 },
      graph: { ok: false, cycles: [] },
      projection: { ok: false, status: "not_checked", source: null, expected_blob_sha: null, actual_blob_sha: null },
    };
  }

  try {
    data = yaml.load(fs.readFileSync(matrixFile, "utf8"));
  } catch (error) {
    return {
      ok: false,
      file: matrixFile,
      schema_id: schema.$id || null,
      errors: [`YAML parse error: ${error.message}`],
      warnings,
      counts: { events: 0, possibles: 0 },
      graph: { ok: false, cycles: [] },
      projection: { ok: false, status: "not_checked", source: null, expected_blob_sha: null, actual_blob_sha: null },
    };
  }

  if (!isObject(data)) {
    errors.push("matrix root must be a YAML object/mapping");
  } else {
    errors.push(...validateAgainstPossibleMatrixSchema(data, schema));
  }

  const graph = isObject(data)
    ? validatePossibleMatrixGraph(data)
    : { ok: false, errors: [], warnings: [], counts: { events: 0, possibles: 0 }, graph: { ok: false, cycles: [] } };

  errors.push(...graph.errors);
  warnings.push(...graph.warnings);

  const projection = isObject(data)
    ? verifyPossibleMatrixProjection(data, matrixFile, { checkSource: options.checkSource !== false })
    : { ok: false, status: "not_checked", source: null, expected_blob_sha: null, actual_blob_sha: null };

  if (!projection.ok) errors.push(`projection: ${projection.status}`);

  return {
    ok: errors.length === 0,
    file: matrixFile,
    schema_id: schema.$id || null,
    errors,
    warnings,
    counts: graph.counts,
    graph: graph.graph,
    projection,
  };
}

export function formatPossibleMatrixValidation(report) {
  const mark = report.ok ? "✓" : "✗";
  const lines = [
    `${mark} Possible Matrix validation: ${report.ok ? "valid" : "invalid"}`,
    `  file: ${report.file}`,
    `  schema: ${report.schema_id || "unknown"}`,
    `  events: ${report.counts?.events ?? 0}`,
    `  possibles: ${report.counts?.possibles ?? 0}`,
    `  graph: ${report.graph?.ok ? "ok" : "invalid"}`,
    `  projection: ${report.projection?.status || "not_checked"}`,
  ];

  if (report.errors?.length) {
    lines.push("  errors:");
    for (const error of report.errors) lines.push(`    - ${error}`);
  }
  if (report.warnings?.length) {
    lines.push("  warnings:");
    for (const warning of report.warnings) lines.push(`    - ${warning}`);
  }
  return lines.join("\n");
}
