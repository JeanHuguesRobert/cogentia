#!/usr/bin/env node
/**
 * Cogentia Embeddings Worker
 *
 * Processes Cogentia continuations for embeddings by calling Magistral.
 *
 * This worker:
 * 1. Lists active Cogentia continuations
 * 2. Filters for "embeddings-index" kind
 * 3. Extracts chunk texts
 * 4. Calls Magistral /v1/embeddings
 * 5. Produces result.json
 * 6. Resolves the continuation
 *
 * Usage:
 *   node scripts/cogentia-embed-worker.js run
 *   node scripts/cogentia-embed-worker.js run --json
 *   node scripts/cogentia-embed-worker.js list
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COGENTIA_DIR = path.resolve(__dirname, "..");
const REGISTRY_PATH = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
const REGISTRY_ROOT = REGISTRY_PATH
  ? (fs.existsSync(REGISTRY_PATH) && fs.statSync(REGISTRY_PATH).isDirectory() ? REGISTRY_PATH : path.dirname(REGISTRY_PATH))
  : COGENTIA_DIR;
const COGENTIA_STATE_DIR = process.env.COGENTIA_STATE_DIR || path.join(REGISTRY_ROOT, ".cogentia");
const CONTINUATIONS_DIR = process.env.CONTINUATIONS_DIR || path.join(COGENTIA_STATE_DIR, "continuations");
const MAGISTRAL_URL = process.env.MAGISTRAL_URL || "http://127.0.0.1:8880";

// Configuration (default values, can be overridden by env)
const DEFAULT_EMBEDDING_MODEL = process.env.MAGISTRAL_EMBEDDING_MODEL || "mxbai-embed-large";
const DEFAULT_EMBEDDING_DIMENSIONS = parseInt(process.env.MAGISTRAL_EMBEDDING_DIMENSIONS || "1024", 10);
const DEFAULT_EMBEDDING_POLICY = process.env.MAGISTRAL_EMBEDDING_POLICY || "magistral-mxbai-embed-1024-v1";

/**
 * List active continuations from Cogentia
 *
 * Strategy: Read directly from JSON files first (contains full context including chunks),
 * then use CLI only as fallback.
 */
