#!/usr/bin/env node
/**
 * Views Store API Server
 *
 * Flat store of generated views + Gmail-style tag browser (not a folder tree).
 * Filenames (often `repo-kind.ext`) give a soft hierarchy when sorted by name;
 * default list order is reverse-chronological (recent first).
 *
 * Env: PORT=3423 VIEWS_DIR=/srv/views
 * Deps: marked
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

const PORT = parseInt(process.env.PORT || "3423", 10);
const VIEWS_DIR = process.env.VIEWS_DIR || "/srv/views";
/** Display name for the corpus owner (GitHub user / org). */
const VIEWS_OWNER = process.env.VIEWS_OWNER || "JeanHuguesRobert";
const FAVICON_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "favicon.svg");
// Windows: import.meta.url pathname may start with /C:/ — normalize
const FAVICON_FILE = (() => {
  try {
    const u = new URL(import.meta.url);
    const p = path.dirname(u.pathname.startsWith("/") && /^\/[A-Za-z]:/.test(u.pathname) ? u.pathname.slice(1) : u.pathname);
    const candidate = path.join(p, "favicon.svg");
    if (fs.existsSync(candidate)) return candidate;
  } catch { /* ignore */ }
  // Deployed layout: next to views-server.js
  const beside = path.join(process.cwd(), "favicon.svg");
  if (fs.existsSync(beside)) return beside;
  const abs = path.join("/srv/views-server", "favicon.svg");
  return fs.existsSync(abs) ? abs : null;
})();

const VIEW_EXTENSIONS = new Set([".md", ".json", ".txt", ".yaml", ".yml", ".csv"]);

const MIME_TYPES = {
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

/** Kind tags (Gmail-style labels), derived from naming — not directories. */
const KIND_RULES = [
  { id: "issues", label: "issues", test: (stem) => /^current-issues/i.test(stem) || /issues/i.test(stem) && !/(index|concepts)$/i.test(stem) },
  { id: "continuations", label: "continuations", test: (stem) => /continuation/i.test(stem) },
  { id: "corpus-state", label: "corpus-state", test: (stem) => /corpus-state/i.test(stem) },
  { id: "index", label: "index", test: (stem) => /(?:^|-)index$/i.test(stem) || stem === "documents" },
  { id: "concepts", label: "concepts", test: (stem) => /(?:^|-)concepts$/i.test(stem) },
  { id: "env", label: "env", test: (stem) => /(?:^|-)env$/i.test(stem) || /\.env/i.test(stem) },
  { id: "package", label: "package", test: (stem) => /(?:^|-)package$/i.test(stem) },
  { id: "config", label: "config", test: (stem) => /(?:^|-)cogentia$/i.test(stem) },
];

/**
 * Operational importance (not urgency). Lower = more structurally important
 * for the cockpit (open work / health before bulk maps / config samples).
 * Long-term important kinds (index, concepts) sit in the middle — not "urgent"
 * but not buried under package/env noise.
 */
const KIND_IMPORTANCE = Object.freeze({
  issues: 10,
  continuations: 20,
  "corpus-state": 30,
  index: 40,
  concepts: 50,
  config: 60,
  cogentia: 60,
  package: 70,
  env: 80,
  other: 90,
});

const TYPE_ORDER = Object.freeze(["md", "json", "txt", "yaml", "yml", "csv"]);

const KIND_SUFFIX_RE = /^(.*)-(index|concepts|package|env|cogentia)$/i;

function kindImportance(kind) {
  return KIND_IMPORTANCE[kind] ?? KIND_IMPORTANCE.other;
}

/** Alphabetical with numeric awareness (repo names, labels). */
function alphaCmp(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function sortKindKeys(keys) {
  return keys.slice().sort((a, b) => kindImportance(a) - kindImportance(b) || alphaCmp(a, b));
}

function sortRepoKeys(keys) {
  return keys.slice().sort(alphaCmp);
}

function sortTypeKeys(keys) {
  return keys.slice().sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a);
    const ib = TYPE_ORDER.indexOf(b);
    const ra = ia === -1 ? 1000 : ia;
    const rb = ib === -1 ? 1000 : ib;
    return ra - rb || alphaCmp(a, b);
  });
}

/**
 * Tag filter: OR within each dimension (kind / repo / type), AND across dimensions.
 * - no tags → match all
 * - one tag → only that value
 * - several in same dimension → any of them (e.g. type:md OR type:json)
 * - tags in different dimensions → all groups must match
 * A view has only one type and at most one repo, so multi-select without OR was useless.
 */
function matchTagFilter(viewTagIds, selected) {
  if (!selected || !selected.length) return true;
  const groups = Object.create(null);
  for (const t of selected) {
    const dim = t.includes(":") ? t.slice(0, t.indexOf(":")) : "other";
    if (!groups[dim]) groups[dim] = [];
    groups[dim].push(t);
  }
  const set = new Set(viewTagIds);
  for (const tags of Object.values(groups)) {
    if (!tags.some((t) => set.has(t))) return false;
  }
  return true;
}

/**
 * Parse soft hierarchy from filename: repo prefix + kind.
 * e.g. cogentia-index.md → repo=cogentia, kind=index
 *      current-issues-list.md → repo=null, kind=issues
 */
function parseViewName(fileName) {
  const ext = path.extname(fileName).toLowerCase().slice(1) || "file";
  const stem = fileName.slice(0, fileName.length - (ext.length ? ext.length + 1 : 0));

  let repo = null;
  let kind = "other";
  let kindLabel = "other";

  const suf = stem.match(KIND_SUFFIX_RE);
  if (suf) {
    repo = suf[1];
    kind = suf[2].toLowerCase();
    kindLabel = kind;
  } else {
    for (const rule of KIND_RULES) {
      if (rule.test(stem)) {
        kind = rule.id;
        kindLabel = rule.label;
        break;
      }
    }
  }

  // Global operational views have no repo prefix
  if (/^(current-issues|continuations)/i.test(stem)) {
    repo = null;
  }

  /** Tags: multi-label, flat — Gmail style */
  const tags = [];
  tags.push({ type: "kind", id: `kind:${kind}`, label: kindLabel });
  if (repo) tags.push({ type: "repo", id: `repo:${repo}`, label: repo });
  tags.push({ type: "type", id: `type:${ext}`, label: `.${ext}` });

  return { stem, ext, repo, kind, kindLabel, tags };
}

function readHead(filePath, size, max = 12288) {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(Math.min(size, max));
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  return buf.toString("utf8");
}

const PUBLIC_BASE = process.env.VIEWS_PUBLIC_BASE || "https://cogentia.fractavolta.com";
/** GitHub org/user for smart path → source links */
const GITHUB_OWNER = process.env.VIEWS_GITHUB_OWNER || process.env.VIEWS_OWNER || "JeanHuguesRobert";
/** GitHub account homepage (profile / org) for the title owner link */
const GITHUB_OWNER_URL = `https://github.com/${GITHUB_OWNER}`;

/** Public site homes for soft cross-refs when frontmatter omits site. */
const SITE_DEFAULTS = {
  FractaVolta: "https://fractavolta.com/",
  cogentia: "https://jeanhuguesrobert.github.io/cogentia/",
  survey: "https://lepp.fr/",
};

/** Seed repos for smart path linkify (merged with live view-derived names). */
const KNOWN_REPOS_SEED = Object.freeze([
  "FractaVolta",
  "Inox",
  "JeanHuguesRobert",
  "Kudos",
  "acorsica.org",
  "barons-Mariani",
  "cogentia",
  "gouvernance",
  "inseme",
  "institut-mariani",
  "marenostrum",
  "marianivillage",
  "operium",
  "privai",
  "registre-mariani",
  "serra",
  "survey",
  "ubikia",
  ".github",
]);

/** Tokens that must never be treated as bare repo names. */
const BARE_REPO_BLOCKLIST = new Set([
  "main",
  "master",
  "human",
  "agent",
  "null",
  "true",
  "false",
  "type",
  "path",
  "name",
  "kind",
  "docs",
  "research",
  "src",
  "lib",
  "bin",
  "test",
  "tests",
  "package",
  "private",
  "public",
  "index",
  "config",
  "module",
  "scripts",
  "version",
  "readme",
  "license",
]);

/**
 * Top-level dirs that mark a path as repo-root-relative (not relative to the
 * current file under research/). Used for smart links in JSON/YAML/Markdown.
 */
const REPO_ROOT_PATH_PREFIXES = Object.freeze([
  "docs",
  "research",
  "src",
  "scripts",
  "deploy",
  "lib",
  "bin",
  "packages",
  "apps",
  "test",
  "tests",
  "prompts",
  "snapshots",
  "trails",
  "strategy",
  "campaign",
  "publications",
  "derived_products",
  "views",
  "public",
  "examples",
  "builds",
  ".cogentia",
  ".agents",
  ".github",
  ".cursor",
]);

const REPO_ROOT_PREFIX_RE = new RegExp(
  `^(?:${REPO_ROOT_PATH_PREFIXES.map(escapeRegExp).join("|")})/`
);

/** Resolve a path fragment against a view's repo / source file location. */
function resolvePathInRepo(purePath, ctx = {}) {
  let p = String(purePath || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!p || p === ".") return null;
  // Already absolute-from-repo-root style
  if (REPO_ROOT_PREFIX_RE.test(p) || p.startsWith("./")) {
    return p.replace(/^\.\//, "");
  }
  // ../ climbs from the source file directory when known
  const baseDir = ctx.githubPath
    ? path.posix.dirname(ctx.githubPath.replace(/\\/g, "/"))
    : "research";
  const joined = path.posix.normalize(path.posix.join(baseDir, p));
  if (joined.startsWith("../") || joined === ".." || joined.includes("/../")) {
    // Climbed above repo root — reject
    return null;
  }
  return joined;
}

/** Parse a simple indented YAML map under a key (cross_refs). */
function parseYamlMapBlock(fmBody, key) {
  const lines = fmBody.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && !new RegExp(`^${key}:\\s*$`).test(lines[i])) i++;
  if (i >= lines.length) return null;
  i++;
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line)) continue;
    if (/^\S/.test(line)) break; // next top-level key
    const m = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    const k = m[2].trim();
    let raw = m[3].trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    if (raw === "" || raw === "|" || raw === ">") {
      const child = {};
      parent[k] = child;
      stack.push({ indent, obj: child });
      continue;
    }
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    if (raw === "null") parent[k] = null;
    else parent[k] = raw;
  }
  return Object.keys(root).length ? root : null;
}

