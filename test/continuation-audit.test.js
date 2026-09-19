import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const cli = path.join(repoRoot, "scripts", "cogentia.js");

function run(args, registry) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    env: { ...process.env, COGENTIA_REGISTRY: registry },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function continuation(id, status = "active") {
  const resolved = status === "resolved";
  return {
    type: "continuation", protocol: "cogentia.continuation.v2", id, continuation_id: id,
    status, kind: "document_role_review", title: "Role review", question: "Choose a role.",
    priority: 1, subject: { repo: "example", path: "doc.md" }, context: {}, expected_response: {},
    created_at: "2026-09-18T00:00:00.000Z", updated_at: "2026-09-18T00:00:00.000Z",
    history: [], resolution: resolved ? { resolved_at: "2026-09-18T01:00:00.000Z", decision: "source", reason: "fixture" } : null,
  };
}

test("continuation terminal states receive one durable audit event and can be backfilled idempotently", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-continuation-audit-"));
  try {
    const registry = path.join(root, ".cogentia.json");
    fs.writeFileSync(registry, JSON.stringify({ repos: [] }));
    const store = path.join(root, ".cogentia", "continuations");
    fs.mkdirSync(store, { recursive: true });
    fs.writeFileSync(path.join(store, "ctn_deadbeef.json"), JSON.stringify(continuation("ctn_deadbeef")));

    run(["continuation", "resolve", "ctn_deadbeef", "--decision", "source", "--reason", "fixture", "--json"], registry);
    const auditPath = path.join(root, ".cogentia", "audit.jsonl");
    const first = fs.readFileSync(auditPath, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(first.length, 1);
    assert.equal(first[0].event, "continuation.resolved");
    assert.equal(first[0].continuation_id, "ctn_deadbeef");

    fs.writeFileSync(path.join(store, "ctn_cafebabe.json"), JSON.stringify(continuation("ctn_cafebabe", "resolved")));
    const backfill = run(["continuation", "audit-backfill", "ctn_cafebabe", "--json"], registry);
    assert.deepEqual(backfill.written, ["ctn_cafebabe"]);
    const repeated = run(["continuation", "audit-backfill", "ctn_cafebabe", "--json"], registry);
    assert.deepEqual(repeated.written, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
