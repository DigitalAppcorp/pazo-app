BEGIN;
SET LOCAL lock_timeout='5s';

CREATE SCHEMA return_api_private;
REVOKE ALL ON SCHEMA return_api_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA return_api_private TO authenticated,service_role;

CREATE TABLE push_private.return_gate (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  phase_two boolean NOT NULL DEFAULT false
);
INSERT INTO push_private.return_gate DEFAULT VALUES;
CREATE TABLE push_private.return_log (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('return_no_pet','return_share','return_care','return_home')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  PRIMARY KEY (owner_id,stage)
);
CREATE TABLE push_private.return_shared (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['return_gate','return_log','return_shared'] LOOP
    EXECUTE format('ALTER TABLE push_private.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE push_private.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON push_private.%I FROM PUBLIC,anon,authenticated,service_role',name);
  END LOOP;
END $$;
ALTER TABLE push_private.preferences ADD COLUMN return_tips boolean NOT NULL DEFAULT true;
ALTER TABLE push_private.subscriptions ADD COLUMN return_zone text;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY(ARRAY[
 'sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower','welcome','health_alert','admin_vigilante_pending','admin_vigilante_approved','return_no_pet','return_share','return_care','return_home']));
ALTER TABLE push_private.outbox DROP CONSTRAINT outbox_kind_check;
ALTER TABLE push_private.outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN
 ('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower','health_alert','admin_vigilante_pending','admin_vigilante_approved','return_no_pet','return_share','return_care','return_home'));

CREATE FUNCTION push_private.return_enabled() RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM push_private.return_gate WHERE singleton AND enabled);
$$;

