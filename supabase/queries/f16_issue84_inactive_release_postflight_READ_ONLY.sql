-- Issue #84: metadata and aggregate readback only. No provider calls, JWT
-- impersonation, Vault values, payer identities, INSERT/UPDATE or campaign start.
SELECT jsonb_build_object(
 'checked_at',statement_timestamp(),
 'campaign',(SELECT jsonb_build_object('state',lifecycle,'stage',stage,
   'capacity',capacity,'started',started_at IS NOT NULL,
   'hosted_gate_verified',hosted_gate_verified,
   'webhook_probe_fresh',webhook_ok_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp())
   FROM supporter_private.gradual_campaign),
 'release',(SELECT jsonb_build_object('mode',mode,'revision',revision,'generation',merchant_generation)
   FROM admin_private.pazo_live_release_control),
 'worker',(SELECT jsonb_build_object('enabled',enabled,'processing_enabled',processing_enabled,
   'heartbeat_fresh',last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp(),
   'last_outcome',last_outcome,'build',expected_build)
   FROM supporter_private.pazo_paypal_live_worker_control),
 'new_create_admitted',(SELECT admin_private.pazo_live_control_admits(canary_owner,merchant_generation)
   FROM admin_private.pazo_live_release_control),
 'legacy_recovery_allowed',(SELECT bool_and(supporter_private.gradual_recovery_admits(owner_id,merchant_generation))
   FROM supporter_private.pazo_paypal_live_checkout_intents WHERE closed_at IS NULL),
 'intent_count',(SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents),
 'open_intents',(SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents WHERE closed_at IS NULL),
 'intent_fingerprint',(SELECT md5(coalesce(jsonb_agg(to_jsonb(i) ORDER BY intent_id)::text,'[]'))
   FROM supporter_private.pazo_paypal_live_checkout_intents i),
 'paid_periods',(SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods),
 'ledger_fingerprint',(SELECT md5(coalesce(jsonb_agg(to_jsonb(p) ORDER BY sale_id)::text,'[]'))
   FROM supporter_private.pazo_paypal_live_paid_periods p),
 'interest',(SELECT count(*) FROM supporter_private.gradual_interest),
 'invitations',(SELECT count(*) FROM supporter_private.gradual_invitation),
 'outbox',(SELECT count(*) FROM supporter_private.gradual_outbox),
 'admissions',(SELECT count(*) FROM supporter_private.gradual_admission),
 'notifications',(SELECT count(*) FROM public.notifications),
 'private_tables',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,
   'rls',c.relrowsecurity,'force',c.relforcerowsecurity,
   'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
   'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT')) ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='supporter_private' AND c.relname LIKE 'gradual_%' AND c.relkind='r'),
 'service_rpc_authenticated_execute',has_function_privilege('authenticated','public.pazo_f16_gradual_tick(boolean,boolean)','EXECUTE'),
 'service_rpc_service_execute',has_function_privilege('service_role','public.pazo_f16_gradual_tick(boolean,boolean)','EXECUTE'),
 'migration',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name))
   FROM supabase_migrations.schema_migrations WHERE name='pazo_f16_gradual_live_event_rollout')
) AS issue84_postflight;
