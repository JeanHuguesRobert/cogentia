#!/usr/bin/env node
/**
 * Batch embeddings processor
 *
 * Processes embeddings in batches to avoid timeout issues.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COGENTIA_DIR = path.resolve(__dirname, "..");
const BATCH_SIZE = 100; // chunks per batch
const MAX_TOTAL = 1000; // safety limit
const TARGET_REPO = process.env.COGENTIA_EMBEDDINGS_REPO || "all";

function embeddingIndexArgs() {
  const args = ["scripts/cogentia.js", "embeddings", "index", "--repo", TARGET_REPO, "--limit", String(BATCH_SIZE)];
  if (process.env.COGENTIA_EMBEDDINGS_PROFILE) args.push("--profile", process.env.COGENTIA_EMBEDDINGS_PROFILE);
  if (process.env.COGENTIA_EMBEDDINGS_PROVIDER) args.push("--provider", process.env.COGENTIA_EMBEDDINGS_PROVIDER);
  if (process.env.COGENTIA_EMBEDDINGS_ENV_FILE) args.push("--env-file", process.env.COGENTIA_EMBEDDINGS_ENV_FILE);
  return args;
}

function execNode(args, options = {}) {
  console.log(`$ node ${args.join(" ")}`);
  try {
    return execFileSync("node", args, {
      cwd: COGENTIA_DIR,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: options.capture ? "utf8" : undefined,
      timeout: 180000 // 3 minutes
    });
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    if (options.capture) throw error;
    return false;
  }
}

async function main() {
  console.log("🔄 Batch Embeddings Processor\n");
  console.log(`Batch size: ${BATCH_SIZE} chunks`);
  console.log(`Safety limit: ${MAX_TOTAL} chunks\n`);

  let totalProcessed = 0;
  let batchNumber = 1;

  while (totalProcessed < MAX_TOTAL) {
    console.log(`\n📦 Batch ${batchNumber}`);
    console.log(`   Target: ${BATCH_SIZE} chunks`);
    console.log(`   Processed so far: ${totalProcessed}\n`);

    // Create continuation
    console.log("1. Creating continuation...");
    const createResult = execNode(embeddingIndexArgs(), { capture: true });

    // Check if continuation was created
    if (!createResult.includes("Continuation emitted")) {
      console.log("   No more chunks to process (or limit reached)");
      break;
    }

    // Extract continuation ID
    const match = createResult.match(/ID: (\w+)/);
    if (!match) {
      console.error("   Failed to extract continuation ID");
      break;
    }
    const continuationId = match[1];
    console.log(`   Created: ${continuationId}`);

    // Process with worker
    console.log("\n2. Processing embeddings...");
    const processOk = execNode(["scripts/smart-embed-worker.js"]);

    if (!processOk) {
      console.log("   ⚠️  Worker failed, but continuing...");
    }

    // Check result file
    const registryPath = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
    const registryRoot = registryPath
      ? (fs.existsSync(registryPath) && fs.statSync(registryPath).isDirectory() ? registryPath : path.dirname(registryPath))
      : COGENTIA_DIR;
    const resultDir = process.env.COGENTIA_EMBEDDINGS_RESULTS_DIR || path.join(registryRoot, ".cogentia");
    const resultFile = path.join(resultDir, `embeddings_result_${continuationId}.json`);
    if (fs.existsSync(resultFile)) {
      const data = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
      const count = data.embeddings?.length || 0;
      totalProcessed += count;
      console.log(`   ✅ Generated ${count} embeddings`);
    } else {
      console.log("   ⚠️  No result file found");
    }

    batchNumber++;

    // Brief pause between batches
    console.log("\n⏳ Pausing 2 seconds before next batch...");
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total batches: ${batchNumber - 1}`);
  console.log(`   Total embeddings generated: ${totalProcessed}`);
  console.log(`\nNext step: Check status with 'node scripts/cogentia.js embeddings status'`);
}

main().catch(console.error);
