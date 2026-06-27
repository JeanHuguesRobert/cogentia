#!/usr/bin/env node
/**
 * Multi-Provider Smart Embeddings Worker
 *
 * - Detects all available providers (OpenAI, Magistral, etc.)
 * - Generates embeddings for ALL available providers
 * - Stores multiple embeddings per chunk (one per provider/model)
 * - Handles long chunks with truncation
 * - Processes batches safely
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import {
  detectAvailableProviders,
  getProvider,
  getModel,
  policyVersion,
} from "./lib/embedding-providers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COGENTIA_DIR = path.resolve(process.env.COGENTIA_DIR || path.resolve(__dirname, ".."));
const CONTINUATIONS_DIR = path.join(process.env.CONTINUATIONS_DIR || path.join(COGENTIA_DIR, ".cogentia"), "continuations");

const MAX_CHARS_PER_CHUNK = 1500; // Safe limit for most models
const MAX_CHARS_PER_BATCH = 10000; // Safe limit for batch

/**
 * Truncate text to safe length
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength);
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
    console.error(`[Worker] Failed to read continuation ${id}:`, error.message);
    return null;
  }
}

/**
 * Call OpenAI embeddings API
 */
async function callOpenAIEmbeddings(apiKey, texts, model) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embeddings failed: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Call Magistral embeddings API
 */
async function callMagistralEmbeddings(texts, model, dimensions) {
  const magistralUrl = process.env.MAGISTRAL_URL || "http://127.0.0.1:8880";
  const response = await fetch(`${magistralUrl}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Magistral embeddings failed: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Get API key from .env
 */
function getApiKey(providerName) {
  const provider = getProvider(providerName);
  if (!provider || !provider.apiKeyEnv) return null;

  // Try environment first
  if (process.env[provider.apiKeyEnv]) {
    return process.env[provider.apiKeyEnv];
  }

  // Try reading from .env files
  const searchPaths = [
    path.join(COGENTIA_DIR, ".env"),
    path.join(COGENTIA_DIR, "..", "inseme", ".env"),
    path.join(COGENTIA_DIR, "inseme", ".env"),
  ];

  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(new RegExp(`^${provider.apiKeyEnv}=(.+)$`, "m"));
      if (match) return match[1].trim();
    }
  }

  return null;
}

/**
 * Generate embeddings for a specific provider
 */
async function generateEmbeddingsForProvider(providerInfo, chunks) {
  const { provider, models } = providerInfo;
  const providerConfig = getProvider(provider);

  // Use first/only model for now (can be extended to support multiple models per provider)
  const modelInfo = models[0];
  if (!modelInfo) {
    console.log(`  ⚠️  ${provider}: No models available`);
    return null;
  }

  const modelSpec = getModel(provider, modelInfo.id);
  if (!modelSpec) {
    console.log(`  ⚠️  ${provider}: Model spec not found for ${modelInfo.id}`);
    return null;
  }

  console.log(`  📡 ${providerConfig.displayName}: ${modelInfo.id} (${modelSpec.dimensions}d)`);

  try {
    let embeddingsResponse;
    const texts = chunks.map(c => truncateText(c.text || c.content || "", MAX_CHARS_PER_CHUNK));

    // Call provider-specific API
    if (provider === "openai") {
      const apiKey = getApiKey("openai");
      if (!apiKey) {
        console.log(`    ⚠️  No API key found`);
        return null;
      }
      embeddingsResponse = await callOpenAIEmbeddings(apiKey, texts, modelInfo.id);
    } else if (provider === "magistral") {
      embeddingsResponse = await callMagistralEmbeddings(texts, modelInfo.id, modelSpec.dimensions);
    } else {
      console.log(`    ⚠️  Provider ${provider} not implemented`);
      return null;
    }

    if (!embeddingsResponse.data || !Array.isArray(embeddingsResponse.data)) {
      console.log(`    ❌ Invalid response`);
      return null;
    }

    const receivedDimensions = embeddingsResponse.data[0]?.embedding?.length || 0;
    if (receivedDimensions !== modelSpec.dimensions) {
      console.log(`    ❌ Dimension mismatch: got ${receivedDimensions}, expected ${modelSpec.dimensions}`);
      return null;
    }

    console.log(`    ✅ ${embeddingsResponse.data.length} embeddings`);

    // Return embeddings mapped to chunks
    return {
      provider,
      modelId: modelInfo.id,
      dimensions: modelSpec.dimensions,
      embeddings: chunks.map((chunk, index) => ({
        chunk_id: chunk.chunk_id,
        content_hash: chunk.content_hash,
        embedding: embeddingsResponse.data[index]?.embedding || [],
      })),
    };
  } catch (error) {
    console.log(`    ❌ Failed: ${error.message}`);
    return null;
  }
}

/**
 * Process a single continuation with all available providers
 */
async function processContinuation(continuation) {
  console.log(`\n[Worker] Processing continuation: ${continuation.id}`);
  console.log(`  Chunks: ${continuation.context?.chunks?.length || 0}`);

  const chunks = continuation.context?.chunks || [];
  if (!chunks.length) {
    console.error(`  ❌ No chunks found`);
    return false;
  }

  // Detect available providers
  const availableProviders = detectAvailableProviders();
  console.log(`  Available providers: ${availableProviders.map(p => p.provider).join(", ") || "none"}`);

  if (!availableProviders.length) {
    console.error(`  ❌ No providers available (check API keys in .env)`);
    return false;
  }

  // Generate embeddings for each provider
  const allResults = [];
  let totalEmbeddings = 0;

  for (const providerInfo of availableProviders) {
    const result = await generateEmbeddingsForProvider(providerInfo, chunks);
    if (result) {
      allResults.push(result);
      totalEmbeddings += result.embeddings.length;
    }
  }

  if (!allResults.length) {
    console.error(`  ❌ No embeddings generated from any provider`);
    return false;
  }

  console.log(`  ✅ Total embeddings: ${totalEmbeddings} from ${allResults.length} provider(s)`);

  // Build result with all provider embeddings
  const providerSummary = allResults.map(r => ({
    provider: r.provider,
    modelId: r.modelId,
    dimensions: r.dimensions,
    count: r.embeddings.length,
  }));

  // Flatten all embeddings for storage
  const allEmbeddings = [];
  for (const result of allResults) {
    for (const emb of result.embeddings) {
      allEmbeddings.push({
        chunk_id: emb.chunk_id,
        content_hash: emb.content_hash,
        embedding: emb.embedding,
        model_name: result.modelId,
        dimensions: result.dimensions,
        provider: result.provider,
      });
    }
  }

  const result = {
    continuation_id: continuation.id,
    providers: providerSummary,
    total_embeddings: totalEmbeddings,
    embeddings: allEmbeddings,
    decision: "multi_provider_embeddings_generated",
    reason: `Generated ${totalEmbeddings} embeddings from ${allResults.length} provider(s): ${allResults.map(r => r.provider).join(", ")}`,
  };

  // Write result.json
  const resultPath = path.join(COGENTIA_DIR, ".cogentia", `embeddings_result_${continuation.id}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`  ✅ Result written to: ${resultPath}`);

  // Resolve continuation
  console.log(`  Resolving continuation...`);
  try {
    await execCogentia(["continuation", "resolve", continuation.id, resultPath]);
    console.log(`  ✅ Continuation resolved`);
    return true;
  } catch (error) {
    console.error(`  ⚠️  Failed to auto-resolve: ${error.message}`);
    return true; // Return true as embeddings were generated
  }
}

