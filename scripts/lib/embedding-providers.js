/**
 * Multi-Provider Embeddings Registry
 *
 * Defines available embedding providers with their models, pricing,
 * speed characteristics, and API configuration.
 *
 * Provider Detection:
 * - Reads API keys from .env files (cogentia, inseme, workspace root)
 * - Supports OpenAI, Magistral, Context7, Legalize
 * - Returns available providers with their models
 *
 * Model Selection:
 * - By criteria: price, speed, quality, dimensions
 * - Returns best model for given constraints
 */

import fs from "fs";
import path from "path";

/**
 * Provider model specifications
 *
 * Price units: per 1M tokens (input)
 * Speed: relative (1-10, 10 = fastest)
 * Quality: relative (1-10, 10 = best)
 */
const PROVIDER_MODELS = Object.freeze({
  openai: {
    name: "openai",
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    requiresAuth: true,
    models: {
      "text-embedding-3-small": {
        dimensions: 1536,
        maxTokens: 8191,
        pricePerMillion: 0.02, // $0.02/1M tokens
        speed: 8,
        quality: 8,
        supportedDimensions: [1536, 1024, 768, 512, 256],
      },
      "text-embedding-3-large": {
        dimensions: 3072,
        maxTokens: 8191,
        pricePerMillion: 0.13, // $0.13/1M tokens
        speed: 7,
        quality: 10,
        supportedDimensions: [256, 1024, 3072],
      },
    },
  },

  magistral: {
    name: "magistral",
    displayName: "Magistral (Local)",
    baseUrl: "http://127.0.0.1:8880",
    apiKeyEnv: "MAGISTRAL_API_KEY",
    requiresAuth: false,
    models: {
      "mxbai-embed-large": {
        dimensions: 1024,
        maxTokens: 8192,
        pricePerMillion: 0, // Free (local)
        speed: 9,
        quality: 7,
        supportedDimensions: [1024],
      },
    },
  },

  context7: {
    name: "context7",
    displayName: "Context7",
    baseUrl: "https://api.context7.com/v1",
    apiKeyEnv: "CONTEXT7_API_KEY",
    requiresAuth: true,
    models: {
      // Add when API documentation is available
      // "context7-embed": { dimensions: 1536, pricePerMillion: ?, speed: ?, quality: ? }
    },
  },

  legalize: {
    name: "legalize",
    displayName: "Legalize",
    baseUrl: "https://api.legalize.com/v1",
    apiKeyEnv: "LEGALIZE_API_KEY",
    requiresAuth: true,
    models: {
      // Add when API documentation is available
    },
  },
});

/**
 * Find .env file in workspace
 * Searches in cogentia, inseme, and workspace root
 */
function findEnvFile(explicitPath = "") {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (fs.existsSync(resolved)) return resolved;
  }
  const cwd = process.cwd();

  // Try current directory first (usually cogentia when running scripts)
  const searchPaths = [
    path.join(cwd, ".env"),
    path.join(cwd, "inseme", ".env"),
    path.join(path.dirname(cwd), "inseme", ".env"), // If in cogentia subdirectory
    path.join(cwd, "..", "inseme", ".env"),
    path.join(cwd, "cogentia", ".env"),
  ];

  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      return envPath;
    }
  }
  return null;
}

/**
 * Parse .env file and extract API keys
 */
function parseEnvVars(envPath) {
  if (!envPath || !fs.existsSync(envPath)) {
    return {};
  }

  const envVars = {};
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse KEY=VALUE format
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = unquoteEnvValue(value.trim());
    }
  }

  return envVars;
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(envPath, options = {}) {
  const resolved = findEnvFile(envPath);
  const envVars = parseEnvVars(resolved);
  for (const [key, value] of Object.entries(envVars)) {
    if (options.override || process.env[key] == null) {
      process.env[key] = value;
    }
  }
  return { path: resolved, loaded: Object.keys(envVars).length };
}

/**
 * Detect available providers from environment
 */
