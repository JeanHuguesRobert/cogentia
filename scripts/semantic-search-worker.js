#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { createAiRouterClient } from "./lib/ai-router-client.js";
import { loadEnvFile } from "./lib/embedding-providers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COGENTIA_DIR = path.resolve(process.env.COGENTIA_DIR || path.resolve(__dirname, ".."));
const REGISTRY_PATH = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
const REGISTRY_ROOT = REGISTRY_PATH
  ? (fs.existsSync(REGISTRY_PATH) && fs.statSync(REGISTRY_PATH).isDirectory() ? REGISTRY_PATH : path.dirname(REGISTRY_PATH))
  : COGENTIA_DIR;
const COGENTIA_STATE_DIR = process.env.COGENTIA_STATE_DIR || path.join(REGISTRY_ROOT, ".cogentia");
const CONTINUATIONS_DIR = process.env.CONTINUATIONS_DIR || path.join(COGENTIA_STATE_DIR, "continuations");
const RESULTS_DIR = process.env.COGENTIA_SEMANTIC_RESULTS_DIR || COGENTIA_STATE_DIR;

function continuationPath(id) {
  return path.join(CONTINUATIONS_DIR, `${id}.json`);
}

function readContinuation(id) {
  const full = continuationPath(id);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function activeSemanticContinuations(options = {}) {
  if (!fs.existsSync(CONTINUATIONS_DIR)) return [];
  return fs.readdirSync(CONTINUATIONS_DIR)
    .filter(file => file.endsWith(".json"))
    .map(file => readContinuation(file.replace(/\.json$/i, "")))
    .filter(cont => cont && cont.status === "active" && cont.kind === "semantic-search")
    .filter(cont => !options.id || cont.id === options.id)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
}

function loadCredentialHints(profile) {
  const credentials = profile?.credentials || {};
  const envFile = credentials.env_file_resolved || credentials.env_file || process.env.COGENTIA_EMBEDDINGS_ENV_FILE || "";
  if (!envFile) return;
  const loaded = loadEnvFile(envFile);
  if (loaded.path) {
    console.log(`  Credentials: loaded environment from ${loaded.path} (${loaded.loaded} variable(s), values hidden)`);
  }
}

async function createQueryEmbedding(query, profile) {
  loadCredentialHints(profile);
  const model = profile?.model_name || process.env.COGENTIA_QUERY_EMBEDDING_MODEL || "text-embedding-3-small";
  const dimensions = Number(profile?.dimensions || process.env.COGENTIA_QUERY_EMBEDDING_DIMENSIONS || 0) || null;
  const payload = { model, input: query };
  if (dimensions) payload.dimensions = dimensions;
  const response = await createAiRouterClient().embeddings(payload);
  if (!response.ok) {
    throw new Error(`${response.error || "query_embedding_failed"}: ${response.message || response.status}`);
  }
  const embedding = response.body?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("AI router did not return data[0].embedding");
  }
  if (dimensions && embedding.length !== dimensions) {
    throw new Error(`query embedding dimensions ${embedding.length} do not match expected ${dimensions}`);
  }
  return {
    query_embedding: embedding,
    provider: profile?.provider || "unknown",
    model_name: model,
    dimensions: embedding.length,
  };
}

function writeResult(continuation, queryPayload, searchResult = null) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const result = {
    continuation_id: continuation.id,
    decision: "semantic_search_fulfilled",
    reason: `Generated query embedding for semantic search "${continuation.context?.query || ""}".`,
    query: continuation.context?.query || "",
    ...queryPayload,
    ...(searchResult ? { search_result: searchResult } : {}),
  };
  const resultPath = path.join(RESULTS_DIR, `semantic_search_result_${continuation.id}.json`);
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return resultPath;
}

