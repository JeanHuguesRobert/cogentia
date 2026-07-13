import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function splitPaths(value) {
  if (!value) return [];
  return String(value).split(path.delimiter).map(s => s.trim()).filter(Boolean);
}

function detectPlatform() {
  if (process.platform === "win32") return "windows";
  const prefix = process.env.PREFIX || "";
  if (prefix.includes("com.termux")) return "termux";
  return "linux";
}

export function loadHostContext(env = process.env) {
  const home = os.homedir();
  const platform = detectPlatform();
  const defaultRoots = platform === "termux"
    ? [path.join(home, "srv", "cogentia", "repos")]
    : platform === "windows"
      ? [path.join(home, "srv", "cogentia", "repos"), "C:\\tweesic"]
      : [path.join(home, "srv", "cogentia", "repos"), "/srv/cogentia/repos"];

  const rawRoots = String(env.AGENT_GATEWAY_REPO_ROOTS || "").trim();
  const repoRoots = rawRoots
    ? rawRoots.split(/[;,]/).map(s => s.trim()).filter(Boolean).map(p => path.resolve(p))
    : [];

  const roots = repoRoots.length ? repoRoots : defaultRoots.map(p => path.resolve(p));
  const existingRoots = roots.filter(p => fs.existsSync(p));

  const pathExtra = splitPaths(env.AGENT_GATEWAY_PATH_EXTRA);
  if (platform === "termux") {
    pathExtra.push(path.join(home, ".local", "bin"), path.join(home, ".grok", "bin"));
  } else if (platform === "windows") {
    pathExtra.push(path.join(home, ".grok", "bin"));
  }

  const termuxProot = platform === "termux";

  return {
    hostname: os.hostname(),
    platform,
    home,
    termuxProot,
    pathExtra: [...new Set(pathExtra)],
    repoRoots: existingRoots.length ? existingRoots : roots,
    defaultCwd: path.resolve(env.AGENT_GATEWAY_DEFAULT_CWD || existingRoots[0] || process.cwd()),
    allowAnyCwd: env.AGENT_GATEWAY_ALLOW_ANY_CWD === "1",
    grokCommand: env.AGENT_GATEWAY_GROK_COMMAND || "grok",
    grokOutputFormat: env.AGENT_GATEWAY_GROK_OUTPUT_FORMAT || "streaming-json",
    claudeCommand: env.AGENT_GATEWAY_CLAUDE_COMMAND || (termuxProot ? "agent-claude" : "claude"),
    claudeOutputFormat: env.AGENT_GATEWAY_CLAUDE_OUTPUT_FORMAT || "stream-json",
    codexCommand: env.AGENT_GATEWAY_CODEX_COMMAND || (termuxProot ? "agent-codex" : "codex"),
    agyCommand: env.AGENT_GATEWAY_AGY_COMMAND || "agy",
    agySkipPermissions: env.AGENT_GATEWAY_AGY_SKIP_PERMISSIONS === "1",
    maxConcurrent: Number(env.AGENT_GATEWAY_MAX_CONCURRENT || (termuxProot ? 2 : 4)),
    includeThoughts: env.AGENT_GATEWAY_INCLUDE_THOUGHTS === "1",
    replBootstrapTimeoutMs: Number(env.AGENT_GATEWAY_REPL_BOOTSTRAP_TIMEOUT_MS || 120_000),
    replTurnTimeoutMs: Number(env.AGENT_GATEWAY_REPL_TURN_TIMEOUT_MS || 180_000),
    pythonCommand: env.AGENT_GATEWAY_PYTHON_COMMAND || "python",
    nodejsCommand: env.AGENT_GATEWAY_NODEJS_COMMAND || "node",
    inoxCommand: env.AGENT_GATEWAY_INOX_COMMAND || "inox",
    inoxCommandArgs: splitPaths(env.AGENT_GATEWAY_INOX_COMMAND_ARGS || ""),
    shellCommand: env.AGENT_GATEWAY_SHELL_COMMAND || (detectPlatform() === "windows" ? "pwsh" : "bash"),
    shellMode: env.AGENT_GATEWAY_SHELL_MODE || "fixture",
    sqliteCommand: env.AGENT_GATEWAY_SQLITE_COMMAND || "sqlite3",
    sqliteDatabase: env.AGENT_GATEWAY_SQLITE_DATABASE || ":memory:",
    psqlCommand: env.AGENT_GATEWAY_PSQL_COMMAND || "psql",
    psqlDatabase: env.AGENT_GATEWAY_PSQL_DATABASE || "postgres",
    psqlArgsEnv: env.AGENT_GATEWAY_PSQL_ARGS || "",
    ipythonCommand: env.AGENT_GATEWAY_IPYTHON_COMMAND || (detectPlatform() === "windows" ? "python" : "python3"),
    ipythonArgsPrefix: env.AGENT_GATEWAY_IPYTHON_ARGS_PREFIX
      ? String(env.AGENT_GATEWAY_IPYTHON_ARGS_PREFIX).split(/\s+/).filter(Boolean)
      : ["-m", "IPython"],
  };
}

export function buildChildEnv(ctx) {
  const env = { ...process.env };
  const extra = ctx.pathExtra.join(path.delimiter);
  env.PATH = extra ? `${extra}${path.delimiter}${env.PATH || ""}` : env.PATH;
  return env;
}
