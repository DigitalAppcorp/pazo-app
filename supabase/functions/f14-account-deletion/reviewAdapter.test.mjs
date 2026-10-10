import test from 'node:test'
import assert from 'node:assert/strict'
import { getA3ReviewInventory, parseA3ReviewInventory, A3ReviewDenied } from './reviewAdapter.ts'

const OPERATOR = '11111111-1111-4111-8111-111111111111'
const SUBJECT = '22222222-2222-4222-8222-222222222222'
const inventory = Object.freeze({
  owned_pets: 1,
  owned_posts: 0,
  owned_communities: 0,
  third_party_feed_comments: 0,
  third_party_community_posts: 0,
  owned_documents: 0,
  owned_care_items: 0,
  total_storage_objects_needing_ownership_review: 1,
  destructive_execution_allowed: false,
})

function adapter({
  user = { id: OPERATOR },
  authError = null,
  grant = true,
  grantError = null,
  report = inventory,
  reportError = null,
} = {}) {
  const calls = []
  const client = {
    auth: { getUser: async (jwt) => {
      calls.push(['getUser',jwt])
      return { data: { user }, error: authError }
    } },
    rpc: async (name, args) => {
      calls.push([name,args])
      if (name === 'f14_a3_review_operator_authorized') {
        return { data: grant, error: grantError }
      }
      if (name === 'f14_a3_review_inventory') {
        return { data: report, error: reportError }
      }
      throw new Error('unknown RPC')
    },
  }
  return { client, calls }
}

test('verified operator reads only a bounded aggregate inventory', async () => {
  const {client,calls}=adapter()
  const result = await getA3ReviewInventory(client,'test-token-valid-for-length-123',SUBJECT)
  assert.deepEqual(result,inventory)
  assert.deepEqual(calls.map(([name])=>name),[
    'getUser','f14_a3_review_operator_authorized','f14_a3_review_inventory',
  ])
  assert.deepEqual(calls[1][1], {
    p_operator_user_id: OPERATOR,
    p_subject_user_id: SUBJECT,
  })
  assert.deepEqual(calls[2][1], {p_subject_user_id: SUBJECT})
  assert.equal(JSON.stringify(result).includes(OPERATOR),false)
  assert.equal(JSON.stringify(result).includes(SUBJECT),false)
})

test('invalid target or missing operator token calls no remote method', async () => {
  for (const [jwt,subject] of [
    ['',SUBJECT], ['short',SUBJECT], ['x'.repeat(8193),SUBJECT],
    ['test-token-valid-for-length-123','abc'],
    ['test-token-valid-for-length-123',''],
  ]) {
    const {client,calls}=adapter()
    await assert.rejects(getA3ReviewInventory(client,jwt,subject),A3ReviewDenied)
    assert.equal(calls.length,0)
  }
})

test('denies expired session, non-operator, same subject and DB failures', async () => {
  for (const config of [
    {user:null},
    {authError:new Error('expired')},
    {user:{id:SUBJECT}},
    {user:{id:'invalid-uuid'}},
    {grant:false},
    {grant:'true'},
    {grantError:new Error('42501')},
    {reportError:new Error('DB unavailable')},
  ]) {
    const {client,calls}=adapter(config)
    await assert.rejects(
      getA3ReviewInventory(client,'test-token-valid-for-length-123',SUBJECT),
      A3ReviewDenied,
    )
    assert.ok(!calls.some(([method]) => method === 'f14_a3_review_inventory')
      || config.reportError, JSON.stringify(config))
  }
})

test('malformed count, unexpected permission and incomplete report fail closed', async () => {
  for (const report of [
    null, [], {},
    {...inventory,destructive_execution_allowed:true},
    {...inventory,destructive_execution_allowed:'false'},
    {...inventory,owned_pets:-1},
    {...inventory,owned_pets:1.5},
    {...inventory,owned_pets:NaN},
    {...inventory,owned_pets:'1'},
    {...inventory,owned_pets:undefined},
  ]) {
    assert.throws(()=>parseA3ReviewInventory(report),A3ReviewDenied)
  }
})
