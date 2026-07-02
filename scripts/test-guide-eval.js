#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-guide-eval-"));
const questionsFile = path.join(tempDir, "questions.json");
const outDir = path.join(tempDir, "runs");
const reportFile = path.join(tempDir, "report.md");

fs.writeFileSync(questionsFile, JSON.stringify([
  {
    id: "mock_question",
    locale: "en",
    question: "Explain FractaVolta simply.",
    expected: ["FractaVolta", "source"],
  },
], null, 2), "utf8");

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/guide/chat") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
    return;
  }
  const body = JSON.parse(await readBody(req) || "{}");
  const label = req.headers["x-mock-label"] || "mock";
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true,
    service: "fractavolta-guide",
    mode: "conversational",
    question: body.question,
    locale: body.locale,
    answer: `FractaVolta answer from ${label} [mock:README.md#L1-L4].`,
    sources: [{
      source_id: "mock:README.md#L1-L4",
      title: "Mock source",
      url: "https://example.invalid/mock",
    }],
    context: {
      source_ids: ["mock:README.md#L1-L4"],
      retrieval_policy_version: "mock-v1",
      guide_retrieval: {
        strategy: "guide-retrieval-run-v1",
        planner: {
          strategy: "guide-planner-v1",
          source: "heuristic",
          objective: "Explain the public FractaVolta corpus.",
          notes: ["mock planner note"],
        },
        queries: ["Explain FractaVolta simply.", "FractaVolta public orientation"],
        source_ids: ["mock:README.md#L1-L4"],
        semantic: {
          attempted: true,
          ranked_result_cache: true,
          query_embedding_cache: false,
          sqlite_vec: true,
          keyword_fallback: false,
          continuation_required: false,
        },
      },
      excerpts: [{
        source_id: "mock:README.md#L1-L4",
        text: "Mock FractaVolta public excerpt.",
      }],
    },
    warnings: [],
  }));
});

await listen(server, port);

try {
  await run(["scripts/guide-eval.js", "run", "--label", "current", "--url", base, "--questions", questionsFile, "--out-dir", outDir]);
  await run(["scripts/guide-eval.js", "run", "--label", "candidate", "--url", `${base}/guide/chat`, "--questions", questionsFile, "--out-dir", outDir]);
  const runs = fs.readdirSync(outDir).filter(file => file.endsWith(".json")).sort().map(file => path.join(outDir, file));
  assert.equal(runs.length, 2);

  const firstRun = JSON.parse(fs.readFileSync(runs[0], "utf8"));
  assert.equal(firstRun.kind, "fractavolta-guide-eval-run");
  assert.equal(firstRun.complete, true);
  assert.equal(firstRun.completed_count, 1);
  assert.equal(firstRun.results[0].sources[0].source_id, "mock:README.md#L1-L4");
  assert.equal(firstRun.results[0].excerpts[0].text, "Mock FractaVolta public excerpt.");
  assert.deepEqual(firstRun.results[0].context.guide_retrieval.queries, [
    "Explain FractaVolta simply.",
    "FractaVolta public orientation",
  ]);

  await run(["scripts/guide-eval.js", "report", "--runs", runs.join(","), "--output", reportFile]);
  const report = fs.readFileSync(reportFile, "utf8");
  assert.match(report, /# FractaVolta Guide Evaluation/);
  assert.match(report, /mock_question/);
  assert.match(report, /Guide retrieval: guide-retrieval-run-v1, planner=heuristic, 2 queries, semantic, ranked-cache, sqlite-vec/);
  assert.match(report, /FractaVolta public orientation/);
  assert.match(report, /Codex Review/);
  assert.match(report, /Did model power help/);

  console.log(JSON.stringify({ ok: true, guide_eval_run: true, guide_eval_report: true }, null, 2));
} finally {
  server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${args.join(" ")}\n${stderr}`));
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
