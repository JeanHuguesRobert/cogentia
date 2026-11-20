import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeServer} from '../server.mjs';
const chrome=['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
test('first-time visitor understands the three actions, then follows an initiative', {skip:!chrome,timeout:90000}, async()=>{
  const dir=mkdtempSync(join(tmpdir(),'3code-visitor-'));
  const server=makeServer({dbPath:join(dir,'data.sqlite')});
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+server.address().port;
    const api=async(path,body,token)=>{
      const res=await fetch(origin+'/3code/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-management-token':token}:{})},body:JSON.stringify(body)});
      assert.ok(res.ok,'POST '+path+' returned '+res.status);
      return res.json();
    };
    const open=path=>new Promise((resolve,reject)=>{
      const proc=spawn(chrome,[
        '--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
        '--disable-background-networking','--virtual-time-budget=4500','--dump-dom',origin+path
      ],{stdio:['ignore','pipe','ignore']});
      let html='';
      const guard=setTimeout(()=>{proc.kill('SIGKILL');reject(new Error('Chromium timed out: '+path));},25000);
      proc.stdout.on('data',chunk=>{html+=chunk.toString();if(html.length>3_000_000)proc.kill('SIGKILL');});
      proc.on('error',err=>{clearTimeout(guard);reject(err);});
      proc.on('exit',(code)=>{
        clearTimeout(guard);
        if(code!==0)reject(new Error('Chromium exited '+code+' on '+path));
        else resolve(html);
      });
    });
    const welcome=await open('/3code');
    for(const phrase of ['Que souhaitez-vous faire','Je veux participer','J’ai reçu un document','Je veux organiser une action','Aucune initiative n’est encore ouverte'])assert.ok(welcome.includes(phrase),phrase);
    assert.match(welcome,/<details class="panel action-details" id="organiser">/);
    const expanded=await open('/3code#organiser');
    assert.match(expanded,/<details class="panel action-details" id="organiser" open="">/);
    const c=await api('/campaigns',{title:'Initiative fictive',goal:'Un objectif compréhensible, sans jargon'});
    await api('/campaigns/'+c.id+'/activate',{},c.management_token);
    const copy=await api('/copies',{campaign_id:c.id,title:'Mon premier document'});
    const landing=await open('/3code');
    assert.match(landing,/Initiative fictive/);
    const campaign=await open('/3code/campaign/'+c.id);
    assert.match(campaign,/Je crée un document à partager/);
    assert.match(campaign,/Créer mon document et son QR code/);
    const document=await open('/3code/e/'+copy.id);
    assert.match(document,/Vous avez ouvert un document partagé/);
    assert.match(document,/Vous souhaitez contribuer/);
    const printable=await open('/3code/print?copy_id='+copy.id);
    assert.match(printable,/Imprimer ou enregistrer en PDF/);
    assert.match(printable,new RegExp(copy.id));
  }finally{
    await new Promise(resolve=>server.close(resolve));
    rmSync(dir,{recursive:true,force:true});
  }
});
