-- F14 A2 SECURITY FOLLOW-UP — applied to Supabase PAZO with explicit PO authorization.
-- Hosted migration name: f14_comment_parent_guard, version: 20261008122907.
-- Verified first using ALTER POLICY with ROLLBACK and read smoke tests for anon and authenticated roles.
-- Fix: comments must be visible only when their parent post is SELECT-visible
-- to the same caller, including anonymous callers and account-level blocks.
-- This relies on the existing parent posts/community_posts RLS policies.
BEGIN;

ALTER POLICY f14_moderated_comments_select ON public.post_comments
USING (
  public.f14_content_visible('feed_comment',id)
  AND public.f14_content_visible('pet_profile',author_pet_id)
  AND EXISTS (SELECT 1 FROM public.posts parent WHERE parent.id=post_id)
);

ALTER POLICY f14_moderated_community_comments_select ON public.community_post_comments
USING (
  public.f14_content_visible('community_comment',id)
  AND public.f14_content_visible('pet_profile',author_pet_id)
  AND EXISTS (SELECT 1 FROM public.community_posts parent WHERE parent.id=post_id)
);

COMMIT;
