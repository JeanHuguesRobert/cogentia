#!/usr/bin/env node
/**
 * Import embeddings from result files into SQLite database
 *
 * This script:
 * 1. Reads embeddings result files from .cogentia/
 * 2. Transforms them to match storeEmbeddings expectations
 * 3. Calls cogentia.js embeddings store for each file
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const COGENTIA_DIR = process.cwd();
const REGISTRY_PATH = process.env.COGENTIA_REGISTRY ? path.resolve(process.env.COGENTIA_REGISTRY) : "";
const REGISTRY_ROOT = REGISTRY_PATH
  ? (fs.existsSync(REGISTRY_PATH) && fs.statSync(REGISTRY_PATH).isDirectory() ? REGISTRY_PATH : path.dirname(REGISTRY_PATH))
  : COGENTIA_DIR;
const EMBEDDINGS_RESULT_DIR = process.env.COGENTIA_EMBEDDINGS_RESULTS_DIR || path.join(REGISTRY_ROOT, ".cogentia");
const DRY_RUN = process.argv.includes("--dry-run");

function listResultFiles() {
  if (!fs.existsSync(EMBEDDINGS_RESULT_DIR)) {
    return [];
  }
  return fs.readdirSync(EMBEDDINGS_RESULT_DIR)
    .filter(f => f.startsWith("embeddings_result_") && f.endsWith(".json"))
    .filter(f => !f.endsWith("_import.json") && !f.endsWith("_imported.json"))
    .map(f => path.join(EMBEDDINGS_RESULT_DIR, f));
}

/**
 * Transform result file to format expected by storeEmbeddings
 *
 * Input format (from worker):
 * OLD (single provider):
 * {
 *   "model": "mxbai-embed-large",
 *   "dimensions": 1024,
 *   "embedding_policy_version": "magistral-mxbai-embed-1024-v1",
 *   "embeddings": [...]
 * }
 *
 * NEW (multi-provider):
 * {
 *   "providers": [{"provider": "openai", "modelId": "text-embedding-3-small", ...}],
 *   "total_embeddings": N,
 *   "embeddings": [
 *     {
 *       "chunk_id": ...,
 *       "content_hash": ...,
 *       "embedding": [...],
 *       "model_name": "...",
 *       "dimensions": ...,
 *       "provider": "..."
 *     }
 *   ]
 * }
 *
 * Output format (expected by storeEmbeddings):
 * {
 *   "embeddings": [
 *     {
 *       "chunk_id": ...,
 *       "content_hash": ...,
 *       "embedding": [...],
 *       "model_name": "...",
 *       "dimensions": ...,
 *       "provider": "..."
 *     }
 *   ]
 * }
 */
function transformResult(resultData) {
  // Check if it's the new multi-provider format
  if (resultData.providers && Array.isArray(resultData.providers)) {
    // New format: already has provider field in each embedding
    return {
      embeddings: (resultData.embeddings || []).map(item => ({
        chunk_id: item.chunk_id,
        content_hash: item.content_hash,
        embedding: item.embedding,
        model_name: item.model_name,
        dimensions: item.dimensions,
        provider: item.provider, // Already present
      }))
    };
  }

  // Legacy single-provider format
  const modelName = resultData.embedding_policy_version || resultData.model || "unknown";
  const dimensions = resultData.dimensions || resultData.embeddings?.[0]?.embedding?.length || 0;

  // Infer provider from model name
  let provider = "unknown";
  if (modelName.includes("text-embedding")) {
    provider = "openai";
  } else if (modelName.includes("mxbai") || modelName.includes("magistral")) {
    provider = "magistral";
  }

  return {
    embeddings: (resultData.embeddings || []).map(item => ({
      chunk_id: item.chunk_id,
      content_hash: item.content_hash,
      embedding: item.embedding,
      model_name: modelName,
      dimensions: dimensions,
      provider, // Inferred from legacy format
    }))
  };
}

