import fs from 'node:fs';
import path from 'node:path';
import * as jsYaml from 'js-yaml';

const PROFILE_SCHEMA = 'living-book-press.profile/v1';

function normalizeProfile(raw, sourcePath) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Expected a YAML mapping in ${sourcePath}`);
  }
  if (raw.schema !== PROFILE_SCHEMA) {
    throw new Error(`Unsupported profile schema in ${sourcePath}: ${raw.schema || '(missing)'}`);
  }

  const id = String(raw.book_id ?? raw.id ?? '').trim();
  const prefix = String(raw.prefix ?? '').trim();
  const title = String(raw.title ?? '').trim();
  if (!id || !prefix || !title) {
    throw new Error(`Profile in ${sourcePath} requires book_id, prefix, and title`);
  }

  const sourceEditions = raw.editions ?? {};
  if (typeof sourceEditions !== 'object' || Array.isArray(sourceEditions)) {
    throw new Error(`Profile editions must be a mapping in ${sourcePath}`);
  }
  const sourceMaterialProfiles = raw.material_profiles ?? { accessible: {} };
  if (!sourceMaterialProfiles || typeof sourceMaterialProfiles !== 'object' || Array.isArray(sourceMaterialProfiles)) {
    throw new Error(`Profile material_profiles must be a mapping in ${sourcePath}`);
  }
  const sourceFormats = raw.supported_formats ?? (raw.print?.format ? [String(raw.print.format)] : ['A4', 'A5']);
  if (!Array.isArray(sourceFormats) || sourceFormats.some(format => typeof format !== 'string')) {
    throw new Error(`Profile supported_formats must be a list of strings in ${sourcePath}`);
  }
  const editions = Object.fromEntries(Object.entries(sourceEditions).map(([key, edition]) => {
    if (!edition || typeof edition !== 'object' || Array.isArray(edition)) {
      throw new Error(`Edition ${key} must be a mapping in ${sourcePath}`);
    }
    return [key, {
      ...edition,
      id: String(edition.id ?? key),
      name: String(edition.name ?? edition.title ?? key),
      commit: edition.commit ? String(edition.commit) : null,
      manifest_ref: edition.manifest_ref ? String(edition.manifest_ref) : null,
      freeze_date: edition.freeze_date ? String(edition.freeze_date) : null
    }];
  }));

  return {
    ...raw,
    id,
    prefix,
    title,
    subtitle: String(raw.subtitle ?? ''),
    repository: raw.repository ? String(raw.repository) : null,
    editions,
    defaultEdition: raw.default_edition ? String(raw.default_edition) : null,
    verificationBaseUrl: raw.verification_base_url ? String(raw.verification_base_url) : null,
    supportedFormats: sourceFormats.map(format => format.toUpperCase()),
    supportedMaterialProfiles: Object.keys(sourceMaterialProfiles),
    singularizationDefault: raw.singularization_default || 'singulier',
    print: raw.print && typeof raw.print === 'object' ? raw.print : {},
    sourcePath
  };
}

/** Load canonical Living Book Press YAML profiles below a repository's projects directory. */
export function loadProfilesFromRepository(repositoryRoot) {
  const projectsDir = path.join(path.resolve(repositoryRoot), 'projects');
  if (!fs.existsSync(projectsDir)) return [];

  return fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(projectsDir, entry.name, 'press', 'profile.yml'))
    .filter(profilePath => fs.existsSync(profilePath))
    .sort((a, b) => a.localeCompare(b))
    .map(profilePath => {
      let raw;
      try {
        raw = jsYaml.load(fs.readFileSync(profilePath, 'utf8'));
      } catch (error) {
        throw new Error(`Could not parse ${profilePath}: ${error.message}`);
      }
      return normalizeProfile(raw, profilePath);
    });
}
