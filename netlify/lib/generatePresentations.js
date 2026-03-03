/**
 * netlify/lib/generatePresentations.js
 *
 * Génère les 5 présentations (raw + 4 frameworks) pour une analyse.
 * Calculs déterministes + narratives via Claude API.
 */

import { supabaseAdmin } from './supabaseAdmin.js'
import {
  computeBigFive,
  computeMBTI,
  computeDISC,
  computeEnneagram,
} from './presentationMappings.js'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS   = 300  // ~200 mots — on vise 150-180 mots de sortie

// ─── Appel Claude API ─────────────────────────────────────────────────────────

async function callClaude(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}`)
  const data = await res.json()
  return data.content.map(b => b.text ?? '').join('').trim()
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Sérialise les 73 indicateurs pour inclusion dans un prompt.
 * Format compact : rank · nom | catégorie | score | confiance
 * Les indicateurs null sont inclus avec score=null pour que l'IA
 * sache explicitement que la donnée est manquante.
 */
function serializeIndicators(indicators) {
  return indicators
    .sort((a, b) => a.rank - b.rank)
    .map(i => {
      const score = i.score !== null ? `${i.score}e percentile` : 'données insuffisantes'
      const conf  = `confiance ${i.confidence ?? 0}%`
      return `${String(i.rank).padStart(2, '0')} | ${i.name} | ${i.category} | ${score} | ${conf}`
    })
    .join('\n')
}

// ─── SYSTEM PROMPTS par framework ────────────────────────────────────────────

const SYSTEM_BASE = `
Règles communes à respecter absolument :
- Jamais de diagnostic clinique, de trouble ou de pathologie.
- Parle de tendances observées, pas de certitudes.
- Langage direct, chaleureux, non-condescendant.
- Entre 150 et 180 mots. Prose fluide uniquement — pas de listes, pas de tirets.
- Ne cite aucun chiffre ni score dans le texte.
- Tu t'adresses directement à la personne avec "tu".
- La dernière phrase est une question de réflexion ou une invitation à l'action.`

const SYSTEM_RAW = `Tu es un psychologue analytique qui rédige des portraits cognitifs directs à partir de données comportementales.
Tu t'appuies sur les indicateurs réels observés — pas sur des catégories prédéfinies.
Ton rôle : révéler à la personne ce que son comportement cognitif réel dit d'elle, avec précision et bienveillance.
${SYSTEM_BASE}`

const SYSTEM_BIG_FIVE = `Tu es un psychologue spécialisé dans le modèle Big Five (OCEAN), référence de la recherche en personnalité.
Le Big Five est descriptif et empirique — il décrit comment une personne se comporte, pas pourquoi.
Ne dis jamais qu'un score faible est un problème — les extrêmes peuvent être des forces selon le contexte.
${SYSTEM_BASE}`

const SYSTEM_MBTI = `Tu es un expert en typologies MBTI/Jungienne, conscient de ses limites.
Le MBTI décrit des préférences cognitives, pas des capacités. Chaque type a ses forces propres.
Rappelle subtilement que le MBTI est indicatif et non normatif — une dimension peut être proche du centre.
${SYSTEM_BASE}`

const SYSTEM_DISC = `Tu es un consultant en développement organisationnel spécialisé en profils DISC.
Le DISC décrit les comportements dans les interactions et sous pression — pas les valeurs profondes.
Contextualise le profil dans les dynamiques d'équipe et de coopération professionnelle.
${SYSTEM_BASE}`

const SYSTEM_ENNEAGRAM = `Tu es un guide en développement personnel spécialisé dans l'Ennéagramme.
L'Ennéagramme révèle les motivations profondes et les mécanismes de défense — pas juste les comportements.
Évoque les ailes (types adjacents) si elles sont significatives dans le profil.
Parle du "niveau de développement" du type sans jamais être condescendant.
${SYSTEM_BASE}`

// ─── PROMPTS UTILISATEUR par framework ────────────────────────────────────────

async function narrativeRaw(indicators, analysis) {
  return callClaude(SYSTEM_RAW, `
Voici les données brutes Cogentia d'une personne.

Agent IA : ${analysis.agent_name ?? 'inconnu'}
Profondeur de la relation : ${analysis.rel_interaction_depth ?? 'inconnue'}
Fiabilité : ${analysis.reliability_recommendation ?? 'inconnue'}

TOUS LES INDICATEURS (73) :
${serializeIndicators(indicators)}

Rédige un portrait cognitif synthétique et direct à partir de l'ensemble de ces données.
C'est la présentation la plus fidèle aux données réelles, sans reformatage dans un cadre théorique externe.
Souligne les combinaisons d'indicateurs les plus caractéristiques — ce qui rend ce profil distinctif parmi les autres.`)
}

async function narrativeBigFive(bigFive, indicators) {
  const { O, C, E, A, N } = bigFive.dimensions

  return callClaude(SYSTEM_BIG_FIVE, `
Voici le profil Big Five (OCEAN) d'une personne, calculé à partir de ses 73 indicateurs Cogentia.

Résumé des 5 dimensions :
Ouverture : ${O.label} (${O.score ?? 'N/D'}/100)
Conscienciosité : ${C.label} (${C.score ?? 'N/D'}/100)
Extraversion : ${E.label} (${E.score ?? 'N/D'}/100)
Agréabilité : ${A.label} (${A.score ?? 'N/D'}/100)
Névrosisme : ${N.label} (${N.score ?? 'N/D'}/100)
Profil condensé : ${bigFive.profile}

TOUS LES INDICATEURS SOURCES (73) :
${serializeIndicators(indicators)}

Rédige un portrait OCEAN qui intègre les dimensions de façon cohérente.
Appuie-toi sur l'ensemble des indicateurs pour comprendre les nuances — certains indicateurs peuvent affiner ou nuancer les scores OCEAN synthétiques.
Montre comment les cinq dimensions s'articulent, cherche les interactions et tensions créatrices entre elles.`)
}