function execCogentia(args) {
  const raw = execFileSync(process.execPath, ["scripts/cogentia.js", ...args], {
    cwd: COGENTIA_DIR,
    env: process.env,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return raw;
}

function parseJsonOutput(raw) {
  const start = raw.indexOf("{");
  if (start < 0) throw new Error("command did not return JSON");
  return JSON.parse(raw.slice(start));
}

function runSearchWith(resultPath, continuation) {
  const ctx = continuation.context || {};
  const args = [
    "--json",
    "embeddings",
    "search-with",
    resultPath,
    "--query",
    ctx.query || "",
    "--repo",
    ctx.repo || "all",
    "--limit",
    String(ctx.limit || 10),
    "--view",
    ctx.view || "public",
  ];
  const provider = continuation.context?.embedding_profile?.provider;
  if (provider) args.push("--provider", provider);
  return parseJsonOutput(execCogentia(args));
}

function resolveContinuation(continuation, resultPath) {
  execCogentia(["continuation", "resolve", continuation.id, resultPath]);
}

async function processContinuation(continuation, options = {}) {
  const ctx = continuation.context || {};
  const profile = ctx.embedding_profile || {};
  const query = String(ctx.query || "").trim();
  if (!query) throw new Error(`Continuation ${continuation.id} has no context.query`);

  console.log(`\n[SemanticWorker] Processing continuation: ${continuation.id}`);
  console.log(`  Query: ${query}`);
  console.log(`  Profile: ${profile.provider || "unknown"}/${profile.model_name || "unspecified"}${profile.dimensions ? ` (${profile.dimensions}d)` : ""}`);
  console.log(`  Router: ${process.env.COGENTIA_AI_ROUTER_URL || "http://127.0.0.1:8880"}`);

  if (options.dryRun) return true;

  const queryPayload = await createQueryEmbedding(query, profile);
  let resultPath = writeResult(continuation, queryPayload);
  console.log(`  Result written: ${resultPath}`);

  let searchResult = null;
  if (!options.noSearch) {
    searchResult = runSearchWith(resultPath, continuation);
    resultPath = writeResult(continuation, queryPayload, searchResult);
    console.log(`  Search results: ${searchResult.count || 0}`);
  }

  if (!options.noResolve) {
    resolveContinuation(continuation, resultPath);
    console.log("  Continuation resolved");
  }

  return true;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args.find(arg => !arg.startsWith("-")) || "run";
  const idIndex = args.indexOf("--id");
  return {
    command,
    id: idIndex >= 0 ? args[idIndex + 1] : "",
    limit: boundedInteger(args[args.indexOf("--limit") + 1], 1, 1, 100),
    dryRun: args.includes("--dry-run") || command === "list",
    noSearch: args.includes("--no-search"),
    noResolve: args.includes("--no-resolve"),
  };
}

function usage() {
  console.log(`
Usage:
  node scripts/semantic-search-worker.js list [--id <continuation_id>]
  node scripts/semantic-search-worker.js run [--id <continuation_id>] [--dry-run] [--no-search] [--no-resolve]

Fulfills active semantic-search continuations by asking the configured AI router
for a query embedding, then optionally running embeddings search-with and
resolving the continuation with the result payload.
`);
}

async function main() {
  const options = parseArgs();
  if (["help", "--help", "-h"].includes(options.command)) return usage();
  if (!["run", "list"].includes(options.command)) {
    usage();
    process.exit(1);
  }

  console.log("Semantic search continuation worker");
  console.log(`State: ${COGENTIA_STATE_DIR}`);
  console.log(`Continuations: ${CONTINUATIONS_DIR}`);

  const continuations = activeSemanticContinuations(options).slice(0, options.limit);
  if (!continuations.length) {
    console.log("\nNo active semantic-search continuations to process.");
    return;
  }

  if (options.dryRun) {
    for (const cont of continuations) {
      console.log(`  ${cont.id}: ${cont.context?.query || cont.title || ""}`);
    }
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const continuation of continuations) {
    try {
      await processContinuation(continuation, options);
      ok++;
    } catch (error) {
      failed++;
      console.error(`  Failed: ${error.message}`);
    }
  }
  console.log(`\nSummary: ${ok} fulfilled, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
