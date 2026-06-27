/**
 * Operium Embeddings Reporter
 *
 * Generates Operium-compatible YAML reports for embedding service metrics.
 * Supports public/private split per Operium doctrine.
 *
 * Usage:
 *   node scripts/lib/operium-embeddings.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Health score calculation per Operium scale (0-5)
 * 0 = Unknown
 * 1 = Broken
 * 2 = Fragile
 * 3 = Functional
 * 4 = Robust
 * 5 = Reproducible, documented and monitored
 */
function calculateHealthScore(metrics, options = {}) {
  const { coverage, cacheValue, risks, hasBackup, hasQuota } = metrics;
  let score = 3; // Base: functional
  const reasons = [];
  const nextActions = [];

  // Coverage assessment
  if (coverage >= 90) {
    score = 5;
    reasons.push(`Excellente couverture: ${coverage}%`);
  } else if (coverage >= 70) {
    score = 4;
    reasons.push(`Bonne couverture: ${coverage}%`);
  } else if (coverage >= 50) {
    score = 3;
    reasons.push(`Couverture moyenne: ${coverage}%`);
  } else {
    score = 2;
    reasons.push(`Faible couverture: ${coverage}%`);
    nextActions.push("Prioriser l'indexation des chunks restants");
  }

  // Cache value
  if (cacheValue > 50) {
    reasons.push(`Cache très précieux: $${cacheValue.toFixed(2)}`);
  } else if (cacheValue > 10) {
    reasons.push(`Cache précieux: $${cacheValue.toFixed(2)}`);
  }

  // Backup availability
  if (hasBackup) {
    reasons.push("Backup local disponible en fallback");
  } else {
    score = Math.max(2, score - 1);
    reasons.push("Pas de backup local configuré");
    nextActions.push("Configurer un modèle local de fallback");
  }

  // Quota status
  if (hasQuota) {
    reasons.push("Quota gratuit suffisant disponible");
  } else {
    score = Math.max(2, score - 1);
    nextActions.push("Surveiller l'épuisement du quota ou utiliser modèle local");
  }

  // Risk assessment
  if (risks && risks.length > 0) {
    const criticalRisks = risks.filter(r => r.severity === "critical" || r.severity === "high");
    if (criticalRisks.length > 0) {
      score = Math.max(1, score - 1);
      nextActions.push(`Traiter les risques critiques: ${criticalRisks.map(r => r.type).join(", ")}`);
    }
  }

  const statusMap = {
    5: "reproducible",
    4: "robust",
    3: "functional",
    2: "fragile",
    1: "broken",
    0: "unknown",
  };

  return {
    score,
    status: statusMap[score] || "unknown",
    reasons,
    next_actions: nextActions,
  };
}

/**
 * Format size in human-readable units
 */