function unquoteYaml(s) {
  if (s == null) return s;
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    try {
      return JSON.parse(t.startsWith("'") ? `"${t.slice(1, -1)}"` : t);
    } catch {
      return t.slice(1, -1);
    }
  }
  return t;
}

/**
 * Derive cross_refs from filename when frontmatter has none.
 * Same model as cogentia.js publish enrichment.
 */
function deriveCrossRefs(fileName, parsed) {
  const viewUrl = `${PUBLIC_BASE}/views/${encodeURIComponent(fileName)}`;
  const kind = parsed.kind;
  const repo = parsed.repo;
  let relation = "derived_mirror";
  if (kind === "issues" || kind === "continuations" || kind === "corpus-state") {
    relation = "operational_export";
  }
  if (kind === "env" || kind === "package" || kind === "config" || kind === "cogentia") {
    relation = "config_sample";
  }

  let github = null;
  if (kind === "issues") {
    github = {
      full_name: "JeanHuguesRobert",
      path: null,
      url: "https://github.com/orgs/JeanHuguesRobert/repositories",
      note: "Open issues aggregated across tracked repositories",
    };
  } else if (kind === "continuations") {
    github = {
      full_name: "JeanHuguesRobert/JeanHuguesRobert",
      path: ".cogentia/continuations",
      url: "https://github.com/JeanHuguesRobert/JeanHuguesRobert/tree/main/.cogentia/continuations",
    };
  } else if (repo) {
    const branch = repo === "Inox" ? "master" : "main";
    let gpath = null;
    if (kind === "index") gpath = "research/index.md";
    else if (kind === "concepts") gpath = "research/concepts.md";
    else if (kind === "package") gpath = "package.json";
    else if (kind === "config" || kind === "cogentia") gpath = ".cogentia.json";
    // env: no public github path (secrets)
    if (gpath) {
      github = {
        full_name: `JeanHuguesRobert/${repo}`,
        path: gpath,
        url: `https://github.com/JeanHuguesRobert/${repo}/blob/${branch}/${gpath}`,
      };
    } else if (kind !== "env") {
      github = {
        full_name: `JeanHuguesRobert/${repo}`,
        path: null,
        url: `https://github.com/JeanHuguesRobert/${repo}`,
      };
    }
  }

  const siteUrl = repo && SITE_DEFAULTS[repo] ? SITE_DEFAULTS[repo] : null;
  const site = siteUrl
    ? { url: siteUrl, label: repo === "FractaVolta" ? "FractaVolta site" : `${repo} site` }
    : null;

  return {
    view_id: fileName.replace(/\.[^.]+$/, ""),
    view_url: viewUrl,
    relation,
    kind,
    repo: repo || null,
    github,
    site,
  };
}

function parseFrontmatterMeta(head) {
  const m = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    return {
      visibility: { visible: true, reason: "no frontmatter (default public)" },
      produced: null,
      title: null,
      cross_refs: null,
    };
  }

  const block = m[1];
  const visibility = checkVisibilityFromBlock(block);

  // Production / generation time (content time), distinct from filesystem mtime
  let produced = null;
  for (const key of ["generated_at", "last_modified_at", "produced_at", "updated_at", "date"]) {
    const re = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "im");
    const hit = block.match(re);
    if (hit) {
      const raw = hit[1].trim();
      const d = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
      if (!Number.isNaN(d.getTime())) {
        produced = d.toISOString();
        break;
      }
    }
  }

  let title = null;
  const t = block.match(/^title:\s*["']?(.+?)["']?\s*$/im);
  if (t) title = t[1].trim();

  let cross_refs = parseYamlMapBlock(block, "cross_refs");
  if (cross_refs) {
    // Normalize nested string fields
    if (cross_refs.github && typeof cross_refs.github === "object") {
      for (const k of Object.keys(cross_refs.github)) {
        cross_refs.github[k] = unquoteYaml(cross_refs.github[k]);
      }
    }
    if (cross_refs.site && typeof cross_refs.site === "object") {
      for (const k of Object.keys(cross_refs.site)) {
        cross_refs.site[k] = unquoteYaml(cross_refs.site[k]);
      }
    }
    for (const k of ["view_id", "view_url", "relation", "kind", "repo"]) {
      if (cross_refs[k] != null) cross_refs[k] = unquoteYaml(cross_refs[k]);
    }
  }

  return { visibility, produced, title, cross_refs };
}

function checkVisibilityFromBlock(frontmatterText) {
  for (const line of frontmatterText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const visMatch = trimmed.match(/^visibility:\s*(.+)$/i);
    if (visMatch) {
      const visibility = visMatch[1].toLowerCase().trim().replace(/^["']|["']$/g, "");
      if (["private", "confidential", "secret"].includes(visibility)) {
        return { visible: false, reason: `visibility: ${visibility}` };
      }
    }
    for (const key of ["public", "published"]) {
      const pm = trimmed.match(new RegExp(`^${key}:\\s*(.+)$`, "i"));
      if (pm) {
        const val = pm[1].toLowerCase().trim();
        if (val === "false" || val === "no") {
          return { visible: false, reason: `${key}: false` };
        }
      }
    }
  }
  return { visible: true, reason: "frontmatter allows public (default)" };
}

function checkVisibility(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { visible: true, reason: "no frontmatter (default public)" };
  return checkVisibilityFromBlock(m[1]);
}

function safeJoinViews(fileName) {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes("..") || base.includes("\0")) return null;
  const full = path.join(VIEWS_DIR, base);
  if (!full.startsWith(path.resolve(VIEWS_DIR))) return null;
  return full;
}

function listViews() {
  if (!fs.existsSync(VIEWS_DIR)) return [];
  return fs
    .readdirSync(VIEWS_DIR)
    .filter((f) => VIEW_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => {
      const filePath = path.join(VIEWS_DIR, f);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        return null;
      }
      if (!stat.isFile()) return null;

      const parsed = parseViewName(f);
      let visibility = { visible: true, reason: "default public" };
      let produced = null;
      let title = null;
      let cross_refs = null;

      if (["md", "txt", "yaml", "yml"].includes(parsed.ext)) {
        try {
          const head = readHead(filePath, stat.size);
          const meta = parseFrontmatterMeta(head);
          visibility = meta.visibility;
          produced = meta.produced;
          title = meta.title;
          cross_refs = meta.cross_refs;
        } catch {
          visibility = { visible: false, reason: "error reading file" };
        }
      }

      // Fallback production date = mtime when frontmatter has none
      const modified = stat.mtime.toISOString();
      if (!produced) produced = modified;
      if (!cross_refs) cross_refs = deriveCrossRefs(f, parsed);

      return {
        name: f,
        title: title || f,
        size: stat.size,
        modified,
        produced,
        ext: parsed.ext,
        repo: parsed.repo,
        kind: parsed.kind,
        kind_label: parsed.kindLabel,
        tags: parsed.tags,
        tag_ids: parsed.tags.map((t) => t.id),
        url: `/views/${encodeURIComponent(f)}`,
        cross_refs,
        visible: visibility.visible,
        visibility_reason: visibility.reason,
      };
    })
    .filter((v) => v && v.visible);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Basenames currently published in VIEWS_DIR (for internal link resolution). */
function listViewBasenames() {
  try {
    if (!fs.existsSync(VIEWS_DIR)) return new Set();
    return new Set(
      fs
        .readdirSync(VIEWS_DIR)
        .filter((f) => VIEW_EXTENSIONS.has(path.extname(f).toLowerCase()))
    );
  } catch {
    return new Set();
  }
}

/**
 * Resolve a markdown href so it never points nowhere:
 * - absolute http(s)/mailto/# → keep
 * - another published view (by basename) → /views/{name}
 * - relative path with known repo → GitHub blob URL
 * - otherwise → null (caller renders plain text, not a dead link)
 */
function resolveDocHref(href, ctx) {
  if (href == null || href === "") return null;
  const trimmed = String(href).trim();
  if (/^(https?:|mailto:)/i.test(trimmed) || trimmed.startsWith("//")) {
    return { href: trimmed, external: true };
  }
  if (trimmed.startsWith("#")) {
    return { href: trimmed, external: false };
  }

  const hashIdx = trimmed.indexOf("#");
  const pathPart = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : "";
  const qIdx = pathPart.indexOf("?");
  const purePath = qIdx >= 0 ? pathPart.slice(0, qIdx) : pathPart;

  if (purePath.startsWith("/views/")) {
    const name = decodeURIComponent(purePath.slice("/views/".length));
    if (ctx.viewNames.has(name)) {
      return { href: `/views/${encodeURIComponent(name)}${hash}`, external: false };
    }
    return null;
  }
  if (purePath === "/" || purePath === "/docs" || purePath === "/api/docs") {
    return { href: purePath + hash, external: false };
  }
  if (purePath.startsWith("/")) {
    // Unknown absolute site path — do not invent a dead link
    return null;
  }

  // Relative or bare filename → prefer another view on this store
  const base = path.posix.basename(purePath.replace(/\\/g, "/"));
  const candidates = [];
  if (base) {
    candidates.push(base);
    if (!path.extname(base)) {
      for (const ext of [".md", ".json", ".txt", ".yaml", ".yml"]) {
        candidates.push(base + ext);
      }
    }
  }
  for (const c of candidates) {
    if (ctx.viewNames.has(c)) {
      return { href: `/views/${encodeURIComponent(c)}${hash}`, external: false };
    }
  }

  // Fall back to GitHub when we know the repo (and optional source path)
  if (ctx.repo) {
    // research/foo, docs/bar → repo root; sibling files → beside githubPath
    const joined = resolvePathInRepo(purePath.replace(/\\/g, "/"), ctx);
    if (joined) {
      const href = githubSourceUrl(GITHUB_OWNER, ctx.repo, joined);
      if (href) return { href: href + hash, external: true };
    }
  }

  return null;
}

/**
 * Linkify plain text inside already-rendered Markdown HTML, without touching
 * existing <a>, <code>, <pre>, <script>, <style> content (no double-escape).
 */
function linkifyMarkdownHtml(html, ctx) {
  const parts = String(html ?? "").split(/(<[^>]+>)/g);
  let out = "";
  let skipDepth = 0; // a | code | pre | script | style
  const skipNames = new Set(["a", "code", "pre", "script", "style", "kbd", "samp"]);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("<")) {
      const m = part.match(/^<\/?\s*([a-zA-Z][a-zA-Z0-9]*)/);
      const name = m ? m[1].toLowerCase() : "";
      const isClose = /^<\//.test(part);
      const isSelf = /\/>$/.test(part) || /^<(?:br|hr|img|input|meta|link)\b/i.test(part);
      if (name && skipNames.has(name) && !isSelf) {
        skipDepth += isClose ? -1 : 1;
        if (skipDepth < 0) skipDepth = 0;
      }
      out += part;
      continue;
    }
    if (skipDepth > 0) {
      out += part;
      continue;
    }
    // Text nodes from marked are already HTML-escaped — decode, linkify, re-escape.
    const plain = part
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/gi, "'");
    out += linkifyWellFormedUrls(plain, {
      owner: ctx.owner || GITHUB_OWNER,
      repo: ctx.repo || null,
      kind: ctx.kind || "index",
      githubPath: ctx.githubPath || null,
      forceCtxPaths: !!ctx.repo,
      linkBareRepos: false, // too noisy in prose ("cogentia" every other line)
      knownRepos: ctx.knownRepos,
    });
  }
  return out;
}

