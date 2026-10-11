-- Run ONLY against an isolated schema-only restoration with synthetic fixtures.
-- psql -X --set ON_ERROR_STOP=1 --file f14-tests.sql
-- The fixture loader must create pg_temp.f14_test_case (see test-cases.md)
-- and SET pazo.test.synthetic_fixture = 'confirmed'. No reduced mock tables.
\set ON_ERROR_STOP on
BEGIN;
-- Exact synthetic rows use real restored constraints/triggers. No hosted connections.
DO $isolated$
BEGIN
 IF current_database() <> 'f14_synthetic' OR session_user <> 'f14_admin'
 THEN RAISE EXCEPTION 'Tests require isolated f14_synthetic / f14_admin'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM storage.objects)
 THEN RAISE EXCEPTION 'Tests require an empty structural clone'; END IF;
END;
$isolated$;
SET LOCAL pazo.test.synthetic_fixture='confirmed';
CREATE TEMP TABLE f14_test_case (
 kind text, target uuid, bucket text, path text, url text, claim uuid,
 other_target uuid, other_bucket text, other_path text,
 owner_id uuid, other_owner uuid, pet uuid, other_pet uuid, community uuid
);
CREATE TEMP TABLE f14_fixture_actors (
 n integer, owner_id uuid, pet uuid, feed uuid, community_post uuid
);
INSERT INTO f14_fixture_actors
 SELECT n,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()
 FROM generate_series(1,2) n;

DO $fixture$
DECLARE a record; b record; v_community uuid:=gen_random_uuid(); v_path text;
 v_bucket text; v_target uuid; v_report uuid; v_url text; v_claim jsonb; v_kind text;
