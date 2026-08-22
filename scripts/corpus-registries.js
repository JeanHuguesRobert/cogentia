#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const SUPPORTED_REGISTRY_SCHEMAS = new Set([
  "cogentia.registry.v0.2",
]);

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", ".cache", ".next", "coverage",
  ".turbo", ".venv", "venv", ".cogentia",
]);

const KNOWN_RELATIONS = new Set([
  "records",
  "projects",
  "federates",
  "indexes",
  "references",
  "derived_from",
  "depends_on",
  "governed_by",
  "operated_by",
  "supersedes",
  "overlaps",
  "exposes_view",
  "must_not_duplicate",
]);

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

export function discoverRegistryFiles(root) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(full);
      } else if (entry.isFile() && entry.name.endsWith(".registry.yaml")) {
        out.push(full);
      }
    }
  };
  visit(root);
  return out.sort();
}

export function loadRegistryFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  let parsed;
  const errors = [];
  const warnings = [];

  try {
    parsed = yaml.load(raw) || {};
  } catch (error) {
    return {
      file,
      parsed: null,
      registry: null,
      errors: [`invalid yaml: ${error.message}`],
      warnings,
    };
  }

  if (!SUPPORTED_REGISTRY_SCHEMAS.has(parsed.schema)) {
    errors.push(`unsupported schema: ${parsed.schema || "missing"}`);
  }

  const registry = parsed.registry && typeof parsed.registry === "object"
    ? { ...parsed.registry, _source_file: file, _raw: parsed }
    : null;

  if (!registry) {
    errors.push("registry must be an object");
    return { file, parsed, registry, errors, warnings };
  }

  if (!registry.id || typeof registry.id !== "string") errors.push("registry.id is required");
  if (!registry.name || typeof registry.name !== "string") errors.push("registry.name is required");
  if (!registry.records || !Array.isArray(registry.records.kinds) || registry.records.kinds.length === 0) {
    errors.push("registry.records.kinds must be a non-empty array");
  }
  if (!registry.facets || typeof registry.facets !== "object") errors.push("registry.facets is required");
  if (!registry.definition_source || typeof registry.definition_source !== "object") {
    errors.push("registry.definition_source is required");
  }
  if (!registry.record_authority || typeof registry.record_authority !== "object") {
    errors.push("registry.record_authority is required");
  }

  if (registry.relations !== undefined && !Array.isArray(registry.relations)) {
    errors.push("registry.relations must be an array when present");
  }

  for (const [index, relation] of (registry.relations || []).entries()) {
    if (!relation || typeof relation !== "object") {
      errors.push(`registry.relations[${index}] must be an object`);
      continue;
    }
    if (!relation.predicate || typeof relation.predicate !== "string") {
      errors.push(`registry.relations[${index}].predicate is required`);
    }
    if (!relation.object || typeof relation.object !== "string") {
      errors.push(`registry.relations[${index}].object is required`);
    }
    if (relation.predicate && !KNOWN_RELATIONS.has(relation.predicate)) {
      warnings.push(`unknown relation predicate preserved: ${relation.predicate}`);
    }
  }

  return { file, parsed, registry, errors, warnings };
}

export function buildRegistryGraph(root) {
  const files = discoverRegistryFiles(root);
  const loaded = files.map(loadRegistryFile);
  const registries = loaded.filter(item => item.registry).map(item => item.registry);
  const errors = loaded.flatMap(item => item.errors.map(error => ({ file: item.file, error })));
  const warnings = loaded.flatMap(item => item.warnings.map(warning => ({ file: item.file, warning })));

  const byId = new Map();
  for (const registry of registries) {
    if (!registry.id) continue;
    const items = byId.get(registry.id) || [];
    items.push(registry);
    byId.set(registry.id, items);
  }

  const relations = registries.flatMap(registry => (registry.relations || []).map((relation, index) => ({
    subject: registry.id,
    predicate: relation.predicate,
    object: relation.object,
    _source_file: registry._source_file,
    _index: index,
  })));

  return {
    schema: "cogentia.registry-graph.v0.1",
    root,
    files,
    registries,
    relations,
    byId,
    errors,
    warnings,
  };
}

function registryIdTargets(graph) {
  return new Set(graph.registries.map(registry => registry.id).filter(Boolean));
}

