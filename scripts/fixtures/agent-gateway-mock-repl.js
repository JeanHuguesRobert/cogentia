#!/usr/bin/env node

/** PTY mock REPL — mimics grok TUI banner + prompt for gateway REPL tests. */

import readline from "node:readline";

process.stdout.write("grok mock-1\n");
writePrompt();

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", line => {
  const text = line.trim();
  if (!text) return;
  const respond = () => {
    process.stdout.write(`repl-mock:${text.slice(0, 48)}\n`);
    writePrompt();
  };
  if (text.includes("hold")) {
    setTimeout(respond, 1500);
    return;
  }
  respond();
});

function writePrompt() {
  process.stdout.write("> \n");
}