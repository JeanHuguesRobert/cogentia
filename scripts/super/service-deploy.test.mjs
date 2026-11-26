import test from 'node:test';
import assert from 'node:assert/strict';
import {executeServiceDeploy,validateDeployRequest,validateOwnerPolicy,deploymentConfig,safeUnit,runtimeHardened,SERVICE} from './service-deploy.mjs';
import {handle} from './broker.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const dir=r=>'/srv/cogentia/releases/mcp-cogentia/'+r+'/cogentia';
const legacy=r=>deploymentConfig(r).split('NoNewPrivileges=')[0];
const request=(revision=b,id='deploy-0001')=>({op:'service.deploy',service:SERVICE,revision,request_id:id});
function fixture({allow=true,healthy=true,rollbackHealthy=true,prepared=true,oldHardened=false,unsafe=false,privilegedExec=false,revoke=false}={}){
  let revision=a,config=oldHardened?deploymentConfig(a):legacy(a),pid=123,locked=false,checks=0;
  const receipts=new Map(),calls=[];
  const inspect=()=>({User:unsafe?'root':'ubuntu',NoNewPrivileges:config.includes('NoNewPrivileges=yes')?'yes':'no',
    CapabilityBoundingSet:config.includes('CapabilityBoundingSet=')?'':'cap_sys_admin',
    AmbientCapabilities:'',WorkingDirectory:dir(revision),
    ExecStart:'{ path=/usr/local/bin/node ; argv[]=/usr/local/bin/node '+dir(revision)+'/scripts/cogentia-mcp-http.js ; ignore_errors=no ; }',
    ExecStartEx:'{ path=/usr/local/bin/node ; argv[]=/usr/local/bin/node '+dir(revision)+'/scripts/cogentia-mcp-http.js ; flags='+(privilegedExec?'privileged':'')+' ; start_time=[n/a] ; }',
    MainPID:String(pid),ActiveState:'active'});
  const adapter={
    authorized:()=>allow&&(!revoke||++checks<3),inspect,
    releaseValid:r=>r===a||(prepared&&r===b),
    readReceipt:id=>receipts.get(id)||null,
    saveReceipt:r=>{receipts.set(r.request_id,{...r});},
    lock:()=>{if(locked)return false;locked=true;return true;},
    unlock:()=>{locked=false;},
    readConfig:()=>config,
    writeConfig:c=>{calls.push('write');config=c;revision=/releases\/mcp-cogentia\/([a-f0-9]{40})/.exec(c)[1];},
    reload:()=>calls.push('reload'),
    restart:()=>{calls.push('restart');pid++;},
    verify:r=>{calls.push('verify:'+r);return r===b?healthy:rollbackHealthy;}
  };
  return {adapter,calls,inspect,locked:()=>locked,receipts};
}
test('owner policy is exact; untrusted request fields, shell and service denied',()=>{
  assert.equal(validateDeployRequest(request()),true);
  for(const x of [{service:'ssh.service'},{revision:'../../etc/passwd'},{revision:b+';id'},
    {command:'sudo id'},{actor:'agent:jhn'},{request_id:'../x'},{op:'run'}]){
    assert.equal(validateDeployRequest({...request(),...x}),false);
  }
  const policy={schema:'cogentia.service-deploy.owner-policy/v1',enabled:true,service:SERVICE,
    target:'node:fracta2',authority:'node-owner-local-role',socket_gid:1001};
  assert.equal(validateOwnerPolicy(policy,1001),true);
  assert.equal(validateOwnerPolicy({...policy,enabled:false},1001),false);
  assert.equal(validateOwnerPolicy(policy,1002),false);
});
test('default disabled; no effect without owner delegation',async()=>{
  const f=fixture({allow:false});
  assert.equal((await executeServiceDeploy(request(),f.adapter)).error,'owner_delegation_required');
  assert.deepEqual(f.calls,[]);
});
test('fixed deployment hardens service, verifies receipt and idempotent retry',async()=>{
  const f=fixture();
  const r=await executeServiceDeploy(request(),f.adapter);
  assert.equal(r.ok,true);
  assert.equal(r.previous_revision,a);
  assert.equal(r.state,'verified');
  assert.equal(safeUnit(f.inspect(),b,{hardened:true}),true);
  assert.deepEqual(f.calls,['write','reload','restart','verify:'+b]);
  const duplicate=await executeServiceDeploy(request(),f.adapter);
  assert.equal(duplicate.duplicate,true);
  assert.deepEqual(f.calls,['write','reload','restart','verify:'+b]);
  assert.equal((await executeServiceDeploy(request(a),f.adapter)).error,'deployment_request_id_conflict');
});
test('same hardened revision verifies without restart',async()=>{
  const f=fixture({oldHardened:true});
  const r=await executeServiceDeploy(request(a),f.adapter);
  assert.equal(r.ok,true);assert.equal(r.unchanged,true);assert.equal(r.executed,false);
  assert.deepEqual(f.calls,['verify:'+a]);
});
test('same legacy revision is hardened before any restart',async()=>{
  const f=fixture();
  const r=await executeServiceDeploy(request(a),f.adapter);
  assert.equal(r.ok,true);assert.equal(r.executed,true);
  assert.equal(safeUnit(f.inspect(),a,{hardened:true}),true);
});
test('unknown revision and root service rejected without effect',async()=>{
  for(const options of [{prepared:false},{unsafe:true},{privilegedExec:true}]){
    const f=fixture(options);
    assert.equal((await executeServiceDeploy(request(),f.adapter)).ok,false);
    assert.deepEqual(f.calls,[]);
  }
});
test('revocation before dispatch denies without effect',async()=>{
  const f=fixture({revoke:true});
  assert.equal((await executeServiceDeploy(request(),f.adapter)).error,'owner_delegation_required');
  assert.deepEqual(f.calls,[]);
});
test('failed health rolls back to prior revision, keeping non-escalation',async()=>{
  const f=fixture({healthy:false});
  const r=await executeServiceDeploy(request(),f.adapter);
  assert.equal(r.ok,false);assert.equal(r.state,'rolled_back');assert.equal(r.rollback_verified,true);
  assert.equal(safeUnit(f.inspect(),a,{hardened:true}),true);
  assert.equal(f.locked(),false);
});
test('rollback failure preserves lock for reconciliation; new request cannot dispatch',async()=>{
  const f=fixture({healthy:false,rollbackHealthy:false});
  const r=await executeServiceDeploy(request(),f.adapter);
  assert.equal(r.state,'attention_required');
  assert.equal(f.locked(),true);
  assert.equal((await executeServiceDeploy(request(a,'deploy-0002'),f.adapter)).error,'deployment_busy_or_reconciliation_required');
});
test('existing broker refuses deployment in unprivileged fixture; no authority created',async()=>{
  if(process.geteuid()!==0)assert.equal((await handle(request())).error,'protected_deploy_executor_required');
});

