const STATED_UNCERTAINTY = new Set(["low", "medium"]);

const BUCKETS = [
  { key: "known", origin: "unknown" },
  { key: "inferred", origin: "inference" },
  { key: "recurring_topics", origin: "inference" },
  { key: "working_style", origin: "inference" },
  { key: "unknowns", origin: "unknown" },
];

const PORTRAIT_KEYS = new Set([
  "snapshot_version",
  "status",
  "not_a_diagnosis",
  "not_a_definition_of_person",
  "agent",
  "context_limits",
  "human_review",
  "relationship_summary",
  "answered_at",
  "stamped_at",
  "generated_at",
  "timestamp",
  "known",
  "inferred",
  "recurring_topics",
  "working_style",
  "unknowns",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function looksLikeKysSnapshot(data) {
  if (!isObject(data)) return false;
  if (data.kind === "agent_acquired_context" || data.kind === "agent_acquired_context_annotation") return false;
  if (typeof data.snapshot_version === "string") return true;
  return BUCKETS.some(({ key }) => Array.isArray(data[key]));
}

function claimText(item) {
  if (typeof item === "string") return item.trim();
  if (!isObject(item)) return "";
  return String(item.claim || item.text || item.content || "").trim();
}

function confidenceOf(item) {
  const value = isObject(item) ? item.confidence : "";
  return value === "high" || value === "medium" || value === "low" ? value : "";
}

function basisOf(item) {
  if (!isObject(item)) return "";
  return String(item.basis || item.evidence || "").trim();
}

function contextLimitTexts(value) {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }
  if (!Array.isArray(value)) return [];
  return value.map((entry) => claimText(entry)).filter(Boolean);
}

function pushItem(grouped, category, item) {
  if (!grouped.has(category)) grouped.set(category, []);
  grouped.get(category).push(item);
}

export function buildMirrorFromKysSnapshot(data, raw = null) {
  const grouped = new Map();
  const tallies = {
    explicit_user_statement: 0,
    inference: 0,
    provider_memory: 0,
    unknown_origin: 0,
    uncertainty_stated: 0,
    contradictions: 0,
  };

  for (const bucket of BUCKETS) {
    const entries = Array.isArray(data?.[bucket.key]) ? data[bucket.key] : [];
    entries.forEach((entry, index) => {
      const content = claimText(entry);
      if (!content) return;
      const confidence = confidenceOf(entry);
      const basis = basisOf(entry);
      const uncertain = STATED_UNCERTAINTY.has(confidence);
      const origin = bucket.origin;
      if (origin === "unknown") tallies.unknown_origin += 1;
      else tallies[origin] += 1;
      if (uncertain) tallies.uncertainty_stated += 1;
      const id = isObject(entry) && entry.id ? String(entry.id) : `${bucket.key}-${index}`;
      pushItem(grouped, bucket.key, {
        id,
        content,
        record_kind: bucket.key === "unknowns" ? "unknown" : "claim",
        claimed_origin: origin,
        origin_label: origin === "inference" ? "Inference" : "Unknown origin",
        uncertainty_status: uncertain ? "known" : "unknown",
        uncertainty_note: uncertain ? `Declared confidence: ${confidence}.` : null,
        detail: basis ? `Declared basis: ${basis}` : null,
        sensitivity: "unknown",
        contradicts: [],
        claimed_time_status: "unknown",
        claimed_time_value: null,
      });
    });
  }

  contextLimitTexts(data?.context_limits).forEach((content, index) => {
    tallies.unknown_origin += 1;
    pushItem(grouped, "context_limits", {
      id: `context-limits-${index}`,
      content,
      record_kind: "unknown",
      claimed_origin: "unknown",
      origin_label: "Unknown origin",
      uncertainty_status: "unknown",
      uncertainty_note: null,
      detail: null,
      sensitivity: "unknown",
      contradicts: [],
      claimed_time_status: "unknown",
      claimed_time_value: null,
    });
  });

  const counts = {};
  for (const [key, value] of Object.entries(tallies)) {
    if (value > 0) counts[key] = value;
  }

  const agent = isObject(data?.agent) ? data.agent : {};
  const extensions = [];
  for (const [key, value] of Object.entries(data || {})) {
    if (!PORTRAIT_KEYS.has(key)) extensions.push({ path: `$.${key}`, value });
  }
  for (const key of ["status", "not_a_diagnosis", "not_a_definition_of_person", "human_review"]) {
    if (key in (data || {})) extensions.push({ path: `$.${key}`, value: data[key] });
  }

  const categories = [...grouped.entries()].map(([label, items]) => ({ label, items }));
  const summary = String(data?.relationship_summary || "").trim();

  return {
    schema_version: "cogentia.agent-acquired-context-mirror.v0",
    kind: "agent_acquired_context_mirror",
    state: categories.length > 0 ? "claims" : "unreadable",
    ok: categories.length > 0,
    banner: "This view shows what the agent claims. It is not objective truth.",
    absence_note: "A missing topic is not evidence that the agent has no memory of it.",
    claim_status: "agent_claim_not_fact",
    source: {
      provider: agent.provider || null,
      agent: agent.provider || agent.name || null,
      model: agent.model || null,
      platform: null,
      memory_scope: agent.context_scope || null,
    },
    summary: summary || null,
    categories,
    counts,
    raw,
    extensions,
    diagnostics: categories.length > 0 ? [] : ["This kys snapshot contains no claims."],
    warnings: [
      "This paste is a kys snapshot portrait. It is shown as the agent's claims and was not validated as cogentia.agent-acquired-context.v0.",
    ],
    advanced: {
      capture_id: typeof data?.snapshot_version === "string" ? data.snapshot_version : "kys-snapshot",
      captured_at: null,
      protocol: { prompt_id: "kys-snapshot-0.1", prompt_version: "correction" },
      layer: "kys_snapshot_portrait",
    },
    notices: [],
  };
}