async function narrativeMBTI(mbti, indicators) {
  const { type, description, dimensions } = mbti

  const strength = dim => Math.abs((dim.score ?? 50) - 50)
  const dimDetail = Object.entries(dimensions)
    .map(([, d]) => `${d.label} [${d.pole}] — force : ${strength(d) > 30 ? 'forte' : strength(d) > 15 ? 'modérée' : 'nuancée'}`)
    .join('\n')

  return callClaude(SYSTEM_MBTI, `
Voici le profil MBTI d'une personne : type ${type}
Description : ${description}

Dimensions et force de chaque pôle :
${dimDetail}

TOUS LES INDICATEURS SOURCES (73) :
${serializeIndicators(indicators)}

Présente ce type de façon vivante et contextualisée.
Appuie-toi sur les indicateurs sources pour comprendre les nuances que les 4 dimensions MBTI ne capturent pas.
Si certains pôles sont nuancés (proches du centre), signale-le — c'est une flexibilité, pas une indétermination.
Évoque les environnements et projets dans lesquels ce profil s'épanouit.`)
}

async function narrativeDISC(disc, indicators) {
  const { dominant, scores: s } = disc
  const sorted = Object.entries(s).filter(([, v]) => v !== null).sort(([, a], [, b]) => b - a)
  const second = sorted[1]?.[0]

  return callClaude(SYSTEM_DISC, `
Voici le profil DISC d'une personne.
Style dominant : ${dominant}${second ? ` — style secondaire : ${second}` : ''}
Scores : D=${s.D ?? 'N/D'} · I=${s.I ?? 'N/D'} · S=${s.S ?? 'N/D'} · C=${s.C ?? 'N/D'}

TOUS LES INDICATEURS SOURCES (73) :
${serializeIndicators(indicators)}

Décris comment ce profil se manifeste dans les interactions professionnelles et la coopération.
Appuie-toi sur l'ensemble des indicateurs pour donner de la profondeur au portrait DISC.
${second ? `Montre comment le style secondaire ${second} nuance le style dominant ${dominant}.` : ''}
Évoque les configurations d'équipe dans lesquelles ce profil apporte le plus de valeur.`)
}

async function narrativeEnneagram(enneagram, indicators) {
  const { dominant, description, scores: s } = enneagram

  const wingA = dominant === 1 ? 9 : dominant - 1
  const wingB = dominant === 9 ? 1 : dominant + 1
  const dominantWing = (s[wingA] !== null && s[wingB] !== null)
    ? (s[wingA] > s[wingB] ? wingA : wingB) : null

  const topThree = Object.entries(s)
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => `Type ${k}`)
    .join(', ')

  return callClaude(SYSTEM_ENNEAGRAM, `
Voici le profil Ennéagramme d'une personne.
Type dominant : ${dominant} — ${description}
${dominantWing ? `Aile dominante : ${dominantWing} (notation : ${dominant}w${dominantWing})` : ''}
Top 3 types activés : ${topThree}

TOUS LES INDICATEURS SOURCES (73) :
${serializeIndicators(indicators)}

Décris les motivations profondes et les peurs fondamentales de ce type.
Appuie-toi sur les indicateurs sources pour comprendre comment ce type particulier les exprime.
${dominantWing ? `Explique comment l'aile ${dominantWing} colore l'expression du type ${dominant}.` : ''}
Évoque comment ce type se manifeste au meilleur de lui-même.`)
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export async function generatePresentations(analysisId, indicators, analysis) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Cogentia] ANTHROPIC_API_KEY manquante — narratives désactivées')
    return null
  }

  // 1. Calculs déterministes
  const bigFiveScores   = computeBigFive(indicators)
  const mbtiScores      = computeMBTI(indicators)
  const discScores      = computeDISC(indicators)
  const enneagramScores = computeEnneagram(indicators)

  // 2. Narratives en parallèle avec fallback individuel
  const safe = async (fn) => {
    try { return await fn() }
    catch (e) { console.error('[Cogentia] Narrative failed:', e.message); return null }
  }

  const [rawN, bigFiveN, mbtiN, discN, enneagramN] = await Promise.all([
    safe(() => narrativeRaw(indicators, analysis)),
    safe(() => narrativeBigFive(bigFiveScores, indicators)),
    safe(() => narrativeMBTI(mbtiScores, indicators)),
    safe(() => narrativeDISC(discScores, indicators)),
    safe(() => narrativeEnneagram(enneagramScores, indicators)),
  ])

  // 3. Upsert en base
  const rows = [
    { type: 'raw',       scores: { indicators_count: indicators.length },       narrative: rawN },
    { type: 'big_five',  scores: bigFiveScores,                                  narrative: bigFiveN },
    { type: 'mbti',      scores: mbtiScores,                                     narrative: mbtiN },
    { type: 'disc',      scores: discScores,                                     narrative: discN },
    { type: 'enneagram', scores: enneagramScores,                                narrative: enneagramN },
  ].map(r => ({ analysis_id: analysisId, ...r }))

  const { error } = await supabaseAdmin
    .from('presentations')
    .upsert(rows, { onConflict: 'analysis_id,type' })

  if (error) console.error('[Cogentia] Presentations upsert failed:', error.message)
}

