import {readFileSync,writeFileSync} from 'node:fs'
const path='supabase/migrations/20261023224519_pazo_f16_gradual_live_event_rollout.sql'
const sql=readFileSync(path,'utf8')
if(!/^BEGIN;$/m.test(sql)||!sql.trimEnd().endsWith('COMMIT;'))throw Error('Unexpected migration transaction')
writeFileSync('supabase/tests/supporter/fixtures/f16-gradual-rollback.generated.sql',sql.replace(/COMMIT;\s*$/,'ROLLBACK;\n'))
console.log('F16 gradual migration rollback rehearsal staged; no hosted connection')
