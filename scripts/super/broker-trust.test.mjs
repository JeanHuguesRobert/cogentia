import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {trustedSuperStore} from './broker.mjs';
test('root broker refuses non-root ownership, group/world writable files and directories, symlinks',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cogentia-super-trust-'));
 const file=path.join(dir,'grants.json');
 try{
   fs.chmodSync(dir,0o700);fs.writeFileSync(file,'{}',{mode:0o600});
   const uid=fs.statSync(file).uid;
   assert.equal(trustedSuperStore(file,uid),true);
   assert.equal(trustedSuperStore(file,uid+1),false);
   fs.chmodSync(file,0o640);assert.equal(trustedSuperStore(file,uid),false);
   fs.chmodSync(file,0o600);fs.chmodSync(dir,0o770);assert.equal(trustedSuperStore(file,uid),false);
   fs.chmodSync(dir,0o700);fs.symlinkSync(file,path.join(dir,'link.json'));
   assert.equal(trustedSuperStore(path.join(dir,'link.json'),uid),false);
   assert.equal(trustedSuperStore(path.join(dir,'absent.json'),uid),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
