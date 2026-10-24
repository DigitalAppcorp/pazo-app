-- F14 community continuity on account deletion. APPROVED FOR DEPLOYMENT AFTER QA.
-- PO authorized the non-deleting migration. Transfer ONLY to an admin who explicitly accepts; otherwise archive.
-- This migration DOES NOT delete users, posts, memberships, or Storage objects.
BEGIN;

-- Existing 'owner' and 'member' roles remain; 'admin' is a nomination
-- prerequisite, NOT a new blanket permission to edit/delete other data.
ALTER TABLE public.community_memberships DROP CONSTRAINT community_memberships_role_allowed;
ALTER TABLE public.community_memberships ADD CONSTRAINT community_memberships_role_allowed
  CHECK (role IN ('owner','admin','member'));
CREATE UNIQUE INDEX IF NOT EXISTS community_memberships_one_owner_idx
  ON public.community_memberships(community_id) WHERE role='owner';

-- No active community may be ownerless. Critically, deleting Auth no longer
-- CASCADES into other members' community posts/comments.
ALTER TABLE public.communities ALTER COLUMN owner_user_id DROP NOT NULL;
ALTER TABLE public.communities DROP CONSTRAINT communities_owner_user_id_fkey;
ALTER TABLE public.communities ADD CONSTRAINT communities_owner_user_id_fkey
 FOREIGN KEY(owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD CONSTRAINT f14_community_archived_if_ownerless
 CHECK (owner_user_id IS NOT NULL OR status='archived');

CREATE OR REPLACE FUNCTION community_private.ensure_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $owner_guard$
BEGIN
 IF NEW.owner_user_id IS NULL THEN
  IF NEW.status<>'archived' THEN
    RAISE EXCEPTION 'An active community must have an owner';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_memberships m
             WHERE m.community_id=NEW.id AND m.role='owner') THEN
    RAISE EXCEPTION 'An archived ownerless community cannot have an owner member';
  END IF;
  RETURN NEW;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.community_memberships m
   WHERE m.community_id=NEW.id AND m.user_id=NEW.owner_user_id AND m.role='owner')
 THEN RAISE EXCEPTION 'Community owner membership is required'; END IF;
 RETURN NEW;
END;
$owner_guard$;

CREATE TABLE IF NOT EXISTS community_private.ownership_transfer_offers (
 community_id uuid PRIMARY KEY REFERENCES public.communities(id) ON DELETE CASCADE,
 owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 candidate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('pending','accepted','declined')),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz,
 CHECK(owner_user_id<>candidate_user_id),
 CHECK(expires_at>created_at)
);
ALTER TABLE community_private.ownership_transfer_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON community_private.ownership_transfer_offers FROM PUBLIC,anon,authenticated;

-- Helper RPC: only an owner with an outstanding deletion request may nominate
-- an EXISTING member as admin; no arbitrary user insertion.
CREATE OR REPLACE FUNCTION public.pazo_community_set_admin(
 p_community_id uuid,p_member_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $set_admin$
DECLARE v_uid uuid:=auth.uid();v_count integer;
BEGIN
 IF v_uid IS NULL OR p_member_id IS NULL OR p_member_id=v_uid THEN RETURN false; END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid AND r.status='requested' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.communities c
 WHERE c.id=p_community_id AND c.owner_user_id=v_uid AND c.status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.community_memberships m SET role='admin'
 WHERE m.community_id=p_community_id AND m.user_id=p_member_id AND m.role='member'
 AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_member_id);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$set_admin$;

