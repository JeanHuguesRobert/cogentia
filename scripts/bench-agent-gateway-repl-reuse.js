#!/usr/bin/env node
/**
 * Micro-benchmark: mock REPL two-turn session reuse (in-process, no gateway daemon).
 * Hard wall-clock cap so a stuck PTY/expect loop cannot run for hours.
 *
 * Usage:
 *   node scripts/bench-agent-gateway-repl-reuse.js
 *
 * Environment:
 *   AGENT_GATEWAY_BENCH_HARD_TIMEOUT_MS       Total wall clock (default 60000)
 *   AGENT_GATEWAY_REPL_TURN_TIMEOUT_MS       Per-turn cap (default 15000)
 *   AGENT_GATEWAY_REPL_BOOTSTRAP_TIMEOUT_MS  Bootstrap cap (default 15000)
 */

import { performance } from "node:perf_hooks";
import { mockAdapter } from "./lib/agent-gateway/adapters/mock.js";
import { loadHostContext } from "./lib/agent-gateway/host-context.js";
import { ReplSessionRegistry } from "./lib/agent-gateway/repl-session-registry.js";
import { runReplTurn } from "./lib/agent-gateway/run-repl-turn.js";

const HARD_TIMEOUT_MS = Number(process.env.AGENT_GATEWAY_BENCH_HARD_TIMEOUT_MS || 60_000);
const TURN_TIMEOUT_MS = Number(process.env.AGENT_GATEWAY_REPL_TURN_TIMEOUT_MS || 15_000);
const BOOTSTRAP_TIMEOUT_MS = Number(process.env.AGENT_GATEWAY_REPL_BOOTSTRAP_TIMEOUT_MS || 15_000);

const ctx = {
  ...loadHostContext({
    AGENT_GATEWAY_ALLOW_ANY_CWD: "1",
    AGENT_GATEWAY_REPL_TURN_TIMEOUT_MS: String(TURN_TIMEOUT_MS),
    AGENT_GATEWAY_REPL_BOOTSTRAP_TIMEOUT_MS: String(BOOTSTRAP_TIMEOUT_MS),
  }),
  useMock: true,
};

const registry = new ReplSessionRegistry({ maxSessions: 2 });

let hardTimer = null;

function armHardTimeout() {
  return new Promise((_, reject) => {
    hardTimer = setTimeout(() => {
      registry.destroyAll();
      reject(Object.assign(new Error("bench_hard_timeout"), {
        code: "bench_hard_timeout",
        timeout_ms: HARD_TIMEOUT_MS,
      }));
    }, HARD_TIMEOUT_MS);
  });
}

function disarmHardTimeout() {
  if (hardTimer) {
    clearTimeout(hardTimer);
    hardTimer = null;
  }
}

async function runBench() {
  const totalStart = performance.now();

  const turnOneStart = performance.now();
  const r1 = await runReplTurn(
    mockAdapter,
    { prompt: "turn one", cwd: process.cwd(), messages: [], stream: false },
    ctx,
    registry,
    { model: "grok-build" },
  );

  const turnTwoStart = performance.now();
  const r2 = await runReplTurn(
    mockAdapter,
    { prompt: "turn two", cwd: process.cwd(), messages: [], stream: false },
    ctx,
    registry,
    { model: "grok-build", sessionId: r1.sessionId },
  );

  return {
    ok: true,
    turn1: {
      ms: Math.round(turnTwoStart - turnOneStart),
      reason: r1.reason,
      session_id: r1.sessionId,
      session_spawned: r1.timing?.session_spawned ?? null,
      session_reused: r1.timing?.session_reused ?? null,
      content: r1.deltas.map(d => d.content).join("").trim().slice(0, 80),
    },
    turn2: {
      ms: Math.round(performance.now() - turnTwoStart),
      reason: r2.reason,
      session_id: r2.sessionId,
      session_spawned: r2.timing?.session_spawned ?? null,
      session_reused: r2.timing?.session_reused ?? null,
      content: r2.deltas.map(d => d.content).join("").trim().slice(0, 80),
    },
    session_reused: r1.sessionId === r2.sessionId && r2.timing?.session_reused === true,
    total_ms: Math.round(performance.now() - totalStart),
    limits: {
      hard_timeout_ms: HARD_TIMEOUT_MS,
      turn_timeout_ms: TURN_TIMEOUT_MS,
      bootstrap_timeout_ms: BOOTSTRAP_TIMEOUT_MS,
    },
  };
}

try {
  const result = await Promise.race([runBench(), armHardTimeout()]);
  disarmHardTimeout();
  registry.destroyAll();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  disarmHardTimeout();
  registry.destroyAll();
  console.error(JSON.stringify({
    ok: false,
    error: error.code || error.message || "bench_failed",
    timeout_ms: error.timeout_ms ?? null,
    limits: {
      hard_timeout_ms: HARD_TIMEOUT_MS,
      turn_timeout_ms: TURN_TIMEOUT_MS,
      bootstrap_timeout_ms: BOOTSTRAP_TIMEOUT_MS,
    },
  }, null, 2));
  process.exit(1);
}