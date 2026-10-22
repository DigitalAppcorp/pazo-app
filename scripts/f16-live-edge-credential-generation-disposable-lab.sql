-- Add Edge-only (nonsecret) generation metadata in disposable PG17.
-- Earlier CAS lab simulates Live/stop; preserve whatever switch it leaves.
CREATE TEMP TABLE f16_edge_switch_snapshot AS
 SELECT singleton,environment,live_enabled,kill_switch,active_generation,revision
 FROM admin_private.pazo_paypal_new_checkout_switch;
\i supabase/drafts/f16_live_edge_credential_source_DISPOSABLE_ONLY.sql
DO $edge_gen$
DECLARE v bigint; count_bad int;
BEGIN
 -- The existing G1 Vault-backed test record must stay valid without rewrite.
 IF NOT EXISTS(
  SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
  WHERE generation=1 AND credential_source='vault' AND
   client_id_vault IS NOT NULL AND client_secret_vault IS NOT NULL
 ) THEN RAISE EXCEPTION 'Legacy Vault merchant lost credentials metadata'; END IF;
 INSERT INTO admin_private.pazo_paypal_merchant_generations(
  environment,merchant_fingerprint_sha256,plan_id,webhook_id,
  credential_source,client_id_vault,client_secret_vault
 ) VALUES ('live',repeat('e',64),'P-EDGEGENABCDE12',
  'WH-EDGEORIGINAL9','edge_secrets',NULL,NULL)
 RETURNING generation INTO v;
 IF v IS NULL OR NOT EXISTS(
  SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
  WHERE generation=v AND credential_source='edge_secrets'
   AND client_id_vault IS NULL AND client_secret_vault IS NULL)
 THEN RAISE EXCEPTION 'Edge credential generation not inserted safely'; END IF;
 BEGIN
  INSERT INTO admin_private.pazo_paypal_merchant_generations(
   environment,merchant_fingerprint_sha256,plan_id,webhook_id,
   credential_source,client_id_vault,client_secret_vault
  ) VALUES ('live',repeat('f',64),'P-EDGEGENABCDE12',
   'WH-BADMIXEDGEN9','edge_secrets',
   '11111111-1111-4111-8111-111111111111',NULL);
  RAISE EXCEPTION 'Mixed Edge/Vault credentials accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO admin_private.pazo_paypal_merchant_generations(
   environment,merchant_fingerprint_sha256,plan_id,webhook_id,
   credential_source,client_id_vault,client_secret_vault
  ) VALUES ('live',repeat('d',64),'P-EDGEGENABCDE12',
   'WH-BADMIXEDGEN7','vault',NULL,NULL);
  RAISE EXCEPTION 'Missing legacy Vault refs accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF has_table_privilege('service_role',
  'admin_private.pazo_paypal_merchant_generations','SELECT') THEN
  RAISE EXCEPTION 'Added Edge generations leaked table privileges'; END IF;
 IF EXISTS(
  SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch s
  FULL OUTER JOIN f16_edge_switch_snapshot b USING(singleton)
  WHERE s.singleton IS NULL OR b.singleton IS NULL OR
   (s.environment,s.live_enabled,s.kill_switch,s.active_generation,s.revision)
    IS DISTINCT FROM
   (b.environment,b.live_enabled,b.kill_switch,b.active_generation,b.revision)
 ) THEN RAISE EXCEPTION 'Metadata adaptation mutated checkout switch'; END IF;
 RAISE NOTICE 'F16_EDGE_GENERATION_METADATA_DISPOSABLE_PG17_PASS';
END $edge_gen$;
