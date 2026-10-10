> **SNAPSHOT VIGENTE / 2026-10-10, PRE-BETA:** La fuente operativa actual es `docs/PAZO_ACTIVE_HANDOFF.md`; los bloques cronológicos inferiores son historial, no instrucciones de ejecución. Tras el reset autorizado se conservan **6 usuarios e identidades Auth**; una prueba del PO creó **1 mascota y 1 avatar**. `profiles=0` hasta que un usuario vuelva a iniciar sesión. El PO autorizó exclusivamente `20261010072555_f14_recover_missing_profile`, **APLICADA** en Supabase, y el frontend en PR #37 recupera perfiles de forma idempotente. CI de código #38034600644 **PASS**; el PO reportó PASS visual tras la integración, pero SELECT posterior siguió dando `profiles=0` en Supabase alojado; falta conciliar el SHA local y el entorno antes de declarar E2E PASS. No repetir borrados, no crear nuevos usuarios Auth, no Vercel, no merge, no aplicar otros drafts. El bloqueo de release F14 permanece abierto. Documentación histórica previa: `docs/archive/PAZO_ACTIVE_HANDOFF_BEFORE_PROFILE_RECOVERY_20261010.md`.

> **MEJORA DE TRAZABILIDAD / 2026-10-10:** el splash de PAZO muestra automáticamente `Versión <SHA de 8 caracteres>` (+ `· local` si está en Vite dev; `· modificado` para cambios locales rastreados). El SHA se obtiene del checkout Git activo al iniciar el servidor o `VITE_APP_RELEASE` en CI; reiniciar Vite tras cambios de rama. Código PR #37 `9f0caed7`, CI #38035960896 **PASS**. La versión visible servirá para conciliar el PASS visual reportado con `profiles=0` en Supabase alojado. No implica aún E2E de recuperación. No merge, Vercel, borrados ni migraciones.

> **AJUSTE VISUAL DEL SPLASH / 2026-10-10 (SUPERSEDE ETIQUETA ANTERIOR):** pedido PO: solo números y puntos, en la parte inferior central, pequeña y atenuada, sin textos como «Versión», «local» o «modificado». Identificador automático `0.1.NNNNNNNN` obtenido del commit Git; `.1` final para checkout modificado; `0.0.0` si no puede leerse la revisión. Código commits `4fcc9fdd` / `bbf82eea` en PR #37. La versión es una pista de QA y **no** confirma por sí sola que el entorno Supabase de Antigravity sea el alojado. La recuperación de `profiles` sigue sin verificación E2E. Ningún merge, despliegue ni migración adicional autorizado.

> **F14 / AUTOR ELIMINADO — POLÍTICA PO APROBADA, CÓDIGO + QA PASS (2026-10-10):** PR #37 `17b1bd42` CI **PASS #38031508038**. Se construyeron tombstones de solo lectura ES/EN para Feed/Comunidades que presentan `Autor eliminado` y comentarios ajenos sin mostrar nombre, mascota, avatar, ubicación ni medios del autor. SQL `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql` **NO APLICADO**: cambia FKs para preservar hilos tras baja Auth/mascota, restricciones de anonimización, cuatro triggers antiinteracción, RPC solo `service_role` para redacción si solicitud `processing`, sin claims held y solo tras conciliar Storage/medios externos y comentarios JSON legados. Feed RPC de recomendaciones modificado en el draft para incluir hilos con comentarios, sin omitir moderación. SQL compiló y pasó pruebas de ACL/triggers dentro de BEGIN/ROLLBACK; 0 datos cambiados. **Bloqueos reales:** 3 publicaciones Feed con `posts.comments` JSON histórico, 8 URLs de fotos sin match exacto Storage, 1 media claim `held`; no borrar a ciegas. UI de selección extra de columna de Comunidad detrás de `VITE_F14_DELETED_AUTHOR_THREADS_ENABLED` OFF por defecto. Vercel y main intocados. Siguiente gate = autorización específica de aplicación de migración y posterior QA, NO autoriza ni sustituye ejecutor Auth/Storage.

> **F14 / INTEGRIDAD ANTES DE ELIMINAR CUENTAS — QA READ-ONLY 2026-10-10:** GitHub PR #37 amplía el preflight existente con acciones Feed sin FK, likes externos, impresiones, cruces user/pet, claim `held` y URL de media no resoluble. Escaneo no destructivo sobre 6 cuentas: **13 interacciones explícitas ajenas, 76 impresiones ajenas, 1 claim moderación held y 8 referencias de foto no resolubles exactamente** (6 publicaciones Feed, 2 avatars de mascota). No significa 8 archivos borrados: URLs pueden ser antiguas/externas o con parámetros; investigar antes de intervenir. Nuevas queries read-only agregadas sin identificadores `f14_account_cleanup_integrity_READ_ONLY.sql`, `f14_storage_footprint_READ_ONLY.sql`, `f14_photo_reference_footprint_READ_ONLY.sql` más tests. Las 6 cuentas continúan `may_delete_auth=false`/ `may_delete_storage=false`. Ninguna migración SQL permanente ni ejecución Storage/Auth en este lote, CI de código PASS. No Vercel, no merge.

