#!/usr/bin/env node

/**
 * Cogentia Trace — ChatGPT/OpenAI export importer.
 *
 * Pure JavaScript ESM script. This repository declares `"type": "module"`,
 * so `.js` files are interpreted as ES modules by Node.js.
 *
 * Input:
 *   - a local `conversations.json` file from an extracted OpenAI export; or
 *   - a directory containing `conversations.json`.
 *
 * Output:
 *   - normalized JSONL events;
 *   - a local manifest;
 *   - optional continuations when classification requires judgment.
 *
 * This script deliberately writes local files only.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const VISIBILITY_VALUES = [
  "raw_private",
  "private",
  "restricted",
  "public_candidate",
  "public",
  "do_not_publish"
];

const DEFAULT_VISIBILITY = "raw_private";

function usage(exitCode = 0) {
  console.log(`Usage:
  node trace/scripts/import_chatgpt_export.js <conversations.json|export-dir> [--out <dir>] [--visibility <value>] [--continuations]

Examples:
  node trace/scripts/import_chatgpt_export.js ~/private/openai-export/conversations.json --out ~/private/cogentia-trace
  node trace/scripts/import_chatgpt_export.js ~/private/openai-export --out ~/private/cogentia-trace --continuations

Visibility values:
  ${VISIBILITY_VALUES.join(", ")}

Notes:
  - This script expects an already extracted OpenAI export.
  - It does not unzip archives.
  - It writes local files only.
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = [...argv];
  if (args.includes("--help") || args.includes("-h")) usage(0);

  const input = args.shift();
  if (!input) usage(1);

  let outDir = "./trace-output";
  let visibility = DEFAULT_VISIBILITY;
  let createContinuations = false;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--out") {
      outDir = args.shift();
      if (!outDir) throw new Error("Missing value after --out");
    } else if (arg === "--visibility") {
      visibility = args.shift();
      if (!visibility) throw new Error("Missing value after --visibility");
      if (!VISIBILITY_VALUES.includes(visibility)) throw new Error(`Invalid visibility: ${visibility}`);
    } else if (arg === "--continuations") {
      createContinuations = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { input, outDir, visibility, createContinuations };
}

async function resolveConversationsPath(input) {
  const inputPath = path.resolve(input);
  const s = await stat(inputPath);
  if (s.isDirectory()) return path.join(inputPath, "conversations.json");
  return inputPath;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function messageText(message) {
  const content = message?.content;
  if (!content) return "";
  if (typeof content === "string") return sanitizeText(content);

  if (Array.isArray(content.parts)) {
    return sanitizeText(content.parts.map((part) => {
      if (typeof part === "string") return part;
      return JSON.stringify(part);
    }).join("\n"));
  }

  if (Array.isArray(content.text)) return sanitizeText(content.text.join("\n"));

  return sanitizeText(JSON.stringify(content));
}

function roleOf(message) {
  const role = message?.author?.role;
  if (["user", "assistant", "system", "tool"].includes(role)) return role;
  return "unknown";
}

function timestampOf(message, fallbackConversation) {
  const ts = message?.create_time ?? message?.update_time ?? fallbackConversation?.create_time ?? fallbackConversation?.update_time;
  if (typeof ts === "number" && Number.isFinite(ts)) return new Date(ts * 1000).toISOString();
  if (typeof ts === "string") return ts;
  return new Date(0).toISOString();
}

function nodesInConversation(conversation) {
  const mapping = conversation?.mapping;
  if (!mapping || typeof mapping !== "object") return [];

  return Object.entries(mapping)
    .map(([nodeId, node]) => ({ nodeId, node }))
    .filter(({ node }) => node?.message)
    .sort((a, b) => {
      const ta = a.node?.message?.create_time ?? 0;
      const tb = b.node?.message?.create_time ?? 0;
      return ta - tb;
    });
}

function eventFromNode(conversation, nodeId, node, index, sourcePath, visibility) {
  const message = node.message;
  const body = messageText(message);
  const rawId = message?.id || nodeId || `${conversation.id || conversation.title || "conversation"}-${index}`;
  const title = conversation?.title || "Untitled ChatGPT conversation";
  const timestamp = timestampOf(message, conversation);
  const role = roleOf(message);
  const hash = `sha256:${sha256(JSON.stringify({ title, timestamp, role, body }))}`;

  return {
    id: `chatgpt-${sha256(rawId).slice(0, 16)}`,
    platform: "chatgpt",
    source_id: String(rawId),
    timestamp,
    role,
    title,
    body,
    conversation_id: String(conversation?.id || conversation?.conversation_id || sha256(title).slice(0, 16)),
    visibility,
    sensitivity: [],
    hash,
    source_path: sourcePath
  };
}

function shouldAskForJudgment(event) {
  if (!event.body || event.body.trim().length === 0) return false;

  const lower = event.body.toLowerCase();
  const signals = [
    "notaire",
    "avocat",
    "plainte",
    "suicide",
    "santé",
    "health",
    "gmail",
    "facebook",
    "adresse",
    "téléphone",
    "phone",
    "email",
    "héritage",
    "succession",
    "familial",
    "family"
  ];

  return signals.some((signal) => lower.includes(signal));
}

function continuationForEvent(event, outDir) {
  const continuationId = `cont-${sha256(event.id).slice(0, 12)}`;
  const continuationPath = path.join(outDir, "continuations", `${continuationId}.json`);
  const excerpt = event.body.length > 500 ? `${event.body.slice(0, 500)}…` : event.body;

  return {
    path: continuationPath,
    data: {
      continuation_id: continuationId,
      tool: "cogentia-trace",
      reason: "visibility_judgment_required",
      source_event_id: event.id,
      state_ref: `local-private://events/${event.id}`,
      question: "Which visibility classification should be assigned to this event?",
      context: {
        title: event.title,
        excerpt,
        current_visibility: event.visibility,
        suggested_visibility: "private"
      },
      allowed_responses: VISIBILITY_VALUES,
      default_response: "private",
      resume_command: `node trace/scripts/import_chatgpt_export.js resume ${continuationPath} --decision private`
    }
  };
}

async function main() {
  const { input, outDir, visibility, createContinuations } = parseArgs(process.argv.slice(2));
  const conversationsPath = await resolveConversationsPath(input);
  const absoluteOut = path.resolve(outDir);

  const raw = await readFile(conversationsPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Expected conversations.json to contain an array of conversations");

  const events = [];
  for (const conversation of parsed) {
    const nodes = nodesInConversation(conversation);
    nodes.forEach(({ nodeId, node }, index) => {
      const event = eventFromNode(conversation, nodeId, node, index, conversationsPath, visibility);
      if (event.body.trim().length > 0) events.push(event);
    });
  }

  await mkdir(absoluteOut, { recursive: true });
  await mkdir(path.join(absoluteOut, "continuations"), { recursive: true });

  const eventsPath = path.join(absoluteOut, "events.jsonl");
  await writeFile(eventsPath, events.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");

  const continuations = [];
  if (createContinuations) {
    for (const event of events.filter(shouldAskForJudgment)) {
      const continuation = continuationForEvent(event, absoluteOut);
      continuations.push(continuation.data);
      await writeFile(continuation.path, JSON.stringify(continuation.data, null, 2) + "\n", "utf8");
    }
  }

  const manifest = {
    export_id: `chatgpt-${sha256(conversationsPath).slice(0, 12)}`,
    platform: "chatgpt",
    requested_at: null,
    received_at: new Date().toISOString(),
    original_filename: path.basename(conversationsPath),
    sha256: sha256(raw),
    status: "normalized",
    notes: "Generated locally by Cogentia Trace import_chatgpt_export.js.",
    outputs: {
      events_jsonl: eventsPath,
      continuations_count: continuations.length
    }
  };

  const manifestPath = path.join(absoluteOut, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    ok: true,
    conversations: parsed.length,
    events: events.length,
    continuations: continuations.length,
    events_path: eventsPath,
    manifest_path: manifestPath
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
