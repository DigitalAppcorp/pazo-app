import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8')
const schema=read('supabase/migrations/20261024020632_pazo_marketing_firstparty_attribution.sql')
const tests=read('supabase/tests/marketing/private-attribution-pg17.sql')
const schedule=read('supabase/operations/marketing-retention-cron-activation.sql')
const browser=read('src/features/marketing/marketingRuntime.ts')
const landing=read('supabase/functions/pazo-marketing-landing/index.ts')

test('rate caps are enforced server-side in one atomic PostgreSQL subtransaction',()=>{
 assert.ok(schema.includes('marketing_private.landing_minute_budget'))
 assert.ok(schema.includes('landing_minute_budget.accepted < 30'))
 assert.ok(schema.includes('landing_daily.signals < 3000'))
 assert.ok(schema.includes("EXCEPTION WHEN SQLSTATE 'PZ001'"))
 assert.ok(tests.includes('Burst limiter exceeded 30 signals'))
 assert.ok(tests.includes('Daily rejection failed to roll back minute counter'))
 assert.ok(!schema.includes('CREATE TABLE marketing_private.visitor'))
})

test('retention cleanup is service-only and no automatic cron is installed by migration',()=>{
 assert.ok(schema.includes('CREATE FUNCTION public.pazo_marketing_prune_all_v1()'))
 assert.ok(schema.includes('marketing_private.prune_expired()'))
 assert.ok(schema.includes('public.pazo_marketing_prune_landing_v1()'))
 assert.ok(schema.includes('48 hours'))
 assert.ok(schema.includes('GRANT EXECUTE ON FUNCTION public.pazo_marketing_prune_all_v1()\n TO service_role'))
 assert.ok(!schema.includes('cron.schedule('))
 assert.ok(schedule.includes('cron.schedule('))
 assert.ok(schedule.includes('pg_cron'))
 assert.ok(schedule.includes('pazo-marketing-retention-v1'))
 assert.ok(schedule.includes('pazo_marketing_prune_all_v1()'))
 assert.ok(schedule.includes("policy_version IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1'"))
 assert.ok(tests.includes('Old burst-budget record persisted with collection OFF'))
})

test('all client and public intake gates remain disabled',()=>{
 assert.ok(browser.includes('PAZO_MARKETING_COLLECTION_ENABLED = false'))
 assert.ok(browser.includes('PAZO_MARKETING_LANDING_ENABLED = false'))
 assert.ok(landing.includes('MARKETING_LANDING_RELEASED=false'))
 assert.ok(schema.includes('enabled boolean NOT NULL DEFAULT false'))
 assert.ok(schema.includes('retention_days smallint NOT NULL DEFAULT 0'))
})