test('live process must retain the unprivileged UID and empty capability sets',()=>{
  const status='Uid:\t1001\t1001\t1001\t1001\nNoNewPrivs:\t1\nCapEff:\t0000000000000000\nCapBnd:\t0000000000000000';
  assert.equal(runtimeHardened(status,1001),true);
  assert.equal(runtimeHardened(status.replace('NoNewPrivs:\t1','NoNewPrivs:\t0'),1001),false);
  assert.equal(runtimeHardened(status.replace('1001','0'),1001),false);
  assert.equal(runtimeHardened(status.replace('CapBnd:\t0000000000000000','CapBnd:\t0000000000000001'),1001),false);
});
test('failed terminal receipt keeps the deployment lock for reconciliation',async()=>{
  const f=fixture({healthy:false});
  const save=f.adapter.saveReceipt;
  f.adapter.saveReceipt=r=>{if(r.state==='rolled_back')throw Error('receipt storage unavailable');save(r);};
  await assert.rejects(executeServiceDeploy(request(),f.adapter),/receipt storage unavailable/);
  assert.equal(f.locked(),true);
});

test('receipt committed just before lock acquisition is never executed again',async()=>{
  const f=fixture();
  const lock=f.adapter.lock;
  f.adapter.lock=id=>{
    const result=lock(id);
    f.receipts.set(id,{request_id:id,service:SERVICE,revision:b,state:'rolled_back',ok:false,executed:true});
    return result;
  };
  const result=await executeServiceDeploy(request(),f.adapter);
  assert.equal(result.duplicate,true);
  assert.equal(result.state,'rolled_back');
  assert.deepEqual(f.calls,[]);
  assert.equal(f.locked(),false);
});
