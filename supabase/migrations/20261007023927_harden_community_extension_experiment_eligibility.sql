CREATE POLICY module_validation_views_community_extension_eligibility
ON public.module_validation_views
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  module_key NOT IN (
    'communities_events',
    'communities_challenges',
    'communities_badges',
    'communities_qa',
    'communities_admin_tools'
  )
  OR (
    module_key IN (
      'communities_events',
      'communities_challenges',
      'communities_badges',
      'communities_qa'
    )
    AND (
      (
        source = 'community_info_member'
        AND EXISTS (
          SELECT 1
          FROM public.community_memberships m
          JOIN public.communities c ON c.id = m.community_id
          WHERE m.user_id = (SELECT auth.uid())
            AND m.role = 'member'
            AND c.status = 'active'
        )
      )
      OR (
        source = 'community_info_owner'
        AND EXISTS (
          SELECT 1
          FROM public.community_memberships m
          JOIN public.communities c ON c.id = m.community_id
          WHERE m.user_id = (SELECT auth.uid())
            AND m.role = 'owner'
            AND c.owner_user_id = (SELECT auth.uid())
            AND c.status = 'active'
        )
      )
    )
  )
  OR (
    module_key = 'communities_admin_tools'
    AND source = 'community_info_owner'
    AND EXISTS (
      SELECT 1
      FROM public.community_memberships m
      JOIN public.communities c ON c.id = m.community_id
      WHERE m.user_id = (SELECT auth.uid())
        AND m.role = 'owner'
        AND c.owner_user_id = (SELECT auth.uid())
        AND c.status = 'active'
    )
  )
);

CREATE POLICY module_validation_interests_community_extension_eligibility
ON public.module_validation_interests
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  module_key NOT IN (
    'communities_events',
    'communities_challenges',
    'communities_badges',
    'communities_qa',
    'communities_admin_tools'
  )
  OR (
    module_key IN (
      'communities_events',
      'communities_challenges',
      'communities_badges',
      'communities_qa'
    )
    AND (
      (
        source = 'community_info_member'
        AND EXISTS (
          SELECT 1
          FROM public.community_memberships m
          JOIN public.communities c ON c.id = m.community_id
          WHERE m.user_id = (SELECT auth.uid())
            AND m.role = 'member'
            AND c.status = 'active'
        )
      )
      OR (
        source = 'community_info_owner'
        AND EXISTS (
          SELECT 1
          FROM public.community_memberships m
          JOIN public.communities c ON c.id = m.community_id
          WHERE m.user_id = (SELECT auth.uid())
            AND m.role = 'owner'
            AND c.owner_user_id = (SELECT auth.uid())
            AND c.status = 'active'
        )
      )
    )
  )
  OR (
    module_key = 'communities_admin_tools'
    AND source = 'community_info_owner'
    AND EXISTS (
      SELECT 1
      FROM public.community_memberships m
      JOIN public.communities c ON c.id = m.community_id
      WHERE m.user_id = (SELECT auth.uid())
        AND m.role = 'owner'
        AND c.owner_user_id = (SELECT auth.uid())
        AND c.status = 'active'
    )
  )
);
