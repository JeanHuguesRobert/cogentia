#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Prefixed } from "./lib/agent-acquired-context.js";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { readAgentAcquiredContextReply } from "./lib/agent-acquired-context-prompt.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "prompts", "fixtures", "agent-acquired-context");
const ingestDir = path.join(fixtureDir, "ingestion");
const ingestSource = [
  "scripts/lib/agent-acquired-context-ingest.js",
  "scripts/lib/agent-acquired-context-ingest-pure.js",
  "scripts/lib/agent-acquired-context-project.js",
  "scripts/lib/agent-acquired-context-parse.js",
].map((relative) => fs.readFileSync(path.join(root, relative), "utf8")).join("\n");

function readExact(name) {
  return fs.readFileSync(path.join(ingestDir, name), "utf8");
}

assert.equal(ingestSource.includes("supabase"), false);
assert.equal(ingestSource.includes("localStorage"), false);
assert.equal(ingestSource.includes("writeFile"), false);
assert.equal(ingestSource.includes("fetch("), false);

const validText = fs.readFileSync(path.join(fixtureDir, "no-persistent-memory.yaml"), "utf8");
const exact = `${validText} \n`;
const valid = ingestAgentAcquiredContext(exact);
assert.equal(valid.ok, true, valid.diagnostics.join("; "));
assert.equal(valid.kind, "agent_acquired_context_ingestion");
assert.equal(valid.raw.role, "immutable_raw_measurement");
assert.equal(valid.raw.text, exact);
assert.equal(valid.raw.sha256, sha256Prefixed(exact));
assert.equal(valid.normalized.kind, "agent_acquired_context");
assert.equal(valid.normalized.claim_status, "agent_claim_not_fact");
assert.notEqual(valid.raw.text, JSON.stringify(valid.normalized));
assert.equal(valid.normalized.raw_response.body, null);
assert.ok(valid.warnings.some((warning) => warning.includes("body is absent")));

const fenced = `\`\`\`yaml\n${validText.trim()}\n\`\`\`\n`;
const fencedResult = ingestAgentAcquiredContext(fenced);
assert.equal(fencedResult.ok, true, fencedResult.diagnostics.join("; "));
assert.equal(fencedResult.raw.text, fenced);
assert.equal(fencedResult.normalized.items.length, 1);

const extraText = readExact("extra-fields.yaml");
const extra = ingestAgentAcquiredContext(extraText);
assert.equal(extra.ok, true, extra.diagnostics.join("; "));
assert.equal(extra.raw.text, extraText);
assert.equal(Object.hasOwn(extra.normalized, "provider_note"), false);
assert.equal(Object.hasOwn(extra.normalized.items[0], "extra_score"), false);
assert.deepEqual(
  extra.extensions.map((entry) => entry.path).sort(),
  ["$.items[0].extra_score", "$.provider_note"],
);
assert.equal(extra.extensions.find((entry) => entry.path === "$.provider_note").value, "kept as evidence, not as a fact");
assert.equal(extra.extensions.find((entry) => entry.path === "$.items[0].extra_score").value, 0.5);
assert.equal(extra.raw.text.includes("provider_note"), true);
const strict = readAgentAcquiredContextReply(extraText);
assert.equal(strict.ok, false);
assert.ok(strict.errors.some((error) => error.includes("unexpected property")));

const partialText = readExact("missing-source.json");
const partial = ingestAgentAcquiredContext(partialText);
assert.equal(partial.ok, false);
assert.equal(partial.normalized, null);
assert.equal(partial.raw.text, partialText);
assert.equal(partial.raw.sha256, sha256Prefixed(partialText));
assert.ok(partial.diagnostics.some((error) => error.includes('missing required property "source"')));
assert.deepEqual(partial.extensions, [{ path: "$.vendor_extension", value: true }]);

const malformedText = readExact("malformed.json");
const malformed = ingestAgentAcquiredContext(malformedText);
assert.equal(malformed.ok, false);
assert.equal(malformed.normalized, null);
assert.equal(malformed.raw.text, malformedText);
assert.equal(malformed.extensions.length, 0);
assert.ok(malformed.diagnostics.some((error) => error.includes("Malformed JSON")));

const noted = `Note from the agent:\n${validText}`;
const notedResult = ingestAgentAcquiredContext(noted);
assert.equal(notedResult.ok, true, notedResult.diagnostics.join("; "));
assert.equal(notedResult.raw.text, noted);
assert.equal(Object.hasOwn(notedResult.normalized, "Note from the agent"), false);
assert.ok(notedResult.extensions.some((entry) => entry.path === "$.Note from the agent"));

const prose = "I remember that you like coffee, and this is the whole reply.\n";
const rejected = ingestAgentAcquiredContext(prose);
assert.equal(rejected.ok, false);
assert.equal(rejected.normalized, null);
assert.equal(rejected.raw.text, prose);
assert.ok(rejected.diagnostics.some((error) => error.includes("one YAML object")));

console.log("agent-acquired-context-ingest: ok");
