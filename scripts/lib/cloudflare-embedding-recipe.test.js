import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {runCloudflareEmbeddingBatch,createSqliteCloudflareEmbeddingProjection,CF_EMBEDDING_MODEL} from './cloudflare-governed-embedding-provider.js';
const ref={chunk_id:1,content_hash:'hash_public_123'};
const recipeUrl=new URL('./cloudflare-governed-embedding-provider.js',import.meta.url).href;
test('committed batch survives process exit, replay avoids Vault and inference',()=>{
 const dir=mkdtempSync(join(tmpdir(),'embedding-replay-'));const path=join(dir,'fixture.sqlite');
 try{
  const db=new DatabaseSync(path);
  db.exec('CREATE TABLE chunks(id INTEGER PRIMARY KEY,repo TEXT,path TEXT,content_hash TEXT,start_line INTEGER,end_line INTEGER,text TEXT,searchable_public INTEGER); CREATE TABLE embeddings(id INTEGER PRIMARY KEY,chunk_id INTEGER,content_hash TEXT,provider TEXT,repo TEXT,path TEXT,start_line INTEGER,end_line INTEGER,embedding TEXT,model_name TEXT,dimensions INTEGER,created_at TEXT,UNIQUE(chunk_id,provider,model_name));');
  db.prepare('INSERT INTO chunks VALUES(1,?,?,?,?,?,?,1)').run('fixture','public.txt',ref.content_hash,1,1,'public fixture');
  db.prepare('INSERT INTO embeddings(chunk_id,content_hash,provider,repo,path,start_line,end_line,embedding,model_name,dimensions,created_at) VALUES(1,?,?,?,?,?,?,?,?,?,?)').run(ref.content_hash,'openai','fixture','public.txt',1,1,'[0.1,0.2]','fixture-openai',2,'fixture');db.close();
  const childCode=`import {DatabaseSync} from 'node:sqlite';import {runCloudflareEmbeddingBatch,createSqliteCloudflareEmbeddingProjection,CF_EMBEDDING_MODEL} from ${JSON.stringify(recipeUrl)};
  const db=new DatabaseSync(process.argv[1]);let posts=0,leases=0;
  const result=await runCloudflareEmbeddingBatch({...createSqliteCloudflareEmbeddingProjection(db),chunkRefs:${JSON.stringify([ref])},vault:{async withSecret(r,fn){leases++;return fn(r.endsWith('api_key')?'fixture-token':'0123456789abcdef0123456789abcdef')}},fetchImpl:async(url)=>{let result;if(url.endsWith('/tokens/verify'))result={status:'active'};else if(url.endsWith('/subscriptions'))result=[];else if(url.endsWith('/workers/account-settings'))result={configured:true};else {posts++;result={model:CF_EMBEDDING_MODEL,data:[{index:0,embedding:Array(768).fill(.2)}],usage:{prompt_tokens:3,neurons:.01,private:'ignored'}};}return new Response(JSON.stringify({success:true,result}));}});db.close();console.log(JSON.stringify({result,posts,leases}));`;
  const run=()=>{const c=spawnSync(process.execPath,['--input-type=module','-e',childCode,path],{encoding:'utf8'});assert.equal(c.status,0,c.stderr);return JSON.parse(c.stdout);};
  const first=run(),second=run();assert.equal(first.result.ok,true);assert.equal(first.result.stored,1);assert.equal(first.posts,1);assert.deepEqual(first.result.usage,{prompt_tokens:3,neurons:.01});assert.equal(second.result.reused,1);assert.equal(second.posts,0);assert.equal(second.leases,0);
  const after=new DatabaseSync(path);assert.equal(after.prepare('SELECT count(*) AS n FROM embeddings').get().n,2);assert.equal(after.prepare("SELECT embedding FROM embeddings WHERE provider='openai'").get().embedding,'[0.1,0.2]');after.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('private or obsolete references are refused before Vault access',async()=>{
 for(const row of [{id:1,content_hash:ref.content_hash,searchable_public:0,text:'private'},{id:1,content_hash:'changed_hash',searchable_public:1,text:'changed'}]){
 const result=await runCloudflareEmbeddingBatch({chunkRefs:[ref],loadPublicChunks:async()=>[row],persist:()=>assert.fail('persist'),vault:{withSecret:()=>assert.fail('vault')},fetchImpl:()=>assert.fail('network')});assert.equal(result.ok,false);
 }
});

test('legacy or different policy is refused before Vault even on same hash',async()=>{
 const db=new DatabaseSync(':memory:');
 try {
 db.exec('CREATE TABLE chunks(id INTEGER PRIMARY KEY,content_hash TEXT,text TEXT,searchable_public INTEGER); CREATE TABLE embeddings(chunk_id INTEGER,content_hash TEXT,provider TEXT,model_name TEXT,dimensions INTEGER);');
 db.prepare('INSERT INTO chunks VALUES(1,?,?,1)').run(ref.content_hash,'public fixture');
 db.prepare('INSERT INTO embeddings VALUES(1,?,?,?,768)').run(ref.content_hash,'cloudflare',CF_EMBEDDING_MODEL);
 const projection=createSqliteCloudflareEmbeddingProjection(db);
 const invoke=()=>runCloudflareEmbeddingBatch({...projection,chunkRefs:[ref],vault:{withSecret:()=>assert.fail('vault')},fetchImpl:()=>assert.fail('network')});
 assert.equal((await invoke()).ok,false);
 db.exec("ALTER TABLE embeddings ADD COLUMN policy TEXT; UPDATE embeddings SET policy='other-policy'");
 assert.equal((await invoke()).ok,false);
 }finally{db.close();}
});
