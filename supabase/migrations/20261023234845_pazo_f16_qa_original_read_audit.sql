-- Issue85 authorized original QA reconciliation, read-only PayPal. Does not
-- release checkout, retry/clear an event, cancel a contract or certify a gate.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE FUNCTION public.pazo_f16_live_service_qa_original_scope() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; e jsonb;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND lifecycle='inactive' AND started_at IS NULL)
 THEN RAISE EXCEPTION 'Original QA audit only before campaign start'; END IF;
 SELECT x.* INTO i FROM supporter_private.pazo_paypal_live_checkout_intents x
 JOIN auth.users u ON u.id=x.owner_id
 JOIN admin_private.pazo_live_release_control r ON r.singleton AND r.canary_owner=x.owner_id AND r.merchant_generation=x.merchant_generation
 WHERE x.closed_at IS NULL AND x.state='bound' AND x.source_environment='live'
 AND x.provider_subscription_id IS NOT NULL AND u.created_at<'2026-10-23 22:59:00+00';
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('eventId',s.provider_event_id,'type',s.event_type,'subjectId',s.subject_id,
  'providerEventAt',to_char(s.provider_event_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'subjectAt',to_char(s.subject_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) INTO e
 FROM supporter_private.pazo_paypal_live_signed_receipts s
 JOIN supporter_private.pazo_paypal_live_event_inbox q ON q.merchant_generation=s.merchant_generation AND q.provider_event_id=s.provider_event_id
 WHERE s.merchant_generation=i.merchant_generation AND s.subscription_id=i.provider_subscription_id
 AND q.linked_intent_id=i.intent_id AND s.event_type=q.event_type AND s.event_type='BILLING.SUBSCRIPTION.CREATED'
 AND s.proof_source='paypal_live_postback_success' ORDER BY s.provider_event_at LIMIT 1;
 RETURN jsonb_build_object('source','original_prebeta_qa_scope_v1','sourceEnvironment','live',
  'ownerId',i.owner_id,'intentId',i.intent_id,'subscriptionId',i.provider_subscription_id,
  'merchantGeneration',i.merchant_generation,'planId',i.plan_id,
  'createdAt',to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'event',e);
END $$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_qa_original_scope() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_qa_original_scope() TO service_role;

-- Use precisely the installed single-use dispatch mechanism. No Vault token
-- or service/PayPal key enters pg_net. No scheduler rewrite or auto-audit.
CREATE FUNCTION supporter_private.pazo_live_original_qa_audit_dispatch() RETURNS bigint
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.pazo_paypal_live_worker_control%ROWTYPE; token text; request_id bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND lifecycle='inactive' AND started_at IS NULL)
 THEN RAISE EXCEPTION 'Original QA audit only before campaign start'; END IF;
 SELECT * INTO c FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR NOT c.enabled OR
 (c.last_dispatch_at IS NOT NULL AND c.last_dispatch_at>clock_timestamp()-interval '5 seconds') OR
 (c.drain_token IS NOT NULL AND c.drain_expires_at>=clock_timestamp()) OR
 (c.dispatch_expires_at IS NOT NULL AND c.dispatch_expires_at>=clock_timestamp()) THEN RETURN NULL; END IF;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 UPDATE supporter_private.pazo_paypal_live_worker_control SET dispatch_sha256=sha256(convert_to(token,'UTF8')),
 dispatch_expires_at=clock_timestamp()+interval '120 seconds' WHERE singleton;
 request_id:=net.http_post(url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker',
 body:=jsonb_build_object('action','qa_audit'),headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),timeout_milliseconds:=90000);
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=clock_timestamp() WHERE singleton;
 RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION supporter_private.pazo_live_original_qa_audit_dispatch() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
