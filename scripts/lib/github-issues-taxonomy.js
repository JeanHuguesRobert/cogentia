/**
 * GitHub Issues taxonomy: a derived, provider-neutral classification of issue snapshots.
 * Classification is intentionally conservative. Staleness never implies closure or parking.
 * The native GitHub issue remains authoritative; this module only proposes additive labels.
 */
import { createHash } from 'node:crypto';

export const TAXONOMY_VERSION = 3;
export const CORE_REPOS = Object.freeze(['cogentia', 'barons-Mariani', 'inseme', 'operium']);
const NATIVE_LABELS = Object.freeze({
  'bug': {color:'d73a4a',description:"Something isn't working"},
  'enhancement': {color:'a2eeef',description:'New feature or request'},
  'documentation': {color:'0075ca',description:'Improvements or additions to documentation'},
});
export const COMMON_LABELS = Object.freeze({
  'cpkt': { color: '0e8a16', description: 'Cold-resumable Cognitive Packet, not any ordinary continuation' },
  'continuation': { color: '1d76db', description: 'Explicit continuation or suspended work; cold-resumability is not implied' },
  'umbrella': { color: '0052cc', description: 'Coordinates linked issues; not a substitute for their work' },
  'idea-to-explore': { color: 'c2e0c6', description: 'Unstarted possibility worthy of preservation' },
  'research': { color: 'bfdadc', description: 'Research and exploratory work' },
  'blocked': { color: 'b60205', description: 'A confirmed dependency prevents the next action' },
  'parked': { color: '1b5c74', description: 'Started work deliberately suspended but resumable' },
  'ready': { color: '0e8a16', description: 'Ready for execution; no unresolved blocking dependency' },
  'urgency:now': { color: 'b60205', description: 'Action currently urgent, independent of importance/severity' },
  'urgency:soon': { color: 'fbca04', description: 'Action needed soon, independent of importance/severity' },
  'urgency:deferred': { color: 'c5def5', description: 'Action explicitly deferred, not necessarily low importance' },
  'importance:essential': { color: '5319e7', description: 'Essential to the mission, independent of urgency' },
  'importance:high': { color: 'd4c5f9', description: 'High value, independent of urgency' },
});

