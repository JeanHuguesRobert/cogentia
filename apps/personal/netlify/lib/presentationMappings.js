/**
 * netlify/lib/presentationMappings.js
 *
 * Calculs déterministes : 73 indicateurs Cogentia → frameworks psychométriques.
 * Aucun LLM ici — que des formules de transformation pondérées.
 *
 * Principe de pondération :
 *   score_final = Σ(score_i × poids_i × confidence_i/100) / Σ(poids_i × confidence_i/100)
 * Si confidence < 20, l'indicateur est ignoré (score null).
 */

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Construit un score agrégé pondéré à partir d'une liste de composantes.
 * @param {Array} indicators - tableau des 73 indicateurs {rank, score, confidence}
 * @param {Array} components - [{ rank, weight, invert? }]
 * @returns {number|null} percentile 0–100 ou null si données insuffisantes
 */
function weightedScore(indicators, components) {
  const byRank = Object.fromEntries(indicators.map(i => [i.rank, i]))
  let sumWeighted = 0
  let sumWeights  = 0

  for (const { rank, weight, invert } of components) {
    const ind = byRank[rank]
    if (!ind || ind.score === null || ind.confidence < 20) continue
    const s  = invert ? 100 - ind.score : ind.score
    const w  = weight * (ind.confidence / 100)
    sumWeighted += s * w
    sumWeights  += w
  }

  if (sumWeights === 0) return null
  return Math.round(sumWeighted / sumWeights)
}

// ─── BIG FIVE (OCEAN) ─────────────────────────────────────────────────────────

export function computeBigFive(indicators) {
  const O = weightedScore(indicators, [
    { rank: 66, weight: 3 },   // Curiosité Épistémique
    { rank: 67, weight: 3 },   // Créativité Divergente
    { rank: 13, weight: 2 },   // Capacité d'Abstraction
    { rank: 20, weight: 2 },   // Raisonnement Abductif
    { rank: 53, weight: 1.5 }, // Résonance Systémique
    { rank: 17, weight: 1 },   // Spatialisation Mentale
    { rank: 44, weight: 1 },   // Tolérance Ambiguïté
  ])

  const C = weightedScore(indicators, [
    { rank: 12, weight: 3 },   // Pensée Algorithmique
    { rank: 11, weight: 2.5 }, // Rigueur Définitionnelle
    { rank: 69, weight: 2 },   // Perfectionnisme Fonctionnel
    { rank: 45, weight: 2 },   // Priorité Processus
    { rank: 18, weight: 1.5 }, // Vigilance Cognitive
    { rank: 15, weight: 1 },   // Attention Sélective
    { rank: 42, weight: 1 },   // Rectitude Intellectuelle
  ])

  const E = weightedScore(indicators, [
    { rank: 22, weight: 3 },         // Empathie Affective
    { rank: 32, weight: 2.5 },       // Flexibilité Sociale
    { rank: 27, weight: 2 },         // Caméléonisme Technique
    { rank: 28, weight: 2, invert: true }, // Neutralité Relationnelle (inversé)
    { rank: 31, weight: 1.5, invert: true }, // Coopération Logique (inversé — coopération logique ≠ extraversion)
    { rank: 29, weight: 1 },         // Décodage de l'Implicite
  ])

  const A = weightedScore(indicators, [
    { rank: 22, weight: 2.5 },       // Empathie Affective
    { rank: 21, weight: 2 },         // Empathie Cognitive
    { rank: 31, weight: 2 },         // Coopération Logique
    { rank: 47, weight: 1.5 },       // Consistance Morale
    { rank: 30, weight: 1.5, invert: true }, // Assertivité Neutre (légèrement inversé)
    { rank: 26, weight: 1 },         // Résilience Hallucinatoire
  ])

  const N = weightedScore(indicators, [
    { rank: 72, weight: 3, invert: true }, // Régulation Émotionnelle (inversé)
    { rank: 48, weight: 2.5 },             // Friction Cognitive
    { rank: 49, weight: 2 },               // Entropie de Récupération
    { rank: 57, weight: 2 },               // Surcharge Logique
    { rank: 55, weight: 1.5 },             // Gradient de Dégradation
    { rank: 5,  weight: 1 },               // Seuil de Saturation
  ])

  // Interprétation qualitative
  const label = (s, low, mid, high) =>
    s === null ? 'N/D' : s >= high ? 'Élevé' : s >= mid ? 'Modéré' : 'Faible'

  return {
    dimensions: {
      O: { score: O, label: label(O, 35, 65, 75), name: 'Ouverture' },
      C: { score: C, label: label(C, 35, 65, 75), name: 'Conscienciosité' },
      E: { score: E, label: label(E, 35, 65, 75), name: 'Extraversion' },
      A: { score: A, label: label(A, 35, 65, 75), name: 'Agréabilité' },
      N: { score: N, label: label(N, 35, 65, 75), name: 'Névrosisme' },
    },
    // Profil condensé ex: "O+++ C++ E- A+ N-"
    profile: [
      O !== null ? `O${O >= 75 ? '+++' : O >= 60 ? '++' : O >= 45 ? '+' : O >= 35 ? '~' : '-'}` : 'O?',
      C !== null ? `C${C >= 75 ? '+++' : C >= 60 ? '++' : C >= 45 ? '+' : C >= 35 ? '~' : '-'}` : 'C?',
      E !== null ? `E${E >= 75 ? '+++' : E >= 60 ? '++' : E >= 45 ? '+' : E >= 35 ? '~' : '-'}` : 'E?',
      A !== null ? `A${A >= 75 ? '+++' : A >= 60 ? '++' : A >= 45 ? '+' : A >= 35 ? '~' : '-'}` : 'A?',
      N !== null ? `N${N >= 75 ? '+++' : N >= 60 ? '++' : N >= 45 ? '+' : N >= 35 ? '~' : '-'}` : 'N?',
    ].join(' '),
  }
}

