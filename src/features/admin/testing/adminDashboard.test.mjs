import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../../../../'+path,import.meta.url),'utf8')
const migration=read('supabase/migrations/20261018233000_pazo_admin_observability_dashboard.sql')
const access=read('src/features/moderation/ModerationAccess.tsx')
const board=read('src/features/admin/components/AdminDashboard.tsx')
const client=read('src/features/admin/adminDashboardService.ts')
const app=read('src/App.tsx')
const option=read('src/features/validation/components/FeatureIntentChoice.tsx')
const comm=read('src/components/validation/CommunityFeatureExperimentCard.tsx')
const place=read('src/components/validation/PlaceFeatureExperimentCard.tsx')
const commView=read('src/components/views/CommunityDetailView.tsx')
const placesView=read('src/components/views/MapView.tsx')

test('only an explicit admin grant can read sensitive dashboard RPCs',()=>{
 assert.ok(migration.includes('create table if not exists admin_private.admin_grants'))
 assert.ok(migration.includes("select count(*) from moderation_private.moderator_grants)=1"))
 assert.ok(migration.includes('alter table admin_private.admin_grants force row level security'))
 assert.ok(migration.includes('revoke all on schema admin_private from public, anon, authenticated'))
 assert.ok(migration.includes('if not public.pazo_is_admin() then raise exception'))
 const count=migration.match(/if not public\.pazo_is_admin\(\)/g)||[]
 assert.ok(count.length>=5,'Every sensitive RPC must authorize its caller')
 for(const name of ['pazo_admin_overview(integer)','pazo_admin_users(integer,integer)',
   'pazo_admin_experiments()','pazo_admin_voters(text,integer)','pazo_admin_audience(text,integer)']){
  assert.ok(migration.includes('revoke execute on function public.'+name+' from public,anon'))
  assert.ok(migration.includes('grant execute on function public.'+name+' to authenticated'))
 }
 assert.ok(migration.includes("if auth.uid() is null then raise exception"))
 assert.ok(migration.includes("on conflict do nothing"))
 assert.ok(!migration.includes('service_role key'))
})

test('finance is clearly Sandbox; live billing and Supabase billable quotas are unavailable, not invented',()=>{
 assert.ok(migration.includes("'sandbox_gross_minor'"))
 assert.ok(migration.includes('supporter_private.f16_sandbox_qa_paid_periods'))
 assert.ok(migration.includes("'live_verified',false"))
 assert.ok(migration.includes("'live_revenue_minor',null"))
 assert.ok(migration.includes("'provider_egress_bytes',null"))
 assert.ok(migration.includes("'provider_quota_bytes',null"))
 assert.ok(migration.includes("'provider_billing_amount',null"))
 assert.ok(board.includes('PayPal Sandbox NO son recaudación real'))
 assert.ok(board.includes('Los importes de PayPal Sandbox')||board.includes('datos de PAZO en pruebas'))
 assert.ok(board.includes('No disponible'))
})

test('existing moderator queue remains visible even if new analytics RPC fails',()=>{
 assert.ok(access.includes('isModerator().then'))
 assert.ok(access.includes('checkAdmin().then'))
 assert.ok(!access.includes('Promise.all([isModerator(),checkAdmin()])'))
 assert.ok(access.includes('adminAllowed&&'))
 assert.ok(access.includes('ModeratorQueue'))
 assert.ok(access.includes('ModerationMediaQueue'))
 assert.ok(access.includes('<AdminDashboard'))
})

test('daily activity is specific, rate limited by user/module/date and never captures content',()=>{
 assert.ok(migration.includes('primary key(user_id,activity_day,module_key)'))
 assert.ok(migration.includes('create or replace function public.pazo_track_activity'))
 for(const module of ['feed','explore','places','communities','profile']){
  assert.ok(client.includes(module))
 }
 assert.ok(!client.includes('location.href')&&!client.includes('post.body'))
 assert.ok(!migration.includes('ip_address')&&!migration.includes('gps'))
 assert.ok(app.includes('recordAdminActivity(screen)'))
 assert.ok(app.includes("sessionStorage.setItem(key,'1')"))
 assert.ok(board.includes('tracking_since'))
})

test('rank ALL active fake doors and allow users to choose intent without forced answer',()=>{
 const keys=[...commView.matchAll(/moduleKey="([^"]+)"/g),...placesView.matchAll(/moduleKey="([^"]+)"/g)].map(x=>x[1])
 assert.equal(keys.length,11)
 for(const key of keys)assert.ok(migration.includes("('"+key+"',"),'Missing fake-door ranking '+key)
 assert.ok(migration.includes('count(distinct v.user_id)'))
 assert.ok(migration.includes('count(distinct i.user_id)'))
 assert.ok(migration.includes('when m.viewers>=30'))
 assert.ok(migration.includes("'confidence'"))
 assert.ok(comm.includes('<FeatureIntentChoice')&&place.includes('<FeatureIntentChoice'))
 assert.ok(comm.includes('isInterested &&')&&place.includes('isInterested &&'))
 assert.ok(option.includes('recordFeatureExperimentIntent'))
 assert.ok(option.includes("getFeatureExperimentIntent(moduleKey)"))
 assert.ok(option.includes('Tu respuesta es opcional'))
 assert.ok(board.includes('adminAudience(key)')&&board.includes('adminVoters(key)'))
})

test('mobile control center contains comprehensive operator sections and forbids decorative contours',()=>{
 for(const value of ["'summary'","'users'","'finance'","'ideas'","'infra'"])
  assert.ok(board.includes(value))
 assert.ok(board.includes('active_days_30'))
 assert.ok(board.includes('unverified_checkout_attempts'))
 assert.ok(board.includes('database_bytes'))
 assert.ok(board.includes('stored_objects'))
 assert.ok(board.includes('adminOverview(period)'))
 assert.ok(board.includes('role="dialog"'))
 assert.ok(!board.includes('focus-visible:ring-')&&!board.includes('focus-visible:outline-'))
})
