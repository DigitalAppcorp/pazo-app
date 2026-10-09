-- Disposable CI only: concurrent second writer MUST fail on held row locks.
BEGIN;
SET LOCAL lock_timeout = '450ms';
DO $f14$
DECLARE rejected boolean:=false; result jsonb;
BEGIN
 BEGIN
  result:=moderation_private.f14_draft_record_possible_dispatch(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '77777777-7777-4777-8777-777777777777',1);
 EXCEPTION WHEN lock_not_available THEN rejected:=true; END;
 IF NOT rejected
 THEN RAISE EXCEPTION 'Concurrent duplicate dispatch escaped row-lock timeout'; END IF;
END $f14$;
ROLLBACK;
