/**
 * scripts/lib/frontmatter-validator.js
 *
 * Modular, schema-driven frontmatter validator for Cogentia documents.
 * Consumes the canonical schema at docs/frontmatter-schema.v0.1.json.
 * Part of Issue #163 (and Living Frontmatter #159).
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import yaml from "js-yaml";

export const CANONICAL_DOCUMENT_ROLES = Object.freeze([
  "source",
  "derived",
  "trail",
  "index",
  "operational",
  "template",
  "example",
  "alias",
  "archive",
  "unknown",
]);

let cachedSchema = null;

/**
 * Load and cache the canonical frontmatter schema from docs/frontmatter-schema.v0.1.json.
 * @param {string|null} [customPath]
 * @returns {object}
 */
export function loadFrontmatterSchema(customPath = null) {
  if (customPath) {
    return JSON.parse(fs.readFileSync(customPath, "utf8"));
  }
  if (cachedSchema) return cachedSchema;
  const schemaUrl = new URL("../../docs/frontmatter-schema.v0.1.json", import.meta.url);
  cachedSchema = JSON.parse(fs.readFileSync(schemaUrl, "utf8"));
  return cachedSchema;
}

/**
 * Extract YAML frontmatter from document text.
 * @param {string} text
 * @returns {{ present: boolean, raw: string, data: object|null, error: string|null }}
 */
export function extractFrontmatter(text) {
  if (typeof text !== "string") {
    return { present: false, raw: "", data: null, error: "Input must be a string" };
  }
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) {
    return { present: false, raw: "", data: null, error: "Missing opening '---' delimiter" };
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { present: false, raw: "", data: null, error: "Malformed frontmatter block: missing closing '---' delimiter" };
  }
  try {
    const data = yaml.load(match[1]);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { present: true, raw: match[1], data: null, error: "Frontmatter content must be a YAML object/mapping" };
    }
    return { present: true, raw: match[1], data, error: null };
  } catch (err) {
    return { present: true, raw: match[1], data: null, error: `YAML parse error: ${err.message}` };
  }
}

/**
 * Check whether a single status token matches or starts with any base vocabulary entry.
 * @param {string} token
 * @param {string[]} baseVocabulary
 * @returns {boolean}
 */
function isStatusTokenValid(token, baseVocabulary) {
  if (!token || typeof token !== "string") return false;
  const normalized = token.trim().toLowerCase();
  // Split on natural language qualifier delimiters (em-dash, en-dash, hyphen-space, comma)
  const basePart = normalized.split(/[—–,]|\s+-\s+/)[0].trim();
  return baseVocabulary.some(b => basePart === b || basePart.startsWith(b));
}

