#!/usr/bin/env node
import { setTimeout as sleep } from "node:timers/promises";

const prompt = process.argv[2] || "";
if (prompt.includes("hold")) await sleep(1500);

process.stdout.write(`${JSON.stringify({ type: "text", data: "mock:" })}\n`);
process.stdout.write(`${JSON.stringify({ type: "text", data: prompt.slice(0, 24) })}\n`);
process.stdout.write(`${JSON.stringify({ type: "end" })}\n`);