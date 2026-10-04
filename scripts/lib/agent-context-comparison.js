import { extractSnapshotClaims, normalizeClaimText } from "./agent-acquired-context-alignment.js";
import { verdictToStance } from "./agent-acquired-context-review.js";

export const COMPARISON_CATEGORIES = {
  convergence: {
    id: "convergence",
    label: "Convergence d'agents",
    description: "Plusieurs agents partagent une affirmation similaire (indice concordant, non vérité).",
  },
  divergence: {
    id: "divergence",
    label: "Divergence & Tensions",
    description: "Affirmations contradictoires ou mutuellement exclusives entre agents.",
  },
  unique: {
    id: "unique",
    label: "Connaissance exclusive",
    description: "Affirmation observée chez un seul agent.",
  },
  disappeared: {
    id: "disappeared",
    label: "Disparition temporelle",
    description: "Affirmation présente dans un instantané antérieur mais absente dans l'instantané ultérieur.",
  },
  newly_observed: {
    id: "newly_observed",
    label: "Nouvellement observé",
    description: "Affirmation apparue pour la première fois dans un instantané ultérieur.",
  },
  contested: {
    id: "contested",
    label: "Arbitrage humain prioritaire",
    description: "Affirmation formellement réfutée ou rectifiée par la personne.",
  },
};

export const AUTHORITY_LEVELS = {
  human_contested: {
    id: "human_contested",
    label: "Contesté par la personne",
    rank: 100,
    isHumanAuthority: true,
    note: "La personne réfute cette affirmation. Cette correction prévaut sur tout consensus d'agents sans effacer les observations d'origine.",
  },
  human_confirmed: {
    id: "human_confirmed",
    label: "Confirmé par la personne",
    rank: 90,
    isHumanAuthority: true,
    note: "Validé explicitement par la personne.",
  },
  human_nuanced: {
    id: "human_nuanced",
    label: "Nuancé par la personne",
    rank: 85,
    isHumanAuthority: true,
    note: "Précisé ou restreint par une note explicite de la personne.",
  },
  human_restricted: {
    id: "human_restricted",
    label: "Restreint par la personne",
    rank: 80,
    isHumanAuthority: true,
    note: "La personne demande de ne pas conserver cet élément.",
  },
  human_obsolete: {
    id: "human_obsolete",
    label: "Obsolète selon la personne",
    rank: 75,
    isHumanAuthority: true,
    note: "Historique mais révolu selon la personne.",
  },
  unreviewed_agent_convergence: {
    id: "unreviewed_agent_convergence",
    label: "Indice de convergence (non vérifié)",
    rank: 40,
    isHumanAuthority: false,
    note: "Accord entre agents. Constitue un indice observationnel, JAMAIS une vérité automatique.",
  },
  single_agent_claim: {
    id: "single_agent_claim",
    label: "Observation isolée",
    rank: 20,
    isHumanAuthority: false,
    note: "Affirmé par un seul agent sans vérification humaine.",
  },
};

export const CAUSAL_ATTRIBUTIONS = {
  unknown: {
    id: "unknown",
    label: "Attribution causale inconnue",
    description: "L'absence ou la variation entre instantanés ne permet pas de déduire un oubli ou un changement de la personne.",
  },
  human_remedied: {
    id: "human_remedied",
    label: "Retiré suite à rectification",
    description: "L'affirmation a disparu après une consigne explicite d'alignement ou de rejet.",
  },
  person_change: {
    id: "person_change",
    label: "Évolution de la personne",
    description: "Attribuée à un changement de la personne uniquement si étayé par une annotation humaine.",
  },
  agent_drift: {
    id: "agent_drift",
    label: "Variation de l'agent",
    description: "Dérive propre au modèle, au prompt ou à l'échantillonnage.",
  },
};

