#!/usr/bin/env node
import assert from "node:assert/strict";
import { main, parseArgs } from "./ops/navigation-assistant.js";

assert.deepEqual(parseArgs(["insert", "--text", "draft", "--confirm", "--target-id", "tab-1"]), {
  command: "insert",
  text: "draft",
  file: null,
  confirm: true,
  targetId: "tab-1",
});

assert.deepEqual(parseArgs(["copy", "--file=draft.txt"]), {
  command: "copy",
  text: null,
  file: "draft.txt",
  confirm: false,
  targetId: null,
});

await assert.rejects(
  () => main(["insert", "--text", "draft"]),
  /Insertion requires --confirm/,
);

console.log("navigation assistant tests: ok");
