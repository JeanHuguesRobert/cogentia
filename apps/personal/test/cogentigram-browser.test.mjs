import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  buildCogentigramPrompt, parseLocalCogentigram, cogentigramCoverage,
  storeLocalCogentigram, restoreLocalCogentigram, clearLocalCogentigram,
  LOCAL_COGENTIGRAM_KEY,
} from '../src/lib/cogentigram-open.js'

const src = new URL('../../../research/', import.meta.url)
const registry = JSON.parse(fs.readFileSync(new URL('cogentigram_dimensions.json', src), 'utf8'))
const profile = JSON.parse(fs.readFileSync(new URL('cogentigram_jhn_public_open.json', src), 'utf8'))
const doc = fs.readFileSync(new URL('kys_capture_prompt_v2.md', src), 'utf8')

test('clipboard prompt carries all current dimensions and requires explicit unknowns', () => {
  const prompt = buildCogentigramPrompt(doc, registry)
  for (const d of registry.dimensions) {
    assert.ok(prompt.includes(`${d.id} — ${d.name} — ${d.definition}`), d.id)
  }
  assert.match(prompt, /CHACUN de ces identifiants/)
  assert.match(prompt, /kind:"unknown"/)
  assert.match(prompt, /aucun plafond/)
  assert.ok(prompt.indexOf('73. COG-073 —') < prompt.indexOf('74. REP-001 —'))
})

test('browser uses the same parser as backend, retains every dimension and unknown', () => {
  const fixture = structuredClone(profile)
  fixture.indicators.find(d => d.id === 'REP-001').measurement.kind = 'unknown'
  fixture.indicators.find(d => d.id === 'REP-001').evidence = ''
  const raw = JSON.stringify(fixture)
  const {data,rawText} = parseLocalCogentigram(raw)
  assert.equal(rawText, raw)
  const coverage = cogentigramCoverage(data, registry)
  assert.equal(coverage.total,80)
  assert.equal(coverage.present,80)
  assert.equal(coverage.unknown,1)
  assert.deepEqual(coverage.missing, [])
})

test('an incomplete 7-dimension response is displayed honestly, not treated as 80', () => {
  const fixture = {...profile,indicators:profile.indicators.slice(-7)}
  const result = parseLocalCogentigram(JSON.stringify(fixture))
  const coverage = cogentigramCoverage(result.data,registry)
  assert.equal(coverage.present,7)
  assert.equal(coverage.missing.length,73)
})

test('local persistence occurs only on the explicit store call and preserves original bytes', () => {
  const items = new Map()
  const storage = {
    setItem:(k,v)=>items.set(k,v),getItem:k=>items.get(k)??null,removeItem:k=>items.delete(k),
  }
  const raw = JSON.stringify(profile,null,2)
  assert.equal(items.size,0)
  storeLocalCogentigram(storage,raw)
  assert.equal(items.get(LOCAL_COGENTIGRAM_KEY),raw)
  assert.equal(restoreLocalCogentigram(storage).data.indicators.length,80)
  clearLocalCogentigram(storage)
  assert.equal(items.size,0)
})

test('a second capture must not silently overwrite the immutable saved one', () => {
  const items = new Map()
  const storage = {
    setItem:(k,v)=>items.set(k,v),getItem:k=>items.get(k)??null,removeItem:k=>items.delete(k),
  }
  const original=JSON.stringify(profile)
  const distinct=JSON.stringify({...profile,indicators:profile.indicators.slice(0,79)})
  storeLocalCogentigram(storage,original)
  assert.throws(()=>storeLocalCogentigram(storage,distinct),/capture|remplac|enregistr/i)
  assert.equal(storage.getItem(LOCAL_COGENTIGRAM_KEY),original)
  assert.equal(restoreLocalCogentigram(storage).data.indicators.length,80)
})
