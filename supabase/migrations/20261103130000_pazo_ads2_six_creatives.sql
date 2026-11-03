-- PAZO Ads2: additive allowlist for six PO-approved English ads.
-- Preserve historical codes, existing 14d retention, QA exclusions, and gates.
-- Intended for directed, single migration installation AFTER CI and PO release.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $pazo_ads2_six$
DECLARE
  fn record;
  definition text;
  old_codes CONSTANT text := '''qr_v2_en'',''cuidados_v2_en'',''app_v2_en''';
  new_codes CONSTANT text := old_codes || ',''c2_en_01_qr'',''c2_en_02_care'',''c2_en_03_alert'',''c2_en_04_places'',''c2_en_05_community'',''c2_en_06_overview''';
  updated_count integer := 0;
BEGIN
  -- Extend exactly the eight pre-existing closed filters, no function bodies
  -- reconstructed from an old snapshot (the live bodies may evolve).
  FOR fn IN
    SELECT p.oid,n.nspname || '.' || p.proname AS name
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.prokind='f'
      AND n.nspname || '.' || p.proname = ANY(ARRAY[
        'marketing_private.campaign_for_creative',
        'marketing_private.record_landing_core',
        'marketing_private.record_verified_acquisition',
        'public.pazo_admin_behavior_summary_v1',
        'public.pazo_admin_first_utility_summary',
        'public.pazo_admin_intelligence_summary_v1',
        'public.pazo_admin_visual_summary_v1',
        'public.pazo_marketing_prereg_signal_v1'
      ])
    ORDER BY n.nspname,p.proname
  LOOP
    definition := pg_get_functiondef(fn.oid);
    IF position(old_codes IN definition)=0
       OR position('''c2_en_01_qr''' IN definition)>0 THEN
      RAISE EXCEPTION 'Ads2 allowlist preflight failed: %',fn.name;
    END IF;
    EXECUTE replace(definition,old_codes,new_codes);
    updated_count := updated_count+1;
  END LOOP;
  IF updated_count<>8 THEN
    RAISE EXCEPTION 'Expected eight existing Ads2 functions; found %',updated_count;
  END IF;
END
$pazo_ads2_six$;
COMMIT;
