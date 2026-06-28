#!/usr/bin/env node
/**
 * Smart batch embeddings processor
 *
 * Splits large continuations into manageable batches
 * and processes them through the worker.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COGENTIA_DIR = path.resolve(__dirname, "..");
const REGISTRY_PATH = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
const REGISTRY_ROOT = REGISTRY_PATH
  ? (fs.existsSync(REGISTRY_PATH) && fs.statSync(REGISTRY_PATH).isDirectory() ? REGISTRY_PATH : path.dirname(REGISTRY_PATH))
  : COGENTIA_DIR;
const COGENTIA_STATE_DIR = process.env.COGENTIA_STATE_DIR || path.join(REGISTRY_ROOT, ".cogentia");
const CONTINUATIONS_DIR = process.env.CONTINUATIONS_DIR || path.join(COGENTIA_STATE_DIR, "continuations");
const BATCH_SIZE = 10; // chunks per batch (very conservative for long chunks)
const TARGET_REPO = process.env.COGENTIA_EMBEDDINGS_REPO || "all";

function exec(cmd) {
  console.log(`$ ${cmd}`);
  try {
    const result = execSync(cmd, {
      cwd: COGENTIA_DIR,
      stdio: "inherit",
      timeout: 180000 // 3 minutes
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    return false;
  }
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
    console.error(`Failed to read continuation ${id}:`, error.message);
    return null;
  }
}

/**
 * Write a continuation file
 */
function writeContinuation(continuation) {
  const continuationPath = path.join(CONTINUATIONS_DIR, `${continuation.id}.json`);
  fs.writeFileSync(continuationPath, JSON.stringify(continuation, null, 2));
}

/**
 * Split a large continuation into smaller batches
 */
function splitContinuation(largeCtn, batchSize) {
  const chunks = largeCtn.context?.chunks || [];
  if (chunks.length <= batchSize) {
    return [largeCtn]; // No splitting needed
  }

  const batches = [];
  const totalBatches = Math.ceil(chunks.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, chunks.length);
    const batchChunks = chunks.slice(start, end);

    const batchCtn = {
      id: `ctn_${randomBytes(6).toString("hex")}`,
      kind: largeCtn.kind,
      status: "active",
      title: `${largeCtn.title} (batch ${i + 1}/${totalBatches})`,
      question: largeCtn.question,
      priority: largeCtn.priority || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      context: {
        ...largeCtn.context,
        chunks: batchChunks,
        parent_continuation_id: largeCtn.id,
        batch_index: i + 1,
        batch_count: totalBatches
      },
      expected_response: largeCtn.expected_response
    };

    batches.push(batchCtn);
  }

  return batches;
}

/**
 * Cancel a continuation
 */
function cancelContinuation(id) {
  console.log(`  Cancelling ${id}...`);
  exec(`node scripts/cogentia.js continuation cancel ${id} --reason "Split into batches"`);
}

function embeddingIndexCommand() {
  const args = ["node", "scripts/cogentia.js", "embeddings", "index", "--repo", TARGET_REPO, "--limit", String(BATCH_SIZE)];
  if (process.env.COGENTIA_EMBEDDINGS_PROFILE) args.push("--profile", process.env.COGENTIA_EMBEDDINGS_PROFILE);
  if (process.env.COGENTIA_EMBEDDINGS_PROVIDER) args.push("--provider", process.env.COGENTIA_EMBEDDINGS_PROVIDER);
  if (process.env.COGENTIA_EMBEDDINGS_ENV_FILE) args.push("--env-file", `"${process.env.COGENTIA_EMBEDDINGS_ENV_FILE}"`);
  return args.join(" ");
}

async function main() {
  console.log("🔄 Smart Batch Embeddings Processor\n");
  console.log(`Batch size: ${BATCH_SIZE} chunks\n`);

  // Check for large continuations
  const files = fs.readdirSync(CONTINUATIONS_DIR).filter(f => f.endsWith(".json"));
  const largeContinuations = [];

  for (const file of files) {
    const id = file.replace(".json", "");
    const ctn = readContinuation(id);
    if (!ctn || ctn.status !== "active") continue;
    if (ctn.kind !== "embeddings-index") continue;

    const chunkCount = ctn.context?.chunks?.length || 0;
    if (chunkCount > BATCH_SIZE) {
      largeContinuations.push({ id, ctn, chunkCount });
    }
  }

  if (!largeContinuations.length) {
    console.log("No large continuations found.");
    console.log("Processing next batch via index command...\n");

    // Create a new batch
    const createCmd = embeddingIndexCommand();
    const createResult = execSync(createCmd, {
      cwd: COGENTIA_DIR,
      encoding: "utf-8",
      timeout: 30000
    });

    if (createResult.includes("Continuation emitted")) {
      const match = createResult.match(/ID: (\w+)/);
      if (match) {
        console.log(`Created: ${match[1]}`);
        console.log("\nProcessing...");
        exec(`node scripts/cogentia-embed-worker.js run`);
      }
    }
    return;
  }

  console.log(`Found ${largeContinuations.length} large continuation(s):\n`);

  // Split and process large continuations
  for (const { id, ctn, chunkCount } of largeContinuations) {
    console.log(`📦 ${id}: ${chunkCount} chunks`);

    const batches = splitContinuation(ctn, BATCH_SIZE);
    console.log(`  Splitting into ${batches.length} batches of ${BATCH_SIZE}...\n`);

    // Cancel original
    cancelContinuation(id);

    // Write batch continuations
    for (const batchCtn of batches) {
      writeContinuation(batchCtn);
      console.log(`  Created: ${batchCtn.id} (${batchCtn.context.chunks.length} chunks)`);
    }

    console.log(`  ✅ Split complete\n`);
  }

  console.log("\nProcessing batches...");
  exec(`node scripts/smart-embed-worker.js`);
}

main().catch(console.error);
