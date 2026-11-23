// Alan v0.2 / Cogentia #36: small deterministic execution reference.
// GPT-6 under Jean Hugues Noël Robert's direction, 2026-11-23.
// Source looks synchronous; serialized logical frames and slots provide the
// continuation. No external tool is ever invoked by this executor.
import {createHash,randomUUID} from 'node:crypto';
import {validate,AlanError} from './validate.js';
import {standard} from './stdlib.js';

const fault=(code,detail='')=>{throw new AlanError(code,'runtime',detail)};
const clone=x=>{
  // All state crossing the process boundary is plain JSON data.
  const seen=new Set();
  function json(v,depth=0){
    if(depth>60)fault('ALAN_VALUE_DEPTH');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'){if(!Number.isFinite(v))fault('ALAN_NONFINITE');return v}
    if(typeof v!=='object'||seen.has(v))fault('ALAN_NOT_SERIALIZABLE');
    if(Object.getPrototypeOf(v)!==Object.prototype&&
       Object.getPrototypeOf(v)!==null&&!Array.isArray(v))fault('ALAN_NOT_SERIALIZABLE');
    seen.add(v);
    const out=Array.isArray(v)?v.map(x=>json(x,depth+1)):
      Object.fromEntries(Object.entries(v).map(([k,x])=>[k,json(x,depth+1)]));
    seen.delete(v);return out;
  }
  return json(x);
};
function stable(v){
  if(Array.isArray(v))return v.map(stable);
  if(v&&typeof v==='object')return Object.fromEntries(
    Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
const digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const at=(locals,expr)=>{
  switch(expr.kind){
    case 'literal':return expr.value;
    case 'list':return expr.items.map(v=>at(locals,v));
    case 'record':return Object.fromEntries(
      Object.entries(expr.fields).map(([k,v])=>[k,at(locals,v)]));
    case 'reference':{
      let v=locals;
      for(const key of expr.path){
        if(v===null||typeof v!=='object'||!Object.hasOwn(v,key))
          fault('ALAN_MISSING_VALUE',expr.path.join('.'));
        v=v[key];
      }
      return v;
    }
    default:fault('ALAN_UNKNOWN_VALUE_KIND');
  }
};
function evaluate(locals,args){
  return Object.fromEntries(Object.entries(args).map(([k,v])=>[k,at(locals,v)]));
}
function compile(program){
  const scope=validate(program);
  const code=new Map();
  for(const fn of program.functions){
    const instructions=[];
    function lower(body){
      for(const op of body){
        if(op.op==='if'){
          const test=instructions.length;
          instructions.push({op:'test',condition:op.condition,to:null});
          lower(op.then_body);
          const skip=instructions.length;instructions.push({op:'jump',to:null});
          instructions[test].to=instructions.length;
          lower(op.else_body||[]);
          instructions[skip].to=instructions.length;
        }else if(op.op==='while'){
          const start=instructions.length;
          instructions.push({op:'test',condition:op.condition,to:null});
          lower(op.body);
          instructions.push({op:'jump',to:start});
          instructions[start].to=instructions.length;
        }else{instructions.push(op)}
      }
    }
    lower(fn.body);
    code.set(fn.name,instructions);
  }
  return {scope,code,codeHash:digest(program)};
}
function limits(input){
  const defaults={maxSteps:10000,maxDepth:64,maxStateBytes:524288};
  const result={...defaults,...input};
  for(const [name,n] of Object.entries(result))
    if(!Object.hasOwn(defaults,name)||!Number.isSafeInteger(n)||n<1||n>10000000)
      fault('ALAN_INVALID_LIMIT',name);
  return result;
}
function payload(result){
  return JSON.parse(JSON.stringify(result));
}
function stateSize(state,limit){
  if(Buffer.byteLength(JSON.stringify(state),'utf8')>limit)fault('ALAN_STATE_LIMIT');
}
function terminal(machine,result){
  return {
    type:'alan.terminal',version:'0.2',code_hash:machine.codeHash,
    result:clone(result),trace:machine.trace,context:machine.context,
    execution:{steps:machine.steps}
  };
}
function failure(machine,code,message){
  return {
    type:'alan.failure',version:'0.2',code_hash:machine.codeHash,
    error:{code,message},trace:machine.trace,context:machine.context,
    execution:{steps:machine.steps}
  };
}
function execute(program,machine,compiled){
  const {code,scope,codeHash}=compiled;
  if(machine.codeHash!==codeHash)fault('ALAN_CODE_MISMATCH');
  while(machine.frames.length){
    if(++machine.steps>machine.limits.maxSteps)
      return failure(machine,'ALAN_STEP_LIMIT','Compute budget exhausted');
    const frame=machine.frames.at(-1),programCode=code.get(frame.fn);
    if(!programCode||!Number.isInteger(frame.pc)||frame.pc<0||frame.pc>=programCode.length)
      return failure(machine,'ALAN_NO_RETURN','Function ended without return');
    const op=programCode[frame.pc];
    try{
      switch(op.op){
        case 'assign':
          frame.locals[op.bind]=clone(at(frame.locals,op.value));frame.pc++;break;
        case 'test':{
          const condition=at(frame.locals,op.condition);
          if(typeof condition!=='boolean')fault('ALAN_TYPE_BOOLEAN');
          frame.pc=condition?frame.pc+1:op.to;break;
        }
        case 'jump':frame.pc=op.to;break;
        case 'call':{
          const args=evaluate(frame.locals,op.args);
          const std=standard[op.callee];
          if(std){
            const result=std.run(args,machine.context);
            if(op.bind)frame.locals[op.bind]=clone(result);
            frame.pc++;break;
          }
          if(machine.frames.length>=machine.limits.maxDepth)
            return failure(machine,'ALAN_DEPTH_LIMIT','Call-depth budget exhausted');
          const f=scope.functions.get(op.callee);
          if(!f)fault('ALAN_UNKNOWN_CALLEE');
          const locals=Object.create(null);
          for(const param of f.params)locals[param]=clone(args[param]);
          machine.frames.push({fn:f.name,pc:0,locals,returnBind:op.bind||null});
          break;
        }
        case 'return':{
          const result=clone(at(frame.locals,op.value));
          machine.frames.pop();
          if(!machine.frames.length)return terminal(machine,result);
          const caller=machine.frames.at(-1);
          if(frame.returnBind)caller.locals[frame.returnBind]=result;
          caller.pc++;
          break;
        }
        case 'fail':return failure(machine,
          String(at(frame.locals,op.code)),op.message?String(at(frame.locals,op.message)):'');
        case 'emit':
          machine.trace.push({event:op.event,data:clone(evaluate(frame.locals,op.args||{}))});
          frame.pc++;break;
        case 'mcp':{
          const extern=scope.externs.get(op.capability);
          if(extern.policy==='P5')
            return failure(machine,'ALAN_FORBIDDEN_CAPABILITY',op.capability);
          const suspensionId=randomUUID(),slotId=randomUUID();
          const input=clone(evaluate(frame.locals,op.args));
          checkResultSchema(input,extern.input,'ALAN_INPUT');
          machine.slots.push({id:slotId,state:'pending',capability:op.capability});
          const pending={
            capability:op.capability,input,slot_id:slotId,
            policy:{level:extern.policy,effect:extern.effect,data:extern.data,mode:extern.mode||null}
          };
          // The caller may later provide a result; this is NOT an execution receipt.
          const suspension={
            type:'alan.suspension',version:'0.2',suspension_id:suspensionId,
            code_hash:codeHash,
            reason:extern.policy==='P4'?'human_review_required':
              extern.policy==='P3'?'authorization_required':'caller_tool_call_required',
            pending_call:pending,
            resume_point:{function:frame.fn,step_index:frame.pc,bind:op.bind||null},
            saved_state:payload(machine),
            trace:{caller_mediated:true,direct_invocation_by_alan:false,execution_performed:false}
          };
          stateSize(suspension,machine.limits.maxStateBytes);
          suspension.state_digest=digest({
            version:suspension.version,code_hash:codeHash,
            suspension_id:suspensionId,reason:suspension.reason,
            pending_call:pending,resume_point:suspension.resume_point,
            saved_state:suspension.saved_state
          });
          return suspension;
        }
        default:fault('ALAN_UNKNOWN_OP',op.op);
      }
      stateSize(machine,machine.limits.maxStateBytes);
    }catch(e){
      if(e instanceof AlanError)return failure(machine,e.code,e.message);
      return failure(machine,e.message?.startsWith('ALAN_')?e.message:'ALAN_RUNTIME_ERROR',
        e.message||String(e));
    }
  }
  return failure(machine,'ALAN_EMPTY_STACK','No terminal result');
}
export function start(program,{entry='main',args={},context={},bounds={}}={}){
  const compiled=compile(program),f=compiled.scope.functions.get(entry);
  if(!f)fault('ALAN_MISSING_ENTRY',entry);
  if(!args||typeof args!=='object'||Array.isArray(args)||
    Object.keys(args).sort().join(',')!==[...f.params].sort().join(','))
    fault('ALAN_ENTRY_ARGUMENTS');
  const locals=Object.create(null);
  for(const param of f.params)locals[param]=clone(args[param]);
  const machine={
    version:'0.2',codeHash:compiled.codeHash,
    frames:[{fn:entry,pc:0,locals,returnBind:null}],
    slots:[],trace:[],steps:0,limits:limits(bounds),
    context:clone({
      packet_id:context.packet_id||null,
      mandate_ref:context.mandate_ref||null,
      budget_ref:context.budget_ref||null,
      trace_ref:context.trace_ref||null,
      logical_time:context.logical_time||null
    })
  };
  return execute(program,machine,compiled);
}
function checkResultSchema(value,schema,prefix='ALAN_STEP'){
  if(value===null||typeof value!=='object'||Array.isArray(value))
    fault(prefix+'_VALUE_SHAPE');
  for(const [name,type] of Object.entries(schema)){
    if(!Object.hasOwn(value,name))fault(prefix+'_MISSING_FIELD',name);
    const x=value[name];
    if(type==='any')continue;
    if(type==='null'&&x!==null)fault(prefix+'_TYPE',name);
    if(type==='list'&&!Array.isArray(x))fault(prefix+'_TYPE',name);
    else if(['record','map'].includes(type)&&(x===null||typeof x!=='object'||Array.isArray(x)))
      fault(prefix+'_TYPE',name);
    else if(type==='string'&&typeof x!=='string')fault(prefix+'_TYPE',name);
    else if(type==='bool'&&typeof x!=='boolean')fault(prefix+'_TYPE',name);
    else if(type==='int'&&(!Number.isSafeInteger(x)))fault(prefix+'_TYPE',name);
    else if(type==='float'&&(!Number.isFinite(x)))fault(prefix+'_TYPE',name);
  }
  for(const name of Object.keys(value))if(!Object.hasOwn(schema,name))
    fault(prefix+'_UNKNOWN_FIELD',name);
}
export function resume(program,suspension,stepResult){
  const compiled=compile(program),{codeHash,scope}=compiled;
  if(suspension?.type!=='alan.suspension'||suspension.version!=='0.2')
    fault('ALAN_INVALID_CONTINUATION');
  if(suspension.code_hash!==codeHash||suspension.saved_state?.codeHash!==codeHash)
    fault('ALAN_CODE_MISMATCH');
  if(digest({
    version:suspension.version,code_hash:suspension.code_hash,
    suspension_id:suspension.suspension_id,reason:suspension.reason,
    pending_call:suspension.pending_call,resume_point:suspension.resume_point,
    saved_state:suspension.saved_state
  })!==suspension.state_digest)fault('ALAN_STATE_CORRUPTED');
  if(stepResult?.type!=='alan.step_result'||
    stepResult.for_suspension!==suspension.suspension_id||
    stepResult.supplied_by!=='caller'||
    stepResult.trace?.caller_mediated!==true||
    stepResult.trace?.direct_invocation_by_alan!==false)
    fault('ALAN_STEP_CORRELATION');
  const machine=clone(suspension.saved_state),frame=machine.frames.at(-1);
  if(!frame||frame.fn!==suspension.resume_point?.function||
     frame.pc!==suspension.resume_point?.step_index)
    fault('ALAN_RESUME_POINT');
  const op=compiled.code.get(frame.fn)?.[frame.pc];
  if(!op||op.op!=='mcp'||op.capability!==suspension.pending_call?.capability||
     (op.bind||null)!==(suspension.resume_point.bind||null))fault('ALAN_RESUME_POINT');
  const slot=machine.slots.find(x=>x.id===suspension.pending_call?.slot_id);
  if(!slot||slot.state!=='pending')fault('ALAN_SLOT_MISMATCH');
  if(stepResult.outcome!==undefined&&!['resolved','refused'].includes(stepResult.outcome))
    fault('ALAN_INVALID_STEP_OUTCOME');
  machine.trace.push({
    event:'mcp_result_supplied',
    data:{
      suspension_id:suspension.suspension_id,
      capability:op.capability,
      outcome:stepResult.outcome==='refused'?'refused':'resolved',
      supplied_by:'caller',
      // The caller's report is not an independently verified effect receipt.
      execution_reported_by_caller:stepResult.trace?.execution_performed===true
    }
  });
  if(stepResult.outcome==='refused')
    return failure(machine,'ALAN_CAPABILITY_REFUSED',String(stepResult.reason||'refused'));
  const ext=scope.externs.get(op.capability);
  checkResultSchema(stepResult.value,ext.output);
  const resolved=clone(stepResult.value);
  slot.state='resolved';slot.value=resolved;
  if(op.bind)frame.locals[op.bind]=resolved;
  frame.pc++;
  return execute(program,machine,compiled);
}
export function sourceHash(program){return compile(program).codeHash}
