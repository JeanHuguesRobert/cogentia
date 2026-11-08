#!/usr/bin/env node
/** Offline proposal only. NEVER signs or activates a maintenance mandate. */
import fs from 'node:fs';
import {canonical} from './principal-effect-issuer.mjs';
const target=process.argv[2];
if(!target||process.argv.length!==3){console.error('usage: node scripts/super/prepare-maintenance-mandate.mjs OUTPUT.json');process.exit(2);}
const now=new Date();
const proposal={
 kind:'cogentia.maintenance-mandate-proposal/v1',
 mandate_id:'mandate:jhn:maintenance',version:'v1',
 principal_ref:'principal:jhn',actor_ref:'agent:jhn',
 max_delegation_depth:0,
 scope:{allowed_actions:['service.restart'],execution_mode:'super',target:'node:fracta2',service:'mcp-cogentia.service'},
 budget_limits:{max_steps:12},
 valid_from:new Date(now-60000).toISOString(),
 valid_until:new Date(+now+48*3600000-60000).toISOString(),
 reason:'Mise au point du MCP : au plus douze redemarrages du seul mcp-cogentia.service en 48 heures'
};
fs.writeFileSync(target,canonical(proposal),{encoding:'utf8',mode:0o644,flag:'wx'});
console.log(JSON.stringify({ok:true,phase:'PROPOSAL_ONLY_NOT_AUTHORIZED',filename:target,
 mandate_id:proposal.mandate_id,budget_limits:proposal.budget_limits,
 valid_until:proposal.valid_until,signature_namespace:'cogentia-maintenance-mandate-v1'}));
