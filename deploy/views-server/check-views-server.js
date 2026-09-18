#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const viewsDir = fs.mkdtempSync(path.join(os.tmpdir(), "views-server-head-"));
const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
fs.writeFileSync(path.join(viewsDir, "sample.md"), "# Sample\n");

const child = spawn(process.execPath, [path.join(here, "views-server.js")], {
  env: { ...process.env, PORT: String(port), VIEWS_DIR: viewsDir },
  stdio: "ignore",
});

try {
  await waitForHealth(`${baseUrl}/api/health`);

  const getHealth = await fetch(`${baseUrl}/api/health`);
  const headHealth = await fetch(`${baseUrl}/api/health`, { method: "HEAD" });
  assert.equal(headHealth.status, getHealth.status);
  assert.equal(headHealth.headers.get("content-type"), getHealth.headers.get("content-type"));
  assert.equal(await headHealth.text(), "");

  const getView = await fetch(`${baseUrl}/views/sample.md?raw`);
  const headView = await fetch(`${baseUrl}/views/sample.md?raw`, { method: "HEAD" });
  assert.equal(headView.status, getView.status);
  assert.equal(headView.headers.get("content-type"), getView.headers.get("content-type"));
  assert.equal(await headView.text(), "");

  const postHealth = await fetch(`${baseUrl}/api/health`, { method: "POST" });
  assert.equal(postHealth.status, 405);
  assert.equal(postHealth.headers.get("allow"), "GET, HEAD");
  assert.equal(await postHealth.text(), "");

  console.log(JSON.stringify({ ok: true, test: "views-server-head" }));
} finally {
  child.kill();
  fs.rmSync(viewsDir, { recursive: true, force: true });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(url) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError;
}
