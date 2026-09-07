#!/usr/bin/env node
/**
 * Local-first Brave navigation assistant (CDP POC).
 *
 * Commands:
 *   node scripts/ops/navigation-assistant.js tabs
 *   node scripts/ops/navigation-assistant.js context
 *   node scripts/ops/navigation-assistant.js copy --text="draft"
 *   node scripts/ops/navigation-assistant.js insert --text="draft" --confirm
 *
 * The POC never clicks Send/Publish and never reads or exports cookies.
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const DEFAULT_CDP_ENDPOINT = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const MAX_CONTEXT_CHARS = 12000;

export function parseArgs(argv) {
  const args = { command: argv[0] || "help", text: null, file: null, confirm: false, targetId: null };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg.startsWith("--text=")) args.text = arg.slice(7);
    else if (arg === "--text") args.text = argv[++i] ?? "";
    else if (arg.startsWith("--file=")) args.file = arg.slice(7);
    else if (arg === "--file") args.file = argv[++i] ?? "";
    else if (arg.startsWith("--target-id=")) args.targetId = arg.slice(12);
    else if (arg === "--target-id") args.targetId = argv[++i] ?? null;
  }
  return args;
}

export async function listTabs(endpoint = DEFAULT_CDP_ENDPOINT) {
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/json/list`);
  if (!response.ok) throw new Error(`CDP target listing failed (${response.status})`);
  const targets = await response.json();
  return targets.filter((target) => target.type === "page" && target.webSocketDebuggerUrl);
}

export function selectTab(tabs, targetId = null) {
  if (targetId) {
    const selected = tabs.find((tab) => tab.id === targetId);
    if (!selected) throw new Error(`CDP target not found: ${targetId}`);
    return selected;
  }
  if (!tabs[0]) throw new Error("No page target found. Start Brave with a local CDP endpoint.");
  return tabs[0];
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    this.socket = new globalThis.WebSocket(this.url);
    this.socket.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : event.data.toString();
      const message = JSON.parse(raw);
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result || {});
    };
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = () => reject(new Error(`Unable to connect to CDP target ${this.url}`));
    });
    return this;
  }

  command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); resolve(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.socket && this.socket.readyState === 1) this.socket.close();
  }
}

export async function evaluateInTab(tab, expression) {
  const connection = await new CdpConnection(tab.webSocketDebuggerUrl).open();
  try {
    const result = await connection.command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error("Page evaluation failed");
    return result.result?.value;
  } finally {
    connection.close();
  }
}

export async function readPageContext(tab) {
  return evaluateInTab(tab, `(() => ({
    url: window.location.href,
    title: document.title,
    selection: window.getSelection()?.toString() || "",
    activeElement: document.activeElement ? {
      tag: document.activeElement.tagName,
      role: document.activeElement.getAttribute("role"),
      ariaLabel: document.activeElement.getAttribute("aria-label"),
      contentEditable: document.activeElement.getAttribute("contenteditable"),
      isContentEditable: Boolean(document.activeElement.isContentEditable)
    } : null,
    text: (document.body?.innerText || "").slice(0, ${MAX_CONTEXT_CHARS})
  }))()`);
}

export function writeWindowsClipboard(text) {
  if (process.platform !== "win32") throw new Error("The clipboard POC currently requires Windows.");
  return new Promise((resolve, reject) => {
    const command = process.env.NAV_ASSIST_PWSH || "powershell.exe";
    const child = spawn(command, ["-NoProfile", "-NonInteractive", "-Command", "$input | Set-Clipboard"], {
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Set-Clipboard failed (${code}): ${stderr.trim()}`));
    });
    child.stdin.end(text, "utf8");
  });
}

export async function insertTextInTab(tab, text) {
  const connection = await new CdpConnection(tab.webSocketDebuggerUrl).open();
  try {
    await connection.command("Input.insertText", { text });
  } finally {
    connection.close();
  }
}

async function loadText(args) {
  if (args.text !== null && args.file !== null) throw new Error("Choose either --text or --file, not both.");
  if (args.file !== null) return fs.readFile(args.file, "utf8");
  if (args.text !== null) return args.text;
  throw new Error("Provide --text or --file.");
}

function printHelp() {
  console.log(`Local Brave navigation assistant (CDP POC)

Usage:
  node scripts/ops/navigation-assistant.js tabs [--target-id ID]
  node scripts/ops/navigation-assistant.js context [--target-id ID]
  node scripts/ops/navigation-assistant.js copy --text TEXT | --file PATH
  node scripts/ops/navigation-assistant.js insert --text TEXT --confirm

Environment:
  CDP_ENDPOINT   default: http://127.0.0.1:9222

The tool never clicks Send/Publish and never reads or exports cookies.`);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (["help", "--help", "-h"].includes(args.command)) return printHelp();
  if (args.command === "copy") {
    await writeWindowsClipboard(await loadText(args));
    console.log("Clipboard updated.");
    return;
  }

  if (args.command === "insert" && !args.confirm) {
    throw new Error("Insertion requires --confirm; the POC never sends or publishes.");
  }

  const tabs = await listTabs();
  if (args.command === "tabs") {
    console.log(JSON.stringify(tabs.map(({ id, title, url }) => ({ id, title, url })), null, 2));
    return;
  }

  const tab = selectTab(tabs, args.targetId);
  if (args.command === "context") {
    console.log(JSON.stringify({ target: { id: tab.id, title: tab.title, url: tab.url }, page: await readPageContext(tab) }, null, 2));
    return;
  }

  if (args.command === "insert") {
    const text = await loadText(args);
    const page = await readPageContext(tab);
    const active = page?.activeElement;
    const editable = active && (["INPUT", "TEXTAREA"].includes(active.tag) || active.isContentEditable || active.contentEditable === "true");
    if (!editable) throw new Error("Refusing insertion: the active element is not an editable field.");
    await insertTextInTab(tab, text);
    console.log("Text inserted into the active page field; no Send/Publish action was performed.");
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`navigation-assistant: ${error.message}`);
    process.exitCode = 1;
  });
}
