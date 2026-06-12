import fs from 'node:fs';

export function validatePluginManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return { ok: false, error: 'manifest_missing_or_invalid' };
  if (!manifest.name || typeof manifest.name !== 'string') return { ok: false, error: 'missing_name' };
  if (!manifest.class && !manifest.type) return { ok: true };
  if (manifest.routes && !Array.isArray(manifest.routes)) return { ok: false, error: 'routes_must_be_array' };
  if (manifest.config && manifest.config.commands) {
    if (!Array.isArray(manifest.config.commands)) return { ok: false, error: 'config.commands_must_be_array' };
    for (const c of manifest.config.commands) {
      if (!c || typeof c !== 'object' || !c.name || !c.cmd) return { ok: false, error: 'invalid_command_entry' };
    }
  }
  return { ok: true };
}

export function loadManifest(path) {
  if (!fs.existsSync(path)) return null;
  try {
    const txt = fs.readFileSync(path, 'utf8');
    const m = JSON.parse(txt);
    const v = validatePluginManifest(m);
    if (!v.ok) return { ok: false, error: v.error };
    return { ok: true, manifest: m };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default { validatePluginManifest, loadManifest };
