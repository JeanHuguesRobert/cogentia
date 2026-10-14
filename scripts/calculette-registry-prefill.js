#!/usr/bin/env node
/** Reconstruct Janus public registry snapshot without altering source registries. */
import path from "node:path";
import { buildRegistryGraph } from "./corpus-registries.js";
import { buildJanusSeed } from "./lib/calculette-janus-seed.js";
import { importRegistrySnapshot } from "./lib/calculette-registry-import.js";
const args = process.argv.slice(2);
const val = (key, fallback) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : fallback; };
const root = path.resolve(val("--root", process.env.COGENTIA_CORPUS_ROOT || path.join(process.cwd(), "..")));
const asOf = val("--as-of", new Date().toISOString());
const graph = buildRegistryGraph(root);
if (graph.errors.length) throw new Error("Invalid source registry graph");
const imported = importRegistrySnapshot(graph, { observedAt: asOf });
const projection = buildJanusSeed({ ...imported, asOf });
console.log(JSON.stringify({
  ...projection, coverage: imported.coverage, source_root: root,
  skipped_source_descriptors: imported.skipped_count, persisted: false,
  provenance_rule: "observed_at is bootstrap snapshot time, never presumed historical start",
},null,2));
