// The SQL dispatcher and the worker must agree: pg_net sends `{}` by default and
// the worker refuses any body. This mismatch stopped every CAPI send in production.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {createMetaWorkerHandler} from '../supabase/functions/pazo-meta-worker/workerCore.mjs'
import {currentTickBodyArgument} from './meta-worker-dispatch-source.mjs'

const TOKEN='a'.repeat(64)
const handler=()=>createMetaWorkerHandler({
 released:true,privacyReviewed:true,matchFieldsApproved:true,providerApproved:true,
 authenticate:async()=>true,run:async()=>({status:'accepted'}),
})
const post=body=>new Request('https://isolated.invalid/worker',{
 method:'POST',headers:{authorization:'Bearer '+TOKEN},body,
})

test('the current tick dispatches with no body',()=>{
 assert.equal(currentTickBodyArgument(),'NULL')
})

test('the worker accepts no body and refuses what pg_net sends by default',async()=>{
 assert.equal((await handler()(post(undefined))).status,200)
 assert.equal((await handler()(post('{}'))).status,400)
})

test('the local lab runs on pull requests to main and when the SQL changes',()=>{
 const workflow=readFileSync('.github/workflows/meta-auth-local-lab.yml','utf8')
 assert.match(workflow,/branches: \[[^\]]*\bmain\b/)
 assert.match(workflow,/supabase\/migrations\/2026110\*_pazo_meta_\*\.sql/)
 assert.match(workflow,/scripts\/meta-worker-dispatch-source\.mjs/)
})
