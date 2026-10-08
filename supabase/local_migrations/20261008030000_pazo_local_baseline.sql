


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "care_private";


ALTER SCHEMA "care_private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "community_private";


ALTER SCHEMA "community_private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "document_private";


ALTER SCHEMA "document_private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "place_private";


ALTER SCHEMA "place_private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "rescue_private";


ALTER SCHEMA "rescue_private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "validation_private";


ALTER SCHEMA "validation_private" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "care_private"."archive_care_item_internal"("p_care_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "care_private"."archive_care_item_internal"("p_care_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "care_private"."complete_care_item_internal"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone DEFAULT NULL::time without time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "care_private"."complete_care_item_internal"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "care_private"."undo_care_completion_internal"("p_completion_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "care_private"."undo_care_completion_internal"("p_completion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "community_private"."adjust_community_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.community_posts
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "community_private"."adjust_community_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "community_private"."adjust_community_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.community_posts
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "community_private"."adjust_community_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "community_private"."adjust_member_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities
    SET members_count = members_count + 1
    WHERE id = NEW.community_id;
    RETURN NEW;
  END IF;

  UPDATE public.communities
  SET members_count = GREATEST(0, members_count - 1)
  WHERE id = OLD.community_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "community_private"."adjust_member_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "community_private"."ensure_owner_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_memberships m
    WHERE m.community_id = NEW.id
      AND m.user_id = NEW.owner_user_id
      AND m.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Community owner membership is required.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "community_private"."ensure_owner_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "community_private"."normalize_community_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  NEW.name := btrim(NEW.name);
  NEW.description := btrim(NEW.description);
  NEW.category := btrim(NEW.category);
  NEW.species := NULLIF(btrim(NEW.species), '');
  NEW.zone := NULLIF(btrim(NEW.zone), '');
  NEW.rules := NULLIF(btrim(NEW.rules), '');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "community_private"."normalize_community_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."begin_delete_pet_document_internal"("p_document_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT d.storage_path INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id=d.pet_id
  WHERE d.id=p_document_id AND d.status='active' AND p.owner_id=v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found or access denied.'; END IF;

  UPDATE public.pet_documents SET status='deleting' WHERE id=p_document_id;
  RETURN v_storage_path;
END;
$$;


ALTER FUNCTION "document_private"."begin_delete_pet_document_internal"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."begin_pet_document_upload_internal"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) RETURNS TABLE("id" "uuid", "storage_path" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_document_id uuid := gen_random_uuid();
  v_file_name text := btrim(COALESCE(p_original_file_name, ''));
  v_title text := NULLIF(btrim(COALESCE(p_title, '')), '');
  v_extension text;
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = p_pet_id AND p.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  IF p_category NOT IN ('vaccines','medical_history','identification','results','other')
  THEN RAISE EXCEPTION 'Unsupported document category.'; END IF;

  IF p_mime_type NOT IN ('application/pdf','image/jpeg','image/png','image/webp')
  THEN RAISE EXCEPTION 'Unsupported document MIME type.'; END IF;

  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 10485760
  THEN RAISE EXCEPTION 'Document size must be between 1 byte and 10 MB.'; END IF;

  IF char_length(v_file_name) < 1 OR char_length(v_file_name) > 255
  THEN RAISE EXCEPTION 'Original file name must contain between 1 and 255 characters.'; END IF;

  IF v_title IS NULL THEN v_title := left(v_file_name, 160); END IF;

  IF char_length(v_title) < 1 OR char_length(v_title) > 160
  THEN RAISE EXCEPTION 'Document title must contain between 1 and 160 characters.'; END IF;

  v_extension := CASE p_mime_type
    WHEN 'application/pdf' THEN 'pdf'
    WHEN 'image/jpeg' THEN 'jpg'
    WHEN 'image/png' THEN 'png'
    WHEN 'image/webp' THEN 'webp'
    ELSE NULL
  END;

  IF v_extension IS NULL THEN RAISE EXCEPTION 'Unsupported document MIME type.'; END IF;

  v_storage_path :=
    v_user_id::text || '/' ||
    p_pet_id::text || '/' ||
    v_document_id::text || '.' ||
    v_extension;

  INSERT INTO public.pet_documents (
    id,pet_id,title,category,original_file_name,storage_path,mime_type,size_bytes,status
  )
  VALUES (
    v_document_id,p_pet_id,v_title,p_category,v_file_name,v_storage_path,p_mime_type,p_size_bytes,'uploading'
  );

  RETURN QUERY SELECT v_document_id, v_storage_path;
END;
$$;


ALTER FUNCTION "document_private"."begin_pet_document_upload_internal"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."cancel_delete_pet_document_internal"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT d.storage_path INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id=d.pet_id
  WHERE d.id=p_document_id AND d.status='deleting' AND p.owner_id=v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pending document deletion not found or access denied.'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='pet-documents' AND o.name=v_storage_path
  ) THEN RAISE EXCEPTION 'Document file is already missing.'; END IF;

  UPDATE public.pet_documents SET status='active' WHERE id=p_document_id;
END;
$$;


ALTER FUNCTION "document_private"."cancel_delete_pet_document_internal"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."cancel_pet_document_upload_internal"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT d.storage_path INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id=d.pet_id
  WHERE d.id=p_document_id AND d.status='uploading' AND p.owner_id=v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document reservation not found or access denied.'; END IF;

  IF EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='pet-documents' AND o.name=v_storage_path
  ) THEN RAISE EXCEPTION 'Document file still exists.'; END IF;

  DELETE FROM public.pet_documents WHERE id=p_document_id;
END;
$$;


ALTER FUNCTION "document_private"."cancel_pet_document_upload_internal"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."finalize_delete_pet_document_internal"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT d.storage_path INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id=d.pet_id
  WHERE d.id=p_document_id AND d.status='deleting' AND p.owner_id=v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pending document deletion not found or access denied.'; END IF;

  IF EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='pet-documents' AND o.name=v_storage_path
  ) THEN RAISE EXCEPTION 'Document file still exists.'; END IF;

  DELETE FROM public.pet_documents WHERE id=p_document_id;
END;
$$;


ALTER FUNCTION "document_private"."finalize_delete_pet_document_internal"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."finalize_pet_document_upload_internal"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
  v_expected_mime text;
  v_expected_size bigint;
  v_actual_mime text;
  v_actual_size bigint;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT d.storage_path,d.mime_type,d.size_bytes
  INTO v_storage_path,v_expected_mime,v_expected_size
  FROM public.pet_documents d
  JOIN public.pets p ON p.id = d.pet_id
  WHERE d.id = p_document_id
    AND d.status = 'uploading'
    AND p.owner_id = v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document reservation not found or access denied.'; END IF;

  SELECT o.metadata->>'mimetype',NULLIF(o.metadata->>'size','')::bigint
  INTO v_actual_mime,v_actual_size
  FROM storage.objects o
  WHERE o.bucket_id='pet-documents' AND o.name=v_storage_path
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document file is missing.'; END IF;

  IF v_actual_mime IS DISTINCT FROM v_expected_mime
     OR v_actual_size IS DISTINCT FROM v_expected_size
  THEN RAISE EXCEPTION 'Uploaded file metadata does not match reservation.'; END IF;

  UPDATE public.pet_documents SET status='active' WHERE id=p_document_id;
END;
$$;


ALTER FUNCTION "document_private"."finalize_pet_document_upload_internal"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."prepare_pet_document"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.original_file_name := btrim(NEW.original_file_name);
  NEW.storage_path := btrim(NEW.storage_path);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "document_private"."prepare_pet_document"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "document_private"."try_finalize_delete_pet_document_internal"("p_document_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select d.storage_path, d.status
  into v_storage_path, v_status
  from public.pet_documents d
  join public.pets p on p.id = d.pet_id
  where d.id = p_document_id
    and p.owner_id = v_user_id
  for update of d;

  if not found then
    return true;
  end if;

  if v_status <> 'deleting' then
    return false;
  end if;

  if exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'pet-documents'
      and o.name = v_storage_path
  ) then
    return false;
  end if;

  delete from public.pet_documents
  where id = p_document_id;

  return true;
end;
$$;


ALTER FUNCTION "document_private"."try_finalize_delete_pet_document_internal"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "place_private"."normalize_checkin_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    NEW.ended_at := now();
  END IF;

  IF OLD.ended_at IS NOT NULL THEN
    NEW.ended_at := OLD.ended_at;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "place_private"."normalize_checkin_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "place_private"."normalize_place_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.category := btrim(NEW.category);
  NEW.zone := btrim(NEW.zone);
  NEW.address := btrim(NEW.address);
  NEW.hours := NULLIF(btrim(NEW.hours), '');
  NEW.species_allowed := NULLIF(btrim(NEW.species_allowed), '');
  NEW.pet_rules := NULLIF(btrim(NEW.pet_rules), '');
  NEW.description := NULLIF(btrim(NEW.description), '');
  NEW.photo_url := NULLIF(btrim(NEW.photo_url), '');
  NEW.source := btrim(NEW.source);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "place_private"."normalize_place_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "place_private"."normalize_place_suggestion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.category := btrim(NEW.category);
  NEW.address := btrim(NEW.address);
  NEW.zone := NULLIF(btrim(NEW.zone), '');
  NEW.note := NULLIF(btrim(NEW.note), '');
  NEW.submitter_user_id := auth.uid();
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;


ALTER FUNCTION "place_private"."normalize_place_suggestion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "place_private"."prepare_checkin_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  PERFORM 1
  FROM public.pets p
  WHERE p.id = NEW.pet_id
    AND p.owner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La mascota no pertenece al usuario autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pet_places pp
    WHERE pp.id = NEW.place_id
      AND pp.status = 'active'
  ) THEN
    RAISE EXCEPTION 'El lugar no está disponible.';
  END IF;

  UPDATE public.pet_place_checkins
  SET ended_at = now()
  WHERE pet_id = NEW.pet_id
    AND ended_at IS NULL;

  NEW.user_id := v_user_id;
  NEW.checked_in_at := now();
  NEW.expires_at := NEW.checked_in_at + interval '2 hours';
  NEW.ended_at := NULL;
  NEW.visible := COALESCE(NEW.visible, false);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "place_private"."prepare_checkin_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "place_private"."sync_place_presence"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_checkin_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.pet_place_presence
    WHERE checkin_id = OLD.id;
    RETURN OLD;
  END IF;

  v_checkin_id := NEW.id;

  IF NEW.ended_at IS NOT NULL THEN
    DELETE FROM public.pet_place_presence
    WHERE checkin_id = v_checkin_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.pet_place_presence (
    checkin_id,
    place_id,
    visible_pet_id,
    expires_at
  )
  VALUES (
    NEW.id,
    NEW.place_id,
    CASE WHEN NEW.visible THEN NEW.pet_id ELSE NULL END,
    NEW.expires_at
  )
  ON CONFLICT (checkin_id)
  DO UPDATE SET
    place_id = EXCLUDED.place_id,
    visible_pet_id = EXCLUDED.visible_pet_id,
    expires_at = EXCLUDED.expires_at;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "place_private"."sync_place_presence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."adjust_pet_learning_tags"("p_pet_id" "uuid", "p_tags" "text"[], "p_delta" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_learned jsonb;
  v_last_decay timestamptz;
  v_tag text;
  v_current_score integer;
  v_new_score integer;
  v_key text;
  v_val jsonb;
  v_transformed_json jsonb := '{}'::jsonb;
begin
  insert into public.pet_private_metrics (pet_id, learned_interests, last_decay_applied_at)
  values (p_pet_id, '{}'::jsonb, now())
  on conflict (pet_id) do nothing;

  select ppm.learned_interests, ppm.last_decay_applied_at
  into v_learned, v_last_decay
  from public.pet_private_metrics ppm
  where ppm.pet_id = p_pet_id
  for update;

  v_learned := coalesce(v_learned, '{}'::jsonb);

  if v_last_decay < now() - interval '7 days' then
    if jsonb_typeof(v_learned) = 'object' then
      v_transformed_json := '{}'::jsonb;
      for v_key, v_val in select * from jsonb_each(v_learned)
      loop
        v_transformed_json := jsonb_set(
          v_transformed_json,
          array[v_key],
          to_jsonb(round((v_val::text::numeric) * 0.8)::integer)
        );
      end loop;
      v_learned := v_transformed_json;
    end if;
    v_last_decay := now();
  end if;

  if p_tags is not null
     and coalesce(array_length(p_tags, 1), 0) > 0
     and p_delta <> 0 then
    foreach v_tag in array p_tags
    loop
      v_current_score := coalesce((v_learned ->> v_tag)::integer, 0);
      v_new_score := greatest(0, v_current_score + p_delta);

      if v_new_score = 0 then
        v_learned := v_learned - v_tag;
      else
        v_learned := jsonb_set(v_learned, array[v_tag], to_jsonb(v_new_score));
      end if;
    end loop;
  end if;

  update public.pet_private_metrics
  set learned_interests = v_learned,
      last_decay_applied_at = v_last_decay
  where pet_id = p_pet_id;
