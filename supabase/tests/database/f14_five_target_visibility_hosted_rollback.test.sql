-- F14 A2: hosted-only RLS visibility test. Uses reversible synthetic restriction
-- rows and one synthetic Community comment. Never commits or removes media.
BEGIN;
DO $fixture$
DECLARE v_owner uuid;v_cp uuid;v_pet uuid;v_cc uuid;v_fp uuid;v_fc uuid;
BEGIN
 SELECT cp.author_user_id,cp.id,pet.id INTO v_owner,v_cp,v_pet
 FROM public.community_posts cp
 JOIN public.communities c ON c.id=cp.community_id AND c.status='active'
 JOIN public.pets pet ON pet.owner_id=cp.author_user_id LIMIT 1;
 SELECT p.id INTO v_fp FROM public.posts p JOIN public.pets pet ON pet.id=p.pet_id LIMIT 1;
 SELECT c.id INTO v_fc FROM public.post_comments c
 JOIN public.posts p ON p.id=c.post_id
 JOIN public.pets pet ON pet.id=c.author_pet_id LIMIT 1;
 IF v_owner IS NULL OR v_fp IS NULL OR v_fc IS NULL
 THEN RAISE EXCEPTION 'Seeded content prerequisites absent'; END IF;
 PERFORM set_config('request.jwt.claim.sub',v_owner::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 INSERT INTO public.community_post_comments(post_id,author_pet_id,body)
 VALUES(v_cp,v_pet,'F14 visibility rollback-only comment') RETURNING id INTO v_cc;
 PERFORM set_config('f14.vis.fp',v_fp::text,true);
 PERFORM set_config('f14.vis.fc',v_fc::text,true);
 PERFORM set_config('f14.vis.pet',v_pet::text,true);
 PERFORM set_config('f14.vis.cp',v_cp::text,true);
 PERFORM set_config('f14.vis.cc',v_cc::text,true);
END $fixture$;
SET LOCAL ROLE authenticated;
DO $baseline$
BEGIN
 IF (SELECT count(*) FROM public.posts WHERE id=current_setting('f14.vis.fp')::uuid)<>1
 OR (SELECT count(*) FROM public.post_comments WHERE id=current_setting('f14.vis.fc')::uuid)<>1
 OR (SELECT count(*) FROM public.pets WHERE id=current_setting('f14.vis.pet')::uuid)<>1
 OR (SELECT count(*) FROM public.community_posts WHERE id=current_setting('f14.vis.cp')::uuid)<>1
 OR (SELECT count(*) FROM public.community_post_comments WHERE id=current_setting('f14.vis.cc')::uuid)<>1
 THEN RAISE EXCEPTION 'One or more selected resources not visible before moderation'; END IF;
END $baseline$;
RESET ROLE;
INSERT INTO moderation_private.content_restrictions
 (target_kind,target_id,media_status)
VALUES
 ('feed_post',current_setting('f14.vis.fp')::uuid,'none'),
 ('feed_comment',current_setting('f14.vis.fc')::uuid,'none'),
 ('pet_profile',current_setting('f14.vis.pet')::uuid,'none'),
 ('community_post',current_setting('f14.vis.cp')::uuid,'none'),
 ('community_comment',current_setting('f14.vis.cc')::uuid,'none');
SET LOCAL ROLE authenticated;
DO $hidden$
BEGIN
 IF (SELECT count(*) FROM public.posts WHERE id=current_setting('f14.vis.fp')::uuid)<>0
 OR (SELECT count(*) FROM public.post_comments WHERE id=current_setting('f14.vis.fc')::uuid)<>0
 OR (SELECT count(*) FROM public.pets WHERE id=current_setting('f14.vis.pet')::uuid)<>0
 OR (SELECT count(*) FROM public.community_posts WHERE id=current_setting('f14.vis.cp')::uuid)<>0
 OR (SELECT count(*) FROM public.community_post_comments WHERE id=current_setting('f14.vis.cc')::uuid)<>0
 THEN RAISE EXCEPTION 'Moderated resource still visible to authenticated role'; END IF;
END $hidden$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anonymous$
BEGIN
 IF (SELECT count(*) FROM public.posts WHERE id=current_setting('f14.vis.fp')::uuid)<>0
 OR (SELECT count(*) FROM public.post_comments WHERE id=current_setting('f14.vis.fc')::uuid)<>0
 OR (SELECT count(*) FROM public.pets WHERE id=current_setting('f14.vis.pet')::uuid)<>0
 THEN RAISE EXCEPTION 'Moderated public Feed or pet visible to anon'; END IF;
END $anonymous$;
RESET ROLE;
ROLLBACK;
