#!/usr/bin/env node
/**
 * Blind semantic A/B for Cycle C runs: librarian vs baseline.
 * Evidence for the judge = union of packet excerpts from both sides.
 */

import fs from "node:fs";
import path from "node:path";
import { createOpenAiSemanticJudge } from "./lib/agent-jhn-whatsapp/semantic-judge.js";
import {
  createCorpusLibrarianTools,
  exploreCorpusDeterministic,
  focusSearchQuery,
} from "./lib/corpus-librarian/index.js";

const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(required(args, "run"));
const run = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const challenger = "librarian";
const champion = "baseline";
if ((run.results || []).some(item => !item[challenger] || !item[champion])) {
  throw new Error("Run must include baseline and librarian answers");
}

const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const baseUrl = args.baseUrl || run.base_url || process.env.COGENTIA_GATEWAY_URL || "http://127.0.0.1:8790";
const mode = args.mode || run.mode || "keyword";
const tools = createCorpusLibrarianTools({ baseUrl, timeoutMs: 15000 });

const judge = createOpenAiSemanticJudge({
  apiKey,
  model: args.model || "gpt-5.6-sol",
  timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : 45000,
});

const judgments = [];
for (const [index, item] of (run.results || []).entries()) {
  process.stderr.write(`[librarian-semantic] ${index + 1}/${run.results.length} ${item.id}\n`);
  const challengerIsA = stableFlip(item.id);
  const candidates = challengerIsA
    ? { A: item[challenger].answer, B: item[champion].answer }
    : { A: item[champion].answer, B: item[challenger].answer };
  const evidence = await rebuildEvidence(item, tools, mode);
  const raw = await judge.judge({
    question: item.question,
    locale: item.locale,
    expected_concepts: item.expected || [],
    public_evidence: evidence,
    candidate_A: candidates.A,
    candidate_B: candidates.B,
  });
  const winner = raw.winner === "tie"
    ? "tie"
    : (raw.winner === (challengerIsA ? "A" : "B") ? challenger : champion);
  judgments.push({
    id: item.id,
    winner,
    confidence: raw.confidence,
    critical_regression: {
      [challenger]: raw.critical_regression[challengerIsA ? "A" : "B"],
      [champion]: raw.critical_regression[challengerIsA ? "B" : "A"],
    },
    scores: {
      [challenger]: raw.scores[challengerIsA ? "A" : "B"],
      [champion]: raw.scores[challengerIsA ? "B" : "A"],
    },
    reasons: raw.reasons,
    blind_order: challengerIsA ? `${challenger}=A` : `${challenger}=B`,
  });
}

const summary = summarize(judgments, challenger, champion);
const output = {
  kind: "corpus-librarian-semantic-eval/v1",
  generated_at: new Date().toISOString(),
  source_run: path.relative(process.cwd(), inputPath).replace(/\\/g, "/"),
  judge_model: judge.model,
  challenger,
  champion,
  summary,
  judgments,
};
const outputPath = path.join(
  path.dirname(inputPath),
  `${path.basename(inputPath, ".json")}-librarian-semantic.json`,
);
const markdownPath = outputPath.replace(/\.json$/, ".md");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(markdownPath, markdown(output));

const scorecardLine = {
  cycle: "C-semantic",
  at: output.generated_at.slice(0, 10),
  status: summary.activation_candidate ? "semantic_candidate" : "semantic_complete",
  change: "Blind semantic judge librarian vs baseline on Cycle C answers",
  eval: {
    kind: "blind_semantic",
    cases: summary.cases,
    judge_model: judge.model,
    report: path.relative(process.cwd(), outputPath).replace(/\\/g, "/"),
  },
  scores: {
    quality: `wins librarian=${summary.wins.librarian} baseline=${summary.wins.baseline} tie=${summary.wins.tie}`,
    grounding: `critical_librarian=${summary.challenger_critical_regressions}`,
  },
  gates: {
    critical_librarian_zero: summary.challenger_critical_regressions === 0,
    librarian_win_rate_ge_0_5: (summary.wins.librarian + summary.wins.tie * 0.5) / Math.max(summary.cases, 1) >= 0.5,
    activation_candidate: summary.activation_candidate,
  },
  notes: "Champion is baseline single-focus retrieve, not Guide L0.",
};
fs.appendFileSync(
  path.resolve("research/corpus_librarian_scorecard.jsonl"),
  `${JSON.stringify(scorecardLine)}\n`,
);

