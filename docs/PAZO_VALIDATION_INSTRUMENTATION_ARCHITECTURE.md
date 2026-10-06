# PAZO — Arquitectura: Instrumentación de Validación de Módulos

**Estado:** GATE 8 — BACKEND APLICADO Y VERIFICADO; PENDIENTE VALIDACIÓN VISUAL  
**Primer consumidor:** Comunidades 7.0A  
**Regla:** esta arquitectura NO autoriza aplicar Supabase sin aprobación explícita del Product Owner.

---

# 1. Objetivo

Persistir las señales aprobadas del experimento de Comunidades:

- view;
- interest;
- intent;
- revisita derivada.

Unidad principal:
**cuenta autenticada**, no mascota.

La infraestructura debe poder reutilizarse para otros módulos después de que cada uno cierre su propio experimento.

---

# 2. Decisión de seguridad

No usar \`interactions\`.

\`interactions\` representa comportamiento social de mascotas y no analytics de producto.

Tampoco se usarán funciones \`SECURITY DEFINER\` para esta instrumentación.

Motivo:
- las señales no requieren privilegios especiales;
- RLS normal puede fijar ownership por \`auth.uid()\`;
- evitamos aumentar los warnings actuales de Security Advisor por funciones privilegiadas.

---

# 3. Modelo de datos

## Schema privado

\`validation_private.modules\`

Registro de módulos válidos.

\`validation_private.intent_options\`

Registro de intenciones permitidas por módulo.

No están expuestos al cliente.

Primera configuración:
- module: \`communities\`;
- intents:
  - \`similar_people_pets\`;
  - \`advice\`;
  - \`plans_events_challenges\`;
  - \`create_grow_community\`;
  - \`recognition_badges\`;
  - \`other\`.

## public.module_validation_views

Una fila por:
- cuenta;
- módulo;
- sesión cliente.

Campos:
- id;
- user_id;
- module_key;
- session_id;
- source;
- created_at.

Deduplicación:
\`UNIQUE(user_id, module_key, session_id)\`.

## public.module_validation_interests

Una fila por:
- cuenta;
- módulo.

Primary key:
\`(user_id, module_key)\`.

## public.module_validation_intents

Una selección actual por:
- cuenta;
- módulo.

Primary key:
\`(user_id, module_key)\`.

La intención:
- solo puede existir si ya existe interés;
- debe pertenecer al catálogo permitido del módulo;
- puede cambiarse;
- \`updated_at\` se fija en servidor.

---

# 4. RLS y grants

## Views
Authenticated:
- INSERT únicamente;
- solo sus propias filas;
- user_id no es columna escribible desde cliente.

No SELECT desde frontend.

## Interests
Authenticated:
- SELECT propias;
- INSERT propia;
- sin UPDATE/DELETE.

## Intents
Authenticated:
- SELECT propia;
- INSERT propia;
- UPDATE únicamente \`intent_key\` y \`source\`;
- sin cambiar user_id/module_key;
- sin DELETE.

Anon:
- sin acceso.

Service role:
- acceso administrativo.

---

# 5. Session ID

Frontend usa:
\`sessionStorage['pazo_validation_session_id']\`.

UUID aleatorio:
- persiste en reload de la sesión;
- una nueva sesión/tab puede generar otro;
- no autentica;
- no contiene PII.

Revisita se deriva mediante múltiples sesiones para una misma cuenta + módulo.

---

# 6. Frontend

## validationService.ts

API genérica:
- recordModuleValidationView;
- recordModuleValidationInterest;
- saveModuleValidationIntent;
- getMyModuleValidationState.

Errores \`23505\` de view/interest duplicados se consideran idempotencia normal.

## ValidationInterestPanel

Componente reutilizable:
- registra view;
- recupera interés/intención propia;
- CTA \`Me interesa\`;
- muestra una pregunta de intención;
- permite cambiar la respuesta;
- no finge éxito en demo/no-auth.

## ExploreView / Comunidades

Se convierte en preview transparente.

Debe:
- mostrar los cinco pilares aprobados;
- mostrar ejemplos conceptuales;
- eliminar Join/Joined simulado;
- eliminar member counts ficticios;
- eliminar perfil destacado mock presentado como real;
- dejar claro que la función está en evaluación.

No construir backend de Comunidades.

---

# 7. Métricas administrativas

No dashboard en MVP.

Con SQL interno se podrá derivar:

- unique viewers;
- unique interested;
- Interest Rate;
- revisitas por múltiples session_id;
- intent distribution;
- source distribution.

No exponer agregados a usuarios.

---

# 8. Privacidad

No guardar:
- email;
- teléfono;
- nombre;
- texto libre;
- ubicación;
- datos de mascota;
- contenido de publicaciones.

La señal pertenece a la cuenta.

---

# 9. Preflight requerido antes de aplicar

- build local PASS;
- revisar diff;
- verificar que no existen tablas/config previas;
- revisar SQL completo;
- comparar Security Advisor baseline;
- pedir autorización explícita del Product Owner.

Baseline de seguridad antes de esta migración:
- 3 warnings anon SECURITY DEFINER;
- 6 warnings authenticated SECURITY DEFINER;
- 1 warning Leaked Password Protection.

La migración no debe añadir warnings nuevos atribuibles a instrumentación.

---

# 10. Pruebas post-apply

Con transacción/rollback cuando sea posible:

- anon no puede insertar/leer;
- authenticated puede insertar view propia;
- misma sesión no duplica view;
- nueva sesión sí crea otra view;
- interest duplicado no crea dos filas;
- no puede escribir user_id ajeno;
- intent sin interest falla;
- intent inválido falla;
- intent válido persiste;
- cambio de intent actualiza la selección;
- usuario solo puede leer su interest/intent;
- tablas privadas no son accesibles;
- Advisors sin hallazgos nuevos.

---

# 11. Fuera de alcance

- Mapa/Radar;
- acquisition attribution;
- analytics externo;
- dashboard;
- A/B testing;
- texto libre;
- tracking global;
- datos por mascota;
- Comunidades real;
- roles/permisos/feed/eventos/moderación reales.


---

# 12. Estado aplicado

Backend aplicado con autorización explícita del Product Owner.

Migraciones registradas en Supabase:
- `communities_validation_instrumentation`;
- `trim_validation_indexes`;
- `restore_validation_fk_indexes`.

La segunda y tercera son migraciones forward de revisión de performance:
- se probaron dos índices como prescindibles;
- Performance Advisor mostró que cubrían foreign keys;
- se restauraron;
- no se reescribió historial.

## Pruebas aprobadas

- view por sesión deduplicada;
- nueva sesión crea segunda view;
- interest único por cuenta+módulo;
- intent requiere interest;
- intent inválido rechazado;
- intent válido persistente;
- cambio de intent permitido;
- escritura con user_id ajeno rechazada;
- anon bloqueado;
- authenticated sin acceso al registry privado;
- RLS limita interest/intent a la cuenta autenticada;
- todas las pruebas destructivas/transitorias se ejecutaron con ROLLBACK;
- tablas de señales quedaron en 0 filas después de pruebas.

## Advisors post-apply

Security:
- sin findings nuevos atribuibles a instrumentación;
- permanece baseline previo:
  - 3 anon SECURITY DEFINER;
  - 6 authenticated SECURITY DEFINER;
  - Leaked Password Protection pendiente.

Performance:
- no hay foreign keys sin índice atribuibles a instrumentación;
- los dos índices nuevos de validación aparecen como `unused_index` mientras las tablas están vacías;
- se mantienen porque cubren foreign keys y serán útiles para consultas agregadas cuando exista volumen.
