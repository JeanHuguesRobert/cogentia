#!/usr/bin/env node
/**
 * Reality Test: Fix Bugs First is an attention reminder, not a Principal lock.
 * Does not call GitHub. Reads AGENTS.shared.md and a synthetic register.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shared = fs.readFileSync(path.join(root, "instructions", "AGENTS.shared.md"), "utf8");

const heading = "## Fix Bugs First is an attention reminder, not a lock on the Principal";
assert.ok(shared.includes(heading), "AGENTS.shared must declare FBF as attention reminder");

const section = shared.slice(shared.indexOf(heading));
const untilNext = section.split(/\n## /)[0];

assert.match(untilNext, /stigmergic reminder/i);
assert.match(untilNext, /not.*Engagement Gatekeeper/i);
assert.match(untilNext, /Mention them \*\*once\*\*/i);
assert.match(untilNext, /follow the Principal's present request/i);
assert.doesNotMatch(untilNext, /must refuse the Principal/i);
assert.match(untilNext, /Do not nag/);
assert.match(untilNext, /not.*watch the Principal|dashboard views as surveillance/i);
assert.match(untilNext, /agent self-discipline/);

function attentionTurn({ principalRequest, openPriorityItems, alreadyReminded }) {
  const relevant = openPriorityItems.filter((item) => item.severity === "critical" || item.severity === "high" || item.blocks_features);
  const reminder = !alreadyReminded && relevant.length
    ? relevant.map((item) => `${item.id}: ${item.title}`).join("; ")
    : null;
  return {
    reminder,
    blocked: false,
    proceedsWith: principalRequest,
  };
}

const first = attentionTurn({
  principalRequest: "continue Rossignol smoke, do not fix Guide now",
  alreadyReminded: false,
  openPriorityItems: [
    { id: "OP-BUG-009", title: "Public Guide unreachable", severity: "critical", blocks_features: true },
    { id: "OP-BUG-010", title: "Resumption suite overclaims", severity: "medium", blocks_features: false },
  ],
});
assert.equal(first.blocked, false);
assert.equal(first.proceedsWith, "continue Rossignol smoke, do not fix Guide now");
assert.match(first.reminder, /OP-BUG-009/);

const second = attentionTurn({
  principalRequest: "continue Rossignol smoke, do not fix Guide now",
  alreadyReminded: true,
  openPriorityItems: first.openPriorityItems || [
    { id: "OP-BUG-009", title: "Public Guide unreachable", severity: "critical", blocks_features: true },
  ],
});
assert.equal(second.reminder, null);
assert.equal(second.blocked, false);

console.log(JSON.stringify({
  ok: true,
  protocol: "remind-once-then-follow-principal",
  sample_first_turn_reminder: first.reminder,
  sample_blocked: first.blocked,
}, null, 2));
