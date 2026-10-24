import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { createInteractionSourceAdapter, parseInteractionRows, statusView } from "./lib/corpus-sleep-cycle/interaction-source-adapter.js";
import { runConfiguredInteractions } from "./lib/corpus-sleep-cycle/configured-interactions.js";
import { runCorpusSleepCycle } from "./run-corpus-sleep-cycle.js";
import { runMonteCarloAudit, SleepCycleReviewQueue, discoverCorpusDocuments } from "./lib/corpus-sleep-cycle/index.js";

const from = "2026-10-01T00:00:00Z", through = "2026-10-24T00:00:00Z";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-sources-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, "source"), stateRoot = path.join(root, "private");
  fs.mkdirSync(path.join(repo, "interaction_packets", "packets", "2026"), { recursive: true });
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  const packet = path.join(repo, "interaction_packets", "packets", "2026", "fiction.yaml");
  fs.writeFileSync(packet, 'id: "2026-10-22-001"\ndate: "2026-10-22"\nstatus: awaiting\nsource_messages:\n  sent_gmail_id: "1234567890abcdef"\n  acknowledgment_gmail_id: "1234567890abcdee"\nsubject: SECRET_SUBJECT\n');
  const register = path.join(repo, "interaction_packets", "mail_trace.md");
  fs.writeFileSync(register, "| ID | Date | Subject | Status |\n|---|---|---|---|\n| 2026-10-22-001 | 2026-10-22 | SECRET_PERSON | Sent — awaiting reply |\n");
  const config = { authorized: true, stateRoot, maxCases: 10, repositories: [{ root: repo, name: "private-source" }] };
  const gmailReader = async (request) => request.cases.map((c) => ({ key: c.key, complete: true, events: [
    { kind: "sent", ref: c.sent_id, at: "2026-10-22T08:00:00Z", match: "confirmed", time_basis: "gmail_internaldate" },
    { kind: "auto_ack", ref: "1234567890abcdee", at: "2026-10-22T08:01:00Z", match: "confirmed", time_basis: "gmail_internaldate" },
  ] }));
  const configFile = path.join(root, "config.json"); fs.writeFileSync(configFile, JSON.stringify(config));
  return { root, repo, stateRoot, packet, register, config, configFile, gmailReader };
}

test("Markdown syntax, duplicate inputs and unresolved substantive status stay distinct", () => {
  const parsed = parseInteractionRows("| ID | Date | Status |\n|---|---|---|\n| 2026-10-22-001 | 2026-10-22 | awaiting substantive reply |\n| broken | 2026-10-22 | bad | extra |\n");
  assert.equal(parsed.rows.length, 1); assert.equal(parsed.problems[0].kind, "invalid_markdown_row");
  assert.deepEqual(statusView(parsed.rows[0].raw_status), { status: "awaiting", awaiting_kind: "substantive" });
});

test("real repository adapter reads YAML and registers; aliases and runtime state stay private", async (t) => {
  const f = fixture(t), before = fs.readFileSync(f.packet);
  const adapter = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  const snapshot = await adapter.readSnapshot({ from, through });
  assert.equal(snapshot.cases.length, 1); assert.equal(snapshot.cases[0].visibility, "private");
  assert.ok(!JSON.stringify(snapshot).includes("SECRET"));
  assert.ok(!JSON.stringify(snapshot).includes("1234567890"));
  assert.ok(snapshot.cases[0].representations.length >= 2);
  const result = await runMonteCarloAudit({ root: f.stateRoot, mission: "interaction_evidence", from, now: through, adapter, view: "private", privateAuthorized: true, force: true });
  assert.equal(result.status, "PARTIAL"); assert.equal(result.code, "SOURCE_COVERAGE_LIMITED");
  const findings = new SleepCycleReviewQueue({ root: f.stateRoot }).listPending({ kind: "interaction_evidence" });
  assert.equal(findings[0].decision, "VERIFY"); assert.ok(findings[0].corrections.length);
  assert.equal(findings[0].timestamps.sent_at, null); assert.equal(findings[0].latency_ms.first_ack, null);
  assert.equal(findings[0].provider_observation_timestamps.ack_observed_at, "2026-10-22T08:01:00Z");
  assert.deepEqual(fs.readFileSync(f.packet), before);
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(f.stateRoot, "source-aliases.json")).mode & 0o077, 0);
});

test("public mode excludes private adapter snapshots and aliases", async (t) => {
  const f = fixture(t);
  const adapter = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  const publicRoot = path.join(f.root, "public");
  await runMonteCarloAudit({ root: publicRoot, mission: "interaction_evidence", from, now: through, adapter, force: true });
  const bytes = fs.readFileSync(new SleepCycleReviewQueue({ root: publicRoot }).queueFile, "utf8");
  assert.ok(!bytes.includes("priv:")); assert.ok(!bytes.includes("SECRET"));
});

