/** Human-centric CLI interface. NEVER signs, writes grants or changes mandates. */
import fs from 'node:fs';
import readline from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {copReviewPacket,copConsentIntent} from './cop-consent-packet.js';
export async function cmdCopConsent(args,{input=stdin,output=stdout}={}) {
  const sub=args.shift()||'help';
  const pathAt=args.indexOf('--from');
  const file=pathAt>=0?args[pathAt+1]:null;
  if(sub==='help')return {ok:true,usage:'cop consent review --from <proposal.json> | cop consent decide --from <proposal.json> --decision approve|refuse'};
  if(!['review','decide'].includes(sub)||!file||file.startsWith('-')||args.some((a,i)=>a==='--from'&&!args[i+1]))
    return {ok:false,error:'CONSENT_CLI_USAGE_INVALID'};
  let content;
  try{
    if(fs.statSync(file).size>16384)return {ok:false,error:'CONSENT_FILE_TOO_LARGE'};
    content=JSON.parse(fs.readFileSync(file,'utf8'));
  }catch{return {ok:false,error:'CONSENT_FILE_INVALID'};}
  let packet;
  try{packet=copReviewPacket(content,{source:file,source_verified:false});}
  catch(e){return {ok:false,error:e.code||'CONSENT_PROPOSAL_INVALID'};}
  if(sub==='review')return packet;
  const at=args.indexOf('--decision');
  const decision=at<0?null:args[at+1];
  if(!['approve','refuse'].includes(decision))return {ok:false,error:'CONSENT_DECISION_INVALID'};
  if(!input.isTTY||!output.isTTY)return {ok:false,error:'CONSENT_INTERACTIVE_TERMINAL_REQUIRED'};
  output.write(`\nMandat : ${packet.proposal.mandate_ref}\nVersion : ${packet.proposal.previous_version} → ${packet.proposal.new_version}\nRaison : ${packet.proposal.reason}\nPortée : ${JSON.stringify(packet.proposal.scope)}\nEmpreinte : ${packet.payload_hash}\nAttention : source et identité du Principal non attestées ; ceci n'émet aucun mandat.\n`);
  const rl=readline.createInterface({input,output});
  let answer;
  try{answer=await rl.question(`Pour consigner l'intention « ${decision} », saisissez exactement ${packet.payload_hash.slice(0,19)} : `);}
  finally{rl.close();}
  if(answer!==packet.payload_hash.slice(0,19))return {ok:false,error:'CONSENT_CONFIRMATION_MISMATCH'};
  return copConsentIntent(packet,decision,{channel:'cli-interactive-local'});
}
