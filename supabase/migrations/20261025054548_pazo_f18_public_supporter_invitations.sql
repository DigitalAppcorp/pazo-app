-- F18. PREPARED ONLY. Apply individually after production approval; never db push.
-- No history/ledger deletion, no credential rotation and no financial activation.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.notifications DROP CONSTRAINT notifications_supporter_copy_version_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_supporter_copy_version_check CHECK(supporter_copy_version IS NULL OR supporter_copy_version IN('review_v1','thanks_v2','public_v1'));
ALTER TABLE public.notifications DROP CONSTRAINT notifications_supporter_state_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_supporter_state_check CHECK(supporter_state IS NULL OR supporter_state IN('invited','waiting','slot_granted','declined','expired','benefits_active','reminder'));
CREATE TABLE supporter_private.public_supporter_control(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 checkouts_enabled boolean NOT NULL DEFAULT false,
 invitations_enabled boolean NOT NULL DEFAULT false,
 hosted_certified boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 campaign_id uuid NOT NULL DEFAULT '18000000-0000-4000-8000-000000000001',
 webhook_ok_at timestamptz,
 reminder_days integer NOT NULL DEFAULT 14 CHECK(reminder_days=14)
);
INSERT INTO supporter_private.public_supporter_control(singleton) VALUES(true);
CREATE TABLE admin_private.public_supporter_certificates(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 merchant_generation bigint NOT NULL REFERENCES admin_private.pazo_paypal_merchant_generations(generation),
 source_commit text NOT NULL CHECK(source_commit ~ '^[a-f0-9]{40}$'),
 sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[a-f0-9]{64}$'),
 bundle_sha256 text NOT NULL CHECK(bundle_sha256 ~ '^[a-f0-9]{64}$'),
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE admin_private.public_supporter_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.public_supporter_certificates FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.public_supporter_certificates FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE admin_private.public_supporter_certificates_id_seq FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION supporter_private.certify_public_supporter(p_commit text,p_sql_sha256 text,p_bundle_sha256 text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE generation bigint;
BEGIN
 IF p_commit IS NULL OR p_commit !~ '^[a-f0-9]{40}$' OR p_sql_sha256 IS NULL OR p_sql_sha256 !~ '^[a-f0-9]{64}$' OR p_bundle_sha256 IS NULL OR p_bundle_sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid certification';END IF;
 IF NOT admin_private.pazo_live_artifact_ready() THEN RAISE EXCEPTION 'Original engineering gate unavailable';END IF;
 SELECT merchant_generation INTO generation FROM admin_private.pazo_live_release_control WHERE singleton;
 IF generation IS NULL THEN RAISE EXCEPTION 'Original merchant unavailable';END IF;
 INSERT INTO admin_private.public_supporter_certificates(merchant_generation,source_commit,sql_sha256,bundle_sha256) VALUES(generation,p_commit,p_sql_sha256,p_bundle_sha256);
 UPDATE supporter_private.public_supporter_control SET hosted_certified=true WHERE singleton AND NOT checkouts_enabled AND NOT invitations_enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Certification requires financial and promotional pause';END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION supporter_private.certify_public_supporter(text,text,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE supporter_private.supporter_engagement(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_use_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 returned_at timestamptz,
 meaningful_at timestamptz
);
CREATE TABLE supporter_private.supporter_promotion(
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 campaign_id uuid NOT NULL,
 qualified_at timestamptz,
 render_token uuid,
 render_claimed_at timestamptz,
 render_expires_at timestamptz,
 display_committed_at timestamptz,
 first_impression_at timestamptz,
 first_action text CHECK(first_action IN('explore','later','close')),
 offer_opened_at timestamptz,
 offer_source text CHECK(offer_source IN('manual','invitation','notification','paypal')),
 opted_out_at timestamptz,
 suppressed_at timestamptz,
 reminder_id uuid NOT NULL DEFAULT gen_random_uuid(),
 reminder_delivered_at timestamptz,
 PRIMARY KEY(owner_id,campaign_id), UNIQUE(reminder_id)
);
CREATE INDEX supporter_promotion_due ON supporter_private.supporter_promotion(campaign_id,first_impression_at,offer_opened_at)
 WHERE reminder_delivered_at IS NULL AND opted_out_at IS NULL AND suppressed_at IS NULL;
CREATE TABLE supporter_private.supporter_payment_notice(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 notification_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 delivered_at timestamptz,
 feedback text CHECK(feedback IN('ok','issue','skipped')),
 component text CHECK(component IN('badge','profile_posts','access','management')),
 feedback_at timestamptz,
 support_request uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE admin_private.public_supporter_audit(
 request_id uuid PRIMARY KEY, actor_id uuid NOT NULL, action text NOT NULL,
 from_revision bigint NOT NULL, to_revision bigint NOT NULL,
 happened_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['public_supporter_control','supporter_engagement','supporter_promotion','supporter_payment_notice'] LOOP
  EXECUTE format('ALTER TABLE supporter_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE supporter_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON supporter_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
 END LOOP;
END $$;
ALTER TABLE admin_private.public_supporter_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.public_supporter_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.public_supporter_audit FROM PUBLIC,anon,authenticated,service_role;

-- Account safety is independent of a campaign, a canary operator or courtesy.
CREATE FUNCTION supporter_private.public_supporter_eligible(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
 WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL AND u.is_anonymous IS DISTINCT FROM true
 AND p.onboarding_completed IS TRUE AND (u.banned_until IS NULL OR u.banned_until<statement_timestamp()))
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts WHERE owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM account_requests_private.deletion_requests WHERE subject_user_id=p_owner AND status IN('requested','processing'));
$$;
CREATE FUNCTION supporter_private.public_supporter_paid(p_owner uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN RETURN NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts WHERE owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=p_owner)
 AND supporter_private.gradual_verified_core(p_owner);
EXCEPTION WHEN OTHERS THEN RETURN false; END $$;
CREATE FUNCTION supporter_private.public_supporter_pending(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.owner_id=p_owner AND i.closed_at IS NULL);
$$;
CREATE FUNCTION supporter_private.public_supporter_courtesy(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM supporter_private.pazo_admin_gift_access WHERE owner_id=p_owner AND revoked_at IS NULL AND granted_at<=statement_timestamp() AND (expires_at IS NULL OR expires_at>statement_timestamp()));
$$;
CREATE FUNCTION supporter_private.public_supporter_health() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT admin_private.pazo_live_artifact_ready()
 AND EXISTS(SELECT 1 FROM supporter_private.public_supporter_control WHERE singleton AND hosted_certified
  AND webhook_ok_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp())
 AND EXISTS(SELECT 1 FROM admin_private.public_supporter_certificates c JOIN admin_private.pazo_live_release_control r ON r.singleton AND r.merchant_generation=c.merchant_generation)
 AND EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled
  AND expected_build='pazo_live_worker_v2' AND last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp())
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_incident WHERE resolved_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state='held')
 AND (SELECT count(*)=2 FROM supporter_private.pazo_live_offer_versions WHERE price_minor=299 AND currency='USD' AND locale IN('es','en'));
$$;
CREATE FUNCTION supporter_private.public_supporter_verified_sale(p_sale text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
 JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
 JOIN supporter_private.pazo_paypal_live_event_inbox e ON e.merchant_generation=p.merchant_generation AND e.provider_event_id=p.provider_event_id AND e.linked_intent_id=i.intent_id
 JOIN supporter_private.pazo_paypal_live_signed_receipts r ON r.merchant_generation=p.merchant_generation AND r.provider_event_id=p.provider_event_id
 JOIN admin_private.pazo_paypal_merchant_generations g ON g.generation=p.merchant_generation AND g.environment='live' AND g.plan_id=i.plan_id AND g.webhook_id=r.signature_webhook_id
 WHERE p.sale_id=p_sale AND p.verified_event_type='PAYMENT.SALE.COMPLETED' AND p.amount_minor=299 AND p.currency='USD'
 AND i.source_environment='live' AND r.proof_source='paypal_live_postback_success' AND r.subscription_id=i.provider_subscription_id AND r.subject_id=p.sale_id
 AND r.event_type='PAYMENT.SALE.COMPLETED' AND e.event_type='PAYMENT.SALE.COMPLETED' AND e.processing_state='processed'
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts WHERE owner_id=i.owner_id)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=i.owner_id));
$$;
CREATE OR REPLACE FUNCTION public.pazo_admin_live_finance_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE totals jsonb;subscriptions jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';END IF;
 SELECT jsonb_build_object('verifiedPayments',count(*),'grossVerifiedMinor',coalesce(sum(p.amount_minor),0),
 'heldPayments',count(*) FILTER(WHERE EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),
 'heldGrossMinor',coalesce(sum(p.amount_minor) FILTER(WHERE EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),0)) INTO totals
 FROM supporter_private.pazo_paypal_live_paid_periods p WHERE supporter_private.public_supporter_verified_sale(p.sale_id);
 SELECT jsonb_build_object('openRequests',count(*) FILTER(WHERE i.closed_at IS NULL),'unboundRequests',count(*) FILTER(WHERE i.closed_at IS NULL AND i.state='pending'),
 'closedUnsentRequests',count(*) FILTER(WHERE i.closed_reason='unclaimed_abandoned'),
 'confirmedCancellations',count(*) FILTER(WHERE EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims c WHERE c.intent_id=i.intent_id AND c.state='confirmed' AND c.provider_confirmed_at IS NOT NULL))) INTO subscriptions
 FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts WHERE owner_id=i.owner_id) AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=i.owner_id);
 RETURN jsonb_build_object('source','pazo_verified_live_ledger','environment','live','currency','USD','asOf',statement_timestamp(),'providerStatement',false,'paidThrough',NULL,
 'payments',totals,'subscriptions',subscriptions,'activePaidAccounts',(SELECT count(*) FROM auth.users WHERE supporter_private.public_supporter_paid(id)));