function validateEmbeddings(payload) {
  const errors = [];
  const embeddings = payload.embeddings || [];
  embeddings.forEach((item, index) => {
    const prefix = `embedding[${index}]`;
    if (!Number.isInteger(Number(item.chunk_id))) errors.push(`${prefix}: missing integer chunk_id`);
    if (!item.content_hash) errors.push(`${prefix}: missing content_hash`);
    if (!item.provider) errors.push(`${prefix}: missing provider`);
    if (!item.model_name) errors.push(`${prefix}: missing model_name`);
    if (!Number.isInteger(Number(item.dimensions)) || Number(item.dimensions) <= 0) errors.push(`${prefix}: invalid dimensions`);
    if (!Array.isArray(item.embedding) || item.embedding.length === 0) {
      errors.push(`${prefix}: missing embedding vector`);
    } else if (Number(item.dimensions) && item.embedding.length !== Number(item.dimensions)) {
      errors.push(`${prefix}: vector length ${item.embedding.length} does not match dimensions ${item.dimensions}`);
    } else if (!item.embedding.every(value => Number.isFinite(Number(value)))) {
      errors.push(`${prefix}: embedding vector contains non-numeric values`);
    }
  });
  return errors;
}

function execNode(args) {
  console.log(`$ node ${args.join(" ")}`);
  try {
    execFileSync("node", args, {
      cwd: COGENTIA_DIR,
      stdio: "inherit",
      timeout: 60000 // 1 minute
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(DRY_RUN ? "📥 Import Embeddings dry-run\n" : "📥 Import Embeddings to SQLite\n");

  const resultFiles = listResultFiles();
  console.log(`Found ${resultFiles.length} result files\n`);

  if (resultFiles.length === 0) {
    console.log("No result files to import.");
    return;
  }

  let totalImported = 0;
  let totalSkipped = 0;
  let totalValid = 0;

  for (const resultFile of resultFiles) {
    const filename = path.basename(resultFile);
    console.log(`\n📄 Processing: ${filename}`);

    // Read result file
    const resultData = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
    const embeddingCount = resultData.embeddings?.length || 0;
    console.log(`   Embeddings: ${embeddingCount}`);

    if (embeddingCount === 0) {
      console.log("   ⏭️  Skipping (no embeddings)");
      totalSkipped++;
      continue;
    }

    // Transform to expected format
    const transformed = transformResult(resultData);
    const validationErrors = validateEmbeddings(transformed);
    if (validationErrors.length) {
      console.log(`   ❌ Invalid result (${validationErrors.length} error(s))`);
      validationErrors.slice(0, 5).forEach(error => console.log(`      - ${error}`));
      if (validationErrors.length > 5) console.log(`      - ... ${validationErrors.length - 5} more`);
      totalSkipped += embeddingCount;
      continue;
    }

    if (DRY_RUN) {
      totalValid += embeddingCount;
      const providers = [...new Set(transformed.embeddings.map(item => `${item.provider}/${item.model_name}/${item.dimensions}d`))];
      console.log(`   ✅ Valid dry-run: ${providers.join(", ")}`);
      continue;
    }

    // Write temporary file for import
    const tempFile = resultFile.replace(".json", "_import.json");
    fs.writeFileSync(tempFile, JSON.stringify(transformed, null, 2));

    // Import via cogentia.js
    console.log(`   Importing...`);
    const importOk = execNode(["scripts/cogentia.js", "embeddings", "store", tempFile]);

    if (importOk) {
      totalImported += embeddingCount;
      console.log(`   ✅ Imported ${embeddingCount} embeddings`);

      // Archive original file to avoid re-importing
      const archiveFile = resultFile.replace(".json", "_imported.json");
      fs.renameSync(resultFile, archiveFile);

      // Clean up temp file
      fs.unlinkSync(tempFile);
    } else {
      console.log(`   ❌ Import failed`);
      totalSkipped += embeddingCount;
    }
  }

  console.log(`\n📊 Summary:`);
  if (DRY_RUN) console.log(`   ✅ Valid: ${totalValid} embeddings`);
  console.log(`   ✅ Imported: ${totalImported} embeddings`);
  console.log(`   ⏭️  Skipped: ${totalSkipped} embeddings`);
  console.log(DRY_RUN
    ? `\nNext step: run without --dry-run to import valid result files.`
    : `\nNext step: Check status with 'node scripts/cogentia.js embeddings status'`);
}

main().catch(console.error);