const safeName = s => /^[\w.\-]+$/.test(s);
const iso = s => Date.parse(s || '') || 0;
const clean = s => String(s || '').trim();
const uniq = a => [...new Set(a)].sort((a,b)=>a.localeCompare(b,'en'));
export function digest(value) {return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export function checkRepoName(name) {
  if (typeof name !== 'string' || !/^JeanHuguesRobert\/[\w.\-]+$/.test(name) || !safeName(name.split('/')[1])) throw Error('Invalid or out-of-scope repository');
  return name;
}
export function classifyIssue(issue) {
  const title = clean(issue.title), body = clean(issue.body), labels = new Set((issue.labels || []).map(x => typeof x === 'string' ? x : x.name));
  const proposed = [], review = [];
  const add = (name, reason) => { if (!labels.has(name) && !proposed.some(x=>x.label===name)) proposed.push({label:name,reason,confidence:'strong'}); };
  if (/^\s*\[(?:CPKT|Cognitive Packet)\]/i.test(title) || /^\s*Cognitive Packet\b/i.test(title)) add('cpkt','Explicit title marker');
  if (/^\s*(?:\[continuation\]|continuation\s*[—:\-])/i.test(title)) add('continuation','Explicit continuation title, without claiming cold-resumability');
  if (/^\s*\[(?:umbrella)\]/i.test(title) || /\bumbrella (?:packet|issue|work)\b/i.test(title.slice(0,90))) add('umbrella','Explicit umbrella title');
  if (/^\s*epic\s*[-—:]\s*/i.test(title) || /^\s*super ACP\s*\(umbrella\)/i.test(title)) add('umbrella','Explicit epic or umbrella title');
  if (/^\s*\[(?:idea to explore|idea|product idea)\]/i.test(title)) add('idea-to-explore','Explicit idea marker in title');
  if (/^\s*(?:\[(?:bug|P0 bug)\]|bug:|OP-BUG-\d+\b)/i.test(title)) add('bug','Explicit bug marker in title');
  if (/^\s*fix(?:\([^)]+\))?:/i.test(title)) add('bug','Explicit conventional fix: title prefix');
  if (/^\s*(?:feat(?:\([^)]+\))?:|M\d{1,2}\s*[-—])/i.test(title)) add('enhancement','Explicit feature or bounded implementation milestone prefix');
  if (/^\s*(?:\[(?:docs|documentation)\]|docs:)/i.test(title)) add('documentation','Explicit documentation marker in title');
  if (/^\s*docs\([^)]+\):/i.test(title)) add('documentation','Explicit conventional docs: title prefix');
  if (/^\s*(?:\[research\]|research:)/i.test(title)) add('research','Explicit research marker in title');
  if (/^\s*(?:explore|study|investigate|benchmark|case study|enqu[eê]te|[eé]tudier|[eé]valuer)\b/i.test(title)) add('research','Explicit exploratory/research action in title');
  if (/^\s*(?:\[parked\]|parked:)/i.test(title)) add('parked','Explicit parked marker in title');
  if (/^\s*(?:\[blocked\]|blocked:)/i.test(title)) add('blocked','Explicit blocked marker in title');
  if (/^\s*(?:\[P0\]|P0[: -])/i.test(title)) add('urgency:now','Explicit priority-0 marker in title');
  if (/^\s*(?:\[P1\]|P1[: -])/i.test(title)) add('urgency:soon','Explicit priority-1 marker in title');
  const remaining = (body.match(/^\s*[-*]\s*\[\s\]/gm) || []).length;
  const done = (body.match(/^\s*[-*]\s*\[[xX]\]/gm) || []).length;
  const explicitlyComplete = /(?:cet?te? issue a rempli son objet|objet opérationnel principal[^\n]{0,60}accompli|definition of done\s*[—:\-]\s*validée|travail (?:est )?terminé)/i.test(body.slice(0,12000));
  if (explicitlyComplete || (done>=3 && remaining===0)) {
    review.push({action:'consider_close',reason: explicitlyComplete ? 'Explicit completion claim in issue' : 'At least three checked tasks and none unchecked; confirm real acceptance',confidence:'review_required'});
  }
  const duplicate = body.match(/(?:duplicate of|doublon de|duplicat(?:e|a) de)\s+(?:[^\n#]*?)(?:#(\d+))/i);
  if (duplicate) review.push({action:'consider_duplicate',reason:'Explicit possible duplicate reference #'+duplicate[1],confidence:'review_required'});
  return {labels:proposed,review,checked:done,unchecked:remaining};
}
export function buildTaxonomyPlan({owner='JeanHuguesRobert',repositories,at=new Date().toISOString(),reviewedDecisions=[]}){
  if(owner!=='JeanHuguesRobert') throw Error('Unexpected owner');
  if(!Array.isArray(reviewedDecisions)||reviewedDecisions.length>100)throw Error('Reviewed decisions must be a bounded array (max 100)');
  const reviews=new Map();
  const supported=new Set([...Object.keys(COMMON_LABELS),...Object.keys(NATIVE_LABELS)]);
  for(const decision of reviewedDecisions){
    const repoName=checkRepoName(decision?.repo);
    if(!Number.isInteger(decision.number)||decision.number<1||
       !Array.isArray(decision.labels)||!decision.labels.length||decision.labels.length>3||
       decision.labels.some(label=>!supported.has(label))||
       typeof decision.evidence!=='string'||decision.evidence.trim().length<12||decision.evidence.length>400)throw Error('Invalid reviewed decision');
    const key=repoName+'#'+decision.number;
    if(reviews.has(key))throw Error('Duplicate reviewed decision');
    reviews.set(key,decision);
  }
  const result={schema:'cogentia.github-issues-taxonomy.plan/v1',taxonomy_version:TAXONOMY_VERSION,created_at:at,repositories:[],summary:{open:0,unlabelled:0,older60:0,labels_to_create:0,issues_to_label:0,label_additions:0,closure_candidates:0,needs_judgment:0,reviewed_decisions:0,reviewed_label_additions:0,private_repositories:0}};
  const now=iso(at);
  for(const repo of repositories){
    checkRepoName(repo.full_name);
    const privateRepo=!!repo.private;
    if(privateRepo)result.summary.private_repositories++;
    const present=new Map(repo.labels.map(l=>[l.name,l]));
    const drift=Object.entries(COMMON_LABELS).filter(([name])=>present.has(name) && (clean(present.get(name).description)!==clean(COMMON_LABELS[name].description) || present.get(name).color?.toLowerCase()!==COMMON_LABELS[name].color)).map(([name,desired])=>({name,expected:{color:present.get(name).color,description:present.get(name).description ?? null},desired}));
    const changes=[],closureCandidates=[],judgmentQueue=[];
    for(const raw of repo.issues){
      if(raw.pull_request || raw.state!=='open')continue;
      const existing=uniq((raw.labels||[]).map(x=>typeof x==='string'?x:x.name));
      const inference=classifyIssue(raw);
      const reviewKey=repo.full_name+'#'+raw.number;
      const decision=reviews.get(reviewKey);
      if(decision){
        // Never treat the reviewer's opinion as proof: require an exact, current
        // quote from the Issue snapshot and bind it to the resulting plan hash.
        if(!(String(raw.title||'')+'\n'+String(raw.body||'')).includes(decision.evidence))throw Error('Reviewed evidence not found for '+reviewKey);
        const evidenceHash=digest(decision.evidence);
        for(const label of decision.labels){
          if(!existing.includes(label)&&!inference.labels.some(item=>item.label===label)){
            inference.labels.push({label,confidence:'reviewed',reason:'Scoped human/agent judgment grounded in current issue text',evidence_digest:evidenceHash});
            result.summary.reviewed_label_additions++;
          }
        }
        result.summary.reviewed_decisions++;
        reviews.delete(reviewKey);
      }
      const row={number:raw.number, expected_updated_at:raw.updated_at, expected_title_digest:digest(raw.title),expected_labels:existing,add:inference.labels};
      result.summary.open++;
      if(!existing.length)result.summary.unlabelled++;
      if(!existing.length&&!inference.labels.length){
        judgmentQueue.push({number:raw.number,updated_at:raw.updated_at,reason:'no_explicit_classification_signal',...(privateRepo?{}:{title:raw.title})});
        result.summary.needs_judgment++;
      }
      if(now-iso(raw.updated_at)>=60*86400000)result.summary.older60++;
      if(inference.labels.length){changes.push(row); result.summary.issues_to_label++;result.summary.label_additions+=inference.labels.length;}
      if(inference.review.length) {closureCandidates.push({number:raw.number,signals:inference.review,...(privateRepo?{}:{title:raw.title})});result.summary.closure_candidates++;}
    }
    // Do not create twelve unused labels in dormant repositories:
    // fully provision the four core repos; elsewhere create only labels justified by an issue.
    const needed=new Set(changes.flatMap(c=>c.add.map(l=>l.label)));
    const core=CORE_REPOS.includes(repo.full_name.split('/')[1]);
    const definitions=[
      ...Object.entries(COMMON_LABELS).filter(([name])=>!present.has(name)&&(core||needed.has(name))).map(([name,def])=>({name,...def})),
      ...Object.entries(NATIVE_LABELS).filter(([name])=>!present.has(name)&&needed.has(name)).map(([name,def])=>({name,...def})),
    ];
    result.summary.labels_to_create+=definitions.length;
    judgmentQueue.sort((a,b)=>String(a.updated_at).localeCompare(String(b.updated_at)));
    result.repositories.push({name:repo.full_name,private:privateRepo,missing_definitions:definitions,definition_drift:drift,changes,closure_candidates:closureCandidates,judgment_queue:judgmentQueue,open_count:repo.issues.filter(x=>!x.pull_request&&x.state==='open').length});
  }
  if(reviews.size)throw Error('Reviewed decision targets unavailable or not open: '+[...reviews.keys()].join(', '));
  result.plan_hash=digest({...result,plan_hash:undefined});
  return result;
}
export function preflightIssueChange(expected,current) {
  if(!current || current.state!=='open') return 'not_open';
  if(digest(current.title)!==expected.expected_title_digest) return 'title_changed';
  const labels=uniq((current.labels||[]).map(x=>typeof x==='string'?x:x.name));
  // update_at changes when unrelated metadata or comments are touched: refuse and replan.
  if(current.updated_at!==expected.expected_updated_at)return 'issue_changed';
  if(JSON.stringify(labels)!==JSON.stringify(expected.expected_labels))return 'labels_changed';
  if(expected.add.some(x=>labels.includes(x.label)))return 'already_applied';
  return null;
}
export function assertPlan(plan){
  if(!plan||plan.schema!=='cogentia.github-issues-taxonomy.plan/v1'||plan.taxonomy_version!==TAXONOMY_VERSION)throw Error('Invalid taxonomy plan');
  const {plan_hash,...rest}=plan;
  if(digest({...rest,plan_hash:undefined})!==plan_hash)throw Error('Plan hash mismatch');
  if(Date.now()-iso(plan.created_at)>72*3600*1000||iso(plan.created_at)>Date.now()+60000)throw Error('Plan expired or clock invalid');
  const seen=new Set();
  for(const r of plan.repositories){
    checkRepoName(r.name);
    if(seen.has(r.name))throw Error('Duplicate repo');
    seen.add(r.name);
    for(const l of r.missing_definitions)if(!Object.hasOwn(COMMON_LABELS,l.name)&&!Object.hasOwn(NATIVE_LABELS,l.name)||JSON.stringify(COMMON_LABELS[l.name]||NATIVE_LABELS[l.name])!==JSON.stringify({color:l.color,description:l.description}))throw Error('Untrusted label definition');
    for(const l of r.definition_drift)if(!Object.hasOwn(COMMON_LABELS,l.name)||JSON.stringify(l.desired)!==JSON.stringify(COMMON_LABELS[l.name]))throw Error('Untrusted label drift');
    for(const c of r.changes){if(!Number.isInteger(c.number)||c.number<1||!Array.isArray(c.add)||c.add.some(a=>!Object.hasOwn(COMMON_LABELS,a.label) && !Object.hasOwn(NATIVE_LABELS,a.label)))throw Error('Invalid issue change');}
  }
  return true;
}
