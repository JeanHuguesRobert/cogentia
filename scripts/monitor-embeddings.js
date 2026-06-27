#!/usr/bin/env node
/**
 * Monitor embeddings processing progress
 */
import fs from "fs";
import path from "path";

const CONTINUATIONS_DIR = path.resolve(".cogentia", "continuations");
const EMBEDDINGS_RESULT_DIR = path.resolve(".cogentia");

function listResultFiles() {
  const files = fs.readdirSync(EMBEDDINGS_RESULT_DIR).filter(f => f.startsWith("embeddings_result_") && f.endsWith(".json"));
  return files.map(f => {
    const filePath = path.join(EMBEDDINGS_RESULT_DIR, f);
    const stats = fs.statSync(filePath);
    return { file: f, size: stats.size, modified: stats.mtime };
  }).sort((a, b) => b.modified - a.modified);
}

function getContinuationStatus() {
  const continuationPath = path.join(CONTINUATIONS_DIR, "ctn_f78cb84f.json");
  if (!fs.existsSync(continuationPath)) {
    return null;
  }
  const cont = JSON.parse(fs.readFileSync(continuationPath, "utf-8"));
  return {
    id: cont.id,
    status: cont.status,
    title: cont.title,
    chunks: cont.context?.chunks?.length || 0,
    created: cont.created_at,
    updated: cont.updated_at,
    resolved: cont.resolution?.resolved_at
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function main() {
  console.log("📊 Embeddings Processing Monitor\n");

  const cont = getContinuationStatus();
  if (cont) {
    console.log(`Continuation: ${cont.id}`);
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
