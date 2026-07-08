import { normalizePtyText } from "./util.js";

const DEFAULT_TAIL_BYTES = 65536;

/**
 * Expect-equivalent pattern engine for PTY REPL turns (spec §7.4.3).
 */
export function createExpectLoop(options) {
  const {
    adapter,
    config,
    turn,
    onDelta,
    onComplete,
    onError,
  } = options;

  const rules = [...(config.rules || [])].sort((a, b) => a.priority - b.priority);
  const tailWindowBytes = config.tailWindowBytes ?? DEFAULT_TAIL_BYTES;
  const inactivityMs = config.inactivityMs ?? 300;
  const shouldStripAnsi = config.stripAnsi !== false;

  let buffer = "";
  let assistantStarted = false;
  let lineRemainder = "";
  let completed = false;
  let inactivityTimer = null;
  const deltas = [];

  function strippedTail() {
    const text = shouldStripAnsi ? normalizePtyText(buffer) : buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return text.slice(-tailWindowBytes);
  }

  function clearInactivity() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  function scheduleInactivity() {
    clearInactivity();
    if (!assistantStarted || completed) return;
    inactivityTimer = setTimeout(() => {
      if (!completed) finish({ reason: "idle-timeout" });
    }, inactivityMs);
  }

  function finish(result) {
    if (completed) return;
    completed = true;
    clearInactivity();
    flushLineRemainder();
    onComplete?.(result);
  }

  function emitContent(content) {
    if (!content) return;
    assistantStarted = true;
    const delta = { content };
    deltas.push(delta);
    onDelta?.(delta);
    scheduleInactivity();
  }

  function flushLineRemainder() {
    if (!lineRemainder) return;
    const pending = lineRemainder;
    lineRemainder = "";
    if (!pending.trim()) return;
    const filtered = adapter.filterReplNoise?.(pending);
    if (filtered === null) return;
    if (filtered) emitContent(filtered.endsWith("\n") ? filtered : `${filtered}\n`);
  }

  function emitLines(chunk) {
    lineRemainder += chunk;
    let idx;
    while ((idx = lineRemainder.indexOf("\n")) >= 0) {
      const line = lineRemainder.slice(0, idx);
      lineRemainder = lineRemainder.slice(idx + 1);
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === turn.prompt.trim()) continue;
      let filtered;
      if (adapter.filterReplNoise) {
        filtered = adapter.filterReplNoise(line);
        if (filtered === null) continue;
      } else {
        filtered = `${line}\n`;
      }
      emitContent(filtered.endsWith("\n") ? filtered : `${filtered}\n`);
    }
  }

  function evaluateRules() {
    if (!assistantStarted || completed) return;
    const tail = strippedTail();
    for (const rule of rules) {
      if (!rule.pattern.test(tail)) continue;
      if (rule.action === "continue") return;
      if (rule.action === "error") {
        onError?.(new Error(rule.id));
        finish({ reason: rule.id, error: true });
        return;
      }
      if (rule.action === "complete") {
        finish({ reason: rule.id });
        return;
      }
    }
  }

  return {
    get completed() {
      return completed;
    },
    get deltas() {
      return deltas;
    },
    append(chunk) {
      if (completed) return;
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      buffer += text;
      emitLines(text);
      evaluateRules();
      if (!completed) scheduleInactivity();
    },
    onChildExit(exitCode) {
      if (completed) return;
      if (exitCode !== 0) {
        onError?.(new Error(`child_exit_${exitCode}`));
        finish({ reason: "child-exit", exitCode, error: true });
        return;
      }
      finish({ reason: "child-exit", exitCode });
    },
    dispose() {
      clearInactivity();
    },
  };
}

/** Wait until a REPL shows its initial ready prompt before the first send. */
export function waitForReplReady({ config, getBuffer, onData, timeoutMs = 120_000 }) {
  const rules = [...(config.rules || [])].sort((a, b) => a.priority - b.priority);
  const readyRule = rules.find(r => r.action === "complete" && /ready/.test(r.id))
    || rules.find(r => r.action === "complete");
  if (!readyRule) {
    return Promise.reject(new Error("repl_ready_rule_missing"));
  }

  const tailWindowBytes = config.tailWindowBytes ?? DEFAULT_TAIL_BYTES;
  const shouldStripAnsi = config.stripAnsi !== false;

  const isReady = () => {
    const text = shouldStripAnsi
      ? normalizePtyText(getBuffer())
      : getBuffer().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const tail = text.slice(-tailWindowBytes);
    return readyRule.pattern.test(tail);
  };

  if (isReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let dispose = null;
    const timer = setTimeout(() => {
      dispose?.();
      reject(new Error("repl_bootstrap_timeout"));
    }, timeoutMs);

    dispose = onData(() => {
      if (!isReady()) return;
      clearTimeout(timer);
      dispose?.();
      resolve();
    });
  });
}