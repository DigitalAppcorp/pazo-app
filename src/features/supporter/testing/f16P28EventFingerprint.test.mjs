import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto,createHmac} from 'node:crypto'
import {createP28EventFingerprint} from '../../../../supabase/functions/f16-paypal-webhook/p28EventFingerprint.mjs'
test('HMAC is keyed and matches independent known implementation',async()=>{
 const secret='server-only-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
 const event='WH-P28-SANDBOX'
 const actual=await createP28EventFingerprint({secret,cryptoImpl:webcrypto})(event)
 const expected=createHmac('sha256',secret).update(event).digest('hex')
 assert.equal(actual,expected)
 assert.notEqual(actual,createHmac('sha256',secret+'other').update(event).digest('hex'))
})
test('missing secret and malformed event fail closed',async()=>{
 assert.equal(await createP28EventFingerprint({secret:'short',cryptoImpl:webcrypto})('WH-P28-SANDBOX'),null)
 assert.equal(await createP28EventFingerprint({secret:'x'.repeat(48),cryptoImpl:webcrypto})('*'),null)
})
