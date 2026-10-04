export const ENROLMENT_PREFS_KEY = "kys_enrolment_prefs_v1";

export const RELATIONSHIP_STATES = {
  anonymous_ephemeral: {
    id: "anonymous_ephemeral",
    label: "Session anonyme éphémère",
    description: "Aucun contexte n'est conservé au-delà de la session courante.",
  },
  local_continuity: {
    id: "local_continuity",
    label: "Continuité locale dans ce navigateur",
    description: "Les instantanés et examens restent stockés sur cet appareil pour vous éviter de tout ressaisir.",
  },
  contact_initiated: {
    id: "contact_initiated",
    label: "Contact bilatéral initié",
    description: "Vous avez préparé ou envoyé un courriel. Cela ne crée aucun compte ni consentement pour un Jumeau.",
  },
  testing_opt_in: {
    id: "testing_opt_in",
    label: "Intérêt pour les tests & études",
    description: "Participation volontaire aux bancs d'essai méthodologiques.",
  },
  twin_explorer: {
    id: "twin_explorer",
    label: "Exploration d'un Jumeau Numérique",
    description: "Intérêt explicite pour la perspective d'un modèle personnel souverain.",
  },
};

export const RETENTION_PURPOSES = {
  session_mirror: {
    id: "session_mirror",
    label: "Miroir immédiat",
    description: "Afficher ce que l'agent affirme savoir au cours de cet échange.",
    scope: "ephemeral",
  },
  multi_turn_comparison: {
    id: "multi_turn_comparison",
    label: "Comparaison multi-tours",
    description: "Comparer deux réponses successives pour vérifier la prise en compte de vos corrections.",
    scope: "local_session",
  },
  local_convenience: {
    id: "local_convenience",
    label: "Confort de réutilisation",
    description: "Retrouver votre dernier agent et vos examens sans avoir à les réimporter.",
    scope: "local_device",
  },
  bilateral_contact: {
    id: "bilateral_contact",
    label: "Échange par courriel",
    description: "Conserver l'intention déclarée lors de votre prise de contact volontaire.",
    scope: "voluntary_message",
  },
};

export function inspectContinuityState(turnLog = null, preferences = {}) {
  const turns = Array.isArray(turnLog?.turns) ? turnLog.turns : [];
  const validTurns = turns.filter((t) => t && typeof t === "object");
  const snapshots = validTurns.filter((t) => Boolean(t.snapshot));
  const latestTurn = validTurns[validTurns.length - 1] || null;

  let reviewedClaimsCount = 0;
  for (const t of validTurns) {
    if (t.reviews && typeof t.reviews === "object") {
      reviewedClaimsCount += Object.values(t.reviews).filter((r) => r?.verdict).length;
    }
  }

  const hasRetainedData = validTurns.length > 0 && (snapshots.length > 0 || reviewedClaimsCount > 0);
  const provider = latestTurn?.provider || null;

  // Stated intentions (must be explicit, NEVER inferred)
  const lastIntention = preferences.statedIntention || null;
  const optInTesting = Boolean(preferences.optInTesting);
  const twinInterest = Boolean(preferences.twinInterest);
  const localPersistenceDisabled = Boolean(preferences.disableLocalPersistence);

  // Determine relationship state strictly according to doctrine:
  // Contact != Account != Testing != Twin
  let primaryState = RELATIONSHIP_STATES.anonymous_ephemeral.id;
  if (!localPersistenceDisabled && hasRetainedData) {
    primaryState = RELATIONSHIP_STATES.local_continuity.id;
  }
  if (lastIntention && lastIntention !== "no_contact") {
    primaryState = RELATIONSHIP_STATES.contact_initiated.id;
  }
  if (optInTesting) {
    primaryState = RELATIONSHIP_STATES.testing_opt_in.id;
  }
  if (twinInterest) {
    primaryState = RELATIONSHIP_STATES.twin_explorer.id;
  }

  // Active purposes explicitly mapped to observed use
  const activePurposes = [];
  if (validTurns.length > 0) {
    activePurposes.push(RETENTION_PURPOSES.session_mirror);
  }
  if (snapshots.length > 1) {
    activePurposes.push(RETENTION_PURPOSES.multi_turn_comparison);
  }
  if (hasRetainedData && !localPersistenceDisabled) {
    activePurposes.push(RETENTION_PURPOSES.local_convenience);
  }
  if (lastIntention && lastIntention !== "no_contact") {
    activePurposes.push(RETENTION_PURPOSES.bilateral_contact);
  }

  return {
    hasRetainedData,
    turnsCount: validTurns.length,
    snapshotsCount: snapshots.length,
    reviewedClaimsCount,
    provider,
    localPersistenceDisabled,
    lastIntention,
    optInTesting,
    twinInterest,
    relationshipState: primaryState,
    activePurposes,
    // Explicit legal and architectural declaration
    doctrineNote: "Contact ≠ Compte ≠ Participation aux tests ≠ Jumeau Numérique. Vos données restent exclusivement sur cet appareil dans ce navigateur.",
  };
}

export function updateEnrolmentPreferences(currentPreferences = {}, patch = {}) {
  return {
    ...currentPreferences,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export function clearContinuityStorage(storage) {
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem("kys_turn_log_v1");
    storage.removeItem("kys_snapshot_draft_v1");
    storage.removeItem(ENROLMENT_PREFS_KEY);
  } catch {
    // Graceful fallback for restricted environments
  }
}
