/**
 * semantic-answer-cache.js — Zero-token canonical answer cache for recurring public Guide questions.
 */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL_TEMPLATES = [
  {
    id: "who_is_jhn",
    triggers: [
      "qui est jean hugues",
      "qui est jean hugues noel robert",
      "who is jean hugues",
      "who is jean hugues noel robert",
      "who is jhn",
      "qui est il",
    ],
    locale: "fr",
    answer: "Rappel de surface (lecture seule publique) : je ne suis pas Jean Hugues Noël Robert ; je m'appuie sur le corpus public, sans secrets ni données privées (y compris registre-mariani privé) ; je ne prends pas d'engagements légaux ou commerciaux.\n\nJean Hugues Noël Robert est un ingénieur, chercheur et praticien de l'autonomie distribuée, concepteur de FractaVolta, du langage Inox, de Cogentia et de la doctrine du Possibilisme. Le Guide public opère sous mandat strict de lecture seule sur son corpus public et ne doit pas être confondu avec la personne vivante.",
    sources: [
      { source_id: "JeanHuguesRobert:research/agent_brief.md#L1-L40", title: "Agent Brief — Representing Jean Hugues Noël Robert" },
      { source_id: "cogentia:research/cogentia_commons_living_corpus.md#L1-L50", title: "Cogentia Commons Living Corpus" },
    ],
  },
  {
    id: "what_is_possibilism",
    triggers: [
      "qu est ce que le possibilisme",
      "qu est ce que le possibilisme dans ses travaux",
      "what is possibilism",
      "what is possibilism in his work",
      "definition possibilisme",
    ],
    locale: "fr",
    answer: "Rappel de surface (lecture seule publique) : je ne suis pas Jean Hugues Noël Robert ; je m'appuie sur le corpus public, sans secrets ni données privées (y compris registre-mariani privé) ; je ne prends pas d'engagements légaux ou commerciaux.\n\nLe Possibilisme désigne dans ce corpus la capacité civilisationnelle et territoriale à préserver, élargir et concrétiser les futurs accessibles. Il s'oppose aux fatalismes technologiques et extractifs en posant que la technique et l'énergie doivent servir à accroître l'autonomie et les capacités d'action effectives des collectifs locaux.",
    sources: [
      { source_id: "barons-Mariani:research/terrain_configuration.md#L21-L60", title: "Terrain Configuration Theory" },
      { source_id: "marenostrum:research/pacte_anti_capture_solaire_inferentielle.md#L1-L50", title: "Pacte anti-capture solaire et inférentielle" },
    ],
  },
  {
    id: "what_is_fractavolta",
    triggers: [
      "qu est ce que fractavolta",
      "expliquer fractavolta",
      "what is fractavolta",
      "explain fractavolta simply",
      "comment fonctionne fractavolta",
    ],
    locale: "fr",
    answer: "Rappel de surface (lecture seule publique) : je ne suis pas Jean Hugues Noël Robert ; je m'appuie sur le corpus public, sans secrets ni données privées (y compris registre-mariani privé) ; je ne prends pas d'engagements légaux ou commerciaux.\n\nFractaVolta est une architecture de réseaux de paquets généralisés unifiant énergie solaire locale, calcul inférentiel distribué et gouvernance territoriale sobre. Elle permet aux territoires insulaires et ruraux de transformer leurs infrastructures énergétiques et informatiques en biens communs souverains et vérifiables.",
    sources: [
      { source_id: "FractaVolta:research/fractavolta_paper.md#L1-L60", title: "FractaVolta: Architecture & Principles" },
      { source_id: "FractaVolta:research/generalized_packet_networks.md#L1-L50", title: "Generalized Packet Networks" },
    ],
  },
];

export function createSemanticAnswerCache() {
  const dynamicCache = new Map();

  function matchCanonical(question) {
    const qNorm = normalize(question);
    if (!qNorm) return null;

    for (const item of CANONICAL_TEMPLATES) {
      for (const trig of item.triggers) {
        if (qNorm === trig || qNorm.startsWith(trig) || (qNorm.includes(trig) && qNorm.length < trig.length + 15)) {
          return {
            ok: true,
            id: item.id,
            mode: "canonical_cache",
            answer: item.answer,
            sources: item.sources,
            latencyMs: 1,
          };
        }
      }
    }

    if (dynamicCache.has(qNorm)) {
      const entry = dynamicCache.get(qNorm);
      return {
        ok: true,
        id: "dynamic_cache",
        mode: "dynamic_cache",
        answer: entry.answer,
        sources: entry.sources,
        latencyMs: 1,
      };
    }

    return null;
  }

  function set(question, answer, sources = []) {
    const qNorm = normalize(question);
    if (qNorm && answer) {
      dynamicCache.set(qNorm, { answer, sources, cachedAt: Date.now() });
    }
  }

  return {
    matchCanonical,
    set,
    size: () => CANONICAL_TEMPLATES.length + dynamicCache.size,
  };
}
