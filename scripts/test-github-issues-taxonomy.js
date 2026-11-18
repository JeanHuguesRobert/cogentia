#!/usr/bin/env node
import assert from 'node:assert/strict';
import {COMMON_LABELS,classifyIssue,buildTaxonomyPlan,assertPlan,preflightIssueChange,digest} from './lib/github-issues-taxonomy.js';
const t=(title,body='',labels=[])=>({number:1,title,body,labels:labels.map(name=>({name})),updated_at:'2026-11-17T10:00:00Z',state:'open'});
assert.deepEqual(classifyIssue(t('[CPKT] Une continuation')).labels.map(x=>x.label),['cpkt']);
assert.deepEqual(classifyIssue(t('[Idea to explore] Nouveau concept')).labels.map(x=>x.label),['idea-to-explore']);
assert.deepEqual(classifyIssue(t('P0: Security bug')).labels.map(x=>x.label),['urgency:now']);
assert.deepEqual(classifyIssue(t('Bug: error')).labels.map(x=>x.label),['bug']);
assert.deepEqual(classifyIssue(t('Research: study')).labels.map(x=>x.label),['research']);
assert.deepEqual(classifyIssue(t('Continuation — A live thread')).labels.map(x=>x.label),['continuation']);
assert.deepEqual(classifyIssue(t('Epic — Parent of multiple issues')).labels.map(x=>x.label),['umbrella']);
assert.deepEqual(classifyIssue(t('Super ACP (umbrella): runtime grouping')).labels.map(x=>x.label),['umbrella']);
assert.deepEqual(classifyIssue(t('feat(calculette): new agent surface')).labels.map(x=>x.label),['enhancement']);
assert.deepEqual(classifyIssue(t('fix(web): Title metadata')).labels.map(x=>x.label),['bug']);
assert.deepEqual(classifyIssue(t('docs(pub): Published tutorial')).labels.map(x=>x.label),['documentation']);
assert.deepEqual(classifyIssue(t('M0 — Scaffold package')).labels.map(x=>x.label),['enhancement']);
const nativeNeeded=buildTaxonomyPlan({repositories:[{full_name:'JeanHuguesRobert/simpli',private:false,issues:[t('M0 — Prototype')],labels:[]}],at:'2026-11-17T12:00:00Z'});
assert.equal(nativeNeeded.repositories[0].missing_definitions[0].name,'enhancement');

assert.deepEqual(classifyIssue(t('M12 — Final package')).labels.map(x=>x.label),['enhancement']);
assert.deepEqual(classifyIssue(t('Explore COP and n8n adapter')).labels.map(x=>x.label),['research']);
assert.deepEqual(classifyIssue(t('Enquête Corse — logement')).labels.map(x=>x.label),['research']);
assert.deepEqual(classifyIssue(t('Study and implement corpus registry')).labels.map(x=>x.label),['research']);
assert.deepEqual(classifyIssue(t('Update documentation')).labels,[]);
assert.deepEqual(classifyIssue(t('Incident — Real outage')).labels,[]);
assert.deepEqual(classifyIssue(t('Continuation — A live thread','',['continuation'])).labels,[]);
assert.deepEqual(classifyIssue(t('No activity in 180 days')).labels,[]);

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
assert.equal(plan.summary.needs_judgment,0);
const ambiguous=buildTaxonomyPlan({repositories:[{full_name:'JeanHuguesRobert/registre-mariani',private:true,issues:[t('Un dossier sans type')],labels:[]}],at:'2026-11-17T12:00:00Z'});
assert.equal(ambiguous.summary.needs_judgment,1);
assert.equal(ambiguous.repositories[0].judgment_queue.length,1);
assert.equal(Object.hasOwn(ambiguous.repositories[0].judgment_queue[0],'title'),false);
const evidence='Bounded implementation plan and safe resumption conditions';
const reviewed=buildTaxonomyPlan({repositories:[{full_name:'JeanHuguesRobert/cogentia',private:false,issues:[t('Working method',evidence)],labels:[]}],reviewedDecisions:[{repo:'JeanHuguesRobert/cogentia',number:1,labels:['research'],evidence}],at:'2026-11-17T12:00:00Z'});
assert.equal(reviewed.summary.reviewed_decisions,1);
assert.equal(reviewed.summary.reviewed_label_additions,1);
assert.equal(reviewed.repositories[0].changes[0].add[0].label,'research');
assert.equal(reviewed.repositories[0].changes[0].add[0].confidence,'reviewed');
assert.ok(!JSON.stringify(reviewed).includes(evidence));
assert.throws(()=>buildTaxonomyPlan({repositories:[{full_name:'JeanHuguesRobert/cogentia',private:false,issues:[t('A',evidence)],labels:[]}],reviewedDecisions:[{repo:'JeanHuguesRobert/cogentia',number:1,labels:['research'],evidence:'nonexistent 20 characters'}]}),/evidence not found/);
assert.throws(()=>buildTaxonomyPlan({repositories:[{full_name:'JeanHuguesRobert/cogentia',private:false,issues:[t('A',evidence)],labels:[]}],reviewedDecisions:[{repo:'JeanHuguesRobert/cogentia',number:2,labels:['research'],evidence}]}),/targets unavailable/);

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
 const obsolete=structuredClone(plan);obsolete.taxonomy_version=1;
 const {plan_hash:obsoleteHash,...other}=obsolete;obsolete.plan_hash=digest({...other,plan_hash:undefined});
 assert.throws(()=>assertPlan(obsolete),/Invalid taxonomy plan/);

 const expired=structuredClone(plan);expired.created_at='2026-11-10T12:00:00Z';const {plan_hash,...rest}=expired;expired.plan_hash=digest({...rest,plan_hash:undefined});
 assert.throws(()=>assertPlan(expired),/expired/);
}finally{Date.now=savedDate;}
assert.ok(Object.keys(COMMON_LABELS).every(x=>/^[a-z][\w:-]+$/.test(x)));
console.log('ok - taxonomy: deterministic title evidence, idempotence, drift, privacy and conservative closure');
