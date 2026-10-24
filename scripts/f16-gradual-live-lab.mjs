// Explicitly local Docker lab; does not accept database URLs or hosted secrets.
import {spawnSync} from 'node:child_process'
const container='pazo-f16-gradual-lab'
function run(command,args){const r=spawnSync(command,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
for(const file of ['f16-live-worker-scheduler-core-stage.mjs','f16-live-benefits-prerequisites-stage.mjs','f16-gradual-live-stage.mjs'])run(process.execPath,['scripts/'+file])
const docker=['--host=unix:///var/run/docker.sock']
const exists=spawnSync('docker',[...docker,'inspect','--format','{{.State.Running}}',container],{encoding:'utf8'})
if(exists.status!==0){
 run('docker',[...docker,'run','--detach','--name',container,'--label','pazo.disposable=gradual','--mount',`type=bind,src=${process.cwd()},dst=/repo,readonly`,'--workdir','/repo','--env','POSTGRES_USER=postgres','--env','POSTGRES_DB=f16_lab','--env','POSTGRES_PASSWORD=synthetic_disposable_only','postgres:17'])
 // The image starts a temporary Unix-only server during initdb. Wait for
 // final TCP readiness inside the container, not that short-lived socket.
 let accepting=false
 for(let i=0;i<120;i++){const ready=spawnSync('docker',[...docker,'exec',container,'pg_isready','-h','127.0.0.1','-U','postgres','-d','f16_lab'],{stdio:'ignore'});if(ready.status===0){accepting=true;break}await new Promise(r=>setTimeout(r,250))}
 if(!accepting)throw Error('Disposable PostgreSQL final TCP server did not become ready')
}else if(exists.stdout.trim()!=='true')throw Error('Start the existing disposable lab container first')
run('docker',[...docker,'exec',container,'psql','-X','-U','postgres','-d','f16_lab','-v','ON_ERROR_STOP=1','-c',"DO $$ BEGIN IF current_database()<>'f16_lab' THEN RAISE EXCEPTION 'Disposable database required';END IF;END $$;",'-c','DROP DATABASE IF EXISTS f14_synthetic WITH (FORCE);'])
run('docker',[...docker,'exec',container,'psql','-X','-U','postgres','-d','f16_lab','-v','ON_ERROR_STOP=1','-f','scripts/f16-live-gateway-disposable-lab.sql','-f','scripts/f16-gradual-live-lab-setup.sql','-f','supabase/tests/gradual/kernel-pg17.sql','-f','supabase/tests/gradual/failures-pg17.sql','-f','supabase/tests/gradual/security-pg17.sql'])
run('docker',[...docker,'exec',container,'psql','-X','-U','postgres','-d','f14_synthetic','-v','ON_ERROR_STOP=1','-f','supabase/migrations/20261023235424_pazo_f16_qa_original_read_audit.sql','-f','supabase/tests/gradual/qa-original-scope-pg17.sql'])
run(process.execPath,['scripts/f16-gradual-live-concurrency.mjs'])

run('docker',[...docker,'exec',container,'psql','-X','-U','postgres','-d','f14_synthetic','-v','ON_ERROR_STOP=1','-f','supabase/tests/gradual/real-cohort-pg17.sql'])

run('docker',[...docker,'exec',container,'psql','-X','-U','postgres','-d','f14_synthetic','-v','ON_ERROR_STOP=1','-f','supabase/tests/gradual/qa-recheck-gate-pg17.sql'])
