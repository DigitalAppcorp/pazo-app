-- PAZO F14 A3: writer pre-locking for register_interaction_signal.
-- DRAFT ONLY: no provider DDL, role change, Auth/Storage mutation or deployment.
-- Depends on the A3 write-fence migration; review alongside all ten drafts.
-- Based on existing 20261005101300_feed_like_save_integrity.sql SECURITY INVOKER RPC.
-- Existing service behavior maintained; only lock order and ownership recheck added.
BEGIN;
DO $a3_interaction_not_applied$
BEGIN
  RAISE EXCEPTION 'A3 INTERACTION LOCK ORDER DRAFT ONLY — migration gate not authorized';
END
$a3_interaction_not_applied$;

CREATE OR REPLACE FUNCTION public.register_interaction_signal(
  p_actor_pet_id uuid,
  p_target_id uuid,
  p_action_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_target_owner_id uuid;
  v_checked_actor_owner uuid;
  v_checked_target_owner uuid;
  v_a3_lock_owner uuid;
  v_tags text[];
  v_weight integer := 0;
  v_exists boolean := false;
  v_learned jsonb;
  v_last_decay timestamptz;
  v_tag text;
  v_current_score integer;
  v_new_score integer;
  v_key text;
  v_val jsonb;
  v_transformed_json jsonb := '{}'::jsonb;
BEGIN
  SELECT p.owner_id
  INTO v_owner_id
  FROM public.pets p
  WHERE p.id = p_actor_pet_id;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acceso denegado: La mascota no pertenece al usuario autenticado.';
  END IF;

  IF p_action_type NOT IN (
    'impression', 'view', 'like', 'unlike',
    'comment', 'save', 'unsave', 'not_interested'
  ) THEN
    RAISE EXCEPTION 'action_type no válido.';
  END IF;

  SELECT p.tags, p.user_id
  INTO v_tags, v_target_owner_id
  FROM public.posts p
  WHERE p.id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Target post does not exist.';
  END IF;

  v_tags := COALESCE(v_tags, ARRAY[]::text[]);

  -- A3 WRITE-FENCE ORDER: the original impression/view/comment path locked
  -- pet_private_metrics BEFORE interactions fired the account-owner guard.
  -- Another comment can lock A3 owners first, then wait on that same metric.
  -- Acquire all affected account locks, sorted, BEFORE any row-write/metric lock.
  IF v_target_owner_id IS NULL THEN
    RAISE EXCEPTION 'Unresolvable target owner' USING ERRCODE='42501';
  END IF;
  FOR v_a3_lock_owner IN
    SELECT DISTINCT uid
      FROM pg_catalog.unnest(ARRAY[v_owner_id,v_target_owner_id]) AS account_owner(uid)
     WHERE uid IS NOT NULL ORDER BY uid
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_a3_lock_owner::text,901426));
  END LOOP;

  -- The source rows might have changed while waiting for the lock.  Never
  -- take an extra owner lock in the downstream trigger out of global order.
  SELECT p.owner_id INTO v_checked_actor_owner FROM public.pets p
    WHERE p.id=p_actor_pet_id;
  SELECT p.user_id INTO v_checked_target_owner FROM public.posts p
    WHERE p.id=p_target_id;
  IF v_checked_actor_owner IS DISTINCT FROM v_owner_id
     OR v_checked_target_owner IS DISTINCT FROM v_target_owner_id THEN
    RAISE EXCEPTION 'Interaction ownership changed; retry' USING ERRCODE='40001';
  END IF;


  IF p_action_type IN ('like', 'save') THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    )
    VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    )
    ON CONFLICT (actor_pet_id, target_id, action_type)
      WHERE target_type = 'post'
        AND action_type IN ('like', 'save')
    DO NOTHING;

    RETURN true;
  END IF;

  IF p_action_type IN ('unlike', 'unsave') THEN
    DELETE FROM public.interactions
    WHERE actor_pet_id = p_actor_pet_id
      AND target_id = p_target_id
      AND target_type = 'post'
      AND action_type = CASE
        WHEN p_action_type = 'unlike' THEN 'like'
        ELSE 'save'
      END;

    RETURN true;
  END IF;

  IF p_action_type = 'impression' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.actor_pet_id = p_actor_pet_id
        AND i.target_id = p_target_id
        AND i.target_type = 'post'
        AND i.action_type IN ('impression', 'view')
        AND i.created_at > now() - interval '24 hours'
    ) INTO v_exists;

    v_weight := 0;

  ELSIF p_action_type = 'view' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.actor_pet_id = p_actor_pet_id
        AND i.target_id = p_target_id
        AND i.target_type = 'post'
        AND i.action_type IN ('impression', 'view')
        AND i.created_at > now() - interval '24 hours'
    ) INTO v_exists;

    IF v_exists THEN
      v_weight := 0;
    ELSE
      v_weight := 1;
    END IF;

  ELSIF p_action_type = 'comment' THEN
    v_weight := 5;

  ELSIF p_action_type = 'not_interested' THEN
    v_weight := -15;
  END IF;

  INSERT INTO public.pet_private_metrics (
    pet_id, learned_interests, last_decay_applied_at
  )
  VALUES (
    p_actor_pet_id, '{}'::jsonb, now()
  )
  ON CONFLICT (pet_id) DO NOTHING;

  SELECT ppm.learned_interests, ppm.last_decay_applied_at
  INTO v_learned, v_last_decay
  FROM public.pet_private_metrics ppm
  WHERE ppm.pet_id = p_actor_pet_id
  FOR UPDATE;

  v_learned := COALESCE(v_learned, '{}'::jsonb);

  IF v_last_decay < now() - interval '7 days' THEN
    IF jsonb_typeof(v_learned) = 'object' THEN
      v_transformed_json := '{}'::jsonb;
      FOR v_key, v_val IN SELECT * FROM jsonb_each(v_learned)
      LOOP
        v_transformed_json := jsonb_set(
          v_transformed_json,
          ARRAY[v_key],
          to_jsonb(round((v_val::text::numeric) * 0.8)::integer)
        );
      END LOOP;
      v_learned := v_transformed_json;
    END IF;
    v_last_decay := now();
  END IF;

  IF v_weight <> 0 AND array_length(v_tags, 1) > 0 THEN
    FOREACH v_tag IN ARRAY v_tags
    LOOP
      v_current_score := COALESCE((v_learned ->> v_tag)::integer, 0);
      v_new_score := GREATEST(0, v_current_score + v_weight);
      v_learned := jsonb_set(v_learned, ARRAY[v_tag], to_jsonb(v_new_score));
    END LOOP;
  END IF;

  UPDATE public.pet_private_metrics
  SET learned_interests = v_learned,
      last_decay_applied_at = v_last_decay
  WHERE pet_id = p_actor_pet_id;

  IF p_action_type = 'impression' AND NOT v_exists THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    ) VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    );

  ELSIF p_action_type = 'view' AND NOT v_exists THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    ) VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    );

  ELSIF p_action_type IN ('comment', 'not_interested') THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    ) VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    );
  END IF;

  RETURN true;
END;
$function$;

ALTER FUNCTION public.register_interaction_signal(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.register_interaction_signal(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_interaction_signal(uuid, uuid, text) TO authenticated;
COMMIT;
