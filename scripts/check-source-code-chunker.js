#!/usr/bin/env node
/**
 * test-source-code-chunker.js — Unit test suite for Issue #109
 */

import assert from "node:assert/strict";
import {
  detectContentKind,
  containsPotentialSecrets,
  chunkInoxSource,
  chunkJavaScriptSource,
  chunkSourceFile,
} from "./lib/source-code-chunker.js";

// 1. Test Content Kind Detection
assert.equal(detectContentKind("compiler/l9.nox"), "code_inox");
assert.equal(detectContentKind("scripts/lib/navigator.js"), "code_javascript");
assert.equal(detectContentKind("schema/cop.json"), "schema_json");
assert.equal(detectContentKind("config/app.yaml"), "config_yaml");
assert.equal(detectContentKind("research/paper.md"), "prose_markdown");

// 2. Test Inox Chunking
const inoxSnippet = `
module FractaVolta::Kernel

thing EnergyPacket {
  id: String,
  joules: Float,
}

def dispatch_packet(p: EnergyPacket) {
  print("Routing packet: " + p.id)
}
`;
const inoxChunks = chunkInoxSource(inoxSnippet, "kernel.nox");
assert.ok(inoxChunks.length >= 2);
assert.equal(inoxChunks[0].content_kind, "code_inox");
assert.match(inoxChunks[0].title, /module FractaVolta::Kernel|EnergyPacket/);

// 3. Test JavaScript Chunking
const jsSnippet = `
export function routePacket(packet) {
  return packet.joules * 0.95;
}

export class PacketRouter {
  constructor(nodeId) {
    this.nodeId = nodeId;
  }
}
`;
const jsChunks = chunkJavaScriptSource(jsSnippet, "router.js");
assert.ok(jsChunks.length >= 2);
assert.equal(jsChunks[0].content_kind, "code_javascript");
assert.equal(jsChunks[0].symbol_name, "routePacket");

// 4. Test Secret Scanning Gate
const cleanText = "const port = 8080;";
const dirtyText1 = "const OPENAI_KEY = 'sk-123456789012345678901234567890';";
const dirtyText2 = "-----BEGIN RSA PRIVATE KEY-----\nMIIE...";
assert.equal(containsPotentialSecrets(cleanText), false);
assert.equal(containsPotentialSecrets(dirtyText1), true);
assert.equal(containsPotentialSecrets(dirtyText2), true);

const safeChunks = chunkSourceFile(dirtyText1, "secrets.js");
assert.equal(safeChunks.length, 0); // Must not produce chunks for files with secrets

console.log(JSON.stringify({
  ok: true,
  test: "source_code_chunker_issue_109",
  kinds_tested: true,
  inox_tested: true,
  js_tested: true,
  secret_gate_tested: true,
  completed: true,
}, null, 2));