console.log(JSON.stringify({
  ok: true,
  output: path.relative(process.cwd(), outputPath),
  report: path.relative(process.cwd(), markdownPath),
  summary,
}, null, 2));

/**
 * Rebuild retrieval text so the judge sees real excerpts, not source_id stubs.
 * Union of librarian progressive packet + baseline single-focus hits.
 */
async function rebuildEvidence(item, tools, mode) {
  const seen = new Set();
  const out = [];
  const pushPacket = (packet) => {
    for (const excerpt of packet?.excerpts || []) {
      const sourceId = String(excerpt.source_id || "").trim();
      const text = String(excerpt.text || "").replace(/\s+/g, " ").trim();
      if (!sourceId || !text || seen.has(sourceId)) continue;
      seen.add(sourceId);
      out.push({ source_id: sourceId, text: text.slice(0, 1400) });
    }
  };

  try {
    const librarian = await exploreCorpusDeterministic({
      question: item.question,
      locale: item.locale,
    }, { tools, mode, openTopK: 3, searchLimit: 8, minOpenChars: 40 });
    pushPacket(librarian.packet);
  } catch {
    /* keep going with baseline evidence */
  }

  try {
    const focused = focusSearchQuery(item.question) || item.question;
    const search = await tools.search({
      query: focused,
      limit: 6,
      mode,
      include_text: true,
    });
    pushPacket({
      excerpts: (search.hits || []).slice(0, 3).map(hit => ({
        source_id: hit.source_id,
        text: hit.text,
      })),
    });
  } catch {
    /* optional */
  }

  return out.slice(0, 12);
}

function summarize(items, challengerName, championName) {
  const wins = { [challengerName]: 0, [championName]: 0, tie: 0 };
  for (const item of items) wins[item.winner] += 1;
  const critical = items.filter(item => item.critical_regression[challengerName]).length;
  return {
    cases: items.length,
    wins,
    challenger_critical_regressions: critical,
    champion_critical_regressions: items.filter(item => item.critical_regression[championName]).length,
    activation_candidate: critical === 0 && wins[challengerName] >= Math.ceil(items.length * 0.5),
  };
}

function markdown(result) {
  const c = result.challenger;
  const h = result.champion;
  const lines = [
    "# Corpus librarian semantic evaluation",
    "",
    `Generated: ${result.generated_at}`,
    `Judge: ${result.judge_model}`,
    `Source: \`${result.source_run}\``,
    "",
    `${c} wins: **${result.summary.wins[c]}** · ${h} wins: **${result.summary.wins[h]}** · Ties: **${result.summary.wins.tie}**`,
    `Critical ${c} regressions: **${result.summary.challenger_critical_regressions}**`,
    `Activation candidate: **${result.summary.activation_candidate ? "yes" : "no"}**`,
    "",
    `| Case | Winner | Confidence | ${c} avg | ${h} avg |`,
    "| --- | --- | ---: | ---: | ---: |",
  ];
  for (const item of result.judgments) {
    lines.push(`| ${item.id} | ${item.winner} | ${item.confidence.toFixed(2)} | ${average(item.scores[c]).toFixed(2)} | ${average(item.scores[h]).toFixed(2)} |`);
  }
  for (const item of result.judgments) {
    lines.push("", `## ${item.id}`, "", `Winner: **${item.winner}** (${item.blind_order})`, "", ...item.reasons.map(reason => `- ${reason}`));
  }
  return `${lines.join("\n")}\n`;
}

function average(scores) {
  const values = Object.values(scores || {});
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
function stableFlip(value) {
  return [...String(value)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0;
}
function required(values, name) {
  if (!values[name]) throw new Error(`--${name} is required`);
  return values[name];
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
