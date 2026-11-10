#!/usr/bin/env node
/** Rebuild Janus initial registry view from immutable-at-source evidence fixture.
 * No networking, writes, guesses or silent promotion to an authoritative log.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildJanusSeed } from "./lib/calculette-janus-seed.js";
const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const at = argv.indexOf("--as-of");
const asOf = at >= 0 ? argv[at+1] : new Date().toISOString();
const fixturePath = path.join(here,"fixtures","calculette","janus-github-2026-10-09.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath,"utf8"));
const seed = buildJanusSeed({ ...fixture, asOf });
console.log(JSON.stringify({ ...seed, fixture: "scripts/fixtures/calculette/janus-github-2026-10-09.json",
  scope: "partial-GitHub-source-history", durable_record: false,
  next: "Federate verified source inventories and trace stores; never assume corpus history complete." },null,2));
