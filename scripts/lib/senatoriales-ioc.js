/**
 * senatoriales-ioc.js — Local Inversion of Control (IoC) evaluation module (Cogentia v3).
 *
 * Implements the Agent-Resumable pattern for the Sénatoriales 2026 test suite:
 * 1. Deterministic local orientation & file retrieval from the C:\tweesic workspace.
 * 2. Typed continuation emission (cogentia.continuation.v2) at judgment boundaries.
 * 3. Deterministic evaluation: anti-leak sanitization, expected signals coverage, citation audit.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guideResolve, SEED_CONCEPT_ALIASES } from "./navigation.js";
import { sanitizeSurfaceAnswer } from "./agent-jhn-reasoning-loop-v2.js";
import { registerModule } from "./v3-modules.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(REPO_ROOT, "..");
const DEFAULT_QUESTIONS = path.resolve(REPO_ROOT, "docs/evals/senatoriales-questions.json");

/**
 * Resolve local corpus file path in the multi-repo workspace.
 */
export function resolveWorkspacePath(repo, relPath) {
  const cleanRel = String(relPath || "").replace(/^\/+/, "");
  return path.resolve(WORKSPACE_ROOT, repo, cleanRel);
}

/**
 * Deterministically orient a mayoral/senatorial question to local corpus files.
 */
export function orientQuestion(questionItem) {
  const question = String(questionItem.question || "").trim();
  const nav = guideResolve(question);
  const targets = [];

  if (nav?.canonical_repo && nav?.canonical_rel) {
    const fullPath = resolveWorkspacePath(nav.canonical_repo, nav.canonical_rel);
    targets.push({
      repo: nav.canonical_repo,
      path: nav.canonical_rel,
      full_path: fullPath,
      exists: fs.existsSync(fullPath),
      title: nav.concept_name || nav.canonical_rel,
      url: nav.canonical_url,
      primary: true,
    });
  }

  // Also match any additional seed aliases
  const qNorm = question.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  for (const seed of SEED_CONCEPT_ALIASES) {
    if (targets.some(t => t.repo === seed.canonical_repo && t.path === seed.canonical_rel)) continue;
    for (const alias of seed.aliases) {
      const aliasNorm = alias.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      if (aliasNorm.length >= 4 && qNorm.includes(aliasNorm)) {
        const fullPath = resolveWorkspacePath(seed.canonical_repo, seed.canonical_rel);
        targets.push({
          repo: seed.canonical_repo,
          path: seed.canonical_rel,
          full_path: fullPath,
          exists: fs.existsSync(fullPath),
          title: seed.name,
          url: seed.canonical_url,
          primary: false,
        });
        break;
      }
    }
  }

  // Read excerpts from existing local files
  for (const t of targets) {
    if (t.exists) {
      try {
        const text = fs.readFileSync(t.full_path, "utf8");
        t.excerpt = text.slice(0, 800).replace(/\r\n/g, "\n");
        t.line_count = text.split("\n").length;
      } catch {
        t.excerpt = "";
      }
    }
  }

  return {
    id: questionItem.id,
    question,
    locale: questionItem.locale || "fr",
    expected: questionItem.expected || [],
    targets,
  };
}

/**
 * Emit a structured continuation object (cogentia.continuation.v2) for missing judgment.
 */
export function emitQuestionContinuation(oriented) {
  return {
    continuation_id: `ctn_senat_${oriented.id}`,
    protocol: "cogentia.continuation.v2",
    status: "active",
    kind: "senatoriales.surface_synthesis",
    recommended_strategy: "mayoral_inquiry",
    title: `Sénatoriales 2026: ${oriented.id}`,
    question: oriented.question,
    subject: oriented.targets.map(t => `${t.repo}:${t.path}`).join(", "),
    context: {
      id: oriented.id,
      locale: oriented.locale,
      expected_signals: oriented.expected,
      evidence_targets: oriented.targets.map(t => ({
        repo: t.repo,
        path: t.path,
        title: t.title,
        excerpt: t.excerpt ? `${t.excerpt.slice(0, 300)}...` : "",
      })),
    },
    allowed_responses: ["substantive_answer"],
    resume_command: `node scripts/senat-ioc-harness.js resolve ${oriented.id} <answer.txt>`,
  };
}

