#!/usr/bin/env node
/**
 * Monitor embeddings processing progress
 */
import fs from "fs";
import path from "path";
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
const EMBEDDINGS_RESULT_DIR = process.env.COGENTIA_EMBEDDINGS_RESULTS_DIR || COGENTIA_STATE_DIR;

function listResultFiles() {
  if (!fs.existsSync(EMBEDDINGS_RESULT_DIR)) return [];
  const files = fs.readdirSync(EMBEDDINGS_RESULT_DIR).filter(f => f.startsWith("embeddings_result_") && f.endsWith(".json"));
  return files.map(f => {
    const filePath = path.join(EMBEDDINGS_RESULT_DIR, f);
    const stats = fs.statSync(filePath);
    return { file: f, size: stats.size, modified: stats.mtime };
  }).sort((a, b) => b.modified - a.modified);
}

function getContinuationStatus() {
  if (!fs.existsSync(CONTINUATIONS_DIR)) return [];
  return fs.readdirSync(CONTINUATIONS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(fs.readFileSync(path.join(CONTINUATIONS_DIR, f), "utf-8")))
    .filter(cont => cont.kind === "embeddings-index")
    .map(cont => ({
      id: cont.id,
      status: cont.status,
      title: cont.title,
      chunks: cont.context?.chunks?.length || 0,
      provider: cont.context?.embedding_profile?.provider || "",
      model: cont.context?.embedding_profile?.model_name || "",
      created: cont.created_at,
      updated: cont.updated_at,
      resolved: cont.resolution?.resolved_at
    }))
    .sort((a, b) => String(b.updated || b.created || "").localeCompare(String(a.updated || a.created || "")));
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function main() {
  console.log("📊 Embeddings Processing Monitor\n");
  console.log(`State: ${COGENTIA_STATE_DIR}`);
  console.log(`Continuations: ${CONTINUATIONS_DIR}\n`);

  const continuations = getContinuationStatus();
  const cont = continuations[0] || null;
  if (continuations.length) {
    console.log(`Embedding continuations: ${continuations.length}`);
    for (const item of continuations.slice(0, 10)) {
      const profile = item.provider || item.model ? ` ${item.provider}/${item.model}` : "";
      console.log(`  ${item.id} [${item.status}] ${item.chunks} chunks${profile}`);
    }
    console.log("");
    console.log(`Latest: ${cont.id}`);
    console.log(`  Title: ${cont.title}`);
    console.log(`  Status: ${cont.status}`);
    console.log(`  Chunks: ${cont.chunks}`);
    console.log(`  Created: ${cont.created}`);
    console.log(`  Updated: ${cont.updated}`);
    if (cont.resolved) {
      console.log(`  Resolved: ${cont.resolved}`);
    }
    console.log("");
  } else {
    console.log("No active continuation found\n");
  }

  const results = listResultFiles();
  console.log(`Result files: ${results.length}`);

  for (const result of results) {
    console.log(`  ${result.file}`);
    console.log(`    Size: ${formatBytes(result.size)}`);
    console.log(`    Modified: ${result.modified.toISOString()}`);

    // Count embeddings in file
    try {
      const filePath = path.join(EMBEDDINGS_RESULT_DIR, result.file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const count = data.embeddings?.length || 0;
      console.log(`    Embeddings: ${count}`);
    } catch (e) {
      console.log(`    (Error reading file)`);
    }
  }

  if (cont && cont.status === "active" && results.length === 0) {
    console.log("\n⏳ Worker is processing (no result file yet)...");
    console.log("   Monitor with: node scripts/monitor-embeddings.js");
  } else if (cont && cont.status === "resolved") {
    console.log("\n✅ Continuation resolved!");
  } else if (cont && cont.chunks > 0 && results.length > 0) {
    const largestResult = results[0];
    try {
      const filePath = path.join(EMBEDDINGS_RESULT_DIR, largestResult.file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const count = data.embeddings?.length || 0;
      const progress = ((count / cont.chunks) * 100).toFixed(1);
      console.log(`\n📈 Progress: ${count}/${cont.chunks} chunks (${progress}%)`);
    } catch (e) {}
  }
}

main();
