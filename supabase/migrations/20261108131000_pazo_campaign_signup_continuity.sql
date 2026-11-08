BEGIN;
SET LOCAL lock_timeout='5s';

-- Extend only the account row of the existing admin-only sign-up projection.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('admin_private.signup_summary_v1(uuid[])'::regprocedure);
  marker text := $mark$'confirmed', a.confirmed, 'signed_in', a.signed_in$mark$;
BEGIN
  IF length(definition) - length(replace(definition, marker, '')) <> length(marker) THEN
    RAISE EXCEPTION 'Unexpected administrator signup projection';
  END IF;
  EXECUTE replace(definition, marker, marker || $extension$,
     'ad_campaign', (SELECT acquisition.campaign FROM marketing_private.acquisition acquisition
       CROSS JOIN marketing_private.collection_gate gate
       WHERE acquisition.owner_id = a.id AND gate.singleton AND gate.retention_days > 0
         AND acquisition.recorded_at > statement_timestamp() - make_interval(days => least(gate.retention_days, 14)))$extension$);
END;
$migration$;

CREATE TABLE marketing_private.signup_campaign_gate (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO marketing_private.signup_campaign_gate DEFAULT VALUES;

CREATE TABLE marketing_private.pending_signup_campaign (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creative text NOT NULL CHECK (marketing_private.campaign_for_creative(creative) IS NOT NULL),
  first_touch_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at = first_touch_at + interval '72 hours')
);
CREATE INDEX pazo_pending_signup_campaign_expiry ON marketing_private.pending_signup_campaign(expires_at);
ALTER TABLE marketing_private.signup_campaign_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.signup_campaign_gate FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.pending_signup_campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.pending_signup_campaign FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.signup_campaign_gate,marketing_private.pending_signup_campaign
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.stage_signup_campaign() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='200ms' AS $$
DECLARE
  supplied jsonb := NEW.raw_user_meta_data->'pazo_pending_campaign';
  code text := supplied->>'creative';
  milliseconds text := supplied->>'first_touch_ms';
  touch timestamptz;
BEGIN
  IF supplied IS NULL THEN RETURN NEW; END IF;
  -- The metadata is a transient input. Only the private row may persist.
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data - 'pazo_pending_campaign' WHERE id=NEW.id;
  BEGIN
  IF NEW.email_confirmed_at IS NOT NULL OR NEW.is_anonymous OR NEW.raw_app_meta_data->>'provider' IS DISTINCT FROM 'email'
     OR NOT EXISTS (SELECT 1 FROM marketing_private.signup_campaign_gate WHERE singleton AND enabled)
     OR NOT EXISTS (SELECT 1 FROM marketing_private.collection_gate WHERE singleton AND enabled AND retention_days=14
         AND marketing_private.retention_ready(retention_days,policy_version))
     OR NOT marketing_private.is_reporting_owner(NEW.id)
     OR marketing_private.campaign_for_creative(code) IS NULL
     OR milliseconds IS NULL OR milliseconds !~ '^[0-9]{13}$' THEN RETURN NEW;
  END IF;
  touch := to_timestamp(milliseconds::double precision / 1000);
  IF touch > statement_timestamp() OR touch <= statement_timestamp() - interval '72 hours'
     OR NEW.created_at < touch - interval '5 minutes' THEN RETURN NEW;
  END IF;
  INSERT INTO marketing_private.pending_signup_campaign(owner_id,creative,first_touch_at,expires_at)
  VALUES (NEW.id,code,touch,touch + interval '72 hours') ON CONFLICT (owner_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Failed optional attribution must not prevent the underlying signup.
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE FUNCTION marketing_private.promote_signup_campaign() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='200ms' AS $$
DECLARE
  pending marketing_private.pending_signup_campaign%ROWTYPE;
BEGIN
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  DELETE FROM marketing_private.pending_signup_campaign WHERE owner_id=NEW.id RETURNING * INTO pending;
  IF pending.owner_id IS NOT NULL AND pending.expires_at > statement_timestamp()
     AND EXISTS (SELECT 1 FROM marketing_private.signup_campaign_gate WHERE singleton AND enabled)
     AND EXISTS (SELECT 1 FROM marketing_private.collection_gate WHERE singleton AND enabled AND retention_days=14
         AND marketing_private.retention_ready(retention_days,policy_version)) THEN
    PERFORM marketing_private.record_verified_acquisition(NEW.id,pending.creative,pending.first_touch_at);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A measurement outage cannot stop a person from confirming their account.
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION marketing_private.stage_signup_campaign(),marketing_private.promote_signup_campaign()
  FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER pazo_stage_signup_campaign AFTER INSERT ON auth.users
  FOR EACH ROW WHEN (NEW.raw_user_meta_data ? 'pazo_pending_campaign')
  EXECUTE FUNCTION marketing_private.stage_signup_campaign();
CREATE TRIGGER pazo_promote_signup_campaign AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION marketing_private.promote_signup_campaign();

SELECT cron.schedule('pazo-expired-signup-campaign-v1','*/5 * * * *',
  $$DELETE FROM marketing_private.pending_signup_campaign p
    WHERE p.expires_at <= statement_timestamp()
       OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id=p.owner_id AND u.email_confirmed_at IS NOT NULL)$$);
COMMIT;
