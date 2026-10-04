import { verdictToStance } from "./agent-acquired-context-review.js";

const KYS_CATEGORIES = ["known", "inferred", "recurring_topics", "working_style", "unknowns"];

export function normalizeClaimText(text) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function claimKey(category, content) {
  return `${String(category || "unknown").toLowerCase()}::${normalizeClaimText(content)}`;
}

export function extractSnapshotClaims(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return [];

  // 1. Normalized agent_acquired_context v0 document
  if (Array.isArray(snapshot.items)) {
    return snapshot.items.map((item) => ({
      id: item.id,
      content: String(item.content || "").trim(),
      category: String(item.category || "unknown").trim(),
      basis: item.detail || item.basis || "",
      confidence: item.uncertainty_note || item.confidence || "",
      record_kind: item.record_kind || "claim",
      claimed_origin: item.claimed_origin || "unknown",
      key: claimKey(item.category, item.content),
    }));
  }

  // 2. Mirror model with categories
  if (Array.isArray(snapshot.categories)) {
    return snapshot.categories.flatMap((cat) => (cat.items || []).map((item) => ({
      id: item.id,
      content: String(item.content || item.claim || "").trim(),
      category: String(cat.label || item.category || "unknown").trim(),
      basis: item.detail || item.basis || "",
      confidence: item.uncertainty_note || item.confidence || "",
      record_kind: item.record_kind || "claim",
      claimed_origin: item.claimed_origin || "unknown",
      key: claimKey(cat.label || item.category, item.content || item.claim),
    })));
  }

  // 3. KYS snapshot portrait format
  const claims = [];
  for (const cat of KYS_CATEGORIES) {
    if (Array.isArray(snapshot[cat])) {
      snapshot[cat].forEach((item, index) => {
        const content = typeof item === "string" ? item.trim() : String(item?.claim || item?.text || item?.content || "").trim();
        if (!content) return;
        const id = (typeof item === "object" && item?.id) ? item.id : `${cat}-${index}`;
        const basis = typeof item === "object" ? String(item?.basis || item?.evidence || "").trim() : "";
        const confidence = typeof item === "object" ? String(item?.confidence || "").trim() : "";
        claims.push({
          id,
          content,
          category: cat,
          basis,
          confidence,
          record_kind: cat === "unknowns" ? "unknown" : "claim",
          claimed_origin: cat === "known" ? "unknown" : "inference",
          key: claimKey(cat, content),
        });
      });
    }
  }

  // Check context_limits if present
  if (Array.isArray(snapshot.context_limits)) {
    snapshot.context_limits.forEach((entry, index) => {
      const content = typeof entry === "string" ? entry.trim() : String(entry?.content || "").trim();
      if (!content) return;
      claims.push({
        id: `context-limits-${index}`,
        content,
        category: "context_limits",
        basis: "",
        confidence: "",
        record_kind: "unknown",
        claimed_origin: "unknown",
        key: claimKey("context_limits", content),
      });
    });
  }

  return claims;
}

