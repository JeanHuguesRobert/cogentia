#!/usr/bin/env node
/**
 * corpus.orient P0 (#122): unit + CLI + privacy + Reality Test report.
 *
 * Reality Test misses are navigation debt. They are printed and recorded;
 * they do not fail this harness unless the packet shape / invariants break.
 * Set COGENTIA_ORIENT_STRICT=1 to fail on explicit_source/registry_link misses.
 */
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  orientCorpus,
  scoreOrientationAgainstFixture,
  DEFAULT_ORIENT_POLICY,
  ORIENT_SCHEMA,
} from "./lib/corpus-orient.js";
import { ORIENT_REALITY_FIXTURES } from "./lib/corpus-orient-fixtures.js";
import { getModule } from "./lib/v3-modules.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}

function sampleGraph() {
  return {
    concepts: [
      {
        name: "Kudocracy",
        slug: "kudocracy",
        repo: "barons-Mariani",
        short_definition: "Civic suggestions for votations; a personal AI agent is a contributor rather than a substitute.",
        parents: [],
        children: [],
        related: ["Kudos", "Cognitive Packet"],
        documents: ["research/kudocracy.md"],
      },
      {
        name: "Kudos",
        slug: "kudos",
        repo: "barons-Mariani",
        short_definition: "Complementary currency used as stigmergic evidence.",
        parents: [],
        children: [],
        related: ["Kudocracy"],
        documents: ["research/kudos.md"],
      },
      {
        name: "Cognitive Packet",
        slug: "cognitive-packet",
        repo: "cogentia",
        short_definition: "Envelope plus payload unit of cognitive work.",
        parents: [],
        children: [],
        related: ["Kudocracy"],
        documents: ["research/cognitive_packets.md"],
      },
      {
        name: "Secret Widget",
        slug: "secret-widget",
        repo: "private-repo",
        short_definition: "Must never leak in public view.",
        parents: [],
        children: [],
        related: [],
        documents: ["research/secret.md"],
      },
    ],
    documents: [
      {
        repo: "barons-Mariani",
        rel: "research/kudocracy.md",
        title: "Kudocracy",
        description: "AI may illuminate the vote; it must not vote in the citizen's place.",
        document_role: "source",
      },
      {
        repo: "barons-Mariani",
        rel: "research/kudos.md",
        title: "Kudos",
        description: "Kudos doctrine",
        document_role: "source",
      },
      {
        repo: "cogentia",
        rel: "research/cognitive_packets.md",
        title: "Cognitive Packets",
        document_role: "source",
      },
      {
        repo: "cogentia",
        rel: "research/informational_gravity.md",
        title: "Informational Gravity",
        description: "Kudos as stigmergic routing evidence for cognitive packets",
        document_role: "source",
      },
      {
        repo: "cogentia",
        rel: "scripts/cogentia.js",
        title: "cogentia.js",
        document_role: "operational",
      },
      {
        repo: "private-repo",
        rel: "research/secret.md",
        title: "Secret Widget",
        document_role: "source",
      },
    ],
  };
}

{
  const { concepts, documents } = sampleGraph();
  const publicConcepts = concepts.filter((c) => c.repo !== "private-repo");
  const publicDocs = documents.filter((d) => d.repo !== "private-repo");

  check("orientCorpus returns cogentia.orientation.v1 with a route, not a lone hit", () => {
    const packet = orientCorpus({
      query: "How do Kudos affect Cognitive Packet routing?",
      concepts: publicConcepts,
      documents: publicDocs,
    });
    assert.equal(packet.ok, true);
    assert.equal(packet.schema, ORIENT_SCHEMA);
    assert.ok(packet.resolved_concepts.length >= 1);
    assert.ok(packet.conceptual_route.length >= 1);
    assert.equal(packet.sufficiency.status, "structurally_exhausted");
    assert.notEqual(packet.sufficiency.status, "sufficient");
    assert.equal("gravity_score" in packet, false);
    assert.equal("G_C" in packet, false);
    assert.ok(packet.routing_trace.every((t) => t.influence === "attention_only"));
  });

  check("live traversal respects max_seeds / max_hops / max_nodes", () => {
    const packet = orientCorpus({
      query: "How do Kudos affect Cognitive Packet routing?",
      concepts: publicConcepts,
      documents: publicDocs,
      policy: { max_seeds: 1, max_hops: 0, max_nodes: 1 },
    });
    assert.ok(packet.resolved_concepts.length <= 1);
    assert.ok(packet.conceptual_route.length <= 1);
    assert.ok(["structurally_exhausted", "budget_exhausted"].includes(packet.sufficiency.status));
  });

  check("public concept lists do not leak a private-repo concept", () => {
    const packet = orientCorpus({
      query: "Secret Widget",
      concepts: publicConcepts,
      documents: publicDocs,
    });
    assert.equal(
      packet.resolved_concepts.some((c) => c.name === "Secret Widget" || c.repo === "private-repo"),
      false
    );
    assert.equal(
      packet.conceptual_route.some((s) => s.concept === "Secret Widget" || s.repo === "private-repo"),
      false
    );
    const docs = [...(packet.read_first || []), ...(packet.then_read || [])];
    assert.equal(docs.some((d) => d.repo === "private-repo" || /secret/i.test(d.path || "")), false);
  });

  check("structurally_exhausted is not reported as sufficient", () => {
    const packet = orientCorpus({
      query: "Kudocracy",
      concepts: publicConcepts,
      documents: publicDocs,
    });
    assert.notEqual(packet.sufficiency.status, "sufficient");
    assert.match(packet.sufficiency.reason || "", /not epistemic sufficiency/i);
  });

  check("author_memory misses cannot promote a canonical relation", () => {
    const packet = orientCorpus({
      query: "utterly nonexistent quixotic zzzznarf",
      concepts: publicConcepts,
      documents: publicDocs,
    });
    const scored = scoreOrientationAgainstFixture(packet, {
      id: "mem",
      question: packet.query,
      expected: {
        must_reach: [
          {
            kind: "concept",
            id: "Invented Relation",
            expectation_basis: { type: "author_memory", evidence: ["private hint"] },
          },
        ],
      },
    });
    assert.equal(scored.promote_canonical, false);
    assert.ok(scored.author_memory_misses.includes("Invented Relation"));
    assert.equal(scored.human_bootstrap_hints, 0);
  });

  check("empty query fails fast", () => {
    const packet = orientCorpus({ query: "  ", concepts: publicConcepts, documents: publicDocs });
    assert.equal(packet.ok, false);
    assert.equal(packet.error, "missing_query");
  });
}

