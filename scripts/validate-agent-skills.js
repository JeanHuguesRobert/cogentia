#!/usr/bin/env node
/**
 * Inventory and structural validation for Cogentia Agent Skills (issue #82).
 * Dependency-free. Exit 0 on pass, 1 on failure.
 *
 * Usage:
 *   node scripts/validate-agent-skills.js
 *   node scripts/validate-agent-skills.js --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const WANT_JSON = process.argv.includes("--json");

const REQUIRED_FRONTMATTER = [
  "schema",
  "id",
  "version",
  "status",
  "name",
  "description",
  "effects",
  "sources",
];

function fail(msg, errors) {
  errors.push(msg);
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: null, body: raw, error: "missing opening frontmatter fence" };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: null, body: raw, error: "missing closing frontmatter fence" };
  const yamlText = raw.slice(3, end).replace(/^\r?\n/, "");
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  try {
    return { data: parseMinimalYaml(yamlText), body, error: null };
  } catch (e) {
    return { data: null, body, error: e.message };
  }
}

/**
 * Minimal YAML subset for skill frontmatter (enough for #82 profile).
 * Not a general YAML parser.
 */
function parseMinimalYaml(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root, key: null, isArray: false }];

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

    while (stack.length > 1 && indent <= current().indent) {
      stack.pop();
    }
    const parent = current();

    // Array item
    if (trimmed.startsWith("- ")) {
      const itemRaw = trimmed.slice(2).trim();
      let targetKey = parent.key;
      let targetObj = parent.obj;
      if (!parent.isArray) {
        // array under last key of parent object
        if (!targetKey) {
          throw new Error(`array item without key near: ${trimmed}`);
        }
        if (!Array.isArray(targetObj[targetKey])) {
          targetObj[targetKey] = [];
        }
        // push container frame for nested maps under array items if needed
      }
      const arrParent = parent.isArray ? parent.obj : parent.obj;
      const arrKey = parent.isArray ? null : parent.key;
      const arr = parent.isArray ? parent.obj : arrParent[arrKey];

      if (itemRaw.includes(": ") || (itemRaw.endsWith(":") && !itemRaw.startsWith('"'))) {
        // map item
        const obj = {};
        arr.push(obj);
        if (itemRaw.endsWith(":") && !itemRaw.includes(": ")) {
          const k = itemRaw.slice(0, -1).trim();
          stack.push({ indent, obj, key: k, isArray: false });
        } else {
          const idx = itemRaw.indexOf(": ");
          const k = itemRaw.slice(0, idx).trim();
          let v = itemRaw.slice(idx + 2).trim();
          obj[k] = coerceScalar(v);
          stack.push({ indent, obj, key: k, isArray: false });
        }
      } else {
        arr.push(coerceScalar(itemRaw));
      }
      continue;
    }

    // Key: value or Key:
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) throw new Error(`cannot parse line: ${trimmed}`);

    const key = trimmed.slice(0, colonIdx).trim();
    let rest = trimmed.slice(colonIdx + 1).trim();

    if (rest === ">" || rest === "|") {
      // folded/literal block: collect following more-indented lines
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
        blockLines.push(l.slice(indent + 2).replace(/^\s*/, "") || l.trim());
        j++;
      }
      i = j - 1;
      parent.obj[key] = blockLines.join(" ").replace(/\s+/g, " ").trim();
      parent.key = key;
      continue;
    }

    if (rest === "") {
      // nested object or upcoming array
      // peek next non-empty
      let peek = null;
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j].trim() || lines[j].trim().startsWith("#")) continue;
        peek = lines[j];
        break;
      }
      if (peek && peek.trim().startsWith("- ")) {
        parent.obj[key] = [];
        stack.push({ indent, obj: parent.obj, key, isArray: false });
      } else {
        const child = ensureObj(parent.obj, key);
        stack.push({ indent, obj: child, key: null, isArray: false });
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
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function listSkillDirs() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function validateSkill(slug) {
  const errors = [];
  const warnings = [];
  const skillDir = path.join(SKILLS_DIR, slug);
  const skillPath = path.join(skillDir, "SKILL.md");

  if (!fs.existsSync(skillPath)) {
    fail(`${slug}: missing SKILL.md`, errors);
    return { slug, ok: false, errors, warnings, meta: null };
  }

  const raw = fs.readFileSync(skillPath, "utf8");
  const { data, error } = parseFrontmatter(raw);
  if (error || !data) {
    fail(`${slug}: frontmatter parse error: ${error || "empty"}`, errors);
    return { slug, ok: false, errors, warnings, meta: null };
  }

  for (const key of REQUIRED_FRONTMATTER) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      fail(`${slug}: missing required frontmatter field "${key}"`, errors);
    }
  }

  if (data.schema && data.schema !== "cogentia.agent_skill/v1") {
    fail(`${slug}: schema must be cogentia.agent_skill/v1 (got ${data.schema})`, errors);
  }

  if (data.id && data.id !== `cogentia.${slug}` && data.id !== slug) {
    warnings.push(`${slug}: id "${data.id}" does not match expected cogentia.${slug}`);
  }

  if (data.name && data.name !== slug) {
    warnings.push(`${slug}: name "${data.name}" differs from directory slug "${slug}"`);
  }

  if (data.governance && data.governance.may_widen_authority === true) {
    fail(`${slug}: governance.may_widen_authority must not be true`, errors);
  }

  if (data.governance && data.governance.may_resolve_without_mandate === true) {
    fail(`${slug}: governance.may_resolve_without_mandate must not be true`, errors);
  }

  if (data.governance && data.governance.may_disclose === true && data.effects !== "read_only") {
    warnings.push(`${slug}: may_disclose true with non-read_only effects — review carefully`);
  }

  const sources = Array.isArray(data.sources) ? data.sources : [];
  if (!sources.length) {
    fail(`${slug}: sources must be a non-empty array of repo-relative paths`, errors);
  }
  for (const src of sources) {
    if (typeof src !== "string") {
      fail(`${slug}: source entry is not a string`, errors);
      continue;
    }
    const full = path.join(REPO_ROOT, src);
    if (!fs.existsSync(full)) {
      fail(`${slug}: source missing: ${src}`, errors);
    }
  }

  const caps = data.requires?.capabilities;
  if (caps !== undefined && !Array.isArray(caps)) {
    fail(`${slug}: requires.capabilities must be an array when present`, errors);
  }

  const allowedEffects = new Set([
    "read_only",
    "prepare_only",
    "governed_write",
    "external_effect",
  ]);
  if (data.effects && !allowedEffects.has(data.effects)) {
    fail(
      `${slug}: effects must be one of ${[...allowedEffects].join("|")} (got ${data.effects})`,
      errors
    );
  }

  // Secret-ish patterns in public skill metadata
  const metaBlob = JSON.stringify(data);
  if (/(api[_-]?key|secret|password|BEGIN [A-Z]+ PRIVATE KEY)/i.test(metaBlob)) {
    fail(`${slug}: frontmatter appears to contain secret-like material`, errors);
  }
  if (/[A-Za-z]:\\Users\\|\/home\/[^/]+\//.test(metaBlob)) {
    fail(`${slug}: frontmatter appears to contain local absolute paths`, errors);
  }

  return {
    slug,
    ok: errors.length === 0,
    errors,
    warnings,
    meta: {
      id: data.id,
      version: data.version,
      status: data.status,
      effects: data.effects,
      capabilities: caps || [],
      sources_count: sources.length,
    },
  };
}

