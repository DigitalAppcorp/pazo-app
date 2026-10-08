-- F14 A2 SECURITY FOLLOW-UP — DRAFT ONLY / NOT APPLIED.
-- Requires explicit PO approval for hosted DDL in Supabase PAZO.
-- Verified with ALTER POLICY + ROLLBACK; existing RLS restored after dry-run.
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
