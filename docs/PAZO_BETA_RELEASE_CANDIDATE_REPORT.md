# PAZO Beta Release Candidate — informe de trabajo

## Continuidad Codex — 21-oct-2026, implementación local verificada

Base de integración auditada por Git: F13 `669efafdb5678cae40c5137d7bddc9403c2ab8a3`;
PR #66 `d1d34fa230c0928748141adf1f02adb186a99568` revisado: solo alinea el nombre
de la migración de cancelación ya aplicada y su prueba, más el handoff. Se usó
como base de `f16/beta-completion-20261021`, sin modificar `main` ni sobrescribir F13.
No se pudo consultar estado/comentarios/CI de PR mediante API: proxy 403.

Código adicional implementado: reanudación del CREATE original con lease y el
mismo cuerpo/PayPal-Request-Id dentro de 48h; GET independiente antes del binding;
reconciliación de cancelaciones inciertas por GET sin segundo POST; cierre de
slots solo tras estado terminal verificado, sin eventos/cancelaciones pendientes
ni cobertura sin vencer (incluidos holds); consentimiento nuevo para otro intento;
descarga ES/EN de condiciones incluso tras cierre; acceso a gestión desde miembro
verificado; aislamiento ante cambio de usuario; fondos/muro Live basados en períodos
verificados; agregados administrativos sin saldo/ingreso neto inventado.

Tres migraciones nuevas SOLO preparadas y probadas en PG17 desechable:
`20261021210000` recovery finish, `20261021213000` cosméticos Live,
`20261021220000` resumen financiero administrativo. NO instaladas en Supabase.
La Edge de cuenta actualizada NO fue desplegada. Checkout/webhook siguen hard-OFF
en el código. No hay cobros, nuevas credenciales ni publicación por estos cambios.

Validación: suite local de gobernanza/F16, build y dist; PG17 con SQL real y
rollback/reapply; navegador sintético 390/1440px, doble clic, cancelación explícita,
fuente financiera no disponible y callbacks reales de la SPA sin tokens en URL.
Estos resultados NO son PayPal Live, PWA instalada HTTPS ni CI remoto.

**Bloqueo operativo actual:** red de APIs/host público devuelve CONNECT403;
no hay herramientas ni autenticación Supabase/Vercel en esta sesión. Se guardó
borrador de red añadiendo api.github.com, api.supabase.com, api.vercel.com y
pazo-app-t83r.vercel.app sin borrar destinos. Guardar no aplica ni publica.
Falta auditar source/versión alojados antes de instalar/desplegar; también falta
terminar P4 (readiness y habilitación controlada Admin/DB/Edge), publicación HTTPS
bajo GO y canary real autorizado. NO pedir claves PayPal todavía.
No hacer push a ramas conectadas sin verificar primero Preview OFF/cuota.
Ver informe de esta entrega: `docs/PAZO_CODEX_BETA_CONTINUATION_20261021.md`.
**Estado global: NO-GO; no READY_FOR_LIVE_CREDENTIALS_AND_PO_CANARY.**

Actualización Codex 21-oct-2026: P1 en ejecución en la rama de recuperación
`f16/live-signed-sale-reconciler-20261021`. Evidencia mínima firmada, lectura con
lease y GET del evento de la generación original implementados, SQL local PG17
con roles/rollback PASS. Closure 376/376, F16 sintético 1193/1193, build y PWA
dist 4/4 PASS. Vite 8.3.2→8.3.3, audit cero vulnerabilidades. Migración
`20261021074014` aplicada posteriormente como se documenta abajo; sin pagos ni claves.
Avance posterior del mismo PR54: worker privado de una venta, origen original
corroborado, primer período contractual y renovación ordinaria observados,
escritura pago/refund y cierre de lease en una transacción. Closure397/397,
F16synthetic1193/1193, verify:prepreview completo/build/dist4/4 y PG17 PASS.
Postflight alojado del mismo commit: tres migraciones APLICADAS con versiones
MCP reales `20261021074014`, `20261021074024`, `20261021074032`, archivos locales
alineados sin cambiar su SQL. Cinco RPC service-only/RLS FORCE/ACL PASS; bridges
antiguos sin lease revocados. Reserva1; merchant/inbox/recibos/períodos0; LiveOFF.
CI3501 cuatro jobs y laboratorio418 PASS. Ningún Edge nuevo liberado aún.
Lifecycle/refund aplicados en `20261021142517` tras CI3502/gateway419 de `75dfd4e6`;
postflight dos RPC service-only y cuatro columnas, LiveOFF/0 datos financieros.
Control `20261021144809` aplicado tras CI3503/gateway420; OFF y RLS/ACL PASS.
Edge worker v1 ACTIVE, autenticación propia/SQL privado, 4 rechazos HTTP PASS.
Scheduler `20261021145500` todavía local: PG17 probó core con mocks, no extensiones
nativas. Sin prueba autenticada de salud alojada; no es preparación de claves completa.
Esto no completa scheduler, todos los eventos/beneficios ni P1–P5. **NO-GO** y
todavía no READY_FOR_LIVE_CREDENTIALS_AND_PO_CANARY. Detalle en el reconciliador.

