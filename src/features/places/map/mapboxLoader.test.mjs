import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMapboxGl } from './mapboxLoader.ts'

const SCRIPT_ID = 'pazo-mapbox-gl-script'
const STYLE_ID = 'pazo-mapbox-gl-style'

const browser = (t) => {
  const elements = new Map()
  const requests = []
  const timers = new Map()
  let nextTimer = 0
  class Element extends EventTarget {
    sheet = null
    remove() { elements.delete(this.id) }
  }
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const window = {
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id },
    clearTimeout(id) { timers.delete(id) },
  }
  const document = {
    getElementById(id) { return elements.get(id) ?? null },
    createElement() { return new Element() },
    head: {
      appendChild(element) { elements.set(element.id, element); requests.push(element) },
    },
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document })
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else delete globalThis.document
  })
  const emit = (id, event) => elements.get(id).dispatchEvent(new Event(event))
  const loadStyles = () => {
    elements.get(STYLE_ID).sheet = {}
    emit(STYLE_ID, 'load')
  }
  return { elements, requests, timers, window, emit, loadStyles }
}

test('concurrent mounts share CDN requests and wait for both JavaScript and CSS', async (t) => {
  const b = browser(t)
  const first = loadMapboxGl()
  const second = loadMapboxGl()
  assert.equal(first, second)
  assert.equal(b.requests.length, 2)
  let resolved = false
  first.then(() => { resolved = true })
  const module = { Map: class {} }
  b.window.mapboxgl = module
  b.emit(SCRIPT_ID, 'load')
  await Promise.resolve()
  assert.equal(resolved, false, 'Unstyled map must not initialize before CSS')
  b.loadStyles()
  assert.equal(await first, module)
  assert.equal(b.timers.size, 0)
  assert.equal(await loadMapboxGl(), module)
  assert.equal(b.requests.length, 2, 'Ready assets are reused')
})

test('script failure rejects all callers and the next visit makes a fresh request', async (t) => {
  const b = browser(t)
  const first = loadMapboxGl()
  const second = loadMapboxGl()
  const rejected = Promise.all([
    assert.rejects(first, /Mapbox GL JS no pudo cargarse/),
    assert.rejects(second, /Mapbox GL JS no pudo cargarse/),
  ])
  b.loadStyles()
  b.emit(SCRIPT_ID, 'error')
  await rejected
  assert.equal(b.elements.has(SCRIPT_ID), false)
  assert.equal(b.elements.has(STYLE_ID), true, 'A usable stylesheet is retained')
  assert.equal(b.timers.size, 0)
  const retry = loadMapboxGl()
  assert.equal(b.requests.length, 3)
  b.window.mapboxgl = { Map: class {} }
  b.emit(SCRIPT_ID, 'load')
  assert.equal(await retry, b.window.mapboxgl)
})

test('a hung CDN request times out, removes pending tags and can recover', async (t) => {
  const b = browser(t)
  const first = loadMapboxGl()
  const rejected = assert.rejects(first, /agotó el tiempo/)
  for (const callback of [...b.timers.values()]) callback()
  await rejected
  assert.equal(b.elements.size, 0)
  assert.equal(b.timers.size, 0)
  const retry = loadMapboxGl()
  b.window.mapboxgl = { Map: class {} }
  b.emit(SCRIPT_ID, 'load')
  b.loadStyles()
  assert.equal(await retry, b.window.mapboxgl)
})

test('a failed stylesheet retries without fetching an already loaded library again', async (t) => {
  const b = browser(t)
  const first = loadMapboxGl()
  const rejected = assert.rejects(first, /estilos de Mapbox/)
  b.window.mapboxgl = { Map: class {} }
  b.emit(SCRIPT_ID, 'load')
  b.emit(STYLE_ID, 'error')
  await rejected
  assert.equal(b.elements.has(STYLE_ID), false)
  const retry = loadMapboxGl()
  b.loadStyles()
  assert.equal(await retry, b.window.mapboxgl)
  assert.equal(b.requests.filter(element => element.id === SCRIPT_ID).length, 1)
  assert.equal(b.requests.filter(element => element.id === STYLE_ID).length, 2)
})
