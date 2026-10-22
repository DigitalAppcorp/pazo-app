-- T05 curated LA starter catalogue — 2026-10-12.
-- Approved by Product Owner: six real establishments, one per supported category.
-- No schema change, no accounts, posts, claims, or Storage changes.
-- Rerun must STOP instead of duplicating; apply once to project mrybvqdebbgcayuvgkkr.
-- Coordinates reference: OpenStreetMap via Mapcarta (© OpenStreetMap contributors)
-- unless an independent coordinate source is explicitly listed.
-- Source references:
-- Park address/rules: https://www2.laparks.org/dogparks
-- Park coordinates: https://mapcarta.com/W240887680
-- Trail address/rules: https://www2.laparks.org/park/runyon-canyon
-- Trail coordinates: https://fotospot.com/attractions/california/runyon-canyon-park
-- Restaurant/pet patio/address: https://www.discoverlosangeles.com/eat-drink/the-morrison
-- Restaurant coordinates: https://www.coordinatesfinder.com/coordinates/172280-3179-los-feliz-blvd-los-angeles-ca-90039
-- Veterinary address/services: https://vcahospitals.com/miller-robertson
-- Veterinary coordinates: https://mapcarta.com/N4285564891
-- Grooming address/services: https://www.groomickey.com/contact-us/
-- Grooming coordinates: https://mapcarta.com/N13245169922
-- Pet shop address/services: https://stores.petco.com/ca/los-angeles/pet-supplies-losangeles-ca-5125.html
-- Pet shop coordinates: https://mapcarta.com/N8394775007
BEGIN;
LOCK TABLE public.pet_places IN SHARE ROW EXCLUSIVE MODE;
DO $check$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pet_places) THEN
    RAISE EXCEPTION 'T05 catalogue seed BLOCKED: pet_places is not empty. No rows inserted.';
  END IF;
END;
$check$;

INSERT INTO public.pet_places
  (name, category, zone, address, latitude, longitude,
   species_allowed, pet_rules, description, status, source)
VALUES
  ('Silver Lake Dog Park', 'park', 'Silver Lake',
   '1863 Silver Lake Blvd, Los Angeles, CA 90026',
   34.09226, -118.26455,
   'Perros',
   'Solo perros; menores de cuatro meses no permitidos. Licencia, vacunas y placas vigentes; recoge los desechos. Correa en el estacionamiento.',
   'Parque canino municipal con zona designada para perros. Consulta los avisos y reglamentos publicados antes de acudir.',
   'active', 'pazo_curated'),
  ('Runyon Canyon Park', 'trail', 'Hollywood Hills',
   '2000 N Fuller Ave, Los Angeles, CA 90046',
   34.10519, -118.348955,
   'Perros',
   'Perros sin correa únicamente en zonas señalizadas; en otras zonas deben ir con correa. Lleva agua y revisa posibles cierres de senderos.',
   'Parque con senderos y vistas de Los Ángeles; acceso por North Fuller Avenue.',
   'active', 'pazo_curated'),
  ('The Morrison', 'food', 'Atwater Village',
   '3179 Los Feliz Blvd, Los Angeles, CA 90039',
   34.1237698, -118.268719,
   'Perros en la terraza',
   'Terraza apta para perros según el directorio de turismo de Los Ángeles; confirma condiciones y disponibilidad con el restaurante.',
   'Restaurante con espacio exterior que figura como pet-friendly en Discover Los Angeles.',
   'active', 'pazo_curated'),
  ('VCA Miller-Robertson Animal Hospital', 'veterinary', 'West Hollywood',
   '8807 Melrose Avenue, Los Angeles, CA 90069',
   34.08105, -118.38578,
   'Perros y gatos',
   'Atención veterinaria para perros y gatos; confirma horarios y disponibilidad de consulta directamente con el hospital.',
   'Hospital veterinario con consultas y cuidados preventivos para perros y gatos.',
   'active', 'pazo_curated'),
  ('Groomickey Salon & Store', 'grooming', 'Venice',
   '1619 Lincoln Blvd, Venice, CA 90291',
   33.99661, -118.45843,
   'Perros y gatos',
   'Servicios de grooming para perros y gatos; consulta y reserva directamente con el negocio antes de acudir.',
   'Salón de cuidado y estética de mascotas con atención individualizada.',
   'active', 'pazo_curated'),
  ('Petco Los Angeles - DTLA', 'pet_store', 'Downtown Los Angeles',
   '850 S Hope St, Los Angeles, CA 90017',
   34.04547, -118.25979,
   NULL,
   'Tienda de suministros para mascotas; consulta las condiciones de ingreso y servicios disponibles con el establecimiento.',
   'Tienda de mascotas con productos y servicios; esta sede indica lavado canino autoservicio y clínica de vacunación.',
   'active', 'pazo_curated');

DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.pet_places WHERE source='pazo_curated') <> 6
    OR (SELECT count(DISTINCT category) FROM public.pet_places WHERE source='pazo_curated') <> 6
    OR EXISTS (
      SELECT 1 FROM public.pet_places
      WHERE source='pazo_curated'
        AND (status<>'active' OR latitude IS NULL OR longitude IS NULL)
    )
  THEN
    RAISE EXCEPTION 'T05 catalogue seed BLOCKED: post-insert validation failed.';
  END IF;
END;
$verify$;
COMMIT;
