/** Frame-scoped evaluation over an already established WebDriver BiDi session.
 * No session discovery, lease acquisition, authorization or automatic retry.
 * The caller owns the tab lease and maps its tab to an actual root context.
 */
const ID=/^[A-Za-z0-9_-]{1,160}$/;
const SANDBOX='cogentia-governed-evaluate';
function origin(url){try{return new URL(url).origin}catch{return null}}
function findFrame(root,frameId){
 const pending=[root],matches=[];let count=0;
 while(pending.length){
  const node=pending.shift();
  if(!node||typeof node.context!=='string'||++count>256)throw Error('bidi_frame_tree_invalid');
  if(node.context===frameId)matches.push(node);
  if(Array.isArray(node.children))pending.push(...node.children);
 }
 if(matches.length!==1||matches[0]===root)throw Error('bidi_frame_not_unique_or_missing');
 return matches[0];
}
export async function executeBidiFrameEvaluate({send,rootContext,expectedUrl,frameId,expectedOrigin,scriptForUrl}={}){
 if(typeof send!=='function'||!ID.test(rootContext||'')||!ID.test(frameId||'')||
  typeof expectedUrl!=='string'||!/^https?:\/\//.test(expectedUrl)||
  typeof expectedOrigin!=='string'||!/^https?:\/\//.test(expectedOrigin)||origin(expectedOrigin)!==expectedOrigin||
  typeof scriptForUrl!=='function')throw Error('bidi_frame_evaluate_invalid');
 async function target(){
  const {contexts}=await send('browsingContext.getTree',{root:rootContext});
  if(!Array.isArray(contexts)||contexts.length!==1||contexts[0].context!==rootContext||
   contexts[0].url!==expectedUrl)throw Error('bidi_root_changed');
  const frame=findFrame(contexts[0],frameId);
  if(origin(frame.url)!==expectedOrigin)throw Error('bidi_frame_origin_mismatch');
  return frame;
 }
 const before=await target();
 // Establish a named sandbox, then pin the actual returned realm. The named
 // sandbox persists within the document, not across navigation.
 const init=await send('script.evaluate',{expression:'true',target:{context:frameId,sandbox:SANDBOX},awaitPromise:true});
 if(init.type!=='success'||typeof init.realm!=='string'||!init.realm)throw Error('bidi_frame_realm_unavailable');
 const fresh=await target();
 if(fresh.url!==before.url)throw Error('bidi_frame_document_changed');
 const script=scriptForUrl(fresh.url);
 if(typeof script!=='string'||!script||script.length>16000)throw Error('bidi_frame_script_invalid');
 // JSON projection matches the Core CDP recipe contract. A realm destroyed
 // between observation and execution is not replaced by another realm.
 const result=await send('script.evaluate',{
  expression:`Promise.resolve((0,eval)(${JSON.stringify(script)})).then(v=>JSON.stringify(v??null))`,
  target:{realm:init.realm},awaitPromise:true});
 if(result.type!=='success'||result.realm!==init.realm||result.result?.type!=='string')
  throw Error('bidi_frame_execution_failed');
 const after=await target();
 const realms=await send('script.getRealms',{context:frameId,type:'window'});
 if(after.url!==fresh.url||!Array.isArray(realms.realms)||
  !realms.realms.some(r=>r.realm===init.realm&&r.context===frameId&&r.sandbox===SANDBOX))
  throw Error('bidi_frame_result_unconfirmed');
 return {value:JSON.parse(result.result.value),frameId,origin:expectedOrigin,realm:init.realm};
}
