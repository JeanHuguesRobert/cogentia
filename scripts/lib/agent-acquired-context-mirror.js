const ORIGIN_LABELS = {
  explicit_user_statement: "Explicit user statement",
  inference: "Inference",
  provider_memory: "Provider memory",
  unknown: "Unknown origin",
};

const COUNT_KEYS = [
  "explicit_user_statement",
  "inference",
  "provider_memory",
  "unknown_origin",
  "uncertainty_stated",
  "contradictions",
];

function emptyMirror(ingestion) {
  return {
    schema_version: "cogentia.agent-acquired-context-mirror.v0",
    kind: "agent_acquired_context_mirror",
    state: "unreadable",
    ok: false,
    banner: "This view shows what the agent claims. It is not objective truth.",
    absence_note: "A missing topic is not evidence that the agent has no memory of it.",
    claim_status: null,
    source: null,
    categories: [],
    counts: {},
    raw: ingestion?.raw
      ? {
          sha256: ingestion.raw.sha256,
          media_type: ingestion.raw.media_type,
          text: ingestion.raw.text,
        }
      : null,
    extensions: Array.isArray(ingestion?.extensions) ? ingestion.extensions : [],
    diagnostics: Array.isArray(ingestion?.diagnostics) ? ingestion.diagnostics : [],
    warnings: Array.isArray(ingestion?.warnings) ? ingestion.warnings : [],
    advanced: null,
    notices: [],
  };
}

export function buildAgentAcquiredContextMirror(ingestion) {
  const mirror = emptyMirror(ingestion);
  if (!ingestion || ingestion.kind !== "agent_acquired_context_ingestion" || !ingestion.ok || !ingestion.normalized) {
    return mirror;
  }

  if (ingestion.normalized.kind === "agent_acquired_context_annotation") {
    return {
      ...mirror,
      state: "annotation",
      notices: ["This paste is a human annotation, not an agent snapshot."],
    };
  }

  if (ingestion.normalized.kind !== "agent_acquired_context") return mirror;

  const snapshot = ingestion.normalized;
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const grouped = new Map();
  const tallies = {
    explicit_user_statement: 0,
    inference: 0,
    provider_memory: 0,
    unknown_origin: 0,
    uncertainty_stated: 0,
    contradictions: 0,
  };

  for (const item of items) {
    const origin = item.claimed_origin;
    if (origin === "unknown") tallies.unknown_origin += 1;
    else if (Object.hasOwn(tallies, origin)) tallies[origin] += 1;
    if (item.uncertainty?.status === "known") tallies.uncertainty_stated += 1;
    const contradicts = Array.isArray(item.contradicts) ? item.contradicts : [];
    if (contradicts.length > 0) tallies.contradictions += 1;

    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category).push({
      id: item.id,
      content: item.content,
      record_kind: item.record_kind,
      claimed_origin: origin,
      origin_label: ORIGIN_LABELS[origin] || ORIGIN_LABELS.unknown,
      uncertainty_status: item.uncertainty?.status === "known" ? "known" : "unknown",
      uncertainty_note: item.uncertainty?.status === "known" ? item.uncertainty.note : null,
      sensitivity: item.sensitivity,
      contradicts,
      claimed_time_status: item.claimed_time?.status === "known" ? "known" : "unknown",
      claimed_time_value: item.claimed_time?.status === "known" ? item.claimed_time.value : null,
    });
  }

  const counts = {};
  for (const key of COUNT_KEYS) {
    if (tallies[key] > 0) counts[key] = tallies[key];
  }

  return {
    ...mirror,
    state: "claims",
    ok: true,
    claim_status: snapshot.claim_status,
    source: snapshot.source,
    categories: [...grouped.entries()].map(([label, group]) => ({ label, items: group })),
    counts,
    advanced: {
      capture_id: snapshot.capture_id,
      captured_at: snapshot.captured_at,
      protocol: snapshot.protocol,
      layer: snapshot.layer,
    },
  };
}
