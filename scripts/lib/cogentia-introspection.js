import { extractSnapshotClaims } from "./agent-acquired-context-alignment.js";
import { isSalientItem, salienceReasons, verdictToStance } from "./agent-acquired-context-review.js";
import { inspectContinuityState } from "./progressive-enrolment.js";

export const EPISTEMIC_LAYERS = {
  source_data: {
    id: "source_data",
    label: "Données sources brutes",
    description: "Réponses textuelles collées et prompts bruts envoyés à l'agent, conservés tels quels sans interprétation.",
  },
  explicit_self_description: {
    id: "explicit_self_description",
    label: "Auto-description humaine",
    description: "Corrections, notes, verdicts et intentions explicitement déclarés par la personne.",
  },
  external_agent_assertion: {
    id: "external_agent_assertion",
    label: "Affirmations d'agents externes",
    description: "Ce que les modèles d'IA tiers (ChatGPT, Claude, etc.) prétendent savoir de la personne.",
  },
  cogentia_inference: {
    id: "cogentia_inference",
    label: "Inférences de Cogentia",
    description: "Déductions, calculs de saillance, groupements de comparaison ou prompts d'alignement élaborés par Cogentia.",
  },
  current_working_context: {
    id: "current_working_context",
    label: "Contexte de travail actif",
    description: "État de navigation, tour actif, étape en cours et brouillon transitoire dans le navigateur.",
  },
};

export const KNOWN_TRANSPARENCY_GAPS = [
  {
    id: "browser_runtime_allocator",
    area: "Moteur d'exécution JavaScript",
    status: "technically_inaccessible",
    explanation: "La gestion bas niveau de la mémoire vive et le ramasse-miettes du navigateur ne sont pas journalisés pour préserver les performances et la confidentialité.",
  },
  {
    id: "external_model_weights_and_cot",
    area: "Modèles d'IA externes tiers",
    status: "externally_opaque",
    explanation: "Les poids synaptiques, chaînes de pensée cachées (*chain-of-thought*) et mémoires résiduelles des serveurs de ChatGPT, Claude ou Gemini restent sous le secret industriel de leurs éditeurs.",
  },
  {
    id: "virtual_dom_reconciliation",
    area: "Arbre de rendu virtuel (React)",
    status: "transient_lifecycle",
    explanation: "Les tampons éphémères de réconciliation du DOM virtuel avant affichage à l'écran sont transitoires et ne constituent pas un état de mémoire durable.",
  },
];

