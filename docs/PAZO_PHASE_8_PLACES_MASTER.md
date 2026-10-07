# PAZO — Fase 8 — Lugares, mapa y Check-ins

**Estado:** GATE 8 — BACKEND APLICADO / VALIDACIÓN VISUAL PENDIENTE
**Fecha:** 2026-10-06
**Implementación autorizada:** NO

## 1. Estado real auditado

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
Gate 8 — IMPLEMENTACIÓN EN PREPARACIÓN.

Fuentes:
- producto: `docs/PAZO_PHASE_8_PLACES_MVP_SPEC.md`;
- arquitectura: `docs/PAZO_PHASE_8_PLACES_ARCHITECTURE.md`.

Migración core preparada, pero NO aplicada. Implementación frontend puede comenzar; Supabase requiere autorización explícita después de build/preflight.


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

Pendiente para cerrar Gate 8:
- configurar token público Mapbox;
- validar mapa real en runtime;
- prueba visual/end-to-end del Product Owner;
- PR #20 final;
- merge y verificación de `main`.