CREATE OR REPLACE FUNCTION public.pazo_community_offer_transfer(
 p_community_id uuid,p_candidate_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $offer$
DECLARE v_uid uuid:=auth.uid();v_old community_private.ownership_transfer_offers%ROWTYPE;
BEGIN
 IF v_uid IS NULL OR p_candidate_id IS NULL OR p_candidate_id=v_uid THEN RETURN false; END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid AND r.status='requested' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.communities c
 WHERE c.id=p_community_id AND c.owner_user_id=v_uid AND c.status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.community_memberships m
  WHERE m.community_id=p_community_id AND m.user_id=p_candidate_id AND m.role='admin')
 THEN RETURN false; END IF;
 SELECT * INTO v_old FROM community_private.ownership_transfer_offers
 WHERE community_id=p_community_id FOR UPDATE;
 IF FOUND AND v_old.status='pending' AND v_old.expires_at>pg_catalog.clock_timestamp()
 AND EXISTS(SELECT 1 FROM account_requests_private.deletion_requests r
  WHERE r.subject_user_id=v_uid AND r.status='requested'
  AND r.requested_at<=v_old.created_at)
 THEN RETURN false; END IF;
 INSERT INTO community_private.ownership_transfer_offers(
 community_id,owner_user_id,candidate_user_id,status,created_at,expires_at,accepted_at)
 VALUES(p_community_id,v_uid,p_candidate_id,'pending',pg_catalog.clock_timestamp(),
        pg_catalog.clock_timestamp()+interval '7 days',NULL)
 ON CONFLICT(community_id) DO UPDATE
 SET owner_user_id=EXCLUDED.owner_user_id,candidate_user_id=EXCLUDED.candidate_user_id,
 status='pending',created_at=EXCLUDED.created_at,expires_at=EXCLUDED.expires_at,accepted_at=NULL;
 RETURN true;
END;
$offer$;

