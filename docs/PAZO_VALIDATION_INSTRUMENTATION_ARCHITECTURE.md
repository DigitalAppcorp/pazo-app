# PAZO — Arquitectura Técnica: Instrumentación Genérica de Validación

**Estado:** GATE 7 — ARQUITECTURA TÉCNICA CERRADA  
**Producto:** `docs/PAZO_VALIDATION_INSTRUMENTATION_MASTER.md`  
**Resultado Gate 5:** BUILD NOW  
**Regla:** prepara Gate 8; no autoriza mutaciones de Supabase.

---

# 1. Objetivo técnico

Registrar señales internas fiables para módulos todavía no construidos sin:
- reutilizar `interactions`;
- exponer analytics entre usuarios;
- guardar PII;
- crear tablas específicas por módulo;
- depender de proveedores externos.

Consumidores iniciales:
- `communities`;
- `map_radar`.

---

# 2. Modelo de datos

## public.module_validation_signals

Una tabla genérica.

Campos:
- `id uuid PK`;
- `user_id uuid NOT NULL` → `auth.users(id)`;
- `module_key text NOT NULL`;
- `signal_type text NOT NULL`;
- `intent_key text NULL`;
- `session_id uuid NOT NULL`;
- `source text NULL`;
- `active_pet_id uuid NULL` → `public.pets(id)`;
- `created_at timestamptz NOT NULL`;
- `updated_at timestamptz NOT NULL`.

## signal_type
Solo:
- `view`;
- `interest`;
- `intent`.

Reglas:
- `intent_key` debe ser NULL para view/interest;
- `intent_key` es obligatorio para intent;
- claves limitadas a caracteres seguros y longitud acotada;
- source también es un código, nunca URL libre.

---

# 3. Catálogo interno de módulos

Crear en schema privado:

`validation_private.module_configs`

Campos:
- `module_key text PK`;
- `allowed_intents text[] NOT NULL`;
- `active boolean NOT NULL`;
- timestamps mínimos.

Seeds iniciales:

## communities
- local_people_pets
- species_breed_groups
- create_community
- meetups
- advice
- other

## map_radar
- pet_friendly_parks
- vets_services
- pet_friendly_food
- nearby_people_pets
- check_ins
- other

Ventaja:
- el cliente no puede inventar modules/intents arbitrarios;
- añadir un módulo futuro reutiliza la misma infraestructura y solo requiere registrar su config.

El catálogo no se expone por Data API.

---

# 4. Deduplicación

## View
Máximo una view por:
- user_id;
- module_key;
- session_id.

Índice UNIQUE parcial para `signal_type='view'`.

Un reload dentro de la misma sesión no infla views.

## Interest
Máximo un interest por:
- user_id;
- module_key.

Índice UNIQUE parcial para `signal_type='interest'`.

Taps repetidos no inflan interés.

## Intent
Máximo un intent actual por:
- user_id;
- module_key.

Índice UNIQUE parcial para `signal_type='intent'`.

Una nueva selección reemplaza `intent_key`, session/source/pet y `updated_at`.

---

# 5. Sesión cliente

Usar `sessionStorage`.

Clave:
`pazo_validation_session_id`

Valor:
UUID aleatorio generado con `crypto.randomUUID()`.

Propiedades:
- persiste durante reloads de la misma sesión;
- una nueva sesión/tab puede generar otro UUID;
- no autentica;
- no contiene PII;
- permite derivar revisita por múltiples session IDs.

No usar localStorage para identidad analítica.

---

# 6. Revisit

No guardar señal `revisit`.

Se deriva mediante:
- COUNT DISTINCT session_id por user_id + module_key;
- revisit = cuenta con al menos 2 sesiones distintas.

Esto evita eventos derivados inconsistentes.

---

# 7. Ownership y privacidad

La tabla pública:
- RLS habilitado;
- sin SELECT directo para authenticated;
- sin INSERT/UPDATE/DELETE directo para authenticated;
- sin acceso anon;
- service_role completo.

El usuario solo puede:
- registrar sus propias señales mediante RPC;
- leer su propio estado mínimo mediante RPC.

Nunca puede:
- consultar IDs de interesados;
- leer señales de otra cuenta;
- obtener agregados desde el frontend.

Las métricas agregadas se consultan internamente con SQL/herramientas administrativas.

---

# 8. active_pet_id

Es opcional y solo sirve para segmentación.

Si se envía:
- RPC verifica `pets.owner_id = auth.uid()`;
- spoof de mascota ajena se rechaza.

Una cuenta con cinco mascotas sigue contando como un solo usuario.

---

# 9. RPC públicas

Wrappers públicos SECURITY INVOKER:

- `record_module_validation_view`
- `record_module_validation_interest`
- `save_module_validation_intent`
- `get_my_module_validation_state`

El último retorna únicamente:
- interested boolean;
- intent_key text nullable.

No retorna eventos, user_id ni agregados.

---

# 10. Helpers privilegiados

Schema:
`validation_private`

Helpers SECURITY DEFINER internos:
- registran signals;
- validan module config;
- validan intent;
- validan active_pet_id;
- fijan user_id desde `auth.uid()`;
- manejan deduplicación/upsert.

Hardening:
- schema no expuesto;
- `SET search_path = ''`;
- referencias schema-qualified;
- auth check explícito;
- PUBLIC/anon sin EXECUTE;
- authenticated recibe solo USAGE + EXECUTE mínimo necesario para que los wrappers INVOKER llamen helpers;
- public wrappers authenticated-only.

Objetivo:
evitar SECURITY DEFINER expuesto directamente por Data API.

---

# 11. Source