function detectAvailableProviders() {
  const envPath = findEnvFile();
  const envVars = parseEnvVars(envPath);
  const available = [];

  for (const [providerKey, provider] of Object.entries(PROVIDER_MODELS)) {
    const apiKey = process.env[provider.apiKeyEnv] || envVars[provider.apiKeyEnv];

    // Check if provider is available
    // - No auth required (like local Magistral): always available
    // - Has auth: check for API key
    const isAvailable = !provider.requiresAuth || (apiKey && apiKey.length > 10);

    if (isAvailable && Object.keys(provider.models).length > 0) {
      const models = Object.entries(provider.models).map(([modelId, model]) => ({
        id: modelId,
        name: modelId,
        dimensions: model.dimensions,
        pricePerMillion: model.pricePerMillion,
        speed: model.speed,
        quality: model.quality,
        maxTokens: model.maxTokens,
        supportedDimensions: model.supportedDimensions,
      }));

      available.push({
        provider: providerKey,
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        hasApiKey: !!apiKey,
        apiKeyPresent: !!(apiKey && apiKey.length > 10),
        models,
      });
    }
  }

  return available;
}

/**
 * Get provider configuration by name
 */
function getProvider(providerName) {
  return PROVIDER_MODELS[providerName] || null;
}

/**
 * Get model specification
 */
function getModel(providerName, modelId) {
  const provider = PROVIDER_MODELS[providerName];
  if (!provider) return null;
  return provider.models[modelId] || null;
}

/**
 * Select best model based on criteria
 *
 * @param {Object} criteria - Selection criteria
 * @param {string} criteria.priority - "price" | "speed" | "quality" | "dimensions" | "balanced"
 * @param {number} criteria.minDimensions - Minimum dimensions required
 * @param {number} criteria.maxPrice - Maximum price per 1M tokens
 * @param {number} criteria.minSpeed - Minimum speed score (1-10)
 * @param {number} criteria.minQuality - Minimum quality score (1-10)
 * @param {string} criteria.preferredProvider - Prefer this provider
 */
function selectBestModel(criteria = {}) {
  const available = detectAvailableProviders();
  const candidates = [];

  for (const provider of available) {
    const providerConfig = getProvider(provider.provider);
    for (const [modelId, model] of Object.entries(providerConfig.models)) {
      // Filter by constraints
      if (criteria.minDimensions && model.dimensions < criteria.minDimensions) {
        continue;
      }
      if (criteria.maxPrice && model.pricePerMillion > criteria.maxPrice) {
        continue;
      }
      if (criteria.minSpeed && model.speed < criteria.minSpeed) {
        continue;
      }
      if (criteria.minQuality && model.quality < criteria.minQuality) {
        continue;
      }

      candidates.push({
        provider: provider.provider,
        modelId,
        model,
        score: calculateScore(model, criteria.priority || "balanced"),
      });
    }
  }

  // Sort by score and return best
  candidates.sort((a, b) => b.score - a.score);

  // Prefer preferred provider if specified
  if (criteria.preferredProvider) {
    const preferred = candidates.find(c => c.provider === criteria.preferredProvider);
    if (preferred) {
      return { provider: preferred.provider, modelId: preferred.modelId };
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];
  return { provider: best.provider, modelId: best.modelId };
}

/**
 * Calculate model score based on priority
 */
function calculateScore(model, priority) {
  switch (priority) {
    case "price":
      // Lower is better, invert and scale
      return (1000 / (model.pricePerMillion + 0.001)) + model.quality * 0.5;
    case "speed":
      return model.speed * 10 + model.quality * 0.3;
    case "quality":
      return model.quality * 10 + model.speed * 0.3;
    case "dimensions":
      return model.dimensions / 100 + model.quality * 0.5;
    case "balanced":
    default:
      // Balanced score: all factors weighted equally
      const normalizedPrice = 100 / (model.pricePerMillion + 1);
      return (
        (model.quality * 3) +
        (model.speed * 2) +
        (model.dimensions / 1000) +
        normalizedPrice
      );
  }
}

/**
 * Generate embedding policy version string
 */
function policyVersion(providerName, modelId) {
  const provider = getProvider(providerName);
  const model = provider?.models[modelId];
  if (!model) return "unknown";
  return `${providerName}-${modelId}-${model.dimensions}d-v1`;
}

/**
 * Infer provider from model name
 */
function inferProvider(modelName) {
  if (!modelName) return "unknown";
  if (modelName.includes("text-embedding")) return "openai";
  if (modelName.includes("mxbai") || modelName.includes("magistral")) return "magistral";
  return "unknown";
}

/**
 * Export all available providers for inspection
 */
export {
  PROVIDER_MODELS,
  detectAvailableProviders,
  getProvider,
  getModel,
  selectBestModel,
  policyVersion,
  inferProvider,
  findEnvFile,
  parseEnvVars,
  loadEnvFile,
};
