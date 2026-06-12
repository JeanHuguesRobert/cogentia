import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePluginManifest } from './manifest.js';

// Exported registries
export const DAEMON_PLUGIN_ROUTES = [];
export const DAEMON_PLUGINS = [];

function loadPluginManifest(full) {
  const base = full.replace(/\.js$/i, '');
  const manifestPath = `${base}.plugin.json`;
  if (!fs.existsSync(manifestPath)) return {};
  try {
    const mtxt = fs.readFileSync(manifestPath, 'utf8');
    const m = JSON.parse(mtxt);
    const v = validatePluginManifest(m);
    if (!v.ok) {
      console.error(`Invalid plugin manifest ${manifestPath}: ${v.error}`);
      return {};
    }
    return m;
  } catch (e) {
    console.error(`Error parsing plugin manifest ${manifestPath}: ${e.message}`);
    return {};
  }
}

function normalizePluginMetadata(moduleMeta, manifest, fileName, source) {
  const meta = {
    name: moduleMeta.name || manifest.name || path.basename(fileName, '.js'),
    class: moduleMeta.class || moduleMeta.type || manifest.class || manifest.type || 'generic',
    title: moduleMeta.title || manifest.title || path.basename(fileName, '.js'),
    description: moduleMeta.description || manifest.description || '',
    version: moduleMeta.version || manifest.version || '0.0.0',
    source,
    routes: moduleMeta.routes || manifest.routes || [],
    config: moduleMeta.config || manifest.config || {},
  };
  return meta;
}

export async function loadDaemonPlugins(ctx) {
  const dir = path.join(process.cwd(), 'scripts', 'daemon_plugins');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const mod = await import(pathToFileURL(full).href);
      const manifest = loadPluginManifest(full);
      const plugin = normalizePluginMetadata(mod.plugin || {}, manifest, f, full);
      DAEMON_PLUGINS.push(plugin);
      const actualRoutes = Array.isArray(mod.routes)
        ? mod.routes
        : Array.isArray(mod.plugin?.routes)
        ? mod.plugin.routes
        : [];
      for (const r of actualRoutes) {
        DAEMON_PLUGIN_ROUTES.push({ ...r, source: full, plugin: plugin.name });
      }
      if (typeof mod.register === 'function') {
        await mod.register({ ctx, register: r => DAEMON_PLUGIN_ROUTES.push({ ...r, source: full, plugin: plugin.name }) });
      }
    } catch (e) {
      console.error(`Error loading plugin ${full}: ${e.message}`);
    }
  }
  return DAEMON_PLUGINS;
}

export async function dispatchPluginRoute(req, res, ctx, url) {
  const method = (req.method || 'GET').toUpperCase();
  for (const r of DAEMON_PLUGIN_ROUTES) {
    if ((r.method || 'GET').toUpperCase() !== method) continue;
    if (r.path === url.pathname || (r.path.endsWith('*') && url.pathname.startsWith(r.path.slice(0, -1)))) {
      try {
        await r.handler(req, res, ctx, url);
        return true;
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
        return true;
      }
    }
  }
  return false;
}

export default { DAEMON_PLUGINS, DAEMON_PLUGIN_ROUTES, loadDaemonPlugins, dispatchPluginRoute };
