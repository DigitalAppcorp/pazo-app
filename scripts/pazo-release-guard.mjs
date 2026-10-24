// PAZO release static safety check. No network calls, no secrets, no billing.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const ui=read('src/features/admin/components/AdminPayPalSettings.tsx')
const sql=read('supabase/migrations/20261019183232_pazo_admin_paypal_gateway_settings.sql')
const qa=read('supabase/functions/f16-paypal-supporter-v2-qa/index.ts')
const admin=read('supabase/functions/pazo-admin-paypal-validate/index.ts')
const live=read('supabase/functions/pazo-admin-paypal-validate/liveBetaReleasePolicy.mjs')
const history=read('supabase/functions/pazo-admin-paypal-validate/paymentGatewayRoute.mjs')
const roadmap=read('docs/PAZO_MVP_TO_LIVE_EXECUTION_ROUTE_20261019.md')
const provisioningEdge=read('supabase/functions/pazo-admin-paypal-provision/index.ts')
const provisioningIntake=read('supabase/functions/pazo-admin-paypal-provision/intake.mjs')
const provisioningReservationDraft=read('supabase/drafts/f16_live_secret_provision_attempts_REVIEW_REQUIRED.sql')
const provisioningAdapter=read('supabase/functions/pazo-admin-paypal-provision/liveProvisionSqlStore.mjs')
const stagingOrchestrator=read('supabase/functions/pazo-admin-paypal-validate/liveEdgeProvisioning.mjs')
const liveCheckoutEdge=read('supabase/functions/pazo-paypal-live-checkout/index.ts')
const liveWebhookEdge=read('supabase/functions/pazo-paypal-live-webhook/index.ts')
const liveCheckoutHosted=read('supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs')
const liveWebhookHosted=read('supabase/functions/pazo-paypal-live-webhook/liveHostedWebhook.mjs')
const liveProvider=read('supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs')
const liveSettlementCoordinator=read('supabase/functions/pazo-paypal-live-webhook/liveSettlementReconciliationGate.mjs')
const provisionAdmin=read('supabase/functions/pazo-admin-paypal-provision/liveVerifiedAdmin.mjs')
const freshAdminMfa=read('supabase/functions/pazo-admin-paypal-provision/liveFreshMfaProof.mjs')
const hostedAdminProvision=read('supabase/functions/pazo-admin-paypal-provision/liveHostedProvisioning.mjs')
const liveRefundCoordinator=read('supabase/functions/pazo-paypal-live-webhook/liveRefundReconciliationGate.mjs')
const hostedRefundWorker=read('supabase/functions/pazo-paypal-live-webhook/liveHostedRefundWorker.mjs')
const stagedOriginalSaleReader=read('supabase/drafts/f16_live_service_recorded_sale_reader_REVIEW_REQUIRED.sql')
assert.match(sql,/active_environment text NOT NULL DEFAULT 'sandbox' CHECK\(active_environment='sandbox'\)/)
assert.match(sql,/live_checkout_enabled bool NOT NULL DEFAULT false CHECK\(live_checkout_enabled=false\)/)
const releaseControl=read('src/features/admin/components/AdminLiveReleaseControl.tsx')
assert.ok(releaseControl.includes('value.originalOperator&&value.preparationReady'),'Live operator cannot bypass server readiness')
assert.ok(releaseControl.includes('!allowed||!consent'),'Activation requires explicit unchecked operator consent')
assert.ok(releaseControl.includes("state==='uncertain'"),'Unknown activation must not be retried blindly')
assert.ok(ui.includes('No escribas localhost aquí'),'Localhost cannot be public return origin')
assert.ok(ui.includes('Comprobar Sandbox en uso'),'Legacy OAuth verification remains available')
assert.ok(qa.includes("get('PAZO_F16_PAYPAL_ENV')!=='sandbox'"),'V2 QA billing must remain sandbox-only')
assert.ok(admin.includes("api+'/auth/v1/user'"),'Admin Edge checks owner identity')
assert.ok(admin.includes("api+'/rest/v1/rpc/pazo_admin_paypal_settings'"),'Admin health must check admin grant')
assert.ok(!admin.includes('/v1/billing/subscriptions'),'Admin credential check cannot create a purchase')
assert.ok(live.includes('activationAuthorized:false,checkoutEnabled:false'),'Live readiness cannot authorize activation')
assert.ok(history.includes("return block('live_historical_adapter_not_released')"),'Historical Live fallback disabled')
assert.ok(history.includes("return block('production_checkout_not_released')"),'Live checkout still disabled')
assert.ok(roadmap.includes('MVP_RELEASE_NO_GO / LIVE_NO_GO'),'No premature beta/live ready claim')
assert.ok(liveSettlementCoordinator.includes('released=false'),'Financial reconciler must default OFF')
assert.ok(liveRefundCoordinator.includes('released=false'),'Refund reconciler must default OFF')
assert.ok(hostedRefundWorker.includes('released=false'),'Hosted refund worker must default OFF')
assert.ok(stagedOriginalSaleReader.includes('IS DISTINCT FROM \'service_role\''),
 'Original merchant sale read must require service_role')