test("existing SQL projection exports expose date and status disagreements as advice", async (t) => {
  const f = fixture(t), projection = path.join(f.root, "sql-export.json");
  fs.writeFileSync(projection, JSON.stringify([{ id: "2026-10-22-001", date: "2026-10-23", status: "reply_received" }]));
  const adapter = createInteractionSourceAdapter({ ...f.config, projectionFiles: [{ name: "existing-desk-export", path: projection }] }, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  const snapshot = await adapter.readSnapshot({ from, through });
  assert.ok(snapshot.cases[0].diagnostics.some((d) => d.kind === "date_mismatch"));
  assert.ok(snapshot.cases[0].diagnostics.some((d) => d.kind === "representation_disagreement"));
  assert.equal(snapshot.cases[0].representations.length, 3);
});

test("private snapshot is reused across process replacement, then rotates only after completion", async (t) => {
  const f = fixture(t);
  const first = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  const snapshot = await first.readSnapshot({ from, through });
  const replacement = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: () => { throw new Error("must reuse snapshot"); } });
  assert.deepEqual(await replacement.readSnapshot({ from, through }), snapshot);
  replacement.complete(); assert.ok(!fs.existsSync(path.join(f.stateRoot, "active-snapshot.json")));
  assert.ok(fs.existsSync(path.join(f.stateRoot, "source-progress.json")));
});

test("denied Gmail produces typed security receipt without exception data in service output", async (t) => {
  const f = fixture(t);
  const receipt = await runConfiguredInteractions({ configFile: f.configFile, force: true,
    gmailReader: () => { throw Object.assign(new Error("SECRET_DENIAL"), { code: "BLOCKED_SECURITY" }); } });
  assert.equal(receipt.status, "BLOCKED_SECURITY"); assert.ok(!JSON.stringify(receipt).includes("SECRET"));
  assert.ok(fs.existsSync(path.join(f.stateRoot, "last-receipt.json")));
});

test("incremental mail windows retain earlier evidence and overlap late arrivals", async (t) => {
  const f = fixture(t);
  const first = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  await first.readSnapshot({ from, through }); first.complete();
  let since;
  const next = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: async (request) => {
    since = request.cases[0].since;
    return [{ key: request.cases[0].key, complete: true, events: [] }];
  } });
  const snapshot = await next.readSnapshot({ from, through: "2026-10-25T00:00:00Z" });
  assert.equal(since, "2026-10-21T00:00:00.000Z");
  assert.equal(snapshot.cases[0].events.length, 2);
});

test("canonical Git refresh uses its own cache and preserves the source checkout", async (t) => {
  const f = fixture(t);
  const git = (...args) => execFileSync("git", args, { cwd: f.repo, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
  git("init", "--initial-branch=main"); git("add", "interaction_packets");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "Synthetic source");
  git("remote", "add", "origin", f.repo);
  const before = git("status", "--porcelain");
  const config = { ...f.config, refreshRepositories: true };
  const adapter = createInteractionSourceAdapter(config, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  const snapshot = await adapter.readSnapshot({ from, through });
  assert.equal(snapshot.repository_inputs_complete, true); assert.equal(snapshot.cases.length, 1);
  assert.equal(git("status", "--porcelain"), before);
  const aliases = JSON.parse(fs.readFileSync(path.join(f.stateRoot, "source-aliases.json"), "utf8"));
  assert.ok(Object.values(aliases.__provenance).every((p) => p.observed_head === git("rev-parse", "HEAD").trim()));
});

test("scheduled runner actually invokes configured source adapter within existing cycle", async (t) => {
  const f = fixture(t);
  const before = fs.readFileSync(f.register);
  const result = await runCorpusSleepCycle({ root: f.repo, force: true, json: true, noCopEvidence: true,
    skipRepoSync: true, skipConsolidation: true, interactionConfig: f.configFile,
    interactionGmailReader: f.gmailReader, candidateLearningHook: () => ({ status: "completed" }), maxWallTimeMs: 10000 });
  const phase = result.phases.find((p) => p.name === "interaction_evidence");
  assert.equal(phase.status, "PARTIAL"); assert.equal(phase.evidence.processed, 1);
  assert.ok(!JSON.stringify(result).includes("SECRET")); assert.ok(!JSON.stringify(result).includes("priv:"));
  assert.equal(result.status, "completed_partial"); assert.deepEqual(fs.readFileSync(f.register), before);
});

test("acknowledgment does not contradict an explicitly substantive awaiting claim", async (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.register, "| ID | Date | Status |\n|---|---|---|\n| 2026-10-22-001 | 2026-10-22 | awaiting substantive reply |\n");
  const adapter = createInteractionSourceAdapter(f.config, { stateRoot: f.stateRoot, gmailReader: f.gmailReader });
  await runMonteCarloAudit({ root: f.stateRoot, mission: "interaction_evidence", from, now: through, adapter, view: "private", privateAuthorized: true, force: true });
  const finding = new SleepCycleReviewQueue({ root: f.stateRoot }).listPending({ kind: "interaction_evidence" })[0];
  // Only generic YAML "awaiting" may be contradicted; substantive register is preserved.
  assert.equal(finding.corrections.filter((c) => c.reason === "awaiting_despite_observed_inbound").length, 1);
});

test("document discovery honors an exhausted wall budget before scanning", (t) => {
  const f = fixture(t);
  let preempted = false;
  const documents = discoverCorpusDocuments({ root: f.repo, deadlineMs: 0, onPreempt: () => { preempted = true; } });
  assert.deepEqual(documents, []); assert.equal(preempted, true);
});

test("initial interaction-only probe cannot launch the unrelated audit or consolidation", async (t) => {
  const f = fixture(t);
  const result = await runCorpusSleepCycle({ root: f.repo, force: true, json: true, noCopEvidence: true,
    interactionsOnly: true, interactionConfig: f.configFile, interactionGmailReader: f.gmailReader,
    candidateLearningHook: () => { throw new Error("audit must not run in a source probe"); } });
  assert.deepEqual(result.phases.map((p) => p.name), ["resource_qualification", "interaction_evidence"]);
});
