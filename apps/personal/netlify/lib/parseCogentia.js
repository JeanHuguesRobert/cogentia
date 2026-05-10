/**
 * netlify/lib/parseCogentia.js
 *
 * Parse, valide et normalise le JSON retourné par l'agent IA.
 */

const EXPECTED_VERSION = '1.0'
const MIN_INDICATORS   = 65  // on accepte 65 minimum (les 8 Cogentia+ sont optionnels)

/**
 * Parse le JSON brut et valide sa structure.
 * @param {string} rawJson
 * @returns {{ data: object|null, error: string|null, warnings: string[] }}
 */
export function parseCogentiaJson(rawJson) {
  const warnings = []
  let parsed

  // 1. Parse JSON
  try {
    // Nettoyage défensif : certains agents ajoutent des commentaires ou trailing commas
    const clean = rawJson
      .replace(/,\s*([}\]])/g, '$1')      // trailing commas
      .replace(/\/\/[^\n]*/g, '')          // commentaires JS
      .replace(/\/\*[\s\S]*?\*\//g, '')    // commentaires blocs
    parsed = JSON.parse(clean)
  } catch (err) {
    return { data: null, error: `JSON invalide : ${err.message}`, warnings }
  }

  // 2. Vérification version (intégrité du prompt)
  if (parsed.cogentia_version !== EXPECTED_VERSION) {
    return {
      data: null,
      error: `Version Cogentia invalide : attendu "${EXPECTED_VERSION}", reçu "${parsed.cogentia_version ?? 'absent'}"`,
      warnings,
    }
  }

  // 3. Vérification structure minimale
  if (!parsed.agent || !parsed.indicators || !Array.isArray(parsed.indicators)) {
    return { data: null, error: 'Structure JSON incomplète : champs agent ou indicators manquants', warnings }
  }

  // 4. Vérification nombre d'indicateurs
  if (parsed.indicators.length < MIN_INDICATORS) {
    return {
      data: null,
      error: `Nombre d'indicateurs insuffisant : ${parsed.indicators.length} reçus, ${MIN_INDICATORS} minimum attendus`,
      warnings,
    }
  }
  if (parsed.indicators.length > 73) {
    warnings.push(`${parsed.indicators.length} indicateurs reçus (max attendu : 73) — surplus ignoré`)
    parsed.indicators = parsed.indicators.slice(0, 73)
  }

  // 5. Normalisation et validation des scores
  const normalized = parsed.indicators.map((ind, i) => {
    const rank       = ind.rank       ?? i + 1
    const score      = validateScore(ind.score)
    const confidence = validateConfidence(ind.confidence)

    // Règle : score null si confidence < 20
    const finalScore = (confidence < 20) ? null : score

    if (ind.score !== null && finalScore === null) {
      warnings.push(`Indicateur #${rank} "${ind.name}" : score annulé (confidence ${confidence} < 20)`)
    }

    // Vérification cohérence éthique : evidence ne doit pas contenir de données identifiantes
    // (contrôle basique — la vraie garantie vient du prompt)
    const evidence = sanitizeEvidence(ind.evidence ?? '')

    return {
      rank,
      category:   ind.category ?? 'Inconnu',
      name:       ind.name     ?? `Indicateur ${rank}`,
      score:      finalScore,
      score_type: 'percentile',
      confidence,
      evidence,
    }
  })

  // 6. Vérification éthique déclarée
  if (!parsed.ethics_compliance?.confirmed_by_agent) {
    warnings.push('Conformité éthique non confirmée par l\'agent')
  }

  return {
    data: { ...parsed, indicators: normalized },
    error: null,
    warnings,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateScore(raw) {
  if (raw === null || raw === undefined) return null
  const n = Number(raw)
  if (isNaN(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

function validateConfidence(raw) {
  if (raw === null || raw === undefined) return 0
  const n = Number(raw)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

// Supprime les patterns qui ressemblent à des emails, noms propres évidents, etc.
// Garde-fou léger — la vraie protection est dans le prompt Cogentia.
function sanitizeEvidence(text) {
  return text
    .replace(/\b[A-Z][a-zA-ZÀ-ÿ]+\s[A-Z][a-zA-ZÀ-ÿ]+\b/g, '[identité masquée]') // Prénom Nom
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email masqué]')
    .trim()
}
