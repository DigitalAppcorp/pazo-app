-- Disposable CI only: first writer holds row locks until COMMIT.
BEGIN;
DO $f14$
DECLARE result jsonb;
BEGIN
 result:=moderation_private.f14_draft_record_possible_dispatch(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '77777777-7777-4777-8777-777777777777',1);
 IF result->>'status'<>'possibly_in_flight' OR
    result->>'shouldSendHttp'<>'false' OR result->>'mayDelete'<>'false'
 THEN RAISE EXCEPTION 'First writer could not journal safely'; END IF;
END $f14$;
SELECT pg_sleep(6) /* f14_row_lock_witness */;
COMMIT;