export function buildAlignmentPrompt({
  reviews = {},
  snapshot = null,
  provider = "votre agent conversationnel",
  language = "fr",
  promptStyle = "declarative",
} = {}) {
  const claims = extractSnapshotClaims(snapshot);
  const claimsById = new Map(claims.map((c) => [c.id, c]));

  const groups = {
    confirm: [],
    nuance: [],
    contest: [],
    obsolete: [],
    restrict: [],
  };

  // Group strictly from explicit user reviews
  for (const [id, review] of Object.entries(reviews || {})) {
    if (!review) continue;
    const stance = review.stance || (review.verdict ? verdictToStance(review.verdict) : null);
    if (!stance || !Object.hasOwn(groups, stance)) continue;

    const claimObj = claimsById.get(id);
    const content = claimObj ? claimObj.content : (review.content || id);
    const note = review.note ? String(review.note).trim() : "";

    groups[stance].push({
      id,
      content,
      note,
    });
  }

  const hasReviews = Object.values(groups).some((arr) => arr.length > 0);

  if (language === "en") {
    return [
      `You are ${provider}. This prompt communicates human corrections and constraints on the persona and personalization you maintain.`,
      "",
      "BOUNDARY AND MEMORY CAPABILITIES:",
      "- If you possess persistent cross-session memory, update or remove your stored records to conform with these instructions.",
      "- If your memory is bounded to this conversation or if you cannot inspect durable memory, apply these instructions strictly within this exchange without falsely claiming that external persistent storage was updated.",
      "- Claims not listed below have not been confirmed by the person and must NOT be treated as verified facts.",
      "",
      "EXPLICIT HUMAN CORRECTIONS:",
      "",
      "CONFIRMED FACTS & PREFERENCES (ACCURATE):",
      groups.confirm.length > 0
        ? groups.confirm.map((i) => `- ${i.content}${i.note ? ` (note: ${i.note})` : ""}`).join("\n")
        : "- None explicitly confirmed in this review.",
      "",
      "NUANCES & QUALIFICATIONS (APPLY AS SPECIFIED):",
      groups.nuance.length > 0
        ? groups.nuance.map((i) => `- ${i.content}${i.note ? ` -> Nuance: ${i.note}` : ""}`).join("\n")
        : "- None specified.",
      "",
      "REJECTED CLAIMS (FALSE - DO NOT RETAIN OR REINTRODUCE):",
      groups.contest.length > 0
        ? groups.contest.map((i) => `- ${i.content}${i.note ? ` (reason: ${i.note})` : ""}`).join("\n")
        : "- None rejected in this review.",
      "",
      "OBSOLETE CLAIMS (HISTORICAL ONLY - NO LONGER VALID):",
      groups.obsolete.length > 0
        ? groups.obsolete.map((i) => `- ${i.content}${i.note ? ` (note: ${i.note})` : ""}`).join("\n")
        : "- None marked obsolete.",
      "",
      "RESTRICTED MATERIAL (DO NOT RETAIN OR REUSE):",
      groups.restrict.length > 0
        ? groups.restrict.map((i) => `- ${i.content}${i.note ? ` (restriction: ${i.note})` : ""}`).join("\n")
        : "- None restricted.",
      "",
      "INSTRUCTION FOR RE-OBSERVATION:",
      "Acknowledge these corrections. Reflect these constraints in your subsequent answers and in any updated snapshot without introducing unconfirmed inferences.",
    ].join("\n");
  }

  // Default: French
  return [
    `Vous êtes ${provider}. Ce message vous transmet les corrections, nuances et limites d'usage établies par la personne sur les représentations et souvenirs que vous entretenez.`,
    "",
    "CADRE ET LIMITES DE MÉMOIRE :",
    "- Si vous disposez d'un système de mémoire persistante inter-sessions, mettez à jour ou supprimez vos données mémorisées conformément à ces directives.",
    "- Si votre portée est limitée à la présente session ou si votre capacité de rétention durable est inconnue, appliquez ces règles au fil de nos échanges, sans prétendre faussement avoir modifié une mémoire externe permanente.",
    "- Les éléments non mentionnés ci-dessous n'ont pas été validés par la personne et ne doivent pas être tenus pour des vérités établies.",
    "",
    "CORRECTIONS HUMAINES EXPLICITES :",
    "",
    "AFFIRMATIONS CONFIRMÉES (EXACTES) :",
    groups.confirm.length > 0
      ? groups.confirm.map((i) => `- ${i.content}${i.note ? ` (précision : ${i.note})` : ""}`).join("\n")
      : "- Aucun élément explicitement confirmé dans cet examen.",
    "",
    "NUANCES ET PRÉCISIONS (À INTÉGRER TELLES QUELLES) :",
    groups.nuance.length > 0
      ? groups.nuance.map((i) => `- ${i.content}${i.note ? ` -> Nuance : ${i.note}` : ""}`).join("\n")
      : "- Aucune nuance spécifiée.",
    "",
    "AFFIRMATIONS REJETÉES (FAUSSES — À NE PAS RÉINTRODUIRE) :",
    groups.contest.length > 0
      ? groups.contest.map((i) => `- ${i.content}${i.note ? ` (motif : ${i.note})` : ""}`).join("\n")
      : "- Aucun élément rejeté dans cet examen.",
    "",
    "AFFIRMATIONS PÉRIMÉES (OBSOLÈTES — NE PLUS CONSIDÉRER D'ACTUALITÉ) :",
    groups.obsolete.length > 0
      ? groups.obsolete.map((i) => `- ${i.content}${i.note ? ` (précision : ${i.note})` : ""}`).join("\n")
      : "- Aucun élément marqué comme obsolète.",
    "",
    "DONNÉES RESTREINTES (NE PAS CONSERVER NI RÉUTILISER) :",
    groups.restrict.length > 0
      ? groups.restrict.map((i) => `- ${i.content}${i.note ? ` (restriction : ${i.note})` : ""}`).join("\n")
      : "- Aucun élément restreint.",
    "",
    "CONSIGNE POUR LA RÉ-OBSERVATION :",
    "Confirmez la bonne prise en compte de ces rectifications. Intégrez-les dans vos réponses ultérieures et dans tout instantané de contexte futur, sans extrapoler au-delà de ce que vous observez réellement.",
  ].join("\n");
}

