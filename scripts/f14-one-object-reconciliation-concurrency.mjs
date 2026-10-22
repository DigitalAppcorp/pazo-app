import assert from 'node:assert/strict'
import {spawn,execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

// No hosted connection, passwords or project secrets. PG17 service at
// localhost:55441 is created anew by this GitHub Actions job.
const psql=process.env.F14_PSQL||'psql'
const args=['-X','-h','127.0.0.1','-p','55441','-U','f14_admin',
  '-d','f14_synthetic','-Atq','-v','ON_ERROR_STOP=1']
const run=q=>execFileSync(psql,[...args,'-c',q],{encoding:'utf8',timeout:18000}).trim()
assert.equal(run("SELECT current_database()='f14_synthetic' AND session_user='f14_admin' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999"),'t')
execFileSync(psql,[...args,'-f',fileURLToPath(new URL('../supabase/tests/f14/one-object-reconcile-concurrency-fixture.sql',import.meta.url))],
  {encoding:'utf8',timeout:20000})
const c=JSON.parse(run('SELECT row_to_json(c) FROM f14_lab.reconcile_case c LIMIT 1'))
assert.equal(run(`SELECT count(*) FROM storage.objects WHERE id='${c.storage_id}'`),'1')
const service=`SET LOCAL ROLE service_role;SET LOCAL request.jwt.claims='{"role":"service_role"}';SET LOCAL request.jwt.claim.role='';`
const reconcile=`public.f14_finalize_one_object_reconciliation('feed_post','${c.post_id}','${c.storage_id}')`

// Reproduce only the already completed Storage API metadata transition, against
// synthetic bytes/rows. Never send requests to hosted Storage.
run(`BEGIN;${service}SET LOCAL storage.allow_delete_query='true';
  DELETE FROM storage.objects WHERE bucket_id='post-photos' AND name='${c.path}';COMMIT;`)
assert.equal(run(`SELECT count(*) FROM storage.objects WHERE id='${c.storage_id}'`),'0')
run(`UPDATE moderation_private.media_claims
  SET created_at=clock_timestamp()-interval '2 hours',
      expires_at=clock_timestamp()-interval '1 hour'
  WHERE claim_id='${c.claim_id}'`)

const children=[]
let sequence=0
function session(label){
  const child=spawn(psql,args,{env:{...process.env,PGAPPNAME:'f14_reconcile_'+label},stdio:['pipe','pipe','pipe']})
  children.push(child)
  let stdout='',stderr='',pending=null
  child.stdout.on('data',x=>{stdout+=x;flush()})
  child.stderr.on('data',x=>{stderr+=x})
  child.on('exit',code=>{if(pending){clearTimeout(pending.timer);pending.reject(Error(stderr||'psql exited '+code));pending=null}})
  function flush(){
    if(!pending || !stdout.includes(pending.marker))return
    const cut=stdout.indexOf(pending.marker)
    const value=stdout.slice(0,cut).trim()
    stdout=stdout.slice(cut+pending.marker.length)
    clearTimeout(pending.timer);pending.resolve(value);pending=null
  }
  return {
    query(q){
      assert.equal(pending,null)
      return new Promise((resolve,reject)=>{
        const marker='f14_reconcile_marker_'+(++sequence)
        const timer=setTimeout(()=>{child.kill();reject(Error('psql lock wait timeout'))},15000)
        pending={marker,resolve,reject,timer}
        child.stdin.write(q+`\nSELECT '${marker}';\n`)
        flush()
      })
    },
    async close(){if(child.exitCode!==null)return;return new Promise(resolve=>{child.once('exit',resolve);child.stdin.end('ROLLBACK;\n\\q\n')})}
  }
}
const a=session('first'),b=session('second')
async function hasWait(label){
  const stop=Date.now()+8000
  while(Date.now()<stop){
    const q=`SELECT EXISTS(SELECT 1 FROM pg_stat_activity
      WHERE application_name='f14_reconcile_${label}' AND wait_event_type='Lock')`
    if(run(q)==='t')return true
    await new Promise(r=>setTimeout(r,25))
  }
  return false
}
try{
  assert.equal(await a.query(`BEGIN;${service}SELECT ${reconcile};`),'t')
  const waiting=b.query(`BEGIN;${service}SELECT ${reconcile};COMMIT;`)
  assert.equal(await hasWait('second'),true,'second reconciliation must wait on row lock')
  assert.equal(await a.query('COMMIT;'),'')
  assert.equal(await waiting,'t','second reconciliation must be idempotent')
  assert.equal(run(`SELECT media_status FROM moderation_private.content_restrictions
    WHERE target_kind='feed_post' AND target_id='${c.post_id}'`),'purged')
  assert.equal(run(`SELECT status FROM moderation_private.media_claims WHERE claim_id='${c.claim_id}'`),'invalidated')
  assert.equal(run(`SELECT count(*) FROM moderation_private.media_claim_events
    WHERE claim_id='${c.claim_id}' AND event='invalidated'`),'1')
  assert.equal(run(`SELECT count(*) FROM storage.objects WHERE id='${c.storage_id}'`),'0')
  console.log('PASS F14 TWO-SESSION RECONCILIATION: one commit, one idempotent waiter, exactly one invalidation')
}finally{
  for(const child of children)if(child.exitCode===null)child.kill()
}
