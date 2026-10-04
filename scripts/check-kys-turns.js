#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSnapshot } from "../apps/personal/src/lib/kys-snapshot.js";
import {
  describePrompt,
  describeResponse,
  emptyLog,
  ensureNextTurn,
  formatDual,
  forwardIntent,
  goBack,
  goForward,
  loadTurnLog,
  markCorrectionOffered,
  offsetSentence,
  recordParsedResponse,
  recordPromptCopy,
  relateClocks,
  saveTurnLog,
  setCursor,
  turnOf,
  updateResponseText,
} from "../apps/personal/src/lib/turns.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date("2026-10-04T15:00:00.000Z");
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
const copied = formatDual(fiveMinutesAgo, now);
assert.match(copied.relative, /il y a/);
assert.match(copied.absolute, /2026/);

const ahead = relateClocks("2026-10-04T17:04:00+02:00", now.toISOString(), 60);
assert.equal(ahead.kind, "indicated");
assert.equal(ahead.shiftMinutes, 60);
assert.match(offsetSentence(ahead), /en avance de 1 heure/);

const behind = relateClocks("2026-10-04T12:00:00+00:00", now.toISOString(), 120);
assert.equal(behind.kind, "indicated");
assert.equal(behind.shiftMinutes, -120);
assert.match(offsetSentence(behind), /en retard de 2 heures/);

const local = new Date(2026, 9, 4, 15, 8, 0);
const estimated = relateClocks("2026-10-04T17:05:00", local.toISOString());
assert.equal(estimated.kind, "estimated");
assert.equal(estimated.shiftMinutes, 120);
assert.equal(estimated.residualMinutes, -3);
assert.match(offsetSentence(estimated), /en avance de 2 heures/);
assert.match(offsetSentence(estimated), /3 minutes/);

const sameZone = relateClocks("2026-10-04T15:20:00", local.toISOString());
assert.equal(sameZone.kind, "same-zone");
assert.match(offsetSentence(sameZone), /Pas de décalage d'heure/);

const unmatched = relateClocks("2026-10-04T15:48:00", local.toISOString());
assert.equal(unmatched.kind, "uncompared");
assert.match(offsetSentence(unmatched), /celle écrite par l'agent/);

const promptLine = describePrompt({ produced_at: fiveMinutesAgo, copied_at: fiveMinutesAgo }, now);
assert.equal(promptLine.label, "Prompt copié");
assert.match(promptLine.relative, /il y a/);

const responseLines = describeResponse({
  agent_stamped_at: "2026-10-04T17:04:00+02:00",
  pasted_at: now.toISOString(),
}, now, 60);
assert.equal(responseLines[0].key, "agent");
assert.match(responseLines[0].offset, /en avance de 1 heure/);
assert.equal(responseLines[1].key, "pasted");

const text = '{"known":["Une phrase stable."]}';
let log = emptyLog("2026-10-04T12:00:00.000Z");
log = recordPromptCopy(log, 1, "prompt de tour 1", "2026-10-04T12:01:00.000Z");
log = updateResponseText(log, 1, text);
assert.equal(forwardIntent(log).kind, "paste");
log = setCursor(log, 1, 2);
assert.equal(forwardIntent(log).kind, "parse");
log = recordParsedResponse(log, 1, {
  text,
  pastedAt: "2026-10-04T12:05:00.000Z",
  agentStamp: "2026-10-04T14:05:00+02:00",
  snapshot: { relationship_summary: "Résumé", known: [{ claim: "Une phrase stable." }] },
  keepReviews: false,
  advance: true,
});
assert.equal(log.cursor.step, 3);
assert.equal(turnOf(log).response.agent_stamped_at, "2026-10-04T14:05:00+02:00");
const restored = goBack(log);
assert.equal(restored.cursor.step, 2);
assert.equal(turnOf(restored).response.text, text);
const skipped = goForward(setCursor(restored, 1, 1));
assert.deepEqual(skipped.cursor, { turn: 1, step: 3 });
assert.equal(forwardIntent(setCursor(restored, 1, 1)).kind, "skip");

log = ensureNextTurn(markCorrectionOffered(log, 1), {
  after: 1,
  text: "prompt de correction",
  producedAt: "2026-10-04T12:10:00.000Z",
  copiedAt: "2026-10-04T12:11:00.000Z",
});
assert.equal(turnOf(log, 1).response.text, text);
assert.equal(turnOf(log, 2).prompt.copied_at, "2026-10-04T12:11:00.000Z");
assert.equal(forwardIntent(log).kind, "next-turn");
assert.deepEqual(goForward(log).cursor, { turn: 2, step: 1 });
assert.deepEqual(goBack(goForward(log)).cursor, { turn: 1, step: 3 });

const second = '{"known":["Une phrase du second tour."]}';
log = updateResponseText(setCursor(log, 2, 2), 2, second);
log = recordParsedResponse(log, 2, {
  text: second,
  pastedAt: "2026-10-04T12:20:00.000Z",
  agentStamp: null,
  snapshot: { known: [{ claim: "Une phrase du second tour." }] },
  keepReviews: false,
  advance: true,
});
assert.equal(forwardIntent(setCursor(log, 1, 3)).kind, "skip");
assert.deepEqual(goForward(setCursor(log, 1, 3)).cursor, { turn: 2, step: 3 });
assert.equal(turnOf(goBack(setCursor(log, 2, 1)), 1).snapshot.known[0].claim, "Une phrase stable.");

const storage = {
  items: new Map(),
  getItem(key) { return this.items.has(key) ? this.items.get(key) : null; },
  setItem(key, value) { this.items.set(key, String(value)); },
};
saveTurnLog(storage, log);
const loaded = loadTurnLog(storage, "2026-10-04T13:00:00.000Z");
assert.equal(loaded.cursor.turn, 2);
assert.equal(turnOf(loaded, 1).prompt.copied_at, "2026-10-04T12:01:00.000Z");
assert.equal(turnOf(loaded, 2).response.text, second);

const normalized = normalizeSnapshot({
  snapshot_version: "kys-snapshot-0.2",
  answered_at: "2026-10-04T12:00:00+00:00",
  known: [{ claim: "Une phrase.", basis: "Essai", confidence: "high" }],
}, "Example");
assert.equal(normalized.answered_at, "2026-10-04T12:00:00+00:00");

const snapshotSource = fs.readFileSync(path.join(root, "apps/personal/src/pages/Snapshot.jsx"), "utf8");
const turnBarSource = fs.readFileSync(path.join(root, "apps/personal/src/components/TurnBar.jsx"), "utf8");
const mirrorSource = fs.readFileSync(path.join(root, "apps/personal/src/pages/LearnedContextMirror.jsx"), "utf8");
assert.equal(snapshotSource.includes("data-turn={turn.number}"), true);
assert.equal(turnBarSource.includes("← Retour"), true);
assert.equal(turnBarSource.includes("passer l’interrogation"), true);
assert.equal(snapshotSource.includes("if (label === 'correction') setCorrectionOffered(true)"), true);
assert.equal(mirrorSource.includes("localStorage"), false);
assert.equal(mirrorSource.includes("Tour {turn.number}"), true);

console.log("kys turns: ok");
