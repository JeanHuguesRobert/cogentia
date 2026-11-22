/**
 * The browser-only Cogentigram path. The active dimension registry is the
 * source of the capture instrument; no database or provider access required.
 */
import { parseCogentiaJson } from '../../netlify/lib/parseCogentia.js'

export const LOCAL_COGENTIGRAM_KEY = 'kys_cogentigram_capture_v2'

export function buildCogentigramPrompt(document, registry) {
  if (!Array.isArray(registry?.dimensions) || registry.dimensions.length === 0) {
    throw new Error('Registre dimensionnel absent')
  }
  const marker = '\n---\n\nTu es mon agent conversationnel habituel.'
  const start = document.indexOf(marker)
  if (start < 0) throw new Error('Début du prompt de capture introuvable')
  const ids = new Set()
  const lines = registry.dimensions.map((dimension, index) => {
    const { id, name, definition } = dimension
    if (!id || !name || !definition || ids.has(id)) {
      throw new Error('Registre invalide : identifiant ou définition manquant ou répété')
    }
    ids.add(id)
    return `${index + 1}. ${id} — ${name} — ${definition}`
  })
  return [
    document.slice(start + '\n---\n\n'.length).trim(),
    '',
    'CONTRAT DIMENSIONNEL ACTIF — même statut pour toutes les dimensions',
    'Utilise la liste ci-dessous comme catalogue de dimensions à examiner. Elle',
    "n'est ni une échelle de valeur ni un classement. Pour CHACUN de ces identifiants,",
    'fournis une entrée dans indicators, même si tu dois constater son caractère',
    'inconnu (score:null, score_type:"qualitative", confidence:null,',
    'measurement:{kind:"unknown"}, evidence:""). Ne remplace pas une absence de',
    'preuve par une hypothèse. Conserve les IDs et les catégories du registre ;',
    'le rang est seulement un ordre de présentation, sans autorité épistémique.',
    'Tu peux ajouter de nouvelles dimensions réellement distinctes, de même rang',
    'conceptuel, avec de nouveaux identifiants uniques : il n’existe aucun plafond.',
    'Pour réduire la taille de sortie, limite les commentaires aux preuves réellement',
    'informatives et privilégie un unique JSON complet et valide.',
    '',
    ...lines,
  ].join('\n')
}

export function parseLocalCogentigram(response) {
  const result = parseCogentiaJson(response)
  if (result.error) throw new Error(result.error)
  return result
}

export function cogentigramCoverage(capture, registry) {
  const known = new Set(registry.dimensions.map(d => d.id))
  const indicators = capture?.indicators || []
  const present = indicators.filter(d => known.has(d.id))
  const hasObservation = d => d.measurement?.kind !== 'unknown' &&
    Boolean(d.evidence || d.measurement?.context || d.measurement?.contexts?.length ||
      d.measurement?.value !== undefined && d.measurement?.value !== null ||
      d.score != null)
  return {
    total: known.size,
    present: present.length,
    documented: present.filter(hasObservation).length,
    unknown: present.filter(d => !hasObservation(d)).length,
    missing: registry.dimensions.filter(d => !indicators.some(i => i.id === d.id)).map(d => d.id),
    emergent: indicators.filter(d => !known.has(d.id)).map(d => d.id),
  }
}

export function storeLocalCogentigram(storage, rawText) {
  const result = parseLocalCogentigram(rawText)
  storage.setItem(LOCAL_COGENTIGRAM_KEY, rawText)
  return result
}
export function restoreLocalCogentigram(storage) {
  const rawText = storage.getItem(LOCAL_COGENTIGRAM_KEY)
  return rawText == null ? null : { rawText, ...parseLocalCogentigram(rawText) }
}
export function clearLocalCogentigram(storage) {
  storage.removeItem(LOCAL_COGENTIGRAM_KEY)
}
