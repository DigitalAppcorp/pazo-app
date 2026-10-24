import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, existsSync, readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'

/** Hosted rows queried read-only from supabase_migrations.schema_migrations.
 * All 23 source SQL texts were compared byte-for-byte with the recorded hosted
 * statements before this filename-only alignment. Never infer identity by name.
 * This test checks the exact accepted Git blobs, not the live remote service.
 */
const verifiedPairs=[
  {
    "old": "20261005213000",
    "target": "20261006054510",
    "name": "care_agenda",
    "blob": "b7977deb06cb185856819d12f307595c2f32420c"
  },
  {
    "old": "20261006092000",
    "target": "20261006090654",
    "name": "fix_private_document_storage_policies",
    "blob": "59eeece363d10a90e81d43ff8cd6e5b4db49bbbd"
  },
  {
    "old": "20261006134500",
    "target": "20261006133945",
    "name": "trim_validation_indexes",
    "blob": "6253a25110264802ef953f170df930f199f2ccda"
  },
  {
    "old": "20261006135500",
    "target": "20261006134050",
    "name": "restore_validation_fk_indexes",
    "blob": "5db7119cd7ea011c36b7be1cb90cf5b43b2ae59f"
  },
  {
    "old": "20261007013000",
    "target": "20261007014214",
    "name": "communities_mvp_core",
    "blob": "a1975648ec6fc09f4bfe1ff13f36a0888a8cd17a"
  },
  {
    "old": "20261007015000",
    "target": "20261007014624",
    "name": "fix_community_storage_policies",
    "blob": "2e84d9cd8178298e9103312f1950b0dad81066c4"
  },
  {
    "old": "20261007025000",
    "target": "20261007023927",
    "name": "harden_community_extension_experiment_eligibility",
    "blob": "954eac71e43f1fa43d690cb193d48651bd46623c"
  },
  {
    "old": "20261007054500",
    "target": "20261007053859",
    "name": "fix_place_checkin_checkout_rls",
    "blob": "08721fcb874a7367279281647a82da004f4f6b93"
  },
  {
    "old": "20261007073500",
    "target": "20261007072355",
    "name": "place_extension_experiments",
    "blob": "4141ae8205ea6513ec53870b937e0357739f6634"
  },
  {
    "old": "20261012063205",
    "target": "20261012071140",
    "name": "f14_one_object_admin_reconcile",
    "blob": "064cfb8d9b51c6603bfddf3d61001138e8f4820e"
  },
  {
    "old": "20261018165000",
    "target": "20261018132808",
    "name": "f16_sandbox_v2_append_only_checkout_retries",
    "blob": "98d79af354878fde25cee58521f271084290568e"
  },
  {
    "old": "20261018170000",
    "target": "20261018132828",
    "name": "f16_sandbox_v2_multiattempt_account_read_and_finance",
    "blob": "578169cc6964c8f40b27ee0aa284275c9dc3dbd9"
  },
  {
    "old": "20261018190000",
    "target": "20261018154128",
    "name": "f16_v2_created_webhook_candidate_readonly",
    "blob": "e7faf832cbf4bd085e20e6a7acb442533a1db659"
  },
  {
    "old": "20261018193000",
    "target": "20261018163723",
    "name": "f16_sandbox_fresh_owner_qa_admission",
    "blob": "2c08471a25fd50fa0f1693891ab56023f463cb85"
  },
  {
    "old": "20261018201000",
    "target": "20261018170858",
    "name": "f16_local_sandbox_automatic_qa_admission",
    "blob": "1501ba6853adf797a031f156891a7725265d4cc9"
  },
  {
    "old": "20261018213000",
    "target": "20261018184603",
    "name": "f16_sandbox_qa_owner_membership_read",
    "blob": "85b4bc8f1753eb8b9ef227e155e67247909fcb32"
  },
  {
    "old": "20261019044000",
    "target": "20261019042653",
    "name": "f16_sandbox_v2_pending_abandonment_preflight",
    "blob": "71e19348db6df34061ebe69a4dd2a87dac340a8e"
  },
  {
    "old": "20261019092000",
    "target": "20261019134346",
    "name": "f16_sandbox_v2_automatic_reconciled_retry",
    "blob": "61f7e975220033bee0d18594685fcbf75287aa45"
  },
  {
    "old": "20261019150000",
    "target": "20261019150118",
    "name": "f16_sandbox_qa_two_abandoned_v2_reset",
    "blob": "485eabd4d394d15f361bf503351679528212e822"
  },
  {
    "old": "20261019180000",
    "target": "20261019173620",
    "name": "f16_qa_pending_approval_restart",
    "blob": "71682aee35ef27b8c3a1ca1fd0b3a59dbcf9eaa8"
  },
  {
    "old": "20261019193000",
    "target": "20261019175722",
    "name": "f16_qa_repeat_abandonment_restart",
    "blob": "3457b012cb74f1c2281d1ed3038cd8d0f17b5292"
  },
  {
    "old": "20261019195500",
    "target": "20261019183232",
    "name": "pazo_admin_paypal_gateway_settings",
    "blob": "dac501dabb42b22196bdc6e1984e4537d7cb0024"
  },
  {
    "old": "20261020200800",
    "target": "20261020200238",
    "name": "pazo_f16_secret_provision_audit_guarded",
    "blob": "17ffb4a11bdc0c446e4f7dad965a9e87c0925859"
  }
]
const base=new URL('../supabase/migrations/',import.meta.url)
function gitBlobHash(buffer){
  const prefix=Buffer.from('blob '+buffer.length+'\0')
  return createHash('sha1').update(Buffer.concat([prefix,buffer])).digest('hex')
}

test('23 hosted-identical migrations have recorded versions without SQL modification',()=>{
  for(const {old,target,name,blob} of verifiedPairs){
    const oldPath=new URL(old+'_'+name+'.sql',base)
    const hostedPath=new URL(target+'_'+name+'.sql',base)
    assert.equal(existsSync(oldPath),false,'obsolete local migration name '+old)
    assert.equal(existsSync(hostedPath),true,'missing hosted-version migration '+target)
    assert.equal(gitBlobHash(readFileSync(hostedPath)),blob,name+' SQL changed after hosted byte identity verification')
  }
})

test('migration versions remain unique after safe historical reconciliation',()=>{
  const names=readdirSync(base).filter(n=>/^\d{14}_.+\.sql$/.test(n))
  assert.equal(new Set(names.map(n=>n.slice(0,14))).size,names.length)
  assert.equal(verifiedPairs.length,23)
})

// NOTE: Additional mismatches and unmatched historic migrations remain.
// Successful execution is NOT authorization for a production db push.
