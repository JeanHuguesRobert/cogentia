#!/usr/bin/env node
import assert from 'node:assert/strict';
import {COMMON_LABELS,classifyIssue,buildTaxonomyPlan,assertPlan,preflightIssueChange,digest} from './lib/github-issues-taxonomy.js';
const t=(title,body='',labels=[])=>({number:1,title,body,labels:labels.map(name=>({name})),updated_at:'2026-11-17T10:00:00Z',state:'open'});
assert.deepEqual(classifyIssue(t('[CPKT] Une continuation')).labels.map(x=>x.label),['cpkt']);
assert.deepEqual(classifyIssue(t('[Idea to explore] Nouveau concept')).labels.map(x=>x.label),['idea-to-explore']);
assert.deepEqual(classifyIssue(t('P0: Security bug')).labels.map(x=>x.label),['urgency:now']);
assert.deepEqual(classifyIssue(t('Bug: error')).labels.map(x=>x.label),['bug']);
assert.deepEqual(classifyIssue(t('Research: study')).labels.map(x=>x.label),['research']);
assert.deepEqual(classifyIssue(t('Une idée ancienne, récemment bloquée')).labels,[]);
assert.deepEqual(classifyIssue(t('[CPKT] Poursuivre','', ['cpkt'])).labels,[]);
assert.equal(classifyIssue(t('Chantier ancien','- [x] A\n- [x] B\n- [x] C\n- [ ] D')).review.length,0);
assert.equal(classifyIssue(t('Chantier ancien','- [x] A\n- [x] B\n- [x] C')).review[0].action,'consider_close');
assert.equal(classifyIssue(t('Chantier ancien','Cette issue a rempli son objet opérationnel principal.')).review[0].action,'consider_close');
assert.deepEqual(classifyIssue(t('Issue avec un problème de dépendance après 90 jours')).labels,[]);
const issue=t('[CPKT] Operational packet');
const plan=buildTaxonomyPlan({repositories:[{full_name:'JeanHuguesRobert/cogentia',private:false,issues:[issue],labels:[{name:'parked',description:'Resumable work',color:'1b5c74'}]}],at:'2026-11-17T12:00:00Z'});
assert.equal(plan.summary.open,1);
assert.equal(plan.summary.unlabelled,1);
assert.equal(plan.repositories[0].changes[0].add[0].label,'cpkt');
assert.ok(plan.repositories[0].definition_drift.some(x=>x.name==='parked'));
assert.ok(plan.repositories[0].missing_definitions.some(x=>x.name==='ready'));
const savedDate=Date.now;
try{
 Date.now=()=>Date.parse('2026-11-17T12:15:00Z');
 assert.equal(assertPlan(plan),true);
 assert.equal(preflightIssueChange(plan.repositories[0].changes[0],issue),null);
 assert.equal(preflightIssueChange(plan.repositories[0].changes[0],{...issue,updated_at:'2026-11-17T12:16:00Z'}),'issue_changed');
 assert.equal(preflightIssueChange(plan.repositories[0].changes[0],{...issue,labels:[{name:'other'}]}),'labels_changed');
 const changed=structuredClone(plan);changed.repositories[0].changes[0].add[0].label='dangerous';
 assert.throws(()=>assertPlan(changed),/hash mismatch/);
 const expired=structuredClone(plan);expired.created_at='2026-11-10T12:00:00Z';const {plan_hash,...rest}=expired;expired.plan_hash=digest({...rest,plan_hash:undefined});
 assert.throws(()=>assertPlan(expired),/expired/);
}finally{Date.now=savedDate;}
assert.ok(Object.keys(COMMON_LABELS).every(x=>/^[a-z][\w:-]+$/.test(x)));
console.log('ok - taxonomy: 17 assertions, idempotence, drift, privacy and conservative closure');
