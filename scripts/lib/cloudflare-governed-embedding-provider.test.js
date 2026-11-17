import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGovernedProviderSecretUse} from './governed-provider-secret-use.js';
import {createCloudflareFreeEmbeddingProvider,CF_FREE_EMBEDDING_PROVIDER,
  HOST_PROCESS_RUN_CAPABILITY,CF_EMBEDDING_MODEL} from './cloudflare-governed-embedding-provider.js';
const token='PRIVATE_TOKEN_NOT_FOR_OUTPUT';
const account='0123456789abcdef0123456789abcdef';
const ref={chunk_id:1,content_hash:'hash_abc123'};
const chunks=[{id:1,content_hash:ref.content_hash,searchable_public:1,text:'public text'}];
function fixture({authorized=true,publicChunk=true,paid=false}={}) {
  const calls=[],settlements=[],saved=[];
  const vault={async withSecret(r,callback){
    calls.push('vault:'+r);
    return callback(r==='jhn-vault:cloudflare_api_key'?token:account);
  }};
  const descriptor=createCloudflareFreeEmbeddingProvider({
    vault,
    loadPublicChunks:async refs=>publicChunk?chunks:chunks.map(c=>({...c,searchable_public:0})),
    persist:async(rows,{grant})=>{
      assert.ok(grant.budget_reservation_id);
      saved.push(...rows);
      return {ok:true,stored:rows.length,reused:0,stale:0};
    },
    fetchImpl:async(url,init)=>{
      assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/'));
      assert.equal(init.headers.Authorization,'Bearer '+token);
      calls.push(new URL(url).pathname.split('/').slice(-2).join('/'));
      if(url.endsWith('/tokens/verify'))return new Response(JSON.stringify({success:true,result:{status:'active'}}));
      if(url.endsWith('/subscriptions'))return new Response(JSON.stringify({
        success:true,result:paid?[{rate_plan:{id:'WORKERS_PAID'}}]:[],
      }));
      if(url.endsWith('/workers/account-settings'))return new Response(JSON.stringify({success:true,result:{default_usage_model:'bundled'}}));
      assert.equal(url.includes('/ai/run/'),true);
      assert.equal(JSON.parse(init.body).input[0],'title: none | text: public text');
      return new Response(JSON.stringify({success:true,result:{model:CF_EMBEDDING_MODEL,
        data:[{index:0,embedding:Array(768).fill(.2)}]}}));
    },
  });
  const driver=createGovernedProviderSecretUse({
    vault,providers:{[CF_FREE_EMBEDDING_PROVIDER]:descriptor},
    authorize:async({provider,capability,credential_ref})=>({
      authorized,principal_ref:'principal:jhn',actor_ref:'agent:jhn',
      mandate_ref:'mandate:jhn:john-root',issuer_ref:'issuer:trusted',
      effect_authorization_id:'effect:test',budget_reservation_id:'budget:reserved',
      provider,capability,credential_ref,max_billable_usd:'0',
      target:'node:fracta2',execution_mode:'normal',
    }),
    settle:async evidence=>{settlements.push(evidence);},
  });
  return {driver,calls,settlements,saved};
}
const req={provider:CF_FREE_EMBEDDING_PROVIDER,capability:HOST_PROCESS_RUN_CAPABILITY,
  input:{chunk_refs:[ref]},context:{packet_ref:'cogentia#338'}};
test('governed Free provider consumes Vault secrets in-process, persists once, only returns redacted receipt',async()=>{
  const f=fixture();
  const result=await f.driver.invoke(req);
  assert.equal(result.ok,true);
  assert.equal(result.values_exposed,false);
  assert.equal(JSON.stringify(result).includes(token),false);
  assert.equal(result.capability,'host.process.run'); // generic capability, no vector data
  assert.equal(f.saved.length,1);
  assert.equal(f.saved[0].embedding.length,768);
  assert.equal(f.settlements[0].outcome,'completed');
  assert.equal(f.calls.filter(x=>x.startsWith('vault:')).length,2);
});
test('unauthorized effect never opens Vault nor contacts provider',async()=>{
  const f=fixture({authorized:false});
  await assert.rejects(f.driver.invoke(req),e=>e.code==='PROVIDER_AUTHORITY_DENIED');
  assert.deepEqual(f.calls,[]);
});
test('private source is denied before account/token lookup',async()=>{
  const f=fixture({publicChunk:false});
  await assert.rejects(f.driver.invoke(req),e=>e.code==='PROVIDER_EXECUTION_FAILED');
  assert.deepEqual(f.calls,['vault:jhn-vault:cloudflare_api_key']);
  assert.equal(f.saved.length,0);
});
test('paid Workers subscription refuses provider effect without producing a vector',async()=>{
  const f=fixture({paid:true});
  await assert.rejects(f.driver.invoke(req),e=>e.code==='PROVIDER_EXECUTION_FAILED');
  assert.equal(f.saved.length,0);
  assert.equal(f.settlements[0].outcome,'failed');
});

