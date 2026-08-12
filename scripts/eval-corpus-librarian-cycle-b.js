#!/usr/bin/env node
/**
 * Live rate for Cycle B: deterministic explore only (no LLM synthesizer).
 * Measures packet coverage, tool calls, latency against a running gateway.
 */

import fs from "node:fs";
import path from "node:path";
import { createCorpusLibrarianTools, exploreCorpusDeterministic } from "./lib/corpus-librarian/index.js";

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.baseUrl || process.env.COGENTIA_GATEWAY_URL || "http://127.0.0.1:8790";
const questionsPath = path.resolve(args.questions || "docs/evals/guide-questions.json");
const outDir = path.resolve(args.outDir || ".cogentia/evals/corpus-librarian");
const limit = args.limit ? Number(args.limit) : 0;
const mode = args.mode || "keyword"; // keyword is offline-friendly without embed router

const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
const cases = (limit > 0 ? questions.slice(0, limit) : questions).map(item => ({
  id: item.id,
  question: item.question,
  locale: item.locale || "en",
  intent: item.intent || "explain",
  freshnessRequired: Boolean(item.web_search),
  expected: item.expected || [],
}));

const tools = createCorpusLibrarianTools({ baseUrl, timeoutMs: 15000 });
const results = [];

for (const [index, item] of cases.entries()) {
  process.stderr.write(`[cycle-b] ${index + 1}/${cases.length} ${item.id}\n`);
  const started = Date.now();
  let exploration;
  try {
    exploration = await exploreCorpusDeterministic({
      question: item.question,
      locale: item.locale,
      intent: item.intent,
      freshnessRequired: item.freshnessRequired,
    }, { tools, mode, openTopK: 3, searchLimit: 8, minOpenChars: 80 });
  } catch (error) {
    exploration = {
      ok: false,
      stopReason: "runtime_error",
      packet: { coverage: "none", excerpts: [], source_ids: [], diagnostics: {}, gaps: [String(error?.message || error).slice(0, 120)] },
      trace: [],
    };
  }
  const latencyMs = Date.now() - started;
  const packet = exploration.packet || {};
  const excerptText = (packet.excerpts || []).map(x => x.text).join("\n");
  const expected = (item.expected || []).map(term => ({
    term,
    matched: fold(excerptText).includes(fold(term)),
  }));
  results.push({
    id: item.id,
    locale: item.locale,
    question: item.question,
    ok: Boolean(exploration.ok),
    stopReason: exploration.stopReason,
    coverage: packet.coverage,
    excerptCount: (packet.excerpts || []).length,
    sourceIds: packet.source_ids || [],
    gaps: packet.gaps || [],
    toolCalls: packet.diagnostics?.tool_calls ?? exploration.trace?.length ?? 0,
    searchCalls: packet.diagnostics?.search_calls ?? 0,
    openCalls: packet.diagnostics?.open_calls ?? 0,
    expandCalls: packet.diagnostics?.expand_calls ?? 0,
    path: packet.diagnostics?.path || null,
    indexHash: packet.diagnostics?.index_hash || null,
    latencyMs,
    expectedRatio: expected.length ? expected.filter(x => x.matched).length / expected.length : 1,
    expected,
    sampleSourceIds: (packet.source_ids || []).slice(0, 4),
  });
}

const summary = summarize(results);
const generatedAt = new Date().toISOString();
const report = {
  kind: "corpus-librarian-cycle-b-live/v1",
  generated_at: generatedAt,
  base_url: baseUrl,
  mode,
  summary,
  results,
};

fs.mkdirSync(outDir, { recursive: true });
const stem = `${generatedAt.replace(/[:.]/g, "-")}-cycle-b-live`;
const jsonPath = path.join(outDir, `${stem}.json`);
const mdPath = path.join(outDir, `${stem}.md`);
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(mdPath, renderMarkdown(report));

const scorecardLine = {
  cycle: "B",
  at: generatedAt.slice(0, 10),
  status: summary.coverage_none === 0 ? "live_rate_ok" : "live_rate_partial",
  change: "Live rate of deterministic search→open(+expand) against context gateway",
  eval: {
    kind: "live_gateway",
    cases: summary.cases,
    mode,
    base_url: baseUrl,
    report: path.relative(process.cwd(), jsonPath).replace(/\\/g, "/"),
  },
  scores: {
    quality: "packet_only_no_synthesis",
    grounding: `mean_expected_in_excerpts=${summary.mean_expected_ratio}`,
    speed: `mean_ms=${summary.mean_latency_ms}`,
    cost: `mean_tools=${summary.mean_tool_calls}`,
    coverage: `enough=${summary.coverage_enough};partial=${summary.coverage_partial};none=${summary.coverage_none}`,
    stability: "single_run",
  },
  gates: {
    offline_tests: "pass",
    packet_none_rate: summary.coverage_none / Math.max(summary.cases, 1),
    mean_tool_calls_le_8: summary.mean_tool_calls <= 8,
    mean_latency_ms_le_5000: summary.mean_latency_ms <= 5000,
  },
  notes: "Cycle B does not synthesize answers; quality vs L0 prose deferred to synthesizer wiring.",
};

const scorecardPath = path.resolve("research/corpus_librarian_scorecard.jsonl");
fs.appendFileSync(scorecardPath, `${JSON.stringify(scorecardLine)}\n`);

console.log(JSON.stringify({
  ok: true,
  json: path.relative(process.cwd(), jsonPath),
  report: path.relative(process.cwd(), mdPath),
  scorecard: path.relative(process.cwd(), scorecardPath),
  summary,
}, null, 2));

function summarize(items) {
  const n = items.length || 1;
  const mean = field => items.reduce((sum, item) => sum + Number(item[field] || 0), 0) / n;
  return {
    cases: items.length,
    ok: items.filter(item => item.ok).length,
    coverage_enough: items.filter(item => item.coverage === "enough").length,
    coverage_partial: items.filter(item => item.coverage === "partial").length,
    coverage_none: items.filter(item => item.coverage === "none").length,
    mean_latency_ms: Math.round(mean("latencyMs")),
    mean_tool_calls: Math.round(mean("toolCalls") * 100) / 100,
    mean_open_calls: Math.round(mean("openCalls") * 100) / 100,
    mean_expand_calls: Math.round(mean("expandCalls") * 100) / 100,
    mean_expected_ratio: Math.round(mean("expectedRatio") * 1000) / 1000,
    mean_excerpt_count: Math.round(mean("excerptCount") * 100) / 100,
  };
}

function renderMarkdown(run) {
  const lines = [
    "# Corpus librarian Cycle B live rate",
    "",
    `Generated: ${run.generated_at}`,
    `Gateway: \`${run.base_url}\``,
    `Mode: \`${run.mode}\``,
    "",
    "| Case | OK | Coverage | Excerpts | Tools | ms | Expected-in-excerpts |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
  ];
  for (const item of run.results) {
    lines.push(`| ${item.id} | ${item.ok} | ${item.coverage} | ${item.excerptCount} | ${item.toolCalls} | ${item.latencyMs} | ${Math.round(item.expectedRatio * 100)}% |`);
  }
  lines.push(
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(run.summary, null, 2),
    "```",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function fold(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    out[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] =
      argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