export const EPISTEMIC_DISCLAIMERS = {
  agreement_not_truth: "L'accord entre agents constitue un indice d'observation, pas une vérité. Le vote majoritaire n'est jamais utilisé comme preuve.",
  no_averaging: "Les contradictions ne sont jamais moyennées ni masquées ; elles restent visibles et inspectables avec leurs sources.",
  disappearance_not_forgetting: "La disparition temporelle d'une affirmation chez un agent n'indique pas un oubli ou une évolution humaine, sauf mention explicite de la personne.",
  human_authority_precedence: "L'auto-description humaine a une autorité supérieure au consensus des agents, sans effacer les observations enregistrées.",
};

function normalizeTopic(text) {
  const normalized = normalizeClaimText(text);
  // Match common semantic anchors (location, residence, schedule, language, preference)
  if (normalized.includes("résid") || normalized.includes("habit") || normalized.includes("live") || normalized.includes("vis à") || normalized.includes("demeur")) {
    return "topic:residence";
  }
  if (normalized.includes("réunion") || normalized.includes("meeting") || normalized.includes("matin") || normalized.includes("soir") || normalized.includes("horaire")) {
    return "topic:schedule";
  }
  if (normalized.includes("télétravail") || normalized.includes("bureau") || normalized.includes("remote") || normalized.includes("office")) {
    return "topic:work_location";
  }
  if (normalized.includes("langue") || normalized.includes("français") || normalized.includes("english") || normalized.includes("language")) {
    return "topic:language";
  }
  return `topic:${normalized.slice(0, 40)}`;
}

function areClaimsContradictory(claimA, claimB) {
  if (!claimA || !claimB) return false;
  // Explicit contradiction metadata
  if (Array.isArray(claimA.contradicts) && claimA.contradicts.includes(claimB.id)) return true;
  if (Array.isArray(claimB.contradicts) && claimB.contradicts.includes(claimA.id)) return true;

  const textA = normalizeClaimText(claimA.content);
  const textB = normalizeClaimText(claimB.content);
  if (textA === textB) return false;

  const topicA = normalizeTopic(textA);
  const topicB = normalizeTopic(textB);

  // If they share a specific topic but assert mutually incompatible values:
  if (topicA === topicB && topicA.startsWith("topic:") && !topicA.includes(textA.slice(0, 20))) {
    // Check known incompatible polarities
    const opposites = [
      ["matin", "soir"],
      ["morning", "evening"],
      ["paris", "bastia"],
      ["paris", "corte"],
      ["télétravail", "bureau"],
      ["remote", "office"],
      ["oui", "non"],
      ["confidentialité stricte", "public"],
    ];
    for (const [left, right] of opposites) {
      if ((textA.includes(left) && textB.includes(right)) || (textA.includes(right) && textB.includes(left))) {
        return true;
      }
    }
  }

  return false;
}