END $$;
CREATE OR REPLACE FUNCTION admin_private.pazo_live_control_admits(p_owner uuid,p_generation bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT supporter_private.public_supporter_eligible(p_owner) AND supporter_private.public_supporter_health()
 AND EXISTS(SELECT 1 FROM supporter_private.public_supporter_control WHERE singleton AND checkouts_enabled)
 AND EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control r
 JOIN admin_private.pazo_paypal_new_checkout_switch s ON s.singleton AND s.revision=r.revision
 WHERE r.singleton AND r.mode='public' AND r.merchant_generation=p_generation AND s.active_generation=p_generation
 AND s.environment='live' AND s.live_enabled AND NOT s.kill_switch);
$$;
-- Keep the original per-owner lock, consent/version/digest, original merchant,
-- one open intent, origin and one provider claim. Remove only quota wrappers.
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_checkout_begin(p_owner uuid,p_request_key uuid,p_generation bigint,p_locale text,p_terms_version text,p_terms_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM supporter_private.gradual_require_service();
 PERFORM 1 FROM supporter_private.public_supporter_control WHERE singleton FOR SHARE;
 RETURN supporter_private.gradual_original_checkout_begin(p_owner,p_request_key,p_generation,p_locale,p_terms_version,p_terms_digest);
END $$;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provider_claim_with_origin(p_owner uuid,p_intent text,p_request_key uuid,p_generation bigint,p_origin text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM supporter_private.gradual_require_service();
 PERFORM 1 FROM supporter_private.public_supporter_control WHERE singleton FOR SHARE;
 RETURN supporter_private.gradual_original_provider_claim(p_owner,p_intent,p_request_key,p_generation,p_origin);
END $$;

-- Server timestamps and committed domain writes only. No private record content.
CREATE FUNCTION supporter_private.supporter_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid;
BEGIN
 IF TG_TABLE_NAME='posts' THEN who:=NEW.user_id;
 ELSIF TG_TABLE_NAME='community_posts' THEN SELECT owner_id INTO who FROM public.pets WHERE id=NEW.author_pet_id;
 ELSE SELECT owner_id INTO who FROM public.pets WHERE id=NEW.pet_id; END IF;
 IF who IS NOT NULL THEN
  INSERT INTO supporter_private.supporter_engagement(owner_id,meaningful_at) VALUES(who,clock_timestamp())
  ON CONFLICT(owner_id) DO UPDATE SET meaningful_at=coalesce(supporter_engagement.meaningful_at,excluded.meaningful_at);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER supporter_meaningful_post AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION supporter_private.supporter_activity();
CREATE TRIGGER supporter_meaningful_community AFTER INSERT ON public.community_posts FOR EACH ROW EXECUTE FUNCTION supporter_private.supporter_activity();
CREATE TRIGGER supporter_meaningful_care AFTER INSERT ON public.care_completions FOR EACH ROW EXECUTE FUNCTION supporter_private.supporter_activity();
CREATE TRIGGER supporter_meaningful_qr AFTER UPDATE OF rotated_at ON public.pet_public_links FOR EACH ROW
 WHEN(NEW.rotated_at IS DISTINCT FROM OLD.rotated_at AND NEW.enabled) EXECUTE FUNCTION supporter_private.supporter_activity();

CREATE FUNCTION public.pazo_supporter_visit() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid();
BEGIN
 IF who IS NULL OR NOT supporter_private.public_supporter_eligible(who) THEN RETURN false; END IF;
 INSERT INTO supporter_private.supporter_engagement(owner_id) VALUES(who)
 ON CONFLICT(owner_id) DO UPDATE SET returned_at=coalesce(supporter_engagement.returned_at,
 CASE WHEN (supporter_engagement.first_use_at AT TIME ZONE 'UTC')::date<(clock_timestamp() AT TIME ZONE 'UTC')::date THEN clock_timestamp() END);
 RETURN true;
END $$;
CREATE FUNCTION public.pazo_supporter_qr_used(p_pet uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid();
BEGIN
 IF who IS NULL OR NOT supporter_private.public_supporter_eligible(who) OR NOT EXISTS(
  SELECT 1 FROM public.pets p JOIN public.pet_public_links l ON l.pet_id=p.id WHERE p.id=p_pet AND p.owner_id=who AND l.enabled)
 THEN RETURN false;END IF;
 INSERT INTO supporter_private.supporter_engagement(owner_id,meaningful_at) VALUES(who,clock_timestamp())
 ON CONFLICT(owner_id) DO UPDATE SET meaningful_at=coalesce(supporter_engagement.meaningful_at,excluded.meaningful_at);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.pazo_supporter_qr_used(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_qr_used(uuid) TO authenticated;
CREATE FUNCTION public.pazo_supporter_promotion(p_action text,p_token uuid DEFAULT NULL,p_source text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid(); c supporter_private.public_supporter_control%ROWTYPE; p supporter_private.supporter_promotion%ROWTYPE; allowed boolean;
BEGIN
 IF who IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN('claim','display','shown','explore','later','close','offer','opt_out') THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023';END IF;
 SELECT * INTO c FROM supporter_private.public_supporter_control WHERE singleton FOR SHARE;
 INSERT INTO supporter_private.supporter_promotion(owner_id,campaign_id) VALUES(who,c.campaign_id) ON CONFLICT DO NOTHING;
 SELECT * INTO p FROM supporter_private.supporter_promotion WHERE owner_id=who AND campaign_id=c.campaign_id FOR UPDATE;
 IF p_action='opt_out' THEN
  IF p_token IS NOT NULL AND p.render_token IS DISTINCT FROM p_token THEN RETURN jsonb_build_object('source','supporter_promotion_v1','show',false);END IF;
  UPDATE supporter_private.supporter_promotion SET opted_out_at=coalesce(opted_out_at,clock_timestamp()) WHERE owner_id=who AND campaign_id=c.campaign_id;
 ELSIF p_action='offer' THEN
  IF p_source IS NULL OR p_source NOT IN('manual','invitation','notification','paypal') THEN RAISE EXCEPTION 'Invalid source' USING ERRCODE='22023';END IF;
  UPDATE supporter_private.supporter_promotion SET offer_opened_at=coalesce(offer_opened_at,clock_timestamp()),offer_source=coalesce(offer_source,p_source) WHERE owner_id=who AND campaign_id=c.campaign_id;
 ELSIF p_action='display' AND p.render_token=p_token AND p_token IS NOT NULL AND p.display_committed_at IS NULL AND p.render_expires_at>=statement_timestamp()
  AND c.invitations_enabled AND p.opted_out_at IS NULL AND p.suppressed_at IS NULL AND p.offer_opened_at IS NULL
  AND NOT EXISTS(SELECT 1 FROM supporter_private.supporter_promotion previous WHERE previous.owner_id=who AND previous.opted_out_at IS NOT NULL)
  AND supporter_private.public_supporter_eligible(who) AND NOT supporter_private.public_supporter_paid(who)
  AND NOT supporter_private.public_supporter_pending(who) AND NOT supporter_private.public_supporter_courtesy(who)
  AND NOT EXISTS(SELECT 1 FROM public.pets WHERE owner_id=who AND is_lost) THEN
  UPDATE supporter_private.supporter_promotion SET display_committed_at=clock_timestamp() WHERE owner_id=who AND campaign_id=c.campaign_id;
  RETURN jsonb_build_object('source','supporter_promotion_v1','show',true,'token',p.render_token);
 ELSIF p_action IN('shown','explore','later','close') AND p.render_token=p_token AND p_token IS NOT NULL AND p.display_committed_at IS NOT NULL THEN
  IF p_action='shown' THEN
   UPDATE supporter_private.supporter_promotion SET first_impression_at=coalesce(first_impression_at,clock_timestamp()) WHERE owner_id=who AND campaign_id=c.campaign_id;
  ELSE
   UPDATE supporter_private.supporter_promotion SET first_action=coalesce(first_action,p_action),first_impression_at=coalesce(first_impression_at,clock_timestamp()) WHERE owner_id=who AND campaign_id=c.campaign_id;
  END IF;
 ELSIF p_action='claim' THEN
  allowed:=c.invitations_enabled AND supporter_private.public_supporter_eligible(who)
   AND NOT supporter_private.public_supporter_pending(who) AND NOT supporter_private.public_supporter_paid(who) AND NOT supporter_private.public_supporter_courtesy(who)
   AND p.display_committed_at IS NULL AND (p.render_claimed_at IS NULL OR p.render_expires_at<statement_timestamp())
   AND p.first_impression_at IS NULL AND p.offer_opened_at IS NULL AND p.opted_out_at IS NULL AND p.suppressed_at IS NULL
   AND NOT EXISTS(SELECT 1 FROM supporter_private.supporter_promotion previous WHERE previous.owner_id=who AND previous.opted_out_at IS NOT NULL)
   AND EXISTS(SELECT 1 FROM supporter_private.supporter_engagement WHERE owner_id=who AND returned_at IS NOT NULL AND meaningful_at IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM public.pets WHERE owner_id=who AND is_lost);
  IF allowed THEN
   UPDATE supporter_private.supporter_promotion SET qualified_at=coalesce(qualified_at,clock_timestamp()),render_token=gen_random_uuid(),render_claimed_at=clock_timestamp(),render_expires_at=clock_timestamp()+interval '1 minute'
    WHERE owner_id=who AND campaign_id=c.campaign_id RETURNING * INTO p;
   RETURN jsonb_build_object('source','supporter_promotion_v1','show',true,'token',p.render_token);
  END IF;
 END IF;
 RETURN jsonb_build_object('source','supporter_promotion_v1','show',false);
END $$;

CREATE FUNCTION public.pazo_supporter_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid(); paid boolean; pending boolean;
BEGIN
 IF who IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';END IF;
 paid:=supporter_private.public_supporter_paid(who); pending:=supporter_private.public_supporter_pending(who);
 RETURN jsonb_build_object('source','public_supporter_v1','paid',paid,'pending',pending,
 'eligible',supporter_private.public_supporter_eligible(who),
 'checkoutReady',EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control WHERE singleton AND admin_private.pazo_live_control_admits(who,merchant_generation)),
 'feedback',(SELECT feedback FROM supporter_private.supporter_payment_notice WHERE owner_id=who));
END $$;
CREATE FUNCTION public.pazo_supporter_feedback(p_feedback text,p_component text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid(); n supporter_private.supporter_payment_notice%ROWTYPE;
BEGIN
 IF who IS NULL OR NOT supporter_private.public_supporter_paid(who) THEN RAISE EXCEPTION 'Verified paid benefits required' USING ERRCODE='42501';END IF;
 IF p_feedback IS NULL OR p_feedback NOT IN('ok','issue','skipped') OR (p_feedback='issue' AND coalesce(p_component,'') NOT IN('badge','profile_posts','access','management')) THEN RAISE EXCEPTION 'Invalid feedback' USING ERRCODE='22023';END IF;
 INSERT INTO supporter_private.supporter_payment_notice(owner_id) VALUES(who) ON CONFLICT DO NOTHING;
 SELECT * INTO n FROM supporter_private.supporter_payment_notice WHERE owner_id=who FOR UPDATE;
 IF n.feedback IS NOT NULL THEN RETURN true;END IF;
 IF p_feedback='issue' THEN PERFORM public.pazo_submit_support_ticket(n.support_request,'other','Amigo de PAZO: revisión voluntaria de beneficios ('||p_component||').');END IF;
 UPDATE supporter_private.supporter_payment_notice SET feedback=p_feedback,component=CASE WHEN p_feedback='issue' THEN p_component END,feedback_at=clock_timestamp() WHERE owner_id=who;
 RETURN true;
END $$;

-- Atomic inbox INSERT + delivery ACK. SKIP LOCKED and unique IDs make concurrent
-- worker batches / unknown HTTP outcomes safe. No push, email or SMS path.
CREATE FUNCTION public.pazo_f18_supporter_tick(p_webhook_ready boolean,p_financial_review boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.public_supporter_control%ROWTYPE; p record; n supporter_private.supporter_payment_notice%ROWTYPE; reminders integer:=0; thanks integer:=0;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 UPDATE supporter_private.public_supporter_control SET webhook_ok_at=CASE WHEN p_webhook_ready IS TRUE THEN statement_timestamp() END WHERE singleton RETURNING * INTO c;
 IF p_financial_review IS TRUE THEN INSERT INTO supporter_private.gradual_incident(code) VALUES('financial_review') ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;END IF;
 -- Financial notifications are independent of promotional consent/pause.
 FOR p IN SELECT DISTINCT i.owner_id FROM supporter_private.pazo_paypal_live_checkout_intents i
  WHERE EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods pp WHERE pp.intent_id=i.intent_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.supporter_payment_notice pn WHERE pn.owner_id=i.owner_id AND pn.delivered_at IS NOT NULL)
  ORDER BY i.owner_id LIMIT 100 LOOP
  IF NOT supporter_private.public_supporter_paid(p.owner_id) THEN CONTINUE;END IF;
  INSERT INTO supporter_private.supporter_payment_notice(owner_id) VALUES(p.owner_id) ON CONFLICT DO NOTHING;
  SELECT * INTO n FROM supporter_private.supporter_payment_notice WHERE owner_id=p.owner_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND OR n.delivered_at IS NOT NULL THEN CONTINUE;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE user_id=p.owner_id AND type='supporter_verified') THEN
   INSERT INTO public.notifications(id,user_id,type,title,body,source_id,supporter_state,supporter_copy_version)
   VALUES(n.notification_id,p.owner_id,'supporter_verified','¡Ya eres Amigo de PAZO!','Tu pago y tus beneficios están verificados. Gracias por apoyar PAZO.',c.campaign_id,'benefits_active','thanks_v2') ON CONFLICT(id) DO NOTHING;
  END IF;
  UPDATE supporter_private.supporter_payment_notice SET delivered_at=clock_timestamp() WHERE owner_id=p.owner_id;
  UPDATE supporter_private.supporter_promotion SET suppressed_at=coalesce(suppressed_at,clock_timestamp()) WHERE owner_id=p.owner_id;
  thanks:=thanks+1;
 END LOOP;
 IF c.invitations_enabled THEN
  FOR p IN SELECT * FROM supporter_private.supporter_promotion WHERE campaign_id=c.campaign_id AND reminder_delivered_at IS NULL
   AND opted_out_at IS NULL AND suppressed_at IS NULL AND coalesce(first_impression_at,offer_opened_at)<=statement_timestamp()-interval '14 days'
   ORDER BY coalesce(first_impression_at,offer_opened_at),owner_id LIMIT 100 FOR UPDATE SKIP LOCKED LOOP
   IF NOT supporter_private.public_supporter_eligible(p.owner_id) OR supporter_private.public_supporter_pending(p.owner_id)
    OR EXISTS(SELECT 1 FROM supporter_private.supporter_promotion previous WHERE previous.owner_id=p.owner_id AND previous.opted_out_at IS NOT NULL)
    OR supporter_private.public_supporter_paid(p.owner_id) OR supporter_private.public_supporter_courtesy(p.owner_id) OR EXISTS(SELECT 1 FROM public.pets WHERE owner_id=p.owner_id AND is_lost) THEN CONTINUE;END IF;
   INSERT INTO public.notifications(id,user_id,type,title,body,source_id,supporter_state,supporter_copy_version)
   VALUES(p.reminder_id,p.owner_id,'supporter_campaign','Ayúdanos a seguir creciendo','Apoyo voluntario de US$2.99 al mes. PAZO sigue siendo gratis.',c.campaign_id,'reminder','public_v1') ON CONFLICT(id) DO NOTHING;
   UPDATE supporter_private.supporter_promotion SET reminder_delivered_at=clock_timestamp() WHERE owner_id=p.owner_id AND campaign_id=p.campaign_id;
   reminders:=reminders+1;
  END LOOP;
 END IF;
 RETURN jsonb_build_object('source','public_supporter_tick_v1','reminders',reminders,'thanks',thanks);
END $$;

-- Retire executable commercial entrypoints without deleting their history.
CREATE OR REPLACE FUNCTION supporter_private.gradual_pump() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN RETURN; END $$;
REVOKE EXECUTE ON FUNCTION public.pazo_gradual_my_status(),public.pazo_gradual_interest(text),public.pazo_gradual_feedback(text,text),public.pazo_admin_gradual_status(),public.pazo_f16_gradual_admin_action(uuid,text,bigint,uuid),public.pazo_f16_gradual_notice_claim(),public.pazo_f16_gradual_notice_deliver(uuid,uuid,text,bigint,uuid),public.pazo_f16_gradual_tick(boolean,boolean) FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE supporter_private.pazo_paypal_live_paid_periods DISABLE TRIGGER gradual_paid_event;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents DISABLE TRIGGER gradual_intent_event;
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox DISABLE TRIGGER gradual_inbox_event;
-- Preserve previous feedback/explicit campaign declines and voluntary knowledge.
INSERT INTO supporter_private.supporter_payment_notice(owner_id,feedback,component,feedback_at)
 SELECT owner_id,feedback,feedback_component,feedback_at FROM supporter_private.gradual_interest WHERE feedback IS NOT NULL;
INSERT INTO supporter_private.supporter_promotion(owner_id,campaign_id,offer_opened_at,opted_out_at)
 SELECT q.owner_id,c.campaign_id,q.last_action_at,CASE WHEN q.state='declined' THEN q.last_action_at END
 FROM supporter_private.gradual_interest q CROSS JOIN supporter_private.public_supporter_control c;
-- Recovery retains its original already-claimed-intent exception. No new CREATE.

-- Revoke defaults on every new private helper and expose narrow own-account RPCs.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='supporter_private' AND p.proname IN('public_supporter_eligible','public_supporter_paid','public_supporter_pending','public_supporter_courtesy','public_supporter_health','public_supporter_verified_sale','supporter_activity') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pazo_supporter_visit(),public.pazo_supporter_promotion(text,uuid,text),public.pazo_supporter_status(),public.pazo_supporter_feedback(text,text),public.pazo_f18_supporter_tick(boolean,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_visit(),public.pazo_supporter_promotion(text,uuid,text),public.pazo_supporter_status(),public.pazo_supporter_feedback(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_f18_supporter_tick(boolean,boolean) TO service_role;

CREATE FUNCTION public.pazo_admin_public_supporter_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.public_supporter_control%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';END IF;
 SELECT * INTO c FROM supporter_private.public_supporter_control WHERE singleton;
 RETURN jsonb_build_object('source','public_supporter_admin_v1','revision',c.revision,'checkoutsEnabled',c.checkouts_enabled AND supporter_private.public_supporter_health() AND EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control r JOIN admin_private.pazo_paypal_new_checkout_switch s ON s.singleton AND s.revision=r.revision WHERE r.singleton AND r.mode='public' AND s.live_enabled AND NOT s.kill_switch AND s.active_generation=r.merchant_generation),
 'invitationsEnabled',c.invitations_enabled,'certified',c.hosted_certified,'healthy',supporter_private.public_supporter_health(),'reminderDays',c.reminder_days,
 'activePaid',(SELECT count(*) FROM auth.users WHERE supporter_private.public_supporter_paid(id)),
 'pending',(SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents WHERE closed_at IS NULL AND state='pending'),
 'incidents',(SELECT count(*) FROM supporter_private.gradual_incident WHERE resolved_at IS NULL),
 'heldEvents',(SELECT count(*) FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state='held'),
 'eligible',(SELECT count(*) FROM supporter_private.supporter_engagement e WHERE returned_at IS NOT NULL AND meaningful_at IS NOT NULL AND supporter_private.public_supporter_eligible(e.owner_id)),
 'firstShown',(SELECT count(*) FROM supporter_private.supporter_promotion WHERE campaign_id=c.campaign_id AND first_impression_at IS NOT NULL),
 'reminders',(SELECT count(*) FROM supporter_private.supporter_promotion WHERE campaign_id=c.campaign_id AND reminder_delivered_at IS NOT NULL),
 'offerOpened',(SELECT count(*) FROM supporter_private.supporter_promotion WHERE campaign_id=c.campaign_id AND offer_opened_at IS NOT NULL),
 'dismissed',(SELECT count(*) FROM supporter_private.supporter_promotion WHERE campaign_id=c.campaign_id AND first_action IN('later','close')),
 'conversions',(SELECT count(*) FROM supporter_private.supporter_promotion p JOIN supporter_private.supporter_payment_notice n ON n.owner_id=p.owner_id AND n.delivered_at IS NOT NULL WHERE campaign_id=c.campaign_id AND (first_impression_at IS NOT NULL OR offer_opened_at IS NOT NULL)),
 'optedOut',(SELECT count(*) FROM supporter_private.supporter_promotion WHERE campaign_id=c.campaign_id AND opted_out_at IS NOT NULL),
 'audit',(SELECT coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) FROM (SELECT action,from_revision,to_revision,happened_at FROM admin_private.public_supporter_audit ORDER BY happened_at DESC LIMIT 20)a));
END $$;

CREATE FUNCTION public.pazo_admin_supporter_member(p_owner uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('source','supporter_member_admin_v1','paid',supporter_private.public_supporter_paid(p_owner),
 'projection',supporter_private.pazo_live_project_paid_periods(p_owner,statement_timestamp()),
 'subscriptions',(SELECT coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) FROM (
 SELECT i.intent_id,i.state,i.provider_status,i.created_at,i.closed_at,(SELECT c.state FROM supporter_private.pazo_paypal_live_cancel_claims c WHERE c.intent_id=i.intent_id) AS cancel_state FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.owner_id=p_owner ORDER BY i.created_at DESC LIMIT 20)a),
 'periods',(SELECT coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) FROM (
 SELECT p.service_start,p.service_end,p.amount_minor,p.currency,EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL) AS held
 FROM supporter_private.pazo_paypal_live_paid_periods p JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id WHERE i.owner_id=p_owner ORDER BY p.service_start DESC LIMIT 24)a),
 'feedback',(SELECT feedback FROM supporter_private.supporter_payment_notice WHERE owner_id=p_owner));
END $$;

CREATE FUNCTION public.pazo_admin_supporter_payments() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('source','supporter_payments_admin_v1',
 'events',(SELECT coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) FROM (SELECT event_type,processing_state,verified_at AS received_at FROM supporter_private.pazo_paypal_live_event_inbox ORDER BY verified_at DESC LIMIT 50)a),
 'holds',(SELECT coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) FROM (SELECT kind,verified_at,released_at FROM supporter_private.pazo_paypal_live_period_holds ORDER BY verified_at DESC LIMIT 50)a));
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_supporter_payments() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_supporter_payments() TO authenticated;
CREATE FUNCTION public.pazo_f18_supporter_admin_action(p_actor uuid,p_action text,p_revision bigint,p_request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c supporter_private.public_supporter_control%ROWTYPE;a admin_private.public_supporter_audit%ROWTYPE;r admin_private.pazo_live_release_control%ROWTYPE;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';END IF;
 IF p_request IS NULL OR p_action IS NULL OR p_action NOT IN('pause_checkouts','open_checkouts','pause_invitations','resume_invitations','resolve_incidents') OR p_revision IS NULL OR p_revision<0 THEN RETURN jsonb_build_object('code','invalid_request');END IF;
 SELECT * INTO c FROM supporter_private.public_supporter_control WHERE singleton FOR UPDATE;
 SELECT * INTO a FROM admin_private.public_supporter_audit WHERE request_id=p_request;
 IF FOUND THEN
  IF a.actor_id<>p_actor OR a.action<>p_action OR a.from_revision<>p_revision THEN RETURN jsonb_build_object('code','request_conflict');END IF;
  RETURN jsonb_build_object('code','already_recorded','revision',c.revision);
 END IF;
 IF c.revision<>p_revision THEN RETURN jsonb_build_object('code','revision_changed','revision',c.revision);END IF;
 IF p_action='open_checkouts' THEN
  IF NOT c.hosted_certified THEN RETURN jsonb_build_object('code','hosted_gate_required');END IF;
  IF NOT supporter_private.public_supporter_health() THEN RETURN jsonb_build_object('code','health_requires_review');END IF;
  SELECT * INTO r FROM admin_private.pazo_live_release_control WHERE singleton FOR UPDATE;
  -- No creation/rotation of merchant resources. Require the existing pinned route.
  IF r.merchant_generation IS NULL OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations g
   JOIN admin_private.paypal_gateway_settings s ON s.environment='live' AND s.plan_id=g.plan_id AND s.webhook_id=g.webhook_id AND s.client_id_vault=g.client_id_vault AND s.client_secret_vault=g.client_secret_vault
   WHERE g.generation=r.merchant_generation AND g.environment='live' AND g.retired_at IS NULL AND g.credential_source='vault' AND s.validation_status='valid' AND s.price_minor=299 AND s.currency='USD' AND s.interval_unit='MONTH' AND s.return_origin='https://pazo-app.vercel.app')
   THEN RETURN jsonb_build_object('code','merchant_requires_review');END IF;
  UPDATE admin_private.pazo_live_release_control SET mode='public',revision=revision+1 WHERE singleton;
  UPDATE admin_private.pazo_paypal_new_checkout_switch SET environment='live',live_enabled=true,kill_switch=false,active_generation=r.merchant_generation,revision=r.revision+1 WHERE singleton;
  UPDATE admin_private.paypal_gateway_runtime SET active_environment='live',live_checkout_enabled=true WHERE singleton;
 END IF;
 IF p_action='resolve_incidents' THEN
  IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state='held') OR c.webhook_ok_at IS NULL OR c.webhook_ok_at<statement_timestamp()-interval '5 minutes' THEN RETURN jsonb_build_object('code','health_requires_review');END IF;
  UPDATE supporter_private.gradual_incident SET resolved_at=clock_timestamp() WHERE resolved_at IS NULL;
 END IF;
 UPDATE supporter_private.public_supporter_control SET revision=revision+1,
 checkouts_enabled=CASE p_action WHEN 'pause_checkouts' THEN false WHEN 'open_checkouts' THEN true ELSE checkouts_enabled END,
 invitations_enabled=CASE p_action WHEN 'pause_invitations' THEN false WHEN 'resume_invitations' THEN true ELSE invitations_enabled END WHERE singleton;
 INSERT INTO admin_private.public_supporter_audit(request_id,actor_id,action,from_revision,to_revision) VALUES(p_request,p_actor,p_action,c.revision,c.revision+1);
 RETURN jsonb_build_object('code','updated','revision',c.revision+1);
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_public_supporter_status(),public.pazo_admin_supporter_member(uuid),public.pazo_f18_supporter_admin_action(uuid,text,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_public_supporter_status(),public.pazo_admin_supporter_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_f18_supporter_admin_action(uuid,text,bigint,uuid) TO service_role;
COMMIT;
