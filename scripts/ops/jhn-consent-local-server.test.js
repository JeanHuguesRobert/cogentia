import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalConsentServer} from './jhn-consent-local-server.js';
import {request as httpRequest} from 'node:http';
const origin='https://browser.fractavolta.com';
const challenge_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const path='/api/cop/principal-consent/'+challenge_id;
const workflow={
  async authenticate({session}){return {ok:session.accessToken==='AUTHENTICATED_OWNER',principal_ref:'principal:jhn',authenticated:session.accessToken==='AUTHENTICATED_OWNER'};},
  inspect(){return {ok:true,schema:'cogentia.cop_consent_challenge.v1',challenge_id,authority:'none',grants_mandate_authority:false};},
  async decide(){throw Error('must not call for disabled listener');}
};
function http(port,method='GET',headers={},body=''){
 return new Promise((resolve,reject)=>{
  const req=httpRequest({hostname:'127.0.0.1',port,path,method,headers},res=>{
   let raw='';res.setEncoding('utf8');res.on('data',x=>raw+=x);
   res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}));
  });
  req.on('error',reject);req.end(body);
 });
}
async function withServer(enableDecision,runner){
 const server=createLocalConsentServer({workflow,origin,enableDecision});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await runner(server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('listener is bound to loopback and fails closed on wrong host and missing bearer',async()=>{
 await withServer(false,async port=>{
   assert.equal((await http(port)).status,404);
   assert.equal((await http(port,'GET',{host:'browser.fractavolta.com'})).status,401);
   const r=await http(port,'GET',{host:'browser.fractavolta.com',authorization:'Bearer AUTHENTICATED_OWNER'});
   assert.equal(r.status,200);assert.equal(r.body.grants_mandate_authority,false);
 });
});
test('POST denied before any workflow call unless explicitly enabled',async()=>{
 await withServer(false,async port=>{
   const r=await http(port,'POST',{host:'browser.fractavolta.com',origin,authorization:'Bearer AUTHENTICATED_OWNER','content-type':'application/json'},JSON.stringify({decision:'approve',payload_hash:'sha256:'+'f'.repeat(64)}));
   assert.equal(r.status,403);assert.equal(r.body.error,'principal_decision_not_enabled');
 });
});