// ─── MBTI ─────────────────────────────────────────────────────────────────────

export function computeMBTI(indicators) {
  // Chaque dimension : score > 50 → premier pôle, score < 50 → second pôle

  // I vs E (score élevé = Introverti)
  const IE = weightedScore(indicators, [
    { rank: 28, weight: 3 },         // Neutralité Relationnelle → I
    { rank: 22, weight: 2.5, invert: true }, // Empathie Affective → E si élevé
    { rank: 32, weight: 2, invert: true },   // Flexibilité Sociale → E si élevé
    { rank: 52, weight: 2 },         // Auto-Génération de Cadre → I
    { rank: 58, weight: 1.5 },       // Agentivité Cognitive → I
    { rank: 56, weight: 1, invert: true },   // Indice de Camouflage → masquage I→E
  ])

  // N vs S (score élevé = iNtuitif)
  const NS = weightedScore(indicators, [
    { rank: 13, weight: 3 },   // Capacité d'Abstraction → N
    { rank: 53, weight: 2.5 }, // Résonance Systémique → N
    { rank: 20, weight: 2 },   // Raisonnement Abductif → N
    { rank: 66, weight: 2 },   // Curiosité Épistémique → N
    { rank: 3,  weight: 2, invert: true }, // Ratio Bottom-up → S si élevé
    { rank: 10, weight: 1.5, invert: true }, // Précision Analytique → S
    { rank: 17, weight: 1.5 }, // Spatialisation Mentale → N
  ])

  // T vs F (score élevé = Thinking)
  const TF = weightedScore(indicators, [
    { rank: 1,  weight: 3 },         // Logique Déductive → T
    { rank: 21, weight: 2.5 },       // Empathie Cognitive → T (logique des états mentaux)
    { rank: 11, weight: 2 },         // Rigueur Définitionnelle → T
    { rank: 22, weight: 2, invert: true }, // Empathie Affective → F si élevé
    { rank: 36, weight: 1.5 },       // Index de Littéralité → T
    { rank: 16, weight: 1.5 },       // Évaluation Probabiliste → T
    { rank: 47, weight: 1, invert: true }, // Consistance Morale → F si très élevé
  ])

  // J vs P (score élevé = Jugement/Organisation)
  const JP = weightedScore(indicators, [
    { rank: 12, weight: 3 },         // Pensée Algorithmique → J
    { rank: 11, weight: 2.5 },       // Rigueur Définitionnelle → J
    { rank: 44, weight: 2, invert: true }, // Tolérance Ambiguïté → P si élevé
    { rank: 45, weight: 2 },         // Priorité Processus → J
    { rank: 50, weight: 1.5 },       // Inertie de Pattern → J
    { rank: 54, weight: 1.5, invert: true }, // Réparation Heuristique → P
    { rank: 69, weight: 1 },         // Perfectionnisme Fonctionnel → J
  ])

  const I_E = IE !== null ? (IE >= 50 ? 'I' : 'E') : '?'
  const N_S = NS !== null ? (NS >= 50 ? 'N' : 'S') : '?'
  const T_F = TF !== null ? (TF >= 50 ? 'T' : 'F') : '?'
  const J_P = JP !== null ? (JP >= 50 ? 'J' : 'P') : '?'
  const type = `${I_E}${N_S}${T_F}${J_P}`

  // Descriptions des 16 types
  const typeDescriptions = {
    INTJ: 'L\'Architecte — visionnaire stratégique, indépendant et déterminé.',
    INTP: 'Le Logicien — penseur analytique, curieux et inventif.',
    ENTJ: 'Le Commandant — leader naturel, décisif et ambitieux.',
    ENTP: 'Le Débatteur — innovateur, ingénieux et stimulé par les défis.',
    INFJ: 'L\'Avocat — idéaliste perspicace, rare et profondément engagé.',
    INFP: 'Le Médiateur — idéaliste créatif, empathique et authentique.',
    ENFJ: 'Le Protagoniste — charismatique, altruiste et inspirant.',
    ENFP: 'Le Militant — enthousiaste, créatif et socialement engagé.',
    ISTJ: 'Le Logisticien — fiable, méthodique et responsable.',
    ISFJ: 'Le Défenseur — protecteur dévoué, chaleureux et consciencieux.',
    ESTJ: 'Le Directeur — organisateur efficace, direct et traditionnel.',
    ESFJ: 'Le Consul — sociable, attentionné et soucieux de l\'harmonie.',
    ISTP: 'Le Virtuose — observateur pratique, rationnel et discret.',
    ISFP: 'L\'Aventurier — artiste sensible, flexible et ouvert.',
    ESTP: 'L\'Entrepreneur — énergique, pragmatique et spontané.',
    ESFP: 'L\'Animateur — spontané, énergique et enthousiaste.',
  }

  return {
    type,
    description: typeDescriptions[type] ?? 'Type mixte — profil atypique.',
    dimensions: {
      IE: { score: IE, pole: I_E, label: IE !== null ? (IE >= 50 ? 'Introverti' : 'Extraverti') : 'N/D' },
      NS: { score: NS, pole: N_S, label: NS !== null ? (NS >= 50 ? 'Intuitif' : 'Sensitif') : 'N/D' },
      TF: { score: TF, pole: T_F, label: TF !== null ? (TF >= 50 ? 'Pensée' : 'Sentiment') : 'N/D' },
      JP: { score: JP, pole: J_P, label: JP !== null ? (JP >= 50 ? 'Jugement' : 'Perception') : 'N/D' },
    },
  }
}

