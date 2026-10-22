import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../../../../supabase/drafts/f16_p28_historical_audit_ledger_DO_NOT_APPLY.sql',import.meta.url),'utf8')
test('P28 audit ledger requires disposable lab identity and minimal columns',()=>{
 assert.match(sql,/current_database\(\)<>'f14_synthetic'/)
 assert.match(sql,/request_id uuid PRIMARY KEY/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON supporter_private\.p28_historical_read_audit/)
 assert.match(sql,/ON CONFLICT\(request_id\) DO NOTHING/)
 assert.match(sql,/IF NOT FOUND THEN RETURN NULL/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION.*TO service_role/s)
 assert.doesNotMatch(sql,/\b(event_id|owner_id|sale_id|subscription_id|token|email|amount)\b/i)
})
