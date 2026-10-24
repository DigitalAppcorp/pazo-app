-- Issue85: durable prebeta classification, no deletion of Auth/financial history.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND lifecycle='inactive' AND started_at IS NULL) THEN RAISE EXCEPTION 'Cohort install requires inactive unstarted campaign';END IF;
END $$;
CREATE TABLE supporter_private.gradual_qa_accounts(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK(reason='prebeta_20261023'),
 classified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE supporter_private.gradual_qa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.gradual_qa_accounts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.gradual_qa_accounts FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO supporter_private.gradual_qa_accounts(owner_id,reason)
 SELECT id,'prebeta_20261023' FROM auth.users WHERE created_at<'2026-10-23 22:59:00+00';
ALTER TABLE supporter_private.gradual_admission ADD COLUMN real_account_at_admission boolean NOT NULL DEFAULT false;
CREATE FUNCTION supporter_private.gradual_is_real_account(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (EXISTS(SELECT 1 FROM auth.users WHERE id=p_owner AND created_at>='2026-10-23 22:59:00+00')
 OR EXISTS(SELECT 1 FROM supporter_private.gradual_admission WHERE owner_id=p_owner AND real_account_at_admission))
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts WHERE owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=p_owner);
$$;
REVOKE ALL ON FUNCTION supporter_private.gradual_is_real_account(uuid) FROM PUBLIC,anon,authenticated,service_role;

-- Historical real capacity survives Auth deletion, as required by GR05/EVT18.
-- QA rows never gain this flag just because their Auth row disappears.
UPDATE supporter_private.gradual_admission SET real_account_at_admission=supporter_private.gradual_is_real_account(owner_id);
CREATE FUNCTION supporter_private.gradual_classify_admission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.real_account_at_admission:=supporter_private.gradual_is_real_account(NEW.owner_id);
 ELSIF ROW(NEW.owner_id,NEW.real_account_at_admission) IS DISTINCT FROM ROW(OLD.owner_id,OLD.real_account_at_admission)
 THEN RAISE EXCEPTION 'Historical account classification is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION supporter_private.gradual_classify_admission() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER gradual_admission_cohort BEFORE INSERT OR UPDATE OF owner_id,real_account_at_admission
 ON supporter_private.gradual_admission FOR EACH ROW EXECUTE FUNCTION supporter_private.gradual_classify_admission();



CREATE OR REPLACE FUNCTION supporter_private.gradual_eligible(p_owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT supporter_private.gradual_is_real_account(p_owner) AND EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
 WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL AND u.is_anonymous IS DISTINCT FROM true
 AND p.onboarding_completed IS TRUE AND (u.banned_until IS NULL OR u.banned_until<statement_timestamp()))
 AND NOT EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control WHERE singleton AND canary_owner=p_owner)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM account_requests_private.deletion_requests WHERE subject_user_id=p_owner AND status IN('requested','processing'));
$$;

