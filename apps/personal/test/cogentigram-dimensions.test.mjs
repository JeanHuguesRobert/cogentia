import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseCogentiaJson } from '../netlify/lib/parseCogentia.js'

const profile = JSON.parse(fs.readFileSync(new URL('../../../research/cogentigram_jhn_public_open.json', import.meta.url), 'utf8'))
const dimensions = JSON.parse(fs.readFileSync(new URL('../../../research/cogentigram_dimensions.json', import.meta.url), 'utf8'))

test('canonical ontology: 80 first-class distinct dimensions, including seven peers', () => {
  assert.equal(dimensions.dimensions.length, 80)
  assert.equal(new Set(dimensions.dimensions.map(d => d.id)).size, 80)
  assert.equal(profile.indicators.length, 80)
  assert.deepEqual(new Set(profile.indicators.map(d => d.id)), new Set(dimensions.dimensions.map(d => d.id)))
  assert.deepEqual(profile.indicators.slice(73).map(d => d.id), ['REP-001', 'REP-002', 'REP-003', 'ENG-001', 'ENG-002', 'ENG-003', 'OPS-001'])
  assert.ok(profile.indicators.slice(73).every(x => x.score === null && x.measurement.kind === 'qualitative'))
  assert.ok(dimensions.rules.unbounded)
})
test('v2 accepts 80, 81 and 120 dimensions, preserving every field', () => {
  for (const count of [80,81,120]) {
    const extra = Array.from({length:count-80}, (_,i)=>({
      id:`ADD-${i+1}`,rank:81+i,name:`Additional ${i+1}`,
      category:'New category',score:null,confidence:null,
      measurement:{kind:'conditional',contexts:[{domain:'test',observation:'works'}]},
      evidence:'Evidence without a number',arbitrary_future_field:{value:'retained'},
    }))
    const raw = JSON.stringify({...profile,indicators:[...profile.indicators,...extra]})
    const result = parseCogentiaJson(raw)
    assert.equal(result.error,null,result.error)
    assert.equal(result.data.indicators.length,count)
    assert.equal(result.rawText,raw)
    assert.ok(result.data.indicators.every(x=>x.id))
    if(extra.length) assert.deepEqual(result.data.indicators.at(-1).arbitrary_future_field,{value:'retained'})
    if(extra.length) assert.deepEqual(result.data.indicators.at(-1).measurement.contexts,[{domain:'test',observation:'works'}])
  }
})
test('v1 legacy archive is readable without adding old cardinality as a current limit', () => {
  const old = JSON.parse(fs.readFileSync(new URL('../../../apps/personal/samples/cogentigram_author.json', import.meta.url),'utf8'))
  const result = parseCogentiaJson(JSON.stringify(old))
  assert.equal(result.error,null,result.error)
  assert.equal(result.data.indicators.length,73)
  assert.equal(result.data.indicators[0].id,'COG-001')
  assert.equal(result.data.indicators[0].score_type,'agent_estimate_0_100')
})
test('REP-001 preserves domain contrast and does not invent an impairment score',()=>{
  const result = parseCogentiaJson(JSON.stringify(profile))
  const rep=result.data.indicators.find(x=>x.id==='REP-001')
  assert.equal(rep.score,null)
  assert.equal(rep.measurement.kind,'qualitative')
  assert.match(rep.evidence,/calculus/)
  assert.match(rep.evidence,/programming/)
})
test('duplicate stable identifiers must fail rather than override',()=>{
  const duplicate={...profile,indicators:[...profile.indicators,{...profile.indicators[0],rank:81}]}
  const result = parseCogentiaJson(JSON.stringify(duplicate))
  assert.match(result.error,/dupliqué/)
})
test('original exact input survives normalization',()=>{
  const source=JSON.stringify(profile,null,3)
  const result=parseCogentiaJson(source)
  assert.equal(result.rawText,source)
  assert.equal(result.source.indicators[0].score_type,'agent_estimate_0_100')
})
