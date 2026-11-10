#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listRegisteredMcpApps,listRegisteredMcpAppTools,listRegisteredMcpAppResources,
 readRegisteredMcpAppResource,callRegisteredMcpAppTool } from './lib/cogentia-mcp-app-registry.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cogentia-mcp-app-registry-'));
try{
 assert.deepEqual(listRegisteredMcpApps({repoRoot:temp}),[]);
 const result=spawnSync(process.execPath,[path.join(here,'create-mcp-app.js'),'--name','calibration-sample','--title','Calibration Sample'],{cwd:temp,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const dir=path.join(temp,'mcp-apps/calibration-sample');
 assert.ok(fs.existsSync(path.join(dir,'client.js')));
 assert.ok(fs.readFileSync(path.join(dir,'client.js'),'utf8').includes('@modelcontextprotocol/ext-apps'));
 // Fixture simulates the artifact produced by the SDK bundler; separate build
 // and full iDual resource tests verify production HTML output.
 fs.writeFileSync(path.join(dir,'index.html'),'<html>fixture</html>');
 const opts={repoRoot:temp};
 assert.equal(listRegisteredMcpApps(opts).length,1,'new manifest discovered without restarting the process');
 const tools=listRegisteredMcpAppTools(opts);
 assert.equal(tools[0].name,'cogentia_calibration_sample');
 assert.deepEqual(tools[0]._meta.ui.visibility,['model','app']);
 assert.equal(listRegisteredMcpAppResources(opts)[0].uri,'ui://cogentia/calibration-sample-v1');
 assert.equal(readRegisteredMcpAppResource('ui://cogentia/calibration-sample-v1',opts).text,'<html>fixture</html>');
 const response=callRegisteredMcpAppTool('cogentia_calibration_sample',{},opts);
 assert.equal(response.physical_effect,false);
 assert.equal(response.hardware_dispatch,false);
 assert.throws(()=>callRegisteredMcpAppTool('cogentia_calibration_sample',{unexpected:true},opts),/Invalid/);
 const manifest=path.join(dir,'manifest.json');
 const data=JSON.parse(fs.readFileSync(manifest,'utf8'));
 data.html='../outside.html';
 fs.writeFileSync(manifest,JSON.stringify(data));
 assert.throws(()=>listRegisteredMcpApps(opts),/Invalid or conflicting/,'directory traversal blocked');
 console.log('MCP Apps dynamic registry: scaffold/discovery/resource/validation/effect boundary PASS');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