end;
$$;


ALTER FUNCTION "private"."adjust_pet_learning_tags"("p_pet_id" "uuid", "p_tags" "text"[], "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_social_write_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if tg_table_schema = 'public' and tg_table_name = 'posts' then
    select count(*) into v_count
    from public.posts p
    where p.user_id = v_uid
      and p.created_at >= now() - interval '1 hour';

    if v_count >= 30 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many posts. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'post_comments' then
    select count(*) into v_count
    from public.post_comments c
    join public.pets p on p.id = c.author_pet_id
    where p.owner_id = v_uid
      and c.created_at >= now() - interval '1 hour';

    if v_count >= 60 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many comments. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'communities' then
    select count(*) into v_count
    from public.communities c
    where c.owner_user_id = v_uid
      and c.created_at >= now() - interval '24 hours';

    if v_count >= 3 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many communities created. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'community_posts' then
    select count(*) into v_count
    from public.community_posts p
    where p.author_user_id = v_uid
      and p.created_at >= now() - interval '1 hour';

    if v_count >= 30 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many community posts. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'community_post_comments' then
    select count(*) into v_count
    from public.community_post_comments c
    join public.pets p on p.id = c.author_pet_id
    where p.owner_id = v_uid
      and c.created_at >= now() - interval '1 hour';

    if v_count >= 60 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many community comments. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'place_suggestions' then
    select count(*) into v_count
    from public.place_suggestions s
    where s.submitter_user_id = v_uid
      and s.created_at >= now() - interval '24 hours';

    if v_count >= 10 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many place suggestions. Try again later.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_social_write_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."ensure_pet_public_link"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.pet_public_links (pet_id)
  VALUES (NEW.id)
  ON CONFLICT (pet_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."ensure_pet_public_link"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guard_comment_interaction_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.action_type = 'comment' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Comment interactions must originate from post_comments.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."guard_comment_interaction_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."normalize_post_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_owner_id uuid;
  v_pet_name text;
  v_pet_species text;
  v_pet_avatar text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT p.owner_id, p.name, p.species, p.photo_url
  INTO v_owner_id, v_pet_name, v_pet_species, v_pet_avatar
  FROM public.pets p
  WHERE p.id = NEW.pet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Pet does not exist.';
  END IF;

  IF v_uid IS NOT NULL AND v_owner_id <> v_uid THEN
    RAISE EXCEPTION 'La mascota no pertenece al usuario autenticado.';
  END IF;

  NEW.user_id := v_owner_id;
  NEW.pet_name := v_pet_name;
  NEW.pet_species := v_pet_species;
  NEW.pet_avatar := v_pet_avatar;
  NEW.likes := 0;
  NEW.comments := '[]'::jsonb;
  NEW.comments_count := 0;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."normalize_post_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."normalize_post_comment_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.body := btrim(NEW.body);

  IF NEW.body = '' OR char_length(NEW.body) > 1000 THEN
    RAISE EXCEPTION 'Comentario inválido.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."normalize_post_comment_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."normalize_post_interaction_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_post_tags text[];
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT p.tags
    INTO v_post_tags
    FROM public.posts p
    WHERE p.id = NEW.target_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Target post does not exist.';
    END IF;

    IF NEW.action_type IN ('like', 'save') THEN
      NEW.target_tags := COALESCE(v_post_tags, ARRAY[]::text[]);
      NEW.applied_learning := COALESCE(array_length(NEW.target_tags, 1), 0) > 0;
    ELSE
      NEW.target_tags := NULL;
      NEW.applied_learning := false;
    END IF;
  ELSE
    NEW.target_tags := NULL;
    NEW.applied_learning := false;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."normalize_post_interaction_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."prepare_care_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."prepare_care_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."process_post_comment_side_effects"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_tags text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) + 1)
    WHERE id = NEW.post_id;

    SELECT p.tags
    INTO v_tags
    FROM public.posts p
    WHERE p.id = NEW.post_id;

    v_tags := COALESCE(v_tags, ARRAY[]::text[]);

    IF COALESCE(array_length(v_tags, 1), 0) > 0 THEN
      PERFORM private.adjust_pet_learning_tags(
        NEW.author_pet_id,
        v_tags,
        5
      );
    END IF;

    INSERT INTO public.interactions (
      actor_pet_id,
      target_id,
      target_type,
      action_type
    )
    VALUES (
      NEW.author_pet_id,
      NEW.post_id,
      'post',
      'comment'
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
    WHERE id = OLD.post_id;

    -- El aprendizaje de "comment" es histórico/cumulativo.
    -- Borrar el texto no deshace el hecho de que el usuario interactuó.
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."process_post_comment_side_effects"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."process_reversible_interaction_side_effects"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' AND NEW.action_type = 'like' THEN
      UPDATE public.posts
      SET likes = GREATEST(0, COALESCE(likes, 0) + 1)
      WHERE id = NEW.target_id;

      PERFORM private.adjust_pet_learning_tags(
        NEW.actor_pet_id,
        NEW.target_tags,
        3
      );

    ELSIF NEW.target_type = 'post' AND NEW.action_type = 'save' THEN
      PERFORM private.adjust_pet_learning_tags(
        NEW.actor_pet_id,
        NEW.target_tags,
        7
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' AND OLD.action_type = 'like' THEN
      UPDATE public.posts
      SET likes = GREATEST(0, COALESCE(likes, 0) - 1)
      WHERE id = OLD.target_id;

      IF OLD.applied_learning THEN
        PERFORM private.adjust_pet_learning_tags(
          OLD.actor_pet_id,
          OLD.target_tags,
          -3
        );
      END IF;

    ELSIF OLD.target_type = 'post' AND OLD.action_type = 'save' THEN
      IF OLD.applied_learning THEN
        PERFORM private.adjust_pet_learning_tags(
          OLD.actor_pet_id,
          OLD.target_tags,
          -7
        );
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."process_reversible_interaction_side_effects"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."sync_pet_public_profile_to_posts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.species IS DISTINCT FROM OLD.species
     OR NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    UPDATE public.posts
    SET
      pet_name = NEW.name,
      pet_species = NEW.species,
      pet_avatar = NEW.photo_url
    WHERE pet_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."sync_pet_public_profile_to_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_follow_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_follower_owner uuid;
  v_following_owner uuid;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RAISE EXCEPTION 'A pet cannot follow itself.';
  END IF;

  SELECT p.owner_id
  INTO v_follower_owner
  FROM public.pets p
  WHERE p.id = NEW.follower_id;

  SELECT p.owner_id
  INTO v_following_owner
  FROM public.pets p
  WHERE p.id = NEW.following_id;

  IF v_follower_owner IS NULL OR v_following_owner IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Follower or following pet does not exist.';
  END IF;

  IF v_follower_owner = v_following_owner THEN
    RAISE EXCEPTION 'Pets from the same account cannot follow each other.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."validate_follow_relationship"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_lost_pet_alert"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select rescue_private.activate_lost_pet_alert_internal(
    p_pet_id,
    p_last_seen_location,
    p_last_seen_at,
    p_details
  );
$$;


ALTER FUNCTION "public"."activate_lost_pet_alert"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_care_item"("p_care_item_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT care_private.archive_care_item_internal(p_care_item_id);
$$;


ALTER FUNCTION "public"."archive_care_item"("p_care_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."begin_delete_pet_document"("p_document_id" "uuid") RETURNS "text"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT document_private.begin_delete_pet_document_internal(p_document_id);
$$;


ALTER FUNCTION "public"."begin_delete_pet_document"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."begin_pet_document_upload"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) RETURNS TABLE("id" "uuid", "storage_path" "text")
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT * FROM document_private.begin_pet_document_upload_internal(
    p_pet_id,p_title,p_category,p_original_file_name,p_mime_type,p_size_bytes
  );
$$;


ALTER FUNCTION "public"."begin_pet_document_upload"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_delete_pet_document"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT document_private.cancel_delete_pet_document_internal(p_document_id);
$$;


ALTER FUNCTION "public"."cancel_delete_pet_document"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_pet_document_upload"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT document_private.cancel_pet_document_upload_internal(p_document_id);
$$;


ALTER FUNCTION "public"."cancel_pet_document_upload"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_care_item"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone DEFAULT NULL::time without time zone) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT care_private.complete_care_item_internal(
    p_care_item_id,
    p_expected_due_date,
    p_expected_due_time
  );
$$;


ALTER FUNCTION "public"."complete_care_item"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_category" "text", "p_species" "text", "p_zone" "text", "p_rules" "text", "p_display_pet_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_community_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_display_pet_id
      AND p.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'La mascota no pertenece al usuario autenticado.';
  END IF;

  INSERT INTO public.communities (
    name,
    description,
    category,
    species,
    zone,
    rules
  )
  VALUES (
    btrim(p_name),
    btrim(p_description),
    btrim(p_category),
    NULLIF(btrim(p_species), ''),
    NULLIF(btrim(p_zone), ''),
    NULLIF(btrim(p_rules), '')
  )
  RETURNING id INTO v_community_id;

  INSERT INTO public.community_memberships (
    community_id,
    display_pet_id,
    role
  )
  VALUES (
    v_community_id,
    p_display_pet_id,
    'owner'
  );

  RETURN v_community_id;
END;
$$;


ALTER FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_category" "text", "p_species" "text", "p_zone" "text", "p_rules" "text", "p_display_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_pet_profile"("p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_zone" "text" DEFAULT NULL::"text", "p_interests" "text"[] DEFAULT ARRAY[]::"text"[], "p_bio" "text" DEFAULT NULL::"text", "p_breed" "text" DEFAULT NULL::"text", "p_gender" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pet_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  INSERT INTO public.pets (
    owner_id,
    name,
    species,
    age,
    photo_url,
    bio,
    breed,
    gender
  )
  VALUES (
    v_user_id,
    btrim(p_name),
    p_species,
    NULLIF(btrim(COALESCE(p_age, '')), ''),
    NULLIF(btrim(COALESCE(p_photo_url, '')), ''),
    NULLIF(btrim(COALESCE(p_bio, '')), ''),
    NULLIF(btrim(COALESCE(p_breed, '')), ''),
    NULLIF(btrim(COALESCE(p_gender, '')), '')
  )
  RETURNING id INTO v_pet_id;

  INSERT INTO public.pet_private_details (
    pet_id,
    zone,
    interests
  )
  VALUES (
    v_pet_id,
    NULLIF(btrim(COALESCE(p_zone, '')), ''),
    COALESCE(p_interests, ARRAY[]::text[])
  );

  RETURN v_pet_id;
END;
$$;


ALTER FUNCTION "public"."create_pet_profile"("p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_zone" "text", "p_interests" "text"[], "p_bio" "text", "p_breed" "text", "p_gender" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_delete_pet_document"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT document_private.finalize_delete_pet_document_internal(p_document_id);
$$;


ALTER FUNCTION "public"."finalize_delete_pet_document"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_pet_document_upload"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT document_private.finalize_pet_document_upload_internal(p_document_id);
$$;


ALTER FUNCTION "public"."finalize_pet_document_upload"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pet_founder_status"("p_pet_id" "uuid") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select rescue_private.get_pet_founder_status_internal(p_pet_id);
$$;


ALTER FUNCTION "public"."get_pet_founder_status"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_pet_rescue_profile"("p_token" "uuid") RETURNS TABLE("name" "text", "species" "text", "breed" "text", "photo_url" "text", "bio" "text", "is_lost" boolean, "last_seen_location" "text", "alert_last_seen_at" timestamp with time zone, "alert_details" "text")
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select *
  from rescue_private.get_public_pet_rescue_profile_internal(p_token);
$$;


ALTER FUNCTION "public"."get_public_pet_rescue_profile"("p_token" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pet_id" "uuid",
    "pet_name" "text" NOT NULL,
    "pet_species" "text" NOT NULL,
    "pet_avatar" "text",
    "location" "text" DEFAULT 'Los Ángeles • Local'::"text",
    "text" "text" NOT NULL,
    "photo_url" "text",
    "likes" integer DEFAULT 0,
    "comments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "comments_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_posts"("p_actor_pet_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS SETOF "public"."posts"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_explicit_interests text[];
  v_top_learned text[];
  v_combined text[];
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: La mascota no pertenece al usuario autenticado.';
  END IF;

  SELECT ppd.interests
  INTO v_explicit_interests
  FROM public.pet_private_details ppd
  WHERE ppd.pet_id = p_actor_pet_id;

  SELECT array_agg(s.key ORDER BY s.score DESC)
  INTO v_top_learned
  FROM (
    SELECT kv.key, kv.value::numeric AS score
    FROM public.pet_private_metrics ppm
    CROSS JOIN LATERAL jsonb_each_text(ppm.learned_interests) AS kv(key, value)
    WHERE ppm.pet_id = p_actor_pet_id
      AND kv.value::numeric > 0
    ORDER BY kv.value::numeric DESC
    LIMIT 5
  ) s;

  v_combined := ARRAY(
    SELECT DISTINCT interest
    FROM unnest(
      COALESCE(v_explicit_interests, ARRAY[]::text[])
      || COALESCE(v_top_learned, ARRAY[]::text[])
    ) AS interest
    WHERE btrim(interest) <> ''
  );

  IF COALESCE(array_length(v_combined, 1), 0) = 0 THEN
    RETURN QUERY
    SELECT p.*
    FROM public.posts p
    WHERE p.pet_id <> p_actor_pet_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.interactions i
        WHERE i.actor_pet_id = p_actor_pet_id
          AND i.target_id = p.id
          AND i.target_type = 'post'
          AND i.action_type IN ('impression', 'view', 'like')
          AND i.created_at > now() - interval '48 hours'
      )
    ORDER BY
      (COALESCE(p.likes, 0) * 2 + 1)
      / power((extract(epoch FROM (now() - p.created_at)) / 3600.0 + 2), 1.5) DESC
    LIMIT v_limit;

    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.posts p
  WHERE p.pet_id <> p_actor_pet_id
    AND p.tags && v_combined
    AND NOT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.actor_pet_id = p_actor_pet_id
        AND i.target_id = p.id
        AND i.target_type = 'post'
        AND i.action_type IN ('impression', 'view', 'like')
        AND i.created_at > now() - interval '48 hours'
    )
  ORDER BY
    (COALESCE(p.likes, 0) * 2 + 1)
    / power((extract(epoch FROM (now() - p.created_at)) / 3600.0 + 2), 1.5) DESC
  LIMIT v_limit;
END;
$$;


ALTER FUNCTION "public"."get_recommended_posts"("p_actor_pet_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_posts_page"("p_actor_pet_id" "uuid", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS SETOF "public"."posts"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_explicit_interests text[];
  v_top_learned text[];
  v_combined text[];
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pets actor
    WHERE actor.id = p_actor_pet_id
      AND actor.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: La mascota no pertenece al usuario autenticado.';
  END IF;

  SELECT ppd.interests
  INTO v_explicit_interests
  FROM public.pet_private_details ppd
  WHERE ppd.pet_id = p_actor_pet_id;

  SELECT array_agg(s.key ORDER BY s.score DESC)
  INTO v_top_learned
  FROM (
    SELECT kv.key, kv.value::numeric AS score
    FROM public.pet_private_metrics ppm
    CROSS JOIN LATERAL jsonb_each_text(ppm.learned_interests) AS kv(key, value)
    WHERE ppm.pet_id = p_actor_pet_id
      AND kv.value::numeric > 0
    ORDER BY kv.value::numeric DESC
    LIMIT 5
  ) s;

  v_combined := ARRAY(
    SELECT DISTINCT interest
    FROM unnest(
      COALESCE(v_explicit_interests, ARRAY[]::text[])
      || COALESCE(v_top_learned, ARRAY[]::text[])
    ) AS interest
    WHERE btrim(interest) <> ''
  );

  RETURN QUERY
  SELECT candidate.*
  FROM public.posts candidate
  JOIN public.pets candidate_pet
    ON candidate_pet.id = candidate.pet_id
  JOIN public.pets actor_pet
    ON actor_pet.id = p_actor_pet_id
  WHERE candidate_pet.owner_id <> actor_pet.owner_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.follows f
      WHERE f.follower_id = p_actor_pet_id
        AND f.following_id = candidate.pet_id
    )
  ORDER BY
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.interactions i
        WHERE i.actor_pet_id = p_actor_pet_id
          AND i.target_id = candidate.id
          AND i.target_type = 'post'
          AND i.action_type IN ('impression', 'view', 'like')
          AND i.created_at > now() - interval '48 hours'
      )
      THEN 1
      ELSE 0
    END ASC,
    CASE
      WHEN COALESCE(array_length(v_combined, 1), 0) > 0
       AND candidate.tags && v_combined
      THEN 0
      ELSE 1
    END ASC,
    (
      (COALESCE(candidate.likes, 0) * 2 + 1)
      / power(
          (extract(epoch FROM (now() - candidate.created_at)) / 3600.0 + 2),
          1.5
        )
    ) DESC,
    candidate.created_at DESC,
    candidate.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_recommended_posts_page"("p_actor_pet_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, is_founder)
  VALUES (NEW.id, false)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_interaction_signal"("p_actor_pet_id" "uuid", "p_target_id" "uuid", "p_action_type" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_owner_id uuid;
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

  SELECT p.tags
  INTO v_tags
  FROM public.posts p
  WHERE p.id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Target post does not exist.';
  END IF;

  v_tags := COALESCE(v_tags, ARRAY[]::text[]);

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
$$;


