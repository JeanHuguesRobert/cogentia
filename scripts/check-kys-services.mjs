#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../apps/personal/public/', import.meta.url)
const load = (path) => JSON.parse(readFileSync(new URL(path.replace(/^\//, ''), root), 'utf8'))
const index = load('kys-services.json')
const failures = []
const assert = (ok, message) => { if (!ok) failures.push(message) }
assert(index.schema === 'org.cogentia.kys.services.v0.1', 'Index schema mismatch')
assert(Array.isArray(index.services) && index.services.length >= 2, 'Expected two actual services')
const ids = new Set()
for (const service of index.services ?? []) {
  assert(!ids.has(service.id), 'Duplicate service id: ' + service.id)
  ids.add(service.id)
  assert(service.manifest?.startsWith('/services/'), 'Missing local manifest: ' + service.id)
  if (!service.manifest?.startsWith('/services/')) continue
  let item
  try { item = load(service.manifest) } catch (error) { failures.push('Invalid manifest ' + service.id + ': ' + error.message); continue }
  assert(item.schema === 'org.cogentia.kys.service.v0.1', 'Invalid service schema: ' + service.id)
  assert(item.id === service.id, 'Manifest ID mismatch: ' + service.id)
  assert(item.entry?.web === service.path, 'Entry path mismatch: ' + service.id)
  assert(item.policy?.pricing === 'free', 'Non-free service: ' + service.id)
  assert(item.policy?.account_required === false, 'Mandatory account: ' + service.id)
  assert(item.policy?.third_party_actions === 'none', 'Unexpected external effects: ' + service.id)
  assert(item.mandate?.requires_explicit_human_approval_for_effects === true, 'Missing mandate control: ' + service.id)
  assert(['experimental', 'tested', 'maintained'].includes(item.status), 'Invalid status: ' + service.id)
}
for (const planned of index.planned ?? []) assert(!ids.has(planned.id), 'Planned service already active: ' + planned.id)
if (failures.length) { failures.forEach(x => console.error('FAIL:', x)); process.exit(1) }
console.log('PASS: KYS Services catalogue and ' + index.services.length + ' service manifests')
