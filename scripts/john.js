#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { renderJohnEventHuman, runJohnRequest } from "./lib/john-run.js";
import {
  packHandoffPacket,
  unpackHandoffPacket,
  runHandoffPacket,
} from "./lib/john-handoff.js";
import { sendHandoffPacket } from "./lib/john-handoff-transport.js";
import {
  DiagnosticContext,
  JohnRepl,
} from "./lib/john-diagnostic/index.js";

function usage() {
  return [
    "Usage:",
    "  node scripts/john.js run --request <request.json> [--format ndjson|human]",
    "  node scripts/john.js repl [--mode diagnostic|conversational] [--format ndjson|human]",
    "  node scripts/john.js inspect <capabilities|topology|continuations|packet> [options]",
    "  node scripts/john.js handoff pack --request <request.json> [--target <node>] [--out <packet.json>]",
    "  node scripts/john.js handoff unpack --packet <packet.json>",
    "  node scripts/john.js handoff run --packet <packet.json> [--format ndjson|human] [--out <yield.json>]",
    "  node scripts/john.js handoff send --packet <packet.json> --target <url_or_proto> [--fallback <url>] [--out <yield.json>]",
    "",
    "John CLI supports headless governed reasoners, interactive diagnostic REPLs, and cross-machine Cognitive Packet handoffs.",
  ].join("\n");
}

function valueFlag(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) return null;
  const value = argv[index + 1];
  argv.splice(index, 2);
  return value || null;
}

async function handleInspect(argv) {
  const target = argv.shift() || "capabilities";
  const ctx = new DiagnosticContext();

  switch (target) {
    case "capabilities":
    case "caps": {
      const filter = valueFlag(argv, "--filter") || argv[0];
      const capInsp = ctx.getInspector("capabilities");
      const res = await capInsp.inspect(filter);
      process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
      return 0;
    }
    case "topology":
    case "nodes": {
      const probeNode = valueFlag(argv, "--probe");
      const topInsp = ctx.getInspector("topology");
      if (probeNode) {
        const res = await topInsp.probeNode(probeNode);
        process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
      } else {
        process.stdout.write(`${JSON.stringify(topInsp.listNodes(), null, 2)}\n`);
      }
      return 0;
    }
    case "continuations": {
      const filter = valueFlag(argv, "--status") || "alive";
      const contInsp = ctx.getInspector("continuations");
      const res = await contInsp.list(filter);
      process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
      return 0;
    }
    case "symmetry":
    case "sym": {
      const symInsp = ctx.getInspector("symmetry");
      if (argv.includes("--json")) {
        process.stdout.write(`${JSON.stringify(symInsp.audit(), null, 2)}\n`);
      } else {
        process.stdout.write(`${symInsp.renderHuman()}\n`);
      }
      return 0;
    }
    case "packet": {
      const packetPath = valueFlag(argv, "--packet") || argv[0];
      if (!packetPath) throw new Error("john inspect packet requires --packet <packet.json>");
      const packet = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), packetPath), "utf8"));
      const packetInsp = ctx.getInspector("packets");
      const res = packetInsp.inspectPacket(packet);
      process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
      return 0;
    }
    default:
      throw new Error(`Unknown inspection target '${target}'. Available: capabilities, topology, continuations, symmetry, packet.\n${usage()}`);
  }
}

async function handleHandoff(argv) {
  const sub = argv.shift();
  if (["pack", "export"].includes(sub)) {
    const requestPath = valueFlag(argv, "--request");
    const targetNode = valueFlag(argv, "--target");
    const outPath = valueFlag(argv, "--out");
    if (!requestPath) throw new Error("john handoff pack requires --request <request.json>");
    const fullPath = path.resolve(process.cwd(), requestPath);
    const request = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const sealedPacket = packHandoffPacket(request, { targetNode });
    const output = JSON.stringify(sealedPacket, null, 2);
    if (outPath) {
      fs.writeFileSync(path.resolve(process.cwd(), outPath), output, "utf8");
      process.stdout.write(`Sealed Cognitive Packet written to ${outPath}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
    return 0;
  }

  if (["unpack", "inspect"].includes(sub)) {
    const packetPath = valueFlag(argv, "--packet");
    if (!packetPath) throw new Error("john handoff unpack requires --packet <packet.json>");
    const fullPath = path.resolve(process.cwd(), packetPath);
    const packet = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const inspection = unpackHandoffPacket(packet);
    process.stdout.write(`${JSON.stringify(inspection, null, 2)}\n`);
    return 0;
  }

  if (["run", "import", "exec"].includes(sub)) {
    const packetPath = valueFlag(argv, "--packet");
    const format = valueFlag(argv, "--format") || "human";
    const outPath = valueFlag(argv, "--out");
    if (!packetPath) throw new Error("john handoff run requires --packet <packet.json>");
    const fullPath = path.resolve(process.cwd(), packetPath);
    const packet = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const result = await runHandoffPacket(packet);
    for (const item of result.events) {
      process.stdout.write(format === "ndjson" ? `${JSON.stringify(item)}\n` : `${renderJohnEventHuman(item)}\n`);
    }
    if (outPath) {
      fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(result.returnPacket, null, 2), "utf8");
    }
    return result.success ? 0 : 1;
  }

  if (["send", "dispatch"].includes(sub)) {
    const packetPath = valueFlag(argv, "--packet");
    const target = valueFlag(argv, "--target") || "mock://";
    const fallback = valueFlag(argv, "--fallback");
    const outPath = valueFlag(argv, "--out");
    if (!packetPath) throw new Error("john handoff send requires --packet <packet.json>");
    const fullPath = path.resolve(process.cwd(), packetPath);
    const packet = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const fallbacks = fallback ? [fallback] : [];
    const result = await sendHandoffPacket(packet, { target, fallbacks });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (outPath && result.returnPacket) {
      fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(result.returnPacket, null, 2), "utf8");
    }
    return result.ok ? 0 : 1;
  }

  throw new Error(`Unknown handoff action ${JSON.stringify(sub)}.\n${usage()}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (["help", "--help", "-h", undefined].includes(command)) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  if (command === "handoff") {
    return handleHandoff(argv);
  }

  if (command === "inspect" || command === "diag" || command === "probe") {
    return handleInspect(argv);
  }

  if (command === "symmetry" || command === "scorecard") {
    return handleInspect(["symmetry", ...argv]);
  }

  if (command === "repl" || command === "chat" || command === "console") {
    const mode = valueFlag(argv, "--mode") || (command === "chat" ? "conversational" : "diagnostic");
    const format = valueFlag(argv, "--format") || "human";
    const repl = new JohnRepl({ mode, format });
    await repl.startInteractive();
    return 0;
  }

  if (command !== "run") throw new Error(`Unknown command ${JSON.stringify(command)}.\n${usage()}`);
  const requestPath = valueFlag(argv, "--request");
  const format = valueFlag(argv, "--format") || "human";
  if (argv.length || !requestPath || !["ndjson", "human"].includes(format)) {
    throw new Error(usage());
  }
  const fullPath = path.resolve(process.cwd(), requestPath);
  let request;
  try {
    request = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON request ${fullPath}: ${error.message}`);
  }
  const events = await runJohnRequest(request);
  for (const item of events) {
    process.stdout.write(format === "ndjson" ? `${JSON.stringify(item)}\n` : `${renderJohnEventHuman(item)}\n`);
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`john: ${error.message}\n`);
    process.exitCode = 1;
  });

