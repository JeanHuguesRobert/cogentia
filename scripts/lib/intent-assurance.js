/**
 * intent-assurance.js — Generic Intent Assurance Engine (#106)
 *
 * Grounded in research/intent.md (§10-§14).
 * Compares declared stabilized intents against observed realization to detect
 * UNEXPLAINED INTENT PRESERVATION FAILURE before regressions recur.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..");

export const DEFAULT_STABILIZED_INTENTS = [
  {
    id: "intent:concepts-maintenance",
    title: "Concept index and vocabulary maintenance",
    status: "active",
    rationale: "Corpus concept integrity across repos (issue #100)",
    expected_surface: {
      file: "research/concepts.md",
      type: "file_exists",
    },
  },
  {
    id: "intent:source-deep-linking",
    title: "Verifiable GitHub deep links for all citations",
    status: "active",
    rationale: "Public verifiable citations with lines #Lstart-Lend (#121)",
    expected_surface: {
      file: "scripts/lib/source-deep-links.js",
      export_symbol: "resolveSourceUrl",
      type: "module_export",
    },
  },
  {
    id: "intent:provider-circuit-breaker",
    title: "Proactive provider circuit breaker with quota isolation",
    status: "active",
    rationale: "Zero-latency failover when LLM provider balance/quota exhausted (#120)",
    expected_surface: {
      file: "scripts/lib/provider-circuit-breaker.js",
      export_symbol: "createProviderCircuitBreaker",
      type: "module_export",
    },
  },
  {
    id: "intent:smart-extractive-synthesis",
    title: "High-density sentence-level smart extractive synthesis",
    status: "active",
    rationale: "Readable, coherent answers in offline/fail-fast mode (#121)",
    expected_surface: {
      file: "scripts/lib/smart-extractive-synthesizer.js",
      export_symbol: "synthesizeSmartExtractiveAnswer",
      type: "module_export",
    },
  },
  {
    id: "intent:canonical-semantic-cache",
    title: "Zero-token canonical answer cache for core pillars",
    status: "active",
    rationale: "Instantaneous 1ms responses on reference questions (#121)",
    expected_surface: {
      file: "scripts/lib/semantic-answer-cache.js",
      export_symbol: "createSemanticAnswerCache",
      type: "module_export",
    },
  },
  {
    id: "intent:corpus-intent-navigator",
    title: "Intent-first corpus location and authority routing",
    status: "active",
    rationale: "Topology-agnostic concept location and authority ranking (#108)",
    expected_surface: {
      file: "scripts/lib/intent-navigator.js",
      export_symbol: "locateCorpusSubject",
      type: "module_export",
    },
  },
];

export async function verifyDeclaredIntents(customManifest = null) {
  const intents = Array.isArray(customManifest) ? customManifest : DEFAULT_STABILIZED_INTENTS;
  const checks = [];
  const failures = [];

  for (const item of intents) {
    const check = {
      id: item.id,
      title: item.title,
      status: item.status,
      ok: true,
      error_class: null,
      details: null,
    };

    if (item.status === "deprecated" || item.status === "superseded" || item.status === "abandoned") {
      check.note = `Recorded intentional transition (${item.status}): ${item.replacement_reason || "superseded"}`;
      checks.push(check);
      continue;
    }

    const surface = item.expected_surface;
    if (!surface) {
      check.ok = false;
      check.error_class = "UNEXPLAINED_INTENT_PRESERVATION_FAILURE";
      check.details = "No expected realization surface declared";
      failures.push(check);
      checks.push(check);
      continue;
    }

    if (surface.type === "file_exists") {
      const filePath = path.resolve(repoRoot, surface.file);
      if (!fs.existsSync(filePath)) {
        check.ok = false;
        check.error_class = "UNEXPLAINED_INTENT_PRESERVATION_FAILURE";
        check.details = `Required document missing: ${surface.file}`;
        failures.push(check);
      }
    } else if (surface.type === "module_export") {
      const modPath = path.resolve(repoRoot, surface.file);
      if (!fs.existsSync(modPath)) {
        check.ok = false;
        check.error_class = "UNEXPLAINED_INTENT_PRESERVATION_FAILURE";
        check.details = `Required module file missing: ${surface.file}`;
        failures.push(check);
      } else {
        try {
          const mod = await import(`file://${modPath.replace(/\\/g, "/")}`);
          if (surface.export_symbol && typeof mod[surface.export_symbol] === "undefined") {
            check.ok = false;
            check.error_class = "UNEXPLAINED_INTENT_PRESERVATION_FAILURE";
            check.details = `Module ${surface.file} does not export '${surface.export_symbol}'`;
            failures.push(check);
          }
        } catch (err) {
          check.ok = false;
          check.error_class = "UNEXPLAINED_INTENT_PRESERVATION_FAILURE";
          check.details = `Module load error: ${err.message}`;
          failures.push(check);
        }
      }
    }

    checks.push(check);
  }

  const ok = failures.length === 0;
  return {
    ok,
    kind: "cogentia.intent_assurance_report/v1",
    total_intents: intents.length,
    active_intents: intents.filter(i => i.status === "active").length,
    passed: checks.filter(c => c.ok).length,
    failures_count: failures.length,
    failures,
    checks,
    verdict: ok ? "INTENT_PRESERVED" : "UNEXPLAINED INTENT PRESERVATION FAILURE",
  };
}
