// #271: optional observational mission. Adapters own source access and disclosure.
// This module only writes advisory signals through the existing review queue.
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { SleepCycleReviewQueue } from "./review-queue.js";

const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const alias = (value) => typeof value === "string" && /^(pub|priv):[a-zA-Z0-9_-]{1,80}$/.test(value);
const instant = (value) => typeof value === "string" && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const kinds = new Set(["sent", "auto_ack", "human_reply", "substantive_reply", "refusal", "delivery_failure", "partial_delivery_failure", "document_receipt", "delivery", "followup_sent", "inbound_unclassified"]);
const actions = new Set(["NO_ACTION", "VERIFY", "FOLLOWUP_CANDIDATE", "ESCALATE"]);

// Only an explicitly authorized public disclosure view crosses this boundary.
// Public aliases are assigned by the source owner; hashes of private IDs are not aliases.
function publicCase(input, options) {
  const privateView = options.view === "private" && options.privateAuthorized === true;
  if (input.visibility === "private" ? !privateView : input.visibility !== "public" || input.disclosure_approved !== true) return null;
  if (!privateView && JSON.stringify(input).includes('"priv:')) throw new Error("PRIVATE_ALIAS_IN_PUBLIC_VIEW");
  if (!alias(input.id) || !alias(input.revision)) throw new Error("INVALID_PUBLIC_VIEW");
  const scope = input.observation_scope || {};
  if (!instant(scope.from) || !instant(scope.through) || Date.parse(scope.from) > Date.parse(scope.through)) throw new Error("INVALID_SCOPE");
  const events = (input.events || []).map((event) => {
    if (!alias(event.ref) || !kinds.has(event.kind) || !instant(event.at)) throw new Error("INVALID_EVENT");
    return { ref: event.ref, kind: event.kind, at: event.at, match: event.match === "confirmed" ? "confirmed" : "ambiguous", time_basis: event.time_basis === "gmail_internaldate" ? "gmail_internaldate" : "source_event_time" };
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.ref.localeCompare(b.ref));
  const expectations = input.expectations || {};
  const policy = input.followup_policy;
  if (policy && (!instant(policy.not_before) || !alias(policy.evidence_ref) || !["legal", "announced", "conventional", "courtesy"].includes(policy.basis))) throw new Error("INVALID_POLICY");
  const representations = (input.representations || []).map((r) => {
    if (!alias(r.ref) || !["awaiting", "reply_received", "fulfilled", "unknown"].includes(r.status)) throw new Error("INVALID_REPRESENTATION");
    return { ref: r.ref, status: r.status, awaiting_kind: ["substantive", "delivery"].includes(r.awaiting_kind) ? r.awaiting_kind : "any_reply" };
  });
  const diagnosticKinds = new Set(["invalid_markdown_row", "duplicate_case", "date_mismatch", "missing_packet_link", "representation_disagreement", "source_locator_missing", "partial_inputs"]);
  const diagnostics = (input.diagnostics || []).map((d) => {
    if (!alias(d.ref) || !diagnosticKinds.has(d.kind)) throw new Error("INVALID_DIAGNOSTIC");
    return { ref: d.ref, kind: d.kind };
  });
  return {
    id: input.id, revision: input.revision, events, representations, diagnostics,
    observation_scope: { from: scope.from, through: scope.through, channel_inspected: scope.channel_inspected === true, complete: scope.complete === true, search_verified: scope.search_verified === true },
    expectations: { substantive: expectations.substantive === true, delivery: expectations.delivery === true },
    // These are source-owner reviewed classifications, never inferred from prose.
    closed: input.closed === true, followup_declined: input.followup_declined === true,
    followup_policy: policy ? { not_before: policy.not_before, evidence_ref: policy.evidence_ref, basis: policy.basis, risk_reviewed: policy.risk_reviewed === true } : null,
  };
}

export function reconcileInteraction(item, now) {
  const scope = item.observation_scope;
  const sent = item.events.find((e) => e.kind === "sent" && e.match === "confirmed");
  const observed = item.events.filter((e) => e.match === "confirmed" && sent && Date.parse(e.at) >= Date.parse(sent.at) && Date.parse(e.at) <= Date.parse(scope.through) && Date.parse(e.at) <= Date.parse(now));
  const first = (...types) => observed.find((e) => types.includes(e.kind))?.at || null;
  const substantive = first("substantive_reply", "refusal");
  const ack = first("auto_ack");
  const human = first("human_reply", "substantive_reply", "refusal");
  const documentReceipt = first("document_receipt");
  const delivery = first("delivery");
  const problems = [];
  if (!sent || Date.parse(sent.at) > Date.parse(now) || Date.parse(scope.through) > Date.parse(now) || (sent && Date.parse(scope.from) > Date.parse(sent.at))) problems.push("invalid_or_incomplete_dates");
  if (!scope.channel_inspected) problems.push("channel_not_inspected");
  if (!scope.complete || !scope.search_verified) problems.push("search_scope_incomplete");
  if (item.events.some((e) => e.match !== "confirmed")) problems.push("ambiguous_correlation");
  if (observed.some((e) => e.kind === "inbound_unclassified")) problems.push("inbound_classification_requires_review");
  if (observed.some((e) => e.time_basis === "gmail_internaldate")) problems.push("provider_timestamp_requires_send_time_review");
  for (const diagnostic of item.diagnostics || []) problems.push(diagnostic.kind);
  if (item.events.some((e) => Date.parse(e.at) > Date.parse(scope.through) || Date.parse(e.at) > Date.parse(now) || (sent && e.kind !== "sent" && Date.parse(e.at) < Date.parse(sent.at)))) problems.push("event_outside_observation");
  const resolved = Boolean((!item.expectations.substantive || substantive) && (!item.expectations.delivery || delivery) && (substantive || delivery));
  let decision = "NO_ACTION";
  let reason = resolved ? "observed_resolution" : "normal_waiting";
  if (problems.length) { decision = "VERIFY"; reason = problems[0]; }
  else if (item.closed || resolved) reason = item.closed ? "source_marked_closed" : reason;
  else if (first("delivery_failure")) { decision = "VERIFY"; reason = "delivery_failure_requires_review"; }
  else if (item.followup_declined || first("followup_sent")) reason = "followup_already_sent_or_declined";
  else if (item.followup_policy && Date.parse(now) >= Date.parse(item.followup_policy.not_before)) {
    if (Date.parse(scope.through) < Date.parse(item.followup_policy.not_before)) { decision = "VERIFY"; reason = "observation_predates_review_window"; }
    else if (item.followup_policy.basis === "legal") { decision = "ESCALATE"; reason = "grounded_legal_review_window"; }
    else if (item.followup_policy.risk_reviewed) { decision = "FOLLOWUP_CANDIDATE"; reason = "grounded_followup_window"; }
    else { decision = "VERIFY"; reason = "followup_risk_not_reviewed"; }
  }
  const reply = ack || human || documentReceipt;
  const corrections = item.representations.flatMap((r) => {
    const relevantReply = r.awaiting_kind === "substantive" ? substantive : r.awaiting_kind === "delivery" ? delivery : reply;
    if (r.status === "awaiting" && relevantReply) return [{ ref: r.ref, reason: "awaiting_despite_observed_inbound", proposed_status: substantive ? "substantive_reply_observed" : "inbound_observed_resolution_unconfirmed" }];
    if (r.status === "fulfilled" && !resolved) return [{ ref: r.ref, reason: "fulfillment_not_grounded", proposed_status: "verify_residual_uncertainty" }];
    return [];
  });
  corrections.push(...(item.diagnostics || []).map((d) => ({ ...d, reason: d.kind, proposed_status: "review_source_representation" })));
  const sourceTime = (at, ...types) => at && observed.some((e) => e.at === at && types.includes(e.kind) && e.time_basis !== "gmail_internaldate") ? at : null;
  const sentTime = sent?.time_basis !== "gmail_internaldate" ? sent?.at || null : null;
  const ackTime = sourceTime(ack, "auto_ack"), humanTime = sourceTime(human, "human_reply", "substantive_reply", "refusal"), substantiveTime = sourceTime(substantive, "substantive_reply", "refusal");
  const latency = (at) => at && sentTime ? Date.parse(at) - Date.parse(sentTime) : null;
  return {
    decision, reason, problems, corrections,
    timestamps: { sent_at: sentTime, first_ack_at: ackTime, first_human_reply_at: humanTime, substantive_reply_at: substantiveTime, last_checked_at: scope.through },
    provider_observation_timestamps: observed.some((e) => e.time_basis === "gmail_internaldate") ? { sent_observed_at: sent?.at || null, ack_observed_at: ack, human_reply_observed_at: human, substantive_reply_observed_at: substantive } : null,
    latency_ms: { first_ack: latency(ackTime), first_human_reply: latency(humanTime), substantive_reply: latency(substantiveTime) },
    observation_scope: scope,
    resolution: { documentary: Boolean(documentReceipt), delivery: Boolean(delivery), substantive: Boolean(substantive), fulfilled: resolved },
  };
}

/**
 * Adapter contract: { authorized: true, readSnapshot({signal, from, through}) }.
 * Returns {cases: [...]}; immutable bounded snapshot, explicit public aliases and
 * disclosure per case. Connectors must honor AbortSignal and date-scoped reads.
 * No connector exception text or source object is persisted or returned.
 */
export async function runInteractionEvidenceMission(options = {}) {
  const { adapter, root, checkpoint = null } = options;
  const now = options.now || new Date().toISOString();
  const maxCases = options.maxCases ?? 20;
  const maxWallTimeMs = options.maxWallTimeMs ?? 1000;
  const readTimeoutMs = options.readTimeoutMs ?? 1000;
  const from = options.from;
  if (!instant(now) || !instant(from) || Date.parse(from) > Date.parse(now) || !Number.isInteger(maxCases) || maxCases < 1 || !Number.isFinite(maxWallTimeMs) || maxWallTimeMs <= 0 || !Number.isFinite(readTimeoutMs) || readTimeoutMs <= 0) throw new Error("INVALID_MISSION_BUDGET_OR_SCOPE");
  const queue = new SleepCycleReviewQueue({ root });
  const started = performance.now();
  const finish = (status, code, state = null, processed = 0) => {
    const receipt = { schema: "cogentia.interaction-receipt/v1", status, phase: "interaction_evidence", code, checkpoint: state, processed, visibility: options.view === "private" ? "private" : "public" };
    queue.appendSignals([{ id: `interaction_receipt_${hash(receipt)}`, signal_kind: "interaction_receipt", severity: status === "COMPLETED" ? "info" : "warning", review_status: "pending_review", ...receipt }]);
    return receipt;
  };
  if (options.resumeUnavailable) return finish("PARTIAL", "CONTINUATION_UNAVAILABLE");
  if (!adapter?.authorized || typeof adapter.readSnapshot !== "function") return finish("BLOCKED_SECURITY", "AUTHORIZED_ADAPTER_REQUIRED");
  let snapshot;
  let timer;
  const controller = new AbortController();
  try {
    snapshot = await Promise.race([
      Promise.resolve().then(() => adapter.readSnapshot({ signal: controller.signal, from, through: now })),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Object.assign(new Error(), { code: "READ_TIMEOUT" })); }, Math.min(readTimeoutMs, maxWallTimeMs)); }),
    ]);
  } catch (error) {
    const code = ["READ_TIMEOUT", "GMAIL_CREDENTIALS_UNAVAILABLE", "GMAIL_IMAP_AUTH_DENIED", "GMAIL_IMAP_READ_FAILED", "GMAIL_METADATA_READ_FAILED", "SOURCE_CHANGED_DURING_READ", "GMAIL_CACHE_LIMIT"].includes(error?.code) ? error.code : "ADAPTER_UNAVAILABLE";
    return finish(["EACCES", "EPERM", "BLOCKED_SECURITY", "401", "403", "GMAIL_CREDENTIALS_UNAVAILABLE", "GMAIL_IMAP_AUTH_DENIED"].includes(String(error?.code)) ? "BLOCKED_SECURITY" : "PARTIAL", code);
  } finally { clearTimeout(timer); }
  let cases;
  try {
    if (!Array.isArray(snapshot?.cases) || snapshot.cases.length > 1000) throw new Error();
    cases = snapshot.cases.map((c) => publicCase(c, options)).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id));
    if (new Set(cases.map((c) => c.id)).size !== cases.length) throw new Error();
  } catch { return finish("PARTIAL", "INVALID_PUBLIC_SNAPSHOT"); }
  // Checkpoint contains only the approved public view, never private locators.
  const snapshotKey = hash({ cases, from, now });
  if (checkpoint && (checkpoint.snapshot_key !== snapshotKey || !Number.isInteger(checkpoint.next_index) || checkpoint.next_index < 0 || checkpoint.next_index > cases.length)) return finish("PARTIAL", "CHECKPOINT_SNAPSHOT_MISMATCH");
  let index = checkpoint?.next_index || 0;
  let processed = 0;
  for (; index < cases.length; index++) {
    if (processed >= maxCases || performance.now() - started >= maxWallTimeMs || options.shouldPreempt?.()) break;
    const item = cases[index];
    const result = reconcileInteraction(item, now);
    if (!actions.has(result.decision)) throw new Error("INVALID_DECISION");
    // Observation timestamps do not generate repeated advice on unchanged evidence.
    const { observation_scope, timestamps, ...material } = result;
    const id = `interaction_${hash({ id: item.id, revision: item.revision, material })}`;
    const previous = [...queue.loadAllSignalsMap().values()].filter((s) => s.signal_kind === "interaction_evidence" && s.interaction_ref === item.id);
    const rejected = previous.some((s) => s.review_status === "rejected" && s.decision === "FOLLOWUP_CANDIDATE");
    if (rejected && result.decision === "FOLLOWUP_CANDIDATE") { result.decision = "NO_ACTION"; result.reason = "reviewer_declined_followup"; }
    const effectiveId = rejected ? `${id}_declined` : id;
    queue.appendSignals([{
      schema: "cogentia.interaction-finding/v1", id: effectiveId,
      signal_kind: "interaction_evidence", interaction_ref: item.id,
      severity: result.corrections.length || result.decision === "ESCALATE" ? "error" : result.decision === "VERIFY" ? "warning" : "info",
      review_status: "pending_review", method: "interaction_evidence_v1", ...result,
      evidence_refs: item.events.map((e) => e.ref),
      policy_ref: item.followup_policy?.evidence_ref || null,
      supersedes: previous.filter((s) => s.id !== effectiveId).map((s) => s.id),
      safe_next_action: "review_only_separate_authorization_for_source_correction_or_send",
      continuation: { packet_kind: "continuation", status: "prepared", effect_ceiling: "advisory_only", mandate_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/271" },
    }]);
    if (options.minePatterns) {
      const latest = new Map();
      for (const signal of queue.loadAllSignalsMap().values()) {
        if (signal.signal_kind === "interaction_evidence" && !signal.superseded_by) latest.set(signal.interaction_ref, signal);
      }
      // One bounded, provisional structure; no subsystem, motivations or promotion.
      const observed = [...latest.values()].filter((s) => s.resolution?.documentary);
      const recurrence = observed.filter((s) => !s.resolution.delivery).map((s) => s.id).sort();
      const counterexamples = observed.filter((s) => s.resolution.delivery).map((s) => s.id).sort();
      if (recurrence.length >= 2) queue.appendSignals([{
        schema: "cogentia.pattern-candidate/v1",
        id: `interaction_pattern_${hash({ recurrence, counterexamples })}`,
        signal_kind: "PatternCandidate", severity: "info", review_status: "pending_review",
        status: "provisional", structure: "document_receipt_without_delivery_evidence",
        context: "documentary_and_logistical_subquestions", forces: ["distinct_evidence_requirements"],
        response: "verify_delivery_separately", evidence_refs: recurrence, counterexamples,
        uncertainty: "recurrence_does_not_establish_shared_cause_or_intent",
        safe_next_action: "test_another_real_case_then_overlap_review_before_any_promotion",
        pattern_ref: "https://github.com/JeanHuguesRobert/cogentia/blob/main/patterns/pattern-mining/PATTERN.md",
      }]);
    }
    processed++;
  }
  const state = { mission: "interaction_evidence", snapshot_key: snapshotKey, next_index: index, from, through: now };
  return finish(index < cases.length ? "PREEMPTED" : snapshot.coverage_limited ? "PARTIAL" : "COMPLETED", index < cases.length ? "BOUNDED_PREEMPTION" : snapshot.coverage_limited ? "SOURCE_COVERAGE_LIMITED" : "PUBLIC_SNAPSHOT_RECONCILED", state, processed);
}
