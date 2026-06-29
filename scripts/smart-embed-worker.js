#!/usr/bin/env node
/**
 * Multi-Provider Smart Embeddings Worker
 *
 * - Detects all available providers (OpenAI, Magistral, etc.)
 * - Generates embeddings for ALL available providers
 * - Stores multiple embeddings per chunk (one per provider/model)
 * - Handles long chunks with truncation
 * - Processes batches safely
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createAiRouterClient } from "./lib/ai-router-client.js";
import {
  detectAvailableProviders,
  getProvider,
  getModel,
  policyVersion,
  findEnvFile,
  loadEnvFile,
} from "./lib/embedding-providers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COGENTIA_DIR = path.resolve(process.env.COGENTIA_DIR || path.resolve(__dirname, ".."));
const REGISTRY_PATH = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
const REGISTRY_ROOT = REGISTRY_PATH
  ? (fs.existsSync(REGISTRY_PATH) && fs.statSync(REGISTRY_PATH).isDirectory() ? REGISTRY_PATH : path.dirname(REGISTRY_PATH))
  : COGENTIA_DIR;
const COGENTIA_STATE_DIR = process.env.COGENTIA_STATE_DIR || path.join(REGISTRY_ROOT, ".cogentia");
const CONTINUATIONS_DIR = process.env.CONTINUATIONS_DIR || path.join(COGENTIA_STATE_DIR, "continuations");
const RESULTS_DIR = process.env.COGENTIA_EMBEDDINGS_RESULTS_DIR || COGENTIA_STATE_DIR;

const MAX_CHARS_PER_CHUNK = boundedInteger(process.env.COGENTIA_EMBEDDINGS_MAX_CHARS_PER_CHUNK, 30000, 1000, 200000);
const MAX_CHARS_PER_BATCH = boundedInteger(process.env.COGENTIA_EMBEDDINGS_MAX_CHARS_PER_BATCH, 60000, 1000, 500000);
const MAX_ITEMS_PER_BATCH = boundedInteger(process.env.COGENTIA_EMBEDDINGS_MAX_ITEMS_PER_BATCH, 64, 1, 2048);

/**
 * Truncate text to safe length
 */
function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function preparedChunkText(chunk) {
  const text = String(chunk.text || chunk.content || "");
  if (text.length <= MAX_CHARS_PER_CHUNK) return text;
  throw new Error(`chunk ${chunk.chunk_id || "unknown"} exceeds ${MAX_CHARS_PER_CHUNK} characters; re-chunk the index or raise COGENTIA_EMBEDDINGS_MAX_CHARS_PER_CHUNK`);
}

function buildTextBatches(chunks) {
  const batches = [];
  let current = [];
  let currentChars = 0;

  for (const chunk of chunks) {
    const text = preparedChunkText(chunk);
    const nextChars = currentChars + text.length;
    const wouldOverflow = current.length
      && (current.length >= MAX_ITEMS_PER_BATCH || nextChars > MAX_CHARS_PER_BATCH);
    if (wouldOverflow) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push({ chunk, text });
    currentChars += text.length;
  }

  if (current.length) batches.push(current);
  return batches;
}

function oversizedChunks(chunks) {
  return chunks
    .map(chunk => ({
      chunk,
      chars: String(chunk.text || chunk.content || "").length,
    }))
    .filter(item => item.chars > MAX_CHARS_PER_CHUNK);
}

/**
 * Read a continuation file directly
 */
