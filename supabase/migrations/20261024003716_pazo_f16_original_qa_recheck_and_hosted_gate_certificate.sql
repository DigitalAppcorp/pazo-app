-- Issue85. Explicit original-QA recheck only after genuine provider evidence.
-- Never marks an event processed, resets attempts, starts campaign or grants pay.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_qa_original_scope() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; e jsonb;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND lifecycle='inactive' AND started_at IS NULL)
 THEN RAISE EXCEPTION 'Original QA audit only before campaign start'; END IF;
 SELECT x.* INTO i FROM supporter_private.pazo_paypal_live_checkout_intents x
 JOIN auth.users u ON u.id=x.owner_id
 JOIN admin_private.pazo_live_release_control r ON r.singleton AND r.canary_owner=x.owner_id
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
CREATE TABLE supporter_private.gradual_qa_rechecks(
 request_id uuid PRIMARY KEY,merchant_generation bigint NOT NULL,event_id text NOT NULL,
 prior_state text NOT NULL,prior_code text,prior_attempts integer NOT NULL,
 provider_status text NOT NULL,provider_status_at timestamptz NOT NULL,
 observed_at timestamptz NOT NULL,evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(merchant_generation,event_id) REFERENCES supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id) ON DELETE CASCADE
);
CREATE INDEX gradual_qa_rechecks_event ON supporter_private.gradual_qa_rechecks(merchant_generation,event_id);
ALTER TABLE supporter_private.gradual_qa_rechecks ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.gradual_qa_rechecks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.gradual_qa_rechecks FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_f16_live_service_qa_original_retry(p_request uuid,p_generation bigint,p_intent text,
 p_subscription text,p_event text,p_status text,p_status_at timestamptz,p_observed_at timestamptz,p_evidence_sha256 text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
 e supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;prior supporter_private.gradual_qa_rechecks%ROWTYPE;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 IF p_request IS NULL OR p_status IS NULL OR p_status NOT IN('APPROVAL_PENDING','CANCELLED','EXPIRED') OR
 p_status_at IS NULL OR NOT isfinite(p_status_at) OR p_status_at>clock_timestamp()+interval '30 seconds' OR
 p_observed_at IS NULL OR p_observed_at NOT BETWEEN clock_timestamp()-interval '2 minutes' AND clock_timestamp()+interval '30 seconds' OR
 p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[a-f0-9]{64}$' THEN RETURN 'review_required';END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND lifecycle='inactive' AND started_at IS NULL) OR
 NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled AND drain_token IS NOT NULL AND drain_expires_at>clock_timestamp()) THEN RETURN 'review_required';END IF;
 SELECT * INTO prior FROM supporter_private.gradual_qa_rechecks WHERE request_id=p_request;
 IF FOUND THEN RETURN CASE WHEN prior.merchant_generation=p_generation AND prior.event_id=p_event AND prior.evidence_sha256=p_evidence_sha256 THEN 'already_queued' ELSE 'request_conflict' END;END IF;
 SELECT x.* INTO i FROM supporter_private.pazo_paypal_live_checkout_intents x
 JOIN admin_private.pazo_live_release_control r ON r.singleton AND r.canary_owner=x.owner_id
 JOIN supporter_private.gradual_qa_accounts qa ON qa.owner_id=x.owner_id
 WHERE x.intent_id=p_intent AND x.merchant_generation=p_generation AND x.provider_subscription_id=p_subscription
 AND x.closed_at IS NULL AND x.state='bound' AND x.source_environment='live' FOR UPDATE OF x;
 IF NOT FOUND OR p_status_at<i.created_at-interval '5 minutes' THEN RETURN 'legacy_not_found';END IF;
 -- Serialize duplicate nonces after acquiring the original intent lock.
 SELECT * INTO prior FROM supporter_private.gradual_qa_rechecks WHERE request_id=p_request;
 IF FOUND THEN RETURN CASE WHEN prior.merchant_generation=p_generation AND prior.event_id=p_event AND prior.evidence_sha256=p_evidence_sha256 THEN 'already_queued' ELSE 'request_conflict' END;END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods WHERE intent_id=i.intent_id) OR
 EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims WHERE intent_id=i.intent_id AND state<>'confirmed') THEN RETURN 'review_required';END IF;
 SELECT q.* INTO e FROM supporter_private.pazo_paypal_live_event_inbox q
 JOIN supporter_private.pazo_paypal_live_signed_receipts s ON s.merchant_generation=q.merchant_generation AND s.provider_event_id=q.provider_event_id
 WHERE q.merchant_generation=p_generation AND q.provider_event_id=p_event AND q.linked_intent_id=i.intent_id
 AND q.event_type='BILLING.SUBSCRIPTION.CREATED' AND s.event_type=q.event_type AND s.subscription_id=p_subscription
 AND s.proof_source='paypal_live_postback_success' FOR UPDATE OF q;
 IF NOT FOUND OR e.processing_state NOT IN('held','processed') OR e.lease_token IS NOT NULL THEN RETURN 'review_required';END IF;
 IF e.processing_state='held' AND e.claim_attempts>=3 THEN RETURN 'retry_exhausted';END IF;
 INSERT INTO supporter_private.gradual_qa_rechecks(request_id,merchant_generation,event_id,prior_state,prior_code,prior_attempts,
 provider_status,provider_status_at,observed_at,evidence_sha256)
 VALUES(p_request,p_generation,p_event,e.processing_state,e.last_diagnostic_code,e.claim_attempts,p_status,p_status_at,p_observed_at,p_evidence_sha256);
 IF e.processing_state='processed' THEN RETURN 'already_processed';END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='pending',retry_after=clock_timestamp(),last_diagnostic_code='qa_original_recheck_authorized'
 WHERE merchant_generation=p_generation AND provider_event_id=p_event;
 -- The original claim + signed receipt + provider GET + leased lifecycle writer
 -- must actually process it; original attempts/receipt/provider evidence remain.
 RETURN 'queued';
