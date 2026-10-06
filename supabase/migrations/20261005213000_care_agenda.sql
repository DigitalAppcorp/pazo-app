BEGIN;

-- =============================================================================
-- PAZO - Fase 9A
-- Agenda y Cuidados
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS care_private;
REVOKE ALL ON SCHEMA care_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA care_private TO authenticated, service_role;

CREATE TABLE public.care_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id),
  title text NOT NULL,
  category text NOT NULL,
  due_date date NOT NULL,
  due_time time without time zone,
  timezone text NOT NULL,
  recurrence text NOT NULL DEFAULT 'none',
  reminder_days_before smallint,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT care_items_title_length
    CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  CONSTRAINT care_items_notes_length
    CHECK (notes IS NULL OR char_length(notes) <= 1000),
  CONSTRAINT care_items_category_valid
    CHECK (category IN (
      'veterinarian',
      'vaccine',
      'medication',
      'hygiene',
      'feeding',
      'other'
    )),
  CONSTRAINT care_items_recurrence_valid
    CHECK (recurrence IN ('none','daily','weekly','monthly','yearly')),
  CONSTRAINT care_items_reminder_valid
    CHECK (reminder_days_before IS NULL OR reminder_days_before IN (0,1,2,7)),
  CONSTRAINT care_items_status_valid
    CHECK (status IN ('active','completed','archived')),
  CONSTRAINT care_items_timezone_not_blank
    CHECK (char_length(btrim(timezone)) BETWEEN 1 AND 100)
);

CREATE TABLE public.care_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_item_id uuid NOT NULL REFERENCES public.care_items(id),
  pet_id uuid NOT NULL REFERENCES public.pets(id),
  scheduled_date date NOT NULL,
  scheduled_time time without time zone,
  completed_at timestamptz NOT NULL DEFAULT now(),
  title_snapshot text NOT NULL,
  category_snapshot text NOT NULL,
  notes_snapshot text,
  recurrence_snapshot text NOT NULL,
  resulting_due_date date NOT NULL,
  resulting_due_time time without time zone,
  resulting_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT care_completions_resulting_status_valid
    CHECK (resulting_status IN ('active','completed')),
  CONSTRAINT care_completions_category_valid
    CHECK (category_snapshot IN (
      'veterinarian',
      'vaccine',
      'medication',
      'hygiene',
      'feeding',
      'other'
    )),
  CONSTRAINT care_completions_recurrence_valid
    CHECK (recurrence_snapshot IN ('none','daily','weekly','monthly','yearly'))
);

CREATE INDEX idx_care_items_pet_status_due
  ON public.care_items (pet_id, status, due_date, due_time);

CREATE INDEX idx_care_completions_care_completed
  ON public.care_completions (care_item_id, completed_at DESC, id DESC);

CREATE INDEX idx_care_completions_pet_completed
  ON public.care_completions (pet_id, completed_at DESC, id DESC);

ALTER TABLE public.care_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_completions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.care_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.care_completions FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.care_items TO authenticated;
GRANT INSERT (
  pet_id,
  title,
  category,
  due_date,
  due_time,
  timezone,
  recurrence,
  reminder_days_before,
  notes
) ON TABLE public.care_items TO authenticated;
GRANT UPDATE (
  title,
  category,
  due_date,
  due_time,
  timezone,
  recurrence,
  reminder_days_before,
  notes
) ON TABLE public.care_items TO authenticated;

GRANT SELECT ON TABLE public.care_completions TO authenticated;

GRANT ALL ON TABLE public.care_items TO service_role;
GRANT ALL ON TABLE public.care_completions TO service_role;

