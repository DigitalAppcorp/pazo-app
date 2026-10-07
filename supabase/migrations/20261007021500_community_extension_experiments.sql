INSERT INTO validation_private.modules (module_key)
VALUES
  ('communities_events'),
  ('communities_challenges'),
  ('communities_badges'),
  ('communities_qa'),
  ('communities_admin_tools')
ON CONFLICT (module_key) DO NOTHING;
