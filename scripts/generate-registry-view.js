#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { buildRegistryGraph, checkRegistryGraph } from "./corpus-registries.js";

const root = path.resolve(process.env.COGENTIA_CORPUS_ROOT || path.join(process.cwd(), ".."));
const output = path.resolve(process.argv[2] || path.join(process.cwd(), "research", "registries.md"));
const graph = buildRegistryGraph(root);
const check = checkRegistryGraph(graph);

function values(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value == null ? "—" : String(value);
}

const lines = [
  "---",
  'title: "Registries — All Tracked Repositories"',
  "document_role: index",
  'document_kind: "registry-graph-view"',
  "visibility: public",
  "lifecycle_state: active",
  'update_policy: "UP-GENERATED-REBUILD"',
  'generated_by: "scripts/generate-registry-view.js"',
  "---",
  "",
  "# Registries — All Tracked Repositories",
  "",
  "Generated projection of distributed `*.registry.yaml` declarations. Source-local descriptors and their legitimate record authorities remain authoritative; this view is reconstructible.",
  "",
  `- Registries: **${graph.registries.length}**`,
  `- Relations: **${graph.relations.length}**`,
  `- Descriptor files: **${graph.files.length}**`,
  `- Check: **${check.ok ? "PASS" : "FAIL"}**`,
  "",
  "## Registry matrix",
  "",
  "| Registry | Class | Record kinds | Authority | Topology | Temporality | Visibility |",
  "|---|---|---|---|---|---|---|",
];

for (const r of [...graph.registries].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
  lines.push(`| \`${r.id}\` — ${r.name} | ${values(r.registry_class)} | ${values(r.records?.kinds)} | ${values(r.facets?.authority)} | ${values(r.facets?.topology)} | ${values(r.facets?.temporality)} | ${values(r.facets?.visibility)} |`);
}

lines.push("", "## Typed relations", "");
for (const rel of graph.relations) lines.push(`- \`${rel.subject}\` — **${rel.predicate}** → \`${rel.object}\``);
if (!graph.relations.length) lines.push("- (none)");

lines.push("", "## Query surfaces", "", "```text", "node scripts/corpus-registries.js list", "node scripts/corpus-registries.js check", "node scripts/corpus-registries.js show registry:<id>", "node scripts/corpus-registries.js related registry:<id>", "```");
lines.push("", "MCP exposes the equivalent read-only tools: `cogentia_registries_list`, `cogentia_registries_check`, `cogentia_registry_show`, `cogentia_registry_related`.", "");

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, lines.join("\n"), "utf8");
console.log(JSON.stringify({ ok: check.ok, output, registries: graph.registries.length, relations: graph.relations.length, issues: check.issues, warnings: check.warnings }, null, 2));
if (!check.ok) process.exitCode = 2;
