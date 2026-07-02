#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_URL = "https://cogentia.fractavolta.com";
const DEFAULT_QUESTIONS = "docs/evals/guide-questions.json";
const DEFAULT_OUT_DIR = ".cogentia/evals/guide";

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

try {
  if (["help", "-h", "--help"].includes(command)) {
    usage();
  } else if (command === "run") {
    await runEval(args);
  } else if (command === "report") {
    await writeReport(args);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`guide-eval: ${error.message}`);
  process.exit(1);
}

function usage() {
  console.log(`Guide evaluation harness

Usage:
  node scripts/guide-eval.js run --label current [--url <guide-base>] [--questions <file>] [--out-dir <dir>]
  node scripts/guide-eval.js report --runs <run-a.json,run-b.json> [--output <file>]

Run examples:
  node scripts/guide-eval.js run --label current
  node scripts/guide-eval.js run --label candidate --url http://127.0.0.1:8791

Report examples:
  node scripts/guide-eval.js report --runs .cogentia/evals/guide/2026-07-02-current.json,.cogentia/evals/guide/2026-07-02-candidate.json
`);
}

async function runEval(options) {
  const label = requiredOption(options, "label");
  const questionsPath = path.resolve(options.questions || DEFAULT_QUESTIONS);
  const outDir = path.resolve(options.outDir || DEFAULT_OUT_DIR);
  const guideUrl = normalizeGuideUrl(options.url || DEFAULT_URL);
  const timeoutMs = boundedInteger(options.timeoutMs, 60000, 1000, 300000);
  const limit = options.limit ? boundedInteger(options.limit, 0, 1, 1000) : 0;
  const questions = readQuestions(questionsPath).slice(0, limit || undefined);
  const startedAt = new Date().toISOString();
  const results = [];

  for (const item of questions) {
    const started = Date.now();
    const payload = {
      question: item.question,
      locale: item.locale || "en",
    };
    if (item.web_search === false || options.webSearch === false) payload.web_search = false;
    if (item.web_search === true || options.webSearch === true) payload.web_search = true;
    try {
      const response = await fetch(guideUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await readResponseBody(response);
      results.push(normalizeResult(item, response.status, Date.now() - started, body));
    } catch (error) {
      results.push({
        id: item.id,
        locale: item.locale || "en",
        question: item.question,
        expected: item.expected || [],
        ok: false,
        status: 0,
        latency_ms: Date.now() - started,
        error: error.message,
      });
    }
  }

  const run = {
    ok: results.every(result => result.ok),
    kind: "fractavolta-guide-eval-run",
    label,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    guide_url: guideUrl.href,
    questions_file: relativePath(questionsPath),
    count: results.length,
    results,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, `${timestampForFile(startedAt)}-${sanitizeFilePart(label)}.json`);
  fs.writeFileSync(output, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  const summary = { ok: run.ok, label, output: relativePath(output), count: results.length };
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(`Wrote ${summary.output} (${summary.count} question(s), ok=${summary.ok})`);
}

async function writeReport(options) {
  const runPaths = String(requiredOption(options, "runs"))
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => path.resolve(value));
  if (!runPaths.length) throw new Error("--runs must name at least one run JSON file");
  const runs = runPaths.map(readRun);
  const output = options.output
    ? path.resolve(options.output)
    : path.resolve(DEFAULT_OUT_DIR, `${timestampForFile(new Date().toISOString())}-guide-eval-report.md`);
  const markdown = renderReport(runs);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, markdown, "utf8");
  const summary = { ok: true, output: relativePath(output), runs: runs.map(run => run.label) };
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(`Wrote ${summary.output}`);
}

function readQuestions(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`Questions file must contain an array: ${file}`);
  return parsed.map((item, index) => {
    const id = String(item.id || `q${index + 1}`).trim();
    const question = String(item.question || "").trim();
    if (!question) throw new Error(`Question ${id} is missing question text`);
    return {
      ...item,
      id,
      question,
      locale: String(item.locale || "en").trim() || "en",
      expected: Array.isArray(item.expected) ? item.expected.map(String) : [],
    };
  });
}

async function readResponseBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function normalizeResult(item, status, latencyMs, body) {
  const context = body?.context || {};
  return {
    id: item.id,
    locale: item.locale || "en",
    question: item.question,
    expected: item.expected || [],
    ok: Boolean(body?.ok) && status >= 200 && status < 300,
    status,
    latency_ms: latencyMs,
    mode: body?.mode || "",
    answer: body?.answer || "",
    sources: normalizeSources(body?.sources),
    excerpts: normalizeExcerpts(context.excerpts),
    warnings: Array.isArray(body?.warnings) ? body.warnings.map(String) : [],
    context: {
      source_ids: Array.isArray(context.source_ids) ? context.source_ids.map(String) : [],
      retrieval_policy_version: context.retrieval_policy_version || "",
      web_search: context.web_search ? {
        attempted: Boolean(context.web_search.attempted),
        ok: Boolean(context.web_search.ok),
        query: String(context.web_search.query || ""),
        source_ids: Array.isArray(context.web_search.source_ids) ? context.web_search.source_ids.map(String) : [],
        warnings: Array.isArray(context.web_search.warnings) ? context.web_search.warnings.map(String) : [],
      } : undefined,
      guide_retrieval: context.guide_retrieval ? {
        strategy: String(context.guide_retrieval.strategy || ""),
        planner_source: String(context.guide_retrieval.planner?.source || ""),
        source_ids: Array.isArray(context.guide_retrieval.source_ids) ? context.guide_retrieval.source_ids.map(String) : [],
        semantic: context.guide_retrieval.semantic || {},
      } : undefined,
    },
    error: body?.error || body?.message || undefined,
  };
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.slice(0, 12).map(source => ({
    source_id: String(source.source_id || ""),
    title: String(source.title || source.path || source.source_id || ""),
    repo: String(source.repo || ""),
    path: String(source.path || ""),
    url: String(source.url || source.github_url || ""),
  }));
}

