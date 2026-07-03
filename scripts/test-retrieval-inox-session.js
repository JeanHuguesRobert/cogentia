#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrievalInoxPackBatch } from "./lib/retrieval-inox-session.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inoxRoot = path.join(root, "..", "Inox");
const token = "test-cogentia-inox-session";
const surveyEnv = loadSurveyEnv();

const clientBase = {
  COGENTIA_INOX_SERVE_TOKEN: token,
  COGENTIA_RETRIEVAL_CORPUS_KEY: "cogentia-public",
};

const noSecret = await runInoxScenario({
  label: "continuation_without_secrets",
  inoxEnv: { SUPABASE_URL: "", OPENAI_API_KEY: "" },
  clientEnv: clientBase,
  async test(base) {
    const missing = await retrievalInoxPackBatch(["session loop test"], {
      env: { ...clientBase, COGENTIA_INOX_RETRIEVAL_URL: base },
      mode: "keyword",
      limit: 1,
      budget: 500,
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "continuation_fulfillment_required");
    assert.ok(missing.continuation?.pending?.length >= 1);
  },
});

let fulfillmentLoop = false;
if (surveyEnv.SUPABASE_URL && surveyEnv.SUPABASE_SERVICE_ROLE_KEY) {
  await runInoxScenario({
    label: "fulfillment_loop",
    inoxEnv: { SUPABASE_URL: "", OPENAI_API_KEY: "" },
    clientEnv: { ...clientBase, ...surveyEnv },
    async test(base) {
      const loop = await retrievalInoxPackBatch(["session loop live"], {
        env: { ...clientBase, ...surveyEnv, COGENTIA_INOX_RETRIEVAL_URL: base },
        mode: "keyword",
        limit: 1,
        budget: 500,
      });
      assert.equal(loop.ok, true, JSON.stringify(loop));
      assert.equal(loop.retrieval_transport, "inox.session.v1");
      assert.ok(loop.packs?.[0]?.sources?.length > 0);
      fulfillmentLoop = true;
    },
  });
}

let inline = false;
if (surveyEnv.SUPABASE_URL && surveyEnv.OPENAI_API_KEY) {
  await runInoxScenario({
    label: "inline_on_capable_host",
    inoxEnv: surveyEnv,
    clientEnv: clientBase,
    async test(base) {
      const result = await retrievalInoxPackBatch(["FractaVolta public Guide"], {
        env: { ...clientBase, COGENTIA_INOX_RETRIEVAL_URL: base },
        mode: "hybrid",
        limit: 2,
        budget: 1500,
      });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.retrieval_transport, "inox.session.v1");
      assert.ok(result.session_id);
      assert.ok(result.packs?.[0]?.sources?.length > 0);
      inline = true;
    },
  });
}

console.log(JSON.stringify({
  ok: true,
  continuation_without_secrets: noSecret,
  fulfillment_loop: fulfillmentLoop,
  inline_on_capable_host: inline,
}, null, 2));

async function runInoxScenario({ label, inoxEnv, test }) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["bin/inox-serve.js"], {
    cwd: inoxRoot,
    env: {
      ...process.env,
      ...inoxEnv,
      INOX_SERVE_HOST: "127.0.0.1",
      INOX_SERVE_PORT: String(port),
      INOX_SERVE_TOKEN: token,
      INOX_SERVE_SESSION_WORKERS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  try {
    await waitForHealth(base, stderr);
    await test(base);
    return true;
  } catch (error) {
    error.message = `[${label}] ${error.message}`;
    throw error;
  } finally {
    child.kill();
  }
}

function loadSurveyEnv() {
  const file = path.join(root, "..", "survey", ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY)=(.+)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

async function waitForHealth(base, stderr) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`${base}/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`inox-serve did not start: ${stderr}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}