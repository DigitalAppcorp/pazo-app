-- PAZO F14 A2: RUN ONLY ON EPHEMERAL POSTGRES CI WITH THROWAWAY STUBS.
-- Every UUID below is synthetic. No real users, files, reports or Storage API.
BEGIN;
INSERT INTO moderation_private.media_claims(claim_id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO moderation_private.media_purge_attempts(
 operation_id,claim_id,storage_object_id,bucket,object_path,object_version,
 fence_generation,fence_token
) VALUES (
 '33333333-3333-4333-8333-333333333333',
 '11111111-1111-4111-8111-111111111111',
 '44444444-4444-4444-8444-444444444444',
 'post-photos','owner/pet/test-photo.webp',
 '55555555-5555-4555-8555-555555555555',1,
 '66666666-6666-4666-8666-666666666666'
);
INSERT INTO moderation_private.media_writer_fences(
 bucket,object_path,generation,state,active_operation_id
) VALUES ('post-photos','owner/pet/test-photo.webp',1,'quarantined',
 '33333333-3333-4333-8333-333333333333');
INSERT INTO moderation_private.media_purge_attempt_events(
 operation_id,event_type,fence_generation
) VALUES ('33333333-3333-4333-8333-333333333333','prepared',1);

DO $f14_security$
DECLARE rejected boolean; table_name text;
BEGIN
 FOR table_name IN SELECT unnest(ARRAY[
  'media_purge_attempts','media_writer_fences','media_purge_attempt_events'
 ]) LOOP
  IF has_table_privilege('anon','moderation_private.'||table_name,'SELECT')
     OR has_table_privilege('authenticated','moderation_private.'||table_name,'INSERT')
     OR has_table_privilege('service_role','moderation_private.'||table_name,'SELECT')
     OR NOT EXISTS (
       SELECT 1 FROM pg_class c
       JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='moderation_private' AND c.relname=table_name
         AND c.relrowsecurity AND c.relforcerowsecurity
     )
  THEN RAISE EXCEPTION 'Private ledger permissions/RLS failure: %',table_name; END IF;
 END LOOP;

 -- Shared path across a different claim must be impossible.
 rejected:=false;
 BEGIN
  INSERT INTO moderation_private.media_purge_attempts(
   operation_id,claim_id,storage_object_id,bucket,object_path,object_version,
   fence_generation,fence_token
  ) VALUES(
   '77777777-7777-4777-8777-777777777777',
   '22222222-2222-4222-8222-222222222222',
   '88888888-8888-4888-8888-888888888888',
   'post-photos','owner/pet/test-photo.webp',
   '99999999-9999-4999-8999-999999999999',2,
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );
 EXCEPTION WHEN unique_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Duplicate Storage path accepted'; END IF;

 -- Insert a second valid claim/attempt so the wrong-path fence fails
 -- on the COMPOSITE FK, rather than the unique active_operation_id check.
 INSERT INTO moderation_private.media_purge_attempts(
  operation_id,claim_id,storage_object_id,bucket,object_path,object_version,
  fence_generation,fence_token
 ) VALUES(
  '77777777-7777-4777-8777-777777777777',
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'post-photos','owner/pet/legitimate.webp',
  '99999999-9999-4999-8999-999999999999',2,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 );
 -- Fence cannot claim an operation belonging to a different path.
 rejected:=false;
 BEGIN
  INSERT INTO moderation_private.media_writer_fences(
   bucket,object_path,generation,active_operation_id
  ) VALUES('post-photos','owner/pet/other.webp',2,
           '77777777-7777-4777-8777-777777777777');
 EXCEPTION WHEN foreign_key_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Cross-object fence was accepted'; END IF;

 -- A fence with a different generation must also be rejected at FK layer.
 rejected:=false;
 BEGIN
  UPDATE moderation_private.media_writer_fences SET generation=99
  WHERE active_operation_id='33333333-3333-4333-8333-333333333333';
 EXCEPTION WHEN foreign_key_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Cross-generation fence was accepted'; END IF;

 -- Replay must not create duplicate event for same operation/generation.
 rejected:=false;
 BEGIN
  INSERT INTO moderation_private.media_purge_attempt_events(
   operation_id,event_type,fence_generation
  ) VALUES('33333333-3333-4333-8333-333333333333','prepared',1);
 EXCEPTION WHEN unique_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Duplicate attempt event accepted'; END IF;

 -- Unknown phase "purged" must be impossible at SQL layer.
 rejected:=false;
 BEGIN
  UPDATE moderation_private.media_purge_attempts SET phase='purged'
  WHERE operation_id='33333333-3333-4333-8333-333333333333';
 EXCEPTION WHEN check_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unverified purged state accepted'; END IF;

 -- Suspicious/unsafe paths cannot be stored as authorized media identities.
 rejected:=false;
 BEGIN
  INSERT INTO moderation_private.media_purge_attempts(
   operation_id,claim_id,storage_object_id,bucket,object_path,object_version,
   fence_generation,fence_token
  ) VALUES(
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '22222222-2222-4222-8222-222222222222',
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'post-photos','../unsafe.webp',
   'dddddddd-dddd-4ddd-8ddd-dddddddddddd',1,
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  );
 EXCEPTION WHEN check_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unsafe path accepted'; END IF;
END $f14_security$;
ROLLBACK;