/**
 * Validate parsed frontmatter against the canonical Cogentia schema.
 * @param {object} data - Parsed YAML object
 * @param {object} [schema] - Schema object (defaults to loadFrontmatterSchema())
 * @param {object} [options] - Validation options
 * @param {boolean} [options.strictRole=false] - If true, document_role is required and must be canonical
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateFrontmatter(data, schema = null, options = {}) {
  const s = schema || loadFrontmatterSchema();
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: ["Frontmatter must be a non-empty object"], warnings: [] };
  }

  // 1. Core required fields
  const coreRequired = s.field_groups?.core?.required || [];
  for (const field of coreRequired) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push(`Missing core required field: '${field}'`);
    }
  }

  // 2. Traceability required fields
  const traceRequired = s.field_groups?.traceability?.required || [];
  for (const field of traceRequired) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push(`Missing traceability required field: '${field}'`);
    }
  }

  // 3. Provenance block
  if (data.provenance !== undefined) {
    if (typeof data.provenance !== "object" || data.provenance === null || Array.isArray(data.provenance)) {
      errors.push("Field 'provenance' must be a structured mapping/object");
    } else {
      const provReq = s.required_blocks?.provenance?.required || [];
      for (const field of provReq) {
        if (data.provenance[field] === undefined || data.provenance[field] === null) {
          errors.push(`Missing provenance field: 'provenance.${field}'`);
        }
      }
      const originVocab = s.required_blocks?.provenance?.origin_type_vocabulary || [];
      if (data.provenance.origin_type && !originVocab.includes(String(data.provenance.origin_type).toLowerCase())) {
        errors.push(
          `Invalid provenance.origin_type: '${data.provenance.origin_type}'. Must be one of: ${originVocab.join(", ")}`
        );
      }
      if (data.provenance.derived_from !== undefined && !Array.isArray(data.provenance.derived_from)) {
        errors.push("Field 'provenance.derived_from' must be an array (use [] if none)");
      }
    }
  }

  // 4. Review block
  if (data.review !== undefined) {
    if (typeof data.review !== "object" || data.review === null || Array.isArray(data.review)) {
      errors.push("Field 'review' must be a structured mapping/object");
    } else {
      const reviewReq = s.required_blocks?.review?.required || [];
      for (const field of reviewReq) {
        if (data.review[field] === undefined || data.review[field] === null) {
          errors.push(`Missing review field: 'review.${field}'`);
        }
      }
      if (data.review.review_status !== undefined && data.review.status === undefined) {
        errors.push("Field 'review.review_status' is invalid; schema requires 'review.status'");
      }
    }
  }

  // 5. Status base vocabulary validation
  const baseVocab = s.status?.base_vocabulary || [];
  if (data.status !== undefined && data.status !== null) {
    const statuses = Array.isArray(data.status)
      ? data.status
      : String(data.status).split(",").map(t => t.trim()).filter(Boolean);

    for (const st of statuses) {
      if (!isStatusTokenValid(String(st), baseVocab)) {
        errors.push(
          `Status '${st}' does not start with any canonical base vocabulary value: ${baseVocab.join(", ")}`
        );
      }
    }
  }

  // 6. Deprecated fields check
  const deprecated = s.deprecated_fields || [];
  for (const dep of deprecated) {
    if (data[dep] !== undefined) {
      warnings.push(`Deprecated field '${dep}' should be removed or migrated`);
    }
  }

  // 7. Document role validation
  const explicitRole = data.document_role || data.corpus_role;
  if (explicitRole) {
    const roleStr = String(explicitRole).trim().toLowerCase();
    if (!CANONICAL_DOCUMENT_ROLES.includes(roleStr)) {
      warnings.push(
        `Non-canonical document_role '${explicitRole}'. Recognized roles: ${CANONICAL_DOCUMENT_ROLES.join(", ")}`
      );
    }
  } else if (options.strictRole) {
    errors.push("Missing required 'document_role' under strict mode");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate document text directly.
 * @param {string} text - Raw document content
 * @param {object} [options]
 * @returns {{ valid: boolean, errors: string[], warnings: string[], data: object|null }}
 */
export function validateFrontmatterText(text, options = {}) {
  const extracted = extractFrontmatter(text);
  if (!extracted.present || extracted.error) {
    return {
      valid: false,
      errors: [extracted.error || "Missing frontmatter"],
      warnings: [],
      data: null,
    };
  }
  const result = validateFrontmatter(extracted.data, options.schema || null, options);
  return {
    ...result,
    data: extracted.data,
  };
}

/**
 * Validate a single file from disk.
 * @param {string} filePath - Path to markdown file
 * @param {object} [options]
 * @returns {{ path: string, valid: boolean, errors: string[], warnings: string[], data: object|null }}
 */
export function validateFrontmatterFile(filePath, options = {}) {
  const resolved = path.resolve(filePath);
  try {
    const content = fs.readFileSync(resolved, "utf8");
    const result = validateFrontmatterText(content, options);
    return {
      path: filePath,
      resolved_path: resolved,
      ...result,
    };
  } catch (err) {
    return {
      path: filePath,
      resolved_path: resolved,
      valid: false,
      errors: [`File read error: ${err.message}`],
      warnings: [],
      data: null,
    };
  }
}

/**
 * Validate multiple file paths or directories.
 * @param {string[]} paths - File or directory paths
 * @param {object} [options]
 * @returns {{ ok: boolean, total: number, valid_count: number, error_count: number, warning_count: number, files: Array<object> }}
 */
