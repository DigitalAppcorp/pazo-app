// Fixed disposable PostgreSQL transport. Never accepts a remote database URL.
import {spawnSync,execFile} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {promisify} from 'node:util'
import assert from 'node:assert/strict'
const execute=promisify(execFile),container='pazo-marketing-lab',db='pazo_marketing_synthetic'
const ci=process.env.PAZO_MARKETING_PG_MODE==='ci'
if(ci&&!(process.env.CI==='true'&&process.env.PGHOST==='127.0.0.1'&&process.env.PGDATABASE==='postgres'))throw Error('Isolated CI PostgreSQL required')
const command=ci?'psql':'docker'
// Explicit local sockets only; never inherit a remote Docker context.
const dockerHost=process.platform==='win32'?'npipe:////./pipe/dockerDesktopLinuxEngine':'unix:///var/run/docker.sock'
const args=database=>ci?['-X','-qAt','-v','ON_ERROR_STOP=1']:[`--host=${dockerHost}`,'exec','-i',container,'psql','-X','-qAt','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1']
export function sql(query){const result=spawnSync(command,args(db),{input:query,encoding:'utf8',maxBuffer:2e6});if(result.status!==0)throw Error(result.stderr||'Local PostgreSQL failed');return result.stdout.trim()}
export async function sqlAsync(query){const result=await execute(command,[...args(db),'-c',query],{maxBuffer:2e6});return result.stdout.trim()}
export function file(path){return sql(readFileSync(path,'utf8'))}
export async function prepareMarketingLab(){
 if(!ci){
  const d=[`--host=${dockerHost}`];const inspect=spawnSync('docker',[...d,'inspect','--format','{{.State.Running}}',container],{encoding:'utf8'})
  if(inspect.status!==0){const started=spawnSync('docker',[...d,'run','--detach','--name',container,'--label','pazo.disposable=marketing','--env','POSTGRES_PASSWORD=synthetic_only','postgres:17'],{encoding:'utf8'});if(started.status!==0)throw Error(started.stderr)}
  else if(inspect.stdout.trim()!=='true')throw Error('Start disposable marketing container')
  let ready=false;for(let i=0;i<120;i++){if(spawnSync('docker',[...d,'exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break}await new Promise(r=>setTimeout(r,250))}if(!ready)throw Error('Local PG17 not ready')
  const reset=spawnSync('docker',[...d,'exec',container,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-c',`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`,'-c',`CREATE DATABASE ${db}`],{encoding:'utf8'});if(reset.status!==0)throw Error(reset.stderr)
 }
 file('supabase/tests/marketing/fixtures-pg17.sql')
 file('supabase/migrations/20261024020632_pazo_marketing_firstparty_attribution.sql')
 file('supabase/tests/marketing/private-attribution-pg17.sql')
 const hardened=readFileSync('supabase/migrations/20261024034549_pazo_marketing_retention_health.sql','utf8')
 const forced=hardened.replace(/\nCOMMIT;\s*$/,"\nDO $failure$ BEGIN RAISE EXCEPTION 'synthetic install failure';END $failure$;\nCOMMIT;")
 assert.notEqual(forced,hardened)
 assert.throws(()=>sql(forced))
 assert.equal(sql("SELECT to_regclass('marketing_private.retention_runtime') IS NULL AND to_regprocedure('public.pazo_admin_marketing_summary(integer)') IS NOT NULL"),'t','DDL failure must roll back moved RPCs/tables/grants')
 sql(hardened)
}
export function runMockCron(){
 const j=JSON.parse(sql("SELECT row_to_json(j) FROM cron.job j WHERE jobname='pazo-marketing-retention-v1'"));
 const id=sql(`INSERT INTO cron.job_run_details(jobid,status) VALUES(${Number(j.jobid)},'running') RETURNING runid`)
 try{const result=sql(j.command);sql(`UPDATE cron.job_run_details SET status='succeeded',end_time=clock_timestamp() WHERE runid=${Number(id)}`);return result}
 catch(error){sql(`UPDATE cron.job_run_details SET status='failed',end_time=clock_timestamp() WHERE runid=${Number(id)}`);throw error}
}
