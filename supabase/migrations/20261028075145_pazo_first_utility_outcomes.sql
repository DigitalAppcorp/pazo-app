-- Issue142 / PR1B. Candidate only: collection defaults OFF independently.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE marketing_private.collection_gate
 ADD COLUMN utility_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN utility_started_at timestamptz,
 ADD COLUMN utility_notice_version text,
 ADD CONSTRAINT utility_release_gate CHECK (NOT utility_enabled OR
  (utility_started_at IS NOT NULL
   AND utility_notice_version='pazo-first-utility-notice-v1'));

CREATE TABLE marketing_private.utility_outcomes (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 registered_at timestamptz NOT NULL,
 qr_visible_at timestamptz,
 qr_download_initiated_at timestamptz,
 qr_share_confirmed_at timestamptz,
 care_created_at timestamptz,
 first_utility_at timestamptz,
 last_meaningful_day date,
 return_d7_at timestamptz
);
ALTER TABLE marketing_private.utility_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.utility_outcomes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.utility_outcomes FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX utility_outcomes_expiry ON marketing_private.utility_outcomes(registered_at);
CREATE TABLE marketing_private.utility_suppression (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
ALTER TABLE marketing_private.utility_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.utility_suppression FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.utility_suppression FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX utility_suppression_expiry ON marketing_private.utility_suppression(expires_at);

CREATE FUNCTION marketing_private.record_utility(p_owner uuid,p_event text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE registered timestamptz; observed timestamptz:=statement_timestamp(); meaningful boolean;
BEGIN
 IF p_event IS NULL OR p_event NOT IN ('qr_visible','qr_download_initiated','qr_share_confirmed','care_created')
  OR NOT marketing_private.is_eligible_owner(p_owner)
  OR EXISTS(SELECT 1 FROM marketing_private.utility_suppression WHERE owner_id=p_owner AND expires_at>observed)
 THEN RETURN false;END IF;
 IF NOT EXISTS(SELECT 1 FROM marketing_private.collection_gate g WHERE singleton
  AND g.enabled AND g.utility_enabled AND g.retention_days=14
  AND g.utility_notice_version='pazo-first-utility-notice-v1'
  AND marketing_private.retention_ready(g.retention_days,g.policy_version)) THEN RETURN false;END IF;
 SELECT u.email_confirmed_at INTO registered FROM auth.users u,marketing_private.collection_gate g
 WHERE u.id=p_owner AND g.singleton AND u.email_confirmed_at>=g.utility_started_at
  AND u.email_confirmed_at>=observed-interval '14 days' AND u.email_confirmed_at<=observed;
 IF registered IS NULL THEN RETURN false;END IF;
 meaningful:=p_event IN ('qr_share_confirmed','care_created');
 INSERT INTO marketing_private.utility_outcomes AS prior(owner_id,registered_at,
  qr_visible_at,qr_download_initiated_at,qr_share_confirmed_at,care_created_at,first_utility_at,last_meaningful_day)
 VALUES(p_owner,registered,
  CASE WHEN p_event='qr_visible' THEN observed END,
  CASE WHEN p_event='qr_download_initiated' THEN observed END,
  CASE WHEN p_event='qr_share_confirmed' THEN observed END,
  CASE WHEN p_event='care_created' THEN observed END,
  CASE WHEN meaningful THEN observed END,
  CASE WHEN meaningful THEN (observed AT TIME ZONE 'UTC')::date END)
 ON CONFLICT(owner_id) DO UPDATE SET
  qr_visible_at=coalesce(prior.qr_visible_at,excluded.qr_visible_at),
  qr_download_initiated_at=coalesce(prior.qr_download_initiated_at,excluded.qr_download_initiated_at),
  qr_share_confirmed_at=coalesce(prior.qr_share_confirmed_at,excluded.qr_share_confirmed_at),
  care_created_at=coalesce(prior.care_created_at,excluded.care_created_at),
  first_utility_at=coalesce(prior.first_utility_at,excluded.first_utility_at),
  last_meaningful_day=CASE WHEN meaningful THEN excluded.last_meaningful_day ELSE prior.last_meaningful_day END,
  return_d7_at=coalesce(prior.return_d7_at,CASE WHEN meaningful
    AND observed>=prior.first_utility_at+interval '7 days'
    AND observed<prior.first_utility_at+interval '14 days' THEN observed END)
 WHERE (p_event='qr_visible' AND prior.qr_visible_at IS NULL)
  OR (p_event='qr_download_initiated' AND prior.qr_download_initiated_at IS NULL)
  OR (p_event='qr_share_confirmed' AND prior.qr_share_confirmed_at IS NULL)
  OR (p_event='care_created' AND prior.care_created_at IS NULL)
  OR (meaningful AND prior.last_meaningful_day IS DISTINCT FROM (observed AT TIME ZONE 'UTC')::date)
  OR (meaningful AND prior.return_d7_at IS NULL AND observed>=prior.first_utility_at+interval '7 days'
   AND observed<prior.first_utility_at+interval '14 days');
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION marketing_private.record_utility(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.pazo_marketing_record_utility_v1(p_pet uuid,p_event text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid:=auth.uid();
BEGIN
 -- Care cannot be self-asserted by a browser; only its committed INSERT counts.
 IF owner IS NULL OR p_event IS NULL OR p_event NOT IN ('qr_visible','qr_download_initiated','qr_share_confirmed')
  OR NOT EXISTS(SELECT 1 FROM public.pets WHERE id=p_pet AND owner_id=owner) THEN RETURN false;END IF;
 RETURN marketing_private.record_utility(owner,p_event);
END $$;
REVOKE ALL ON FUNCTION public.pazo_marketing_record_utility_v1(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_record_utility_v1(uuid,text) TO authenticated;

CREATE FUNCTION marketing_private.after_care_created() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
DECLARE owner uuid;
BEGIN
 SELECT owner_id INTO owner FROM public.pets WHERE id=NEW.pet_id;
 PERFORM marketing_private.record_utility(owner,'care_created');
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 -- Optional measurement must never break the actual care transaction.
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION marketing_private.after_care_created() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER pazo_first_utility_care AFTER INSERT ON public.care_items
 FOR EACH ROW EXECUTE FUNCTION marketing_private.after_care_created();

CREATE FUNCTION public.pazo_admin_first_utility_summary(p_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; started timestamptz; collecting boolean;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,30,90) THEN RAISE EXCEPTION 'invalid period';END IF;
 SELECT utility_started_at,(enabled AND utility_enabled AND retention_days=14
  AND utility_notice_version='pazo-first-utility-notice-v1' AND marketing_private.retention_ready(retention_days,policy_version))
 INTO started,collecting FROM marketing_private.collection_gate WHERE singleton;
 WITH owners AS (
  SELECT u.id,u.email_confirmed_at AS created_at,p.first_pet_at,
   CASE WHEN a.creative IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')
    THEN a.creative ELSE 'organic' END AS segment,
   o.qr_visible_at,o.qr_download_initiated_at,o.qr_share_confirmed_at,o.care_created_at,
   o.first_utility_at,o.return_d7_at
  FROM auth.users u
  LEFT JOIN LATERAL(SELECT min(created_at) first_pet_at FROM public.pets WHERE owner_id=u.id)p ON true
  LEFT JOIN marketing_private.acquisition a ON a.owner_id=u.id
   AND a.recorded_at>=statement_timestamp()-interval '14 days'
  LEFT JOIN marketing_private.utility_outcomes o ON o.owner_id=u.id
   AND o.registered_at>=statement_timestamp()-interval '14 days'
  WHERE marketing_private.is_eligible_owner(u.id) AND started IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM marketing_private.utility_suppression WHERE owner_id=u.id AND expires_at>statement_timestamp())
   AND u.email_confirmed_at>=greatest(started,statement_timestamp()-make_interval(days=>least(p_days,14)))
 ), groups AS (
  SELECT segment,count(*) verified_registrations,
   count(*) FILTER(WHERE first_pet_at>=created_at AND first_pet_at<=created_at+interval '7 days') first_pet_accounts,
   count(*) FILTER(WHERE first_pet_at>=created_at AND first_pet_at<=created_at+interval '7 days'
    AND first_pet_at+interval '7 days'<=statement_timestamp()) matured_first_pet_accounts,
   count(*) FILTER(WHERE first_pet_at>=created_at AND first_pet_at<=created_at+interval '7 days'
    AND first_utility_at>=first_pet_at AND first_utility_at<=first_pet_at+interval '7 days') first_utility_accounts,
   count(qr_visible_at) qr_visible_accounts,count(qr_download_initiated_at) qr_download_initiated_accounts,
   count(qr_share_confirmed_at) qr_share_confirmed_accounts,count(care_created_at) care_created_accounts,
   count(*) FILTER(WHERE first_utility_at+interval '7 days'<=statement_timestamp()) d7_matured_accounts,
   count(return_d7_at) d7_return_accounts
  FROM owners GROUP BY segment
 ) SELECT coalesce(jsonb_agg(to_jsonb(groups) ORDER BY segment),'[]'::jsonb) INTO result FROM groups;
 RETURN jsonb_build_object('status',CASE WHEN collecting THEN 'collecting' ELSE 'paused' END,
  'period_days',p_days,'effective_days',least(p_days,14),'coverage_since',started,
  'as_of',statement_timestamp(),'minimum_observational_sample',10,'groups',result);
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_first_utility_summary(integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_first_utility_summary(integer) TO authenticated;

-- Reuse the existing deletion path (Cron -> prune_all -> prune_expired).
CREATE OR REPLACE FUNCTION marketing_private.prune_expired() RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE days smallint;version text;removed integer;
BEGIN
 DELETE FROM marketing_private.utility_suppression WHERE expires_at<=statement_timestamp();
 DELETE FROM marketing_private.utility_outcomes WHERE registered_at<statement_timestamp()-interval '14 days'
  OR NOT marketing_private.is_eligible_owner(owner_id);
 SELECT g.retention_days,g.policy_version INTO days,version FROM marketing_private.collection_gate g WHERE singleton FOR SHARE;
 IF days IS NULL OR days<=0 OR version IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1' THEN RETURN 0;END IF;
 DELETE FROM marketing_private.acquisition WHERE recorded_at<statement_timestamp()-make_interval(days=>days);
 GET DIAGNOSTICS removed=ROW_COUNT;
 -- Preserve the existing acquisition removal counter's meaning.
 RETURN removed;
END $$;
REVOKE ALL ON FUNCTION marketing_private.prune_expired() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.pazo_marketing_withdraw_v1(p_owner uuid) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_owner IS NULL THEN RETURN false;END IF;
 DELETE FROM marketing_private.acquisition WHERE owner_id=p_owner;
 DELETE FROM marketing_private.utility_outcomes WHERE owner_id=p_owner;
 INSERT INTO marketing_private.utility_suppression(owner_id,expires_at)
 SELECT id,email_confirmed_at+interval '14 days' FROM auth.users WHERE id=p_owner
  AND email_confirmed_at+interval '14 days'>statement_timestamp()
 ON CONFLICT(owner_id) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.pazo_marketing_withdraw_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_withdraw_v1(uuid) TO service_role;
COMMIT;
