#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  enqueueOutbox,
  listPendingOutbox,
  markOutboxDelivered,
  markOutboxFailed,
  outboxStats,
} from "./ops/edge/lib/outbox.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "edge-outbox-"));

const record = enqueueOutbox(tmpDir, {
  kind: "http.post",
  target: "blackboard.site-edge",
  payload: {
    method: "POST",
    url: "https://example.test/ops/blackboard/upsert",
    headers: { Authorization: "Bearer test" },
    body: { event: "cop/attractor.advertised" },
  },
});
assert.equal(record.state, "pending");

const pending = listPendingOutbox(tmpDir);
assert.equal(pending.length, 1);
assert.equal(pending[0].target, "blackboard.site-edge");

markOutboxDelivered(pending[0]);
assert.equal(listPendingOutbox(tmpDir).length, 0);

const retry = enqueueOutbox(tmpDir, {
  target: "domotics.event",
  payload: { method: "POST", url: "https://example.test/event", body: { n: 1 } },
});
const row = listPendingOutbox(tmpDir)[0];
const failed = markOutboxFailed(row, "network_down");
assert.equal(failed.state, "pending");
assert.equal(failed.attempts, 1);

const stats = outboxStats(tmpDir);
assert.equal(stats.pending, 1);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, tests: ["enqueue", "deliver", "retry", "stats"] }));