#!/usr/bin/env node
/**
 * Smoke: agent public-readonly verify exits 0 on a healthy corpus tree.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");
const env = { ...process.env };
// Prefer workspace registry if present
if (!env.COGENTIA_REGISTRY) {
  const candidates = [
    path.join(root, "..", "JeanHuguesRobert", ".cogentia.json"),
    path.join(root, ".cogentia.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      env.COGENTIA_REGISTRY = c;
      break;
    }
  }
}

const result = spawnSync(process.execPath, [cli, "agent", "public-readonly", "verify", "--json"], {
  cwd: root,
  env,
  encoding: "utf8",
});

let json = null;
try {
  json = JSON.parse(result.stdout || "{}");
} catch {
  console.error("FAIL: non-JSON output", result.stdout, result.stderr);
  process.exit(1);
}

if (result.status !== 0 && result.status !== 2) {
  console.error("FAIL: unexpected exit", result.status, result.stderr);
  process.exit(1);
}

if (!json.protocol || !String(json.protocol).includes("public_readonly")) {
  console.error("FAIL: missing protocol", json);
  process.exit(1);
}

if (!json.canonical_path) {
  console.error("FAIL: missing canonical_path", json);
  process.exit(1);
}

// In this repo checkout, constitution should exist and verify should pass.
if (json.ok !== true) {
  console.error("FAIL: expected ok on cogentia tree", JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  exit: result.status,
  protocol: json.protocol,
  path: json.paths?.public_readonly,
  inject: json.inject?.resolvable,
  warnings: (json.warnings || []).map(w => w.code),
}, null, 2));
