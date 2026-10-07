INSERT INTO validation_private.modules (module_key)
VALUES
  ('places_reviews'),
  ('places_favorites'),
  ('places_user_photos'),
  ('places_events'),
  ('places_routes'),
  ('places_business_offers')
ON CONFLICT (module_key) DO NOTHING;
