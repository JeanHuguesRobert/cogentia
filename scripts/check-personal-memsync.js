import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mirrorLearnedContext } from '../apps/personal/src/lib/learned-context-ingest.js'
import {
  emptyLog, exportPersonalData, loadBrowserTurnLog, purgeBrowserContinuityData,
  recordParsedResponse, recordPromptCopy, saveBrowserEnrolmentPreferences, saveBrowserTurnLog,
  startNextObservation, updateTurnReview, TURN_LOG_KEY, DRAFT_KEY,
} from '../apps/personal/src/lib/turns.js'
import { buildMultiAgentComparison } from './lib/agent-context-comparison.js'
import { inspectCogentiaSelfModel } from './lib/cogentia-introspection.js'
import { ENROLMENT_PREFS_KEY, inspectContinuityState } from './lib/progressive-enrolment.js'

const now = '2026-10-23T20:00:00Z'
const original = JSON.stringify({
  snapshot_version: 'kys-snapshot-0.1',
  agent: { provider: 'Synthetic A', model: 'model-a', context_scope: 'Synthetic only' },
  known: [{ claim: 'I prefer morning meetings.', basis: 'A claimed observation', confidence: 'high' }],
  unknowns: [{ claim: 'Unknown workplace.' }],
  extra: { nested: 'Retain unknown fields in the exact original' },
})
const yaml = fs.readFileSync(new URL('../prompts/fixtures/agent-acquired-context/rich-memory.yaml', import.meta.url), 'utf8')
const portrait = await mirrorLearnedContext(original)
const memory = await mirrorLearnedContext(yaml)
assert.equal(portrait.advanced.layer, 'kys_snapshot_portrait')
assert.equal(memory.advanced.layer, 'normalized_snapshot')
assert.equal(portrait.claim_status, 'agent_claim_not_fact')
assert.equal(portrait.raw.text, original)
assert.equal(memory.raw.text, yaml)
assert.equal(portrait.categories[0].items[0].claimed_origin, 'unknown')
assert.equal(memory.categories[0].items[0].claimed_origin, 'explicit_user_statement')

let log = recordParsedResponse(emptyLog(now), 1, {
  text: original, pastedAt: now, snapshot: null, mirror: portrait, keepReviews: false,
})
log = updateTurnReview(log, 1, 'known-0', { verdict: 'rejected', note: 'Synthetic correction' }, 'capture:synthetic')
log = startNextObservation(log, now)
log = recordParsedResponse(log, 2, {
  text: yaml, pastedAt: now, snapshot: null, mirror: memory, keepReviews: false,
})
const exported = JSON.parse(JSON.stringify(exportPersonalData(log, { statedIntention: 'synthetic' })))
assert.equal(exported.turnLog.turns[0].response.text, original)
assert.equal(exported.turnLog.turns[1].response.text, yaml)
assert.equal((await mirrorLearnedContext(exported.turnLog.turns[0].response.text)).raw.text, original)
assert.equal((await mirrorLearnedContext(exported.turnLog.turns[1].response.text)).raw.text, yaml)
assert.equal(exported.turnLog.turns[0].reviews['known-0'].verdict, 'rejected')
assert.equal(exported.turnLog.turns[0].mirror.categories[0].items[0].content, 'I prefer morning meetings.')
const comparison = buildMultiAgentComparison(log.turns.map((turn) => ({ ...turn, snapshot: turn.mirror })))
assert.equal(comparison.snapshotsCount, 2)
assert.equal(comparison.epistemicInvariants.majorityVoteNeverBecomesTruth, true)
assert.match(JSON.stringify(comparison.agents), /Synthetic A/)
assert.match(JSON.stringify(comparison.agents), /example-agent/)
assert.equal(inspectContinuityState(log).snapshotsCount, 2)
assert.equal(inspectCogentiaSelfModel({ turnLog: log }).what_is_being_used_now.has_active_snapshot, true)

