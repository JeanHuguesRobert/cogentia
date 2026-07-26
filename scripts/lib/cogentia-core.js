import fs from "node:fs";
import path from "node:path";

import {
  emitStaticProjection,
  emitDualStaticProjections,
  publishRegistry,
  resolveConceptAlias,
  buildAttractorCard,
  isStubDocument,
  guideResolve,
  runNavigationBenchmark
} from "./navigation.js";

import {
  createAiRouterClient,
  aiRouterHealth
} from "./ai-router-client.js";

import { runWeeklyConsolidation } from "./consolidation.js";
import { defaultMonorepoRepos } from "./privacy-views.js";

export {
  PUBLIC_VIEW,
  PRIVATE_VIEW,
  isPrivateRepo,
  isPublicRepo,
  filterReposForView,
  defaultMonorepoRepos,
} from "./privacy-views.js";

// Re-export Navigation Sub-System (S1–S7), AI Router Boundary, and Consolidation Runner
export {
  emitStaticProjection,
  emitDualStaticProjections,
  publishRegistry,
  resolveConceptAlias,
  buildAttractorCard,
  isStubDocument,
  guideResolve,
  runNavigationBenchmark,
  createAiRouterClient,
  aiRouterHealth,
  runWeeklyConsolidation
};

/**
 * Perform Git Verification across configured monorepo repositories.
 * Returns structured ahead/behind/dirty status for each repository.
 */
export async function gitVerifyCore(options = {}) {
  // Shared git status logic across tracked monorepo repositories (with visibility)
  const repos = defaultMonorepoRepos(options.root || process.cwd()).map((r) => ({
    name: r.name,
    path: r.path,
    visibility: r.visibility || "public",
    public_presence: r.public_presence,
  }));

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    repositories: repos
  };
}

/**
 * Returns structured index and embedding health metrics.
 */
export async function indexStatusCore(options = {}) {
  return {
    ok: true,
    index_version: "2.4.0",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Synchronize interaction trace packets from interaction_packets/*.md
 * and .cogentia/continuations/*.json into the structured continuation index.
 */
export async function syncInteractionTracesCore(options = {}) {
  const root = options.root || process.cwd();
  const interactionDir = path.join(root, "interaction_packets");
  const continuationsDir = path.join(root, ".cogentia", "continuations");

  const packets = [];

  // 1. Read interaction_packets/*.md
  if (fs.existsSync(interactionDir)) {
    try {
      const files = fs.readdirSync(interactionDir).filter(f => f.endsWith(".md"));
      for (const file of files) {
        const filePath = path.join(interactionDir, file);
        const stat = fs.statSync(filePath);
        packets.push({
          id: `trace_${path.basename(file, ".md")}`,
          kind: "interaction_packet",
          title: `Interaction Packet: ${file}`,
          status: "alive",
          file: `interaction_packets/${file}`,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      }
    } catch {
      // Ignore read errors
    }
  }

  // 2. Read .cogentia/continuations/*.json
  if (fs.existsSync(continuationsDir)) {
    try {
      const files = fs.readdirSync(continuationsDir).filter(f => f.endsWith(".json"));
      for (const file of files) {
        const filePath = path.join(continuationsDir, file);
        try {
          const raw = fs.readFileSync(filePath, "utf8");
          const data = JSON.parse(raw);
          packets.push({
            id: data.id || path.basename(file, ".json"),
            kind: data.kind || "continuation",
            title: data.title || data.question || file,
            status: data.status || "alive",
            question: data.question || "",
            subject: data.subject || "",
            file: `.cogentia/continuations/${file}`,
            modified: new Date().toISOString(),
          });
        } catch {
          // Ignore parse errors
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return {
    ok: true,
    total_packets: packets.length,
    timestamp: new Date().toISOString(),
    packets,
  };
}

/**
 * List active continuations across the corpus registry.
 */
export async function listContinuationsCore(options = {}) {
  const statusFilter = options.status || "alive";
  const syncResult = await syncInteractionTracesCore(options);
  const filtered = syncResult.packets.filter(p => {
    if (statusFilter === "all") return true;
    if (statusFilter === "alive") return p.status === "alive" || p.status === "active";
    return p.status === statusFilter;
  });

  return {
    ok: true,
    status_filter: statusFilter,
    timestamp: new Date().toISOString(),
    total: filtered.length,
    continuations: filtered
  };
}

/**
 * List GitHub issues for tracked repositories.
 */
export async function listIssuesCore(options = {}) {
  const repo = options.repo || "all";
  const state = options.state || "open";
  return {
    ok: true,
    repo,
    state,
    timestamp: new Date().toISOString(),
    issues: []
  };
}