function renderMarkdown(content, linkCtx) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  let md = content;
  if (frontmatterMatch) md = content.slice(frontmatterMatch[0].length);

  const ctx = linkCtx || {
    viewNames: listViewBasenames(),
    repo: null,
    githubPath: null,
    kind: null,
  };
  const renderer = new marked.Renderer();
  /**
   * marked v15+ passes a token object { href, title, tokens };
   * older marked (v12) passed (href, title, text). Support both.
   */
  renderer.link = function (hrefOrToken, title, text) {
    let href;
    let linkTitle;
    let label;
    if (hrefOrToken && typeof hrefOrToken === "object" && "href" in hrefOrToken) {
      href = hrefOrToken.href;
      linkTitle = hrefOrToken.title;
      try {
        label = this.parser.parseInline(hrefOrToken.tokens || []);
      } catch {
        label = "";
      }
    } else {
      href = hrefOrToken;
      linkTitle = title;
      label = text;
    }
    if (label == null || label === "") label = href || "";
    const resolved = resolveDocHref(href, ctx);
    if (!resolved) {
      // Not a link — avoid href="#" / broken relative paths
      return `<span class="unlinked" title="No public target for this reference">${label}</span>`;
    }
    let out = `<a href="${escapeHtml(resolved.href)}"`;
    if (linkTitle) out += ` title="${escapeHtml(linkTitle)}"`;
    if (resolved.external) out += ` target="_blank" rel="noopener"`;
    out += `>${label}</a>`;
    return out;
  };
  let html = marked.parse(md, { renderer });
  // Bare partial paths in prose (research/…, docs/…, repo/path, …)
  if (ctx.repo) {
    html = linkifyMarkdownHtml(html, ctx);
  }
  return html;
}

/** Pretty body for structured formats; raw remains original file bytes as text. */
function formatStructuredView(content, ext) {
  if (ext === ".json") {
    let pretty = content;
    try {
      pretty = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      /* keep original if invalid JSON */
    }
    return { kind: "structured", pretty, raw: content, label: "JSON" };
  }
  if (ext === ".yaml" || ext === ".yml") {
    // No YAML dependency: normalize newlines / trailing spaces only.
    // Authored YAML is usually already indented; invalid files still show as raw text.
    const pretty = content.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
    return { kind: "structured", pretty, raw: content, label: "YAML" };
  }
  return null;
}

/**
 * Well-formed http(s) URL with a real host (FQDN, localhost, or IP).
 * Used to auto-link URLs inside pretty JSON/YAML only.
 */
function isWellFormedHttpUrl(s) {
  if (!s || s.length < 8 || s.length > 2048) return false;
  let u;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const h = u.hostname;
  if (!h) return false;
  if (h === "localhost") return true;
  // IPv4
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return true;
  // IPv6 (URL.hostname may omit brackets)
  if (h.includes(":")) return true;
  // FQDN: at least one dot, DNS labels, multi-letter TLD
  if (
    !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
      h
    )
  ) {
    return false;
  }
  const labels = h.split(".");
  const tld = labels[labels.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) return false;
  return true;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function defaultGithubBranch(repo) {
  return repo === "Inox" ? "master" : "main";
}

/** Build https://github.com/owner/repo[/(blob|tree)/branch/path] */
function githubSourceUrl(owner, repo, subpath) {
  const o = owner || GITHUB_OWNER;
  if (!repo) return null;
  if (!subpath) return `https://github.com/${o}/${repo}`;
  let p = String(subpath).replace(/^\/+/, "");
  if (!p) return `https://github.com/${o}/${repo}`;
  // Already a GitHub content path
  if (/^(blob|tree)\//.test(p)) return `https://github.com/${o}/${repo}/${p}`;
  const branch = defaultGithubBranch(repo);
  const last = p.split("/").pop() || "";
  const isFile = /\.[a-zA-Z0-9]{1,12}$/.test(last) && !last.endsWith(".");
  return `https://github.com/${o}/${repo}/${isFile ? "blob" : "tree"}/${branch}/${p}`;
}

/** Known repo names: seed + live inventory from VIEWS_DIR filenames. */
function collectKnownRepos() {
  const set = new Set(KNOWN_REPOS_SEED);
  for (const r of Object.keys(SITE_DEFAULTS)) set.add(r);
  try {
    if (fs.existsSync(VIEWS_DIR)) {
      for (const f of fs.readdirSync(VIEWS_DIR)) {
        if (!VIEW_EXTENSIONS.has(path.extname(f).toLowerCase())) continue;
        const p = parseViewName(f);
        if (p.repo) set.add(p.repo);
      }
    }
  } catch {
    /* ignore */
  }
  return set;
}

function peelTrailingPunct(raw) {
  let s = raw;
  let trail = "";
  while (s.length > 1 && /[.,;:!?)]+$/.test(s)) {
    const ch = s[s.length - 1];
    if (ch === ")") {
      const open = (s.match(/\(/g) || []).length;
      const close = (s.match(/\)/g) || []).length;
      if (open >= close) break;
    }
    trail = ch + trail;
    s = s.slice(0, -1);
  }
  return { token: s, trail };
}

function pushLinkRange(ranges, start, end, href) {
  if (start == null || end == null || end <= start || !href) return;
  if (end - start > 2048) return;
  ranges.push({ start, end, href });
}

/**
 * Collect non-overlapping linkable spans in pretty JSON/YAML (and markdown prose):
 * 1. full http(s) URLs
 * 2. github.com/... without scheme
 * 3. owner/repo and owner/repo/path
 * 4. knownRepo/path (typical partial path)
 * 5. ../knownRepo[/path]
 * 6. bare known repo names (JSON; off in markdown prose)
 * 7. repo-local paths: research/…, docs/…, ./bin/…, and bare files beside the source
 */
function findSmartLinkRanges(text, ctx = {}) {
  const src = String(text ?? "");
  const ranges = [];
  const owner = ctx.owner || GITHUB_OWNER;
  const known = ctx.knownRepos || collectKnownRepos();
  // Longer names first so barons-Mariani wins over shorter prefixes
  const repoList = [...known].filter(Boolean).sort((a, b) => b.length - a.length);
  const repoAlt = repoList.map(escapeRegExp).join("|");
  if (!repoAlt) return ranges;

  // Path body: no whitespace/quotes; allow typical path chars
  const pathBody = "[^\\s\"'<>\\\\,\\]\\)]+";
  const rootDirs = REPO_ROOT_PATH_PREFIXES.map(escapeRegExp).join("|");

  // 1) Absolute http(s)
  {
    const re = /https?:\/\/[^\s<>"'`\\]+/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const { token, trail } = peelTrailingPunct(m[0]);
      if (!isWellFormedHttpUrl(token)) continue;
      pushLinkRange(ranges, m.index, m.index + token.length, token);
      void trail;
    }
  }

  // 2) github.com/... without scheme
  {
    const re = /(?:www\.)?github\.com\/[^\s"'<>\\]+/gi;
    let m;
    while ((m = re.exec(src)) !== null) {
      const { token } = peelTrailingPunct(m[0]);
      const href = token.startsWith("http") ? token : `https://${token.replace(/^www\./i, "")}`;
      if (!isWellFormedHttpUrl(href)) continue;
      pushLinkRange(ranges, m.index, m.index + token.length, href);
    }
  }

  // 3) owner/repo[/path…]
  {
    const re = new RegExp(
      `\\b${escapeRegExp(owner)}\\/(${repoAlt})(\\/${pathBody})?`,
      "g"
    );
    let m;
    while ((m = re.exec(src)) !== null) {
      const full = peelTrailingPunct(m[0]).token;
      // re-parse after peel
      const mm = full.match(
        new RegExp(`^${escapeRegExp(owner)}\\/(${repoAlt})(?:\\/(.*))?$`)
      );
      if (!mm) continue;
      const repo = mm[1];
      const sub = mm[2] || "";
      const href = githubSourceUrl(owner, repo, sub);
      pushLinkRange(ranges, m.index, m.index + full.length, href);
    }
  }

  // 4) knownRepo/path… (not already owner/repo — those start earlier with owner/)
  {
    const re = new RegExp(`(?<![A-Za-z0-9_.\\/-])(${repoAlt})\\/(${pathBody})`, "g");
    let m;
    while ((m = re.exec(src)) !== null) {
      // Skip if this is the path part of owner/repo (preceded by owner/)
      const before = src.slice(Math.max(0, m.index - owner.length - 1), m.index);
      if (before === `${owner}/`) continue;
      const { token } = peelTrailingPunct(m[0]);
      const slash = token.indexOf("/");
      if (slash < 0) continue;
      const repo = token.slice(0, slash);
      const sub = token.slice(slash + 1);
      if (!known.has(repo) || !sub) continue;
      // Avoid false positives like "type/module" — repo must be known
      const href = githubSourceUrl(owner, repo, sub);
      pushLinkRange(ranges, m.index, m.index + token.length, href);
    }
  }

  // 5) ../knownRepo[/path]
  {
    const re = new RegExp(`\\.\\.\\/(${repoAlt})(\\/${pathBody})?`, "g");
    let m;
    while ((m = re.exec(src)) !== null) {
      const { token } = peelTrailingPunct(m[0]);
      const mm = token.match(new RegExp(`^\\.\\.\\/(${repoAlt})(?:\\/(.*))?$`));
      if (!mm) continue;
      const href = githubSourceUrl(owner, mm[1], mm[2] || "");
      pushLinkRange(ranges, m.index, m.index + token.length, href);
    }
  }

  // 6) bare known repo names (JSON string values, cites arrays, …)
  if (ctx.linkBareRepos !== false) {
    const re = new RegExp(`(?<![A-Za-z0-9_.\\/-])(${repoAlt})(?![A-Za-z0-9_.\\/-])`, "g");
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      if (BARE_REPO_BLOCKLIST.has(name.toLowerCase())) continue;
      if (!known.has(name)) continue;
      const href = githubSourceUrl(owner, name, "");
      pushLinkRange(ranges, m.index, m.index + name.length, href);
    }
  }

  // 7) Repo-local project paths (research/…, docs/…, ./bin/…)
  //    — JSON single-repo views, or any markdown with a known repo (forceCtxPaths)
  const ctxRepo = ctx.repo || null;
  const ctxKind = ctx.kind || null;
  const allowCtxPaths =
    ctxRepo &&
    known.has(ctxRepo) &&
    (ctx.forceCtxPaths ||
      ["package", "index", "concepts", "env", "other"].includes(ctxKind));
  if (allowCtxPaths) {
    // Case-sensitive: do not treat JSON keys like "license" as LICENSE files.
    const reCtx = new RegExp(
      `(?<![A-Za-z0-9_.])(` +
        `\\.\\/?${pathBody}` + // ./bin/foo.js
        `|(?:${rootDirs})\\/${pathBody}` + // research/foo.md, docs/bar.md
        `|(?:README|LICENSE|CHANGELOG|CONTRIBUTING|AGENTS|CLAUDE)(?:\\.[A-Za-z0-9]+)?` +
        `)(?![A-Za-z0-9_.\\/])`,
      "g"
    );
    let m;
    while ((m = reCtx.exec(src)) !== null) {
      const { token } = peelTrailingPunct(m[0]);
      if (!token || token === "." || token === "./") continue;
      // ../repo handled above
      if (token.startsWith("../")) continue;
      const sub = resolvePathInRepo(token, ctx) || token.replace(/^\.\//, "");
      const href = githubSourceUrl(owner, ctxRepo, sub);
      pushLinkRange(ranges, m.index, m.index + token.length, href);
    }

    // 8) Bare filenames (foo.md) → beside the source file (research/index.md → research/foo.md)
    if (ctx.githubPath || ctx.forceCtxPaths) {
      const reBareFile = new RegExp(
        `(?<![A-Za-z0-9_./-])([A-Za-z0-9_.-]+\\.(?:md|markdown|json|txt|ya?ml|csv|js|mjs|ts|tsx))(?![A-Za-z0-9_./-])`,
        "g"
      );
      let m;
      while ((m = reBareFile.exec(src)) !== null) {
        const { token } = peelTrailingPunct(m[0]);
        if (!token) continue;
        // Skip if this is already part of a longer path match (overlap picker handles most)
        const sub = resolvePathInRepo(token, {
          githubPath: ctx.githubPath || "research/index.md",
        });
        if (!sub) continue;
        const href = githubSourceUrl(owner, ctxRepo, sub);
        pushLinkRange(ranges, m.index, m.index + token.length, href);
      }
    }
  }

  // Prefer earlier, then longer spans; drop overlaps
  ranges.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const picked = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    picked.push(r);
    cursor = r.end;
  }
  return picked;
}