function run(args, { env: extraEnv = {} } = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return { ...result, json };
}

function freshRegistry() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-orient-test-"));
  const publicDir = path.join(scratchRoot, "public-repo");
  const privateDir = path.join(scratchRoot, "private-repo");
  fs.mkdirSync(path.join(publicDir, "research"), { recursive: true });
  fs.mkdirSync(path.join(privateDir, "research"), { recursive: true });
  fs.writeFileSync(
    path.join(publicDir, "research", "concepts.md"),
    [
      "---",
      "title: Concept Index",
      "document_role: index",
      "---",
      "",
      "# Concept Index",
      "",
      "## Widget Frobnicator",
      "",
      "**Type:** mechanism",
      "**Status:** stable",
      "**Short definition:** Turns raw widgets into frobnicated widgets.",
      "",
      "**Related concepts:**",
      "- Public Widget",
      "",
      "**Reference documents:**",
      "- [`research/widget.md`](widget.md)",
      "",
      "## Public Widget",
      "",
      "**Status:** stable",
      "**Short definition:** A public widget concept.",
      "",
      "**Related concepts:**",
      "- Widget Frobnicator",
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(publicDir, "research", "widget.md"),
    "---\ntitle: Widget source\ndocument_role: source\n---\n\n# Widget source\n"
  );
  fs.writeFileSync(
    path.join(privateDir, "research", "concepts.md"),
    [
      "---",
      "title: Concept Index",
      "document_role: index",
      "---",
      "",
      "# Concept Index",
      "",
      "## Secret Widget",
      "",
      "**Status:** stable",
      "**Short definition:** Private only.",
      "",
    ].join("\n")
  );
  const registryPath = path.join(scratchRoot, ".cogentia.json");
  fs.writeFileSync(
    registryPath,
    JSON.stringify(
      {
        repos: [
          { name: "public-repo", path: "./public-repo", branch: "main" },
          { name: "private-repo", path: "./private-repo", branch: "main" },
        ],
        policies: { "private-repo": { visibility: "private" } },
      },
      null,
      2
    )
  );
  return { scratchRoot, registryPath, env: { COGENTIA_REGISTRY: registryPath } };
}

{
  const { scratchRoot, env } = freshRegistry();
  check("CLI orient returns machine-readable JSON with a conceptual route", () => {
    const r = run(["orient", "Widget Frobnicator", "--json"], { env });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.schema, ORIENT_SCHEMA);
    assert.ok(r.json.resolved_concepts.some((c) => c.name === "Widget Frobnicator"));
    assert.ok(r.json.conceptual_route.some((s) => s.concept === "Widget Frobnicator"));
    assert.notEqual(r.json.sufficiency.status, "sufficient");
    assert.equal(r.json.view, "public");
  });
  check("CLI orient default view does not mention Secret Widget", () => {
    const r = run(["orient", "Secret Widget", "--json"], { env });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      (r.json.resolved_concepts || []).some((c) => c.name === "Secret Widget" || c.repo === "private-repo"),
      false,
      JSON.stringify(r.json.resolved_concepts)
    );
    assert.equal(
      (r.json.conceptual_route || []).some((s) => s.concept === "Secret Widget" || s.repo === "private-repo"),
      false
    );
  });
  check("CLI orient --view private can see the private concept for a trusted local caller", () => {
    const r = run(["orient", "Secret Widget", "--view", "private", "--json"], { env });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.json.resolved_concepts.some((c) => c.name === "Secret Widget"));
  });
  check("CLI orient without a query fails with usage", () => {
    const r = run(["orient", "--json"], { env });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Usage: node scripts\/cogentia\.js orient/);
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

check("corpus.orient is registered as a v3 module once cogentia.js CLI boots", () => {
  const r = run(["help"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /orient <query>/);
  void getModule;
});

async function rmScratchSafely(dir) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
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

async function runMcp(base, messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/cogentia-mcp.js"], {
      cwd: root,
      env: {
        ...process.env,
        COGENTIA_DAEMON_URL: base,
        COGENTIA_MCP_VIEW: "public",
        COGENTIA_MCP_TIMEOUT_MS: "60000",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`MCP exited ${code}: ${stderr}`));
      resolve(
        stdout
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map((l) => JSON.parse(l))
      );
    });
    child.stdin.end(`${messages.map((m) => JSON.stringify(m)).join("\n")}\n`);
  });
}

