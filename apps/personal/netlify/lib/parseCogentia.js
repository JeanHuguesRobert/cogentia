/**
 * Cogentigram import: preserve the captured source and all first-class dimensions.
 * v1: legacy source (historically 73); v2: open dimension set with stable IDs.
 * No truncation, category whitelist or fabricated population percentiles.
 */
const SUPPORTED_VERSIONS = new Set(['1.0', '2.0'])

function asNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null
}

function decodeRaw(rawText) {
  try { return JSON.parse(rawText) } catch (firstError) {
    // Some agents format otherwise valid JSON in a markdown code fence.
    const fenced = rawText.trim().match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i)
    if (fenced) return JSON.parse(fenced[1])
    throw firstError
  }
}

export function parseCogentiaJson(input) {
  const warnings = []
  const rawText = typeof input === 'string' ? input : JSON.stringify(input)
  let source
  try {
    source = decodeRaw(rawText)
  } catch (err) {
    return { data: null, source: null, rawText, error: `JSON invalide : ${err.message}`, warnings }
  }

  const version = source?.cogentia_version
  if (!SUPPORTED_VERSIONS.has(version)) {
    return { data: null, source, rawText, error: `Version Cogentia non prise en charge : ${version ?? 'absente'}`, warnings }
  }
  const rawIndicators = Array.isArray(source.indicators) ? source.indicators : source.dimensions
  if (!source.agent || !Array.isArray(rawIndicators) || rawIndicators.length === 0) {
    return { data: null, source, rawText, error: 'Structure Cogentia incomplète : agent ou indicateurs manquants', warnings }
  }

  // A set of observations has no predefined cardinality. Version 1.0 remains
  // readable as a historical capture, without silently discarding extra fields.
  const seenIds = new Set()
  const seenRanks = new Set()
  const normalized = []
  for (const [i, indicator] of rawIndicators.entries()) {
    if (!indicator || typeof indicator !== 'object' || Array.isArray(indicator)) {
      return { data: null, source, rawText, error: `Indicateur ${i + 1} invalide`, warnings }
    }
    const rank = indicator.rank ?? i + 1
    if (!Number.isInteger(rank) || rank <= 0 || seenRanks.has(rank)) {
      return { data: null, source, rawText, error: `Rang manquant, invalide ou dupliqué : ${rank}`, warnings }
    }
    seenRanks.add(rank)
    const id = indicator.id || (version === '1.0' ? `COG-${String(rank).padStart(3, '0')}` : null)
    if (!id || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(id) || seenIds.has(id)) {
      return { data: null, source, rawText, error: `Identifiant manquant, invalide ou dupliqué : ${id}`, warnings }
    }
    seenIds.add(id)
    const confidence = asNumberOrNull(indicator.confidence)
    const score = asNumberOrNull(indicator.score)
    if (indicator.score != null && score === null) warnings.push(`Score non numérique ignoré pour ${id}`)
    const calibrated = indicator.score_type === 'population_percentile_calibrated'
    const scoreType = indicator.score_type === 'percentile'
      ? 'agent_estimate_0_100'
      : (indicator.score_type || (score === null ? 'qualitative' : 'agent_estimate_0_100'))
    if (version === '1.0' && indicator.score_type === 'percentile') {
      warnings.push('Captures v1 : les « percentiles » sont des estimations non étalonnées.')
    }
    if (calibrated && !indicator.calibration) {
      return { data: null, source, rawText, error: `Étalonnage manquant pour ${id}`, warnings }
    }
    normalized.push({
      ...indicator, // Preserve open, contextual and non-projected properties.
      id, rank,
      category: indicator.category || 'Unclassified',
      name: indicator.name || id,
      score: score !== null && version === '1.0' && confidence !== null && confidence < 20 ? null : score,
      score_type: scoreType,
      confidence,
      evidence: indicator.evidence ?? '',
      measurement: indicator.measurement || (score === null
        ? { kind: 'qualitative', numeric_score_unavailable: true }
        : { kind: scoreType, value: score, calibrated_population_percentile: calibrated }),
    })
  }
  const data = { ...source, indicators: normalized }
  return { data, source, rawText, error: null, warnings: [...new Set(warnings)] }
}
