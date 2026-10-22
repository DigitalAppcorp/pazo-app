-- F16-P14: authenticated-identity precondition is server-side;
-- SQL service-only function checks private owner and immutable exact copy.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE postgres;
DO $t$
DECLARE
 owner_a uuid:='92929292-1111-4111-8111-111111111111';
 owner_b uuid:='92929292-2222-4222-8222-222222222222';
 key_a uuid:='92929292-3333-4333-8333-333333333333';
 v text:='pazo-supporter-p14.v1';
 es text:=repeat('PAZO mensual de prueba sintética ES. ',5);
 en text:=repeat('PAZO synthetic monthly offer EN. ',5);
 hash text;
 a jsonb;
 b jsonb;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN RAISE EXCEPTION 'P14 disposable only'; END IF;
 IF has_function_privilege('anon',
  'public.f16_p14_read_owner_checkout_acknowledgement(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated',
  'public.f16_p14_read_owner_checkout_acknowledgement(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role',
  'public.f16_p14_read_owner_checkout_acknowledgement(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P14 service-only RPC exposed'; END IF;
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 VALUES(owner_a,'authenticated','authenticated','p14-a@invalid.test','{}','{}'),
       (owner_b,'authenticated','authenticated','p14-b@invalid.test','{}','{}');
 INSERT INTO supporter_private.paypal_p06_offers
   (version,locale,exact_copy,plan_id,published_at)
 VALUES(v,'es',es,'P-14V25407JP6850922NLHMDKI',
  pg_catalog.clock_timestamp()-interval '1 minute'),
       (v,'en',en,'P-14V25407JP6850922NLHMDKI',
  pg_catalog.clock_timestamp()-interval '1 minute');
 SELECT sha256 INTO hash FROM supporter_private.paypal_p06_offers
 WHERE version=v AND locale='es';
 -- Can't produce consent proof from unpublished/no consent.
 IF public.f16_p14_read_owner_checkout_acknowledgement(owner_a,
  'intent-77777777-7777-4777-8777-777777777777') IS NOT NULL
 THEN RAISE EXCEPTION 'P14 fabricated consent record'; END IF;
 a:=public.f16_p06_begin_checkout(owner_a,key_a,'es',v,hash,true);
 b:=public.f16_p14_read_owner_checkout_acknowledgement(owner_a,a->>'intentId');
 IF b IS NULL OR b->>'ownerId'<>owner_a::text
 OR b->>'intentId'<>a->>'intentId'
 OR b->>'exactCopy'<>es OR b->>'locale'<>'es'
 OR b->>'termsDigest'<>hash OR b->>'currency'<>'USD'
 OR (b->>'priceMinor')::int<>299
 OR b->>'consentedAt' IS NULL
 THEN RAISE EXCEPTION 'P14 exact owner acceptance not reconstructed'; END IF;
 IF public.f16_p14_read_owner_checkout_acknowledgement(owner_b,a->>'intentId') IS NOT NULL
 OR public.f16_p14_read_owner_checkout_acknowledgement(owner_a,
 'intent-88888888-8888-4888-8888-888888888888') IS NOT NULL
 THEN RAISE EXCEPTION 'P14 exposes other owner or invented intent'; END IF;
 -- New later offer version does not rewrite the accepted document.
 INSERT INTO supporter_private.paypal_p06_offers
  (version,locale,exact_copy,plan_id,published_at)
 VALUES('pazo-supporter-p14.v2','es',repeat('Nueva revisión. ',15),
   'P-14V25407JP6850922NLHMDKI',pg_catalog.clock_timestamp()),
       ('pazo-supporter-p14.v2','en',repeat('New revision. ',15),
   'P-14V25407JP6850922NLHMDKI',pg_catalog.clock_timestamp());
 IF public.f16_p14_read_owner_checkout_acknowledgement(owner_a,a->>'intentId')
   ->>'exactCopy'<>es
 THEN RAISE EXCEPTION 'P14 replaced original terms with current offer'; END IF;
 -- This does not activate service or create a payment.
 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR supporter_private.wall_has_verified_entitlement(owner_a) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'P14 silently credited financial benefits'; END IF;
END
$t$;
ROLLBACK;