CREATE OR REPLACE FUNCTION supporter_private.gradual_verified(p_owner uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN supporter_private.gradual_is_real_account(p_owner) AND supporter_private.gradual_verified_core(p_owner);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION supporter_private.gradual_pump() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.gradual_campaign%ROWTYPE;entry record; used integer; verified integer; next_stage text; next_capacity integer; remaining integer; event_ceiling bigint; expired_count integer;
BEGIN
 SELECT * INTO c FROM supporter_private.gradual_campaign WHERE singleton FOR UPDATE;
 INSERT INTO supporter_private.gradual_incident(code) SELECT 'worker_unhealthy'
 WHERE c.started_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled AND last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp())
 ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;
 UPDATE supporter_private.gradual_incident SET resolved_at=clock_timestamp() WHERE code='worker_unhealthy' AND resolved_at IS NULL
 AND EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled AND last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp());
 SELECT coalesce(max(id),0) INTO event_ceiling FROM supporter_private.gradual_event WHERE processed_at IS NULL;
 -- Mark subscriptions actually admitted; historical admissions never get deleted.
 INSERT INTO supporter_private.gradual_admission(campaign_id,owner_id)
 SELECT c.id,q.owner_id FROM supporter_private.gradual_interest q JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=q.intent_id
 WHERE supporter_private.gradual_is_real_account(q.owner_id) AND (i.provider_status IN('ACTIVE','APPROVED','SUSPENDED') OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p WHERE p.intent_id=i.intent_id))
 ON CONFLICT DO NOTHING;
 FOR entry IN SELECT q.owner_id,q.intent_id,q.state,q.provider_started,q.slot_expires_at FROM supporter_private.gradual_interest q WHERE q.state NOT IN('withdrawn','declined') LOOP
  IF supporter_private.gradual_verified(entry.owner_id) THEN
   UPDATE supporter_private.gradual_interest SET state='benefits_active',revision=revision+1 WHERE owner_id=entry.owner_id AND state<>'benefits_active';
   PERFORM supporter_private.gradual_notice(entry.owner_id,'verified','benefits_active');
  ELSIF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p WHERE p.intent_id=entry.intent_id AND p.service_end>statement_timestamp() AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)) THEN
   UPDATE supporter_private.gradual_interest SET state='issue' WHERE owner_id=entry.owner_id;
   INSERT INTO supporter_private.gradual_incident(code) VALUES('benefits_pending') ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;
  ELSIF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.intent_id=entry.intent_id AND i.closed_at IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p WHERE p.intent_id=entry.intent_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox e WHERE e.linked_intent_id=entry.intent_id AND e.processing_state<>'processed')
   AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_admission a WHERE a.owner_id=entry.owner_id AND a.campaign_id=c.id) THEN
   UPDATE supporter_private.gradual_interest SET state='withdrawn',slot_token=NULL,slot_expires_at=NULL,provider_started=false WHERE owner_id=entry.owner_id;
  ELSIF entry.state IN('slot_granted','paying') AND NOT entry.provider_started AND entry.slot_expires_at<statement_timestamp()
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.intent_id=entry.intent_id AND (i.provider_create_claimed_at IS NOT NULL OR i.provider_subscription_id IS NOT NULL OR i.recovery_lease IS NOT NULL))
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox e WHERE e.linked_intent_id=entry.intent_id) THEN
   UPDATE supporter_private.pazo_paypal_live_checkout_intents SET closed_at=clock_timestamp(),closed_reason='unclaimed_abandoned' WHERE intent_id=entry.intent_id AND closed_at IS NULL;
   UPDATE supporter_private.gradual_interest SET state='withdrawn',slot_token=NULL,slot_expires_at=NULL WHERE owner_id=entry.owner_id;
  ELSIF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p JOIN supporter_private.pazo_paypal_live_period_holds h ON h.sale_id=p.sale_id AND h.released_at IS NULL WHERE p.intent_id=entry.intent_id) THEN
   UPDATE supporter_private.gradual_interest SET state='issue' WHERE owner_id=entry.owner_id;
   INSERT INTO supporter_private.gradual_incident(code) VALUES('financial_review') ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;
  ELSIF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p WHERE p.intent_id=entry.intent_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p WHERE p.intent_id=entry.intent_id AND p.service_end>statement_timestamp()) THEN
   UPDATE supporter_private.gradual_interest SET state='benefits_ended' WHERE owner_id=entry.owner_id AND state<>'benefits_ended';
  ELSIF entry.intent_id IS NOT NULL AND entry.state NOT IN('issue','benefits_active','benefits_ended') THEN
   UPDATE supporter_private.gradual_interest SET state=CASE WHEN EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.intent_id=entry.intent_id AND i.provider_status IN('ACTIVE','APPROVED')) THEN 'payment_verifying' ELSE 'paying' END WHERE owner_id=entry.owner_id;
  END IF;
 END LOOP;
 IF c.lifecycle IN('active','paused_automatic') AND NOT supporter_private.gradual_health() THEN
  UPDATE supporter_private.gradual_campaign SET lifecycle='paused_automatic',revision=revision+1 WHERE singleton AND lifecycle='active';
 END IF;
 IF c.lifecycle='active' AND supporter_private.gradual_health() THEN
  SELECT count(*) INTO verified FROM supporter_private.gradual_admission a WHERE a.campaign_id=c.id AND supporter_private.gradual_verified(a.owner_id);
  next_capacity:=CASE WHEN verified>=10 THEN 50 WHEN verified>=3 THEN 20 WHEN verified>=1 THEN 5 ELSE 1 END;
  IF next_capacity>c.capacity THEN
   next_stage:=CASE next_capacity WHEN 5 THEN 'L2_SMALL' WHEN 20 THEN 'L3_BETA' ELSE 'L4_EXTENDED' END;
   UPDATE supporter_private.gradual_campaign SET capacity=next_capacity,stage=next_stage,revision=revision+1 WHERE singleton;
   c.capacity:=next_capacity;
  END IF;
  SELECT count(*) INTO used FROM supporter_private.gradual_admission WHERE campaign_id=c.id AND supporter_private.gradual_is_real_account(owner_id);
  SELECT c.capacity-used-count(*) INTO remaining FROM supporter_private.gradual_interest q
   WHERE supporter_private.gradual_is_real_account(q.owner_id) AND q.slot_token IS NOT NULL AND q.state NOT IN('withdrawn','declined') AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_admission a WHERE a.campaign_id=c.id AND a.owner_id=q.owner_id);
  FOR entry IN SELECT q.owner_id FROM supporter_private.gradual_interest q WHERE q.state='waiting' AND supporter_private.gradual_eligible(q.owner_id) ORDER BY sequence LIMIT greatest(0,remaining) FOR UPDATE LOOP
   UPDATE supporter_private.gradual_interest SET state='slot_granted',slot_token=gen_random_uuid(),slot_expires_at=clock_timestamp()+make_interval(secs=>c.reservation_seconds),revision=revision+1 WHERE owner_id=entry.owner_id;
   PERFORM supporter_private.gradual_notice(entry.owner_id,'invitation','slot_granted');
  END LOOP;
  IF used>=50 THEN UPDATE supporter_private.gradual_campaign SET stage='LIMITED_COMPLETE',capacity=50,revision=revision+1 WHERE singleton AND stage<>'LIMITED_COMPLETE'; END IF;
 END IF;
 UPDATE supporter_private.gradual_invitation v SET state='expired' WHERE state='invited' AND expires_at<statement_timestamp()
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_interest q WHERE q.owner_id=v.owner_id AND q.intent_id IS NOT NULL);
 GET DIAGNOSTICS expired_count=ROW_COUNT;
 FOR entry IN SELECT owner_id FROM supporter_private.gradual_invitation WHERE state='expired' LOOP PERFORM supporter_private.gradual_notice(entry.owner_id,'invitation','expired'); END LOOP;
 IF c.lifecycle='active' AND supporter_private.gradual_health() THEN
  FOR entry IN SELECT u.id FROM auth.users u WHERE supporter_private.gradual_eligible(u.id)
   AND NOT supporter_private.gradual_verified(u.id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_invitation v WHERE v.owner_id=u.id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_interest q WHERE q.owner_id=u.id)
   ORDER BY u.created_at,u.id LIMIT greatest(0,5-(SELECT count(*)::integer FROM supporter_private.gradual_invitation v WHERE v.state IN('invited','interested') AND supporter_private.gradual_is_real_account(v.owner_id))) LOOP
   INSERT INTO supporter_private.gradual_invitation(owner_id,campaign_id,expires_at) VALUES(entry.id,c.id,clock_timestamp()+interval '72 hours');
   PERFORM supporter_private.gradual_notice(entry.id,'invitation','invited');
  END LOOP;
 END IF;
 UPDATE supporter_private.gradual_event SET processed_at=clock_timestamp() WHERE id<=event_ceiling AND processed_at IS NULL;
