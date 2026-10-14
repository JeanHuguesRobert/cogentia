#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "janus-mcp-"));
try {
  const register = (id, dep, visibility = "public") => {
    const file = path.join(root,"cogentia",id+".registry.yaml");
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`schema: cogentia.registry.v0.2
registry:
  id: registry:${id}
  name: ${id}
  records:
    kinds: [test]
  facets:
    visibility: ${visibility}
  definition_source:
    repo: cogentia
    path: ${id}.md
  record_authority:
    mode: source-local
${dep ? `  relations:
    - predicate: depends_on
      object: registry:${dep}
` : ""}`);
  };
  register("x",null);
  register("a","x");
  register("b","a");
  register("secret","x","private");
  const core = createMcpCore({ COGENTIA_CORPUS_ROOT: root });
  assert.ok(core.tools.some(t=>t.name==="cogentia_exploration_dependencies"));
  const out = await core.callTool("cogentia_exploration_dependencies", { id:"registry:x",direction:"downstream" });
  assert.deepEqual(out.entries.map(e=>e.id),["registry:a","registry:b"]);
  assert.ok(!JSON.stringify(out).includes("registry:secret"));
  const blocked = await core.callTool("cogentia_exploration_dependencies",{id:"registry:secret",direction:"upstream"});
  assert.equal(blocked.status,"not_accessible");
  assert.equal(out.completeness,"known-public-local-edges-only");
  console.log("ok - MCP exposes public dependency Core with transitive results and no private identifiers");
} finally {fs.rmSync(root,{recursive:true,force:true});}
