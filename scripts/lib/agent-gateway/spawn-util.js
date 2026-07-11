import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { spawnHeadless } from "../spawn-headless.js";

/** Resolve spawn invocation — Windows npm globals use native .exe or node + .js, not fragile .cmd shims. */
export function resolveSpawnSpec(spec) {
  const args = spec.args || [];
  if (process.platform !== "win32") {
    return { command: spec.command, args, shell: false };
  }

  if (/\.(exe|js)$/i.test(spec.command) && fs.existsSync(spec.command)) {
    return { command: spec.command, args, shell: false };
  }

  const npm = resolveWindowsNpmShim(spec.command);
  if (npm) {
    return { command: npm.command, args: [...npm.argsPrefix, ...args], shell: false };
  }

  let exePath = null;
  let cmdPath = null;
  try {
    const hits = execFileSync("where.exe", [spec.command], { encoding: "utf8", windowsHide: true })
      .trim()
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    exePath = hits.find(h => /\.exe$/i.test(h) && h.toLowerCase().includes(`${spec.command.toLowerCase()}.exe`))
      || hits.find(h => /\\bin\\.*\.exe$/i.test(h))
      || hits.find(h => /\.exe$/i.test(h));
    cmdPath = hits.find(h => /\.cmd$/i.test(h));
  } catch {
    exePath = null;
    cmdPath = null;
  }

  if (exePath && fs.existsSync(exePath)) {
    return { command: exePath, args, shell: false };
  }

  if (cmdPath && fs.existsSync(cmdPath)) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/c", cmdPath, ...args],
      shell: false,
    };
  }

  return { command: spec.command, args, shell: false };
}

function resolveWindowsNpmShim(name) {
  const roots = [
    path.dirname(process.execPath),
    path.join(process.env.APPDATA || "", "npm"),
  ].filter(Boolean);

  for (const root of roots) {
    if (name === "claude") {
      const exe = path.join(root, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
      if (fs.existsSync(exe)) return { command: exe, argsPrefix: [] };
    }
    if (name === "codex") {
      const js = path.join(root, "node_modules", "@openai", "codex", "bin", "codex.js");
      if (fs.existsSync(js)) return { command: process.execPath, argsPrefix: [js] };
    }
  }
  return null;
}

export function spawnResolved(spec, options = {}) {
  const resolved = resolveSpawnSpec(spec);
  return spawnHeadless(resolved.command, resolved.args, {
    cwd: options.cwd,
    env: options.env || process.env,
    shell: resolved.shell,
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
  });
}