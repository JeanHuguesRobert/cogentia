#!/usr/bin/env node
import {sendIssuerRequest} from './principal-issuer-client.mjs';
import {randomUUID} from 'node:crypto';
const [service,revision,request_id=randomUUID(),...extra]=process.argv.slice(2);
if(!['mcp-cogentia.service','operium-node-agent.service'].includes(service)||!revision||!/^[a-f0-9]{40}$/.test(revision)||!/^[a-zA-Z0-9_-]{8,100}$/.test(request_id)||extra.length){
  console.error('usage: node service-deploy-client.mjs SERVICE FULL_GIT_SHA [REQUEST_ID]');
  process.exitCode=2;
}else{
  console.error('DEPLOY_REQUEST_ID='+request_id);
  const request={op:'service.deploy',service,revision,request_id};
  const result=await sendIssuerRequest(request,{timeout_ms:145000});
  console.log(JSON.stringify({request_id,...result},null,2));
  if(!result.ok)process.exitCode=1;
}