function normalizeExcerpts(excerpts) {
  if (!Array.isArray(excerpts)) return [];
  return excerpts.slice(0, 12).map(item => ({
    source_id: String(item.source_id || ""),
    text: String(item.text || "").replace(/\s+/g, " ").trim(),
  })).filter(item => item.source_id && item.text);
}

function readRun(file) {
  const run = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!run || run.kind !== "fractavolta-guide-eval-run") {
    throw new Error(`Not a guide eval run: ${file}`);
  }
  return { ...run, file: relativePath(file) };
}

function renderReport(runs) {
  const byQuestion = new Map();
  for (const run of runs) {
    for (const result of run.results || []) {
      if (!byQuestion.has(result.id)) byQuestion.set(result.id, []);
      byQuestion.get(result.id).push({ run, result });
    }
  }

  const lines = [
    "# FractaVolta Guide Evaluation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Runs",
    "",
    "| Label | File | Guide URL | Questions | OK |",
    "| --- | --- | --- | ---: | --- |",
    ...runs.map(run => `| ${escapeMd(run.label)} | \`${escapeMd(run.file)}\` | ${escapeMd(run.guide_url || "")} | ${run.count || 0} | ${run.ok ? "yes" : "no"} |`),
    "",
    "## Questions",
    "",
  ];

  for (const [id, entries] of byQuestion) {
    const first = entries[0]?.result || {};
    lines.push(`### ${id}`, "", `**Question:** ${first.question || ""}`, "");
    if (first.expected?.length) lines.push(`**Expected signals:** ${first.expected.map(item => `\`${item}\``).join(", ")}`, "");
    for (const { run, result } of entries) {
      lines.push(
        `#### ${run.label}`,
        "",
        `- Status: ${result.ok ? "ok" : "failed"} (${result.status || 0})`,
        `- Mode: ${result.mode || "-"}`,
        `- Latency: ${result.latency_ms || 0} ms`,
        `- Sources: ${(result.sources || []).length}`,
        `- Excerpts: ${(result.excerpts || []).length}`,
        `- Web search: ${renderWebSearch(result.context?.web_search)}`,
        "",
        "**Answer:**",
        "",
        fenced(result.answer || result.error || "(no answer)"),
        ""
      );
      if (result.sources?.length) {
        lines.push("**Sources:**", "");
        for (const source of result.sources.slice(0, 6)) {
          lines.push(`- \`${source.source_id}\` ${source.title || ""}${source.url ? ` (${source.url})` : ""}`);
        }
        lines.push("");
      }
      if (result.excerpts?.length) {
        lines.push("**Excerpt sample:**", "");
        for (const excerpt of result.excerpts.slice(0, 2)) {
          lines.push(`- \`${excerpt.source_id}\`: ${truncateForReport(excerpt.text, 360)}`);
        }
        lines.push("");
      }
    }
    lines.push(
      "#### Codex Review",
      "",
      "- Best answer: current | candidate | neither | mixed",
      "- Did model power help: yes | no | partly",
      "- Main limitation: retrieval | planner | synthesis | prompt | corpus coverage | language | UI expectation",
      "- Recommended tuning action:",
      "  - ",
      "- Notes:",
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderWebSearch(web) {
  if (!web) return "not attempted";
  return `${web.attempted ? "attempted" : "not attempted"}${web.ok ? ", ok" : ", not ok"}${web.source_ids?.length ? `, ${web.source_ids.length} source(s)` : ""}`;
}

function fenced(value) {
  return `\`\`\`text\n${String(value || "").replace(/```/g, "'''").trim()}\n\`\`\``;
}

function truncateForReport(value, max) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 3)).trim()}...`;
}

function normalizeGuideUrl(value) {
  const url = new URL(String(value || DEFAULT_URL));
  if (!url.pathname || url.pathname === "/") url.pathname = "/guide/chat";
  return url;
}

function parseArgs(raw) {
  const parsed = {};
  for (let index = 0; index < raw.length; index++) {
    const arg = raw[index];
    if (!arg.startsWith("--")) continue;
    const key = toCamel(arg.slice(2));
    const next = raw[index + 1];
    if (next === undefined || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  if (parsed.noWebSearch) parsed.webSearch = false;
  return parsed;
}

function requiredOption(options, name) {
  const value = options[name];
  if (value === undefined || value === null || value === "") throw new Error(`Missing --${name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`);
  return value;
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function timestampForFile(value) {
  return new Date(value).toISOString().replace(/[:.]/g, "-");
}

function sanitizeFilePart(value) {
  return String(value || "run").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "run";
}

function relativePath(file) {
  return path.relative(process.cwd(), path.resolve(file)).replace(/\\/g, "/");
}

function escapeMd(value) {
  return String(value || "").replace(/\|/g, "\\|");
}