-- The account controls this category separately from care and safety notices.
CREATE FUNCTION return_api_private.set_preference(p_enabled boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_enabled IS NULL OR NOT push_private.return_enabled() THEN RETURN false; END IF;
  INSERT INTO push_private.preferences(user_id,return_tips) VALUES (auth.uid(),p_enabled)
  ON CONFLICT (user_id) DO UPDATE SET return_tips=excluded.return_tips,updated_at=now();
  RETURN true;
END $$;

CREATE FUNCTION return_api_private.update_device(p_endpoint text,p_zone text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT push_private.return_enabled() OR length(p_zone)>64
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_zone) THEN RETURN false; END IF;
  UPDATE push_private.subscriptions SET return_zone=p_zone WHERE user_id=auth.uid() AND endpoint=p_endpoint;
  RETURN FOUND;
END $$;

CREATE FUNCTION return_api_private.record_profile_share(p_pet_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT push_private.return_enabled()
    OR NOT EXISTS (SELECT 1 FROM public.pets WHERE id=p_pet_id AND owner_id=auth.uid()) THEN RETURN false; END IF;
  INSERT INTO push_private.return_shared(owner_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

-- Keep the existing preferences RPC and grants intact.
DO $$
DECLARE d text := pg_get_functiondef('public.pazo_push_preferences()'::regprocedure);
  marker text := $m$'adminVigilante',coalesce((select p.admin_vigilante from push_private.preferences p where p.user_id=auth.uid()),true)$m$;
BEGIN
  IF position(marker IN d)=0 THEN RAISE EXCEPTION 'Unexpected push preference projection'; END IF;
  EXECUTE replace(d,marker,marker || $m$,
  'returnAvailable',push_private.return_enabled(),
  'returnTips',coalesce((select p.return_tips from push_private.preferences p where p.user_id=auth.uid()),true)$m$);
END $$;

CREATE FUNCTION push_private.return_eligible(p_owner uuid,p_stage text,p_now timestamptz) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT push_private.return_enabled() AND public.pazo_maintenance_data_allowed()
    AND marketing_private.is_reporting_owner(p_owner)
    AND NOT EXISTS (SELECT 1 FROM push_private.preferences WHERE user_id=p_owner AND NOT return_tips)
    AND EXISTS (
      SELECT 1 FROM auth.users u
      LEFT JOIN LATERAL (SELECT p.id,p.created_at FROM public.pets p WHERE p.owner_id=u.id ORDER BY p.created_at,p.id LIMIT 1) pet ON true
      LEFT JOIN LATERAL (SELECT max(d.activity_day) AS day FROM admin_private.app_activity_daily d WHERE d.user_id=u.id) activity ON true
      CROSS JOIN LATERAL (SELECT greatest(u.last_sign_in_at,u.email_confirmed_at,activity.day::timestamp AT TIME ZONE 'UTC') AS last_seen) seen
      WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL AND NOT u.is_anonymous AND CASE p_stage
        WHEN 'return_no_pet' THEN pet.id IS NULL AND u.email_confirmed_at BETWEEN p_now-interval '14 days' AND p_now-interval '48 hours'
        WHEN 'return_share' THEN pet.created_at BETWEEN p_now-interval '14 days' AND p_now-interval '3 days'
          AND public.f14_content_visible('pet_profile',pet.id)
          AND NOT EXISTS (SELECT 1 FROM push_private.return_shared WHERE owner_id=u.id)
        WHEN 'return_care' THEN pet.id IS NOT NULL AND seen.last_seen BETWEEN p_now-interval '30 days' AND p_now-interval '7 days'
          AND NOT EXISTS (SELECT 1 FROM public.care_items c JOIN public.pets p ON p.id=c.pet_id WHERE p.owner_id=u.id)
        WHEN 'return_home' THEN pet.id IS NOT NULL AND seen.last_seen BETWEEN p_now-interval '30 days' AND p_now-interval '14 days'
          AND EXISTS (SELECT 1 FROM push_private.return_gate WHERE singleton AND phase_two)
        ELSE false END
    );
$$;

-- No time zone guess. Pick a single currently associated device, with known
-- local time between 09:00 and 20:00, for each send or retry.
CREATE FUNCTION push_private.return_device(p_owner uuid,p_now timestamptz) RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT s.id FROM push_private.subscriptions s
  WHERE s.user_id=p_owner AND s.updated_at>p_now-interval '30 days' AND s.return_zone IS NOT NULL
    AND (p_now AT TIME ZONE s.return_zone)::time >= time '09:00'
    AND (p_now AT TIME ZONE s.return_zone)::time < time '20:00'
  ORDER BY s.updated_at DESC,s.id LIMIT 1;
$$;

CREATE FUNCTION push_private.return_tick() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item record; notice_id uuid; total integer := 0;
BEGIN
  IF NOT push_private.return_enabled() OR NOT public.pazo_maintenance_data_allowed()
     OR NOT pg_try_advisory_xact_lock(hashtextextended('pazo-return-tips',0)) THEN RETURN 0; END IF;
  FOR item IN
    SELECT u.id, eligible.stage,
      (SELECT p.id FROM public.pets p WHERE p.owner_id=u.id ORDER BY p.created_at,p.id LIMIT 1) AS pet_id,
      push_private.return_device(u.id,statement_timestamp()) AS device
    FROM auth.users u
    CROSS JOIN LATERAL (
      SELECT s.stage FROM (VALUES (1,'return_no_pet'),(2,'return_share'),(3,'return_care'),(4,'return_home')) s(priority,stage)
      WHERE NOT EXISTS (SELECT 1 FROM push_private.return_log l WHERE l.owner_id=u.id AND l.stage=s.stage)
        AND push_private.return_eligible(u.id,s.stage,statement_timestamp()) ORDER BY s.priority LIMIT 1
    ) eligible
    WHERE u.email_confirmed_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM push_private.return_log l WHERE l.owner_id=u.id AND l.created_at>statement_timestamp()-interval '7 days')
      AND (
        push_private.return_device(u.id,statement_timestamp()) IS NOT NULL OR
        NOT EXISTS (SELECT 1 FROM push_private.subscriptions s WHERE s.user_id=u.id AND s.updated_at>statement_timestamp()-interval '30 days' AND s.return_zone IS NOT NULL)
      )
    ORDER BY u.email_confirmed_at,u.id LIMIT 100
  LOOP
    INSERT INTO push_private.return_log(owner_id,stage) VALUES (item.id,item.stage) ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN CONTINUE; END IF;
    INSERT INTO public.notifications(user_id,type,pet_id,source_id,title,body)
      VALUES (item.id,item.stage,item.pet_id,item.pet_id,'Consejos de PAZO','Abre PAZO cuando te venga bien.') RETURNING id INTO notice_id;
    UPDATE push_private.return_log SET notification_id=notice_id WHERE owner_id=item.id AND stage=item.stage;
    IF item.device IS NOT NULL AND push_private.is_enabled() THEN
      INSERT INTO push_private.outbox(user_id,kind,notification_id) VALUES (item.id,item.stage,notice_id);
    END IF;
    total:=total+1;
  END LOOP;
  RETURN total;
END $$;

-- Lease the existing alert types as before. Return tips select at most one
-- device. The worker also asks again immediately before transmitting.
DO $$
DECLARE d text := pg_get_functiondef('public.pazo_push_worker_lease(integer)'::regprocedure);
  old_filter text := 'where s.user_id=l.user_id';
BEGIN
  IF position(old_filter IN d)=0 THEN RAISE EXCEPTION 'Unexpected push lease projection'; END IF;
  EXECUTE replace(d,old_filter,old_filter || $m$
    and (l.kind not like 'return\_%' escape '\' or
      (push_private.return_eligible(l.user_id,l.kind,now()) and s.id=push_private.return_device(l.user_id,now())))$m$);
END $$;

CREATE FUNCTION return_api_private.worker_allowed(p_outbox_id uuid,p_subscription_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT push_private.is_enabled() AND EXISTS (
    SELECT 1 FROM push_private.outbox o WHERE o.id=p_outbox_id AND o.kind LIKE 'return\_%' ESCAPE '\'
      AND o.status='leased' AND o.leased_until>now() AND push_private.return_eligible(o.user_id,o.kind,now())
      AND p_subscription_id=push_private.return_device(o.user_id,now())
  );
$$;

DO $$
DECLARE d text := pg_get_functiondef('public.pazo_push_worker_report(jsonb)'::regprocedure);
  marker text := $m$for r in select * from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) loop$m$;
BEGIN
  IF position(marker IN d)=0 THEN RAISE EXCEPTION 'Unexpected push delivery report'; END IF;
  EXECUTE replace(d,marker,marker || $m$
    if jsonb_array_length(coalesce(r->'ok','[]'::jsonb)) > 0 then
      update push_private.return_log log set accepted_at=coalesce(log.accepted_at,now())
      from push_private.outbox outbox where outbox.id=(r->>'id')::uuid and outbox.status='leased'
        and outbox.notification_id=log.notification_id;
    end if;$m$);
END $$;

CREATE FUNCTION admin_private.return_tip_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY stage),'[]'::jsonb) FROM (
    SELECT l.stage, count(*) AS in_app, count(l.accepted_at) AS provider_accepted,
      count(*) FILTER (WHERE n.read_at BETWEEN l.created_at AND l.created_at+interval '7 days') AS opened,
      count(*) FILTER (WHERE CASE l.stage
        WHEN 'return_no_pet' THEN EXISTS (SELECT 1 FROM public.pets p WHERE p.owner_id=l.owner_id AND p.created_at BETWEEN l.created_at AND l.created_at+interval '7 days')
        WHEN 'return_share' THEN EXISTS (SELECT 1 FROM push_private.return_shared s WHERE s.owner_id=l.owner_id AND s.shared_at BETWEEN l.created_at AND l.created_at+interval '7 days')
        WHEN 'return_care' THEN EXISTS (SELECT 1 FROM public.care_items c JOIN public.pets p ON p.id=c.pet_id
           WHERE p.owner_id=l.owner_id AND c.created_at BETWEEN l.created_at AND l.created_at+interval '7 days')
        WHEN 'return_home' THEN EXISTS (SELECT 1 FROM admin_private.app_activity_daily d WHERE d.user_id=l.owner_id
           AND d.activity_day BETWEEN (l.created_at AT TIME ZONE 'UTC')::date+1 AND (l.created_at AT TIME ZONE 'UTC')::date+7)
        ELSE false END) AS progressed_in_7d
    FROM push_private.return_log l LEFT JOIN public.notifications n ON n.id=l.notification_id
    WHERE l.created_at>=statement_timestamp()-interval '30 days' AND marketing_private.is_reporting_owner(l.owner_id)
    GROUP BY l.stage
  ) t);
