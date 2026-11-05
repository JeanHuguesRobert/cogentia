#!/usr/bin/env node
/** Offline Principal ceremony. Explicitly no issue/deploy/grant action. */
import fs from 'node:fs';
import {canonicalProposalBytes,proposalHash,publicKeyFingerprint,verifyJohnRootApproval} from '../lib/john-root-mandate.js';
const [op,proposalPath,third,fourth]=process.argv.slice(2);
function die(why){console.error(why);process.exitCode=2;}
try {
  if(!['bytes','inspect','verify'].includes(op)||!proposalPath)throw Error('usage: john-root-approval.mjs bytes|inspect|verify proposal.json [approval.json trusted-public-key.pem]');
  const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
  if(op==='bytes')process.stdout.write(canonicalProposalBytes(proposal));
  if(op==='inspect')console.log(JSON.stringify({proposal_hash:proposalHash(proposal),principal_ref:proposal.principal_ref,mandate_id:proposal.mandate_id,version:proposal.version,scope:proposal.scope,limits:proposal.budget_limits,valid_until:proposal.valid_until},null,2));
  if(op==='verify'){
    if(!third||!fourth)throw Error('verify requires approval.json and pinned trusted-public-key.pem');
    const approval=JSON.parse(fs.readFileSync(third,'utf8'));
    const result=verifyJohnRootApproval({proposal,approval,trustedPublicKeyPem:fs.readFileSync(fourth,'utf8')});
    console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
  }
}catch(e){die(e.message);}
