#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, mock } from "node:test";
import "./lib/memory-capture.js";
import { invokeCapability, listModules, registerModule } from "./lib/v3-modules.js";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { sha256Prefixed } from "./lib/agent-acquired-context.js";

const privateRead = { lockers: { private: { read: true, write: false } } };
const fixture = (name) => fs.readFileSync(new URL(`../prompts/fixtures/agent-acquired-context/${name}`, import.meta.url), "utf8");
const invoke = (text, options = {}) => invokeCapability("memory.capture", { text }, { auth: privateRead, ...options });
const rich = fixture("rich-memory.yaml");

test("discovery exposes only the implementation and private read requirement", () => {
  const descriptor = listModules().find((module) => module.id === "memory.capture.kys-ami");
  assert.equal(descriptor.provider, "kys-ami");
  assert.deepEqual(descriptor.provides.capabilities, ["memory.capture"]);
  assert.deepEqual(descriptor.governance.requires, [{ locker: "private", mode: "read" }]);
  assert.equal(JSON.stringify(listModules()).includes(rich), false);
});

test("private read alone allows capture; absent/public/write-only grants deny before parsing", async () => {
  assert.equal((await invoke(rich)).ok, true);
  let reads = 0;
  const input = { get text() { reads += 1; throw new Error("private input was read"); } };
  for (const auth of [undefined, {}, { lockers: { public: { read: true, write: true } } },
    { lockers: { private: { read: false, write: true } } }]) {
    await assert.rejects(() => invokeCapability("memory.capture", input, { auth }),
      (error) => error.error_class === "tier_forbidden" && !error.message.includes("private input"));
  }
  assert.equal(reads, 0);
  // An input-supplied grant must never override the registry call's auth.
  await assert.rejects(() => invokeCapability("memory.capture", { text: rich, auth: privateRead }),
    (error) => error.error_class === "tier_forbidden");
});

test("all existing ingestion outcomes and evidence survive the v3 wrapper unchanged", async () => {
  for (const name of ["rich-memory.yaml", "limited-memory.yaml", "no-persistent-memory.yaml",
    "ingestion/extra-fields.yaml", "ingestion/missing-source.json", "ingestion/malformed.json"]) {
    const text = fixture(name);
    assert.deepEqual(await invoke(text), ingestAgentAcquiredContext(text), name);
  }
  for (const text of ["", "Only unstructured prose.", `${rich} \r\n`, `\uFEFF${rich}`]) {
    const result = await invoke(text);
    assert.deepEqual(result, ingestAgentAcquiredContext(text));
    assert.equal(result.raw.text, text);
    assert.equal(result.raw.sha256, sha256Prefixed(text));
  }
  const result = await invoke(rich);
  assert.equal(result.normalized.source.provider, "example-agent");
  assert.equal(result.normalized.source.agent, "Example Conversational Agent");
  assert.deepEqual(result.normalized.captured_at, { status: "unknown", value: null });
  assert.deepEqual(result.normalized.items.find((item) => item.id === "item:remote").contradicts, ["item:office"]);
  const unknown = JSON.parse(JSON.stringify(result.normalized));
  unknown.source.provider = "unknown";
  unknown.source.agent = "unknown";
  assert.deepEqual((await invoke(JSON.stringify(unknown))).normalized.source, unknown.source);
});

test("non-string API input is rejected without coercion or disclosure", async () => {
  for (const text of [undefined, null, 3, {}, [rich]]) {
    await assert.rejects(() => invoke(text),
      (error) => error.error_class === "invalid_input" && error.message === "memory.capture requires a text string");
  }
});

test("private synthetic captures emit no logs, network calls or storage writes", async () => {
  const unexpected = () => { throw new Error("unexpected side effect"); };
  const spies = [];
  try {
    for (const name of ["log", "info", "warn", "error", "debug"]) spies.push(mock.method(console, name, unexpected));
    spies.push(mock.method(globalThis, "fetch", unexpected));
    for (const name of ["writeFileSync", "appendFileSync", "createWriteStream"]) spies.push(mock.method(fs, name, unexpected));
    for (const name of ["writeFile", "appendFile"]) spies.push(mock.method(fs.promises, name, unexpected));
    const text = rich.replace("sensitivity: ordinary", "sensitivity: restricted");
    assert.equal((await invoke(text)).ok, true);
    assert.equal((await invoke("{private synthetic malformed capture")).ok, false);
    for (const spy of spies) assert.equal(spy.mock.callCount(), 0);
  } finally {
    for (const spy of spies) spy.mock.restore();
  }
});

test("dispatch rejects ambiguity and conflicting selectors; explicit routing preserves source identity", async () => {
  let calls = 0;
  registerModule({ id: "test.memory.second", provider: "kys-ami",
    provides: { capabilities: ["memory.capture"] }, run: () => { calls += 1; return {}; } });
  for (const options of [{}, { provider: "kys-ami" }]) {
    await assert.rejects(() => invoke(rich, options), (error) => error.error_class === "provider_ambiguous");
  }
  assert.equal(calls, 0);
  assert.equal((await invoke(rich, { moduleId: "memory.capture.kys-ami" })).normalized.source.provider, "example-agent");
  assert.equal((await invoke(rich, { provider: "memory.capture.kys-ami" })).ok, true);
  for (const options of [{ provider: "missing" }, { moduleId: "missing" },
    { moduleId: "memory.capture.kys-ami", provider: "another-provider" }]) {
    await assert.rejects(() => invoke(rich, options), (error) => error.error_class === "provider_not_found");
  }
});