END $$;
CREATE FUNCTION public.pazo_admin_return_tip_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT admin_private.return_tip_summary(); $$;

CREATE FUNCTION public.pazo_push_set_return_preference(p_enabled boolean) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT return_api_private.set_preference(p_enabled); $$;
CREATE FUNCTION public.pazo_push_return_device(p_endpoint text,p_zone text) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT return_api_private.update_device(p_endpoint,p_zone); $$;
CREATE FUNCTION public.pazo_push_record_profile_share(p_pet_id uuid) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT return_api_private.record_profile_share(p_pet_id); $$;
CREATE FUNCTION public.pazo_push_worker_return_allowed(p_outbox_id uuid,p_subscription_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT return_api_private.worker_allowed(p_outbox_id,p_subscription_id); $$;

REVOKE ALL ON FUNCTION push_private.return_enabled(),push_private.return_eligible(uuid,text,timestamptz),
  push_private.return_device(uuid,timestamptz),push_private.return_tick(),
  return_api_private.set_preference(boolean),return_api_private.update_device(text,text),
  return_api_private.record_profile_share(uuid),return_api_private.worker_allowed(uuid,uuid),
  public.pazo_push_set_return_preference(boolean),public.pazo_push_return_device(text,text),public.pazo_push_record_profile_share(uuid),
  public.pazo_push_worker_return_allowed(uuid,uuid),admin_private.return_tip_summary(),public.pazo_admin_return_tip_summary()
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_push_set_return_preference(boolean),public.pazo_push_return_device(text,text),
  public.pazo_push_record_profile_share(uuid),return_api_private.set_preference(boolean),return_api_private.update_device(text,text),
  return_api_private.record_profile_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_push_worker_return_allowed(uuid,uuid),return_api_private.worker_allowed(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION admin_private.return_tip_summary(),public.pazo_admin_return_tip_summary() TO authenticated;
SELECT cron.schedule('pazo-return-tips-v1','*/15 * * * *','SELECT push_private.return_tick()');
COMMIT;
