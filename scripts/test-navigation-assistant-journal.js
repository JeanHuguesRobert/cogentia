#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createJournal, SKIP_CODES } from "./lib/navigation-assistant/journal.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nav-journal-"));
const file = path.join(dir, "journal.jsonl");

const first = createJournal({ path: file, memoryCap: 4, persistCap: 6 });
assert.equal(first.append("info", "bridge.ping", "pong"), null);
assert.equal(first.sequence, 0);
assert.equal(first.events.length, 0);
assert.equal(SKIP_CODES.has("bridge.ping"), true);

first.append("info", "page.activeChanged", "tab", { tabId: 1 });
first.append("info", "page.event", "focus");
first.append("info", "bridge.ping", "ignored");
first.append("info", "recording-started", "hint");
assert.equal(first.sequence, 3);
assert.equal(first.events.map((e) => e.code).join(","), "page.activeChanged,page.event,recording-started");
first.flush();
first.close();

const second = createJournal({ path: file, memoryCap: 4, persistCap: 6 });
assert.equal(second.sequence, 3);
assert.equal(second.events.at(-1).code, "recording-started");
second.append("info", "recording-stopped", "hint-end");
assert.equal(second.sequence, 4);
second.close();

const third = createJournal({ path: file, memoryCap: 2, persistCap: 3 });
assert.equal(third.events.length, 2);
assert.equal(third.sequence, 4);
assert.equal(third.events[0].code, "recording-started");
assert.equal(third.events[1].code, "recording-stopped");
for (let i = 0; i < 8; i += 1) third.append("info", "page.event", `n${i}`);
third.close();

const compact = createJournal({ path: file, memoryCap: 3, persistCap: 3 });
assert.equal(compact.events.length, 3);
assert.equal(compact.sequence, 12);
compact.close();

const broken = path.join(dir, "broken.jsonl");
fs.writeFileSync(broken, "{not json\n{\"sequence\":7,\"code\":\"page.event\",\"level\":\"info\",\"message\":\"ok\"}\n", "utf8");
const recovered = createJournal({ path: broken, memoryCap: 10, persistCap: 10 });
assert.equal(recovered.sequence, 7);
assert.equal(recovered.events.length, 1);
recovered.close();

const memoryOnly = createJournal({ path: "", memoryCap: 2, persistCap: 2 });
memoryOnly.append("info", "page.event", "a");
memoryOnly.append("info", "page.event", "b");
memoryOnly.append("info", "page.event", "c");
assert.equal(memoryOnly.events.length, 2);
assert.equal(memoryOnly.sequence, 3);
memoryOnly.close();

fs.rmSync(dir, { recursive: true, force: true });
console.log("navigation assistant journal: ok");
