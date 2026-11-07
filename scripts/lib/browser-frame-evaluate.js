/** Site-agnostic frame execution for a COP-admitted dispatcher.
 * This is a Core recipe over CDP, not a new browser extension verb.
 * It MUST be called only after an independent semantic mandate/budget gate.
 * Never accept an untrusted CDP endpoint or bypass the chosen browser instance.
 */
import {verifyFrameTarget} from './browser-frame-target.js';
export async function executeFrameEvaluate({send,frameId,expectedOrigin,script}={}){
  if(typeof send!=='function'||typeof script!=='string'||!script||script.length>16000)
    throw Error('frame_evaluate_invalid');
  const initial=(await send('Page.getFrameTree')).frameTree;
  verifyFrameTarget(initial,{frameId,expectedOrigin});
  const world=await send('Page.createIsolatedWorld',{frameId,worldName:'cogentia-governed-evaluate'});
  if(!Number.isInteger(world?.executionContextId))throw Error('frame_execution_context_unavailable');
  const fresh=(await send('Page.getFrameTree')).frameTree;
  verifyFrameTarget(fresh,{frameId,expectedOrigin});
  const result=await send('Runtime.evaluate',{
    expression:script,contextId:world.executionContextId,returnByValue:true,awaitPromise:true
  });
  if(result?.exceptionDetails)throw Error('frame_execution_failed');
  // The script may have caused effects. No read-only guarantee is implied.
  return {value:result?.result?.value??null,frameId,origin:expectedOrigin};
}
