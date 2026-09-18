#!/usr/bin/env node
import assert from "node:assert/strict";
import { main, parseArgs } from "./ops/navigation-assistant.js";
import { tabSiteLabel, redactTab } from "./lib/navigation-assistant/tab-location.js";

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

assert.equal(tabSiteLabel("https://chatgpt.com/c/abc?foo=1", { showLocation: false }), "chatgpt.com");
assert.equal(tabSiteLabel("https://www.facebook.com/", { showLocation: false }), "facebook.com");
assert.equal(tabSiteLabel("chrome://extensions", { showLocation: false }), "(navigateur)");
assert.equal(tabSiteLabel("https://chatgpt.com/c/abc", { showLocation: true }), "https://chatgpt.com/c/abc");
assert.equal(redactTab({ id: "1", title: "x", url: "https://x.com/home" }, { showLocation: false }).url, "x.com");

console.log("navigation assistant tests: ok");
