-- Initial curated Phase 8 catalog.
-- Coordinates were independently reviewed from public place/location sources.
-- Keep seed data separate from schema so catalog changes do not rewrite core history.

INSERT INTO public.pet_places (
  id,
  name,
  category,
  zone,
  address,
  latitude,
  longitude,
  hours,
  species_allowed,
  pet_rules,
  description,
  photo_url,
  status,
  source
)
VALUES
  (
    '80000000-0000-4000-8000-000000000001'::uuid,
    'Silver Lake Dog Park',
    'park',
    'Silver Lake',
    '1893-1899 Silver Lake Blvd, Los Angeles, CA 90026',
    34.0922039,
    -118.2642687,
    'Daily 6:00 AM–10:00 PM; Wednesday maintenance closure 6:00–8:30 AM',
    'Dogs',
    'Off-leash only inside the designated fenced dog-park areas. Follow posted City rules and clean up after your dog.',
    'Fenced public off-leash dog park next to the Silver Lake Recreation Center, with separate areas for smaller and larger dogs.',
    NULL,
    'active',
    'pazo_curated'
  ),
  (
    '80000000-0000-4000-8000-000000000002'::uuid,
    'Runyon Canyon Park',
    'trail',
    'Hollywood Hills',
    '2000 N Fuller Ave, Los Angeles, CA 90046',
    34.1050000,
    -118.3488333,
    'Daily sunrise–sunset',
    'Dogs',
    'Dogs may be off leash only in designated areas. Bring water, stay on designated trails, and follow posted park rules.',
    'Popular Los Angeles hiking park with city views, trails, and designated dog-friendly/off-leash areas.',
    NULL,
    'active',
    'pazo_curated'
  ),
  (
    '80000000-0000-4000-8000-000000000003'::uuid,
    'Los Feliz Small Animal Hospital',
    'veterinary',
    'Los Feliz',
    '3166 Los Feliz Blvd, Los Angeles, CA 90039',
    34.1236150,
    -118.2677960,
    'Mon–Fri 8:00 AM–5:00 PM; Sat 8:00 AM–3:00 PM; Sun closed',
    'Dogs and cats',
    'Appointments are recommended for routine care. Contact the hospital directly for current availability and urgent-care instructions.',
    'Full-service small-animal veterinary hospital serving dogs and cats in Los Angeles.',
    NULL,
    'active',
    'pazo_curated'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  zone = EXCLUDED.zone,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  hours = EXCLUDED.hours,
  species_allowed = EXCLUDED.species_allowed,
  pet_rules = EXCLUDED.pet_rules,
  description = EXCLUDED.description,
  photo_url = EXCLUDED.photo_url,
  status = EXCLUDED.status,
  source = EXCLUDED.source;
