/**
 * scripts/lib/frontmatter-validator.js
 *
 * Modular, schema-driven frontmatter validator for Cogentia documents.
 * Consumes the canonical schema at docs/frontmatter-schema.v0.1.json.
 * Part of Issue #163 (and Living Frontmatter #159).
 */

import fs from "node:fs";
import path from "node:path";
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
