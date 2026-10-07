# PAZO — Fase 8 — Lugares, mapa y Check-ins

**Estado:** GATE 8 REABIERTO — SCOPE CORRECTION: FAKE DOORS + 3D MARKERS
**Fecha:** 2026-10-07
**Implementación autorizada:** SÍ — corrección Gate 8 activa; no hay nueva mutación Supabase pendiente.

## 1. Auditoría inicial histórica (antes del núcleo real)

> Esta sección describe el estado que existía antes de construir Fase 8. No representa el estado actual del producto.

### Frontend
`MapView.tsx` no contiene un mapa real.

Actualmente:
- muestra una pantalla conceptual "Radar Pazo";
- no renderiza `places`;
- no consume `pet_places`;
- no tiene proveedor/cartografía;
- no usa geolocalización real;
- no tiene detalle de lugar;
- no tiene check-in real.

`App.tsx` todavía carga:
`const [places] = useState(INITIAL_PLACES)`.

Por tanto, los lugares visibles en frontend siguen siendo mock.

### Fake door legacy
El interés antiguo del Mapa no es fiable.

Problemas:
- `MapView` intenta insertar `target_id='feature_map_interested'` en `interactions`;
- el tab Mapa intenta registrar `target_id='feature_map_tab'`;
- `interactions.target_id` es UUID;
- `register_interaction_signal` está diseñado para posts y aprendizaje del Feed;
- la infraestructura de validation genérica es ahora el mecanismo correcto para experimentos.

Decisión:
- no reutilizar `interactions` para Mapa/Lugares;
- cualquier nueva validación debe usar `module_validation_*`.

### Backend
Existe `public.pet_places`.

Campos actuales:
- id;
- name;
- type;
- zone;
- address;
- hours;
- species_allowed;
- description;
- photo_url;
- active_check_ins;
- created_at.

Limitaciones:
- no latitude;
- no longitude;
- no source;
- no status/verification state;
- no created_by;
- no updated_at;
- no canonical external/provider id;
- no tabla real de check-ins;
- `active_check_ins` es un contador almacenado sin fuente transaccional detrás.

RLS actual:
- SELECT público;
- anon/authenticated pueden leer;
- no existe write público.

Datos:
- 2 filas seed/demo existentes;
- no tratarlas como catálogo real verificado.

No existe ninguna otra tabla de places/check-ins/location.

---

## 2. Problema de producto

El tab Mapa ocupa navegación principal.

Una fake door permanente aquí hace que PAZO se sienta incompleto.

Recomendación:
**MVP REDUCIDO REAL**, no otro fake door del módulo completo.

El núcleo debe resolver un ciclo útil:
**descubrir lugares → abrir detalle → decidir ir → hacer check-in voluntario → salir/expirar**.

Las extensiones inciertas pueden validarse dentro del núcleo real.

---

## 3. Núcleo recomendado

### Lugares
Real:
- listado de lugares;
- mapa con pins;
- búsqueda;
- filtros básicos;
- detalle de lugar;
- categorías iniciales;
- foto;
- dirección;
- horarios;
- reglas pet-friendly;
- distancia aproximada cuando el usuario autorice ubicación.

### Check-in
Real:
- check-in voluntario de la mascota activa;
- un check-in activo por mascota;
- expiración automática;
- salida manual;
- contador derivado de check-ins activos;
- persistencia tras F5.

No almacenar un contador editable desde cliente.

### Ubicación
Recomendación fuerte:
- NO background tracking;
- NO guardar ubicación GPS exacta del usuario;
- pedir localización solo mediante acción explícita "Usar mi ubicación";
- usar coordenada del dispositivo de forma efímera para centrar/ordenar mapa;
- el check-in guarda el `place_id`, no el GPS exacto del usuario.

Esto entrega utilidad local sin convertir PAZO en un sistema de rastreo.

---

## 4. Privacidad recomendada

Para MVP:
- lugares son públicos;
- ubicación precisa del dispositivo no se persiste;
- un check-in comunica "esta mascota está en este lugar", no coordenadas exactas;
- no mostrar domicilio del dueño;
- no exponer owner_id;
- no mostrar historial completo de movimientos públicamente;
- check-in expira automáticamente.

### Decisión aprobada
Todos ven el contador de mascotas presentes.

La identidad de cada mascota solo aparece mediante opt-in explícito del dueño.

**Aprobado: opción C.**

---

## 5. Creación de lugares

No recomiendo publicación libre directa en el MVP.

