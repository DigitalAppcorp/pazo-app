# PAZO — Fase 8 — Lugares, mapa y Check-ins — Arquitectura técnica

**Estado:** GATE 7 CERRADO — ARQUITECTURA TÉCNICA DEFINIDA  
**Fecha:** 2026-10-06  
**Gate 6:** CERRADO / aprobado por Product Owner  
**Supabase apply:** NO AUTORIZADO TODAVÍA

## 1. Decisión arquitectónica principal

Fase 8 reutiliza y evoluciona `public.pet_places`, pero reemplaza por completo sus datos demo/contador falso como fuente funcional.

El sistema se divide en cuatro dominios:

1. catálogo público curado — `pet_places`;
2. check-in privado del dueño — `pet_place_checkins`;
3. proyección segura de presencia — `pet_place_presence`;
4. sugerencias — `place_suggestions`.

Opcionalmente se persisten eventos mínimos de producto en `place_usage_events`, **sin coordenadas ni texto de búsquedas**.

No usar `interactions` del Feed.

---

## 2. Por qué separar check-in y presencia

Regla de producto:
- todos pueden ver cuántas mascotas están presentes;
- la identidad de una mascota solo aparece mediante opt-in.

Una sola tabla pública de check-ins expondría `pet_id` incluso cuando el usuario eligiera privacidad, o impediría contar los check-ins ocultos mediante RLS.

Solución:

### pet_place_checkins
Fuente privada de verdad:
- siempre conoce pet/user;
- solo su dueño puede leer su check-in activo;
- no es legible por otros usuarios.

### pet_place_presence
Proyección pública para usuarios autenticados:
- una fila = una presencia activa/no expirada;
- siempre contiene `place_id`;
- `visible_pet_id` es NULL si el usuario no hizo opt-in;
- no contiene `user_id`;
- no contiene GPS;
- no contiene historial;
- RLS oculta automáticamente filas expiradas.

Resultado:
- `COUNT(*)` = presencia total;
- `visible_pet_id IS NOT NULL` = mascotas que aceptaron mostrarse.

No requiere función pública SECURITY DEFINER para leer agregados privados.

---

## 3. public.pet_places

Evolucionar tabla existente.

### Columnas finales MVP
- `id uuid PK`;
- `name text NOT NULL`;
- `category text NOT NULL`;
- `zone text NOT NULL`;
- `address text NOT NULL`;
- `latitude double precision NULL`;
- `longitude double precision NULL`;
- `hours text NULL`;
- `species_allowed text NULL`;
- `pet_rules text NULL`;
- `description text NULL`;
- `photo_url text NULL`;
- `status text NOT NULL DEFAULT 'active'`;
- `source text NOT NULL DEFAULT 'pazo_curated'`;
- `created_at timestamptz`;
- `updated_at timestamptz`.

### Categorías estables de DB
- `park`;
- `trail`;
- `food`;
- `veterinary`;
- `grooming`;
- `pet_store`.

Frontend traduce etiquetas ES/EN.

### Estado
- active;
- archived.

Un lugar `active` requiere latitud y longitud válidas.

### Legacy
- renombrar `type` -> `category`;
- eliminar `active_check_ins` como fuente de verdad;
- las 2 filas demo actuales pasan a `archived` + `source='legacy_demo'`;
- no aparecen en producto.

### Escritura
Clientes:
- SELECT de lugares `active`;
- sin INSERT/UPDATE/DELETE.

PAZO/admin/service role:
- publica/archiva lugares.

---

## 4. public.pet_place_checkins

Fuente privada de verdad.

### Columnas
- `id uuid PK`;
- `place_id uuid NOT NULL -> pet_places`;
- `pet_id uuid NOT NULL -> pets`;
- `user_id uuid NOT NULL DEFAULT auth.uid()`;
- `visible boolean NOT NULL DEFAULT false`;
- `checked_in_at timestamptz NOT NULL`;
- `expires_at timestamptz NOT NULL`;
- `ended_at timestamptz NULL`.

### Regla de actividad
Activo solo cuando:
- `ended_at IS NULL`;
- `expires_at > now()`.

### Único check-in abierto
Índice único parcial:
`UNIQUE(pet_id) WHERE ended_at IS NULL`.

