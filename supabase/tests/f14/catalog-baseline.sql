-- Exact catalog-derived schema fixture. No hosted rows. Not pg_dump.
-- Restores already-applied F14 history; NEVER use this as a hosted migration.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'Refusing fixture restore outside isolated PG17 laboratory'; END IF;
END $$;
SET check_function_bodies = false;
SET search_path = public;
CREATE ROLE "anon" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "authenticated" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "authenticator" WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "cli_login_postgres" WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "dashboard_user" WITH NOSUPERUSER INHERIT CREATEROLE CREATEDB NOLOGIN REPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "postgres" WITH NOSUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS CONNECTION LIMIT -1;
ALTER DATABASE f14_synthetic OWNER TO postgres;
CREATE ROLE "service_role" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION BYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_admin" WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_auth_admin" WITH NOSUPERUSER NOINHERIT CREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_etl_admin" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION BYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_privileged_role" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_read_only_user" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION BYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_realtime_admin" WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_replication_admin" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
CREATE ROLE "supabase_storage_admin" WITH NOSUPERUSER NOINHERIT CREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
GRANT "anon" TO "authenticator" WITH ADMIN false, INHERIT false, SET true;
GRANT "anon" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "anon" TO "supabase_realtime_admin" WITH ADMIN false, INHERIT false, SET true;
GRANT "authenticated" TO "authenticator" WITH ADMIN false, INHERIT false, SET true;
GRANT "authenticated" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "authenticated" TO "supabase_realtime_admin" WITH ADMIN false, INHERIT false, SET true;
GRANT "authenticator" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "authenticator" TO "supabase_storage_admin" WITH ADMIN false, INHERIT false, SET true;
GRANT "pg_create_subscription" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "pg_monitor" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "pg_monitor" TO "supabase_etl_admin" WITH ADMIN false, INHERIT true, SET true;
GRANT "pg_monitor" TO "supabase_read_only_user" WITH ADMIN false, INHERIT true, SET true;
GRANT "pg_read_all_data" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "pg_read_all_data" TO "supabase_etl_admin" WITH ADMIN false, INHERIT true, SET true;
GRANT "pg_read_all_data" TO "supabase_read_only_user" WITH ADMIN false, INHERIT true, SET true;
GRANT "pg_read_all_settings" TO "pg_monitor" WITH ADMIN false, INHERIT true, SET true;
GRANT "pg_read_all_stats" TO "pg_monitor" WITH ADMIN false, INHERIT true, SET true;
GRANT "pg_signal_backend" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "pg_stat_scan_tables" TO "pg_monitor" WITH ADMIN false, INHERIT true, SET true;
GRANT "postgres" TO "cli_login_postgres" WITH ADMIN false, INHERIT false, SET true;
GRANT "service_role" TO "authenticator" WITH ADMIN false, INHERIT false, SET true;
GRANT "service_role" TO "postgres" WITH ADMIN true, INHERIT true, SET true;
GRANT "service_role" TO "supabase_realtime_admin" WITH ADMIN false, INHERIT false, SET true;
GRANT "supabase_privileged_role" TO "postgres" WITH ADMIN false, INHERIT true, SET true;
GRANT "supabase_privileged_role" TO "supabase_etl_admin" WITH ADMIN false, INHERIT true, SET true;
CREATE SCHEMA extensions AUTHORIZATION postgres;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS "account_requests_private" AUTHORIZATION "postgres"; ALTER SCHEMA "account_requests_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "auth" AUTHORIZATION "supabase_admin"; ALTER SCHEMA "auth" OWNER TO "supabase_admin";
CREATE SCHEMA IF NOT EXISTS "care_private" AUTHORIZATION "postgres"; ALTER SCHEMA "care_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "community_private" AUTHORIZATION "postgres"; ALTER SCHEMA "community_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "document_private" AUTHORIZATION "postgres"; ALTER SCHEMA "document_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "moderation_private" AUTHORIZATION "postgres"; ALTER SCHEMA "moderation_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "place_private" AUTHORIZATION "postgres"; ALTER SCHEMA "place_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "private" AUTHORIZATION "postgres"; ALTER SCHEMA "private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "public" AUTHORIZATION "pg_database_owner"; ALTER SCHEMA "public" OWNER TO "pg_database_owner";
CREATE SCHEMA IF NOT EXISTS "rescue_private" AUTHORIZATION "postgres"; ALTER SCHEMA "rescue_private" OWNER TO "postgres";
CREATE SCHEMA IF NOT EXISTS "storage" AUTHORIZATION "supabase_admin"; ALTER SCHEMA "storage" OWNER TO "supabase_admin";
CREATE SCHEMA IF NOT EXISTS "validation_private" AUTHORIZATION "postgres"; ALTER SCHEMA "validation_private" OWNER TO "postgres";
CREATE TYPE "auth"."aal_level" AS ENUM ('aal1','aal2','aal3'); ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."code_challenge_method" AS ENUM ('s256','plain'); ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."factor_status" AS ENUM ('unverified','verified'); ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."factor_type" AS ENUM ('totp','webauthn','phone','recovery_code'); ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."oauth_authorization_status" AS ENUM ('pending','approved','denied','expired'); ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."oauth_client_type" AS ENUM ('public','confidential'); ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."oauth_registration_type" AS ENUM ('dynamic','manual'); ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."oauth_response_type" AS ENUM ('code'); ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";
CREATE TYPE "auth"."one_time_token_type" AS ENUM ('confirmation_token','reauthentication_token','recovery_token','email_change_token_new','email_change_token_current','phone_change_token'); ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";
CREATE TYPE "storage"."buckettype" AS ENUM ('STANDARD','ANALYTICS','VECTOR'); ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION public.activate_lost_pet_alert(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select rescue_private.activate_lost_pet_alert_internal(
    p_pet_id,
    p_last_seen_location,
    p_last_seen_at,
    p_details
  );
$function$
;
ALTER FUNCTION "public"."activate_lost_pet_alert"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.archive_care_item(p_care_item_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT care_private.archive_care_item_internal(p_care_item_id);
$function$
;
ALTER FUNCTION "public"."archive_care_item"(p_care_item_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.begin_delete_pet_document(p_document_id uuid)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT document_private.begin_delete_pet_document_internal(p_document_id);
$function$
;
ALTER FUNCTION "public"."begin_delete_pet_document"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.begin_pet_document_upload(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint)
 RETURNS TABLE(id uuid, storage_path text)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT * FROM document_private.begin_pet_document_upload_internal(
    p_pet_id,p_title,p_category,p_original_file_name,p_mime_type,p_size_bytes
  );
$function$
;
ALTER FUNCTION "public"."begin_pet_document_upload"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.cancel_delete_pet_document(p_document_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT document_private.cancel_delete_pet_document_internal(p_document_id);
$function$
;
ALTER FUNCTION "public"."cancel_delete_pet_document"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.cancel_pet_document_upload(p_document_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT document_private.cancel_pet_document_upload_internal(p_document_id);
$function$
;
ALTER FUNCTION "public"."cancel_pet_document_upload"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.complete_care_item(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone DEFAULT NULL::time without time zone)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT care_private.complete_care_item_internal(
    p_care_item_id,
    p_expected_due_date,
    p_expected_due_time
  );
$function$
;
ALTER FUNCTION "public"."complete_care_item"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.create_community(p_name text, p_description text, p_category text, p_species text, p_zone text, p_rules text, p_display_pet_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "public"."create_community"(p_name text, p_description text, p_category text, p_species text, p_zone text, p_rules text, p_display_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.create_pet_profile(p_name text, p_species text, p_age text, p_photo_url text, p_zone text DEFAULT NULL::text, p_interests text[] DEFAULT ARRAY[]::text[], p_bio text DEFAULT NULL::text, p_breed text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "public"."create_pet_profile"(p_name text, p_species text, p_age text, p_photo_url text, p_zone text, p_interests text[], p_bio text, p_breed text, p_gender text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_can_interact(p_target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND p_target IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.account_blocks b WHERE
     (b.blocker_user_id=auth.uid() AND b.blocked_user_id=p_target)
     OR (b.blocked_user_id=auth.uid() AND b.blocker_user_id=p_target)
 );
$function$
;
ALTER FUNCTION "public"."f14_can_interact"(p_target uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_confirm_media_cleanup(p_kind text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 RAISE EXCEPTION 'Legacy media cleanup confirmation disabled: exact-object verification required'
 USING ERRCODE='42501';
END;
$function$
;
ALTER FUNCTION "public"."f14_confirm_media_cleanup"(p_kind text, p_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_content_visible(p_kind text, p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT p_id IS NOT NULL AND NOT moderation_private.is_removed(p_kind,p_id);
$function$
;
ALTER FUNCTION "public"."f14_content_visible"(p_kind text, p_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_get_media_claim_evidence(p_claim uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;

  IF p_claim IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'status','candidate_only',
    'mayDelete',false,
    'reservation',jsonb_build_object(
      'claim_id',c.claim_id,'target_kind',c.target_kind,
      'target_id',c.target_id,'report_id',c.report_id,
      'bucket',c.bucket,'storage_object_id',c.storage_object_id,
      'status',c.status,'expires_at',c.expires_at,'snapshot',c.snapshot
    ),
    'restriction',jsonb_build_object(
      'target_kind',cr.target_kind,'target_id',cr.target_id,
      'report_id',cr.report_id,'media_status',cr.media_status
    ),
    'report',jsonb_build_object(
      'id',r.id,'target_kind',r.target_kind,
      'target_id',r.target_id,'status',r.status
    ),
    'storageObject',jsonb_build_object(
      'id',o.id,'bucket_id',o.bucket_id,'name',o.name,
      'version',o.version,'updated_at',o.updated_at,
      'metadata_fingerprint',md5(coalesce(o.metadata::text,'')),
      'is_delete_marker',o.is_delete_marker,'archived_at',o.archived_at
    ),
    'currentSourceSnapshot',live.snapshot,
    'references',jsonb_build_object(
      'url_reference_count',(
        SELECT count(*) FROM (
          SELECT p.photo_url AS url FROM public.posts p
          UNION ALL SELECT p.photo_url FROM public.pets p
          UNION ALL SELECT cp.photo_url FROM public.community_posts cp
          UNION ALL SELECT com.image_url FROM public.communities com
        ) ref
        WHERE ref.url LIKE ('%/storage/v1/object/public/' || c.bucket || '/' ||
          (c.snapshot->>'path') || '%')
      ),
      'community_path_count',(
        SELECT count(*) FROM public.community_posts cp
        WHERE cp.photo_storage_path=(c.snapshot->>'path')
      )
    ),
    'databaseNow',clock_timestamp()
  ) INTO v_result
  FROM moderation_private.media_claims c
  JOIN moderation_private.content_restrictions cr
    ON cr.target_kind=c.target_kind AND cr.target_id=c.target_id
    AND cr.report_id=c.report_id AND cr.media_status='pending_review'
  JOIN moderation_private.reports r
    ON r.id=c.report_id AND r.target_kind=c.target_kind
    AND r.target_id=c.target_id AND r.status='removed'
  JOIN storage.objects o
    ON o.id=c.storage_object_id AND o.bucket_id=c.bucket
    AND o.name=(c.snapshot->>'path') AND o.is_delete_marker IS FALSE
    AND o.archived_at IS NULL
  CROSS JOIN LATERAL (
    SELECT moderation_private.f14_media_probe(c.target_kind,c.target_id) AS snapshot
  ) live
  WHERE c.claim_id=p_claim AND c.status='held'
    AND c.target_kind IN ('feed_post','community_post')
    AND c.expires_at>clock_timestamp()
    AND live.snapshot IS NOT NULL
    AND live.snapshot=c.snapshot
    AND (c.snapshot->>'kind')=c.target_kind
    AND (c.snapshot->>'target_id')=c.target_id::text
    AND (c.snapshot->>'report_id')=c.report_id::text
    AND (c.snapshot->>'bucket')=c.bucket
    AND (c.snapshot->>'storage_object_id')=c.storage_object_id::text
  FOR SHARE OF c,cr,r,o;

  RETURN v_result;
END;
$function$
;
ALTER FUNCTION "public"."f14_get_media_claim_evidence"(p_claim uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_is_moderator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
   SELECT 1 FROM moderation_private.moderator_grants g WHERE g.user_id=auth.uid()
 );
$function$
;
ALTER FUNCTION "public"."f14_is_moderator"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_media_task(p_kind text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_url text; v_bucket text; v_path text;
v_owner uuid; v_pet uuid; v_community uuid;
BEGIN
 IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM moderation_private.content_restrictions
   WHERE target_kind=p_kind AND target_id=p_id AND media_status='pending_review') THEN
   RAISE EXCEPTION 'No pending media task' USING ERRCODE='22023';
 END IF;
 CASE p_kind
  WHEN 'feed_post' THEN
    SELECT photo_url,user_id,pet_id INTO v_url,v_owner,v_pet FROM public.posts WHERE id=p_id;
    v_bucket:='post-photos';
  WHEN 'pet_profile' THEN
    SELECT photo_url,owner_id INTO v_url,v_owner FROM public.pets WHERE id=p_id;
    v_bucket:='pet-avatars';
  WHEN 'community_post' THEN
    SELECT photo_storage_path,photo_url,author_user_id,community_id
    INTO v_path,v_url,v_owner,v_community FROM public.community_posts WHERE id=p_id;
    v_bucket:='community-post-photos';
  ELSE RAISE EXCEPTION 'No removable media for this target' USING ERRCODE='22023';
 END CASE;
 RETURN jsonb_build_object('bucket',v_bucket,'url',v_url,'path',v_path,
  'owner',v_owner,'pet',v_pet,'community',v_community);
END;
$function$
;
ALTER FUNCTION "public"."f14_media_task"(p_kind text, p_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_moderation_media_gate(p_kind text, p_target uuid, p_bucket text, p_path text, p_url text, p_stage text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_owner uuid; v_url text; v_path text; v_expected_bucket text;
 v_refs bigint; v_claim moderation_private.media_claims%ROWTYPE;
 v_live jsonb; v_count integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role'
 OR p_kind NOT IN ('feed_post','community_post') OR p_target IS NULL
 OR p_url IS NULL OR p_path IS NULL OR p_stage NOT IN ('preflight','complete')
 OR p_path !~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9._-]+)+$'
 OR pg_catalog.strpos(p_path,'..')>0 OR pg_catalog.length(p_path)>400
 THEN RETURN false; END IF;

 v_expected_bucket:=CASE p_kind WHEN 'feed_post' THEN 'post-photos'
                                    ELSE 'community-post-photos' END;
 IF p_bucket IS DISTINCT FROM v_expected_bucket THEN RETURN false; END IF;

 -- Locks protect the decision and final status; all operations against
 -- one target follow restriction -> media claim order.
 PERFORM 1 FROM moderation_private.content_restrictions r
 WHERE r.target_kind=p_kind AND r.target_id=p_target
   AND r.media_status='pending_review' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;

 IF p_kind='feed_post' THEN
   SELECT p.user_id,p.photo_url INTO v_owner,v_url
     FROM public.posts p WHERE p.id=p_target FOR SHARE;
 ELSE
   SELECT cp.author_user_id,cp.photo_url,cp.photo_storage_path
   INTO v_owner,v_url,v_path
   FROM public.community_posts cp WHERE cp.id=p_target FOR SHARE;
   IF v_path IS DISTINCT FROM p_path THEN RETURN false; END IF;
 END IF;
 IF v_owner IS NULL OR v_url IS DISTINCT FROM p_url OR NULLIF(pg_catalog.btrim(v_url),'') IS NULL
 THEN RETURN false; END IF;

 SELECT COALESCE(SUM(n),0) INTO v_refs FROM(
   SELECT COUNT(*)::bigint n FROM public.posts WHERE photo_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.posts WHERE pet_avatar=p_url
   UNION ALL SELECT COUNT(*) FROM public.community_posts WHERE photo_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.pets WHERE photo_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.communities WHERE image_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.profiles WHERE avatar_url=p_url
 ) refs;
 IF v_refs<>1 THEN RETURN false; END IF;
 IF p_kind='community_post' AND
  (SELECT COUNT(*) FROM public.community_posts WHERE photo_storage_path=p_path)<>1
 THEN RETURN false; END IF;

 SELECT * INTO v_claim FROM moderation_private.media_claims c
 WHERE c.target_kind=p_kind AND c.target_id=p_target FOR SHARE;
 IF NOT FOUND OR v_claim.status<>'held' OR v_claim.checked_at IS NULL
  OR v_claim.bucket IS DISTINCT FROM p_bucket
  OR v_claim.snapshot->>'path' IS DISTINCT FROM p_path
  OR v_claim.snapshot->>'source_url' IS DISTINCT FROM p_url
  OR v_claim.snapshot->>'owner_id' IS DISTINCT FROM v_owner::text
  OR v_claim.snapshot->>'target_id' IS DISTINCT FROM p_target::text
  OR v_claim.snapshot->>'storage_object_id' IS DISTINCT FROM v_claim.storage_object_id::text
 THEN RETURN false; END IF;

 PERFORM 1 FROM moderation_private.reports report
 WHERE report.id=v_claim.report_id AND report.status='removed'
   AND report.target_kind=p_kind AND report.target_id=p_target;
 IF NOT FOUND THEN RETURN false; END IF;

 IF p_stage='preflight' THEN
  IF v_claim.expires_at<=pg_catalog.clock_timestamp() THEN RETURN false; END IF;
  -- The existing probe checks live Storage UUID, version, owner, layout,
  -- original post/pet relationship and shared URL aliases.
  v_live:=moderation_private.f14_media_probe(p_kind,p_target);
  IF v_live IS NULL OR v_live IS DISTINCT FROM v_claim.snapshot THEN RETURN false; END IF;
  RETURN true;
 END IF;

 -- Finalization is a distinct request AFTER successful Storage API removal,
 -- exists=false and HEAD/GET checks in Edge. Permit late reconciliation if
 -- claim expiry elapsed during CDN verification (but never new deletion).
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE
   o.bucket_id=p_bucket AND o.name=p_path) THEN RETURN false; END IF;
 UPDATE moderation_private.content_restrictions
   SET media_status='purged'
 WHERE target_kind=p_kind AND target_id=p_target AND media_status='pending_review';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$function$
;
ALTER FUNCTION "public"."f14_moderation_media_gate"(p_kind text, p_target uuid, p_bucket text, p_path text, p_url text, p_stage text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_moderation_queue(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_items jsonb;
BEGIN
  IF NOT public.f14_is_moderator() THEN
    RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO v_items
  FROM (
    SELECT id,target_kind,target_id,reason,details,created_at
    FROM moderation_private.reports
    WHERE status='pending'
    ORDER BY created_at ASC,id ASC
    LIMIT least(greatest(coalesce(p_limit,20),1),30)
    OFFSET greatest(coalesce(p_offset,0),0)
  ) q;
  RETURN v_items;
END;
$function$
;
ALTER FUNCTION "public"."f14_moderation_queue"(p_limit integer, p_offset integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_my_blocked_accounts()
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT DISTINCT CASE WHEN b.blocker_user_id=auth.uid() THEN b.blocked_user_id ELSE b.blocker_user_id END
 FROM public.account_blocks b WHERE auth.uid() IS NOT NULL
 AND (b.blocker_user_id=auth.uid() OR b.blocked_user_id=auth.uid());
$function$
;
ALTER FUNCTION "public"."f14_my_blocked_accounts"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_pending_media(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_items jsonb;
BEGIN
 IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_items FROM (
   SELECT target_kind,target_id,applied_at FROM moderation_private.content_restrictions
   WHERE media_status='pending_review'
   ORDER BY applied_at ASC,target_id ASC
   LIMIT least(greatest(coalesce(p_limit,20),1),30)
 ) t;
 RETURN v_items;
END;
$function$
;
ALTER FUNCTION "public"."f14_pending_media"(p_limit integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_prepare_media_claim(p_kind text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_snapshot jsonb; v_existing moderation_private.media_claims%ROWTYPE;
v_claim uuid; v_expiry timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  IF p_kind NOT IN ('feed_post','community_post') OR p_id IS NULL
    THEN RAISE EXCEPTION 'manual review required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_kind||':'||p_id::text,0));
  -- Lock moderation restriction while taking the snapshot.
  PERFORM 1 FROM moderation_private.content_restrictions
  WHERE target_kind=p_kind AND target_id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no pending restriction' USING ERRCODE='22023'; END IF;
  v_snapshot:=moderation_private.f14_media_probe(p_kind,p_id);
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'manual review: source/object proof unavailable' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_existing FROM moderation_private.media_claims
    WHERE target_kind=p_kind AND target_id=p_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status='held' AND v_existing.expires_at>clock_timestamp()
      AND v_existing.snapshot=v_snapshot THEN
      RETURN jsonb_build_object('claim_id',v_existing.claim_id,
        'expires_at',v_existing.expires_at,'status','candidate_only');
    END IF;
    RAISE EXCEPTION 'stale or changed claim: manual reconciliation required'
      USING ERRCODE='22023';
  END IF;
  INSERT INTO moderation_private.media_claims
    (target_kind,target_id,report_id,bucket,storage_object_id,snapshot)
  VALUES (p_kind,p_id,(v_snapshot->>'report_id')::uuid,
    v_snapshot->>'bucket',(v_snapshot->>'storage_object_id')::uuid,v_snapshot)
  RETURNING claim_id,expires_at INTO v_claim,v_expiry;
  INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(v_claim,'created');
  RETURN jsonb_build_object('claim_id',v_claim,'expires_at',v_expiry,'status','candidate_only');
END;
$function$
;
ALTER FUNCTION "public"."f14_prepare_media_claim"(p_kind text, p_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_recheck_media_claim(p_claim uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_claim moderation_private.media_claims%ROWTYPE; v_now jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_claim FROM moderation_private.media_claims
    WHERE claim_id=p_claim FOR UPDATE;
  IF NOT FOUND OR v_claim.status<>'held' THEN RETURN false; END IF;
  IF v_claim.expires_at<=clock_timestamp() THEN
    RETURN false;
  END IF;
  v_now:=moderation_private.f14_media_probe(v_claim.target_kind,v_claim.target_id);
  IF v_now IS NULL OR v_now IS DISTINCT FROM v_claim.snapshot THEN
    RETURN false;
  END IF;
  UPDATE moderation_private.media_claims SET checked_at=now() WHERE claim_id=p_claim;
  INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(p_claim,'rechecked');
  RETURN true;
END;
$function$
;
ALTER FUNCTION "public"."f14_recheck_media_claim"(p_claim uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_review_report(p_report uuid, p_action text, p_note text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_record moderation_private.reports%ROWTYPE;
v_media text;
BEGIN
  IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('dismiss','remove') OR char_length(coalesce(p_note,''))>500 THEN
    RAISE EXCEPTION 'Invalid moderation action' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_record FROM moderation_private.reports WHERE id=p_report FOR UPDATE;
  IF NOT FOUND OR v_record.status<>'pending' THEN
    RAISE EXCEPTION 'Report is not pending' USING ERRCODE='22023';
  END IF;
  IF p_action='remove' THEN
    -- Conservative media classification: blank/null URLs do not need cleanup.
    -- Pet profiles stay pending: posts published by the pet may contain other
    -- media and a profile-only check would silently miss those objects.
    v_media := CASE v_record.target_kind
      WHEN 'feed_post' THEN CASE WHEN EXISTS (
        SELECT 1 FROM public.posts p WHERE p.id=v_record.target_id
          AND nullif(btrim(p.photo_url),'') IS NOT NULL
      ) THEN 'pending_review' ELSE 'none' END
      WHEN 'community_post' THEN CASE WHEN EXISTS (
        SELECT 1 FROM public.community_posts cp WHERE cp.id=v_record.target_id
          AND (nullif(btrim(cp.photo_url),'') IS NOT NULL
               OR nullif(btrim(cp.photo_storage_path),'') IS NOT NULL)
      ) THEN 'pending_review' ELSE 'none' END
      WHEN 'pet_profile' THEN 'pending_review'
      ELSE 'none'
    END;
    INSERT INTO moderation_private.content_restrictions
      (target_kind,target_id,report_id,applied_by,media_status)
    VALUES (v_record.target_kind,v_record.target_id,p_report,auth.uid(),v_media)
    ON CONFLICT(target_kind,target_id) DO NOTHING;
    -- Report the stored restriction status, even if a prior restriction
    -- won the unique constraint for this target.
    SELECT r.media_status INTO STRICT v_media
    FROM moderation_private.content_restrictions r
    WHERE r.target_kind=v_record.target_kind AND r.target_id=v_record.target_id;

    -- Historical PAZO comments are duplicated in posts.comments JSONB.
    -- Their canonical rows remain in post_comments for moderation evidence;
    -- remove ONLY the public JSON copy when a comment or its pet profile is withdrawn.
    IF v_record.target_kind IN ('feed_comment','pet_profile') THEN
      UPDATE public.posts p
      SET comments = (
        SELECT coalesce(jsonb_agg(item.elem ORDER BY item.ordinal),'[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.comments)='array' THEN p.comments ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS item(elem,ordinal)
        LEFT JOIN public.post_comments legacy
          ON legacy.legacy_id = item.elem ->> 'id'
        WHERE legacy.id IS NULL
          OR NOT (
            (v_record.target_kind='feed_comment' AND legacy.id=v_record.target_id)
            OR (v_record.target_kind='pet_profile' AND legacy.author_pet_id=v_record.target_id)
          )
      )
      WHERE jsonb_typeof(p.comments)='array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(p.comments) item
          JOIN public.post_comments legacy ON legacy.legacy_id = item ->> 'id'
          WHERE (v_record.target_kind='feed_comment' AND legacy.id=v_record.target_id)
             OR (v_record.target_kind='pet_profile' AND legacy.author_pet_id=v_record.target_id)
        );
    END IF;
  END IF;
  UPDATE moderation_private.reports
    SET status=CASE WHEN p_action='remove' THEN 'removed' ELSE 'dismissed' END,
        resolved_at=now(),resolved_by=auth.uid()
    WHERE id=p_report;
  INSERT INTO moderation_private.moderation_actions
    (report_id,moderator_user_id,action,note)
    VALUES(p_report,auth.uid(),p_action,btrim(coalesce(p_note,'')));
  RETURN CASE
    WHEN p_action='dismiss' THEN 'dismissed'
    WHEN v_media='pending_review' THEN 'depublished_pending_media_review'
    ELSE 'depublished_no_media_review'
  END;
END;
$function$
;
ALTER FUNCTION "public"."f14_review_report"(p_report uuid, p_action text, p_note text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_storage_media_path_unclaimed(p_bucket text, p_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT CASE
 WHEN p_bucket NOT IN ('post-photos','community-post-photos') THEN true
 WHEN p_path IS NULL OR p_path='' THEN false
 ELSE NOT EXISTS (
   SELECT 1
   FROM moderation_private.media_claims c
   WHERE c.bucket=p_bucket AND c.snapshot->>'path'=p_path
     AND c.status='held'
 )
 END;
$function$
;
ALTER FUNCTION "public"."f14_storage_media_path_unclaimed"(p_bucket text, p_path text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.f14_submit_report(p_kind text, p_target uuid, p_reason text, p_details text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
  v_details text := btrim(coalesce(p_details,''));
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  IF p_kind NOT IN ('feed_post','feed_comment','pet_profile','community_post','community_comment')
     OR p_target IS NULL
     OR p_reason NOT IN ('spam','harassment','unsafe','other')
     OR char_length(v_details)>500 THEN
    RAISE EXCEPTION 'Invalid report parameters' USING ERRCODE='22023';
  END IF;
  IF moderation_private.is_removed(p_kind,p_target) THEN
    RAISE EXCEPTION 'Content not available' USING ERRCODE='22023';
  END IF;
  CASE p_kind
    WHEN 'feed_post' THEN
      SELECT user_id INTO v_owner FROM public.posts WHERE id=p_target
      AND (pet_id IS NULL OR NOT moderation_private.is_removed('pet_profile',pet_id));
    WHEN 'feed_comment' THEN
      SELECT pet.owner_id INTO v_owner FROM public.post_comments pc
      JOIN public.pets pet ON pet.id=pc.author_pet_id
      JOIN public.posts post ON post.id=pc.post_id
      WHERE pc.id=p_target
       AND NOT moderation_private.is_removed('feed_post',post.id)
       AND NOT moderation_private.is_removed('pet_profile',pet.id);
    WHEN 'pet_profile' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=p_target;
    WHEN 'community_post' THEN
      SELECT cp.author_user_id INTO v_owner FROM public.community_posts cp
      JOIN public.communities c ON c.id=cp.community_id
      WHERE cp.id=p_target AND c.status='active'
        AND NOT moderation_private.is_removed('pet_profile',cp.author_pet_id);
    WHEN 'community_comment' THEN
      SELECT pet.owner_id INTO v_owner FROM public.community_post_comments cc
      JOIN public.community_posts cp ON cp.id=cc.post_id
      JOIN public.communities c ON c.id=cp.community_id
      JOIN public.pets pet ON pet.id=cc.author_pet_id
      WHERE cc.id=p_target AND c.status='active'
       AND NOT moderation_private.is_removed('community_post',cp.id)
       AND NOT moderation_private.is_removed('pet_profile',cc.author_pet_id);
  END CASE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Content not available' USING ERRCODE='22023'; END IF;
  -- Serialize attempts from the same reporter to make rate limiting consistent under concurrency.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text,20261008));
  IF (SELECT count(*) FROM moderation_private.reports r
      WHERE r.reporter_user_id=v_actor AND r.created_at>now()-interval '24 hours')>=5 THEN
    RAISE EXCEPTION 'Report limit reached' USING ERRCODE='22023';
  END IF;
  INSERT INTO moderation_private.reports
    (reporter_user_id,target_kind,target_id,target_owner_user_id,reason,details)
  VALUES(v_actor,p_kind,p_target,v_owner,p_reason,v_details)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Report already pending' USING ERRCODE='23505';
END;
$function$
;
ALTER FUNCTION "public"."f14_submit_report"(p_kind text, p_target uuid, p_reason text, p_details text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.finalize_delete_pet_document(p_document_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT document_private.finalize_delete_pet_document_internal(p_document_id);
$function$
;
ALTER FUNCTION "public"."finalize_delete_pet_document"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.finalize_pet_document_upload(p_document_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT document_private.finalize_pet_document_upload_internal(p_document_id);
$function$
;
ALTER FUNCTION "public"."finalize_pet_document_upload"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.get_pet_founder_status(p_pet_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select rescue_private.get_pet_founder_status_internal(p_pet_id);
$function$
;
ALTER FUNCTION "public"."get_pet_founder_status"(p_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.get_public_pet_rescue_profile(p_token uuid)
 RETURNS TABLE(name text, species text, breed text, photo_url text, bio text, is_lost boolean, last_seen_location text, alert_last_seen_at timestamp with time zone, alert_details text)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select *
  from rescue_private.get_public_pet_rescue_profile_internal(p_token);
$function$
;
ALTER FUNCTION "public"."get_public_pet_rescue_profile"(p_token uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, is_founder)
  VALUES (NEW.id, false)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_archive_owned_communities_for_deletion(p_subject_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_community record;v_archived integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=p_subject_user_id AND r.status='processing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Deletion request is not processing'; END IF;
 FOR v_community IN SELECT c.id FROM public.communities c
   WHERE c.owner_user_id=p_subject_user_id ORDER BY c.id FOR UPDATE
 LOOP
  IF EXISTS(SELECT 1 FROM community_private.ownership_transfer_offers o
   WHERE o.community_id=v_community.id AND o.owner_user_id=p_subject_user_id
   AND o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp())
  THEN RAISE EXCEPTION 'Community has pending transfer acceptance'; END IF;
  -- No community continuity path may conceal a later cascade of replies
  -- owned by another account on posts written by the departing account.
  IF EXISTS(SELECT 1 FROM public.community_post_comments cc
     JOIN public.community_posts cp ON cp.id=cc.post_id
     JOIN public.pets pet ON pet.id=cc.author_pet_id
     WHERE cp.community_id=v_community.id
       AND cp.author_user_id=p_subject_user_id
       AND pet.owner_id<>p_subject_user_id)
  THEN RAISE EXCEPTION 'Other users comments on departing owner posts require preservation'; END IF;
  UPDATE public.communities SET status='archived',owner_user_id=NULL
   WHERE id=v_community.id AND owner_user_id=p_subject_user_id;
  UPDATE public.community_memberships SET role='member'
   WHERE community_id=v_community.id AND user_id=p_subject_user_id AND role='owner';
  v_archived:=v_archived+1;
 END LOOP;
 RETURN v_archived;
END;
$function$
;
ALTER FUNCTION "public"."pazo_archive_owned_communities_for_deletion"(p_subject_user_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_community_accept_transfer(p_community_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid();v_owner uuid;v_offer community_private.ownership_transfer_offers%ROWTYPE;
BEGIN
 IF v_uid IS NULL THEN RETURN false; END IF;
 SELECT o.owner_user_id INTO v_owner
 FROM community_private.ownership_transfer_offers o
 WHERE o.community_id=p_community_id AND o.candidate_user_id=v_uid
 AND o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp();
 IF v_owner IS NULL THEN RETURN false; END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_owner AND r.status='requested'
 AND EXISTS(SELECT 1 FROM community_private.ownership_transfer_offers o
  WHERE o.community_id=p_community_id AND o.owner_user_id=v_owner
  AND o.status='pending' AND o.created_at>=r.requested_at)
 FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.communities c
 WHERE c.id=p_community_id AND c.owner_user_id=v_owner AND c.status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO v_offer FROM community_private.ownership_transfer_offers
 WHERE community_id=p_community_id FOR UPDATE;
 IF NOT FOUND OR v_offer.owner_user_id IS DISTINCT FROM v_owner
 OR v_offer.candidate_user_id IS DISTINCT FROM v_uid
 OR v_offer.status<>'pending' OR v_offer.expires_at<=pg_catalog.clock_timestamp()
 OR NOT EXISTS(SELECT 1 FROM public.community_memberships m
               WHERE m.community_id=p_community_id AND m.user_id=v_uid AND m.role='admin')
 THEN RETURN false; END IF;
 UPDATE public.community_memberships SET role='member'
 WHERE community_id=p_community_id AND user_id=v_owner AND role='owner';
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing existing owner membership'; END IF;
 UPDATE public.community_memberships SET role='owner'
 WHERE community_id=p_community_id AND user_id=v_uid AND role='admin';
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing eligible admin membership'; END IF;
 UPDATE public.communities SET owner_user_id=v_uid WHERE id=p_community_id AND owner_user_id=v_owner;
 IF NOT FOUND THEN RAISE EXCEPTION 'Community owner changed during transfer'; END IF;
 UPDATE community_private.ownership_transfer_offers
 SET status='accepted',accepted_at=pg_catalog.clock_timestamp()
 WHERE community_id=p_community_id;
 RETURN true;
END;
$function$
;
ALTER FUNCTION "public"."pazo_community_accept_transfer"(p_community_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_community_decline_transfer(p_community_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid();v_count integer;
BEGIN
 IF v_uid IS NULL THEN RETURN false; END IF;
 UPDATE community_private.ownership_transfer_offers o SET status='declined'
 WHERE o.community_id=p_community_id AND o.candidate_user_id=v_uid
 AND o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp();
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$function$
;
ALTER FUNCTION "public"."pazo_community_decline_transfer"(p_community_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_community_offer_transfer(p_community_id uuid, p_candidate_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid();v_old community_private.ownership_transfer_offers%ROWTYPE;
BEGIN
 IF v_uid IS NULL OR p_candidate_id IS NULL OR p_candidate_id=v_uid THEN RETURN false; END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid AND r.status='requested' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.communities c
 WHERE c.id=p_community_id AND c.owner_user_id=v_uid AND c.status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.community_memberships m
  WHERE m.community_id=p_community_id AND m.user_id=p_candidate_id AND m.role='admin')
 THEN RETURN false; END IF;
 SELECT * INTO v_old FROM community_private.ownership_transfer_offers
 WHERE community_id=p_community_id FOR UPDATE;
 IF FOUND AND v_old.status='pending' AND v_old.expires_at>pg_catalog.clock_timestamp()
 AND EXISTS(SELECT 1 FROM account_requests_private.deletion_requests r
  WHERE r.subject_user_id=v_uid AND r.status='requested'
  AND r.requested_at<=v_old.created_at)
 THEN RETURN false; END IF;
 INSERT INTO community_private.ownership_transfer_offers(
 community_id,owner_user_id,candidate_user_id,status,created_at,expires_at,accepted_at)
 VALUES(p_community_id,v_uid,p_candidate_id,'pending',pg_catalog.clock_timestamp(),
        pg_catalog.clock_timestamp()+interval '7 days',NULL)
 ON CONFLICT(community_id) DO UPDATE
 SET owner_user_id=EXCLUDED.owner_user_id,candidate_user_id=EXCLUDED.candidate_user_id,
 status='pending',created_at=EXCLUDED.created_at,expires_at=EXCLUDED.expires_at,accepted_at=NULL;
 RETURN true;
END;
$function$
;
ALTER FUNCTION "public"."pazo_community_offer_transfer"(p_community_id uuid, p_candidate_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_community_set_admin(p_community_id uuid, p_member_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid();v_count integer;
BEGIN
 IF v_uid IS NULL OR p_member_id IS NULL OR p_member_id=v_uid THEN RETURN false; END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid AND r.status='requested' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.communities c
 WHERE c.id=p_community_id AND c.owner_user_id=v_uid AND c.status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.community_memberships m SET role='admin'
 WHERE m.community_id=p_community_id AND m.user_id=p_member_id AND m.role='member'
 AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_member_id);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$function$
;
ALTER FUNCTION "public"."pazo_community_set_admin"(p_community_id uuid, p_member_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_community_transfer_offer(p_community_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid();v_result jsonb;
BEGIN
 IF v_uid IS NULL THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'status',o.status,'candidate_user_id',o.candidate_user_id,'expires_at',o.expires_at)
 INTO v_result FROM community_private.ownership_transfer_offers o
 WHERE o.community_id=p_community_id AND o.status='pending'
 AND o.expires_at>pg_catalog.clock_timestamp()
 AND (o.owner_user_id=v_uid OR o.candidate_user_id=v_uid)
 AND EXISTS(SELECT 1 FROM account_requests_private.deletion_requests r
  WHERE r.subject_user_id=o.owner_user_id AND r.status='requested'
    AND r.requested_at<=o.created_at);
 RETURN v_result;
END;
$function$
;
ALTER FUNCTION "public"."pazo_community_transfer_offer"(p_community_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_deletion_cancel()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_count integer;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_uid)
 THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 UPDATE account_requests_private.deletion_requests
 SET status='cancelled',updated_at=pg_catalog.clock_timestamp()
 WHERE subject_user_id=v_uid AND status='requested';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$function$
;
ALTER FUNCTION "public"."pazo_deletion_cancel"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_deletion_request()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_status text;
 v_requested_at timestamptz;
BEGIN
 IF v_uid IS NULL
    OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_uid)
 THEN
   RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
 END IF;
 INSERT INTO account_requests_private.deletion_requests(subject_user_id)
 VALUES(v_uid)
 ON CONFLICT(subject_user_id) DO UPDATE
   SET status='requested',requested_at=pg_catalog.clock_timestamp(),
       updated_at=pg_catalog.clock_timestamp(),processed_at=NULL
   WHERE account_requests_private.deletion_requests.status='cancelled';
 SELECT r.status,r.requested_at INTO v_status,v_requested_at
 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid;
 RETURN pg_catalog.jsonb_build_object('status',v_status,'requested_at',v_requested_at);
END;
$function$
;
ALTER FUNCTION "public"."pazo_deletion_request"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_deletion_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_result jsonb;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_uid)
 THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'status',r.status,'requested_at',r.requested_at
 ) INTO v_result FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid;
 RETURN v_result; -- SQL NULL for absent request; never expose another owner's row
END;
$function$
;
ALTER FUNCTION "public"."pazo_deletion_status"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.pazo_ensure_my_profile()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.profiles (id, is_founder, onboarding_completed)
  VALUES (v_user_id, false, false)
  ON CONFLICT (id) DO NOTHING;
END;
$function$
;
ALTER FUNCTION "public"."pazo_ensure_my_profile"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.register_interaction_signal(p_actor_pet_id uuid, p_target_id uuid, p_action_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "public"."register_interaction_signal"(p_actor_pet_id uuid, p_target_id uuid, p_action_type text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.resolve_lost_pet_alert(p_pet_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select rescue_private.resolve_lost_pet_alert_internal(p_pet_id);
$function$
;
ALTER FUNCTION "public"."resolve_lost_pet_alert"(p_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.rotate_pet_public_link(p_pet_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select rescue_private.rotate_pet_public_link_internal(p_pet_id);
$function$
;
ALTER FUNCTION "public"."rotate_pet_public_link"(p_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.submit_pet_sighting(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select rescue_private.submit_pet_sighting_internal(
    p_token,
    p_reporter_name,
    p_reporter_phone,
    p_message,
    p_location
  );
$function$
;
ALTER FUNCTION "public"."submit_pet_sighting"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.try_finalize_delete_pet_document(p_document_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select document_private.try_finalize_delete_pet_document_internal(p_document_id);
$function$
;
ALTER FUNCTION "public"."try_finalize_delete_pet_document"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.undo_care_completion(p_completion_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT care_private.undo_care_completion_internal(p_completion_id);
$function$
;
ALTER FUNCTION "public"."undo_care_completion"(p_completion_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.update_pet_profile(p_pet_id uuid, p_name text, p_species text, p_age text, p_photo_url text, p_bio text, p_breed text, p_gender text, p_zone text, p_interests text[], p_weight text, p_diet_plan text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "public"."update_pet_profile"(p_pet_id uuid, p_name text, p_species text, p_age text, p_photo_url text, p_bio text, p_breed text, p_gender text, p_zone text, p_interests text[], p_weight text, p_diet_plan text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION moderation_private.f14_media_probe(p_kind text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_url text; v_path text; v_bucket text; v_owner uuid; v_pet uuid; v_community uuid;
  v_report uuid; v_source_path text; v_object storage.objects%ROWTYPE;
  v_count integer; v_owner_ok boolean;
BEGIN
  IF p_kind NOT IN ('feed_post','community_post') OR p_id IS NULL THEN RETURN NULL; END IF;
  SELECT r.report_id INTO v_report
  FROM moderation_private.content_restrictions r
  JOIN moderation_private.reports rep ON rep.id=r.report_id
  WHERE r.target_kind=p_kind AND r.target_id=p_id
    AND r.media_status='pending_review' AND rep.status='removed'
    AND rep.target_kind=p_kind AND rep.target_id=p_id;
  IF v_report IS NULL THEN RETURN NULL; END IF;

  IF p_kind='feed_post' THEN
    SELECT p.photo_url,p.user_id,p.pet_id,
      (pet.id IS NOT NULL AND pet.owner_id=p.user_id)
    INTO v_url,v_owner,v_pet,v_owner_ok
    FROM public.posts p JOIN public.pets pet ON pet.id=p.pet_id
    WHERE p.id=p_id FOR SHARE OF p,pet;
    v_bucket:='post-photos';
    IF v_owner_ok IS DISTINCT FROM TRUE OR v_owner IS NULL OR v_pet IS NULL
      THEN RETURN NULL; END IF;
  ELSE
    SELECT cp.photo_url,cp.photo_storage_path,cp.author_user_id,cp.community_id,
      (community.id IS NOT NULL)
    INTO v_url,v_source_path,v_owner,v_community,v_owner_ok
    FROM public.community_posts cp JOIN public.communities community ON community.id=cp.community_id
    WHERE cp.id=p_id FOR SHARE OF cp,community;
    v_bucket:='community-post-photos';
    IF v_owner_ok IS DISTINCT FROM TRUE OR v_owner IS NULL OR v_community IS NULL
      THEN RETURN NULL; END IF;
  END IF;
  IF v_url IS NULL OR v_url !~ ('^https://mrybvqdebbgcayuvgkkr[.]supabase[.]co/storage/v1/object/public/' || v_bucket || '/[A-Za-z0-9_./-]+$')
    THEN RETURN NULL; END IF;
  v_path:=substring(v_url FROM ('^https://mrybvqdebbgcayuvgkkr[.]supabase[.]co/storage/v1/object/public/' || v_bucket || '/(.+)$'));
  IF v_path IS NULL OR length(v_path)>700 OR position('..' IN v_path)>0 OR position('//' IN v_path)>0 OR v_path LIKE '/%'
    THEN RETURN NULL; END IF;
  IF p_kind='community_post' THEN
    IF v_path IS DISTINCT FROM v_source_path
       OR v_path !~* ('^' || v_community::text || '/' || v_owner::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$')
       THEN RETURN NULL; END IF;
  ELSE
    IF NOT (
      v_path ~* ('^' || v_owner::text || '/' || v_pet::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$')
      OR v_path ~* ('^' || v_pet::text || '/[A-Za-z0-9_-]{1,100}[.](jpg|jpeg|png|webp)$')
    ) THEN RETURN NULL; END IF;
  END IF;

  -- Reject any shared or ambiguous reference, including URL query variants.
  SELECT count(*) INTO v_count FROM (
    SELECT photo_url AS url FROM public.posts
    UNION ALL SELECT photo_url FROM public.pets
    UNION ALL SELECT photo_url FROM public.community_posts
    UNION ALL SELECT image_url FROM public.communities
  ) all_urls
  WHERE url LIKE ('%/storage/v1/object/public/' || v_bucket || '/' || v_path || '%');
  IF v_count<>1 THEN RETURN NULL; END IF;
  IF p_kind='community_post' AND
    (SELECT count(*) FROM public.community_posts WHERE photo_storage_path=v_path)<>1
    THEN RETURN NULL; END IF;
  SELECT * INTO v_object FROM storage.objects o
  WHERE o.bucket_id=v_bucket AND o.name=v_path FOR SHARE;
  IF NOT FOUND OR v_object.id IS NULL OR nullif(btrim(v_object.version),'') IS NULL
    OR v_object.updated_at IS NULL OR v_object.is_delete_marker
    OR v_object.archived_at IS NOT NULL
    OR (v_object.owner_id IS NOT NULL AND v_object.owner_id<>v_owner::text)
    THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'kind',p_kind,'target_id',p_id,'report_id',v_report,
    'bucket',v_bucket,'path',v_path,'source_url',v_url,
    'owner_id',v_owner,'pet_id',v_pet,'community_id',v_community,
    'storage_object_id',v_object.id,'object_version',v_object.version,
    'object_updated_at',v_object.updated_at,
    'metadata_fingerprint',md5(coalesce(v_object.metadata::text,''))
  );
END;
$function$
;
ALTER FUNCTION "moderation_private"."f14_media_probe"(p_kind text, p_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION moderation_private.f14_reject_unverified_purged()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.media_status='purged' THEN
  IF TG_OP<>'UPDATE' THEN
   RAISE EXCEPTION 'Cannot insert purged media without verified cleanup' USING ERRCODE='23514';
  END IF;
  IF OLD.media_status IS DISTINCT FROM 'pending_review'
    OR OLD.target_kind IS DISTINCT FROM NEW.target_kind
    OR OLD.target_id IS DISTINCT FROM NEW.target_id
    OR auth.role() IS DISTINCT FROM 'service_role'
    OR NOT EXISTS(
      SELECT 1 FROM moderation_private.media_claims c
      JOIN moderation_private.reports r ON r.id=c.report_id
      WHERE c.target_kind=NEW.target_kind AND c.target_id=NEW.target_id
        AND c.report_id IS NOT DISTINCT FROM NEW.report_id
        AND c.status='held' AND c.checked_at IS NOT NULL
        AND r.status='removed' AND r.target_kind=c.target_kind
        AND r.target_id=c.target_id
        AND c.bucket IN ('post-photos','community-post-photos')
        AND c.snapshot->>'target_id'=c.target_id::text
        AND c.snapshot->>'storage_object_id'=c.storage_object_id::text
        AND NOT EXISTS (SELECT 1 FROM storage.objects o
          WHERE o.bucket_id=c.bucket AND o.name=c.snapshot->>'path')
    )
  THEN
   RAISE EXCEPTION 'F14 media cleanup lacks verified exact-object evidence' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$function$
;
ALTER FUNCTION "moderation_private"."f14_reject_unverified_purged"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION moderation_private.is_removed(p_kind text, p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM moderation_private.content_restrictions r
    WHERE r.target_kind=p_kind AND r.target_id=p_id
  );
$function$
;
ALTER FUNCTION "moderation_private"."is_removed"(p_kind text, p_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$
;
ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$
;
ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$
;
ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
;
ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";
CREATE OR REPLACE FUNCTION storage.allow_any_operation(expected_operations text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$function$
;
ALTER FUNCTION "storage"."allow_any_operation"(expected_operations text[]) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.allow_only_operation(expected_operation text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$function$
;
ALTER FUNCTION "storage"."allow_only_operation"(expected_operation text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$
;
ALTER FUNCTION "storage"."can_insert_object"(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.enforce_bucket_lifecycle_service_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF current_user::text IS DISTINCT FROM TG_ARGV[0]
     AND (
       OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
       OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation
     ) THEN
    -- AFTER runs only after caller RLS has accepted the proposed row. The API
    -- recognizes this specific error after rolling back its permission probe;
    -- direct non-service writes still fail and cannot persist the change.
    RAISE EXCEPTION 'bucket control columns may only be changed by the configured storage service role'
      USING ERRCODE = 'PST01',
            SCHEMA = TG_TABLE_SCHEMA,
            TABLE = TG_TABLE_NAME,
            CONSTRAINT = TG_NAME;
  END IF;

  RETURN NULL;
END;
$function$
;
ALTER FUNCTION "storage"."enforce_bucket_lifecycle_service_role"() OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$
;
ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$
;
ALTER FUNCTION "storage"."extension"(name text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$function$
;
ALTER FUNCTION "storage"."filename"(name text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$
;
ALTER FUNCTION "storage"."foldername"(name text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
SELECT CASE
    WHEN p_delimiter <> ''
         AND position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(
        p_key,
        length(p_prefix)
            + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1))
            + length(p_delimiter) - 1
    )
    ELSE NULL
END;
$function$
;
ALTER FUNCTION "storage"."get_common_prefix"(p_key text, p_prefix text, p_delimiter text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.get_size_by_bucket(noncurrent_versions text DEFAULT 'include'::text, delete_markers text DEFAULT 'include'::text)
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'include');
    delete_markers := COALESCE(delete_markers, 'include');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'include';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'include';
    END IF;

    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        where (noncurrent_versions != 'exclude' OR obj.archived_at IS NULL)
          and (noncurrent_versions != 'only' OR obj.archived_at IS NOT NULL)
          and (delete_markers != 'exclude' OR NOT obj.is_delete_marker)
          and (delete_markers != 'only' OR obj.is_delete_marker)
        group by obj.bucket_id;
END
$function$
;
ALTER FUNCTION "storage"."get_size_by_bucket"(noncurrent_versions text, delete_markers text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text, raw_prefix_param text DEFAULT NULL::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
WITH candidates AS (
    SELECT
        upload.key AS object_key,
        CASE
            WHEN position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0
            THEN left(
                upload.key,
                length(coalesce($7, $2))
                    + position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1))
                    + length($3) - 1
            )
            ELSE upload.key
        END AS result_key,
        upload.id,
        upload.created_at,
        position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0 AS is_common_prefix
    FROM storage.s3_multipart_uploads AS upload
    WHERE upload.bucket_id = $1
      AND upload.key COLLATE "C" LIKE $2 || '%'
), filtered AS (
    SELECT candidate.*
    FROM candidates AS candidate
    WHERE $5 = ''
       OR candidate.result_key COLLATE "C" > $5
       OR (
           candidate.result_key COLLATE "C" = $5
           AND NOT candidate.is_common_prefix
           AND $6 <> ''
           -- A completed or aborted marker repeats the remaining same-key uploads.
           AND COALESCE(
               (candidate.created_at, candidate.id COLLATE "C") > (
                   SELECT marker.created_at, marker.id COLLATE "C"
                   FROM storage.s3_multipart_uploads AS marker
                   WHERE marker.bucket_id = $1
                     AND marker.key COLLATE "C" = $5
                     AND marker.id = $6
               ),
               TRUE
           )
       )
), ranked AS (
    SELECT
        filtered.*,
        row_number() OVER (
            PARTITION BY filtered.result_key COLLATE "C"
            ORDER BY filtered.created_at, filtered.id COLLATE "C"
        ) AS prefix_rank
    FROM filtered
)
SELECT ranked.result_key, ranked.id, ranked.created_at
FROM ranked
WHERE NOT ranked.is_common_prefix OR ranked.prefix_rank = 1
ORDER BY ranked.result_key COLLATE "C", ranked.created_at, ranked.id COLLATE "C"
LIMIT $4;
$function$
;
ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text, raw_prefix_param text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, next_token_archived_at timestamp with time zone DEFAULT NULL::timestamp with time zone, next_token_version text DEFAULT ''::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_start_relative TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;

    -- true when noncurrent_versions can return >1 row per name; keeps them
    -- ordered most-recent-first and lets pagination resume mid-key
    v_multi_row BOOLEAN;
    v_name_order TEXT;
    v_exact_range_predicate TEXT;
    v_strict_range_predicate TEXT;
    v_inclusive_range_predicate TEXT;

    -- Seek state for the current name. archived_at is normalized to JavaScript's
    -- millisecond precision and version breaks ties within the same millisecond.
    -- Current rows use 'infinity'; NULL means no tiebreak has been established.
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_cursor_is_folder BOOLEAN;
    v_count INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_batch_query_strict TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');
    v_name_order := CASE WHEN v_is_asc THEN 'ASC' ELSE 'DESC' END;

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Keep caller-provided cursors inside the requested prefix range.
    IF v_start <> '' AND v_upper_bound IS NOT NULL THEN
        IF v_is_asc THEN
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                v_start := '';
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                RETURN;
            END IF;
        ELSE
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                RETURN;
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                v_start := '';
            END IF;
        END IF;
    END IF;

    v_start_relative := substring(v_start FROM length(v_prefix) + 1);

    -- Direction affects only the indexed name range and its ordering. Cursor
    -- state transitions and within-key version ordering stay shared.
    IF v_is_asc THEN
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" > $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" >= $2';
        IF v_upper_bound IS NOT NULL THEN
            v_exact_range_predicate := 'o.name COLLATE "C" < $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" < $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" < $3';
        END IF;
    ELSE
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" < $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" < $2';
        IF v_prefix <> '' THEN
            v_exact_range_predicate := 'o.name COLLATE "C" >= $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" >= $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" >= $3';
        END IF;
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    -- The multi-row order matches the externally serialized cursor exactly:
    -- archived_at at millisecond precision, then version as the final tiebreak.
    --
    -- When v_multi_row, the seek is a keyset tuple comparison ("name > $2 OR
    -- (name = $2 AND tiebreak)") - Postgres won't split that OR into indexable
    -- form (confirmed even with fully literal values), so as one WHERE clause
    -- it forces a full bucket scan filtered row-by-row. Splitting it into two
    -- independently-indexable branches (exact name match with the tiebreak
    -- filter, vs. strictly-past names) combined with UNION ALL lets each
    -- branch keep name as a real index condition; the outer ORDER BY/LIMIT
    -- re-merges them into the same page the single query used to produce.
    IF v_multi_row THEN
        v_batch_query := format(
            $sql$
            SELECT *
            FROM (
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND o.name COLLATE "C" = $2
                      AND %s
                      AND NOT $7::boolean
                      AND (
                          $5::timestamptz IS NULL
                          OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < $5
                          OR (
                              COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = $5
                              AND COALESCE(o.version, '') > $6
                          )
                      )
                      %s
                    ORDER BY
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
                UNION ALL
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND %s
                      %s
                    ORDER BY
                        o.name COLLATE "C" %s,
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
            ) sub
            ORDER BY
                sub.name COLLATE "C" %s,
                COALESCE(date_trunc('milliseconds', sub.archived_at), 'infinity'::timestamptz) DESC,
                COALESCE(sub.version, '') ASC
            LIMIT $4
            $sql$,
            v_exact_range_predicate,
            v_version_filter,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order,
            v_name_order
        );
    ELSE
        v_batch_query := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_inclusive_range_predicate,
            v_version_filter,
            v_name_order
        );

        -- Strict counterpart of the query above: used once the single-row
        -- ASC batch advance (below) has left v_next_seek pointing at the
        -- last row already emitted, so an inclusive predicate would
        -- re-match it forever. Only single-row mode ever sets strict mode,
        -- so this variant is never needed when v_multi_row.
        v_batch_query_strict := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order
        );
    END IF;

    -- The static peek predicates cannot use the partial delete-marker index
    -- once PL/pgSQL switches to a generic plan because whether
    -- is_delete_marker is required remains parameter-dependent. Reuse the
    -- already-specialized batch query with a one-row limit for this sparse
    -- filter so the plan sees a literal `o.is_delete_marker` predicate.
    IF delete_markers = 'only' THEN
        v_delete_marker_peek_query :=
            'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        IF NOT v_multi_row THEN
            v_delete_marker_peek_query_strict :=
                'SELECT marker_page.name FROM (' || v_batch_query_strict || ') marker_page LIMIT 1';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor performs one specialized initial seek so
            -- partial current-version and delete-marker indexes remain available.
            EXECUTE format(
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY o.name COLLATE "C" DESC LIMIT 1',
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND o.name COLLATE "C" >= $2 AND o.name COLLATE "C" < $3'
                    ELSE ''
                END,
                v_version_filter
            )
            INTO v_next_seek
            USING _bucket_id, v_prefix, v_upper_bound;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Folder continuation tokens retain their trailing delimiter. A
        -- delimiter-less startAfter is always a literal key boundary.
        v_cursor_is_folder := delimiter_param <> ''
            AND v_start_relative <> ''
            AND right(v_start_relative, length(delimiter_param)) = delimiter_param;

        IF v_cursor_is_folder THEN
            v_next_seek := CASE
                WHEN right(v_start, length(delimiter_param)) = delimiter_param
                    THEN v_start
                ELSE v_start || delimiter_param
            END;
            IF v_is_asc THEN
                v_next_seek := left(v_next_seek, -1)
                    || chr(ascii(right(v_next_seek, 1)) + 1);
            END IF;
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- leaf object: when v_multi_row, stay on v_start with the
            -- caller-supplied tiebreak so a page boundary mid-key resumes
            -- that key's remaining rows instead of skipping them. Truncate
            -- to milliseconds like every other v_next_seek_at assignment -
            -- harmless today since object.ts's cursor always round-trips
            -- through JS Date first, but this shouldn't rely on that.
            IF v_multi_row THEN
                v_next_seek := v_start;
                v_next_seek_at := date_trunc('milliseconds', next_token_archived_at);
                v_next_seek_version := coalesce(next_token_version, '');
                v_next_seek_strict := coalesce(next_token, '') = '';
            ELSIF v_is_asc THEN
                v_next_seek := v_start;
                v_next_seek_strict := true;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        -- v_multi_row is branched here (rather than folded into the WHERE
        -- clause as a bound parameter) so each concrete query keeps an
        -- unconditional seek predicate - once PL/pgSQL switches to its
        -- cached generic plan (after 5 calls), a parameter-gated
        -- "(NOT v_multi_row AND name >= $x) OR (v_multi_row AND ...)"
        -- predicate stops the planner from using name as an index
        -- condition at all, degrading every subsequent peek to a full
        -- index scan filtered row-by-row instead of a bounded range scan.
        -- v_multi_row's seek predicate is a keyset tuple comparison
        -- ("name > x OR (name = x AND tiebreak)") - Postgres does not
        -- split this OR into indexable form even with fully literal
        -- values, so it falls back to a full scan filtered row-by-row.
        -- Splitting it into two independently-indexable branches (exact
        -- name match with the tiebreak filter, vs. strictly-past name)
        -- combined with UNION ALL lets each branch keep name as a real
        -- index condition; the outer ORDER BY/LIMIT picks whichever of
        -- the (at most 2) rows sorts first.
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING _bucket_id, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END,
                    1, v_next_seek_at, v_next_seek_version, v_next_seek_strict;
        ELSIF v_multi_row THEN
            IF v_is_asc THEN
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" < v_upper_bound
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek AND o.name COLLATE "C" < v_upper_bound
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" >= v_prefix
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        ELSE
            -- Single-row mode is always noncurrent_versions='exclude'. Keep
            -- this predicate literal so generic plans use the current index.
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.name COLLATE "C" >= v_prefix
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := v_common_prefix;
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            version := NULL;
            archived_at := NULL;
            is_delete_marker := NULL;
            is_versioned := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1)
                    || chr(ascii(right(v_common_prefix, 1)) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row THEN v_batch_query_strict ELSE v_batch_query END
                USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size, v_next_seek_at, v_next_seek_version,
                v_next_seek_strict
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN v_current.name
                        ELSE v_current.name || delimiter_param
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                version := v_current.version;
                archived_at := v_current.archived_at;
                is_delete_marker := v_current.is_delete_marker;
                is_versioned := v_current.is_versioned;
                RETURN NEXT;
                v_count := v_count + 1;

                -- when v_multi_row, stay on this name and record its
                -- archived_at as the new tiebreak so remaining rows for the
                -- same key are picked up before moving to the next name
                IF v_multi_row THEN
                    v_next_seek := v_current.name;
                    v_next_seek_at := COALESCE(date_trunc('milliseconds', v_current.archived_at), 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                    v_next_seek_strict := false;
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor
                    -- would skip a real key like `name || '!'` (or any
                    -- character sorting below the delimiter), which sorts
                    -- between `name` and `name || delimiter`. Track the real
                    -- name and mark the next comparison strict instead.
                    v_next_seek := v_current.name;
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.list_objects_with_delimiter made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$function$
;
ALTER FUNCTION "storage"."list_objects_with_delimiter"(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text, noncurrent_versions text, delete_markers text, next_token_archived_at timestamp with time zone, next_token_version text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$
;
ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.protect_bucket_control_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  configuration_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_configuration IS NOT NULL
       OR NEW.lifecycle_configuration_generation IS NOT NULL THEN
      IF NOT pg_has_role(current_user, TG_ARGV[0], 'MEMBER') THEN
        RAISE EXCEPTION 'only members of the configured storage service role may insert lifecycle policy state'
          USING ERRCODE = '42501',
                HINT = format(
                  'Insert with both lifecycle columns NULL and configure lifecycle through the Storage API afterward, or insert as a member of %I.',
                  TG_ARGV[0]
                );
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  configuration_changed =
    OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
    OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation;

  IF NOT configuration_changed THEN
    RETURN NEW;
  END IF;

  IF NEW.type IS DISTINCT FROM 'STANDARD' THEN
    RAISE EXCEPTION 'bucket versioning and lifecycle controls require a Standard bucket'
      USING ERRCODE = '0A000';
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     AND NEW.lifecycle_configuration_generation IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     OR NEW.lifecycle_configuration_generation IS NULL
     OR OLD.lifecycle_configuration IS NOT DISTINCT FROM NEW.lifecycle_configuration
     OR OLD.lifecycle_configuration_generation IS NOT DISTINCT FROM NEW.lifecycle_configuration_generation THEN
    RAISE EXCEPTION 'a changed lifecycle policy requires a new non-null generation'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "storage"."protect_bucket_control_columns"() OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.protect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$
;
ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;
    v_multi_row BOOLEAN;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_count INT := 0;
    v_skipped INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;
    v_previous_skipped INT;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                  AND ($7 != 'exclude' OR objects.archived_at IS NULL)
                  AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
                  AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
                  AND ($8 != 'only' OR objects.is_delete_marker)
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata,
                   NULL::text AS version,
                   NULL::timestamptz AS archived_at,
                   NULL::boolean AS is_delete_marker,
                   NULL::boolean AS is_versioned FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata,
                   version, archived_at, is_delete_marker, is_versioned
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
               AND ($7 != 'exclude' OR objects.archived_at IS NULL)
               AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
               AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
               AND ($8 != 'only' OR objects.is_delete_marker)
             -- name, then version, as tiebreaks so two versions of the same
             -- key tying on the sort column still sort deterministically
             ORDER BY %I %s, name COLLATE "C" %s, COALESCE(version, '') %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order, v_sort_order, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets, noncurrent_versions, delete_markers;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build a resume-safe batch query. The exact-name branch returns remaining
    -- versions after the current (archived_at, version) boundary; the strict
    -- name branch returns subsequent keys. UNION ALL keeps both predicates
    -- independently indexable.
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2 AND lower(o.name) COLLATE "C" < $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 AND lower(o.name) COLLATE "C" >= $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    END IF;

    -- Keep the delete-marker predicate literal so the cached generic
    -- plan can use idx_objects_delete_markers during the main-loop peek.
    IF delete_markers = 'only' THEN
        IF v_multi_row THEN
            v_delete_marker_peek_query :=
                'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        ELSIF v_is_asc THEN
            -- Two separate literal query strings, not one gated by a bound
            -- boolean: folding "$n AND op1 OR NOT $n AND op2" into a single
            -- query defeats the generic plan's ability to push either
            -- comparison into the index. Branching in PL/pgSQL control flow
            -- instead keeps each query's index condition intact.
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" >= $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
            -- Strict variant: used once the single-row ASC batch advance
            -- (below) has left v_next_seek pointing at the last row already
            -- emitted, so a plain >= would re-match it forever.
            v_delete_marker_peek_query_strict :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" > $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
        ELSE
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" < $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" >= $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC performs one specialized initial seek so partial current-version
        -- and delete-marker indexes remain available.
        EXECUTE format(
            'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1',
            CASE WHEN v_upper_bound IS NOT NULL
                THEN ' AND lower(o.name) COLLATE "C" >= $2 AND lower(o.name) COLLATE "C" < $3'
                ELSE ''
            END,
            v_version_filter
        )
        INTO v_peek_name
        USING bucketname, v_prefix_lower, v_upper_bound;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch and
    -- the delete-marker-only path
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;
        v_previous_skipped := v_skipped;

        -- STEP 1: PEEK
        v_peek_name := NULL;
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END,
                    1, v_next_seek_at, v_next_seek_version;
        ELSIF v_multi_row AND v_next_seek_at IS NOT NULL THEN
            SELECT o.name INTO v_peek_name
            FROM storage.objects o
            WHERE o.bucket_id = bucketname
              AND lower(o.name) COLLATE "C" = v_next_seek
              AND (COALESCE(o.archived_at, 'infinity'::timestamptz) < v_next_seek_at
                   OR (COALESCE(o.archived_at, 'infinity'::timestamptz) = v_next_seek_at
                       AND COALESCE(o.version, '') > v_next_seek_version))
              AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
              AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
              AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
              AND (delete_markers != 'only' OR o.is_delete_marker)
            ORDER BY COALESCE(o.archived_at, 'infinity'::timestamptz) DESC,
                     COALESCE(o.version, '') ASC
            LIMIT 1;

            -- The current key is exhausted. Clear its version boundary and
            -- make the following ASC name peek strict. Appending '/' is not a
            -- valid lexical successor because keys ending in characters such
            -- as '!' sort between the exhausted name and name || '/'.
            IF v_peek_name IS NULL THEN
                IF v_is_asc THEN
                    v_next_seek_strict := true;
                END IF;
                v_next_seek_at := NULL;
                v_next_seek_version := '';
            END IF;
        END IF;

        -- Single-row mode is always noncurrent_versions='exclude'. Keep the
        -- current-row predicate literal so generic plans use the current index.
        IF delete_markers != 'only' AND v_peek_name IS NULL AND NOT v_multi_row THEN
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL AND v_is_asc THEN
            IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_next_seek_strict THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- If the peek landed on a different key than we were tracking, any
        -- version boundary belongs to the OLD key and must not leak into the
        -- new one - e.g. the deleteMarkers='only' peek doesn't know or care
        -- whether it's continuing the same key or jumping to a new one, so
        -- it never clears these itself.
        IF lower(v_peek_name) IS DISTINCT FROM v_next_seek THEN
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        END IF;

        -- The peek is authoritative for the next key to process. This is
        -- especially important after exhausting a multi-version key: the
        -- version boundary has been cleared, so executing the batch against
        -- a stale v_next_seek would replay every version of that old key.
        v_next_seek := lower(v_peek_name);
        v_next_seek_strict := false;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                version := NULL;
                archived_at := NULL;
                is_delete_marker := NULL;
                is_versioned := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size,
                    v_next_seek_at, v_next_seek_version
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too - it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN lower(v_current.name)
                        ELSE lower(v_current.name) || v_delimiter
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    version := v_current.version;
                    archived_at := v_current.archived_at;
                    is_delete_marker := v_current.is_delete_marker;
                    is_versioned := v_current.is_versioned;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Multi-row mode must remain on this key until all of its
                -- versions have crossed the internal batch boundary.
                IF v_multi_row THEN
                    v_next_seek := lower(v_current.name);
                    v_next_seek_at := COALESCE(v_current.archived_at, 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor would
                    -- skip a real key like `name || '!'` (or any character
                    -- sorting below the delimiter), which sorts between `name`
                    -- and `name || delimiter`. Track the real name and mark the
                    -- next comparison strict instead - same fix as the
                    -- exhausted-key case above.
                    v_next_seek := lower(v_current.name);
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_skipped = v_previous_skipped
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.search made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$function$
;
ALTER FUNCTION "storage"."search"(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text, noncurrent_versions text, delete_markers text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, p_start_after_version text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_prefix_pattern text;
    v_sort_order text;
    v_sort_column text;
    v_version_tiebreak text;
BEGIN
    v_prefix := coalesce(p_prefix, '');
    -- Keep the raw prefix for common-prefix calculations and escape only LIKE metacharacters.
    v_prefix_pattern := replace(v_prefix, chr(92), chr(92) || chr(92));
    v_prefix_pattern := replace(v_prefix_pattern, '%', chr(92) || '%');
    v_prefix_pattern := replace(v_prefix_pattern, '_', chr(92) || '_');

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    -- $9 is only populated in multi-row mode; it's always '' otherwise, so
    -- only use each row's real version as a tiebreak in multi-row mode.
    v_version_tiebreak := CASE WHEN noncurrent_versions IN ('only', 'include') THEN 'COALESCE(version, '''')' ELSE '''''' END;

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                o.version AS obj_version,
                o.archived_at AS obj_archived_at,
                o.is_delete_marker AS obj_is_delete_marker,
                o.is_versioned AS obj_is_versioned,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $10 || '%%'
              AND ($7 != 'exclude' OR o.archived_at IS NULL)
              AND ($7 != 'only' OR o.archived_at IS NOT NULL)
              AND ($8 != 'exclude' OR NOT o.is_delete_marker)
              AND ($8 != 'only' OR o.is_delete_marker)
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                common_prefix AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                NULL::text AS version,
                NULL::timestamptz AS archived_at,
                NULL::boolean AS is_delete_marker,
                NULL::boolean AS is_versioned,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                obj_version AS version,
                obj_archived_at AS archived_at,
                obj_is_delete_marker AS is_delete_marker,
                obj_is_versioned AS is_versioned,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz),
                    name COLLATE "C",
                    %s
                ) %s ROW(
                    -- truncated the same way as the stored value above
                    date_trunc('milliseconds', COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz)),
                    $5,
                    $9
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata,
            version,
            archived_at,
            is_delete_marker,
            is_versioned
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s,
            COALESCE(version, '') %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_version_tiebreak,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order,
        v_sort_order
    );

    -- version is the third tiebreak component for two versions of the same
    -- key tying on both timestamp and name (see filtered CTE / ORDER BY above)
    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after, noncurrent_versions, delete_markers, coalesce(p_start_after_version, ''), v_prefix_pattern;
END;
$function$
;
ALTER FUNCTION "storage"."search_by_timestamp"(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text, delete_markers text, p_start_after_version text) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, start_after_archived_at timestamp with time zone DEFAULT NULL::timestamp with time zone, start_after_version text DEFAULT ''::text, start_after_is_continuation boolean DEFAULT false)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata,
            l.version,
            l.archived_at,
            l.is_delete_marker,
            l.is_versioned
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            CASE WHEN start_after_is_continuation THEN '' ELSE start_after END,
            CASE WHEN start_after_is_continuation THEN start_after ELSE '' END,
            v_sort_ord,
            noncurrent_versions,
            delete_markers,
            start_after_archived_at,
            start_after_version
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after,
            noncurrent_versions, delete_markers, start_after_version
        );
    END IF;
END;
$function$
;
ALTER FUNCTION "storage"."search_v2"(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text, noncurrent_versions text, delete_markers text, start_after_archived_at timestamp with time zone, start_after_version text, start_after_is_continuation boolean) OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$
;
ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";
CREATE OR REPLACE FUNCTION private.adjust_pet_learning_tags(p_pet_id uuid, p_tags text[], p_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."adjust_pet_learning_tags"(p_pet_id uuid, p_tags text[], p_delta integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.enforce_social_write_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."enforce_social_write_rate_limit"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.ensure_pet_public_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.pet_public_links (pet_id)
  VALUES (NEW.id)
  ON CONFLICT (pet_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "private"."ensure_pet_public_link"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.f14_block_after()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 DELETE FROM public.follows f USING public.pets p1,public.pets p2
 WHERE f.follower_id=p1.id AND f.following_id=p2.id AND
 ((p1.owner_id=NEW.blocker_user_id AND p2.owner_id=NEW.blocked_user_id)
  OR (p1.owner_id=NEW.blocked_user_id AND p2.owner_id=NEW.blocker_user_id));
 RETURN NEW;
END;
$function$
;
ALTER FUNCTION "private"."f14_block_after"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.f14_block_before()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.blocker_user_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Invalid block actor' USING ERRCODE='42501';
 END IF;
 PERFORM private.f14_pair_lock(NEW.blocker_user_id,NEW.blocked_user_id);
 RETURN NEW;
END;
$function$
;
ALTER FUNCTION "private"."f14_block_before"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.f14_guard_social_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor uuid; target uuid; community_owner uuid;
BEGIN
 IF TG_TABLE_NAME='follows' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.follower_id;
   SELECT owner_id INTO target FROM public.pets WHERE id=NEW.following_id;
 ELSIF TG_TABLE_NAME='interactions' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.actor_pet_id;
   IF NEW.target_type='post' THEN SELECT user_id INTO target FROM public.posts WHERE id=NEW.target_id; END IF;
 ELSIF TG_TABLE_NAME='post_comments' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.author_pet_id;
   SELECT user_id INTO target FROM public.posts WHERE id=NEW.post_id;
 ELSIF TG_TABLE_NAME='community_memberships' THEN
   actor:=NEW.user_id;
   SELECT owner_user_id INTO target FROM public.communities WHERE id=NEW.community_id;
 ELSIF TG_TABLE_NAME='community_posts' THEN
   actor:=NEW.author_user_id;
   SELECT owner_user_id INTO target FROM public.communities WHERE id=NEW.community_id;
 ELSIF TG_TABLE_NAME='community_post_comments' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.author_pet_id;
   SELECT p.author_user_id,c.owner_user_id INTO target,community_owner
   FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id WHERE p.id=NEW.post_id;
 ELSIF TG_TABLE_NAME='community_post_likes' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.actor_pet_id;
   SELECT p.author_user_id,c.owner_user_id INTO target,community_owner
   FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id WHERE p.id=NEW.post_id;
 END IF;
 IF actor IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Invalid social actor' USING ERRCODE='42501';
 END IF;
 IF target IS NOT NULL THEN
   PERFORM private.f14_pair_lock(actor,target);
   IF EXISTS(SELECT 1 FROM public.account_blocks b WHERE
     (b.blocker_user_id=actor AND b.blocked_user_id=target)
     OR (b.blocked_user_id=actor AND b.blocker_user_id=target)) THEN
     RAISE EXCEPTION 'Social interaction blocked' USING ERRCODE='42501';
   END IF;
 END IF;
 IF community_owner IS NOT NULL AND community_owner<>target THEN
   PERFORM private.f14_pair_lock(actor,community_owner);
   IF EXISTS(SELECT 1 FROM public.account_blocks b WHERE
     (b.blocker_user_id=actor AND b.blocked_user_id=community_owner)
     OR (b.blocked_user_id=actor AND b.blocker_user_id=community_owner)) THEN
     RAISE EXCEPTION 'Community interaction blocked' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$function$
;
ALTER FUNCTION "private"."f14_guard_social_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.f14_pair_lock(a uuid, b uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF a IS NULL OR b IS NULL THEN RETURN; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   LEAST(a::text,b::text)||':'||GREATEST(a::text,b::text), 0));
END;
$function$
;
ALTER FUNCTION "private"."f14_pair_lock"(a uuid, b uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.guard_comment_interaction_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.action_type = 'comment' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Comment interactions must originate from post_comments.';
  END IF;

  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "private"."guard_comment_interaction_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.normalize_post_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."normalize_post_before_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.normalize_post_comment_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.body := btrim(NEW.body);

  IF NEW.body = '' OR char_length(NEW.body) > 1000 THEN
    RAISE EXCEPTION 'Comentario inválido.';
  END IF;

  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "private"."normalize_post_comment_before_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.normalize_post_interaction_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."normalize_post_interaction_before_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.prepare_care_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
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
$function$
;
ALTER FUNCTION "private"."prepare_care_item"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.process_post_comment_side_effects()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."process_post_comment_side_effects"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.process_reversible_interaction_side_effects()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."process_reversible_interaction_side_effects"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.sync_pet_public_profile_to_posts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."sync_pet_public_profile_to_posts"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION private.validate_follow_relationship()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "private"."validate_follow_relationship"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION care_private.archive_care_item_internal(p_care_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
$function$
;
ALTER FUNCTION "care_private"."archive_care_item_internal"(p_care_item_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION care_private.complete_care_item_internal(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone DEFAULT NULL::time without time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
$function$
;
ALTER FUNCTION "care_private"."complete_care_item_internal"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION care_private.undo_care_completion_internal(p_completion_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
$function$
;
ALTER FUNCTION "care_private"."undo_care_completion_internal"(p_completion_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION validation_private.touch_validation_intent_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "validation_private"."touch_validation_intent_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION community_private.adjust_community_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "community_private"."adjust_community_comment_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION community_private.adjust_community_like_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "community_private"."adjust_community_like_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION community_private.adjust_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "community_private"."adjust_member_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION community_private.ensure_owner_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.owner_user_id IS NULL THEN
  IF NEW.status<>'archived' THEN
    RAISE EXCEPTION 'An active community must have an owner';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_memberships m
             WHERE m.community_id=NEW.id AND m.role='owner') THEN
    RAISE EXCEPTION 'An archived ownerless community cannot have an owner member';
  END IF;
  RETURN NEW;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.community_memberships m
   WHERE m.community_id=NEW.id AND m.user_id=NEW.owner_user_id AND m.role='owner')
 THEN RAISE EXCEPTION 'Community owner membership is required'; END IF;
 RETURN NEW;
END;
$function$
;
ALTER FUNCTION "community_private"."ensure_owner_membership"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION community_private.normalize_community_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "community_private"."normalize_community_row"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION place_private.normalize_checkin_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    NEW.ended_at := now();
  END IF;

  IF OLD.ended_at IS NOT NULL THEN
    NEW.ended_at := OLD.ended_at;
  END IF;

  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "place_private"."normalize_checkin_update"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION place_private.normalize_place_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "place_private"."normalize_place_row"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION place_private.normalize_place_suggestion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "place_private"."normalize_place_suggestion"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION place_private.prepare_checkin_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "place_private"."prepare_checkin_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION place_private.sync_place_presence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "place_private"."sync_place_presence"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.begin_delete_pet_document_internal(p_document_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."begin_delete_pet_document_internal"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.begin_pet_document_upload_internal(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint)
 RETURNS TABLE(id uuid, storage_path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."begin_pet_document_upload_internal"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.cancel_delete_pet_document_internal(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."cancel_delete_pet_document_internal"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.cancel_pet_document_upload_internal(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."cancel_pet_document_upload_internal"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.finalize_delete_pet_document_internal(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."finalize_delete_pet_document_internal"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.finalize_pet_document_upload_internal(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."finalize_pet_document_upload_internal"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.prepare_pet_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.original_file_name := btrim(NEW.original_file_name);
  NEW.storage_path := btrim(NEW.storage_path);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;
ALTER FUNCTION "document_private"."prepare_pet_document"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION document_private.try_finalize_delete_pet_document_internal(p_document_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "document_private"."try_finalize_delete_pet_document_internal"(p_document_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION rescue_private.activate_lost_pet_alert_internal(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "rescue_private"."activate_lost_pet_alert_internal"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION rescue_private.get_pet_founder_status_internal(p_pet_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select pr.is_founder
    from public.pets p
    join public.profiles pr on pr.id = p.owner_id
    where p.id = p_pet_id
    limit 1
  ), false);
$function$
;
ALTER FUNCTION "rescue_private"."get_pet_founder_status_internal"(p_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION rescue_private.get_public_pet_rescue_profile_internal(p_token uuid)
 RETURNS TABLE(name text, species text, breed text, photo_url text, bio text, is_lost boolean, last_seen_location text, alert_last_seen_at timestamp with time zone, alert_details text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"(p_token uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION rescue_private.resolve_lost_pet_alert_internal(p_pet_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"(p_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION rescue_private.rotate_pet_public_link_internal(p_pet_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "rescue_private"."rotate_pet_public_link_internal"(p_pet_id uuid) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION rescue_private.submit_pet_sighting_internal(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "rescue_private"."submit_pet_sighting_internal"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) OWNER TO "postgres";
CREATE SEQUENCE "auth"."refresh_tokens_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE; ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";
CREATE TABLE "account_requests_private"."deletion_requests" (
  "subject_user_id" uuid NOT NULL,
  "status" text COLLATE "default" DEFAULT 'requested'::text NOT NULL,
  "requested_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "processed_at" timestamp with time zone
); ALTER TABLE "account_requests_private"."deletion_requests" OWNER TO "postgres";
CREATE TABLE "auth"."audit_log_entries" (
  "instance_id" uuid,
  "id" uuid NOT NULL,
  "payload" json,
  "created_at" timestamp with time zone,
  "ip_address" character varying(64) COLLATE "default" DEFAULT ''::character varying NOT NULL
); ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."custom_oauth_providers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_type" text COLLATE "default" NOT NULL,
  "identifier" text COLLATE "default" NOT NULL,
  "name" text COLLATE "default" NOT NULL,
  "client_id" text COLLATE "default" NOT NULL,
  "client_secret" text COLLATE "default" NOT NULL,
  "acceptable_client_ids" text[] COLLATE "default" DEFAULT '{}'::text[] NOT NULL,
  "scopes" text[] COLLATE "default" DEFAULT '{}'::text[] NOT NULL,
  "pkce_enabled" boolean DEFAULT true NOT NULL,
  "attribute_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "authorization_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "email_optional" boolean DEFAULT false NOT NULL,
  "issuer" text COLLATE "default",
  "discovery_url" text COLLATE "default",
  "skip_nonce_check" boolean DEFAULT false NOT NULL,
  "cached_discovery" jsonb,
  "discovery_cached_at" timestamp with time zone,
  "authorization_url" text COLLATE "default",
  "token_url" text COLLATE "default",
  "userinfo_url" text COLLATE "default",
  "jwks_uri" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "custom_claims_allowlist" text[] COLLATE "default" DEFAULT '{}'::text[] NOT NULL
); ALTER TABLE "auth"."custom_oauth_providers" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."flow_state" (
  "id" uuid NOT NULL,
  "user_id" uuid,
  "auth_code" text COLLATE "default",
  "code_challenge_method" auth.code_challenge_method,
  "code_challenge" text COLLATE "default",
  "provider_type" text COLLATE "default" NOT NULL,
  "provider_access_token" text COLLATE "default",
  "provider_refresh_token" text COLLATE "default",
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "authentication_method" text COLLATE "default" NOT NULL,
  "auth_code_issued_at" timestamp with time zone,
  "invite_token" text COLLATE "default",
  "referrer" text COLLATE "default",
  "oauth_client_state_id" uuid,
  "linking_target_id" uuid,
  "email_optional" boolean DEFAULT false NOT NULL
); ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."identities" (
  "provider_id" text COLLATE "default" NOT NULL,
  "user_id" uuid NOT NULL,
  "identity_data" jsonb NOT NULL,
  "provider" text COLLATE "default" NOT NULL,
  "last_sign_in_at" timestamp with time zone,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "email" text COLLATE "default" GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL
); ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."instances" (
  "id" uuid NOT NULL,
  "uuid" uuid,
  "raw_base_config" text COLLATE "default",
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone
); ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."mfa_amr_claims" (
  "session_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "authentication_method" text COLLATE "default" NOT NULL,
  "id" uuid NOT NULL
); ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."mfa_challenges" (
  "id" uuid NOT NULL,
  "factor_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone,
  "ip_address" inet NOT NULL,
  "otp_code" text COLLATE "default",
  "web_authn_session_data" jsonb
); ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."mfa_factors" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "friendly_name" text COLLATE "default",
  "factor_type" auth.factor_type NOT NULL,
  "status" auth.factor_status NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "secret" text COLLATE "default",
  "phone" text COLLATE "default",
  "last_challenged_at" timestamp with time zone,
  "web_authn_credential" jsonb,
  "web_authn_aaguid" uuid,
  "last_webauthn_challenge_data" jsonb
); ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."mfa_recovery_code_sets" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "mfa_factor_id" uuid NOT NULL,
  "failed_verification_count" integer DEFAULT 0 NOT NULL,
  "verification_locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "auth"."mfa_recovery_code_sets" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."mfa_recovery_codes" (
  "id" uuid NOT NULL,
  "mfa_recovery_code_set_id" uuid NOT NULL,
  "code_hash" text COLLATE "default" NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "auth"."mfa_recovery_codes" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."oauth_authorizations" (
  "id" uuid NOT NULL,
  "authorization_id" text COLLATE "default" NOT NULL,
  "client_id" uuid NOT NULL,
  "user_id" uuid,
  "redirect_uri" text COLLATE "default" NOT NULL,
  "scope" text COLLATE "default" NOT NULL,
  "state" text COLLATE "default",
  "resource" text COLLATE "default",
  "code_challenge" text COLLATE "default",
  "code_challenge_method" auth.code_challenge_method,
  "response_type" auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
  "status" auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
  "authorization_code" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
  "approved_at" timestamp with time zone,
  "nonce" text COLLATE "default"
); ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."oauth_client_states" (
  "id" uuid NOT NULL,
  "provider_type" text COLLATE "default" NOT NULL,
  "code_verifier" text COLLATE "default",
  "created_at" timestamp with time zone NOT NULL
); ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."oauth_clients" (
  "id" uuid NOT NULL,
  "client_secret_hash" text COLLATE "default",
  "registration_type" auth.oauth_registration_type NOT NULL,
  "redirect_uris" text COLLATE "default" NOT NULL,
  "grant_types" text COLLATE "default" NOT NULL,
  "client_name" text COLLATE "default",
  "client_uri" text COLLATE "default",
  "logo_uri" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "client_type" auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
  "token_endpoint_auth_method" text COLLATE "default" NOT NULL
); ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."oauth_consents" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "scopes" text COLLATE "default" NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
); ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."one_time_tokens" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "token_type" auth.one_time_token_type NOT NULL,
  "token_hash" text COLLATE "default" NOT NULL,
  "relates_to" text COLLATE "default" NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone
); ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."refresh_tokens" (
  "instance_id" uuid,
  "id" bigint DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass) NOT NULL,
  "token" character varying(255) COLLATE "default",
  "user_id" character varying(255) COLLATE "default",
  "revoked" boolean,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "parent" character varying(255) COLLATE "default",
  "session_id" uuid
); ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."saml_providers" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "entity_id" text COLLATE "default" NOT NULL,
  "metadata_xml" text COLLATE "default" NOT NULL,
  "metadata_url" text COLLATE "default",
  "attribute_mapping" jsonb,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "name_id_format" text COLLATE "default"
); ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."saml_relay_states" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "request_id" text COLLATE "default" NOT NULL,
  "for_email" text COLLATE "default",
  "redirect_to" text COLLATE "default",
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "flow_state_id" uuid
); ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."schema_migrations" (
  "version" character varying(255) COLLATE "default" NOT NULL
); ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."scim_tokens" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "token_hash" text COLLATE "default" NOT NULL,
  "prefix" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "last_used_at" timestamp with time zone
); ALTER TABLE "auth"."scim_tokens" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."scim_users" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "user_id" uuid,
  "resource" jsonb NOT NULL,
  "user_name" text COLLATE "default" GENERATED ALWAYS AS (lower((resource ->> 'userName'::text))) STORED NOT NULL,
  "external_id" text COLLATE "default" GENERATED ALWAYS AS ((resource ->> 'externalId'::text)) STORED,
  "active" boolean GENERATED ALWAYS AS (COALESCE(((resource ->> 'active'::text))::boolean, true)) STORED NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
); ALTER TABLE "auth"."scim_users" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."sessions" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "factor_id" uuid,
  "aal" auth.aal_level,
  "not_after" timestamp with time zone,
  "refreshed_at" timestamp without time zone,
  "user_agent" text COLLATE "default",
  "ip" inet,
  "tag" text COLLATE "default",
  "oauth_client_id" uuid,
  "refresh_token_hmac_key" text COLLATE "default",
  "refresh_token_counter" bigint,
  "scopes" text COLLATE "default"
); ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."sso_domains" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "domain" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone
); ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."sso_providers" (
  "id" uuid NOT NULL,
  "resource_id" text COLLATE "default",
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "disabled" boolean
); ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."users" (
  "instance_id" uuid,
  "id" uuid NOT NULL,
  "aud" character varying(255) COLLATE "default",
  "role" character varying(255) COLLATE "default",
  "email" character varying(255) COLLATE "default",
  "encrypted_password" character varying(255) COLLATE "default",
  "email_confirmed_at" timestamp with time zone,
  "invited_at" timestamp with time zone,
  "confirmation_token" character varying(255) COLLATE "default",
  "confirmation_sent_at" timestamp with time zone,
  "recovery_token" character varying(255) COLLATE "default",
  "recovery_sent_at" timestamp with time zone,
  "email_change_token_new" character varying(255) COLLATE "default",
  "email_change" character varying(255) COLLATE "default",
  "email_change_sent_at" timestamp with time zone,
  "last_sign_in_at" timestamp with time zone,
  "raw_app_meta_data" jsonb,
  "raw_user_meta_data" jsonb,
  "is_super_admin" boolean,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "phone" text COLLATE "default" DEFAULT NULL::character varying,
  "phone_confirmed_at" timestamp with time zone,
  "phone_change" text COLLATE "default" DEFAULT ''::character varying,
  "phone_change_token" character varying(255) COLLATE "default" DEFAULT ''::character varying,
  "phone_change_sent_at" timestamp with time zone,
  "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
  "email_change_token_current" character varying(255) COLLATE "default" DEFAULT ''::character varying,
  "email_change_confirm_status" smallint DEFAULT 0,
  "banned_until" timestamp with time zone,
  "reauthentication_token" character varying(255) COLLATE "default" DEFAULT ''::character varying,
  "reauthentication_sent_at" timestamp with time zone,
  "is_sso_user" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_anonymous" boolean DEFAULT false NOT NULL
); ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."webauthn_challenges" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "challenge_type" text COLLATE "default" NOT NULL,
  "session_data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
); ALTER TABLE "auth"."webauthn_challenges" OWNER TO "supabase_auth_admin";
CREATE TABLE "auth"."webauthn_credentials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "credential_id" bytea NOT NULL,
  "public_key" bytea NOT NULL,
  "attestation_type" text COLLATE "default" DEFAULT ''::text NOT NULL,
  "aaguid" uuid,
  "sign_count" bigint DEFAULT 0 NOT NULL,
  "transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "backup_eligible" boolean DEFAULT false NOT NULL,
  "backed_up" boolean DEFAULT false NOT NULL,
  "friendly_name" text COLLATE "default" DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone
); ALTER TABLE "auth"."webauthn_credentials" OWNER TO "supabase_auth_admin";
CREATE TABLE "community_private"."ownership_transfer_offers" (
  "community_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "candidate_user_id" uuid NOT NULL,
  "status" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone
); ALTER TABLE "community_private"."ownership_transfer_offers" OWNER TO "postgres";
CREATE TABLE "moderation_private"."content_restrictions" (
  "target_kind" text COLLATE "default" NOT NULL,
  "target_id" uuid NOT NULL,
  "report_id" uuid,
  "applied_by" uuid,
  "applied_at" timestamp with time zone DEFAULT now() NOT NULL,
  "media_status" text COLLATE "default" NOT NULL
); ALTER TABLE "moderation_private"."content_restrictions" OWNER TO "postgres";
CREATE TABLE "moderation_private"."media_claim_events" (
  "id" bigint GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME "moderation_private"."media_claim_events_id_seq" START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE) NOT NULL,
  "claim_id" uuid NOT NULL,
  "event" text COLLATE "default" NOT NULL,
  "at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "moderation_private"."media_claim_events" OWNER TO "postgres";
CREATE TABLE "moderation_private"."media_claims" (
  "claim_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "target_kind" text COLLATE "default" NOT NULL,
  "target_id" uuid NOT NULL,
  "report_id" uuid NOT NULL,
  "bucket" text COLLATE "default" NOT NULL,
  "storage_object_id" uuid NOT NULL,
  "snapshot" jsonb NOT NULL,
  "status" text COLLATE "default" DEFAULT 'held'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
  "checked_at" timestamp with time zone
); ALTER TABLE "moderation_private"."media_claims" OWNER TO "postgres";
CREATE TABLE "moderation_private"."moderation_actions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "moderator_user_id" uuid,
  "action" text COLLATE "default" NOT NULL,
  "note" text COLLATE "default" DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "moderation_private"."moderation_actions" OWNER TO "postgres";
CREATE TABLE "moderation_private"."moderator_grants" (
  "user_id" uuid NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "granted_by" uuid
); ALTER TABLE "moderation_private"."moderator_grants" OWNER TO "postgres";
CREATE TABLE "moderation_private"."reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reporter_user_id" uuid,
  "target_kind" text COLLATE "default" NOT NULL,
  "target_id" uuid NOT NULL,
  "target_owner_user_id" uuid,
  "reason" text COLLATE "default" NOT NULL,
  "details" text COLLATE "default" DEFAULT ''::text NOT NULL,
  "status" text COLLATE "default" DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" uuid
); ALTER TABLE "moderation_private"."reports" OWNER TO "postgres";
CREATE TABLE "public"."account_blocks" (
  "blocker_user_id" uuid NOT NULL,
  "blocked_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."account_blocks" OWNER TO "postgres";
CREATE TABLE "public"."care_completions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "care_item_id" uuid NOT NULL,
  "pet_id" uuid NOT NULL,
  "scheduled_date" date NOT NULL,
  "scheduled_time" time without time zone,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "title_snapshot" text COLLATE "default" NOT NULL,
  "category_snapshot" text COLLATE "default" NOT NULL,
  "notes_snapshot" text COLLATE "default",
  "recurrence_snapshot" text COLLATE "default" NOT NULL,
  "resulting_due_date" date NOT NULL,
  "resulting_due_time" time without time zone,
  "resulting_status" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."care_completions" OWNER TO "postgres";
CREATE TABLE "public"."care_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pet_id" uuid NOT NULL,
  "title" text COLLATE "default" NOT NULL,
  "category" text COLLATE "default" NOT NULL,
  "due_date" date NOT NULL,
  "due_time" time without time zone,
  "timezone" text COLLATE "default" NOT NULL,
  "recurrence" text COLLATE "default" DEFAULT 'none'::text NOT NULL,
  "reminder_days_before" smallint,
  "notes" text COLLATE "default",
  "status" text COLLATE "default" DEFAULT 'active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."care_items" OWNER TO "postgres";
CREATE TABLE "public"."communities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid DEFAULT auth.uid(),
  "name" text COLLATE "default" NOT NULL,
  "description" text COLLATE "default" NOT NULL,
  "category" text COLLATE "default" NOT NULL,
  "species" text COLLATE "default",
  "zone" text COLLATE "default",
  "image_url" text COLLATE "default",
  "image_storage_path" text COLLATE "default",
  "rules" text COLLATE "default",
  "status" text COLLATE "default" DEFAULT 'active'::text NOT NULL,
  "members_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."communities" OWNER TO "postgres";
CREATE TABLE "public"."community_memberships" (
  "community_id" uuid NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "display_pet_id" uuid,
  "role" text COLLATE "default" DEFAULT 'member'::text NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."community_memberships" OWNER TO "postgres";
CREATE TABLE "public"."community_post_comments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "author_pet_id" uuid NOT NULL,
  "body" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."community_post_comments" OWNER TO "postgres";
CREATE TABLE "public"."community_post_likes" (
  "post_id" uuid NOT NULL,
  "actor_pet_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."community_post_likes" OWNER TO "postgres";
CREATE TABLE "public"."community_posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "community_id" uuid NOT NULL,
  "author_user_id" uuid DEFAULT auth.uid() NOT NULL,
  "author_pet_id" uuid NOT NULL,
  "body" text COLLATE "default" DEFAULT ''::text NOT NULL,
  "photo_url" text COLLATE "default",
  "photo_storage_path" text COLLATE "default",
  "likes_count" integer DEFAULT 0 NOT NULL,
  "comments_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."community_posts" OWNER TO "postgres";
CREATE TABLE "public"."follows" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "follower_id" uuid NOT NULL,
  "following_id" uuid NOT NULL
); ALTER TABLE "public"."follows" OWNER TO "postgres";
CREATE TABLE "public"."hidden_posts" (
  "user_id" uuid NOT NULL,
  "post_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."hidden_posts" OWNER TO "postgres";
CREATE TABLE "public"."interactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_pet_id" uuid NOT NULL,
  "target_id" uuid NOT NULL,
  "target_type" text COLLATE "default" NOT NULL,
  "action_type" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "applied_learning" boolean DEFAULT false NOT NULL,
  "target_tags" text[] COLLATE "default"
); ALTER TABLE "public"."interactions" OWNER TO "postgres";
CREATE TABLE "public"."lost_pet_alerts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pet_id" uuid NOT NULL,
  "last_seen_location" text COLLATE "default" NOT NULL,
  "last_seen_at" timestamp with time zone NOT NULL,
  "details" text COLLATE "default",
  "status" text COLLATE "default" DEFAULT 'active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
); ALTER TABLE "public"."lost_pet_alerts" OWNER TO "postgres";
CREATE TABLE "public"."module_validation_intents" (
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "module_key" text COLLATE "default" NOT NULL,
  "intent_key" text COLLATE "default" NOT NULL,
  "source" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."module_validation_intents" OWNER TO "postgres";
CREATE TABLE "public"."module_validation_interests" (
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "module_key" text COLLATE "default" NOT NULL,
  "source" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."module_validation_interests" OWNER TO "postgres";
CREATE TABLE "public"."module_validation_views" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "module_key" text COLLATE "default" NOT NULL,
  "session_id" uuid NOT NULL,
  "source" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."module_validation_views" OWNER TO "postgres";
CREATE TABLE "public"."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "pet_id" uuid,
  "type" text COLLATE "default" NOT NULL,
  "title" text COLLATE "default" NOT NULL,
  "body" text COLLATE "default" NOT NULL,
  "source_id" uuid,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."notifications" OWNER TO "postgres";
CREATE TABLE "public"."pet_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pet_id" uuid NOT NULL,
  "title" text COLLATE "default" NOT NULL,
  "category" text COLLATE "default" NOT NULL,
  "original_file_name" text COLLATE "default" NOT NULL,
  "storage_path" text COLLATE "default" NOT NULL,
  "mime_type" text COLLATE "default" NOT NULL,
  "size_bytes" bigint NOT NULL,
  "status" text COLLATE "default" DEFAULT 'uploading'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."pet_documents" OWNER TO "postgres";
CREATE TABLE "public"."pet_place_checkins" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "place_id" uuid NOT NULL,
  "pet_id" uuid NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "visible" boolean DEFAULT false NOT NULL,
  "checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone DEFAULT (now() + '02:00:00'::interval) NOT NULL,
  "ended_at" timestamp with time zone
); ALTER TABLE "public"."pet_place_checkins" OWNER TO "postgres";
CREATE TABLE "public"."pet_place_presence" (
  "checkin_id" uuid NOT NULL,
  "place_id" uuid NOT NULL,
  "visible_pet_id" uuid,
  "expires_at" timestamp with time zone NOT NULL
); ALTER TABLE "public"."pet_place_presence" OWNER TO "postgres";
CREATE TABLE "public"."pet_places" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text COLLATE "default" NOT NULL,
  "category" text COLLATE "default" NOT NULL,
  "zone" text COLLATE "default" NOT NULL,
  "address" text COLLATE "default" NOT NULL,
  "hours" text COLLATE "default",
  "species_allowed" text COLLATE "default",
  "description" text COLLATE "default",
  "photo_url" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now(),
  "latitude" double precision,
  "longitude" double precision,
  "pet_rules" text COLLATE "default",
  "status" text COLLATE "default" DEFAULT 'active'::text NOT NULL,
  "source" text COLLATE "default" DEFAULT 'pazo_curated'::text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."pet_places" OWNER TO "postgres";
CREATE TABLE "public"."pet_private_details" (
  "pet_id" uuid NOT NULL,
  "zone" text COLLATE "default",
  "interests" text[] COLLATE "default" DEFAULT ARRAY[]::text[] NOT NULL,
  "weight" text COLLATE "default",
  "diet_plan" text COLLATE "default",
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."pet_private_details" OWNER TO "postgres";
CREATE TABLE "public"."pet_private_metrics" (
  "pet_id" uuid NOT NULL,
  "learned_interests" jsonb DEFAULT '{}'::jsonb,
  "last_decay_applied_at" timestamp with time zone DEFAULT now()
); ALTER TABLE "public"."pet_private_metrics" OWNER TO "postgres";
CREATE TABLE "public"."pet_public_links" (
  "pet_id" uuid NOT NULL,
  "public_token" uuid DEFAULT gen_random_uuid() NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "rotated_at" timestamp with time zone
); ALTER TABLE "public"."pet_public_links" OWNER TO "postgres";
CREATE TABLE "public"."pet_sightings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pet_id" uuid NOT NULL,
  "alert_id" uuid,
  "message" text COLLATE "default" NOT NULL,
  "location_text" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reporter_name" text COLLATE "default",
  "reporter_phone" text COLLATE "default"
); ALTER TABLE "public"."pet_sightings" OWNER TO "postgres";
CREATE TABLE "public"."pets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "name" text COLLATE "default" NOT NULL,
  "species" text COLLATE "default" NOT NULL,
  "age" text COLLATE "default",
  "photo_url" text COLLATE "default",
  "zone" text COLLATE "default",
  "interests" text[] COLLATE "default",
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "bio" text COLLATE "default",
  "weight" text COLLATE "default",
  "dietPlan" text COLLATE "default",
  "breed" text COLLATE "default",
  "gender" text COLLATE "default",
  "is_lost" boolean DEFAULT false NOT NULL,
  "last_seen_location" text COLLATE "default"
); ALTER TABLE "public"."pets" OWNER TO "postgres";
CREATE TABLE "public"."place_suggestions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "submitter_user_id" uuid DEFAULT auth.uid() NOT NULL,
  "name" text COLLATE "default" NOT NULL,
  "category" text COLLATE "default" NOT NULL,
  "address" text COLLATE "default" NOT NULL,
  "zone" text COLLATE "default",
  "note" text COLLATE "default",
  "status" text COLLATE "default" DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."place_suggestions" OWNER TO "postgres";
CREATE TABLE "public"."place_usage_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "session_id" uuid NOT NULL,
  "event_type" text COLLATE "default" NOT NULL,
  "place_id" uuid,
  "category" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."place_usage_events" OWNER TO "postgres";
CREATE TABLE "public"."post_comments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "author_pet_id" uuid NOT NULL,
  "body" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" text COLLATE "default"
); ALTER TABLE "public"."post_comments" OWNER TO "postgres";
CREATE TABLE "public"."posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "pet_id" uuid,
  "pet_name" text COLLATE "default" NOT NULL,
  "pet_species" text COLLATE "default" NOT NULL,
  "pet_avatar" text COLLATE "default",
  "location" text COLLATE "default" DEFAULT 'Los Ángeles • Local'::text,
  "text" text COLLATE "default" NOT NULL,
  "photo_url" text COLLATE "default",
  "likes" integer DEFAULT 0,
  "comments" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "tags" text[] COLLATE "default" DEFAULT '{}'::text[],
  "comments_count" integer DEFAULT 0 NOT NULL
); ALTER TABLE "public"."posts" OWNER TO "postgres";
CREATE TABLE "public"."profiles" (
  "id" uuid NOT NULL,
  "username" text COLLATE "default",
  "avatar_url" text COLLATE "default",
  "is_founder" boolean DEFAULT false,
  "paypal_subscription_id" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "onboarding_completed" boolean DEFAULT false
); ALTER TABLE "public"."profiles" OWNER TO "postgres";
CREATE TABLE "public"."search_usage_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "session_id" uuid NOT NULL,
  "event_type" text COLLATE "default" NOT NULL,
  "result_type" text COLLATE "default",
  "filter_type" text COLLATE "default",
  "had_results" boolean,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "public"."search_usage_events" OWNER TO "postgres";
CREATE TABLE "storage"."buckets" (
  "id" text COLLATE "default" NOT NULL,
  "name" text COLLATE "default" NOT NULL,
  "owner" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "public" boolean DEFAULT false,
  "avif_autodetection" boolean DEFAULT false,
  "file_size_limit" bigint,
  "allowed_mime_types" text[] COLLATE "default",
  "owner_id" text COLLATE "default",
  "type" storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL,
  "versioning_status" text COLLATE "default" DEFAULT 'DISABLED'::text NOT NULL,
  "lifecycle_configuration" jsonb,
  "lifecycle_configuration_generation" uuid
); ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."buckets_analytics" (
  "name" text COLLATE "default" NOT NULL,
  "type" storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
  "format" text COLLATE "default" DEFAULT 'ICEBERG'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deleted_at" timestamp with time zone
); ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."buckets_vectors" (
  "id" text COLLATE "default" NOT NULL,
  "type" storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."migrations" (
  "id" integer NOT NULL,
  "name" character varying(100) COLLATE "default" NOT NULL,
  "hash" character varying(40) COLLATE "default" NOT NULL,
  "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
); ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."objects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "bucket_id" text COLLATE "default",
  "name" text COLLATE "default",
  "owner" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "last_accessed_at" timestamp with time zone DEFAULT now(),
  "metadata" jsonb,
  "path_tokens" text[] COLLATE "default" GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
  "version" text COLLATE "default",
  "owner_id" text COLLATE "default",
  "user_metadata" jsonb,
  "archived_at" timestamp with time zone,
  "is_delete_marker" boolean DEFAULT false NOT NULL,
  "is_versioned" boolean DEFAULT false NOT NULL
); ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."s3_multipart_uploads" (
  "id" text COLLATE "default" NOT NULL,
  "in_progress_size" bigint DEFAULT 0 NOT NULL,
  "upload_signature" text COLLATE "default" NOT NULL,
  "bucket_id" text COLLATE "default" NOT NULL,
  "key" text COLLATE "C" NOT NULL,
  "version" text COLLATE "default" NOT NULL,
  "owner_id" text COLLATE "default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_metadata" jsonb,
  "metadata" jsonb
); ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."s3_multipart_uploads_parts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "upload_id" text COLLATE "default" NOT NULL,
  "size" bigint DEFAULT 0 NOT NULL,
  "part_number" integer NOT NULL,
  "bucket_id" text COLLATE "default" NOT NULL,
  "key" text COLLATE "C" NOT NULL,
  "etag" text COLLATE "default" NOT NULL,
  "owner_id" text COLLATE "default",
  "version" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";
CREATE TABLE "storage"."vector_indexes" (
  "id" text COLLATE "default" DEFAULT gen_random_uuid() NOT NULL,
  "name" text COLLATE "C" NOT NULL,
  "bucket_id" text COLLATE "default" NOT NULL,
  "data_type" text COLLATE "default" NOT NULL,
  "dimension" integer NOT NULL,
  "distance_metric" text COLLATE "default" NOT NULL,
  "metadata_configuration" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";
CREATE TABLE "validation_private"."intent_options" (
  "module_key" text COLLATE "default" NOT NULL,
  "intent_key" text COLLATE "default" NOT NULL,
  "sort_order" smallint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "validation_private"."intent_options" OWNER TO "postgres";
CREATE TABLE "validation_private"."modules" (
  "module_key" text COLLATE "default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
); ALTER TABLE "validation_private"."modules" OWNER TO "postgres";
ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";
CREATE OR REPLACE FUNCTION public.get_recommended_posts(p_actor_pet_id uuid, p_limit integer DEFAULT 10)
 RETURNS SETOF posts
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
ALTER FUNCTION "public"."get_recommended_posts"(p_actor_pet_id uuid, p_limit integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.get_recommended_posts_page(p_actor_pet_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS SETOF posts
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    AND public.f14_can_interact(candidate_pet.owner_id)
    AND NOT EXISTS(SELECT 1 FROM public.hidden_posts h WHERE h.user_id=auth.uid() AND h.post_id=candidate.id)
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
$function$
;
ALTER FUNCTION "public"."get_recommended_posts_page"(p_actor_pet_id uuid, p_limit integer, p_offset integer) OWNER TO "postgres";
ALTER TABLE "account_requests_private"."deletion_requests" ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY (subject_user_id);
ALTER TABLE "account_requests_private"."deletion_requests" ADD CONSTRAINT "deletion_requests_status_check" CHECK ((status = ANY (ARRAY['requested'::text, 'cancelled'::text, 'processing'::text, 'completed'::text])));
ALTER TABLE "account_requests_private"."deletion_requests" ADD CONSTRAINT "processed_only_when_complete" CHECK (((status <> 'completed'::text) OR (processed_at IS NOT NULL)));
ALTER TABLE "auth"."audit_log_entries" ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_client_id_length" CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_identifier_format" CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE (identifier);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_issuer_length" CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048))));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_name_length" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL))));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text])));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_token_url_https" CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_token_url_length" CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text)));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)));
ALTER TABLE "auth"."flow_state" ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE (provider_id, provider);
ALTER TABLE "auth"."instances" ADD CONSTRAINT "instances_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "amr_id_pk" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE (session_id, authentication_method);
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE (last_challenged_at);
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_recovery_code_sets" ADD CONSTRAINT "mfa_recovery_code_sets_failed_verification_count_check" CHECK ((failed_verification_count >= 0));
ALTER TABLE "auth"."mfa_recovery_code_sets" ADD CONSTRAINT "mfa_recovery_code_sets_mfa_factor_id_key" UNIQUE (mfa_factor_id);
ALTER TABLE "auth"."mfa_recovery_code_sets" ADD CONSTRAINT "mfa_recovery_code_sets_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_recovery_code_sets" ADD CONSTRAINT "mfa_recovery_code_sets_user_id_key" UNIQUE (user_id);
ALTER TABLE "auth"."mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE (authorization_code);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK ((char_length(authorization_code) <= 255));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE (authorization_id);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK ((char_length(code_challenge) <= 128));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_expires_at_future" CHECK ((expires_at > created_at));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_nonce_length" CHECK ((char_length(nonce) <= 255));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK ((char_length(redirect_uri) <= 2048));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_resource_length" CHECK ((char_length(resource) <= 2048));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_scope_length" CHECK ((char_length(scope) <= 4096));
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_state_length" CHECK ((char_length(state) <= 4096));
ALTER TABLE "auth"."oauth_client_states" ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_client_name_length" CHECK ((char_length(client_name) <= 1024));
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_client_uri_length" CHECK ((char_length(client_uri) <= 2048));
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_logo_uri_length" CHECK ((char_length(logo_uri) <= 2048));
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])));
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_revoked_after_granted" CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at)));
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_scopes_length" CHECK ((char_length(scopes) <= 2048));
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_scopes_not_empty" CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0));
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE (user_id, client_id);
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_token_hash_check" CHECK ((char_length(token_hash) > 0));
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE (token);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0));
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0)));
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0));
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE (entity_id);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0));
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."schema_migrations" ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY (version);
ALTER TABLE "auth"."scim_tokens" ADD CONSTRAINT "scim_tokens_expires_at_future" CHECK (((expires_at IS NULL) OR (expires_at > created_at)));
ALTER TABLE "auth"."scim_tokens" ADD CONSTRAINT "scim_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."scim_tokens" ADD CONSTRAINT "scim_tokens_revoked_after_created" CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at)));
ALTER TABLE "auth"."scim_tokens" ADD CONSTRAINT "scim_tokens_token_hash_check" CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text));
ALTER TABLE "auth"."scim_users" ADD CONSTRAINT "scim_users_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_scopes_length" CHECK ((char_length(scopes) <= 4096));
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0));
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."sso_providers" ADD CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)));
ALTER TABLE "auth"."sso_providers" ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_email_change_confirm_status_check" CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)));
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_phone_key" UNIQUE (phone);
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])));
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY (id);
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_check" CHECK ((owner_user_id <> candidate_user_id));
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_check1" CHECK ((expires_at > created_at));
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_pkey" PRIMARY KEY (community_id);
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])));
ALTER TABLE "moderation_private"."content_restrictions" ADD CONSTRAINT "content_restrictions_media_status_check" CHECK ((media_status = ANY (ARRAY['none'::text, 'pending_review'::text, 'purged'::text])));
ALTER TABLE "moderation_private"."content_restrictions" ADD CONSTRAINT "content_restrictions_pkey" PRIMARY KEY (target_kind, target_id);
ALTER TABLE "moderation_private"."content_restrictions" ADD CONSTRAINT "content_restrictions_target_kind_check" CHECK ((target_kind = ANY (ARRAY['feed_post'::text, 'feed_comment'::text, 'pet_profile'::text, 'community_post'::text, 'community_comment'::text])));
ALTER TABLE "moderation_private"."media_claim_events" ADD CONSTRAINT "media_claim_events_event_check" CHECK ((event = ANY (ARRAY['created'::text, 'rechecked'::text, 'invalidated'::text])));
ALTER TABLE "moderation_private"."media_claim_events" ADD CONSTRAINT "media_claim_events_pkey" PRIMARY KEY (id);
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_bucket_check" CHECK ((bucket = ANY (ARRAY['post-photos'::text, 'community-post-photos'::text])));
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_bucket_storage_object_id_key" UNIQUE (bucket, storage_object_id);
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_check" CHECK ((expires_at > created_at));
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_pkey" PRIMARY KEY (claim_id);
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_status_check" CHECK ((status = ANY (ARRAY['held'::text, 'invalidated'::text])));
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_target_kind_check" CHECK ((target_kind = ANY (ARRAY['feed_post'::text, 'community_post'::text])));
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_target_kind_target_id_key" UNIQUE (target_kind, target_id);
ALTER TABLE "moderation_private"."moderation_actions" ADD CONSTRAINT "moderation_actions_action_check" CHECK ((action = ANY (ARRAY['dismiss'::text, 'remove'::text])));
ALTER TABLE "moderation_private"."moderation_actions" ADD CONSTRAINT "moderation_actions_note_check" CHECK ((char_length(note) <= 500));
ALTER TABLE "moderation_private"."moderation_actions" ADD CONSTRAINT "moderation_actions_pkey" PRIMARY KEY (id);
ALTER TABLE "moderation_private"."moderator_grants" ADD CONSTRAINT "moderator_grants_pkey" PRIMARY KEY (user_id);
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_details_check" CHECK ((char_length(details) <= 500));
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_pkey" PRIMARY KEY (id);
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_reason_check" CHECK ((reason = ANY (ARRAY['spam'::text, 'harassment'::text, 'unsafe'::text, 'other'::text])));
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'dismissed'::text, 'removed'::text])));
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_target_kind_check" CHECK ((target_kind = ANY (ARRAY['feed_post'::text, 'feed_comment'::text, 'pet_profile'::text, 'community_post'::text, 'community_comment'::text])));
ALTER TABLE "public"."account_blocks" ADD CONSTRAINT "account_blocks_pkey" PRIMARY KEY (blocker_user_id, blocked_user_id);
ALTER TABLE "public"."account_blocks" ADD CONSTRAINT "f14_block_distinct" CHECK ((blocker_user_id <> blocked_user_id));
ALTER TABLE "public"."care_completions" ADD CONSTRAINT "care_completions_category_valid" CHECK ((category_snapshot = ANY (ARRAY['veterinarian'::text, 'vaccine'::text, 'medication'::text, 'hygiene'::text, 'feeding'::text, 'other'::text])));
ALTER TABLE "public"."care_completions" ADD CONSTRAINT "care_completions_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."care_completions" ADD CONSTRAINT "care_completions_recurrence_valid" CHECK ((recurrence_snapshot = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])));
ALTER TABLE "public"."care_completions" ADD CONSTRAINT "care_completions_resulting_status_valid" CHECK ((resulting_status = ANY (ARRAY['active'::text, 'completed'::text])));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_category_valid" CHECK ((category = ANY (ARRAY['veterinarian'::text, 'vaccine'::text, 'medication'::text, 'hygiene'::text, 'feeding'::text, 'other'::text])));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_notes_length" CHECK (((notes IS NULL) OR (char_length(notes) <= 1000)));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_recurrence_valid" CHECK ((recurrence = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_reminder_valid" CHECK (((reminder_days_before IS NULL) OR (reminder_days_before = ANY (ARRAY[0, 1, 2, 7]))));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_status_valid" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_timezone_not_blank" CHECK (((char_length(btrim(timezone)) >= 1) AND (char_length(btrim(timezone)) <= 100)));
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_title_length" CHECK (((char_length(btrim(title)) >= 2) AND (char_length(btrim(title)) <= 120)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_category_length" CHECK (((char_length(btrim(category)) >= 2) AND (char_length(btrim(category)) <= 40)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_description_length" CHECK (((char_length(btrim(description)) >= 1) AND (char_length(btrim(description)) <= 1000)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_image_pair" CHECK (((image_url IS NULL) = (image_storage_path IS NULL)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_members_count_nonnegative" CHECK ((members_count >= 0));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_name_length" CHECK (((char_length(btrim(name)) >= 3) AND (char_length(btrim(name)) <= 80)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_rules_length" CHECK (((rules IS NULL) OR (char_length(btrim(rules)) <= 2000)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_species_allowed" CHECK (((species IS NULL) OR (species = ANY (ARRAY['gato'::text, 'perro'::text, 'conejo'::text, 'ave'::text, 'otro'::text]))));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_status_allowed" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])));
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_zone_length" CHECK (((zone IS NULL) OR (char_length(btrim(zone)) <= 100)));
ALTER TABLE "public"."communities" ADD CONSTRAINT "f14_community_archived_if_ownerless" CHECK (((owner_user_id IS NOT NULL) OR (status = 'archived'::text)));

ALTER TABLE "public"."community_memberships" ADD CONSTRAINT "community_memberships_pkey" PRIMARY KEY (community_id, user_id);
ALTER TABLE "public"."community_memberships" ADD CONSTRAINT "community_memberships_role_allowed" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));
ALTER TABLE "public"."community_post_comments" ADD CONSTRAINT "community_post_comments_body_length" CHECK (((char_length(btrim(body)) >= 1) AND (char_length(btrim(body)) <= 1000)));
ALTER TABLE "public"."community_post_comments" ADD CONSTRAINT "community_post_comments_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."community_post_likes" ADD CONSTRAINT "community_post_likes_pkey" PRIMARY KEY (post_id, actor_pet_id);
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_body_length" CHECK ((char_length(body) <= 4000));
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_comments_nonnegative" CHECK ((comments_count >= 0));
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_content_required" CHECK (((btrim(body) <> ''::text) OR (photo_url IS NOT NULL)));
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_likes_nonnegative" CHECK ((likes_count >= 0));
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_photo_pair" CHECK (((photo_url IS NULL) = (photo_storage_path IS NULL)));
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_no_self_follow" CHECK ((follower_id <> following_id));
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."follows" ADD CONSTRAINT "unique_follow" UNIQUE (follower_id, following_id);
ALTER TABLE "public"."hidden_posts" ADD CONSTRAINT "hidden_posts_pkey" PRIMARY KEY (user_id, post_id);
ALTER TABLE "public"."interactions" ADD CONSTRAINT "interactions_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."lost_pet_alerts" ADD CONSTRAINT "lost_pet_alert_details_length" CHECK (((details IS NULL) OR (char_length(details) <= 1500)));
ALTER TABLE "public"."lost_pet_alerts" ADD CONSTRAINT "lost_pet_alert_location_length" CHECK (((char_length(btrim(last_seen_location)) >= 2) AND (char_length(btrim(last_seen_location)) <= 250)));
ALTER TABLE "public"."lost_pet_alerts" ADD CONSTRAINT "lost_pet_alerts_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."lost_pet_alerts" ADD CONSTRAINT "lost_pet_alerts_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text])));
ALTER TABLE "public"."module_validation_intents" ADD CONSTRAINT "module_validation_intents_pkey" PRIMARY KEY (user_id, module_key);
ALTER TABLE "public"."module_validation_intents" ADD CONSTRAINT "module_validation_intents_source_format" CHECK ((source ~ '^[a-z0-9_]{2,64}$'::text));
ALTER TABLE "public"."module_validation_interests" ADD CONSTRAINT "module_validation_interests_pkey" PRIMARY KEY (user_id, module_key);
ALTER TABLE "public"."module_validation_interests" ADD CONSTRAINT "module_validation_interests_source_format" CHECK ((source ~ '^[a-z0-9_]{2,64}$'::text));
ALTER TABLE "public"."module_validation_views" ADD CONSTRAINT "module_validation_views_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."module_validation_views" ADD CONSTRAINT "module_validation_views_source_format" CHECK ((source ~ '^[a-z0-9_]{2,64}$'::text));
ALTER TABLE "public"."module_validation_views" ADD CONSTRAINT "module_validation_views_unique_session" UNIQUE (user_id, module_key, session_id);
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_body_length" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1200)));
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_title_length" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 160)));
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_type_check" CHECK ((type = ANY (ARRAY['sighting'::text, 'system'::text])));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_category_check" CHECK ((category = ANY (ARRAY['vaccines'::text, 'medical_history'::text, 'identification'::text, 'results'::text, 'other'::text])));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_mime_type_check" CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/jpeg'::text, 'image/png'::text, 'image/webp'::text])));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_original_file_name_length" CHECK (((char_length(btrim(original_file_name)) >= 1) AND (char_length(btrim(original_file_name)) <= 255)));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_size_bytes_check" CHECK (((size_bytes > 0) AND (size_bytes <= 10485760)));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_status_check" CHECK ((status = ANY (ARRAY['uploading'::text, 'active'::text, 'deleting'::text])));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_storage_path_check" CHECK ((char_length(btrim(storage_path)) > 0));
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_storage_path_key" UNIQUE (storage_path);
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_title_length" CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 160)));
ALTER TABLE "public"."pet_place_checkins" ADD CONSTRAINT "pet_place_checkins_end_after_start" CHECK (((ended_at IS NULL) OR (ended_at >= checked_in_at)));
ALTER TABLE "public"."pet_place_checkins" ADD CONSTRAINT "pet_place_checkins_expiry_after_start" CHECK ((expires_at > checked_in_at));
ALTER TABLE "public"."pet_place_checkins" ADD CONSTRAINT "pet_place_checkins_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."pet_place_presence" ADD CONSTRAINT "pet_place_presence_pkey" PRIMARY KEY (checkin_id);
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_active_requires_coordinates" CHECK (((status <> 'active'::text) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL))));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_address_length" CHECK (((char_length(btrim(address)) >= 3) AND (char_length(btrim(address)) <= 300)));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_category_allowed" CHECK ((category = ANY (ARRAY['park'::text, 'trail'::text, 'food'::text, 'veterinary'::text, 'grooming'::text, 'pet_store'::text])));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_description_length" CHECK (((description IS NULL) OR (char_length(btrim(description)) <= 3000)));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_latitude_valid" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_longitude_valid" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_name_length" CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 120)));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_rules_length" CHECK (((pet_rules IS NULL) OR (char_length(btrim(pet_rules)) <= 2000)));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_source_length" CHECK (((char_length(btrim(source)) >= 2) AND (char_length(btrim(source)) <= 80)));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_status_allowed" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])));
ALTER TABLE "public"."pet_places" ADD CONSTRAINT "pet_places_zone_length" CHECK (((char_length(btrim(zone)) >= 1) AND (char_length(btrim(zone)) <= 120)));
ALTER TABLE "public"."pet_private_details" ADD CONSTRAINT "pet_private_details_pkey" PRIMARY KEY (pet_id);
ALTER TABLE "public"."pet_private_metrics" ADD CONSTRAINT "pet_private_metrics_pkey" PRIMARY KEY (pet_id);
ALTER TABLE "public"."pet_public_links" ADD CONSTRAINT "pet_public_links_pkey" PRIMARY KEY (pet_id);
ALTER TABLE "public"."pet_public_links" ADD CONSTRAINT "pet_public_links_public_token_key" UNIQUE (public_token);
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sighting_location_length" CHECK (((location_text IS NULL) OR (char_length(location_text) <= 250)));
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sighting_message_length" CHECK (((char_length(btrim(message)) >= 3) AND (char_length(btrim(message)) <= 1000)));
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sighting_reporter_name_length" CHECK (((reporter_name IS NULL) OR ((char_length(btrim(reporter_name)) >= 2) AND (char_length(btrim(reporter_name)) <= 100))));
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sighting_reporter_phone_length" CHECK (((reporter_phone IS NULL) OR ((char_length(btrim(reporter_phone)) >= 7) AND (char_length(btrim(reporter_phone)) <= 40))));
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sightings_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_gender_allowed" CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['macho'::text, 'hembra'::text]))));
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_name_length" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 50)));
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_species_allowed" CHECK ((species = ANY (ARRAY['gato'::text, 'perro'::text, 'conejo'::text, 'ave'::text, 'otro'::text])));
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_address_length" CHECK (((char_length(btrim(address)) >= 3) AND (char_length(btrim(address)) <= 300)));
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_category_allowed" CHECK ((category = ANY (ARRAY['park'::text, 'trail'::text, 'food'::text, 'veterinary'::text, 'grooming'::text, 'pet_store'::text])));
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_name_length" CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 120)));
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_note_length" CHECK (((note IS NULL) OR (char_length(btrim(note)) <= 1000)));
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_status_allowed" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_zone_length" CHECK (((zone IS NULL) OR (char_length(btrim(zone)) <= 120)));
ALTER TABLE "public"."place_usage_events" ADD CONSTRAINT "place_usage_events_category_allowed" CHECK (((category IS NULL) OR (category = ANY (ARRAY['park'::text, 'trail'::text, 'food'::text, 'veterinary'::text, 'grooming'::text, 'pet_store'::text]))));
ALTER TABLE "public"."place_usage_events" ADD CONSTRAINT "place_usage_events_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."place_usage_events" ADD CONSTRAINT "place_usage_events_type_allowed" CHECK ((event_type = ANY (ARRAY['map_open'::text, 'use_location'::text, 'place_open'::text, 'search'::text, 'filter'::text])));
ALTER TABLE "public"."post_comments" ADD CONSTRAINT "post_comments_body_length" CHECK (((char_length(btrim(body)) >= 1) AND (char_length(btrim(body)) <= 1000)));
ALTER TABLE "public"."post_comments" ADD CONSTRAINT "post_comments_legacy_id_key" UNIQUE (legacy_id);
ALTER TABLE "public"."post_comments" ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."search_usage_events" ADD CONSTRAINT "search_usage_event_shape_valid" CHECK ((((event_type = 'search_open'::text) AND (result_type IS NULL) AND (filter_type IS NULL) AND (had_results IS NULL)) OR ((event_type = 'search_execute'::text) AND (result_type IS NULL) AND (filter_type IS NULL) AND (had_results IS NOT NULL)) OR ((event_type = 'search_result_open'::text) AND (result_type IS NOT NULL) AND (filter_type IS NOT NULL) AND (had_results IS NULL)) OR ((event_type = 'search_filter_change'::text) AND (result_type IS NULL) AND (filter_type IS NOT NULL) AND (had_results IS NULL))));
ALTER TABLE "public"."search_usage_events" ADD CONSTRAINT "search_usage_event_type_valid" CHECK ((event_type = ANY (ARRAY['search_open'::text, 'search_execute'::text, 'search_result_open'::text, 'search_filter_change'::text])));
ALTER TABLE "public"."search_usage_events" ADD CONSTRAINT "search_usage_events_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."search_usage_events" ADD CONSTRAINT "search_usage_filter_type_valid" CHECK (((filter_type IS NULL) OR (filter_type = ANY (ARRAY['all'::text, 'pet'::text, 'community'::text, 'place'::text]))));
ALTER TABLE "public"."search_usage_events" ADD CONSTRAINT "search_usage_result_type_valid" CHECK (((result_type IS NULL) OR (result_type = ANY (ARRAY['pet'::text, 'community'::text, 'place'::text]))));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_lifecycle_configuration_pair_check" CHECK (((lifecycle_configuration IS NULL) = (lifecycle_configuration_generation IS NULL)));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_lifecycle_configuration_shape_check" CHECK (((lifecycle_configuration IS NULL) OR ((jsonb_typeof(lifecycle_configuration) = 'object'::text) AND (lifecycle_configuration ? 'rules'::text) AND
CASE
    WHEN (jsonb_typeof((lifecycle_configuration -> 'rules'::text)) = 'array'::text) THEN ((jsonb_array_length((lifecycle_configuration -> 'rules'::text)) >= 1) AND (jsonb_array_length((lifecycle_configuration -> 'rules'::text)) <= 1000))
    ELSE false
END)));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_lifecycle_configuration_standard_only_check" CHECK (((type = 'STANDARD'::storage.buckettype) OR ((lifecycle_configuration IS NULL) AND (lifecycle_configuration_generation IS NULL))));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_versioning_dark_check" CHECK ((versioning_status = 'DISABLED'::text));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_versioning_standard_only_check" CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text)));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_versioning_status_check" CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])));
ALTER TABLE "storage"."buckets_analytics" ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."buckets_vectors" ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."migrations" ADD CONSTRAINT "migrations_name_key" UNIQUE (name);
ALTER TABLE "storage"."migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."objects" ADD CONSTRAINT "objects_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY (id);
ALTER TABLE "validation_private"."intent_options" ADD CONSTRAINT "intent_options_pkey" PRIMARY KEY (module_key, intent_key);
ALTER TABLE "validation_private"."intent_options" ADD CONSTRAINT "validation_intent_key_format" CHECK ((intent_key ~ '^[a-z0-9_]{2,64}$'::text));
ALTER TABLE "validation_private"."intent_options" ADD CONSTRAINT "validation_intent_sort_order_positive" CHECK ((sort_order > 0));
ALTER TABLE "validation_private"."modules" ADD CONSTRAINT "modules_pkey" PRIMARY KEY (module_key);
ALTER TABLE "validation_private"."modules" ADD CONSTRAINT "validation_module_key_format" CHECK ((module_key ~ '^[a-z0-9_]{2,64}$'::text));
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_recovery_code_sets" ADD CONSTRAINT "mfa_recovery_code_sets_mfa_factor_id_fkey" FOREIGN KEY (mfa_factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_recovery_code_sets" ADD CONSTRAINT "mfa_recovery_code_sets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_mfa_recovery_code_set_id_fkey" FOREIGN KEY (mfa_recovery_code_set_id) REFERENCES auth.mfa_recovery_code_sets(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."scim_tokens" ADD CONSTRAINT "scim_tokens_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."scim_users" ADD CONSTRAINT "scim_users_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."scim_users" ADD CONSTRAINT "scim_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_candidate_user_id_fkey" FOREIGN KEY (candidate_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE "community_private"."ownership_transfer_offers" ADD CONSTRAINT "ownership_transfer_offers_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "moderation_private"."content_restrictions" ADD CONSTRAINT "content_restrictions_applied_by_fkey" FOREIGN KEY (applied_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "moderation_private"."content_restrictions" ADD CONSTRAINT "content_restrictions_report_id_fkey" FOREIGN KEY (report_id) REFERENCES moderation_private.reports(id) ON DELETE SET NULL;
ALTER TABLE "moderation_private"."media_claim_events" ADD CONSTRAINT "media_claim_events_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES moderation_private.media_claims(claim_id) ON DELETE RESTRICT;
ALTER TABLE "moderation_private"."media_claims" ADD CONSTRAINT "media_claims_report_id_fkey" FOREIGN KEY (report_id) REFERENCES moderation_private.reports(id) ON DELETE RESTRICT;
ALTER TABLE "moderation_private"."moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_user_id_fkey" FOREIGN KEY (moderator_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "moderation_private"."moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY (report_id) REFERENCES moderation_private.reports(id);
ALTER TABLE "moderation_private"."moderator_grants" ADD CONSTRAINT "moderator_grants_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "moderation_private"."moderator_grants" ADD CONSTRAINT "moderator_grants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "moderation_private"."reports" ADD CONSTRAINT "reports_target_owner_user_id_fkey" FOREIGN KEY (target_owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "public"."account_blocks" ADD CONSTRAINT "account_blocks_blocked_user_id_fkey" FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."account_blocks" ADD CONSTRAINT "account_blocks_blocker_user_id_fkey" FOREIGN KEY (blocker_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."care_completions" ADD CONSTRAINT "care_completions_care_item_id_fkey" FOREIGN KEY (care_item_id) REFERENCES care_items(id);
ALTER TABLE "public"."care_completions" ADD CONSTRAINT "care_completions_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id);
ALTER TABLE "public"."care_items" ADD CONSTRAINT "care_items_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id);
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "public"."community_memberships" ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_memberships" ADD CONSTRAINT "community_memberships_display_pet_id_fkey" FOREIGN KEY (display_pet_id) REFERENCES pets(id) ON DELETE SET NULL;
ALTER TABLE "public"."community_memberships" ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_post_comments" ADD CONSTRAINT "community_post_comments_author_pet_id_fkey" FOREIGN KEY (author_pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_post_comments" ADD CONSTRAINT "community_post_comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_post_likes" ADD CONSTRAINT "community_post_likes_actor_pet_id_fkey" FOREIGN KEY (actor_pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_post_likes" ADD CONSTRAINT "community_post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_author_pet_id_fkey" FOREIGN KEY (author_pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."community_posts" ADD CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_follower_pet_fkey" FOREIGN KEY (follower_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_following_pet_fkey" FOREIGN KEY (following_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."hidden_posts" ADD CONSTRAINT "hidden_posts_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE "public"."hidden_posts" ADD CONSTRAINT "hidden_posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."lost_pet_alerts" ADD CONSTRAINT "lost_pet_alerts_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."module_validation_intents" ADD CONSTRAINT "module_validation_intents_interest_fk" FOREIGN KEY (user_id, module_key) REFERENCES module_validation_interests(user_id, module_key) ON DELETE CASCADE;
ALTER TABLE "public"."module_validation_intents" ADD CONSTRAINT "module_validation_intents_option_fk" FOREIGN KEY (module_key, intent_key) REFERENCES validation_private.intent_options(module_key, intent_key) ON DELETE RESTRICT;
ALTER TABLE "public"."module_validation_intents" ADD CONSTRAINT "module_validation_intents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."module_validation_interests" ADD CONSTRAINT "module_validation_interests_module_key_fkey" FOREIGN KEY (module_key) REFERENCES validation_private.modules(module_key) ON DELETE RESTRICT;
ALTER TABLE "public"."module_validation_interests" ADD CONSTRAINT "module_validation_interests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."module_validation_views" ADD CONSTRAINT "module_validation_views_module_key_fkey" FOREIGN KEY (module_key) REFERENCES validation_private.modules(module_key) ON DELETE RESTRICT;
ALTER TABLE "public"."module_validation_views" ADD CONSTRAINT "module_validation_views_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT;
ALTER TABLE "public"."pet_place_checkins" ADD CONSTRAINT "pet_place_checkins_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_place_checkins" ADD CONSTRAINT "pet_place_checkins_place_id_fkey" FOREIGN KEY (place_id) REFERENCES pet_places(id) ON DELETE RESTRICT;
ALTER TABLE "public"."pet_place_checkins" ADD CONSTRAINT "pet_place_checkins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_place_presence" ADD CONSTRAINT "pet_place_presence_checkin_id_fkey" FOREIGN KEY (checkin_id) REFERENCES pet_place_checkins(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_place_presence" ADD CONSTRAINT "pet_place_presence_place_id_fkey" FOREIGN KEY (place_id) REFERENCES pet_places(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_place_presence" ADD CONSTRAINT "pet_place_presence_visible_pet_id_fkey" FOREIGN KEY (visible_pet_id) REFERENCES pets(id) ON DELETE SET NULL;
ALTER TABLE "public"."pet_private_details" ADD CONSTRAINT "pet_private_details_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_private_metrics" ADD CONSTRAINT "pet_private_metrics_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_public_links" ADD CONSTRAINT "pet_public_links_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sightings_alert_id_fkey" FOREIGN KEY (alert_id) REFERENCES lost_pet_alerts(id) ON DELETE SET NULL;
ALTER TABLE "public"."pet_sightings" ADD CONSTRAINT "pet_sightings_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id);
ALTER TABLE "public"."place_suggestions" ADD CONSTRAINT "place_suggestions_submitter_user_id_fkey" FOREIGN KEY (submitter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."place_usage_events" ADD CONSTRAINT "place_usage_events_place_id_fkey" FOREIGN KEY (place_id) REFERENCES pet_places(id) ON DELETE SET NULL;
ALTER TABLE "public"."place_usage_events" ADD CONSTRAINT "place_usage_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."post_comments" ADD CONSTRAINT "post_comments_author_pet_id_fkey" FOREIGN KEY (author_pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE;
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."search_usage_events" ADD CONSTRAINT "search_usage_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "storage"."objects" ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;
ALTER TABLE "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);
ALTER TABLE "validation_private"."intent_options" ADD CONSTRAINT "intent_options_module_key_fkey" FOREIGN KEY (module_key) REFERENCES validation_private.modules(module_key) ON DELETE CASCADE;
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);
CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);
CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);
CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);
CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);
CREATE INDEX mfa_recovery_codes_set_id_idx ON auth.mfa_recovery_codes USING btree (mfa_recovery_code_set_id);
CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);
CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);
CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);
CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);
CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);
CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);
CREATE INDEX scim_tokens_expires_at_idx ON auth.scim_tokens USING btree (expires_at);
CREATE INDEX scim_tokens_revoked_at_idx ON auth.scim_tokens USING btree (revoked_at);
CREATE INDEX scim_tokens_sso_provider_id_idx ON auth.scim_tokens USING btree (sso_provider_id);
CREATE UNIQUE INDEX scim_tokens_token_hash_key ON auth.scim_tokens USING btree (token_hash);
CREATE INDEX scim_users_created_at_idx ON auth.scim_users USING btree (sso_provider_id, created_at, id) WHERE (deleted_at IS NULL);
CREATE INDEX scim_users_deleted_at_idx ON auth.scim_users USING btree (deleted_at);
CREATE UNIQUE INDEX scim_users_external_id_key ON auth.scim_users USING btree (sso_provider_id, external_id) WHERE ((external_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE INDEX scim_users_id_idx ON auth.scim_users USING btree (sso_provider_id, id) WHERE (deleted_at IS NULL);
CREATE INDEX scim_users_sso_provider_id_idx ON auth.scim_users USING btree (sso_provider_id);
CREATE INDEX scim_users_updated_at_idx ON auth.scim_users USING btree (sso_provider_id, updated_at, id) WHERE (deleted_at IS NULL);
CREATE INDEX scim_users_user_id_idx ON auth.scim_users USING btree (user_id);
CREATE INDEX scim_users_user_name_idx ON auth.scim_users USING btree (sso_provider_id, user_name COLLATE "C", id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX scim_users_user_name_key ON auth.scim_users USING btree (sso_provider_id, user_name) WHERE (deleted_at IS NULL);
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);
CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));
CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);
CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);
CREATE INDEX idx_users_email ON auth.users USING btree (email);
CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);
CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);
CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);
CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);
CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);
CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);
CREATE INDEX f14_media_claims_held_bucket_path_idx ON moderation_private.media_claims USING btree (bucket, ((snapshot ->> 'path'::text))) WHERE (status = 'held'::text);
CREATE INDEX f14_moderation_actions_by_report ON moderation_private.moderation_actions USING btree (report_id, created_at);
CREATE UNIQUE INDEX f14_report_pending_dedupe ON moderation_private.reports USING btree (reporter_user_id, target_kind, target_id) WHERE (status = 'pending'::text);
CREATE INDEX f14_reports_queue ON moderation_private.reports USING btree (status, created_at, id);
CREATE INDEX f14_reports_reporter_rate ON moderation_private.reports USING btree (reporter_user_id, created_at DESC);
CREATE INDEX f14_reports_retention ON moderation_private.reports USING btree (status, resolved_at);
CREATE INDEX f14_blocks_incoming_idx ON public.account_blocks USING btree (blocked_user_id, blocker_user_id);
CREATE INDEX idx_care_completions_care_completed ON public.care_completions USING btree (care_item_id, completed_at DESC, id DESC);
CREATE INDEX idx_care_completions_pet_completed ON public.care_completions USING btree (pet_id, completed_at DESC, id DESC);
CREATE UNIQUE INDEX uq_care_completion_occurrence ON public.care_completions USING btree (care_item_id, scheduled_date, COALESCE(scheduled_time, '00:00:00'::time without time zone));
CREATE INDEX idx_care_items_pet_status_due ON public.care_items USING btree (pet_id, status, due_date, due_time);
CREATE INDEX communities_category_status_idx ON public.communities USING btree (category, status);
CREATE INDEX communities_owner_idx ON public.communities USING btree (owner_user_id);
CREATE INDEX communities_species_status_idx ON public.communities USING btree (species, status);
CREATE INDEX communities_status_created_idx ON public.communities USING btree (status, created_at DESC);
CREATE INDEX community_memberships_display_pet_idx ON public.community_memberships USING btree (display_pet_id);
CREATE UNIQUE INDEX community_memberships_one_owner_idx ON public.community_memberships USING btree (community_id) WHERE (role = 'owner'::text);
CREATE INDEX community_memberships_user_joined_idx ON public.community_memberships USING btree (user_id, joined_at DESC);
CREATE UNIQUE INDEX community_one_owner_idx ON public.community_memberships USING btree (community_id) WHERE (role = 'owner'::text);
CREATE INDEX community_comments_author_idx ON public.community_post_comments USING btree (author_pet_id);
CREATE INDEX community_comments_post_created_idx ON public.community_post_comments USING btree (post_id, created_at, id);
CREATE INDEX community_likes_actor_idx ON public.community_post_likes USING btree (actor_pet_id);
CREATE INDEX community_posts_author_created_idx ON public.community_posts USING btree (author_pet_id, created_at DESC);
CREATE INDEX community_posts_author_user_idx ON public.community_posts USING btree (author_user_id);
CREATE INDEX community_posts_community_created_idx ON public.community_posts USING btree (community_id, created_at DESC, id DESC);
CREATE INDEX idx_follows_follower_following ON public.follows USING btree (follower_id, following_id);
CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);
CREATE INDEX idx_interactions_actor ON public.interactions USING btree (actor_pet_id);
CREATE INDEX idx_interactions_composite ON public.interactions USING btree (actor_pet_id, target_id, action_type, created_at);
CREATE INDEX idx_interactions_target ON public.interactions USING btree (target_id);
CREATE INDEX idx_interactions_type ON public.interactions USING btree (action_type);
CREATE UNIQUE INDEX idx_unique_active_post_likes_saves ON public.interactions USING btree (actor_pet_id, target_id, action_type) WHERE ((target_type = 'post'::text) AND (action_type = ANY (ARRAY['like'::text, 'save'::text])));
CREATE INDEX idx_lost_pet_alerts_pet_created ON public.lost_pet_alerts USING btree (pet_id, created_at DESC);
CREATE UNIQUE INDEX idx_one_active_lost_alert_per_pet ON public.lost_pet_alerts USING btree (pet_id) WHERE (status = 'active'::text);
CREATE INDEX idx_module_validation_intents_module_intent ON public.module_validation_intents USING btree (module_key, intent_key);
CREATE INDEX idx_module_validation_interests_module_created ON public.module_validation_interests USING btree (module_key, created_at DESC);
CREATE INDEX idx_module_validation_views_module_created ON public.module_validation_views USING btree (module_key, created_at DESC);
CREATE INDEX idx_notifications_pet_id ON public.notifications USING btree (pet_id);
CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);
CREATE INDEX idx_pet_documents_pet_status_created ON public.pet_documents USING btree (pet_id, status, created_at DESC, id DESC);
CREATE UNIQUE INDEX pet_place_checkins_one_open_per_pet_idx ON public.pet_place_checkins USING btree (pet_id) WHERE (ended_at IS NULL);
CREATE INDEX pet_place_checkins_pet_history_idx ON public.pet_place_checkins USING btree (pet_id, checked_in_at DESC);
CREATE INDEX pet_place_checkins_place_idx ON public.pet_place_checkins USING btree (place_id, checked_in_at DESC);
CREATE INDEX pet_place_checkins_user_idx ON public.pet_place_checkins USING btree (user_id, checked_in_at DESC);
CREATE INDEX pet_place_presence_place_expiry_idx ON public.pet_place_presence USING btree (place_id, expires_at);
CREATE INDEX pet_place_presence_visible_pet_idx ON public.pet_place_presence USING btree (visible_pet_id);
CREATE INDEX pet_places_status_category_idx ON public.pet_places USING btree (status, category);
CREATE INDEX pet_places_status_coordinates_idx ON public.pet_places USING btree (status, latitude, longitude);
CREATE INDEX idx_pet_sightings_alert_id ON public.pet_sightings USING btree (alert_id);
CREATE INDEX idx_pet_sightings_pet_created ON public.pet_sightings USING btree (pet_id, created_at DESC);
CREATE INDEX idx_pets_owner_id ON public.pets USING btree (owner_id);
CREATE INDEX place_suggestions_status_idx ON public.place_suggestions USING btree (status, created_at);
CREATE INDEX place_suggestions_submitter_idx ON public.place_suggestions USING btree (submitter_user_id, created_at DESC);
CREATE UNIQUE INDEX place_usage_events_map_open_session_idx ON public.place_usage_events USING btree (user_id, session_id, event_type) WHERE (event_type = 'map_open'::text);
CREATE INDEX place_usage_events_place_idx ON public.place_usage_events USING btree (place_id, created_at DESC);
CREATE INDEX place_usage_events_user_created_idx ON public.place_usage_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_post_comments_author ON public.post_comments USING btree (author_pet_id);
CREATE INDEX idx_post_comments_post_created ON public.post_comments USING btree (post_id, created_at);
CREATE INDEX idx_posts_created_at_desc ON public.posts USING btree (created_at DESC);
CREATE INDEX idx_posts_pet_id ON public.posts USING btree (pet_id);
CREATE INDEX idx_posts_tags_gin ON public.posts USING gin (tags);
CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);
CREATE INDEX search_usage_events_user_created_idx ON public.search_usage_events USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);
CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");
CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");
CREATE UNIQUE INDEX idx_objects_current_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (archived_at IS NULL);
CREATE INDEX idx_objects_delete_markers ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE is_delete_marker;
CREATE UNIQUE INDEX idx_objects_null_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (NOT is_versioned);
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
CREATE UNIQUE INDEX objects_bucket_id_name_version_key ON storage.objects USING btree (bucket_id, name COLLATE "C", version) NULLS NOT DISTINCT;
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);
CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER f14_no_unverified_media_purge BEFORE INSERT OR UPDATE OF media_status ON moderation_private.content_restrictions FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_reject_unverified_purged();
CREATE TRIGGER f14_block_after AFTER INSERT ON public.account_blocks FOR EACH ROW EXECUTE FUNCTION private.f14_block_after();
CREATE TRIGGER f14_block_before BEFORE INSERT ON public.account_blocks FOR EACH ROW EXECUTE FUNCTION private.f14_block_before();
CREATE TRIGGER trg_care_items_prepare BEFORE INSERT OR UPDATE ON public.care_items FOR EACH ROW EXECUTE FUNCTION private.prepare_care_item();
CREATE TRIGGER trg_communities_normalize BEFORE INSERT OR UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION community_private.normalize_community_row();
CREATE CONSTRAINT TRIGGER trg_communities_require_owner_membership AFTER INSERT OR UPDATE OF owner_user_id ON public.communities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION community_private.ensure_owner_membership();
CREATE TRIGGER trg_rate_limit_communities BEFORE INSERT ON public.communities FOR EACH ROW EXECUTE FUNCTION private.enforce_social_write_rate_limit();
CREATE TRIGGER f14_memberships_guard BEFORE INSERT ON public.community_memberships FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_community_memberships_count AFTER INSERT OR DELETE ON public.community_memberships FOR EACH ROW EXECUTE FUNCTION community_private.adjust_member_count();
CREATE TRIGGER f14_community_comments_guard BEFORE INSERT ON public.community_post_comments FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_community_comments_count AFTER INSERT OR DELETE ON public.community_post_comments FOR EACH ROW EXECUTE FUNCTION community_private.adjust_community_comment_count();
CREATE TRIGGER trg_rate_limit_community_post_comments BEFORE INSERT ON public.community_post_comments FOR EACH ROW EXECUTE FUNCTION private.enforce_social_write_rate_limit();
CREATE TRIGGER f14_community_likes_guard BEFORE INSERT ON public.community_post_likes FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_community_likes_count AFTER INSERT OR DELETE ON public.community_post_likes FOR EACH ROW EXECUTE FUNCTION community_private.adjust_community_like_count();
CREATE TRIGGER f14_community_posts_guard BEFORE INSERT ON public.community_posts FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_rate_limit_community_posts BEFORE INSERT ON public.community_posts FOR EACH ROW EXECUTE FUNCTION private.enforce_social_write_rate_limit();
CREATE TRIGGER f14_follows_guard BEFORE INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_validate_follow_relationship BEFORE INSERT OR UPDATE OF follower_id, following_id ON public.follows FOR EACH ROW EXECUTE FUNCTION private.validate_follow_relationship();
CREATE TRIGGER f14_interactions_guard BEFORE INSERT ON public.interactions FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_guard_comment_interaction_insert BEFORE INSERT ON public.interactions FOR EACH ROW EXECUTE FUNCTION private.guard_comment_interaction_insert();
CREATE TRIGGER trg_normalize_post_interaction_before_insert BEFORE INSERT ON public.interactions FOR EACH ROW EXECUTE FUNCTION private.normalize_post_interaction_before_insert();
CREATE TRIGGER trg_process_reversible_interaction_side_effects AFTER INSERT OR DELETE ON public.interactions FOR EACH ROW EXECUTE FUNCTION private.process_reversible_interaction_side_effects();
CREATE TRIGGER trg_module_validation_intents_updated_at BEFORE UPDATE ON public.module_validation_intents FOR EACH ROW EXECUTE FUNCTION validation_private.touch_validation_intent_updated_at();
CREATE TRIGGER trg_prepare_pet_document BEFORE INSERT OR UPDATE ON public.pet_documents FOR EACH ROW EXECUTE FUNCTION document_private.prepare_pet_document();
CREATE TRIGGER trg_pet_place_checkins_normalize_update BEFORE UPDATE ON public.pet_place_checkins FOR EACH ROW EXECUTE FUNCTION place_private.normalize_checkin_update();
CREATE TRIGGER trg_pet_place_checkins_prepare_insert BEFORE INSERT ON public.pet_place_checkins FOR EACH ROW EXECUTE FUNCTION place_private.prepare_checkin_insert();
CREATE TRIGGER trg_pet_place_checkins_sync_presence AFTER INSERT OR DELETE OR UPDATE ON public.pet_place_checkins FOR EACH ROW EXECUTE FUNCTION place_private.sync_place_presence();
CREATE TRIGGER trg_pet_places_normalize BEFORE INSERT OR UPDATE ON public.pet_places FOR EACH ROW EXECUTE FUNCTION place_private.normalize_place_row();
CREATE TRIGGER trg_ensure_pet_public_link AFTER INSERT ON public.pets FOR EACH ROW EXECUTE FUNCTION private.ensure_pet_public_link();
CREATE TRIGGER trg_sync_pet_public_profile_to_posts AFTER UPDATE OF name, species, photo_url ON public.pets FOR EACH ROW EXECUTE FUNCTION private.sync_pet_public_profile_to_posts();
CREATE TRIGGER trg_place_suggestions_normalize BEFORE INSERT ON public.place_suggestions FOR EACH ROW EXECUTE FUNCTION place_private.normalize_place_suggestion();
CREATE TRIGGER trg_rate_limit_place_suggestions BEFORE INSERT ON public.place_suggestions FOR EACH ROW EXECUTE FUNCTION private.enforce_social_write_rate_limit();
CREATE TRIGGER f14_comments_guard BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER trg_normalize_post_comment_before_insert BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.normalize_post_comment_before_insert();
CREATE TRIGGER trg_process_post_comment_side_effects AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.process_post_comment_side_effects();
CREATE TRIGGER trg_rate_limit_post_comments BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.enforce_social_write_rate_limit();
CREATE TRIGGER trg_normalize_post_before_insert BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION private.normalize_post_before_insert();
CREATE TRIGGER trg_rate_limit_posts BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION private.enforce_social_write_rate_limit();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_bucket_control_insert BEFORE INSERT ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.protect_bucket_control_columns('service_role');
CREATE TRIGGER protect_bucket_control_update BEFORE UPDATE OF lifecycle_configuration, lifecycle_configuration_generation ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.protect_bucket_control_columns();
CREATE TRIGGER protect_bucket_control_update_role AFTER UPDATE OF lifecycle_configuration, lifecycle_configuration_generation ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_lifecycle_service_role('service_role');
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();
CREATE POLICY "f14_blocks_delete" ON "public"."account_blocks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((blocker_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "f14_blocks_insert" ON "public"."account_blocks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((blocker_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "f14_blocks_select" ON "public"."account_blocks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((blocker_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "care_completions_owner_select" ON "public"."care_completions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((pet_id IN ( SELECT p.id
   FROM pets p
  WHERE (p.owner_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "care_items_owner_insert" ON "public"."care_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((status = 'active'::text) AND (pet_id IN ( SELECT p.id
   FROM pets p
  WHERE (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "care_items_owner_select" ON "public"."care_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((pet_id IN ( SELECT p.id
   FROM pets p
  WHERE (p.owner_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "care_items_owner_update_active" ON "public"."care_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((status = 'active'::text) AND (pet_id IN ( SELECT p.id
   FROM pets p
  WHERE (p.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK (((status = 'active'::text) AND (pet_id IN ( SELECT p.id
   FROM pets p
  WHERE (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "communities_insert_owner" ON "public"."communities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "communities_read_authenticated" ON "public"."communities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((status = 'active'::text) OR (owner_user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "communities_update_owner" ON "public"."communities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((owner_user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "f14_communities_select" ON "public"."communities" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (f14_can_interact(owner_user_id));
CREATE POLICY "community_memberships_delete_self_or_owner" ON "public"."community_memberships" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((((user_id = ( SELECT auth.uid() AS uid)) AND (role = 'member'::text)) OR ((role = 'member'::text) AND (EXISTS ( SELECT 1
   FROM communities c
  WHERE ((c.id = community_memberships.community_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "community_memberships_insert_self" ON "public"."community_memberships" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (display_pet_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_memberships.display_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM communities c
  WHERE ((c.id = community_memberships.community_id) AND (c.status = 'active'::text) AND ((community_memberships.role = 'member'::text) OR ((community_memberships.role = 'owner'::text) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))))));
CREATE POLICY "community_memberships_read_authenticated" ON "public"."community_memberships" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM communities c
  WHERE ((c.id = community_memberships.community_id) AND ((c.status = 'active'::text) OR (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_memberships_update_display_pet" ON "public"."community_memberships" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_memberships.display_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "f14_memberships_select" ON "public"."community_memberships" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (f14_can_interact(user_id));
CREATE POLICY "community_comments_delete_author_or_owner" ON "public"."community_post_comments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_post_comments.author_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (community_posts cp
     JOIN communities c ON ((c.id = cp.community_id)))
  WHERE ((cp.id = community_post_comments.post_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_comments_insert_member" ON "public"."community_post_comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_post_comments.author_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM ((community_posts cp
     JOIN communities c ON ((c.id = cp.community_id)))
     JOIN community_memberships m ON ((m.community_id = c.id)))
  WHERE ((cp.id = community_post_comments.post_id) AND (c.status = 'active'::text) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_comments_read_authenticated" ON "public"."community_post_comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (community_posts cp
     JOIN communities c ON ((c.id = cp.community_id)))
  WHERE ((cp.id = community_post_comments.post_id) AND ((c.status = 'active'::text) OR (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "f14_community_comments_select" ON "public"."community_post_comments" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((f14_can_interact(( SELECT pets.owner_id
   FROM pets
  WHERE (pets.id = community_post_comments.author_pet_id))) AND f14_can_interact(( SELECT community_posts.author_user_id
   FROM community_posts
  WHERE (community_posts.id = community_post_comments.post_id)))));
CREATE POLICY "f14_moderated_community_comments_select" ON "public"."community_post_comments" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((f14_content_visible('community_comment'::text, id) AND f14_content_visible('pet_profile'::text, author_pet_id) AND (EXISTS ( SELECT 1
   FROM community_posts parent
  WHERE (parent.id = community_post_comments.post_id)))));
CREATE POLICY "community_likes_delete_own" ON "public"."community_post_likes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_post_likes.actor_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "community_likes_insert_member" ON "public"."community_post_likes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_post_likes.actor_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM ((community_posts cp
     JOIN communities c ON ((c.id = cp.community_id)))
     JOIN community_memberships m ON ((m.community_id = c.id)))
  WHERE ((cp.id = community_post_likes.post_id) AND (c.status = 'active'::text) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_likes_read_own" ON "public"."community_post_likes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_post_likes.actor_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "community_posts_delete_author_or_owner" ON "public"."community_posts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((author_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM communities c
  WHERE ((c.id = community_posts.community_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_posts_insert_member" ON "public"."community_posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((author_user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = community_posts.author_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM (communities c
     JOIN community_memberships m ON ((m.community_id = c.id)))
  WHERE ((c.id = community_posts.community_id) AND (c.status = 'active'::text) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_posts_read_authenticated" ON "public"."community_posts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM communities c
  WHERE ((c.id = community_posts.community_id) AND ((c.status = 'active'::text) OR (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "f14_community_posts_select" ON "public"."community_posts" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((f14_can_interact(author_user_id) AND f14_can_interact(( SELECT communities.owner_user_id
   FROM communities
  WHERE (communities.id = community_posts.community_id)))));
CREATE POLICY "f14_moderated_community_posts_select" ON "public"."community_posts" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((f14_content_visible('community_post'::text, id) AND f14_content_visible('pet_profile'::text, author_pet_id)));
CREATE POLICY "follows_owner_delete" ON "public"."follows" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = follows.follower_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "follows_owner_insert" ON "public"."follows" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((follower_id <> following_id) AND (EXISTS ( SELECT 1
   FROM pets follower
  WHERE ((follower.id = follows.follower_id) AND (follower.owner_id = ( SELECT auth.uid() AS uid))))) AND (NOT (EXISTS ( SELECT 1
   FROM (pets follower
     JOIN pets following ON ((following.id = follows.following_id)))
  WHERE ((follower.id = follows.follower_id) AND (follower.owner_id = following.owner_id)))))));
CREATE POLICY "follows_public_read" ON "public"."follows" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "f14_hidden_delete" ON "public"."hidden_posts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "f14_hidden_insert" ON "public"."hidden_posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "f14_hidden_select" ON "public"."hidden_posts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "interactions_delete_owner_policy" ON "public"."interactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((target_type = 'post'::text) AND (action_type = ANY (ARRAY['like'::text, 'save'::text])) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = interactions.actor_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "interactions_insert_owner_policy" ON "public"."interactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = interactions.actor_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "interactions_select_owner_policy" ON "public"."interactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = interactions.actor_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "lost_pet_alerts_owner_select" ON "public"."lost_pet_alerts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = lost_pet_alerts.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "module_validation_intents_insert_own" ON "public"."module_validation_intents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "module_validation_intents_select_own" ON "public"."module_validation_intents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "module_validation_intents_update_own" ON "public"."module_validation_intents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "module_validation_interests_community_extension_eligibility" ON "public"."module_validation_interests" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (((module_key <> ALL (ARRAY['communities_events'::text, 'communities_challenges'::text, 'communities_badges'::text, 'communities_qa'::text, 'communities_admin_tools'::text])) OR ((module_key = ANY (ARRAY['communities_events'::text, 'communities_challenges'::text, 'communities_badges'::text, 'communities_qa'::text])) AND (((source = 'community_info_member'::text) AND (EXISTS ( SELECT 1
   FROM (community_memberships m
     JOIN communities c ON ((c.id = m.community_id)))
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'member'::text) AND (c.status = 'active'::text))))) OR ((source = 'community_info_owner'::text) AND (EXISTS ( SELECT 1
   FROM (community_memberships m
     JOIN communities c ON ((c.id = m.community_id)))
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'active'::text))))))) OR ((module_key = 'communities_admin_tools'::text) AND (source = 'community_info_owner'::text) AND (EXISTS ( SELECT 1
   FROM (community_memberships m
     JOIN communities c ON ((c.id = m.community_id)))
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'active'::text)))))));
CREATE POLICY "module_validation_interests_insert_own" ON "public"."module_validation_interests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "module_validation_interests_select_own" ON "public"."module_validation_interests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "module_validation_views_community_extension_eligibility" ON "public"."module_validation_views" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (((module_key <> ALL (ARRAY['communities_events'::text, 'communities_challenges'::text, 'communities_badges'::text, 'communities_qa'::text, 'communities_admin_tools'::text])) OR ((module_key = ANY (ARRAY['communities_events'::text, 'communities_challenges'::text, 'communities_badges'::text, 'communities_qa'::text])) AND (((source = 'community_info_member'::text) AND (EXISTS ( SELECT 1
   FROM (community_memberships m
     JOIN communities c ON ((c.id = m.community_id)))
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'member'::text) AND (c.status = 'active'::text))))) OR ((source = 'community_info_owner'::text) AND (EXISTS ( SELECT 1
   FROM (community_memberships m
     JOIN communities c ON ((c.id = m.community_id)))
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'active'::text))))))) OR ((module_key = 'communities_admin_tools'::text) AND (source = 'community_info_owner'::text) AND (EXISTS ( SELECT 1
   FROM (community_memberships m
     JOIN communities c ON ((c.id = m.community_id)))
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'active'::text)))))));
CREATE POLICY "module_validation_views_insert_own" ON "public"."module_validation_views" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notifications_owner_select" ON "public"."notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "notifications_owner_update" ON "public"."notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "pet_documents_owner_select" ON "public"."pet_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_documents.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_documents_owner_update" ON "public"."pet_documents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_documents.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_documents.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "pet_place_checkins_insert_own_pet" ON "public"."pet_place_checkins" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_place_checkins.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM pet_places pp
  WHERE ((pp.id = pet_place_checkins.place_id) AND (pp.status = 'active'::text))))));
CREATE POLICY "pet_place_checkins_read_own" ON "public"."pet_place_checkins" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "pet_place_checkins_update_own_active" ON "public"."pet_place_checkins" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) AND (ended_at IS NULL) AND (expires_at > now()))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "pet_place_presence_read_active" ON "public"."pet_place_presence" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((expires_at > now()) AND (EXISTS ( SELECT 1
   FROM pet_places pp
  WHERE ((pp.id = pet_place_presence.place_id) AND (pp.status = 'active'::text))))));
CREATE POLICY "pet_places_read_active" ON "public"."pet_places" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING ((status = 'active'::text));
CREATE POLICY "pet_private_details_owner_insert" ON "public"."pet_private_details" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_details.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_private_details_owner_select" ON "public"."pet_private_details" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_details.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_private_details_owner_update" ON "public"."pet_private_details" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_details.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_details.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_private_metrics_owner_insert" ON "public"."pet_private_metrics" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_metrics.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_private_metrics_owner_select" ON "public"."pet_private_metrics" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_metrics.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_private_metrics_owner_update" ON "public"."pet_private_metrics" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_metrics.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_private_metrics.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_public_links_owner_select" ON "public"."pet_public_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_public_links.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "pet_sightings_owner_select" ON "public"."pet_sightings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = pet_sightings.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "f14_moderated_pets_select" ON "public"."pets" AS RESTRICTIVE FOR SELECT TO PUBLIC USING (f14_content_visible('pet_profile'::text, id));
CREATE POLICY "pets_owner_insert" ON "public"."pets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "pets_owner_update" ON "public"."pets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "pets_public_read" ON "public"."pets" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "place_suggestions_insert_self" ON "public"."place_suggestions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((submitter_user_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)));
CREATE POLICY "place_usage_events_insert_self" ON "public"."place_usage_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "f14_moderated_comments_select" ON "public"."post_comments" AS RESTRICTIVE FOR SELECT TO PUBLIC USING ((f14_content_visible('feed_comment'::text, id) AND f14_content_visible('pet_profile'::text, author_pet_id) AND (EXISTS ( SELECT 1
   FROM posts parent
  WHERE (parent.id = post_comments.post_id)))));
CREATE POLICY "post_comments_owner_delete" ON "public"."post_comments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = post_comments.author_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "post_comments_owner_insert" ON "public"."post_comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = post_comments.author_pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "post_comments_public_read" ON "public"."post_comments" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "f14_moderated_posts_select" ON "public"."posts" AS RESTRICTIVE FOR SELECT TO PUBLIC USING ((f14_content_visible('feed_post'::text, id) AND ((pet_id IS NULL) OR f14_content_visible('pet_profile'::text, pet_id))));
CREATE POLICY "posts_owner_insert" ON "public"."posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM pets p
  WHERE ((p.id = posts.pet_id) AND (p.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "posts_public_read" ON "public"."posts" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "profiles_owner_update" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "profiles_public_read" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true);
CREATE POLICY "search_usage_events_insert_own" ON "public"."search_usage_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Public Read Access" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = 'post-photos'::text));
CREATE POLICY "community_avatar_owner_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'community-avatars'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM communities c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[1]) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_avatar_owner_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'community-avatars'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM communities c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[1]) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "community_post_photo_author_or_owner_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'community-post-photos'::text) AND (((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) OR (EXISTS ( SELECT 1
   FROM communities c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[1]) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "community_post_photo_member_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'community-post-photos'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM (communities c
     JOIN community_memberships m ON ((m.community_id = c.id)))
  WHERE (((c.id)::text = (storage.foldername(objects.name))[1]) AND (c.status = 'active'::text) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "f14_held_media_copy_source_select" ON "storage"."objects" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (((NOT storage.allow_any_operation(ARRAY['storage.object.copy'::text, 'storage.s3.object.copy'::text, 'storage.s3.upload.part_copy'::text])) OR f14_storage_media_path_unclaimed(bucket_id, name)));
CREATE POLICY "f14_media_claim_restrict_delete" ON "storage"."objects" AS RESTRICTIVE FOR DELETE TO "authenticated" USING (f14_storage_media_path_unclaimed(bucket_id, name));
CREATE POLICY "f14_media_claim_restrict_insert" ON "storage"."objects" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (f14_storage_media_path_unclaimed(bucket_id, name));
CREATE POLICY "f14_media_claim_restrict_update" ON "storage"."objects" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (f14_storage_media_path_unclaimed(bucket_id, name)) WITH CHECK (f14_storage_media_path_unclaimed(bucket_id, name));
CREATE POLICY "pet_avatars_owner_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'pet-avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "pet_avatars_owner_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'pet-avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "pet_documents_storage_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'pet-documents'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM (pet_documents d
     JOIN pets pet ON ((pet.id = d.pet_id)))
  WHERE ((d.storage_path = objects.name) AND (d.status = ANY (ARRAY['uploading'::text, 'deleting'::text])) AND (pet.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "pet_documents_storage_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'pet-documents'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM (pet_documents d
     JOIN pets pet ON ((pet.id = d.pet_id)))
  WHERE ((d.storage_path = objects.name) AND (d.status = 'uploading'::text) AND ((d.pet_id)::text = (storage.foldername(objects.name))[2]) AND (pet.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "pet_documents_storage_select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'pet-documents'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM (pet_documents d
     JOIN pets pet ON ((pet.id = d.pet_id)))
  WHERE ((d.storage_path = objects.name) AND (d.status = ANY (ARRAY['active'::text, 'deleting'::text])) AND (pet.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "post_photos_owner_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'post-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "post_photos_owner_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'post-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
ALTER TABLE "account_requests_private"."deletion_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "community_private"."ownership_transfer_offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "moderation_private"."media_claim_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "moderation_private"."media_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."account_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."care_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."care_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_post_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_post_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."hidden_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lost_pet_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."module_validation_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."module_validation_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."module_validation_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_place_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_place_presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_places" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_private_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_private_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_public_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pet_sightings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."place_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."place_usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."search_usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA "account_requests_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "account_requests_private" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "account_requests_private" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "auth" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT CREATE,USAGE ON SCHEMA "auth" TO "supabase_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "auth" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "auth" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "auth" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "auth" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT CREATE,USAGE ON SCHEMA "auth" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT CREATE,USAGE ON SCHEMA "auth" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "care_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "care_private" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "care_private" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "care_private" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "community_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "community_private" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "document_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "document_private" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "document_private" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "document_private" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "moderation_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "moderation_private" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "place_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "place_private" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "private" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "public" FROM PUBLIC;
SET SESSION AUTHORIZATION "pg_database_owner"; GRANT USAGE ON SCHEMA "public" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "pg_database_owner"; GRANT CREATE,USAGE ON SCHEMA "public" TO "pg_database_owner"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "pg_database_owner"; GRANT USAGE ON SCHEMA "public" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "pg_database_owner"; GRANT USAGE ON SCHEMA "public" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "pg_database_owner"; GRANT USAGE ON SCHEMA "public" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "pg_database_owner"; GRANT USAGE ON SCHEMA "public" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "rescue_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "rescue_private" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "rescue_private" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "rescue_private" TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "storage" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT CREATE,USAGE ON SCHEMA "storage" TO "supabase_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "storage" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "storage" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT USAGE ON SCHEMA "storage" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT CREATE,USAGE ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_admin"; GRANT CREATE,USAGE ON SCHEMA "storage" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SCHEMA "validation_private" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT CREATE,USAGE ON SCHEMA "validation_private" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SCHEMA "validation_private" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."aal_level" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."aal_level" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."aal_level" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."code_challenge_method" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."code_challenge_method" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."code_challenge_method" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."factor_status" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."factor_status" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."factor_status" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."factor_type" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."factor_type" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."factor_type" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."oauth_authorization_status" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_authorization_status" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_authorization_status" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."oauth_client_type" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_client_type" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_client_type" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."oauth_registration_type" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_registration_type" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_registration_type" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."oauth_response_type" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_response_type" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."oauth_response_type" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "auth"."one_time_token_type" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."one_time_token_type" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT USAGE ON TYPE "auth"."one_time_token_type" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TYPE "storage"."buckettype" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT USAGE ON TYPE "storage"."buckettype" TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT USAGE ON TYPE "storage"."buckettype" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "account_requests_private"."deletion_requests" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "account_requests_private"."deletion_requests" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "account_requests_private"."deletion_requests" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."audit_log_entries" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."audit_log_entries" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."audit_log_entries" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."custom_oauth_providers" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."custom_oauth_providers" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."custom_oauth_providers" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."custom_oauth_providers" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."flow_state" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."flow_state" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."flow_state" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."flow_state" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."identities" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."identities" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."identities" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."identities" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."instances" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."instances" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."instances" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."instances" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."mfa_amr_claims" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."mfa_challenges" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_challenges" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_challenges" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."mfa_factors" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_factors" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_factors" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."mfa_recovery_code_sets" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_recovery_code_sets" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_recovery_code_sets" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_recovery_code_sets" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."mfa_recovery_codes" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_recovery_codes" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_recovery_codes" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_recovery_codes" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."oauth_authorizations" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_authorizations" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_authorizations" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_authorizations" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."oauth_client_states" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_client_states" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_client_states" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_client_states" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."oauth_clients" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_clients" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_clients" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_clients" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."oauth_consents" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_consents" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_consents" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_consents" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."one_time_tokens" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."one_time_tokens" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."one_time_tokens" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."refresh_tokens" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."refresh_tokens" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."refresh_tokens" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."saml_providers" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_providers" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_providers" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_providers" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."saml_relay_states" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_relay_states" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_relay_states" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."schema_migrations" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."schema_migrations" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."scim_tokens" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."scim_tokens" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."scim_tokens" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."scim_tokens" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."scim_users" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."scim_users" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."scim_users" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."scim_users" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."sessions" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sessions" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sessions" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sessions" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."sso_domains" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_domains" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_domains" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_domains" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."sso_providers" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_providers" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_providers" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_providers" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."users" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."users" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."users" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."users" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."webauthn_challenges" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_challenges" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_challenges" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_challenges" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "auth"."webauthn_credentials" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_credentials" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_credentials" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_credentials" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "community_private"."ownership_transfer_offers" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "community_private"."ownership_transfer_offers" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "moderation_private"."content_restrictions" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."content_restrictions" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."content_restrictions" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "moderation_private"."media_claim_events" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."media_claim_events" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "moderation_private"."media_claims" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."media_claims" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "moderation_private"."moderation_actions" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."moderation_actions" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."moderation_actions" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "moderation_private"."moderator_grants" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."moderator_grants" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."moderator_grants" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "moderation_private"."reports" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."reports" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "moderation_private"."reports" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."account_blocks" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."account_blocks" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,SELECT ON TABLE "public"."account_blocks" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."account_blocks" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."care_completions" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."care_completions" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."care_completions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."care_completions" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."care_items" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."care_items" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."care_items" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."communities" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."communities" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."communities" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."community_memberships" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_memberships" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,SELECT ON TABLE "public"."community_memberships" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_memberships" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."community_post_comments" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_post_comments" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,SELECT ON TABLE "public"."community_post_comments" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_post_comments" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."community_post_likes" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_post_likes" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,SELECT ON TABLE "public"."community_post_likes" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_post_likes" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."community_posts" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_posts" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,SELECT ON TABLE "public"."community_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_posts" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."follows" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."follows" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."follows" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,SELECT ON TABLE "public"."follows" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."follows" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."hidden_posts" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hidden_posts" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,SELECT ON TABLE "public"."hidden_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hidden_posts" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."interactions" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."interactions" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,SELECT ON TABLE "public"."interactions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."interactions" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."lost_pet_alerts" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lost_pet_alerts" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."lost_pet_alerts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."lost_pet_alerts" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."module_validation_intents" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."module_validation_intents" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."module_validation_intents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."module_validation_intents" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."module_validation_interests" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."module_validation_interests" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT,SELECT ON TABLE "public"."module_validation_interests" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."module_validation_interests" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."module_validation_views" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."module_validation_views" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ON TABLE "public"."module_validation_views" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."module_validation_views" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."notifications" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."notifications" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_documents" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_documents" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."pet_documents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_documents" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_place_checkins" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_place_checkins" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_place_checkins" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_place_presence" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_place_presence" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_place_presence" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_places" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_places" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."pet_places" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."pet_places" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_places" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_private_details" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_private_details" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT,SELECT,UPDATE ON TABLE "public"."pet_private_details" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_private_details" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_private_metrics" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_private_metrics" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT,SELECT,UPDATE ON TABLE "public"."pet_private_metrics" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_private_metrics" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_public_links" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_public_links" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."pet_public_links" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_public_links" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pet_sightings" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_sightings" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."pet_sightings" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pet_sightings" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."pets" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pets" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pets" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."place_suggestions" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."place_suggestions" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."place_suggestions" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."place_usage_events" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."place_usage_events" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."place_usage_events" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."post_comments" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."post_comments" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."post_comments" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,SELECT ON TABLE "public"."post_comments" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."post_comments" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."posts" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."posts" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."posts" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ON TABLE "public"."posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."posts" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."profiles" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "public"."search_usage_events" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."search_usage_events" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."search_usage_events" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."buckets" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."buckets_analytics" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."buckets_vectors" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_vectors" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."migrations" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."migrations" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."objects" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."s3_multipart_uploads" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."s3_multipart_uploads_parts" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads_parts" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "storage"."vector_indexes" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."vector_indexes" TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "validation_private"."intent_options" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "validation_private"."intent_options" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "validation_private"."intent_options" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON TABLE "validation_private"."modules" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "validation_private"."modules" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLE "validation_private"."modules" TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT,UPDATE,USAGE ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT,UPDATE,USAGE ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT SELECT,UPDATE,USAGE ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON SEQUENCE "moderation_private"."media_claim_events_id_seq" FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT USAGE ON SEQUENCE "moderation_private"."media_claim_events_id_seq" TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."activate_lost_pet_alert"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."activate_lost_pet_alert"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."activate_lost_pet_alert"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."activate_lost_pet_alert"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."archive_care_item"(p_care_item_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."archive_care_item"(p_care_item_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."archive_care_item"(p_care_item_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."archive_care_item"(p_care_item_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."begin_delete_pet_document"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."begin_delete_pet_document"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."begin_delete_pet_document"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."begin_delete_pet_document"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."begin_pet_document_upload"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."begin_pet_document_upload"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."begin_pet_document_upload"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."begin_pet_document_upload"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."cancel_delete_pet_document"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."cancel_delete_pet_document"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."cancel_delete_pet_document"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."cancel_delete_pet_document"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."cancel_pet_document_upload"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."cancel_pet_document_upload"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."cancel_pet_document_upload"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."cancel_pet_document_upload"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."complete_care_item"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."complete_care_item"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."complete_care_item"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."complete_care_item"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."create_community"(p_name text, p_description text, p_category text, p_species text, p_zone text, p_rules text, p_display_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."create_community"(p_name text, p_description text, p_category text, p_species text, p_zone text, p_rules text, p_display_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."create_community"(p_name text, p_description text, p_category text, p_species text, p_zone text, p_rules text, p_display_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."create_community"(p_name text, p_description text, p_category text, p_species text, p_zone text, p_rules text, p_display_pet_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."create_pet_profile"(p_name text, p_species text, p_age text, p_photo_url text, p_zone text, p_interests text[], p_bio text, p_breed text, p_gender text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."create_pet_profile"(p_name text, p_species text, p_age text, p_photo_url text, p_zone text, p_interests text[], p_bio text, p_breed text, p_gender text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."create_pet_profile"(p_name text, p_species text, p_age text, p_photo_url text, p_zone text, p_interests text[], p_bio text, p_breed text, p_gender text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."create_pet_profile"(p_name text, p_species text, p_age text, p_photo_url text, p_zone text, p_interests text[], p_bio text, p_breed text, p_gender text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_can_interact"(p_target uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_can_interact"(p_target uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_can_interact"(p_target uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_can_interact"(p_target uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_confirm_media_cleanup"(p_kind text, p_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_confirm_media_cleanup"(p_kind text, p_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_content_visible"(p_kind text, p_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_content_visible"(p_kind text, p_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_content_visible"(p_kind text, p_id uuid) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_content_visible"(p_kind text, p_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_content_visible"(p_kind text, p_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_get_media_claim_evidence"(p_claim uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_get_media_claim_evidence"(p_claim uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_get_media_claim_evidence"(p_claim uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_is_moderator"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_is_moderator"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_is_moderator"() TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_is_moderator"() TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_media_task"(p_kind text, p_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_media_task"(p_kind text, p_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_media_task"(p_kind text, p_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_media_task"(p_kind text, p_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_moderation_media_gate"(p_kind text, p_target uuid, p_bucket text, p_path text, p_url text, p_stage text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_moderation_media_gate"(p_kind text, p_target uuid, p_bucket text, p_path text, p_url text, p_stage text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_moderation_media_gate"(p_kind text, p_target uuid, p_bucket text, p_path text, p_url text, p_stage text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_moderation_queue"(p_limit integer, p_offset integer) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_moderation_queue"(p_limit integer, p_offset integer) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_moderation_queue"(p_limit integer, p_offset integer) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_moderation_queue"(p_limit integer, p_offset integer) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_my_blocked_accounts"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_my_blocked_accounts"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_my_blocked_accounts"() TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_my_blocked_accounts"() TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_pending_media"(p_limit integer) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_pending_media"(p_limit integer) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_pending_media"(p_limit integer) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_pending_media"(p_limit integer) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_prepare_media_claim"(p_kind text, p_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_prepare_media_claim"(p_kind text, p_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_prepare_media_claim"(p_kind text, p_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_recheck_media_claim"(p_claim uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_recheck_media_claim"(p_claim uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_recheck_media_claim"(p_claim uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_review_report"(p_report uuid, p_action text, p_note text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_review_report"(p_report uuid, p_action text, p_note text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_review_report"(p_report uuid, p_action text, p_note text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_review_report"(p_report uuid, p_action text, p_note text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_storage_media_path_unclaimed"(p_bucket text, p_path text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_storage_media_path_unclaimed"(p_bucket text, p_path text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_storage_media_path_unclaimed"(p_bucket text, p_path text) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."f14_submit_report"(p_kind text, p_target uuid, p_reason text, p_details text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_submit_report"(p_kind text, p_target uuid, p_reason text, p_details text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_submit_report"(p_kind text, p_target uuid, p_reason text, p_details text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."f14_submit_report"(p_kind text, p_target uuid, p_reason text, p_details text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."finalize_delete_pet_document"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."finalize_delete_pet_document"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."finalize_delete_pet_document"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."finalize_delete_pet_document"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."finalize_pet_document_upload"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."finalize_pet_document_upload"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."finalize_pet_document_upload"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."finalize_pet_document_upload"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."get_pet_founder_status"(p_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_pet_founder_status"(p_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_pet_founder_status"(p_pet_id uuid) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_pet_founder_status"(p_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_pet_founder_status"(p_pet_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."get_public_pet_rescue_profile"(p_token uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_public_pet_rescue_profile"(p_token uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_public_pet_rescue_profile"(p_token uuid) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_public_pet_rescue_profile"(p_token uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_public_pet_rescue_profile"(p_token uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."get_recommended_posts"(p_actor_pet_id uuid, p_limit integer) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_recommended_posts"(p_actor_pet_id uuid, p_limit integer) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_recommended_posts"(p_actor_pet_id uuid, p_limit integer) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_recommended_posts"(p_actor_pet_id uuid, p_limit integer) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."get_recommended_posts_page"(p_actor_pet_id uuid, p_limit integer, p_offset integer) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_recommended_posts_page"(p_actor_pet_id uuid, p_limit integer, p_offset integer) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_recommended_posts_page"(p_actor_pet_id uuid, p_limit integer, p_offset integer) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."get_recommended_posts_page"(p_actor_pet_id uuid, p_limit integer, p_offset integer) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_archive_owned_communities_for_deletion"(p_subject_user_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_archive_owned_communities_for_deletion"(p_subject_user_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_archive_owned_communities_for_deletion"(p_subject_user_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_community_accept_transfer"(p_community_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_accept_transfer"(p_community_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_accept_transfer"(p_community_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_accept_transfer"(p_community_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_community_decline_transfer"(p_community_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_decline_transfer"(p_community_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_decline_transfer"(p_community_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_decline_transfer"(p_community_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_community_offer_transfer"(p_community_id uuid, p_candidate_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_offer_transfer"(p_community_id uuid, p_candidate_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_offer_transfer"(p_community_id uuid, p_candidate_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_offer_transfer"(p_community_id uuid, p_candidate_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_community_set_admin"(p_community_id uuid, p_member_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_set_admin"(p_community_id uuid, p_member_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_set_admin"(p_community_id uuid, p_member_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_set_admin"(p_community_id uuid, p_member_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_community_transfer_offer"(p_community_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_transfer_offer"(p_community_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_transfer_offer"(p_community_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_community_transfer_offer"(p_community_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_deletion_cancel"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_cancel"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_cancel"() TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_cancel"() TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_deletion_request"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_request"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_request"() TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_request"() TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_deletion_status"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_status"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_status"() TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_deletion_status"() TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."pazo_ensure_my_profile"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_ensure_my_profile"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_ensure_my_profile"() TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."pazo_ensure_my_profile"() TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."register_interaction_signal"(p_actor_pet_id uuid, p_target_id uuid, p_action_type text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."register_interaction_signal"(p_actor_pet_id uuid, p_target_id uuid, p_action_type text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."register_interaction_signal"(p_actor_pet_id uuid, p_target_id uuid, p_action_type text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."register_interaction_signal"(p_actor_pet_id uuid, p_target_id uuid, p_action_type text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."resolve_lost_pet_alert"(p_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."resolve_lost_pet_alert"(p_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."resolve_lost_pet_alert"(p_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."resolve_lost_pet_alert"(p_pet_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."rotate_pet_public_link"(p_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."rotate_pet_public_link"(p_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."rotate_pet_public_link"(p_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."rotate_pet_public_link"(p_pet_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."submit_pet_sighting"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."submit_pet_sighting"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."submit_pet_sighting"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."submit_pet_sighting"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."submit_pet_sighting"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."try_finalize_delete_pet_document"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."try_finalize_delete_pet_document"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."try_finalize_delete_pet_document"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."try_finalize_delete_pet_document"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."undo_care_completion"(p_completion_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."undo_care_completion"(p_completion_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."undo_care_completion"(p_completion_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."undo_care_completion"(p_completion_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "public"."update_pet_profile"(p_pet_id uuid, p_name text, p_species text, p_age text, p_photo_url text, p_bio text, p_breed text, p_gender text, p_zone text, p_interests text[], p_weight text, p_diet_plan text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."update_pet_profile"(p_pet_id uuid, p_name text, p_species text, p_age text, p_photo_url text, p_bio text, p_breed text, p_gender text, p_zone text, p_interests text[], p_weight text, p_diet_plan text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."update_pet_profile"(p_pet_id uuid, p_name text, p_species text, p_age text, p_photo_url text, p_bio text, p_breed text, p_gender text, p_zone text, p_interests text[], p_weight text, p_diet_plan text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "public"."update_pet_profile"(p_pet_id uuid, p_name text, p_species text, p_age text, p_photo_url text, p_bio text, p_breed text, p_gender text, p_zone text, p_interests text[], p_weight text, p_diet_plan text) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "moderation_private"."f14_media_probe"(p_kind text, p_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "moderation_private"."f14_media_probe"(p_kind text, p_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "moderation_private"."f14_reject_unverified_purged"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "moderation_private"."f14_reject_unverified_purged"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "moderation_private"."is_removed"(p_kind text, p_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "moderation_private"."is_removed"(p_kind text, p_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "auth"."email"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."email"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."email"() TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."email"() TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "auth"."jwt"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."jwt"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."jwt"() TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."jwt"() TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."jwt"() TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "auth"."role"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."role"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."role"() TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."role"() TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "auth"."uid"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."uid"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."uid"() TO "supabase_auth_admin"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_auth_admin"; GRANT EXECUTE ON FUNCTION "auth"."uid"() TO "dashboard_user"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."allow_any_operation"(expected_operations text[]) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."allow_any_operation"(expected_operations text[]) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."allow_any_operation"(expected_operations text[]) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."allow_only_operation"(expected_operation text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."allow_only_operation"(expected_operation text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."allow_only_operation"(expected_operation text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."can_insert_object"(bucketid text, name text, owner uuid, metadata jsonb) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."can_insert_object"(bucketid text, name text, owner uuid, metadata jsonb) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."can_insert_object"(bucketid text, name text, owner uuid, metadata jsonb) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."enforce_bucket_lifecycle_service_role"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."enforce_bucket_lifecycle_service_role"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."enforce_bucket_lifecycle_service_role"() TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."enforce_bucket_name_length"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."enforce_bucket_name_length"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."enforce_bucket_name_length"() TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."extension"(name text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."extension"(name text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."extension"(name text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."filename"(name text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."filename"(name text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."filename"(name text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."foldername"(name text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."foldername"(name text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."foldername"(name text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."get_common_prefix"(p_key text, p_prefix text, p_delimiter text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."get_common_prefix"(p_key text, p_prefix text, p_delimiter text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."get_common_prefix"(p_key text, p_prefix text, p_delimiter text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."get_size_by_bucket"(noncurrent_versions text, delete_markers text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."get_size_by_bucket"(noncurrent_versions text, delete_markers text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."get_size_by_bucket"(noncurrent_versions text, delete_markers text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."list_multipart_uploads_with_delimiter"(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text, raw_prefix_param text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."list_multipart_uploads_with_delimiter"(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text, raw_prefix_param text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."list_multipart_uploads_with_delimiter"(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text, raw_prefix_param text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."list_objects_with_delimiter"(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text, noncurrent_versions text, delete_markers text, next_token_archived_at timestamp with time zone, next_token_version text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."list_objects_with_delimiter"(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text, noncurrent_versions text, delete_markers text, next_token_archived_at timestamp with time zone, next_token_version text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."list_objects_with_delimiter"(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text, noncurrent_versions text, delete_markers text, next_token_archived_at timestamp with time zone, next_token_version text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."operation"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."operation"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."operation"() TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."protect_bucket_control_columns"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."protect_bucket_control_columns"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."protect_bucket_control_columns"() TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."protect_delete"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."protect_delete"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."protect_delete"() TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."search"(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text, noncurrent_versions text, delete_markers text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."search"(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text, noncurrent_versions text, delete_markers text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."search"(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text, noncurrent_versions text, delete_markers text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."search_by_timestamp"(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text, delete_markers text, p_start_after_version text) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."search_by_timestamp"(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text, delete_markers text, p_start_after_version text) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."search_by_timestamp"(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text, delete_markers text, p_start_after_version text) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."search_v2"(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text, noncurrent_versions text, delete_markers text, start_after_archived_at timestamp with time zone, start_after_version text, start_after_is_continuation boolean) FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."search_v2"(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text, noncurrent_versions text, delete_markers text, start_after_archived_at timestamp with time zone, start_after_version text, start_after_is_continuation boolean) TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."search_v2"(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text, noncurrent_versions text, delete_markers text, start_after_archived_at timestamp with time zone, start_after_version text, start_after_is_continuation boolean) TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "storage"."update_updated_at_column"() FROM PUBLIC;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."update_updated_at_column"() TO PUBLIC; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "supabase_storage_admin"; GRANT EXECUTE ON FUNCTION "storage"."update_updated_at_column"() TO "supabase_storage_admin"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."adjust_pet_learning_tags"(p_pet_id uuid, p_tags text[], p_delta integer) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."adjust_pet_learning_tags"(p_pet_id uuid, p_tags text[], p_delta integer) TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."enforce_social_write_rate_limit"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."enforce_social_write_rate_limit"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."ensure_pet_public_link"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."ensure_pet_public_link"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."f14_block_after"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."f14_block_after"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."f14_block_before"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."f14_block_before"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."f14_guard_social_insert"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."f14_guard_social_insert"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."f14_pair_lock"(a uuid, b uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."f14_pair_lock"(a uuid, b uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."guard_comment_interaction_insert"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."guard_comment_interaction_insert"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."normalize_post_before_insert"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."normalize_post_before_insert"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."normalize_post_comment_before_insert"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."normalize_post_comment_before_insert"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."normalize_post_interaction_before_insert"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."normalize_post_interaction_before_insert"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."prepare_care_item"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."prepare_care_item"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."process_post_comment_side_effects"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."process_post_comment_side_effects"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."process_reversible_interaction_side_effects"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."process_reversible_interaction_side_effects"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."sync_pet_public_profile_to_posts"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."sync_pet_public_profile_to_posts"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "private"."validate_follow_relationship"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "private"."validate_follow_relationship"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "care_private"."archive_care_item_internal"(p_care_item_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."archive_care_item_internal"(p_care_item_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."archive_care_item_internal"(p_care_item_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."archive_care_item_internal"(p_care_item_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "care_private"."complete_care_item_internal"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."complete_care_item_internal"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."complete_care_item_internal"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."complete_care_item_internal"(p_care_item_id uuid, p_expected_due_date date, p_expected_due_time time without time zone) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "care_private"."undo_care_completion_internal"(p_completion_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."undo_care_completion_internal"(p_completion_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."undo_care_completion_internal"(p_completion_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "care_private"."undo_care_completion_internal"(p_completion_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "validation_private"."touch_validation_intent_updated_at"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "validation_private"."touch_validation_intent_updated_at"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "community_private"."adjust_community_comment_count"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "community_private"."adjust_community_comment_count"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "community_private"."adjust_community_like_count"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "community_private"."adjust_community_like_count"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "community_private"."adjust_member_count"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "community_private"."adjust_member_count"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "community_private"."ensure_owner_membership"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "community_private"."ensure_owner_membership"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "community_private"."normalize_community_row"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "community_private"."normalize_community_row"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "place_private"."normalize_checkin_update"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "place_private"."normalize_checkin_update"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "place_private"."normalize_place_row"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "place_private"."normalize_place_row"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "place_private"."normalize_place_suggestion"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "place_private"."normalize_place_suggestion"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "place_private"."prepare_checkin_insert"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "place_private"."prepare_checkin_insert"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "place_private"."sync_place_presence"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "place_private"."sync_place_presence"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."begin_delete_pet_document_internal"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."begin_delete_pet_document_internal"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."begin_delete_pet_document_internal"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."begin_delete_pet_document_internal"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."begin_pet_document_upload_internal"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."begin_pet_document_upload_internal"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."begin_pet_document_upload_internal"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."begin_pet_document_upload_internal"(p_pet_id uuid, p_title text, p_category text, p_original_file_name text, p_mime_type text, p_size_bytes bigint) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."cancel_delete_pet_document_internal"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."cancel_delete_pet_document_internal"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."cancel_delete_pet_document_internal"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."cancel_delete_pet_document_internal"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."cancel_pet_document_upload_internal"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."cancel_pet_document_upload_internal"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."cancel_pet_document_upload_internal"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."cancel_pet_document_upload_internal"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."finalize_delete_pet_document_internal"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."finalize_delete_pet_document_internal"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."finalize_delete_pet_document_internal"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."finalize_delete_pet_document_internal"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."finalize_pet_document_upload_internal"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."finalize_pet_document_upload_internal"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."finalize_pet_document_upload_internal"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."finalize_pet_document_upload_internal"(p_document_id uuid) TO "service_role"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."prepare_pet_document"() FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."prepare_pet_document"() TO "postgres"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "document_private"."try_finalize_delete_pet_document_internal"(p_document_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."try_finalize_delete_pet_document_internal"(p_document_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "document_private"."try_finalize_delete_pet_document_internal"(p_document_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "rescue_private"."activate_lost_pet_alert_internal"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."activate_lost_pet_alert_internal"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."activate_lost_pet_alert_internal"(p_pet_id uuid, p_last_seen_location text, p_last_seen_at timestamp with time zone, p_details text) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "rescue_private"."get_pet_founder_status_internal"(p_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."get_pet_founder_status_internal"(p_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."get_pet_founder_status_internal"(p_pet_id uuid) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."get_pet_founder_status_internal"(p_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"(p_token uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"(p_token uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"(p_token uuid) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."get_public_pet_rescue_profile_internal"(p_token uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"(p_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"(p_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."resolve_lost_pet_alert_internal"(p_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "rescue_private"."rotate_pet_public_link_internal"(p_pet_id uuid) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."rotate_pet_public_link_internal"(p_pet_id uuid) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."rotate_pet_public_link_internal"(p_pet_id uuid) TO "authenticated"; RESET SESSION AUTHORIZATION;
REVOKE ALL ON FUNCTION "rescue_private"."submit_pet_sighting_internal"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) FROM PUBLIC;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."submit_pet_sighting_internal"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "postgres"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."submit_pet_sighting_internal"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT EXECUTE ON FUNCTION "rescue_private"."submit_pet_sighting_internal"(p_token uuid, p_reporter_name text, p_reporter_phone text, p_message text, p_location text) TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("blocker_user_id") ON TABLE "public"."account_blocks" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("blocked_user_id") ON TABLE "public"."account_blocks" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("pet_id") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("title") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("title") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("category") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("category") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("due_date") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("due_date") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("due_time") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("due_time") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("timezone") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("timezone") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("recurrence") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("recurrence") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("reminder_days_before") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("reminder_days_before") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("notes") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("notes") ON TABLE "public"."care_items" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("name") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("name") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("description") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("description") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("category") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("category") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("species") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("species") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("zone") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("zone") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("image_url") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("image_url") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("image_storage_path") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("rules") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("rules") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("status") ON TABLE "public"."communities" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("community_id") ON TABLE "public"."community_memberships" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("display_pet_id") ON TABLE "public"."community_memberships" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("display_pet_id") ON TABLE "public"."community_memberships" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("role") ON TABLE "public"."community_memberships" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("post_id") ON TABLE "public"."community_post_comments" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("author_pet_id") ON TABLE "public"."community_post_comments" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("body") ON TABLE "public"."community_post_comments" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("post_id") ON TABLE "public"."community_post_likes" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("actor_pet_id") ON TABLE "public"."community_post_likes" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("community_id") ON TABLE "public"."community_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("author_pet_id") ON TABLE "public"."community_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("body") ON TABLE "public"."community_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("photo_url") ON TABLE "public"."community_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("photo_storage_path") ON TABLE "public"."community_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("user_id") ON TABLE "public"."hidden_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("post_id") ON TABLE "public"."hidden_posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("module_key") ON TABLE "public"."module_validation_intents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("intent_key") ON TABLE "public"."module_validation_intents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("intent_key") ON TABLE "public"."module_validation_intents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("source") ON TABLE "public"."module_validation_intents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("source") ON TABLE "public"."module_validation_intents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("module_key") ON TABLE "public"."module_validation_interests" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("source") ON TABLE "public"."module_validation_interests" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("module_key") ON TABLE "public"."module_validation_views" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("session_id") ON TABLE "public"."module_validation_views" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("source") ON TABLE "public"."module_validation_views" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("read_at") ON TABLE "public"."notifications" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("title") ON TABLE "public"."pet_documents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("category") ON TABLE "public"."pet_documents" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("id") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("place_id") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("place_id") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("pet_id") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("pet_id") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("visible") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("visible") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("visible") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("checked_in_at") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("expires_at") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("ended_at") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("ended_at") ON TABLE "public"."pet_place_checkins" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("place_id") ON TABLE "public"."pet_place_presence" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("visible_pet_id") ON TABLE "public"."pet_place_presence" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("expires_at") ON TABLE "public"."pet_place_presence" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("id") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("id") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("owner_id") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("owner_id") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("name") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("name") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("name") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("name") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("species") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("species") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("species") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("species") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("age") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("age") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("age") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("age") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("photo_url") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("photo_url") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("photo_url") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("photo_url") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("created_at") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("created_at") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("bio") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("bio") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("bio") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("bio") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("breed") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("breed") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("breed") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("breed") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("gender") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("gender") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("gender") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("gender") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("is_lost") ON TABLE "public"."pets" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("is_lost") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("is_lost") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("is_lost") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("last_seen_location") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("last_seen_location") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("last_seen_location") ON TABLE "public"."pets" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("name") ON TABLE "public"."place_suggestions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("category") ON TABLE "public"."place_suggestions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("address") ON TABLE "public"."place_suggestions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("zone") ON TABLE "public"."place_suggestions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("note") ON TABLE "public"."place_suggestions" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("session_id") ON TABLE "public"."place_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("event_type") ON TABLE "public"."place_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("place_id") ON TABLE "public"."place_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("category") ON TABLE "public"."place_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("pet_id") ON TABLE "public"."posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("location") ON TABLE "public"."posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("text") ON TABLE "public"."posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("photo_url") ON TABLE "public"."posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("tags") ON TABLE "public"."posts" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("id") ON TABLE "public"."profiles" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("id") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("username") ON TABLE "public"."profiles" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("username") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("username") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("avatar_url") ON TABLE "public"."profiles" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("avatar_url") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("avatar_url") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("is_founder") ON TABLE "public"."profiles" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("is_founder") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("created_at") ON TABLE "public"."profiles" TO "anon"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT SELECT ("created_at") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT UPDATE ("onboarding_completed") ON TABLE "public"."profiles" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("session_id") ON TABLE "public"."search_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("event_type") ON TABLE "public"."search_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("result_type") ON TABLE "public"."search_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("filter_type") ON TABLE "public"."search_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres"; GRANT INSERT ("had_results") ON TABLE "public"."search_usage_events" TO "authenticated"; RESET SESSION AUTHORIZATION;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN,REFERENCES,TRIGGER,TRUNCATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN,REFERENCES,TRIGGER,TRUNCATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT EXECUTE ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT EXECUTE ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT EXECUTE ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT EXECUTE ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT SELECT,UPDATE,USAGE ON SEQUENCES TO "dashboard_user";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT EXECUTE ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT EXECUTE ON FUNCTIONS TO "dashboard_user";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "dashboard_user";
SET check_function_bodies = true;
-- Preserve the source's explicit restricted owner ACL on its identity sequence.
REVOKE ALL ON SEQUENCE moderation_private.media_claim_events_id_seq FROM postgres;
GRANT USAGE ON SEQUENCE moderation_private.media_claim_events_id_seq TO postgres;
-- Safe structural supplement; no secrets or hosted data.
REVOKE ALL ON SCHEMA extensions FROM PUBLIC;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA extensions TO anon,authenticated,service_role;
GRANT CREATE,USAGE ON SCHEMA extensions TO postgres,dashboard_user;
RESET SESSION AUTHORIZATION;