-- Only the named candidate, logged in with THEIR OWN JWT, may accept.
-- Database transaction atomically updates both owner membership and FK.
CREATE OR REPLACE FUNCTION public.pazo_community_accept_transfer(p_community_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $accept$
DECLARE v_uid uuid:=auth.uid();v_owner uuid;v_offer community_private.ownership_transfer_offers%ROWTYPE;
BEGIN
 IF v_uid IS NULL THEN RETURN false; END IF;
 SELECT o.owner_user_id INTO v_owner
 FROM community_private.ownership_transfer_offers o
 WHERE o.community_id=p_community_id AND o.candidate_user_id=v_uid
 AND o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp();
 IF v_owner IS NULL THEN RETURN false; END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_owner AND r.status='requested'
 AND EXISTS(SELECT 1 FROM community_private.ownership_transfer_offers o
  WHERE o.community_id=p_community_id AND o.owner_user_id=v_owner
  AND o.status='pending' AND o.created_at>=r.requested_at)
 FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.communities c
 WHERE c.id=p_community_id AND c.owner_user_id=v_owner AND c.status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO v_offer FROM community_private.ownership_transfer_offers
 WHERE community_id=p_community_id FOR UPDATE;
 IF NOT FOUND OR v_offer.owner_user_id IS DISTINCT FROM v_owner
 OR v_offer.candidate_user_id IS DISTINCT FROM v_uid
 OR v_offer.status<>'pending' OR v_offer.expires_at<=pg_catalog.clock_timestamp()
 OR NOT EXISTS(SELECT 1 FROM public.community_memberships m
               WHERE m.community_id=p_community_id AND m.user_id=v_uid AND m.role='admin')
 THEN RETURN false; END IF;
 UPDATE public.community_memberships SET role='member'
 WHERE community_id=p_community_id AND user_id=v_owner AND role='owner';
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing existing owner membership'; END IF;
 UPDATE public.community_memberships SET role='owner'
 WHERE community_id=p_community_id AND user_id=v_uid AND role='admin';
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing eligible admin membership'; END IF;
 UPDATE public.communities SET owner_user_id=v_uid WHERE id=p_community_id AND owner_user_id=v_owner;
 IF NOT FOUND THEN RAISE EXCEPTION 'Community owner changed during transfer'; END IF;
 UPDATE community_private.ownership_transfer_offers
 SET status='accepted',accepted_at=pg_catalog.clock_timestamp()
 WHERE community_id=p_community_id;
 RETURN true;
END;
$accept$;

-- A candidate may refuse without waiting for the 7-day expiry.
CREATE OR REPLACE FUNCTION public.pazo_community_decline_transfer(p_community_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $decline$
DECLARE v_uid uuid:=auth.uid();v_count integer;
BEGIN
 IF v_uid IS NULL THEN RETURN false; END IF;
 UPDATE community_private.ownership_transfer_offers o SET status='declined'
 WHERE o.community_id=p_community_id AND o.candidate_user_id=v_uid
 AND o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp();
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$decline$;

-- Users can only see a targeted offer: owner or candidate, never another member.
CREATE OR REPLACE FUNCTION public.pazo_community_transfer_offer(p_community_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $read_offer$
DECLARE v_uid uuid:=auth.uid();v_result jsonb;
BEGIN
 IF v_uid IS NULL THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'status',o.status,'candidate_user_id',o.candidate_user_id,'expires_at',o.expires_at)
 INTO v_result FROM community_private.ownership_transfer_offers o
 WHERE o.community_id=p_community_id AND o.status='pending'
 AND o.expires_at>pg_catalog.clock_timestamp()
 AND (o.owner_user_id=v_uid OR o.candidate_user_id=v_uid)
 AND EXISTS(SELECT 1 FROM account_requests_private.deletion_requests r
  WHERE r.subject_user_id=o.owner_user_id AND r.status='requested'
    AND r.requested_at<=o.created_at);
 RETURN v_result;
END;
$read_offer$;

-- Worker-only archival is separately gated on status 'processing', which the
-- user-facing RPCs cannot set. Unexpired transfer offers block archival.
-- Status-first then null owner retains all posts/comments and prevents cascade.
CREATE OR REPLACE FUNCTION public.pazo_archive_owned_communities_for_deletion(
 p_subject_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $archive$
DECLARE v_community record;v_archived integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=p_subject_user_id AND r.status='processing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Deletion request is not processing'; END IF;
 FOR v_community IN SELECT c.id FROM public.communities c
   WHERE c.owner_user_id=p_subject_user_id ORDER BY c.id FOR UPDATE
 LOOP
  IF EXISTS(SELECT 1 FROM community_private.ownership_transfer_offers o
   WHERE o.community_id=v_community.id AND o.owner_user_id=p_subject_user_id
   AND o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp())
  THEN RAISE EXCEPTION 'Community has pending transfer acceptance'; END IF;
  -- No community continuity path may conceal a later cascade of replies
  -- owned by another account on posts written by the departing account.
  IF EXISTS(SELECT 1 FROM public.community_post_comments cc
     JOIN public.community_posts cp ON cp.id=cc.post_id
     JOIN public.pets pet ON pet.id=cc.author_pet_id
     WHERE cp.community_id=v_community.id
       AND cp.author_user_id=p_subject_user_id
       AND pet.owner_id<>p_subject_user_id)
  THEN RAISE EXCEPTION 'Other users comments on departing owner posts require preservation'; END IF;
  UPDATE public.communities SET status='archived',owner_user_id=NULL
   WHERE id=v_community.id AND owner_user_id=p_subject_user_id;
  UPDATE public.community_memberships SET role='member'
   WHERE community_id=v_community.id AND user_id=p_subject_user_id AND role='owner';
  v_archived:=v_archived+1;
 END LOOP;
 RETURN v_archived;
END;
$archive$;

-- All exposed actions derive caller identity from auth.uid().
REVOKE ALL ON FUNCTION public.pazo_community_set_admin(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_community_offer_transfer(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_community_accept_transfer(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_community_transfer_offer(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_community_decline_transfer(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_archive_owned_communities_for_deletion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_community_set_admin(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_community_offer_transfer(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_community_accept_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_community_transfer_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_community_decline_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_archive_owned_communities_for_deletion(uuid) TO service_role;
COMMIT;
