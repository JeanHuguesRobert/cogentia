/** Fixed-function owner-delegated deployment. Never interpret client shell,
 * accept client paths or change the execution identity of the service. */
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

export const SERVICE='mcp-cogentia.service';
export const ONA_SERVICE='operium-node-agent.service';
// Fixed, code-reviewed descriptors. A request selects a service, never supplies
// an executable, config path, health URL, Unix identity or privilege policy.
const descriptors=Object.freeze({
  [SERVICE]:Object.freeze({
    base:'/srv/cogentia/releases/mcp-cogentia',repo:'cogentia',
    drop:'/etc/systemd/system/mcp-cogentia.service.d/zz-release-330.conf',
    policy:'/var/lib/cogentia-super/service-deploy-policy.json',
    entry:'scripts/cogentia-mcp-http.js',health:'http://127.0.0.1:8791/health',
    healthy:body=>body?.ok===true&&body?.mcp==='cogentia-mcp',requireHardenedBaseline:false}),
  [ONA_SERVICE]:Object.freeze({
    base:'/srv/cogentia/releases/operium-node-agent',repo:'operium',
    drop:'/etc/systemd/system/operium-node-agent.service.d/zz-release.conf',
    policy:'/var/lib/cogentia-super/service-deploy-ona-policy.json',
    entry:'bin/operium-node-agent.js',health:'http://127.0.0.1:8794/health',
    healthy:body=>body?.ok===true&&body?.service==='operium-node-agent'&&body?.node_id==='resource://fracta2',
    secondaryHealth:'http://127.0.0.1:8765/health',secondaryHealthy:body=>body?.ok===true&&body?.instance==='fracta2',
    requireHardenedBaseline:true})
});
export function serviceDescriptor(service){return typeof service==='string'&&Object.hasOwn(descriptors,service)?descriptors[service]:null;}
const RECEIPTS='/var/lib/cogentia-super/service-deploy-receipts';
const NODE='/usr/local/bin/node';
const SOCKET='/run/cogentia-super/broker.sock';
const SHA=/^[0-9a-f]{40}$/;
const ID=/^[a-zA-Z0-9_-]{8,100}$/;
const hooks=['ExecCondition','ExecStartPre','ExecStartPost','ExecReload','ExecStop','ExecStopPost'];
const properties=['User','Group','SupplementaryGroups','NoNewPrivileges','CapabilityBoundingSet','AmbientCapabilities','WorkingDirectory','ExecStart','ExecStartEx','MainPID','ActiveState',...hooks,...hooks.map(k=>k+'Ex')];
const fail=error=>({ok:false,error,executed:false});
const cwd=(revision,d)=>d.base+'/'+revision+'/'+d.repo;
const legacyConfig=(revision,d)=>'[Service]\nWorkingDirectory='+cwd(revision,d)+'\nExecStart=\nExecStart='+NODE+' '+cwd(revision,d)+'/'+d.entry+'\n';
export const deploymentConfig=(revision,service=SERVICE)=>legacyConfig(revision,serviceDescriptor(service))+'NoNewPrivileges=yes\nCapabilityBoundingSet=\nAmbientCapabilities=\n';

export function validateDeployRequest(r){
  if(!r||typeof r!=='object'||Array.isArray(r)||r.op!=='service.deploy'||
     Object.keys(r).some(k=>!['op','service','revision','request_id'].includes(k))||
     !serviceDescriptor(r.service)||typeof r.revision!=='string'||!SHA.test(r.revision)||
     typeof r.request_id!=='string'||!ID.test(r.request_id))return false;
  return true;
}
export function validateOwnerPolicy(p,gid,service=SERVICE){
  return p?.schema==='cogentia.service-deploy.owner-policy/v1'&&p.enabled===true&&
    p.service===service&&Boolean(serviceDescriptor(service))&&p.target==='node:fracta2'&&p.authority==='node-owner-local-role'&&
    Number.isSafeInteger(gid)&&gid>0&&p.socket_gid===gid;
}
function revisionOf(dir,d){
  if(typeof dir!=='string'||!dir.startsWith(d.base+'/')||!dir.endsWith('/'+d.repo))return null;
  const r=dir.slice(d.base.length+1,-('/'+d.repo).length);
  return SHA.test(r)?r:null;
}
export function safeUnit(state,revision,{hardened=false,service=SERVICE}={}){
  const d=serviceDescriptor(service);if(!d)return false;
  return (!hardened||(state?.NoNewPrivileges==='yes'&&state.CapabilityBoundingSet===''))&& state?.User==='ubuntu'&&(!state.Group||state.Group==='ubuntu')&&!state.SupplementaryGroups&&state.AmbientCapabilities===''&&
    hooks.every(k=>!state[k]&&!state[k+'Ex'])&&state.WorkingDirectory===cwd(revision,d)&&
    typeof state.ExecStart==='string'&&
    state.ExecStart.startsWith('{ path='+NODE+' ; argv[]='+NODE+' '+cwd(revision,d)+'/'+d.entry+' ; ')&&
    !state.ExecStart.includes(' ; {')&&typeof state.ExecStartEx==='string'&&
    state.ExecStartEx.startsWith('{ path='+NODE+' ; argv[]='+NODE+' '+cwd(revision,d)+'/'+d.entry+' ; flags= ; ')&&
    !state.ExecStartEx.includes(' ; {');
}

