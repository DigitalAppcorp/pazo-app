-- CI disposable PostgreSQL ONLY. This fixture is committed inside throwaway DB.
-- Two independent psql processes later exercise the same operation concurrently.
INSERT INTO moderation_private.media_claims(claim_id,status)
VALUES ('11111111-1111-4111-8111-111111111111','held');
INSERT INTO moderation_private.media_purge_attempts(
 operation_id,claim_id,storage_object_id,bucket,object_path,
 object_version,fence_generation,fence_token
) VALUES (
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '44444444-4444-4444-8444-444444444444',
 'post-photos','synthetic/concurrent.webp','01234567abcdef00',1,
 '77777777-7777-4777-8777-777777777777'
);
INSERT INTO moderation_private.media_writer_fences(
 bucket,object_path,generation,active_operation_id
) VALUES ('post-photos','synthetic/concurrent.webp',1,
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