Antes de cada INSERT:
1. bloquear fila de la mascota con `FOR UPDATE`;
2. validar que pertenece a `auth.uid()`;
3. validar lugar active;
4. cerrar cualquier check-in abierto anterior;
5. normalizar:
   - user_id = auth.uid();
   - checked_in_at = now();
   - expires_at = now() + 2 hours;
   - ended_at = NULL.

El bloqueo serializa inserciones concurrentes para la misma mascota.

### Escritura cliente
INSERT permitido solo en:
- place_id;
- pet_id;
- visible.

UPDATE permitido solo en:
- visible;
- ended_at.

Trigger normaliza `ended_at` a `now()`; el cliente no decide la hora real de salida.

No DELETE cliente.

### Lectura cliente
RLS permite al dueño leer únicamente sus propios registros de check-in; nunca los de otra cuenta.

Motivo técnico:
- PostgreSQL requiere que una fila siga siendo visible a la policy SELECT durante un UPDATE que la termina;
- una policy SELECT limitada solo a "activo" bloquea el checkout válido al convertir la fila en terminada.

Contrato de producto:
- el frontend consulta explícitamente solo `ended_at IS NULL` y `expires_at > now()`;
- PAZO no presenta historial de movimientos en la UI;
- otros usuarios nunca pueden leer la tabla privada de check-ins.

---

## 5. public.pet_place_presence

Proyección segura administrada por trigger.

### Columnas
- `checkin_id uuid PK -> pet_place_checkins`;
- `place_id uuid NOT NULL -> pet_places`;
- `visible_pet_id uuid NULL -> pets`;
- `expires_at timestamptz NOT NULL`.

### Sin identidad por defecto
Si `checkin.visible=false`:
- visible_pet_id = NULL.

Si `visible=true`:
- visible_pet_id = pet_id.

### Trigger
AFTER INSERT/UPDATE/DELETE de check-in:
- check-in abierto: UPSERT projection;
- check-in terminado: DELETE projection;
- cambio de visible: actualizar visible_pet_id.

### Expiración
No hace falta cron para seguridad:
- RLS permite SELECT únicamente si `expires_at > now()`;
- por tanto una presencia expirada deja de ser visible automáticamente.

Filas expiradas pueden limpiarse después como mantenimiento.

### Lectura
Solo `authenticated`.

No anon.

No client writes.

---

## 6. public.place_suggestions

### Columnas
- `id uuid PK`;
- `submitter_user_id uuid NOT NULL DEFAULT auth.uid()`;
- `name text NOT NULL`;
- `category text NOT NULL`;
- `address text NOT NULL`;
- `zone text NULL`;
- `note text NULL`;
- `status text NOT NULL DEFAULT 'pending'`;
- `created_at timestamptz`.

### Cliente
Puede INSERT:
- name;
- category;
- address;
- zone;
- note.

No puede:
- elegir submitter_user_id;
- elegir status;
- leer cola global;
- aprobar/rechazar;
- publicar lugar.

### Admin
Revisión manual inicial mediante backend/dashboard/service role.

---

## 7. Mapbox y geocoding

### Renderer
- MVP: Mapbox GL JS v3.30.0 desde CDN oficial, fijado por versión;
- wrapper propio `mapboxLoader.ts` para aislar el proveedor;
- evita alterar el lockfile solo para el renderer durante esta fase;
- una migración futura a paquete npm no cambia dominio, schema ni contratos;
- token público: `VITE_MAPBOX_ACCESS_TOKEN`;
- nunca usar token secreto en cliente;
- restringir token por URL/dominio en Mapbox.

### Importante: no usar Search Box para persistencia
El MVP **no depende de Mapbox Search Box ni Geocoding para guardar lugares**.

Motivo:
- Search Box devuelve datos de uso temporal;
- resultados temporales de Geocoding no deben almacenarse;
- guardar coordenadas procedentes de Mapbox requiere Permanent Geocoding.

Para mantener costo y lock-in bajos:
- búsqueda del usuario = catálogo propio `pet_places`;
- sugerencia = dirección textual;
- PAZO resuelve/verifica coordenadas durante curación;
- las coordenadas finales pertenecen al dominio PAZO.

Mapbox se usa inicialmente para render/cartografía, no como base de datos de lugares.

---

## 8. Ubicación del dispositivo