// ─── DISC ─────────────────────────────────────────────────────────────────────

export function computeDISC(indicators) {
  const D = weightedScore(indicators, [
    { rank: 58, weight: 3 },   // Agentivité Cognitive
    { rank: 30, weight: 2.5 }, // Assertivité Neutre
    { rank: 71, weight: 2 },   // Autonomie Décisionnelle
    { rank: 46, weight: 2 },   // Souveraineté Épistémique
    { rank: 68, weight: 1.5 }, // Rapport au Risque
    { rank: 9,  weight: 1 },   // Vitesse d'Inférence
  ])

  const I = weightedScore(indicators, [
    { rank: 22, weight: 3 },   // Empathie Affective
    { rank: 32, weight: 2.5 }, // Flexibilité Sociale
    { rank: 27, weight: 2 },   // Caméléonisme Technique
    { rank: 29, weight: 2 },   // Décodage de l'Implicite
    { rank: 67, weight: 1.5 }, // Créativité Divergente
    { rank: 25, weight: 1 },   // Prédiction de l'Autre
  ])

  const S = weightedScore(indicators, [
    { rank: 43, weight: 3 },   // Stabilité des Principes
    { rank: 47, weight: 2 },   // Consistance Morale
    { rank: 50, weight: 2 },   // Inertie de Pattern
    { rank: 73, weight: 1.5 }, // Orientation Temporelle (passé-présent)
    { rank: 31, weight: 1.5 }, // Coopération Logique
    { rank: 72, weight: 1 },   // Régulation Émotionnelle
  ])

  const C = weightedScore(indicators, [
    { rank: 11, weight: 3 },   // Rigueur Définitionnelle
    { rank: 10, weight: 2.5 }, // Précision Analytique
    { rank: 51, weight: 2 },   // Hygiène Informationnelle
    { rank: 18, weight: 2 },   // Vigilance Cognitive
    { rank: 34, weight: 1.5 }, // Stabilité Anaphorique
    { rank: 37, weight: 1 },   // Usage Quantificateur
  ])

  // Style dominant = score le plus élevé
  const scores = { D, I, S, C }
  const dominant = Object.entries(scores)
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? '?'

  const styleDescriptions = {
    D: 'Dominant — orienté résultats, direct, décisif et compétitif.',
    I: 'Influent — communicant, enthousiaste, persuasif et optimiste.',
    S: 'Stable — fiable, patient, loyal et orienté collaboration.',
    C: 'Consciencieux — analytique, précis, systématique et rigoureux.',
  }

  return {
    dominant,
    description: styleDescriptions[dominant] ?? 'Profil mixte.',
    scores: { D, I, S, C },
  }
}

// ─── ENNÉAGRAMME ─────────────────────────────────────────────────────────────

