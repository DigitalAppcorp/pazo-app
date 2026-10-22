// Extract EXACT reviewed SQL for a disposable test with local cron/net mocks.
// Does not execute DDL, access a provider, read environment or copy any secret.
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const names=readdirSync(path.join(root,'supabase/migrations')).filter(n=>/^\d{14}_pazo_f16_live_private_worker_scheduler\.sql$/.test(n))
if(names.length!==1)throw Error('Expected one reviewed scheduler migration')
const source=readFileSync(path.join(root,'supabase/migrations',names[0]),'utf8')
const begin='-- PAZO_WORKER_SCHEDULER_CORE_BEGIN',end='-- PAZO_WORKER_SCHEDULER_CORE_END'
if(source.split(begin).length!==2||source.split(end).length!==2)throw Error('Scheduler marker drift')
const core=source.split(begin)[1].split(end)[0]
if(!core.includes('CREATE FUNCTION supporter_private.pazo_live_worker_tick()')||/CREATE EXTENSION|\bCOPY\b|pg_read_file|\bPROGRAM\b/i.test(core))
 throw Error('Unexpected scheduler core')
const out=path.join(root,'supabase/tests/supporter/fixtures/f16-live-worker-scheduler-core.generated.sql')
mkdirSync(path.dirname(out),{recursive:true})
writeFileSync(out,'-- GENERATED FROM REVIEWED MIGRATION; disposable mocks only.\n'+core)
console.log('F16_PRIVATE_SCHEDULER_CORE_STAGED_MOCK_TEST_ONLY')
