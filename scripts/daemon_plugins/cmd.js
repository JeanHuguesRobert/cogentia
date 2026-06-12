import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const execFileP = promisify(execFile);

export const plugin = {
  name: 'cmd',
  class: 'terminal',
  title: 'Terminal Command Runner',
  description: 'Run predefined local commands from the daemon (whitelisted).',
};

export const routes = [
  { method: 'GET', path: '/api/cmd/list', handler: listCommands },
  { method: 'GET', path: '/api/cmd/run', handler: runCommand },
];

function listCommands(req, res, ctx, url) {
  const manifest = loadManifestForPlugin();
  const cmds = (manifest && manifest.config && Array.isArray(manifest.config.commands)) ? manifest.config.commands.map(c => ({ name: c.name, cmd: c.cmd })) : [];
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: true, commands: cmds }, null, 2));
}

async function runCommand(req, res, ctx, url) {
  const name = url.searchParams.get('name');
  if (!name) return json(res, 400, { ok: false, error: 'missing_name' });
  const manifest = loadManifestForPlugin();
  const cmdEntry = manifest && manifest.config && Array.isArray(manifest.config.commands) && manifest.config.commands.find(c => c.name === name);
  if (!cmdEntry) return json(res, 404, { ok: false, error: 'unknown_command' });
  const cwd = (ctx && ctx.registryRoot) ? ctx.registryRoot : process.cwd();
  const localEnv = loadEnvFile(process.cwd());
  const userEnv = loadUserEnv(ctx);
  const env = { ...process.env, ...userEnv, ...localEnv };
  const input = url.searchParams.get('input') || null;

  // Accept cmd as array (preferred) or string (backwards-compatible)
  try {
    let file;
    let args = [];
    if (Array.isArray(cmdEntry.cmd)) {
      [file, ...args] = cmdEntry.cmd;
    } else if (typeof cmdEntry.cmd === 'string') {
      // Simple tokenizer: supports quoted args
      const parts = cmdEntry.cmd.match(/(?:[^\s"']+|"([^\"]*)"|'([^']*)')+/g) || [];
      const cleaned = parts.map(p => p.replace(/^"|"$|^'|'$/g, ''));
      [file, ...args] = cleaned;
    } else {
      return json(res, 500, { ok: false, error: 'invalid_command_entry' });
    }

    if (!file) return json(res, 500, { ok: false, error: 'invalid_command_entry' });

    file = expandEnv(file, env);
    args = args.map(arg => expandEnv(arg, env));

    const opts = { cwd, timeout: 30000, windowsHide: true, env: { ...process.env, ...env } };
    // execFile supports passing input via options in Node 18+ through 'input' in spawnSync, but execFile promisified doesn't accept 'input'.
    // For simplicity, we will run execFile and ignore stdin for now; future improvement: support POST body as stdin via spawn.
    const { stdout, stderr } = await execFileP(file, args, opts);
    return json(res, 200, { ok: true, name, cmd: cmdEntry.cmd, stdout, stderr });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message, stdout: e.stdout, stderr: e.stderr });
  }
}

function loadEnvFile(root) {
  const envPath = path.join(root, '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    env[key] = expandEnv(value, { ...process.env, ...env });
  }
  return env;
}

function loadUserEnv(ctx) {
  if (!ctx) return {};
  const username = process.env.GITHUB_ACTOR || process.env.USER || process.env.USERNAME || path.basename(process.cwd());
  const registryBase = ctx.registryRoot ? path.basename(ctx.registryRoot) : null;

  // The user profile repo is expected to be named after the GitHub account, e.g. "JeanHuguesRobert/JeanHuguesRobert".
  // We first prefer the registry root if it matches that pattern, then any registered repo whose name equals the username.
  if (ctx.registryRoot && registryBase && registryBase.toLowerCase() === username?.toLowerCase()) {
    const env = loadEnvFile(ctx.registryRoot);
    if (Object.keys(env).length) return env;
  }

  if (Array.isArray(ctx.repos)) {
    const userRepo = ctx.repos.find(repo => String(repo.name).toLowerCase() === String(username).toLowerCase());
    if (userRepo && userRepo.path) {
      const env = loadEnvFile(userRepo.path);
      if (Object.keys(env).length) return env;
    }
  }

  if (ctx.registryRoot) {
    const env = loadEnvFile(ctx.registryRoot);
    if (Object.keys(env).length) return env;
  }

  return {};
}

function expandEnv(value, env) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g, (_, braced, bare) => {
    const key = braced || bare;
    return env[key] ?? process.env[key] ?? '';
  });
}

function loadManifestForPlugin() {
  try {
    const base = path.resolve(new URL(import.meta.url).pathname).replace(/\.js$/i, '');
    const mpath = base + '.plugin.json';
    if (!fs.existsSync(mpath)) return null;
    return JSON.parse(fs.readFileSync(mpath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}