BEGIN
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 SELECT owner_id,'authenticated','authenticated','f14-synthetic-'||n||'@example.invalid','{}','{}'
 FROM f14_fixture_actors;
 INSERT INTO public.pets(id,owner_id,name,species)
 SELECT pet,owner_id,'Synthetic pet '||n,'gato' FROM f14_fixture_actors;
 SELECT * INTO a FROM f14_fixture_actors WHERE n=1;
 PERFORM set_config('request.jwt.claim.sub',a.owner_id::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',a.owner_id)::text,true);
 INSERT INTO public.communities(id,owner_user_id,name,description,category)
 VALUES(v_community,a.owner_id,'Synthetic community','Isolated F14 test','test');
 INSERT INTO public.community_memberships(community_id,user_id,display_pet_id,role)
 VALUES(v_community,a.owner_id,a.pet,'owner');
 SELECT * INTO b FROM f14_fixture_actors WHERE n=2;
 PERFORM set_config('request.jwt.claim.sub',b.owner_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',b.owner_id)::text,true);
 INSERT INTO public.community_memberships(community_id,user_id,display_pet_id,role)
 VALUES(v_community,b.owner_id,b.pet,'member');

 INSERT INTO storage.buckets(id,name,public)
 VALUES('post-photos','post-photos',true),('community-post-photos','community-post-photos',true);

 FOR a IN SELECT * FROM f14_fixture_actors ORDER BY n LOOP
  PERFORM set_config('request.jwt.claim.sub',a.owner_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',a.owner_id)::text,true);
  FOREACH v_kind IN ARRAY ARRAY['feed_post','community_post'] LOOP
   v_target:=CASE WHEN v_kind='feed_post' THEN a.feed ELSE a.community_post END;
   v_bucket:=CASE WHEN v_kind='feed_post' THEN 'post-photos' ELSE 'community-post-photos' END;
   v_path:=CASE WHEN v_kind='feed_post'
      THEN a.owner_id::text||'/'||a.pet::text||'/'||gen_random_uuid()::text||'.jpg'
      ELSE v_community::text||'/'||a.owner_id::text||'/'||gen_random_uuid()::text||'.jpg' END;
   v_url:='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/'||v_bucket||'/'||v_path;
   IF v_kind='feed_post' THEN
    INSERT INTO public.posts(id,user_id,pet_id,pet_name,pet_species,text,photo_url)
    VALUES(v_target,a.owner_id,a.pet,'Synthetic','gato','Synthetic F14 test',v_url);
   ELSE
    INSERT INTO public.community_posts(id,community_id,author_user_id,author_pet_id,body,photo_url,photo_storage_path)
    VALUES(v_target,v_community,a.owner_id,a.pet,'Synthetic F14 test',v_url,v_path);
   END IF;
   INSERT INTO storage.objects(bucket_id,name,owner_id,version,metadata)
   VALUES(v_bucket,v_path,a.owner_id::text,'fixture-version-1','{"size":123,"mimetype":"image/jpeg"}');
   INSERT INTO moderation_private.reports(target_kind,target_id,target_owner_user_id,reason,status)
   VALUES(v_kind,v_target,a.owner_id,'other','removed') RETURNING id INTO v_report;
   INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,media_status)
   VALUES(v_kind,v_target,v_report,'pending_review');
   IF a.n=1 THEN
    SELECT * INTO b FROM f14_fixture_actors WHERE n=2;
    INSERT INTO f14_test_case(kind,target,bucket,path,url,other_target,other_bucket,owner_id,other_owner,pet,other_pet,community)
    VALUES(v_kind,v_target,v_bucket,v_path,v_url,
      CASE WHEN v_kind='feed_post' THEN b.feed ELSE b.community_post END,
      v_bucket,a.owner_id,b.owner_id,a.pet,b.pet,v_community);
   ELSE
    UPDATE f14_test_case SET other_path=v_path WHERE kind=v_kind;
   END IF;
  END LOOP;
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 PERFORM set_config('request.jwt.claim.role','',true);
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 FOR a IN SELECT * FROM f14_test_case LOOP
  SET LOCAL ROLE service_role;
  v_claim:=public.f14_prepare_media_claim(a.kind,a.target);
  IF NOT public.f14_recheck_media_claim((v_claim->>'claim_id')::uuid)
  THEN RAISE EXCEPTION 'Real initial claim recheck failed'; END IF;
  RESET ROLE;
  UPDATE f14_test_case SET claim=(v_claim->>'claim_id')::uuid WHERE kind=a.kind;
 END LOOP;
END;
$fixture$;

DO $safety$
BEGIN
  IF current_setting('pazo.test.synthetic_fixture',true) IS DISTINCT FROM 'confirmed'
     OR current_database() <> 'f14_synthetic'
  THEN RAISE EXCEPTION 'Refusing test: isolated synthetic fixture not confirmed'; END IF;
  IF to_regclass('pg_temp.f14_test_case') IS NULL
  THEN RAISE EXCEPTION 'Actual-schema fixture table is required'; END IF;
END;
$safety$;

CREATE TEMP TABLE f14_test_results (
  name text PRIMARY KEY,
  passed boolean NOT NULL CHECK (passed),
  evidence text NOT NULL DEFAULT ''
);

-- ACL/ownership proof must precede claims simulation.
DO $acl$
DECLARE v_signature text; v_role text; v_proc regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.f14_moderation_media_gate(text,uuid,text,text,text,text)',
    'public.f14_prepare_media_claim(text,uuid)',
    'public.f14_recheck_media_claim(uuid)',
    'public.f14_get_media_claim_evidence(uuid)'
  ] LOOP
    v_proc := v_signature::regprocedure;
    IF NOT (SELECT prosecdef AND proconfig @> ARRAY['search_path=""']
            FROM pg_proc WHERE oid=v_proc)
    THEN RAISE EXCEPTION 'Missing security-definer/empty search_path: %',v_signature; END IF;
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(v_role,v_proc,'EXECUTE')
      THEN RAISE EXCEPTION 'Forbidden RPC execution: % %',v_role,v_signature; END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role',v_proc,'EXECUTE')
    THEN RAISE EXCEPTION 'Required service RPC privilege missing: %',v_signature; END IF;
  END LOOP;
  IF has_table_privilege('service_role','moderation_private.media_claims','UPDATE')
     OR has_table_privilege('authenticated','moderation_private.media_claims','SELECT')
     OR has_table_privilege('anon','moderation_private.media_claims','SELECT')
  THEN RAISE EXCEPTION 'Private claim ACL broadened'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='moderation_private.content_restrictions'::regclass
      AND tgfoid='moderation_private.f14_reject_unverified_purged()'::regprocedure
      AND tgenabled='O' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'Real rejection trigger missing'; END IF;
  INSERT INTO f14_test_results VALUES ('acl-and-trigger-preserved',true,'Catalog assertions');
END;
$acl$;

DO $suite$
DECLARE
  c record;
  v_claim jsonb;
  v_status text;
  v_false boolean;
  v_denied boolean;
  v_error text;
  v_role text;
  v_stage text;
  v_snapshot jsonb;
  v_before jsonb;
  v_after jsonb;
  v_signature text;
  v_call text;
  v_bad text;
  v_row record;
  v_alias record;
  v_original text;
  v_alias_value text;
  v_alias_result boolean;
  v_count integer;
  v_rechecked timestamptz;
  v_claim_before jsonb;
  v_event_count integer;
  v_restriction_before jsonb;
  v_storage_before jsonb;
BEGIN
  FOR c IN SELECT * FROM pg_temp.f14_test_case ORDER BY kind LOOP
    v_before := jsonb_build_object(
      'user',(SELECT to_jsonb(u) FROM auth.users u WHERE u.id=c.other_owner),
      'profile',(SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=c.other_owner),
      'pet',(SELECT to_jsonb(p) FROM public.pets p WHERE p.id=c.other_pet),
      'feed',(SELECT to_jsonb(p) FROM public.posts p WHERE p.id=(SELECT feed FROM f14_fixture_actors WHERE n=2)),
      'communityPost',(SELECT to_jsonb(p) FROM public.community_posts p WHERE p.id=(SELECT community_post FROM f14_fixture_actors WHERE n=2)),
      'restriction',(SELECT to_jsonb(r) FROM moderation_private.content_restrictions r
        WHERE r.target_kind=c.kind AND r.target_id=c.other_target),
      'storage',(SELECT to_jsonb(o) FROM storage.objects o
        WHERE o.bucket_id=c.other_bucket AND o.name=c.other_path)
    );
    IF v_before->'storage' IS NULL OR v_before->'storage'='null'::jsonb
    THEN RAISE EXCEPTION 'Unrelated sentinel object required'; END IF;

    -- Authorization must resist spoofed request claims with a real nonservice DB role.
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      PERFORM set_config('request.jwt.claim.role','',true);
      PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
      FOREACH v_call IN ARRAY ARRAY[
        format('SELECT public.f14_moderation_media_gate(%L,%L::uuid,%L,%L,%L,%L)',c.kind,c.target,c.bucket,c.path,c.url,'preflight'),
        format('SELECT public.f14_prepare_media_claim(%L,%L::uuid)',c.kind,c.target),
        format('SELECT public.f14_recheck_media_claim(%L::uuid)',c.claim),
        format('SELECT public.f14_get_media_claim_evidence(%L::uuid)',c.claim),
        'SELECT * FROM moderation_private.media_claims',
        'SELECT * FROM moderation_private.media_claim_events'
      ] LOOP
        v_denied := false;
        BEGIN
          EXECUTE format('SET LOCAL ROLE %I',v_role);
          EXECUTE v_call;
        EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
        END;
        RESET ROLE;
        IF NOT v_denied THEN RAISE EXCEPTION '% spoofed claim granted RPC/private access',v_role; END IF;
      END LOOP;
    END LOOP;
    INSERT INTO f14_test_results VALUES (c.kind||':untrusted-role-spoof-denied',true,'');

    -- Actual service DB role still needs the resolved service JWT claim.
    PERFORM set_config('request.jwt.claim.role','',true);
    PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
    SET LOCAL ROLE service_role;
    v_false := public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight');
    RESET ROLE;
    IF v_false IS DISTINCT FROM false THEN RAISE EXCEPTION 'Nonservice claim was accepted'; END IF;
    INSERT INTO f14_test_results VALUES (c.kind||':service-db-role-wrong-claim-denied',true,'');

    -- Empty claims and conflicting legacy/JSON claims must resolve through real auth.role().
    FOR v_row IN SELECT * FROM (VALUES
      ('','{}'),('authenticated','{"role":"service_role"}')
    ) v(legacy,claims) LOOP
      PERFORM set_config('request.jwt.claim.role',v_row.legacy,true);
      PERFORM set_config('request.jwt.claims',v_row.claims,true);
      IF auth.role() IS NOT DISTINCT FROM 'service_role'
      THEN RAISE EXCEPTION 'Unexpected auth.role() precedence'; END IF;
      SET LOCAL ROLE service_role;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Missing/conflicting resolved claims accepted'; END IF;
      RESET ROLE;
      FOREACH v_call IN ARRAY ARRAY[
        format('SELECT public.f14_prepare_media_claim(%L,%L::uuid)',c.kind,c.target),
        format('SELECT public.f14_recheck_media_claim(%L::uuid)',c.claim),
        format('SELECT public.f14_get_media_claim_evidence(%L::uuid)',c.claim)
      ] LOOP
        v_denied:=false;
        BEGIN
          SET LOCAL ROLE service_role;
          EXECUTE v_call;
        EXCEPTION WHEN insufficient_privilege THEN v_denied:=true; END;
        RESET ROLE;
        IF NOT v_denied THEN RAISE EXCEPTION 'Historical RPC accepted unresolved service claim'; END IF;
      END LOOP;
    END LOOP;
    INSERT INTO f14_test_results VALUES(c.kind||':empty-conflicting-claims-denied',true,'Legacy claim precedence is preserved');

    -- Test real legacy and JSON claims formats independently.
    FOREACH v_role IN ARRAY ARRAY['legacy','json'] LOOP
      PERFORM set_config('request.jwt.claim.role',
        CASE WHEN v_role='legacy' THEN 'service_role' ELSE '' END,true);
      PERFORM set_config('request.jwt.claims',
        CASE WHEN v_role='json' THEN '{"role":"service_role"}' ELSE '{}' END,true);
      SET LOCAL ROLE service_role;
      IF NOT public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight')
      THEN RAISE EXCEPTION 'Valid % preflight refused %',c.kind,v_role; END IF;
      RESET ROLE;
    END LOOP;
    INSERT INTO f14_test_results VALUES (c.kind||':legacy-and-json-claims',true,'');

    PERFORM set_config('request.jwt.claim.role','',true);
    PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);

    -- Check the historical real prepare path is idempotent (fixture already holds a real claim).
    SELECT count(*) INTO v_event_count FROM moderation_private.media_claim_events WHERE claim_id=c.claim;
    SET LOCAL ROLE service_role;
    v_claim := public.f14_prepare_media_claim(c.kind,c.target);
    RESET ROLE;
    IF (v_claim->>'claim_id')::uuid IS DISTINCT FROM c.claim
    THEN RAISE EXCEPTION 'prepare replaced existing claim'; END IF;
    IF (SELECT count(*) FROM moderation_private.media_claim_events WHERE claim_id=c.claim)<>v_event_count
    THEN RAISE EXCEPTION 'prepare retry appended events'; END IF;
    INSERT INTO f14_test_results VALUES (c.kind||':prepare-idempotent',true,'');
    SET LOCAL ROLE service_role;
    v_claim:=public.f14_get_media_claim_evidence(c.claim);
    RESET ROLE;
    IF v_claim IS NULL OR v_claim->>'status' IS DISTINCT FROM 'candidate_only'
      OR v_claim->>'mayDelete' IS DISTINCT FROM 'false'
      OR v_claim#>>'{reservation,claim_id}' IS DISTINCT FROM c.claim::text
    THEN RAISE EXCEPTION 'Historical evidence contract invalid'; END IF;
    INSERT INTO f14_test_results VALUES(c.kind||':evidence-does-not-authorize-deletion',true,'candidate_only, mayDelete=false');

    FOREACH v_stage IN ARRAY ARRAY['preflight','complete'] LOOP
      -- Reject every null input explicitly.
      FOR v_row IN SELECT * FROM (VALUES
        (NULL::text,c.target,c.bucket,c.path,c.url,v_stage),
        (c.kind,NULL::uuid,c.bucket,c.path,c.url,v_stage),
        (c.kind,c.target,NULL::text,c.path,c.url,v_stage),
        (c.kind,c.target,c.bucket,NULL::text,c.url,v_stage),
        (c.kind,c.target,c.bucket,c.path,NULL::text,v_stage),
        (c.kind,c.target,c.bucket,c.path,c.url,NULL::text),
        ('pet_profile',c.target,c.bucket,c.path,c.url,v_stage),
        (c.kind,c.target,'private-documents',c.path,c.url,v_stage),
        (c.kind,c.other_target,c.bucket,c.path,c.url,v_stage),
        (c.kind,c.target,c.bucket,c.path,c.url,'other')
      ) v(kind,target,bucket,path,url,stage) LOOP
        IF public.f14_moderation_media_gate(v_row.kind,v_row.target,v_row.bucket,
           v_row.path,v_row.url,v_row.stage) IS DISTINCT FROM false
        THEN RAISE EXCEPTION 'Invalid/null arguments accepted'; END IF;
      END LOOP;
    END LOOP;
    INSERT INTO f14_test_results VALUES (c.kind||':arguments-fail-closed',true,'');

    FOREACH v_bad IN ARRAY ARRAY[
      '../escape.jpg','a/../escape.jpg','/absolute.jpg','a//duplicate.jpg',
      'a/file.jpg?query','a/file.jpg#fragment',repeat('a',401)||'/file.jpg'
    ] LOOP
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,v_bad,c.url,'preflight')
         IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Bad path accepted: %',v_bad; END IF;
    END LOOP;
    INSERT INTO f14_test_results VALUES (c.kind||':unsafe-paths-denied',true,'');

    -- Mutations are privileged fault injection ONLY within isolated synthetic fixtures.
    SELECT snapshot INTO v_snapshot FROM moderation_private.media_claims WHERE claim_id=c.claim;
    FOREACH v_bad IN ARRAY ARRAY[
      'kind','target_id','report_id','owner_id','bucket','path','source_url','storage_object_id',
      CASE WHEN c.kind='feed_post' THEN 'pet_id' ELSE 'community_id' END
    ] LOOP
      UPDATE moderation_private.media_claims
        SET snapshot=v_snapshot||jsonb_build_object(v_bad,'synthetic-mismatch')
        WHERE claim_id=c.claim;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight')
         IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Snapshot mismatch accepted: %',v_bad; END IF;
      UPDATE moderation_private.media_claims SET snapshot=v_snapshot WHERE claim_id=c.claim;
    END LOOP;
    INSERT INTO f14_test_results VALUES (c.kind||':snapshot-mismatch-denied',true,'');

    -- Fault injection uses subtransactions and deliberately rolls back each change.
    BEGIN
      UPDATE moderation_private.media_claims SET checked_at=NULL WHERE claim_id=c.claim;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Unchecked claim accepted'; END IF;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    BEGIN
      UPDATE moderation_private.media_claims SET status='invalidated' WHERE claim_id=c.claim;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Invalidated claim accepted'; END IF;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    BEGIN
      UPDATE moderation_private.reports SET status='dismissed'
        WHERE id=(SELECT report_id FROM moderation_private.media_claims WHERE claim_id=c.claim);
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Dismissed report accepted'; END IF;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    BEGIN
      UPDATE storage.objects SET version='drifted-synthetic-version' WHERE bucket_id=c.bucket AND name=c.path;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Drifted Storage version accepted'; END IF;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
      WHEN check_violation THEN IF SQLERRM<>'F14 held Storage mutation requires exact verified server removal' THEN RAISE; END IF;
    END;
    INSERT INTO f14_test_results VALUES (c.kind||':unchecked-invalidated-report-object-drift-denied',true,'Held version mutation rejected; rollback preserves fixture');

    BEGIN
      UPDATE moderation_private.media_claims
        SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour'
        WHERE claim_id=c.claim;
      SELECT to_jsonb(mc) INTO v_claim_before FROM moderation_private.media_claims mc WHERE claim_id=c.claim;
      SET LOCAL ROLE service_role;
      IF public.f14_recheck_media_claim(c.claim) IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Expired recheck accepted'; END IF;
      RESET ROLE;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Expired preflight accepted'; END IF;
      IF (SELECT to_jsonb(mc) FROM moderation_private.media_claims mc WHERE claim_id=c.claim)
        IS DISTINCT FROM v_claim_before THEN RAISE EXCEPTION 'Expired recheck released/mutated claim'; END IF;
      SET LOCAL ROLE authenticated;
      IF public.f14_storage_media_path_unclaimed(c.bucket,c.path) IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Expired held path unlocked'; END IF;
      RESET ROLE;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    INSERT INTO f14_test_results VALUES (c.kind||':expired-claim-remains-held',true,'');

    -- Exercise actual authenticated RLS on the held object, not just its helper.
    PERFORM set_config('storage.allow_delete_query','true',true);
    PERFORM set_config('request.jwt.claim.role','',true);
    PERFORM set_config('request.jwt.claim.sub','',true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',c.owner_id)::text,true);
    SET LOCAL ROLE authenticated;
    DELETE FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    IF v_count<>0 THEN RAISE EXCEPTION 'Authenticated RLS removed held object'; END IF;
    UPDATE storage.objects SET metadata='{"synthetic":"tamper"}' WHERE bucket_id=c.bucket AND name=c.path;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    IF v_count<>0 THEN RAISE EXCEPTION 'Authenticated RLS updated held object'; END IF;
    v_denied:=false;
    BEGIN
      INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES(c.bucket,c.path,c.owner_id::text,'replacement');
    EXCEPTION WHEN insufficient_privilege THEN v_denied:=true;
      WHEN check_violation THEN IF SQLERRM<>'F14 held Storage mutation requires exact verified server removal' THEN RAISE; END IF;v_denied:=true;
    END;
    IF NOT v_denied THEN RAISE EXCEPTION 'Authenticated RLS allowed held insertion'; END IF;
    FOREACH v_bad IN ARRAY ARRAY['storage.object.copy','storage.s3.object.copy','storage.s3.upload.part_copy'] LOOP
      PERFORM set_config('storage.operation',v_bad,true);
      SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
      IF v_count<>0 THEN RAISE EXCEPTION 'Held COPY source remained visible'; END IF;
    END LOOP;
    RESET ROLE;
    PERFORM set_config('storage.operation','',true);
    PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
    INSERT INTO f14_test_results VALUES (c.kind||':authenticated-held-storage-rls',true,'DELETE, UPDATE, INSERT and three COPY operations');

    v_denied:=false;
    BEGIN
      UPDATE moderation_private.content_restrictions SET media_status='purged' WHERE target_kind=c.kind AND target_id=c.target;
    EXCEPTION WHEN check_violation THEN v_denied:=true; END;
    IF NOT v_denied THEN RAISE EXCEPTION 'Rejection trigger allowed unverified purged'; END IF;
    INSERT INTO f14_test_results VALUES (c.kind||':trigger-rejects-present-object-purged',true,'23514');

    -- All six real reference columns must reject object aliases in BOTH stages.
    -- Subtransactions preserve every real trigger side-effect in the sentinels.
    FOR v_alias IN SELECT * FROM (VALUES
      ('profiles','avatar_url',c.other_owner),
      ('posts','pet_avatar',(SELECT feed FROM f14_fixture_actors WHERE n=2)),
      ('posts','photo_url',(SELECT feed FROM f14_fixture_actors WHERE n=2)),
      ('community_posts','photo_url',(SELECT community_post FROM f14_fixture_actors WHERE n=2)),
      ('pets','photo_url',c.other_pet),
      ('communities','image_url',c.community)
    ) x(tab,col,row_id) LOOP
      FOREACH v_alias_value IN ARRAY ARRAY[
        c.url,c.url||'?v=synthetic',c.url||'#synthetic',
        replace(c.url,c.path,replace(c.path,'/','%2F')),
        replace(c.url,c.path,replace(c.path,'/','%2f')),
        replace(c.url,'.jpg','%2Ejpg'),
        replace(c.url,c.path,'%'||lpad(to_hex(ascii(substr(c.path,1,1))),2,'0')||substr(c.path,2)),
        replace(c.url,'https://mrybvqdebbgcayuvgkkr.supabase.co','HTTPS://MRYBVQDEBBGCAYUVGKkR.SUPABASE.CO')
      ] LOOP
        FOREACH v_stage IN ARRAY ARRAY['preflight','complete'] LOOP
          BEGIN
            IF v_alias.tab='communities' THEN
              UPDATE public.communities SET image_url=v_alias_value,image_storage_path=c.path WHERE id=v_alias.row_id;
            ELSE
              EXECUTE format('UPDATE public.%I SET %I=$1 WHERE id=$2',v_alias.tab,v_alias.col)
                USING v_alias_value,v_alias.row_id;
            END IF;
            IF v_stage='complete' THEN
              PERFORM set_config('storage.allow_delete_query','true',true);
              SET LOCAL ROLE service_role;
              DELETE FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
              RESET ROLE;
            END IF;
            v_alias_result:=public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,v_stage);
            IF v_alias_result IS DISTINCT FROM false
            THEN RAISE EXCEPTION 'Shared object alias accepted through %.% in %: %',v_alias.tab,v_alias.col,v_stage,v_alias_value; END IF;
            RAISE EXCEPTION USING ERRCODE='ZX001';
          EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
            WHEN check_violation THEN
              IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;
          END;
        END LOOP;
      END LOOP;
    END LOOP;
    INSERT INTO f14_test_results VALUES (c.kind||':shared-url-and-alias-references-denied',true,'Six columns x eight exact/query/fragment/encoding/host-case aliases x two stages');

    -- Near-prefix and foreign-host URLs identify different resources.
    FOREACH v_alias_value IN ARRAY ARRAY[c.url||'-another-object',replace(c.url,'mrybvqdebbgcayuvgkkr.supabase.co','foreign.example.invalid')] LOOP
      BEGIN
        UPDATE public.profiles SET avatar_url=v_alias_value WHERE id=c.other_owner;
        IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM true
        THEN RAISE EXCEPTION 'Different object/host incorrectly treated as same reference'; END IF;
        RAISE EXCEPTION USING ERRCODE='ZX001';
      EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    END LOOP;
    INSERT INTO f14_test_results VALUES(c.kind||':different-object-and-host-distinguished',true,'Profiles avoid unrelated historical broad probe LIKE');

    IF c.kind='community_post' THEN
      BEGIN
        UPDATE public.community_posts SET photo_storage_path=c.path WHERE id=c.other_target;
        IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
        THEN RAISE EXCEPTION 'Shared community storage path accepted'; END IF;
        RAISE EXCEPTION USING ERRCODE='ZX001';
      EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
        WHEN check_violation THEN
          IF SQLERRM<>'F14 held media cannot receive a new reference' THEN RAISE; END IF;
      END;
      INSERT INTO f14_test_results VALUES(c.kind||':shared-storage-path-denied',true,'');
    END IF;

    IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'complete')
       IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'Completion accepted while Storage metadata exists'; END IF;
    INSERT INTO f14_test_results VALUES (c.kind||':present-object-blocks-complete',true,'');

    -- Expiry after a valid recheck must permit absence reconciliation only.
    BEGIN
      PERFORM set_config('storage.allow_delete_query','true',true);
      SET LOCAL ROLE service_role;
      DELETE FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
      RESET ROLE;
      UPDATE moderation_private.media_claims
        SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour'
        WHERE claim_id=c.claim;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Expired/absent claim authorized removal'; END IF;
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'complete') IS DISTINCT FROM true
      THEN RAISE EXCEPTION 'Valid checked expired claim could not reconcile absence'; END IF;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    INSERT INTO f14_test_results VALUES(c.kind||':expiry-after-recheck-reconciles-only',true,'');

    -- A new object with the exact old name is not proof of deletion.
    BEGIN
      PERFORM set_config('storage.allow_delete_query','true',true);
      SET LOCAL ROLE service_role;
      DELETE FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
      RESET ROLE;
      INSERT INTO storage.objects(bucket_id,name,owner_id,version,metadata)
      VALUES(c.bucket,c.path,c.owner_id::text,'replacement-version','{"synthetic":"replacement"}');
      IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'complete') IS DISTINCT FROM false
      THEN RAISE EXCEPTION 'Replacement object incorrectly finalized'; END IF;
      RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
      WHEN check_violation THEN IF SQLERRM<>'F14 held Storage mutation requires exact verified server removal' THEN RAISE; END IF;
    END;
    INSERT INTO f14_test_results VALUES(c.kind||':recreated-name-blocks-completion',true,'Held path replacement rejected before creation');

    -- IMPORTANT: only isolated metadata is removed to model the trusted Storage API outcome.
    -- This does NOT prove physical file or CDN deletion and must never run on hosted Supabase.
    PERFORM set_config('storage.allow_delete_query','true',true);
    SET LOCAL ROLE service_role;
    DELETE FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    RESET ROLE;
    IF v_count<>1 THEN RAISE EXCEPTION 'Exact synthetic object missing unexpectedly'; END IF;

    IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'complete')
       IS DISTINCT FROM true
    THEN RAISE EXCEPTION 'Valid completion refused'; END IF;
    SELECT to_jsonb(r) INTO v_restriction_before FROM moderation_private.content_restrictions r
      WHERE r.target_kind=c.kind AND r.target_id=c.target;
    SELECT count(*) INTO v_event_count FROM moderation_private.media_claim_events WHERE claim_id=c.claim;
    IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'complete')
       IS DISTINCT FROM true
    THEN RAISE EXCEPTION 'Completion retry not idempotent'; END IF;
    UPDATE moderation_private.media_claims
      SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour'
      WHERE claim_id=c.claim;
    IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'complete') IS DISTINCT FROM true
    THEN RAISE EXCEPTION 'Post-expiry completion retry not idempotent'; END IF;
    IF (SELECT to_jsonb(r) FROM moderation_private.content_restrictions r WHERE r.target_kind=c.kind AND r.target_id=c.target)
      IS DISTINCT FROM v_restriction_before
      OR (SELECT count(*) FROM moderation_private.media_claim_events WHERE claim_id=c.claim)<>v_event_count
    THEN RAISE EXCEPTION 'Completion retry caused extra mutation/event'; END IF;
    IF public.f14_moderation_media_gate(c.kind,c.target,c.bucket,c.path,c.url,'preflight')
       IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'Purged target still authorizes preflight'; END IF;
    SELECT media_status INTO v_status FROM moderation_private.content_restrictions
      WHERE target_kind=c.kind AND target_id=c.target;
    IF v_status IS DISTINCT FROM 'purged' THEN RAISE EXCEPTION 'Status transition missing'; END IF;
    INSERT INTO f14_test_results VALUES (c.kind||':complete-retry-no-fresh-preflight',true,'');

    v_after := jsonb_build_object(
      'user',(SELECT to_jsonb(u) FROM auth.users u WHERE u.id=c.other_owner),
      'profile',(SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=c.other_owner),
      'pet',(SELECT to_jsonb(p) FROM public.pets p WHERE p.id=c.other_pet),
      'feed',(SELECT to_jsonb(p) FROM public.posts p WHERE p.id=(SELECT feed FROM f14_fixture_actors WHERE n=2)),
      'communityPost',(SELECT to_jsonb(p) FROM public.community_posts p WHERE p.id=(SELECT community_post FROM f14_fixture_actors WHERE n=2)),
      'restriction',(SELECT to_jsonb(r) FROM moderation_private.content_restrictions r
        WHERE r.target_kind=c.kind AND r.target_id=c.other_target),
      'storage',(SELECT to_jsonb(o) FROM storage.objects o
        WHERE o.bucket_id=c.other_bucket AND o.name=c.other_path)
    );
    IF v_after IS DISTINCT FROM v_before THEN RAISE EXCEPTION 'Unrelated sentinel changed'; END IF;
    INSERT INTO f14_test_results VALUES (c.kind||':unrelated-sentinel-preserved',true,'Full JSON comparison');
  END LOOP;
END;
$suite$;

-- Multi-session concurrency is separate from this atomic rollback suite.
TABLE f14_test_results;
ROLLBACK;