export function computeEnneagram(indicators) {
  const types = {
    1: weightedScore(indicators, [
      { rank: 11, weight: 3 },         // Rigueur Définitionnelle
      { rank: 45, weight: 2.5 },       // Priorité Processus
      { rank: 47, weight: 2.5 },       // Consistance Morale
      { rank: 42, weight: 2 },         // Rectitude Intellectuelle
      { rank: 69, weight: 1.5 },       // Perfectionnisme Fonctionnel
    ]),
    2: weightedScore(indicators, [
      { rank: 22, weight: 3 },         // Empathie Affective
      { rank: 21, weight: 2 },         // Empathie Cognitive
      { rank: 31, weight: 2 },         // Coopération Logique
      { rank: 25, weight: 1.5 },       // Prédiction de l'Autre
      { rank: 28, weight: 1.5, invert: true }, // Neutralité Relationnelle inversé
    ]),
    3: weightedScore(indicators, [
      { rank: 58, weight: 3 },         // Agentivité Cognitive
      { rank: 27, weight: 2.5 },       // Caméléonisme Technique
      { rank: 9,  weight: 2 },         // Vitesse d'Inférence
      { rank: 71, weight: 2 },         // Autonomie Décisionnelle
      { rank: 56, weight: 1.5 },       // Indice de Camouflage
    ]),
    4: weightedScore(indicators, [
      { rank: 67, weight: 3 },         // Créativité Divergente
      { rank: 73, weight: 2.5 },       // Orientation Temporelle
      { rank: 46, weight: 2 },         // Souveraineté Épistémique
      { rank: 36, weight: 1.5, invert: true }, // Index de Littéralité inversé (métaphore ok)
      { rank: 22, weight: 1.5 },       // Empathie Affective
    ]),
    5: weightedScore(indicators, [
      { rank: 1,  weight: 3 },         // Logique Déductive
      { rank: 2,  weight: 2.5 },       // Indice de Systématisation
      { rank: 66, weight: 2.5 },       // Curiosité Épistémique
      { rank: 51, weight: 2 },         // Hygiène Informationnelle
      { rank: 28, weight: 2 },         // Neutralité Relationnelle
    ]),
    6: weightedScore(indicators, [
      { rank: 26, weight: 3 },         // Résilience Hallucinatoire
      { rank: 43, weight: 2.5 },       // Stabilité des Principes
      { rank: 24, weight: 2 },         // Attribution d'Intention
      { rank: 16, weight: 2 },         // Évaluation Probabiliste
      { rank: 68, weight: 1.5, invert: true }, // Rapport au Risque inversé
    ]),
    7: weightedScore(indicators, [
      { rank: 66, weight: 3 },         // Curiosité Épistémique
      { rank: 54, weight: 2.5 },       // Réparation Heuristique
      { rank: 19, weight: 2 },         // Fluidité de Raisonnement
      { rank: 44, weight: 2 },         // Tolérance Ambiguïté
      { rank: 68, weight: 2 },         // Rapport au Risque
    ]),
    8: weightedScore(indicators, [
      { rank: 58, weight: 3 },         // Agentivité Cognitive
      { rank: 30, weight: 2.5 },       // Assertivité Neutre
      { rank: 46, weight: 2 },         // Souveraineté Épistémique
      { rank: 71, weight: 2 },         // Autonomie Décisionnelle
      { rank: 43, weight: 1.5 },       // Stabilité des Principes
    ]),
    9: weightedScore(indicators, [
      { rank: 44, weight: 3 },         // Tolérance Ambiguïté
      { rank: 31, weight: 2.5 },       // Coopération Logique
      { rank: 72, weight: 2 },         // Régulation Émotionnelle
      { rank: 50, weight: 2 },         // Inertie de Pattern
      { rank: 32, weight: 1.5 },       // Flexibilité Sociale
    ]),
  }

  const dominant = Object.entries(types)
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? '?'

  const typeDescriptions = {
    1: 'Le Réformateur — perfectionniste éthique, intègre et idéaliste.',
    2: 'L\'Aidant — généreux, empathique et orienté vers les autres.',
    3: 'Le Battant — ambitieux, adaptable et orienté réussite.',
    4: 'L\'Individualiste — expressif, introspectif et authentique.',
    5: 'L\'Investigateur — analytique, perspicace et indépendant.',
    6: 'Le Loyaliste — fiable, engagé et attaché à la sécurité.',
    7: 'L\'Enthousiaste — spontané, polyvalent et optimiste.',
    8: 'Le Challenger — puissant, assertif et décisif.',
    9: 'Le Médiateur — réceptif, pacifique et accommodant.',
  }

  return {
    dominant: parseInt(dominant),
    description: typeDescriptions[dominant] ?? 'Type indéterminé.',
    scores: types, // tous les scores pour afficher le profil complet
  }
}
