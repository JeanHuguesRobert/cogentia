/**
 * Resolver capability registry and legacy scoped PacketClaim adapter.
 * SQLite-local and independent from COP deployment. No JSON runtime state.
 * Admission remains the caller's duty; registration is NOT authority.
 */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {continuationDatabasePath} from './continuation-sqlite-repository.mjs';

function validId(value){
  if(typeof value!=='string'||!/^[a-zA-Z0-9_.:-]{1,200}$/.test(value))
    throw new Error('invalid_resolver_or_continuation_id');
  return value;
}
function connect(root){
  const db=new DatabaseSync(continuationDatabasePath(root));
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS resolver_registry(
      resolver_id TEXT PRIMARY KEY, capabilities_json TEXT NOT NULL,
      registered_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS resolver_claims(
      continuation_id TEXT PRIMARY KEY, resolver_id TEXT NOT NULL,
      claimed_at TEXT NOT NULL);`);
  return db;
}
function within(root,fn){
  const db=connect(root);
  try{return fn(db)}finally{db.close()}
}
function decodeResolver(row){
  return row?{resolver_id:row.resolver_id,
    capabilities:JSON.parse(row.capabilities_json),registered_at:row.registered_at}:null;
}
function decodeClaim(row){
  return row?{continuation_id:row.continuation_id,
    resolver_id:row.resolver_id,claimed_at:row.claimed_at}:null;
}
export function registerResolver(root,resolverId,capabilities){
  validId(resolverId);
  if(!Array.isArray(capabilities)||capabilities.some(c=>typeof c!=='string'||!c.trim()))
    throw new Error('registerResolver requires an array of capability strings');
  const record={resolver_id:resolverId,capabilities,
    registered_at:new Date().toISOString()};
  within(root,db=>db.prepare(`INSERT INTO resolver_registry(resolver_id,capabilities_json,registered_at)
    VALUES(?,?,?) ON CONFLICT(resolver_id) DO UPDATE SET
    capabilities_json=excluded.capabilities_json,registered_at=excluded.registered_at`)
    .run(resolverId,JSON.stringify(capabilities),record.registered_at));
  return record;
}
export function deregisterResolver(root,resolverId){
  validId(resolverId);
  within(root,db=>db.prepare('DELETE FROM resolver_registry WHERE resolver_id=?').run(resolverId));
}
export function listResolvers(root){
  return within(root,db=>db.prepare('SELECT * FROM resolver_registry ORDER BY resolver_id').all()
    .map(decodeResolver));
}

/**
 * Resolvers whose declared capabilities include the required one.
 * required_capability of "" or undefined matches every resolver (no
 * specific capability was asked for).
 */
export function findCapableResolvers(cogentiaRoot, requiredCapability) {
  const all = listResolvers(cogentiaRoot);
  if (!requiredCapability) return all;
  return all.filter((r) => Array.isArray(r.capabilities) && r.capabilities.includes(requiredCapability));
}

/**
 * Find resolvers that declare ALL requested capabilities (AND semantics).
 *
 * This is eligibility by declaration only, not authorization or liveness.
 * Fail closed on malformed requirements; callers must separately verify
 * freshness, mandate and the scope of every consequential effect.
 */
export function findCapableResolversForAll(cogentiaRoot, requiredCapabilities) {
  if (!Array.isArray(requiredCapabilities) ||
      requiredCapabilities.some((c) => typeof c !== "string" || !c.trim())) {
    throw new TypeError("requiredCapabilities must be an array of nonempty strings");
  }
  const required = [...new Set(requiredCapabilities.map((c) => c.trim()))];
  return listResolvers(cogentiaRoot).filter((resolver) =>
    Array.isArray(resolver.capabilities) &&
    required.every((capability) => resolver.capabilities.includes(capability))
  );
}


export function claimContinuation(root,continuationId,resolverId){
  validId(continuationId);validId(resolverId);
  return within(root,db=>{
    db.exec('BEGIN IMMEDIATE');
    try{
      const now=new Date().toISOString();
      const inserted=db.prepare('INSERT OR IGNORE INTO resolver_claims(continuation_id,resolver_id,claimed_at) VALUES(?,?,?)')
        .run(continuationId,resolverId,now);
      const row=decodeClaim(db.prepare('SELECT * FROM resolver_claims WHERE continuation_id=?').get(continuationId));
      db.exec('COMMIT');
      return inserted.changes===1?{claimed:true,claim:row}:{claimed:false,existingClaim:row};
    }catch(error){db.exec('ROLLBACK');throw error}
  });
}
export function getClaim(root,continuationId){
  validId(continuationId);
  return within(root,db=>decodeClaim(db.prepare('SELECT * FROM resolver_claims WHERE continuation_id=?')
    .get(continuationId)));
}
export function releaseClaim(root,continuationId){
  validId(continuationId);
  within(root,db=>db.prepare('DELETE FROM resolver_claims WHERE continuation_id=?').run(continuationId));
}

/** Explicit one-time import of historical resolver JSON (read-only originals).
 * A changed/contradictory claim is surfaced, never overwritten.
 */
export function importLegacyResolverJson(root,{apply=false}={}){
  const dir=join(root,'.cogentia','resolvers');
  const claimDir=join(dir,'claims');
  const result={apply,resolvers:0,claims:0,imported:0,already_present:0,
    conflicts:[],invalid:[]};
  const files=folder=>existsSync(folder)?readdirSync(folder).filter(n=>n.endsWith('.json')).sort():[];
  const resolverFiles=files(dir),claimFiles=files(claimDir);
  result.resolvers=resolverFiles.length;result.claims=claimFiles.length;
  for(const [folder,list,kind] of [[dir,resolverFiles,'resolver'],[claimDir,claimFiles,'claim']]){
    for(const name of list){
      try{
        const doc=JSON.parse(readFileSync(join(folder,name),'utf8'));
        if(kind==='resolver'){
          validId(doc.resolver_id);
          if(!Array.isArray(doc.capabilities))throw Error('invalid_capabilities');
        }else{validId(doc.continuation_id);validId(doc.resolver_id)}
        if(!apply)continue;
        within(root,db=>{
          if(kind==='resolver'){
            const existing=db.prepare('SELECT * FROM resolver_registry WHERE resolver_id=?').get(doc.resolver_id);
            if(existing){
              if(JSON.stringify(JSON.parse(existing.capabilities_json))!==JSON.stringify(doc.capabilities))
                result.conflicts.push({kind,file:name,id:doc.resolver_id});
              else result.already_present++;
            }else{
              db.prepare('INSERT INTO resolver_registry(resolver_id,capabilities_json,registered_at) VALUES(?,?,?)')
                .run(doc.resolver_id,JSON.stringify(doc.capabilities),doc.registered_at||new Date().toISOString());
              result.imported++;
            }
          }else{
            const existing=db.prepare('SELECT * FROM resolver_claims WHERE continuation_id=?').get(doc.continuation_id);
            if(existing){
              if(existing.resolver_id!==doc.resolver_id)
                result.conflicts.push({kind,file:name,id:doc.continuation_id});
              else result.already_present++;
            }else{
              db.prepare('INSERT INTO resolver_claims(continuation_id,resolver_id,claimed_at) VALUES(?,?,?)')
                .run(doc.continuation_id,doc.resolver_id,doc.claimed_at||new Date().toISOString());
              result.imported++;
            }
          }
        });
      }catch(e){result.invalid.push({kind,file:name,error:String(e.message)})}
    }
  }
  result.ok=result.conflicts.length===0&&result.invalid.length===0;
  return result;
}

/**
 * Explicitly admitted resolver claim. No execution or continuation resolution.
 * Caller-supplied gates must establish fresh availability and inherited mandate;
 * a registry entry by itself is never authority. A stale claim is not stolen.
 */
export function claimAdmissibleResolver(cogentiaRoot, continuationId, requiredCapabilities, {
  isAvailable,
  isAuthorized,
} = {}) {
  if (typeof isAvailable !== "function" || typeof isAuthorized !== "function") {
    return { claimed: false, reason: "missing_admission_checks" };
  }
  const candidates = findCapableResolversForAll(cogentiaRoot, requiredCapabilities);
  if (!candidates.length) return { claimed: false, reason: "no_capable_resolver_available" };
  for (const candidate of candidates) {
    if (isAvailable(candidate) !== true || isAuthorized(candidate, continuationId) !== true) continue;
    const result = claimContinuation(cogentiaRoot, continuationId, candidate.resolver_id);
    if (result.claimed) return { ...result, resolver: candidate };
    return { claimed: false, reason: "already_claimed", existingClaim: result.existingClaim };
  }
  return { claimed: false, reason: "no_admissible_resolver" };
}

