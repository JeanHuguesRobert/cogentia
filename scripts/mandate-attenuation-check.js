#!/usr/bin/env node
/**
 * CLI: compare parent vs child mandate envelopes for monotonic attenuation (#79).
 *
 * Usage:
 *   node scripts/mandate-attenuation-check.js --parent p.json --child c.json
 *   node scripts/mandate-attenuation-check.js --json < combined.json
 *     combined: { "parent": {...}, "child": {...} }
 */
import fs from "node:fs";
import { compareMandateAttenuation } from "./lib/mandate-attenuation.js";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const parentPath = arg("--parent");
const childPath = arg("--child");
const stdinJson = process.argv.includes("--stdin");

let parent;
let child;
if (stdinJson) {
  const raw = fs.readFileSync(0, "utf8");
  const body = JSON.parse(raw);
  parent = body.parent;
  child = body.child;
} else if (parentPath && childPath) {
  parent = readJson(parentPath);
  child = readJson(childPath);
} else {
  console.error(
    "Usage: node scripts/mandate-attenuation-check.js --parent p.json --child c.json\n" +
      "   or: ... --stdin  with {\"parent\":{},\"child\":{}}"
  );
  process.exit(2);
}

const result = compareMandateAttenuation(parent, child);
console.log(JSON.stringify(result, null, 2));
process.exit(result.verdict === "FAIL" ? 1 : 0);
