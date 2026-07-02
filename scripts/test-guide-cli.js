#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const seenPayloads = [];

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/guide/chat") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
    return;
  }
  const payload = JSON.parse(await readBody(req) || "{}");
  seenPayloads.push(payload);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true,
    service: "fractavolta-guide",
    mode: "conversational",
    question: payload.question,
    locale: payload.locale,
    answer: "FractaVolta is a public corpus-grounded project [mock:README.md#L1-L4].",
    sources: [{
      source_id: "mock:README.md#L1-L4",
      title: "Mock source",
      url: "https://example.invalid/mock",
    }],
    context: {
      source_ids: ["mock:README.md#L1-L4"],
      web_search: payload.web_search === true ? {
        attempted: true,
        ok: true,
        source_ids: ["web:1"],
      } : undefined,
      excerpts: [{
        source_id: "mock:README.md#L1-L4",
        text: "Mock public excerpt for the power Guide CLI.",
      }],
      guide_retrieval: {
        strategy: "guide-retrieval-run-v1",
        query_limit: 3,
        queries: [
          payload.question,
          "mock public guide",
          "digital twin public guide",
        ],
        attempts: [{
          query: payload.question,
          ok: true,
          count: 1,
          mode: "hybrid",
          source_ids: ["mock:README.md#L1-L4"],
          retrieval: {
            attempted: true,
            ranked_result_cache: false,
            query_embedding_cache: false,
            sqlite_vec: false,
            keyword_fallback: true,
            continuation_required: true,
          },
        }],
        source_ids: ["mock:README.md#L1-L4"],
        semantic: {
          attempted: true,
          ranked_result_cache: false,
          query_embedding_cache: false,
          sqlite_vec: false,
          keyword_fallback: true,
          continuation_required: true,
        },
      },
    },
    warnings: [],
  }));
});

await listen(server, port);

try {
  const markdown = await run(["scripts/guide-cli.js", "ask", "--url", base, "--q", "Explain FractaVolta simply."]);
  assert.match(markdown, /# Guide Answer/);
  assert.match(markdown, /Mock public excerpt/);
  assert.match(markdown, /## Diagnostics/);

  const jsonRaw = await run(["scripts/guide-cli.js", "ask", "--url", base, "--q", "Explain FractaVolta simply.", "--format", "json", "--web-search"]);
  const json = JSON.parse(jsonRaw);
  assert.equal(json.ok, true);
  assert.equal(json.context.web_search.ok, true);

  const handoff = await run(["scripts/guide-cli.js", "handoff", "--url", base, "--q", "Comment commencer ?", "--locale", "fr"]);
  assert.match(handoff, /# Passage depuis le Guide public FractaVolta/);
  assert.match(handoff, /## Extraits publics utiles/);
  assert.match(handoff, /question de suivi precise/);

  const handoffJsonRaw = await run(["scripts/guide-cli.js", "handoff", "--url", base, "--q", "Explain FractaVolta simply.", "--format", "json"]);
  const handoffJson = JSON.parse(handoffJsonRaw);
  assert.equal(handoffJson.kind, "guide_handoff");
  assert.equal(handoffJson.intent, "deepen_guide_answer");
  assert.equal(handoffJson.sources[0].source_id, "mock:README.md#L1-L4");
  assert.match(handoffJson.prompt, /FractaVolta public Guide handoff/);

  const packetRaw = await run(["scripts/guide-cli.js", "handoff", "--url", base, "--q", "Explain FractaVolta simply.", "--format", "packet"]);
  const packet = JSON.parse(packetRaw);
  assert.equal(packet.kind, "cognitive_packet");
  assert.equal(packet.intent.type, "deepen_guide_answer");
  assert.equal(packet.permissions.corpus_view, "public");
  assert.equal(packet.evidence.excerpts[0].source_id, "mock:README.md#L1-L4");
  assert.equal(packet.reply_route.type, "fractavolta_guide");

  const adviceJsonRaw = await run(["scripts/guide-cli.js", "advise", "--url", base, "--q", "What should happen next?", "--format", "json"]);
  const adviceJson = JSON.parse(adviceJsonRaw);
  assert.equal(adviceJson.kind, "guide_advice");
  assert.equal(adviceJson.question, "What should happen next?");
  assert.ok(adviceJson.advisory_mandate.allowed.includes("propose_plan"));
  assert.ok(adviceJson.advisory_mandate.forbidden.includes("deploy"));
  assert.equal(adviceJson.sources[0].source_id, "mock:README.md#L1-L4");
  assert.equal(adviceJson.diagnostics.guide_retrieval.semantic.continuation_required, true);
  assert.match(adviceJson.diagnostics.guide_retrieval.queries[0], /advisory mode/i);

  const advicePacketRaw = await run(["scripts/guide-cli.js", "advise", "--url", base, "--q", "What should happen next?", "--format", "packet"]);
  const advicePacket = JSON.parse(advicePacketRaw);
  assert.equal(advicePacket.kind, "cognitive_packet");
  assert.equal(advicePacket.intent.type, "guide_advisory_review");
  assert.equal(advicePacket.permissions.may_execute, false);
  assert.ok(advicePacket.mandate.forbidden.includes("deploy"));

  const prewarmRaw = await run(["scripts/guide-cli.js", "prewarm", "--url", base, "--q", "What should happen next?", "--dry-run", "--format", "json"]);
  const prewarm = JSON.parse(prewarmRaw);
  assert.equal(prewarm.kind, "guide_prewarm");
  assert.equal(prewarm.dry_run, true);
  assert.equal(prewarm.queries.length, 3);
  assert.match(prewarm.commands[0], /embeddings search/);
  assert.equal(prewarm.initial_semantic.continuation_required, true);

  assert.equal(seenPayloads.length, 8);
  assert.equal(seenPayloads[1].web_search, true);
  assert.match(seenPayloads[5].question, /advisory mode/i);

  console.log(JSON.stringify({ ok: true, guide_cli_ask: true, guide_cli_handoff: true, guide_cli_advise: true, guide_cli_prewarm: true }, null, 2));
} finally {
  server.close();
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve(stdout);
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
