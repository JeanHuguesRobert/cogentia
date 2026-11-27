#!/usr/bin/env node
/** Prepare a small, version-pinned gateway artifact. Unprivileged, offline;
 * no deployment, no service restart, no use of a personal browser profile.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,mkdtemp,writeFile,readFile,rm,lstat,realpath} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repo=fileURLToPath(new URL('../../',import.meta.url));
function run(cmd,args,cwd=repo){
 const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
 if(r.status!==0)throw Error('release_command_failed:'+cmd);
 return r.stdout;
}
const digest=(algorithm,data,encoding='hex')=>createHash(algorithm).update(data).digest(encoding);
const [revision,output,...extra]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(revision||'')||!output||extra.length||process.getuid()===0){
 console.error('usage: node scripts/ops/prepare-navigation-gateway-release.js FULL_COMMIT PRIVATE_OUTPUT_DIRECTORY');
 process.exit(2);
}
let work;
try{
 const out=resolve(output),info=await lstat(out);
 if(!info.isDirectory()||info.uid!==process.getuid()||(info.mode&0o077)!==0||await realpath(out)!==out)
  throw Error('private_output_directory_required');
 const exact=run('git',['rev-parse',revision+'^{commit}']).trim();
 assert.equal(exact,revision);
 assert.equal(run('git',['merge-base','--is-ancestor',revision,'origin/main']),'');
 const lock=run('git',['show',revision+':pnpm-lock.yaml']);
 // Only accept a single exact ws package version in the selected Git lock.
 const matches=[...lock.matchAll(/^  ws@(\d+\.\d+\.\d+):\n    resolution: \{integrity: (sha512-[A-Za-z0-9+/=]+)\}/gm)];
 if(matches.length!==1)throw Error('ws_lock_pin_ambiguous');
 const [,version,integrity]=matches[0];
 work=await mkdtemp(join(out,'gateway-stage-'));
 const release=join(work,'release');
 await mkdir(join(release,'scripts','ops'),{recursive:true,mode:0o700});
 await mkdir(join(release,'node_modules','ws'),{recursive:true,mode:0o700});
 const source=run('git',['show',revision+':scripts/ops/navigation-assistant-gateway.js']);
 await writeFile(join(release,'scripts','ops','navigation-assistant-gateway.js'),source);
 const metadata=JSON.stringify({private:true,type:'module',dependencies:{ws:version}},null,2)+'\n';
 await writeFile(join(release,'package.json'),metadata);
 await writeFile(join(release,'REVISION'),revision+'\n');
 // No package install or lifecycle script. Verify cached npm tarball against
 // the committed pnpm integrity before extracting any of its contents.
 run('npm',['pack','--offline','--ignore-scripts','--pack-destination',work,'ws@'+version],work);
 const tar=join(work,'ws-'+version+'.tgz'),tarBytes=await readFile(tar);
 assert.equal('sha512-'+digest('sha512',tarBytes,'base64'),integrity,'ws tarball integrity');
 run('tar',['-xzf',tar,'--strip-components=1','-C',join(release,'node_modules','ws')],work);
 const manifest={schema:'cogentia.navigation-gateway-release/v1',revision,
  entry_sha256:digest('sha256',source),ws:{version,integrity},scope:'gateway-only',deployment:false};
 await writeFile(join(release,'RELEASE.json'),JSON.stringify(manifest,null,2)+'\n');
 run(process.execPath,['--check','scripts/ops/navigation-assistant-gateway.js'],release);
 const archive=join(out,'navigation-gateway-'+revision+'.tar.gz');
 // Refuse replacement of a prior artifact. tar is built under the private
 // temporary directory before publishing the new archive.
 const packed=join(work,'release.tar.gz');
 run('tar',['-czf',packed,'-C',release,'.'],work);
 const bytes=await readFile(packed);
 await writeFile(archive,bytes,{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({ok:true,archive,sha256:digest('sha256',bytes),...manifest}));
} catch(e){
 console.error(JSON.stringify({ok:false,reason:e.message}));process.exitCode=1;
} finally{if(work)await rm(work,{recursive:true,force:true})}