ALTER FUNCTION "public"."register_interaction_signal"("p_actor_pet_id" "uuid", "p_target_id" "uuid", "p_action_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_lost_pet_alert"("p_pet_id" "uuid") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select rescue_private.resolve_lost_pet_alert_internal(p_pet_id);
$$;


ALTER FUNCTION "public"."resolve_lost_pet_alert"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_pet_public_link"("p_pet_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select rescue_private.rotate_pet_public_link_internal(p_pet_id);
$$;


ALTER FUNCTION "public"."rotate_pet_public_link"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_pet_sighting"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select rescue_private.submit_pet_sighting_internal(
    p_token,
    p_reporter_name,
    p_reporter_phone,
    p_message,
    p_location
  );
$$;


ALTER FUNCTION "public"."submit_pet_sighting"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_finalize_delete_pet_document"("p_document_id" "uuid") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select document_private.try_finalize_delete_pet_document_internal(p_document_id);
$$;


ALTER FUNCTION "public"."try_finalize_delete_pet_document"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."undo_care_completion"("p_completion_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT care_private.undo_care_completion_internal(p_completion_id);
$$;


ALTER FUNCTION "public"."undo_care_completion"("p_completion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pet_profile"("p_pet_id" "uuid", "p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_bio" "text", "p_breed" "text", "p_gender" "text", "p_zone" "text", "p_interests" "text"[], "p_weight" "text", "p_diet_plan" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.pets
  SET
    name = btrim(p_name),
    species = p_species,
    age = NULLIF(btrim(COALESCE(p_age, '')), ''),
    photo_url = NULLIF(btrim(COALESCE(p_photo_url, '')), ''),
    bio = NULLIF(btrim(COALESCE(p_bio, '')), ''),
    breed = NULLIF(btrim(COALESCE(p_breed, '')), ''),
    gender = NULLIF(btrim(COALESCE(p_gender, '')), '')
  WHERE id = p_pet_id
    AND owner_id = v_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  INSERT INTO public.pet_private_details (
    pet_id,
    zone,
    interests,
    weight,
    diet_plan,
    updated_at
  )
  VALUES (
    p_pet_id,
    NULLIF(btrim(COALESCE(p_zone, '')), ''),
    COALESCE(p_interests, ARRAY[]::text[]),
    NULLIF(btrim(COALESCE(p_weight, '')), ''),
    NULLIF(btrim(COALESCE(p_diet_plan, '')), ''),
    now()
  )
  ON CONFLICT (pet_id) DO UPDATE
  SET
    zone = EXCLUDED.zone,
    interests = EXCLUDED.interests,
    weight = EXCLUDED.weight,
    diet_plan = EXCLUDED.diet_plan,
    updated_at = now();

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."update_pet_profile"("p_pet_id" "uuid", "p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_bio" "text", "p_breed" "text", "p_gender" "text", "p_zone" "text", "p_interests" "text"[], "p_weight" "text", "p_diet_plan" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rescue_private"."activate_lost_pet_alert_internal"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_alert_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.owner_id = (select auth.uid())
  ) then
    raise exception 'Pet not found or not owned by authenticated user.';
  end if;

  if char_length(btrim(coalesce(p_last_seen_location,''))) < 2 then
    raise exception 'Last seen location is required.';
  end if;

  if p_last_seen_at is null then
    raise exception 'Last seen date and time are required.';
  end if;

  if p_last_seen_at > now() + interval '10 minutes' then
    raise exception 'Last seen date and time cannot be in the future.';
  end if;

  update public.lost_pet_alerts
  set
    last_seen_location = btrim(p_last_seen_location),
    last_seen_at = p_last_seen_at,
    details = nullif(btrim(coalesce(p_details,'')), ''),
    resolved_at = null
  where pet_id = p_pet_id
    and status = 'active'
  returning id into v_alert_id;

  if v_alert_id is null then
    insert into public.lost_pet_alerts (
      pet_id,
      last_seen_location,
      last_seen_at,
      details
    )
    values (
      p_pet_id,
      btrim(p_last_seen_location),
      p_last_seen_at,
      nullif(btrim(coalesce(p_details,'')), '')
    )
    returning id into v_alert_id;
  end if;

  update public.pets
  set
    is_lost = true,
    last_seen_location = btrim(p_last_seen_location)
  where id = p_pet_id;

  return v_alert_id;
end;
$$;


ALTER FUNCTION "rescue_private"."activate_lost_pet_alert_internal"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rescue_private"."get_pet_founder_status_internal"("p_pet_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce((
    select pr.is_founder
    from public.pets p
    join public.profiles pr on pr.id = p.owner_id
    where p.id = p_pet_id
    limit 1
  ), false);
$$;


ALTER FUNCTION "rescue_private"."get_pet_founder_status_internal"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"("p_token" "uuid") RETURNS TABLE("name" "text", "species" "text", "breed" "text", "photo_url" "text", "bio" "text", "is_lost" boolean, "last_seen_location" "text", "alert_last_seen_at" timestamp with time zone, "alert_details" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    p.name,
    p.species,
    p.breed,
    p.photo_url,
    p.bio,
    p.is_lost,
    case when a.id is not null then a.last_seen_location else null end,
    a.last_seen_at,
    a.details
  from public.pet_public_links l
  join public.pets p on p.id = l.pet_id
  left join lateral (
    select la.id, la.last_seen_location, la.last_seen_at, la.details
    from public.lost_pet_alerts la
    where la.pet_id = p.id
      and la.status = 'active'
    order by la.created_at desc
    limit 1
  ) a on true
  where l.public_token = p_token
    and l.enabled = true
  limit 1;
$$;


ALTER FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"("p_pet_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.owner_id = (select auth.uid())
  ) then
    raise exception 'Pet not found or not owned by authenticated user.';
  end if;

  update public.lost_pet_alerts
  set
    status = 'resolved',
    resolved_at = now()
  where pet_id = p_pet_id
    and status = 'active';

  update public.pets
  set
    is_lost = false,
    last_seen_location = null
  where id = p_pet_id;

  return true;
end;
$$;


ALTER FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rescue_private"."rotate_pet_public_link_internal"("p_pet_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_token uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.owner_id = (select auth.uid())
  ) then
    raise exception 'Pet not found or not owned by authenticated user.';
  end if;

  update public.pet_public_links
  set
    public_token = gen_random_uuid(),
    enabled = true,
    rotated_at = now()
  where pet_id = p_pet_id
  returning public_token into v_token;

  if v_token is null then
    insert into public.pet_public_links (pet_id)
    values (p_pet_id)
    returning public_token into v_token;
  end if;

  return v_token;
end;
$$;


ALTER FUNCTION "rescue_private"."rotate_pet_public_link_internal"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rescue_private"."submit_pet_sighting_internal"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pet_id uuid;
  v_owner_id uuid;
  v_pet_name text;
  v_alert_id uuid;
  v_sighting_id uuid;
  v_recent_count integer;
  v_reporter_name text := btrim(coalesce(p_reporter_name,''));
  v_reporter_phone text := btrim(coalesce(p_reporter_phone,''));
  v_message text := btrim(coalesce(p_message,''));
  v_location text := nullif(btrim(coalesce(p_location,'')), '');
begin
  if char_length(v_reporter_name) < 2 or char_length(v_reporter_name) > 100 then
    raise exception 'Reporter name must contain between 2 and 100 characters.';
  end if;

  if char_length(v_reporter_phone) < 7 or char_length(v_reporter_phone) > 40 then
    raise exception 'Reporter phone must contain between 7 and 40 characters.';
  end if;

  if char_length(v_message) < 3 or char_length(v_message) > 1000 then
    raise exception 'Sighting message must contain between 3 and 1000 characters.';
  end if;

  if v_location is not null and char_length(v_location) > 250 then
    raise exception 'Sighting location is too long.';
  end if;

  select p.id, p.owner_id, p.name
  into v_pet_id, v_owner_id, v_pet_name
  from public.pet_public_links l
  join public.pets p on p.id = l.pet_id
  where l.public_token = p_token
    and l.enabled = true;

  if v_pet_id is null then
    raise exception 'Invalid or disabled rescue link.';
  end if;

  select count(*)::integer
  into v_recent_count
  from public.pet_sightings s
  where s.pet_id = v_pet_id
    and s.created_at > now() - interval '10 minutes';

  if v_recent_count >= 10 then
    raise exception 'Too many recent sighting reports. Please try again later.';
  end if;

  select a.id
  into v_alert_id
  from public.lost_pet_alerts a
  where a.pet_id = v_pet_id
    and a.status = 'active'
  order by a.created_at desc
  limit 1;

  insert into public.pet_sightings (
    pet_id,
    alert_id,
    reporter_name,
    reporter_phone,
    message,
    location_text
  )
  values (
    v_pet_id,
    v_alert_id,
    v_reporter_name,
    v_reporter_phone,
    v_message,
    v_location
  )
  returning id into v_sighting_id;

  insert into public.notifications (
    user_id,
    pet_id,
    type,
    title,
    body,
    source_id
  )
  values (
    v_owner_id,
    v_pet_id,
    'sighting',
    'Nuevo aviso sobre ' || v_pet_name,
    left(
      case
        when v_location is not null
          then v_message || ' · Ubicación: ' || v_location
        else v_message
      end,
      1200
    ),
    v_sighting_id
  );

  return v_sighting_id;
end;
$$;


ALTER FUNCTION "rescue_private"."submit_pet_sighting_internal"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "validation_private"."touch_validation_intent_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "validation_private"."touch_validation_intent_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."care_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "care_item_id" "uuid" NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" time without time zone,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title_snapshot" "text" NOT NULL,
    "category_snapshot" "text" NOT NULL,
    "notes_snapshot" "text",
    "recurrence_snapshot" "text" NOT NULL,
    "resulting_due_date" "date" NOT NULL,
    "resulting_due_time" time without time zone,
    "resulting_status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "care_completions_category_valid" CHECK (("category_snapshot" = ANY (ARRAY['veterinarian'::"text", 'vaccine'::"text", 'medication'::"text", 'hygiene'::"text", 'feeding'::"text", 'other'::"text"]))),
    CONSTRAINT "care_completions_recurrence_valid" CHECK (("recurrence_snapshot" = ANY (ARRAY['none'::"text", 'daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "care_completions_resulting_status_valid" CHECK (("resulting_status" = ANY (ARRAY['active'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."care_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."care_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "due_date" "date" NOT NULL,
    "due_time" time without time zone,
    "timezone" "text" NOT NULL,
    "recurrence" "text" DEFAULT 'none'::"text" NOT NULL,
    "reminder_days_before" smallint,
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "care_items_category_valid" CHECK (("category" = ANY (ARRAY['veterinarian'::"text", 'vaccine'::"text", 'medication'::"text", 'hygiene'::"text", 'feeding'::"text", 'other'::"text"]))),
    CONSTRAINT "care_items_notes_length" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 1000))),
    CONSTRAINT "care_items_recurrence_valid" CHECK (("recurrence" = ANY (ARRAY['none'::"text", 'daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "care_items_reminder_valid" CHECK ((("reminder_days_before" IS NULL) OR ("reminder_days_before" = ANY (ARRAY[0, 1, 2, 7])))),
    CONSTRAINT "care_items_status_valid" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text"]))),
    CONSTRAINT "care_items_timezone_not_blank" CHECK ((("char_length"("btrim"("timezone")) >= 1) AND ("char_length"("btrim"("timezone")) <= 100))),
    CONSTRAINT "care_items_title_length" CHECK ((("char_length"("btrim"("title")) >= 2) AND ("char_length"("btrim"("title")) <= 120)))
);


ALTER TABLE "public"."care_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "species" "text",
    "zone" "text",
    "image_url" "text",
    "image_storage_path" "text",
    "rules" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "members_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "communities_category_length" CHECK ((("char_length"("btrim"("category")) >= 2) AND ("char_length"("btrim"("category")) <= 40))),
    CONSTRAINT "communities_description_length" CHECK ((("char_length"("btrim"("description")) >= 1) AND ("char_length"("btrim"("description")) <= 1000))),
    CONSTRAINT "communities_image_pair" CHECK ((("image_url" IS NULL) = ("image_storage_path" IS NULL))),
    CONSTRAINT "communities_members_count_nonnegative" CHECK (("members_count" >= 0)),
    CONSTRAINT "communities_name_length" CHECK ((("char_length"("btrim"("name")) >= 3) AND ("char_length"("btrim"("name")) <= 80))),
    CONSTRAINT "communities_rules_length" CHECK ((("rules" IS NULL) OR ("char_length"("btrim"("rules")) <= 2000))),
    CONSTRAINT "communities_species_allowed" CHECK ((("species" IS NULL) OR ("species" = ANY (ARRAY['gato'::"text", 'perro'::"text", 'conejo'::"text", 'ave'::"text", 'otro'::"text"])))),
    CONSTRAINT "communities_status_allowed" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))),
    CONSTRAINT "communities_zone_length" CHECK ((("zone" IS NULL) OR ("char_length"("btrim"("zone")) <= 100)))
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_memberships" (
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "display_pet_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_memberships_role_allowed" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."community_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_pet_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_post_comments_body_length" CHECK ((("char_length"("btrim"("body")) >= 1) AND ("char_length"("btrim"("body")) <= 1000)))
);


ALTER TABLE "public"."community_post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_post_likes" (
    "post_id" "uuid" NOT NULL,
    "actor_pet_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "author_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "author_pet_id" "uuid" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "photo_url" "text",
    "photo_storage_path" "text",
    "likes_count" integer DEFAULT 0 NOT NULL,
    "comments_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_posts_body_length" CHECK (("char_length"("body") <= 4000)),
    CONSTRAINT "community_posts_comments_nonnegative" CHECK (("comments_count" >= 0)),
    CONSTRAINT "community_posts_content_required" CHECK ((("btrim"("body") <> ''::"text") OR ("photo_url" IS NOT NULL))),
    CONSTRAINT "community_posts_likes_nonnegative" CHECK (("likes_count" >= 0)),
    CONSTRAINT "community_posts_photo_pair" CHECK ((("photo_url" IS NULL) = ("photo_storage_path" IS NULL)))
);


ALTER TABLE "public"."community_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    CONSTRAINT "follows_no_self_follow" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_pet_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "applied_learning" boolean DEFAULT false NOT NULL,
    "target_tags" "text"[]
);


