import assert from 'node:assert/strict'
import {spawn,execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
// Connection coordinates are intentionally fixed to the disposable laboratory.
const psql=process.env.F14_PSQL || 'psql'
const args=['-X','-h','127.0.0.1','-p','55441','-U','f14_admin','-d','f14_synthetic','-Atq','-v','ON_ERROR_STOP=1']
const dir=new URL('../supabase/tests/f14/',import.meta.url)
function sql(q){return execFileSync(psql,[...args,'-c',q],{encoding:'utf8',timeout:20000}).trim()}
function file(name,prepare=true){execFileSync(psql,[...args,'-c',`SET client_min_messages='warning';SET pazo.test.prepare_claims='${prepare}';`,'-f',fileURLToPath(new URL(name,dir))],{encoding:'utf8',timeout:20000})}
function cleanup(){if(sql("SELECT to_regclass('f14_lab.test_case') IS NOT NULL") === 't')file('cleanup.sql')}
let sequence=0;const sessions=[]
function session(label){
 const child=spawn(psql,args,{env:{...process.env,PGAPPNAME:'f14_lab_'+label},stdio:['pipe','pipe','pipe']});sessions.push(child)
 let output='',error='',pending
 child.stdout.on('data',x=>{output+=x;check()});child.stderr.on('data',x=>{error+=x})
 child.on('error',e=>pending?.reject(e));child.on('exit',code=>{if(pending)pending.reject(Error(error||'psql exited '+code))})
 function check(){if(pending&&output.includes(pending.marker)){const end=output.indexOf(pending.marker);const value=output.slice(0,end).trim();output=output.slice(end+pending.marker.length);clearTimeout(pending.timer);pending.resolve(value);pending=null}}
 return {label,query(q){assert.ok(!pending);return new Promise((resolve,reject)=>{const marker='f14_marker_'+(++sequence);const timer=setTimeout(()=>{child.kill();reject(Error('psql session timeout'))},15000);pending={marker,resolve,reject,timer};child.stdin.write(q+`\nSELECT '${marker}';\n`);check()})},close(){return new Promise(resolve=>{child.once('exit',resolve);child.stdin.end('ROLLBACK;\n\\q\n')})}}
}
const lit=v=>"'"+v.replaceAll("'","''")+"'"
const service="SET LOCAL ROLE service_role; SET LOCAL request.jwt.claims='{\"role\":\"service_role\"}'; SET LOCAL request.jwt.claim.role='';"
const auth=c=>`SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='${c.other_owner}';SET LOCAL request.jwt.claims='{"role":"authenticated","sub":"${c.other_owner}"}';`
const gate=(c,stage)=>`public.f14_moderation_media_gate('${c.kind}','${c.target}','${c.bucket}','${c.path}','${c.url}','${stage}')`
const prepare=c=>`public.f14_prepare_media_claim('${c.kind}','${c.target}')`
const getCase=()=>JSON.parse(sql("SELECT row_to_json(c) FROM f14_lab.test_case c WHERE kind='feed_post'"))
const results=[];function pass(name){results.push(name);console.log('PASS '+name)}
async function blocked(label){const end=Date.now()+8000;while(Date.now()<end){if(sql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='f14_lab_${label}' AND wait_event_type='Lock')`)==='t')return;await new Promise(r=>setTimeout(r,25))}throw Error('Expected a real two-session lock wait')}
try {
 assert.equal(sql("SELECT current_database()='f14_synthetic' AND session_user='f14_admin' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999"),'t')
 cleanup();file('concurrency-fixture.sql');let c=getCase()
 const a=session('purger'),b=session('writer')
 assert.equal(await a.query(`BEGIN;${service}SELECT ${gate(c,'preflight')};COMMIT;`),'t')
 const denied=await b.query(`BEGIN;${auth(c)}DO $$ BEGIN UPDATE public.profiles SET avatar_url=${lit(c.url+'?v=synthetic')} WHERE id='${c.other_owner}';RAISE EXCEPTION 'unsafe alias accepted';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;END $$;COMMIT;`)
 assert.equal(denied,'');assert.equal(sql(`SELECT avatar_url IS NULL FROM public.profiles WHERE id='${c.other_owner}'`),'t');pass('authenticated alias after committed preflight rejected; object preserved')
 assert.equal(await a.query(`BEGIN;${service}SELECT public.f14_recheck_media_claim('${c.claim}');COMMIT;`),'t')
 await b.query(`BEGIN;${auth(c)}DO $$ BEGIN UPDATE public.profiles SET avatar_url=${lit(c.url+'#after-recheck')} WHERE id='${c.other_owner}';RAISE EXCEPTION 'alias after recheck accepted';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;END $$;COMMIT;`);pass('alias between recheck and simulated removal rejected')
 assert.equal(await a.query(`BEGIN;${service}SELECT ${gate(c,'complete')};COMMIT;`),'f');pass('present Storage metadata prevents completion')
 // Trusted local simulation of the Storage API's own metadata deletion path.
 sql(`BEGIN;${service}SET LOCAL storage.allow_delete_query='true';DELETE FROM storage.objects WHERE bucket_id='${c.bucket}' AND name='${c.path}';COMMIT;`)
 assert.equal(await a.query(`BEGIN;${service}SELECT ${gate(c,'complete')};`),'t')
 const retry=b.query(`BEGIN;${service}SELECT ${gate(c,'complete')};COMMIT;`)
 await blocked('writer');await a.query('COMMIT;');assert.equal(await retry,'t');pass('two concurrent completions serialize and retry idempotently')
 await a.query(`BEGIN;${service}SELECT ${gate(c,'complete')};COMMIT;`)
 sql("UPDATE moderation_private.media_claims SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour'")
 await b.query(`BEGIN;${auth(c)}DO $$ BEGIN UPDATE public.profiles SET avatar_url=${lit(c.url+'#late')} WHERE id='${c.other_owner}';RAISE EXCEPTION 'post-purge alias accepted';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;END $$;COMMIT;`);pass('claim remains a writer barrier after purged and expiry')
 await a.close();await b.close();cleanup()

 // Claim-before-writer: an uncommitted held claim must be visible on wake-up.
 file('concurrency-fixture.sql',false);c=getCase();const claimant=session('claimant'),writer=session('late_writer')
 assert.match(await claimant.query(`BEGIN;${service}SELECT ${prepare(c)};`),/candidate_only/)
 const attachment=writer.query(`BEGIN;${auth(c)}DO $$ BEGIN UPDATE public.profiles SET avatar_url=${lit(c.url+'?v=synthetic')} WHERE id='${c.other_owner}';RAISE EXCEPTION 'uncommitted claim missed';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;END $$;COMMIT;`)
 await blocked('late_writer');await claimant.query('COMMIT;');assert.equal(await attachment,'');pass('writer waits for claim commit then rejects using a fresh snapshot')
 await claimant.close();await writer.close();cleanup()

 // Writer-before-claim: pending reference must be counted after it commits.
 file('concurrency-fixture.sql',false);c=getCase();const early=session('early_writer'),late=session('late_claimant')
 await early.query(`BEGIN;${auth(c)}UPDATE public.profiles SET avatar_url=${lit(c.url+'?v=synthetic')} WHERE id='${c.other_owner}';`)
 const unavailable=late.query(`BEGIN;${service}DO $$ BEGIN PERFORM ${prepare(c)};RAISE EXCEPTION 'shared object claim accepted';EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'manual review: source/object proof unavailable' THEN RAISE; END IF;END $$;COMMIT;`)
 await blocked('late_claimant');await early.query('COMMIT;');assert.equal(await unavailable,'');assert.equal(sql('SELECT count(*) FROM moderation_private.media_claims'),'0');pass('claim waits for earlier writer and rejects committed shared reference')
 await early.close();await late.close();cleanup()

 // Real RLS race: DELETE qualification predates the row-lock wait. The BEFORE
 // trigger must see the claim committed after the statement snapshot began.
 file('concurrency-fixture.sql',false);c=getCase();const storageClaim=session('storage_claim'),storageWriter=session('storage_writer')
 assert.match(await storageClaim.query(`BEGIN;${service}SELECT ${prepare(c)};`),/candidate_only/)
 const metadataDelete=storageWriter.query(`BEGIN;${auth({...c,other_owner:c.owner_id})}SET LOCAL storage.allow_delete_query='true';DO $$ BEGIN DELETE FROM storage.objects WHERE bucket_id='${c.bucket}' AND name='${c.path}';RAISE EXCEPTION 'stale RLS deleted held object';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held Storage mutation requires exact verified server removal' THEN RAISE; END IF;END $$;COMMIT;`)
 await blocked('storage_writer');await storageClaim.query('COMMIT;');assert.equal(await metadataDelete,'')
 assert.equal(sql(`SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='${c.bucket}' AND name='${c.path}')`),'t');pass('RLS DELETE begun before claim commit is rejected after the actual row-lock wait')
 await storageClaim.close();await storageWriter.close();cleanup()

 file('concurrency-fixture.sql');c=getCase();const stale=session('stale'),svc=session('service_writer')
 await stale.query(`BEGIN ISOLATION LEVEL REPEATABLE READ;${auth(c)}DO $$ BEGIN UPDATE public.profiles SET avatar_url=${lit(c.url)} WHERE id='${c.other_owner}';RAISE EXCEPTION 'stale snapshot accepted';EXCEPTION WHEN serialization_failure THEN NULL;END $$;COMMIT;`);pass('repeatable-read reference writes fail closed')
 await svc.query(`BEGIN;${service}DO $$ BEGIN UPDATE public.profiles SET avatar_url=${lit(c.url)} WHERE id='${c.other_owner}';RAISE EXCEPTION 'BYPASSRLS bypassed writer barrier';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;END $$;COMMIT;`);pass('service_role cannot bypass the trigger by bypassing RLS')
 await svc.query(`BEGIN;${service}DO $$ BEGIN UPDATE storage.objects SET version='synthetic-replacement' WHERE bucket_id='${c.bucket}' AND name='${c.path}';RAISE EXCEPTION 'server replaced held version';EXCEPTION WHEN check_violation THEN IF SQLERRM<>'F14 held Storage mutation requires exact verified server removal' THEN RAISE; END IF;END $$;COMMIT;`);pass('service_role cannot replace a held Storage version')
 assert.equal(await svc.query(`BEGIN;${service}SELECT ${gate(c,'preflight')};ROLLBACK;`),'t');pass('failed writer transactions preserve claim and preflight')
 await stale.close();await svc.close();cleanup()
 console.log(JSON.stringify({postgresConcurrency:'PASS LOCAL',cases:results.length}))
} finally {for(const child of sessions)if(child.exitCode===null)child.kill()}
