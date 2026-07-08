#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { spawn, execFile } from "node:child_process";
import net from "node:net";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const remoteHost = process.env.COGENTIA_BENCH_REMOTE_HOST || "poco-jhr";
const remoteUser = process.env.COGENTIA_BENCH_REMOTE_USER || "jh";
const remoteSshPort = process.env.COGENTIA_BENCH_REMOTE_SSH_PORT || "8022";
const remoteGatewayUrl = process.env.COGENTIA_BENCH_REMOTE_URL || `http://${remoteHost}:8793`;
const remoteTokenCommand =
  process.env.COGENTIA_BENCH_REMOTE_TOKEN_COMMAND ||
  "grep AGENT_GATEWAY_TOKEN ~/srv/cogentia/secrets/agent-gateway.env";
const model = process.env.COGENTIA_BENCH_MODEL || "grok-build";
const localToken = process.env.COGENTIA_BENCH_LOCAL_TOKEN || "local-bench";

const { stdout } = await execFileAsync(
  "ssh",
  ["-o", "BatchMode=yes", "-p", remoteSshPort, `${remoteUser}@${remoteHost}`, remoteTokenCommand],
  { encoding: "utf8" },
).catch(error => {
  throw new Error(`Unable to read remote agent gateway token over SSH: ${error.message}`);
});
const remoteToken = stdout.trim().split("=").pop().trim();
if (!remoteToken) {
  throw new Error("Remote agent gateway token command returned no token.");
}

async function timed(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  console.log(JSON.stringify({ label, ms: Math.round(performance.now() - t0), ...result }));
}

await timed("tailnet_health", async () => {
  const r = await fetch(`${remoteGatewayUrl}/health`, {
    headers: { Authorization: `Bearer ${remoteToken}` },
  });
  return { status: r.status };
});

await timed("tailnet_headless_grok", async () => {
  const r = await fetch(`${remoteGatewayUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${remoteToken}` },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: "user", content: "Reply with exactly: REMOTE_OK" }],
    }),
  });
  const body = await r.json();
  return { status: r.status, content: body.choices?.[0]?.message?.content?.slice(0, 24) };
});

const port = await new Promise(resolve => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => resolve(p));
  });
});

const daemon = spawn(process.execPath, ["scripts/agent-gateway.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: { ...process.env, AGENT_GATEWAY_ALLOW_ANY_CWD: "1", AGENT_GATEWAY_TOKEN: localToken },
  stdio: "ignore",
});

try {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { Authorization: `Bearer ${localToken}` },
      });
      if (r.ok) break;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }

  await timed("local_health_real_adapters", async () => {
    const r = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { Authorization: `Bearer ${localToken}` },
    });
    return { status: r.status };
  });

  await timed("local_headless_grok", async () => {
    const r = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localToken}` },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: "user", content: "Reply with exactly: LOCAL_OK" }],
      }),
    });
    const body = await r.json();
    return { status: r.status, content: body.choices?.[0]?.message?.content?.slice(0, 24) };
  });
} finally {
  daemon.kill();
}
