#!/usr/bin/env node
/**
 * Continuous embeddings processor
 *
 * Loops until all chunks have embeddings.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const COGENTIA_DIR = process.cwd();
const BATCH_SIZE = 200; // chunks per iteration
const MAX_EMPTY_ITERATIONS = 3; // Stop after this many empty iterations

function exec(cmd) {
  try {
    execSync(cmd, {
      cwd: COGENTIA_DIR,
      stdio: "inherit",
      timeout: 180000
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
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
      const result = execSync(`node scripts/cogentia.js embeddings index --repo cogentia --limit ${BATCH_SIZE}`, {
        cwd: COGENTIA_DIR,
        encoding: "utf-8",
        timeout: 30000
      });

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
      exec("node scripts/smart-embed-worker.js");

      // Import results
      console.log("Importing results...");
      exec("node scripts/import-embeddings");

      // Check status
      try {
        const status = execSync("node scripts/cogentia.js embeddings status", {
          cwd: COGENTIA_DIR,
          encoding: "utf-8"
        });
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