export function compareSnapshots(preSnapshot, postSnapshot, preReviews = {}) {
  const preClaims = extractSnapshotClaims(preSnapshot);
  const postClaims = extractSnapshotClaims(postSnapshot);

  const postKeySet = new Set(postClaims.map((c) => c.key));
  const postContentSet = new Set(postClaims.map((c) => normalizeClaimText(c.content)));
  const preKeySet = new Set(preClaims.map((c) => c.key));
  const preContentSet = new Set(preClaims.map((c) => normalizeClaimText(c.content)));

  function isPresentInPost(preClaim) {
    if (postKeySet.has(preClaim.key)) return true;
    return postContentSet.has(normalizeClaimText(preClaim.content));
  }

  function isPresentInPre(postClaim) {
    if (preKeySet.has(postClaim.key)) return true;
    return preContentSet.has(normalizeClaimText(postClaim.content));
  }

  const retained = [];
  const dropped = [];
  const added = [];

  for (const pre of preClaims) {
    if (isPresentInPost(pre)) retained.push(pre);
    else dropped.push(pre);
  }

  for (const post of postClaims) {
    if (!isPresentInPre(post)) added.push(post);
  }

  // Audit adherence against pre-alignment reviews
  const reviewAdherence = [];
  for (const pre of preClaims) {
    const rev = preReviews[pre.id] || null;
    if (!rev) continue;

    const stance = rev.stance || (rev.verdict ? verdictToStance(rev.verdict) : null);
    const presentAfter = isPresentInPost(pre);

    if (stance === "contest") {
      reviewAdherence.push({
        claim: pre.content,
        stance,
        verdict: rev.verdict || "rejected",
        outcome: presentAfter ? "persisting_conflict" : "remedied",
        statusMessage: presentAfter
          ? "Toujours affirmé par l'agent malgré le rejet explicite (tension non résolue)."
          : "Affirmation rejetée retirée avec succès lors de la ré-observation.",
      });
    } else if (stance === "obsolete") {
      reviewAdherence.push({
        claim: pre.content,
        stance,
        verdict: rev.verdict || "obsolete",
        outcome: presentAfter ? "persisting_conflict" : "remedied",
        statusMessage: presentAfter
          ? "Toujours affirmé par l'agent malgré l'obsolescence signalée."
          : "Affirmation obsolète écartée lors de la ré-observation.",
      });
    } else if (stance === "restrict") {
      reviewAdherence.push({
        claim: pre.content,
        stance,
        verdict: rev.verdict || "private",
        outcome: presentAfter ? "persisting_conflict" : "remedied",
        statusMessage: presentAfter
          ? "Toujours présent en violation de la restriction demandée."
          : "Élément restreint écarté de la ré-observation.",
      });
    } else if (stance === "confirm") {
      reviewAdherence.push({
        claim: pre.content,
        stance,
        verdict: rev.verdict || "accepted",
        outcome: presentAfter ? "confirmed_retained" : "dropped_unexpectedly",
        statusMessage: presentAfter
          ? "Affirmation confirmée maintenue dans la ré-observation."
          : "Affirmation confirmée absente de la ré-observation.",
      });
    } else if (stance === "nuance") {
      reviewAdherence.push({
        claim: pre.content,
        stance,
        verdict: rev.verdict || "nuanced",
        note: rev.note || "",
        outcome: "nuance_recorded",
        statusMessage: presentAfter
          ? "Formulation conservée (vérifier la prise en compte de la nuance)."
          : "Formulation initiale reformulée ou retirée suite à la nuance.",
      });
    }
  }

  const conflicts = reviewAdherence.filter((a) => a.outcome === "persisting_conflict");
  const remedied = reviewAdherence.filter((a) => a.outcome === "remedied");

  return {
    preCount: preClaims.length,
    postCount: postClaims.length,
    retainedCount: retained.length,
    droppedCount: dropped.length,
    addedCount: added.length,
    retained,
    dropped,
    added,
    reviewAdherence,
    conflictsCount: conflicts.length,
    remediedCount: remedied.length,
    epistemicDisclaimer: "Cette comparaison enregistre une différence de comportement observable entre deux instantanés. Elle ne garantit pas que la mémoire cachée permanente du fournisseur a été effectivement modifiée.",
  };
}
