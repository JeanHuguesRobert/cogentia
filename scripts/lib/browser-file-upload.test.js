import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBrowserFileUploadCapability} from './browser-file-upload.js';
const target='https://studio.example.org/channel/correct/videos/upload';
function fixtureTransport({disabled=false,browserBytes=18,fileCount=1,readable=true}={}){
 const calls=[];
 return {calls,async withFrame(args){
   calls.push(['lease',args.tabId,args.expectedUrl]);
   return args.operation({frameTree:{frame:{url:args.expectedUrl}},send:async(method,params)=>{
     calls.push([method,params]);
     if(method==='DOM.getDocument')return {root:{nodeId:17}};
     if(method==='DOM.querySelectorAll')return {nodeIds:[42]};
     if(method==='DOM.describeNode')return {node:{nodeName:'INPUT',attributes:['type','file',...(disabled?['disabled','']:[])]}};
     if(method==='DOM.setFileInputFiles')return {};
     if(method==='DOM.resolveNode')return {object:{objectId:'cdp-node-fixture'}};
     if(method==='Runtime.callFunctionOn')return {result:{value:{count:fileCount,bytes:browserBytes,readable}}};
     if(method==='Runtime.releaseObject')return {};
     throw Error('UNEXPECTED_CDP_METHOD');
   }});
 }}
}
test('generic form upload selects one permitted file by CDP in a pinned tab and redacts path',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-file-upload-'));
 try{
  const asset=path.join(dir,'video.mp4');await writeFile(asset,'test media fixture');
  const transport=fixtureTransport();
  const cap=createBrowserFileUploadCapability({transport,allowedRoots:[dir]});
  assert.equal(cap.risk,'external_write');
  const r=await cap.execute({tab_id:42,expected_url:target,file_index:0,file_path:asset});
  assert.equal(r.ok,true);assert.equal(r.submitted,false);
  assert.equal(r.upload_completion,'unverified');assert.equal(r.selected_file_bytes,18);assert.equal(r.browser_verified_bytes,18);
  assert.deepEqual(transport.calls.map(c=>c[0]),['lease','DOM.getDocument','DOM.querySelectorAll','DOM.describeNode','DOM.setFileInputFiles','DOM.resolveNode','Runtime.callFunctionOn','Runtime.releaseObject']);
  assert.equal(transport.calls.find(c=>c[0]==='DOM.setFileInputFiles')[1].files[0],asset);
  assert.doesNotMatch(JSON.stringify(r),/video.mp4|cogentia-file-upload/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('upload refuses missing roots, outside path, symlink escape, zero bytes, wrong field or URL before effects',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-upload-'));
 try{
  const allowed=path.join(dir,'allowed'),outside=path.join(dir,'outside');
  await mkdir(allowed);await mkdir(outside);
  const payload=path.join(outside,'private.txt');await writeFile(payload,'secrets');
  const link=path.join(allowed,'link.txt');await symlink(payload,link);
  const ok=path.join(allowed,'ok.mp4');await writeFile(ok,'bytes');
  const empty=path.join(allowed,'empty.mp4');await writeFile(empty,'');
  const t=fixtureTransport();
  const noRoots=createBrowserFileUploadCapability({transport:t});
  await assert.rejects(()=>noRoots.execute({tab_id:1,expected_url:target,file_index:0,file_path:ok}),e=>e.code==='BROWSER_UPLOAD_ROOTS_NOT_CONFIGURED');
  const cap=createBrowserFileUploadCapability({transport:t,allowedRoots:[allowed],maxBytes:10});
  const args={tab_id:1,expected_url:target,file_index:0,file_path:ok};
  await assert.rejects(()=>cap.execute({...args,file_path:link}),e=>e.code==='BROWSER_UPLOAD_OUTSIDE_ALLOWED_ROOTS');
  await assert.rejects(()=>cap.execute({...args,file_path:payload}),e=>e.code==='BROWSER_UPLOAD_OUTSIDE_ALLOWED_ROOTS');
  await assert.rejects(()=>cap.execute({...args,file_path:empty}),e=>e.code==='BROWSER_UPLOAD_FILE_NOT_ALLOWED');
  await assert.rejects(()=>cap.execute({...args,expected_url:'http://invalid.test'}),e=>e.code==='BROWSER_UPLOAD_TARGET_INVALID');
  await assert.rejects(()=>cap.execute({...args,file_index:80}),e=>e.code==='BROWSER_UPLOAD_TARGET_INVALID');
  assert.equal(t.calls.length,0);
  const denied=fixtureTransport({disabled:true});
  await assert.rejects(()=>createBrowserFileUploadCapability({transport:denied,allowedRoots:[allowed]}).execute(args),e=>e.code==='BROWSER_UPLOAD_FIELD_UNAVAILABLE');
  assert.equal(denied.calls.some(c=>c[0]==='DOM.setFileInputFiles'),false);
 }finally{await rm(dir,{recursive:true,force:true})}
});


test('a CDP success is NOT a verified file when browser sees zero or wrong bytes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-upload-size-reality-'));
 try{
  const file=path.join(dir,'clip.mp4');await writeFile(file,'test media fixture');
  const args={tab_id:42,expected_url:target,file_index:0,file_path:file};
  for(const browserBytes of [0,9]){
   const transport=fixtureTransport({browserBytes});
   const cap=createBrowserFileUploadCapability({transport,allowedRoots:[dir]});
   await assert.rejects(()=>cap.execute(args),e=>e.code==='BROWSER_UPLOAD_BROWSER_SIZE_MISMATCH');
   assert.deepEqual(transport.calls.slice(-2).map(x=>x[0]),['Runtime.callFunctionOn','Runtime.releaseObject']);
   assert.equal(transport.calls.some(x=>x[0]==='DOM.setFileInputFiles'),true);
  }
  for(const fileCount of [0,2]){
   const transport=fixtureTransport({fileCount});
   const cap=createBrowserFileUploadCapability({transport,allowedRoots:[dir]});
   await assert.rejects(()=>cap.execute(args),e=>e.code==='BROWSER_UPLOAD_BROWSER_FILE_UNVERIFIED');
  }
  const unreadable=fixtureTransport({readable:false});
  await assert.rejects(
   ()=>createBrowserFileUploadCapability({transport:unreadable,allowedRoots:[dir]}).execute(args),
   e=>e.code==='BROWSER_UPLOAD_BROWSER_READ_FAILED'
  );
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('local alternate backend shares file admission and receipt verification',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-upload-backend-'));
 try{
  const file=path.join(dir,'sample.txt');await writeFile(file,'bytes');
  let calls=0;
  const cap=createBrowserFileUploadCapability({allowedRoots:[dir],selectFile:async args=>{
   calls++;assert.equal(args.file.resolved,file);assert.equal(args.file.bytes,5);
   return {selected:true,browserBytes:5};
  }});
  const args={tab_id:42,expected_url:target,file_index:0,file_path:file};
  await assert.rejects(()=>cap.execute({...args,file_path:'/etc/hosts'}),e=>e.code==='BROWSER_UPLOAD_OUTSIDE_ALLOWED_ROOTS');
  assert.equal(calls,0);
  assert.equal((await cap.execute(args)).browser_verified_bytes,5);
  assert.equal(calls,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