END $$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_qa_original_retry(uuid,bigint,text,text,text,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_qa_original_retry(uuid,bigint,text,text,text,text,timestamptz,timestamptz,text) TO service_role;

CREATE FUNCTION supporter_private.pazo_live_original_qa_reconcile_dispatch() RETURNS bigint
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.pazo_paypal_live_worker_control%ROWTYPE;token text;request_id bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND lifecycle='inactive' AND started_at IS NULL) THEN RAISE EXCEPTION 'Original QA reconciliation only before campaign start';END IF;
 SELECT * INTO c FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR NOT c.enabled OR NOT c.processing_enabled OR
 (c.last_dispatch_at IS NOT NULL AND c.last_dispatch_at>clock_timestamp()-interval '5 seconds') OR
 (c.drain_token IS NOT NULL AND c.drain_expires_at>=clock_timestamp()) OR
 (c.dispatch_expires_at IS NOT NULL AND c.dispatch_expires_at>=clock_timestamp()) THEN RETURN NULL;END IF;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 UPDATE supporter_private.pazo_paypal_live_worker_control SET dispatch_sha256=sha256(convert_to(token,'UTF8')),dispatch_expires_at=clock_timestamp()+interval '120 seconds' WHERE singleton;
 request_id:=net.http_post(url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker',body:=jsonb_build_object('action','qa_reconcile'),
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),timeout_milliseconds:=90000);
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=clock_timestamp() WHERE singleton;
 RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION supporter_private.pazo_live_original_qa_reconcile_dispatch() FROM PUBLIC,anon,authenticated,service_role;

