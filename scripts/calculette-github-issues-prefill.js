#!/usr/bin/env node
/** Preseed from a pre-exported JSON array of authorized GitHub issue snapshots.
 * Does not call GitHub or write persistent registries.
 */
import fs from "node:fs";
import path from "node:path";
import { importGithubIssues } from "./lib/calculette-github-issues-import.js";
import { buildJanusSeed } from "./lib/calculette-janus-seed.js";
const args=process.argv.slice(2);
const get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
const input=get("--input"),asOf=get("--as-of"),repository=get("--repository");
if(!input||!asOf) throw new Error("--input <issues.json> and --as-of <ISO timestamp> required");
const data=JSON.parse(fs.readFileSync(path.resolve(input),"utf8"));
const items=Array.isArray(data)?data:data.issues;
const imported=importGithubIssues(items,{observedAt:asOf,repository});
const seed=buildJanusSeed({...imported,asOf});
console.log(JSON.stringify({...seed,candidate_relations:imported.candidates,skipped:imported.skipped_count,
  coverage:imported.coverage,persisted:false,
  note:"Issue snapshots are not the full issue edit/event/comment history"},null,2));