export function checkRegistryGraph(graph) {
  const issues = [...graph.errors];
  const warnings = [...graph.warnings];

  for (const [id, registries] of graph.byId.entries()) {
    if (registries.length > 1) {
      issues.push({
        type: "duplicate_registry_id",
        id,
        sources: registries.map(item => normalizePath(path.relative(graph.root, item._source_file))),
      });
    }
  }

  const registryTargets = registryIdTargets(graph);
  for (const relation of graph.relations) {
    if (relation.object.startsWith("registry:") && !registryTargets.has(relation.object)) {
      warnings.push({
        type: "unresolved_registry_relation_target",
        subject: relation.subject,
        predicate: relation.predicate,
        object: relation.object,
        source_file: normalizePath(path.relative(graph.root, relation._source_file)),
      });
    }
  }

  return {
    ok: issues.length === 0,
    registry_count: graph.registries.length,
    relation_count: graph.relations.length,
    file_count: graph.files.length,
    issues,
    warnings,
  };
}

export function findRegistry(graph, id) {
  const matches = graph.byId.get(id) || [];
  if (matches.length === 0) return { ok: false, status: "not_found", id, matches: [] };
  if (matches.length > 1) return { ok: false, status: "ambiguous", id, matches };
  return { ok: true, status: "resolved", id, registry: matches[0], matches };
}

export function relatedRegistries(graph, id, { direction = "both" } = {}) {
  const knownDirections = new Set(["in", "out", "both"]);
  if (!knownDirections.has(direction)) {
    return { ok: false, status: "invalid_direction", id, direction, relations: [] };
  }

  const relations = graph.relations.filter(relation => {
    const outgoing = relation.subject === id;
    const incoming = relation.object === id;
    if (direction === "out") return outgoing;
    if (direction === "in") return incoming;
    return outgoing || incoming;
  });

  return {
    ok: true,
    status: "resolved",
    id,
    direction,
    relations,
  };
}

function defaultRoot() {
  return path.resolve(process.env.COGENTIA_CORPUS_ROOT || path.join(process.cwd(), ".."));
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || "check";
  const positional = [];
  const values = {};
  while (args.length) {
    const token = args.shift();
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    values[key] = args.length && !args[0].startsWith("--") ? args.shift() : true;
  }
  return { command, positional, values };
}

function cleanRegistry(registry, root) {
  const { _source_file, _raw, ...clean } = registry;
  return {
    ...clean,
    descriptor_file: normalizePath(path.relative(root, _source_file)),
  };
}

function cleanRelation(relation, root) {
  return {
    subject: relation.subject,
    predicate: relation.predicate,
    object: relation.object,
    source_file: normalizePath(path.relative(root, relation._source_file)),
  };
}

function main() {
  const { command, positional, values } = parseArgs(process.argv.slice(2));
  const root = path.resolve(String(values.root || defaultRoot()));
  const graph = buildRegistryGraph(root);

  if (command === "list") {
    console.log(JSON.stringify({
      ok: graph.errors.length === 0,
      schema: graph.schema,
      root,
      registries: graph.registries.map(item => cleanRegistry(item, root)),
      errors: graph.errors,
      warnings: graph.warnings,
    }, null, 2));
    return;
  }

  if (command === "check") {
    const result = checkRegistryGraph(graph);
    console.log(JSON.stringify({ ...result, root }, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (command === "show") {
    const id = String(values.id || positional[0] || "");
    if (!id) throw new Error("show requires <id> or --id <id>");
    const result = findRegistry(graph, id);
    console.log(JSON.stringify({
      ...result,
      registry: result.registry ? cleanRegistry(result.registry, root) : undefined,
      matches: (result.matches || []).map(item => cleanRegistry(item, root)),
    }, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (command === "related") {
    const id = String(values.id || positional[0] || "");
    const direction = String(values.direction || "both");
    if (!id) throw new Error("related requires <id> or --id <id>");
    const result = relatedRegistries(graph, id, { direction });
    console.log(JSON.stringify({
      ...result,
      relations: (result.relations || []).map(item => cleanRelation(item, root)),
    }, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }

  throw new Error(`Unknown command: ${command}. Use list, check, show, related.`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, match => match.slice(1)));
if (invoked) {
  try { main(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  }
}
