import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pushOfferKind} from './pushOffer.ts'

const kind=(extra)=>pushOfferKind({environment:'available',active:false,enabled:true,closed:false,...extra})

test('the invitation appears only where alerts can work and are still off',()=>{
  assert.equal(kind(),'offer')
  assert.equal(kind({active:true}),null)
  assert.equal(kind({closed:true}),null)
  assert.equal(kind({enabled:false}),null)
  for(const environment of ['denied','unsupported','in-app-browser'])assert.equal(kind({environment}),null,environment)
})

test('an iPhone outside the Home Screen is told how to install, never asked for permission',()=>{
  assert.equal(kind({environment:'ios-needs-install',enabled:false}),'install')
  assert.equal(kind({environment:'ios-needs-install',closed:true}),null)
})

test('it waits for the first-use notice, respects a manual turn-off and never shows twice here',()=>{
  const app=readFileSync(new URL('../../App.tsx',import.meta.url),'utf8')
  assert.match(app,/usePushOffer\(Boolean\(ownPetsReady && canUseAccount && !isDemoUser && currentPet\?\.id && !firstUseHint\)\)/)
  assert.match(app,/\{canShowAppNotice && !firstUseHint && pushOffer\.kind && \(\s*<PushOfferNotice kind=\{pushOffer\.kind\} petName=\{currentPet\.name\} lang=\{lang\} onClose=\{pushOffer\.close\} \/>/)
  assert.match(app,/!firstUseHint&&!pushOffer\.kind&&/,'the supporter invitation never overlaps it')
  const hook=readFileSync(new URL('./usePushOffer.ts',import.meta.url),'utf8')
  assert.match(hook,/if \(!eligible \|\| pushOfferClosedHere\(\) \|\| pushTurnedOffHere\(\)\) return/)
  const offer=readFileSync(new URL('./pushOffer.ts',import.meta.url),'utf8')
  assert.match(offer,/const OFFER_CLOSED_KEY = 'pazo_push_offer_closed_v1'/)
  const notice=readFileSync(new URL('./PushOfferNotice.tsx',import.meta.url),'utf8')
  // Every way out (Ahora no, X, Escape, a finished or refused request) closes it for good.
  assert.equal((notice.match(/onClose\(\)|onClick=\{onClose\}|onDismiss=\{onClose\}/g)??[]).length>=4,true)
  assert.match(notice,/if \(result === 'failed'\) setFailed\(true\)\s*else onClose\(\)/)
  assert.match(notice,/Si alguien reporta haber visto a \$\{petName\}/)
  assert.match(notice,/If someone reports seeing \$\{petName\}/)
})
