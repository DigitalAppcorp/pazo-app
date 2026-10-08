-- PostgreSQL UPDATE requires the row to remain visible to the caller's
-- SELECT policy while checking the post-update row. Ending a check-in makes
-- the row inactive, so the original active-only SELECT policy blocked a valid
-- owner checkout.
--
-- Owners may read only their own check-in rows. The product UI continues to
-- query only active rows explicitly. Other users still have zero access to
-- private check-in truth.

DROP POLICY IF EXISTS pet_place_checkins_read_own_active
ON public.pet_place_checkins;

CREATE POLICY pet_place_checkins_read_own
ON public.pet_place_checkins
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

GRANT SELECT (ended_at)
ON TABLE public.pet_place_checkins
TO authenticated;