export function validateFrontmatterPaths(paths, options = {}) {
  const filesToValidate = [];

  function collectFiles(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(p);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "dist" || entry === "build") {
          continue;
        }
        collectFiles(path.join(p, entry));
      }
    } else if (stat.isFile() && /\.(md|markdown)$/i.test(p)) {
      filesToValidate.push(p);
    }
  }

  for (const p of paths) {
    if (fs.existsSync(p)) {
      collectFiles(p);
    } else {
      filesToValidate.push(p); // will fail gracefully in validateFrontmatterFile
    }
  }

  const results = filesToValidate.map(f => validateFrontmatterFile(f, options));
  const validCount = results.filter(r => r.valid).length;
  const errorCount = results.filter(r => !r.valid).length;
  const warningCount = results.reduce((acc, r) => acc + r.warnings.length, 0);

  return {
    ok: errorCount === 0,
    total: results.length,
    valid_count: validCount,
    error_count: errorCount,
    warning_count: warningCount,
    files: results,
  };
}

/**
 * Render a human-readable CLI report from validation results.
 * @param {object} report
 * @returns {string}
 */
export function formatValidationReport(report) {
  const lines = [];
  lines.push(`Frontmatter validation: ${report.valid_count}/${report.total} valid (${report.error_count} errors, ${report.warning_count} warnings)`);
  lines.push("");

  for (const file of report.files) {
    const symbol = file.valid ? "✓" : "✗";
    lines.push(`${symbol} ${file.path}`);
    for (const err of file.errors) {
      lines.push(`    ERROR: ${err}`);
    }
    for (const warn of file.warnings) {
      lines.push(`    WARN:  ${warn}`);
    }
  }

  return lines.join("\n");
}

function inferLanguage(text) {
  if (typeof text !== "string" || text.trim().length === 0) return "en";
  const frMatches = text.match(/\b(le|la|les|des|du|un|une|pour|avec|dans|sur|est|sont|cette|ce|qui|que|pas|plus|nous|vous|ils|elles)\b/gi) || [];
  const enMatches = text.match(/\b(the|and|of|to|in|is|are|this|that|with|for|from|as|at|by|an|be|have|not|it|you)\b/gi) || [];
  return frMatches.length > enMatches.length && frMatches.length > 5 ? "fr" : "en";
}

function extractTitleFromText(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Scaffold a minimal compliant frontmatter object.
 * @param {object} [options]
 * @returns {object}
 */
export function scaffoldFrontmatter(options = {}) {
  const today = options.date || new Date().toISOString().slice(0, 10);
  const schema = options.schema || loadFrontmatterSchema();
  const defaults = schema.field_groups?.core?.defaults || {};
  const traceDefaults = schema.field_groups?.traceability?.defaults || {};
  const reviewTemplate = schema.required_blocks?.review?.template || {};

  const data = {
    title: options.title || "Untitled Document",
  };

  if (options.subtitle) {
    data.subtitle = options.subtitle;
  }

  data.author = options.author || "Jean Hugues Noël Robert, baron Mariani";
  data.affiliation = options.affiliation || defaults.affiliation || "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica";
  data.date = today;
  data.last_modified_at = options.last_modified_at || today;
  data.version = options.version || "0.1";
  data.status = options.status || "working-paper";
  data.license = options.license || defaults.license || "CC BY-SA 4.0";
  data.language = options.language || options.lang || "en";
  data.document_role = options.document_role || options.role || "operational";
  data.update_policy = options.update_policy || traceDefaults.update_policy || "UP-DEFAULT-REVIEWED";

  if (options.canonical_url) {
    data.canonical_url = options.canonical_url;
  }

  data.provenance = options.provenance || {
    origin_type: options.origin_type || "repository",
    origin_repository: options.origin_repository || "unknown",
    origin_ref: options.origin_ref || "unknown",
    origin_date: options.origin_date || today,
    derived_from: options.derived_from || [],
  };

  data.review = options.review || {
    status: options.review_status || reviewTemplate.status || "unreviewed",
    reviewed_by: options.reviewed_by || reviewTemplate.reviewed_by || [],
  };

  return data;
}

/**
 * Create or prepend a compliant frontmatter skeleton to a file.
 * @param {string} targetPath - File path
 * @param {object} [options]
 * @returns {{ ok: boolean, mode: string, path: string, error?: string, content?: string }}
 */
export function scaffoldFrontmatterFile(targetPath, options = {}) {
  const resolved = path.resolve(targetPath);
  const exists = fs.existsSync(resolved);

  if (exists) {
    const existingContent = fs.readFileSync(resolved, "utf8");
    const extracted = extractFrontmatter(existingContent);

    if (extracted.present && !options.force) {
      return {
        ok: false,
        error: "file_already_has_frontmatter",
        path: targetPath,
      };
    }

    const title = options.title || extractTitleFromText(existingContent) || path.basename(targetPath, path.extname(targetPath));
    const language = options.language || options.lang || inferLanguage(existingContent);
    const data = scaffoldFrontmatter({ ...options, title, language });
    const yamlStr = yaml.dump(data, { lineWidth: -1, noRefs: true });

    let newContent;
    if (extracted.present && options.force) {
      newContent = existingContent.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, `---\n${yamlStr}---\n\n`);
    } else {
      newContent = `---\n${yamlStr}---\n\n${existingContent}`;
    }

    fs.writeFileSync(resolved, newContent, "utf8");
    return {
      ok: true,
      mode: extracted.present ? "replaced" : "prepended",
      path: targetPath,
      resolved_path: resolved,
    };
  }

  // Create new file
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const rawBase = path.basename(targetPath, path.extname(targetPath));
  const inferredTitle = rawBase
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const title = options.title || inferredTitle;
  const data = scaffoldFrontmatter({ ...options, title });
  const yamlStr = yaml.dump(data, { lineWidth: -1, noRefs: true });
  const content = `---\n${yamlStr}---\n\n# ${title}\n\n`;

  fs.writeFileSync(resolved, content, "utf8");
  return {
    ok: true,
    mode: "created",
    path: targetPath,
    resolved_path: resolved,
  };
}

