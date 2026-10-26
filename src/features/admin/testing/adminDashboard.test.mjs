import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../../../../'+path,import.meta.url),'utf8')
const migration=read('supabase/migrations/20261018234721_pazo_admin_observability_dashboard_20261018.sql')
const access=read('src/features/moderation/ModerationAccess.tsx')
const board=read('src/features/admin/components/AdminDashboard.tsx')
const client=read('src/features/admin/adminDashboardService.ts')
const app=read('src/App.tsx')
const option=read('src/features/validation/components/FeatureIntentChoice.tsx')
const place=read('src/components/validation/PlaceFeatureExperimentCard.tsx')
const commView=read('src/features/communities/components/CommunityFutureGate.tsx')
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
 assert.ok(access.includes('if(!enabled||(!allowed&&!adminAllowed))return null'))
 assert.ok(!access.includes('if(!enabled||!allowed)return null'))
 assert.ok(access.includes("{allowed&&screen==='reports'&&<ModeratorQueue"))
 assert.ok(access.includes("{allowed&&screen==='media'&&<ModerationMediaQueue"))
 assert.ok(access.includes("onOpenReports={allowed?()=>setScreen('reports'):undefined}"))
 assert.ok(board.includes("sections.filter(item=>item.key!=='reports'||Boolean(onOpenReports))"))
 assert.equal((board.match(/visibleSections\.map\(item=>/g)||[]).length,2)
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
 const keys=[...commView.matchAll(/key: '(communities_[^']+)'/g),...placesView.matchAll(/moduleKey="([^"]+)"/g)].map(x=>x[1])
 assert.equal(keys.length,11)
 for(const key of keys)assert.ok(migration.includes("('"+key+"',"),'Missing fake-door ranking '+key)
 assert.ok(migration.includes('count(distinct v.user_id)'))
 assert.ok(migration.includes('count(distinct i.user_id)'))
 assert.ok(migration.includes('when m.viewers>=30'))
 assert.ok(migration.includes("'confidence'"))
 assert.ok(commView.includes('<FeatureIntentChoice')&&place.includes('<FeatureIntentChoice'))
 assert.ok(commView.includes('saved &&')&&place.includes('isInterested &&'))
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
 assert.ok(board.includes('ref={dialogRef} tabIndex={-1} role="dialog"'))
 assert.ok(board.includes("document.addEventListener('keydown',handleKeydown)"))
 assert.ok(board.includes("document.removeEventListener('keydown',handleKeydown)"))
 assert.ok(board.includes("event.key==='Escape'"))
 assert.ok(board.includes("event.key!=='Tab'"))
 assert.ok(board.includes('last.focus()')&&board.includes('first.focus()'))
 assert.ok(board.includes('if(previousFocus?.isConnected)previousFocus.focus()'))
 assert.ok(!board.includes('focus-visible:ring-')&&!board.includes('focus-visible:outline-'))
})


test('responsive admin dashboard escapes mobile shell and exposes functional layouts at each breakpoint',()=>{
 assert.ok(board.includes("import { createPortal } from 'react-dom'"),'The desktop dashboard must not inherit the mobile 430px shell')
 assert.ok(board.includes('createPortal(<div ref={dialogRef} tabIndex={-1} role="dialog"'))
 assert.ok(board.includes('document.body)'))
 assert.ok(board.includes('data-pazo-admin-responsive="true"'))
 assert.ok(board.includes('h-[100dvh] w-full'))
 assert.ok(board.includes('lg:grid lg:grid-cols-[265px_minmax(0,1fr)]'),'Full-width desktop sidebar/main')
 assert.ok(board.includes('hidden min-h-0 flex-col')&&board.includes('lg:flex'),'Sidebar hidden on mobile')
 assert.ok(board.includes('lg:hidden'),'Mobile top navigation does not duplicate the sidebar')
 assert.ok(board.includes('overflow-x-auto'),'Small-screen tabs remain accessible')
 assert.ok(board.includes('md:grid-cols-4'),'Tablet KPI columns')
 assert.ok(board.includes('xl:grid-cols-12'),'Wide desktop mosaic layout')
 assert.ok(board.includes('min-w-0'),'Avoid horizontal overflow in grid panels')
 assert.ok(board.includes('min-h-11'),'Minimum touch target for mobile controls')
 assert.ok(board.includes("aria-current={section===item.key?'page':undefined}"),'Nav communicates active section to screen readers')
 assert.ok(board.includes('onOpenReports'),'Moderation shortcut is functional')
 assert.ok(access.includes("onOpenReports={allowed?()=>setScreen('reports'):undefined}"),'Reports action only for moderators')
})