Usar Browser Geolocation API:
- solo `getCurrentPosition`;
- nunca `watchPosition`;
- solicitar únicamente al tocar **Usar mi ubicación**;
- guardar coordenada solo en React state/memoria;
- no localStorage;
- no Supabase;
- no analytics;
- no check-in.

Distancia:
- Haversine en cliente entre coordenada efímera y `pet_places.latitude/longitude`.

El mapa funciona sin permiso de ubicación.

Default:
- área general de Los Ángeles.

---

## 9. Render de lugares

### Datos
`placeService.ts` consulta lugares reales:
- status active;
- búsqueda nombre/zona/dirección;
- filtro category;
- bbox del viewport cuando convenga;
- límite/paginación segura.

No usar `INITIAL_PLACES`.

### Mapbox adapter
Separar dominio de UI:
- `src/features/places/map/MapProvider.ts`;
- `src/features/places/map/mapbox/MapboxMap.tsx`;
- `src/services/placeService.ts`.

Los tipos `Place` no contienen conceptos Mapbox.

---

## 10. Modelos 3D

No añadir Three.js en MVP si no hace falta.

Mapbox GL JS soporta glTF/GLB mediante native `model` layer.

### Registry frontend
```text
park         -> /models/places/park.glb
trail        -> /models/places/trail.glb
food         -> /models/places/restaurant.glb
veterinary   -> /models/places/veterinarian.glb
grooming     -> /models/places/grooming.glb
pet_store    -> /models/places/pet-store.glb
```

El DB guarda categoría, no path del asset.

### Render strategy
- zoom lejano: marker/icon 2D;
- zoom cercano: modelo 3D por categoría;
- fallback automático a marker si GLB falla/no soporta;
- nombre/categoría textual siempre accesible.

Esto reduce GPU/bundle y mantiene accesibilidad.

### Futuro B2B
Override de modelo/skin/logo se añade como extensión futura; no agregar columnas especulativas ahora.

---

## 11. Búsqueda / viewport

Sin PostGIS en MVP.

Estado real:
- proyecto no tiene extensión PostGIS;
- tampoco pg_cron.

Usar `double precision` para latitude/longitude.

Query de viewport:
- latitude >= south;
- latitude <= north;
- longitude >= west;
- longitude <= east;
- status active.

Índices mínimos:
- `(status, category)`;
- `(status, latitude, longitude)`.

Si el catálogo crece lo suficiente, PostGIS puede entrar como migración futura sin cambiar el contrato del producto.

---

## 12. Product telemetry mínima

No construir infraestructura analytics genérica.

Tabla específica: `place_usage_events`.

Solo persiste:
- user_id;
- session_id;
- event_type;
- place_id opcional;
- category opcional;
- created_at.

Eventos MVP:
- map_open;
- use_location;
- place_open;
- search;
- filter.

Nunca persistir:
- coordenadas del dispositivo;
- query de búsqueda;
- IP;
- dirección del usuario.

Cliente solo INSERT own; no SELECT.

Check-ins y sugerencias se miden desde sus propias tablas.

---

## 13. Frontend

### Tipos
- `PlaceCategory`;
- `PetPlace`;
- `PlacePresence`;
- `ActivePlaceCheckin`;
- `PlaceSuggestionInput`.

### Servicios
- `placeService.ts`;
- `placeCheckinService.ts`;
- `placeTelemetryService.ts`.

### Componentes
- `MapView` real;
- `PlaceMap`;
- `PlaceList`;
- `PlaceCard`;
- `PlaceDetailSheet`;
- `PlaceCheckinPanel`;
- `SuggestPlaceModal`.

No mezclar proveedor con dominio.

---

## 14. Estado / concurrencia

### Cambio rápido de mascota
Todo check-in se carga por `currentPet.id`.

Operaciones:
- capturan petId al inicio;
- validan que sigue siendo mascota activa antes de actualizar UI optimista;
- backend siempre valida ownership.

### Nuevo check-in en otro lugar
El trigger cierra el anterior dentro de la misma transacción antes de aceptar el nuevo.

### F5
Al cargar Mapa:
- lugares desde Supabase;
- presencia desde projection;
- check-in activo de mascota actual.

Todo persiste.

---

## 15. RLS / grants

### pet_places
- anon/authenticated: SELECT active;
- sin writes cliente.

