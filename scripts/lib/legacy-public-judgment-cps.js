/**
 * Narrow bridge for ONE existing public document-role Judgment continuation.
 * Reuses the signed John v5 mandate, COP budget, PacketClaim and existing
 * assigned browser CPS worker. Preparation is not provider dispatch.
 *
 * This does not silently resolve/mutate the older host-local continuation:
 * its outcome is delivered as a linked child so the original cognitive
 * parent can judge the answer and record an accepted resolution separately.
 */
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isAbsolute,relative,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareAssignedChatgptCpsContinuation} from './chatgpt-cps-assignment.js';
import {linkPacketChild,registerParentJoin} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';

const safeId=id=>typeof id==='string'&&/^ctn_[A-Za-z0-9_-]{5,120}$/.test(id);
const docPath=p=>typeof p==='string'&&p.endsWith('.md')&&
  /^[a-zA-Z0-9_.\/-]{1,250}$/.test(p)&&!isAbsolute(p)&&
  p.split('/').every(x=>x&&x!=='.'&&x!=='..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const sourceType='index.document_role_judgment';
const PUBLIC_REPOS=new Set(['cogentia','barons-Mariani']);
const declaredPublic=x=>{
  const header=x.match(/^---\n([\s\S]*?)\n---\n/);
  return Boolean(header&&/^visibility[ \t]*:[ \t]*[\"']?public[\"']?[ \t]*$/mi.test(header[1]));
};

export function previewPublicLegacyJudgment({continuation,repositoryRoot,
  publicRepo='cogentia',requirePublishedSource=true}={}){
  if(!continuation||!safeId(continuation.id)||
     continuation.status!=='active'||continuation.kind!==sourceType||
     continuation.subject?.repo!==publicRepo||!PUBLIC_REPOS.has(publicRepo)||
     !docPath(continuation.subject.path)||
     typeof repositoryRoot!=='string'||!repositoryRoot.trim())
    return {ok:false,status:'nonpublic_or_nonjudgment_continuation'};
  const required=continuation.expected_response?.required||[];
  const allowed=continuation.expected_response?.allowed_decisions||[];
  if(!required.includes('decision')||!required.includes('reason')||
     !allowed.includes('needs_more_context'))
    return {ok:false,status:'unsupported_legacy_judgment_schema'};
  let root,full,contents;
  try{
    root=realpathSync(repositoryRoot);
    full=realpathSync(resolve(root,continuation.subject.path));
    const sub=relative(root,full);
    if(!sub||sub.startsWith('..'+sep)||sub==='..'||isAbsolute(sub)||
       !statSync(full).isFile()||statSync(full).size>20_000)
      return {ok:false,status:'source_not_admitted'};
    contents=readFileSync(full,'utf8');
    // A public GitHub repository can still contain private or accidentally
    // committed material. For the family repository, an explicit on-file
    // declaration of public visibility is mandatory in addition to GitHub.
    if(publicRepo==='barons-Mariani'&&!declaredPublic(contents))
      return {ok:false,status:'explicit_public_frontmatter_required'};
    if(requirePublishedSource){
      // A repository directory may contain unpublished/private local edits.
      // Only send content byte-for-byte identical to origin/main, never an
      // untracked file or a dirty worktree snapshot, even on a public repo.
      const published=execFileSync('git',['-C',root,'show',
        'origin/main:'+continuation.subject.path],{
        encoding:'utf8',timeout:6000,maxBuffer:25_000});
      if(published!==contents)return {ok:false,status:'source_unpublished_or_modified'};
    }
  }catch{return {ok:false,status:'source_unavailable'}}
  const path=continuation.subject.path;
  const question=[
    'Travail cognitif de classification pour le Corpus GitHub PUBLIC '+publicRepo+'.',
    'Paquet legacy '+continuation.id+' ; fichier public : '+path+'.',
    'Choisissez exactement une décision dans '+JSON.stringify(allowed)+'.',
    'Pour une page de documentation utile, choisissez index ; pour un document',
    'servant principalement de référence/source, choisissez source ; en cas',
    'de doute significatif choisissez needs_more_context. Ne présumez pas.',
    'Produisez exclusivement dans result.answer un JSON valide',
    '{"decision":"...","reason":"..."}.',
    'Le champ result.packet_status doit être completed si vous pouvez juger,',
    'ou blocked si des informations essentielles manquent.',
    'Vous ne devez ni modifier les fichiers, ni envoyer de message tiers.',
    'Extrait vérifiable du document public :',
    '```markdown',contents.slice(0,2300),'```',
  ].join('\n');
  if(question.length>4500)return {ok:false,status:'question_too_long'};
  const task_ref='legacy:'+continuation.id;
  const child_id='ctn_chatgpt_browser_'+sha(task_ref).slice(0,32);
  return {ok:true,task_ref,parent_ref:'continuation:'+continuation.id,
    child_ref:'continuation:'+child_id,question,source_digest:sha(contents),
    path,source_repo:publicRepo,kind:sourceType};
}

export async function preparePublicLegacyJudgmentCps({store,continuation,
  repositoryRoot,publicRepo='cogentia',requirePublishedSource=true,
  prepare=prepareAssignedChatgptCpsContinuation}={}){
  if(typeof store?.transaction!=='function'||typeof prepare!=='function')
    return {ok:false,status:'invalid_store_or_preparation'};
  const projection=previewPublicLegacyJudgment({continuation,repositoryRoot,publicRepo,
    requirePublishedSource});
  if(!projection.ok)return projection;
  const created=await prepare({store,task_ref:projection.task_ref,
    question:projection.question,hop_count:0});
  if(!created.ok)return {ok:false,status:created.error||'cps_not_admitted'};
  if('continuation:'+created.continuation_id!==projection.child_ref)
    return {ok:false,status:'prepared_cps_identity_conflict'};
  const link=linkPacketChild(store,{parent_ref:projection.parent_ref,
    child_ref:projection.child_ref});
  if(!link.ok)return {ok:false,status:link.status||'parent_link_reconciliation_required'};
  const join=registerParentJoin(store,{parent_ref:projection.parent_ref,
    join_id:'public-document-role-judgment',mode:'all',
    child_refs:[projection.child_ref]});
  if(!join.ok)return {ok:false,status:join.status||'join_registration_reconciliation_required'};
  return {ok:true,status:'assigned_pending_judgment',duplicate:created.duplicate,
    legacy_continuation_id:continuation.id,cps_continuation_id:created.continuation_id,
    legacy_parent_ref:projection.parent_ref,cps_child_ref:projection.child_ref,
    source_digest:projection.source_digest,source_repo:publicRepo,
    source_path:projection.path,child_receipt_ref:created.declaration_receipt_ref};
}
