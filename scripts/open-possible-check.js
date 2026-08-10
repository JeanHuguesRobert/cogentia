#!/usr/bin/env node
/**
 * Minimal procedural checker for the Open-Possible / Booster discipline.
 *
 * It does NOT score creativity or decide whether an alternative is good.
 * It checks only whether a trace records the required cognitive operations,
 * and whether claims labelled impossible carry an explicit basis.
 *
 * Usage:
 *   node scripts/open-possible-check.js <record.json>
 *   node scripts/open-possible-check.js <record.json> --json
 *
 * Exit 0 on conformance, 1 on failure, 2 on usage/parse error.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");
const fileArg = args.find((arg) => !arg.startsWith("--"));

const REQUIRED = [
  "frame",
  "challenged_invariant",
  "residue",
  "booster",
  "reality_test",
];

function emit(report) {
  if (WANT_JSON) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Open-Possible check: ${report.ok ? "PASS" : "FAIL"}`);
  if (report.file) console.log(`File: ${report.file}`);

  for (const check of report.checks) {
    const mark = check.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${check.message}`);
  }

  for (const warning of report.warnings) {
    console.log(`[WARN] ${warning}`);
  }
}

function nonEmpty(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

if (!fileArg) {
  const report = {
    ok: false,
    file: null,
    checks: [],
    warnings: [],
    error: "missing JSON record path",
  };
  if (WANT_JSON) console.log(JSON.stringify(report, null, 2));
  else console.error("Usage: node scripts/open-possible-check.js <record.json> [--json]");
  process.exit(2);
}

const resolved = path.resolve(process.cwd(), fileArg);
let data;

try {
  const raw = fs.readFileSync(resolved, "utf8");
  data = JSON.parse(raw);
} catch (error) {
  const report = {
    ok: false,
    file: fileArg,
    checks: [],
    warnings: [],
    error: `cannot read/parse JSON: ${error.message}`,
  };
  if (WANT_JSON) console.log(JSON.stringify(report, null, 2));
  else console.error(`open-possible-check: ${report.error}`);
  process.exit(2);
}

const record = data.open_possible;
const checks = [];
const warnings = [];

checks.push({
  ok: record && typeof record === "object" && !Array.isArray(record),
  message: "open_possible record is present",
});

if (record && typeof record === "object" && !Array.isArray(record)) {
  for (const key of REQUIRED) {
    checks.push({
      ok: Object.prototype.hasOwnProperty.call(record, key) && nonEmpty(record[key]),
      message: `${key} declared`,
    });
  }

  if (!Object.prototype.hasOwnProperty.call(record, "opened_possible")) {
    warnings.push("opened_possible is absent; allowed in v0.1 but useful when the frame challenge opens a concrete option");
  }
}

const claims = data.claims;
if (claims !== undefined && !Array.isArray(claims)) {
  checks.push({ ok: false, message: "claims is an array when present" });
} else if (Array.isArray(claims)) {
  let impossibleCount = 0;
  let ungroundedCount = 0;

  for (const claim of claims) {
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) continue;
    const status = typeof claim.status === "string" ? claim.status.trim().toLowerCase() : "";
    if (!status.startsWith("impossible")) continue;

    impossibleCount += 1;
    if (!nonEmpty(claim.basis)) ungroundedCount += 1;
  }

  checks.push({
    ok: ungroundedCount === 0,
    message:
      impossibleCount === 0
        ? "no claims are labelled impossible without review"
        : `${impossibleCount} impossible claim(s) carry an explicit basis`,
  });
}

const report = {
  ok: checks.every((check) => check.ok),
  file: fileArg,
  checks,
  warnings,
};

emit(report);
process.exit(report.ok ? 0 : 1);