### pet_place_checkins
- authenticated SELECT propio activo;
- INSERT columnas limitadas;
- UPDATE solo visible/ended_at;
- ownership + lugar active;
- sin anon.

### pet_place_presence
- authenticated SELECT no expirado;
- sin writes cliente;
- sin anon.

### place_suggestions
- authenticated INSERT propio;
- sin SELECT cliente;
- sin anon.

### place_usage_events
- authenticated INSERT propio;
- sin SELECT cliente;
- sin anon.

Service role/postgres conservan administración.

---

## 16. Privacidad / threat model

Bloquear:
- check-in con mascota ajena;
- falsificar user_id;
- duración arbitraria;
- mantener check-in infinito;
- ver pet_id oculto;
- ver user_id de presencia;
- ver historial ajeno;
- publicar lugar directamente;
- auto-aprobar sugerencia;
- persistir GPS exacto;
- escribir contadores;
- usar legacy `interactions` para Mapa.

Datos públicos de presencia:
- place_id;
- visible_pet_id nullable;
- expires_at.

---

## 17. Datos iniciales

Las 2 filas actuales de `pet_places`:
- son demo;
- tienen direcciones no confiables;
- tienen contadores falsos.

Migración core:
- las archiva;
- no las borra.

El catálogo real inicial se prepara después en una migración de seed separada, con lugares reales revisados y coordenadas verificadas.

Nunca presentar los seeds demo como lugares reales.

---

## 18. Migraciones

Preparar, no aplicar aún:

1. `20261007052000_phase_8_places_map_core.sql`
   - evoluciona pet_places;
   - checkins;
   - projection;
   - suggestions;
   - telemetry;
   - RLS/grants/triggers.

2. seed posterior:
   - lugares reales curados;
   - separado del schema core para poder revisar datos independientemente.

No aplicar Supabase hasta:
- arquitectura registrada;
- migración revisada;
- frontend implementado;
- build PASS;
- diff revisado;
- Product Owner autorice explícitamente.

---

## 19. Security baseline antes de Fase 8

Security Advisor:
- anon SECURITY DEFINER executable: 3 existentes;
- authenticated SECURITY DEFINER executable: 6 existentes;
- Leaked Password Protection: 1 existente.

Performance Advisor:
- 16 unused-index INFO existentes.

Objetivo:
- Fase 8 no agrega ninguna función pública SECURITY DEFINER;
- triggers privilegiados viven en `place_private` y no tienen EXECUTE para PUBLIC/anon/authenticated;
- no introducir nuevos warnings de seguridad atribuibles.

---

## 20. Pruebas post-apply

### Places
- demo rows archived;
- anon/auth ven solo active;
- client cannot insert/update/archive;
- active place requires valid coordinates;
- invalid category/coordinates rejected.

### Suggestion
- auth can submit;
- submitter forced to auth.uid;
- cannot choose status;
- cannot read global queue;
- anon denied.

### Check-in
- own pet succeeds;
- foreign pet denied;
- inactive place denied;
- duration forced to 2 hours;
- visible defaults false;
- hidden presence count exists but pet identity is NULL;
- visible=true reveals only pet_id;
- second place closes first;
- concurrent insert serialized;
- owner can toggle visible;
- non-owner cannot;
- manual exit removes projection;
- expired check-in hidden automatically;
- F5 retrieves active own check-in.

### Privacy
- other authenticated user cannot SELECT private checkin;
- other user can count projection;
- hidden pet identity impossible to retrieve;
- no user_id in projection;
- no GPS columns/events.

### Telemetry
- no coordinates/search text;
- own insert only;
- anon denied.

### Regression
- Feed/interactions untouched;
- rescue, communities, care, documents unchanged;
- Security Advisor unchanged;
- build PASS.

---

# Gate 7 — CERRADO

Arquitectura recomendada:

**PAZO-owned place catalog + private check-in truth + privacy-safe presence projection + Mapbox renderer + native category GLB models + ephemeral browser location.**

La arquitectura evita:
- exponer identidades ocultas;
- introducir public SECURITY DEFINER RPCs;
- depender de PostGIS/cron;
- almacenar Mapbox temporary search results;
- acoplar datos a Mapbox;
- reutilizar `interactions` fuera del Feed.