END $$;

CREATE OR REPLACE FUNCTION supporter_private.gradual_notice(p_owner uuid,p_kind text,p_state text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO supporter_private.gradual_outbox(campaign_id,owner_id,kind,desired_state)
 SELECT id,p_owner,p_kind,p_state FROM supporter_private.gradual_campaign WHERE singleton AND supporter_private.gradual_is_real_account(p_owner)
 ON CONFLICT(campaign_id,owner_id,kind) DO UPDATE SET desired_state=excluded.desired_state,
 version=gradual_outbox.version+1,next_attempt_at=clock_timestamp()
 WHERE gradual_outbox.desired_state<>excluded.desired_state AND gradual_outbox.kind='invitation';
$$;

CREATE OR REPLACE FUNCTION public.pazo_f16_gradual_notice_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o supporter_private.gradual_outbox%ROWTYPE;t uuid:=gen_random_uuid();
BEGIN
 PERFORM supporter_private.gradual_require_service();
 SELECT * INTO o FROM supporter_private.gradual_outbox WHERE supporter_private.gradual_is_real_account(owner_id) AND delivered_version<version AND next_attempt_at<=statement_timestamp()
 AND (lease_expires_at IS NULL OR lease_expires_at<statement_timestamp()) ORDER BY next_attempt_at,owner_id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;
 UPDATE supporter_private.gradual_outbox SET lease_token=t,lease_expires_at=clock_timestamp()+interval '2 minutes',attempts=attempts+1 WHERE campaign_id=o.campaign_id AND owner_id=o.owner_id AND kind=o.kind;
 RETURN jsonb_build_object('campaign',o.campaign_id,'owner',o.owner_id,'kind',o.kind,'version',o.version,'lease',t);
END $$;

CREATE OR REPLACE FUNCTION public.pazo_f16_gradual_notice_deliver(p_campaign uuid,p_owner uuid,p_kind text,p_version bigint,p_lease uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o supporter_private.gradual_outbox%ROWTYPE;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 IF NOT supporter_private.gradual_is_real_account(p_owner) THEN RETURN false;END IF;
 SELECT * INTO o FROM supporter_private.gradual_outbox WHERE campaign_id=p_campaign AND owner_id=p_owner AND kind=p_kind FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.gradual_campaign WHERE singleton AND started_at IS NOT NULL) THEN RETURN false;END IF;
 IF o.notification_id IS NULL OR o.version<>p_version OR o.lease_token IS DISTINCT FROM p_lease OR o.lease_expires_at<statement_timestamp() OR p_lease IS NULL THEN RETURN false;END IF;
 IF o.kind='verified' AND NOT supporter_private.gradual_verified(p_owner) THEN
  UPDATE supporter_private.gradual_outbox SET lease_token=NULL,lease_expires_at=NULL,next_attempt_at=clock_timestamp()+interval '1 minute' WHERE notification_id=o.notification_id;RETURN false;
 END IF;
 INSERT INTO public.notifications(id,user_id,type,title,body,source_id,supporter_state,supporter_copy_version)
 VALUES(o.notification_id,p_owner,CASE o.kind WHEN 'verified' THEN 'supporter_verified' ELSE 'supporter_campaign' END,
 CASE o.kind WHEN 'verified' THEN '¡Ya eres Amigo de PAZO!' ELSE '¿Te gustaría apoyar PAZO por US$2.99 al mes?' END,
 CASE o.kind WHEN 'verified' THEN 'Tu pago y tus beneficios están verificados. Revisa tu insignia y acceso si lo deseas.' ELSE 'Participar es voluntario. PAZO sigue siendo gratis. La cola no genera cobros.' END,
 p_campaign,o.desired_state,(SELECT notification_version FROM supporter_private.gradual_campaign WHERE singleton))
 ON CONFLICT(id) DO UPDATE SET supporter_state=excluded.supporter_state,read_at=NULL
 WHERE notifications.supporter_state IS DISTINCT FROM excluded.supporter_state;
 UPDATE supporter_private.gradual_outbox SET delivered_version=p_version,lease_token=NULL,lease_expires_at=NULL WHERE notification_id=o.notification_id;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.pazo_admin_gradual_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.gradual_campaign%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';END IF;
 SELECT * INTO c FROM supporter_private.gradual_campaign WHERE singleton;
 RETURN jsonb_build_object('source','gradual_admin_v1','stage',c.stage,'state',c.lifecycle,'revision',c.revision,'capacity',c.capacity,
 'hostedGateVerified',c.hosted_gate_verified,'healthy',supporter_private.gradual_health(),
 'admitted',(SELECT count(*) FROM supporter_private.gradual_admission WHERE supporter_private.gradual_is_real_account(owner_id) AND campaign_id=c.id),
 'reserved',(SELECT count(*) FROM supporter_private.gradual_interest q WHERE supporter_private.gradual_is_real_account(q.owner_id) AND slot_token IS NOT NULL AND state NOT IN('declined','withdrawn') AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_admission a WHERE a.owner_id=q.owner_id AND a.campaign_id=c.id)),
 'waiting',(SELECT count(*) FROM supporter_private.gradual_interest WHERE supporter_private.gradual_is_real_account(owner_id) AND state='waiting'),
 'paying',(SELECT count(*) FROM supporter_private.gradual_interest WHERE supporter_private.gradual_is_real_account(owner_id) AND state IN('paying','payment_verifying')),
 'verified',(SELECT count(*) FROM supporter_private.gradual_admission a WHERE supporter_private.gradual_is_real_account(a.owner_id) AND supporter_private.gradual_verified(a.owner_id)),
 'abandoned',(SELECT count(*) FROM supporter_private.gradual_interest WHERE supporter_private.gradual_is_real_account(owner_id) AND state='withdrawn'),
 'feedbackOk',(SELECT count(*) FROM supporter_private.gradual_interest WHERE supporter_private.gradual_is_real_account(owner_id) AND feedback='ok'),
 'feedbackIssues',(SELECT count(*) FROM supporter_private.gradual_interest WHERE supporter_private.gradual_is_real_account(owner_id) AND feedback='issue'),
 'notificationsPending',(SELECT count(*) FROM supporter_private.gradual_outbox WHERE supporter_private.gradual_is_real_account(owner_id) AND delivered_version<version),
 'notificationsDelivered',(SELECT count(*) FROM supporter_private.gradual_outbox WHERE supporter_private.gradual_is_real_account(owner_id) AND delivered_version>0),
 'legacyOpen',supporter_private.gradual_legacy_open(),
 'incidents',(SELECT coalesce(jsonb_agg(code ORDER BY code),'[]'::jsonb) FROM supporter_private.gradual_incident WHERE resolved_at IS NULL),
 'realRevenueMinor',(SELECT coalesce(sum(p.amount_minor),0) FROM supporter_private.pazo_paypal_live_paid_periods p WHERE EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.intent_id=p.intent_id AND supporter_private.gradual_is_real_account(i.owner_id)) AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),
 'qaExcludedAccounts',(SELECT count(*) FROM supporter_private.gradual_qa_accounts),'realEligibleAccounts',(SELECT count(*) FROM auth.users WHERE supporter_private.gradual_eligible(id)),'courtesyIsRevenue',false,'workerHealthy',EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND last_heartbeat_at>statement_timestamp()-interval '5 minutes'),
 'audit',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM(SELECT action,from_revision,to_revision,happened_at FROM supporter_private.gradual_audit ORDER BY happened_at DESC LIMIT 20)x));