CREATE POLICY care_items_owner_select
ON public.care_items
FOR SELECT
TO authenticated
USING (
  pet_id IN (
    SELECT p.id
    FROM public.pets p
    WHERE p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY care_items_owner_insert
ON public.care_items
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'active'
  AND pet_id IN (
    SELECT p.id
    FROM public.pets p
    WHERE p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY care_items_owner_update_active
ON public.care_items
FOR UPDATE
TO authenticated
USING (
  status = 'active'
  AND pet_id IN (
    SELECT p.id
    FROM public.pets p
    WHERE p.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  status = 'active'
  AND pet_id IN (
    SELECT p.id
    FROM public.pets p
    WHERE p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY care_completions_owner_select
ON public.care_completions
FOR SELECT
TO authenticated
USING (
  pet_id IN (
    SELECT p.id
    FROM public.pets p
    WHERE p.owner_id = (SELECT auth.uid())
  )
);

CREATE OR REPLACE FUNCTION private.prepare_care_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names
    WHERE name = NEW.timezone
  ) THEN
    RAISE EXCEPTION 'Invalid IANA timezone.';
  END IF;

  NEW.title := btrim(NEW.title);
  NEW.notes := NULLIF(btrim(COALESCE(NEW.notes, '')), '');

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.prepare_care_item() FROM PUBLIC;

CREATE TRIGGER trg_care_items_prepare
BEFORE INSERT OR UPDATE ON public.care_items
FOR EACH ROW
EXECUTE FUNCTION private.prepare_care_item();

CREATE OR REPLACE FUNCTION care_private.complete_care_item_internal(
  p_care_item_id uuid,
  p_expected_due_date date,
  p_expected_due_time time without time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_item public.care_items%ROWTYPE;
  v_completion_id uuid;
  v_local_today date;
  v_next_due_date date;
  v_resulting_status text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT ci.*
  INTO v_item
  FROM public.care_items ci
  JOIN public.pets p ON p.id = ci.pet_id
  WHERE ci.id = p_care_item_id
    AND p.owner_id = (SELECT auth.uid())
  FOR UPDATE OF ci;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care item not found or access denied.';
  END IF;

  IF v_item.status <> 'active' THEN
    RAISE EXCEPTION 'Only active care items can be completed.';
  END IF;

  IF v_item.due_date IS DISTINCT FROM p_expected_due_date
     OR v_item.due_time IS DISTINCT FROM p_expected_due_time THEN
    RAISE EXCEPTION 'Care item changed. Refresh before completing it.';
  END IF;

  BEGIN
    v_local_today := (now() AT TIME ZONE v_item.timezone)::date;
  EXCEPTION
    WHEN invalid_parameter_value THEN
      RAISE EXCEPTION 'Invalid care item timezone.';
  END;

  IF v_item.recurrence = 'none' THEN
    v_next_due_date := v_item.due_date;
    v_resulting_status := 'completed';
  ELSE
    v_resulting_status := 'active';

    CASE v_item.recurrence
      WHEN 'daily' THEN
        v_next_due_date := v_local_today + 1;
      WHEN 'weekly' THEN
        v_next_due_date := v_local_today + 7;
      WHEN 'monthly' THEN
        v_next_due_date := (v_local_today + interval '1 month')::date;
      WHEN 'yearly' THEN
        v_next_due_date := (v_local_today + interval '1 year')::date;
      ELSE
        RAISE EXCEPTION 'Unsupported recurrence.';
    END CASE;
  END IF;

  INSERT INTO public.care_completions (
    care_item_id,
    pet_id,
    scheduled_date,
    scheduled_time,
    completed_at,
    title_snapshot,
    category_snapshot,
    notes_snapshot,
    recurrence_snapshot,
    resulting_due_date,
    resulting_due_time,
    resulting_status
  )
  VALUES (
    v_item.id,
    v_item.pet_id,
    v_item.due_date,
    v_item.due_time,
    now(),
    v_item.title,
    v_item.category,
    v_item.notes,
    v_item.recurrence,
    v_next_due_date,
    v_item.due_time,
    v_resulting_status
  )
  RETURNING id INTO v_completion_id;

  UPDATE public.care_items
  SET due_date = v_next_due_date,
      status = v_resulting_status,
      updated_at = now()
  WHERE id = v_item.id;

  RETURN v_completion_id;
END;
$function$;

ALTER FUNCTION care_private.complete_care_item_internal(
  uuid,
  date,
  time without time zone
) OWNER TO postgres;

REVOKE ALL ON FUNCTION care_private.complete_care_item_internal(
  uuid,
  date,
  time without time zone
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION care_private.complete_care_item_internal(
  uuid,
  date,
  time without time zone
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION care_private.undo_care_completion_internal(
  p_completion_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_completion public.care_completions%ROWTYPE;
  v_latest_id uuid;
  v_item public.care_items%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT cc.*
  INTO v_completion
  FROM public.care_completions cc
  JOIN public.pets p ON p.id = cc.pet_id
  WHERE cc.id = p_completion_id
    AND p.owner_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completion not found or access denied.';
  END IF;

  SELECT ci.*
  INTO v_item
  FROM public.care_items ci
  WHERE ci.id = v_completion.care_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care item no longer exists.';
  END IF;

  SELECT cc.id
  INTO v_latest_id
  FROM public.care_completions cc
  WHERE cc.care_item_id = v_completion.care_item_id
  ORDER BY cc.completed_at DESC, cc.id DESC
  LIMIT 1;

  IF v_latest_id IS DISTINCT FROM p_completion_id THEN
    RAISE EXCEPTION 'Only the latest completion can be undone.';
  END IF;

  IF v_item.status IS DISTINCT FROM v_completion.resulting_status
     OR v_item.due_date IS DISTINCT FROM v_completion.resulting_due_date
     OR v_item.due_time IS DISTINCT FROM v_completion.resulting_due_time
     OR v_item.recurrence IS DISTINCT FROM v_completion.recurrence_snapshot THEN
    RAISE EXCEPTION 'Care item changed after completion. Undo is no longer safe.';
  END IF;

  DELETE FROM public.care_completions
  WHERE id = p_completion_id;

  UPDATE public.care_items
  SET due_date = v_completion.scheduled_date,
      due_time = v_completion.scheduled_time,
      status = 'active',
      updated_at = now()
  WHERE id = v_item.id;

  RETURN v_item.id;
END;
$function$;

ALTER FUNCTION care_private.undo_care_completion_internal(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION care_private.undo_care_completion_internal(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION care_private.undo_care_completion_internal(uuid)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION care_private.archive_care_item_internal(
  p_care_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.care_items ci
  SET status = 'archived',
      updated_at = now()
  FROM public.pets p
  WHERE ci.id = p_care_item_id
    AND p.id = ci.pet_id
    AND p.owner_id = (SELECT auth.uid())
    AND ci.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active care item not found or access denied.';
  END IF;
END;
$function$;

ALTER FUNCTION care_private.archive_care_item_internal(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION care_private.archive_care_item_internal(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION care_private.archive_care_item_internal(uuid)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_care_item(
  p_care_item_id uuid,
  p_expected_due_date date,
  p_expected_due_time time without time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT care_private.complete_care_item_internal(
    p_care_item_id,
    p_expected_due_date,
    p_expected_due_time
  );
$function$;

CREATE OR REPLACE FUNCTION public.undo_care_completion(
  p_completion_id uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT care_private.undo_care_completion_internal(p_completion_id);
$function$;

CREATE OR REPLACE FUNCTION public.archive_care_item(
  p_care_item_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT care_private.archive_care_item_internal(p_care_item_id);
$function$;

REVOKE ALL ON FUNCTION public.complete_care_item(
  uuid,
  date,
  time without time zone
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_care_item(
  uuid,
  date,
  time without time zone
) TO authenticated;

REVOKE ALL ON FUNCTION public.undo_care_completion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_care_completion(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.archive_care_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_care_item(uuid) TO authenticated;

COMMIT;
