/**
 * #338: narrow Cloudflare Workers Free implementation for the EXISTING
 * createGovernedProviderSecretUse adapter. No generic Vault retrieval, no
 * caller-supplied URL, token, text or provider. A COP-authorized effect
 * obtains a public chunk only through trusted indexed content lookup and
 * persists its vector before returning a redacted receipt.
 *
 * Composition must inject an independently verifying authorize/settle pair
 * into createGovernedProviderSecretUse. This factory is a descriptor, NOT an
 * authorization service or a separately deployed scheduler.
 */
import {storeEmbeddingsSafely} from './embedding-store-safety.js';

export const CF_FREE_EMBEDDING_PROVIDER = 'cloudflare_workers_free';
export const CF_PUBLIC_EMBEDDING_CAPABILITY = 'embedding.public.persist';
export const CF_EMBEDDING_MODEL = '@cf/google/embeddinggemma-2';
export const CF_EMBEDDING_DIMENSIONS = 768;
const API='https://api.cloudflare.com/client/v4';
const accountPattern=/^[a-f0-9]{32}$/i;
const safeChunkId=n=>Number.isSafeInteger(n)&&n>0;
const safeHash=h=>typeof h==='string'&&/^[a-zA-Z0-9:_-]{8,128}$/.test(h);
const refuse=()=>({ok:false});