END $$;

CREATE OR REPLACE FUNCTION public.pazo_admin_live_finance_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE totals jsonb; subscriptions jsonb; at timestamptz:=pg_catalog.statement_timestamp();
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin()
 THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'verifiedPayments',count(*),
  'grossVerifiedMinor',COALESCE(sum(p.amount_minor),0),
  'heldPayments',count(*) FILTER(WHERE EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
    WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),
  'heldGrossMinor',COALESCE(sum(p.amount_minor) FILTER(WHERE EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
    WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),0))
 INTO totals FROM supporter_private.pazo_paypal_live_paid_periods p WHERE EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.intent_id=p.intent_id AND supporter_private.gradual_is_real_account(i.owner_id));
 SELECT pg_catalog.jsonb_build_object(
  'openRequests',count(*) FILTER(WHERE i.closed_at IS NULL),
  'unboundRequests',count(*) FILTER(WHERE i.closed_at IS NULL AND i.state='pending'),
  'closedUnsentRequests',count(*) FILTER(WHERE i.closed_reason='unclaimed_abandoned'),
  'confirmedCancellations',count(*) FILTER(WHERE EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims c
    WHERE c.intent_id=i.intent_id AND c.state='confirmed'
     AND c.provider_confirmed_at IS NOT NULL)))
 INTO subscriptions FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE supporter_private.gradual_is_real_account(i.owner_id);
 RETURN pg_catalog.jsonb_build_object('source','pazo_verified_live_ledger',
  'environment','live','currency','USD','asOf',at,
  'providerStatement',false,'paidThrough',NULL,
  'payments',totals,'subscriptions',subscriptions,
  'activePaidAccounts',(SELECT count(*) FROM (
   SELECT DISTINCT owner_id FROM supporter_private.pazo_paypal_live_checkout_intents WHERE supporter_private.gradual_is_real_account(owner_id)
  ) owners WHERE supporter_private.pazo_live_project_paid_periods(owners.owner_id,at)->>'active'='true'));
END $f$;


REVOKE ALL ON FUNCTION public.pazo_admin_live_finance_summary() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_live_finance_summary() TO authenticated;
COMMIT;
