/**
 * Frontmatter freshness for generated projections.
 *
 * Update modification metadata only when the rendered projection changes.
 * Re-running an already-current projection stays idempotent and creates no
 * daily timestamp churn.
 */

function upsertFrontmatterScalar(content, key, value) {
  const text = String(content ?? "");
  const match = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
  if (!match) return text;

  const newline = match[1].includes("\r\n") ? "\r\n" : "\n";
  let yaml = match[2];
  const line = `${key}: ${value}`;
  const field = new RegExp(`^${key}:\\s*.*$`, "m");

  if (field.test(yaml)) {
    yaml = yaml.replace(field, line);
  } else {
    yaml = `${yaml}${yaml.endsWith(newline) ? "" : newline}${line}`;
  }

  return `${match[1]}${yaml}${match[3]}${text.slice(match[0].length)}`;
}

export function stampGeneratedProjectionChange(before, after, stampDate) {
  const previous = String(before ?? "");
  const rendered = String(after ?? "");
  if (previous === rendered) return rendered;

  const stamp = String(stampDate ?? "").trim();
  if (!stamp) throw new Error("stampDate is required when generated content changes");

  let out = upsertFrontmatterScalar(rendered, "last_modified_at", stamp);
  out = upsertFrontmatterScalar(out, "last_stamped_at", stamp);
  return out;
}