export function createCloudflareFreeEmbeddingProvider({
  vault,loadPublicChunks,persist,fetchImpl=fetch
}={}) {
  if(typeof vault?.withSecret!=='function'||typeof loadPublicChunks!=='function'||
     typeof persist!=='function'||typeof fetchImpl!=='function')
    throw new TypeError('cloudflare_trusted_provider_dependencies_required');
  const descriptor = {
    credential_ref:'jhn-vault:cloudflare_api_key',
    capability:CF_PUBLIC_EMBEDDING_CAPABILITY,
    async invoke({secret,input,grant}) {
      if(typeof secret!=='string'||!secret.trim()||!grant?.effect_authorization_id||
         !grant?.budget_reservation_id||String(grant.max_billable_usd)!=='0'||
         !Array.isArray(input?.chunk_refs)||
         input.chunk_refs.length<1||input.chunk_refs.length>8||
         input.chunk_refs.some(ref=>!safeChunkId(ref?.chunk_id)||!safeHash(ref?.content_hash)))
        return refuse();
      const seen=new Set();
      for(const ref of input.chunk_refs) {
        if(seen.has(ref.chunk_id))return refuse();
        seen.add(ref.chunk_id);
      }
      // Source data comes exclusively from the local indexed public projection.
      const chunks=await loadPublicChunks(input.chunk_refs);
      if(!Array.isArray(chunks)||chunks.length!==input.chunk_refs.length)
        return refuse();
      let totalChars=0;
      for(let i=0;i<chunks.length;i++) {
        const expected=input.chunk_refs[i],chunk=chunks[i];
        if(chunk?.id!==expected.chunk_id||chunk.content_hash!==expected.content_hash||
           chunk.searchable_public!==1||typeof chunk.text!=='string'||
           chunk.text.length<1||chunk.text.length>7000) return refuse();
        totalChars+=chunk.text.length;
      }
      if(totalChars>24000)return refuse();
      const pending = chunks.filter(chunk=>chunk.existing_valid_embedding!==true);
      // Replays of valid same-hash vectors never contact Cloudflare.
      if(!pending.length)return {ok:true};
      // No credential material leaves the callback, process logs or result.
      return vault.withSecret('jhn-vault:cloudflare_account_id',async accountId=>{
        if(!accountPattern.test(accountId))return refuse();
        const headers={Authorization:`Bearer ${secret}`,Accept:'application/json'};
        async function get(path) {
          const response=await fetchImpl(API+path,{method:'GET',headers,
            redirect:'error',signal:AbortSignal.timeout(12000)});
          if(!response.ok)return {ok:false};
          const body=await response.json().catch(()=>null);
          return {ok:body?.success===true,result:body?.result};
        }
        const [token,subscriptions,settings]=await Promise.all([
          get(`/accounts/${accountId}/tokens/verify`),
          get(`/accounts/${accountId}/subscriptions`),
          get(`/accounts/${accountId}/workers/account-settings`),
        ]);
        // Every call rechecks the actual account token and paid subscription
        // absence; no env boolean, token presence or cached status suffices.
        if(!token.ok||token.result?.status!=='active'||!subscriptions.ok||
           !Array.isArray(subscriptions.result)||subscriptions.result.length!==0||
           !settings.ok||!settings.result)return refuse();
        const response=await fetchImpl(
          `${API}/accounts/${accountId}/ai/run/${CF_EMBEDDING_MODEL}`,{
            method:'POST',headers:{...headers,'Content-Type':'application/json'},
            redirect:'error',signal:AbortSignal.timeout(25000),
            body:JSON.stringify({input:pending.map(c=>`title: none | text: ${c.text}`)}),
          });
        if(!response.ok)return refuse();
        const body=await response.json().catch(()=>null);
        const data=body?.success===true&&body.result?.model===CF_EMBEDDING_MODEL
          ?body.result.data:null;
        if(!Array.isArray(data)||data.length!==pending.length)return refuse();
        const rows=[...data];
        if(rows.some(row=>Number.isInteger(row?.index))){
          if(!rows.every(row=>Number.isSafeInteger(row?.index)&&
              row.index>=0&&row.index<rows.length))return refuse();
          rows.sort((a,b)=>a.index-b.index);
          if(!rows.every((row,i)=>row.index===i))return refuse();
        }
        if(!rows.every(row=>Array.isArray(row.embedding)&&
            row.embedding.length===CF_EMBEDDING_DIMENSIONS&&
            row.embedding.every(n=>typeof n==='number'&&Number.isFinite(n))))
          return refuse();
        // Required: trusted callback uses storeEmbeddingsSafely and commits
        // all values atomically. If it fails, the generic governed adapter
        // settles a failed/uncertain effect, never reports success.
        const result=await persist(pending.map((chunk,i)=>({
          chunk_id:chunk.id,content_hash:chunk.content_hash,
          provider:'cloudflare',model_name:CF_EMBEDDING_MODEL,
          dimensions:CF_EMBEDDING_DIMENSIONS,embedding:rows[i].embedding,
          embedding_policy_version:'cloudflare-gemma2-public-search-v1',
        })),{grant});
        // A stale/partial/unknown DB acknowledgment is NOT success: replay
        // from the durable projection must decide what remains to be done.
        return {ok:result?.ok===true && result.stale===0 &&
          Number(result.stored||0)+Number(result.reused||0)===pending.length};
      });
    },
  };
  return Object.freeze(descriptor);
}

/** Bind to the existing SQLite index; current source hashes are checkpoints. */
export function createSqliteCloudflareEmbeddingProjection(db) {
  if(typeof db?.prepare!=='function')throw new TypeError('sqlite_index_required');
  const chunk=db.prepare('SELECT id,content_hash,text,searchable_public FROM chunks WHERE id = ?');
  const existing=db.prepare(`SELECT 1 AS present FROM embeddings
    WHERE chunk_id = ? AND content_hash = ? AND provider = 'cloudflare'
      AND model_name = ? AND dimensions = ? LIMIT 1`);
  return Object.freeze({
    async loadPublicChunks(refs) {
      return refs.map(ref=>{
        const row=chunk.get(ref.chunk_id);
        return row ? {...row,existing_valid_embedding:Boolean(
          existing.get(row.id,row.content_hash,CF_EMBEDDING_MODEL,CF_EMBEDDING_DIMENSIONS))}:null;
      });
    },
    async persist(rows) {
      return {ok:true,...storeEmbeddingsSafely(db,rows)};
    },
  });
}
