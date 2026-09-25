#!/usr/bin/env node
/**
 * Deterministic unit test for stripS7AnchorLabel (operium#45 regression:
 * a section label appended to a canonical path/URL leaked into visible
 * Guide citations as a malformed source_id and broken GitHub URL).
 */

import assert from "node:assert/strict";
import { stripS7AnchorLabel } from "./lib/guide-s7-anchor.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("strips a trailing section label from a relative path", () => {
  assert.equal(
    stripS7AnchorLabel("barons-Mariani/research/second_method.md (Rule 0 + Five Rules)"),
    "barons-Mariani/research/second_method.md",
  );
});

test("strips a trailing section label from a full GitHub URL", () => {
  assert.equal(
    stripS7AnchorLabel(
      "https://github.com/JeanHuguesRobert/cogentia/blob/main/barons-Mariani/research/second_method.md (Rule 0 + Five Rules)",
    ),
    "https://github.com/JeanHuguesRobert/cogentia/blob/main/barons-Mariani/research/second_method.md",
  );
});

test("leaves a clean path unchanged", () => {
  assert.equal(stripS7AnchorLabel("research/DHITL.md"), "research/DHITL.md");
});

test("handles empty and nullish input", () => {
  assert.equal(stripS7AnchorLabel(""), "");
  assert.equal(stripS7AnchorLabel(null), "");
  assert.equal(stripS7AnchorLabel(undefined), "");
});

test("does not touch parentheses that are not a trailing label", () => {
  assert.equal(
    stripS7AnchorLabel("research/notes (draft).md"),
    "research/notes (draft).md",
  );
});
