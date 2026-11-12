import test from 'node:test';
import assert from 'node:assert/strict';
import { WindowsSshProcessProvider } from './windows-ssh-process-provider.js';
import { createHostCapabilityRouter } from './host-capability-router.js';

const target = 'node:i7-thinkpad-jhr';
const args = {command:'[Console]::WriteLine("HELLO_FROM_WINDOWS")',target,timeout_ms:1000};

test('Windows SSH provider attests host before invoking encoded PowerShell, no raw IP',async()=>{
  const calls=[];
  const provider=new WindowsSshProcessProvider({execFile:async (file,argv)=>{
    calls.push({file,argv});
    if (argv.at(-1)==='hostname') return {stdout:'i7-thinkpad-jhr\r\n',stderr:''};
    return {stdout:'HELLO_FROM_WINDOWS\r\n',stderr:''};
  }});
  const out=await provider.invoke('host.process.run',args);
  assert.equal(out.ok,true);
  assert.deepEqual({host:out.identity.hostname,os:out.identity.os}, {host:'i7-thinkpad-jhr',os:'windows'});
  assert.equal(calls.length,2);
  assert.equal(calls[0].file,'ssh');
  assert.ok(calls[0].argv.includes('thinkpad'));
  assert.ok(calls[1].argv.at(-1).startsWith('powershell.exe -NoProfile -NonInteractive -EncodedCommand '));
  const encoded=calls[1].argv.at(-1).split(' ').at(-1);
  assert.equal(Buffer.from(encoded,'base64').toString('utf16le'),args.command);
});

test('Windows SSH provider refuses mismatched attested host without executing command',async()=>{
  let calls=0;
  const provider=new WindowsSshProcessProvider({execFile:async()=>{calls++; return {stdout:'fracta2\n'};}});
  await assert.rejects(provider.invoke('host.process.run',args),e=>e.error_class==='remote_host_mismatch');
  assert.equal(calls,1);
});

test('Windows SSH provider only accepts mapped target and normal execution',async()=>{
  let calls=0;
  const provider=new WindowsSshProcessProvider({execFile:async()=>{calls++;throw Error('should not run');}});
  await assert.rejects(provider.invoke('host.process.run',{...args,target:'node:other'}),e=>e.error_class==='target_provider_mismatch');
  await assert.rejects(provider.invoke('host.process.run',{...args,execution_mode:'super'}),e=>e.error_class==='privileged_executor_unavailable');
  assert.equal(calls,0);
});

test('router rejects unmapped Windows target before COP dispatch',async()=>{
  const router=createHostCapabilityRouter({providerName:'windows-ssh'});
  try {
    await assert.rejects(router.invoke('host.process.run',{command:args.command},{
      actor:'actor:test',mandate:'mandate:test',target:'node:other',provider:'windows-ssh',
    }),e=>e.error_class==='target_provider_mismatch');
  } finally {await router.stop();}
});