/**
 * Escape text and wrap smart refs (full URLs + partial repo paths) as links.
 * Pretty JSON/YAML only — raw mode stays plain text.
 */
function linkifyWellFormedUrls(text, ctx = {}) {
  const src = String(text ?? "");
  const ranges = findSmartLinkRanges(src, {
    owner: ctx.owner || GITHUB_OWNER,
    repo: ctx.repo || null,
    kind: ctx.kind || null,
    githubPath: ctx.githubPath || null,
    forceCtxPaths: !!ctx.forceCtxPaths,
    linkBareRepos: ctx.linkBareRepos,
    knownRepos: ctx.knownRepos || collectKnownRepos(),
  });
  if (!ranges.length) return escapeHtml(src);

  let html = "";
  let last = 0;
  for (const r of ranges) {
    html += escapeHtml(src.slice(last, r.start));
    const label = src.slice(r.start, r.end);
    html += `<a class="url-link" href="${escapeHtml(r.href)}" target="_blank" rel="noopener" title="${escapeHtml(r.href)}">${escapeHtml(label)}</a>`;
    last = r.end;
  }
  html += escapeHtml(src.slice(last));
  return html;
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendHtml(res, content, status = 200) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(content);
}

function sendText(res, content, contentType, status = 200) {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(content);
}

function sendDownload(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
  });
  res.end(fs.readFileSync(filePath));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHARED_CSS = `
  :root {
    --bg: #f6f8fa;
    --panel: #ffffff;
    --border: #d0d7de;
    --text: #1f2328;
    --muted: #656d76;
    --link: #0969da;
    --hover: #f3f4f6;
    --accent: #ddf4ff;
    --tag-kind: #ddf4ff;
    --tag-repo: #fff8c5;
    --tag-type: #eaeef2;
    --header-bg: #f6f8fa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: var(--text);
    background: var(--bg);
    line-height: 1.45;
  }
  a { color: var(--link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .app { max-width: 1120px; margin: 0 auto; padding: 16px 20px 48px; }
  .topbar {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 16px;
    margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
  }
  .topbar h1 { margin: 0; font-size: 1.3rem; font-weight: 600; }
  .topbar h1 a.owner-link { color: inherit; text-decoration: none; }
  .topbar h1 a.owner-link:hover { color: var(--link); text-decoration: underline; }
  .topbar .sub { color: var(--muted); font-size: 0.9rem; flex: 1; }
  .topbar .sub a { color: var(--muted); }
  .topbar .sub a:hover { color: var(--link); }
  .layout { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: start; }
  @media (max-width: 800px) {
    .layout { grid-template-columns: 1fr; }
  }
  .sidebar {
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 0; position: sticky; top: 12px;
  }
  .sidebar h2 {
    margin: 0; padding: 4px 14px 8px; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--muted); font-weight: 600;
  }
  .sidebar .tag-btn {
    display: flex; width: 100%; align-items: center; justify-content: space-between;
    gap: 8px; padding: 7px 14px; border: 0; background: transparent; cursor: pointer;
    font-size: 13px; text-align: left; color: var(--text);
  }
  .sidebar .tag-btn:hover { background: var(--hover); }
  .sidebar .tag-btn.active { background: var(--accent); font-weight: 600; }
  .sidebar .tag-btn .n { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  .sidebar .section { margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; }
  .main { min-width: 0; }
  .toolbar {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 12px; margin-bottom: 10px;
  }
  .toolbar input[type="search"] {
    flex: 1 1 180px; min-width: 140px; padding: 7px 10px;
    border: 1px solid var(--border); border-radius: 6px; font-size: 14px;
  }
  .toolbar select, .toolbar button {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--panel); font-size: 13px; cursor: pointer;
  }
  .toolbar button:hover, .toolbar select:hover { background: var(--hover); }
  .active-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; min-height: 0; }
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border);
  }
  .pill.kind { background: var(--tag-kind); }
  .pill.repo { background: var(--tag-repo); }
  .pill.type { background: var(--tag-type); }
  .pill .x { cursor: pointer; opacity: 0.7; border: 0; background: none; font-size: 14px; line-height: 1; padding: 0 2px; }
  .pill .x:hover { opacity: 1; }
  .panel {
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
  }
  table.files { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.files th, table.files td {
    padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  table.files th {
    background: var(--header-bg); font-weight: 600; font-size: 11px;
    color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em;
    user-select: none; cursor: pointer;
  }
  table.files th:hover { color: var(--text); }
  table.files th.sorted { color: var(--link); }
  table.files th .arrow { font-size: 10px; margin-left: 3px; }
  table.files tr:hover td { background: var(--hover); }
  table.files tr:last-child td { border-bottom: none; }
  table.files td.name a { font-weight: 500; }
  table.files .col-name { width: auto; }
  table.files .col-tags { width: 22%; }
  table.files .col-xrefs { width: 140px; }
  table.files .col-size { width: 72px; text-align: right; }
  table.files .col-date { width: 140px; }
  table.files .col-actions { width: 110px; }
  .xref a { margin-right: 6px; font-size: 11px; color: var(--muted); }
  .xref a:hover { color: var(--link); }
  table.files th.col-size, table.files td.col-size { text-align: right; }
  .tag-inline {
    display: inline-block; margin: 1px 3px 1px 0; padding: 1px 7px;
    border-radius: 999px; font-size: 11px; border: 1px solid var(--border);
    cursor: pointer; vertical-align: middle;
  }
  .tag-inline.kind { background: var(--tag-kind); }
  .tag-inline.repo { background: var(--tag-repo); }
  .tag-inline.type { background: var(--tag-type); }
  .muted { color: var(--muted); }
  .empty { padding: 36px; text-align: center; color: var(--muted); }
  .status-bar {
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
    margin-top: 10px; font-size: 12px; color: var(--muted);
  }
  .actions-inline a { margin-right: 8px; font-size: 12px; color: var(--muted); }
  .actions-inline a:hover { color: var(--link); }
  @media (max-width: 720px) {
    table.files .col-tags, table.files .col-actions { display: none; }
  }
`;