export function runtimeHardened(status,uid){
  if(!Number.isSafeInteger(uid)||uid<=0)return false;
  const fields=Object.fromEntries(String(status).split('\n').filter(l=>l.includes(':')).map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+1).trim()]));
  return Boolean(fields.Uid?.split(/\s+/).length===4&&fields.Uid.split(/\s+/).every(v=>v===String(uid))&&
    fields.NoNewPrivs==='1'&&/^0+$/.test(fields.CapEff||'')&&/^0+$/.test(fields.CapBnd||''));
}

export async function executeServiceDeploy(r,a){
  if(!validateDeployRequest(r))return fail('invalid_deployment_request');
  const service=r.service,d=serviceDescriptor(service);
  if(!await a.authorized())return fail('owner_delegation_required');
  const prior=await a.readReceipt(r.request_id);
  if(prior)return prior.revision===r.revision&&prior.service===r.service
    ? {...prior,duplicate:true}:fail('deployment_request_id_conflict');
  if(!await a.lock(r.request_id))return fail('deployment_busy_or_reconciliation_required');
  let receipt={schema:'cogentia.service-deploy.receipt/v1',request_id:r.request_id,service,
    revision:r.revision,authority:'node-owner-local-role',at:new Date().toISOString(),
    authority_scope:'local-broker-socket-role',state:'prepared',ok:false,executed:false};
  let saved=null,previous=null,changed=false,retainLock=false;
  try{
    if(!await a.authorized())return fail('owner_delegation_required');
    // Recheck after acquiring the lock: a concurrent caller may have committed
    // a receipt between our initial lookup and lock acquisition.
    const committed=await a.readReceipt(r.request_id);
    if(committed)return committed.revision===r.revision&&committed.service===r.service
      ? {...committed,duplicate:true}:fail('deployment_request_id_conflict');
    const before=await a.inspect();
    previous=revisionOf(before.WorkingDirectory,d);
    if(!previous||!safeUnit(before,previous,{service,hardened:d.requireHardenedBaseline}))return fail('unexpected_service_configuration');
    if(!await a.releaseValid(previous)||!await a.releaseValid(r.revision))return fail('release_not_prepared');
    saved=await a.readConfig();
    if(saved!==deploymentConfig(previous,service)&&(d.requireHardenedBaseline||saved!==legacyConfig(previous,d)))return fail('unexpected_release_dropin');
    receipt={...receipt,previous_revision:previous,previous_pid:before.MainPID};
    await a.saveReceipt(receipt);
    if(previous===r.revision&&saved===deploymentConfig(previous,service)&&safeUnit(before,previous,{hardened:true,service})){
      const verified=await a.verify(r.revision);
      receipt={...receipt,state:verified?'verified':'attention_required',ok:verified,unchanged:true};
      await a.saveReceipt(receipt);
      return receipt;
    }
    if(!await a.authorized()){
      receipt={...receipt,state:'denied',error:'owner_delegation_required'};
      await a.saveReceipt(receipt);return receipt;
    }
    receipt={...receipt,state:'executing',executed:true};
    await a.saveReceipt(receipt);
    changed=true;
    await a.writeConfig(deploymentConfig(r.revision,service));
    await a.reload();
    if(!safeUnit(await a.inspect(),r.revision,{hardened:true,service}))throw Error('new_configuration_not_effective');
    await a.restart();
    if(!await a.verify(r.revision))throw Error('new_release_health_failed');
    receipt={...receipt,state:'verified',ok:true,new_pid:(await a.inspect()).MainPID};
    await a.saveReceipt(receipt);
    return receipt;
  }catch(error){
    receipt={...receipt,error:['new_configuration_not_effective','new_release_health_failed'].includes(error.message)?error.message:'deployment_failed'};
    if(changed){
      try{
        await a.writeConfig(deploymentConfig(previous,service));await a.reload();
        if(!safeUnit(await a.inspect(),previous,{hardened:true,service}))throw Error('rollback_configuration_not_effective');
        await a.restart();
        if(!await a.verify(previous))throw Error('rollback_health_failed');
        receipt={...receipt,state:'rolled_back',rollback_verified:true};
      }catch{retainLock=true;receipt={...receipt,state:'attention_required',rollback_verified:false};}
    }else receipt={...receipt,state:'failed_before_change'};
    try{await a.saveReceipt(receipt);}catch(e){if(changed)retainLock=true;throw e;}
    return receipt;
  }finally{if(!retainLock)await a.unlock(r.request_id);}
}

