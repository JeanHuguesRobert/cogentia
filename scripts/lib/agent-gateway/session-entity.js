/**
 * Shared helpers for expect-driven session entities (REPL-like processes).
 */

export function createLineReplExpectConfig({
  readyPattern,
  continuePatterns = [],
  inactivityMs = 300,
  stripAnsi = true,
  tailWindowBytes = 65536,
}) {
  const rules = [
    ...continuePatterns.map((pattern, index) => ({
      id: `continue-${index}`,
      pattern,
      action: "continue",
      priority: 10 + index,
    })),
    {
      id: "ready",
      pattern: readyPattern,
      action: "complete",
      priority: 30,
    },
  ];
  return {
    rules,
    inactivityMs,
    stripAnsi,
    tailWindowBytes,
  };
}

export function writeReplInput(handle, text, options = {}) {
  const newline = options.newline ?? "\n";
  handle.write(`${text}${newline}`);
}

export function filterPromptLines(line, prompts = []) {
  const trimmed = String(line).trim();
  if (!trimmed) return null;
  for (const prompt of prompts) {
    if (trimmed === prompt.trim()) return null;
  }
  return `${trimmed}\n`;
}