function main() {
  const slugs = listSkillDirs();
  const results = slugs.map(validateSkill);

  // unique id+version
  const seen = new Map();
  for (const r of results) {
    if (!r.meta?.id) continue;
    const key = `${r.meta.id}@${r.meta.version}`;
    if (seen.has(key)) {
      r.errors.push(`${r.slug}: duplicate id/version ${key} (also ${seen.get(key)})`);
      r.ok = false;
    } else {
      seen.set(key, r.slug);
    }
  }

  const report = {
    skills_dir: path.relative(REPO_ROOT, SKILLS_DIR).replace(/\\/g, "/"),
    count: results.length,
    ok: results.every((r) => r.ok),
    skills: results,
  };

  if (WANT_JSON) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Agent skills inventory: ${report.count} package(s) under ${report.skills_dir}/`);
    if (!report.count) {
      console.log("(none found)");
    }
    for (const r of results) {
      const mark = r.ok ? "OK" : "FAIL";
      const id = r.meta ? `${r.meta.id}@${r.meta.version}` : "(unparsed)";
      console.log(`  [${mark}] ${r.slug}  ${id}  effects=${r.meta?.effects ?? "?"}`);
      for (const w of r.warnings) console.log(`         warn: ${w}`);
      for (const e of r.errors) console.log(`         error: ${e}`);
    }
    console.log(report.ok ? "\nvalidate-agent-skills: PASS" : "\nvalidate-agent-skills: FAIL");
  }

  process.exit(report.ok ? 0 : 1);
}

main();
