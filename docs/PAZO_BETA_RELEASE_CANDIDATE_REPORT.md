# PAZO Beta Release Candidate — informe de trabajo

Fecha: 2026-10-20, America/Guatemala. **Dictamen: NO-GO. No es una beta terminada ni publicada.**

Checkpoint actual: generación 1 real reservada y única, lector de ventas original
instalado; ambos selectores Live OFF. PO aportó Webhook ID candidato, todavía sin
verificación API. Nuevo canal efímero de comprobación plan/webhook: 20 tests
dirigidos, PG17 y verify:prepreview PASS; CI del nuevo código e instalación
pendientes. No guarda claves ni prueba identidad merchant, firma o entrega.
HEAD previo cd9d56cc9a05165bb8fa2f2c4f74dc528a679e64: 9/9 workflows SUCCESS.
El historial siguiente distingue hitos anteriores; el handoff conserva el estado
más reciente. No existe todavía candidato final aceptado ni beta publicada.

## Identidad del código

- Repositorio: DigitalAppcorp/pazo-app.
- Rama autorizada: `f13/section-titles-20261012`; PR #44 OPEN/DRAFT.
- Base auditada: `d3cd883fc7f7b121fa79cb7249e2f93fd1dfcba5`.
- Commit de código verificado localmente: `ba9605637c035f873a0e5793937e04aa76e7a551`.
- Checkout de esta ejecución: `C:\Users\osori\Downloads\Nuevo pazo app\pazo-beta-rc`.
- Clon original preservado (actualizadoff después a ba960563, conservando el lockfile): `C:\Users\osori\PAZO-F13-preview`, HEAD observado `63570249d0e67b24eb05ad48b3fa7bb0a5126f2e`, con `package-lock.json` modificado preexistente. No se hizo pull ni reset allí.
- No existe todavía un SHA aprobado como candidato final de beta. El commit documental que contiene este informe no modifica el código validado.

## Diagnóstico del POST 503

La consulta de logs alojados de 2026-10-21 00:34 UTC mostró esta secuencia:

| Llamada | UTC | HTTP |
|---|---|---|
| GoTrue /auth/v1/user | 00:34:32.102 | 200 |
| pazo_is_admin | 00:34:32.256 | 200 |
| pazo_admin_paypal_settings | 00:34:32.632 | 200 |
| pazo_f16_live_service_bootstrap_reserve | 00:34:32.744 | 403 |

En esa ventana PostgreSQL registra un error `unauthorized`. Auth, MFA y lectura del borrador precedieron a la reserva fallida; no corresponde pedir al PO volver a configurar el autenticador. La RPC devolvió una denegación que el adaptador Edge convirtió en 503.

Las 17 RPC `pazo_f16_live_service_*` alojadas comprueban `request.jwt.claim.role`. PostgREST actual entrega el rol en `request.jwt.claims` JSON. Las pruebas antiguas inyectaban la variable heredada y no cubrían este contrato. La fuente SQL exacta alojada reproduce 42501 cuando solo se proporciona el contrato JSON actual. Se preparó una corrección exclusiva de la expresión del rol, conservando íntegramente los cuerpos, identidades, ACL y compuertas. La ejecución administrativa autenticada en el entorno alojado sigue pendiente después del GO.

