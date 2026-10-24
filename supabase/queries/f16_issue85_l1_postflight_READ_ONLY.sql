-- Issue85 readback. Aggregates only: no JWT impersonation, Vault, payer data,
-- UPDATE/DELETE, reconciliation, certification or campaign start.
SELECT jsonb_build_object(
 'checked_at',statement_timestamp(),
 'campaign',(SELECT jsonb_build_object('state',lifecycle,'stage',stage,'capacity',capacity,'revision',revision,
   'started',started_at IS NOT NULL,'hosted_gate_verified',hosted_gate_verified,
   'webhook_probe_fresh',webhook_ok_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp())
   FROM supporter_private.gradual_campaign WHERE singleton),
 'release',(SELECT jsonb_build_object('mode',mode,'revision',revision,'generation',merchant_generation) FROM admin_private.pazo_live_release_control WHERE singleton),
 'worker',(SELECT jsonb_build_object('enabled',enabled,'processing_enabled',processing_enabled,'last_outcome',last_outcome,
   'heartbeat_fresh',last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp(),'build',expected_build)
   FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton),
 'qa_accounts',(SELECT count(*) FROM supporter_private.gradual_qa_accounts),
 'real_accounts',(SELECT count(*) FROM auth.users WHERE supporter_private.gradual_is_real_account(id)),
 'prebeta_eligible',(SELECT count(*) FROM auth.users WHERE created_at<'2026-10-23 22:59:00+00' AND supporter_private.gradual_eligible(id)),
 'prebeta_verified',(SELECT count(*) FROM auth.users WHERE created_at<'2026-10-23 22:59:00+00' AND supporter_private.gradual_verified(id)),
 'auth_accounts',(SELECT count(*) FROM auth.users),
 'admin_grants',(SELECT count(*) FROM admin_private.admin_grants),
 'verified_mfa_factors',(SELECT count(*) FROM auth.mfa_factors WHERE status='verified'),
 'legacy_open',supporter_private.gradual_legacy_open(),
 'open_intents',(SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents WHERE closed_at IS NULL),
 'intent_fingerprint',(SELECT md5(coalesce(jsonb_agg(to_jsonb(i) ORDER BY intent_id)::text,'[]')) FROM supporter_private.pazo_paypal_live_checkout_intents i),
 'receipt_fingerprint',(SELECT md5(coalesce(jsonb_agg(to_jsonb(s) ORDER BY provider_event_id)::text,'[]')) FROM supporter_private.pazo_paypal_live_signed_receipts s),
 'local_paid_periods',(SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods),
 'inbox',(SELECT coalesce(jsonb_agg(jsonb_build_object('state',processing_state,'attempts',claim_attempts,'code',last_diagnostic_code)),'[]'::jsonb) FROM supporter_private.pazo_paypal_live_event_inbox),
 'interests',(SELECT count(*) FROM supporter_private.gradual_interest),
 'invitations',(SELECT count(*) FROM supporter_private.gradual_invitation),
 'outbox',(SELECT count(*) FROM supporter_private.gradual_outbox),
 'admissions',(SELECT count(*) FROM supporter_private.gradual_admission),
 'rechecks',(SELECT count(*) FROM supporter_private.gradual_qa_rechecks),
 'gate_certificates',(SELECT count(*) FROM supporter_private.gradual_hosted_gate_certificates),
 'new_create_admitted',(SELECT admin_private.pazo_live_control_admits(canary_owner,merchant_generation) FROM admin_private.pazo_live_release_control WHERE singleton),
 'legacy_recovery_allowed',(SELECT bool_and(supporter_private.gradual_recovery_admits(owner_id,merchant_generation)) FROM supporter_private.pazo_paypal_live_checkout_intents WHERE closed_at IS NULL),
 'private_tables',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,
   'anon_select',has_table_privilege('anon',c.oid,'SELECT'),'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT')) ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='supporter_private' AND c.relname LIKE 'gradual_%' AND c.relkind='r'),
 'retry_service_execute',has_function_privilege('service_role','public.pazo_f16_live_service_qa_original_retry(uuid,bigint,text,text,text,text,timestamptz,timestamptz,text)','EXECUTE'),
 'retry_authenticated_execute',has_function_privilege('authenticated','public.pazo_f16_live_service_qa_original_retry(uuid,bigint,text,text,text,text,timestamptz,timestamptz,text)','EXECUTE'),
 'certificate_service_execute',has_function_privilege('service_role','supporter_private.pazo_gradual_certify_hosted_gate(uuid,bigint,text,text,text,text,text,text)','EXECUTE'),
 'certificate_authenticated_execute',has_function_privilege('authenticated','supporter_private.pazo_gradual_certify_hosted_gate(uuid,bigint,text,text,text,text,text,text)','EXECUTE'),
 'migrations',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name) ORDER BY version) FROM supabase_migrations.schema_migrations
   WHERE name IN('pazo_f16_qa_original_read_audit','pazo_f16_real_cohort_initial_invitation_budget','pazo_f16_original_qa_recheck_and_hosted_gate_certificate'))
) AS issue85_postflight;
