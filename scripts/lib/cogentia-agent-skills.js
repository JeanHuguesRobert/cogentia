/**
 * Read-only Agent Skills inventory for MCP and local tooling (cogentia#82).
 * Skills live under <repo>/skills/<slug>/SKILL.md — public method packages only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, "..", "..");

const MAX_SKILL_BODY_CHARS = 120_000;

export function resolveRepoRoot(env = process.env) {
  const fromEnv = String(env.COGENTIA_REPO_ROOT || env.COGENTIA_HOME || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return DEFAULT_REPO_ROOT;
}

export function skillsDir(repoRoot = resolveRepoRoot()) {
  return path.join(repoRoot, "skills");
}

/**
 * Minimal YAML-ish frontmatter parse (same subset as validate-agent-skills.js).
 */
export function parseSkillFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw, error: "missing_frontmatter" };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw, error: "unclosed_frontmatter" };
  const yamlText = raw.slice(3, end).replace(/^\r?\n/, "");
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  try {
    return { data: parseMinimalYaml(yamlText), body, error: null };
  } catch (e) {
    return { data: {}, body, error: e.message };
  }
}

function parseMinimalYaml(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root, key: null }];

  const current = () => stack[stack.length - 1];
  const ensureObj = (parent, key) => {
    if (!parent[key] || typeof parent[key] !== "object" || Array.isArray(parent[key])) {
      parent[key] = {};
    }
    return parent[key];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();
    while (stack.length > 1 && indent <= current().indent) stack.pop();
    const parent = current();

    if (trimmed.startsWith("- ")) {
      const itemRaw = trimmed.slice(2).trim();
      const arrKey = parent.key;
      if (!arrKey) throw new Error(`array item without key near: ${trimmed}`);
      if (!Array.isArray(parent.obj[arrKey])) parent.obj[arrKey] = [];
      const arr = parent.obj[arrKey];
      if (itemRaw.includes(": ") || (itemRaw.endsWith(":") && !itemRaw.startsWith('"'))) {
        const obj = {};
        arr.push(obj);
        if (itemRaw.endsWith(":") && !itemRaw.includes(": ")) {
          stack.push({ indent, obj, key: itemRaw.slice(0, -1).trim() });
        } else {
          const idx = itemRaw.indexOf(": ");
          const k = itemRaw.slice(0, idx).trim();
          obj[k] = coerceScalar(itemRaw.slice(idx + 2).trim());
          stack.push({ indent, obj, key: k });
        }
      } else {
        arr.push(coerceScalar(itemRaw));
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) throw new Error(`cannot parse: ${trimmed}`);
    const key = trimmed.slice(0, colonIdx).trim();
    let rest = trimmed.slice(colonIdx + 1).trim();

    if (rest === ">" || rest === "|") {
      const blockLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const l = lines[j];
        if (!l.trim()) {
          blockLines.push("");
          j++;
          continue;
        }
        const ind = l.match(/^ */)[0].length;
        if (ind <= indent) break;
        blockLines.push(l.trim());
        j++;
      }
      i = j - 1;
      parent.obj[key] = blockLines.join(" ").replace(/\s+/g, " ").trim();
      parent.key = key;
      continue;
    }

    if (rest === "") {
      let peek = null;
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j].trim() || lines[j].trim().startsWith("#")) continue;
        peek = lines[j];
        break;
      }
      if (peek && peek.trim().startsWith("- ")) {
        parent.obj[key] = [];
        stack.push({ indent, obj: parent.obj, key });
      } else {
        stack.push({ indent, obj: ensureObj(parent.obj, key), key: null });
      }
      parent.key = key;
      continue;
    }

    parent.obj[key] = coerceScalar(rest);
    parent.key = key;
  }
  return root;
}

