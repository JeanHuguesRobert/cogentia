/**
 * Read-only Pattern / Anti-pattern inventory for MCP (cogentia#110).
 * Canonical files live under <repo>/patterns/<id>/PATTERN.md.
 */
import fs from "node:fs";
import path from "node:path";
import { parseSkillFrontmatter, resolveRepoRoot } from "./cogentia-agent-skills.js";

export function patternsDir(repoRoot = resolveRepoRoot()) {
  return path.join(repoRoot, "patterns");
}

export function listPatternSlugs(repoRoot = resolveRepoRoot()) {
  const dir = patternsDir(repoRoot);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith(".") && !name.includes(".."))
    .sort();
}

function patternMetaFromFile(slug, repoRoot) {
  const patternPath = path.join(patternsDir(repoRoot), slug, "PATTERN.md");
  if (!fs.existsSync(patternPath)) {
    return { ok: false, error: "pattern_not_found", id: slug };
  }
  const raw = fs.readFileSync(patternPath, "utf8");
  const { data, body, error } = parseSkillFrontmatter(raw);
  const kind = String(data.kind || "pattern").toLowerCase() === "anti-pattern"
    || String(data.kind || "").toLowerCase() === "antipattern"
    ? "antipattern"
    : "pattern";
  const id = data.id || slug;
  return {
    ok: true,
    slug,
    id,
    kind,
    status: data.status || "experimental",
    title: data.title || data.name || slug,
    name: data.name || slug,
    description: typeof data.description === "string"
      ? data.description
      : firstParagraph(body),
    schema: data.schema || "cogentia.pattern/v1",
    related_issues: data.related_issues || data.related_issue || [],
    path: `patterns/${slug}/PATTERN.md`,
    frontmatter_error: error,
    body_chars: body.length,
  };
}

function firstParagraph(body) {
  const lines = String(body || "").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith(">")) continue;
    return t.slice(0, 280);
  }
  return "";
}

export function listPatterns(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const slugs = listPatternSlugs(repoRoot);
  const patterns = slugs.map((slug) => patternMetaFromFile(slug, repoRoot)).filter((p) => p.ok);
  return {
    ok: true,
    protocol: "cogentia.pattern/v1",
    patterns_root: "patterns/",
    count: patterns.length,
    patterns: patterns.map((p) => ({
      id: p.id,
      slug: p.slug,
      kind: p.kind,
      status: p.status,
      title: p.title,
      description: p.description,
      path: p.path,
    })),
    note: "Patterns recommend generative structure; they do not grant mandate or replace Skills/Tools.",
  };
}

export function getPattern(idOrSlug, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const includeBody = options.includeBody !== false;
  const rawId = String(idOrSlug || "").trim();
  if (!rawId) return { ok: false, error: "missing_id" };

  let slug = rawId.replace(/^cogentia:\/\//, "").replace(/^(pattern|antipattern)\//, "");
  slug = slug.replace(/\/PATTERN\.md$/i, "");
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    return { ok: false, error: "invalid_id" };
  }

  const meta = patternMetaFromFile(slug, repoRoot);
  if (!meta.ok) return meta;

  const result = {
    ok: true,
    protocol: "cogentia.pattern/v1",
    pattern: {
      id: meta.id,
      slug: meta.slug,
      kind: meta.kind,
      status: meta.status,
      title: meta.title,
      description: meta.description,
      path: meta.path,
    },
    mandate_hint: "Patterns guide generation; they do not grant authority.",
  };

  if (includeBody) {
    const patternPath = path.join(patternsDir(repoRoot), slug, "PATTERN.md");
    result.body_markdown = fs.readFileSync(patternPath, "utf8");
  }
  return result;
}

export function listPatternFiles(slug, repoRoot = resolveRepoRoot()) {
  const dir = path.join(patternsDir(repoRoot), slug);
  return listFilesRecursive(dir, dir);
}

export function listFilesRecursive(rootDir, current) {
  if (!fs.existsSync(current)) return [];
  const out = [];
  for (const ent of fs.readdirSync(current, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const abs = path.join(current, ent.name);
    if (ent.isDirectory()) {
      out.push(...listFilesRecursive(rootDir, abs));
    } else if (ent.isFile()) {
      out.push(path.relative(rootDir, abs).split(path.sep).join("/"));
    }
  }
  return out.sort();
}