## Comprobación privada del ID de comercio Live — 21-oct-2026 UTC

**Estado CODE + CI + HOSTED, no vinculante:** tras confirmar el PO que tiene a la
vista el Merchant ID en PayPal Business real, se implementó el formulario
`AdminPaypalLiveMerchantMatch.tsx` dentro de Admin→Configuración→PayPal→Live,
separado de la comprobación de plan/webhook **ya terminada**. Pide ID de comercio
(13 caracteres), Live Client ID y Live Client Secret **solamente dentro de PAZO**,
con Supabase TOTP reciente exigido por el servidor. Ninguna clave ni merchant ID se
introduce en chat o GitHub. El formulario limpia los inputs al enviarlos.

**Seguridad real:** nueva acción `verify_merchant_id` en
`pazo-admin-paypal-live-inspect/handler.mjs`, no en checkout. Bajo el mismo
contexto admin, reserva generación1 y Live switch OFF, reutiliza el lector
solo servidor `readLivePaypalMerchantIdentity` que comprueba plan y webhook y
consulta temporalmente el ID de la API PayPal Live
`GET /v1/reporting/balances?currency_code=USD` (requiere permiso
`reporting/balances/read`). La respuesta de saldos nunca sale del proceso ni
se persiste. El servidor compara `SHA-256(paypal:live:<merchant_id_del_PO>)`
con la huella del account_id devuelto por PayPal, descarta ambas referencias
brutas y las claves, vuelve a comprobar la generación y devuelve solo
`live_merchant_id_read_match` o código fijo de rechazo. En éxito devuelve
EXPLÍCITAMENTE `merchantIdentityVerified=false`,
`merchantBindingStored=false`, `credentialsStored=false`,
`webhookDeliveryVerified=false`, `mayCharge=false`. Un simple match transitorio
no es registro de identidad original inmutable ni prueba de firma webhook.
No se cambia `pazo_paypal_merchant_generations` ni se provisionan secretos.

**Integración:** PR #48 fusionado EXCLUSIVAMENTE a F13, squash
`3deca88144f0f8f99824f3d3addb832ed6ba0e0e`; CI antes de integrar
9/9 SUCCESS, incluido Node, TypeScript, PWA y laboratorios PG17.
Supabase `pazo-admin-paypal-live-inspect` **v4 ACTIVE**, `verify_jwt=true`;
nueve fuentes alojadas idénticas a F13. No se desplegó frontend público.
Postflight SQL read-only: reserva1, merchant0, intentos secretos0,
release_evidence0, períodos Live0, selector sandbox/live=false/kill=true.
`main` y PR44 DRAFT intactos.

**Siguiente acción PO:** en `PAZO-F13-preview` actualizar la rama F13 local
SIN descartar `package-lock.json` modificado; refrescar localhost:5173,
Admin→Configuración→PayPal→Live; verificar TOTP reciente en PAZO;
nueva sección `Comprobar identidad del comercio Live`: introducir ID visible de
PayPal Business real + Live Client ID/Secret solo en formulario privado;
pulsar una vez `Comprobar comercio sin guardar datos`. Reportar solo mensaje
de estado/código (`live_merchant_id_read_match` o
`live_merchant_read_permission_required`, etc.), nunca ID/keys/saldos.
No hay que repetir el botón `Comprobar plan y webhook Live`, ni reservar
generación/webhook nuevamente.

**Gate pendiente después de un match real:** establecer la huella original
solo con consentimiento administrativo explícito y registro fiable inmutable,
provisionar secretos con scope mínimo, probar entrega firmada, conciliación,
reversiones, checkout/retornos HTTPS/PWA, beneficios y rollback. No dar GO Live
por el match transitorio.



## Cierre verificado del gate de configuración del plan y webhook Live — 21-oct-2026

**Este estado supersede el diagnóstico histórico `live_webhook_events_unexpected` de abajo.** El Product Owner presentó captura de PAZO con mensaje
`Plan y webhook comprobados y registrados. Claves no guardadas. Live sigue apagado.`
No repetir comprobación de recursos, ni crear otro webhook o generación.