Riesgos:
- spam;
- duplicados;
- direcciones incorrectas;
- lugares privados;
- contenido ofensivo;
- negocios auto-promocionados como lugares falsos.

Recomendación:
- catálogo publicado = PAZO/curado;
- usuarios pueden **sugerir un lugar**;
- sugerencia entra en estado pending;
- no aparece públicamente hasta aprobación.

No requiere construir un panel admin complejo en la primera iteración; aprobación puede ser operativa/manual al inicio.

---

## 6. Modelo técnico probable

### pet_places
Evolucionar tabla existente:
- latitude numeric/double precision;
- longitude numeric/double precision;
- status: active/archived;
- source;
- external_id opcional;
- updated_at;
- category/type normalizado;
- metadata pública necesaria.

`active_check_ins` debe dejar de ser fuente de verdad.

### pet_place_checkins
Propuesta:
- id uuid;
- place_id uuid;
- pet_id uuid;
- user_id uuid server-owned/default auth.uid;
- visible boolean;
- checked_in_at timestamptz;
- expires_at timestamptz;
- ended_at timestamptz nullable.

Reglas:
- pet debe pertenecer a auth.uid();
- un check-in activo por pet;
- nuevo check-in puede cerrar el anterior atómicamente;
- expiración se interpreta por `expires_at > now()`;
- owner puede cerrar su propio check-in;
- otros usuarios solo leen presencia según privacy policy.

### place_suggestions
Solo si Product Owner aprueba sugerencias:
- id;
- submitter_user_id;
- name;
- address;
- category;
- notes;
- status pending/approved/rejected;
- timestamps.

---

## 7. Cartografía

**Decisión aprobada: Mapbox GL JS.**

PAZO conservará dominio y coordenadas propios, con adapter para evitar lock-in. El mapa se prepara para modelos 3D GLB/glTF por categoría.

Separar:
1. librería de render del mapa;
2. proveedor de tiles/geocoding/search.

Recomendación arquitectónica:
- evitar acoplar dominio de PAZO a un proveedor;
- `pet_places` conserva coordinates propias;
- provider adapters viven en servicio;
- cambiar Mapbox/MapTiler/Google no debe requerir cambiar schema de producto.

Antes de elegir proveedor se compararán:
- coste/free tier actual;
- geocoding;
- places search;
- terms/licensing;
- facilidad React/PWA;
- lock-in.

---

## 8. Categorías MVP recomendadas

Empezar pequeño:
- parque;
- sendero;
- cafetería/restaurante pet-friendly;
- veterinaria;
- grooming;
- tienda de mascotas.

No convertir cada negocio pet-related futuro en categoría desde el día uno.

---

## 9. Extensiones para validar después

Dentro del núcleo real se pueden medir:
- crear/publicar lugares directamente;
- reviews/calificaciones;
- fotos de usuarios;
- favoritos/listas;
- "mascotas cerca";
- eventos ligados a lugar;
- lugares patrocinados;
- ofertas/promociones;
- rutas/caminatas;
- historial personal de visitas.

No construir todas ahora.

---

## 10. Decisiones de Product Owner — CERRADAS

- D1 — visibilidad: contador público + identidad de mascota solo por opt-in. APROBADA.
- D2 — duración: 2 horas + salida manual. APROBADA.
- D3 — alta: PAZO publica; usuarios sugieren y requieren aprobación. APROBADA.
- D4 — ubicación: solo acción explícita, uso efímero, sin persistir GPS exacto. APROBADA.
- D5 — mapa: Mapbox GL JS + dominio PAZO desacoplado + modelos GLB/glTF reutilizables. APROBADA.

---

## 11. Gate actual

Gate 0 — auditoría: CERRADO.  
Gate 1 — valor: **MVP REDUCIDO REAL**.  
Gate 2 — coste/dependencias: CERRADO.  
D1–D5: CERRADAS.  
Gate 6 — CERRADO / aprobado por Product Owner.  
Gate 7 — CERRADO.  
Gate 8 — REABIERTO POR CORRECCIÓN DE CIERRE.

Fuentes:
- producto: `docs/PAZO_PHASE_8_PLACES_MVP_SPEC.md`;
- arquitectura: `docs/PAZO_PHASE_8_PLACES_ARCHITECTURE.md`.

El núcleo de Fase 8 ya está aplicado y mergeado vía PR #20. Gate 8 está reabierto únicamente para completar fake doors y marcadores 3D ya aprobados.


## 12. Estado Gate 8

