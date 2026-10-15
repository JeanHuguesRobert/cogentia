// First real bounded trusted-handler analysis via existing Magistral/ACP.
// A run produces a durable receipt; it does not claim a COP mutation mandate.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export async function executeTrustedAnalysis({issue, prompt, endpoint="http://127.0.0.1:8880/v1/chat/completions",
  token, fetchImpl=fetch, receiptDir=path.join(os.homedir(),".local/state/cogentia/handler-runs")}={}) {
  if(!/^https:\/\/github\.com\/JeanHuguesRobert\/inseme\/issues\/120$/.test(issue?.url||"")) throw Error("packet_not_allowlisted_for_pilot");
  if(typeof token!=="string"||!token) throw Error("magistral_token_missing");
  if(endpoint!=="http://127.0.0.1:8880/v1/chat/completions") throw Error("invalid_magistral_endpoint");
  const start=new Date().toISOString();
  const id=randomUUID();
  let result="FAILED",answer="",failure=null,httpStatus=null;
  try {
    const response=await fetchImpl(endpoint,{method:"POST",redirect:"error",signal:AbortSignal.timeout(120000),
      headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({model:"fractavolta-guide",stream:false,max_tokens:1200,
        messages:[{role:"user",content:prompt}]})});
    httpStatus=response.status;
    if(!response.ok)throw Error("magistral_http_"+response.status);
    const body=await response.json();
    answer=String(body?.choices?.[0]?.message?.content||"");
    if(!answer.trim())throw Error("handler_empty_response");
    result="PASS";
  }catch(error){failure=String(error?.message||error).slice(0,500);}
  const receipt={schema:"cogentia.trusted-handler-analysis-receipt/v1",id,packet_ref:issue.url,
    handler:"local-codex-acp",model:"fractavolta-guide",start,finish:new Date().toISOString(),
    status:result,http_status:httpStatus,answer,error:failure,mode:"advisory_analysis",
    guaranteed_read_only:false,host_effects_not_audited:true,
    github_mutation_performed_by_orchestrator:false,execution_authorized_for_mutations:false};
  fs.mkdirSync(receiptDir,{recursive:true,mode:0o700});
  const filename=path.join(receiptDir,id+".json");
  fs.writeFileSync(filename,JSON.stringify(receipt,null,2)+"\n",{flag:"wx",mode:0o600});
  return {receipt_path:filename,receipt:{...receipt,answer:answer.slice(0,3000)}};
}
export function magistralTokenFromService() {
  // Local user must have permission to read the service environment.
  const pid=execFileSync("systemctl",["show","magistral","-p","MainPID","--value"],{encoding:"utf8",timeout:5000}).trim();
  if(!/^[1-9][0-9]*$/.test(pid))throw Error("magistral_pid_invalid");
  const raw=fs.readFileSync("/proc/"+pid+"/environ");
  for(const entry of raw.toString("utf8").split("\0")){
    if(entry.startsWith("MAGISTRAL_API_KEY="))return entry.slice("MAGISTRAL_API_KEY=".length);
  }
  throw Error("magistral_token_not_found");
}
