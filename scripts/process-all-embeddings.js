#!/usr/bin/env node
/**
 * Continuous embeddings processor
 *
 * Loops until all chunks have embeddings.
 */

import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COGENTIA_DIR = path.resolve(__dirname, "..");
const BATCH_SIZE = 200; // chunks per iteration
const MAX_EMPTY_ITERATIONS = 3; // Stop after this many empty iterations
const TARGET_REPO = process.env.COGENTIA_EMBEDDINGS_REPO || "all";

function embeddingIndexArgs() {
  const args = ["scripts/cogentia.js", "embeddings", "index", "--repo", TARGET_REPO, "--limit", String(BATCH_SIZE)];
  if (process.env.COGENTIA_EMBEDDINGS_PROFILE) args.push("--profile", process.env.COGENTIA_EMBEDDINGS_PROFILE);
  if (process.env.COGENTIA_EMBEDDINGS_PROVIDER) args.push("--provider", process.env.COGENTIA_EMBEDDINGS_PROVIDER);
  if (process.env.COGENTIA_EMBEDDINGS_ENV_FILE) args.push("--env-file", process.env.COGENTIA_EMBEDDINGS_ENV_FILE);
  return args;
}

function execNode(args, options = {}) {
  try {
    return execFileSync("node", args, {
      cwd: COGENTIA_DIR,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: options.capture ? "utf8" : undefined,
      timeout: 180000
    });
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    if (options.capture) throw error;
    return false;
  }
}

async function main() {
  console.log("🔄 Continuous Embeddings Processor\n");
  console.log(`Batch size: ${BATCH_SIZE} chunks`);
  console.log(`Will stop after ${MAX_EMPTY_ITERATIONS} empty iterations\n`);

  let emptyIterations = 0;
  let iteration = 0;

  while (emptyIterations < MAX_EMPTY_ITERATIONS) {
    iteration++;
    console.log(`\n=== Iteration ${iteration} ===`);

    // Create continuation
    console.log("Creating continuation...");
    try {
      const result = execNode(embeddingIndexArgs(), { capture: true });

      if (!result.includes("Continuation emitted")) {
        console.log("No new chunks to index");
        emptyIterations++;
        continue;
      }

      const match = result.match(/(\d+) chunks/);
      const chunkCount = match ? parseInt(match[1]) : 0;
      console.log(`Created continuation for ${chunkCount} chunks`);

      if (chunkCount === 0) {
        emptyIterations++;
        continue;
      }

      emptyIterations = 0; // Reset on successful iteration

      // Process with smart worker
      console.log("Processing embeddings...");
      execNode(["scripts/smart-embed-worker.js"]);

      // Import results
      console.log("Importing results...");
      execNode(["scripts/import-embeddings.js"]);

      // Check status
      try {
        const status = execNode(["scripts/cogentia.js", "embeddings", "status"], { capture: true });
        const countMatch = status.match(/Count: (\d+)/);
        const count = countMatch ? parseInt(countMatch[1]) : 0;
        console.log(`Current embeddings count: ${count}`);
      } catch (error) {
        console.error("Failed to check status");
      }

    } catch (error) {
      console.error(`Iteration failed: ${error.message}`);
      emptyIterations++;
    }

    // Brief pause between iterations
    console.log("\n⏳ Pausing 2 seconds...");
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n✅ Processing complete (or no new chunks found)");
}

main().catch(console.error);