Backend aplicado:
- `20261007052747 phase_8_places_map_core`;
- `20261007052749 phase_8_places_initial_catalog`;
- `20261007053859 fix_place_checkin_checkout_rls`.

Backend QA:
- lugares demo archivados y catálogo inicial activo: PASS;
- check-in privado: PASS;
- visibilidad opt-in: PASS;
- aislamiento entre cuentas: PASS;
- cambio de lugar cierra presencia anterior: PASS;
- expiración temporal: PASS;
- checkout manual: PASS;
- mascota ajena bloqueada: PASS;
- lugar archivado bloqueado: PASS;
- sugerencias pending/server-owned: PASS;
- telemetría mínima/dedupe: PASS;
- Security Advisor sin findings nuevos de Fase 8.

Validación runtime:
- Mapbox real: PASS;
- ubicación explícita efímera: PASS;
- detalle de lugar: PASS;
- check-in privado: PASS;
- F5 persistence: PASS;
- opt-in de visibilidad: PASS;
- privacidad segunda cuenta: PASS;
- cambio de lugar: PASS;
- checkout manual: PASS;
- búsqueda/filtros: PASS;
- sugerencia de lugar: PASS.

PR #20 fue fusionado, pero el Product Owner detectó dos entregables aprobados que faltaban antes de considerar Fase 8 completa:
- fake doors contextuales de extensiones;
- marcadores/modelos 3D caricaturizados por categoría.

Corrección en:
`fix/phase-8-fake-doors-3d-markers`.

Preparado:
- 6 experimentos contextuales;
- 6 modelos glTF low-poly por categoría;
- Mapbox model layer desde zoom cercano con fallback 2D;
- migración repo `20261007073500_place_extension_experiments.sql`;
- Supabase registry `20261007072355 place_extension_experiments` APPLIED;
- transactional view/interest QA PASS;
- 0 test signals persisted.

Gate 8 permanece ABIERTO únicamente hasta completar el cierre Git:
- build local PASS: COMPLETADO;
- autorización y apply de module keys: COMPLETADO;
- prueba visual de modelos 3D: PASS;
- prueba de fake doors + persistencia: PASS;
- merge de la corrección: PENDIENTE;
- verificación de `main`: PENDIENTE.


## 13. Checkpoint exacto para continuidad entre chats

### Estado que NO debe reinterpretarse
- el núcleo real de Lugares/Mapa/Check-ins funciona;
- PR #20 ya está merged en `main`;
- fake doors de Lugares fueron implementadas;
- Product Owner autorizó la migración de experimentos;
- Supabase registry: `20261007072355 place_extension_experiments`;
- 6 module keys `places_*` existen;
- QA transaccional de view/interest: PASS;
- Security Advisor: sin findings nuevos por esta corrección.

### Estado visual actual
El Product Owner envió una captura de Los Feliz Small Animal Hospital.

Resultado:
- Mapbox: visible;
- lugar: visible;
- marcador fallback: círculo 2D azul visible;
- **modelo 3D veterinaria: NO perceptible**.

Ese resultado fue el fallo pre-fix.

Después del ajuste de visibilidad, el Product Owner completó la ronda requerida:
- build local: PASS;
- veterinaria 3D: PASS;
- parque/sendero: PASS;
- fake door `Me interesa`: PASS;
- persistencia tras F5: PASS.

Por tanto:
**3D marker validation = PASS** y **fake-door runtime validation = PASS**.

### Fix preparado después de la captura
En `src/features/places/map/MapboxMap.tsx`:
- `model-scale: [12,12,12]`;
- `model-type: location-indicator`;
- `slot: top`;
- `minzoom: 13.25`;
- `model-translation: [0,0,1]`;
- `model-emissive-strength: 0.12`;
- círculo 2D se desvanece hasta opacidad 0 en zoom 16;
- selección hace zoom >=16.2;
- pitch seleccionado: 58°;
- basemap `show3dObjects=false`;
- `antialias=true`.

### Siguiente verificación obligatoria
La validación runtime/visual ya está completada.

Siguiente secuencia:
1. marcar PR #22 ready;
2. mergear PR #22;
3. verificar `main`;
4. finalizar documentos canónicos de cierre.

### Cierre
Gate 8 vuelve a CERRADO cuando:
- 3D markers visual PASS: COMPLETADO;
- fake doors runtime/persistence PASS: COMPLETADO;
- PR #22 merged: PENDIENTE;
- `main` verified: PENDIENTE;
- Scope Closure Reconciliation PASS final: pendiente únicamente de esos dos pasos Git.
