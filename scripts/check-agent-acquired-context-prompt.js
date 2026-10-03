#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractPastePrompt,
  readAgentAcquiredContextReply,
} from "./lib/agent-acquired-context-prompt.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptFile = path.join(root, "prompts", "agent-acquired-context.md");
const fixtureDir = path.join(root, "prompts", "fixtures", "agent-acquired-context");

const requiredInPaste = [
  "Reply with one YAML document and nothing else.",
  "agent_claim_not_fact",
  "explicit_user_statement",
  "inference",
  "provider_memory",
  "unknown",
  "Do not claim that your report is complete.",
  "chain-of-thought",
  "Do not present a summary as a quotation.",
  "capture-limit",
  "no distinguishable persistent memory",
  "body: null",
  "body_sha256: unknown",
  "prompt_id: kys-ami-02",
  "prompt_version: v0",
  "current conversation",
  "Do not produce a Cogentigram, a mneme, or a personality score.",
];

const forbiddenInPaste = ["percentile", "73", "Grok", "ChatGPT", "Claude", "Gemini"];

const requiredAfterPaste = [
  "saved-memory list",
  "current thread",
  "weights",
  "not a transcript",
  "not captures from named providers",
];

function loadReply(name) {
  return fs.readFileSync(path.join(fixtureDir, name), "utf8");
}

function originsOf(data) {
  return new Set(data.items.map((item) => item.claimed_origin));
}

const markdown = fs.readFileSync(promptFile, "utf8");
const extracted = extractPastePrompt(markdown);
assert.equal(extracted.ok, true, extracted.errors.join("; "));
for (const phrase of requiredInPaste) {
  assert.equal(extracted.prompt.includes(phrase), true, `paste prompt missing: ${phrase}`);
}
for (const phrase of forbiddenInPaste) {
  assert.equal(extracted.prompt.includes(phrase), false, `paste prompt must not contain ${phrase}`);
}
for (const phrase of requiredAfterPaste) {
  assert.equal(extracted.after.includes(phrase), true, `limits section missing: ${phrase}`);
}
assert.equal(extracted.prompt.includes("<!--"), false);

const rich = readAgentAcquiredContextReply(loadReply("rich-memory.yaml"));
assert.equal(rich.ok, true, rich.errors.join("; "));
assert.equal(rich.data.protocol.prompt_id, "kys-ami-02");
assert.equal(rich.data.protocol.prompt_version, "v0");
assert.equal(rich.data.raw_response.body, null);
assert.deepEqual(
  [...originsOf(rich.data)].sort(),
  ["explicit_user_statement", "inference", "provider_memory", "unknown"],
);
assert.ok(rich.data.items.some((item) => item.contradicts.length > 0));
assert.ok(rich.data.items.some((item) => item.content.includes("Summary, not a quotation")));
assert.ok(rich.data.items.some((item) => item.content.includes("\"")));
assert.ok(rich.warnings.some((warning) => warning.includes("body is absent")));

const limited = readAgentAcquiredContextReply(loadReply("limited-memory.yaml"));
assert.equal(limited.ok, true, limited.errors.join("; "));
assert.match(limited.data.source.memory_scope, /current conversation/);
assert.equal(limited.data.items.length, 2);
assert.equal(
  limited.data.items.filter((item) => item.claimed_origin === "explicit_user_statement").length,
  1,
);
assert.equal(limited.data.items.filter((item) => item.claimed_origin === "unknown").length, 1);

const none = readAgentAcquiredContextReply(loadReply("no-persistent-memory.yaml"));
assert.equal(none.ok, true, none.errors.join("; "));
assert.equal(none.data.items.length, 1);
assert.equal(none.data.items[0].category, "capture-limit");
assert.equal(none.data.items[0].claimed_origin, "unknown");
assert.match(none.data.items[0].content, /no distinguishable persistent memory/);
assert.doesNotMatch(none.data.items[0].content, /prefer|family|employer|address/i);
assert.match(none.data.source.memory_scope, /no distinguishable persistent memory/);

const fenced = readAgentAcquiredContextReply(`\`\`\`yaml\n${loadReply("no-persistent-memory.yaml").trim()}\n\`\`\``);
assert.equal(fenced.ok, true, fenced.errors.join("; "));

const complete = readAgentAcquiredContextReply(loadReply("invalid/complete-flag.yaml"));
assert.equal(complete.ok, false);
assert.ok(complete.errors.some((error) => error.includes('unexpected property "complete"')));
assert.ok(complete.errors.some((error) => error.includes("Do not add completeness or truth flags.")));

const prose = readAgentAcquiredContextReply(loadReply("invalid/prose.txt"));
assert.equal(prose.ok, false);
assert.ok(prose.errors.some((error) => error.includes("one YAML object")));

const preamble = readAgentAcquiredContextReply(`Here is your memory:\n\n${loadReply("no-persistent-memory.yaml")}`);
assert.equal(preamble.ok, false);

const several = readAgentAcquiredContextReply("kind: agent_acquired_context\n---\nkind: other\n");
assert.equal(several.ok, false);
assert.ok(several.errors.some((error) => error.includes("several documents") || error.includes("one YAML object")));

const empty = readAgentAcquiredContextReply("  \n");
assert.equal(empty.ok, false);
assert.ok(empty.errors.some((error) => error.includes("Reply is empty")));

console.log("agent-acquired-context-prompt: ok");
