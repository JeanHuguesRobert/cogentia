#!/usr/bin/env node
/** Federated public issues bootstrap from a reviewable repository manifest. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOpenIssues } from "./calculette-open-issues-prefill.js";
import { bootstrapCorpusOpenIssues } from "./lib/calculette-corpus-bootstrap.js";
const dir=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const get=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
const file=path.resolve(get("--manifest",path.join(dir,"fixtures/calculette/corpus-repositories.json")));
const config=JSON.parse(fs.readFileSync(file,"utf8"));
const names=config.repositories.filter(r=>r.enabled&&r.visibility==="public_candidate").map(r=>r.full_name);
const result=await bootstrapCorpusOpenIssues(names,{
  observedAt:get("--as-of",new Date().toISOString()),
  load:name=>fetchOpenIssues(name,{maxPages:Number(get("--max-pages","10"))})
});
console.log(JSON.stringify({...result,source_manifest:file,
  excluded_private:config.excluded_private||[],
  inventory_status:"seed inventory, refresh against authoritative corpus registry required"},null,2));
if(!result.complete) process.exitCode=2;
