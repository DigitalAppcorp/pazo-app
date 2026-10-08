-- F14 A1: execute only after PO approves applying the migration to Supabase LOCAL.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(10);
SELECT extensions.ok(to_regclass('public.account_blocks') IS NOT NULL, 'block table exists');
SELECT extensions.ok(to_regclass('public.hidden_posts') IS NOT NULL, 'hide table exists');
SELECT extensions.ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.account_blocks'::regclass), 'block RLS enabled');
SELECT extensions.ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.hidden_posts'::regclass), 'hide RLS enabled');
SELECT extensions.ok((SELECT count(*)=6 FROM pg_policies WHERE schemaname='public' AND tablename IN ('account_blocks','hidden_posts')), 'owner policies created');
SELECT extensions.ok(NOT has_table_privilege('anon','public.account_blocks','SELECT'), 'anon cannot read blocks');
SELECT extensions.ok(NOT has_table_privilege('anon','public.hidden_posts','SELECT'), 'anon cannot read hidden list');
SELECT extensions.ok(NOT has_function_privilege('anon','public.f14_my_blocked_accounts()','EXECUTE'), 'anon cannot inspect blocks RPC');
SELECT extensions.ok((SELECT count(*)=9 FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'f14_%' AND tgrelid IN ('public.account_blocks'::regclass,'public.follows'::regclass,'public.interactions'::regclass,'public.post_comments'::regclass,'public.community_memberships'::regclass,'public.community_posts'::regclass,'public.community_post_comments'::regclass,'public.community_post_likes'::regclass)), 'write guards and block triggers installed');
SELECT extensions.ok((SELECT count(*)=4 FROM pg_policies WHERE schemaname='public' AND permissive='RESTRICTIVE' AND policyname IN ('f14_communities_select','f14_community_posts_select','f14_community_comments_select','f14_memberships_select')), 'community read uses restrictive policies');
SELECT * FROM extensions.finish();
ROLLBACK;