// Declared contradictions survive extraction into the comparison projection.
const contradictory = structuredClone(memory)
const claims = contradictory.categories[0].items
claims.push({ ...claims[0], id: 'opposite', content: 'An explicitly contradictory synthetic claim.', contradicts: [claims[0].id] })
const conflict = buildMultiAgentComparison([
  { number: 1, snapshot: memory }, { number: 2, snapshot: contradictory },
])
assert.ok(conflict.divergences.length > 0)

const storage = {
  data: new Map([['unrelated', 'preserve']]),
  getItem(key) { return this.data.get(key) ?? null },
  setItem(key, value) { this.data.set(key, String(value)) },
  removeItem(key) { this.data.delete(key) },
}
globalThis.window = { localStorage: storage }
const copiedPrompt = recordPromptCopy(emptyLog(now), 1, 'A synthetic prompt', now)
saveBrowserTurnLog(copiedPrompt)
assert.equal(loadBrowserTurnLog().turns[0].prompt.copied_text, 'A synthetic prompt')
assert.equal(inspectContinuityState(copiedPrompt).hasRetainedData, true)
saveBrowserTurnLog(log)
assert.equal(loadBrowserTurnLog().turns[1].mirror.raw.text, yaml)
saveBrowserEnrolmentPreferences({ disableLocalPersistence: true, statedIntention: 'private intent' })
saveBrowserTurnLog(log)
assert.equal(storage.getItem(TURN_LOG_KEY), null)
assert.equal(storage.getItem(DRAFT_KEY), null)
assert.deepEqual(JSON.parse(storage.getItem(ENROLMENT_PREFS_KEY)), { disableLocalPersistence: true })
assert.equal(loadBrowserTurnLog().turns[1].response.text, yaml)
purgeBrowserContinuityData()
saveBrowserEnrolmentPreferences({})
saveBrowserTurnLog(emptyLog(now))
assert.deepEqual([...storage.data.entries()], [['unrelated', 'preserve']])

// Replacing an observed reply with unreadable text cannot preserve its old claims.
const replaced = recordParsedResponse(log, 2, { text: 'invalid', pastedAt: now, snapshot: null, mirror: null, keepReviews: false })
assert.equal(replaced.turns[1].mirror, null)
assert.equal(replaced.turns[1].snapshot, null)
console.log('personal memsync: contracts, comparison, export and retention PASS')

if (process.argv.includes('--render')) {
  const { createServer } = await import('../apps/personal/node_modules/vite/dist/node/index.js')
  const React = await import('../apps/personal/node_modules/react/index.js')
  const { renderToStaticMarkup } = await import('../apps/personal/node_modules/react-dom/server.js')
  const { MemoryRouter } = await import('../apps/personal/node_modules/react-router-dom/dist/index.mjs')
  const server = await createServer({
    root: new URL('../apps/personal/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    server: { middlewareMode: true },
    appType: 'custom',
  })
  try {
    const { AppRoutes } = await server.ssrLoadModule('/src/App.jsx')
    for (const route of ['/', '/snapshot', '/mirror', '/indicators', '/more']) {
      const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(AppRoutes)))
      assert.doesNotMatch(html, /type="email"/)
      assert.match(html, /Que savent mes IA de moi/)
      if (route === '/') assert.match(html, /Quelle vérité utile m&#x27;échappe \?/)
      if (route === '/indicators') assert.match(html, /73 indicateurs, plusieurs façons de lire un portrait/)
      if (route === '/more') assert.match(html, /Vous êtes venu par curiosité/)
    }
    const card = await server.ssrLoadModule('/src/components/BlindSpotCard.jsx')
    assert.equal(card.BLIND_SPOT_PROMPT, "Quelle vérité utile m'échappe ?")
    console.log('personal memsync: anonymous route rendering and exact primary prompt PASS')
  } finally {
    await server.close()
  }
}
