-- Disposable CI only: after first writer commits, no replay is accepted.
BEGIN;
DO $f14$
DECLARE result jsonb; n integer; phase text;
BEGIN
 result:=moderation_private.f14_draft_record_possible_dispatch(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '77777777-7777-4777-8777-777777777777',1);
 IF result->>'status'<>'manual_review' OR result->>'mayDelete'<>'false'
 THEN RAISE EXCEPTION 'Duplicate dispatch accepted after COMMIT'; END IF;
 SELECT count(*) INTO n FROM moderation_private.media_purge_attempt_events
 WHERE operation_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
   AND event_type='dispatch_recorded';
 IF n<>1 THEN RAISE EXCEPTION 'Journal recorded more than one dispatch'; END IF;
 SELECT phase INTO phase FROM moderation_private.media_purge_attempts
 WHERE operation_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 IF phase<>'possibly_in_flight' THEN RAISE EXCEPTION 'Journal lost uncertain state'; END IF;
END $f14$;
ROLLBACK;
