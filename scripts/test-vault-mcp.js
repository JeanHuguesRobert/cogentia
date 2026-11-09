#!/usr/bin/env node
/** Ephemeral adapter test: no live Vault, secrets, or production daemon. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createMcpCore} from './lib/cogentia-mcp-core.js';
const calls=[];
const server=createServer((req,res)=>{
  calls.push({url:req.url,auth:req.headers.authorization || '',method:req.method});
  const url=new URL(req.url,'http://localhost');
  if(url.pathname !== '/api/cli/config/vault-catalog') {res.writeHead(404);res.end('{}');return;}
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({ok:true,schema:'cogentia.vault_catalog.v1',instance:'jhn',read_only:true,
    entries:[{key:'cloudflare_api_key',ref:'jhn-vault:cloudflare_api_key',is_secret:true,is_public:false}],
    count:1,has_more:false,authority:'none',values_exposed:false}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const admin=createMcpCore({COGENTIA_DAEMON_URL:base,COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'fixture-admin'});
  const listing=await admin.callTool('cogentia_vault_list',{prefix:'cloudflare_',limit:5});
  assert.equal(listing.count,1);
  assert.equal(listing.values_exposed,false);
  assert.equal(listing.entries[0].ref,'jhn-vault:cloudflare_api_key');
  const description=await admin.callTool('cogentia_vault_describe',{key:'cloudflare_api_key'});
  assert.equal(description.entries.length,1);
  assert.match(calls[0].url,/prefix=cloudflare_/);
  assert.match(calls[1].url,/key=cloudflare_api_key/);
  assert.equal(calls[0].auth,'Bearer fixture-admin');
  assert.equal(calls.length,2);
  const anonymous=createMcpCore({COGENTIA_DAEMON_URL:base,COGENTIA_MCP_VIEW:'public'});
  for(const name of ['cogentia_vault_list','cogentia_vault_describe']) {
    await assert.rejects(()=>anonymous.callTool(name,{key:'cloudflare_api_key'}),/tier_forbidden/);
  }
  assert.equal(calls.length,2,'unauthorized tools must not reach daemon');
  console.log('MCP Vault catalog: admin projection, scoped params and anonymous denial verified');
} finally {server.close();}