function protectedFile(file){
  try{
    const s=fs.lstatSync(file),p=fs.lstatSync(path.dirname(file));
    return s.isFile()&&s.uid===0&&(s.mode&0o022)===0&&p.isDirectory()&&p.uid===0&&(p.mode&0o022)===0;
  }catch{return false;}
}
function protectedDir(dir){
  try{const s=fs.lstatSync(dir);return s.isDirectory()&&s.uid===0&&(s.mode&0o077)===0;}
  catch{return false;}
}
function atomic(file,text,mode=0o600){
  const temp=file+'.'+process.pid+'.tmp';
  const fd=fs.openSync(temp,'wx',mode);
  try{
    try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(temp,file);
    const dir=fs.openSync(path.dirname(file),'r');
    try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
  }finally{try{fs.unlinkSync(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
const runFile=promisify(execFile);
const systemctl=async (...args)=>(await runFile('/usr/bin/systemctl',args,{encoding:'utf8',timeout:45000,maxBuffer:65536})).stdout;
async function inspect(service){
  const output=await systemctl('show',service,'--all',...properties.flatMap(k=>['-p',k]));
  return Object.fromEntries(output.trim().split('\n').map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
}
export function releaseValid(revision,d){
  if(!SHA.test(revision))return false;
  try{
    const directory=cwd(revision,d);
    // Source is agent-owned, and is ONLY executed under the existing ubuntu
    // service identity. Root never imports it or executes Git in that tree.
    if(fs.realpathSync(directory)!==directory||fs.realpathSync(directory+'/'+d.entry)!==directory+'/'+d.entry)return false;
    const fd=fs.openSync(directory+'/REVISION',fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    try{
      const s=fs.fstatSync(fd);
      if(!s.isFile()||s.size!==41)return false;
      const b=Buffer.alloc(41);return fs.readSync(fd,b,0,41,0)===41&&b.toString()===revision+'\n';
    }finally{fs.closeSync(fd);}
  }catch{return false;}
}
function authorized(d,service){
  try{
    if(!protectedFile(d.policy))return false;
    const socket=fs.lstatSync(SOCKET);
    const parent=fs.lstatSync(path.dirname(SOCKET));
    if(!socket.isSocket()||socket.uid!==0||(socket.mode&0o777)!==0o660||
       !parent.isDirectory()||parent.uid!==0||parent.gid!==socket.gid||(parent.mode&0o777)!==0o750)return false;
    const p=JSON.parse(fs.readFileSync(d.policy,'utf8'));
    return validateOwnerPolicy(p,socket.gid,service);
  }catch{return false;}
}
export async function deployFromProtectedBroker(r){
  if(process.geteuid?.()!==0||!protectedFile(fileURLToPath(import.meta.url)))return fail('protected_deploy_executor_required');
  if(!validateDeployRequest(r))return fail('invalid_deployment_request');
  const service=r.service,d=serviceDescriptor(service);
  if(!authorized(d,service))return fail('owner_delegation_required');
  if(!protectedDir(RECEIPTS)||!protectedFile(d.drop))return fail('protected_deployment_state_required');
  const {stdout:uidText}=await runFile('/usr/bin/id',['-u','ubuntu'],{encoding:'utf8',timeout:2000});
  const uid=Number(uidText.trim());
  if(!Number.isSafeInteger(uid)||uid<=0)return fail('service_identity_unavailable');
  const receiptPath=id=>path.join(RECEIPTS,id+'.json');
  const lock=path.join(RECEIPTS,'active.lock');
  return executeServiceDeploy(r,{
    authorized:()=>authorized(d,service),inspect:()=>inspect(service),releaseValid:revision=>releaseValid(revision,d),
    readConfig:()=>fs.readFileSync(d.drop,'utf8'),
    writeConfig:content=>atomic(d.drop,content,0o644),
    reload:()=>systemctl('daemon-reload'),restart:()=>systemctl('restart',service),
    async verify(revision){
      for(let i=0;i<20;i++){
        try{
          const state=await inspect(service);
          if(safeUnit(state,revision,{hardened:true,service})&&state.ActiveState==='active'&&Number(state.MainPID)>0&&
             fs.realpathSync('/proc/'+state.MainPID+'/cwd')===cwd(revision,d)&&
             runtimeHardened(fs.readFileSync('/proc/'+state.MainPID+'/status','utf8'),uid)){
            const response=await fetch(d.health,{redirect:'error',signal:AbortSignal.timeout(1500)});
            const body=await response.json();
            if(response.ok&&d.healthy(body)){
              if(!d.secondaryHealth)return true;
              const secondary=await fetch(d.secondaryHealth,{redirect:'error',signal:AbortSignal.timeout(1500)});
              if(secondary.ok&&d.secondaryHealthy(await secondary.json()))return true;
            }
          }
        }catch{}
        await delay(500);
      }
      return false;
    },
    readReceipt:id=>{try{return JSON.parse(fs.readFileSync(receiptPath(id),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},
    saveReceipt:receipt=>atomic(receiptPath(receipt.request_id),JSON.stringify(receipt,null,2)+'\n'),
    lock:id=>{
      try{
        const fd=fs.openSync(lock,'wx',0o600);
        try{fs.writeFileSync(fd,id+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
        const dir=fs.openSync(RECEIPTS,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
        return true;
      }catch(e){if(e.code==='EEXIST')return false;throw e;}
    },
    unlock:id=>{if(fs.readFileSync(lock,'utf8')===id+'\n')fs.unlinkSync(lock);}
  });
}
