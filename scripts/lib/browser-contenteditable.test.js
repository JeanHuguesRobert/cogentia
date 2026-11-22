import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {WebSocket} from 'ws';
import {compileNonSecretFormFill} from './browser-form-script.js';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';

const url = 'https://example.org/editor';
function fixture(kind='rich') {
  const selection={clear:0,range:null,removeAllRanges(){this.clear++},addRange(r){this.range=r}};
  const element={
    tagName:kind==='rich'?'DIV':'INPUT',
    type:'text',isContentEditable:kind==='rich',
    isConnected:true,disabled:false,readOnly:false,innerText:'ancien texte',value:'ancien texte',
    autocomplete:'',
    getAttribute(key){return key==='contenteditable' ? (kind==='rich'?'true':null) : null;},
    focus(){doc.activeElement=this;},
    setSelectionRange(start,end){this.selected=[start,end]}
  };
  const doc={
    location:{origin:'https://example.org'},activeElement:null,
    querySelectorAll(){return [element]},
    getSelection(){return selection},
    createRange(){return{selectNodeContents(node){this.node=node}}},
    execCommand(command,ui,value){
      if(command!=='insertText')return false;
      if(kind==='rich')element.innerText=value;
      else element.value=value;
      this.dispatched=(this.dispatched||[]).concat(command);
      return true;
    }
  };
  return {doc,element,location:{href:url},selection};
}
function evaluate(input, env=fixture()) {
  const code=compileNonSecretFormFill({...input,expectedUrl:url,fieldIndex:0});
  return {result:vm.runInNewContext(code,{document:env.doc,location:env.location}),env};
}

test('Core contenteditable replacement selects entire field, preserves Unicode/multiline and never submits',()=>{
  const input="Démocratie : pour tout le monde !\nAide citoyenne et solidarité.";
  const {result,env}=evaluate({fieldKind:'contenteditable',text:input});
  assert.deepEqual({...result},{ok:true,insertedLength:input.length,submitted:false});
  assert.equal(env.element.innerText,input);
  assert.equal(env.selection.range.node,env.element);
  assert.equal(env.doc.dispatched.length,1);
  assert.ok(env.selection.clear>0);
});
test('contenteditable declines plain input, wrong URL, read-only and sensitive autocomplete',()=>{
  assert.equal(evaluate({fieldKind:'contenteditable',text:'X'},fixture('plain')).result.reason,'rich_text_field_unavailable');
  const env=fixture();env.location.href='https://example.org/other';
  assert.equal(evaluate({fieldKind:'contenteditable',text:'X'},env).result.reason,'document_url_changed');
  const disabled=fixture();disabled.element.getAttribute=k=>k==='aria-disabled'?'true':k==='contenteditable'?'true':null;
  assert.equal(evaluate({fieldKind:'contenteditable',text:'X'},disabled).result.reason,'field_unavailable');
  const sensitive=fixture();sensitive.element.autocomplete='one-time-code';
  assert.equal(evaluate({fieldKind:'contenteditable',text:'X'},sensitive).result.reason,'sensitive_autocomplete');
  assert.equal(evaluate({fieldKind:'plain',text:'X'}).result.reason,'field_unavailable');
});
test('rich text gateway fills with Core-compiled recipe without changing extension protocol',async()=>{
  const gateway=createNavigationGateway({instance:'rich-text-fixture'});
  await gateway.listen(0,['127.0.0.1']);
  const uri='ws://127.0.0.1:'+gateway._bound[0].address().port;
  let extension,requests=0;
  try{
    extension=new WebSocket(uri+'/extension');
    await new Promise((ok,no)=>{extension.once('open',ok);extension.once('error',no)});
    extension.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'fracta2-hosted'}}));
    extension.on('message',raw=>{
      const q=JSON.parse(String(raw));
      if(q.method!=='page.evaluate')return;
      requests++;
      assert.equal(q.params.tabId,42);
      assert.equal(q.params.expectedUrl,url);
      assert.match(q.params.code,/contenteditable/);
      assert.match(q.params.code,/selectNodeContents/);
      extension.send(JSON.stringify({jsonrpc:'2.0',id:q.id,result:{
        value:{ok:true,insertedLength:12,submitted:false},tab:{id:42}
      }}));
    });
    const cap=createHostedBrowserCapabilities({gateway:uri+'/assistant'}).find(c=>c.name==='browser.form.fill');
    const result=await cap.execute({tab_id:42,field_index:0,expected_url:url,text:'Bonjour tous',field_kind:'contenteditable'});
    assert.equal(result.ok,true);
    assert.equal(result.submitted,false);
    assert.equal(requests,1);
    assert.doesNotMatch(JSON.stringify(result),/Bonjour tous/);
    await assert.rejects(()=>cap.execute({tab_id:42,field_index:0,expected_url:url,text:'X',field_kind:'secret'}),e=>e.code==='BROWSER_FORM_FIELD_KIND_INVALID');
    assert.equal(requests,1);
  }finally{extension?.close();await gateway.close()}
});