/**
 * Plan mechanical repairs for frontmatter in specified files.
 * @param {string[]} paths
 * @param {object} [options]
 * @returns {object}
 */
export function planFrontmatterRepairs(paths, options = {}) {
  const schema = options.schema || loadFrontmatterSchema();
  const coreDefaults = schema.field_groups?.core?.defaults || {};
  const traceDefaults = schema.field_groups?.traceability?.defaults || {};

  const filesToAudit = [];
  function collect(p) {
    if (!fs.existsSync(p)) return;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "dist" || entry === "build") continue;
        collect(path.join(p, entry));
      }
    } else if (stat.isFile() && /\.(md|markdown)$/i.test(p)) {
      filesToAudit.push(p);
    }
  }

  for (const p of paths) {
    collect(p);
  }

  const changes = [];
  const unrepairable = [];
  let checkedCount = 0;

  for (const filePath of filesToAudit) {
    checkedCount += 1;
    const resolved = path.resolve(filePath);
    let content;
    try {
      content = fs.readFileSync(resolved, "utf8");
    } catch (err) {
      unrepairable.push({ path: filePath, error: `read_error: ${err.message}` });
      continue;
    }

    const original_sha256 = createHash("sha256").update(content).digest("hex");
    const extracted = extractFrontmatter(content);

    // Case 1: missing frontmatter
    if (!extracted.present && !extracted.error) {
      const title = extractTitleFromText(content) || path.basename(filePath, path.extname(filePath));
      const lang = inferLanguage(content);
      const scaffoldData = scaffoldFrontmatter({ ...options, title, language: lang });
      const newYaml = yaml.dump(scaffoldData, { lineWidth: -1, noRefs: true });
      const newContent = `---\n${newYaml}---\n\n${content}`;
      const new_sha256 = createHash("sha256").update(newContent).digest("hex");

      changes.push({
        path: filePath,
        full_path: resolved,
        original_sha256,
        new_sha256,
        repairs: ["insert_scaffold_frontmatter"],
        before_yaml: "",
        after_yaml: newYaml,
        new_content: newContent,
      });
      continue;
    }

    // Case 2: YAML syntax error
    if (extracted.error) {
      unrepairable.push({ path: filePath, error: extracted.error });
      continue;
    }

    // Case 3: Frontmatter present and parsed
    const data = structuredClone(extracted.data);
    const repairs = [];

    // Synonyms
    if (data.licence !== undefined && data.license === undefined) {
      data.license = data.licence;
      delete data.licence;
      repairs.push("migrate_synonym:licence->license");
    }
    if (data["spdx-license-identifier"] !== undefined && data.license === undefined) {
      data.license = data["spdx-license-identifier"];
      delete data["spdx-license-identifier"];
      repairs.push("migrate_synonym:spdx-license-identifier->license");
    }
    if (data.lang !== undefined && data.language === undefined) {
      data.language = data.lang;
      delete data.lang;
      repairs.push("migrate_synonym:lang->language");
    }
    if (data.created !== undefined && data.date === undefined) {
      data.date = String(data.created).slice(0, 10);
      delete data.created;
      repairs.push("migrate_synonym:created->date");
    }
    if (data.updated !== undefined && data.last_modified_at === undefined) {
      data.last_modified_at = String(data.updated).slice(0, 10);
      delete data.updated;
      repairs.push("migrate_synonym:updated->last_modified_at");
    }
    if (data.last_updated !== undefined && data.last_modified_at === undefined) {
      data.last_modified_at = String(data.last_updated).slice(0, 10);
      delete data.last_updated;
      repairs.push("migrate_synonym:last_updated->last_modified_at");
    }
    if (data.keywords !== undefined && data.tags === undefined) {
      data.tags = data.keywords;
      delete data.keywords;
      repairs.push("migrate_synonym:keywords->tags");
    }
    if (!data.author && data.authors) {
      data.author = Array.isArray(data.authors) ? data.authors.join(", ") : String(data.authors);
      delete data.authors;
      repairs.push("migrate_synonym:authors->author");
    }

    // Deprecated fields
    for (const dep of schema.deprecated_fields || []) {
      if (data[dep] !== undefined) {
        delete data[dep];
        repairs.push(`remove_deprecated:${dep}`);
      }
    }

    // Core defaults
    if (data.license === undefined || data.license === null || data.license === "") {
      data.license = coreDefaults.license || "CC BY-SA 4.0";
      repairs.push("add_default:license");
    }
    if (data.affiliation === undefined || data.affiliation === null || data.affiliation === "") {
      data.affiliation = coreDefaults.affiliation || "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica";
      repairs.push("add_default:affiliation");
    }
    if (data.language === undefined || data.language === null || data.language === "") {
      data.language = inferLanguage(content);
      repairs.push("add_default:language");
    }
    if (data.date === undefined || data.date === null || data.date === "") {
      data.date = new Date().toISOString().slice(0, 10);
      repairs.push("add_default:date");
    }

    // Traceability defaults
    if (data.update_policy === undefined || data.update_policy === null || data.update_policy === "") {
      data.update_policy = traceDefaults.update_policy || "UP-DEFAULT-REVIEWED";
      repairs.push("add_default:update_policy");
    }
    if (data.status === undefined || data.status === null || data.status === "") {
      data.status = "working-paper";
      repairs.push("add_default:status");
    }

    // Review block
    if (data.review === undefined || data.review === null || typeof data.review !== "object" || Array.isArray(data.review)) {
      data.review = { status: "unreviewed", reviewed_by: [] };
      repairs.push("add_block:review");
    } else {
      if (data.review.review_status !== undefined && data.review.status === undefined) {
        data.review.status = data.review.review_status;
        delete data.review.review_status;
        repairs.push("migrate_field:review.review_status->review.status");
      }
      if (data.review.status === undefined || data.review.status === null || data.review.status === "") {
        data.review.status = "unreviewed";
        repairs.push("add_default:review.status");
      }
      if (data.review.reviewed_by === undefined || !Array.isArray(data.review.reviewed_by)) {
        data.review.reviewed_by = [];
        repairs.push("add_default:review.reviewed_by");
      }
    }

    // Provenance block
    if (data.provenance === undefined || data.provenance === null || typeof data.provenance !== "object" || Array.isArray(data.provenance)) {
      data.provenance = {
        origin_type: "unknown",
        origin_repository: "unknown",
        origin_ref: "unknown",
        origin_date: "unknown",
        derived_from: [],
      };
      repairs.push("add_block:provenance");
    } else {
      if (!data.provenance.origin_type) {
        data.provenance.origin_type = "unknown";
        repairs.push("add_default:provenance.origin_type");
      }
      if (!data.provenance.origin_repository) {
        data.provenance.origin_repository = "unknown";
        repairs.push("add_default:provenance.origin_repository");
      }
      if (!data.provenance.origin_ref) {
        data.provenance.origin_ref = "unknown";
        repairs.push("add_default:provenance.origin_ref");
      }
      if (!data.provenance.origin_date) {
        data.provenance.origin_date = "unknown";
        repairs.push("add_default:provenance.origin_date");
      }
      if (!Array.isArray(data.provenance.derived_from)) {
        data.provenance.derived_from = [];
        repairs.push("add_default:provenance.derived_from");
      }
    }

    if (repairs.length > 0) {
      const newYaml = yaml.dump(data, { lineWidth: -1, noRefs: true });
      const newContent = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, `---\n${newYaml}---\n\n`);
      const new_sha256 = createHash("sha256").update(newContent).digest("hex");

      changes.push({
        path: filePath,
        full_path: resolved,
        original_sha256,
        new_sha256,
        repairs,
        before_yaml: extracted.raw,
        after_yaml: newYaml,
        new_content: newContent,
      });
    }
  }

  return {
    ok: true,
    total_audited: checkedCount,
    changes_count: changes.length,
    unrepairable_count: unrepairable.length,
    changes,
    unrepairable,
  };
}

