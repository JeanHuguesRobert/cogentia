#!/usr/bin/env node
/**
 * Batch embeddings processor
 *
 * Processes embeddings in batches to avoid timeout issues.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const COGENTIA_DIR = process.cwd();
const BATCH_SIZE = 100; // chunks per batch
const MAX_TOTAL = 1000; // safety limit

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
    const createCmd = `node scripts/cogentia.js embeddings index --repo all --limit ${BATCH_SIZE}`;
    const createResult = execSync(createCmd, {
      cwd: COGENTIA_DIR,
      encoding: "utf-8",
      timeout: 30000
    });

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
    // Set environment and run worker
    process.env.MAGISTRAL_URL = "http://127.0.0.1:8880";
    const processCmd = `node scripts/cogentia-embed-worker.js run`;
    const processOk = exec(processCmd);

    if (!processOk) {
      console.log("   ⚠️  Worker failed, but continuing...");
    }

    // Check result file
    const resultFile = `.cogentia/embeddings_result_${continuationId}.json`;
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
