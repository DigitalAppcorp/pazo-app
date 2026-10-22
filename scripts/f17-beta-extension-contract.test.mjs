import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('mobile shell respects dynamic browser viewport and safe areas',()=>{
 const s=file('src/index.css')
 assert.match(s,/\[data-pazo-app-shell\]/)
 assert.match(s,/height: 100dvh/)
 assert.match(s,/env\(safe-area-inset-top/)
 assert.match(file('index.html'),/viewport-fit=cover/)
})

test('install action is hidden for standalone PWA and supports native Chrome and iOS instructions',()=>{
 const s=file('src/features/pwa/components/PazoInstallControl.tsx')
 for(const phrase of ['beforeinstallprompt','appinstalled','display-mode: standalone','navigator as IosNavigator','if(installed','userChoice','Compartir'])assert.ok(s.includes(phrase),phrase)
 assert.match(s,/typeof window!=='undefined'/)
 assert.match(file('src/components/views/PetView.tsx'),/PazoInstallControl lang=\{lang\}/)
})

test('map remains server-map based with 3D places and explicit tile errors',()=>{
 const s=file('src/features/places/map/MapboxMap.tsx')
 assert.match(s,/mapbox:\/\/styles\/mapbox\/streets-v12/)
 assert.match(s,/type: 'model'/)
 assert.match(s,/type: 'symbol'/)
 assert.match(s,/Mapbox no autorizó las capas/)
})

test('support ticket messages are private, rate-limited and available in admin inbox',()=>{
 const sql=file('supabase/drafts/PAZO_F17_support_tickets_DRAFT.sql')
 assert.match(sql,/create policy pazo_support_admin_read/)
 assert.doesNotMatch(sql,/pazo_support_own_read/)
 assert.match(sql,/grant select,insert on public\.pazo_support_tickets to authenticated/)
 assert.match(sql,/pazo_support_intake_guard/)
 assert.match(sql,/interval '1 hour'/)
 assert.match(sql,/count\(\*\)[^;]+>=3/s)
 assert.match(file('src/components/views/PetView.tsx'),/SupportRequestDialog/)
 assert.match(file('src/features/admin/components/AdminDashboard.tsx'),/AdminSupportInbox/)
})

test('gifted access is not manufactured financial evidence',()=>{
 const sql=file('supabase/drafts/PAZO_F17_admin_gift_entitlements_DRAFT.sql')
 assert.match(sql,/supporter_private\.pazo_admin_gift_access/)
 assert.match(sql,/supporter_private\.pazo_admin_gift_audit/)
 assert.match(sql,/pazo_admin_set_gift_benefits/)
 assert.match(sql,/pazo_admin_find_benefit_recipients/)
 assert.doesNotMatch(sql,/INSERT INTO supporter_private\.pazo_paypal_live_paid_periods/i)
 assert.doesNotMatch(sql,/INSERT INTO supporter_private\.pazo_paypal_live_signed_receipts/i)
 const my=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.pazo_supporter_my_account_status'))
 assert.ok(my.indexOf("IF v_live->>'active'='true'") < my.indexOf('IF EXISTS(SELECT 1 FROM supporter_private.pazo_admin_gift_access'))
 assert.match(file('src/features/admin/components/AdminDashboard.tsx'),/AdminGiftBenefits/)
})

test('maintenance draft refuses Live checkout and cannot accidentally be treated as activated',()=>{
 const s=file('supabase/drafts/PAZO_F17_maintenance_switch_DRAFT.sql')
 assert.match(s,/pazo_app_pre_request_gate/)
 assert.match(s,/pazo_live_control_admits/)
 assert.match(s,/Stop new PayPal purchases/)
 assert.match(s,/-- alter role authenticator/)
 assert.match(file('src/features/maintenance/MaintenanceGate.tsx'),/pazo_public_maintenance_status/)
 assert.match(file('src/features/admin/components/AdminDashboard.tsx'),/AdminMaintenanceControls/)
 for(const p of ['support_tickets','admin_gift_entitlements','maintenance_switch']){
  assert.ok(existsSync(new URL('../supabase/drafts/PAZO_F17_'+p+'_DRAFT.sql',import.meta.url)))
 }
})