function coerceScalar(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function listSlugs(repoRoot) {
  const dir = skillsDir(repoRoot);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .filter((name) => /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/i.test(name))
    .sort();
}

function skillMetaFromFile(slug, repoRoot) {
  const skillPath = path.join(skillsDir(repoRoot), slug, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    return { ok: false, error: "skill_not_found", id: slug };
  }
  const raw = fs.readFileSync(skillPath, "utf8");
  const { data, body, error } = parseSkillFrontmatter(raw);
  const id = data.id || `cogentia.${slug}`;
  return {
    ok: true,
    slug,
    id,
    version: data.version ?? null,
    status: data.status || "unknown",
    name: data.name || slug,
    description: typeof data.description === "string" ? data.description : "",
    effects: data.effects || null,
    triggers: Array.isArray(data.triggers) ? data.triggers : [],
    inputs: Array.isArray(data.inputs) ? data.inputs : [],
    outputs: Array.isArray(data.outputs) ? data.outputs : [],
    requires: data.requires || {},
    governance: data.governance || {},
    sources: Array.isArray(data.sources) ? data.sources : [],
    path: `skills/${slug}/SKILL.md`,
    frontmatter_error: error,
    body_chars: body.length,
  };
}

/** Inventory for cogentia_skill_list. */
export function listAgentSkills(options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const slugs = listSlugs(repoRoot);
  const skills = slugs.map((slug) => skillMetaFromFile(slug, repoRoot)).filter((s) => s.ok);
  return {
    ok: true,
    protocol: "cogentia.agent_skill/v1",
    skills_root: "skills/",
    count: skills.length,
    skills: skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      version: s.version,
      status: s.status,
      name: s.name,
      description: s.description,
      effects: s.effects,
      triggers: s.triggers,
      path: s.path,
      governance: {
        minimum_mandate: s.governance.minimum_mandate,
        may_disclose: s.governance.may_disclose === true,
        may_resolve_without_mandate: s.governance.may_resolve_without_mandate === true,
      },
    })),
    playbook_hint: [
      "cogentia_agent_start or cogentia_views_snapshot",
      "cogentia_skill_get id=continuation-handling when work may suspend",
      "cogentia_context_pack / cogentia_search — cite source_id",
      "cogentia_continuation_list → inspect → prepare step_result (resolve only if mutate allowed)",
    ],
  };
}

/**
 * Full skill package for cogentia_skill_get.
 * @param {string} idOrSlug - e.g. continuation-handling or cogentia.continuation-handling
 */
export function getAgentSkill(idOrSlug, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot(options.env || process.env);
  const includeBody = options.includeBody !== false;
  const rawId = String(idOrSlug || "").trim();
  if (!rawId) return { ok: false, error: "missing_id" };

  let slug = rawId;
  if (slug.startsWith("cogentia.")) slug = slug.slice("cogentia.".length);
  slug = slug.replace(/^skills\//, "").replace(/\/SKILL\.md$/i, "");
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    return { ok: false, error: "invalid_id" };
  }

  const meta = skillMetaFromFile(slug, repoRoot);
  if (!meta.ok) return meta;

  const skillPath = path.join(skillsDir(repoRoot), slug, "SKILL.md");
  const raw = fs.readFileSync(skillPath, "utf8");
  const { body } = parseSkillFrontmatter(raw);

  const result = {
    ok: true,
    protocol: "cogentia.agent_skill/v1",
    skill: {
      id: meta.id,
      slug: meta.slug,
      version: meta.version,
      status: meta.status,
      name: meta.name,
      description: meta.description,
      effects: meta.effects,
      triggers: meta.triggers,
      inputs: meta.inputs,
      outputs: meta.outputs,
      requires: meta.requires,
      governance: meta.governance,
      sources: meta.sources,
      path: meta.path,
    },
    mandate_hint: "Skills recommend methods; they do not grant authority or authorize Acts.",
  };

  if (includeBody) {
    const text = body.length > MAX_SKILL_BODY_CHARS
      ? `${body.slice(0, MAX_SKILL_BODY_CHARS)}\n\n/* truncated */\n`
      : body;
    result.body_markdown = text;
    result.body_truncated = body.length > MAX_SKILL_BODY_CHARS;
  }

  return result;
}
