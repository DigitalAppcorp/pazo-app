// Synthetic PostgreSQL only. No provider calls, hosted credentials or user data.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
const run=promisify(execFile)
const container=process.argv[2]
if(container&&!/^pazo-f17-[a-z0-9-]+$/.test(container))throw Error('Synthetic container name required')
if(!container&&!['127.0.0.1','localhost'].includes(process.env.PGHOST))throw Error('Local synthetic PostgreSQL only')
const env={...process.env,PGDATABASE:'f14_synthetic'}
for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[name]
const command=container?'docker':'psql'
const prefix=container?['--host=unix:///var/run/docker.sock','exec',container,'psql','-U','postgres','-d','f14_synthetic']:[]
const sql=async query=>run(command,[...prefix,'-X','-A','-t','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-c',query],{env,maxBuffer:65536})
await sql("DO $$ BEGIN IF current_database()<>'f14_synthetic' OR to_regclass('public.f17_lab_resources') IS NULL THEN RAISE EXCEPTION 'Synthetic fixture required'; END IF; END $$;")
const actor='f1700000-0000-4000-8000-000000000001'
const owner='f1700000-0000-4000-8000-000000000004'
const scoped=(uid,statement)=>`BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${uid}',true);SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"${uid}"}',true);${statement};COMMIT;`
const intake=id=>scoped(owner,`SELECT public.pazo_submit_support_ticket('${id}','question','Synthetic concurrent request')`)
const attempts=await Promise.allSettled(Array.from({length:12},()=>sql(intake(randomUUID()))))
assert.equal(attempts.filter(x=>x.status==='fulfilled').length,3)
for(const a of attempts)if(a.status==='rejected')assert.match(a.reason.stderr,/22023/)
assert.equal((await sql(`SELECT count(*) FROM public.pazo_support_tickets WHERE owner_id='${owner}'`)).stdout.trim(),'3')
const repeated='f1700000-0000-4000-8000-000000000099'
const duplicate=()=>sql(scoped('f1700000-0000-4000-8000-000000000003',`SELECT public.pazo_submit_support_ticket('${repeated}','question','Synthetic repeated delivery')`))
await Promise.all(Array.from({length:8},duplicate))
assert.equal((await sql(`SELECT count(*) FROM public.pazo_support_tickets WHERE id='${repeated}'`)).stdout.trim(),'1')
const revision=Number((await sql('SELECT revision FROM admin_private.pazo_app_maintenance WHERE singleton')).stdout.trim())
assert.ok(Number.isSafeInteger(revision))
const change=(enabled,expected,id)=>sql(scoped(actor,`SELECT public.pazo_admin_set_maintenance(${enabled},'Mantenimiento sintético concurrente','Synthetic concurrent maintenance',${expected},'${id}')`))
const switches=await Promise.allSettled(Array.from({length:8},()=>change(true,revision,randomUUID())))
assert.equal(switches.filter(x=>x.status==='fulfilled').length,1)
for(const a of switches)if(a.status==='rejected')assert.match(a.reason.stderr,/40001/)
await change(false,revision+1,randomUUID())
console.log(JSON.stringify({source:'f17_synthetic_pg17_concurrency',support_parallel:12,accepted:3,duplicate_parallel:8,persisted_duplicate:1,maintenance_parallel:8,accepted_switches:1,maintenance_restored:true,hosted_or_provider_calls:0,result:'PASS'}))