Fuente del contrato: [PostgREST: request claims](https://docs.postgrest.org/en/stable/references/transactions.html#request-headers-cookies-and-jwt-claims).

## Cambio preparado y gate de instalación

- Migración **INSTALADA Y VERIFICADA**, versión alojada 20261021012636: `supabase/migrations/20261021012636_pazo_f16_live_service_json_claims_guard.sql`.
- SHA-256: `c523e2c044a4c1c04fcb2b864b079181b50f5672e0f42d9ed6d0907a9f5a794a`.
- Se limita a 17 definiciones explícitas. Preflight exige hashes originales, propietario postgres, SECURITY DEFINER, search_path vacío, ACL exacto postgres/service_role y selector OFF.
- No invoca RPC de negocio, secuencias ni PayPal; no agrega grants, datos o secretos y no cambia el selector financiero.
- Auditoría reutilizable de solo lectura: `supabase/queries/f16_live_json_claims_guard_audit_READ_ONLY.sql`.
- Rollback explícito, **requiere GO separado después de commit**: `supabase/rollbacks/f16_live_service_json_claims_guard_REVIEW_REQUIRED.sql`. Antes de COMMIT un fallo revierte la transacción. Después, el rollback restaura también el defecto anterior; usarlo únicamente con Live OFF si una regresión lo exige.
- Riesgo: modificar autorización privilegiada podría afectar llamadas de servicio. Mitigación: cambio de una expresión por cuerpo, hashes que detienen drift, roles reales y pruebas negativas, postflight y rollback ensayado.
- El PO autorizó todas las migraciones necesarias sin volver a pedir GO individual. Esta migración se instaló una vez después de 9/9 workflows SUCCESS. Reservar una generación no autoriza por sí solo cobros, publicación o aceptación visual.

## Verificación local

`npm run verify:prepreview` terminó con exit 0: governance (incluye closure), guard de release, F16 synthetic, build y comprobación de dist.

| Grupo | Resultado |
|---|---|
| Ops | 11/11 |
| MVP | 101/101 |
| PWA estática | 3/3 |
| Closure | 294/294 |
| F16 synthetic | 1193/1193 |
| Dist | 4/4 |
| PostgreSQL 17.11 desechable | PASS, incluyendo laboratorio existente y nueva regresión |

El laboratorio cargó fuente real de catálogo sin datos del proveedor, reprodujo la denegación original y comprobó reserva y replay bajo rol DB `service_role`, rechazo de claims ausentes/anon/authenticated/user_metadata y legacy-only, ACL contra roles reales, Live OFF, y rollback/reapply sin perder la reserva sintética. El servidor temporal se apagó al terminar. No hubo compras ni conciliación real.

Se corrigieron defectos de portabilidad del QA Windows: dos comparaciones CSS normalizan CRLF, SQL usa LF para preservar literales/fingerprints y el test del operador usa un USERPROFILE sintético para no leer el estado Sandbox real. OpenSSL existente en Git se añadió solo al PATH del proceso de prueba. Los controles de producción no se modificaron.

Advertencia de build: chunk mayor de 500 kB y timing del plugin; no se convirtió en error ni se alteró el umbral.

## Estado alojado y público observado

Supabase postflight: 0 funciones originales, 17 corregidas, 17 con ACL/definición protegidas. Después del check_readiness administrativo POST200, el PO creó una sola reserva real: generación1, estado reserved, plan esperado. Consulta independiente confirma total1, generaciones Live0 e intentos de provisión0. Selector sandbox, live_enabled=false, kill_switch=true, active_generation=null, revision=0.

| Edge | Versión | Estado del código |
|---|---|---|
| pazo-admin-paypal-bootstrap | 6 | reserva autorizada; JWT obligatorio; check_readiness presente |
| pazo-admin-paypal-provision | 2 | RELEASE_APPROVED=false; JWT obligatorio |
| pazo-paypal-live-checkout | 2 | LIVE_CHECKOUT_RELEASED=false; JWT obligatorio |
| pazo-paypal-live-webhook | 1 | LIVE_WEBHOOK_RELEASED=false |

Vercel MCP devolvió 403 de scope; fallback CLI autenticado verificó el proyecto existente, productionBranch=main y **previewDeploymentsDisabled=true**. No se cambiaron preferencias ni se hizo deploy.

HTTPS anónimo del dominio provisional, durante esta ejecución:

| Ruta | Resultado |
|---|---|
| / | 200, shell de la aplicación |
| /paypal/return | 404 |
| /paypal/cancel | 404 |
| /manifest.webmanifest | 404 |
| /sw.js | 404 |

La portada pública no acredita retornos o instalación PWA. El build local contiene esos recursos y los checks de dist pasan; el despliegue público actual no es evidencia del código candidato. Corregir la publicación exige un GO de despliegue independiente.

## Matriz CODE / CI / HOSTED / PROVIDER / E2E / PO

| Entregable | CODE | CI | HOSTED | PROVIDER | E2E | PO |
|---|---|---|---|---|---|---|
| Corrección autorización 503 | Implementada | Local PASS + 9/9 remoto | 17 corregidas/17 protegidas | N/A | check_readiness200 y reserva202 verificada en DB | PO confirmó ambos pasos |
| Reserva comercial única | Implementada | Sintética PASS | 1 reserva generation1, sin duplicados | N/A | PO ejecutó, DB corroboró | Confirmada |
| Identidad/plan/webhook Live | Parcial | Contratos previos | Incompleto | Sin verificar por API en esta ejecución | Pendiente | Operaciones específicas |
| Credenciales privadas y Guardar/verificar/activar | Parcial, fail-closed | Contratos previos | Provisión inerte | Pendiente | Pendiente | Custodia/operación pendiente |
| Checkout, cancelación y retornos Live | Preparados parcialmente | Sintética PASS | Latches OFF; retornos públicos 404 | Sin cobro nuevo | Pendiente | GO financiero separado |
| Worker/ledger/entitlements | Adaptadores y SQL staged | Sintética PASS; lector080b8099 CI9/9 | LectorventaoriginalSTABLEinstalado20261021014400; workerincompleto | Sin conciliación Live | Pendiente | Operaciones pendientes |
| Insignias | Originales preservados | Closure PASS | Lectores públicos observados usan proyección Sandbox QA | Sin períodos Live | Revisión pendiente | Visual pendiente |
| Panel desktop/móvil | Existente | Closure PASS | Backend parcial | Métricas sin inventar | Comparación pendiente | Visual pendiente |
| App social | Existente, sin cambios de producto | MVP/closure PASS | No reescrito | N/A | QA histórico no repetido | Conservar aceptación histórica |
| PWA/HTTPS | Build preparado | Dist PASS | /200, cuatro rutas 404 | N/A | Instalación/retornos pendientes | Gate de publicación pendiente |
| Seguridad/privacidad/operación | Auditoría parcial | Governance PASS | Advisor con pendientes | Restauración/alertas no verificadas aquí | Pendiente | Retención/legal/operación pendientes |

## Seguridad y alcance de la revisión

Auditoría de catálogo: cero tablas públicas accesibles sin RLS, cero vistas públicas accesibles, cero definers públicos usando user_metadata y ninguna función con solo GUC role heredada. Organización Supabase Free; no se aumentó el plan. Scoped PAT está en alpha de despliegue gradual; no asumir disponibilidad ni usar tokens clásicos como atajo.

Security Advisor: 40 INFO RLS sin policies, 4 WARN SECURITY DEFINER anónimas, 38 WARN autenticadas y 1 WARN de protección de contraseñas filtradas desactivada. No se revocaron RPC ni se habilitaron complementos facturables.

Las cuatro RPC anónimas se revisaron por fuente: visibilidad de contenido devuelve booleano; beneficios públicos devuelven badge/theme/milestone; batch está limitado a 48; muro exige consentimiento no revocado, propietario actual y beneficio activo. Esto explica su exposición intencional; no sustituye auditoría completa de dependencias, roles y privacidad. Los lectores de beneficios actualmente consultan Sandbox QA; no atribuirles integración Live.

Referencias: [exposición de definers anónimas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Antes de GO beta faltan validación legal/retención real y bajas/backups, prueba de restauración/rollback operativo, alertas, observabilidad, límites de uso, revisión completa de RLS/RPC y aceptación visual. No se modificaron tratamientos legales ni se fingió revisión profesional.

## Próxima dependencia

1. CERRADO: commit ba960563, 9/9 CI y migración17 instalada; check_readiness y reservaúnica corroborados.
2. CERRADO: postflight17corregidas/17protegidas y selectorOFF. Reserva1 posterior creada por el PO, no por la migración.
3. CERRADO: clon original actualizadoff, package-lock preservado; check_readiness POST200. No repetir alta MFA ni reserva.
4. EN CURSO: registro manual webhook appPazoLive con URL real generation1 y10eventos. Chrome no permitió controlar la pestaña; PO tiene pasos numerados. Seguir con identidad/custodia/worker. Lector de ventas originales instalado como20261021014400, ACLservice-only ysmokeREADONLYPASS; migraciones autorizadas globalmente.
5. Terminar bloques transversales y obtener un SHA final, aceptación PO y GO independientes de publicación y cobros.

**F16 completo antes de beta sigue obligatorio.** Ningún PASS de esta ejecución sustituye HOSTED, PROVIDER, E2E o PO. No se declara cerrado el proyecto ni se promete trabajo en segundo plano.
