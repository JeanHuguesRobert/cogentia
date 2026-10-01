#!/usr/bin/env node
/**
 * scripts/ops/rebuild-corpus-embeddings.mjs
 *
 * Operational runner for full corpus embedding regeneration and Supabase synchronization.
 * Uses OpenRouter (openai/text-embedding-3-small, 1536d) as resilient fallback.
 *
 * Usage:
 *   node scripts/ops/rebuild-corpus-embeddings.mjs
 *   node scripts/ops/rebuild-corpus-embeddings.mjs --repos FractaVolta,barons-Mariani
 *   node scripts/ops/rebuild-corpus-embeddings.mjs --skip-sync
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INSEME_ENV = path.join(root, "inseme", ".env");
const REGISTRY_PATH = path.join(root, "JeanHuguesRobert", ".cogentia.json");

// Load credentials from inseme/.env if available
const env = { ...process.env };
if (fs.existsSync(INSEME_ENV)) {
  const envContent = fs.readFileSync(INSEME_ENV, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let val = match[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

// Clean proxy settings to ensure direct connection to Supabase and OpenRouter
delete env.HTTP_PROXY;
delete env.HTTPS_PROXY;
delete env.http_proxy;
delete env.https_proxy;
delete env.ALL_PROXY;
delete env.all_proxy;

env.COGENTIA_REGISTRY = REGISTRY_PATH;
env.COGENTIA_EMBEDDINGS_BATCH_SIZE = env.COGENTIA_EMBEDDINGS_BATCH_SIZE || "100";
env.COGENTIA_EMBEDDINGS_MAX_TOTAL = env.COGENTIA_EMBEDDINGS_MAX_TOTAL || "20000";

function runNode(scriptArgs, customEnv = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> Executing: node ${scriptArgs.join(" ")}`);
    const proc = spawn("node", scriptArgs, {
      cwd: root,
      stdio: "inherit",
      env: { ...env, ...customEnv },
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const reposFlag = args.find((a) => a.startsWith("--repos="));
  const skipSync = args.includes("--skip-sync");

  const defaultRepos = ["FractaVolta", "marenostrum", "barons-Mariani", "cogentia"];
  const targetRepos = reposFlag
    ? reposFlag.replace("--repos=", "").split(",").map((s) => s.trim()).filter(Boolean)
    : defaultRepos;

  console.log("==================================================================");
  console.log("       COGENTIA FULL RETRIEVAL EMBEDDINGS REBUILD SUITE           ");
  console.log("==================================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target repositories: ${targetRepos.join(", ")}`);
  console.log(`Registry: ${REGISTRY_PATH}`);

  for (let i = 0; i < targetRepos.length; i++) {
    const repo = targetRepos[i];
    console.log(`\n------------------------------------------------------------------`);
    console.log(`[${i + 1}/${targetRepos.length}] Embedding repository: ${repo}`);
    console.log(`------------------------------------------------------------------`);

    try {
      await runNode(["scripts/batch-embeddings.js"], {
        COGENTIA_EMBEDDINGS_REPO: repo,
      });
      console.log(`✓ Repository ${repo} embedded successfully.`);
    } catch (err) {
      console.error(`⚠️ Error while embedding ${repo}: ${err.message}`);
      console.log("Continuing to next repository...");
    }
  }

  if (!skipSync) {
    console.log(`\n==================================================================`);
    console.log(`[Sync] Synchronizing all embeddings to Supabase pgvector...`);
    console.log(`==================================================================`);

    try {
      await runNode(["scripts/sync-retrieval-supabase.js", "--no-prune", "--batch-size", "15"]);
      console.log("\n✅ Supabase pgvector synchronization completed successfully!");
    } catch (err) {
      console.error(`⚠️ Supabase sync failed: ${err.message}`);
    }
  }

  console.log(`\n==================================================================`);
  console.log(`[Status] Final Embeddings Summary`);
  console.log(`==================================================================`);
  await runNode(["scripts/cogentia.js", "embeddings", "status", "--registry", REGISTRY_PATH]);
}

main().catch((err) => {
  console.error("FATAL ERROR in rebuild-corpus-embeddings:", err);
  process.exit(1);
});
