#!/usr/bin/env node
// Read-only dogfooding of SleepCycle signals; no source mutations or queue writes.
import path from "node:path";
import { adviseFromQueue } from "./lib/factorization-advice.js";
const args = process.argv.slice(2);
const arg = (k, fallback) => { const i = args.indexOf(k); return i < 0 ? fallback : args[i + 1]; };
const root = path.resolve(arg("--corpus-root", path.join(process.cwd(), "..")));
const queue = path.resolve(arg("--queue", path.join(process.cwd(), ".cogentia", "sleep_cycle_review_queue.jsonl")));
const limit = Number(arg("--limit", "10"));
if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("--limit must be in [1,100]");
console.log(JSON.stringify({ mode: "read_only", corpus_root: root, results: adviseFromQueue({ corpusRoot: root, queueFile: queue, limit }) }, null, 2));
