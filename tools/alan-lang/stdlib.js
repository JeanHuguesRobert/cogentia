// Alan v0.2 / Cogentia #36 — GPT-6 under Jean Hugues Noël Robert's direction.
// Pure, deterministic calls only. No host capabilities or implicit time.
export const standard = Object.freeze({
  'num.add': {params:['a','b'], run:({a,b})=>number(a)+number(b)},
  'num.sub': {params:['a','b'], run:({a,b})=>number(a)-number(b)},
  'num.mul': {params:['a','b'], run:({a,b})=>number(a)*number(b)},
  'num.lt':  {params:['a','b'], run:({a,b})=>number(a)<number(b)},
  'num.gt':  {params:['a','b'], run:({a,b})=>number(a)>number(b)},
  // Side-style frozen logical time: supplied once by the caller, never sampled from host clock.
  'time.injected_time': {params:[], run:(_,context)=>{
    if(typeof context?.logical_time!=='string'||context.logical_time.length===0)
      throw Error('ALAN_LOGICAL_TIME_REQUIRED');
    return context.logical_time;
  }},
  'core.eq': {params:['a','b'], run:({a,b})=>Object.is(a,b)},
  'core.not':{params:['value'], run:({value})=>{
    if(typeof value!=='boolean')throw Error('ALAN_TYPE_BOOLEAN');
    return !value;
  }},
  'core.empty':{params:['value'], run:({value})=>{
    if(Array.isArray(value)||typeof value==='string')return value.length===0;
    if(value!==null&&typeof value==='object')return Object.keys(value).length===0;
    throw Error('ALAN_TYPE_COLLECTION');
  }},
  'list.length':{params:['items'],run:({items})=>{
    if(!Array.isArray(items))throw Error('ALAN_TYPE_LIST');
    return items.length;
  }}
});
function number(n){
  if(typeof n!=='number'||!Number.isFinite(n))throw Error('ALAN_TYPE_NUMBER');
  return n;
}
