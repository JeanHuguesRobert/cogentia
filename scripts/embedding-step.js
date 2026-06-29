#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COGENTIA_DIR = path.resolve(__dirname, "..");
const REGISTRY_PATH = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
const REGISTRY_ROOT = REGISTRY_PATH
  ? (fs.existsSync(REGISTRY_PATH) && fs.statSync(REGISTRY_PATH).isDirectory() ? REGISTRY_PATH : path.dirname(REGISTRY_PATH))
  : COGENTIA_DIR;
const EMBEDDINGS_RESULT_DIR = process.env.COGENTIA_EMBEDDINGS_RESULTS_DIR || path.join(REGISTRY_ROOT, ".cogentia");

function pendingResultFiles() {
  if (!fs.existsSync(EMBEDDINGS_RESULT_DIR)) return [];
  return fs.readdirSync(EMBEDDINGS_RESULT_DIR)
    .filter(file => file.startsWith("embeddings_result_") && file.endsWith(".json"))
    .filter(file => !file.endsWith("_import.json") && !file.endsWith("_imported.json"))
    .sort();
}

function optionValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function integerOption(args, name, fallback, min, max) {
  const parsed = Number.parseInt(optionValue(args, name, ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function execNode(args) {
  console.log(`\n$ node ${args.join(" ")}`);
  execFileSync(process.execPath, args, {
    cwd: COGENTIA_DIR,
    env: process.env,
    stdio: "inherit",
    timeout: 10 * 60 * 1000,
  });
}

function buildWorkerArgs(options) {
  const workerArgs = ["scripts/smart-embed-worker.js", "run"];
  if (options.id) workerArgs.push("--id", options.id);
  if (options.maxChunks > 0) workerArgs.push("--max-chunks", String(options.maxChunks));
  if (options.maxBatches > 0) workerArgs.push("--max-batches", String(options.maxBatches));
  return workerArgs;
}

function importPendingResults() {
  execNode(["scripts/import-embeddings.js", "--dry-run"]);
  execNode(["scripts/import-embeddings.js"]);
}

function usage() {
  console.log(`
Usage:
  node scripts/embedding-step.js [--id <continuation_id>] [--max-chunks <n>] [--max-batches <n>] [--no-import] [--no-monitor]

Runs one resumable embedding step:
  1. import pending result files first, if any exist
  2. otherwise generate a bounded batch through smart-embed-worker
  3. validate and import the generated result
  4. print the embedding monitor

Defaults to --max-chunks 1 to keep quota use explicit and small.
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args[0] === "help") {
    usage();
    return;
  }

  const options = {
    id: optionValue(args, "--id", ""),
    maxChunks: integerOption(args, "--max-chunks", 1, 0, 1000000),
    maxBatches: integerOption(args, "--max-batches", 0, 0, 10000),
    importResults: !args.includes("--no-import"),
    monitor: !args.includes("--no-monitor"),
  };

  console.log("Embedding step");
  console.log(`State/result dir: ${EMBEDDINGS_RESULT_DIR}`);
  if (options.id) console.log(`Continuation: ${options.id}`);
  console.log(`Limit: ${options.maxChunks > 0 ? `${options.maxChunks} chunk(s)` : "all selected chunks"}${options.maxBatches > 0 ? `, ${options.maxBatches} batch(es)` : ""}`);

  const alreadyPending = pendingResultFiles();
  if (alreadyPending.length) {
    console.log(`\nFound ${alreadyPending.length} pending result file(s); importing before generating more embeddings.`);
  } else {
    execNode(buildWorkerArgs(options));
  }

  const pending = pendingResultFiles();
  if (pending.length && options.importResults) {
    importPendingResults();
  } else if (pending.length) {
    console.log(`\nPending result file(s) left unimported because --no-import was set: ${pending.join(", ")}`);
  } else {
    console.log("\nNo pending result files to import.");
  }

  if (options.monitor) {
    execNode(["scripts/monitor-embeddings.js"]);
  }
}

try {
  main();
} catch (error) {
  console.error(`\nEmbedding step failed: ${error.message}`);
  process.exit(1);
}
