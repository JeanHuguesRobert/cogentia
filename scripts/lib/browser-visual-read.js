import {createHash} from 'node:crypto';

/** A narrowly scoped read of a loaded image, no arbitrary URL or fetch.
 * The admitted caller owns the tab lease. No image bytes in the receipt. */
export function validateVisualRead(input){
 const keys=['action','browser_instance_id','tab_id','expected_url','image_name'];
 if(!input||Object.keys(input).some(k=>!keys.includes(k))||input.action!=='image'||
    typeof input.browser_instance_id!=='string'||!input.browser_instance_id||input.browser_instance_id.length>200||
    !Number.isSafeInteger(input.tab_id)||input.tab_id<1||
    typeof input.expected_url!=='string'||input.expected_url.length>4096||
    typeof input.image_name!=='string'||! /^[a-zA-Z0-9_.-]{1,180}\.(?:jpe?g|png|webp|gif|avif)$/i.test(input.image_name))return false;
 try{const u=new URL(input.expected_url);return u.protocol==='https:'&&!u.username&&!u.password}
 catch{return false}
}
const MAX_BYTES=1024*1024;
function mime(bytes){
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
 return null;
}
export async function readLoadedImage({send,frameTree,input,onImage}){
 if(typeof send!=='function'||typeof onImage!=='function'||!validateVisualRead(input))throw Error('visual_read_invalid');
 const frame=frameTree?.frame;
 if(!frame?.id||frame.url!==input.expected_url)throw Error('visual_read_document_changed');
 // Store the exact node in a remote object handle for this invocation only.
 // A document replacement, detachment, or changed image source invalidates it.
 const expression=`(() => {
  if(location.href!==${JSON.stringify(input.expected_url)})return null;
  const found=[...document.images].filter(el=>{
   if(!el.isConnected||!el.complete||!el.naturalWidth||!el.naturalHeight)return false;
   try{const u=new URL(el.currentSrc);return u.protocol==='https:'&&!u.username&&!u.password&&
      u.pathname.split('/').pop()===${JSON.stringify(input.image_name)}}catch{return false}
  });
  const visible=found.filter(el=>{
    const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&
     getComputedStyle(el).visibility==='visible'&&getComputedStyle(el).opacity!=='0';
  });
  if(!visible.length||new Set(visible.map(el=>el.currentSrc)).size!==1)return null;
  const el=visible[0];return {el,url:el.currentSrc,width:el.naturalWidth,height:el.naturalHeight};
 })()`;
 const result=await send('Runtime.evaluate',{expression,returnByValue:false,objectGroup:'cogentia-visual-read'});
 const objectId=result?.result?.objectId;
 if(result?.exceptionDetails||!objectId)throw Error('visual_read_image_unavailable_or_ambiguous');
 try{
  async function observed(){
   const r=await send('Runtime.callFunctionOn',{objectId,returnByValue:true,functionDeclaration:`function(){
    if(location.href!==${JSON.stringify(input.expected_url)}||!this.el?.isConnected||
       this.el.ownerDocument!==document||this.el.currentSrc!==this.url||
       !this.el.complete||this.el.naturalWidth!==this.width||this.el.naturalHeight!==this.height)return null;
    return {url:this.url,width:this.width,height:this.height};
   }`});
   if(r?.exceptionDetails||!r?.result?.value)throw Error('visual_read_image_changed');
   return r.result.value;
  }
  const before=await observed();
  if(!Number.isSafeInteger(before.width)||!Number.isSafeInteger(before.height)||
     before.width<1||before.height<1||before.width*before.height>16000000)throw Error('visual_read_dimensions_invalid');
  await send('Page.enable',{});
  const data=await send('Page.getResourceContent',{frameId:frame.id,url:before.url});
  if(data?.base64Encoded!==true||typeof data.content!=='string'||
    data.content.length>Math.ceil(MAX_BYTES/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.content))
   throw Error('visual_read_resource_unavailable_or_too_large');
  const bytes=Buffer.from(data.content,'base64'),mimeType=mime(bytes);
  if(!mimeType||!bytes.length||bytes.length>MAX_BYTES||bytes.toString('base64')!==data.content)throw Error('visual_read_format_unsupported');
  const after=await observed();
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('visual_read_image_changed');
  const receipt={kind:'visual.observation.v1',image_name:input.image_name,mime_type:mimeType,
   width:before.width,height:before.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),retention:'transient'};
  onImage({type:'image',mimeType,data:data.content});
  return receipt;
 }finally{await send('Runtime.releaseObjectGroup',{objectGroup:'cogentia-visual-read'}).catch(()=>{})}
}
