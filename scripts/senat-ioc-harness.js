#!/usr/bin/env node

/**
 * senat-ioc-harness.js — Local CLI harness for Sénatoriales 2026 suite under Inversion of Control.
 *
 * Usage:
 *   node scripts/senat-ioc-harness.js orient [--limit <n>]
 *   node scripts/senat-ioc-harness.js emit [--limit <n>] [--out-dir <dir>]
 *   node scripts/senat-ioc-harness.js eval [--eval-run <path.json>] [--limit <n>]
 *   node scripts/senat-ioc-harness.js report [--eval-run <path.json>] [--out <file.md>]
 */

import fs from "node:fs";
import path from "node:path";
import {
  runSenatorialesIocSuite,
  orientQuestion,
  evaluateAnswer,
  emitQuestionContinuation,
  generateSenatorialesReport,
  loadAnswersFromSources,
} from "./lib/senatoriales-ioc.js";

const DEFAULT_QUESTIONS = "docs/evals/senatoriales-questions.json";
const DEFAULT_OUT_DIR = ".cogentia/evals/senat-ioc";

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

try {
  if (["help", "-h", "--help"].includes(command)) {
    usage();
  } else if (command === "orient") {
    await runOrient(args);
  } else if (command === "emit") {
    await runEmit(args);
  } else if (command === "eval") {
    await runEval(args);
  } else if (command === "report") {
    await runReport(args);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`senat-ioc-harness: ${error.message}`);
  process.exit(1);
}

function usage() {
  console.log(`Local Sénatoriales IoC Evaluation Harness

Usage:
  node scripts/senat-ioc-harness.js orient [--limit <n>] [--questions <file>]
  node scripts/senat-ioc-harness.js emit [--limit <n>] [--out-dir <dir>]
  node scripts/senat-ioc-harness.js eval [--eval-run <file.json>] [--limit <n>]
  node scripts/senat-ioc-harness.js report [--eval-run <file.json>] [--out <file.md>]

Examples:
  node scripts/senat-ioc-harness.js orient --limit 3
  node scripts/senat-ioc-harness.js eval --eval-run .cogentia/evals/guide/2026-09-04T09-38-45-787Z-senat-v2.json
  node scripts/senat-ioc-harness.js report --eval-run .cogentia/evals/guide/2026-09-04T09-38-45-787Z-senat-v2.json
`);
}

async function runOrient(options) {
  const qPath = path.resolve(options.questions || DEFAULT_QUESTIONS);
  const questions = JSON.parse(fs.readFileSync(qPath, "utf8"));
  const limit = options.limit ? Number(options.limit) : questions.length;
  const selected = questions.slice(0, limit);

  console.log(`\n=== Local Orientation for Sénatoriales Suite (${selected.length} questions) ===\n`);
  for (const [i, q] of selected.entries()) {
    const o = orientQuestion(q);
    console.log(`[Q${i + 1}] ${o.id}`);
    console.log(`  Question: ${o.question}`);
    console.log(`  Expected signals: ${o.expected.join(", ")}`);
    console.log(`  Local target docs (${o.targets.length}):`);
    for (const t of o.targets) {
      const status = t.exists ? `OK (${t.line_count} lines)` : "MISSING";
      console.log(`    - [${status}] ${t.repo}:${t.path} (${t.title})`);
    }
    console.log();
  }
}

async function runEmit(options) {
  const qPath = path.resolve(options.questions || DEFAULT_QUESTIONS);
  const outDir = path.resolve(options.outDir || DEFAULT_OUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  const questions = JSON.parse(fs.readFileSync(qPath, "utf8"));
  const limit = options.limit ? Number(options.limit) : questions.length;
  const selected = questions.slice(0, limit);

  console.log(`\nEmitting ${selected.length} continuation packets to ${outDir}...\n`);
  for (const q of selected) {
    const o = orientQuestion(q);
    const ctn = emitQuestionContinuation(o);
    const file = path.join(outDir, `${ctn.continuation_id}.json`);
    fs.writeFileSync(file, JSON.stringify(ctn, null, 2), "utf8");
    console.log(`  - Wrote ${ctn.continuation_id}.json`);
  }
}

async function runEval(options) {
  const suite = await runSenatorialesIocSuite({
    questionsPath: options.questions || DEFAULT_QUESTIONS,
    limit: options.limit ? Number(options.limit) : 0,
    evalRun: options.evalRun,
    answers: options.answers,
  });

  console.log(`\n=== Local IoC Evaluation Results (${suite.evaluated_count}/${suite.count} evaluated) ===\n`);
  for (const item of suite.results) {
    if (!item.evaluation) continue;
    const ev = item.evaluation;
    const status = ev.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${item.id} (Signal score: ${Math.round(ev.signal_score * 100)}%, Citations: ${ev.citations_count})`);
    if (ev.missing_signals.length) {
      console.log(`       Missing signals: ${ev.missing_signals.join(", ")}`);
    }
    if (ev.leaks.meta_opening) console.log(`       WARNING: Meta-opening detected`);
    if (ev.leaks.windows_path || ev.leaks.unix_path) console.log(`       WARNING: Filesystem path leak detected`);
    if (ev.leaks.sanitizer_modified) console.log(`       INFO: Sanitizer scrubbed boilerplate`);
  }
  console.log(`\nOverall OK: ${suite.ok}\n`);
}

async function runReport(options) {
  const suite = await runSenatorialesIocSuite({
    questionsPath: options.questions || DEFAULT_QUESTIONS,
    limit: options.limit ? Number(options.limit) : 0,
    evalRun: options.evalRun,
    answers: options.answers,
  });

  const outPath = options.out
    ? path.resolve(options.out)
    : path.resolve(DEFAULT_OUT_DIR, `${new Date().toISOString().slice(0, 10)}-senat-ioc-report.md`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const report = generateSenatorialesReport(suite);
  fs.writeFileSync(outPath, report, "utf8");
  console.log(`Wrote report to ${outPath}`);
}

function parseArgs(raw) {
  const parsed = {};
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (!arg.startsWith("--")) continue;
    const key = toCamel(arg.slice(2));
    const next = raw[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i++;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function toCamel(str) {
  return str.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}