{
  const { scratchRoot, env } = freshRegistry();
  await checkAsync("orient is reachable via public daemon route and MCP tool", async () => {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let daemonLog = "";
    daemon.stdout.on("data", (c) => {
      daemonLog += c;
    });
    daemon.stderr.on("data", (c) => {
      daemonLog += c;
    });
    try {
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          const health = await fetch(`${base}/api/context/health`);
          if (health.ok) break;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (attempt === 49) throw new Error(`Daemon did not start: ${daemonLog}`);
      }
      const httpRes = await fetch(`${base}/api/context/orient?q=${encodeURIComponent("Widget Frobnicator")}`);
      const httpBody = await httpRes.json();
      assert.equal(httpRes.ok, true, JSON.stringify(httpBody));
      assert.equal(httpBody.ok, true);
      assert.ok(httpBody.conceptual_route?.length >= 1);

      const mcp = await runMcp(base, [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } },
        },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "cogentia_orient", arguments: { query: "Widget Frobnicator" } },
        },
      ]);
      const toolResult = mcp.find((m) => m.id === 2);
      assert.ok(toolResult, JSON.stringify(mcp, null, 2));
      assert.ok(!toolResult.error, JSON.stringify(toolResult, null, 2));
      const structured = toolResult.result?.structuredContent || JSON.parse(toolResult.result.content[0].text);
      const data = structured.data || structured;
      assert.equal(data.ok, true);
      assert.ok(data.conceptual_route?.length >= 1);
    } finally {
      daemon.kill();
      await new Promise((resolve) => daemon.once("exit", resolve));
    }
  });
  await rmScratchSafely(scratchRoot);
}

check("fixtures are five questions with expectation_basis on every must_reach", () => {
  assert.equal(ORIENT_REALITY_FIXTURES.length, 5);
  for (const fx of ORIENT_REALITY_FIXTURES) {
    assert.ok(fx.question);
    for (const t of fx.expected.must_reach) {
      assert.ok(t.expectation_basis?.type, `${fx.id} ${t.id}`);
      assert.ok(Array.isArray(t.expectation_basis.evidence));
    }
  }
});

{
  const nearest = (() => {
    const candidates = [
      process.env.COGENTIA_REGISTRY,
      path.join(root, ".cogentia.json"),
      path.join(root, "..", "JeanHuguesRobert", ".cogentia.json"),
      path.join(root, "..", ".cogentia.json"),
    ].filter(Boolean);
    let dir = root;
    for (let i = 0; i < 6; i++) {
      candidates.push(path.join(dir, ".cogentia.json"));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return candidates.find((p) => fs.existsSync(p)) || "";
  })();

  if (!nearest) {
    console.log("skip - Reality Tests (no .cogentia.json in ancestry; scratch-only session)");
  } else {
    await checkAsync("Reality Tests produce inspectable navigation-debt output", async () => {
      const r = run(["orient-benchmark", "--json"], { env: { COGENTIA_REGISTRY: nearest } });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.json.ok, true);
      assert.equal(r.json.total, 5);
      console.log(`\n--- corpus.orient Reality Tests (HumanBootstrapHints=${r.json.human_bootstrap_hints}) ---`);
      let strictFails = 0;
      for (const row of r.json.results) {
        console.log(
          `${row.id}: stop=${row.stop_state} must=${row.must_reach_recovered} should=${row.should_reach_recovered} hints=${row.human_bootstrap_hints}`
        );
        console.log(`  route: ${(row.conceptual_route || []).join(" → ") || "(empty)"}`);
        for (const miss of row.missed_must || []) {
          console.log(`  DEBT must_reach ${miss.id} basis=${miss.expectation_basis?.type}`);
          if (miss.expectation_basis?.type === "author_memory") {
            assert.equal(row.promote_canonical, false);
          } else if (process.env.COGENTIA_ORIENT_STRICT === "1") {
            strictFails++;
          }
        }
        assert.notEqual(row.stop_state, "sufficient");
        assert.equal(row.promote_canonical, false);
      }
      if (strictFails) {
        throw new Error(`${strictFails} explicit/registry must_reach miss(es) under COGENTIA_ORIENT_STRICT=1`);
      }
    });
  }
}

void DEFAULT_ORIENT_POLICY;

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