/**
 * Apply planned frontmatter repairs with preflight hash-safety checks.
 * @param {object} plan
 * @returns {object}
 */
export function applyFrontmatterRepairs(plan) {
  const preflight_failed = [];

  for (const change of plan.changes || []) {
    if (!fs.existsSync(change.full_path)) {
      preflight_failed.push({ path: change.path, error: "file_not_found" });
      continue;
    }
    const current = fs.readFileSync(change.full_path, "utf8");
    const hash = createHash("sha256").update(current).digest("hex");
    if (hash !== change.original_sha256) {
      preflight_failed.push({
        path: change.path,
        error: "hash_mismatch: file was modified concurrently",
      });
    }
  }

  if (preflight_failed.length > 0) {
    return {
      ok: false,
      applied: 0,
      preflight_failed,
    };
  }

  const appliedFiles = [];
  for (const change of plan.changes || []) {
    fs.writeFileSync(change.full_path, change.new_content, "utf8");
    appliedFiles.push(change.path);
  }

  return {
    ok: true,
    applied: appliedFiles.length,
    files: appliedFiles,
    preflight_failed: [],
  };
}

/**
 * Format repair plan report for CLI output.
 * @param {object} plan
 * @returns {string}
 */
export function formatRepairsPlan(plan) {
  const lines = [];
  lines.push(`Frontmatter repairs plan: ${plan.changes_count} file(s) to repair across ${plan.total_audited} audited.`);
  lines.push("");

  if (plan.changes_count === 0) {
    lines.push("✓ All audited documents are mechanically compliant. No repairs needed.");
    return lines.join("\n");
  }

  for (const change of plan.changes) {
    lines.push(`⚡ ${change.path}`);
    for (const r of change.repairs) {
      lines.push(`    + ${r}`);
    }
  }

  if (plan.unrepairable_count > 0) {
    lines.push("");
    lines.push(`⚠️ ${plan.unrepairable_count} file(s) have unrepairable syntax errors (manual review required):`);
    for (const u of plan.unrepairable) {
      lines.push(`    ✗ ${u.path}: ${u.error}`);
    }
  }

  lines.push("");
  lines.push("To apply these repairs safely, run:");
  lines.push("  node scripts/cogentia.js frontmatter apply --fix");

  return lines.join("\n");
}

/**
 * Format repair apply report for CLI output.
 * @param {object} result
 * @returns {string}
 */
export function formatRepairsApply(result) {
  const lines = [];
  if (result.ok) {
    lines.push(`✓ Successfully applied frontmatter repairs to ${result.applied} file(s).`);
    for (const f of result.files || []) {
      lines.push(`    ✓ ${f}`);
    }
  } else {
    lines.push("✗ Failed to apply frontmatter repairs (preflight checks failed):");
    for (const fail of result.preflight_failed || []) {
      lines.push(`    ✗ ${fail.path}: ${fail.error}`);
    }
  }
  return lines.join("\n");
}

