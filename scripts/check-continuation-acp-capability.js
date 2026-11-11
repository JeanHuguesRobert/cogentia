#!/usr/bin/env node
/** Inseme #111: isolated ACP diagnostic test, no production continuations. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "acp-capability-111-"));
const scripts = path.join(root, "scripts");
fs.mkdirSync(path.join(scripts, "lib"), { recursive: true });
fs.copyFileSync(path.join(here,"continuation-acp-server.js"),path.join(scripts,"continuation-acp-server.js"));
fs.copyFileSync(path.join(here,"lib/resolver-registry.js"),path.join(scripts,"lib/resolver-registry.js"));
fs.writeFileSync(path.join(root,"package.json"),'{"type":"module"}');
fs.writeFileSync(path.join(scripts,"cogentia.js"), `#!/usr/bin/env node
const cmd=process.argv[2];
if(cmd!=="continuation") process.exit(2);
if(process.argv[3]==="emit") console.log(JSON.stringify({continuation:{continuation_id:"ctn_abcdef123456"}}));
else if(process.argv[3]==="inspect") console.log(JSON.stringify({continuation:{id:"ctn_abcdef123456",status:"active"}}));
else process.exit(2);
`);
try {
  const child = spawn(process.execPath,[path.join(scripts,"continuation-acp-server.js")],{
    cwd:root,
    env:{...process.env, CONTINUATION_ACP_TIMEOUT_MS:"5000",
      CONTINUATION_ACP_POLL_MS:"500",CONTINUATION_ACP_STREAM:"0",
      CONTINUATION_ACP_REGISTRY_ROOT:root},
    stdio:["pipe","pipe","pipe"] });
  let output="", errors="";
  let session = null;
  const outcome = await new Promise((resolve,reject)=>{
    const timer = setTimeout(()=>reject(new Error("ACP fixture timed out: "+errors)),12000);
    child.on("error",reject);
    child.stderr.on("data",(d)=>errors+=d.toString());
    child.stdout.on("data",(d)=>{
      output+=d.toString();
      let idx;
      while((idx=output.indexOf("\n"))>=0){
        const line=output.slice(0,idx);output=output.slice(idx+1);
        let m;try{m=JSON.parse(line);}catch(e){return reject(e);}
        if(m.id===1 && m.result?.sessionId){
          session=m.result.sessionId;
          child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:2,method:"session/prompt",
            params:{sessionId:session,prompt:[{type:"text",text:"Need Judgement"}],
              _meta:{requiredCapabilities:["Judgement"]}}})+"\n");
        }
        if(m.id===2){clearTimeout(timer);resolve(m);return;}
      }
    });
    child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:1,method:"session/new",params:{}})+"\n");
  });
  assert.equal(outcome.error?.data?.continuationErrorInfo,"no_capable_resolver_available");
  assert.equal(outcome.error?.data?.continuationId,"ctn_abcdef123456");
  assert.deepEqual(outcome.error?.data?.requiredCapabilities,["Judgement"]);
  child.kill();
  console.log("inseme#111 ACP no-capable-resolver diagnostic: PASS");
} finally { fs.rmSync(root,{recursive:true,force:true}); }
