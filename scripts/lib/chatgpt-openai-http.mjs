/** Minimal authenticated loopback HTTP adapter, with machine-local continuations. */
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';

const writeJson=(res,status,body)=>{
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
};
function validBearer(header,secret){
  const match=/^Bearer\s+([^\s]+)$/i.exec(header||'');
  if(!match)return false;
  const a=Buffer.from(match[1]),b=Buffer.from(secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
async function readJson(req,max=32768){
  let body='';
  for await(const chunk of req){
    body+=chunk.toString('utf8');
    if(Buffer.byteLength(body,'utf8')>max)throw Error('request_too_large');
  }
  return JSON.parse(body);
}
function emitSse(res,completion){
  const {id,created,model}=completion;
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'});
  const chunk=(delta,finish_reason=null)=>res.write('data: '+JSON.stringify({id,object:'chat.completion.chunk',created,model,
    choices:[{index:0,delta,finish_reason}]})+'\n\n');
  chunk({role:'assistant'});
  chunk({content:completion.choices[0].message.content});
  chunk({},'stop');
  res.end('data: [DONE]\n\n');
}
/** No internal scheduler: complete only assigns and waits on the shared store. */
export function createChatgptOpenAiHttpServer({complete,key,maxInflight=4,localStatus}={}){
  if(typeof complete!=='function'||typeof key!=='string'||key.length<16)
    throw Error('local_provider_authentication_required');
  let inflight=0;
  return http.createServer(async(req,res)=>{
    if(req.method==='GET'&&req.url==='/health')return writeJson(res,200,{
      service:'chatgpt-browser-openai-provider',ok:true,mode:'local_browser_adapter',
      browser_delivery_verified:false});
    if(!validBearer(req.headers.authorization,key))return writeJson(res,401,{error:{type:'authentication_error',code:'invalid_api_key'}});
    if(req.method==='GET'&&req.url==='/v1/models')return writeJson(res,200,{object:'list',data:[{
      id:'chatgpt-browser',object:'model',owned_by:'local-chatgpt-provider',capabilities:['text']}]});
    if(req.method==='GET'&&/^\/v1\/continuations\/local_[a-f0-9]{32}$/.test(req.url||'')){
      const id=req.url.split('/').at(-1);
      const row=typeof localStatus==='function'?localStatus(id):null;
      return row?writeJson(res,200,{id:row.id,status:row.status,reason:row.reason||null,
        answer:row.status==='done'?row.answer:null,local:true}):
        writeJson(res,404,{error:{code:'continuation_not_found'}});
    }
    const legacy=req.url==='/v1/completions';
    if(req.method!=='POST'||(!legacy&&req.url!=='/v1/chat/completions'))
      return writeJson(res,404,{error:{type:'invalid_request_error',code:'not_found'}});
    if(inflight>=maxInflight)return writeJson(res,429,{error:{type:'rate_limit_error',code:'bridge_busy'}});
    let body;
    try{body=await readJson(req);}catch{return writeJson(res,400,{error:{type:'invalid_request_error',code:'invalid_json_or_request_too_large'}});}
    inflight++;
    let disconnected=false;
    res.on('close',()=>{disconnected=true});
    try{
      const completion=await complete(body,{legacy,client_request_id:req.headers['x-client-request-id'],
        call_chain:req.headers['x-cogentia-call-chain']});
      if(disconnected)return;
      if(completion.status===200&&body.stream===true&&!legacy)return emitSse(res,completion.body);
      return writeJson(res,completion.status,completion.body);
    }catch{return !disconnected&&writeJson(res,500,{error:{type:'server_error',code:'provider_internal_error'}});}
    finally{inflight--}
  });
}
