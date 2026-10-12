-- PAZO F14/T08: candidate ONLY. NEVER apply to hosted Supabase without
-- a separately approved reconciliation-only gate and synthetic PG17 CI.
-- This function cannot delete Storage objects, cannot create claims, and is
-- restricted to the single previously authorized object already removed.
-- A verified moderator-authenticated Edge caller must first prove both
-- Storage.info absence and all four public HEAD / ranged GET checks.
BEGIN;

CREATE OR REPLACE FUNCTION public.f14_finalize_one_object_reconciliation(
  p_kind text, p_id uuid, p_storage_object_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $f14_one_object_reconcile$
DECLARE
  v_claim moderation_private.media_claims%ROWTYPE;
  v_status text;
  v_completed boolean;
  v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_kind IS DISTINCT FROM 'feed_post'
    OR p_id IS DISTINCT FROM '140d3769-cde2-47dc-998a-dcb3238b6f17'::uuid
    OR p_storage_object_id IS DISTINCT FROM 'b9ef7bf4-9d86-4168-b124-a8b0b272d0c8'::uuid
    OR pg_catalog.current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted')
  THEN RETURN false; END IF;

  -- Match the existing F14 lock acquisition order: restriction, then claim.
  SELECT cr.media_status INTO v_status
  FROM moderation_private.content_restrictions cr
  WHERE cr.target_kind = p_kind AND cr.target_id = p_id
  FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('pending_review','purged') THEN RETURN false; END IF;

  SELECT * INTO v_claim
  FROM moderation_private.media_claims c
  WHERE c.target_kind = p_kind AND c.target_id = p_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_claim.bucket IS DISTINCT FROM 'post-photos'
    OR v_claim.storage_object_id IS DISTINCT FROM p_storage_object_id
    OR v_claim.checked_at IS NULL
    OR v_claim.snapshot->>'kind' IS DISTINCT FROM p_kind
    OR v_claim.snapshot->>'target_id' IS DISTINCT FROM p_id::text
    OR v_claim.snapshot->>'storage_object_id' IS DISTINCT FROM p_storage_object_id::text
    OR v_claim.snapshot->>'bucket' IS DISTINCT FROM 'post-photos'
    OR v_claim.snapshot->>'report_id' IS DISTINCT FROM v_claim.report_id::text
    OR v_claim.snapshot->>'path' IS NULL
    OR v_claim.snapshot->>'source_url' IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM moderation_private.reports r
      WHERE r.id = v_claim.report_id AND r.target_kind = p_kind
        AND r.target_id = p_id AND r.status = 'removed'
    )
    OR EXISTS (SELECT 1 FROM storage.objects o
      WHERE o.id = p_storage_object_id
        OR (o.bucket_id = v_claim.bucket AND o.name = v_claim.snapshot->>'path'))
  THEN RETURN false; END IF;

  -- Repeated reconciliation may only acknowledge the already-committed,
  -- exact object and the paired invalidation event, without additional writes.
  IF v_claim.status = 'invalidated' THEN
    RETURN v_status = 'purged' AND EXISTS (
      SELECT 1 FROM moderation_private.media_claim_events e
      WHERE e.claim_id = v_claim.claim_id AND e.event = 'invalidated'
    );
  END IF;
  IF v_claim.status IS DISTINCT FROM 'held' THEN RETURN false; END IF;

  -- Existing audited gate independently rechecks URL alias count, owner,
  -- report, claim snapshot, storage metadata absence, and RLS trigger.
  v_completed := public.f14_moderation_media_gate(
    p_kind, p_id, v_claim.bucket, v_claim.snapshot->>'path',
    v_claim.snapshot->>'source_url', 'complete');
  IF v_completed IS DISTINCT FROM true THEN RETURN false; END IF;

  UPDATE moderation_private.media_claims
  SET status = 'invalidated'
  WHERE claim_id = v_claim.claim_id AND status = 'held'
    AND storage_object_id = p_storage_object_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'F14 reconciliation claim transition unverified' USING ERRCODE='23514';
  END IF;

  INSERT INTO moderation_private.media_claim_events(claim_id,event)
  VALUES (v_claim.claim_id,'invalidated');
  RETURN true;
END;
$f14_one_object_reconcile$;

ALTER FUNCTION public.f14_finalize_one_object_reconciliation(text,uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f14_finalize_one_object_reconciliation(text,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.f14_finalize_one_object_reconciliation(text,uuid,uuid)
  TO service_role;

COMMIT;
