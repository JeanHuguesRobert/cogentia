// Synthetic end-to-end acceptance checks for #271. No account or source writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runMonteCarloAudit, SleepCycleReviewQueue } from "./lib/corpus-sleep-cycle/index.js";

const from = "2026-10-01T10:00:00+02:00";
const now = "2026-10-23T10:00:00+02:00";
const event = (kind, at = from, ref = kind) => ({ kind, at, ref: `pub:${ref}`, match: "confirmed" });
function fixture(id = "case") {
  return { id: `pub:${id}`, revision: "pub:v1", visibility: "public", disclosure_approved: true,
    observation_scope: { from, through: now, complete: true, channel_inspected: true, search_verified: true },
    expectations: { substantive: true }, events: [event("sent")],
    representations: [{ ref: "pub:register", status: "awaiting" }, { ref: "pub:yaml", status: "awaiting" }] };
}
function harness(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-271-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const queue = new SleepCycleReviewQueue({ root });
  const run = (cases, extra = {}) => runMonteCarloAudit({ root, force: true, mission: "interaction_evidence", from, now,
    adapter: { authorized: true, readSnapshot: async () => ({ cases }) }, ...extra });
  const findings = () => [...queue.loadAllSignalsMap().values()].filter((s) => s.signal_kind === "interaction_evidence");
  return { root, queue, run, findings };
}

test("ack, human and substantive timestamps remain distinct; stale views are advisory", async (t) => {
  const h = harness(t), c = fixture();
  c.events.push(event("auto_ack", "2026-10-01T10:01:00+02:00"), event("human_reply", "2026-10-02T10:00:00+02:00"), event("substantive_reply", "2026-10-03T10:00:00+02:00"));
  const source = path.join(h.root, "source.json");
  fs.writeFileSync(source, JSON.stringify(c));
  const before = fs.readFileSync(source);
  assert.equal((await h.run([c])).status, "COMPLETED");
  const f = h.findings()[0];
  assert.deepEqual(f.latency_ms, { first_ack: 60000, first_human_reply: 86400000, substantive_reply: 172800000 });
  assert.equal(f.corrections.length, 2);
  assert.equal(f.decision, "NO_ACTION");
  assert.equal(f.continuation.effect_ceiling, "advisory_only");
  assert.deepEqual(fs.readFileSync(source), before);
});

test("two unanswered sends have scoped observations and null latency, never historical zero", async (t) => {
  const h = harness(t);
  await h.run([fixture("one"), fixture("two")]);
  for (const f of h.findings()) {
    assert.equal(f.timestamps.substantive_reply_at, null);
    assert.equal(f.latency_ms.first_human_reply, null);
    assert.equal(f.observation_scope.through, now);
    assert.equal(f.decision, "NO_ACTION");
  }
});

test("public output excludes private bodies, Gmail IDs, titles, exception text and checkpoint injection", async (t) => {
  const h = harness(t), c = fixture();
  c.body = "SECRET_BODY"; c.gmail_id = "SECRET_ID"; c.title = "SECRET_PERSON";
  await h.run([c, { visibility: "private", id: "SECRET_PRIVATE", body: "SECRET_MEDICAL" }]);
  const blocked = await h.run([], { checkpoint: { payload: "SECRET_CHECKPOINT" }, adapter: { authorized: true, readSnapshot: () => { throw Object.assign(new Error("SECRET_ERROR"), { code: "EACCES" }); } } });
  assert.equal(blocked.status, "BLOCKED_SECURITY");
  const bytes = fs.readFileSync(h.queue.queueFile, "utf8") + JSON.stringify(blocked);
  assert.ok(!bytes.includes("SECRET"));
});

test("same evidence deduplicates; preemption resumes persisted snapshot without loss", async (t) => {
  const h = harness(t), cases = [fixture("a"), fixture("b"), fixture("c")];
  const first = await h.run(cases, { maxCases: 1 });
  assert.equal(first.status, "PREEMPTED");
  assert.ok(first.continuation.id);
  const second = await h.run(cases, { resume: first.continuation.id });
  assert.equal(second.status, "COMPLETED");
  assert.equal(second.processed, 2);
  await h.run(cases);
  assert.equal(h.findings().length, 3);
  cases[0].revision = "pub:v2";
  assert.equal((await h.run(cases, { checkpoint: first.checkpoint })).code, "CHECKPOINT_SNAPSHOT_MISMATCH");
  assert.equal((await h.run(cases, { resume: "missing-continuation" })).code, "CONTINUATION_UNAVAILABLE");
});

test("foreground preemption and qualification use the existing engine", async (t) => {
  const h = harness(t);
  const busy = await h.run([fixture()], { force: false, thresholds: { max_active_requests: -1 } });
  assert.equal(busy.status, "deferred");
  const paused = await h.run([fixture()], { shouldPreempt: () => true });
  assert.equal(paused.processed, 0);
  assert.equal(paused.status, "PREEMPTED");
});

test("missing, denied and hung adapters produce durable bounded typed receipts", async (t) => {
  const h = harness(t);
  assert.equal((await h.run([], { adapter: null })).status, "BLOCKED_SECURITY");
  assert.equal((await h.run([], { adapter: { authorized: true, readSnapshot: () => { throw { code: 403 }; } } })).status, "BLOCKED_SECURITY");
  assert.equal((await h.run([], { adapter: { authorized: true, readSnapshot: () => { throw new Error("network"); } } })).status, "PARTIAL");
  let aborted = false;
  const hung = await h.run([], { readTimeoutMs: 15, adapter: { authorized: true, readSnapshot: ({ signal }) => { signal.addEventListener("abort", () => { aborted = true; }); return new Promise(() => {}); } } });
  assert.equal(hung.code, "READ_TIMEOUT"); assert.ok(aborted);
  assert.ok([...h.queue.loadAllSignalsMap().values()].some((s) => s.signal_kind === "interaction_receipt" && s.status === "BLOCKED_SECURITY"));
});

