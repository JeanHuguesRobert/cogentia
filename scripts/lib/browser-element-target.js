/** Document-local DOM identity for the existing inspect/form.fill capabilities.
 * A target identifies an object, not an authorization or durable selector.
 * Frame identity is explicit; hosted top-document callers remain top-only by default.
 */
import {readFileSync} from 'node:fs';
import {SAFE_DOM_STRUCTURE_CODE} from './browser-safe-dom-structure.js';

const EPOCH=/^[a-f0-9]{32}$/;
const UID=/^[a-f0-9]{32}:[1-9][0-9]{0,15}$/;
export function validElementTarget(target,{tabId,browserId,allowFrame=false}={}){
 return !!target&&typeof target==='object'&&!Array.isArray(target)&&
  Object.keys(target).sort().join(',')==='browser_instance_id,document_epoch,frame_id,tab_id,uid'&&
  typeof target.browser_instance_id==='string'&&target.browser_instance_id.length>0&&target.browser_instance_id.length<=200&&
  (browserId===undefined||target.browser_instance_id===browserId)&&
  Number.isSafeInteger(target.tab_id)&&target.tab_id>0&&(tabId===undefined||target.tab_id===tabId)&&
  (target.frame_id==='top'||(allowFrame&&typeof target.frame_id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(target.frame_id)))&&typeof target.document_epoch==='string'&&EPOCH.test(target.document_epoch)&&
  typeof target.uid==='string'&&UID.test(target.uid)&&target.uid.startsWith(target.document_epoch+':');
}
export const ELEMENT_TARGET_SCHEMA={type:'object',properties:{
 browser_instance_id:{type:'string',minLength:1,maxLength:200},
 tab_id:{type:'integer',minimum:1},frame_id:{type:'string',pattern:'^[A-Za-z0-9_-]{1,160}$'},
 document_epoch:{type:'string',pattern:'^[a-f0-9]{32}$'},uid:{type:'string',pattern:'^[a-f0-9]{32}:[1-9][0-9]{0,15}$'}
},required:['browser_instance_id','tab_id','frame_id','document_epoch','uid'],additionalProperties:false};

export function compileUidStructure(expectedUrl,{originOnly=false}={}){
 if(typeof expectedUrl!=='string'||!expectedUrl||expectedUrl.length>4096)throw Error('element_target_url_invalid');
 if(originOnly&&new URL(expectedUrl).origin!==expectedUrl)throw Error('element_target_origin_invalid');
 const stdlib=readFileSync(new URL('../../browser-stdlib/navigation.js',import.meta.url),'utf8');
 return `(() => {
 if(location.${originOnly?"origin":"href"}!==${JSON.stringify(expectedUrl)})return {ok:false,reason:'document_url_changed'};
 if(!window.__cogentiaNavigationAssistant?.elementIdentity){
 ${stdlib}
 }
 const registry=window.__cogentiaNavigationAssistant.elementIdentity;
 const structure=${SAFE_DOM_STRUCTURE_CODE};
 return {...structure,document_epoch:registry.epoch,element_uids:Array.from(
 document.querySelectorAll('input,textarea,select,button,[contenteditable="true"]')).slice(0,80).map(el=>registry.elementUid(el))};
 })()`;
}
export function projectElementTarget(raw,index,browserId,tabId,frameId="top"){
 const target={browser_instance_id:browserId,tab_id:tabId,frame_id:frameId,
  document_epoch:raw?.document_epoch,uid:raw?.element_uids?.[index]};
 return validElementTarget(target,{tabId,browserId,allowFrame:true})?target:null;
}

/** Reuse the caller's existing admission and lease. No retry on uncertain effect. */
export async function callUidFormFill({session,target,expectedUrl,code}){
 if(!validElementTarget(target)||typeof session?.withTabLease!=='function')throw Error('element_target_invalid');
 return session.withTabLease(target.browser_instance_id,target.tab_id,async peer=>{
  const reply=await peer.call('page.evaluate',{browser_instance_id:target.browser_instance_id,
   tabId:target.tab_id,expectedUrl,code});
  if(reply?.tab?.id!==target.tab_id||reply?.tab?.url!==expectedUrl)throw Error('element_target_receipt_mismatch');
  return reply.value;
 });
}