function execCogentia(args) {
  return new Promise((resolve, reject) => {
    const cogentiaPath = path.join(__dirname, "cogentia.js");
    const child = spawn("node", [cogentiaPath, ...args], {
      cwd: COGENTIA_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command failed with exit code ${code}\n${stderr}`));
    });
  });
}

async function run() {
  console.log("🔄 Multi-Provider Smart Embeddings Worker");

  // Detect available providers
  const providers = detectAvailableProviders();
  console.log(`\nAvailable providers: ${providers.map(p => `${p.displayName} (${p.provider})`).join(", ") || "none"}`);

  if (!providers.length) {
    console.error("\n❌ No providers available. Check API keys in .env files.");
    console.log("   Expected keys:");
    console.log("   - OPENAI_API_KEY (for OpenAI)");
    console.log("   - MAGISTRAL_URL (for local Magistral)");
    process.exit(1);
  }

  // Check Magistral if available
  const magistralAvailable = providers.some(p => p.provider === "magistral");
  if (magistralAvailable) {
    try {
      const magistralUrl = process.env.MAGISTRAL_URL || "http://127.0.0.1:8880";
      const healthResponse = await fetch(`${magistralUrl}/health`);
      if (!healthResponse.ok) throw new Error("Magistral health check failed");
      console.log(`   ✅ Magistral available at ${magistralUrl}`);
    } catch (error) {
      console.log(`   ⚠️  Magistral not available: ${error.message}`);
    }
  }

  // List continuations
  const files = fs.existsSync(CONTINUATIONS_DIR) ? fs.readdirSync(CONTINUATIONS_DIR).filter(f => f.endsWith(".json")) : [];
  let successCount = 0, failCount = 0;

  for (const file of files) {
    const id = file.replace(".json", "");
    const cont = readContinuation(id);
    if (!cont || cont.status === "resolved" || cont.kind !== "embeddings-index") continue;

    const success = await processContinuation(cont);
    if (success) successCount++; else failCount++;
  }

  console.log(`\n📊 Summary: ✅ ${successCount} | ❌ ${failCount}`);
}

run().catch(console.error);
