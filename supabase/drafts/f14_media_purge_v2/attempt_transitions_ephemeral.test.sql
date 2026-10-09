-- F14 A2: only ephemeral Postgres. All IDs synthetic, ROLLBACK mandatory.
BEGIN;
INSERT INTO moderation_private.media_claims(claim_id,status) VALUES
 ('11111111-1111-4111-8111-111111111111','held'),
 ('22222222-2222-4222-8222-222222222222','held'),
 ('33333333-3333-4333-8333-333333333333','invalidated');

INSERT INTO moderation_private.media_purge_attempts(
 operation_id,claim_id,storage_object_id,bucket,object_path,
 object_version,fence_generation,fence_token
) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'post-photos','synthetic/a.webp','01234567abcdef00',1,
  '77777777-7777-4777-8777-777777777777'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  '55555555-5555-4555-8555-555555555555',
  'community-post-photos','synthetic/b.webp','01234567abcdef11',2,
  '88888888-8888-4888-8888-888888888888'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-3333-4333-8333-333333333333',
  '66666666-6666-4666-8666-666666666666',
  'post-photos','synthetic/c.webp','01234567abcdef22',3,
  '99999999-9999-4999-8999-999999999999');

INSERT INTO moderation_private.media_writer_fences(
 bucket,object_path,generation,active_operation_id
) VALUES
 ('post-photos','synthetic/a.webp',1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('community-post-photos','synthetic/b.webp',2,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('post-photos','synthetic/c.webp',3,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');

DO $test$
DECLARE s jsonb; op uuid; token uuid; n int;
BEGIN
 IF has_function_privilege('anon',
 'moderation_private.f14_draft_record_possible_dispatch(uuid,uuid,bigint)','EXECUTE')
 OR has_function_privilege('authenticated',
 'moderation_private.f14_draft_note_transport(uuid,uuid,bigint,text)','EXECUTE')
 OR has_function_privilege('service_role',
 'moderation_private.f14_draft_record_possible_dispatch(uuid,uuid,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Draft private transitions exposed to API role'; END IF;

 op:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 token:='77777777-7777-4777-8777-777777777777';
 s:=moderation_private.f14_draft_record_possible_dispatch(op,token,0);
 IF s->>'status'<>'manual_review' THEN RAISE EXCEPTION 'zero generation accepted'; END IF;
 s:=moderation_private.f14_draft_record_possible_dispatch(op,token,2);
 IF s->>'status'<>'manual_review' THEN RAISE EXCEPTION 'stale generation accepted'; END IF;
 s:=moderation_private.f14_draft_record_possible_dispatch(op,
      'ffffffff-ffff-4fff-8fff-ffffffffffff',1);
 IF s->>'status'<>'manual_review' THEN RAISE EXCEPTION 'wrong token accepted'; END IF;

 s:=moderation_private.f14_draft_record_possible_dispatch(op,token,1);
 IF s->>'status'<>'possibly_in_flight' OR s->>'mayDelete'<>'false'
 OR s->>'shouldSendHttp'<>'false' OR s->>'canReleaseHold'<>'false'
 THEN RAISE EXCEPTION 'dispatch ledger not fail-closed'; END IF;
 s:=moderation_private.f14_draft_record_possible_dispatch(op,token,1);
 IF s->>'status'<>'manual_review' THEN RAISE EXCEPTION 'double dispatch permitted'; END IF;

 SELECT count(*) INTO n FROM moderation_private.media_purge_attempt_events
 WHERE operation_id=op AND event_type='dispatch_recorded';
 IF n<>1 THEN RAISE EXCEPTION 'duplicate journal entry'; END IF;

 s:=moderation_private.f14_draft_note_transport(op,token,1,'timeout');
 IF s->>'status'<>'unknown_after_dispatch' OR s->>'canReleaseHold'<>'false'
 THEN RAISE EXCEPTION 'timeout illegally released held path'; END IF;
 s:=moderation_private.f14_draft_note_transport(op,token,1,'success');
 IF s->>'status'<>'manual_review' THEN RAISE EXCEPTION 'late success rewrote uncertain result'; END IF;
 SELECT count(*) INTO n FROM moderation_private.media_writer_fences
 WHERE active_operation_id=op AND state='possibly_in_flight';
 IF n<>1 THEN RAISE EXCEPTION 'writer fence was released after timeout'; END IF;

 op:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 token:='88888888-8888-4888-8888-888888888888';
 s:=moderation_private.f14_draft_record_possible_dispatch(op,token,2);
 IF s->>'status'<>'possibly_in_flight' THEN RAISE EXCEPTION 'second journal failed'; END IF;
 s:=moderation_private.f14_draft_note_transport(op,token,2,'success');
 IF s->>'status'<>'awaiting_origin_check' OR s->>'mayDelete'<>'false'
 THEN RAISE EXCEPTION 'HTTP success incorrectly established delete'; END IF;
 s:=moderation_private.f14_draft_note_transport(op,token,2,'success');
 IF s->>'status'<>'manual_review' THEN RAISE EXCEPTION 'duplicate HTTP success accepted'; END IF;

 s:=moderation_private.f14_draft_record_possible_dispatch(
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   '99999999-9999-4999-8999-999999999999',3);
 IF s->>'status'<>'manual_review'
 THEN RAISE EXCEPTION 'invalidated claim accepted'; END IF;
END $test$;
ROLLBACK;