function readContinuation(id) {
  const continuationPath = path.join(CONTINUATIONS_DIR, `${id}.json`);
  if (!fs.existsSync(continuationPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(continuationPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`[Worker] Failed to read continuation ${id}:`, error.message);
    return null;
  }
}

function continuationPath(id) {
  return path.join(CONTINUATIONS_DIR, `${id}.json`);
}

function saveContinuation(continuation) {
  fs.mkdirSync(CONTINUATIONS_DIR, { recursive: true });
  fs.writeFileSync(continuationPath(continuation.id), `${JSON.stringify(continuation, null, 2)}\n`, "utf8");
}

async function callRouterEmbeddings(texts, model, dimensions) {
  const baseUrl = process.env.COGENTIA_AI_ROUTER_URL || process.env.MAGISTRAL_URL || undefined;
  const client = createAiRouterClient({ baseUrl });
  const payload = { model, input: texts };
  if (dimensions) payload.dimensions = dimensions;
  const response = await client.embeddings(payload);
  if (!response.ok) {
    throw new Error(`${response.error || "ai_router_embeddings_failed"}: ${response.message || response.status}`);
  }
  return response.body;
}

function continuationProfile(continuation) {
  return continuation.context?.embedding_profile || continuation.payload?.embedding_profile || null;
}

function loadCredentialHints(profile) {
  const credentials = profile?.credentials || {};
  const envFile = credentials.env_file_resolved || credentials.env_file || process.env.COGENTIA_EMBEDDINGS_ENV_FILE || "";
  if (!envFile) return null;
  const loaded = loadEnvFile(envFile);
  if (loaded.path) {
    console.log(`  Credentials: loaded environment from ${loaded.path} (${loaded.loaded} variable(s), values hidden)`);
  }
  return loaded;
}

function providersForContinuation(continuation) {
  const profile = continuationProfile(continuation);
  loadCredentialHints(profile);

  const providerName = profile?.provider && profile.provider !== "unknown" ? profile.provider : "";
  if (!providerName) return detectAvailableProviders();

  const providerConfig = getProvider(providerName);
  if (!providerConfig) {
    console.log(`  ⚠️  Unknown provider in continuation profile: ${providerName}`);
    return [];
  }

  const modelId = profile.model_name && profile.model_name !== "unspecified"
    ? profile.model_name
    : Object.keys(providerConfig.models)[0];
  const modelSpec = getModel(providerName, modelId) || {};
  const dimensions = Number(profile.dimensions || modelSpec.dimensions || 0) || null;

  return [{
    provider: providerName,
    displayName: providerConfig.displayName,
    baseUrl: providerConfig.baseUrl,
    profile,
    models: [{
      id: modelId,
      name: modelId,
      dimensions,
      pricePerMillion: modelSpec.pricePerMillion || 0,
      speed: modelSpec.speed || 0,
      quality: modelSpec.quality || 0,
      maxTokens: modelSpec.maxTokens || 0,
      supportedDimensions: modelSpec.supportedDimensions || (dimensions ? [dimensions] : []),
    }],
  }];
}

/**
 * Generate embeddings for a specific provider
 */
function selectChunksForRun(chunks, options = {}) {
  const batches = buildTextBatches(chunks);
  const maxBatches = Number(options.maxBatches || 0) || 0;
  const selectedBatches = maxBatches > 0 ? batches.slice(0, maxBatches) : batches;
  const selected = selectedBatches.flat().map(item => item.chunk);
  const selectedIds = new Set(selected.map(chunk => chunk.chunk_id));
  const remaining = maxBatches > 0 ? chunks.filter(chunk => !selectedIds.has(chunk.chunk_id)) : [];
  return {
    batches,
    selectedBatches,
    selected,
    remaining,
  };
}

async function generateEmbeddingsForProvider(providerInfo, chunks, options = {}) {
  const { provider, models } = providerInfo;
  const providerConfig = getProvider(provider);

  // Use first/only model for now (can be extended to support multiple models per provider)
  const modelInfo = models[0];
  if (!modelInfo) {
    console.log(`  ⚠️  ${provider}: No models available`);
    return null;
  }

  const profile = providerInfo.profile || {};
  const modelSpec = getModel(provider, modelInfo.id) || {};
  const dimensions = Number(profile.dimensions || modelInfo.dimensions || modelSpec.dimensions || 0) || null;

  console.log(`  📡 ${providerConfig.displayName}: ${modelInfo.id}${dimensions ? ` (${dimensions}d)` : ""}`);
  console.log(`    Router: ${process.env.COGENTIA_AI_ROUTER_URL || process.env.MAGISTRAL_URL || "http://127.0.0.1:8880"}`);

  try {
    const batches = options.selectedBatches || buildTextBatches(chunks);
    const generated = [];
    let receivedDimensions = 0;
    console.log(`    Batches: ${batches.length} (max ${MAX_ITEMS_PER_BATCH} item(s), ${MAX_CHARS_PER_BATCH} chars)`);

    for (let index = 0; index < batches.length; index++) {
      const batch = batches[index];
      const embeddingsResponse = await callRouterEmbeddings(batch.map(item => item.text), modelInfo.id, dimensions);
      if (!embeddingsResponse.data || !Array.isArray(embeddingsResponse.data)) {
        console.log(`    ❌ Invalid response`);
        return null;
      }
      if (embeddingsResponse.data.length !== batch.length) {
        console.log(`    ❌ Response count mismatch: got ${embeddingsResponse.data.length}, expected ${batch.length}`);
        return null;
      }
      for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
        generated.push({
          chunk: batch[itemIndex].chunk,
          embedding: embeddingsResponse.data[itemIndex]?.embedding || [],
        });
      }
      receivedDimensions = embeddingsResponse.data[0]?.embedding?.length || receivedDimensions;
      console.log(`    ✅ Batch ${index + 1}/${batches.length}: ${batch.length} embeddings`);
    }

    if (dimensions && receivedDimensions !== dimensions) {
      console.log(`    ❌ Dimension mismatch: got ${receivedDimensions}, expected ${dimensions}`);
      return null;
    }

    console.log(`    ✅ ${generated.length} embeddings`);

    // Return embeddings mapped to chunks
    return {
      provider,
      modelId: modelInfo.id,
      dimensions: receivedDimensions || dimensions,
      policy: profile.policy || policyVersion(provider, modelInfo.id),
      embeddings: generated.map(item => ({
        chunk_id: item.chunk.chunk_id,
        content_hash: item.chunk.content_hash,
        embedding: item.embedding,
      })),
    };
  } catch (error) {
    console.log(`    ❌ Failed: ${error.message}`);
    return null;
  }
}

