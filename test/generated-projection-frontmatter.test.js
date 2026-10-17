import test from "node:test";
import assert from "node:assert/strict";

import { stampGeneratedProjectionChange } from "../scripts/lib/generated-projection-frontmatter.js";

const stale = [
  "---",
  "title: Corpus Status",
  "last_modified_at: 2026-06-08T00:00:00.000Z",
  "last_stamped_at: 2026-06-01T00:00:00.000Z",
  "---",
  "",
  "# Corpus Status",
  "",
  "old",
  "",
].join("\n");

test("unchanged generated projection preserves metadata and stays idempotent", () => {
  assert.equal(stampGeneratedProjectionChange(stale, stale, "2026-10-17"), stale);
});

test("changed projection refreshes existing modification and stamp dates", () => {
  const changed = stale.replace("\nold\n", "\nnew\n");
  const actual = stampGeneratedProjectionChange(stale, changed, "2026-10-17");
  assert.match(actual, /^last_modified_at: 2026-10-17$/m);
  assert.match(actual, /^last_stamped_at: 2026-10-17$/m);
  assert.match(actual, /\nnew\n/);
});

test("changed projection inserts missing generated freshness fields", () => {
  const before = ["---", "title: Corpus Status", "date: 2026-05-27", "---", "", "# Corpus Status", "", "old", ""].join("\n");
  const after = before.replace("\nold\n", "\nnew\n");
  const actual = stampGeneratedProjectionChange(before, after, "2026-10-17");
  assert.match(actual, /^last_modified_at: 2026-10-17$/m);
  assert.match(actual, /^last_stamped_at: 2026-10-17$/m);
});

test("a second render with no structural change does not churn the date", () => {
  const changed = stale.replace("\nold\n", "\nnew\n");
  const first = stampGeneratedProjectionChange(stale, changed, "2026-10-17");
  const second = stampGeneratedProjectionChange(first, first, "2026-10-18");
  assert.equal(second, first);
});
