#!/usr/bin/env node
/**
 * HTTP-only grep probe (no Get-Process / MCP). Prints timings and whether
 * a second grep hits a live server.
 *
 *   node scripts/ops/probe-inventory-heap.js
 */
const base = process.env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790";

async function call(path, timeoutMs = 90000) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { "X-Cogentia-Entry": "public", Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, ms: Date.now() - t0, bytes: text.length };
  } catch (error) {
    return { ok: false, ms: Date.now() - t0, error: error.message, name: error.name };
  }
}

const health = await call("/api/context/health?quick=1", 15000);
console.log(JSON.stringify({ step: "health", ...health }));
const g1 = await call("/api/cli/grep?q=Capability%20Symmetry&repo=cogentia&limit=5", 120000);
console.log(JSON.stringify({ step: "grep1", ...g1 }));
const g2 = await call("/api/cli/grep?q=H-test&repo=cogentia&limit=5", 120000);
console.log(JSON.stringify({ step: "grep2", ...g2 }));
const health2 = await call("/api/context/health?quick=1", 15000);
console.log(JSON.stringify({ step: "health_after", ...health2 }));
process.exit(g1.ok && g2.ok && health2.ok ? 0 : 1);
