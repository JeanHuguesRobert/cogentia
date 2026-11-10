/** Conservative Janus importer for F2a append-only fact logs and continuation records.
 * No synthetic historical timestamps: source snapshot observedAt is discovery,
 * event occurred_at only when explicitly present in the fact.
 */
export function importContinuationFacts(facts, { source, observedAt, scope = "public" } = {}) {
  if (!source || !observedAt || Number.isNaN(Date.parse(observedAt))) throw new Error("source and observedAt required");
  if (scope !== "public") throw new Error("private fact snapshots require an authorized importer");
  if (!Array.isArray(facts)) throw new TypeError("facts must be an array");
  const observations = [], edges = [], seen = new Set();
  for (const fact of facts) {
    if (fact?.protocol !== "cogentia.f2a_fact/v1" || !Number.isInteger(fact.seq) || fact.seq < 1 ||
        typeof fact.type !== "string" || !fact.type || !fact.id) throw new Error("invalid F2a fact");
    const key = String(fact.seq) + ":" + String(fact.id);
    if (seen.has(key)) throw new Error("duplicate F2a event identity");
    seen.add(key);
    const occurred_at = typeof fact.occurred_at === "string" && !Number.isNaN(Date.parse(fact.occurred_at))
      ? fact.occurred_at : null;
    const payload = fact.payload || {};
    const subject = String(payload.continuation?.id || payload.continuationRef || payload.choicePointId || payload.id || fact.id);
    observations.push({
      id: source + "#event:" + key, kind: "f2a_" + fact.type, subject, source,
      observed_at: observedAt, occurred_at, epistemic_status: "source_attested",
      seq: fact.seq, source_event_id: fact.id,
      outcome: fact.type === "branch_exhausted" ? "terminal_reported" :
        fact.type === "allocation_decided" ? "allocation_only" : "historical_event",
    });
    if (fact.type === "continuation_registered" && payload.continuation?.id && payload.continuation?.context?.parentRef) {
      edges.push({ subject: payload.continuation.id, predicate: "derived_from",
        object: payload.continuation.context.parentRef, source, observed_at: observedAt,
        occurred_at, evidence_event: key });
    }
    if (fact.type === "evidence_shared" && payload.evidenceId && Array.isArray(payload.recipientRefs)) {
      for (const recipient of payload.recipientRefs) {
        edges.push({ subject: String(recipient), predicate: "references",
          object: String(payload.evidenceId), source, observed_at: observedAt,
          occurred_at, evidence_event: key });
      }
    }
  }
  return { observations, edges, coverage: "attested-F2a-facts-only",
    limitations: ["No timestamp inferred from seq", "Allocation does not imply execution",
      "A branch without terminal evidence is not declared exhausted", "Does not infer readiness or mandate"] };
}
