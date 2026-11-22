/**
 * KYS subject corrections: immutable captured bytes + append-only local annotations.
 * These records remain exclusively inside the browser until the subject exports them.
 * No subject correction is allowed to rewrite the habitual agent's original response.
 */
import { parseLocalCogentigram } from './cogentigram-open.js'

export const ANNOTATIONS_KEY = 'kys_cogentigram_subject_annotations_v1'
const ANNOTATIONS_SCHEMA = 'kys.subject_annotations.v1'
const DECISIONS = new Set(['accepted', 'contested', 'corrected', 'uncertain'])

export async function fingerprintRawCapture(rawText) {
  if (typeof rawText !== 'string' || !rawText.length) {
    throw new Error('Capture originale absente')
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('Empreinte cryptographique indisponible dans ce navigateur')
  }
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(rawText),
  )
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('')
}

function readRecord(storage) {
  const json = storage.getItem(ANNOTATIONS_KEY)
  if (json === null) return { schema: ANNOTATIONS_SCHEMA, events: [] }
  const record = JSON.parse(json)
  if (record?.schema !== ANNOTATIONS_SCHEMA || !Array.isArray(record.events)) {
    throw new Error("Format d'annotations inconnu : aucune correction ne sera écrasée")
  }
  return record
}

export async function readLocalAnnotations(storage, rawText) {
  const sha256 = await fingerprintRawCapture(rawText)
  return readRecord(storage).events.filter(event => event.original_sha256 === sha256)
}

export async function appendLocalAnnotation(storage, rawText, annotation) {
  const parsed = parseLocalCogentigram(rawText).data
  const { dimension_id, decision } = annotation || {}
  const note = typeof annotation?.note === 'string' ? annotation.note.trim() : ''
  if (!parsed.indicators.some(item => item.id === dimension_id)) {
    throw new Error('Dimension absente de cette capture')
  }
  if (!DECISIONS.has(decision)) throw new Error('Décision de correction invalide')
  if (decision !== 'accepted' && !note) {
    throw new Error('Une contestation ou correction doit être explicitée')
  }
  const original_sha256 = await fingerprintRawCapture(rawText)
  const record = readRecord(storage)
  const event = {
    schema: ANNOTATIONS_SCHEMA,
    event_id: globalThis.crypto.randomUUID(),
    recorded_at: new Date().toISOString(),
    actor: 'subject',
    provenance: 'direct_subject_annotation',
    original_sha256,
    dimension_id,
    decision,
    note,
  }
  // Existing events are never edited or discarded by a new annotation.
  storage.setItem(ANNOTATIONS_KEY, JSON.stringify({
    schema: ANNOTATIONS_SCHEMA,
    events: [...record.events, event],
  }))
  return event
}

export async function exportAnnotatedCapture(storage, rawText) {
  parseLocalCogentigram(rawText) // fail before exporting an invalid source
  return {
    schema: 'kys.raw_measurement_and_annotations.v1',
    raw_measurement: {
      exact_text: rawText,
      sha256: await fingerprintRawCapture(rawText),
    },
    annotations: await readLocalAnnotations(storage, rawText),
    rights: {
      local_only: true,
      public_disclosure: false,
      subsequent_use_requires_subject_permission: true,
    },
  }
}

/** Optional exact capture restricts deletion to that capture's annotations. */
export async function clearLocalAnnotations(storage, rawText = null) {
  if (rawText === null) {
    storage.removeItem(ANNOTATIONS_KEY)
    return
  }
  const fingerprint = await fingerprintRawCapture(rawText)
  const record = readRecord(storage)
  const remaining = record.events.filter(item => item.original_sha256 !== fingerprint)
  if (remaining.length === 0) storage.removeItem(ANNOTATIONS_KEY)
  else storage.setItem(ANNOTATIONS_KEY, JSON.stringify({ ...record, events: remaining }))
}
