export const REVIEW_VERDICTS = [
  { id: "accepted", stance: "confirm", label: "Oui, c’est moi", short: "Exact", promptKey: "accepted" },
  { id: "nuanced", stance: "nuance", label: "À nuancer", short: "Nuance", promptKey: "nuanced" },
  { id: "rejected", stance: "contest", label: "Non, pas du tout", short: "Faux", promptKey: "rejected" },
  { id: "obsolete", stance: "obsolete", label: "Périmé / obsolète", short: "Obsolète", promptKey: "obsolete" },
  { id: "private", stance: "restrict", label: "Ne pas conserver", short: "Restreindre", promptKey: "private" },
  { id: "unknown", stance: "unknown", label: "Je ne sais pas", short: "Inconnu", promptKey: "unknown" },
];

export const VERDICT_TO_STANCE = {
  accepted: "confirm",
  confirm: "confirm",
  exact: "confirm",
  nuanced: "nuance",
  nuance: "nuance",
  rejected: "contest",
  contest: "contest",
  false: "contest",
  obsolete: "obsolete",
  private: "restrict",
  restrict: "restrict",
  "restrict-use": "restrict",
  unknown: "unknown",
};

export const STANCE_TO_VERDICT = {
  confirm: "accepted",
  nuance: "nuanced",
  contest: "rejected",
  obsolete: "obsolete",
  restrict: "private",
  unknown: "unknown",
};

export function verdictToStance(verdict) {
  if (!verdict) return "unknown";
  return VERDICT_TO_STANCE[String(verdict).toLowerCase()] || "unknown";
}

export function stanceToVerdict(stance) {
  if (!stance) return "unknown";
  return STANCE_TO_VERDICT[String(stance).toLowerCase()] || "unknown";
}

export function isSalientItem(item) {
  if (!item || typeof item !== "object") return false;
  const hasContradiction = Array.isArray(item.contradicts) && item.contradicts.length > 0;
  const isSensitive = item.sensitivity === "sensitive" || item.sensitivity === "restricted";
  const hasStatedUncertainty = item.uncertainty_status === "known"
    || (item.uncertainty && item.uncertainty.status === "known");
  return hasContradiction || isSensitive || hasStatedUncertainty;
}

export function salienceReasons(item) {
  if (!item || typeof item !== "object") return [];
  const reasons = [];
  if (Array.isArray(item.contradicts) && item.contradicts.length > 0) {
    reasons.push("Contradiction interne");
  }
  if (item.sensitivity === "sensitive" || item.sensitivity === "restricted") {
    reasons.push(`Sensibilité : ${item.sensitivity}`);
  }
  if (item.uncertainty_status === "known" || (item.uncertainty && item.uncertainty.status === "known")) {
    reasons.push("Incertitude déclarée");
  }
  return reasons;
}

export function createItemReview({
  captureId,
  itemId,
  verdict,
  stance,
  note = "",
  annotatedAt = null,
}) {
  if (!captureId || !itemId) {
    throw new Error("captureId and itemId are required to create a review record");
  }
  const resolvedStance = stance || (verdict ? verdictToStance(verdict) : "unknown");
  const resolvedVerdict = verdict || stanceToVerdict(resolvedStance);
  const resolvedTime = annotatedAt || new Date().toISOString();
  return {
    target: {
      capture_id: captureId,
      item_id: itemId,
    },
    capture_id: captureId,
    item_id: itemId,
    verdict: resolvedVerdict,
    stance: resolvedStance,
    note: typeof note === "string" ? note.trim() : "",
    annotated_at: resolvedTime,
  };
}

export function reviewToAnnotation(review, options = {}) {
  const rawCaptureId = review?.capture_id || review?.target?.capture_id || options.captureId || "capture:kys-snapshot";
  const rawItemId = review?.item_id || review?.target?.item_id || options.itemId || "item:unknown";
  const captureId = rawCaptureId.startsWith("capture:") ? rawCaptureId : `capture:${rawCaptureId}`;
  const itemId = rawItemId.startsWith("item:") ? rawItemId : `item:${rawItemId}`;
  const stance = review?.stance || (review?.verdict ? verdictToStance(review.verdict) : "unknown");
  const note = review?.note != null && String(review.note).trim() !== ""
    ? String(review.note).trim()
    : `Examen humain : ${review?.verdict || stance}`;
  const slug = `${captureId.slice(8)}-${itemId.slice(5)}`.toLowerCase().replace(/[^a-z0-9._:-]/g, "-");
  const annotationId = options.annotationId || `annotation:${slug}`;
  const annotatedAtValue = review?.annotated_at || options.annotatedAt || new Date().toISOString();

  return {
    schema_version: "cogentia.agent-acquired-context.v0",
    kind: "agent_acquired_context_annotation",
    layer: "human_annotation",
    annotation_id: annotationId,
    claim_status: "human_annotation_not_a_rewrite",
    target: {
      capture_id: captureId,
      item_id: itemId,
    },
    annotated_at: {
      status: "known",
      value: annotatedAtValue,
    },
    stance,
    note,
  };
}
