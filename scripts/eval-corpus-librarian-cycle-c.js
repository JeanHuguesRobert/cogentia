#!/usr/bin/env node
/**
 * Cycle C live rate: baseline single focused search + synth
 * vs librarian progressive explore + same synth.
 */

import fs from "node:fs";
import path from "node:path";
import {
  answerWithBaselineRetrieve,
  answerWithLibrarian,
} from "./lib/corpus-librarian/index.js";

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.baseUrl || process.env.COGENTIA_GATEWAY_URL || "http://127.0.0.1:8790";
const questionsPath = path.resolve(args.questions || "docs/evals/guide-questions.json");
const outDir = path.resolve(args.outDir || ".cogentia/evals/corpus-librarian");
const limit = args.limit ? Number(args.limit) : 0;
const mode = args.mode || "keyword";
const model = args.model || process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL || "gpt-5.6-terra";
const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
if (!apiKey) throw new Error("OPENAI_API_KEY is required for Cycle C synthesis rate");

const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
const cases = (limit > 0 ? questions.slice(0, limit) : questions);
const results = [];
const shared = { baseUrl, mode, apiKey, model, maxChars: 1200, channel: "api" };

for (const [index, item] of cases.entries()) {
  process.stderr.write(`[cycle-c] ${index + 1}/${cases.length} ${item.id}\n`);
  const input = {
    question: item.question,
    locale: item.locale || "en",
  };

  const baseline = await answerWithBaselineRetrieve(input, shared);
  const librarian = await answerWithLibrarian(input, shared);

  results.push({
    id: item.id,
    locale: item.locale,
    question: item.question,
    expected: item.expected || [],
    baseline: scoreSide(baseline, item),
    librarian: scoreSide(librarian, item),
  });
}

const summary = summarize(results);
const generatedAt = new Date().toISOString();
const report = {
  kind: "corpus-librarian-cycle-c-live/v1",
  generated_at: generatedAt,
  base_url: baseUrl,
  mode,
  model,
  note: "Guide L0 unavailable on public gateway; baseline = single focused keyword search + same synthesizer.",
  summary,
  results,
};

fs.mkdirSync(outDir, { recursive: true });
const stem = `${generatedAt.replace(/[:.]/g, "-")}-cycle-c-live`;
const jsonPath = path.join(outDir, `${stem}.json`);
const mdPath = path.join(outDir, `${stem}.md`);
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(mdPath, renderMarkdown(report));

const scorecardLine = {
  cycle: "C",
  at: generatedAt.slice(0, 10),
  status: summary.activation_candidate ? "live_rate_candidate" : "live_rate_complete",
  change: "Synthesize from librarian packet; compare to single-focus baseline retrieve + same synthesizer",
  eval: {
    kind: "live_gateway_plus_openai",
    cases: summary.cases,
    mode,
    model,
    report: path.relative(process.cwd(), jsonPath).replace(/\\/g, "/"),
  },
  scores: {
    quality: `baseline_pass=${summary.baseline_pass};librarian_pass=${summary.librarian_pass};mean_expected baseline=${summary.baseline_mean_expected} librarian=${summary.librarian_mean_expected}`,
    grounding: `mean_citations baseline=${summary.baseline_mean_citations} librarian=${summary.librarian_mean_citations}`,
    speed: `mean_ms baseline=${summary.baseline_mean_ms} librarian=${summary.librarian_mean_ms}`,
    cost: `mean_tools baseline=${summary.baseline_mean_tools} librarian=${summary.librarian_mean_tools}`,
    coverage: `librarian_none=${summary.librarian_none}`,
    stability: "single_run",
  },
  gates: {
    librarian_pass_ge_baseline: summary.librarian_pass >= summary.baseline_pass,
    librarian_mean_expected_ge_baseline: summary.librarian_mean_expected + 1e-9 >= summary.baseline_mean_expected,
    no_librarian_empty: summary.librarian_empty === 0,
  },
  notes: "Not full Guide L0; measures progressive explore value for synthesis quality.",
};
fs.appendFileSync(
  path.resolve("research/corpus_librarian_scorecard.jsonl"),
  `${JSON.stringify(scorecardLine)}\n`,
);