export function parseSnapshotInput(input, index = 0) {
  if (!input) return null;
  // If it's a turn object from turnLog
  if (input.number != null && input.snapshot != null) {
    const rawClaims = extractSnapshotClaims(input.snapshot);
    const provider = input.provider || input.snapshot?.agent?.provider || "Agent";
    const agent = input.snapshot?.agent?.model || provider;
    const capturedAt = input.snapshot?.answered_at || input.snapshot?.stamped_at || input.response?.pasted_at || input.response?.agent_stamped_at || null;
    return {
      snapshot_id: `turn-${input.number}`,
      provider,
      agent,
      model: input.snapshot?.agent?.model || null,
      captured_at: capturedAt,
      turn_number: input.number,
      claims: rawClaims.map((c) => ({
        ...c,
        snapshot_id: `turn-${input.number}`,
        provider,
        agent,
        captured_at: capturedAt,
        review: input.reviews?.[c.id] || null,
      })),
      reviews: input.reviews || {},
    };
  }

  // Normalized agent_acquired_context.v0
  if (input.kind === "agent_acquired_context" || Array.isArray(input.items)) {
    const rawClaims = extractSnapshotClaims(input);
    const provider = input.source?.provider || "Agent";
    const agent = input.source?.agent || provider;
    const model = input.source?.model || null;
    const capturedAt = input.captured_at?.value || null;
    const captureId = input.capture_id || `capture-${index + 1}`;
    return {
      snapshot_id: captureId,
      provider,
      agent,
      model,
      captured_at: capturedAt,
      turn_number: null,
      claims: rawClaims.map((c) => ({
        ...c,
        snapshot_id: captureId,
        provider,
        agent,
        captured_at: capturedAt,
        review: null,
      })),
      reviews: {},
    };
  }

  // Generic KYS portrait object
  const rawClaims = extractSnapshotClaims(input);
  const provider = input.agent?.provider || input.provider || `Agent-${index + 1}`;
  const agent = input.agent?.model || provider;
  const capturedAt = input.answered_at || input.stamped_at || input.generated_at || null;
  const captureId = input.snapshot_version ? `snapshot-${index + 1}` : `item-${index + 1}`;
  return {
    snapshot_id: captureId,
    provider,
    agent,
    model: input.agent?.model || null,
    captured_at: capturedAt,
    turn_number: null,
    claims: rawClaims.map((c) => ({
      ...c,
      snapshot_id: captureId,
      provider,
      agent,
      captured_at: capturedAt,
      review: null,
    })),
    reviews: input.human_review || {},
  };
}