async function listContinuations() {
  const continuations = [];
  const processedIds = new Set();

  // Read directly from directory (preferred - contains full context)
  if (fs.existsSync(CONTINUATIONS_DIR)) {
    const files = fs.readdirSync(CONTINUATIONS_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const id = file.replace(".json", "");
      const cont = readContinuation(id);
      if (cont && cont.status !== "resolved" && cont.status !== "completed") {
        continuations.push(cont);
        processedIds.add(id);
      }
    }
  }

  // Try CLI as fallback for any continuations not found in directory
  try {
    const result = await execCogentia(["continuation", "list", "--json"]);
    const data = JSON.parse(result);
    const cliContinuations = data.continuations || [];

    for (const cont of cliContinuations) {
      const id = cont.id || cont.continuation_id;
      if (!processedIds.has(id)) {
        // Try to read the full file for this continuation
        const fullCont = readContinuation(id);
        if (fullCont) {
          continuations.push(fullCont);
        } else {
          // Use CLI data as fallback
          continuations.push(cont);
        }
      }
    }
  } catch (error) {
    console.error("[Worker] CLI fallback failed (using directory data only):", error.message);
  }

  return continuations;
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

/**
 * Filter continuations for embeddings
 */
function filterEmbeddingContinuations(continuations) {
  return continuations.filter((ctn) => {
    return (
      (ctn.kind === "embeddings-index" ||
       ctn.kind === "embedding.batch_required" ||
       ctn.kind === "embeddings-index") &&
      ctn.status === "active"
    );
  });
}

/**
 * Call Magistral embeddings API
 */
async function callMagistralEmbeddings(texts) {
  return callMagistralEmbeddingsWithProfile(texts, {
    model_name: DEFAULT_EMBEDDING_MODEL,
    dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
  });
}

async function callMagistralEmbeddingsWithProfile(texts, profile) {
  const model = profile?.model_name && profile.model_name !== "unspecified" ? profile.model_name : DEFAULT_EMBEDDING_MODEL;
  const dimensions = Number(profile?.dimensions || DEFAULT_EMBEDDING_DIMENSIONS) || DEFAULT_EMBEDDING_DIMENSIONS;
  const response = await fetch(`${MAGISTRAL_URL}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Magistral embeddings failed: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Process a single continuation
 */
async function processContinuation(continuation) {
  console.log(`\n[Worker] Processing continuation: ${continuation.id}`);
  console.log(`  Kind: ${continuation.kind}`);
  console.log(`  Title: ${continuation.title || "No title"}`);

  // Extract chunks from continuation
  const chunks = continuation.context?.chunks || continuation.payload?.chunks || [];

  if (!chunks.length) {
    console.error(`  ❌ No chunks found in continuation`);
    return false;
  }

  console.log(`  Chunks: ${chunks.length}`);

  // Extract texts from chunks
  const texts = chunks.map((chunk) => chunk.text || chunk.content || "").filter(Boolean);

  if (!texts.length) {
    console.error(`  ❌ No valid texts extracted from chunks`);
    return false;
  }

  console.log(`  Texts: ${texts.length}`);
  const profile = continuation.context?.embedding_profile || {};
  const embeddingModel = profile.model_name && profile.model_name !== "unspecified" ? profile.model_name : DEFAULT_EMBEDDING_MODEL;
  const embeddingDimensions = Number(profile.dimensions || DEFAULT_EMBEDDING_DIMENSIONS) || DEFAULT_EMBEDDING_DIMENSIONS;
  const embeddingPolicy = profile.policy || DEFAULT_EMBEDDING_POLICY;

  // Call Magistral for embeddings
  console.log(`  Calling Magistral embeddings API...`);
  let embeddingsResponse;
  try {
    embeddingsResponse = await callMagistralEmbeddingsWithProfile(texts, profile);
  } catch (error) {
    console.error(`  ❌ Failed to call Magistral: ${error.message}`);
    return false;
  }

  // Validate response
  if (!embeddingsResponse.data || !Array.isArray(embeddingsResponse.data)) {
    console.error(`  ❌ Invalid response from Magistral`);
    return false;
  }

  const receivedDimensions = embeddingsResponse.data[0]?.embedding?.length || 0;
  if (receivedDimensions !== embeddingDimensions) {
    console.error(`  ❌ Dimension mismatch: got ${receivedDimensions}, expected ${embeddingDimensions}`);
    return false;
  }

  console.log(`  ✅ Received ${embeddingsResponse.data.length} embeddings (${receivedDimensions} dims)`);

  // Build result.json
  const result = {
    continuation_id: continuation.id,
    provider: "magistral",
    model: embeddingModel,
    dimensions: embeddingDimensions,
    embedding_policy_version: embeddingPolicy,
    embeddings: chunks.map((chunk, index) => ({
      chunk_id: chunk.chunk_id,
      content_hash: chunk.content_hash,
      text: chunk.text || chunk.content,
      embedding: embeddingsResponse.data[index]?.embedding || [],
      metadata: {
        repo: chunk.repo,
        path: chunk.path,
        start_line: chunk.start_line,
        end_line: chunk.end_line,
      },
    })),
    decision: "embeddings_generated",
    reason: `Generated ${embeddingsResponse.data.length} embeddings via ${embeddingModel}`,
    usage: embeddingsResponse.usage,
  };

  // Write result.json
  fs.mkdirSync(COGENTIA_STATE_DIR, { recursive: true });
  const resultPath = path.join(COGENTIA_STATE_DIR, `embeddings_result_${continuation.id}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`  ✅ Result written to: ${resultPath}`);

  // Resolve continuation
  console.log(`  Resolving continuation...`);
  try {
    const resolveResult = await execCogentia([
      "continuation",
      "resolve",
      continuation.id,
      resultPath,
    ]);
    console.log(`  ✅ Continuation resolved`);
    return true;
  } catch (error) {
    console.error(`  ⚠️  Failed to auto-resolve: ${error.message}`);
    console.log(`  Run manually: cogentia continuation resolve ${continuation.id} ${resultPath}`);
    return true; // Return true as embeddings were generated successfully
  }
}

/**
 * Execute a Cogentia command
 */
function execCogentia(args) {
  return new Promise((resolve, reject) => {
    const cogentiaPath = path.join(__dirname, "cogentia.js");
    const child = spawn("node", [cogentiaPath, ...args], {
      cwd: COGENTIA_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with exit code ${code}\n${stderr}`));
      }
    });
  });
}

/**
 * Main run function
 */
async function run(options = {}) {
  console.log("🔄 Cogentia Embeddings Worker");
  console.log(`   Magistral: ${MAGISTRAL_URL}`);
  console.log(`   State: ${COGENTIA_STATE_DIR}`);
  console.log(`   Model: ${DEFAULT_EMBEDDING_MODEL}`);
  console.log(`   Dimensions: ${DEFAULT_EMBEDDING_DIMENSIONS}`);
  console.log(`   Policy: ${DEFAULT_EMBEDDING_POLICY}`);

  // Check Magistral availability
  try {
    const healthResponse = await fetch(`${MAGISTRAL_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error("Magistral health check failed");
    }
    const health = await healthResponse.json();
    if (!health.embeddings?.enabled) {
      console.error("\n❌ Magistral embeddings are not enabled");
      console.error("   Set MAGISTRAL_EMBEDDINGS_ENABLED=true");
      process.exit(1);
    }
    console.log(`   ✅ Magistral embeddings available\n`);
  } catch (error) {
    console.error(`\n❌ Magistral is not available at ${MAGISTRAL_URL}`);
    console.error("   Start Magistral with: node inseme/packages/models/src/ai.js start");
    process.exit(1);
  }

  // List continuations
  console.log("📋 Listing active continuations...");
  const continuations = await listContinuations();
  console.log(`   Found ${continuations.length} active continuations`);

  // Filter for embeddings
  const embeddingContinuations = filterEmbeddingContinuations(continuations);
  console.log(`   Found ${embeddingContinuations.length} embedding continuations`);

  if (!embeddingContinuations.length) {
    console.log("\n✨ No embedding continuations to process");
    return;
  }

  // Process each continuation
  let successCount = 0;
  let failCount = 0;

  for (const continuation of embeddingContinuations) {
    const success = await processContinuation(continuation);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

/**
 * List command
 */
async function listCmd() {
  console.log("📋 Listing embedding continuations...\n");

  const continuations = await listContinuations();
  const embeddingContinuations = filterEmbeddingContinuations(continuations);

  if (!embeddingContinuations.length) {
    console.log("No embedding continuations found.");
    return;
  }

  console.log(`Found ${embeddingContinuations.length} embedding continuation(s):\n`);

  for (const ctn of embeddingContinuations) {
    const chunks = ctn.context?.chunks?.length || ctn.payload?.chunks?.length || 0;
    console.log(`📄 ${ctn.id}`);
    console.log(`   Title: ${ctn.title || "No title"}`);
    console.log(`   Status: ${ctn.status}`);
    console.log(`   Chunks: ${chunks}`);
    console.log(`   Created: ${ctn.created_at}`);
    console.log("");
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "list") {
    await listCmd();
  } else if (command === "run" || command === "process") {
    await run();
  } else if (!command || command === "help" || command === "--help") {
    console.log(`
Cogentia Embeddings Worker

Usage:
  node scripts/cogentia-embed-worker.js list      List embedding continuations
  node scripts/cogentia-embed-worker.js run       Process embedding continuations
  node scripts/cogentia-embed-worker.js help      Show this help

Environment:
  MAGISTRAL_URL              Magistral server URL (default: http://127.0.0.1:8880)
  MAGISTRAL_EMBEDDING_MODEL  Embedding model (default: mxbai-embed-large)
  MAGISTRAL_EMBEDDING_DIMENSIONS  Embedding dimensions (default: 1024)
  MAGISTRAL_EMBEDDING_POLICY  Embedding policy version

Examples:
  node scripts/cogentia-embed-worker.js list
  node scripts/cogentia-embed-worker.js run
`);
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "node scripts/cogentia-embed-worker.js help" for usage');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