console.log(JSON.stringify({
  ok: true,
  json: path.relative(process.cwd(), jsonPath),
  report: path.relative(process.cwd(), mdPath),
  summary,
}, null, 2));

function scoreSide(result, item) {
  const answer = String(result.answer || "");
  const folded = fold(answer);
  const expected = (item.expected || []).map(term => ({
    term,
    matched: folded.includes(fold(term)),
  }));
  const expectedRatio = expected.length ? expected.filter(x => x.matched).length / expected.length : 1;
  const citations = (answer.match(/\[[^\]]+:[^\]]+\]/g) || []).length;
  return {
    ok: Boolean(result.ok),
    path: result.path,
    answer,
    chars: answer.length,
    language_ok: languageOk(answer, item.locale),
    expected_ratio: expectedRatio,
    expected,
    citations,
    latencyMs: result.latencyMs,
    exploreMs: result.explore?.latencyMs,
    synthMs: result.synthesis?.latencyMs,
    toolCalls: result.explore?.toolCalls,
    provider: result.provider,
    packet_coverage: result.packet?.coverage,
    sample_sources: (result.packet?.source_ids || []).slice(0, 3),
  };
}

function summarize(items) {
  const n = items.length || 1;
  const mean = (side, field) => items.reduce((sum, item) => sum + Number(item[side][field] || 0), 0) / n;
  const pass = side => items.filter(item =>
    item[side].language_ok && item[side].chars > 40 && item[side].chars <= 1400 && item[side].expected_ratio >= 0.5,
  ).length;
  const summary = {
    cases: items.length,
    baseline_pass: pass("baseline"),
    librarian_pass: pass("librarian"),
    baseline_mean_expected: round(mean("baseline", "expected_ratio")),
    librarian_mean_expected: round(mean("librarian", "expected_ratio")),
    baseline_mean_ms: Math.round(mean("baseline", "latencyMs")),
    librarian_mean_ms: Math.round(mean("librarian", "latencyMs")),
    baseline_mean_tools: round(mean("baseline", "toolCalls")),
    librarian_mean_tools: round(mean("librarian", "toolCalls")),
    baseline_mean_citations: round(mean("baseline", "citations")),
    librarian_mean_citations: round(mean("librarian", "citations")),
    librarian_empty: items.filter(item => !item.librarian.answer).length,
    librarian_none: items.filter(item => item.librarian.packet_coverage === "none").length,
  };
  summary.activation_candidate =
    summary.librarian_pass >= summary.baseline_pass
    && summary.librarian_mean_expected >= summary.baseline_mean_expected
    && summary.librarian_empty === 0;
  return summary;
}

function renderMarkdown(run) {
  const lines = [
    "# Corpus librarian Cycle C live rate",
    "",
    `Generated: ${run.generated_at}`,
    `Model: \`${run.model}\` · Mode: \`${run.mode}\``,
    "",
    run.note,
    "",
    "| Case | Base exp | Lib exp | Base ms | Lib ms | Base tools | Lib tools | Base cites | Lib cites |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const item of run.results) {
    lines.push(
      `| ${item.id} | ${Math.round(item.baseline.expected_ratio * 100)}% | ${Math.round(item.librarian.expected_ratio * 100)}% | ${item.baseline.latencyMs} | ${item.librarian.latencyMs} | ${item.baseline.toolCalls} | ${item.librarian.toolCalls} | ${item.baseline.citations} | ${item.librarian.citations} |`,
    );
  }
  lines.push("", "## Summary", "", "```json", JSON.stringify(run.summary, null, 2), "```", "");
  for (const item of run.results) {
    lines.push(
      `## ${item.id}`,
      "",
      `**Q:** ${item.question}`,
      "",
      "**Baseline**",
      "",
      item.baseline.answer || "_(empty)_",
      "",
      "**Librarian**",
      "",
      item.librarian.answer || "_(empty)_",
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

function languageOk(text, locale) {
  const folded = fold(text);
  return locale === "fr"
    ? /\b(le|la|les|une|des|pour|avec|est|dans|sur)\b/.test(folded)
    : /\b(the|a|an|is|for|with|to|and|of)\b/.test(folded);
}
function fold(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function round(value) {
  return Math.round(value * 1000) / 1000;
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