-- Technical certification is distinct from the existing fresh-admin-MFA start.
-- Native checks fail closed; external code/alias/CI attestations are verified by
-- the authorized operator and recorded by SHA, never by a public browser flag.
CREATE TABLE supporter_private.gradual_hosted_gate_certificates(
 request_id uuid PRIMARY KEY,source_commit text NOT NULL CHECK(source_commit ~ '^[a-f0-9]{40}$'),
 frontend_commit text NOT NULL CHECK(frontend_commit ~ '^[a-f0-9]{40}$'),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 worker_bundle_sha256 text NOT NULL CHECK(worker_bundle_sha256 ~ '^[a-f0-9]{64}$'),
 checkout_bundle_sha256 text NOT NULL CHECK(checkout_bundle_sha256 ~ '^[a-f0-9]{64}$'),
 admin_bundle_sha256 text NOT NULL CHECK(admin_bundle_sha256 ~ '^[a-f0-9]{64}$'),
 official_origin text NOT NULL CHECK(official_origin='https://pazo-app.vercel.app'),
 campaign_revision bigint NOT NULL,release_revision bigint NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE supporter_private.gradual_hosted_gate_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.gradual_hosted_gate_certificates FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.gradual_hosted_gate_certificates FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION supporter_private.pazo_gradual_certify_hosted_gate(p_request uuid,p_revision bigint,p_source_commit text,p_frontend_commit text,
 p_evidence_sha256 text,p_worker_bundle text,p_checkout_bundle text,p_admin_bundle text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.gradual_campaign%ROWTYPE;r admin_private.pazo_live_release_control%ROWTYPE;old supporter_private.gradual_hosted_gate_certificates%ROWTYPE;
BEGIN
 IF p_request IS NULL OR p_revision IS NULL OR p_source_commit IS NULL OR p_source_commit !~ '^[a-f0-9]{40}$' OR
 p_frontend_commit IS NULL OR p_frontend_commit !~ '^[a-f0-9]{40}$' OR
 p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[a-f0-9]{64}$' OR p_worker_bundle IS NULL OR p_worker_bundle !~ '^[a-f0-9]{64}$' OR
 p_checkout_bundle IS NULL OR p_checkout_bundle !~ '^[a-f0-9]{64}$' OR p_admin_bundle IS NULL OR p_admin_bundle !~ '^[a-f0-9]{64}$' THEN RETURN 'invalid_evidence';END IF;
 SELECT * INTO c FROM supporter_private.gradual_campaign WHERE singleton FOR UPDATE;
 SELECT * INTO r FROM admin_private.pazo_live_release_control WHERE singleton FOR UPDATE;
 IF c.singleton IS DISTINCT FROM true OR r.singleton IS DISTINCT FROM true THEN RETURN 'campaign_changed';END IF;
 SELECT * INTO old FROM supporter_private.gradual_hosted_gate_certificates WHERE request_id=p_request;
 IF FOUND THEN RETURN CASE WHEN old.campaign_revision=p_revision AND old.source_commit=p_source_commit AND old.frontend_commit=p_frontend_commit AND old.evidence_sha256=p_evidence_sha256 AND old.worker_bundle_sha256=p_worker_bundle AND old.checkout_bundle_sha256=p_checkout_bundle AND old.admin_bundle_sha256=p_admin_bundle THEN 'already_certified' ELSE 'request_conflict' END;END IF;
 IF c.revision<>p_revision OR c.started_at IS NOT NULL OR c.lifecycle<>'inactive' OR c.capacity<>1 OR c.stage<>'L1_FIRST_REAL' THEN RETURN 'campaign_changed';END IF;
 IF supporter_private.gradual_legacy_open()>0 OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state<>'processed') OR
 EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds WHERE released_at IS NULL) OR
 EXISTS(SELECT 1 FROM supporter_private.gradual_incident WHERE resolved_at IS NULL) THEN RETURN 'financial_blocked';END IF;
 IF NOT admin_private.pazo_live_artifact_ready() OR r.mode<>'canary' OR
 NOT EXISTS(SELECT 1 FROM admin_private.pazo_live_release_artifact WHERE singleton AND return_origin='https://pazo-app.vercel.app') OR
 NOT EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings WHERE environment='live' AND return_origin='https://pazo-app.vercel.app') OR
 NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton AND environment='live' AND live_enabled AND NOT kill_switch AND active_generation=r.merchant_generation AND revision=r.revision) OR
 NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled AND expected_build='pazo_live_worker_v2' AND last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp() AND last_outcome IN('idle','processed')) OR
 c.webhook_ok_at IS NULL OR c.webhook_ok_at NOT BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp()
 THEN RETURN 'health_unverified';END IF;
 IF EXISTS(SELECT 1 FROM auth.users u WHERE u.created_at<'2026-10-23 22:59:00+00' AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts q WHERE q.owner_id=u.id)) OR
 EXISTS(SELECT 1 FROM auth.users u WHERE u.created_at<'2026-10-23 22:59:00+00' AND supporter_private.gradual_eligible(u.id)) OR
 EXISTS(SELECT 1 FROM supporter_private.gradual_invitation v WHERE NOT supporter_private.gradual_is_real_account(v.owner_id)) OR
 EXISTS(SELECT 1 FROM supporter_private.gradual_outbox o WHERE NOT supporter_private.gradual_is_real_account(o.owner_id))
 THEN RETURN 'qa_policy_unverified';END IF;
 INSERT INTO supporter_private.gradual_hosted_gate_certificates(request_id,source_commit,frontend_commit,evidence_sha256,worker_bundle_sha256,checkout_bundle_sha256,admin_bundle_sha256,official_origin,campaign_revision,release_revision)
 VALUES(p_request,p_source_commit,p_frontend_commit,p_evidence_sha256,p_worker_bundle,p_checkout_bundle,p_admin_bundle,'https://pazo-app.vercel.app',c.revision,r.revision);
 UPDATE supporter_private.gradual_campaign SET hosted_gate_verified=true,revision=revision+1 WHERE singleton;
 RETURN 'certified';
END $$;
REVOKE ALL ON FUNCTION supporter_private.pazo_gradual_certify_hosted_gate(uuid,bigint,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
