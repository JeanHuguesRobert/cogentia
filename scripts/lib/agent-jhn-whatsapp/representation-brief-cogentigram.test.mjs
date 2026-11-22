import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { compressCogentigramTopN } from './representation-brief.js'

const profile = JSON.parse(fs.readFileSync(new URL('../../../research/cogentigram_jhn_public_open.json', import.meta.url),'utf8'))

test('Agent John includes important unscored dimensions with the same first-class status', () => {
  const result = compressCogentigramTopN(profile,{cogentigramTopN:12})
  assert.equal(result.top.length,12)
  const ids = new Set(result.top.map(x=>x.id))
  assert.ok(ids.has('REP-001'), 'representational cognition represented')
  assert.ok(ids.has('ENG-001'), 'engineering represented')
  assert.ok(ids.has('OPS-001'), 'operational execution represented')
  assert.match(result.text,/qualitative/)
  assert.doesNotMatch(result.text,/score=null/)
})
test('Agent John still respects explicit question context and bounded selection', () => {
  const result=compressCogentigramTopN(profile,{cogentigramTopN:8,question:'Need help with notation and mathematical learning'})
  assert.equal(result.top.length,8)
  assert.ok(result.top.some(x=>x.id==='REP-001' || x.id==='REP-002'))
  assert.ok(result.top.every(x=>x.id))
})
test('A low numeric score is not confused with an unscored qualitative dimension', () => {
  const result=compressCogentigramTopN(profile,{cogentigramTopN:12})
  assert.ok(result.low.every(x=>typeof x.score==='number'))
  assert.ok(result.low.every(x=>!/^REP-|^ENG-|^OPS-/.test(x.id)))
})
