import fs from "node:fs";
import path from "node:path";

export function loadOptionalEnvFiles(files = []) {
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(String(file));
    if (!fs.existsSync(resolved)) continue;
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || line.trimStart().startsWith("#")) continue;
      const key = match[1];
      if (process.env[key] != null) continue;
      process.env[key] = unquoteEnvValue(match[2]);
    }
  }
}

export function unquoteEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function resolveEdgeStateDir(env = process.env) {
  const configured = String(env.EDGE_STATE_DIR || env.COGENTIA_OPS_STATE_DIR || "").trim();
  if (configured) return path.resolve(configured);
  const home = String(env.HOME || "").trim();
  if (home) return path.join(home, ".cogentia", "var", "edge");
  return path.resolve(".cogentia", "var", "edge");
}