export function inspectCogentiaSelfModel({
  turnLog = null,
  preferences = {},
  draft = null,
  currentView = null,
} = {}) {
  const turns = Array.isArray(turnLog?.turns) ? turnLog.turns : [];
  const cursor = turnLog?.cursor || { turn: 1, step: 1 };
  const currentTurn = turns.find((t) => t.number === cursor.turn) || turns[0] || null;

  // 1. Source Data Layer
  const sourceDataItems = [];
  turns.forEach((turn) => {
    if (turn.prompt?.text) {
      sourceDataItems.push({
        layer: "source_data",
        id: `source:prompt:turn-${turn.number}`,
        kind: "prompt_sent",
        turn: turn.number,
        content: turn.prompt.text,
        timestamp: turn.prompt.produced_at || turn.prompt.copied_at || null,
        provenance: `Tour ${turn.number} · Prompt généré pour ${turn.provider || "Agent"}`,
      });
    }
    if (turn.response?.text) {
      sourceDataItems.push({
        layer: "source_data",
        id: `source:response:turn-${turn.number}`,
        kind: "raw_response",
        turn: turn.number,
        content: turn.response.text,
        timestamp: turn.response.pasted_at || turn.response.agent_stamped_at || null,
        provenance: `Tour ${turn.number} · Réponse brute collée depuis ${turn.provider || "Agent"}`,
      });
    }
  });

  // 2. Explicit Self-Description Layer
  const selfDescriptionItems = [];
  // From user reviews on turns
  turns.forEach((turn) => {
    const reviews = turn.reviews || {};
    Object.entries(reviews).forEach(([itemId, review]) => {
      if (!review || !review.verdict) return;
      selfDescriptionItems.push({
        layer: "explicit_self_description",
        id: `self:review:turn-${turn.number}:${itemId}`,
        kind: "claim_review",
        turn: turn.number,
        target_item_id: itemId,
        verdict: review.verdict,
        stance: review.stance || verdictToStance(review.verdict),
        note: review.note || "",
        timestamp: review.annotated_at || null,
        provenance: `Tour ${turn.number} · Examen direct de la personne sur l'affirmation ${itemId}`,
        authority_rank: 100, // Maximum authority on self-description
      });
    });
  });

  // From user preferences
  if (preferences.statedIntention) {
    selfDescriptionItems.push({
      layer: "explicit_self_description",
      id: "self:pref:statedIntention",
      kind: "stated_intention",
      turn: null,
      content: preferences.statedIntention,
      timestamp: preferences.updatedAt || null,
      provenance: "Préférences d'enrôlement · Intention de contact déclarée",
      authority_rank: 100,
    });
  }
  if (preferences.contactEmail) {
    selfDescriptionItems.push({
      layer: "explicit_self_description",
      id: "self:pref:contactEmail",
      kind: "contact_email",
      turn: null,
      content: preferences.contactEmail,
      timestamp: preferences.updatedAt || null,
      provenance: "Préférences d'enrôlement · Courriel de contact déclaré",
      authority_rank: 100,
    });
  }
  if (preferences.disableLocalPersistence != null) {
    selfDescriptionItems.push({
      layer: "explicit_self_description",
      id: "self:pref:disableLocalPersistence",
      kind: "persistence_toggle",
      turn: null,
      content: String(preferences.disableLocalPersistence),
      timestamp: preferences.updatedAt || null,
      provenance: "Préférences d'enrôlement · Volonté de désactivation de la persistance locale",
      authority_rank: 100,
    });
  }

  // 3. External Agent Assertion Layer
  const externalAgentItems = [];
  turns.forEach((turn) => {
    if (!turn.snapshot) return;
    const claims = extractSnapshotClaims(turn.snapshot);
    claims.forEach((claim) => {
      const review = turn.reviews?.[claim.id] || null;
      const stance = review ? (review.stance || verdictToStance(review.verdict)) : null;
      const isContestedOrObsolete = stance === "contest" || stance === "obsolete" || stance === "restrict";

      externalAgentItems.push({
        layer: "external_agent_assertion",
        id: `agent:turn-${turn.number}:${claim.id}`,
        turn: turn.number,
        provider: turn.provider || turn.snapshot?.agent?.provider || "Agent",
        content: claim.content,
        category: claim.category,
        basis: claim.basis,
        confidence: claim.confidence,
        claimed_origin: claim.claimed_origin,
        // Invariant: historical provenance survives correction!
        human_review: review,
        is_contested_or_obsolete: isContestedOrObsolete,
        active_in_current_truth: !isContestedOrObsolete,
        historical_observation_preserved: true,
        historical_provenance: `Tour ${turn.number} (${turn.provider || "Agent"}) · Id: ${claim.id}`,
      });
    });
  });

  // 4. Cogentia Inference Layer
  const cogentiaInferences = [];

  // Inference A: Continuity / Relationship state
  const continuityState = inspectContinuityState(turnLog, preferences);
  cogentiaInferences.push({
    layer: "cogentia_inference",
    id: "inference:relationship_state",
    kind: "relationship_state",
    value: continuityState.relationshipState,
    label: continuityState.relationshipStateLabel,
    derivation_rule: "Évaluation de l'état relationnel selon la présence de tours locaux et l'intention déclarée.",
    derived_from: [
      `Tours locaux détectés : ${continuityState.turnsCount}`,
      `Intention déclarée : ${preferences.statedIntention || "aucune"}`,
      `Option tests : ${preferences.optInTesting ? "oui" : "non"}`,
      `Option jumeau : ${preferences.twinInterest ? "oui" : "non"}`,
    ],
  });

  // Inference B: Salience of items
  let salientCount = 0;
  turns.forEach((turn) => {
    if (!turn.snapshot) return;
    const claims = extractSnapshotClaims(turn.snapshot);
    claims.forEach((c) => {
      if (isSalientItem(c)) {
        salientCount += 1;
        cogentiaInferences.push({
          layer: "cogentia_inference",
          id: `inference:salience:turn-${turn.number}:${c.id}`,
          kind: "salience_flag",
          target_claim: c.content,
          reasons: salienceReasons(c),
          derivation_rule: "Détection de saillance : contradiction interne, sensibilité déclarée ou incertitude reconnue.",
          derived_from: [`Affirmation ${c.id} du tour ${turn.number}`],
        });
      }
    });
  });

  // Inference C: Alignment Prompt projections
  const reviewedTurns = turns.filter((t) => t.reviews && Object.keys(t.reviews).length > 0);
  if (reviewedTurns.length > 0) {
    cogentiaInferences.push({
      layer: "cogentia_inference",
      id: "inference:alignment_prompt_projection",
      kind: "alignment_prompt",
      reviewed_turns_count: reviewedTurns.length,
      derivation_rule: "Projection d'alignement : regroupement des rectifications humaines (confirmations, nuances, rejets, restrictions) sans extrapolation.",
      derived_from: reviewedTurns.map((t) => `Tour ${t.number} (${Object.keys(t.reviews).length} examens)`),
    });
  }

  // 5. Current Working Context Layer
  const currentWorkingContext = {
    layer: "current_working_context",
    active_turn: cursor.turn,
    active_step: cursor.step,
    active_provider: currentTurn?.provider || "ChatGPT",
    has_active_snapshot: Boolean(currentTurn?.snapshot),
    has_active_reviews: Boolean(currentTurn?.reviews && Object.keys(currentTurn.reviews).length > 0),
    draft_present: Boolean(draft),
    local_persistence_disabled: Boolean(preferences.disableLocalPersistence),
    timestamp: new Date().toISOString(),
  };

  // Why Cogentia thinks it (transparent explanation map)
  const whyCogentiaThinksIt = [
    {
      topic: "Modèle de la personne",
      explanation: "Cogentia ne génère aucun profil autonome dans ce parcours. Les représentations proviennent exclusivement des réponses de vos agents externes, filtrées par vos propres examens.",
    },
    {
      topic: "Priorité de l'autorité",
      explanation: "Toute décision humaine (rejet, nuance, confirmation) supplante automatiquement les affirmations des agents tiers, sans en effacer l'archive d'observation.",
    },
    {
      topic: "Absence de centralisation cachée",
      explanation: "Les données sont lues en temps réel depuis le stockage local de votre navigateur. Aucun appel réseau ni compte n'est requis.",
    },
  ];

  // Governance affordances
  const governanceAffordances = {
    can_correct: true,
    can_restrict: true,
    can_export: true,
    can_purge: true,
    actions: [
      { id: "correct", label: "Rectifier une affirmation", description: "Modifier ou ajouter un examen humain sur n'importe quelle affirmation." },
      { id: "restrict", label: "Restreindre une donnée", description: "Marquer une affirmation 'À ne pas conserver' pour qu'elle soit écartée de l'alignement." },
      { id: "export", label: "Exporter le modèle d'auto-introspection", description: "Télécharger l'intégralité du modèle d'introspection au format JSON." },
      { id: "toggle_persistence", label: "Désactiver la persistance locale", description: "Empêcher le navigateur de conserver l'historique entre sessions." },
      { id: "purge", label: "Purger toutes les données", description: "Effacer immédiatement le journal des tours, le brouillon et les préférences locales." },
    ],
  };

  return {
    ok: true,
    inspected_at: new Date().toISOString(),
    knows: {
      source_data: sourceDataItems,
      explicit_self_description: selfDescriptionItems,
      external_agent_assertion: externalAgentItems,
      cogentia_inference: cogentiaInferences,
      current_working_context: currentWorkingContext,
    },
    counts: {
      source_data: sourceDataItems.length,
      explicit_self_description: selfDescriptionItems.length,
      external_agent_assertion: externalAgentItems.length,
      cogentia_inference: cogentiaInferences.length,
      contested_or_obsolete_assertions: externalAgentItems.filter((a) => a.is_contested_or_obsolete).length,
    },
    why_cogentia_thinks_it: whyCogentiaThinksIt,
    what_is_being_used_now: currentWorkingContext,
    governance_affordances: governanceAffordances,
    known_transparency_gaps: KNOWN_TRANSPARENCY_GAPS,
    epistemic_invariants: {
      external_and_cogentia_not_conflated: true,
      historical_provenance_survives_correction: true,
      transparency_gaps_explicit: true,
      no_covert_centralization: true,
    },
  };
}