ALTER TABLE "public"."interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lost_pet_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "last_seen_location" "text" NOT NULL,
    "last_seen_at" timestamp with time zone NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "lost_pet_alert_details_length" CHECK ((("details" IS NULL) OR ("char_length"("details") <= 1500))),
    CONSTRAINT "lost_pet_alert_location_length" CHECK ((("char_length"("btrim"("last_seen_location")) >= 2) AND ("char_length"("btrim"("last_seen_location")) <= 250))),
    CONSTRAINT "lost_pet_alerts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."lost_pet_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_validation_intents" (
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "module_key" "text" NOT NULL,
    "intent_key" "text" NOT NULL,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "module_validation_intents_source_format" CHECK (("source" ~ '^[a-z0-9_]{2,64}$'::"text"))
);


ALTER TABLE "public"."module_validation_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_validation_interests" (
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "module_key" "text" NOT NULL,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "module_validation_interests_source_format" CHECK (("source" ~ '^[a-z0-9_]{2,64}$'::"text"))
);


ALTER TABLE "public"."module_validation_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_validation_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "module_key" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "module_validation_views_source_format" CHECK (("source" ~ '^[a-z0-9_]{2,64}$'::"text"))
);


ALTER TABLE "public"."module_validation_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pet_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "source_id" "uuid",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_body_length" CHECK ((("char_length"("body") >= 1) AND ("char_length"("body") <= 1200))),
    CONSTRAINT "notifications_title_length" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 160))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['sighting'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "original_file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "status" "text" DEFAULT 'uploading'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pet_documents_category_check" CHECK (("category" = ANY (ARRAY['vaccines'::"text", 'medical_history'::"text", 'identification'::"text", 'results'::"text", 'other'::"text"]))),
    CONSTRAINT "pet_documents_mime_type_check" CHECK (("mime_type" = ANY (ARRAY['application/pdf'::"text", 'image/jpeg'::"text", 'image/png'::"text", 'image/webp'::"text"]))),
    CONSTRAINT "pet_documents_original_file_name_length" CHECK ((("char_length"("btrim"("original_file_name")) >= 1) AND ("char_length"("btrim"("original_file_name")) <= 255))),
    CONSTRAINT "pet_documents_size_bytes_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 10485760))),
    CONSTRAINT "pet_documents_status_check" CHECK (("status" = ANY (ARRAY['uploading'::"text", 'active'::"text", 'deleting'::"text"]))),
    CONSTRAINT "pet_documents_storage_path_check" CHECK (("char_length"("btrim"("storage_path")) > 0)),
    CONSTRAINT "pet_documents_title_length" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 160)))
);


ALTER TABLE "public"."pet_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_place_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "visible" boolean DEFAULT false NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '02:00:00'::interval) NOT NULL,
    "ended_at" timestamp with time zone,
    CONSTRAINT "pet_place_checkins_end_after_start" CHECK ((("ended_at" IS NULL) OR ("ended_at" >= "checked_in_at"))),
    CONSTRAINT "pet_place_checkins_expiry_after_start" CHECK (("expires_at" > "checked_in_at"))
);


ALTER TABLE "public"."pet_place_checkins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_place_presence" (
    "checkin_id" "uuid" NOT NULL,
    "place_id" "uuid" NOT NULL,
    "visible_pet_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."pet_place_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "zone" "text" NOT NULL,
    "address" "text" NOT NULL,
    "hours" "text",
    "species_allowed" "text",
    "description" "text",
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "latitude" double precision,
    "longitude" double precision,
    "pet_rules" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "source" "text" DEFAULT 'pazo_curated'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pet_places_active_requires_coordinates" CHECK ((("status" <> 'active'::"text") OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL)))),
    CONSTRAINT "pet_places_address_length" CHECK ((("char_length"("btrim"("address")) >= 3) AND ("char_length"("btrim"("address")) <= 300))),
    CONSTRAINT "pet_places_category_allowed" CHECK (("category" = ANY (ARRAY['park'::"text", 'trail'::"text", 'food'::"text", 'veterinary'::"text", 'grooming'::"text", 'pet_store'::"text"]))),
    CONSTRAINT "pet_places_description_length" CHECK ((("description" IS NULL) OR ("char_length"("btrim"("description")) <= 3000))),
    CONSTRAINT "pet_places_latitude_valid" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision)))),
    CONSTRAINT "pet_places_longitude_valid" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision)))),
    CONSTRAINT "pet_places_name_length" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "pet_places_rules_length" CHECK ((("pet_rules" IS NULL) OR ("char_length"("btrim"("pet_rules")) <= 2000))),
    CONSTRAINT "pet_places_source_length" CHECK ((("char_length"("btrim"("source")) >= 2) AND ("char_length"("btrim"("source")) <= 80))),
    CONSTRAINT "pet_places_status_allowed" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))),
    CONSTRAINT "pet_places_zone_length" CHECK ((("char_length"("btrim"("zone")) >= 1) AND ("char_length"("btrim"("zone")) <= 120)))
);


ALTER TABLE "public"."pet_places" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_private_details" (
    "pet_id" "uuid" NOT NULL,
    "zone" "text",
    "interests" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "weight" "text",
    "diet_plan" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pet_private_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_private_metrics" (
    "pet_id" "uuid" NOT NULL,
    "learned_interests" "jsonb" DEFAULT '{}'::"jsonb",
    "last_decay_applied_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pet_private_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_public_links" (
    "pet_id" "uuid" NOT NULL,
    "public_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rotated_at" timestamp with time zone
);


ALTER TABLE "public"."pet_public_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_sightings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "alert_id" "uuid",
    "message" "text" NOT NULL,
    "location_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reporter_name" "text",
    "reporter_phone" "text",
    CONSTRAINT "pet_sighting_location_length" CHECK ((("location_text" IS NULL) OR ("char_length"("location_text") <= 250))),
    CONSTRAINT "pet_sighting_message_length" CHECK ((("char_length"("btrim"("message")) >= 3) AND ("char_length"("btrim"("message")) <= 1000))),
    CONSTRAINT "pet_sighting_reporter_name_length" CHECK ((("reporter_name" IS NULL) OR (("char_length"("btrim"("reporter_name")) >= 2) AND ("char_length"("btrim"("reporter_name")) <= 100)))),
    CONSTRAINT "pet_sighting_reporter_phone_length" CHECK ((("reporter_phone" IS NULL) OR (("char_length"("btrim"("reporter_phone")) >= 7) AND ("char_length"("btrim"("reporter_phone")) <= 40))))
);


