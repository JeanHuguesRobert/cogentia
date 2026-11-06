import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {assessJohnCopAuthority as assess} from './john-cop-authority-preflight.js';
const store=createMemoryCopEventStore();
const mandate_ref='mandate:jhn:test-authority';
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture-secret'}, {headers:{authorization:'Bearer fixture-secret'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':mandate_ref}});
const verified=()=>({verified:true,principal_ref:'principal:jhn',mandate_ref});
const ledger={snapshot:()=>({has_grant:true,mandate_ref})};
const args={store,auth,mandate_ref,version_pin:'v1',capability:'browser.hosted.inspect',ledger,verifyIssuer:verified};
test('unissued mandate and untrusted caller refuse without execution',()=>{
 assert.equal(assess({...args,store:createMemoryCopEventStore()}).error,'issuer_provenance_unverified');
 assert.equal(assess({...args,auth:{...auth}}).error,'authenticated_jhn_caller_required');
});
recordMandateDeclaration(store,{mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-11-01T00:00:00Z',valid_until:'2026-12-01T00:00:00Z',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:['payment.execute','gmail.send']}});
test('verified fixture mandate passes preflight but never reserves or executes',()=>{
 const result=assess({...args,version_pin:'v1',at_time:new Date('2026-11-06T13:00:00Z')});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.reservation,null);
 assert.equal(result.admitted,false);
 assert.equal(result.authorized_to_execute,false);
 assert.equal(result.requires_reservation_before_effect,true);
});
test('issuer, principal, transport, budget and capability gates refuse',()=>{
 for(const [mod,error] of [
  [{verifyIssuer:null},'issuer_provenance_unverified'],
  [{verifyIssuer:()=>({verified:true,principal_ref:'principal:other',mandate_ref})},'issuer_provenance_unverified'],
  [{mandate_ref:'mandate:alien'},'mandate_transport_mismatch'],
  [{version_pin:null},'mandate_version_pin_required'],
  [{ledger:null},'canonical_budget_unavailable'],
  [{ledger:{snapshot:()=>({has_grant:false,mandate_ref})}},'canonical_budget_not_funded'],
  [{capability:'payment.execute'},'capability_forbidden'],
  [{version_pin:'v0'},'mandate_version_mismatch'],
  [{at_time:new Date('2027-01-01T00:00:00Z')},'mandate_expired']
 ]) assert.equal(assess({...args,at_time:new Date('2026-11-06T13:00:00Z'),...mod}).error,error,JSON.stringify(mod));
});

test('canonical revocation blocks previously valid read-only mandate',()=>{
 const state=createMemoryCopEventStore();
 recordMandateDeclaration(state,{mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:['gmail.send','payment.execute']}});
 assert.equal(assess({...args,store:state}).preflight_ok,true);
 assert.equal(recordMandateControl(state,{principal_ref:'principal:jhn',mandate_ref,action:'revoke'}).ok,true);
 const rejected=assess({...args,store:state});
 assert.equal(rejected.ok,false);
 assert.equal(rejected.error,'mandate_inactive');
 assert.equal(rejected.reservation,null);
});
