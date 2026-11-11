#!/usr/bin/env node
// Browser smoke test: catch runtime failures that a Vite build cannot detect.
// Launches a local headless Chrome/Chromium and reads the rendered React DOM via CDP.
// Requires a local preview server at KYS_SMOKE_URL (default 127.0.0.1:4177).
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const base = process.env.KYS_SMOKE_URL || 'http://127.0.0.1:4177'
const port = 19339
const profile = await mkdtemp(join(tmpdir(), 'kys-smoke-'))
const browser = process.env.CHROME_BIN || 'google-chrome'
const child = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-first-run', '--no-default-browser-check',
  '--remote-allow-origins=*', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

let ws
let seq = 0
const pending = new Map()
const exceptions = []
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const check = (ok, why) => { if (!ok) throw new Error(why) }

async function connect() {
  for (let attempt = 0; attempt < 35; attempt++) {
    if (child.exitCode !== null) throw new Error(`Chrome exited: ${child.exitCode}`)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (response.ok) {
        const tabs = await response.json()
        const page = tabs.find(tab => tab.type === 'page')
        if (page) return page
      }
    } catch { /* browser still starting */ }
    await sleep(200)
  }
  throw new Error('Chrome DevTools endpoint did not start')
}

async function snapshot(path, width) {
  await call('Emulation.setDeviceMetricsOverride', {
    width, height: 844, deviceScaleFactor: 1, mobile: width < 600,
  })
  exceptions.length = 0
  await call('Page.navigate', { url: base + path })
  for (let attempt = 0; attempt < 35; attempt++) {
    await sleep(200)
    const reply = await call('Runtime.evaluate', {
      expression: `(() => ({ text: document.body.innerText, root: document.querySelector('#root')?.childElementCount || 0, overflow: document.documentElement.scrollWidth > innerWidth, services: [...document.querySelectorAll('main article h3')].map(n => n.textContent), promptLength: document.getElementById('rights-prompt')?.value.length || 0 }))()`,
      returnByValue: true,
    })
    const result = reply.result?.value
    if (result?.root && (path === '/services' ? result.services.length >= 6 : result.text?.includes('Et si vous aviez droit au RSA'))) {
      check(!result.overflow, `Horizontal overflow at ${width}px ${path}`)
      check(exceptions.length === 0, `Browser exception: ${exceptions.join('; ')}`)
      if (path === '/services') {
        check(result.services.length === 6, 'Expected two published and four planned services')
      } else {
        check(result.promptLength >= 200, 'RSA prompt not rendered')
      }
      console.log(`PASS browser ${width}px ${path}`)
      return
    }
  }
  throw new Error(`React did not render ${path} at ${width}px. ${exceptions.join('; ')}`)
}

try {
  // The CI preview command starts asynchronously; allow its HTTP listener to bind.
  let previewReady = false
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(base + '/services')).ok) { previewReady = true; break }
    } catch { /* preview still starting */ }
    await sleep(200)
  }
  check(previewReady, 'Vite preview server unavailable after 10 seconds')
  const tab = await connect()
  ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error('CDP WebSocket failed'))
  })
  ws.onmessage = event => {
    const item = JSON.parse(event.data)
    if (item.id && pending.has(item.id)) {
      const cb = pending.get(item.id)
      pending.delete(item.id)
      item.error ? cb.reject(new Error(item.error.message)) : cb.resolve(item.result)
    }
    if (item.method === 'Runtime.exceptionThrown') {
      exceptions.push(item.params.exceptionDetails.exception?.description || item.params.exceptionDetails.text)
    }
  }
  await call('Page.enable')
  await call('Runtime.enable')
  for (const width of [1280, 390]) {
    for (const path of ['/services', '/rights']) await snapshot(path, width)
  }
} catch (error) {
  console.error('FAIL browser smoke:', error.message)
  process.exitCode = 1
} finally {
  ws?.close()
  child.kill('SIGTERM')
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
}