ALTER TABLE "public"."pet_sightings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "species" "text" NOT NULL,
    "age" "text",
    "photo_url" "text",
    "zone" "text",
    "interests" "text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "bio" "text",
    "weight" "text",
    "dietPlan" "text",
    "breed" "text",
    "gender" "text",
    "is_lost" boolean DEFAULT false NOT NULL,
    "last_seen_location" "text",
    CONSTRAINT "pets_gender_allowed" CHECK ((("gender" IS NULL) OR ("gender" = ANY (ARRAY['macho'::"text", 'hembra'::"text"])))),
    CONSTRAINT "pets_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 50))),
    CONSTRAINT "pets_species_allowed" CHECK (("species" = ANY (ARRAY['gato'::"text", 'perro'::"text", 'conejo'::"text", 'ave'::"text", 'otro'::"text"])))
);


ALTER TABLE "public"."pets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submitter_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "address" "text" NOT NULL,
    "zone" "text",
    "note" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "place_suggestions_address_length" CHECK ((("char_length"("btrim"("address")) >= 3) AND ("char_length"("btrim"("address")) <= 300))),
    CONSTRAINT "place_suggestions_category_allowed" CHECK (("category" = ANY (ARRAY['park'::"text", 'trail'::"text", 'food'::"text", 'veterinary'::"text", 'grooming'::"text", 'pet_store'::"text"]))),
    CONSTRAINT "place_suggestions_name_length" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "place_suggestions_note_length" CHECK ((("note" IS NULL) OR ("char_length"("btrim"("note")) <= 1000))),
    CONSTRAINT "place_suggestions_status_allowed" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "place_suggestions_zone_length" CHECK ((("zone" IS NULL) OR ("char_length"("btrim"("zone")) <= 120)))
);


ALTER TABLE "public"."place_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "place_id" "uuid",
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "place_usage_events_category_allowed" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['park'::"text", 'trail'::"text", 'food'::"text", 'veterinary'::"text", 'grooming'::"text", 'pet_store'::"text"])))),
    CONSTRAINT "place_usage_events_type_allowed" CHECK (("event_type" = ANY (ARRAY['map_open'::"text", 'use_location'::"text", 'place_open'::"text", 'search'::"text", 'filter'::"text"])))
);


ALTER TABLE "public"."place_usage_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_pet_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_id" "text",
    CONSTRAINT "post_comments_body_length" CHECK ((("char_length"("btrim"("body")) >= 1) AND ("char_length"("btrim"("body")) <= 1000)))
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "is_founder" boolean DEFAULT false,
    "paypal_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "onboarding_completed" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "result_type" "text",
    "filter_type" "text",
    "had_results" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "search_usage_event_shape_valid" CHECK (((("event_type" = 'search_open'::"text") AND ("result_type" IS NULL) AND ("filter_type" IS NULL) AND ("had_results" IS NULL)) OR (("event_type" = 'search_execute'::"text") AND ("result_type" IS NULL) AND ("filter_type" IS NULL) AND ("had_results" IS NOT NULL)) OR (("event_type" = 'search_result_open'::"text") AND ("result_type" IS NOT NULL) AND ("filter_type" IS NOT NULL) AND ("had_results" IS NULL)) OR (("event_type" = 'search_filter_change'::"text") AND ("result_type" IS NULL) AND ("filter_type" IS NOT NULL) AND ("had_results" IS NULL)))),
    CONSTRAINT "search_usage_event_type_valid" CHECK (("event_type" = ANY (ARRAY['search_open'::"text", 'search_execute'::"text", 'search_result_open'::"text", 'search_filter_change'::"text"]))),
    CONSTRAINT "search_usage_filter_type_valid" CHECK ((("filter_type" IS NULL) OR ("filter_type" = ANY (ARRAY['all'::"text", 'pet'::"text", 'community'::"text", 'place'::"text"])))),
    CONSTRAINT "search_usage_result_type_valid" CHECK ((("result_type" IS NULL) OR ("result_type" = ANY (ARRAY['pet'::"text", 'community'::"text", 'place'::"text"]))))
);


ALTER TABLE "public"."search_usage_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "validation_private"."intent_options" (
    "module_key" "text" NOT NULL,
    "intent_key" "text" NOT NULL,
    "sort_order" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "validation_intent_key_format" CHECK (("intent_key" ~ '^[a-z0-9_]{2,64}$'::"text")),
    CONSTRAINT "validation_intent_sort_order_positive" CHECK (("sort_order" > 0))
);


ALTER TABLE "validation_private"."intent_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "validation_private"."modules" (
    "module_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "validation_module_key_format" CHECK (("module_key" ~ '^[a-z0-9_]{2,64}$'::"text"))
);


ALTER TABLE "validation_private"."modules" OWNER TO "postgres";


