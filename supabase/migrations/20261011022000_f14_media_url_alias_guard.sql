-- F14 follow-up: guard against shared Storage URL aliases.
-- NOT APPLIED to hosted Supabase. Requires a separate PO-hosted migration gate.
-- Depends on 20261010222006_f14_media_purge_retry_reconciliation.sql.
-- From the local PostgreSQL 17 single-session candidate PASS, 2026-10-11.
-- The helper name retains 'local' for historical continuity with the lab.
-- Covers known project public/signed/authenticated/render routes and browser
-- aliases. External hosts/proxies remain outside this identity contract.
-- Held claims now prevent new references
-- across RPC transactions; this does not authorize a Storage API deletion.
-- No Storage API deletion, policy relaxation, feature flag or data mutation.
BEGIN;

CREATE OR REPLACE FUNCTION moderation_private.f14_local_url_points_to_object(
  p_url text, p_bucket text, p_path text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = ''
AS $f14_url_identity$
DECLARE
  v_parts text[];
  v_suffix text;
  v_decoded text := '';
  v_pos integer := 1;
  v_hex text;
  v_value integer;
  v_character text;
  v_host text; v_segment text; v_segments text[] := ARRAY[]::text[]; v_input text;
BEGIN
  IF pg_catalog.length(p_url) > 2048 OR pg_catalog.length(p_path) > 400
     OR p_bucket NOT IN ('post-photos', 'community-post-photos')
  THEN RETURN false; END IF;

  -- Conservative normalization of browser URL spellings. This never chooses
  -- the deletion target: the target itself must remain canonical and exact.
  v_input:=pg_catalog.regexp_replace(p_url,'[[:space:]]','','g');
  v_input:=pg_catalog.replace(v_input,pg_catalog.chr(92),'/');
  IF pg_catalog.left(v_input,2)='//' THEN v_input:='https:'||v_input; END IF;
  v_input:=pg_catalog.regexp_replace(v_input,'^([A-Za-z]+):/*','\1://');
  -- Only this project's Storage endpoints; uncertain matching aliases block.
  -- The URL hostname and scheme are case insensitive; the Storage path is not.
  v_parts := pg_catalog.regexp_match(
    v_input, '^([A-Za-z]+)://([^/?#]+)(/[^?#]*)([?#].*)?$'
  );
  v_host:=pg_catalog.regexp_replace(pg_catalog.lower(v_parts[2]),'^.*@','');
  WHILE pg_catalog.strpos(v_host,'%')>0 LOOP
   v_hex:=pg_catalog.substring(v_host,'%([0-9a-f]{2})');
   IF v_hex IS NULL THEN RETURN false; END IF;
   v_value:=pg_catalog.get_byte(pg_catalog.decode(v_hex,'hex'),0);
   IF v_value<33 OR v_value>126 THEN RETURN false; END IF;
   v_host:=pg_catalog.replace(v_host,'%'||v_hex,pg_catalog.lower(pg_catalog.chr(v_value)));
  END LOOP;
  IF pg_catalog.lower(v_parts[1])='https' THEN v_host:=pg_catalog.regexp_replace(v_host,':443$','');
  ELSIF pg_catalog.lower(v_parts[1])='http' THEN v_host:=pg_catalog.regexp_replace(v_host,':80$',''); END IF;
  v_host:=pg_catalog.regexp_replace(v_host,'[.]$','');
  IF v_parts IS NULL OR pg_catalog.lower(v_parts[1]) NOT IN ('http','https')
     OR v_host <> 'mrybvqdebbgcayuvgkkr.supabase.co'
  THEN RETURN false; END IF;
  v_suffix := v_parts[3];
  WHILE v_pos <= pg_catalog.length(v_suffix) LOOP
    v_character := pg_catalog.substr(v_suffix, v_pos, 1);
    IF v_character = '%' THEN
      v_hex := pg_catalog.substr(v_suffix, v_pos + 1, 2);
      IF pg_catalog.length(v_hex) <> 2 OR v_hex !~ '^[0-9A-Fa-f]{2}$'
      THEN RETURN false; END IF;
      v_value := pg_catalog.get_byte(pg_catalog.decode(v_hex, 'hex'), 0);
      IF v_value < 32 OR v_value > 126 THEN RETURN false; END IF;
      v_character := pg_catalog.chr(v_value);
      v_pos := v_pos + 3;
    ELSE
      v_pos := v_pos + 1;
    END IF;
    IF v_character !~ '^[A-Za-z0-9._/-]$' THEN RETURN false; END IF;
    v_decoded := v_decoded || v_character;
  END LOOP;
  -- Browser dot-segment normalization, including percent-encoded dots. Counting
  -- an uncertain but matching alias is conservative: it can only block a purge.
  FOREACH v_segment IN ARRAY pg_catalog.string_to_array(v_decoded,'/') LOOP
   IF v_segment='.' THEN CONTINUE;
   ELSIF v_segment='..' THEN v_segments:=v_segments[1:CASE WHEN pg_catalog.cardinality(v_segments)>0 THEN pg_catalog.cardinality(v_segments)-1 ELSE 0 END];
   ELSE v_segments:=pg_catalog.array_append(v_segments,v_segment); END IF;
  END LOOP;
  v_decoded:=pg_catalog.array_to_string(v_segments,'/');
  v_decoded:=pg_catalog.regexp_replace(v_decoded,
    '^/storage/v1/(object|render/image)/(public|sign|authenticated)/','');
  RETURN v_decoded = (p_bucket || '/' || p_path);
END;
$f14_url_identity$;
REVOKE ALL ON FUNCTION moderation_private.f14_local_url_points_to_object(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moderation_private.f14_local_url_points_to_object(text, text, text) TO "postgres";
ALTER FUNCTION moderation_private.f14_local_url_points_to_object(text,text,text) OWNER TO postgres;

-- A claim survives the HTTP gap between preflight and Storage removal. Ordinary
-- reference writers must not attach another row to that quarantined object.
-- Triggers run even for service_role/BYPASSRLS; no new public RPC or grants.
CREATE OR REPLACE FUNCTION moderation_private.f14_guard_held_media_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f14_reference_guard$
DECLARE v_new jsonb := pg_catalog.to_jsonb(NEW); v_old jsonb;
 v_column text; v_value text; v_changed boolean := false;
BEGIN
 IF TG_OP='UPDATE' THEN v_old:=pg_catalog.to_jsonb(OLD); END IF;
 FOREACH v_column IN ARRAY TG_ARGV LOOP
  IF (v_new->>v_column) IS NOT NULL
     AND (TG_OP='INSERT' OR (v_new->>v_column) IS DISTINCT FROM (v_old->>v_column))
  THEN v_changed:=true; END IF;
 END LOOP;
 IF NOT v_changed THEN RETURN NEW; END IF;
 -- A stale transaction snapshot cannot safely observe a newly committed claim.
 IF pg_catalog.current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted')
 THEN RAISE EXCEPTION 'F14 reference writes require a fresh transaction snapshot'
   USING ERRCODE='40001'; END IF;
 FOREACH v_column IN ARRAY TG_ARGV LOOP
  v_value:=v_new->>v_column;
  IF v_value IS NULL OR (TG_OP='UPDATE' AND v_value IS NOT DISTINCT FROM (v_old->>v_column))
  THEN CONTINUE; END IF;
  IF EXISTS (
   SELECT 1 FROM moderation_private.media_claims c
   WHERE c.status='held' AND (
    (v_column='photo_storage_path' AND c.bucket='community-post-photos'
      AND c.snapshot->>'path'=v_value)
    OR (v_column<>'photo_storage_path'
      AND moderation_private.f14_local_url_points_to_object(v_value,c.bucket,c.snapshot->>'path'))
   )
  ) THEN RAISE EXCEPTION 'F14 held media cannot receive a new reference'
    USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END;
$f14_reference_guard$;
ALTER FUNCTION moderation_private.f14_guard_held_media_reference() OWNER TO postgres;
REVOKE ALL ON FUNCTION moderation_private.f14_guard_held_media_reference() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE TRIGGER f14_guard_held_media_reference
BEFORE INSERT OR UPDATE OF photo_url,pet_avatar ON public.posts
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_guard_held_media_reference('photo_url','pet_avatar');
CREATE OR REPLACE TRIGGER f14_guard_held_media_reference
BEFORE INSERT OR UPDATE OF photo_url,photo_storage_path ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_guard_held_media_reference('photo_url','photo_storage_path');
CREATE OR REPLACE TRIGGER f14_guard_held_media_reference
BEFORE INSERT OR UPDATE OF photo_url ON public.pets
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_guard_held_media_reference('photo_url');
CREATE OR REPLACE TRIGGER f14_guard_held_media_reference
BEFORE INSERT OR UPDATE OF image_url ON public.communities
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_guard_held_media_reference('image_url');
CREATE OR REPLACE TRIGGER f14_guard_held_media_reference
BEFORE INSERT OR UPDATE OF avatar_url ON public.profiles
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_guard_held_media_reference('avatar_url');

-- RLS STABLE predicates can predate a lock wait. A volatile BEFORE trigger
-- reads the claim after acquiring the object row lock, closing that MVCC gap.
-- No deletion is initiated here; only the existing verified server API path
-- may remove the exact claimed version. INSERT/UPDATE cannot replace it.
CREATE OR REPLACE FUNCTION moderation_private.f14_guard_held_storage_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f14_storage_guard$
DECLARE c moderation_private.media_claims%ROWTYPE; v_bucket text; v_path text;
BEGIN
 IF TG_OP='INSERT' THEN v_bucket:=NEW.bucket_id;v_path:=NEW.name;
 ELSE v_bucket:=OLD.bucket_id;v_path:=OLD.name; END IF;
 IF v_bucket NOT IN ('post-photos','community-post-photos')
    AND (TG_OP<>'UPDATE' OR NEW.bucket_id NOT IN ('post-photos','community-post-photos'))
 THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF pg_catalog.current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted')
 THEN RAISE EXCEPTION 'F14 Storage writes require a fresh transaction snapshot' USING ERRCODE='40001'; END IF;
 SELECT * INTO c FROM moderation_private.media_claims mc
 WHERE mc.status='held' AND ((mc.bucket=v_bucket AND mc.snapshot->>'path'=v_path)
   OR (TG_OP='UPDATE' AND mc.bucket=NEW.bucket_id AND mc.snapshot->>'path'=NEW.name))
 ORDER BY mc.claim_id LIMIT 1;
 IF NOT FOUND THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' AND pg_catalog.current_setting('role',true)='service_role'
    AND auth.role()='service_role' AND c.checked_at IS NOT NULL
    AND c.expires_at>pg_catalog.clock_timestamp()
    AND c.storage_object_id=OLD.id AND c.snapshot->>'storage_object_id'=OLD.id::text
    AND c.snapshot->>'object_version' IS NOT DISTINCT FROM OLD.version
    AND c.snapshot->>'owner_id' IS NOT DISTINCT FROM OLD.owner_id
    AND (c.snapshot->>'object_updated_at')::timestamptz IS NOT DISTINCT FROM OLD.updated_at
    AND c.snapshot->>'metadata_fingerprint'=pg_catalog.md5(coalesce(OLD.metadata::text,''))
    AND public.f14_moderation_media_gate(c.target_kind,c.target_id,OLD.bucket_id,OLD.name,c.snapshot->>'source_url','preflight')
 THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'F14 held Storage mutation requires exact verified server removal' USING ERRCODE='23514';
END;
$f14_storage_guard$;
ALTER FUNCTION moderation_private.f14_guard_held_storage_mutation() OWNER TO postgres;
REVOKE ALL ON FUNCTION moderation_private.f14_guard_held_storage_mutation() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE TRIGGER f14_guard_held_storage_mutation
BEFORE INSERT OR UPDATE OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_guard_held_storage_mutation();

CREATE OR REPLACE FUNCTION moderation_private.f14_media_probe(p_kind text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_url text; v_path text; v_bucket text; v_owner uuid; v_pet uuid; v_community uuid;
  v_report uuid; v_source_path text; v_object storage.objects%ROWTYPE;
  v_count integer; v_owner_ok boolean;
BEGIN
  IF p_kind NOT IN ('feed_post','community_post') OR p_id IS NULL THEN RETURN NULL; END IF;
  IF pg_catalog.current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted')
  THEN RETURN NULL; END IF;
  -- Writers obtain ROW EXCLUSIVE before their BEFORE trigger. SHARE blocks them
  -- until the prepare RPC commits its held claim, or sees their committed alias
  -- before granting a claim. Locks end at transaction completion, never HTTP.
  LOCK TABLE public.posts,public.community_posts,public.pets,public.communities,public.profiles IN SHARE MODE;
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

  -- Reject aliases across every supported PAZO reference column.
  SELECT COALESCE(pg_catalog.sum(n),0)::integer INTO v_count FROM (
    SELECT pg_catalog.count(*)::integer n FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(pet_avatar,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.community_posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.pets
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.communities
      WHERE moderation_private.f14_local_url_points_to_object(image_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.profiles
      WHERE moderation_private.f14_local_url_points_to_object(avatar_url,v_bucket,v_path)
  ) aliases;
  IF v_count <> 1 THEN RETURN NULL; END IF;
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
$$;

CREATE OR REPLACE FUNCTION public.f14_moderation_media_gate(
  p_kind text,
  p_target uuid,
  p_bucket text,
  p_path text,
  p_url text,
  p_stage text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $f14_media_gate$
DECLARE
  v_owner uuid;
  v_pet uuid;
  v_community uuid;
  v_url text;
  v_path text;
  v_expected_bucket text;
  v_refs bigint;
  v_claim moderation_private.media_claims%ROWTYPE;
  v_live jsonb;
  v_report uuid;
  v_media_status text;
  v_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_kind IS NULL OR p_kind NOT IN ('feed_post', 'community_post')
    OR p_target IS NULL OR p_bucket IS NULL OR p_path IS NULL OR p_url IS NULL
    OR p_stage IS NULL OR p_stage NOT IN ('preflight', 'complete')
    OR p_path !~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9._-]+)+$'
    OR pg_catalog.strpos(p_path, '..') > 0
    OR pg_catalog.length(p_path) > 400
  THEN
    RETURN false;
  END IF;

  v_expected_bucket := CASE p_kind
    WHEN 'feed_post' THEN 'post-photos'
    ELSE 'community-post-photos'
  END;
  IF p_bucket IS DISTINCT FROM v_expected_bucket THEN RETURN false; END IF;

  -- Serialize completion retries for this target. Preflight is restricted to
  -- pending rows; complete also accepts an already purged exact target so a
  -- lost response can be retried without another Storage mutation.
  SELECT r.media_status, r.report_id
    INTO v_media_status, v_report
  FROM moderation_private.content_restrictions r
  WHERE r.target_kind = p_kind
    AND r.target_id = p_target
    AND (
      (p_stage = 'preflight' AND r.media_status = 'pending_review')
      OR (p_stage = 'complete' AND r.media_status IN ('pending_review', 'purged'))
    )
  FOR UPDATE;
  IF NOT FOUND OR v_report IS NULL THEN RETURN false; END IF;

  IF p_kind = 'feed_post' THEN
    SELECT p.user_id, p.photo_url, p.pet_id
      INTO v_owner, v_url, v_pet
    FROM public.posts p
    WHERE p.id = p_target
    FOR SHARE;
    IF NOT FOUND OR v_pet IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.pets pet
      WHERE pet.id = v_pet AND pet.owner_id = v_owner
    ) THEN
      RETURN false;
    END IF;
  ELSE
    SELECT cp.author_user_id, cp.photo_url, cp.photo_storage_path, cp.community_id
      INTO v_owner, v_url, v_path, v_community
    FROM public.community_posts cp
    WHERE cp.id = p_target
    FOR SHARE;
    IF NOT FOUND OR v_community IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.communities c WHERE c.id = v_community
    ) THEN
      RETURN false;
    END IF;
    IF v_path IS DISTINCT FROM p_path THEN RETURN false; END IF;
  END IF;

  IF v_owner IS NULL OR v_url IS DISTINCT FROM p_url
    OR NULLIF(pg_catalog.btrim(v_url), '') IS NULL
  THEN
    RETURN false;
  END IF;

  SELECT COALESCE(pg_catalog.sum(refs.n),0)::bigint INTO v_refs FROM (
    SELECT pg_catalog.count(*)::bigint n FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(pet_avatar,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.community_posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.pets
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.communities
      WHERE moderation_private.f14_local_url_points_to_object(image_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.profiles
      WHERE moderation_private.f14_local_url_points_to_object(avatar_url,p_bucket,p_path)
  ) refs;
  IF v_refs <> 1 THEN RETURN false; END IF;

  IF p_kind = 'community_post' AND (
    SELECT pg_catalog.count(*) FROM public.community_posts WHERE photo_storage_path = p_path
  ) <> 1 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_claim
  FROM moderation_private.media_claims c
  WHERE c.target_kind = p_kind AND c.target_id = p_target
  FOR SHARE;
  IF NOT FOUND OR v_claim.status <> 'held' OR v_claim.checked_at IS NULL
    OR v_claim.report_id IS DISTINCT FROM v_report
    OR v_claim.bucket IS DISTINCT FROM p_bucket
    OR v_claim.snapshot->>'kind' IS DISTINCT FROM p_kind
    OR v_claim.snapshot->>'path' IS DISTINCT FROM p_path
    OR v_claim.snapshot->>'source_url' IS DISTINCT FROM p_url
    OR v_claim.snapshot->>'owner_id' IS DISTINCT FROM v_owner::text
    OR v_claim.snapshot->>'target_id' IS DISTINCT FROM p_target::text
    OR v_claim.snapshot->>'report_id' IS DISTINCT FROM v_report::text
    OR v_claim.snapshot->>'bucket' IS DISTINCT FROM p_bucket
    OR v_claim.snapshot->>'storage_object_id' IS DISTINCT FROM v_claim.storage_object_id::text
    OR (p_kind = 'feed_post' AND v_claim.snapshot->>'pet_id' IS DISTINCT FROM v_pet::text)
    OR (p_kind = 'community_post' AND v_claim.snapshot->>'community_id' IS DISTINCT FROM v_community::text)
  THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM moderation_private.reports report
    WHERE report.id = v_report
      AND report.status = 'removed'
      AND report.target_kind = p_kind
      AND report.target_id = p_target
  ) THEN
    RETURN false;
  END IF;

  IF p_stage = 'preflight' THEN
    IF v_media_status <> 'pending_review'
      OR v_claim.expires_at <= pg_catalog.clock_timestamp()
    THEN
      RETURN false;
    END IF;
    v_live := moderation_private.f14_media_probe(p_kind, p_target);
    IF v_live IS NULL OR v_live IS DISTINCT FROM v_claim.snapshot THEN RETURN false; END IF;
    RETURN true;
  END IF;

  -- The Edge has already required Storage.info() to prove absence and checked
  -- both original/cache-busted public URLs with HEAD and ranged GET. The DB
  -- independently checks that Storage metadata is absent before finalizing.
  IF EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = p_bucket AND o.name = p_path
  ) THEN
    RETURN false;
  END IF;

  IF v_media_status = 'purged' THEN RETURN true; END IF;

  UPDATE moderation_private.content_restrictions
  SET media_status = 'purged'
  WHERE target_kind = p_kind AND target_id = p_target AND media_status = 'pending_review';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$f14_media_gate$;

ALTER FUNCTION moderation_private.f14_media_probe(text,uuid) OWNER TO postgres;
ALTER FUNCTION public.f14_moderation_media_gate(text,uuid,text,text,text,text) OWNER TO postgres;

COMMIT;
