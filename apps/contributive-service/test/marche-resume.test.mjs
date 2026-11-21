import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/marche.js',import.meta.url),'utf8');
const copyId='123e4567-e89b-42d3-a456-426614174000';
const registrationId='234e4567-e89b-42d3-a456-426614174001';
const candidate={id:'clara-egger',name:'Clara Egger',movement:'Solution démocratique'};
const code='3AB-CDE-FG0';
const subject='3Code '+registrationId+' '+'A'.repeat(40);

async function resume(registration,{clipboardAvailable=true}={}){
  const elements=new Map();
  const byId=id=>{
    if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',checked:false,
      hidden:false,disabled:false,scrollIntoView(){},focus(){this.focused=true;},select(){this.selected=true;}});
    return elements.get(id);
  };
  const storage=new Map([
    ['marche-last-document',JSON.stringify({id:copyId,candidate_id:candidate.id,three_code:code})],
    ['copy-edit-'+copyId,'private-test-key'],
    ...(registration===undefined?[]:[['marche-registration-'+copyId,JSON.stringify(registration)]])
  ]);
  const localStorage={
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value))
  };
  const copied=[];
  const navigator=clipboardAvailable?{clipboard:{writeText:async value=>{copied.push(value);}}}:{};
  const fetch=async url=>{
    let data;
    if(url==='/3code/api/marche')data={candidates:[candidate],updated:'2026-11-21'};
    else if(url==='/3code/api/marche/documents/'+copyId)
      data={document:{id:copyId,three_code:code,parent_code:null},candidate};
    else throw Error('Unexpected request '+url);
    return {ok:true,status:200,json:async()=>data};
  };
  runInNewContext(source,{
    document:{getElementById:byId},localStorage,navigator,fetch,
    URL,URLSearchParams,encodeURIComponent,
    location:{pathname:'/3code/marche-du-soleil',search:''}
  },{filename:'marche.js'});
  // catalog() and restoreCopy() both contain await points.
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(byId('marche-code-result').textContent,code);
  assert.equal(byId('marche-email-panel').hidden,false);
  return {byId,copied};
}

test('returning visitor can reopen the same prepared email without a new request',async()=>{
  const {byId}=await resume({id:registrationId,view:'private-view',email_to:'3code@acorsica.org',email_subject:subject});
  assert.equal(byId('marche-email').disabled,true);
  assert.equal(byId('marche-status-check').hidden,false);
  assert.equal(byId('marche-mail-subject').value,subject);
  assert.match(byId('marche-email-result').innerHTML,/mailto:3code@acorsica\.org\?subject=/);
  assert.match(byId('marche-email-result').innerHTML,/si vous ne l’avez pas encore envoyé/);
});

test('manual mail fallback exposes recipient and subject with working copy buttons',async()=>{
  const {byId,copied}=await resume({id:registrationId,view:'private-view',
    email_to:'3code@acorsica.org',email_subject:subject});
  assert.equal(byId('marche-mail-to').value,'3code@acorsica.org');
  assert.equal(byId('marche-mail-subject').value,subject);
  await byId('marche-copy-to').onclick();
  await byId('marche-copy-subject').onclick();
  assert.deepEqual(copied,['3code@acorsica.org',subject]);
  assert.equal(byId('marche-copy-feedback').textContent,'Objet copié.');
});

test('manual mail fallback remains selectable when clipboard is unavailable',async()=>{
  const {byId}=await resume({id:registrationId,view:'private-view',
    email_to:'3code@acorsica.org',email_subject:subject},{clipboardAvailable:false});
  await byId('marche-copy-subject').onclick();
  assert.equal(byId('marche-mail-subject').selected,true);
  assert.match(byId('marche-copy-feedback').textContent,/Ctrl\+C/);
});

test('older browser state with no saved subject can request a new mail draft',async()=>{
  const {byId}=await resume({id:registrationId,view:'private-view'});
  assert.equal(byId('marche-email').disabled,false);
  assert.equal(byId('marche-email').textContent,'Préparer un nouveau courriel');
  assert.equal(byId('marche-status-check').hidden,false);
});

test('bad saved mail target is not restored as a clickable link',async()=>{
  const {byId}=await resume({id:registrationId,view:'private-view',email_to:'javascript:alert(1)',email_subject:subject});
  assert.equal(byId('marche-email').disabled,false);
  assert.doesNotMatch(byId('marche-email-result').innerHTML,/href=/);
});