> **F14 COMUNIDADES — MIGRACIÓN APLICADA 2026-10-10:** PO autorizó y se aplicó migración remota `20261010053708_f14_community_ownership_continuity` (PR #37). La FK propietaria cambió a `ON DELETE SET NULL` con CHECK que prohíbe comunidad activa sin owner; sigue el trigger de membresía. Se añadieron seis RPC y tabla privada de ofertas; anon no puede aceptarlas, usuarios autenticados no pueden archivar, service_role sí. Prueba real en DB alojada con dos identidades autenticadas bajo `BEGIN/ROLLBACK`: PASS designación admin, oferta, invalidación tras cancel/re-request, nueva oferta, aceptación y conservación de los 3 posts. La prueba reversible del archivo **preinstalación** pasó; una prueba adicional de archivo ya instalado fue bloqueada por el entorno y permanece sin ejecutar. Datos intactos: 6 Auth, 1 comunidad, 3 posts, 21 Storage, 0 solicitudes, 0 ofertas, 0 admins permanentes. UI administrativa solo `import.meta.env.DEV` / flag explícito, producción OFF. Sin ejecutor definitivo de borrado. No Vercel, sin merge a main.

> **F14 / CONTINUIDAD COMUNIDADES IMPLEMENTADA EN CÓDIGO — 2026-10-10:** PR #37 commit `4881ab7b`, CI #38026921677 PASS. Decisión PO: ofrecer traspaso solo a administrador designado con aceptación explícita; sin aceptación vigente archivar preservando publicaciones de otros usuarios. Migración `supabase/drafts/20261010_f14_community_ownership_continuity_NOT_APPLIED.sql` **NO APLICADA**: introduce rol `admin`, oferta de 7 días con aceptación/rechazo por receptor, RPC de archivo restringida a `service_role` y solicitudes `processing`, FK propietario `ON DELETE SET NULL` con CHECK para impedir comunidad activa sin propietario, y guard de membresía. UI propietario/candidato ES/EN oculta con `VITE_F14_COMMUNITY_OWNERSHIP_ENABLED` OFF. PG sintético en `pg_temp` con `BEGIN/ROLLBACK` PASS: transferencia consentida sin perder publicaciones, archivo sin perder contenido ajeno, oferta vigente bloquea archivo; **no es E2E de la migración real**, todavía requiere gate PO y QA aislada. Datos existentes sin cambios, Auth/Storage no borrados, Vercel/main intactos.

> **F14 / CONTINUIDAD COMUNIDADES (POLÍTICA APROBADA PO 2026-10-10):** Si el propietario solicita eliminar cuenta, ofrece titularidad SOLO a un administrador previamente designado que puede aceptar/rechazar en su propia sesión; transferencia exige aceptación y no borra contenido ajeno. Sin aceptación vigente, el operador al pasar solicitud a `processing` archivará conservando posts/comentarios y desacoplará propietario antes del Auth delete. Auditoría: roles actuales `owner/member` sin `admin`, owner FK `ON DELETE CASCADE`, trigger de propietario requiere membership; corregidos en **una migración SQL versionada NO APLICADA** `supabase/drafts/20261010_f14_community_ownership_continuity_NOT_APPLIED.sql`. UI y servicio de gestión en `CommunityDetailView` bajo `VITE_F14_COMMUNITY_OWNERSHIP_ENABLED=true`, apagado por defecto; no se desplegó ni cambió DB. La transición Auth/Storage todavía carece de ejecutor autorizado. NO fusionar PR ni tocar Vercel.

> **PREVALIDACIÓN F14 EJECUTADA / PASS — 2026-10-10:** PR #37 `c4140424` CI #38026303714 PASS. Se ejecutó `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` contra las **6 cuentas de prueba** sustituyendo solo CTE del candidato por `auth.users`, sin mutaciones: **3 bloqueadas por aportes de terceros, 2 requieren limpieza de contenido propio, 1 sin dependencias de las clases contadas pero aún SIN permiso para borrado** (`awaiting_executor`). Todas `may_delete_auth=false`, `may_delete_storage=false`. Estado remoto: 6 Auth, 0 solicitudes, 21 objetos Storage totales (14 fotos de publicaciones), 0 medios purged, no nueva RPC, Edge moderación v5 OFF. La interfaz de solicitudes se habilitó **solo en DEV/local** y sigue apagada para builds de producción salvo flag explícito. **Siguiente gate real:** estrategia explícita de conservación/traspaso o cierre seguro de comunidades con contribuciones de terceros y comentarios ajenos, limpia Storage mediante API, reconciliación FK/Auth; no ejecutor aún. Sin deploy, SQL permanente adicional, Vercel ni merge.

> **F14 / PREVALIDACIÓN DE BORRADO (2026-10-10):** inventario PostgreSQL real confirma bloqueo FK: `pets.owner_id` y `posts.user_id` carecen de `ON DELETE CASCADE` en Auth; `communities.owner_user_id ON DELETE CASCADE` arrastraría posts de otros usuarios. Escaneo agregado de 6 cuentas muestra 1 comunidad con 1 post ajeno, 6 comentarios ajenos en Feed, 1 documento privado y 21 objetos en 5 buckets; 0 solicitudes activas. Se implementó **consulta admin READ-ONLY** `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` y motor puro tipado `src/features/account/deletionPreflight.ts` con tests (reporte `blocked_third_party/cleanup_required/awaiting_executor` y `may_delete_auth=false` / `may_delete_storage=false` inmutables). Entrada de solicitudes `Mi mascota → Cuenta y datos` habilitada sólo en `import.meta.env.DEV` para QA local, producción sigue apagada y el ejecutor no existe. **Ningún SQL nuevo se instala**, 0 borrados, Vercel sin tocar, PR sin merge. Este es el gate técnico antes del borrado real, no un reemplazo de ello.

> **F14 ACCOUNT REQUEST INTAKE INSTALADA Y QA PASS — 2026-10-10 UTC:** autorización PO ejecutada; Supabase migración `20261010045708_f14_account_request_intake`. Creó schema privado, tabla de solicitudes por usuario y RPCs `pazo_deletion_request/status/cancel`; **0 solicitudes reales**, 6 usuarios Auth y 14 archivos intactos. ACL verificado: anon sin RPC, authenticated solo RPC, ni anon ni authenticated SELECT/USAGE de schema privado, RLS enabled. QA SQL sobre objetos *instalados*, con `SET LOCAL ROLE authenticated` y dos cuentas separadas: solicitud, consulta, repetición idempotente, aislamiento BOLA, cancelación solo de `requested`, rechazo en `processing`; todo bajo `BEGIN/ROLLBACK`, sin dejar datos. La UI de `Mi mascota → Cuenta y datos` está versionada pero permanece **apagada por `VITE_F14_DELETION_REQUESTS_ENABLED` (default OFF)**; no activada, no desplegada. Solicitud ≠ eliminación definitiva; ejecutor Auth/Storage/terceros NO existe aún. Vercel no tocado y PR #37 sin merge.

> **F14 REQUEST INTAKE SQL QA PASS / 2026-10-10 04:50 UTC:** PR #37 commit `8925f2d5`, CI #38025574055 **SUCCESS**. La migración `supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql` fue ejecutada únicamente dentro de BEGIN/ROLLBACK: se verificaron dos identidades distintas en instrucciones SQL separadas, request/status/cancel idempotentes, aislamiento de cuentas y ACL. Se corrigió `JSON null` a `SQL NULL` para ausencia de solicitud. **No se aplicó** nada permanente ni se habilitó UI; necesita autorización PO específica según AGENTS.md. La recepción segura de solicitud no reemplaza el ejecutor de eliminación real, que sigue P0. D3-A Edge v5 sigue OFF. 

> **F14 / LOTe CUENTA (2026-10-10):** entrega de solicitud autenticada de eliminación (NO ejecución): `supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql`, tres RPC idempotentes request/status/cancel, esquema privado/tabla mínima, UI ES/EN en Mi mascota detrás de `VITE_F14_DELETION_REQUESTS_ENABLED` (OFF), tests de ownership y no borrado. **NO se aplicó la migración**: `AGENTS.md` requiere gate PO independiente para SQL, y eliminar datos/Auth/Storage sigue totalmente fuera de alcance. Solicitud registrada != cuenta eliminada, no abrir Beta hasta manejo real seguro. D3-A Edge v5 desactivada; 14 objetos intactos.

> **D3-A ROLLBACK SEGURO — 2026-10-10 04:37 UTC:** ante petición del PO de automatizar y seguir rápido, se restauró Edge `f14-moderation-purge` **v5**, `verify_jwt=true`, release latch `F14_MEDIA_PURGE_RELEASE_APPROVED=false`, sin excepción temporal para ningún UUID; UI también vuelve a apagada (sin botón dev). Foto descartable verificada sigue **sin borrar**, 14 objetos Storage (13 anteriores + 1 ensayo), purged=0. Se corrigió y verificó preflight JWT `auth.role()` (migración `20261010043307_f14_media_jwt_claim_compat_single_test`; PASS SQL), pero **no es una prueba de purga real**. D3-A NO cerrada. Requiere ejecución futura con JWT de moderador vía flujo explícito; no manipular Storage SQL. Continuar en paralelo con gates MVP sin tocar Vercel ni merge.

> **D3-A BACKEND LISTO PARA QA AISLADO — 2026-10-10 UTC:** Edge v3 + SQL `20261010034610_f14_finalize_media_after_verified_claim` aplicadas y verificadas; apagadas por release latch en código. Único pendiente D3-A: foto NUEVA descartable + ensayo de eliminación por moderador controlado. No Vercel, sin merge; no reiniciar drafts A3.

> **DECISIÓN PO / FAST-TRACK 2026-10-09:** NO usar Vercel hasta MVP listo para lanzar. Carril activo: integración del MVP #36→#37 y cierres Auth/moderación/privacidad con criterios E2E; **PR #38 A3 PAUSADA**, sin más drafts hipotéticos. Detalle y gates: [PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md](PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md). Los checkpoints cronológicos antiguos de esta rama no reactivan A3 ni autorizan merge/deploy/SQL.

# PAZO — Hoja Maestra de Desarrollo

**Documento canónico del proyecto.**  
**Última actualización:** 2026-10-07  
**Estado general:** Fase 12 Global Search COMPLETADA / Gate 9 medición. Production Hardening ocupa temporalmente el Carril de Implementación por riesgo operativo pre-Beta.

---

## 0. Cómo usar esta hoja

Antes de modificar código, base de datos o arquitectura de PAZO:

1. Leer este archivo completo.
2. Leer `docs/PAZO_MODULE_LIFECYCLE.md`.
3. Identificar el módulo/fase activo y su gate pendiente.
4. Si existe sub-ruta específica, leerla.
5. No implementar decisiones marcadas como **DECISIÓN PENDIENTE**.
6. No convertir un módulo en implementación solo por su número de fase.
7. Después de cada decisión/merge relevante, actualizar esta hoja.

La finalidad es evitar reconstruir contexto, reducir tokens y evitar desarrollar funciones sin evidencia suficiente.

### Modelo de dos carriles

PAZO trabaja con dos carriles paralelos:

- **Carril de Validación:** módulos opcionales pueden medir interés durante semanas/meses sin bloquear el proyecto.
- **Carril de Implementación:** contiene únicamente utilidades núcleo, infraestructura necesaria o módulos que ya pasaron su gate.

Por tanto, una fase en validación puede permanecer abierta mientras otra fase aprobada avanza en implementación.

---

# 1. Roles de trabajo

## Product Owner
- Brandon.
- Define prioridades, reglas funcionales y acepta/rechaza comportamiento visual.
- Hace pruebas visuales y de producto cuando se solicitan.
- Autoriza explícitamente cualquier mutación importante en Supabase.

## Implementación
ChatGPT trabaja directamente sobre GitHub y Supabase:
- frontend React/TypeScript;
- arquitectura;
- Supabase/PostgreSQL;
- migraciones;
- RLS;
- RPCs;
- Storage;
- seguridad;
- pruebas;
- PRs y merge.

No pedir al Product Owner que copie código entre herramientas salvo que sea estrictamente necesario para una prueba local.

---

# 2. Flujo obligatorio por fase

Cada fase nueva sigue este orden:

1. **Auditoría de estado real**
   - GitHub `main`;
   - Supabase real cuando aplique;
   - no asumir que un mock es funcional.

2. **Definir alcance**
   - qué entra;
   - qué NO entra;
   - decisiones de producto pendientes.

3. **Crear rama**
   - una rama por fase.

4. **Implementar sin tocar producción antes de tiempo**
   - frontend;
   - backend versionado;
   - migraciones preparadas.

5. **Preflight**
   - build;
   - diff;
   - permisos;
   - RLS;
   - concurrencia;
   - integridad.

6. **Autorización explícita**
   - antes de aplicar una migración o mutación sensible en Supabase.

7. **Pruebas**
   - SQL con `ROLLBACK` cuando aplique;
   - build;
   - prueba visual real del Product Owner.

8. **Merge**
   - PR fuera de borrador;
   - merge a `main`;
   - verificar `main`;
   - actualizar esta hoja maestra.

---

# 3. Reglas técnicas permanentes

Estas reglas no deben romperse sin una decisión explícita de arquitectura.

- La identidad social pertenece a la **mascota**, no directamente al usuario.
- Una cuenta puede tener múltiples mascotas.
- Las mascotas del mismo dueño:
  - ven sus publicaciones entre sí;
  - no necesitan seguirse;
  - no pueden crear relación Follow entre ellas.
- Follow, Like, Save, Comment y recomendaciones se ejecutan en contexto de la mascota activa.
- `interactions` es fuente de verdad para estados activos de Like/Save.
- `posts.likes` es contador derivado administrado por backend; el cliente no lo escribe.
- Los datos privados de mascota deben permanecer separados de datos públicos.
- Ningún cliente debe poder actuar usando una mascota que no pertenece al usuario autenticado.
- Todo objeto nuevo expuesto por Data API requiere grants mínimos + RLS.
- Funciones `SECURITY DEFINER` solo cuando sean realmente necesarias, con superficie de ejecución explícitamente restringida.
- Nunca exponer `service_role` ni secretos en frontend.
- No considerar un módulo “terminado” mientras siga dependiendo de `mockData` para su funcionalidad principal.
- Toda persistencia debe sobrevivir recarga `F5`.
- Operaciones optimistas deben soportar rollback y cambio rápido de mascota.
- Las pruebas de seguridad no sustituyen las pruebas visuales, y viceversa.
- Durante una fase de rediseño visual, la funcionalidad existente debe mantenerse intacta salvo aprobación explícita del Product Owner.
- Cambios puramente estéticos no deben introducir nuevas dependencias de backend, alterar contratos de datos ni modificar reglas de negocio.
- Módulos opcionales/sociales de alto coste deben pasar un gate de validación de producto antes de su implementación completa; usar `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.

---

# 4. Estado real actual

## Base real disponible

Actualmente el núcleo persistente usa, entre otras:

- `profiles`
- `pets`
- `pet_private_details`
- `pet_private_metrics`
- `posts`
- `post_comments`
- `interactions`
- `follows`
- `pet_places`
- `care_items`
- `care_completions`
- `pet_documents`

## Módulos reales

- Supabase Auth.
- Onboarding y creación de primera mascota.
- Crear mascotas adicionales.
- Editar mascota.
- Datos públicos/privados de mascota.
- Varias mascotas por cuenta.
- Cambio de mascota activa.
- Feed.
- Posts con/sin foto.
- Feed de mascotas propias + seguidas + recomendadas.
- Cold start de recomendaciones.
- Like / Unlike.
- Save / Unsave.
- Comentarios.
- Perfil público.
- Follow / Unfollow.
- Seguridad RLS/grants/RPC/Storage del núcleo.
- Persistencia de scroll entre pestañas.
- Protección contra follows entre mascotas del mismo dueño.
- Agenda/Cuidados persistente por mascota.
- Documentos privados persistentes por mascota.

## Módulos todavía mock, parciales o de demostración

- Eventos.
- Mensajería 1 a 1.
- Centro general de notificaciones.

---

# 5. Fases terminadas

## Fase 0 — Fundación
**Estado: COMPLETADA**

- React + TypeScript + Vite.
- Tailwind.
- React Router instalado.
- Supabase conectado.
- arquitectura base.

## Fase 1 — Perfil público y Follow
**Estado: COMPLETADA**

- perfil público real;
- navegación desde Feed;
- Follow/Unfollow persistente;
- ownership corregido.

## Fase 2 — Interacciones del Feed
**Estado: COMPLETADA**

### 2.1 Like / Save
- persistencia;
- reload;
- deduplicación;
- contadores backend;
- rollback;
- concurrencia.

### 2.2 Comentarios
- tabla real;
- carga;
- creación;
- contador;
- ownership;
- persistencia.

## Fase 3 — Registro, edición y privacidad de mascota
**Estado: COMPLETADA**

- create_pet_profile;
- datos privados separados;
- edición;
- intereses privados;
- avatar;
- métricas privadas.

## Fase 4 — Seguridad y estabilización
**Estado: COMPLETADA**

- RLS/grants endurecidos;
- posts normalizados;
- profiles protegidos;
- follows asegurados;
- interactions privados;
- Storage endurecido;
- repositorio limpiado;
- Security Advisor sin alertas SQL/RLS relevantes.

**Pendiente global de configuración:** activar Leaked Password Protection en Supabase Auth.

## Fase 5 — Múltiples mascotas
**Estado: COMPLETADA**

- cargar todas las mascotas owned;
- recordar mascota activa;
- cambiar contexto;
- Feed independiente por mascota activa;
- cold start;
- posts de mascotas hermanas visibles;
- interacciones aisladas por mascota;
- AddPet;
- scroll por pestaña;
- mismas-owner Follow oculto y bloqueado en backend.

---

# 6. Nueva Ruta Maestra — MVP social útil

## Fase 6 — Pasaporte QR, mascota perdida y avistamientos
**Estado: COMPLETADA**

### Objetivo
Convertir el sistema de rescate que hoy es visual en una utilidad real.

### Alcance
- token público revocable por mascota;
- QR realmente escaneable;
- página pública accesible sin login;
- ficha pública limitada a datos seguros;
- activar alerta de mascota perdida;
- resolver alerta;
- avistamiento público;
- notificación privada al dueño;
- persistencia;
- RLS y rate limiting básico;
- descargar/compartir QR.

### No entra todavía
- push notification del sistema operativo;
- ubicación GPS automática de quien reporta;
- mapa comunitario de alertas;
- SMS;
- email transaccional;
- red de rescates externos.

### Estado técnico final
- PR #6 implementado y validado;
- backend 6A, 6B y 6C aplicado en Supabase PAZO;
- QR real y token revocable por mascota;
- alerta perdida persistente y resoluble;
- avistamientos públicos con nombre/teléfono privados para el dueño;
- notificaciones reales y detalle accionable;
- recordatorio empático persistente de mascota perdida;
- acceso directo al avistamiento nuevo desde el recordatorio;
- notificaciones nuevas/vistas diferenciadas;
- Feed con paginación por desplazamiento en bloques de 10;
- Notificaciones con paginación por desplazamiento en bloques de 10;
- badge de no leídas calculado sin descargar todas las filas;
- recomendaciones paginadas sin solapamiento;
- RLS/ownership/privacidad validados;
- builds locales aprobados;
- prueba visual/end-to-end aprobada por Product Owner;
- datos visuales de prueba limpiados de Supabase;
- Pancho quedó con `is_lost=false` y sin ubicación de prueba;
- Advisors revisados; sin problemas nuevos introducidos por 6C.

### Definition of Done
- escanear QR desde otro dispositivo abre la mascota correcta;
- funciona sin login;
- no expone owner_id, pet_id privado, teléfono, domicilio ni información privada;
- una alerta persiste tras F5;
- un avistamiento crea registro real;
- el dueño recibe notificación real;
- resolver alerta persiste;
- RLS/advisors aprobados;
- build y prueba visual aprobados.

---

## Fase 7 — Comunidades
**Estado: COMPLETADA**

**Producto:** `docs/PAZO_PHASE_7_COMMUNITIES_MVP_SPEC.md`  
**Arquitectura:** `docs/PAZO_PHASE_7_COMMUNITIES_ARCHITECTURE.md`  
**Estado operativo:** `docs/PAZO_COMMUNITIES_CURRENT_STATE.md`

Decisión vigente:
- MVP útil real aprobado;
- membership por cuenta;
- contenido por mascota activa;
- comunidades públicas;
- creación, Join/Leave, feed, comentarios/likes y administración básica reales;
- extensiones avanzadas se validan dentro del módulo real;
- posts de comunidad no contaminan Feed global por defecto.

Gate 6: CERRADO.  
Gate 7: CERRADO.  
Gate 8: CERRADO.

Backend:
- `20261007014214 communities_mvp_core`;
- `20261007014624 fix_community_storage_policies`;
- build local PASS;
- RLS/ownership/counters PASS;
- Security Advisor sin findings nuevos atribuibles.

Estado técnico final:
- PR #18 fusionado a `main`;
- merge commit: `169b9a47453de0653a3aba27338ea80cd046e0d6`;
- build local PASS confirmado por Product Owner;
- prueba visual/end-to-end PASS;
- núcleo real y fake doors contextuales validados;
- señales legacy limpiadas;
- Security Advisor sin findings nuevos atribuibles a Comunidades.


---

## Fase 8 — Lugares, mapa y Check-ins
**Estado: COMPLETADA — GATE 8 CERRADO / GATE 9 MEDICIÓN**

### Objetivo
Hacer funcional el descubrimiento local.

### Alcance
- consumir `pet_places` reales;
- listado y detalle;
- categorías;
- búsqueda;
- mapa real;
- check-in temporal por mascota;
- contador activo;
- privacidad de ubicación;
- creación/sugerencia de lugares según decisión de producto.

### Decisiones de producto cerradas
- Mapbox GL JS;
- ubicación solo por acción explícita y uso efímero;
- no persistir GPS exacto;
- PAZO publica lugares y usuarios sugieren;
- check-in 2 horas;
- contador público + identidad de mascota solo con opt-in;
- modelos 3D GLB/glTF por categoría preparados desde arquitectura.

Gate 6: CERRADO / aprobado.  
Gate 7: CERRADO.  
Gate 8: CERRADO — Scope Closure Reconciliation PASS.

Estado técnico final:
- PR #20 fusionado a `main`;
- merge commit: `ca3fedd977e0720839a420f2e3673942871b7a61`;
- build local PASS;
- Mapbox runtime PASS;
- ubicación del dispositivo solo bajo acción explícita y uso efímero;
- 0 GPS exacto persistido;
- catálogo real inicial + lugares demo archivados;
- check-in privado/visible, expiración, cambio de lugar y checkout manual: PASS;
- aislamiento entre cuentas: PASS;
- sugerencias de lugares: PASS;
- búsqueda/filtros/detalle: PASS;
- Security Advisor sin findings nuevos atribuibles a Fase 8;
- migraciones aplicadas:
  - `20261007052747 phase_8_places_map_core`;
  - `20261007052749 phase_8_places_initial_catalog`;
  - `20261007053859 fix_place_checkin_checkout_rls`.

Fuentes:
- producto: `docs/PAZO_PHASE_8_PLACES_MVP_SPEC.md`;
- arquitectura: `docs/PAZO_PHASE_8_PLACES_ARCHITECTURE.md`;
- estado: `docs/PAZO_PHASE_8_PLACES_MASTER.md`.

---


### Corrección de cierre — FINALIZADA
- PR #22 fusionado a `main`;
- merge commit: `f775ce75f680a7059dbb7ccef9084816a1c3a299`;
- 6 fake doors contextuales implementadas;
- Supabase registry `20261007072355 place_extension_experiments`: APPLIED;
- runtime `Me interesa` + F5: PASS;
- 6 modelos glTF low-poly por categoría: implementados;
- veterinaria 3D: PASS después del fix de visibilidad;
- parque/sendero: PASS;
- build local Product Owner: PASS;
- backend QA: PASS;
- Security Advisor: sin findings nuevos atribuibles a Fase 8;
- `main` verificado después del merge;
- Scope Closure Reconciliation: PASS.

Fase 8 queda cerrada. Sus extensiones experimentales pasan a medición post-lanzamiento; no se construyen automáticamente por existir interés.

## Fase 9 — Cuidados y documentos privados

**Priorización:** `docs/PAZO_MVP_MODULE_PRIORITY.md`

### 9A — Agenda/Cuidados
**Estado: COMPLETADA**

**Sub-ruta de producto:** `docs/PAZO_PHASE_9A_CARE_MASTER.md`  
**Arquitectura técnica:** `docs/PAZO_PHASE_9A_CARE_ARCHITECTURE.md`

Decisión:
- BUILD NOW;
- utilidad individual;
- no depende de masa crítica;
- producto MVP especificado, arquitectado, implementado y validado.

Alcance funcional:
- cuidados persistentes por mascota;
- próximos/hoy/vencidos;
- completar/deshacer;
- historial real;
- edición/eliminación;
- recurrencia simple;
- reminder interno;
- privacidad owner-only.

### Estado técnico final
- PR #12 fusionado a `main`;
- commit de merge: `1876f7f02a452e58597a1c8151af77bc26c519f2`;
- build local aprobado por Product Owner;
- prueba visual/end-to-end aprobada por Product Owner;
- migración 9A aplicada a Supabase y registrada como `20261006054510 care_agenda`;
- `care_items` + `care_completions` reales;
- RLS/grants owner-only aplicados y auditados;
- completar/deshacer/archivar atómicos;
- frontend sin mock de Agenda;
- crear, editar, archivar, completar y deshacer persistentes;
- estados Próximo/Hoy/Vencido;
- historial paginado en bloques de 20;
- reminders internos según `Recordarme` y timezone;
- contador/resumen actualiza en carga, F5, mutaciones y cambio de mascota;
- banner superior reservado a rescate/avistamientos;
- feedback `Completando…` y bloqueo de doble clic en completion;
- pruebas SQL/RLS con `ROLLBACK` aprobadas: owner/non-owner, one-off, recurrencia, double-complete, undo, archive e historial;
- Advisors post-apply revisados sin hallazgos nuevos de seguridad atribuibles a 9A.

### 9B — Documentos privados
**Estado: COMPLETADA**

**Sub-ruta de producto:** `docs/PAZO_PHASE_9B_DOCUMENTS_MASTER.md`  
**Arquitectura técnica:** `docs/PAZO_PHASE_9B_DOCUMENTS_ARCHITECTURE.md`

Gates 0–7 cerrados. Resultado Gate 5: **MVP REDUCIDO**.

Núcleo aprobado: documentos privados owner-only. Compartir externamente queda fuera del MVP y se reevalúa después.

### Estado técnico final
- PR #14 fusionado a `main`;
- commit de merge: `6f833b779ef1a62d7321bc50dbab8c220f92a1d3`;
- build local PASS confirmado por Product Owner;
- prueba visual/end-to-end aprobada por Product Owner;
- tipos reales `PetDocument`;
- mocks `INITIAL_DOCS` y `PrivateDoc` retirados;
- `documentService.ts` y `DocumentsModal.tsx` reales;
- carga inicial, contador, F5, cambio de mascota y paginación reales;
- upload/preview/download/edit/delete reales;
- lifecycle recuperable `uploading/active/deleting`;
- migración base aplicada y registrada como `20261006090551 private_pet_documents`;
- hardening de políticas aplicado y registrado como `20261006090654 fix_private_document_storage_policies`;
- bucket privado `pet-documents` verificado con límite 10 MB y MIME PDF/JPEG/PNG/WEBP;
- wrappers públicos SECURITY INVOKER + helpers privilegiados en `document_private`;
- RLS/grants owner-only verificados;
- upload arbitrario sin reserva bloqueado;
- pruebas transaccionales DB/RLS aprobadas con `ROLLBACK`;
- aislamiento owner/non-owner aprobado;
- Security Advisor sin hallazgos nuevos atribuibles a 9B;
- prueba real de Storage API aprobada: upload, preview, download, edit, delete, F5 y multi-pet;
- bug visual de delete diferido corregido con reintentos de finalize + retiro inmediato de UI + reconciliación en background;
- compartir externamente permanece fuera del MVP.

Se separa de Agenda por mayor superficie de seguridad.

Alcance futuro:
- metadata persistente;
- Storage privado;
- upload;
- preview/descarga;
- categorías;
- URLs firmadas temporales;
- eliminación;
- aislamiento fuerte por propietario.

### No entra
- diagnóstico médico;
- telemedicina;
- recomendaciones clínicas automáticas.

---

## Fase 10 — Mensajería 1 a 1
**Estado: PLANIFICADA**

`MessagesModal` usa conversaciones mock.

### Objetivo
Mensajería persistente entre cuentas/mascotas.

### Alcance
- conversaciones;
- participantes;
- solicitudes;
- aceptar/rechazar;
- mensajes;
- unread;
- timestamps;
- RLS;
- Realtime después de persistencia estable;
- bloqueo básico de abuso.

### Regla
No almacenar mensajes como estado local como fuente de verdad.

---

## Fase 11 — Sistema general de notificaciones
**Estado: PLANIFICADA**

Fase 6 introduce la primera notificación real de rescate. Esta fase generaliza el sistema.

### Alcance
- Follow;
- comentarios;
- mensajes;
- comunidades;
- cuidados;
- rescate;
- unread;
- marcar leída;
- deep links internos;
- preferencias.

### Segunda etapa
- Push Web/PWA una vez estable la bandeja persistente.

---

## Fase 12 — Global Search / Explore
**Estado: COMPLETADA — GATE 8 CERRADO / GATE 9 MEDICIÓN**

### Objetivo
Que “Explorar” encuentre contenido real y navegue a entidades reales, sin prometer capacidades que todavía no existen.

**Sub-ruta activa:** `docs/PAZO_PHASE_12_EXPLORE_MASTER.md`

Gate 0 — auditoría real: CERRADO.  
Gate 1 — valor: CERRADO.  
Gate 2 — coste/dependencias: CERRADO.  
Gate 2.5 — Idea Bank: CERRADO.  
Gate 3 — experimento mínimo: CERRADO sin código adicional.  
Gate 5 — decisión: MVP REDUCIDO.  
Gate 6 — especificación: CERRADO.  
Gate 7 — CERRADO.  
Gate 8 — CERRADO.  
Gate 9 — MEDICIÓN.  
Supabase / build / runtime / Product Owner acceptance: PASS.

### Alcance
- mascotas;
- comunidades;
- lugares;
- eventos si ya existen;
- búsqueda;
- filtros;
- paginación;
- recomendación contextual;
- navegación a perfiles reales.

---

## Fase 13 — Rediseño visual y sistema de interfaz
**Estado: PLANIFICADA**

### Objetivo
Elevar la calidad visual de PAZO sin alterar las funcionalidades ya aprobadas.

Esta fase permite rediseñar pantallas completas o componentes individuales manteniendo intactos sus contratos funcionales.

### Alcance
- auditoría visual completa de todas las pantallas;
- jerarquía visual;
- tipografía;
- espaciado;
- grid;
- márgenes;
- botones;
- inputs;
- tarjetas;
- contenedores;
- modales;
- navegación;
- header;
- tabs;
- estados seleccionados;
- estados vacíos;
- loaders;
- errores;
- feedback visual;
- iconografía;
- sombras;
- bordes;
- radios;
- densidad visual;
- responsive móvil/escritorio;
- microinteracciones y animaciones;
- consistencia entre módulos;
- creación o consolidación de design tokens;
- componentes UI reutilizables cuando reduzcan inconsistencias.

### Regla principal
**Rediseño visual ≠ cambio funcional.**

Durante esta fase:
- no cambiar reglas de negocio;
- no cambiar ownership ni RLS;
- no cambiar contratos de Supabase;
- no cambiar qué hace un botón;
- no eliminar funciones existentes;
- no introducir nuevas funcionalidades sin aprobación explícita;
- no modificar flujos UX funcionales solo porque “se verían mejor”.

Si una propuesta visual requiere cambiar comportamiento, navegación, información mostrada o estructura funcional, debe registrarse como **DECISIÓN PENDIENTE** y aprobarse por separado.

### Método de trabajo
El rediseño debe hacerse por bloques y no como cambio masivo ciego:

1. definir sistema visual base;
2. aprobar componentes principales;
3. rediseñar navegación y layout global;
4. rediseñar Feed;
5. perfiles;
6. Explore;
7. mapa/lugares;
8. cuidados;
9. mensajería;
10. modales y flujos secundarios;
11. estados vacíos/error/loading;
12. revisión responsive y accesibilidad.

Cada bloque se prueba antes de continuar para evitar propagar una dirección visual incorrecta a toda la app.

### Pendientes visuales heredados de Fase 6
- animación de un perrito en estado de alerta al activar/buscar una mascota perdida;
- títulos visuales personalizados para cada tipo de alerta/notificación;
- revisar la presentación final de etiquetas, encabezados y jerarquía visual del sistema de rescate.

Estos puntos son exclusivamente estéticos y no bloquean la funcionalidad de rescate.

### Definition of Done
- todas las pantallas incluidas en Beta siguen una misma línea gráfica;
- no quedan estilos claramente pertenecientes a prototipos anteriores;
- botones, inputs, cards y contenedores tienen reglas consistentes;
- mobile y desktop mantienen buena jerarquía;
- funcionalidades existentes siguen pasando las mismas pruebas;
- no aparecen regresiones de Feed, navegación, formularios o modales;
- Product Owner aprueba visualmente la interfaz final.

---

## Fase 14 — Confianza, moderación y privacidad
**Estado: OBLIGATORIA ANTES DE BETA PÚBLICA**

**Contrato canónico adicional:** `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`

### Alcance
- reportar contenido;
- reportar perfil;
- bloquear usuario/mascota;
- ocultar contenido;
- moderación;
- eliminación/cierre de cuenta;
- borrado de mascota;
- manejo de contenido eliminado;
- procedimiento de contenido ilegal/abusivo;
- proceso para copyright/IP/UGC;
- límites básicos contra spam;
- revisión final de datos públicos vs privados vs sensibles;
- política de archivos;
- data inventory;
- retention/deletion matrix;
- procedimiento si PAZO obtiene conocimiento de una cuenta menor de edad;
- Privacy Policy real;
- Terms of Use reales;
- inventario de terceros/proveedores y datos enviados;
- auditoría de tracking/analytics;
- auditoría de RLS completa.

### Regla
No habilitar session replay/autocapture ni recolectar DOB/ID/GPS exacto para analytics por defecto. Cualquier excepción requiere una decisión explícita de privacidad/producto.

---

## Fase 15 — PWA, rendimiento y preparación de Beta
**Estado: PLANIFICADA**

### Alcance
- manifest;
- instalación;
- iconos;
- service worker según necesidad;
- estados offline seguros;
- lazy loading/code splitting;
- reducir bundle;
- imágenes;
- accesibilidad;
- errores y estados vacíos;
- responsive;
- performance;
- Leaked Password Protection cuando el plan/beneficio lo justifique;
- revisión de env/secrets;
- backups;
- restore drill no destructivo;
- logging/error monitoring;
- verificación de PostHog live ingestion/alerts;
- verificación de Vercel/Mapbox usage y spend controls;
- auditoría final de cookies/storage/client identifiers;
- pruebas de producción.

### Definition of Done
La aplicación puede entregarse a usuarios beta sin depender de mocks en el núcleo seleccionado para lanzamiento.

---

# 7. Gate — MVP/Beta

No llamar “MVP listo” hasta que:

- Fases 6 a 15 definidas como requeridas para Beta estén completadas o explícitamente descartadas por Product Owner;
- no existan mocks visibles en funcionalidades incluidas en Beta;
- RLS esté auditado;
- build de producción pase;
- flujo nuevo usuario → mascota → Feed → social → recuperación de cuenta funcione;
- manejo de errores básico exista;
- privacidad esté revisada;
- pruebas reales en móvil estén aprobadas.

---

# 8. Expansión posterior al MVP

Estas funciones pertenecen al concepto original de PAZO, pero no deben entrar automáticamente en una fase sin especificación funcional.

## Fase 16 — Monetización base
**Estado: BACKLOG**

- membresías;
- beneficios;
- PayPal o pasarela definitiva;
- estados de suscripción;
- entitlement backend;
- restaurar compras;
- cancelación;
- fundador/premium.

Antes de implementar, decidir producto y precios.

## Fase 17 — Parejas / Matches de mascotas
**Estado: BACKLOG**

Idea original:
- descubrir perfiles;
- match;
- pago/membresía para funciones premium.

### DECISIONES PENDIENTES
- propósito exacto del match;
- seguridad;
- filtros;
- consentimiento;
- qué parte es paga.

## Fase 18 — Adopciones
**Estado: BACKLOG**

- organizaciones/perfiles autorizados;
- animales disponibles;
- filtros;
- solicitudes;
- estados;
- moderación y verificación.

## Fase 19 — Servicios para mascotas
**Estado: BACKLOG**

- paseadores;
- grooming;
- veterinarias;
- perfiles de negocio;
- panel profesional;
- disponibilidad/citas;
- reseñas;
- verificación.

Debe dividirse en subfases antes de programar.

## Fase 20 — Tiendas / negocios / publicidad
**Estado: BACKLOG**

- tiendas;
- catálogo;
- negocio local;
- anuncios/promoted content;
- herramientas comerciales.

No mezclar e-commerce completo con el MVP social sin decisión explícita.

---

# 9. Deuda conocida / limpieza

No convertir esta lista en una fase automáticamente; resolver cuando corresponda.

- `README.md` sigue siendo el README genérico de Vite.
- `src/data/mockData.ts` todavía alimenta módulos incompletos.
- existe `CreateModal - copia.tsx`, probable archivo duplicado a retirar después de verificar uso.
- `INITIAL_PETS` sigue sirviendo como fallback inicial en memoria; revisar cuando se termine la eliminación de mocks.
- Agenda/Cuidados y Documentos privados son reales y persistentes.
- Messages son mock/local.
- algunos flujos del menú Crear anuncian “próximamente”.
- bundle ya ha mostrado warning de chunk >500 kB; atender en Fase 15.
- Leaked Password Protection pendiente en Supabase Auth.
- Fase 6 cerrada; PR #6 fusionado al completar esta actualización.

---

# 10. Regla de estado de fases

Usar únicamente:

- **COMPLETADA** — merged en main + backend aplicado + pruebas aprobadas.
- **EN CURSO** — se está implementando.
- **SIGUIENTE** — primera fase autorizada para comenzar.
- **PLANIFICADA** — definida pero no autorizada todavía.
- **PAUSADA** — trabajo existente, detenido conscientemente.
- **BACKLOG** — idea futura que requiere definición.
- **DECISIÓN PENDIENTE** — prohibido inventar comportamiento.

---

# 11. Próximo paso exacto

## Selección del siguiente módulo

Fase 12 está COMPLETADA y pasa a Gate 9 / medición.

No existe un siguiente módulo autorizado automáticamente.

Candidatos conocidos:
- Fase 13 — Rediseño visual y sistema de interfaz: PLANIFICADA;
- Fase 14 — Confianza, moderación y privacidad: OBLIGATORIA antes de Beta pública;
- Fase 10 — Mensajería: POSPONER / REEVALUAR;
- Fase 11 — Notificaciones generales: implementar por dependencia concreta.

### Exact next action
Seleccionar el siguiente módulo mediante `docs/PAZO_MODULE_LIFECYCLE.md` antes de implementar.

## Do not do
- no reabrir Fase 12 salvo regresión o nueva decisión de producto;
- no convertir datos de Gate 9 en features automáticamente;
- no iniciar Fase 13/14/10/11 por numeración sin decisión de producto.


---

# Production Hardening — infraestructura pre-Beta
**Estado: EN CURSO**

**PR #30 / tranche implementado:** MERGED to `main` at `c179182c79c587c7727277a966cc09704002ce10`; Architecture/Privacy Reconciliation PASS; Product Owner validation PASS; governance CI PASS.

Sub-ruta:
`docs/PAZO_PRODUCTION_HARDENING_MASTER.md`

Prioridad:
- P0 webhook PayPal + entitlement seguro;
- P0 retirar pitch prematuro;
- P1 Error Boundary + CI + observabilidad;
- P1 modernizar claves/Auth;
- P1 alertas de salud/costos;
- P2 anti-abuse, ruido operacional, restore drill y analytics.

Esta fase de infraestructura está autorizada por el Product Owner y no constituye autorización para decidir automáticamente precio o beneficios de la membresía.

---

## Checkpoint vigente — QA local del MVP 2026-10-09

**Evidencia posterior a los párrafos históricos de roadmap.** El PO abrió PR #36 commit `b49ecd3` en Antigravity/localhost (frontend local, Supabase alojado) y declaró PASS en login/pantalla de recuperación, Feed/paginación, mensajes honestos, publicación, interacciones y comentarios con F5, perfiles/follows; además confirmó funcionamiento general de todos los módulos. Ver `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md` para alcance y límites. Esto **cierra el smoke funcional local, no Gate 8 de F14 ni el Release Gate público**.

**Ruta crítica ahora:** no repetir módulos; verificar PR #36/CI actual, gestionar merge solo con autorización PO, validar email real de Auth, resolver mínimo operacional F14 de reportes/eliminación y textos legales, evitar regresión de Mapa dev-only en PR #35 y obtener artefacto de release cuando sea viable sin upgrade Vercel. No abrir fases 10/11/13 por defecto.

**Regla visual firme:** cero contornos en componentes (única excepción justificada en fields de texto), incluso en estados de foco; espaciado login queda para revisión visual futura, no blocker funcional. El PO conserva modificaciones F14 sin commit en su carpeta local original; conservarlas.

**Situación GitHub al checkpoint:** `main` `ae7e63f`, PR #36 DRAFT (sin merge), PR #35 DRAFT (F14 pausada), PR #34 OPEN (rollout Lugares). La comprobación de funcionamiento local no implica que esos PRs estén listos para integrar ni que la beta pública esté autorizada.

## Actualización F14 — integración acotada hacia Beta, 2026-10-09

PR #37 (DRAFT) **no cierra Gate 8**. PR #36 fue aceptado funcionalmente en local y es base de integración. PR #37 reutiliza las RPC de reportes y colas moderadoras ya aplicadas a Supabase alojado para conectar cinco clases de denuncia a UI, sin fusionar PR #35 (F14 A2 avanzada) ni reintroducir su guard `import.meta.env.DEV` que altera el Mapa real. CI `37944094738` SUCCESS en commit `eda27bc`; QA real de reportes pendiente.

**Bloqueadores de release siguen**: retirada de medio físico/Storage/CDN D3-A; ruta íntegra de eliminación cuenta/mascota A3; matriz D3-B y textos públicos A4; confirmación/recovery email real; reconciliación de PR #34 de Lugares y PR #35 sin desactivar funciones históricamente aprobadas. No cambiar scope aprobado por llamarlo «mínimo» ni equiparar botones visibles con seguridad verificada. Ningún gasto, merge, migración ni despliegue autorizado por este checkpoint. Ver `docs/PAZO_F14_BETA_REPORTING_PILOT_20261009.md`.