/**
 * Process a single continuation with all available providers
 */
function summarizeContinuation(continuation) {
  const chunks = continuation.context?.chunks || [];
  const profile = continuationProfile(continuation) || {};
  const chars = chunks.reduce((sum, chunk) => sum + String(chunk.text || chunk.content || "").length, 0);
  const oversized = oversizedChunks(chunks);
  const eligible = oversized.length ? chunks.filter(chunk => String(chunk.text || chunk.content || "").length <= MAX_CHARS_PER_CHUNK) : chunks;
  const batches = eligible.length ? buildTextBatches(eligible) : [];
  return {
    id: continuation.id,
    chunks: chunks.length,
    eligible_chunks: eligible.length,
    oversized_chunks: oversized.length,
    max_chunk_chars: oversized.reduce((max, item) => Math.max(max, item.chars), 0),
    chars,
    batches: batches.length,
    provider: profile.provider || "auto",
    model: profile.model_name || "auto",
    dimensions: profile.dimensions || null,
    router: process.env.COGENTIA_AI_ROUTER_URL || process.env.MAGISTRAL_URL || "http://127.0.0.1:8880",
  };
}

async function processContinuation(continuation, options = {}) {
  console.log(`\n[Worker] Processing continuation: ${continuation.id}`);
  console.log(`  Chunks: ${continuation.context?.chunks?.length || 0}`);

  const chunks = continuation.context?.chunks || [];
  if (!chunks.length) {
    console.error(`  ❌ No chunks found`);
    return false;
  }

  const selection = selectChunksForRun(chunks, options);

  if (options.dryRun) {
    const summary = summarizeContinuation(continuation);
    console.log(`  Dry run: ${summary.batches} batch(es), ${summary.chars} character(s), ${summary.provider}/${summary.model}${summary.dimensions ? ` (${summary.dimensions}d)` : ""}`);
    if (options.maxBatches) {
      console.log(`  Limited run: would process ${selection.selectedBatches.length}/${selection.batches.length} batch(es), ${selection.selected.length} chunk(s), leaving ${selection.remaining.length}`);
    }
    if (summary.oversized_chunks) {
      console.log(`  Oversized chunks: ${summary.oversized_chunks} over ${MAX_CHARS_PER_CHUNK} chars (max ${summary.max_chunk_chars}); eligible chunks: ${summary.eligible_chunks}`);
    }
    console.log(`  Router: ${summary.router}`);
    return true;
  }

  // Detect available providers
  const availableProviders = providersForContinuation(continuation);
  console.log(`  Available providers: ${availableProviders.map(p => p.provider).join(", ") || "none"}`);

  if (!availableProviders.length) {
    console.error(`  ❌ No providers available (check API keys in .env)`);
    return false;
  }

  // Generate embeddings for each provider
  const allResults = [];
  let totalEmbeddings = 0;

  for (const providerInfo of availableProviders) {
    const result = await generateEmbeddingsForProvider(providerInfo, selection.selected, {
      selectedBatches: selection.selectedBatches,
    });
    if (result) {
      allResults.push(result);
      totalEmbeddings += result.embeddings.length;
    }
  }

  if (!allResults.length) {
    console.error(`  ❌ No embeddings generated from any provider`);
    return false;
  }

  console.log(`  ✅ Total embeddings: ${totalEmbeddings} from ${allResults.length} provider(s)`);

  // Build result with all provider embeddings
  const providerSummary = allResults.map(r => ({
    provider: r.provider,
    modelId: r.modelId,
    dimensions: r.dimensions,
    policy: r.policy,
    count: r.embeddings.length,
  }));

  // Flatten all embeddings for storage
  const allEmbeddings = [];
  for (const result of allResults) {
    for (const emb of result.embeddings) {
      allEmbeddings.push({
        chunk_id: emb.chunk_id,
        content_hash: emb.content_hash,
        embedding: emb.embedding,
        model_name: result.modelId,
        dimensions: result.dimensions,
        provider: result.provider,
        embedding_policy_version: result.policy,
      });
    }
  }

  const result = {
    continuation_id: continuation.id,
    providers: providerSummary,
    total_embeddings: totalEmbeddings,
    partial: Boolean(options.maxBatches && selection.remaining.length),
    processed_chunks: selection.selected.length,
    remaining_chunks: selection.remaining.length,
    embeddings: allEmbeddings,
    decision: options.maxBatches && selection.remaining.length ? "partial_embeddings_generated" : "multi_provider_embeddings_generated",
    reason: `Generated ${totalEmbeddings} embeddings from ${allResults.length} provider(s): ${allResults.map(r => r.provider).join(", ")}`,
  };

  // Write result.json
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const suffix = options.maxBatches ? `_part_${Date.now()}` : "";
  const resultPath = path.join(RESULTS_DIR, `embeddings_result_${continuation.id}${suffix}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`  ✅ Result written to: ${resultPath}`);

  if (options.maxBatches && selection.remaining.length) {
    const now = new Date().toISOString();
    continuation.context = {
      ...(continuation.context || {}),
      chunks: selection.remaining,
      original_chunk_count: continuation.context?.original_chunk_count || chunks.length,
    };
    continuation.updated_at = now;
    continuation.history = Array.isArray(continuation.history) ? continuation.history : [];
    continuation.history.push({
      at: now,
      event: "partial_embeddings_generated",
      result_path: resultPath,
      processed_chunks: selection.selected.length,
      remaining_chunks: selection.remaining.length,
    });
    saveContinuation(continuation);
    console.log(`  ✅ Continuation kept active with ${selection.remaining.length} remaining chunks`);
    return true;
  }

  // Resolve continuation
  console.log(`  Resolving continuation...`);
  try {
    await execCogentia(["continuation", "resolve", continuation.id, resultPath]);
    console.log(`  ✅ Continuation resolved`);
    return true;
  } catch (error) {
    console.error(`  ⚠️  Failed to auto-resolve: ${error.message}`);
    return true; // Return true as embeddings were generated
  }
}

function execCogentia(args) {
  return new Promise((resolve, reject) => {
    const cogentiaPath = path.join(__dirname, "cogentia.js");
    const child = spawn("node", [cogentiaPath, ...args], {
      cwd: COGENTIA_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command failed with exit code ${code}\n${stderr}`));
    });
  });
}

