-- PAZO F14 A2. PRIVATE / SIMULATION-ONLY SQL. DO NOT DEPLOY.
-- NOT a production purge API, not a writer fence for Storage HTTP.
-- SECURITY INVOKER + explicit REVOKE means no API role can use these routines.
-- All return values deny deletion; only an isolated PostgreSQL test uses them.
BEGIN;

CREATE FUNCTION moderation_private.f14_draft_record_possible_dispatch(
  p_operation uuid, p_token uuid, p_generation bigint
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $f14$
DECLARE
  v_phase text;
  v_state text;
  v_count smallint;
BEGIN
  IF p_operation IS NULL OR p_token IS NULL OR
     p_generation IS NULL OR p_generation < 1 THEN
    RETURN jsonb_build_object('status','manual_review','mayDelete',false,
      'shouldSendHttp',false,'reason','invalid_input');
  END IF;

  -- A coordinated writer must use the SAME private transaction/lock.
  -- An external service_role client that calls Storage HTTP directly does not.
  SELECT a.phase,f.state,a.dispatch_count INTO v_phase,v_state,v_count
  FROM moderation_private.media_purge_attempts a
  JOIN moderation_private.media_writer_fences f
    ON f.active_operation_id=a.operation_id
    AND f.bucket=a.bucket AND f.object_path=a.object_path
  JOIN moderation_private.media_claims c ON c.claim_id=a.claim_id
  WHERE a.operation_id=p_operation AND a.fence_token=p_token
    AND a.fence_generation=p_generation AND f.generation=p_generation
    AND c.status='held'
  FOR UPDATE OF a,f;

  IF NOT FOUND OR v_phase<>'prepared_unverified' OR
     v_state<>'quarantined' OR v_count<>0 THEN
    RETURN jsonb_build_object('status','manual_review','mayDelete',false,
      'shouldSendHttp',false,'reason','missing_stale_or_duplicate_fence');
  END IF;

  UPDATE moderation_private.media_purge_attempts
  SET phase='possibly_in_flight',dispatch_count=1,
      dispatch_recorded_at=clock_timestamp()
  WHERE operation_id=p_operation;
  UPDATE moderation_private.media_writer_fences
  SET state='possibly_in_flight',changed_at=clock_timestamp()
  WHERE active_operation_id=p_operation;
  INSERT INTO moderation_private.media_purge_attempt_events(
    operation_id,event_type,fence_generation
  ) VALUES(p_operation,'dispatch_recorded',p_generation);

  -- This records ONLY "might be dispatched". No HTTP permission is returned;
  -- a committed journal does not prove that every privileged writer cooperates.
  RETURN jsonb_build_object('status','possibly_in_flight','mayDelete',false,
    'shouldSendHttp',false,'canReleaseHold',false);
END;
$f14$;

CREATE FUNCTION moderation_private.f14_draft_note_transport(
  p_operation uuid, p_token uuid, p_generation bigint, p_outcome text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $f14$
DECLARE
  v_phase text;
  v_state text;
  v_event text;
  v_target text;
BEGIN
  IF p_outcome NOT IN ('timeout','error','success') OR p_outcome IS NULL THEN
    RETURN jsonb_build_object('status','manual_review','mayDelete',false,
      'shouldSendHttp',false,'reason','invalid_transport_event');
  END IF;

  SELECT a.phase,f.state INTO v_phase,v_state
  FROM moderation_private.media_purge_attempts a
  JOIN moderation_private.media_writer_fences f
    ON f.active_operation_id=a.operation_id
    AND f.bucket=a.bucket AND f.object_path=a.object_path
  WHERE a.operation_id=p_operation AND a.fence_token=p_token
    AND a.fence_generation=p_generation AND f.generation=p_generation
  FOR UPDATE OF a,f;

  IF NOT FOUND OR v_phase<>'possibly_in_flight' OR
     v_state<>'possibly_in_flight' THEN
    RETURN jsonb_build_object('status','manual_review','mayDelete',false,
      'shouldSendHttp',false,'reason','unregistered_or_duplicate_response');
  END IF;

  v_event:=CASE p_outcome
    WHEN 'timeout' THEN 'http_timeout'
    WHEN 'error' THEN 'http_error'
    ELSE 'http_success_observed' END;
  v_target:=CASE WHEN p_outcome='success'
    THEN 'awaiting_origin_check' ELSE 'unknown_after_dispatch' END;

  UPDATE moderation_private.media_purge_attempts
  SET phase=v_target,checked_at=clock_timestamp()
  WHERE operation_id=p_operation;

  INSERT INTO moderation_private.media_purge_attempt_events(
    operation_id,event_type,fence_generation
  ) VALUES(p_operation,v_event,p_generation);

  -- f.state remains possibly_in_flight: never release held path by timeout.
  RETURN jsonb_build_object('status',v_target,'mayDelete',false,
    'shouldSendHttp',false,'canReleaseHold',false);
END;
$f14$;

REVOKE ALL ON FUNCTION
  moderation_private.f14_draft_record_possible_dispatch(uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION
  moderation_private.f14_draft_note_transport(uuid,uuid,bigint,text)
  FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
-- No deletion, grant, release/mark_purged, Storage call or automatic retry.