function generateExplorerHtml(views) {
  const payload = views.map((v) => ({
    name: v.name,
    title: v.title,
    size: v.size,
    size_label: formatSize(v.size),
    modified: v.modified,
    produced: v.produced,
    ext: v.ext,
    repo: v.repo,
    kind: v.kind,
    tags: v.tags,
    tag_ids: v.tag_ids,
    url: v.url,
    cross_refs: v.cross_refs || null,
  }));

  // Tag catalogue for sidebar
  const kindCounts = {};
  const repoCounts = {};
  const typeCounts = {};
  for (const v of views) {
    kindCounts[v.kind] = (kindCounts[v.kind] || 0) + 1;
    if (v.repo) repoCounts[v.repo] = (repoCounts[v.repo] || 0) + 1;
    typeCounts[v.ext] = (typeCounts[v.ext] || 0) + 1;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(VIEWS_OWNER)} · Views Store</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>${SHARED_CSS}</style>
</head>
<body>
  <div class="app">
    <div class="topbar">
      <h1><a class="owner-link" href="${escapeHtml(GITHUB_OWNER_URL)}" target="_blank" rel="noopener" title="GitHub profile">${escapeHtml(VIEWS_OWNER)}</a></h1>
      <span class="sub"><a href="/">Views Store</a> · tag browser · soft hierarchy by name</span>
    </div>

    <div class="layout">
      <aside class="sidebar" aria-label="Filters">
        <h2>Browse</h2>
        <button type="button" class="tag-btn active" data-tag="">All views <span class="n" id="count-all"></span></button>

        <div class="section">
          <h2>Kind</h2>
          <div id="tags-kind"></div>
        </div>
        <div class="section">
          <h2>Repository</h2>
          <div id="tags-repo"></div>
        </div>
        <div class="section">
          <h2>Type</h2>
          <div id="tags-type"></div>
        </div>
      </aside>

      <div class="main">
        <div class="toolbar">
          <input type="search" id="q" placeholder="Search name or tag…" autocomplete="off" spellcheck="false" />
          <label class="muted" for="sort">Sort</label>
          <select id="sort" title="Sort by">
            <option value="attention">Attention (importance then urgency)</option>
            <option value="modified">Urgency (recent modified)</option>
            <option value="produced">Produced (content date)</option>
            <option value="name">Name (A→Z soft hierarchy)</option>
            <option value="kind">Kind (importance order)</option>
            <option value="ext">Type</option>
            <option value="size">Size</option>
          </select>
          <select id="dir" title="Direction">
            <option value="desc">Default direction for axis</option>
            <option value="asc">Reverse</option>
          </select>
          <button type="button" id="btn-clear">Clear filters</button>
          <button type="button" id="btn-refresh">Refresh</button>
        </div>

        <div class="active-tags" id="active-tags" aria-live="polite"></div>

        <div class="panel">
          <table class="files" id="files">
            <thead>
              <tr>
                <th class="col-name" data-sort="name">Name <span class="arrow"></span></th>
                <th class="col-tags" data-sort="kind">Tags <span class="arrow"></span></th>
                <th class="col-xrefs">Links</th>
                <th class="col-size" data-sort="size">Size <span class="arrow"></span></th>
                <th class="col-date" data-sort="modified">Modified <span class="arrow"></span></th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="tbody"></tbody>
          </table>
          <div class="empty" id="empty" hidden>No views match these tags.</div>
        </div>

        <div class="status-bar">
          <span id="status-left"></span>
          <span>Tags: OR within kind/repo/type · AND across · <a href="/docs">API &amp; docs</a></span>
        </div>
      </div>
    </div>
  </div>

  <script type="application/json" id="views-data">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>
  <script type="application/json" id="kind-counts">${JSON.stringify(kindCounts).replace(/</g, "\\u003c")}</script>
  <script type="application/json" id="repo-counts">${JSON.stringify(repoCounts).replace(/</g, "\\u003c")}</script>
  <script type="application/json" id="type-counts">${JSON.stringify(typeCounts).replace(/</g, "\\u003c")}</script>
  <script>
  (function () {
    const ALL = JSON.parse(document.getElementById("views-data").textContent);
    const KIND_COUNTS = JSON.parse(document.getElementById("kind-counts").textContent);
    const REPO_COUNTS = JSON.parse(document.getElementById("repo-counts").textContent);
    const TYPE_COUNTS = JSON.parse(document.getElementById("type-counts").textContent);

    const el = {
      q: document.getElementById("q"),
      sort: document.getElementById("sort"),
      dir: document.getElementById("dir"),
      tbody: document.getElementById("tbody"),
      empty: document.getElementById("empty"),
      table: document.getElementById("files"),
      activeTags: document.getElementById("active-tags"),
      statusLeft: document.getElementById("status-left"),
      tagsKind: document.getElementById("tags-kind"),
      tagsRepo: document.getElementById("tags-repo"),
      tagsType: document.getElementById("tags-type"),
      countAll: document.getElementById("count-all"),
    };

    // Default: anti-chronological (recent matters more)
    // Mirror server KIND_IMPORTANCE (keep in sync)
    const KIND_IMP = {
      issues: 10, continuations: 20, "corpus-state": 30, index: 40,
      concepts: 50, config: 60, cogentia: 60, package: 70, env: 80, other: 90,
    };
    const TYPE_ORD = ["md", "json", "txt", "yaml", "yml", "csv"];

    function alphaCmp(a, b) {
      return String(a || "").localeCompare(String(b || ""), undefined, {
        sensitivity: "base", numeric: true,
      });
    }
    function kindImp(k) { return KIND_IMP[k] ?? 90; }

    function stateFromUrl() {
      const p = new URLSearchParams(location.search);
      const tags = (p.get("tag") || p.get("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      // Default: attention = importance (kind) then urgency (recency)
      return {
        q: p.get("q") || "",
        sort: p.get("sort") || "attention",
        dir: p.get("dir") || "desc",
        tags,
      };
    }

    function writeUrl(state, replace) {
      const p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      // Defaults: sort=attention, dir=desc
      if (state.sort && state.sort !== "attention") p.set("sort", state.sort);
      if (state.dir && state.dir !== "desc") p.set("dir", state.dir);
      if (state.tags.length) p.set("tag", state.tags.join(","));
      const qs = p.toString();
      history[replace ? "replaceState" : "pushState"](state, "", qs ? "?" + qs : location.pathname);
    }

    let state = stateFromUrl();

    function cmp(a, b, key, dir) {
      // attention: importance first (asc weight), then urgency (modified desc)
      if (key === "attention") {
        const ki = kindImp(a.kind) - kindImp(b.kind);
        if (ki !== 0) return dir === "asc" ? -ki : ki;
        const ta = new Date(a.modified).getTime() || 0;
        const tb = new Date(b.modified).getTime() || 0;
        if (ta !== tb) return dir === "asc" ? ta - tb : tb - ta;
        return alphaCmp(a.name, b.name);
      }
      let av, bv;
      if (key === "size") { av = a.size; bv = b.size; }
      else if (key === "modified") { av = a.modified; bv = b.modified; }
      else if (key === "produced") { av = a.produced || a.modified; bv = b.produced || b.modified; }
      else if (key === "kind") {
        const ki = kindImp(a.kind) - kindImp(b.kind);
        if (ki !== 0) return dir === "asc" ? -ki : ki;
        return alphaCmp(a.name, b.name);
      }
      else if (key === "ext") {
        const ia = TYPE_ORD.indexOf(a.ext);
        const ib = TYPE_ORD.indexOf(b.ext);
        av = ia === -1 ? 1000 : ia;
        bv = ib === -1 ? 1000 : ib;
        if (av !== bv) return dir === "asc" ? av - bv : bv - av;
        return alphaCmp(a.name, b.name);
      }
      else { av = a.name; bv = b.name; }
      if (typeof av === "string" && typeof bv === "string") {
        const c = alphaCmp(av, bv);
        return dir === "asc" ? c : -c;
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return alphaCmp(a.name, b.name);
    }

    /** OR within kind/repo/type, AND across dimensions (matches server applyListQuery). */
    function matchTags(viewTagIds, selected) {
      if (!selected.length) return true;
      const groups = Object.create(null);
      for (const t of selected) {
        const dim = t.indexOf(":") >= 0 ? t.slice(0, t.indexOf(":")) : "other";
        if (!groups[dim]) groups[dim] = [];
        groups[dim].push(t);
      }
      const set = new Set(viewTagIds);
      for (const tags of Object.values(groups)) {
        if (!tags.some((t) => set.has(t))) return false;
      }
      return true;
    }

    function filtered() {
      let rows = ALL.slice();
      if (state.tags.length) {
        rows = rows.filter((r) => matchTags(r.tag_ids, state.tags));
      }
      if (state.q) {
        const q = state.q.toLowerCase();
        rows = rows.filter((r) => {
          if (r.name.toLowerCase().includes(q)) return true;
          if ((r.title || "").toLowerCase().includes(q)) return true;
          if ((r.repo || "").toLowerCase().includes(q)) return true;
          if ((r.kind || "").toLowerCase().includes(q)) return true;
          return r.tags.some((t) => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
        });
      }
      rows.sort((a, b) => cmp(a, b, state.sort || "modified", state.dir || "desc"));
      return rows;
    }

    function toggleTag(tagId) {
      if (!tagId) {
        state.tags = [];
        apply(false);
        return;
      }
      // Multi-select per dimension; filter uses OR within dimension (not exclusive).
      const i = state.tags.indexOf(tagId);
      if (i >= 0) state.tags.splice(i, 1);
      else state.tags.push(tagId);
      apply(false);
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function renderSidebar() {
      el.countAll.textContent = ALL.length;
      document.querySelectorAll(".sidebar .tag-btn").forEach((b) => {
        const t = b.getAttribute("data-tag");
        if (t === "") b.classList.toggle("active", state.tags.length === 0);
      });

      function list(container, counts, prefix, type) {
        let keys = Object.keys(counts);
        if (type === "kind") {
          keys = keys.sort((a, b) => kindImp(a) - kindImp(b) || alphaCmp(a, b));
        } else if (type === "repo") {
          keys = keys.sort(alphaCmp);
        } else if (type === "type") {
          keys = keys.sort((a, b) => {
            const ia = TYPE_ORD.indexOf(a);
            const ib = TYPE_ORD.indexOf(b);
            return (ia === -1 ? 1000 : ia) - (ib === -1 ? 1000 : ib) || alphaCmp(a, b);
          });
        } else {
          keys = keys.sort(alphaCmp);
        }
        container.innerHTML = keys
          .map((k) => {
            const id = prefix + k;
            const active = state.tags.includes(id) ? " active" : "";
            const label = type === "type" ? "." + k : k;
            return (
              '<button type="button" class="tag-btn' + active + '" data-tag="' +
              escapeHtml(id) + '"><span>' + escapeHtml(label) +
              '</span><span class="n">' + counts[k] + "</span></button>"
            );
          })
          .join("");
      }
      list(el.tagsKind, KIND_COUNTS, "kind:", "kind");
      list(el.tagsRepo, REPO_COUNTS, "repo:", "repo");
      list(el.tagsType, TYPE_COUNTS, "type:", "type");
    }

    function renderActiveTags() {
      if (!state.tags.length) {
        el.activeTags.innerHTML = "";
        return;
      }
      // Stable order: kind → repo → type, then alpha within type
      const order = { kind: 0, repo: 1, type: 2 };
      const sorted = state.tags.slice().sort((a, b) => {
        const [ta, ...ra] = a.split(":");
        const [tb, ...rb] = b.split(":");
        const oa = order[ta] ?? 9;
        const ob = order[tb] ?? 9;
        if (oa !== ob) return oa - ob;
        return alphaCmp(ra.join(":"), rb.join(":"));
      });
      el.activeTags.innerHTML = sorted
        .map((id) => {
          const [type, ...rest] = id.split(":");
          const label = type === "type" ? "." + rest.join(":") : rest.join(":") || id;
          return (
            '<span class="pill ' + escapeHtml(type) + '">' +
            escapeHtml(type) + ": " + escapeHtml(label) +
            '<button type="button" class="x" data-remove="' + escapeHtml(id) +
            '" aria-label="Remove tag">×</button></span>'
          );
        })
        .join("");
    }

    function fmtDate(iso) {
      const d = new Date(iso);
      if (isNaN(d)) return iso || "";
      return d.toLocaleString(undefined, {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    }

    function renderTable() {
      const rows = filtered();
      el.tbody.innerHTML = rows
        .map((r) => {
          const dateCol = state.sort === "produced" ? r.produced : r.modified;
          const tagsHtml = r.tags
            .map(
              (t) =>
                '<span class="tag-inline ' +
                escapeHtml(t.type) +
                '" data-tag="' +
                escapeHtml(t.id) +
                '" title="Filter by ' +
                escapeHtml(t.id) +
                '">' +
                escapeHtml(t.label) +
                "</span>"
            )
            .join("");
          const xr = r.cross_refs || {};
          const xrefBits = [];
          if (xr.github && xr.github.url) {
            xrefBits.push(
              '<a href="' + escapeHtml(xr.github.url) + '" target="_blank" rel="noopener" title="GitHub source">Source</a>'
            );
          }
          xrefBits.push(
            '<a href="' + escapeHtml(r.url) + '" title="This view">View</a>'
          );
          if (xr.site && xr.site.url) {
            xrefBits.push(
              '<a href="' + escapeHtml(xr.site.url) + '" target="_blank" rel="noopener" title="' +
              escapeHtml(xr.site.label || "Site") + '">Site</a>'
            );
          }
          return (
            "<tr>" +
            '<td class="col-name name"><a href="' +
            escapeHtml(r.url) +
            '" title="' +
            escapeHtml(r.title || r.name) +
            '">' +
            escapeHtml(r.name) +
            "</a></td>" +
            '<td class="col-tags">' +
            tagsHtml +
            "</td>" +
            '<td class="col-xrefs xref">' +
            xrefBits.join("") +
            "</td>" +
            '<td class="col-size muted">' +
            escapeHtml(r.size_label) +
            "</td>" +
            '<td class="col-date muted" title="modified ' +
            escapeHtml(r.modified) +
            " · produced " +
            escapeHtml(r.produced) +
            '">' +
            escapeHtml(fmtDate(dateCol)) +
            "</td>" +
            '<td class="col-actions actions-inline">' +
            '<a href="' + escapeHtml(r.url) + '">Open</a>' +
            '<a href="' + escapeHtml(r.url) + '?raw">Raw</a>' +
            '<a href="' + escapeHtml(r.url) + '?download">Dl</a>' +
            "</td></tr>"
          );
        })
        .join("");

      el.empty.hidden = rows.length > 0;
      el.table.style.display = rows.length ? "" : "none";
      el.statusLeft.textContent =
        rows.length + " of " + ALL.length +
        (state.tags.length ? " · tags: " + state.tags.join(", ") : "") +
        (state.q ? " · search" : "");

      el.table.querySelectorAll("th[data-sort]").forEach((th) => {
        const key = th.getAttribute("data-sort");
        // Map header "modified" highlight when sorting produced too for date col
        const sorted =
          key === state.sort ||
          (key === "modified" && state.sort === "produced");
        th.classList.toggle("sorted", !!sorted && key === state.sort);
        const arrow = th.querySelector(".arrow");
        if (arrow) {
          arrow.textContent =
            key === state.sort ? (state.dir === "desc" ? "▼" : "▲") : "";
        }
      });
    }

    function apply(replace) {
      writeUrl(state, replace);
      el.q.value = state.q;
      el.sort.value = state.sort;
      el.dir.value = state.dir;
      renderSidebar();
      renderActiveTags();
      renderTable();
    }

    el.q.addEventListener("input", () => {
      state.q = el.q.value.trim();
      apply(true);
    });
    el.sort.addEventListener("change", () => {
      state.sort = el.sort.value;
      // Direction: name defaults A→Z; attention/kind/dates default "forward" via desc flag
      // (attention uses dir to flip urgency/importance polarity carefully in cmp)
      if (state.sort === "name") state.dir = "asc";
      else state.dir = "desc";
      el.dir.value = state.dir;
      apply(false);
    });
    document.getElementById("btn-clear").addEventListener("click", () => {
      state = { q: "", sort: "attention", dir: "desc", tags: [] };
      apply(false);
    });
    el.dir.addEventListener("change", () => {
      state.dir = el.dir.value;
      apply(false);
    });
    document.querySelector(".sidebar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tag]");
      if (!btn) return;
      const tag = btn.getAttribute("data-tag");
      toggleTag(tag);
    });
    el.activeTags.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      toggleTag(btn.getAttribute("data-remove"));
    });
    el.tbody.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tag]");
      if (!t) return;
      e.preventDefault();
      toggleTag(t.getAttribute("data-tag"));
    });
    el.table.querySelector("thead").addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (!th) return;
      const key = th.getAttribute("data-sort");
      if (!key) return;
      if (state.sort === key) {
        state.dir = state.dir === "asc" ? "desc" : "asc";
      } else {
        state.sort = key;
        state.dir = key === "name" ? "asc" : "desc";
      }
      apply(false);
    });
    document.getElementById("btn-refresh").addEventListener("click", () => location.reload());
    window.addEventListener("popstate", () => {
      state = stateFromUrl();
      apply(true);
    });

    apply(true);
  })();
  </script>