Códigos iniciales:
- `explore`;
- `map_tab`.

Constraint:
- 2..64 caracteres;
- solo minúsculas, números y underscore;
- nullable.

No guardar:
- URLs completas;
- query params;
- referrers libres.

---

# 12. Frontend service

Crear:

`src/services/validationService.ts`

Responsabilidades:
- obtener/generar session UUID;
- record view;
- record interest;
- save intent;
- get own state.

No contiene lógica visual.

---

# 13. Componente reutilizable

Crear:

`src/components/validation/ValidationInterestPanel.tsx`

Responsabilidades:
- registrar view una vez al montar;
- cargar estado previo;
- CTA transparente “Me interesa”;
- feedback de éxito/error;
- mostrar una sola pregunta de intención después del interés;
- permitir cambiar intención;
- no mostrar métricas internas;
- modo sin tracking para demo/no-auth con mensaje claro.

Props:
- moduleKey;
- source;
- activePetId;
- canTrack;
- title/subtitle;
- intent options;
- lang.

---

# 14. Comunidades

`ExploreView` se convierte en preview transparente.

Cambios:
- remover Join/Leave simulado;
- remover mutación local de membersCount;
- no registrar community join en `interactions`;
- etiquetar las comunidades mock como ejemplos conceptuales;
- no mostrar conteos de miembros ficticios como si fueran reales;
- CTA central provisto por ValidationInterestPanel;
- mantener búsqueda simple de ejemplos si no confunde el estado del módulo.

Registrar:
- view: module_key `communities`, source `explore`;
- interest;
- intent.

No construir:
- membresías;
- roles;
- feed;
- eventos;
- backend de Comunidades.

---

# 15. Mapa / Radar

`MapView`:
- elimina import directo de Supabase;
- elimina insert roto en `interactions`;
- mantiene preview transparente;
- usa ValidationInterestPanel.

Registrar:
- view: module_key `map_radar`, source `map_tab`;
- interest;
- intent.

Eliminar también el viejo `trackInteraction('feature_map_tab', ...)` en BottomNav.

No construir:
- mapa real;
- GPS;
- check-ins;
- proveedor cartográfico.

---

# 16. Interactions

`public.interactions` queda reservado para comportamiento social real:
- like;
- save/otros contratos existentes;
- relaciones sobre UUIDs reales.

No usarlo para analytics de features.

El helper legacy `trackInteraction` se retira si ya no tiene consumidores después del cambio.

---

# 17. Concurrencia

- views: INSERT ... ON CONFLICT DO NOTHING;
- interest: INSERT ... ON CONFLICT DO NOTHING;
- intent: UPSERT sobre índice único parcial;
- taps dobles no crean demanda duplicada;
- UI bloquea CTA mientras RPC está en vuelo.

---

# 18. Demo mode / no auth

No persistir señales sin cuenta autenticada.

La UI puede mostrar la preview, pero:
- no fingir que un voto fue registrado;
- CTA debe indicar que se requiere una cuenta real para enviar la señal, o quedar no persistente de forma explícita.

No crear usuarios/sesiones anónimos para analytics en este MVP.

---

# 19. Métricas internas

Consultas administrativas futuras, sin dashboard:

Por module_key:
- COUNT DISTINCT user_id con view;
- COUNT DISTINCT user_id con interest;
- interest rate;
- COUNT user_id con >=2 distinct session_id;
- distribución de intent_key;
- distribución de source;
- series por created_at.

No crear views públicas ni RPC de agregados en MVP.

---

# 20. Migración

Una migración versionada:
- schema `validation_private`;
- module_configs;
- module_validation_signals;
- constraints;
- índices únicos parciales;
- RLS/grants;
- helpers internos;
- wrappers públicos;
- seeds de communities/map_radar.

Preparar en Gate 8.
No aplicar hasta autorización explícita del Product Owner.

---

# 21. Pruebas backend

## Auth
- anon RPC bloqueado;
- authenticated permitido.

## Ownership
- active_pet_id propio permitido;
- pet ajeno bloqueado.

## View
- primera view crea fila;
- misma sesión no duplica;
- sesión nueva crea segunda view.

## Interest
- taps repetidos → una fila.

## Intent
- intent válido se guarda;
- cambio de intent reemplaza;
- intent no permitido bloqueado.

## Module config
- module desconocido bloqueado;
- module inactive bloqueado.

## Privacy
- authenticated sin SELECT directo de signals;
- usuario A no puede leer señales de B;
- get_my_state solo devuelve estado propio.

Todas las pruebas DB posibles con BEGIN/ROLLBACK.

---

# 22. Prueba visual

## Comunidades
- se identifica como función en evaluación;
- ejemplos no aparentan comunidades activas;
- no existe “Unirme” real;
- “Me interesa” persiste tras F5;
- seleccionar intención persiste;
- cambiar intención persiste.

## Radar
- preview sigue visible;
- no aparece error de `interactions`;
- “Me interesa” persiste tras F5;
- intención persiste.

## Deduplicación
- taps repetidos no alteran visualmente estado;
- reload no pierde interés.

## Demo
- no finge señal persistente.

---

# 23. Definition of Done

- tabla/config aplicadas;
- RLS/grants verificados;
- RPCs hardened;
- no tracking de fake doors en `interactions`;
- Comunidades consume sistema genérico;
- Radar consume sistema genérico;
- build PASS;
- DB tests PASS;
- Advisors revisados;
- visual/end-to-end aprobado;
- PR merged a main.

---

# 24. Estado Gate 7

Arquitectura cerrada.

Siguiente:
**Gate 8 — Implementación**.

La migración se prepara primero y no se aplica sin autorización explícita.
