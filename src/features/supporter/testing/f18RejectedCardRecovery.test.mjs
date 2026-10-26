import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ui=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
test('declined funding offers a visible way to verify and retire only the original pending request',()=>{
 assert.ok(ui.includes("if(action==='resume')setShowRestartHelp(true)"))
 assert.ok(ui.includes("<details open={showRestartHelp}"))
 assert.ok(ui.includes('¿Tu tarjeta fue rechazada? Volver a intentar'))
 assert.ok(ui.includes('confirmLiveAbandon'))
 assert.ok(ui.includes("?'abandon':'abandon_pending'"))
 assert.ok(ui.includes("setOfferRefreshRevision(n=>n+1)"))
 assert.ok(ui.includes('setRecoveryMessage(action==='))
})
