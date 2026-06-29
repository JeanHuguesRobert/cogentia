#!/usr/bin/env node
/**
 * Monitor embeddings processing progress
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

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
    return {
      file: f,
      size: stats.size,
      modified: stats.mtime,
      imported: f.endsWith("_imported.json"),
      importTemp: f.endsWith("_import.json"),
    };
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
      original_chunks: cont.context?.original_chunk_count || cont.context?.limit || cont.context?.chunks?.length || 0,
      provider: cont.context?.embedding_profile?.provider || "",
      model: cont.context?.embedding_profile?.model_name || "",
      dimensions: cont.context?.embedding_profile?.dimensions || "",
      created: cont.created_at,
      updated: cont.updated_at,
      resolved: cont.resolution?.resolved_at,
      last_event: Array.isArray(cont.history) && cont.history.length ? cont.history[cont.history.length - 1] : null,
    }))
    .sort((a, b) => String(b.updated || b.created || "").localeCompare(String(a.updated || a.created || "")));
}

function embeddingsStatus() {
  try {
    const raw = execFileSync(process.execPath, ["scripts/cogentia.js", "embeddings", "status", "--json"], {
      cwd: COGENTIA_DIR,
      env: process.env,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });
    const start = raw.indexOf("{");
    return JSON.parse(start >= 0 ? raw.slice(start) : raw);
  } catch (error) {
    return {
      ok: false,
      error: "embeddings_status_failed",
      message: error.message,
    };
  }
}

function countEmbeddings(files) {
  let embeddings = 0;
  for (const result of files) {
    try {
      const filePath = path.join(EMBEDDINGS_RESULT_DIR, result.file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      embeddings += data.embeddings?.length || 0;
    } catch {}
  }
  return embeddings;
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
  const activeContinuations = continuations.filter(item => item.status === "active");
  const latestActive = activeContinuations[0] || null;
  const status = embeddingsStatus();
  if (status.ok) {
    console.log(`Stored embeddings: ${status.count || 0}`);
    if (status.providers?.length) {
      for (const provider of status.providers) {
        console.log(`  ${provider.provider}/${provider.model_name}: ${provider.count} (${provider.dimensions}d)`);
      }
    }
    console.log("");
  } else {
    console.log(`Stored embeddings: unavailable (${status.error || status.message || "unknown"})\n`);
  }

  if (continuations.length) {
    console.log(`Embedding continuations: ${continuations.length} total, ${activeContinuations.length} active`);
    for (const item of [...activeContinuations, ...continuations.filter(item => item.status !== "active")].slice(0, 10)) {
      const profile = item.provider || item.model ? ` ${item.provider}/${item.model}${item.dimensions ? ` (${item.dimensions}d)` : ""}` : "";
      const original = item.original_chunks && item.original_chunks !== item.chunks ? `/${item.original_chunks}` : "";
      console.log(`  ${item.id} [${item.status}] ${item.chunks}${original} chunks${profile}`);
    }
    console.log("");
    const focus = latestActive || cont;
    console.log(`${latestActive ? "Active focus" : "Latest"}: ${focus.id}`);
    console.log(`  Title: ${focus.title}`);
    console.log(`  Status: ${focus.status}`);
    console.log(`  Chunks: ${focus.chunks}`);
    if (focus.original_chunks && focus.original_chunks !== focus.chunks) console.log(`  Original chunks: ${focus.original_chunks}`);
    console.log(`  Created: ${focus.created}`);
    console.log(`  Updated: ${focus.updated}`);
    if (focus.last_event) {
      console.log(`  Last event: ${focus.last_event.event || "-"}${focus.last_event.processed_chunks ? ` (${focus.last_event.processed_chunks} processed, ${focus.last_event.remaining_chunks} remaining)` : ""}`);
    }
    if (focus.resolved) {
      console.log(`  Resolved: ${focus.resolved}`);
    }
    console.log("");
  } else {
    console.log("No active continuation found\n");
  }

  const results = listResultFiles();
  const pendingResults = results.filter(result => !result.imported && !result.importTemp);
  const importedResults = results.filter(result => result.imported);
  console.log(`Result files: ${results.length}`);
  console.log(`  Pending import: ${pendingResults.length} file(s), ${countEmbeddings(pendingResults)} embedding(s)`);
  console.log(`  Imported archive: ${importedResults.length} file(s), ${countEmbeddings(importedResults)} embedding(s)`);

  for (const result of results) {
    const state = result.imported ? "imported" : (result.importTemp ? "temp" : "pending");
    console.log(`  ${result.file} [${state}]`);
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

  if (latestActive && pendingResults.length === 0) {
    console.log("\nNext safe step:");
    console.log(`  node scripts/embedding-step.js --id ${latestActive.id}`);
    console.log("\nAuthorized continuation-worker fulfillment:");
    console.log(`  node scripts/embedding-step.js --id ${latestActive.id} --fulfill-continuation`);
  } else if (cont && cont.status === "resolved") {
    console.log("\n✅ Continuation resolved!");
  } else if (pendingResults.length > 0) {
    console.log("\nNext safe step:");
    console.log("  node scripts/import-embeddings.js --dry-run");
    console.log("  node scripts/import-embeddings.js");
  }
}

main();