export function buildMultiAgentComparison(rawSnapshots, options = {}) {
  const snapshots = (rawSnapshots || [])
    .map((s, idx) => parseSnapshotInput(s, idx))
    .filter(Boolean);

  if (snapshots.length === 0) {
    return {
      ok: false,
      error: "Au moins un instantané est requis pour la comparaison.",
      snapshotsCount: 0,
      agents: [],
      items: [],
      convergences: [],
      divergences: [],
      uniques: [],
      disappeared: [],
      newlyObserved: [],
      humanReviewed: [],
      metrics: {
        totalClaims: 0,
        convergenceCount: 0,
        divergenceCount: 0,
        uniqueCount: 0,
        disappearedCount: 0,
        newlyObservedCount: 0,
        contestedCount: 0,
        confirmedCount: 0,
      },
      epistemicInvariants: {
        agreementIsEvidenceNotTruth: true,
        majorityVoteNeverBecomesTruth: true,
        contradictionsPreservedNotAveraged: true,
        disappearanceCausalAttributionDefaultUnknown: true,
        humanAuthorityOverridesAgentConsensus: true,
        observationsPreservedWithoutErasure: true,
      },
    };
  }

  const externalReviews = options.reviews || {};
  const allAgents = Array.from(new Set(snapshots.map((s) => s.provider)));

  // Merge snapshot claims
  const allClaims = [];
  for (const snap of snapshots) {
    for (const claim of snap.claims) {
      const review = claim.review || snap.reviews[claim.id] || externalReviews[claim.id] || null;
      allClaims.push({ ...claim, review });
    }
  }

  // 1. Group claims into clusters
  // First, map claims by normalized content
  const clustersByContent = new Map();
  for (const claim of allClaims) {
    const norm = normalizeClaimText(claim.content);
    if (!clustersByContent.has(norm)) {
      clustersByContent.set(norm, []);
    }
    clustersByContent.get(norm).push(claim);
  }

  // 2. Identify Longitudinal Diff (same agent, different timestamps)
  const longitudinalMap = new Map(); // provider -> array of snapshots sorted by turn/time
  for (const snap of snapshots) {
    if (!longitudinalMap.has(snap.provider)) {
      longitudinalMap.set(snap.provider, []);
    }
    longitudinalMap.get(snap.provider).push(snap);
  }

  const disappearedItems = [];
  const newlyObservedItems = [];

  for (const [provider, snaps] of longitudinalMap.entries()) {
    if (snaps.length >= 2) {
      // Sort chronologically if turn_number or captured_at available
      snaps.sort((a, b) => {
        if (a.turn_number != null && b.turn_number != null) return a.turn_number - b.turn_number;
        if (a.captured_at && b.captured_at) return new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime();
        return 0;
      });

      const firstSnap = snaps[0];
      const lastSnap = snaps[snaps.length - 1];
      const firstNorms = new Set(firstSnap.claims.map((c) => normalizeClaimText(c.content)));
      const lastNorms = new Set(lastSnap.claims.map((c) => normalizeClaimText(c.content)));

      for (const claim of firstSnap.claims) {
        const norm = normalizeClaimText(claim.content);
        if (!lastNorms.has(norm)) {
          // Claim was present in firstSnap, absent in lastSnap
          const review = claim.review;
          const stance = review ? (review.stance || verdictToStance(review.verdict)) : null;
          const causal = stance === "contest" ? "human_remedied" : (options.supportedPersonChange ? "person_change" : "unknown");

          disappearedItems.push({
            id: `disappeared:${claim.id}`,
            content: claim.content,
            category: "disappeared",
            provider,
            first_seen_snapshot: firstSnap.snapshot_id,
            disappeared_in_snapshot: lastSnap.snapshot_id,
            causal_attribution: causal,
            causal_note: CAUSAL_ATTRIBUTIONS[causal].description,
            sources: [claim],
            review,
          });
        }
      }

      for (const claim of lastSnap.claims) {
        const norm = normalizeClaimText(claim.content);
        if (!firstNorms.has(norm)) {
          newlyObservedItems.push({
            id: `newly_observed:${claim.id}`,
            content: claim.content,
            category: "newly_observed",
            provider,
            appeared_in_snapshot: lastSnap.snapshot_id,
            causal_attribution: "unknown",
            causal_note: "Nouvelle observation dans l'instantané ultérieur.",
            sources: [claim],
            review: claim.review,
          });
        }
      }
    }
  }

  // 3. Categorize Clusters across Agents: Convergence, Unique, Divergence
  const evaluatedClusters = [];
  const processedNorms = new Set();

  for (const [norm, claims] of clustersByContent.entries()) {
    if (processedNorms.has(norm)) continue;
    processedNorms.add(norm);

    const distinctProviders = Array.from(new Set(claims.map((c) => c.provider)));
    const primaryClaim = claims[0];

    // Check for any human review across claims in this cluster
    let humanReview = null;
    for (const c of claims) {
      if (c.review) {
        humanReview = c.review;
        break;
      }
    }

    // Determine displayed authority
    let displayedAuthority = AUTHORITY_LEVELS.single_agent_claim;
    let isGroundTruth = false; // INVARIANT: never true automatically for agent agreement!

    if (humanReview) {
      const stance = humanReview.stance || verdictToStance(humanReview.verdict);
      if (stance === "contest") displayedAuthority = AUTHORITY_LEVELS.human_contested;
      else if (stance === "confirm") displayedAuthority = AUTHORITY_LEVELS.human_confirmed;
      else if (stance === "nuance") displayedAuthority = AUTHORITY_LEVELS.human_nuanced;
      else if (stance === "restrict") displayedAuthority = AUTHORITY_LEVELS.human_restricted;
      else if (stance === "obsolete") displayedAuthority = AUTHORITY_LEVELS.human_obsolete;
    } else if (distinctProviders.length > 1) {
      displayedAuthority = AUTHORITY_LEVELS.unreviewed_agent_convergence;
    }

    let comparisonCategory = "unique";
    if (distinctProviders.length > 1) {
      comparisonCategory = "convergence";
    }

    evaluatedClusters.push({
      id: `cluster:${norm.slice(0, 30)}`,
      normalized_key: norm,
      content: primaryClaim.content,
      category: comparisonCategory,
      displayed_authority: displayedAuthority,
      is_ground_truth: isGroundTruth, // Strictly false: agreement is evidence, not truth!
      providers_count: distinctProviders.length,
      providers: distinctProviders,
      sources: claims.map((c) => ({
        snapshot_id: c.snapshot_id,
        provider: c.provider,
        agent: c.agent,
        captured_at: c.captured_at,
        item_id: c.id,
        content: c.content,
        claimed_origin: c.claimed_origin,
        confidence: c.confidence,
        review: c.review,
      })),
      human_review: humanReview,
      causal_attribution: "unknown",
      notes: distinctProviders.length > 1
        ? `Partagé par ${distinctProviders.length} agents (${distinctProviders.join(", ")}). Indice d'accord, non vérité canonique.`
        : `Observé uniquement chez ${distinctProviders[0]}.`,
    });
  }

  // 4. Detect Divergence / Contradictions between clusters
  const divergences = [];
  const clusterCount = evaluatedClusters.length;
  for (let i = 0; i < clusterCount; i++) {
    for (let j = i + 1; j < clusterCount; j++) {
      const clusterA = evaluatedClusters[i];
      const clusterB = evaluatedClusters[j];

      // Check if claims in clusterA contradict claims in clusterB
      const claimA = clusterA.sources[0];
      const claimB = clusterB.sources[0];
      if (areClaimsContradictory(claimA, claimB)) {
        // Form a divergence item preserving both sides
        clusterA.category = "divergence";
        clusterB.category = "divergence";

        divergences.push({
          id: `divergence:${clusterA.id}__vs__${clusterB.id}`,
          category: "divergence",
          topic: normalizeTopic(clusterA.content),
          branch_a: {
            content: clusterA.content,
            providers: clusterA.providers,
            sources: clusterA.sources,
            human_review: clusterA.human_review,
            authority: clusterA.displayed_authority,
          },
          branch_b: {
            content: clusterB.content,
            providers: clusterB.providers,
            sources: clusterB.sources,
            human_review: clusterB.human_review,
            authority: clusterB.displayed_authority,
          },
          resolution_status: (clusterA.human_review || clusterB.human_review) ? "human_clarified" : "unresolved_tension",
          epistemic_rule: "Les affirmations divergentes sont conservées et inspectables sans être moyennées ni résolues automatiquement.",
        });
      }
    }
  }

  const convergences = evaluatedClusters.filter((c) => c.category === "convergence");
  const uniques = evaluatedClusters.filter((c) => c.category === "unique");
  const humanReviewed = evaluatedClusters.filter((c) => Boolean(c.human_review));
  const contested = evaluatedClusters.filter((c) => c.displayed_authority.id === "human_contested");
  const confirmed = evaluatedClusters.filter((c) => c.displayed_authority.id === "human_confirmed");

  return {
    ok: true,
    snapshotsCount: snapshots.length,
    agents: allAgents,
    items: evaluatedClusters,
    convergences,
    divergences,
    uniques,
    disappeared: disappearedItems,
    newlyObserved: newlyObservedItems,
    humanReviewed,
    metrics: {
      totalClaims: allClaims.length,
      convergenceCount: convergences.length,
      divergenceCount: divergences.length,
      uniqueCount: uniques.length,
      disappearedCount: disappearedItems.length,
      newlyObservedCount: newlyObservedItems.length,
      contestedCount: contested.length,
      confirmedCount: confirmed.length,
    },
    epistemicInvariants: {
      agreementIsEvidenceNotTruth: true,
      majorityVoteNeverBecomesTruth: true,
      contradictionsPreservedNotAveraged: true,
      disappearanceCausalAttributionDefaultUnknown: true,
      humanAuthorityOverridesAgentConsensus: true,
      observationsPreservedWithoutErasure: true,
    },
    disclaimers: EPISTEMIC_DISCLAIMERS,
  };
}