test('SQLite replay keeps OpenAI vectors and does not repeat Cloudflare inference',async()=>{
  const {DatabaseSync}=await import('node:sqlite');
  const {createSqliteCloudflareEmbeddingProjection}=await import('./cloudflare-governed-embedding-provider.js');
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE chunks(id INTEGER PRIMARY KEY,repo TEXT,path TEXT,content_hash TEXT,' +
      'start_line INTEGER,end_line INTEGER,text TEXT,searchable_public INTEGER);' +
      'CREATE TABLE embeddings(id INTEGER PRIMARY KEY,chunk_id INTEGER,content_hash TEXT,provider TEXT,' +
      'repo TEXT,path TEXT,start_line INTEGER,end_line INTEGER,embedding TEXT,model_name TEXT,' +
      'dimensions INTEGER,created_at TEXT,UNIQUE(chunk_id,provider,model_name));');
    db.prepare('INSERT INTO chunks VALUES(1,?,?,?,?,?,?,?)').run(
      'cogentia','public.md','hash_abc123',1,1,'public text',1);
    db.prepare('INSERT INTO embeddings(chunk_id,content_hash,provider,repo,path,start_line,end_line,' +
      'embedding,model_name,dimensions,created_at) VALUES(1,?,?,?,?,?,?,?,?,?,?)').run(
      'hash_abc123','openai','cogentia','public.md',1,1,'[0.2,0.8]',
      'text-embedding-3-small',2,'2026-11-17');
    let posts=0;
    const projection=createSqliteCloudflareEmbeddingProjection(db);
    const vault={async withSecret(r,fn) {
      return fn(r==='jhn-vault:cloudflare_api_key'?token:account);
    }};
    const descriptor=createCloudflareFreeEmbeddingProvider({
      vault,...projection,
      fetchImpl:async(url)=>{
        if(url.endsWith('/tokens/verify'))return new Response(JSON.stringify({
          success:true,result:{status:'active'}}));
        if(url.endsWith('/subscriptions'))return new Response(JSON.stringify({
          success:true,result:[]}));
        if(url.endsWith('/workers/account-settings'))return new Response(JSON.stringify({
          success:true,result:{default_usage_model:'bundled'}}));
        posts++;
        return new Response(JSON.stringify({success:true,result:{model:CF_EMBEDDING_MODEL,
          data:[{index:0,embedding:Array(768).fill(0.1)}]}}));
      },
    });
    let seq=0;
    const driver=createGovernedProviderSecretUse({
      vault,providers:{[CF_FREE_EMBEDDING_PROVIDER]:descriptor},
      authorize:async({provider,capability,credential_ref})=>({
        authorized:true,principal_ref:'principal:jhn',actor_ref:'agent:jhn',
        issuer_ref:'issuer:trusted',mandate_ref:'mandate:jhn:john-root',
        effect_authorization_id:'effect:test:'+ ++seq,
        budget_reservation_id:'budget:'+seq,max_billable_usd:'0',
        provider,capability,credential_ref,
        target:'node:fracta2',execution_mode:'normal',
      }),settle:async()=>{},
    });
    assert.equal((await driver.invoke(req)).ok,true);
    assert.equal(posts,1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM embeddings').get().n,2);
    assert.equal((await driver.invoke(req)).ok,true);
    assert.equal(posts,1,'second call reused local vector without API call');
    assert.equal(db.prepare('SELECT count(*) AS n FROM embeddings').get().n,2);
    assert.equal(db.prepare("SELECT embedding FROM embeddings WHERE provider='openai'").get().embedding,'[0.2,0.8]');
    db.exec("UPDATE chunks SET content_hash='new_hash_123' WHERE id=1");
    await assert.rejects(driver.invoke(req),e=>e.code==='PROVIDER_EXECUTION_FAILED');
    assert.equal(posts,1,'stale continuation never reaches Cloudflare');
  } finally {db.close()}
});


test('missing monetary zero reservation stops before Cloudflare account lookup',async()=>{
  const calls=[];
  const vault={async withSecret(ref,callback) {
    calls.push(ref);
    return callback(ref.endsWith('api_key') ? token : account);
  }};
  const descriptor=createCloudflareFreeEmbeddingProvider({
    vault,loadPublicChunks:async()=>chunks,persist:async()=>({ok:true}),
    fetchImpl:async()=>{throw Error('should never call provider');},
  });
  const result=await descriptor.invoke({
    secret:token,input:{chunk_refs:[ref]},grant:{
      effect_authorization_id:'effect:already-verified',
      budget_reservation_id:'reserve:already-verified',
      max_billable_usd:'0.001',
      capability:HOST_PROCESS_RUN_CAPABILITY,
      target:'node:fracta2',execution_mode:'normal',
    },
  });
  assert.equal(result.ok,false);
  assert.deepEqual(calls,[]);
});


test('generic host-process capability is reused; no embedding-specific capability is registered',()=>{
  assert.equal(HOST_PROCESS_RUN_CAPABILITY,'host.process.run');
  const f=fixture();
  assert.deepEqual(f.driver.available(),[{
    name:CF_FREE_EMBEDDING_PROVIDER,capability:'host.process.run',
    credential_ref:'jhn-vault:cloudflare_api_key',
  }]);
});
