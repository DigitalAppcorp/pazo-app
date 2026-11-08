BEGIN;

-- The private schema is not exposed through the Data API.
CREATE SCHEMA pwa_private;
REVOKE ALL ON SCHEMA pwa_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pwa_private TO authenticated;

CREATE TABLE pwa_private.collection_gate (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO pwa_private.collection_gate DEFAULT VALUES;

-- Row existence is the only mark. No event history, dates, or device IDs.
CREATE TABLE pwa_private.detected_installations (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE pwa_private.detected_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_private.detected_installations FORCE ROW LEVEL SECURITY;
ALTER TABLE pwa_private.collection_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_private.collection_gate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pwa_private.detected_installations,pwa_private.collection_gate FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION pwa_private.record_installation(p_expected_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  owner uuid := auth.uid();
BEGIN
  IF owner IS NULL OR owner IS DISTINCT FROM p_expected_owner
     OR NOT public.pazo_maintenance_data_allowed()
     OR NOT EXISTS (SELECT 1 FROM pwa_private.collection_gate WHERE singleton AND enabled)
     OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=owner AND email_confirmed_at IS NOT NULL AND NOT is_anonymous)
     OR NOT marketing_private.is_reporting_owner(owner) THEN RETURN false;
  END IF;
  INSERT INTO pwa_private.detected_installations(owner_id) VALUES(owner) ON CONFLICT (owner_id) DO NOTHING;
  RETURN true;
END;
$$;

CREATE FUNCTION pwa_private.installation_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN
    RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pwa_private.collection_gate WHERE singleton AND enabled) THEN
    RETURN jsonb_build_object('enabled',false);
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'enabled',true,
      'detected',count(d.owner_id),
      'not_detected',count(*)-count(d.owner_id)
    )
    FROM auth.users u
    LEFT JOIN pwa_private.detected_installations d ON d.owner_id=u.id
    WHERE u.email_confirmed_at IS NOT NULL AND NOT u.is_anonymous AND marketing_private.is_reporting_owner(u.id)
  );
END;
$$;

CREATE FUNCTION public.pazo_record_pwa_installation(p_expected_owner uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT pwa_private.record_installation(p_expected_owner);
$$;
CREATE FUNCTION public.pazo_admin_pwa_installation_counts()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT pwa_private.installation_counts();
$$;

REVOKE ALL ON FUNCTION pwa_private.record_installation(uuid),pwa_private.installation_counts(),
  public.pazo_record_pwa_installation(uuid),public.pazo_admin_pwa_installation_counts() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION pwa_private.record_installation(uuid),pwa_private.installation_counts(),
  public.pazo_record_pwa_installation(uuid),public.pazo_admin_pwa_installation_counts() TO authenticated;

COMMIT;
