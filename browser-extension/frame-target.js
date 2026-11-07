/** Exact iframe targeting, no guessing from a URL, ordinal or active focus. */
const IDENTIFIER=/^[A-Za-z0-9_-]{1,160}$/;
export function verifyFrameTarget(tree,{frameId,expectedOrigin}={}){
 if(!IDENTIFIER.test(frameId||''))throw Error('frame_target_invalid');
 let parsed;try{parsed=new URL(expectedOrigin);}catch{throw Error('frame_origin_invalid');}
 if(!['https:','http:'].includes(parsed.protocol)||parsed.origin!==expectedOrigin||parsed.username||parsed.password)
   throw Error('frame_origin_invalid');
 const todo=[tree];const found=[];
 while(todo.length){
  const item=todo.shift();if(!item?.frame)throw Error('frame_tree_invalid');
  if(item.frame.id===frameId)found.push(item.frame);
  if(Array.isArray(item.childFrames))todo.push(...item.childFrames.slice(0,128));
  if(todo.length>256)throw Error('frame_tree_too_large');
 }
 if(found.length!==1)throw Error('frame_not_unique_or_missing');
 const frame=found[0];
 let origin='';
 try {origin=new URL(frame.securityOrigin||frame.url).origin;}catch{}
 if(origin!==expectedOrigin)throw Error('frame_origin_mismatch');
 return {frameId,origin};
}