ALTER TABLE ONLY "public"."care_completions"
    ADD CONSTRAINT "care_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_items"
    ADD CONSTRAINT "care_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("community_id", "user_id");



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_post_likes"
    ADD CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("post_id", "actor_pet_id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interactions"
    ADD CONSTRAINT "interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lost_pet_alerts"
    ADD CONSTRAINT "lost_pet_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_validation_intents"
    ADD CONSTRAINT "module_validation_intents_pkey" PRIMARY KEY ("user_id", "module_key");



ALTER TABLE ONLY "public"."module_validation_interests"
    ADD CONSTRAINT "module_validation_interests_pkey" PRIMARY KEY ("user_id", "module_key");



ALTER TABLE ONLY "public"."module_validation_views"
    ADD CONSTRAINT "module_validation_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_validation_views"
    ADD CONSTRAINT "module_validation_views_unique_session" UNIQUE ("user_id", "module_key", "session_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_documents"
    ADD CONSTRAINT "pet_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_documents"
    ADD CONSTRAINT "pet_documents_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."pet_place_checkins"
    ADD CONSTRAINT "pet_place_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_place_presence"
    ADD CONSTRAINT "pet_place_presence_pkey" PRIMARY KEY ("checkin_id");



ALTER TABLE ONLY "public"."pet_places"
    ADD CONSTRAINT "pet_places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_private_details"
    ADD CONSTRAINT "pet_private_details_pkey" PRIMARY KEY ("pet_id");



ALTER TABLE ONLY "public"."pet_private_metrics"
    ADD CONSTRAINT "pet_private_metrics_pkey" PRIMARY KEY ("pet_id");



ALTER TABLE ONLY "public"."pet_public_links"
    ADD CONSTRAINT "pet_public_links_pkey" PRIMARY KEY ("pet_id");



ALTER TABLE ONLY "public"."pet_public_links"
    ADD CONSTRAINT "pet_public_links_public_token_key" UNIQUE ("public_token");



ALTER TABLE ONLY "public"."pet_sightings"
    ADD CONSTRAINT "pet_sightings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_suggestions"
    ADD CONSTRAINT "place_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_usage_events"
    ADD CONSTRAINT "place_usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_usage_events"
    ADD CONSTRAINT "search_usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "unique_follow" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "validation_private"."intent_options"
    ADD CONSTRAINT "intent_options_pkey" PRIMARY KEY ("module_key", "intent_key");



ALTER TABLE ONLY "validation_private"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("module_key");



CREATE INDEX "communities_category_status_idx" ON "public"."communities" USING "btree" ("category", "status");



CREATE INDEX "communities_owner_idx" ON "public"."communities" USING "btree" ("owner_user_id");



CREATE INDEX "communities_species_status_idx" ON "public"."communities" USING "btree" ("species", "status");



CREATE INDEX "communities_status_created_idx" ON "public"."communities" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "community_comments_author_idx" ON "public"."community_post_comments" USING "btree" ("author_pet_id");



CREATE INDEX "community_comments_post_created_idx" ON "public"."community_post_comments" USING "btree" ("post_id", "created_at", "id");



CREATE INDEX "community_likes_actor_idx" ON "public"."community_post_likes" USING "btree" ("actor_pet_id");



CREATE INDEX "community_memberships_display_pet_idx" ON "public"."community_memberships" USING "btree" ("display_pet_id");



CREATE INDEX "community_memberships_user_joined_idx" ON "public"."community_memberships" USING "btree" ("user_id", "joined_at" DESC);



CREATE UNIQUE INDEX "community_one_owner_idx" ON "public"."community_memberships" USING "btree" ("community_id") WHERE ("role" = 'owner'::"text");



CREATE INDEX "community_posts_author_created_idx" ON "public"."community_posts" USING "btree" ("author_pet_id", "created_at" DESC);



CREATE INDEX "community_posts_author_user_idx" ON "public"."community_posts" USING "btree" ("author_user_id");



CREATE INDEX "community_posts_community_created_idx" ON "public"."community_posts" USING "btree" ("community_id", "created_at" DESC, "id" DESC);



CREATE INDEX "idx_care_completions_care_completed" ON "public"."care_completions" USING "btree" ("care_item_id", "completed_at" DESC, "id" DESC);



CREATE INDEX "idx_care_completions_pet_completed" ON "public"."care_completions" USING "btree" ("pet_id", "completed_at" DESC, "id" DESC);



CREATE INDEX "idx_care_items_pet_status_due" ON "public"."care_items" USING "btree" ("pet_id", "status", "due_date", "due_time");



CREATE INDEX "idx_follows_follower_following" ON "public"."follows" USING "btree" ("follower_id", "following_id");



CREATE INDEX "idx_follows_following_id" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "idx_interactions_actor" ON "public"."interactions" USING "btree" ("actor_pet_id");



CREATE INDEX "idx_interactions_composite" ON "public"."interactions" USING "btree" ("actor_pet_id", "target_id", "action_type", "created_at");



CREATE INDEX "idx_interactions_target" ON "public"."interactions" USING "btree" ("target_id");



CREATE INDEX "idx_interactions_type" ON "public"."interactions" USING "btree" ("action_type");



CREATE INDEX "idx_lost_pet_alerts_pet_created" ON "public"."lost_pet_alerts" USING "btree" ("pet_id", "created_at" DESC);



CREATE INDEX "idx_module_validation_intents_module_intent" ON "public"."module_validation_intents" USING "btree" ("module_key", "intent_key");



CREATE INDEX "idx_module_validation_interests_module_created" ON "public"."module_validation_interests" USING "btree" ("module_key", "created_at" DESC);



CREATE INDEX "idx_module_validation_views_module_created" ON "public"."module_validation_views" USING "btree" ("module_key", "created_at" DESC);



CREATE INDEX "idx_notifications_pet_id" ON "public"."notifications" USING "btree" ("pet_id");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("read_at" IS NULL);



CREATE UNIQUE INDEX "idx_one_active_lost_alert_per_pet" ON "public"."lost_pet_alerts" USING "btree" ("pet_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_pet_documents_pet_status_created" ON "public"."pet_documents" USING "btree" ("pet_id", "status", "created_at" DESC, "id" DESC);



CREATE INDEX "idx_pet_sightings_alert_id" ON "public"."pet_sightings" USING "btree" ("alert_id");



CREATE INDEX "idx_pet_sightings_pet_created" ON "public"."pet_sightings" USING "btree" ("pet_id", "created_at" DESC);



CREATE INDEX "idx_pets_owner_id" ON "public"."pets" USING "btree" ("owner_id");



CREATE INDEX "idx_post_comments_author" ON "public"."post_comments" USING "btree" ("author_pet_id");



CREATE INDEX "idx_post_comments_post_created" ON "public"."post_comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_posts_created_at_desc" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_pet_id" ON "public"."posts" USING "btree" ("pet_id");



CREATE INDEX "idx_posts_tags_gin" ON "public"."posts" USING "gin" ("tags");



CREATE INDEX "idx_posts_user_id" ON "public"."posts" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_unique_active_post_likes_saves" ON "public"."interactions" USING "btree" ("actor_pet_id", "target_id", "action_type") WHERE (("target_type" = 'post'::"text") AND ("action_type" = ANY (ARRAY['like'::"text", 'save'::"text"])));



CREATE UNIQUE INDEX "pet_place_checkins_one_open_per_pet_idx" ON "public"."pet_place_checkins" USING "btree" ("pet_id") WHERE ("ended_at" IS NULL);



CREATE INDEX "pet_place_checkins_pet_history_idx" ON "public"."pet_place_checkins" USING "btree" ("pet_id", "checked_in_at" DESC);



CREATE INDEX "pet_place_checkins_place_idx" ON "public"."pet_place_checkins" USING "btree" ("place_id", "checked_in_at" DESC);



CREATE INDEX "pet_place_checkins_user_idx" ON "public"."pet_place_checkins" USING "btree" ("user_id", "checked_in_at" DESC);



CREATE INDEX "pet_place_presence_place_expiry_idx" ON "public"."pet_place_presence" USING "btree" ("place_id", "expires_at");



CREATE INDEX "pet_place_presence_visible_pet_idx" ON "public"."pet_place_presence" USING "btree" ("visible_pet_id");



CREATE INDEX "pet_places_status_category_idx" ON "public"."pet_places" USING "btree" ("status", "category");



CREATE INDEX "pet_places_status_coordinates_idx" ON "public"."pet_places" USING "btree" ("status", "latitude", "longitude");



CREATE INDEX "place_suggestions_status_idx" ON "public"."place_suggestions" USING "btree" ("status", "created_at");



CREATE INDEX "place_suggestions_submitter_idx" ON "public"."place_suggestions" USING "btree" ("submitter_user_id", "created_at" DESC);



CREATE UNIQUE INDEX "place_usage_events_map_open_session_idx" ON "public"."place_usage_events" USING "btree" ("user_id", "session_id", "event_type") WHERE ("event_type" = 'map_open'::"text");



CREATE INDEX "place_usage_events_place_idx" ON "public"."place_usage_events" USING "btree" ("place_id", "created_at" DESC);



CREATE INDEX "place_usage_events_user_created_idx" ON "public"."place_usage_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "search_usage_events_user_created_idx" ON "public"."search_usage_events" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "uq_care_completion_occurrence" ON "public"."care_completions" USING "btree" ("care_item_id", "scheduled_date", COALESCE("scheduled_time", '00:00:00'::time without time zone));



CREATE OR REPLACE TRIGGER "trg_care_items_prepare" BEFORE INSERT OR UPDATE ON "public"."care_items" FOR EACH ROW EXECUTE FUNCTION "private"."prepare_care_item"();



CREATE OR REPLACE TRIGGER "trg_communities_normalize" BEFORE INSERT OR UPDATE ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "community_private"."normalize_community_row"();



CREATE CONSTRAINT TRIGGER "trg_communities_require_owner_membership" AFTER INSERT OR UPDATE OF "owner_user_id" ON "public"."communities" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "community_private"."ensure_owner_membership"();



CREATE OR REPLACE TRIGGER "trg_community_comments_count" AFTER INSERT OR DELETE ON "public"."community_post_comments" FOR EACH ROW EXECUTE FUNCTION "community_private"."adjust_community_comment_count"();



CREATE OR REPLACE TRIGGER "trg_community_likes_count" AFTER INSERT OR DELETE ON "public"."community_post_likes" FOR EACH ROW EXECUTE FUNCTION "community_private"."adjust_community_like_count"();



CREATE OR REPLACE TRIGGER "trg_community_memberships_count" AFTER INSERT OR DELETE ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "community_private"."adjust_member_count"();



CREATE OR REPLACE TRIGGER "trg_ensure_pet_public_link" AFTER INSERT ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "private"."ensure_pet_public_link"();



CREATE OR REPLACE TRIGGER "trg_guard_comment_interaction_insert" BEFORE INSERT ON "public"."interactions" FOR EACH ROW EXECUTE FUNCTION "private"."guard_comment_interaction_insert"();



CREATE OR REPLACE TRIGGER "trg_module_validation_intents_updated_at" BEFORE UPDATE ON "public"."module_validation_intents" FOR EACH ROW EXECUTE FUNCTION "validation_private"."touch_validation_intent_updated_at"();



CREATE OR REPLACE TRIGGER "trg_normalize_post_before_insert" BEFORE INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "private"."normalize_post_before_insert"();



CREATE OR REPLACE TRIGGER "trg_normalize_post_comment_before_insert" BEFORE INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "private"."normalize_post_comment_before_insert"();



CREATE OR REPLACE TRIGGER "trg_normalize_post_interaction_before_insert" BEFORE INSERT ON "public"."interactions" FOR EACH ROW EXECUTE FUNCTION "private"."normalize_post_interaction_before_insert"();



CREATE OR REPLACE TRIGGER "trg_pet_place_checkins_normalize_update" BEFORE UPDATE ON "public"."pet_place_checkins" FOR EACH ROW EXECUTE FUNCTION "place_private"."normalize_checkin_update"();



CREATE OR REPLACE TRIGGER "trg_pet_place_checkins_prepare_insert" BEFORE INSERT ON "public"."pet_place_checkins" FOR EACH ROW EXECUTE FUNCTION "place_private"."prepare_checkin_insert"();



CREATE OR REPLACE TRIGGER "trg_pet_place_checkins_sync_presence" AFTER INSERT OR DELETE OR UPDATE ON "public"."pet_place_checkins" FOR EACH ROW EXECUTE FUNCTION "place_private"."sync_place_presence"();



CREATE OR REPLACE TRIGGER "trg_pet_places_normalize" BEFORE INSERT OR UPDATE ON "public"."pet_places" FOR EACH ROW EXECUTE FUNCTION "place_private"."normalize_place_row"();



CREATE OR REPLACE TRIGGER "trg_place_suggestions_normalize" BEFORE INSERT ON "public"."place_suggestions" FOR EACH ROW EXECUTE FUNCTION "place_private"."normalize_place_suggestion"();



CREATE OR REPLACE TRIGGER "trg_prepare_pet_document" BEFORE INSERT OR UPDATE ON "public"."pet_documents" FOR EACH ROW EXECUTE FUNCTION "document_private"."prepare_pet_document"();



CREATE OR REPLACE TRIGGER "trg_process_post_comment_side_effects" AFTER INSERT OR DELETE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "private"."process_post_comment_side_effects"();



CREATE OR REPLACE TRIGGER "trg_process_reversible_interaction_side_effects" AFTER INSERT OR DELETE ON "public"."interactions" FOR EACH ROW EXECUTE FUNCTION "private"."process_reversible_interaction_side_effects"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_communities" BEFORE INSERT ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_social_write_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_community_post_comments" BEFORE INSERT ON "public"."community_post_comments" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_social_write_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_community_posts" BEFORE INSERT ON "public"."community_posts" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_social_write_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_place_suggestions" BEFORE INSERT ON "public"."place_suggestions" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_social_write_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_post_comments" BEFORE INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_social_write_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_rate_limit_posts" BEFORE INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_social_write_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_sync_pet_public_profile_to_posts" AFTER UPDATE OF "name", "species", "photo_url" ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "private"."sync_pet_public_profile_to_posts"();



CREATE OR REPLACE TRIGGER "trg_validate_follow_relationship" BEFORE INSERT OR UPDATE OF "follower_id", "following_id" ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "private"."validate_follow_relationship"();



ALTER TABLE ONLY "public"."care_completions"
    ADD CONSTRAINT "care_completions_care_item_id_fkey" FOREIGN KEY ("care_item_id") REFERENCES "public"."care_items"("id");



ALTER TABLE ONLY "public"."care_completions"
    ADD CONSTRAINT "care_completions_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id");



ALTER TABLE ONLY "public"."care_items"
    ADD CONSTRAINT "care_items_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_display_pet_id_fkey" FOREIGN KEY ("display_pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_author_pet_id_fkey" FOREIGN KEY ("author_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_likes"
    ADD CONSTRAINT "community_post_likes_actor_pet_id_fkey" FOREIGN KEY ("actor_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_likes"
    ADD CONSTRAINT "community_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_author_pet_id_fkey" FOREIGN KEY ("author_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_pet_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_pet_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lost_pet_alerts"
    ADD CONSTRAINT "lost_pet_alerts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_validation_intents"
    ADD CONSTRAINT "module_validation_intents_interest_fk" FOREIGN KEY ("user_id", "module_key") REFERENCES "public"."module_validation_interests"("user_id", "module_key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_validation_intents"
    ADD CONSTRAINT "module_validation_intents_option_fk" FOREIGN KEY ("module_key", "intent_key") REFERENCES "validation_private"."intent_options"("module_key", "intent_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."module_validation_intents"
    ADD CONSTRAINT "module_validation_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_validation_interests"
    ADD CONSTRAINT "module_validation_interests_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "validation_private"."modules"("module_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."module_validation_interests"
    ADD CONSTRAINT "module_validation_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_validation_views"
    ADD CONSTRAINT "module_validation_views_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "validation_private"."modules"("module_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."module_validation_views"
    ADD CONSTRAINT "module_validation_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_documents"
    ADD CONSTRAINT "pet_documents_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pet_place_checkins"
    ADD CONSTRAINT "pet_place_checkins_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_place_checkins"
    ADD CONSTRAINT "pet_place_checkins_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."pet_places"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pet_place_checkins"
    ADD CONSTRAINT "pet_place_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_place_presence"
    ADD CONSTRAINT "pet_place_presence_checkin_id_fkey" FOREIGN KEY ("checkin_id") REFERENCES "public"."pet_place_checkins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_place_presence"
    ADD CONSTRAINT "pet_place_presence_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."pet_places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_place_presence"
    ADD CONSTRAINT "pet_place_presence_visible_pet_id_fkey" FOREIGN KEY ("visible_pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pet_private_details"
    ADD CONSTRAINT "pet_private_details_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_private_metrics"
    ADD CONSTRAINT "pet_private_metrics_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_public_links"
    ADD CONSTRAINT "pet_public_links_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_sightings"
    ADD CONSTRAINT "pet_sightings_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."lost_pet_alerts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pet_sightings"
    ADD CONSTRAINT "pet_sightings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."place_suggestions"
    ADD CONSTRAINT "place_suggestions_submitter_user_id_fkey" FOREIGN KEY ("submitter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_usage_events"
    ADD CONSTRAINT "place_usage_events_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."pet_places"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."place_usage_events"
    ADD CONSTRAINT "place_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_author_pet_id_fkey" FOREIGN KEY ("author_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."search_usage_events"
    ADD CONSTRAINT "search_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "validation_private"."intent_options"
    ADD CONSTRAINT "intent_options_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "validation_private"."modules"("module_key") ON DELETE CASCADE;



ALTER TABLE "public"."care_completions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "care_completions_owner_select" ON "public"."care_completions" FOR SELECT TO "authenticated" USING (("pet_id" IN ( SELECT "p"."id"
   FROM "public"."pets" "p"
  WHERE ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."care_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "care_items_owner_insert" ON "public"."care_items" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'active'::"text") AND ("pet_id" IN ( SELECT "p"."id"
   FROM "public"."pets" "p"
  WHERE ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "care_items_owner_select" ON "public"."care_items" FOR SELECT TO "authenticated" USING (("pet_id" IN ( SELECT "p"."id"
   FROM "public"."pets" "p"
  WHERE ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "care_items_owner_update_active" ON "public"."care_items" FOR UPDATE TO "authenticated" USING ((("status" = 'active'::"text") AND ("pet_id" IN ( SELECT "p"."id"
   FROM "public"."pets" "p"
  WHERE ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("status" = 'active'::"text") AND ("pet_id" IN ( SELECT "p"."id"
   FROM "public"."pets" "p"
  WHERE ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communities_insert_owner" ON "public"."communities" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "communities_read_authenticated" ON "public"."communities" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"text") OR ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "communities_update_owner" ON "public"."communities" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "community_comments_delete_author_or_owner" ON "public"."community_post_comments" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_post_comments"."author_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."community_posts" "cp"
     JOIN "public"."communities" "c" ON (("c"."id" = "cp"."community_id")))
  WHERE (("cp"."id" = "community_post_comments"."post_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_comments_insert_member" ON "public"."community_post_comments" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_post_comments"."author_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND (EXISTS ( SELECT 1
   FROM (("public"."community_posts" "cp"
     JOIN "public"."communities" "c" ON (("c"."id" = "cp"."community_id")))
     JOIN "public"."community_memberships" "m" ON (("m"."community_id" = "c"."id")))
  WHERE (("cp"."id" = "community_post_comments"."post_id") AND ("c"."status" = 'active'::"text") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_comments_read_authenticated" ON "public"."community_post_comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."community_posts" "cp"
     JOIN "public"."communities" "c" ON (("c"."id" = "cp"."community_id")))
  WHERE (("cp"."id" = "community_post_comments"."post_id") AND (("c"."status" = 'active'::"text") OR ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_likes_delete_own" ON "public"."community_post_likes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_post_likes"."actor_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "community_likes_insert_member" ON "public"."community_post_likes" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_post_likes"."actor_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND (EXISTS ( SELECT 1
   FROM (("public"."community_posts" "cp"
     JOIN "public"."communities" "c" ON (("c"."id" = "cp"."community_id")))
     JOIN "public"."community_memberships" "m" ON (("m"."community_id" = "c"."id")))
  WHERE (("cp"."id" = "community_post_likes"."post_id") AND ("c"."status" = 'active'::"text") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_likes_read_own" ON "public"."community_post_likes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_post_likes"."actor_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_memberships_delete_self_or_owner" ON "public"."community_memberships" FOR DELETE TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("role" = 'member'::"text")) OR (("role" = 'member'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "community_memberships_insert_self" ON "public"."community_memberships" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("display_pet_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_memberships"."display_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND ("c"."status" = 'active'::"text") AND (("community_memberships"."role" = 'member'::"text") OR (("community_memberships"."role" = 'owner'::"text") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))))));



CREATE POLICY "community_memberships_read_authenticated" ON "public"."community_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND (("c"."status" = 'active'::"text") OR ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_memberships_update_display_pet" ON "public"."community_memberships" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_memberships"."display_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."community_post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_posts_delete_author_or_owner" ON "public"."community_posts" FOR DELETE TO "authenticated" USING ((("author_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_posts"."community_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_posts_insert_member" ON "public"."community_posts" FOR INSERT TO "authenticated" WITH CHECK ((("author_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "community_posts"."author_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND (EXISTS ( SELECT 1
   FROM ("public"."communities" "c"
     JOIN "public"."community_memberships" "m" ON (("m"."community_id" = "c"."id")))
  WHERE (("c"."id" = "community_posts"."community_id") AND ("c"."status" = 'active'::"text") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "community_posts_read_authenticated" ON "public"."community_posts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_posts"."community_id") AND (("c"."status" = 'active'::"text") OR ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_owner_delete" ON "public"."follows" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "follows"."follower_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "follows_owner_insert" ON "public"."follows" FOR INSERT TO "authenticated" WITH CHECK ((("follower_id" <> "following_id") AND (EXISTS ( SELECT 1
   FROM "public"."pets" "follower"
  WHERE (("follower"."id" = "follows"."follower_id") AND ("follower"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND (NOT (EXISTS ( SELECT 1
   FROM ("public"."pets" "follower"
     JOIN "public"."pets" "following" ON (("following"."id" = "follows"."following_id")))
  WHERE (("follower"."id" = "follows"."follower_id") AND ("follower"."owner_id" = "following"."owner_id")))))));



CREATE POLICY "follows_public_read" ON "public"."follows" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."interactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interactions_delete_owner_policy" ON "public"."interactions" FOR DELETE TO "authenticated" USING ((("target_type" = 'post'::"text") AND ("action_type" = ANY (ARRAY['like'::"text", 'save'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "interactions"."actor_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "interactions_insert_owner_policy" ON "public"."interactions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "interactions"."actor_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "interactions_select_owner_policy" ON "public"."interactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "interactions"."actor_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."lost_pet_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lost_pet_alerts_owner_select" ON "public"."lost_pet_alerts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "lost_pet_alerts"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."module_validation_intents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_validation_intents_insert_own" ON "public"."module_validation_intents" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "module_validation_intents_select_own" ON "public"."module_validation_intents" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "module_validation_intents_update_own" ON "public"."module_validation_intents" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."module_validation_interests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_validation_interests_community_extension_eligibility" ON "public"."module_validation_interests" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("module_key" <> ALL (ARRAY['communities_events'::"text", 'communities_challenges'::"text", 'communities_badges'::"text", 'communities_qa'::"text", 'communities_admin_tools'::"text"])) OR (("module_key" = ANY (ARRAY['communities_events'::"text", 'communities_challenges'::"text", 'communities_badges'::"text", 'communities_qa'::"text"])) AND ((("source" = 'community_info_member'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "m"
     JOIN "public"."communities" "c" ON (("c"."id" = "m"."community_id")))
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = 'member'::"text") AND ("c"."status" = 'active'::"text"))))) OR (("source" = 'community_info_owner'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "m"
     JOIN "public"."communities" "c" ON (("c"."id" = "m"."community_id")))
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = 'owner'::"text") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."status" = 'active'::"text"))))))) OR (("module_key" = 'communities_admin_tools'::"text") AND ("source" = 'community_info_owner'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "m"
     JOIN "public"."communities" "c" ON (("c"."id" = "m"."community_id")))
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = 'owner'::"text") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."status" = 'active'::"text")))))));



CREATE POLICY "module_validation_interests_insert_own" ON "public"."module_validation_interests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "module_validation_interests_select_own" ON "public"."module_validation_interests" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."module_validation_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_validation_views_community_extension_eligibility" ON "public"."module_validation_views" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("module_key" <> ALL (ARRAY['communities_events'::"text", 'communities_challenges'::"text", 'communities_badges'::"text", 'communities_qa'::"text", 'communities_admin_tools'::"text"])) OR (("module_key" = ANY (ARRAY['communities_events'::"text", 'communities_challenges'::"text", 'communities_badges'::"text", 'communities_qa'::"text"])) AND ((("source" = 'community_info_member'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "m"
     JOIN "public"."communities" "c" ON (("c"."id" = "m"."community_id")))
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = 'member'::"text") AND ("c"."status" = 'active'::"text"))))) OR (("source" = 'community_info_owner'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "m"
     JOIN "public"."communities" "c" ON (("c"."id" = "m"."community_id")))
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = 'owner'::"text") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."status" = 'active'::"text"))))))) OR (("module_key" = 'communities_admin_tools'::"text") AND ("source" = 'community_info_owner'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "m"
     JOIN "public"."communities" "c" ON (("c"."id" = "m"."community_id")))
  WHERE (("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = 'owner'::"text") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."status" = 'active'::"text")))))));



CREATE POLICY "module_validation_views_insert_own" ON "public"."module_validation_views" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_owner_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notifications_owner_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."pet_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_documents_owner_select" ON "public"."pet_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_documents"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "pet_documents_owner_update" ON "public"."pet_documents" FOR UPDATE TO "authenticated" USING ((("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_documents"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_documents"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."pet_place_checkins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_place_checkins_insert_own_pet" ON "public"."pet_place_checkins" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_place_checkins"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND (EXISTS ( SELECT 1
   FROM "public"."pet_places" "pp"
  WHERE (("pp"."id" = "pet_place_checkins"."place_id") AND ("pp"."status" = 'active'::"text"))))));



CREATE POLICY "pet_place_checkins_read_own" ON "public"."pet_place_checkins" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "pet_place_checkins_update_own_active" ON "public"."pet_place_checkins" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ended_at" IS NULL) AND ("expires_at" > "now"()))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."pet_place_presence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_place_presence_read_active" ON "public"."pet_place_presence" FOR SELECT TO "authenticated" USING ((("expires_at" > "now"()) AND (EXISTS ( SELECT 1
   FROM "public"."pet_places" "pp"
  WHERE (("pp"."id" = "pet_place_presence"."place_id") AND ("pp"."status" = 'active'::"text"))))));



ALTER TABLE "public"."pet_places" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_places_read_active" ON "public"."pet_places" FOR SELECT TO "authenticated", "anon" USING (("status" = 'active'::"text"));



ALTER TABLE "public"."pet_private_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_private_details_owner_insert" ON "public"."pet_private_details" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_details"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "pet_private_details_owner_select" ON "public"."pet_private_details" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_details"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "pet_private_details_owner_update" ON "public"."pet_private_details" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_details"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_details"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."pet_private_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_private_metrics_owner_insert" ON "public"."pet_private_metrics" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_metrics"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "pet_private_metrics_owner_select" ON "public"."pet_private_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_metrics"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "pet_private_metrics_owner_update" ON "public"."pet_private_metrics" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_metrics"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_private_metrics"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."pet_public_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_public_links_owner_select" ON "public"."pet_public_links" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_public_links"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."pet_sightings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_sightings_owner_select" ON "public"."pet_sightings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_sightings"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pets_owner_insert" ON "public"."pets" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "pets_owner_update" ON "public"."pets" FOR UPDATE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "pets_public_read" ON "public"."pets" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."place_suggestions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place_suggestions_insert_self" ON "public"."place_suggestions" FOR INSERT TO "authenticated" WITH CHECK ((("submitter_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"text")));



ALTER TABLE "public"."place_usage_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place_usage_events_insert_self" ON "public"."place_usage_events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_comments_owner_delete" ON "public"."post_comments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "post_comments"."author_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "post_comments_owner_insert" ON "public"."post_comments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "post_comments"."author_pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "post_comments_public_read" ON "public"."post_comments" FOR SELECT USING (true);



ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "posts_owner_insert" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "posts"."pet_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "posts_public_read" ON "public"."posts" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_owner_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."search_usage_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "search_usage_events_insert_own" ON "public"."search_usage_events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."follows";



GRANT USAGE ON SCHEMA "care_private" TO "authenticated";
GRANT USAGE ON SCHEMA "care_private" TO "service_role";



GRANT USAGE ON SCHEMA "document_private" TO "authenticated";
GRANT USAGE ON SCHEMA "document_private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "rescue_private" TO "anon";
GRANT USAGE ON SCHEMA "rescue_private" TO "authenticated";



GRANT USAGE ON SCHEMA "validation_private" TO "service_role";



REVOKE ALL ON FUNCTION "care_private"."archive_care_item_internal"("p_care_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "care_private"."archive_care_item_internal"("p_care_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "care_private"."archive_care_item_internal"("p_care_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "care_private"."complete_care_item_internal"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "care_private"."complete_care_item_internal"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "care_private"."complete_care_item_internal"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) TO "service_role";



REVOKE ALL ON FUNCTION "care_private"."undo_care_completion_internal"("p_completion_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "care_private"."undo_care_completion_internal"("p_completion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "care_private"."undo_care_completion_internal"("p_completion_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "community_private"."adjust_community_comment_count"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "community_private"."adjust_community_like_count"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "community_private"."adjust_member_count"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "community_private"."ensure_owner_membership"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "community_private"."normalize_community_row"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "document_private"."begin_delete_pet_document_internal"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."begin_delete_pet_document_internal"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "document_private"."begin_delete_pet_document_internal"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "document_private"."begin_pet_document_upload_internal"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."begin_pet_document_upload_internal"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "document_private"."begin_pet_document_upload_internal"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "document_private"."cancel_delete_pet_document_internal"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."cancel_delete_pet_document_internal"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "document_private"."cancel_delete_pet_document_internal"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "document_private"."cancel_pet_document_upload_internal"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."cancel_pet_document_upload_internal"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "document_private"."cancel_pet_document_upload_internal"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "document_private"."finalize_delete_pet_document_internal"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."finalize_delete_pet_document_internal"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "document_private"."finalize_delete_pet_document_internal"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "document_private"."finalize_pet_document_upload_internal"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."finalize_pet_document_upload_internal"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "document_private"."finalize_pet_document_upload_internal"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "document_private"."prepare_pet_document"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "document_private"."try_finalize_delete_pet_document_internal"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "document_private"."try_finalize_delete_pet_document_internal"("p_document_id" "uuid") TO "authenticated";






















































































































































REVOKE ALL ON FUNCTION "place_private"."normalize_checkin_update"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "place_private"."normalize_place_row"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "place_private"."normalize_place_suggestion"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "place_private"."prepare_checkin_insert"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "place_private"."sync_place_presence"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."adjust_pet_learning_tags"("p_pet_id" "uuid", "p_tags" "text"[], "p_delta" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."enforce_social_write_rate_limit"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."ensure_pet_public_link"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guard_comment_interaction_insert"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."normalize_post_before_insert"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."normalize_post_comment_before_insert"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."normalize_post_interaction_before_insert"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."prepare_care_item"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."process_post_comment_side_effects"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."process_reversible_interaction_side_effects"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."sync_pet_public_profile_to_posts"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_follow_relationship"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."activate_lost_pet_alert"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_lost_pet_alert"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_lost_pet_alert"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_care_item"("p_care_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_care_item"("p_care_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_care_item"("p_care_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."begin_delete_pet_document"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."begin_delete_pet_document"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."begin_delete_pet_document"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."begin_pet_document_upload"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."begin_pet_document_upload"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."begin_pet_document_upload"("p_pet_id" "uuid", "p_title" "text", "p_category" "text", "p_original_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_delete_pet_document"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_delete_pet_document"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_delete_pet_document"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_pet_document_upload"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_pet_document_upload"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_pet_document_upload"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_care_item"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_care_item"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_care_item"("p_care_item_id" "uuid", "p_expected_due_date" "date", "p_expected_due_time" time without time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_category" "text", "p_species" "text", "p_zone" "text", "p_rules" "text", "p_display_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_category" "text", "p_species" "text", "p_zone" "text", "p_rules" "text", "p_display_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_category" "text", "p_species" "text", "p_zone" "text", "p_rules" "text", "p_display_pet_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_pet_profile"("p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_zone" "text", "p_interests" "text"[], "p_bio" "text", "p_breed" "text", "p_gender" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_pet_profile"("p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_zone" "text", "p_interests" "text"[], "p_bio" "text", "p_breed" "text", "p_gender" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_pet_profile"("p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_zone" "text", "p_interests" "text"[], "p_bio" "text", "p_breed" "text", "p_gender" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_delete_pet_document"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_delete_pet_document"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_delete_pet_document"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_pet_document_upload"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_pet_document_upload"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_pet_document_upload"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_pet_founder_status"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pet_founder_status"("p_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pet_founder_status"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pet_founder_status"("p_pet_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_pet_rescue_profile"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_pet_rescue_profile"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_pet_rescue_profile"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_pet_rescue_profile"("p_token" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "service_role";
GRANT SELECT ON TABLE "public"."posts" TO "anon";
GRANT SELECT ON TABLE "public"."posts" TO "authenticated";



GRANT INSERT("pet_id") ON TABLE "public"."posts" TO "authenticated";



GRANT INSERT("location") ON TABLE "public"."posts" TO "authenticated";



GRANT INSERT("text") ON TABLE "public"."posts" TO "authenticated";



GRANT INSERT("photo_url") ON TABLE "public"."posts" TO "authenticated";



GRANT INSERT("tags") ON TABLE "public"."posts" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_recommended_posts"("p_actor_pet_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recommended_posts"("p_actor_pet_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_posts"("p_actor_pet_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_recommended_posts_page"("p_actor_pet_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recommended_posts_page"("p_actor_pet_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_posts_page"("p_actor_pet_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."register_interaction_signal"("p_actor_pet_id" "uuid", "p_target_id" "uuid", "p_action_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_interaction_signal"("p_actor_pet_id" "uuid", "p_target_id" "uuid", "p_action_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_interaction_signal"("p_actor_pet_id" "uuid", "p_target_id" "uuid", "p_action_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_lost_pet_alert"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_lost_pet_alert"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_lost_pet_alert"("p_pet_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rotate_pet_public_link"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_pet_public_link"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_pet_public_link"("p_pet_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_pet_sighting"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_pet_sighting"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_pet_sighting"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_pet_sighting"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."try_finalize_delete_pet_document"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."try_finalize_delete_pet_document"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_finalize_delete_pet_document"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."undo_care_completion"("p_completion_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."undo_care_completion"("p_completion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."undo_care_completion"("p_completion_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_pet_profile"("p_pet_id" "uuid", "p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_bio" "text", "p_breed" "text", "p_gender" "text", "p_zone" "text", "p_interests" "text"[], "p_weight" "text", "p_diet_plan" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_pet_profile"("p_pet_id" "uuid", "p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_bio" "text", "p_breed" "text", "p_gender" "text", "p_zone" "text", "p_interests" "text"[], "p_weight" "text", "p_diet_plan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pet_profile"("p_pet_id" "uuid", "p_name" "text", "p_species" "text", "p_age" "text", "p_photo_url" "text", "p_bio" "text", "p_breed" "text", "p_gender" "text", "p_zone" "text", "p_interests" "text"[], "p_weight" "text", "p_diet_plan" "text") TO "service_role";



REVOKE ALL ON FUNCTION "rescue_private"."activate_lost_pet_alert_internal"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "rescue_private"."activate_lost_pet_alert_internal"("p_pet_id" "uuid", "p_last_seen_location" "text", "p_last_seen_at" timestamp with time zone, "p_details" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "rescue_private"."get_pet_founder_status_internal"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "rescue_private"."get_pet_founder_status_internal"("p_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rescue_private"."get_pet_founder_status_internal"("p_pet_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"("p_token" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"("p_pet_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "rescue_private"."rotate_pet_public_link_internal"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "rescue_private"."rotate_pet_public_link_internal"("p_pet_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "rescue_private"."submit_pet_sighting_internal"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "rescue_private"."submit_pet_sighting_internal"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") TO "anon";
GRANT ALL ON FUNCTION "rescue_private"."submit_pet_sighting_internal"("p_token" "uuid", "p_reporter_name" "text", "p_reporter_phone" "text", "p_message" "text", "p_location" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "validation_private"."touch_validation_intent_updated_at"() FROM PUBLIC;


















GRANT ALL ON TABLE "public"."care_completions" TO "service_role";
GRANT SELECT ON TABLE "public"."care_completions" TO "authenticated";



GRANT ALL ON TABLE "public"."care_items" TO "service_role";
GRANT SELECT ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("pet_id") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("title"),UPDATE("title") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("category"),UPDATE("category") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("due_date"),UPDATE("due_date") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("due_time"),UPDATE("due_time") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("timezone"),UPDATE("timezone") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("recurrence"),UPDATE("recurrence") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("reminder_days_before"),UPDATE("reminder_days_before") ON TABLE "public"."care_items" TO "authenticated";



GRANT INSERT("notes"),UPDATE("notes") ON TABLE "public"."care_items" TO "authenticated";



GRANT ALL ON TABLE "public"."communities" TO "service_role";
GRANT SELECT ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("description"),UPDATE("description") ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("category"),UPDATE("category") ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("species"),UPDATE("species") ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("zone"),UPDATE("zone") ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("image_url"),UPDATE("image_url") ON TABLE "public"."communities" TO "authenticated";



GRANT UPDATE("image_storage_path") ON TABLE "public"."communities" TO "authenticated";



GRANT INSERT("rules"),UPDATE("rules") ON TABLE "public"."communities" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."communities" TO "authenticated";



GRANT ALL ON TABLE "public"."community_memberships" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."community_memberships" TO "authenticated";



GRANT INSERT("community_id") ON TABLE "public"."community_memberships" TO "authenticated";



GRANT INSERT("display_pet_id"),UPDATE("display_pet_id") ON TABLE "public"."community_memberships" TO "authenticated";



GRANT INSERT("role") ON TABLE "public"."community_memberships" TO "authenticated";



GRANT ALL ON TABLE "public"."community_post_comments" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."community_post_comments" TO "authenticated";



GRANT INSERT("post_id") ON TABLE "public"."community_post_comments" TO "authenticated";



GRANT INSERT("author_pet_id") ON TABLE "public"."community_post_comments" TO "authenticated";



GRANT INSERT("body") ON TABLE "public"."community_post_comments" TO "authenticated";



GRANT ALL ON TABLE "public"."community_post_likes" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."community_post_likes" TO "authenticated";



GRANT INSERT("post_id") ON TABLE "public"."community_post_likes" TO "authenticated";



GRANT INSERT("actor_pet_id") ON TABLE "public"."community_post_likes" TO "authenticated";



GRANT ALL ON TABLE "public"."community_posts" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."community_posts" TO "authenticated";



GRANT INSERT("community_id") ON TABLE "public"."community_posts" TO "authenticated";



GRANT INSERT("author_pet_id") ON TABLE "public"."community_posts" TO "authenticated";



GRANT INSERT("body") ON TABLE "public"."community_posts" TO "authenticated";



GRANT INSERT("photo_url") ON TABLE "public"."community_posts" TO "authenticated";



GRANT INSERT("photo_storage_path") ON TABLE "public"."community_posts" TO "authenticated";



GRANT ALL ON TABLE "public"."follows" TO "service_role";
GRANT SELECT ON TABLE "public"."follows" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."follows" TO "authenticated";



GRANT ALL ON TABLE "public"."interactions" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."interactions" TO "authenticated";



GRANT ALL ON TABLE "public"."lost_pet_alerts" TO "service_role";
GRANT SELECT ON TABLE "public"."lost_pet_alerts" TO "authenticated";



GRANT ALL ON TABLE "public"."module_validation_intents" TO "service_role";
GRANT SELECT ON TABLE "public"."module_validation_intents" TO "authenticated";



GRANT INSERT("module_key") ON TABLE "public"."module_validation_intents" TO "authenticated";



GRANT INSERT("intent_key"),UPDATE("intent_key") ON TABLE "public"."module_validation_intents" TO "authenticated";



GRANT INSERT("source"),UPDATE("source") ON TABLE "public"."module_validation_intents" TO "authenticated";



GRANT ALL ON TABLE "public"."module_validation_interests" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."module_validation_interests" TO "authenticated";



GRANT INSERT("module_key") ON TABLE "public"."module_validation_interests" TO "authenticated";



GRANT INSERT("source") ON TABLE "public"."module_validation_interests" TO "authenticated";



GRANT ALL ON TABLE "public"."module_validation_views" TO "service_role";
GRANT INSERT ON TABLE "public"."module_validation_views" TO "authenticated";



GRANT INSERT("module_key") ON TABLE "public"."module_validation_views" TO "authenticated";



GRANT INSERT("session_id") ON TABLE "public"."module_validation_views" TO "authenticated";



GRANT INSERT("source") ON TABLE "public"."module_validation_views" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";



GRANT UPDATE("read_at") ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_documents" TO "service_role";
GRANT SELECT ON TABLE "public"."pet_documents" TO "authenticated";



GRANT UPDATE("title") ON TABLE "public"."pet_documents" TO "authenticated";



GRANT UPDATE("category") ON TABLE "public"."pet_documents" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_place_checkins" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT SELECT("place_id"),INSERT("place_id") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT SELECT("pet_id"),INSERT("pet_id") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT SELECT("visible"),INSERT("visible"),UPDATE("visible") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT SELECT("checked_in_at") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT SELECT("expires_at") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT SELECT("ended_at"),UPDATE("ended_at") ON TABLE "public"."pet_place_checkins" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_place_presence" TO "service_role";



GRANT SELECT("place_id") ON TABLE "public"."pet_place_presence" TO "authenticated";



GRANT SELECT("visible_pet_id") ON TABLE "public"."pet_place_presence" TO "authenticated";



GRANT SELECT("expires_at") ON TABLE "public"."pet_place_presence" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_places" TO "service_role";
GRANT SELECT ON TABLE "public"."pet_places" TO "anon";
GRANT SELECT ON TABLE "public"."pet_places" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_private_details" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."pet_private_details" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_private_metrics" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."pet_private_metrics" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_public_links" TO "service_role";
GRANT SELECT ON TABLE "public"."pet_public_links" TO "authenticated";



GRANT ALL ON TABLE "public"."pet_sightings" TO "service_role";
GRANT SELECT ON TABLE "public"."pet_sightings" TO "authenticated";



GRANT ALL ON TABLE "public"."pets" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("id") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("owner_id"),INSERT("owner_id") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("name") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("name"),INSERT("name"),UPDATE("name") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("species") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("species"),INSERT("species"),UPDATE("species") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("age") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("age"),INSERT("age"),UPDATE("age") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("photo_url") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("photo_url"),INSERT("photo_url"),UPDATE("photo_url") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("bio") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("bio"),INSERT("bio"),UPDATE("bio") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("breed") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("breed"),INSERT("breed"),UPDATE("breed") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("gender") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("gender"),INSERT("gender"),UPDATE("gender") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("is_lost") ON TABLE "public"."pets" TO "anon";
GRANT SELECT("is_lost"),INSERT("is_lost"),UPDATE("is_lost") ON TABLE "public"."pets" TO "authenticated";



GRANT SELECT("last_seen_location"),INSERT("last_seen_location"),UPDATE("last_seen_location") ON TABLE "public"."pets" TO "authenticated";



GRANT ALL ON TABLE "public"."place_suggestions" TO "service_role";



GRANT INSERT("name") ON TABLE "public"."place_suggestions" TO "authenticated";



GRANT INSERT("category") ON TABLE "public"."place_suggestions" TO "authenticated";



GRANT INSERT("address") ON TABLE "public"."place_suggestions" TO "authenticated";



GRANT INSERT("zone") ON TABLE "public"."place_suggestions" TO "authenticated";



GRANT INSERT("note") ON TABLE "public"."place_suggestions" TO "authenticated";



GRANT ALL ON TABLE "public"."place_usage_events" TO "service_role";



GRANT INSERT("session_id") ON TABLE "public"."place_usage_events" TO "authenticated";



GRANT INSERT("event_type") ON TABLE "public"."place_usage_events" TO "authenticated";



GRANT INSERT("place_id") ON TABLE "public"."place_usage_events" TO "authenticated";



GRANT INSERT("category") ON TABLE "public"."place_usage_events" TO "authenticated";



GRANT ALL ON TABLE "public"."post_comments" TO "service_role";
GRANT SELECT ON TABLE "public"."post_comments" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_comments" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("username") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("username"),UPDATE("username") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("avatar_url"),UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("is_founder") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("is_founder") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("onboarding_completed") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."search_usage_events" TO "service_role";



GRANT INSERT("session_id") ON TABLE "public"."search_usage_events" TO "authenticated";



GRANT INSERT("event_type") ON TABLE "public"."search_usage_events" TO "authenticated";



GRANT INSERT("result_type") ON TABLE "public"."search_usage_events" TO "authenticated";



GRANT INSERT("filter_type") ON TABLE "public"."search_usage_events" TO "authenticated";



GRANT INSERT("had_results") ON TABLE "public"."search_usage_events" TO "authenticated";



GRANT ALL ON TABLE "validation_private"."intent_options" TO "service_role";



GRANT ALL ON TABLE "validation_private"."modules" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































