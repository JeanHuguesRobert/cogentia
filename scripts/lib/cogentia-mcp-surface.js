/**
 * MCP 2026-07-28 extra primitives: resources, prompts, completions,
 * and experimental Skills Over MCP (SEP-2640).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  listAgentSkills,
  getAgentSkill,
  skillsDir,
  resolveRepoRoot,
} from "./cogentia-agent-skills.js";
import {
  listPatterns,
  getPattern,
  listPatternFiles,
  listFilesRecursive,
  patternsDir,
} from "./cogentia-patterns.js";

export const LIST_TTL_MS = 3_600_000;
export const SKILL_URI_PREFIX = "skill://cogentia/";
export const PATTERN_URI_PREFIX = "cogentia://pattern/";
export const ANTIPATTERN_URI_PREFIX = "cogentia://antipattern/";
export const PROMPT_URI_PREFIX = "cogentia://prompt/";
export const CLI_CATALOG_URI = "cogentia://cli/catalog";
export const CAPABILITY_CATALOG_URI = "cogentia://capability/catalog";
export const SCHEMA_JOHN_URI = "cogentia://schema/john.request.v1";

function sha256File(absPath) {
  const buf = fs.readFileSync(absPath);
  return `sha256:${createHash("sha256").update(buf).digest("hex")}`;
}

export function promptsDir(repoRoot = resolveRepoRoot()) {
  return path.join(repoRoot, "prompts");
}

export function listPromptFiles(repoRoot = resolveRepoRoot()) {
  const dir = promptsDir(repoRoot);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort();
}

function promptNameFromFile(filename) {
  return filename.replace(/\.md$/i, "");
}

export function listMcpPrompts(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  return listPromptFiles(repoRoot).map((filename) => {
    const name = promptNameFromFile(filename);
    const abs = path.join(promptsDir(repoRoot), filename);
    const text = fs.readFileSync(abs, "utf8");
    const first = text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---")) || "";
    return {
      name,
      title: name.replace(/_/g, " "),
      description: first.trim().slice(0, 240) || `Cogentia prompt contract ${name}`,
    };
  });
}

export function getMcpPrompt(name, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const clean = String(name || "").trim();
  if (!clean || clean.includes("..") || clean.includes("/") || clean.includes("\\")) {
    return { ok: false, error: "invalid_name" };
  }
  const abs = path.join(promptsDir(repoRoot), `${clean}.md`);
  if (!fs.existsSync(abs)) return { ok: false, error: "prompt_not_found" };
  const text = fs.readFileSync(abs, "utf8");
  return {
    ok: true,
    description: `Cogentia prompt ${clean}`,
    messages: [
      {
        role: "user",
        content: { type: "text", text },
      },
    ],
  };
}

function skillFileUri(slug, relPath) {
  return `${SKILL_URI_PREFIX}${slug}/${relPath}`;
}

function patternFileUri(meta, relPath) {
  const prefix = meta.kind === "antipattern" ? ANTIPATTERN_URI_PREFIX : PATTERN_URI_PREFIX;
  return `${prefix}${meta.slug}/${relPath}`;
}

export function listSkillResources(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const inv = listAgentSkills({ repoRoot, env: options.env });
  const resources = [];
  for (const skill of inv.skills || []) {
    const dir = path.join(skillsDir(repoRoot), skill.slug);
    const files = listFilesRecursive(dir, dir);
    for (const rel of files) {
      resources.push({
        uri: skillFileUri(skill.slug, rel),
        name: rel === "SKILL.md" ? skill.name || skill.slug : rel,
        title: skill.name || skill.slug,
        description: skill.description || "",
        mimeType: mimeFor(rel),
      });
    }
  }
  return resources;
}

export function listPatternResources(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const inv = listPatterns({ repoRoot, env: options.env });
  const resources = [];
  for (const p of inv.patterns || []) {
    const files = listPatternFiles(p.slug, repoRoot);
    const meta = getPattern(p.slug, { repoRoot, includeBody: false }).pattern || p;
    for (const rel of files) {
      resources.push({
        uri: patternFileUri(meta, rel),
        name: rel === "PATTERN.md" ? meta.title || p.slug : rel,
        title: meta.title || p.slug,
        description: p.description || "",
        mimeType: mimeFor(rel),
      });
    }
  }
  return resources;
}

export function listPromptResources(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  return listPromptFiles(repoRoot).map((filename) => ({
    uri: `${PROMPT_URI_PREFIX}${promptNameFromFile(filename)}`,
    name: promptNameFromFile(filename),
    mimeType: "text/markdown",
    description: "Cogentia prompt contract",
  }));
}

export function listCatalogResources() {
  return [
    {
      uri: CLI_CATALOG_URI,
      name: "cli-catalog",
      mimeType: "application/json",
      description: "CLI verbs and their MCP/daemon projections (capability inventory).",
    },
    {
      uri: CAPABILITY_CATALOG_URI,
      name: "capability-catalog",
      mimeType: "application/json",
      description: "Live capability inventory across CLI, MCP, skills, patterns, COP.",
    },
    {
      uri: SCHEMA_JOHN_URI,
      name: "john.request.v1",
      mimeType: "application/json",
      description: "John request schema (COP-governed agent request).",
    },
  ];
}

export function listAllResources(options = {}) {
  const resources = [
    ...listCatalogResources(),
    ...listSkillResources(options),
    ...listPatternResources(options),
    ...listPromptResources(options),
  ];
  resources.sort((a, b) => String(a.uri).localeCompare(String(b.uri)));
  return resources;
}

function mimeFor(relPath) {
  if (relPath.endsWith(".md")) return "text/markdown";
  if (relPath.endsWith(".json")) return "application/json";
  if (relPath.endsWith(".yaml") || relPath.endsWith(".yml")) return "text/yaml";
  if (relPath.endsWith(".js")) return "text/javascript";
  return "text/plain";
}

export function readMcpResource(uri, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const raw = String(uri || "").trim();
  if (!raw) return { ok: false, error: "missing_uri" };

  if (raw === CLI_CATALOG_URI || raw === CAPABILITY_CATALOG_URI) {
    return { ok: true, deferred: "inventory", uri: raw, mimeType: "application/json" };
  }
  if (raw === SCHEMA_JOHN_URI) {
    const abs = path.join(repoRoot, "schemas", "john.request.v1.schema.json");
    if (!fs.existsSync(abs)) return { ok: false, error: "not_found" };
    return {
      ok: true,
      uri: raw,
      mimeType: "application/json",
      text: fs.readFileSync(abs, "utf8"),
    };
  }

  if (raw.startsWith(PROMPT_URI_PREFIX)) {
    const name = raw.slice(PROMPT_URI_PREFIX.length);
    const prompt = getMcpPrompt(name, { repoRoot });
    if (!prompt.ok) return { ok: false, error: prompt.error || "not_found" };
    return {
      ok: true,
      uri: raw,
      mimeType: "text/markdown",
      text: prompt.messages[0].content.text,
    };
  }

  if (raw.startsWith(SKILL_URI_PREFIX)) {
    const rest = raw.slice(SKILL_URI_PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) return { ok: false, error: "invalid_uri" };
    const slug = rest.slice(0, slash);
    const rel = rest.slice(slash + 1);
    if (rel.includes("..")) return { ok: false, error: "invalid_uri" };
    const abs = path.join(skillsDir(repoRoot), slug, ...rel.split("/"));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return { ok: false, error: "not_found" };
    return {
      ok: true,
      uri: raw,
      mimeType: mimeFor(rel),
      text: fs.readFileSync(abs, "utf8"),
    };
  }

  if (raw.startsWith(PATTERN_URI_PREFIX) || raw.startsWith(ANTIPATTERN_URI_PREFIX)) {
    const prefix = raw.startsWith(PATTERN_URI_PREFIX) ? PATTERN_URI_PREFIX : ANTIPATTERN_URI_PREFIX;
    const rest = raw.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) return { ok: false, error: "invalid_uri" };
    const slug = rest.slice(0, slash);
    const rel = rest.slice(slash + 1);
    if (rel.includes("..")) return { ok: false, error: "invalid_uri" };
    const abs = path.join(patternsDir(repoRoot), slug, ...rel.split("/"));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return { ok: false, error: "not_found" };
    return {
      ok: true,
      uri: raw,
      mimeType: mimeFor(rel),
      text: fs.readFileSync(abs, "utf8"),
    };
  }

  return { ok: false, error: "not_found" };
}

export function readDirectoryResource(uri, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const raw = String(uri || "").replace(/\/$/, "");
  let abs = null;
  let childPrefix = null;
  if (raw.startsWith(SKILL_URI_PREFIX)) {
    const rest = raw.slice(SKILL_URI_PREFIX.length);
    abs = path.join(skillsDir(repoRoot), ...rest.split("/").filter(Boolean));
    childPrefix = `${SKILL_URI_PREFIX}${rest}`;
  } else if (raw.startsWith(PATTERN_URI_PREFIX)) {
    const rest = raw.slice(PATTERN_URI_PREFIX.length);
    abs = path.join(patternsDir(repoRoot), ...rest.split("/").filter(Boolean));
    childPrefix = `${PATTERN_URI_PREFIX}${rest}`;
  } else if (raw.startsWith(ANTIPATTERN_URI_PREFIX)) {
    const rest = raw.slice(ANTIPATTERN_URI_PREFIX.length);
    abs = path.join(patternsDir(repoRoot), ...rest.split("/").filter(Boolean));
    childPrefix = `${ANTIPATTERN_URI_PREFIX}${rest}`;
  }
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return { ok: false, error: "not_found" };
  }
  const children = fs.readdirSync(abs, { withFileTypes: true })
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((ent) => {
      const childUri = `${childPrefix}/${ent.name}`;
      if (ent.isDirectory()) {
        return { uri: childUri, name: ent.name, mimeType: "inode/directory" };
      }
      return { uri: childUri, name: ent.name, mimeType: mimeFor(ent.name) };
    });
  return { ok: true, resources: children };
}

export function listSkillsSep2640(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const inv = listAgentSkills({ repoRoot, env: options.env });
  const skills = [];
  for (const s of inv.skills || []) {
    const dir = path.join(skillsDir(repoRoot), s.slug);
    const files = listFilesRecursive(dir, dir);
    const full = getAgentSkill(s.slug, { repoRoot, includeBody: false });
    const frontmatter = {
      name: s.slug,
      description: s.description || "",
      ...(full.skill?.version != null ? { metadata: { version: String(full.skill.version) } } : {}),
    };
    skills.push({
      uri: skillFileUri(s.slug, "SKILL.md"),
      frontmatter,
      resources: files.map((rel) => ({
        uri: skillFileUri(s.slug, rel),
        digest: sha256File(path.join(dir, ...rel.split("/"))),
      })),
    });
  }
  return { skills };
}

export function getSkillSep2640(uri, options = {}) {
  const listing = listSkillsSep2640(options);
  const skill = listing.skills.find((s) => s.uri === uri);
  if (!skill) return { ok: false, error: "not_found" };
  return { ok: true, skill };
}

export function completeMcp(params = {}, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const ref = params.ref || {};
  const argument = params.argument || {};
  const value = String(argument.value || "");
  let values = [];

  const type = String(ref.type || "");
  if (type === "ref/prompt" || argument.name === "prompt") {
    values = listMcpPrompts({ repoRoot }).map((p) => p.name);
  } else if (type === "ref/resource") {
    values = listAllResources({ repoRoot }).map((r) => r.uri);
  } else {
    const name = String(argument.name || ref.name || "");
    if (name === "id" || name === "skill" || /skill/i.test(name)) {
      values = (listAgentSkills({ repoRoot }).skills || []).map((s) => s.slug);
    } else if (/pattern/i.test(name)) {
      values = (listPatterns({ repoRoot }).patterns || []).map((p) => p.slug);
    } else {
      values = [
        ...(listAgentSkills({ repoRoot }).skills || []).map((s) => s.slug),
        ...(listPatterns({ repoRoot }).patterns || []).map((p) => p.slug),
      ];
    }
  }

  const filtered = values.filter((v) => !value || String(v).toLowerCase().startsWith(value.toLowerCase()));
  return {
    completion: {
      values: filtered.slice(0, 100),
      total: filtered.length,
      hasMore: filtered.length > 100,
    },
  };
}

export function serverCapabilityBlock() {
  return {
    tools: { listChanged: false },
    resources: { listChanged: false },
    prompts: { listChanged: false },
    completions: {},
    extensions: {
      "io.modelcontextprotocol/skills": { directoryRead: true },
    },
  };
}
