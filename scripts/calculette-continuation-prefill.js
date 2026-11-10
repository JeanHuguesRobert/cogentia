#!/usr/bin/env node
/** Read-only Janus prefill from an explicit F2a event-log snapshot.
 * JSON must be a trusted, access-approved array of cogentia.f2a_fact/v1 facts.
 */
import fs from "node:fs";
import path from "node:path";
import { importContinuationFacts } from "./lib/calculette-continuation-import.js";
import { buildJanusSeed } from "./lib/calculette-janus-seed.js";
const args=process.argv.slice(2);
const get=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
const input=get("--input");
const asOf=get("--as-of");
if (!input || !asOf) throw new Error("--input <snapshot.json> and --as-of <ISO instant> required");
const file=path.resolve(input);
const parsed=JSON.parse(fs.readFileSync(file,"utf8"));
const facts=Array.isArray(parsed)?parsed:parsed.facts;
if (!Array.isArray(facts)) throw new Error("snapshot must be an array or contain facts array");
const provenance="file://"+file;
const imported=importContinuationFacts(facts,{source:provenance,observedAt:asOf});
const seed=buildJanusSeed({...imported,asOf});
console.log(JSON.stringify({...seed,source_snapshot:provenance,source_events:facts.length,
  persisted:false,authorization:"caller must validate source visibility before importing"},null,2));