function formatSize(bytes) {
  const units = ["o", "Ko", "Mo", "Go"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(1)} ${units[unit]}`;
}

/**
 * Format count with locale
 */
function formatCount(n) {
  return n.toLocaleString("fr-FR");
}

/**
 * Estimate tokens from character count (conservative: ~3.5 chars/token)
 */
function estimateTokens(charCount) {
  return Math.ceil(charCount / 3.5);
}

/**
 * Generate Operium YAML report
 */
async function generateOperiumReport(db, options = {}) {
  const { scope = "total", publicView = false } = options;

  // Get all embeddings stats
  const totalStats = db.prepare(`
    SELECT
      COUNT(DISTINCT c.path) as total_documents,
      COUNT(*) as total_chunks,
      COUNT(e.chunk_id) as indexed_chunks,
      SUM(LENGTH(c.text)) as total_characters
    FROM chunks c
    LEFT JOIN embeddings e ON c.id = e.chunk_id
  `).get() || { total_documents: 0, total_chunks: 0, indexed_chunks: 0, total_characters: 0 };

  const byRepo = db.prepare(`
    SELECT
      c.repo,
      COUNT(DISTINCT c.path) as total_documents,
      COUNT(*) as total_chunks,
      COUNT(e.chunk_id) as indexed_chunks,
      SUM(LENGTH(c.text)) as total_characters
    FROM chunks c
    LEFT JOIN embeddings e ON c.id = e.chunk_id
    GROUP BY c.repo
    ORDER BY total_chunks DESC
  `).all() || [];

  // Calculate metrics
  const totalChunks = totalStats?.total_chunks || 0;
  const indexedChunks = totalStats?.indexed_chunks || 0;
  const unindexedChunks = totalChunks - indexedChunks;
  const coverage = totalChunks > 0 ? (indexedChunks / totalChunks * 100) : 0;
  const totalCharacters = totalStats?.total_characters || 0;
  const totalTokens = estimateTokens(totalCharacters);

  // Process by_repo
  const byRepoProcessed = (byRepo || []).map(repo => ({
    repo: repo.repo,
    total_chunks: repo.total_chunks || 0,
    indexed_chunks: repo.indexed_chunks || 0,
    unindexed_chunks: (repo.total_chunks || 0) - (repo.indexed_chunks || 0),
    coverage_percent: ((repo.indexed_chunks || 0) / (repo.total_chunks || 1) * 100).toFixed(1),
    total_characters: repo.total_characters || 0,
    total_tokens: estimateTokens(repo.total_characters || 0),
  }));

  // Get model info
  const modelInfo = db.prepare(`
    SELECT model_name, dimensions, COUNT(*) as count
    FROM embeddings
    GROUP BY model_name, dimensions
    ORDER BY count DESC
    LIMIT 1
  `).get() || {};

  // Reconstruction cost estimation
  const avgTokensPerChunk = totalChunks > 0 ? totalTokens / totalChunks : 400;
  const models = [
    { name: "text-embedding-3-large", dimensions: 3072, rate: 0.13 },
    { name: "text-embedding-3-small", dimensions: 1536, rate: 0.02 },
    { name: "nomic-embed-text-v1.5", dimensions: 768, rate: 0.0 },
    { name: "mxbai-embed-large", dimensions: 1024, rate: 0.0 },
  ];

  const reconstructionCosts = models.map(model => {
    const cost = (totalTokens / 1_000_000) * model.rate;
    const chunksPerHour = 60; // conservative
    const hours = Math.ceil(totalChunks / chunksPerHour);
    return {
      model: model.name,
      dimensions: model.dimensions,
      cost: cost.toFixed(2),
      time_estimate: hours < 1 ? `${Math.ceil(hours * 60)} minutes` : `${hours.toFixed(1)} heures`,
    };
  });

  // Calculate health
  const health = calculateHealthScore({
    coverage: coverage.toFixed(1),
    cacheValue: reconstructionCosts.find(c => c.model === "text-embedding-3-small")?.cost || 0,
    risks: [], // TODO: add risk detection
    hasBackup: true, // TODO: check for local model
    hasQuota: true, // TODO: check actual quota
  });

  // Build report
  const report = {
    name: `Semantic Embeddings - ${scope === "total" ? "Total Corpus" : scope}`,
    service_type: "embedding-service",
    scope,
    version: "1.0",
    last_updated: new Date().toISOString(),
    generated_by: "cogentia.js embeddings operium-sync",

    // Health (always included)
    health: {
      score: health.score,
      status: health.status,
      reasons: health.reasons,
      next_actions: health.next_actions,
    },

    // Metrics (public view has less detail)
    metrics: {
      total_chunks: totalChunks,
      indexed_chunks: indexedChunks,
      unindexed_chunks: unindexedChunks,
      coverage_percent: parseFloat(coverage.toFixed(1)),
      total_documents: totalStats?.total_documents || 0,
      total_characters: totalCharacters,
      total_tokens: totalTokens,
      avg_tokens_per_chunk: totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0,

      // Only in private view
      ...(publicView ? {} : {
        by_repo: byRepoProcessed,
      }),
    },

    // Model info
    ...(publicView ? {} : {
      active_model: modelInfo?.model_name || "none",
      model_dimensions: modelInfo?.dimensions || 0,
    }),

    // Reconstruction cost (private only)
    ...(publicView ? {} : {
      reconstruction_cost: {
        chunks_to_recreate: totalChunks,
        estimated_tokens: totalTokens,
        by_model: reconstructionCosts,
        current_cache_value: reconstructionCosts.find(c => c.model === "text-embedding-3-small")?.cost || "0.00",
      },
    }),

    // Rate limits and predictions (private only, placeholders for now)
    ...(publicView ? {} : {
      rate_limits: [],
      predictions: {
        days_to_complete: null,
        estimated_completion: null,
        note: "Requires quota tracking integration",
      },
    }),
  };

  return report;
}

/**
 * Convert report to YAML
 */
function toYAML(obj, indent = 0) {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "string") {
    // Check if we need quotes
    if (obj.includes("\n") || obj.includes(":") || obj.includes("#") || obj.trim() !== obj) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map(item => {
      const itemStr = toYAML(item, indent);
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        // Object in array: multiline with proper indent
        return `-\n${itemStr.split("\n").map(line => spaces + "  " + line).join("\n")}`;
      }
      return `- ${itemStr}`;
    }).join("\n" + spaces);
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";
    return entries.map(([key, value]) => {
      const valueStr = toYAML(value, 0);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Nested object: multiline
        return `${key}:\n${valueStr.split("\n").map(line => spaces + "  " + line).join("\n")}`;
      }
      return `${key}: ${valueStr}`;
    }).join("\n" + spaces);
  }

  return String(obj);
}

/**
 * Generate and write Operium report
 */
export async function generateOperiumEmbeddingsReport(db, options = {}) {
  const { outputPath, publicView = false } = options;

  const report = await generateOperiumReport(db, { publicView });
  const yaml = toYAML(report);

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, yaml, "utf-8");
    console.log(`✅ Operium report written to: ${outputPath}`);
    return { report, outputPath };
  }

  return { report, yaml };
}

export default { generateOperiumEmbeddingsReport, toYAML };