Lectura SQL alojada **READ ONLY** confirmó exactamente una fila en
`admin_private.paypal_gateway_change_log`: `kind=validation`,
`details.scope=live_resource_configuration`, `generation=1`,
`plan_read_verified=true`, `webhook_read_verified=true`,
`credentials_stored=false`, `recorded_at=2026-10-21 03:00:48.612283+00`.
`admin_private.paypal_gateway_settings` tiene `webhook_id=6UA43660E66988355`,
pero `validation_status=not_verified` y `validated_at=NULL` por contrato:
es evidencia de lectura de recursos, **no** evidencia de identidad merchant,
entrega firmada, custodia generacional ni validación financiera.
Selector alojado `environment=sandbox`, `live_enabled=false`,
`kill_switch=true`, `active_generation=NULL`. No conceder beneficios.
Esta prueba se hizo en el código local del PO basado en el commit
`9c034c03`; el repositorio remoto F13 tiene commits posteriores.
El `origin/f13` mostrado por `git log` local es una referencia local que
solo se actualiza con fetch/pull, **no es lectura en tiempo real de GitHub**.

**Próximo trabajo técnico real:** identidad comercial PayPal original,
fuente y provisión segura de secretos generacionales (sin activar Live),
webhook firmado y conciliación, checkout/retornos, worker/ledger/entitlements
y gates de release/PO. El PR #46 es trabajo aislado de CORS del endpoint de
provisión **no publicado ni fusionado**; revisar QA antes de integrar. No
mezclarlo con la prueba de recursos ya cerrada. No despliegue público ni cargo
real sin autorización separada.


## Auditoría complementaria — 21-oct-2026 (continuación tras Codex)

La pantalla Live de PayPal Developer conectada confirma el webhook existente,
la URL generacional correcta y los diez eventos *visibles* previstos. El GET
API de la comprobación anterior devuelve `live_webhook_events_unexpected`;
no afirmar que el registro necesita borrarse ni que la UI garantiza el
contenido exacto de `event_types` API. Se corrigió el diagnóstico para
mostrar cantidades y nombres públicos filtrados, preservando rechazo seguro.

Código `01d937b`: 9/9 workflows SUCCESS
([CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39538281763)).
Supabase `pazo-admin-paypal-live-inspect` v3 ACTIVE/JWT obligatorio;
8/8 fuentes idénticas. Ningún cambio de esquema, Merchant, secretos,
checkout, webhook financiero ni PR/main/frontend desplegado.

Postflight SQL solo lectura: reserva1 reserved, merchant0, intentos secretos0,
resource audits0, inbox Live0, periodos pagos0. Ambos selectores Sandbox/Live
mantienen Live desactivado y kill switch ON. **NO-GO** aún: el PO debe repetir
comprobación privada una vez para obtener diagnóstico específico, sin publicar
credenciales. Restan verificación mercantil, custodia, entrega webhook firmada,
worker/ledger/entitlements, pruebas E2E, publicación de PWA y validaciones de
release descritas a continuación.


Fecha: 2026-10-20, America/Guatemala. **Dictamen: NO-GO. No es una beta terminada ni publicada.**

Último código: `9525ece11eb9e87f49b01a13d283de0958a28ec7`, CI9/9 SUCCESS y
comprobador administrativo HOSTED v2/JWT obligatorio, ocho fuentes verificadas.
El PO corrigió el ajuste de saldos automáticos en PayPal; lectura UI independiente
confirma desactivado y USD2.99 mensual. Se reparó el rechazo de cero decimal, sin
aceptar comisión positiva ni autoarrears desconocido. Después de corregir el
carácter inicial extra del ID, el PO comunica `live_webhook_events_unexpected`.
La ruta alojada confirma que plan, GET/ID/URL del webhook y los diez nombres
requeridos pasaron; sobra alguna entrada o hay repetición. Se solicitaron solo
los nombres seleccionados antes de cambiar el registro o repetir claves.
Postflight independiente tras este diagnóstico: 1 reserva generación1 reserved,
0 merchant/secret attempts/resource audits, sandbox/Live OFF/kill ON/generación
activa null. Configuración del webhook todavía rechazada. No nuevas migraciones
ni pruebas financieras.

Hito inicial del comprobador (histórico): generación 1 real reservada y única, lector de ventas original
instalado; ambos selectores Live OFF. PO aportó Webhook ID candidato, todavía sin
verificación API. Nuevo canal efímero de comprobación plan/webhook: 20 tests
dirigidos, PG17 y verify:prepreview PASS; bdf31649 CI9/9 SUCCESS. Migración real
20261021021050 y endpoint ACTIVEv1/JWTtrue instalados/verificados; ocho fuentes
coinciden, OPTIONS permitido204, origen ajeno403, sin JWT401. Falta la consulta
autenticada del PO con claves solo en el formulario privado. El resultado posterior
se detalla al inicio de este informe. No guarda claves
ni prueba identidad merchant, firma o entrega.
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
| pazo-admin-paypal-live-inspect | 2 | JWT/admin/MFA reciente; claves efímeras, configuración por comprobar |
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