test('executive visual reference uses only actual query fields and never represents sandbox as live revenue',()=>{
 for(const prop of [
  'overview.people.registered','overview.people.pets','overview.people.new_7d',
  'overview.people.new_30d','overview.support.sandbox_covered_accounts',
  'overview.support.sandbox_gross_minor','overview.activity.module_counts',
  'overview.experiments.place_events','overview.experiments.search_events',
  'overview.resources.database_bytes','overview.resources.storage_estimated_bytes',
 ])assert.ok(board.includes(prop),'Real observable source absent: '+prop)
 assert.ok(board.includes('No es una serie histórica'))
 assert.ok(board.includes('Sin fuente'))
 assert.ok(board.includes('No representa sesiones ni tiempo conectado'))
 assert.ok(board.includes('No representa sesiones')||board.includes('Not sessions'))
 assert.ok(board.includes('No es una serie histórica')&&board.includes('No disponible'))
 assert.ok(!board.includes('1,248')&&!board.includes('1,892')&&!board.includes('$257.14'),
  'Do not copy illustrative figures from design reference')
 assert.ok(!board.includes('Tiempo real'),'No streaming data source exists')
 assert.ok(!board.includes('Operativo'),'Do not claim uptime without a monitoring source')
 assert.ok(!board.includes('Ubicación de usuarios'),'User-level geolocation is not present in admin sources')
 assert.ok(!board.includes('focus-visible:ring-')&&!board.includes('focus-visible:outline-'),
  'No visual rings/contours in PAZO')
})


test('selected visual is an illustrated high-density analytics dashboard, not tiny text-only cards',()=>{
 const visuals=read('src/features/admin/components/AdminVisuals.tsx')
 assert.ok(board.includes("icon='users'")||board.includes('icon="users"'))
 assert.ok(board.includes('<AdminCohortColumns'),'Signup cohort visualization is data-driven')
 assert.ok(board.includes('<AdminDonut'),'Real category proportions, not generic progress bars')
 assert.ok(board.includes('<AdminGlyph'),'Sidebar and cards use actual icons')
 assert.ok(board.includes('min-h-[136px]'),'KPI cards must have reference-like readable height')
 assert.ok(board.includes('text-[26px]')&&board.includes('lg:text-[29px]'),'KPI numerical hierarchy')
 assert.ok(board.includes('grid grid-cols-2 gap-3 lg:grid-cols-4'),'Four prominent desktop KPIs')
 for(const module of ['Mascotas','Membresías','Actividad','Contenido','Fake Doors','Lugares','Denuncias','Supabase']){
  assert.ok(board.includes(module),'Missing reference navigation: '+module)
 }
 for(const page of ["section==='pets'","section==='activity'","section==='content'","section==='places'"]){
  assert.ok(board.includes(page),'Unimplemented navigation destination '+page)
 }
 assert.ok(board.includes("next==='reports'")&&board.includes('onOpenReports?.()'),
   'Reports destination must invoke the actual moderation queue')
 assert.ok(visuals.includes('role="img"'),'Chart visuals have accessible descriptions')
 assert.ok(visuals.includes('count>0'),'Donut segments must reflect only observed counts')
 assert.ok(visuals.includes('Math.max(1,total)'),'Chart should handle empty datasets')
})

test('approved dashboard fidelity followup keeps truthful data and visible desktop/mobile action hierarchy',()=>{
 const visuals=read('src/features/admin/components/AdminVisuals.tsx')
 const css=read('src/features/admin/components/AdminDashboard.css')
 assert.ok(board.includes('pazo-admin-header'),'Desktop toolbar must be adjacent to heading')
 assert.ok(board.includes('lg:hidden'),'Mobile period refresh must stay available')
 assert.ok(board.includes('pazo-admin-sidebar-message'),'Approved reference includes a friendly illustration')
 assert.ok(board.includes('/supporter/gratitude-empty-pets.svg'),'Use existing PAZO asset, not fake pet images')
 assert.ok(board.includes('<AdminModuleRings'),'Use actual tracked module observations for rich analytics')
 assert.ok(visuals.includes('export function AdminModuleRings'),'Data chart component is present')
 assert.ok(visuals.includes('Math.max(1,base)'),'Zero audience cannot cause division by zero')
 assert.ok(visuals.includes('strokeDasharray'),'Data-derived rings have a visible scale')
 assert.ok(board.includes('No es una serie histórica'),'No invented daily growth')
 assert.ok(board.includes('Pago ficticio, no ingresos reales'),'Financial test data labeled')
 assert.ok(css.includes('.pazo-admin-panel'),'Dashboard visual styles remain portal-scoped')
 assert.ok(read('src/index.css').includes('features/admin/components/AdminDashboard.css'),'CSS must be linked from global entry without breaking Node UI closure tests')
 assert.ok(!css.includes('border:')&&!css.includes('outline:')&&!css.includes('ring:'),
  'Approved zero-contour policy applies to admin CSS')
})
