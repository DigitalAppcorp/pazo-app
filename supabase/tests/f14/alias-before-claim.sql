-- Run after concurrency-fixture.sql with pazo.test.prepare_claims=false.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE c record; surface record; alias text; attempts integer:=0; v_probe jsonb; changed integer;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR EXISTS(SELECT 1 FROM moderation_private.media_claims)
 THEN RAISE EXCEPTION 'Requires the isolated fixture before claims'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 FOR c IN SELECT * FROM f14_lab.test_case LOOP
  FOR surface IN SELECT * FROM (VALUES
   ('profiles','avatar_url',c.other_owner),('posts','pet_avatar',(SELECT feed FROM f14_lab.actors WHERE n=2)),
   ('posts','photo_url',(SELECT feed FROM f14_lab.actors WHERE n=2)),
   ('community_posts','photo_url',(SELECT community_post FROM f14_lab.actors WHERE n=2)),
   ('pets','photo_url',c.other_pet),('communities','image_url',c.community)
  ) s(tab,col,row_id) LOOP
   FOREACH alias IN ARRAY ARRAY[
    c.url,c.url||'?v=synthetic',c.url||'#synthetic',
    replace(c.url,c.path,replace(c.path,'/','%2F')),
    replace(c.url,'.jpg','%2Ejpg'),
    replace(c.url,'https://mrybvqdebbgcayuvgkkr.supabase.co','HTTPS://MRYBVQDEBBGCAYUVGKkR.SUPABASE.CO'),
    replace(c.url,'.supabase.co/','.supabase.co:443/'),
    replace(c.url,'https://','https://synthetic@'),
    replace(c.url,'/public/','/public/./'),
    replace(c.url,'/public/','/public/synthetic/../'),
    replace(c.url,'/public/','/public/%2E/'),
    replace(c.url,'/object/public/','/object/sign/')||'?token=synthetic',
    replace(c.url,'/object/public/','/object/authenticated/'),
    replace(c.url,'/object/public/','/render/image/public/')||'?width=32',
    replace(c.url,'/object/public/','/render/image/sign/')||'?token=synthetic',
    replace(c.url,'https://','http://'),
    replace(c.url,'https://','https:'),
    replace(c.url,'https:',''),
    replace(c.url,'/',chr(92)),
    replace(c.url,'.supabase.co/','.supabase.co./'),
    chr(9)||c.url||chr(10),replace(c.url,'://mry','://%6dry')
   ] LOOP
    IF NOT moderation_private.f14_local_url_points_to_object(alias,c.bucket,c.path)
    THEN RAISE EXCEPTION 'Identity alias not covered'; END IF;
    BEGIN
     IF surface.tab='communities' THEN
      UPDATE public.communities SET image_url=alias,image_storage_path=c.path WHERE id=surface.row_id;
     ELSE
      EXECUTE format('UPDATE public.%I SET %I=$1 WHERE id=$2',surface.tab,surface.col)
        USING alias,surface.row_id;
     END IF;
     GET DIAGNOSTICS changed=ROW_COUNT;
     IF changed<>1 THEN RAISE EXCEPTION 'Alias fixture row was not updated'; END IF;
     v_probe:=moderation_private.f14_media_probe(c.kind,c.target);
     IF v_probe IS NOT NULL THEN RAISE EXCEPTION 'Probe accepted a pre-existing shared alias'; END IF;
     RAISE EXCEPTION USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
    attempts:=attempts+1;
   END LOOP;
  END LOOP;
 END LOOP;
 IF attempts<>264 THEN RAISE EXCEPTION 'Incomplete alias matrix: %',attempts; END IF;
 RAISE NOTICE 'PASS 264 pre-existing alias checks, 6 surfaces x 22 aliases x 2 kinds';
END $$;
ROLLBACK;
