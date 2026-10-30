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
  assert(typeof item.entry?.web === 'string' && item.entry.web.startsWith('/') && !item.entry.web.startsWith('//') && /^[a-z-]+$/.test(item.entry.web.slice(1)), 'Invalid local entry route: ' + service.id)
  assert(typeof item.name === 'string' && item.name.trim().length > 0, 'Missing service name: ' + service.id)
  assert(typeof item.description === 'string' && item.description.trim().length > 0, 'Missing description: ' + service.id)
  assert(typeof item.display_category === 'string' && item.display_category.trim().length > 0, 'Missing display category: ' + service.id)
  assert(item.policy?.pricing === 'free', 'Non-free service: ' + service.id)
  assert(item.policy?.account_required === false, 'Mandatory account: ' + service.id)
  assert(item.policy?.third_party_actions === 'none', 'Unexpected external effects: ' + service.id)
  assert(item.mandate?.requires_explicit_human_approval_for_effects === true, 'Missing mandate control: ' + service.id)
  assert(['experimental', 'tested', 'maintained'].includes(item.status), 'Invalid status: ' + service.id)
}
for (const planned of index.planned ?? []) {
  assert(!ids.has(planned.id), 'Planned service already active: ' + planned.id)
  assert(typeof planned.name === 'string' && planned.name.length > 0, 'Planned service missing name')
}

// Regression guard for the pre-existing duplicate-router crash discovered in
// real Chromium testing of Personal (the production build alone did not fail).
const mainEntry = readFileSync(new URL('../apps/personal/src/main.jsx', import.meta.url), 'utf8')
const appEntry = readFileSync(new URL('../apps/personal/src/App.jsx', import.meta.url), 'utf8')
const wrapsRouter = text => /<(?:BrowserRouter|HashRouter|Router)(?:\\s|>)/.test(text)
assert(!(wrapsRouter(mainEntry) && wrapsRouter(appEntry)), 'Personal has nested top-level React Routers')

if (failures.length) { failures.forEach(x => console.error('FAIL:', x)); process.exit(1) }
console.log('PASS: KYS Services catalogue and ' + index.services.length + ' service manifests')