assert.ok(stagedOriginalSaleReader.includes('REVOKE ALL ON FUNCTION public.pazo_f16_live_service_recorded_sale_read'),
 'Original recorded sale read must not expose owner data to anon')
assert.ok(liveRefundCoordinator.includes('refund_original_recorded_sale_unverified'),
 'Signed event cannot replace original paid sale evidence')
assert.ok(liveRefundCoordinator.includes('partial_refund_requires_manual_review'),
 'Partial refunds cannot be automatically interpreted as complete')
assert.ok(liveSettlementCoordinator.includes('independent_service_period_unverified'),
 'Never grant a billed service period without independent evidence')
assert.ok(hostedAdminProvision.includes('if(released!==true)'),
 'Privileged PayPal provisioner must be hard OFF before reading secrets')
assert.ok(hostedAdminProvision.includes("typeof verifyProviderResources!=='function'"),
 'PayPal merchant identity verifier required before provisioning')
assert.ok(ui.includes('data-pazo-live-vault-locked'),
 'Live Client Secret must not enter legacy Vault')
assert.ok(freshAdminMfa.includes("payload.aal!=='aal2'"),
 'Live secret provisioning must reject AAL1')
assert.ok(freshAdminMfa.includes("x.method==='totp'"),
 'Live admin requires TOTP rather than a refreshed token')
assert.ok(freshAdminMfa.includes('now-latestMfa>windowSeconds'),
 'MFA challenge must be recent, not just a long-lived MFA session')
assert.ok(provisionAdmin.includes('proveFreshReauthentication'),
 'Privileged admin must require independent session freshness')
assert.match(liveCheckoutEdge,/const CONTROLLED_CHECKOUT_RUNTIME=true/,'Only the guarded checkout runtime is selected')
assert.match(liveWebhookEdge,/const CONTROLLED_WEBHOOK_RUNTIME=true/,'Only the guarded intake runtime is selected')
assert.ok(liveCheckoutHosted.includes("rpc('releaseRuntime'"),'Checkout must require operator deployment certification')
assert.ok(liveCheckoutHosted.includes("rpc('releaseAdmit'"),'Owner admission must be enforced in SQL')
assert.ok(liveCheckoutHosted.includes('live_ingestion_unavailable'),'Unavailable deployed intake must block checkout')
assert.ok(liveWebhookHosted.includes("rpc('releaseRuntime'"),'Webhook must require operator deployment certification')
const controlledSql=read('supabase/migrations/20261021230000_pazo_f16_live_controlled_release.sql')
assert.ok(controlledSql.includes('pazo_live_switch_matches_control'),'Physical selector must match controlled state')
assert.ok(controlledSql.includes("release_canary_evidence_pending"),'Public release needs reconciled genuine canary evidence')
assert.ok(controlledSql.includes('receipt.signature_webhook_id=g.webhook_id'),'Original signature provenance required')
assert.doesNotMatch(controlledSql,/INSERT\s+INTO\s+admin_private[.]pazo_live_release_artifact/i,
 'Installing schema cannot certify deployed code/HTTPS')
assert.ok(liveCheckoutHosted.includes("released!==true"),'Live checkout hosted composition must guard its release')
assert.ok(liveWebhookHosted.includes("released!==true"),'Live webhook hosted composition must guard its release')
assert.ok(liveProvider.includes("?generation="),'Live webhook URL must pin original merchant generation')
assert.ok(provisioningReservationDraft.includes('merchant_generation bigint NOT NULL UNIQUE'),
 'Cross-worker reservation uniqueness is required')
assert.ok(provisioningReservationDraft.includes('FORCE ROW LEVEL SECURITY'),
 'Secret reservation audit must use forced RLS')
assert.ok(provisioningReservationDraft.includes('secret_write_outcome_unknown_manual_review'),
 'Uncertain writes require durable review')
assert.ok(provisioningAdapter.includes('pazo_f16_live_service_provision_reserve'),
 'Secret reservation must use durable SQL, not an in-memory mutex')
assert.ok(!provisioningReservationDraft.includes('client_secret'),
 'Secret reservation must not store plaintext provider credentials')
assert.match(provisioningEdge,/const RELEASE_APPROVED=false/,'Live secret endpoint must remain inert')
assert.match(ui,/const LIVE_EDGE_PROVISIONING_RELEASED=false/,'Admin Live Edge must stay unreleased')
assert.match(provisioningIntake,/if\(released!==true\)return deny\(req,503,'live_provisioning_not_released'\)/,'Intake must reject preflight or POST while unreleased')
assert.match(stagingOrchestrator,/if\(released!==true\)return code\('edge_provisioning_not_released'\)/)
assert.match(stagingOrchestrator,/reserveAttempt/,'Secret writes need server-side reservation')
assert.match(stagingOrchestrator,/recordAttemptOutcome/,'Secret writes need durable audit')
assert.ok(roadmap.includes('binding inmutable'),'Immutable merchant binding required')
console.log('PAZO_MVP_RELEASE_STATIC_GUARD_PASS__NO_LIVE__NO_RUNTIME_CERTIFICATION')
