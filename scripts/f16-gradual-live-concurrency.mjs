// Real PostgreSQL sessions. This runner accepts only the named disposable Docker
// database, never a Supabase URL, production connection string or PayPal client.
import {spawn,spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
const container=process.env.PAZO_GRADUAL_LAB_CONTAINER||'pazo-f16-gradual-lab'
if(!/^pazo-f16-gradual-lab(?:-[a-z0-9]+)?$/.test(container))throw Error('Disposable container required')
const args=['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','f14_synthetic']
function sql(query){const r=spawnSync('docker',args,{input:query,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim()}
function parallel(query){return new Promise((resolve,reject)=>{const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let output='',error='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>error+=d);p.on('error',reject);p.on('exit',code=>code===0?resolve(output.trim()):reject(Error(error)));p.stdin.end(query)})}
assert.equal(sql("SELECT current_database()='f14_synthetic' AND current_user='postgres' AND current_setting('server_version_num')::integer>=170000;"),'t')
sql(`TRUNCATE supporter_private.gradual_event,supporter_private.gradual_outbox,supporter_private.gradual_audit,supporter_private.gradual_incident,supporter_private.gradual_admission,supporter_private.gradual_invitation,supporter_private.gradual_interest;
UPDATE supporter_private.gradual_campaign SET lifecycle='active',capacity=1,stage='L1_FIRST_REAL',revision=100,webhook_ok_at=statement_timestamp();
UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=statement_timestamp();
INSERT INTO auth.users(id,email_confirmed_at,is_anonymous,created_at) SELECT ('83000000-0000-4000-8000-'||lpad(to_hex(n),12,'0'))::uuid,now(),false,now() FROM generate_series(1,60)n ON CONFLICT DO NOTHING;
INSERT INTO public.profiles SELECT id,true FROM auth.users WHERE id::text LIKE '83000000-%' ON CONFLICT DO NOTHING;`)
const owner=n=>`83000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`
const join=n=>`BEGIN;SET LOCAL lock_timeout='30s';SET LOCAL statement_timeout='45s';SELECT set_config('request.jwt.claim.sub','${owner(n)}',true);SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"${owner(n)}"}',true);SELECT public.pazo_gradual_interest('interest');COMMIT;`
await Promise.all(Array.from({length:25},(_,i)=>parallel(join(i+1))))
assert.equal(sql("SELECT count(*)||':'||count(*) FILTER(WHERE state='slot_granted')||':'||count(*) FILTER(WHERE state='waiting') FROM supporter_private.gradual_interest;"),'25:1:24')
console.log('PASS EVT-01 / GR-05: 25 concurrent accounts, one slot, 24 durable waiters')
await Promise.all(Array.from({length:25},(_,i)=>parallel(join(i+1))))
assert.equal(sql('SELECT count(*) FROM supporter_private.gradual_interest;'),'25')
const rereads=await Promise.all(Array.from({length:25},(_,i)=>parallel(`BEGIN;SELECT set_config('request.jwt.claim.sub','${owner(i+1)}',true);SELECT public.pazo_gradual_my_status();COMMIT;`)))
const states=rereads.map(raw=>JSON.parse(raw.split('\n').at(-1)))
assert.equal(states.filter(s=>s.myState==='slot_granted').length,1);assert.equal(states.filter(s=>s.myState==='waiting').length,24)
assert.ok(states.every(s=>s.source==='gradual_owner_v1'&&!Object.hasOwn(s,'owner_id')))
console.log('PASS EVT-09: 25 concurrent own-status reads plus interest retries preserve privacy, account dedupe and slots')
// Stage thresholds are exercised with signed ledger fixtures in kernel-pg17.sql.
// Here isolate the independent capacity invariant under 60 simultaneous writers.
sql("UPDATE supporter_private.gradual_campaign SET capacity=50,stage='L4_EXTENDED';")
await Promise.all(Array.from({length:60},(_,i)=>parallel(join(i+1))))
assert.equal(sql("SELECT count(*)||':'||count(*) FILTER(WHERE state='slot_granted')||':'||count(*) FILTER(WHERE state='waiting') FROM supporter_private.gradual_interest;"),'60:50:10')
console.log('PASS EVT-14/18: 60 concurrent accounts, exactly 50 reservations, ten waiting')
// Server boundary ignores forged browser permissions.
const waiting=sql("SELECT owner_id FROM supporter_private.gradual_interest WHERE state='waiting' ORDER BY sequence LIMIT 1;")
const denial=sql(`BEGIN;SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);SELECT public.pazo_f16_live_service_checkout_begin('${waiting}',gen_random_uuid(),1,'es',terms_version,terms_digest)->>'code' FROM supporter_private.pazo_live_offer_versions WHERE locale='es';ROLLBACK;`).split('\n').at(-1)
assert.equal(denial,'controlled_release_admission_denied')
console.log('PASS EVT-13: forged myCanCheckout cannot create an intent')
// Simultaneous durable drains do not duplicate grants or revisions.
await Promise.all(Array.from({length:15},()=>parallel("SELECT set_config('request.jwt.claims','{\"role\":\"service_role\"}',false);SELECT public.pazo_f16_gradual_tick(true);")))
assert.equal(sql("SELECT count(*) FROM supporter_private.gradual_interest WHERE slot_token IS NOT NULL;"),'50')
assert.equal(sql("SELECT mode FROM admin_private.pazo_live_release_control;"),'limited')
console.log('PASS EVT-10/14: simultaneous crash-recovery drains keep quota and limited mode')
// Fifty provider-approved original contracts consume historical capacity even
// if later canceled. These are SQL-only synthetic contracts: no provider calls.
sql(`INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state,provider_status)
SELECT 'intent-'||q.owner_id,q.owner_id,gen_random_uuid(),1,'P-ABCDEFGHIJKLMN','es',o.terms_version,o.terms_digest,true,statement_timestamp()-interval '1 minute',statement_timestamp(),'I-CAP-'||q.sequence,'bound','ACTIVE'
FROM supporter_private.gradual_interest q CROSS JOIN supporter_private.pazo_live_offer_versions o WHERE q.state='slot_granted' AND o.locale='es';
UPDATE supporter_private.gradual_interest q SET intent_id=i.intent_id,provider_started=true FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.owner_id=q.owner_id;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);SELECT public.pazo_f16_gradual_tick(true);`)
assert.equal(sql("SELECT stage||':'||(SELECT count(*) FROM supporter_private.gradual_admission) FROM supporter_private.gradual_campaign;"),'LIMITED_COMPLETE:50')
sql("UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_status='CANCELLED' WHERE owner_id::text LIKE '83000000-%';SELECT set_config('request.jwt.claims','{\"role\":\"service_role\"}',false);SELECT public.pazo_f16_gradual_tick(true);")
assert.equal(sql("SELECT count(*)||':'||count(*) FILTER(WHERE state='waiting') FROM supporter_private.gradual_interest;"),'60:10')
assert.equal(sql('SELECT count(*) FROM supporter_private.gradual_admission;'),'50')
assert.equal(sql("SELECT mode FROM admin_private.pazo_live_release_control;"),'limited')
console.log('PASS EVT-18 / GR-05/13: 50 historical admissions, cancellation frees no capacity, 51st still waiting; never public')