function activeEmbeddingContinuations(options = {}) {
  const files = fs.existsSync(CONTINUATIONS_DIR) ? fs.readdirSync(CONTINUATIONS_DIR).filter(f => f.endsWith(".json")) : [];
  return files
    .map(file => readContinuation(file.replace(".json", "")))
    .filter(cont => cont && cont.status === "active" && cont.kind === "embeddings-index")
    .filter(cont => !options.id || cont.id === options.id);
}

async function run(options = {}) {
  console.log("🔄 Multi-Provider Smart Embeddings Worker");
  console.log(`State: ${COGENTIA_STATE_DIR}`);
  console.log(`Continuations: ${CONTINUATIONS_DIR}`);

  const activeContinuations = activeEmbeddingContinuations(options);

  if (!activeContinuations.length) {
    console.log("\nNo active embedding continuations to process.");
    console.log(`\n📊 Summary: ✅ 0 | ❌ 0`);
    return;
  }

  // Detect available providers
  const startupEnv = findEnvFile(process.env.COGENTIA_EMBEDDINGS_ENV_FILE || "");
  if (startupEnv) loadEnvFile(startupEnv);
  const providers = detectAvailableProviders();
  console.log(`\nAvailable providers: ${providers.map(p => `${p.displayName} (${p.provider})`).join(", ") || "none"}`);

  if (!providers.length && !activeContinuations.some(cont => continuationProfile(cont)?.provider)) {
    console.error("\n❌ No providers available. Check API keys in .env files.");
    console.log("   Expected keys:");
    console.log("   - OPENAI_API_KEY (for OpenAI)");
    console.log("   - MAGISTRAL_URL (for local Magistral)");
    process.exit(1);
  }

  // Check Magistral if available
  const magistralAvailable = providers.some(p => p.provider === "magistral");
  if (magistralAvailable) {
    try {
      const magistralUrl = process.env.MAGISTRAL_URL || "http://127.0.0.1:8880";
      const healthResponse = await fetch(`${magistralUrl}/health`);
      if (!healthResponse.ok) throw new Error("Magistral health check failed");
      console.log(`   ✅ Magistral available at ${magistralUrl}`);
    } catch (error) {
      console.log(`   ⚠️  Magistral not available: ${error.message}`);
    }
  }

  let successCount = 0, failCount = 0;

  for (const cont of activeContinuations) {
    const success = await processContinuation(cont, options);
    if (success) successCount++; else failCount++;
  }

  console.log(`\n📊 Summary: ✅ ${successCount} | ❌ ${failCount}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args.find(arg => !arg.startsWith("-")) || "run";
  const idIndex = args.indexOf("--id");
  const maxBatchesIndex = args.indexOf("--max-batches");
  return {
    command,
    dryRun: args.includes("--dry-run") || command === "list",
    id: idIndex >= 0 ? args[idIndex + 1] : "",
    maxBatches: maxBatchesIndex >= 0 ? boundedInteger(args[maxBatchesIndex + 1], 0, 0, 10000) : 0,
  };
}

function usage() {
  console.log(`
Usage:
  node scripts/smart-embed-worker.js list [--id <continuation_id>]
  node scripts/smart-embed-worker.js run [--dry-run] [--id <continuation_id>] [--max-batches <n>]

The worker resolves embeddings-index continuations through the configured
AI router /v1/embeddings endpoint. It does not call provider SDKs directly.
When --max-batches is set, it writes a partial result and leaves the
continuation active with the remaining chunks.
`);
}

const options = parseArgs();
if (options.command === "help" || options.command === "--help" || options.command === "-h") {
  usage();
} else if (options.command === "run" || options.command === "list") {
  run(options).catch(error => {
    console.error(error);
    process.exit(1);
  });
} else {
  usage();
  process.exit(1);
}
