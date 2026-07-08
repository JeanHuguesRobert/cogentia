#!/usr/bin/env node

/**
 * Portable shell tool — executes one line per turn in turn.cwd (via gateway metadata).
 * Prompt: tool$
 */

import { execFile } from "node:child_process";
import readline from "node:readline";

const cwd = process.env.AGENT_GATEWAY_TOOL_CWD || process.cwd();

process.stdout.write(`tool-shell cwd=${cwd}\n`);

function writePrompt() {
  process.stdout.write("tool$ ");
}

writePrompt();

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", line => {
  const cmd = line.trim();
  if (!cmd) {
    writePrompt();
    return;
  }
  if (cmd === "exit" || cmd === "quit") {
    process.exit(0);
  }

  const shell = process.platform === "win32"
    ? (process.env.ComSpec || "cmd.exe")
    : "/bin/sh";
  const shellArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", cmd]
    : ["-c", cmd];

  execFile(shell, shellArgs, {
    cwd,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  }, (error, stdout, stderr) => {
    if (stdout) process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
    if (stderr) process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
    if (error && error.killed) {
      process.stderr.write("tool-shell: command timeout\n");
    } else if (error && error.code != null) {
      process.stderr.write(`tool-shell: exit ${error.code}\n`);
    }
    writePrompt();
  });
});