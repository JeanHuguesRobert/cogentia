import { test } from "node:test";
import assert from "node:assert/strict";
import { renderIndexCatalog, replaceIndexCatalog, stripIndexCatalog } from "../scripts/lib/research-index-navigation.js";

const docs = [
  { title: "Outside | document", rel: "docs/guide.md", role: "operational", updated: { date: "2026-09-19" } },
  { title: "Research document", rel: "research/a.md", role: "source", updated: { date: "2026-09-18" } },
];

test("renderIndexCatalog has deterministic ordering and repository-relative links", () => {
  const catalog = renderIndexCatalog(docs);
  assert.match(catalog, /\[Outside \\| document\]\(\.\.\/docs\/guide\.md\)/);
  assert.match(catalog, /\[Research document\]\(a\.md\)/);
  assert.ok(catalog.indexOf("Outside") < catalog.indexOf("Research"));
});

test("replaceIndexCatalog preserves editorial material and is idempotent", () => {
  const once = replaceIndexCatalog("# Research\n\nEditorial.\n", docs);
  assert.match(once, /Editorial/);
  assert.equal(replaceIndexCatalog(once, docs), once);
  assert.equal(stripIndexCatalog(once).trim(), "# Research\n\nEditorial.");
});

test("replaceIndexCatalog rejects an unclosed generated block", () => {
  assert.throws(() => replaceIndexCatalog("<!-- BEGIN_AUTO: index_catalog -->", docs), /Unclosed/);
});