</body>
</html>`;
}

function generateViewHtml(viewName, content, ext, crossRefs) {
  const parsed = parseViewName(viewName);
  const xr = crossRefs || deriveCrossRefs(viewName, parsed);
  const structured = formatStructuredView(content, ext);
  let body;
  if (ext === ".md") {
    const linkCtx = {
      viewNames: listViewBasenames(),
      repo: xr.repo || parsed.repo || null,
      kind: parsed.kind || null,
      githubPath: (xr.github && xr.github.path) || null,
      owner: GITHUB_OWNER,
    };
    // If derive left path null but kind implies research/* sources
    if (!linkCtx.githubPath && linkCtx.repo) {
      if (parsed.kind === "index") linkCtx.githubPath = "research/index.md";
      else if (parsed.kind === "concepts") linkCtx.githubPath = "research/concepts.md";
      else if (parsed.kind === "package") linkCtx.githubPath = "package.json";
      else if (parsed.kind === "config" || parsed.kind === "cogentia") {
        linkCtx.githubPath = ".cogentia.json";
      }
    }
    body = `<article class="doc">${renderMarkdown(content, linkCtx)}</article>`;
  } else if (structured) {
    body = `<div class="struct-toolbar" role="tablist" aria-label="Display mode">
      <button type="button" class="mode-btn active" data-mode="pretty" role="tab" aria-selected="true">Pretty</button>
      <button type="button" class="mode-btn" data-mode="raw" role="tab" aria-selected="false">Raw</button>
      <span class="muted struct-hint">${escapeHtml(structured.label)} · pretty by default (URLs &amp; repo paths clickable) · <a href="/views/${encodeURIComponent(viewName)}?raw">download raw bytes</a></span>
    </div>
    <pre class="raw-block" id="view-pretty" data-panel="pretty"><code>${linkifyWellFormedUrls(structured.pretty, {
      owner: GITHUB_OWNER,
      repo: parsed.repo || (xr && xr.repo) || null,
      kind: parsed.kind || null,
    })}</code></pre>
    <pre class="raw-block" id="view-raw" data-panel="raw" hidden><code>${escapeHtml(structured.raw)}</code></pre>`;
  } else {
    body = `<pre class="raw-block"><code>${escapeHtml(content)}</code></pre>`;
  }

  const tagLinks = parsed.tags
    .map(
      (t) =>
        `<a class="pill ${escapeHtml(t.type)}" href="/?tag=${encodeURIComponent(t.id)}">${escapeHtml(t.label)}</a>`
    )
    .join(" ");

  // Only real destinations (no self "View" link on the page you're already on)
  const xrefLinks = [];
  if (xr.github?.url) {
    xrefLinks.push(
      `<a href="${escapeHtml(xr.github.url)}" target="_blank" rel="noopener">Source (GitHub)</a>`
    );
  }
  if (xr.site?.url) {
    xrefLinks.push(
      `<a href="${escapeHtml(xr.site.url)}" target="_blank" rel="noopener">${escapeHtml(xr.site.label || "Site")}</a>`
    );
  }
  const rel = xr.relation ? `<span class="muted"> · ${escapeHtml(xr.relation)}</span>` : "";
  const xrefBlock =
    xrefLinks.length > 0
      ? `<div class="doc-xrefs"><strong>Cross-refs</strong>${rel}: ${xrefLinks.join(" · ")}</div>`
      : `<div class="doc-xrefs muted"><strong>Cross-refs</strong>${rel}: <em>none resolved</em></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(viewName)} · ${escapeHtml(VIEWS_OWNER)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    ${SHARED_CSS}
    .doc { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 24px 28px; }
    .doc h1, .doc h2, .doc h3 { margin-top: 1.4em; }
    .doc h1 { border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    .doc h2 { border-bottom: 1px solid #eee; padding-bottom: 0.25em; }
    .doc pre { background: #f6f8fa; padding: 14px; border-radius: 6px; overflow-x: auto; }
    .doc code { background: #f6f8fa; padding: 0.15em 0.4em; border-radius: 3px; font-size: 85%; }
    .doc pre code { background: transparent; padding: 0; }
    .doc blockquote { border-left: 4px solid var(--border); margin: 0; padding-left: 1em; color: var(--muted); }
    .doc table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .doc th, .doc td { border: 1px solid var(--border); padding: 6px 10px; }
    .doc th { background: var(--header-bg); }
    .doc tr:nth-child(even) { background: #fafbfc; }
    .doc .unlinked {
      color: var(--text); text-decoration: none; border-bottom: 1px dotted var(--muted);
      cursor: help;
    }
    .raw-block {
      background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
      padding: 16px; overflow-x: auto; font-size: 13px; line-height: 1.45;
    }
    .struct-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .mode-btn {
      padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px;
      background: var(--panel); cursor: pointer; font-size: 13px;
    }
    .mode-btn.active { background: var(--accent); border-color: #54aeff; font-weight: 600; }
    .struct-hint { font-size: 12px; }
    .raw-block a.url-link { color: var(--link); word-break: break-all; }
    .raw-block a.url-link:hover { text-decoration: underline; }
    .doc-header { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; }
    .doc-header h1 { margin: 0; font-size: 1.2rem; flex: 1 1 auto; word-break: break-all; }
    .doc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .doc-actions a {
      padding: 6px 12px; background: var(--panel); border: 1px solid var(--border);
      border-radius: 6px; color: var(--text); font-size: 13px;
    }
    .doc-actions a:hover { background: var(--hover); text-decoration: none; }
    .doc-tags { margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .doc-tags a.pill { text-decoration: none; color: var(--text); }
    .doc-xrefs {
      margin-bottom: 16px; padding: 10px 12px; background: var(--panel);
      border: 1px solid var(--border); border-radius: 8px; font-size: 13px;
    }
    .doc-xrefs a { margin-right: 12px; }
    .doc table th { cursor: pointer; user-select: none; }
    .doc table th:hover { color: var(--link); }
    .doc table th.sorted { color: var(--link); }
  </style>
</head>
<body>
  <div class="app">
    <div class="doc-header">
      <h1>${escapeHtml(viewName)}</h1>
      <div class="doc-actions">
        <a class="owner-link" href="${escapeHtml(GITHUB_OWNER_URL)}" target="_blank" rel="noopener" title="GitHub profile">${escapeHtml(VIEWS_OWNER)}</a>
        <a href="/">← All views</a>
        <a href="/views/${encodeURIComponent(viewName)}?raw">Raw file</a>
        <a href="/views/${encodeURIComponent(viewName)}?download">Download</a>
      </div>
    </div>
    <div class="doc-tags">${tagLinks}</div>
    ${xrefBlock}
    ${body}
  </div>
  <script>
  (function () {
    // Pretty / Raw toggle for JSON & YAML
    const toolbar = document.querySelector(".struct-toolbar");
    if (toolbar) {
      const pretty = document.getElementById("view-pretty");
      const raw = document.getElementById("view-raw");
      toolbar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-mode]");
        if (!btn) return;
        const mode = btn.getAttribute("data-mode");
        toolbar.querySelectorAll(".mode-btn").forEach((b) => {
          const on = b.getAttribute("data-mode") === mode;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        if (pretty) pretty.hidden = mode !== "pretty";
        if (raw) raw.hidden = mode !== "raw";
      });
    }

    // Sort every content table: click headers; default first column A→Z
    // (alphabetical default; date-like columns sort chronologically).
    function parseCell(text) {
      const t = text.replace(/\\s+/g, " ").trim();
      const d = Date.parse(t);
      if (!Number.isNaN(d) && /\\d{4}|ago|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(t)) {
        return { type: "date", v: d, s: t };
      }
      const n = t.replace(/,/g, "");
      if (/^-?\\d+(\\.\\d+)?$/.test(n)) return { type: "num", v: Number(n), s: t };
      return { type: "str", v: t.toLowerCase(), s: t };
    }
    function cmpVal(a, b, dir) {
      if (a.type === b.type && a.type !== "str") {
        if (a.v < b.v) return dir === "asc" ? -1 : 1;
        if (a.v > b.v) return dir === "asc" ? 1 : -1;
        return 0;
      }
      const c = String(a.s).localeCompare(String(b.s), undefined, { numeric: true, sensitivity: "base" });
      return dir === "asc" ? c : -c;
    }
    function sortTable(table, col, dir) {
      const tbody = table.tBodies[0];
      if (!tbody) return;
      const rows = Array.from(tbody.rows);
      rows.sort((ra, rb) => {
        const ca = parseCell(ra.cells[col] ? ra.cells[col].textContent : "");
        const cb = parseCell(rb.cells[col] ? rb.cells[col].textContent : "");
        return cmpVal(ca, cb, dir);
      });
      rows.forEach((r) => tbody.appendChild(r));
      Array.from(table.tHead ? table.tHead.rows[0].cells : []).forEach((th, i) => {
        th.classList.toggle("sorted", i === col);
        th.dataset.dir = i === col ? dir : "";
      });
    }
    document.querySelectorAll("article.doc table").forEach((table) => {
      const head = table.tHead && table.tHead.rows[0];
      if (!head || !table.tBodies[0] || table.tBodies[0].rows.length < 2) return;
      Array.from(head.cells).forEach((th, i) => {
        th.title = "Click to sort";
        th.addEventListener("click", () => {
          const next = th.dataset.dir === "asc" ? "desc" : "asc";
          sortTable(table, i, next);
        });
      });
      // Initial order: first column ascending (alpha / natural)
      sortTable(table, 0, "asc");
    });
  })();
  </script>
</body>
</html>`;
}

/** Live API contract — keep in sync with cogentia/docs/views-store.md */
const API_CONTRACT = {
  name: "Views Store",
  version: "1.7.5",
  public_base: "https://cogentia.fractavolta.com",
  ux: {
    model: "gmail-style tags (not directory tree)",
    tags: ["kind:*", "repo:*", "type:*"],
    tag_filter: "OR within dimension (kind|repo|type), AND across dimensions",
    soft_hierarchy: "repo-kind.ext filenames; sort=name clusters by prefix",
    default_sort: {
      sort: "attention",
      dir: "desc",
      note: "importance (kind: issues/continuations/state first) then urgency (recent modified). Distinct: importance ≠ urgency.",
    },
    list_ordering: {
      sidebar_kind: "importance order then alpha",
      sidebar_repo: "alphabetical",
      sidebar_type: "md, json, txt, … then alpha",
      main_table: "user sort; default attention",
      document_tables: "click headers; initial A→Z on first column when no dates dominate",
    },
    kind_tags: [
      "issues",
      "continuations",
      "corpus-state",
      "index",
      "concepts",
      "env",
      "package",
      "config",
      "other",
    ],
  },
  notable_views: {
    "corpus-state.md": {
      tag: "kind:corpus-state",
      description:
        "Operational summary of local SQLite index cache + embeddings coverage + optional Supabase inventory. Metadata/counts only — no vectors or chunk bodies.",
      machine_readable: "/views/corpus-state.json",
      generator: "node scripts/cogentia.js corpus-state export",
      publish: "node scripts/cogentia.js publish push corpus-state",
    },
    "continuations-list.md": {
      tag: "kind:continuations",
      description: "Alive continuations (default liveness=alive), analogous to open issues.",
    },
    "current-issues-list.md": {
      tag: "kind:issues",
      description: "Open GitHub issues aggregate.",
    },
  },
  endpoints: [
    {
      method: "GET",
      path: "/api/health",
      description: "Liveness",
      response: { ok: "boolean", views_dir: "string" },
    },
    {
      method: "GET",
      path: "/api/docs",
      description: "This contract as JSON",
    },
    {
      method: "GET",
      path: "/api/views",
      description: "List public views (same filters as HTML UI)",
      query: {
        tag: "comma-separated tag ids; OR within kind/repo/type, AND across (alias: tags)",
        q: "search name/title/repo/kind/tags",
        sort: "attention|modified|produced|name|kind|ext|type|size (default: attention = importance then urgency)",
        dir: "asc|desc (default: desc)",
      },
      response: {
        views: "ViewObject[]",
        count: "number (filtered)",
        total: "number (full public inventory)",
        tags: "{ kind: counts, repo: counts, type: counts }",
        query: "echo of effective q/tag/sort/dir",
      },
    },
    {
      method: "GET",
      path: "/views/{filename}",
      description: "One view: HTML by default; ?raw; ?download",
    },
    {
      method: "GET",
      path: "/",
      description: "HTML tag browser (query: q, sort, dir, tag)",
    },
    {
      method: "GET",
      path: "/docs",
      description: "Human-readable documentation HTML",
    },
  ],
  view_object: {
    name: "basename",
    title: "frontmatter title or name",
    size: "bytes",
    modified: "ISO mtime",
    produced: "ISO content/generation date (frontmatter or mtime)",
    ext: "md|json|txt|…",
    repo: "string|null",
    kind: "string",
    tags: "[{type,id,label}]",
    tag_ids: "string[]",
    url: "/views/…",
    cross_refs: {
      view_id: "string",
      view_url: "https://cogentia.fractavolta.com/views/…",
      relation: "derived_mirror|operational_export|config_sample",
      kind: "string",
      repo: "string|null",
      github: "{ full_name, path, url }|null",
      site: "{ url, label }|null",
    },
    visible: "boolean",
    visibility_reason: "string",
  },
  examples: [
    "/api/views",
    "/api/views?tag=kind:continuations",
    "/api/views?tag=kind:corpus-state",
    "/api/views?tag=kind:index,repo:cogentia&sort=produced",
    "/api/views?tag=type:md,type:json",
    "/api/views?tag=repo:cogentia,repo:serra",
    "/api/views?sort=name&dir=asc",
    "/api/views?q=env",
    "/views/corpus-state.md",
    "/views/corpus-state.json?raw",
  ],
  documentation: {
    repo: "cogentia/docs/views-store.md",
    live_html: "/docs",
    live_json: "/api/docs",
  },
};

function generateDocsHtml() {
  const c = API_CONTRACT;
  const endpoints = c.endpoints
    .map(
      (e) =>
        `<tr><td><code>${escapeHtml(e.method)} ${escapeHtml(e.path)}</code></td><td>${escapeHtml(e.description)}</td></tr>`
    )
    .join("");
  const examples = c.examples
    .map((ex) => `<li><a href="${escapeHtml(ex)}"><code>${escapeHtml(ex)}</code></a></li>`)
    .join("");
  const queryRows = Object.entries(c.endpoints.find((e) => e.path === "/api/views").query)
    .map(([k, v]) => `<tr><td><code>${escapeHtml(k)}</code></td><td>${escapeHtml(v)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(VIEWS_OWNER)} · Views Store docs</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>${SHARED_CSS}
    .doc { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 24px 28px; }
    .doc h1 { margin-top: 0; }
    .doc h2 { margin-top: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
    .doc table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
    .doc th, .doc td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; vertical-align: top; }
    .doc th { background: var(--header-bg); }
    .doc code { background: #f6f8fa; padding: 0.1em 0.35em; border-radius: 3px; font-size: 85%; }
    .doc pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="app">
    <div class="topbar">
      <h1><a class="owner-link" href="${escapeHtml(GITHUB_OWNER_URL)}" target="_blank" rel="noopener" title="GitHub profile">${escapeHtml(VIEWS_OWNER)}</a></h1>
      <span class="sub"><a href="/">Views Store</a> · docs v${escapeHtml(c.version)} · <a href="/api/docs">JSON contract</a></span>
    </div>
    <article class="doc">
      <p>Public surface for generated Cogentia views. <strong>Tag browser</strong> (Gmail-style), not a folder tree.
      Default list order is <strong>recent first</strong> (<code>sort=modified&amp;dir=desc</code>).</p>

      <h2>UX</h2>
      <ul>
        <li>Tags: <strong>OR within</strong> kind / repo / type; <strong>AND across</strong> dimensions (empty = any)</li>
        <li>Example: <code>type:md,type:json</code> → markdown or JSON; add <code>repo:cogentia</code> → those types in cogentia only</li>
        <li>Soft hierarchy: <code>repo-kind.ext</code> names; sort by <code>name</code> clusters by prefix</li>
        <li><code>modified</code> = file mtime on the store; <code>produced</code> = frontmatter generation date when present</li>
        <li>Markdown links resolve to another published view or to GitHub; unresolved refs are plain text (no dead links)</li>
        <li>JSON/YAML <strong>Pretty</strong> and Markdown HTML: auto-link well-formed URLs, <code>owner/repo[/path]</code>, <code>repo/path</code>, <code>../repo</code>, and repo-local paths like <code>research/…</code> / <code>docs/…</code> (→ GitHub in that repo). Markdown also linkifies bare <code>file.md</code> beside the source file. Bare repo names only in JSON/YAML (too noisy in prose). <strong>Raw</strong> stays plain; <code>?raw</code> returns original bytes</li>
      </ul>

      <h2>Endpoints</h2>
      <table>
        <thead><tr><th>Endpoint</th><th>Description</th></tr></thead>
        <tbody>${endpoints}</tbody>
      </table>

      <h2><code>GET /api/views</code> query</h2>
      <table>
        <thead><tr><th>Param</th><th>Meaning</th></tr></thead>
        <tbody>${queryRows}</tbody>
      </table>

      <h2>Examples</h2>
      <ul>${examples}</ul>

      <h2>Notable views</h2>
      <pre>${escapeHtml(JSON.stringify(c.notable_views || {}, null, 2))}</pre>

      <h2>View object (fields)</h2>
      <pre>${escapeHtml(JSON.stringify(c.view_object, null, 2))}</pre>

      <h2>Canonical docs in the corpus</h2>
      <p><code>${escapeHtml(c.documentation.repo)}</code> — keep the live contract and that file aligned when changing the API.</p>
      <p>Base URL: <a href="${escapeHtml(c.public_base)}">${escapeHtml(c.public_base)}</a></p>
    </article>
  </div>
</body>
</html>`;
}

function applyListQuery(views, url) {
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const tags = (url.searchParams.get("tag") || url.searchParams.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const sort = url.searchParams.get("sort") || "attention";
  const dir = url.searchParams.get("dir") || "desc";

  let out = views.slice();
  if (tags.length) {
    out = out.filter((v) => matchTagFilter(v.tag_ids, tags));
  }
  if (q) {
    out = out.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.repo || "").toLowerCase().includes(q) ||
        (v.kind || "").toLowerCase().includes(q) ||
        v.tag_ids.some((id) => id.toLowerCase().includes(q))
    );
  }

  out.sort((a, b) => {
    if (sort === "attention") {
      const ki = kindImportance(a.kind) - kindImportance(b.kind);
      if (ki !== 0) return dir === "asc" ? -ki : ki;
      const ta = new Date(a.modified).getTime() || 0;
      const tb = new Date(b.modified).getTime() || 0;
      if (ta !== tb) return dir === "asc" ? ta - tb : tb - ta;
      return alphaCmp(a.name, b.name);
    }
    if (sort === "kind") {
      const ki = kindImportance(a.kind) - kindImportance(b.kind);
      if (ki !== 0) return dir === "asc" ? -ki : ki;
      return alphaCmp(a.name, b.name);
    }
    if (sort === "ext" || sort === "type") {
      const ia = TYPE_ORDER.indexOf(a.ext);
      const ib = TYPE_ORDER.indexOf(b.ext);
      const ra = ia === -1 ? 1000 : ia;
      const rb = ib === -1 ? 1000 : ib;
      if (ra !== rb) return dir === "asc" ? ra - rb : rb - ra;
      return alphaCmp(a.name, b.name);
    }
    let av, bv;
    if (sort === "size") {
      av = a.size;
      bv = b.size;
    } else if (sort === "produced") {
      av = a.produced || a.modified;
      bv = b.produced || b.modified;
    } else if (sort === "name") {
      const c = alphaCmp(a.name, b.name);
      return dir === "asc" ? c : -c;
    } else {
      av = a.modified;
      bv = b.modified;
    }
    if (typeof av === "string" && typeof bv === "string") {
      const c = alphaCmp(av, bv);
      return dir === "asc" ? c : -c;
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return alphaCmp(a.name, b.name);
  });

  return { views: out, q, tags, sort, dir, total: views.length };
}

function sendNotFoundHtml(res, pathname) {
  sendHtml(
    res,
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Not found · ${escapeHtml(VIEWS_OWNER)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>${SHARED_CSS}</style></head>
<body><div class="app"><div class="topbar"><h1><a class="owner-link" href="${escapeHtml(GITHUB_OWNER_URL)}" target="_blank" rel="noopener" title="GitHub profile">${escapeHtml(VIEWS_OWNER)}</a></h1>
<span class="sub"><a href="/">Views Store</a></span></div>
<p class="empty">No view at <code>${escapeHtml(pathname)}</code>.</p>
<p style="text-align:center"><a href="/">← Browse all views</a> · <a href="/docs">Docs</a></p>
</div></body></html>`,
    404
  );
}

function serveViewByFileName(res, url, fileName) {
  const filePath = safeJoinViews(fileName);
  if (!filePath || !fs.existsSync(filePath)) {
    return sendNotFoundHtml(res, url.pathname);
  }

  const base = path.basename(filePath);
  const ext = path.extname(base).toLowerCase();
  const content = fs.readFileSync(filePath, "utf8");

  if ([".md", ".txt", ".yaml", ".yml"].includes(ext)) {
    const visibility = checkVisibility(content);
    if (!visibility.visible) {
      console.log(`[BLOCKED] ${base}: ${visibility.reason}`);
      return sendJson(res, { error: "Not available", reason: visibility.reason }, 403);
    }
  }

  if (url.searchParams.has("raw")) {
    return sendText(res, content, MIME_TYPES[ext] || "text/plain; charset=utf-8");
  }
  if (url.searchParams.has("download")) {
    return sendDownload(res, filePath);
  }

  let cross_refs = null;
  if ([".md", ".txt", ".yaml", ".yml"].includes(ext)) {
    try {
      cross_refs = parseFrontmatterMeta(content.slice(0, 16000)).cross_refs;
    } catch {
      /* ignore */
    }
  }
  if (!cross_refs) cross_refs = deriveCrossRefs(base, parseViewName(base));
  return sendHtml(res, generateViewHtml(base, content, ext, cross_refs));
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return sendJson(res, {
        ok: true,
        views_dir: VIEWS_DIR,
        version: API_CONTRACT.version,
        owner: VIEWS_OWNER,
      });
    }

    if (url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico") {
      if (FAVICON_FILE && fs.existsSync(FAVICON_FILE)) {
        const body = fs.readFileSync(FAVICON_FILE);
        res.writeHead(200, {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        });
        return res.end(body);
      }
      return sendJson(res, { error: "No favicon" }, 404);
    }

    if (url.pathname === "/api/docs") {
      return sendJson(res, API_CONTRACT);
    }

    if (url.pathname === "/docs" || url.pathname === "/api/docs.html") {
      return sendHtml(res, generateDocsHtml());
    }

    // /index.html → explorer (Caddy and browsers often hit this)
    if (url.pathname === "/index.html" || url.pathname === "/index.htm") {
      res.writeHead(302, { Location: "/" + (url.search || "") });
      return res.end();
    }

    if (url.pathname === "/" || url.pathname === "/views") {
      return sendHtml(res, generateExplorerHtml(listViews()));
    }

    if (url.pathname === "/api/views") {
      const all = listViews();
      const result = applyListQuery(all, url);
      const tags = { kind: {}, repo: {}, type: {} };
      for (const v of all) {
        tags.kind[v.kind] = (tags.kind[v.kind] || 0) + 1;
        if (v.repo) tags.repo[v.repo] = (tags.repo[v.repo] || 0) + 1;
        tags.type[v.ext] = (tags.type[v.ext] || 0) + 1;
      }
      return sendJson(res, {
        views: result.views,
        count: result.views.length,
        total: result.total,
        tags,
        query: {
          q: result.q,
          tag: result.tags,
          sort: result.sort,
          dir: result.dir,
        },
      });
    }

    if (url.pathname.startsWith("/views/")) {
      const rawName = decodeURIComponent(url.pathname.slice("/views/".length));
      return serveViewByFileName(res, url, rawName);
    }

    // Bare /filename.ext → same as /views/filename.ext (bookmarks & short links)
    const bare = url.pathname.replace(/^\//, "");
    if (
      bare &&
      !bare.includes("/") &&
      VIEW_EXTENSIONS.has(path.extname(bare).toLowerCase())
    ) {
      return serveViewByFileName(res, url, decodeURIComponent(bare));
    }

    return sendNotFoundHtml(res, url.pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, { error: "Internal error", message: String(err.message || err) }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`Views Store tag browser on http://0.0.0.0:${PORT}`);
  console.log(`Serving views from: ${VIEWS_DIR}`);
  console.log(`Owner display: ${VIEWS_OWNER}`);
});
