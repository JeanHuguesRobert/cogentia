/**
 * OpenAI-shaped text completion over an injected conversational adapter.
 * No ChatGPT, Cogentia, COP, MCP, mandate or browser transport dependency.
 * A physical adapter supplies renderPrompt and runTurn.
 */
import {createHash,randomUUID} from 'node:crypto';
import {hostname} from 'node:os';

const error=(status,code,message,extra={})=>({
  status,body:{error:{type:'provider_error',code,message,...extra}},
});
const textOf=x=>typeof x==='string'?x:
  Array.isArray(x)&&x.every(p=>p?.type==='text'&&typeof p.text==='string')
    ?x.map(p=>p.text).join('\n'):null;
const defaultPrompt=parts=>'MESSAGES:\n'+JSON.stringify(parts);

export function normalizeConversationRequest(body,{legacy=false,
  model='chatgpt-browser',renderPrompt=defaultPrompt}={}){
  if(!body||typeof body!=='object'||Array.isArray(body))return {ok:false,error:'body_required'};
  if(body.model!=null&&body.model!==model)return {ok:false,error:'model_unsupported'};
  if(body.n!=null&&body.n!==1)return {ok:false,error:'multiple_choices_unsupported'};
  if(legacy&&body.stream===true)return {ok:false,error:'legacy_stream_unsupported'};
  if((Array.isArray(body.tools)&&body.tools.length)||body.function_call||
    (body.tool_choice&&body.tool_choice!=='none')||body.functions?.length||
    (body.response_format&&body.response_format.type!=='text')||
    body.audio||body.modalities?.some(x=>x!=='text'))
    return {ok:false,error:'feature_unsupported'};
  const messages=legacy?[{role:'user',content:body.prompt}]:body.messages;
  if(!Array.isArray(messages)||!messages.length||messages.length>30)
    return {ok:false,error:'messages_required'};
  const parts=[];
  for(const m of messages){
    if(!['system','developer','user','assistant'].includes(m?.role))
      return {ok:false,error:'role_unsupported'};
    const text=textOf(m.content);
    if(text===null)return {ok:false,error:'text_only_provider'};
    parts.push({role:m.role,content:text});
  }
  if(!parts.some(x=>x.role==='user'&&x.content.trim()))
    return {ok:false,error:'user_message_required'};
  const question=renderPrompt(parts);
  if(typeof question!=='string'||!question.trim())return {ok:false,error:'invalid_adapter_prompt'};
  if(question.length>4500)return {ok:false,error:'browser_prompt_too_long'};
  return {ok:true,question,ignored:['temperature','top_p','seed',
    'max_tokens','max_completion_tokens','stop'].filter(k=>body[k]!==undefined)};
}

export function createOpenAiConversationBridge({store,runTurn,model='chatgpt-browser',
  lineageToken=model,renderPrompt=defaultPrompt,clock=()=>Date.now()}={}){
  if(!store||typeof store.enqueue!=='function'||typeof store.claim!=='function'||
    typeof runTurn!=='function'||typeof lineageToken!=='string'||!lineageToken)
    throw Error('conversation_store_and_adapter_required');
  return async function complete(body,{legacy=false,client_request_id=null,
    call_chain=null}={}){
    const normalized=normalizeConversationRequest(body,{legacy,model,renderPrompt});
    if(!normalized.ok)return error(normalized.error==='browser_prompt_too_long'?413:422,
      normalized.error,normalized.error);
    const key=typeof client_request_id==='string'&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(client_request_id)
      ?client_request_id:randomUUID();
    const semantic={...body};
    for(const k of ['_cogentia_call_chain','_continuation_call_chain','_client_request_id'])delete semantic[k];
    const requestHash=createHash('sha256').update(JSON.stringify({body:semantic,legacy,model})).digest('hex');
    const inserted=store.enqueue({key,hash:requestHash,question:normalized.question});
    if(!inserted.ok)return error(409,inserted.error,inserted.error);
    const row=inserted.row;
    const response=answer=>({
      status:200,body:{
        id:'chatcmpl-'+row.id,created:Math.floor(clock()/1000),
        object:legacy?'text_completion':'chat.completion',model,
        choices:legacy?[{index:0,text:answer,finish_reason:'stop'}]:
          [{index:0,message:{role:'assistant',content:answer},finish_reason:'stop'}],
        usage:null,_provider:{local_request_id:row.id,ignored_parameters:normalized.ignored},
      },
    });
    if(row.status==='done')return response(row.answer);
    const deferred=(r,reason)=>error(409,'local_continuation_required',
      'Resumption required at the originating provider locality; no recursive provider call was made', {
        continuation:{id:r.id,locality:hostname(),status:r.status,reason,
          resume:'repeat the same request with the same X-Client-Request-Id'},
      });
    if(row.status==='running'||row.status==='uncertain')
      return deferred(row,row.reason||row.status);
    if(typeof call_chain==='string'&&call_chain.split(',').map(s=>s.trim()).includes(lineageToken))
      return deferred(store.defer(row.id,'recursive_call'),'recursive_call');
    const claimed=store.claim(row.id);
    if(!claimed.ok)return deferred(store.get(row.id),claimed.reason);
    try{
      const result=await runTurn(normalized.question,{request_id:row.id});
      if(typeof result?.answer!=='string'||!result.answer.trim())
        throw Error('conversation_answer_unavailable');
      store.finish(row.id,result.answer);
      return response(result.answer);
    }catch{
      store.uncertain(row.id,'conversation_outcome_unconfirmed');
      return deferred(store.get(row.id),'conversation_outcome_unconfirmed');
    }
  };
}
