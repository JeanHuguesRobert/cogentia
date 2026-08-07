#!/usr/bin/env node
/**
 * Sandbox CLI — list/run experimental MCP scenarios.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = path.join(__dirname, "scenarios");
const TRACES_DIR = path.join(__dirname, ".traces");

const SCENARIO_IDS = [
  "skills-discover",
  "packet-envelope",
  "jhn-mutate-attestation",
];

async function loadScenario(id) {
  const file = path.join(SCENARIOS_DIR, `${id}.js`);
  if (!fs.existsSync(file)) throw new Error(`scenario not found: ${id}`);
  return import(pathToFileURL(file).href);
}

function list() {
  console.log(JSON.stringify({ ok: true, scenarios: SCENARIO_IDS }, null, 2));
}

async function runOne(id) {
  const mod = await loadScenario(id);
  if (typeof mod.run !== "function") throw new Error(`${id}: missing export run()`);
  const started = Date.now();
  const result = await mod.run();
  const record = {
    scenario: id,
    ok: result?.ok !== false,
    ms: Date.now() - started,
    at: new Date().toISOString(),
    result,
  };
  fs.mkdirSync(TRACES_DIR, { recursive: true });
  const out = path.join(TRACES_DIR, `${id}-${Date.now()}.json`);
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  record.trace_path = path.relative(process.cwd(), out).replace(/\\/g, "/");
  return record;
}

async function main() {
  const cmd = process.argv[2] || "list";
  const arg = process.argv[3] || "all";
  if (cmd === "list") return list();
  if (cmd === "run") {
    const ids = arg === "all" ? SCENARIO_IDS : [arg];
    const results = [];
    for (const id of ids) {
      try {
        results.push(await runOne(id));
      } catch (error) {
        results.push({ scenario: id, ok: false, error: error.message });
      }
    }
    const ok = results.every((r) => r.ok);
    console.log(JSON.stringify({ ok, results }, null, 2));
    process.exit(ok ? 0 : 1);
  }
  console.error("Usage: node index.js list|run [scenario|all]");
  process.exit(2);
}

main();
