/**
 * Evidence packet: frozen intermediate product of corpus exploration.
 * Synthesis must treat this as the only open library.
 */

export function createEmptyPacket(input = {}) {
  return {
    protocol: "cogentia.evidence_packet/v1",
    question: String(input.question || "").trim(),
    locale: input.locale === "fr" ? "fr" : "en",
    intent: String(input.intent || "explain"),
    coverage: "none",
    excerpts: [],
    source_ids: [],
    gaps: [],
    freshness: {
      required: Boolean(input.freshnessRequired),
      verified: false,
    },
    diagnostics: {
      tool_calls: 0,
      search_calls: 0,
      open_calls: 0,
      expand_calls: 0,
      index_hash: null,
      path: null,
    },
  };
}

export function buildEvidencePacket({ question, locale, intent, freshnessRequired, excerpts, diagnostics, gaps } = {}) {
  const packet = createEmptyPacket({ question, locale, intent, freshnessRequired });
  const clean = [];
  const seen = new Set();
  for (const item of excerpts || []) {
    const sourceId = String(item?.source_id || "").trim();
    const text = String(item?.text || "").replace(/\s+/g, " ").trim();
    if (!sourceId || !text || seen.has(sourceId)) continue;
    seen.add(sourceId);
    clean.push({
      source_id: sourceId.slice(0, 240),
      text: text.slice(0, 1800),
      why_relevant: String(item.why_relevant || "").slice(0, 200),
    });
  }
  packet.excerpts = clean.slice(0, 12);
  packet.source_ids = packet.excerpts.map(item => item.source_id);
  packet.coverage = coverageFor(packet.excerpts.length, gaps);
  packet.gaps = Array.isArray(gaps) ? gaps.map(value => String(value).slice(0, 120)).slice(0, 8) : [];
  if (diagnostics && typeof diagnostics === "object") {
    packet.diagnostics = { ...packet.diagnostics, ...diagnostics };
  }
  return packet;
}

export function assessPacketSufficiency(packet = {}) {
  const issues = [];
  const excerptCount = Array.isArray(packet.excerpts) ? packet.excerpts.length : 0;
  if (excerptCount < 1) issues.push("no_excerpts");
  if (packet.freshness?.required && !packet.freshness?.verified) issues.push("freshness_unverified");
  return {
    sufficient: issues.length === 0,
    issues,
    excerptCount,
    coverage: packet.coverage || "none",
  };
}

function coverageFor(count, gaps) {
  if (count <= 0) return "none";
  if (Array.isArray(gaps) && gaps.length) return "partial";
  if (count >= 2) return "enough";
  return "partial";
}
