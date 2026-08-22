/**
 * source-code-chunker.js — Type-differentiated source code chunker (Issue #109)
 *
 * Provides syntax-aware chunking for code and structured specifications:
 * - Inox (.nox)
 * - JavaScript / TypeScript (.js, .mjs, .ts)
 * - JSON / Schema (.json)
 * - YAML (.yaml, .yml)
 *
 * Includes built-in secret scanning to prevent leaking credentials into search indices.
 */

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|token|password|auth|bearer)\s*[:=]\s*['"][a-zA-Z0-9_\-.~+]{16,}['"]/i,
  /sk-[a-zA-Z0-9_-]{20,}/,
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
];

export function containsPotentialSecrets(text) {
  if (!text || typeof text !== "string") return false;
  return SECRET_PATTERNS.some(pat => pat.test(text));
}

export function detectContentKind(filePath) {
  const ext = String(filePath || "").toLowerCase();
  if (ext.endsWith(".md") || ext.endsWith(".markdown")) return "prose_markdown";
  if (ext.endsWith(".nox")) return "code_inox";
  if (ext.endsWith(".js") || ext.endsWith(".mjs") || ext.endsWith(".cjs")) return "code_javascript";
  if (ext.endsWith(".ts") || ext.endsWith(".tsx")) return "code_typescript";
  if (ext.endsWith(".json")) return "schema_json";
  if (ext.endsWith(".yaml") || ext.endsWith(".yml")) return "config_yaml";
  if (ext.endsWith(".sql")) return "query_sql";
  return "unstructured_text";
}

/**
 * Chunk Inox language files (.nox) by definitions, functions, and modules.
 */
export function chunkInoxSource(raw, fileName = "inox_module.nox") {
  if (containsPotentialSecrets(raw)) {
    return [];
  }

  const lines = String(raw || "").split(/\r?\n/);
  const chunks = [];
  let currentChunk = null;

  const closeCurrent = endLine => {
    if (!currentChunk) return;
    const text = lines.slice(currentChunk.start_line - 1, endLine).join("\n").trim();
    if (text.length >= 20) {
      chunks.push({
        ...currentChunk,
        end_line: endLine,
        text,
        content_kind: "code_inox",
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match Inox function, thing/type declaration, or module header with optional namespaces
    const match = line.match(/^\s*(?:def|fn|thing|type|module|dispatch)\s+([a-zA-Z0-9_:]+)/);
    if (match) {
      closeCurrent(i);
      currentChunk = {
        title: `${match[0].trim()} (${fileName})`,
        symbol_name: match[1],
        start_line: i + 1,
      };
    }
  }
  closeCurrent(lines.length);

  // Fallback to windowed chunking if no explicit symbol found
  if (chunks.length === 0 && raw.trim().length > 0) {
    chunks.push({
      title: fileName,
      symbol_name: null,
      start_line: 1,
      end_line: lines.length,
      text: raw.trim(),
      content_kind: "code_inox",
    });
  }

  return chunks;
}

/**
 * Chunk JavaScript / TypeScript files by exported functions, classes, and consts.
 */
export function chunkJavaScriptSource(raw, fileName = "module.js") {
  if (containsPotentialSecrets(raw)) {
    return [];
  }

  const lines = String(raw || "").split(/\r?\n/);
  const chunks = [];
  let currentChunk = null;

  const closeCurrent = endLine => {
    if (!currentChunk) return;
    const text = lines.slice(currentChunk.start_line - 1, endLine).join("\n").trim();
    if (text.length >= 20) {
      chunks.push({
        ...currentChunk,
        end_line: endLine,
        text,
        content_kind: "code_javascript",
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match export function, class, async function, or top-level export const
    const match = line.match(/^\s*(?:export\s+)?(?:async\s+)?(?:function\*?|class|const|let)\s+([a-zA-Z0-9_]+)/);
    if (match && !line.includes("require(") && !line.includes("import ")) {
      closeCurrent(i);
      currentChunk = {
        title: `${match[1]} (${fileName})`,
        symbol_name: match[1],
        start_line: i + 1,
      };
    }
  }
  closeCurrent(lines.length);

  if (chunks.length === 0 && raw.trim().length > 0) {
    chunks.push({
      title: fileName,
      symbol_name: null,
      start_line: 1,
      end_line: lines.length,
      text: raw.trim().slice(0, 3000),
      content_kind: "code_javascript",
    });
  }

  return chunks;
}

/**
 * Dispatcher for multi-format source file chunking.
 */
export function chunkSourceFile(raw, filePath) {
  const kind = detectContentKind(filePath);
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : "source";

  if (kind === "code_inox") {
    return chunkInoxSource(raw, fileName);
  }
  if (kind === "code_javascript" || kind === "code_typescript") {
    return chunkJavaScriptSource(raw, fileName);
  }

  // Generic structured text
  if (containsPotentialSecrets(raw)) return [];
  const lines = String(raw || "").split(/\r?\n/);
  return [
    {
      title: fileName,
      symbol_name: null,
      start_line: 1,
      end_line: lines.length,
      text: raw.trim().slice(0, 3000),
      content_kind: kind,
    },
  ];
}
