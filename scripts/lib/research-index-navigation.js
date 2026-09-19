/**
 * Deterministic generated catalog for a repository research index.
 * Editorial index sections remain untouched.
 */

export const INDEX_CATALOG_BLOCK = "index_catalog";

function marker() {
  return {
    begin: `<!-- BEGIN_AUTO: ${INDEX_CATALOG_BLOCK} -->`,
    end: `<!-- END_AUTO: ${INDEX_CATALOG_BLOCK} -->`,
  };
}

function escapeMarkdown(text) {
  return String(text || "Untitled document")
    .replace(/[\[\]]/g, "")
    .replace(/\|/g, "\\|");
}

function linkPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  return normalized.startsWith("research/") ? normalized.slice("research/".length) : `../${normalized}`;
}

export function renderIndexCatalog(documents) {
  const rows = [...documents]
    .sort((a, b) => String(a.title).localeCompare(String(b.title)) || String(a.rel).localeCompare(String(b.rel)))
    .map((doc) => `| [${escapeMarkdown(doc.title)}](${linkPath(doc.rel)}) | ${escapeMarkdown(doc.role || "unknown")} | ${escapeMarkdown(doc.updated?.date || "unknown")} |`);
  const { begin, end } = marker();
  return [
    begin,
    "## Corpus catalog",
    "",
    "*Generated navigation. Editorial sections above remain human-maintained.*",
    "",
    "| Document | Role | Updated |",
    "|---|---|---|",
    ...(rows.length ? rows : ["| *(No eligible public documents.)* | - | - |"]),
    "",
    end,
  ].join("\n");
}

export function replaceIndexCatalog(source, documents) {
  const before = String(source || "");
  const block = renderIndexCatalog(documents);
  const { begin, end } = marker();
  const start = before.indexOf(begin);
  if (start < 0) return `${before.replace(/\s*$/, "")}\n\n${block}\n`;
  const finish = before.indexOf(end, start);
  if (finish < 0) throw new Error(`Unclosed generated index catalog block (${INDEX_CATALOG_BLOCK}).`);
  return `${before.slice(0, start)}${block}${before.slice(finish + end.length)}`;
}

export function stripIndexCatalog(source) {
  const before = String(source || "");
  const { begin, end } = marker();
  const start = before.indexOf(begin);
  if (start < 0) return before;
  const finish = before.indexOf(end, start);
  if (finish < 0) throw new Error(`Unclosed generated index catalog block (${INDEX_CATALOG_BLOCK}).`);
  return `${before.slice(0, start)}${before.slice(finish + end.length)}`;
}