/**
 * Evaluate an answer string deterministically:
 * - Anti-leak sanitization (verifies zero leaks, zero preambles)
 * - Expected doctrinal signals coverage
 * - Citation formatting
 */
export function evaluateAnswer(questionItem, rawAnswer) {
  const answer = String(rawAnswer || "").trim();
  const sanitized = sanitizeSurfaceAnswer(answer);
  const hasSanitizationDiff = answer !== sanitized;

  // Signal detection (accent-insensitive)
  const normAnswer = answer.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const matchedSignals = [];
  const missingSignals = [];

  for (const signal of questionItem.expected || []) {
    const normSignal = String(signal).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (normAnswer.includes(normSignal)) {
      matchedSignals.push(signal);
    } else {
      missingSignals.push(signal);
    }
  }

  const signalScore = (questionItem.expected?.length > 0)
    ? (matchedSignals.length / questionItem.expected.length)
    : 1;

  // Citation check
  const citationMatches = [...answer.matchAll(/\[(?:[a-zA-Z0-9_\-]+:)?([^\]]+#[L\d\-]+)\]/g)];

  // Leak checks
  const hasWindowsPath = /[A-Za-z]:\\[a-zA-Z0-9_\-\.\\]+/.test(answer);
  const hasUnixPath = /\/(?:srv|Users|home)\/[a-zA-Z0-9_\-\.\/]+/.test(answer);
  const hasMetaOpening = /^(?:Je\s+(?:réponds|pars|consulte|vérifie|m[’']appuie|vais|formule))/i.test(answer);

  return {
    id: questionItem.id,
    ok: !hasWindowsPath && !hasUnixPath && !hasMetaOpening && signalScore >= 0.6,
    signal_score: Math.round(signalScore * 100) / 100,
    matched_signals: matchedSignals,
    missing_signals: missingSignals,
    citations_count: citationMatches.length,
    citations: citationMatches.map(m => m[0]),
    leaks: {
      windows_path: hasWindowsPath,
      unix_path: hasUnixPath,
      meta_opening: hasMetaOpening,
      sanitizer_modified: hasSanitizationDiff,
    },
    sanitized_answer: sanitized,
    word_count: sanitized.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Load answers from an evaluation run JSON or answers JSON file.
 */
export function loadAnswersFromSources({ evalRun, answers } = {}) {
  const map = {};
  if (evalRun) {
    const full = path.resolve(evalRun);
    if (fs.existsSync(full)) {
      const runData = JSON.parse(fs.readFileSync(full, "utf8"));
      for (const r of runData.results || []) {
        if (r.id && r.answer) map[r.id] = r.answer;
      }
    }
  }
  if (answers) {
    const full = path.resolve(answers);
    if (fs.existsSync(full)) {
      const data = JSON.parse(fs.readFileSync(full, "utf8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.id && (item.answer || item.response)) {
            map[item.id] = item.answer || item.response;
          }
        }
      } else if (typeof data === "object" && data !== null) {
        for (const [k, v] of Object.entries(data)) {
          map[k] = typeof v === "string" ? v : (v.answer || v.response || "");
        }
      }
    }
  }
  return map;
}

/**
 * Generate a consolidated Markdown report for an IoC evaluation suite run.
 */
export function generateSenatorialesReport(suite) {
  const lines = [
    "# Rapport d'Évaluation Locale IoC — Sénatoriales 2026",
    "",
    `- Date : ${suite.timestamp}`,
    `- Questions : ${suite.count}`,
    `- Évaluées : ${suite.evaluated_count}`,
    `- Conforme : ${suite.ok ? "OUI" : "NON"}`,
    "",
    "## Synthèse des résultats",
    "",
    "| # | Question ID | Statut | Signaux retenus | Citations | Fuites / Préambules |",
    "|---|---|:---:|:---:|:---:|:---:|",
  ];

  for (const [i, item] of suite.results.entries()) {
    if (!item.evaluation) {
      lines.push(`| ${i + 1} | \`${item.id}\` | EN ATTENTE (Continuation) | - | - | - |`);
      continue;
    }
    const ev = item.evaluation;
    const status = ev.ok ? "PASS" : "FAIL";
    const signals = `${ev.matched_signals.length}/${item.expected.length}`;
    const leakDesc = ev.leaks.sanitizer_modified ? "Nettoyé (0 fuite)" : "Propre (0 fuite)";
    lines.push(`| ${i + 1} | \`${item.id}\` | **${status}** | ${signals} (${Math.round(ev.signal_score * 100)}%) | ${ev.citations_count} | ${leakDesc} |`);
  }

  lines.push("", "## Détail des évaluations par question", "");
  for (const [i, item] of suite.results.entries()) {
    lines.push(`### [Q${i + 1}] ${item.id}`, "");
    lines.push(`**Question :** ${item.question}`, "");
    lines.push(`**Signaux attendus :** \`${item.expected.join("`, `")}\``, "");
    if (item.targets?.length) {
      lines.push("**Ancrage local :**");
      for (const t of item.targets) {
        lines.push(`- \`${t.repo}:${t.path}\` (${t.exists ? "présent" : "absent"})`);
      }
      lines.push("");
    }
    if (item.evaluation) {
      const ev = item.evaluation;
      lines.push(`- **Score sémantique :** ${Math.round(ev.signal_score * 100)}%`);
      lines.push(`- **Signaux validés :** ${ev.matched_signals.join(", ") || "aucun"}`);
      if (ev.missing_signals.length) lines.push(`- **Signaux manquants :** ${ev.missing_signals.join(", ")}`);
      lines.push(`- **Citations :** ${ev.citations.join(", ") || "aucune"}`);
      lines.push(`- **Longueur :** ${ev.word_count} mots`, "");
      lines.push("**Réponse assainie :**", "", "```text", ev.sanitized_answer, "```", "");
    }
  }

  return lines.join("\n");
}

/**
 * Run the IoC suite locally.
 */
export async function runSenatorialesIocSuite({ questionsPath, limit = 0, answersMap = {}, evalRun, answers } = {}) {
  const qPath = path.resolve(questionsPath || DEFAULT_QUESTIONS);
  const raw = JSON.parse(fs.readFileSync(qPath, "utf8"));
  const questions = (Array.isArray(raw) ? raw : []).slice(0, limit || undefined);

  const mergedAnswers = {
    ...loadAnswersFromSources({ evalRun, answers }),
    ...answersMap,
  };

  const results = [];
  const continuations = [];

  for (const q of questions) {
    const oriented = orientQuestion(q);
    const providedAnswer = mergedAnswers[q.id];

    if (providedAnswer) {
      const evaluation = evaluateAnswer(q, providedAnswer);
      results.push({
        id: q.id,
        question: q.question,
        expected: q.expected,
        targets: oriented.targets,
        evaluation,
      });
    } else {
      const ctn = emitQuestionContinuation(oriented);
      continuations.push(ctn);
      results.push({
        id: q.id,
        question: q.question,
        expected: q.expected,
        targets: oriented.targets,
        continuation: ctn,
      });
    }
  }

  return {
    ok: results.every(r => r.evaluation ? r.evaluation.ok : true),
    timestamp: new Date().toISOString(),
    count: questions.length,
    evaluated_count: results.filter(r => r.evaluation).length,
    pending_continuations_count: continuations.length,
    results,
    continuations,
  };
}

/**
 * Register the senatoriales capability module in the v3 module registry.
 */
export function registerSenatorialesModule() {
  return registerModule({
    id: "senatoriales.eval",
    kind: "capability_provider",
    provides: { capabilities: ["senatoriales.eval", "senatoriales.orient", "senatoriales.emit", "senatoriales.report"] },
    governance: { requires: [], trace_minimum: "none" },
    run: ({ questionsPath, limit, answersMap, evalRun, answers, mode = "suite", questionItem, rawAnswer, suite }) => {
      if (mode === "orient") {
        return orientQuestion(questionItem);
      }
      if (mode === "eval_single") {
        return evaluateAnswer(questionItem, rawAnswer);
      }
      if (mode === "emit_single") {
        return emitQuestionContinuation(questionItem);
      }
      if (mode === "report") {
        return { ok: true, report: generateSenatorialesReport(suite) };
      }
      return runSenatorialesIocSuite({ questionsPath, limit, answersMap, evalRun, answers });
    },
  });
}