test("document receipt does not prove delivery or substantive resolution", async (t) => {
  const h = harness(t), c = fixture();
  c.expectations.delivery = true;
  c.events.push(event("document_receipt"));
  c.representations[0].status = "fulfilled";
  await h.run([c]);
  const f = h.findings()[0];
  assert.deepEqual(f.resolution, { documentary: true, delivery: false, substantive: false, fulfilled: false });
  assert.ok(f.corrections.some((r) => r.reason === "fulfillment_not_grounded"));
});

test("wrong-domain search and uninspected original channel produce VERIFY, never false silence", async (t) => {
  const h = harness(t), a = fixture("wrong-domain"), b = fixture("other-channel");
  a.observation_scope.search_verified = false;
  a.events.push(event("human_reply"));
  b.observation_scope.channel_inspected = false;
  await h.run([a, b], { minePatterns: true });
  assert.ok(h.findings().every((f) => f.decision === "VERIFY"));
  assert.ok(h.findings().some((f) => f.reason === "channel_not_inspected"));
  // Superficially similar cases with different causes do not promote a Pattern.
  assert.ok(![...h.queue.loadAllSignalsMap().values()].some((f) => ["Pattern", "PatternCandidate"].includes(f.signal_kind)));
});

test("recent CADA-like acknowledgment preserves waiting; grounded legal window escalates", async (t) => {
  const h = harness(t), c = fixture();
  c.events.push(event("auto_ack", "2026-10-22T10:00:00+02:00"));
  c.events.push(event("partial_delivery_failure", "2026-10-22T09:59:00+02:00"));
  c.followup_policy = { basis: "legal", not_before: "2026-10-24T10:00:00+02:00", evidence_ref: "pub:reviewed-deadline" };
  await h.run([c]);
  assert.equal(h.findings()[0].decision, "NO_ACTION");
  c.revision = "pub:v2";
  c.followup_policy.not_before = "2026-10-23T09:00:00+02:00";
  await h.run([c]);
  assert.equal(h.findings().at(-1).decision, "ESCALATE");
  assert.equal(h.findings().at(-1).timestamps.substantive_reply_at, null);
});

test("followup recommendation is superseded by substantive reply; sent or declined suppresses repetition", async (t) => {
  const h = harness(t), c = fixture();
  c.followup_policy = { basis: "announced", not_before: "2026-10-22T09:00:00+02:00", evidence_ref: "pub:window", risk_reviewed: true };
  await h.run([c]);
  const first = h.findings()[0];
  assert.equal(first.decision, "FOLLOWUP_CANDIDATE");
  h.queue.recordReviewDecision(first.id, { decision: "rejected" });
  await h.run([c]);
  assert.equal(h.findings().at(-1).decision, "NO_ACTION");
  c.revision = "pub:v2"; c.events.push(event("substantive_reply", "2026-10-23T09:00:00+02:00"));
  await h.run([c]);
  const latest = h.findings().at(-1);
  assert.equal(latest.decision, "NO_ACTION"); assert.ok(latest.supersedes.includes(first.id));
  assert.ok(!h.queue.listPending().some((s) => s.id === first.id));
  assert.ok(h.queue.listPending().some((s) => s.id === latest.id));
  const sent = fixture("sent"), declined = fixture("declined");
  sent.followup_policy = c.followup_policy; sent.events.push(event("followup_sent"));
  declined.followup_policy = c.followup_policy; declined.followup_declined = true;
  await h.run([sent, declined]);
  assert.ok(h.findings().slice(-2).every((f) => f.decision === "NO_ACTION"));
});

test("invalid dates, ambiguous matching and stale coverage cannot justify escalation", async (t) => {
  const h = harness(t), c = fixture();
  c.followup_policy = { basis: "legal", not_before: "2026-10-22T09:00:00+02:00", evidence_ref: "pub:deadline" };
  c.observation_scope.through = "2026-10-21T09:00:00+02:00";
  await h.run([c]); assert.equal(h.findings()[0].decision, "VERIFY");
  c.revision = "pub:v2"; c.observation_scope.through = now;
  c.events.push({ ...event("human_reply"), match: "ambiguous" });
  await h.run([c]); assert.equal(h.findings().at(-1).reason, "ambiguous_correlation");
  c.events[0].at = "unknown";
  assert.equal((await h.run([c])).code, "INVALID_PUBLIC_SNAPSHOT");
});

test("optional PatternCandidate is provisional, deduplicated across preemption and retains counterexamples", async (t) => {
  const h = harness(t), a = fixture("a"), b = fixture("b"), counterexample = fixture("c");
  for (const c of [a, b, counterexample]) { c.expectations.delivery = true; c.events.push(event("document_receipt")); }
  counterexample.events.push(event("delivery"));
  const cases = [a, b, counterexample];
  const first = await h.run(cases, { maxCases: 1, minePatterns: true });
  await h.run(cases, { resume: first.continuation.id, minePatterns: true });
  const patterns = () => [...h.queue.loadAllSignalsMap().values()].filter((s) => s.signal_kind === "PatternCandidate");
  const latest = patterns().at(-1), count = patterns().length;
  assert.equal(latest.status, "provisional");
  assert.equal(latest.evidence_refs.length, 2); assert.equal(latest.counterexamples.length, 1);
  await h.run(cases, { minePatterns: true });
  assert.equal(patterns().length, count);
});
