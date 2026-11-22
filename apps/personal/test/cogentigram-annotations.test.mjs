import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  fingerprintRawCapture,
  appendLocalAnnotation, readLocalAnnotations,
  exportAnnotatedCapture, clearLocalAnnotations,
  ANNOTATIONS_KEY,
} from '../src/lib/cogentigram-annotations.js'
import { parseLocalCogentigram } from '../src/lib/cogentigram-open.js'

const profile = JSON.parse(fs.readFileSync(new URL('../../../research/cogentigram_jhn_public_open.json', import.meta.url),'utf8'))
const raw = JSON.stringify(profile)
const fakeStorage = () => {
 const rows = new Map()
 return { rows, getItem: k => rows.get(k) ?? null, setItem:(k,v)=>rows.set(k,v), removeItem:k=>rows.delete(k) }
}

test('fingerprint addresses exact original bytes; whitespace changes identity', async () => {
  const a = await fingerprintRawCapture(raw)
  assert.match(a,/^[0-9a-f]{64}$/)
  assert.notEqual(a,await fingerprintRawCapture(JSON.stringify(profile,null,2)))
})
test('subject annotation is separate, append-only and linked to exact raw capture',async () => {
  const storage=fakeStorage()
  const before=parseLocalCogentigram(raw).data.indicators.find(x=>x.id==='REP-001')
  const first=await appendLocalAnnotation(storage,raw,{dimension_id:'REP-001',decision:'contested',note:'La difficulté ne s’applique pas aux langages informatiques.'})
  assert.equal(first.actor,'subject')
  assert.equal(first.dimension_id,'REP-001')
  assert.equal(first.decision,'contested')
  assert.equal(first.original_sha256,await fingerprintRawCapture(raw))
  assert.equal((await readLocalAnnotations(storage,raw)).length,1)
  await appendLocalAnnotation(storage,raw,{dimension_id:'REP-001',decision:'corrected',note:'Clarification : surtout la notation académique du calcul intégral.'})
  const items=await readLocalAnnotations(storage,raw)
  assert.equal(items.length,2)
  assert.equal(items[0].decision,'contested')
  assert.equal(items[1].decision,'corrected')
  assert.deepEqual(parseLocalCogentigram(raw).data.indicators.find(x=>x.id==='REP-001'),before)
  assert.deepEqual(await readLocalAnnotations(storage,JSON.stringify(profile,null,2)),[])
})
test('invalid decisions and empty corrections are rejected without any storage write',async () => {
  const storage=fakeStorage()
  await assert.rejects(()=>appendLocalAnnotation(storage,raw,{dimension_id:'REP-001',decision:'diagnosed',note:'X'}))
  await assert.rejects(()=>appendLocalAnnotation(storage,raw,{dimension_id:'REP-001',decision:'corrected',note:'  '}))
  await assert.rejects(()=>appendLocalAnnotation(storage,raw,{dimension_id:'NOPE-01',decision:'accepted',note:''}))
  assert.equal(storage.rows.size,0)
})
test('standalone export carries raw source and annotations without publishing them',async () => {
  const storage=fakeStorage()
  await appendLocalAnnotation(storage,raw,{dimension_id:'ENG-001',decision:'accepted',note:'Code Inox analysé.'})
  const bundle=await exportAnnotatedCapture(storage,raw)
  assert.equal(bundle.raw_measurement.exact_text,raw)
  assert.equal(bundle.annotations.length,1)
  assert.equal(bundle.raw_measurement.sha256,bundle.annotations[0].original_sha256)
  assert.equal(bundle.rights.public_disclosure,false)
  clearLocalAnnotations(storage)
  assert.equal(storage.getItem(ANNOTATIONS_KEY),null)
})
test('markdown fenced JSON is accepted by the shared parser without deleting original text',()=>{
 const fence=String.fromCharCode(96).repeat(3)
 const fenced=fence+'json\n'+raw+'\n'+fence
 const parsed=parseLocalCogentigram(fenced)
 assert.equal(parsed.rawText,fenced)
 assert.equal(parsed.data.indicators.length,80)
})

test('contradictory contextual evidence remains visible to derived and subject layers', async () => {
  const storage=fakeStorage()
  const fixture=structuredClone(profile)
  const dimension=fixture.indicators.find(x=>x.id==='REP-001')
  dimension.measurement={
    kind:'conditional',
    contexts:[
      {domain:'mathematical_notation',observation:'Not intelligible without semantic bridge'},
      {domain:'programming_language',observation:'Demonstrated complex compiler expertise'},
    ],
  }
  dimension.counter_evidence=[{domain:'logic_formalism',claim:'Evidence of successful formal interpretation'}]
  dimension.epistemic_status='inference'
  const input=JSON.stringify(fixture)
  const parsed=parseLocalCogentigram(input)
  const result=parsed.data.indicators.find(x=>x.id==='REP-001')
  assert.equal(result.measurement.contexts.length,2)
  assert.deepEqual(result.counter_evidence,dimension.counter_evidence)
  await appendLocalAnnotation(storage,input,{
    dimension_id:'REP-001',decision:'uncertain',note:'Examiner séparément les deux domaines.',
  })
  const exported=await exportAnnotatedCapture(storage,input)
  assert.equal(exported.annotations.length,1)
  assert.deepEqual(JSON.parse(exported.raw_measurement.exact_text).indicators.find(x=>x.id==='REP-001').counter_evidence,dimension.counter_evidence)
  assert.equal(result.score,null)
})
