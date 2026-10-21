# PAZO — ACTIVE HANDOFF (canónico) | 2026-10-21 Guatemala

## F16 — Postflight de Codex/owner-slot y comprobación Vercel (21-oct-2026, última actualización)

- PR #60 squash `5fc001de698b99f80b68b24b7cc4ae0405192f69`: recuperación completa Codex y claim HTTPS original. GitHub CI 9/9 PASS.
- RPC protegidas del slot de checkout Codex **instaladas en Supabase** (historial versión `20261021181431`); PR #61 squash `efbf20d44740244370f844ac90158c62518d3f04` alinea migración GitHub y lab PG17 con esa versión; CI 9/9 PASS.
- Postflight real: `pazo_f16_live_service_provider_claim_with_origin` instalada, antiguo claim sin EXECUTE service, lectura owner solo service_role (anon/authenticated DENIED). Merchant generaciones 0, Live paid periods 0, checkout intents 0, selector `environment=sandbox/live_enabled=false/kill_switch=true/active_generation=null`. NO hubo cobros Live.
- **Vercel por fin inspeccionable con plugin**: buscar proyectos sin forzar parámetro `teamId`, luego `get_project({idOrName:'prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH'})`. Proyecto `pazo-app-t83r` Vite, dominios `pazo-app-t83r.vercel.app`, `pazo-app-t83r-digitalapp.vercel.app` y alias de git-main. Último deployment READY reportado `dpl_A1oJg62DpV54kEEN7itgQfQTHwhz` sobre SHA F13 **antiguo** `a218ab3cbc1ac01b7932da3ce5c3c87ee2c86770`, target preview (`null`), NO contiene el checkout actual de F13. `passwordProtection=false`, `ssoProtection.enabled=true`, `deploymentType=all_except_custom_domains`; no consta dominio personalizado en los dominios del proyecto. Antes de GO público verificar accesibilidad anónima real de HTTPS y PWA, seguridad de redirección PayPal, despliegue F13 actual, protección de acceso y que producción no se active sin PO GO.
- **Gates NO resueltos:** frontend compra Live completo en navegación/PWA, uso del RPC de recuperación y lease desde UI/callback, liberación segura de latches Edge checkout/webhook/worker y DB switch, conciliación de pagos con evidencia COMPLETED (sin permisos de saldos), prueba con credenciales reales en Admin y canary con autorización PO. **Nunca declarar BETA LISTA/LIVE PASS por 9/9 CI.**
- PR #55/56/58/59 NO FUSIONAR: integraciones superadas por PR60. `main` intacto.



## F16 — Codex recuperado e integrado / Checkout owner-slot privado (21-oct-2026, después del PR60)

- PO publicó desde `C:\Users\osori\Downloads\Nuevo pazo app\pazo-live-reconciler` el commit `e27d9fae` con trabajo local Codex recuperado. NO se perdieron fuentes. ZIP revisado. No ejecutar reset/clean en worktree local.
- El código Codex de oferta Live inmutable, consentimientos y checkout, recuperación owner-slot, lab PG17 y el adaptador de origen HTTPS `pazo_f16_live_service_provider_claim_with_origin` fueron **fusionados solo en F13** por [PR60](https://github.com/DigitalAppcorp/pazo-app/pull/60), squash `5fc001de698b99f80b68b24b7cc4ae0405192f69`. PR60 corrió CI **9/9 SUCCESS**, incluido laboratorio owner-slot y pruebas de privacidad; fixture sintético desechable actualizado para generación retirada, sin datos reales.
- Supabase proyecto `mrybvqdebbgcayuvgkkr`: SQL migración `pazo_f16_live_owner_checkout_slot` **APLICADA**, historial **20261021181431**; archivo GitHub renombrado a `supabase/migrations/20261021181431_pazo_f16_live_owner_checkout_slot.sql` para coincidir. `20261021165838_pazo_f16_live_immutable_bilingual_offer.sql` ya estaba instalada antes, NO volver a aplicar.
- Postflight SQL alojado PASS: `service_role` EXECUTE exclusivo de lectura owner, anon/authenticated sin permiso, claim antiguo sin EXECUTE, nuevo claim con origen instalado, 0 intents, 0 paid periods, 0 merchants, `environment=sandbox`, `live_enabled=false`, `kill_switch=true`, `active_generation=NULL`. **No hubo cargo Live.**
- PR55 (Codex), PR56 (anti-duplicado alternativo), PR58 (wiring de origen) y PR59 (rama divergente) están **superados / NO FUSIONAR**. PR60 es la integración canónica de esos cambios.
- Aún **NO BETA LISTA**: habilitación controlada checkout/webhook/worker, recuperación provider sin doble CREATE, cierre frontend Live y PWA/callback, pruebas económicas Live canary con credenciales en Admin y GO del PO, métricas y validación dominio/despliegue. Latches de código y BD siguen OFF. Seguir mandato obligatorio en `AGENTS.md` y `docs/CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md`.



## Recuperación Codex 21-oct — P1 en ejecución

Área aislada `pazo-live-reconciler`, rama `f16/live-signed-sale-reconciler-20261021`,
base F13 `4e434b2fb17e981491b13de96a86befdcf7c9fff`. WIP anterior preservado en
`f16/codex-merchant-identity-handoff-20261020`; lockfile original intacto.
Orden completa leída; no scope de saldos, nuevas claves ni pruebas Sandbox/recursos.
Auditoría alojada confirma reserva1, merchant0, inbox Live0, períodos0 y selector OFF.

PR #54 DRAFT hacia F13: entrada firmada, lectura bajo lease y corroboración GET
desde Vault de la generación original. Ahora añade venta con paginación completa,
origen OAuth/suscripción/transacción, período contractual observado, renovación
ordinaria correlacionada y escritura financiera/cierre de lease atómicos.
No se confunde el hash de Client ID con identidad del beneficiario.
Gates locales PASS: closure397/397, F16 sintético1193/1193, build y dist4/4.
PG17 verifica pago/refund, fallos entre escritura y ACK, recuperación y rollback.
Migraciones `20261021074014`, `20261021074024`, `20261021074032` APLICADAS tras
CI3501 (cuatro jobs) y gateway418 PASS del commit `2f1403f6`. Cinco RPC nuevas
service-only, RLS FORCE y revocación de bridges antiguos verificadas. Archivos
alineados con versiones MCP reales, SQL idéntico al revisado. Reserva1,
merchant0/inbox0/recibos0/períodos0 y selector sandbox/LiveOFF/killON.
Tercer bloque: lifecycle/refund durable, estados merchant monotónicos y lectura
original de venta/fecha para devoluciones tardías; PG14, closure406 y CI3502 /
gateway419 PASS. Migración `20261021142517` APLICADA tras CI de `75dfd4e6`,
dos RPC service-only y cuatro columnas verificadas, sin datos/cobros Live.
Cuarto bloque instalado: transporte HTTP privado, control OFF, admisión por
clave interna Vault, wrappers con backoff y salud. PG15/HTTP11/governance413,
CI3503/gateway420 PASS; DDL `20261021144809` APLICADA, cinco RPC nuevas
service-only y claim/finish antiguos revocados. Edge worker v1 ACTIVE con
autenticación propia: cuatro rechazos HTTP reales PASS; control/processing OFF.
Scheduler `20261021145500` APLICADO por SQL Editor, con historial registrado,
después de dos fallos MCP sin ejecución. Extensiones nativas y cron OFF PASS.
Postflight detectó grants PUBLIC de pg_net administrados por Supabase, no
revocables por postgres; no se emitieron headers. API expone public/graphql_public.
Corrección `20261021155429` APLICADA tras CI3505/gateway422 de `114756e1`:
token de una admisión/120s, sin bearer Vault permanente en cola. HTTP autenticado
real200 worker_idle, nonce consumido y batch cerrado. Cron automático repitió PASS.
Control enabled solo salud, processing false, LiveOFF y cero pagos/eventos.
Monitor de disputas `20261021162301` APLICADO tras CI3506/gateway423 de `739edcee`:
GET paginado de venta original,
casos mínimos, lease/batch exclusivo, full hold/resolución favorable/partial review,
transacción con ACK y protocolo worker v2. PG24 (incluido NULL) y governance423/423
PASS. Dos tablas FORCE RLS/service sin lectura directa, claim/finish service-only
y trigger privado verificados. Edge worker v2 ACTIVE,27/27 fuentes Git739 idénticas;
cuatro rechazos HTTP sin auth PASS. Cron automático16:27UTC200/healthy/buildv2,
nonce consumido y lote cerrado; procesamiento OFF/0 eventos/pagos/casos/monitores.
Faltan beneficios, checkout,
readiness y el resto P1–P5. Ver `PAZO_F16_SIGNED_SALE_RECONCILER_20261021.md`.
No declarar READY_FOR_LIVE_CREDENTIALS_AND_PO_CANARY ni beta lista todavía.

**CODEX — ORDEN ACTIVA F16/BETA:** Antes de implementar o declarar finalizado cualquier cambio de monetización o lanzamiento, leer y ejecutar integralmente `docs/CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md`. Esa orden concreta el mandato obligatorio del PO: terminar software, backend, QA y preparación antes de pedir claves Live en Administración; únicamente se reserva para el PO el ingreso privado de credenciales y autorización de la prueba/cobro real. No confundir CI PASS con beta lanzable ni posponer F16. 


## MANDATO EXPRESO DEL PRODUCT OWNER — BETA PAZO / PAYPAL LIVE (21 OCT 2026)
**PRIORIDAD MÁXIMA. VIGENTE. NO OPCIONAL. NO REINTERPRETAR.**

**Orden textual del Product Owner:** «termina todo lo que tengas que terminar para que yo solamente coloque las credenciales de paypal ya este funcionando, sigue mi orden, no quiero que te desvies, mi orden es que termines ya la beta para sacarla y que dejes todo terminado para que yo solamente guarde las credenciales en el apartado de administracion y ya pueda cobrar, esa es mi orden explicita y quiero que lo anotes en mi pazo de hithub como orden que se tiene que hacer. terminar lo que falta para que al terminar la beta que ya este todo listo para que yo solo tenga que colocar las credenciales para que todo este listo para cobrar y lanzar».

**Definición de terminado (DoD obligatoria y medible):**
1. La app beta pública (módulos sociales aprobados, panel administrativo responsive, registro/login, moderación, términos, PWA instalada/no instalada) queda compilada, probada, desplegable y validada en HTTPS oficial; no reabrir sin regresión lo ya aceptado por el PO.
2. Admin → Configuración → PayPal → Live permite a un administrador auténtico con MFA reciente introducir Client ID y Client Secret **dentro de PAZO una sola vez**, con guardado cifrado server-only, confirmación inequívoca y recuperación segura tras refresh. Se usa **el plan US$2.99 mensual, webhook y generación1 YA EXISTENTES**; no exigir permiso PayPal `reporting/balances/read`, pruebas Sandbox adicionales, creación de recursos duplicados, enlaces manuales ni pegar secretos en GitHub/chat/CLI.
3. Ese flujo privado valida OAuth Live, plan de US$2.99, webhook por generación y evidencia del comercio, vincula de forma auditable la generación original, coloca secretos en el backend y prepara los controles de release. Una simple coincidencia introducida por usuario no se debe confundir con evidencia independiente; los cobros solo se habilitan si todos los checks de transacción y seguridad están satisfechos.
4. Checkout real dentro de PAZO → consentimiento expreso versionado → creación PayPal con idempotencia → aprobación/retorno HTTPS en navegador y PWA → lectura de PayPal + webhook firmado → inbox durable → ventas/completados/renovaciones → períodos pagados reales → insignias Amigo de PAZO (1/3/6/12 meses) y demás beneficios sin falso grant, con proyección verificada.
5. Gestión autónoma de cancelaciones, errores/abandono de checkout, reintentos controlados, reembolsos, reversos, disputas, caducidad; conciliación y observabilidad/admin (usuarios, suscripciones, recaudación, abandonos, actividad, fake doors). Kill-switch y rollback probados.
6. QA end-to-end sintética y en HTTPS, base y RLS, trazabilidad y pruebas del gate financiero, seguridad, accesibilidad/móvil, callback PWA, firma de webhooks y humo real supervisado. Sin release silencioso de `main` ni cobro real no autorizado.

**Experiencia final prevista:** tras la entrega técnica completa, la única configuración rutinaria pendiente del PO debe ser ingresar las credenciales Live en Administración y aprobar personalmente la activación/prueba real que implique dinero. Ningún trámite técnico repetitivo, replanteo del producto o cambio de proveedor como sustituto. Cualquier obstáculo externo verdadero se documenta por nombre con alternativa concreta y mínima ayuda solicitada.

**Flujo de ejecución:** ejecutar sin pausas arbitrarias cambios de código, migraciones técnicas ya autorizadas, pruebas y preparación; usar F13/PR44 como integración y preservar `main` y cualquier dato real hasta GO del PO. Los controles de seguridad del cobro, verificación de pagos y permisos de terceros NO se omiten por urgencia; **nunca marcar «beta lista» ni «Live cobra» sin pruebas reales completas**. Si una dependencia requiere consentimiento/secretos o autorización externa, continuar el resto mientras se espera y preguntar únicamente la intervención imprescindible.

**PRECEDENCIA:** Este mandato reemplaza propuestas previas que aplazaban F16 a después de beta, exigían el scope PayPal de balances, sugerían links PayPal manuales o aceptaban beta incompleta. Se incorpora en handoff y hoja maestra para todo agente, incluyendo Codex.



## F16 — Auditoría de beta y bloqueo operativo real | 21-oct-2026 (actualizado)

**PO exige terminar beta con PayPal Live automático**; no se acepta enlace
manual PayPal ni activar solo la UI de cobro. Conservar lo probado en Sandbox
y la auditoría Live de plan/webhook (generación 1), sin volver a pedir scopes
`reporting/balances/read`.

**Código verificado 21-oct:** PR #50 a F13, commit `fb205063e223c5598a791dd4b2fb14f87a0673b3`,
GitHub Actions 9/9 SUCCESS, corrige `liveGenerationPinnedWebhook.mjs` para
aceptar exactamente ambas rutas de Supabase Edge (`/functions/v1/...` y
`/pazo-paypal-live-webhook`), sin ampliar rutas arbitrarias ni suprimir
firma, propiedad, generación, idempotencia o kill-switch. No deployed Live.

**Estado hosted SELECT-only:** bootstrap reservation=1,
merchant_generations=0, secret_provision_attempts=0, inbox Live=0, paid
periods Live=0; selector sandbox, live_enabled=false,
kill_switch=true, active_generation=NULL. Checkout Live, receptor webhook
Live y provisioner tienen hard latches OFF en sus index.ts; el botón de
pago real NO está certificado. La función admin de prueba de saldos ya no
es requisito de preparación.

**Bloqueo externo para release/PWA:** conector Vercel para equipo
`digitalapp` responde `403 forbidden` en get_project,
list_deployments y list_project_domains (proyecto `pazo-app-t83r`);
el PO debe reautorizar Vercel para ese equipo o usar CLI local con su
propio login. NO inferir que el dominio HTTPS público y callbacks estén
bien por el build/CI local. Tampoco mover a main, desplegar producción ni
autorizar cobros hasta aprobación final y E2E supervisado.

**Próximos hitos imprescindibles:** finalizar generación comercial
vinculada a un merchant administrativamente autenticado, provisionar
credenciales Live server-only con límites mínimos, conectar gateway
checkout/webhook/worker y cancelaciones/holds, demostrar venta COMPLETED
con período y reversión idempotentes, QA en HTTPS y PWA instalada,
security advisor (password leak protection OFF), visual PO, rollback y GO.
La verificación Merchant vía saldos es descartada; nunca fingir merchant
verificado sin fuente confiable ni dar beneficios al volver de PayPal.



## Corrección prioritaria: permitir cobros sin permiso de saldos — 21-oct-2026 (vigente)

**Decisión operativa PO:** prioridad que la membresía US$2.99 pueda recibir
pagos reales correctamente, sin nuevas pruebas innecesarias de identidad.
La llamada `reporting/balances` provocó
`live_merchant_read_permission_required`; **ese permiso NO es requisito
de PayPal para crear suscripciones, configurar webhook o consultar plan**.
No pedir al PO activar reporting/Transaction Search ni repetir el formulario.
La coincidencia Merchant ID vía saldos fue un gate artificial introducido
durante desarrollo. No usarla para bloquear integración financiera.

**Código ya integrado:** PR #49 (squash `5fb025b6`, 9/9 GitHub CI SUCCESS)
retiró el formulario `AdminPaypalLiveMerchantMatch` del flujo normal de
Admin→PayPal→Live, sustituyéndolo por un mensaje claro de preparación pendiente.
Tests de regresión en `adminPaypalLiveMerchantMatch.test.mjs`.
El lector histórico puede permanecer en repositorio como laboratorio privado,
pero NO forma parte del criterio de go-live ni debe ser invocado por usuario.
No hubo migración ni despliegue de frontend/Edge financiero en PR49.

**Estado real de cobros no se sobrestima:** plan y webhook generación1
comprobados y registrados; Live sin credenciales generacionales, sin generación
comercial persistente, webhook Live y checkout Live con latches de código OFF,
rutas de reconciliación/beneficios no activas. Antes de ofrecer pagos en PAZO
hay que cerrar almacenado seguro de secretos, originales de comerciante con
MFA y proveedor OAuth/plan ya verificados, ingreso de webhook firmado,
ventas completadas y cancelación/refund/entitlements, callback HTTPS y GO de
operación real. No es seguro habilitar solo un botón de PayPal.

**Alternativa inmediata de ingresos, separada de integración en PAZO:**
PayPal Business permite `Sales → Subscriptions → Create/Manage plan →
Generate Link` (PayPal ayuda oficial). Puede cobrar recurrencias mediante
enlace de PayPal sin servidor PAZO, pero **no asigna automáticamente membresía
ni beneficios en la app**. No publicarlo como Amigo de PAZO integrado sin
reconcilación explícita con el usuario. Si se usa como transición, informar
claramente el carácter manual. No inventar ni sintetizar URL de plan.

**Próxima implementación:** dejar de optimizar la consulta de saldos;
priorizar un recorrido administrativo de una única entrada de credenciales
con verificación de OAuth/plan/webhook desde Edge, custodia segura por generación,
ingestión firmada e idempotente, reconciliación y flujo de cobro/cancelación
end-to-end con pruebas negativas. Mantener main/checkout Live OFF hasta GO
expreso y prueba financiera supervisada.


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



## Continuidad Codex recuperada — 21-oct-2026 (vigente)

El PO publicó los dos archivos WIP de Codex desde `pazo-beta-rc` en
`f16/codex-merchant-identity-handoff-20261020` (respaldo preservado).
El clon local `PAZO-F13-preview` seguía en `9c034c03` con cambio
exclusivo en `package-lock.json`; no se alteró esa modificación.

**PR #47 integrado SOLO a F13 (squash `b28e455`), CI 9/9 PASS:**
lector server-only `liveMerchantIdentityReadOnly.mjs` obtenido de Codex,
que verifica OAuth/plan/webhook y consulta la API PayPal Live
`GET /v1/reporting/balances?currency_code=USD` con permiso
`reporting/balances/read`. Descarta respuesta de saldos, ID bruto y tokens;
deriva `SHA-256(paypal:live:<account_id>)`. Sin fingerprint comercial
original fijado por metadatos inmutables del servidor, solo devuelve candidato
`ok=false / merchantIdentityVerified=false`. El verificador conectado al
provisioner exige comparar huella original y rechaza mismatches antes de
cualquier escritura de secretos. El hosted entrypoint permanece OFF.

**PR #46 integrado SOLO a F13 (squash `1e2661f`), CI 9/9 PASS:**
`pazo-admin-paypal-provision/intake.mjs` admite rutas Edge interna/pública,
responde preflight CORS solo a Origin y método aprobados, rechaza prefijos,
sufijos, query y métodos indebidos; OPTIONS nunca llama al backend.
Se ajustó la release guard para exigir la liberación bloqueada.
Sin despliegue ni provisión de claves ni activación financiera.

**Postflight alojado solo lectura:** `merchant_generations=0`,
`secret_provision_attempts=0`, `release_evidence=0`,
`live_paid_periods=0`. `environment=sandbox`,
`live_enabled=false`, `kill_switch=true`, `active_generation=null`.
La generación 1 YA tiene registro real
`plan_read_verified=true/webhook_read_verified=true` (no repetir).
`validation_status=not_verified` es intencional hasta validar el comercio,
entrega de webhook y circuito financiero.

**SIGUIENTE gate real:** verificar por fuente independiente el ID del comercio
original autorizado y fijar su huella en generación 1 tras MFA reciente y
aprobación explícita PO; completar registro/secretos con scope mínimo, webhook
firmado, conciliación, checkout/retornos HTTPS, beneficios y rollback.
No inventar la huella ni confundir el candidato con identidad original.
Ningún GO de cobro/producción, ninguna migración alojada en estos dos PR,
`main` intacto y PR #44 todavía DRAFT.


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


## Checkpoint posterior a Codex — 21-oct-2026 UTC

**Trabajo ejecutado por ChatGPT tras agotarse créditos de Codex; F16 aún NO-GO.**
La rama `f13/section-titles-20261012` y el PR #44 permanecen abiertos; no se
fusionó ni desplegó frontend, no se modificó main ni se activaron cobros.
Código del cambio `01d937b218c75921bbae9d447fc369dcbc01207f`; 9/9 GitHub
Actions SUCCESS (CI `39538281763`, Live Gateway PG17 `39538281580`).

La pestaña PayPal Developer **Live** del PO muestra webhook existente
`6UA43660E66988355`, URL `...?generation=1` y precisamente diez eventos
visibles (las siete notificaciones BILLING.SUBSCRIPTION.* y tres
PAYMENT.SALE.* exigidas). Esto NO invalida el diagnóstico anterior
`live_webhook_events_unexpected`: el resultado del GET API tuvo conjunto o
longitud distinto de diez. No eliminar ni recrear webhook a ciegas.

Corrección disponible: `liveProviderReadOnly.mjs` conserva la comparación
estricta y ahora calcula **solo** cantidad recibida, extras, duplicados,
entradas malformadas y nombres adicionales en sintaxis permitida. La Edge
privada propaga exclusivamente esos datos inocuos; la pantalla administrativa
los muestra junto al código seguro. No guarda ni refleja credenciales.
Regresiones para extras, duplicados y comodín incluidas. **Supabase
`pazo-admin-paypal-live-inspect` v3 ACTIVE**, `verify_jwt=true`,
8/8 fuentes alojadas idénticas al commit de código. Sin migraciones nuevas.

Postflight alojado de solo lectura tras v3: 1 reserva, generation1 reserved,
0 merchant generations, 0 provision attempts, 0 resource audits,
0 Live inbox events, 0 paid periods. `paypal_gateway_runtime`: sandbox/
live_checkout_enabled=false; `pazo_paypal_new_checkout_switch`:
sandbox/live_enabled=false/kill_switch=true/active_generation=null/revision0.

**Acción manual mínima del PO:** actualizar su rama local F13 (no borrar su
`package-lock.json` preexistente), recargar localhost:5173, realizar MFA
reciente en Admin y repetir UNA comprobación `Comprobar sin guardar claves`
con Webhook ID y claves Live **solo dentro de PAZO**, nunca en chat. Compartir
solo el diagnóstico mostrado (ahora incluirá conteos/nombres adicionales
permitidos). No volver a reservar generación, no crear webhook nuevo ni
modificar eventos sin identificar contradicción API/UI. Si devuelve éxito,
continuar con identidad merchant, custodia, webhook firmado, worker,
conciliación y prueba E2E, con selectores financieros OFF hasta GO separado.


## Diagnóstico vigente — eventos del webhook Live

**Estado vigente:** comprobador `pazo-admin-paypal-live-inspect` ACTIVE **v2**, JWT
obligatorio, ocho fuentes idénticas a `9525ece11eb9e87f49b01a13d283de0958a28ec7`,
CI9/9 SUCCESS (CI39533646911/LiveGateway39533647024). HTTPS OPTIONS204/sinJWT401.
Además de cero decimal, exige `auto_bill_outstanding === false` explícito; el
esquema PayPal indica true por defecto y no se infiere false de un campo ausente.
23 pruebas dirigidas PASS. SQL sin cambios/reinstalaciones.

Tras corregir el ID a `6UA43660E66988355`, el PO informa ahora
`live_webhook_events_unexpected`. Según la ruta de la fuente alojada verificada,
el plan, GET del webhook, ID y URL ya pasaron; también están los diez nombres
requeridos. El conjunto o la longitud de la lista difiere de diez: existe alguna
entrada adicional o repetida. No inferir «All events» sin leer la selección real.
Se pidió copiar solo los nombres seleccionados del registro existente, sin
guardar cambios ni volver a introducir claves hasta aislar la diferencia.
Postflight independiente después de este diagnóstico: reserva1/generación1
reserved, 0 auditorías de recursos, 0 merchant Live, 0 intentos de secretos,
selector sandbox/Live OFF/kill ON/active_generation null. No hay configuración
del webhook aceptada ni metadata persistida; identidad y entrega siguen pendientes.

La consulta anterior devolvió `live_webhook_unverified`. El PO volvió a copiar
exclusivamente ID+URL: el ID inicial tenía una `u` minúscula adicional al principio,
y la URL coincide exactamente con generación 1. Solo corrigió el campo de PAZO;
no se modificó el webhook ni se creó otro. Las claves se descartan al enviar.

Primera comprobación real del PO devolvió `live_plan_terms_unverified`: se pasó
Auth/MFA/reserva/OAuth y se leyó plan ACTIVE, pero NO se validó webhook ni guardó
metadata. Postflight: reserva1, resourceaudits0, merchant0, secretattempts0 y OFF.
Lectura directa del plan en PayPal confirmó US$2.99/cada1mes/ilimitado/setup0 y sin
impuestos, con facturación automática de saldos pendientes ACTIVADA. PO la desmarcó
y guardó personalmente; readback independiente confirma DESACTIVADA, demás valores
conservados. Codex solo abrió el editor y leyó, no guardó cambios financieros.

El editor muestra comisión cero como `0.0`. Corregida comparación textual de cero:
acepta exclusivamente strings USD `0`, `0.0`, `0.00`, sin redondeo, manteniendo
rechazo de centavos/signos/exponentes/otra moneda y cobros automáticos de atrasos.
La regresión reproduce el fallo original; código y despliegue actuales se detallan
arriba. No crear otra reserva/plan/webhook ni debilitar controles para pasar el test.

## Hito inicial — comprobación privada instalada en v1 (histórico)

El PO entregó Webhook ID; conservado exactamente como candidato local de generación
1, **sin validación API todavía**. No crear webhook, plan o reserva otra vez.
Consulta actual: reserva 1 única reserved, merchant Live0, sandbox/Live OFF/kill ON.
HEAD anterior cd9d56cc9a05165bb8fa2f2c4f74dc528a679e64 confirmado 9/9 workflows SUCCESS;
PR44 OPEN/DRAFT y previews automáticas OFF.

Instalado `pazo-admin-paypal-live-inspect` ACTIVE v1/JWT obligatorio: GoTrue+admin+MFA reciente, claves
efímeras introducidas solo en Admin, GET de recursos y registro de metadata tras
verificar plan y URL/eventos exactos. No guarda/devuelve claves, finaliza merchant
ni activa cobros. 20 pruebas dirigidas PASS, PG17 roles/rollback PASS,
verify:prepreview PASS. Código bdf316495c08045b845b79d3b31f2c419c2f426e: CI9/9 SUCCESS
(CI39531396500/LiveGateway39531396475). Migración aplicada UNA vez con ID real
20261021021050, SQL SHA392f887b3f457a14f2cafa3fb27955fc38ca0d7492c9299d07cc3d0a526c7da7;
dos RPC service-only, ACL/owner/search_path verificados. Lectura alojada READ ONLY
con rol service_role confirma reserva1; 0 nuevos resource audits/secret attempts/
merchant Live. Ocho fuentes Edge idénticas al commit. HTTPS OPTIONSlocalhost204,
origen ajeno403, POST sin JWT401. Clon PO actualizado a bdf31649 preservando lockfile
previo y Vite sirve formulario HTTP200. Ajuste posterior de recarga silenciosa
preserva confirmación visible tras éxito; no cambia backend. Ver procedimiento.

Petición inicial al PO: recargar localhost5173, Admin→Configuración→PayPal→Live, TOTP reciente
solo dentro de PAZO, nueva sección Comprobar plan y webhook Live. Debe mostrar
generación1; introducir Webhook ID comunicado y claves de app Pazo Live solo en
el formulario privado, pulsar Comprobar sin guardar claves y devolver texto/código.
No reservar otra vez ni generar pagos/eventos. No pedir credenciales en chat.
La ejecución posterior y el diagnóstico vigente figuran al inicio de este documento.
Identidad merchant y firma/custodia/worker siguen pendientes.

## Último checkpoint — lector de ventas originales HOSTED PASS

InstaladoUNAvez `20261021014400_pazo_f16_live_recorded_sale_reader`, SQLSHA25643450d0d55b26dcd9e6336c4c7faf4579e4626d7f084afa189c5292050bdf817; archivo alineado al ID real sin cambiar bytes. Postflight: STABLE/SECURITYDEFINER/search_pathvacío, ACLexactopostgres+service_role; anon/authenticatedfalse, claimsJSON. LecturaalojadaREADONLYconroleDBservice_role yreferenciassintéticasausentes devolvióNULLsinfilas/beneficios. Reserva1 única intacta, generacionesLive0,selectorOFF. Código080b809943d1b11439d85405ebc722d8e888ab4a9/9CI SUCCESS (CI39528718580/LiveGateway39528718397), PG17roles/owner/generaciónPASS; cambio posterior soloalineaIDsydocumenta.

AÚNPENDIENTE: POestáregistrandowebhookPazoLive conURLgeneration1y10eventos; pasosnumerados yaentregados. EsperarWebhookID,nopedirsecretos. Worker/custodia/identidadmerchant/E2Efinanciero no completos. ScopedPATSupabaseenpublicalpha condesplieguegradual: noasumircapacidadcuenta niusarclassicPATatajo; orgfreeconfirmada. Auditoríacatálogo adicional:0tablaspublicexpuestassinRLS,0viewsaccesibles,0definerspublicqueusenuser_metadata,0funcionesrestantesconsoloGUCroleheredada. Advisorconpendientesconocidos; sinupgradegastos.
## Actualización vigente — generación1 real reservada y comprobada

check_readiness del PO confirmó configuración y logs alojados POST200 a01:31:25UTC. PO ejecutó después UNAreserva; lecturaDB confirma exactamente1fila,state=reserved,generation=1,planLiveesperado. URLreal `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook?generation=1`. GeneracionesmerchantLive0/secretattempts0; sandbox/LiveOFF/killON/genactivaNULL. **NOreservarotra vez ni repetirMFAalta.** Falta crearwebhook: Chrome no permite controlar pestaña; instrucciones exactas10eventos enviadas y PO pidió lista numerada, ya entregada. Esperar WebhookID sinsecretos. Lectorventasoriginales enpreparaciónconrolesJSON/propietario/generaciónPG17. Migraciones técnicas autorizadas globalmente. Bloques anteriores/posteriores conreservas0sonhistóricos.
## ESTADO VIGENTE: 503 corregido HOSTED; comprobación administrativa PO pendiente

La orden maestra directa del PO autoriza programación integral de beta por Codex. **El PO también autorizó todas las migraciones necesarias sin pedir GO individual.** Mantener auditoría, versionado, postflight y rollback. Esto no ejecuta una compra Live ni sustituye aceptación visual/publicación final. F13/PR44DRAFT, main intacto.

- CODE/CI: `ba9605637c035f873a0e5793937e04aa76e7a551`, 9/9 workflows SUCCESS; CI39527117678 y LiveGatewayPG17 39527117638. Local verify:prepreviewPASS (closure294/F16synthetic1193/build/dist). PG17 reproduce42501original, reparaJSONclaims y ensaya rollback. QAWindows CRLF/SQLLF/USERPROFILE aislado corregidos sin cambios de producto.
- CAUSA: logs00:34:32UTC Auth200/admin200/settings200/reserve403; las17RPC comprobaban GUC antigua en vez de `request.jwt.claims` JSON. Fuente SQL alojada exacta reproduce el defecto. No pedir configurar MFA otra vez.
- HOSTED: instaladaUNAvez `20261021012636_pazo_f16_live_service_json_claims_guard`, SHA256 `c523e2c044a4c1c04fcb2b864b079181b50f5672e0f42d9ed6d0907a9f5a794a`. Fichero alineado al ID real. Postflight17corregidas/17protegidas/0originales; reservas0/generacionesLive0/secretattempts0; sandbox/liveOFF/killON/genNULL/rev0. **NO reinstalar.** Bootstrapv6 intacto; provisionv2/checkoutv2/webhookv1 inertes según fuente leída.
- LOCAL: clonPO `C:\Users\osori\PAZO-F13-preview` actualizadoff a ba960563; package-lock modificado preexistente preservado byteidénticoSHA20992e0a6f4c6817f31bab124a9f613d0b6dee72eb4220736d541e0a4861e887 y respaldado. Checkout técnico `C:\Users\osori\Downloads\Nuevo pazo app\pazo-beta-rc`. Servidorlocalhost5173 previo sirve UI actual; duplicado127 de Codex cerrado.
- SIGUIENTEPO, ya solicitado: localhost5173, Ctrl+Shift+R, Admin→Configuración→PayPal→Live, TOTP reciente dentro de PAZO y SOLO **Comprobar configuración (sin reservar)**; devolver confirmación/código saneado. No pulsar reserva antes de evaluar respuesta, no compartir TOTP/QR/tokens. Reserva real única desde cuentaPO sigue pendiente.
- TRABAJO INDEPENDIENTE: lector service-only de ventas originales para refunds, corregir JSON del draft antes de instalar. Merchant/webhook/custodia/worker/checkout/beneficiosLive incompletos; betaNO-GO.
- VERCEL: CLIautenticado verifica previewDeploymentsDisabled=true/producciónmain. HTTPSanónimo `/`200appShell, pero `/paypal/return`, `/paypal/cancel`, `/manifest.webmanifest`, `/sw.js`404. Buildlocal correcto no equivale a publicación actual. No deploy web.
- SEGURIDAD: Advisor40INFO/4anonWARN/38authWARN/contraseñasfiltradasOFF. Cuatrodefinersanónimas revisadas exponen booleano/beneficiospúblicos/muroopt-in; revisión completa abierta. Drift histórico: auditoríasecretos alojada20261020200238, archivo/docs20261020200800; reconciliar nombre, NOreinstalar.

Matriz/gates: `docs/PAZO_BETA_RELEASE_CANDIDATE_REPORT.md`. **No declarar RC final ni cierreF16.** Los bloques siguientes son historia; este checkpoint y catálogo actual prevalecen.

## Historial anterior al diagnóstico corregido

## F16 — SEGUNDO FALLO 503 / DIAGNOSTICO READ-ONLY (21-oct-2026)
- PO intentó reservar generación comercial nuevamente. Supabase function_edge_logs `2026-10-21T00:34:31.685` OPTIONS 204 y `00:34:32.928` POST **503**; SQL postflight 0 reservations, 0 merchant generations, LIVE OFF, kill_switch ON. Problema CORS solucionado, segundo bloqueo backend interno.
- Supabase Edge función `pazo-admin-paypal-bootstrap` v4 `function_logs` confirmó `PAZO_F16_BOOTSTRAP_INIT:DEPENDENCIES_READY`: las variables/configuración necesarias para crear factories estaban presentes; NO confundir con éxito de lectura RPC o inserción SQL. Puede fallar en `readAdminSettings` o `reserveGeneration`, o un error previo marcado 503.
- Instrumentación sanitizada: `liveMerchantBootstrapControl.mjs` logs solo una de tres etiquetas 503 (`bootstrap_backend_unavailable`, `live_configuration_unavailable`, `generation_outcome_needs_review`). Componente `AdminPaypalMerchantBootstrap.tsx` muestra solo códigos permitidos del JSON, nunca secretos; no reintenta automáticamente.
- Incorporado `check_readiness` con confirmación `VERIFICAR CONFIGURACION LIVE`, *solo lectura*, exige admin y MFA reciente igual a reserva, verifica borrador y retorna `live_configuration_readonly_verified` con `generationReserved=false`, `mayCharge=false`; jamás llama RPC de reserva ni PayPal. UI muestra nuevo botón **Comprobar configuración (sin reservar)**; botón de reserva exige `readiness==='verified'`. Tests incluyen bloqueo por MFA, garantía 0 writes y error-code allowlist. Commit `389f3f13e7f443d2ea7be12344a16e22ef2318a7` 9/9 Actions PASS.
- **HOSTED** `pazo-admin-paypal-bootstrap` versión **6**, `verify_jwt=true`, digest `4b1dc8c6bf1a7781391ab82121b9e47de200cde6063c37e04367329e89f7dbe1`. Se comparó código alojado y contiene `check_readiness`. Postflight Supabase: 0 reservadas, 0 generaciones Live, 0 secret attempts, switch Live OFF, kill ON.
- NEXT OWNER MANUAL: NO presionar Reservar generación Live. Primero actualizar clon Vite limpio rama `f13/section-titles-20261012` con git pull --ff-only, recargar app, ir Admin → PayPal Live, TOTP reciente, pulsar **únicamente Comprobar configuración (sin reservar)**. Devolver solo el texto/`Diagnóstico:` o confirmación. El paso no crea generación. Con resultado se determina si problema en lectura JWT/RPC o función SQL; después corregir/autorizar según causa. No pedir QR/JWT/clave/código TOTP en chat. No activar pagos ni webinar/live checkout.


## F16 — BOOTSTRAP PREFLIGHT CORS 204 / NEXT OWNER GATE (21-oct-2026)
- Owner clicked Reservar generación Live ONCE; UI showed `No se pudo confirmar la respuesta`. Critical READ-ONLY SQL verified **0 reservations**, **0 Live merchant generations**, `live_enabled=false`, `kill_switch=true`. Supabase function_edge_logs at 2026-10-21 00:22:53 UTC showed OPTIONS 400 at bootstrap; no POST event in selected logs. No payment or mutation occurred.
- Root cause likely handler's `request.url===TARGET` exact full-URL comparison rejected Supabase Edge routed/internal Request URL in preflight, resulting in OPTIONS 400. Updated `liveMerchantBootstrapControl.mjs` to accept only explicit endpoint pathnames (both /functions/v1/pazo-admin-paypal-bootstrap and /pazo-admin-paypal-bootstrap), still require explicit Origin allowlist and POST preflight; JWT gateway stays ON and server still checks GoTrue admin + fresh TOTP. Added tests for routed URL, malicious path, Origin and unauthorized POST; GH commit d585ba97ced6f6e51c3927a1599c5d816473cc5f = 8/8 PASS.
- Deployed `pazo-admin-paypal-bootstrap` Supabase **ACTIVE v3**, `verify_jwt=true`, digest `1dcd389ebc40729bbbd157614eef3db65bd249290e61437fa8f472dfe519a0b9`. Production source verified after deployment.
- External GitHub Actions workflow `.github/workflows/f16-bootstrap-cors-smoke.yml` on PR executed actual public HTTPS OPTIONS unauthenticated with Origin http://localhost:5173 and requested POST/authorization headers, no credentials or reservation. **PASS** run 39521732235, status 204 and allow-origin/allow-headers correct. Source commit 5ec5817d29aa0b1be0f300f11f32fdc39c90591b. Subsequent repo CI still pending at time note written.
- Stored Live merchant draft read-only exact: P-9BR88240215654528NLL3I4I, USD 299 cents, MONTH, return_origin https://pazo-app-t83r.vercel.app, webhook_id blank. Reservation still NOT DONE. Before asking another owner test, confirm CI; then owner may use existing local Vite without a git pull, refresh Live panel, new TOTP, click reserve ONCE. If error, read SQL reservations/logs BEFORE any retry. Keep Live OFF; no webhook, credentials, worker or beta GO.


## F16 — MFA REDIRECT BUG FIX / OWNER RETEST REQUIRED (20-oct-2026)
- PO reportó: tras verificar código TOTP en Administración → PayPal Live, app regresa a Mi mascota y desmonta dashboard. No repetir pruebas hasta actualizar.
- Root cause App.tsx: el useEffect de initApp dependía del objeto user completo. Supabase challengeAndVerify refresca objeto User/JWT en AuthContext; se reiniciaba petBootstrap=loading y desaparecía PetView/ModerationAccess/AdminDashboard. Se sustituyó dependencia [user, loading, petBootstrapRetry] por [user?.id, loading, petBootstrapRetry]. Identidad nueva y retry todavía recomputan, cambios en sesión de la misma cuenta no. Commit 8ae998eaa253bc395bf0c2d9e6ab5529a536136f.
- Prueba de regresión src/features/admin/testing/adminPaypalLiveMfaUi.test.mjs agregada en 5385e904ae793c1fe6b8c0fde0f30f40cb73b99f; esperar 8/8 CI PASS antes de declarar completada. Verificación UX real pendiente.
- Siguiente acción PO: comprobar rama F13 y árbol limpio, git pull --ff-only origin f13/section-titles-20261012, Vite, Ctrl+Shift+R. Una verificación TOTP en Admin PayPal Live; la página debe quedar allí y permitir reservar generación UNA sola vez. No enviar QR/códigos MFA.
- Bootstrap hosted permanece activo pero sin reservas (última lectura), PayPal Live OFF, kill switch ON; webhook y worker faltan.


## F16 — GO PO: GENERATION RESERVE OPERATIVE, WAITING FOR ADMIN (20-oct-2026)
- User authorized **enable generation reserve only and create first actual generation via their own administrator session**. Code updated in branch `f13/section-titles-20261012`: `supabase/functions/pazo-admin-paypal-bootstrap/index.ts` `RELEASE_APPROVED=true`, imports verified GoTrue admin+same-JWT `pazo_is_admin`, fresh TOTP proof, signed-JWT admin draft reader, service_role bootstrap RPC. The merchant bootstrap control refuses malformed body, wrong settings/plan and unsigned/out-of-window TOTP. Only returns DB-assigned generation & exact `?generation=N`; no PayPal provider call, credentials, subscription, entitlements or checkout writes. UI `AdminPayPalSettings.tsx` `LIVE_MERCHANT_BOOTSTRAP_RELEASED=true`, button rendered following fresh TOTP (4-min UI expiry). Existing `LIVE_EDGE_PROVISIONING_RELEASED=false` and `LIVE_RESOURCE_INSPECTION_RELEASED=false` UNCHANGED.
- **HOSTED** Supabase project `mrybvqdebbgcayuvgkkr` function `pazo-admin-paypal-bootstrap` **ACTIVE v2, verify_jwt=true**, 8 source graph files deployed from GitHub, digest `8b7b1d6c901e141248828a22d124c2e125394f3a6bce2b038b9fe2763a74a7db`. `get_edge_function` confirmed source entrypoint `RELEASE_APPROVED=true` and all eight deployed modules. Code commit `8ad5b6554c9c2488e2b669f3d1ee7e24d6a13160` **8/8 GitHub Actions SUCCESS**. Other functions: `pazo-admin-paypal-provision` v2 remains INERT; `pazo-paypal-live-checkout` v2 LIVE OFF; `pazo-paypal-live-webhook` v1 LIVE OFF.
- **Postflight database read-only:** `0` reserved generations, `0` merchant generations, `0` secret attempts, `0` Live inbox events; selector `environment=sandbox`, `live_enabled=false`, `kill_switch=true`, `active_generation=NULL`, `revision=0`. No financial/PayPal merchant mutations performed. PR #44 still DRAFT, main and public beta not updated. No authenticated HTTP request yet run through new endpoint; requires owner's user session.
- **IMMEDIATE NEXT:** PO updates local clone `C:\Users\osori\PAZO-F13-preview` (check clean working tree, branch, `git pull --ff-only origin f13/section-titles-20261012`), runs Vite, logs into administrator, Administration → Settings → PayPal → Live, completes fresh six-digit TOTP in PAZO, presses **Reservar generación Live** ONCE. No sharing QR, TOTP or secrets. If UI reports uncertain, do NOT click again: check private reservation SQL by admin actor and recover same generation. After reservation assistant checks SQL exactly once and gives PO exact PayPal webhook registration steps with source URL; never invent N. Follow-up provider webhook/credentials and worker still NOT done. Beta NO-GO.


## F16 — Preparación siguiente GO comercial (20-oct-2026)
- El usuario pidió completar beta F16 antes de lanzar y autorizó instalar SOLO migración idempotente y endpoint en modo INERTE. Ambos ejecutados; ver bloque hosted. En rama F13 se agregó adicionalmente CÓDIGO NO HOSTED: `liveMerchantBootstrapControl.mjs` con CORS allowlist a localhost y dominio temporal, PR #44. Pantalla `AdminPaypalMerchantBootstrap.tsx` reutiliza MFA verificado, reserva generación solo después de un GO explícito futuro y muestra URL fija `?generation=N` sin pagos; la bandera `LIVE_MERCHANT_BOOTSTRAP_RELEASED=false` en `AdminPayPalSettings.tsx` mantiene el botón oculto. No falsear despliegue: `pazo-admin-paypal-bootstrap` hospedado v1 sigue `RELEASE_APPROVED=false`.
- QA detectó test preexistente de borrado de secretos al conmutar Sandbox/Live; se conservó el contrato estricto `setEnv(value);setClientId('');setClientSecret('')` y se agregó borrado de MFA fresco + caducidad visual a los 4 minutos. Bloqueo corregido en commit `45feb0073eb2ad3c8e1f6827a37752a92f1fa415`. CI de última modificación: consultar GitHub Actions antes de declarar PASS. SQL de reserva validado PG17 8/8 antes.
- **Siguiente GO PO no incluido en autorización previa:** alojar una edición funcional con JWT/admin+TOTP reciente habilitando EXCLUSIVAMENTE reserva de una generación real no monetaria y exponer botón una vez; después el PO tendrá que registrar su webhook en PayPal Developer Live con URL exacta. No crear plan repetido ni pagos. No usar secrets en chat ni suponer merchant identity sólo por OAuth. La beta permanece NO-GO hasta webhooks firmados, worker, beneficios y QA end-to-end.


## F16 — GO PO cumplido: retry SQL + Edge bootstrap inerte HOSTED (20-oct-2026)
- Usuario autorizó explícitamente instalar corrección idempotente y desplegar endpoint administrativo nuevo **solo inerte**. Instalado en Supabase `mrybvqdebbgcayuvgkkr`: migración `20261020234721_pazo_f16_live_bootstrap_idempotent_retry_guarded` SUCCESS, bajo `public.pazo_f16_live_service_bootstrap_reserve(uuid,text)`, ACL `anon=false,authenticated=false,service_role=true`, retorno del mismo `generation` para misma reserva/admin. Archivo GitHub versionado `supabase/migrations/20261020234721_pazo_f16_live_bootstrap_idempotent_retry_guarded.sql`. Ya NO volver a aplicar borrador de retry.
- Edge `pazo-admin-paypal-bootstrap` **ACTIVE v1, verify_jwt=true**, hosted SHA256 `ec4db5b4463ffd19401f0358ca0cc1ca061e31be0894124030ea229e0d49f79f`. Código exacto desplegado `index.ts` es shell standalone sin imports de secretos: `RELEASE_APPROVED=false`, responde 503 sin crear generaciones ni llamar PayPal. No confundir ACTIVE con función de negocio habilitada.
- Postflight Supabase: `reservations=0, generations=0, secret_attempts=0, live_inbox=0`; selector `sandbox/live_enabled=false/kill_switch=true/active_generation=NULL/revision=0`. `main` y beta intactos, PR #44 DRAFT.
- **LO QUE FALTA:** liberar de manera controlada flujo `createPazoLiveMerchantBootstrapControl` con usuario JWT + admin RPC + TOTP reciente, reservar primera generación real (GO acotado), validar aplicación y recursos de PayPal Live desde canal privado, registrar webhook con `?generation=N` (evento/firma), instalar worker financiero y probar conciliación, entitlements, refunds, cancelación, retornos PWA y seguridad de beta. No permitir que OAuth de app sea sustituto de merchant identity. No recopilar secrets, PAT ni QR en chat. Para operaciones del comercio o cobros pedir GO específico.


## F16 — Generación comercial backend CODE/CI + retry staging (20-oct-2026)
- **8/8 GitHub Actions SUCCESS** en commit `7d2482a9e3ab8dcd9bed39a8ef81817563866668`. PR #44 DRAFT en `f13/section-titles-20261012`. No main/Preview/Live cobrando.
- Código staged **NO desplegado**: `supabase/functions/pazo-admin-paypal-provision/liveMerchantBootstrapControl.mjs` (autenticación admin + MFA reciente, plan Live leído del draft; no acepta plan/secret en request, no concede cobros); `liveAdminDraftReader.mjs` usa misma sesión JWT, filtra credenciales; `supabase/functions/pazo-admin-paypal-bootstrap/index.ts` sigue `RELEASE_APPROVED=false`. Pruebas nuevas `adminPaypalLiveBootstrapControl.test.mjs` incluidas en CI.
- Nuevo borrador SQL **NO instalado** `supabase/drafts/f16_live_bootstrap_idempotent_retry_REVIEW_REQUIRED.sql`: `CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_bootstrap_reserve` devuelve la MISMA reserva sin consumir otro número tras pérdida de respuesta, solo al mismo admin y antes de finalizar. Laboratorio desechable PG17 confirma no duplicado ni replay por actor no autorizado.
- Hosted todavía: 0 merchant generations, 0 reservas, 0 secret writes, Live OFF y kill switch ON. MFA TOTP admin verificado. **No confundir CODE/CI con funcionamiento HOSTED.** Próximo gate requiere autorización PO para revisión y aplicación de migración idempotente, y autorización separada de liberar transacción de RESERVA de generación / crear webhook Live. No pedir secretos en chat. PayPal OAuth de client_credentials prueba app, NO identidad/payer merchant ni entrega de webhook.

## F16 MFA ADMIN — VERIFICADO HOSTED (20-oct-2026)
- PO completó el vínculo Google Authenticator desde PAZO Vite local. SQL de Supabase/Auth confirma **1 factor TOTP `verified`** y ningún registro `unverified` en cuenta administradora; los logs de GoTrue confirman POST de `challenge` y `verify` con status 200. No volver a pedir QR ni alta TOTP. La UI ahora muestra campo para nuevos códigos, **normal para step-up posterior**, no significa fallo.
- El enrolamiento verificado es solo el factor de identidad; **cada cambio de secretos Live debe exigir prueba TOTP reciente y autorización de administrador en servidor**. No afirmar que se haya aprovisionado un comercio o webhook por MFA; Live sigue OFF. El PR #44 continúa DRAFT, sin merge ni beta publicada.
- Se corrigió el diagnóstico del QR en la rama F13 y quedó documentado; no repetir ciclos de intento al mismo error. Siguiente fase: identidad PayPal Live, configuración de generación comercial, secretos privados y webhook firmado mediante gates separados.

## F16 — Diagnóstico y reparación TOTP MFA (20-oct-2026)
- El intento real del PO al pulsar «Configurar autenticador» devolvió error de UI. Auth logs alojados confirman `POST /factors` **200** con evento `factor_in_progress`; SQL agregado para la cuenta administradora mostró `1` factor TOTP `unverified`, `0` verified. Por lo tanto NO repetir alta a ciegas.
- El componente `AdminPaypalMfaStepUp.tsx` rechazaba un formato Supabase válido `data:image/svg+xml;utf-8,...`. Corregido en rama F13 commit `6a142f5`; añadido reconocimiento de `data.all` para factor `unverified` y botón de recuperación con comprobación exacta antes de `mfa.unenroll` **solo del factor pendiente**. Pruebas ampliadas en commit `6e48a3dc45c0d4e0d4c7f847a3fe97823fc442e5` y **8/8 CI PASS**.
- Acción PO: en clon `C:\Users\osori\PAZO-F13-preview`, verificar `git status --short` limpio y rama correcta, ejecutar `git pull --ff-only origin f13/section-titles-20261012`, recargar Vite. En Admin → Configuración → PayPal → Live pulsar «Reiniciar registro pendiente» y luego «Configurar autenticador», escanear QR y verificar código EN PAZO, jamás en chat. Después comprobar `auth.mfa_factors` solo por conteos. Live sigue OFF y el admin Edge está INERTE.

## F16 — MFA TOTP para administrador (20-oct-2026)
- PO confirmó disponer de Google Authenticator. En rama F13, commit `43f8a3106e929316e8e154c9acdb27654cf6da92`: `AdminPayPalSettings.tsx` ahora monta `AdminPaypalMfaStepUp` en pestaña Live SIN exigir `LIVE_EDGE_PROVISIONING_RELEASED`. Esta bandera SIGUE FALSE y el endpoint alojado `pazo-admin-paypal-provision` v2 SIGUE INERTE (`RELEASE_APPROVED=false`, JWT true). Prueba `adminPaypalLiveMfaUi.test.mjs` actualizada.
- Estado previo Supabase: un administrador, cero factores TOTP verificados. Cambio de UI SOLO en GitHub; requiere que PO actualice clon Vite local y escanee QR desde su teléfono, sin pegar QR ni códigos en chat. Verificar posteriormente factor TOTP real mediante consulta agregada a `auth.mfa_factors` y exigir paso TOTP reciente para cualquier provisioning.
- NO desplegar Preview/publicación ni activar PayPal Live por mero enrolamiento MFA. Más adelante completar backend de merchant identity, secretos de gestión con alcance mínimo y worker financiero con GO apropiado.


## F16 — ADMIN EDGE HOSTED INERTE — 20 OCT 2026
- Función `pazo-admin-paypal-provision` ACTIVE v2, JWT obligatorio, RELEASE_APPROVED=false. Sin operaciones financieras. Ver `docs/PAZO_F16_ADMIN_EDGE_INERT_HOSTED_20261020.md`.

## F16 — SQL HOSTED INSTALADO CON GO PO — 20 OCT 2026
- Supabase proyecto `mrybvqdebbgcayuvgkkr`: usuario aprobó expresamente instalar **dos migraciones** sin activar Live. Aplicadas mediante Supabase con `success:true`. Versiones **`20261020214807_pazo_f16_live_bootstrap_generation_guarded`** y **`20261020214838_pazo_f16_live_durable_inbox_lease_guarded`**; ficheros versionados renombrados en GitHub a esos IDs.
- Postflight HOSTED: tablas y RPCs presentes; tabla reserva y originales FORCE RLS; anon/auth no EXECUTE bootstrap ni inbox claim/finish; service_role sí; `0` reservas, `0` merchant generations, `0` intentos secretos y `0` inbox. Switch `environment=sandbox,live_enabled=false,kill_switch=true,active_generation=null,revision=0`.
- **No asumir que 4 bloqueos están terminados**: no existe generación comercial creada, no hay credenciales conectadas, no hay webhook Live registrado y su entrega/firma sin probar; worker financiero no alojado. Queda por implementar auténtico MFA/admin control plane, provider identity binding y worker e2e, y obtener GO acotado para operaciones de comercio/secretos/despliegue. No reiniciar las dos migraciones.
- Supabase Security Advisor después de DDL muestra `rls_enabled_no_policy` info 40 (tablas privadas intencionalmente inaccesibles requieren revisión contextual), `anon_security_definer_function_executable` WARN 4, `authenticated_security_definer_function_executable` WARN 38 y leaked password protection WARN 1. No declarar resueltos los WARN preexistentes. Referencia: https://supabase.com/docs/guides/database/database-linter

## Actualizacion F16 20-oct-2026 — 4 bloqueos, sin despliegues financieros
- CI verificable: commit [`7b1420bf50b529b310c8feadcc4de605fefbfce0`](https://github.com/DigitalAppcorp/pazo-app/commit/7b1420bf50b529b310c8feadcc4de605fefbfce0), **8/8 workflows SUCCESS**, incluido PostgreSQL 17 desechable probando SQL REAL, bloqueo anon/auth, secuencia original, idempotencia, bloqueo de doble finalize, lease y reintento de webhook. PR #44 sigue DRAFT, main y beta intactos.
- Código nuevo: `liveBootstrapSqlStore.mjs`, `liveInboxLease.mjs`, `liveWebhookEventEvidence.mjs` más 3 pruebas Node. Dos archivos SQL en `supabase/drafts/f16_live_bootstrap_generation_REVIEW_REQUIRED.sql` y `supabase/drafts/f16_live_durable_inbox_lease_REVIEW_REQUIRED.sql`; integrados en `scripts/f16-live-bootstrap-lease-disposable-lab.sql`. **No son HOSTED**. Creación de generación, provisioning, webhook entregado y worker financiero real siguen **NO-GO**.
- PO verificó con navegador en incógnito acceso sin SSO al host provisional. En PayPal plan Live Amigo de PAZO `P-9BR88240215654528NLL3I4I` sigue ACTIVADO a $2.99/mes; PayPal autenticado mostró `Pagos pendientes de recibo automático: Desactivado` tras cambio PO. Recurso todavía no validado con GET API server.
- **Siguiente gate condicionado (sin asumir GO implícito):** pedir autorización acotada para **versionar/instalar solamente** dos migraciones de bootstrap/lease en Supabase, revisar diff RLS/ACL y postflight. No toca 0 merchant generations ni pone live_enabled=true, ni cambia kill_switch, secretos, cobros o beneficios. Solo después preparar canal privado MFA, evidencia de comercio vía API Live, reserva real generacional, registro de webhook firmado y worker reconciliador. Requiere otra autorización acotada para cualquier operación comercial o primer pago Live.
- Instrucciones de no repetir: no volver a crear el plan, a cambiar cobro automático, a reinstalar auditoria SQL anterior, a importar insignias ni a reejecutar Sandbox E2E aprobado.

**LEER PRIMERO EN EL SIGUIENTE CHAT.** Documento operativo actual; reemplaza las 60 KB de checkpoints cronológicos anteriores. Historial íntegro recuperable en Git a partir del commit **`1cfcf2be387978b9eb1338de5bc4424ae39dd419`** y en `docs/archive/`. El servidor alojado y el HEAD remoto comprobados prevalecen sobre este resumen si algo cambia. No reanudar tareas desde una captura de chat truncada.

## Inicio / responsabilidades
- Producto: **PAZO**, PWA social para mascotas, 18+, Los Ángeles. App/QR gratis; **Amigo de PAZO** contribución voluntaria **US$2.99/mes**, con cuatro niveles visuales 1/3/6/12 meses. Product Owner = usuario; ChatGPT = ejecutor técnico principal. Español; respuesta precisa y ahorro de tokens. No pasar ejecución a Codex/Gemini salvo nueva petición explícita.
- Brain OS canónico separado: `DigitalAppcorp/project-brain-os` v1.4.1: leer `SKILL.md` y `patterns/VERIFIABLE_HANDOFF.md`. Leer PAZO `AGENTS.md`, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_F16_ADMIN_EDGE_PROVISIONING_GATE_20261020.md`, `docs/PAZO_F16_BETA_RC_CRITICAL_PATH_20261020.md` y `docs/PAZO_MVP_TO_LIVE_EXECUTION_ROUTE_20261019.md`.
- Repositorio `DigitalAppcorp/pazo-app`; trabajo SOLO en `f13/section-titles-20261012`, PR **#44 DRAFT**, base `release/mvp-beta-fast-track-20261010`; `main` no fusionado. HEAD remoto al iniciar esta recuperación: **`1cfcf2be387978b9eb1338de5bc4424ae39dd419`**, **8/8 Actions SUCCESS** (CI + 7 laboratorios PostgreSQL). `main=ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`; base `f5f47b8ef10b38d89b4c4abb97320b24df0840a9`. Tras actualizar handoff/otras docs volver a consultar CI del **nuevo** HEAD.
- Ruta Vite local reportada por PO: `C:\Users\osori\PAZO-F13-preview`. El estado local no se puede verificar remotamente; antes de pedir pull comprobar `git status --short`. **No nuevos previews Vercel**, ni merge/main, ni beta pública hasta GO de publicación.

## Decisiones permanentes del Product Owner (no volver a preguntar)
- **La beta NO se publica hasta tener toda la integración PayPal Sandbox/Live implementada, alojada y probada**, con Administración → Configuración → PayPal → **Guardar y activar** sin programar ni editar secretos/env/SQL después. El PO podrá activar dinero Live **antes o después de publicar la beta**, sujeto a HTTPS público, merchant validado y GO operativo separado. Sandbox ya se probó (compra, cancelación, callbacks) y fue aprobado: no repetir pruebas manuales innecesarias.
- **Live no se activa automáticamente** por haber creado app/plan, aprobado código, guardado draft o instalado migración. Checkout/entitlements solo tras venta liquidada y período contractualmente verificado; no por redirección ni estado `ACTIVE`. Mantener generaciones originales de merchant, historial Sandbox y cobros anteriores.
- PAZO/UI: **CERO CONTORNOS** salvo inputs concretos justificados; verde `#204E4A`, lima `#E1E53F`, marfil `#FAF8F5`. Preservar diseños aprobados (Mapa Opción 3, barra inferior, insignias, etc.). QA visual del panel responsive y membresías todavía requiere aceptación PO; CI no equivale a fidelidad visual.
- Dominio temporal **`https://pazo-app-t83r.vercel.app` aprobado y YA guardado en Admin**; no pedir de nuevo. El cambio futuro a dominio propio debe hacerse desde el panel sin reprogramar. Vercel proyecto `prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`: **decisión PO 2026-10-20** opción B temporal; desactivó `Require Log In` y comprobó acceso sin sesión Vercel en incógnito a `https://pazo-app-t83r.vercel.app`. La lectura del tab Vercel mostró checkbox desmarcado. **No equivale a certificar SHA nuevo, callback PayPal, PWA instalada, ni acceso administrativo del conector (Vercel API aún devuelve 403 por scope)**. Antes de beta revisar previews expuestos; al usar dominio custom restaurar `Standard Protection` para proteger previews.
- Nunca pedir Client Secret, PAT, JWT ni QR de MFA por chat/GitHub; secretos solo en un canal de entrada privado/autenticado, cuando esté verificado. No aumentar gastos ni recursos facturables sin autorización.

## Estado REAL alojado (consultado 20-oct-2026, solo lectura)
- Supabase `mrybvqdebbgcayuvgkkr`: selector financiero `environment=sandbox`, `live_enabled=false`, `kill_switch=true`, `active_generation=NULL`, `revision=0`. **0 generaciones de merchant Live**. Datos históricos de Sandbox preservados; no mutarlos.
- Borrador de Administración PayPal Live: `plan_id=P-9BR88240215654528NLL3I4I`, `return_origin=https://pazo-app-t83r.vercel.app`, `webhook_id=''`, `validation_status=not_verified`. La página PayPal autenticada del PO mostró plan **Amigo de PAZO** `Activado`, $2.99/mes, ciclos ilimitados, sin impuestos y **`Pagos pendientes de recibo automático: Activado`**. El preflight `liveProviderReadOnly.mjs` exige `auto_bill_outstanding!==true`; **mismatch operativo**: el plan debe quedar en `false` mediante actualización PayPal autorizada y luego pasar GET autenticado. No crear duplicados ni inventar generación; identidad merchant aún sin API proof.
- **AUDITORÍA SQL F16 INSTALADA, NO REINSTALAR:** migración canónica `supabase/migrations/20261020200800_pazo_f16_secret_provision_audit_guarded.sql`, instalada tras autorización previa del PO. Tabla `admin_private.pazo_paypal_secret_provision_attempts` **existe, 0 filas**, FORCE RLS, tabla inaccesible directamente por roles de cliente. RPCs `public.pazo_f16_live_service_provision_{generation_read,reserve,finish}`: EXECUTE `service_role=true`, `anon=false`, `authenticated=false` (postflight de solo lectura). `actor_id` histórico sin FK revocable; reserva bloquea fila de switch y generación, única por merchant. La referencia obsoleta al SQL pendiente en borradores/checkpoints previos **no rige**.
- Nueve puentes F16 service-role previos instalados `20261020134900_pazo_f16_live_service_role_rpc_bridges`; return origin RPC `20261020142448_pazo_f16_admin_owned_live_return_origin`; NO reinstalar. Checkout Edge `pazo-paypal-live-checkout` v2 (`verify_jwt=true`) y webhook `pazo-paypal-live-webhook` v1 (`verify_jwt=false`) alojados **INERTES** con `LIVE_CHECKOUT_RELEASED=false` y `LIVE_WEBHOOK_RELEASED=false`. `pazo-admin-paypal-provision` no alojado, `RELEASE_APPROVED=false`.
- Insignias aprobadas extraídas del laboratorio visual original: los **cuatro PNG idénticos** ya están en `public/supporter/amigo-pazo-{inicio,3-meses,6-meses,12-meses}.png` con SHA256 fijado y probado por `src/features/admin/testing/adminPaypalSupporterBadgeOriginals.test.mjs`. **NO volver a importarlas ni redibujarlas.** Que existan assets no prueba integración visible o derechos de membresía.
- **Vercel — usuario confirmó acceso público sin login (20-oct-2026)**, después de apagar temporalmente `Require Log In`; los despliegues que se habían observado eran de SHA antiguo `a218ab3...`, no el nuevo código del PR #44. No se certificó nuevo deploy/retorno/PWA. Conector Vercel sigue con error 403 de autorización de scope `digitalapp`; es otro problema, independiente de SSO. La relajación de protección puede exponer previews; registrar para reversión antes de lanzamiento final.

## Código listo vs. lo que todavía FALTA
- **CODE + CI:** GoTrue admin y prueba TOTP reciente (no `token_refresh`), `liveHostedProvisioning.mjs` OFF, aislamiento de Vault legacy en Live, ingreso Edge privado fail-closed, SQL store reserva, secrets scoped, verificador de merchant/plan/webhook en borrador, checkout/webhook Live INERTES, payloads firmados, lector original de ventas, coordinadores de ventas/refunds y sus tests. Plan mensual USD2.99, cancelaciones y Sandbox tienen pruebas positivas previas. **No atribuir HOSTED/PROVIDER/E2E a un mock o un CI PASS.**
- **Pendiente priorizado F16:** verificar y conectar en servidor la identidad comercial PayPal Live (app, plan ACTIVE, webhook y generación inmutable), flujo privado autenticado MFA y PAT mínimo; aprobación precisa e instalación de control plane administrativo, reservar y registrar secretos con auditoría sin reintentos ambiguos; obtener generación real en DB y URL `?generation=N` antes de que PO pulse Add Webhook; verificar eventos firmados 10/10; worker de claim duradero, correlación `paidAt`/ciclo original, renovaciones, cancelaciones, reembolsos parciales/reversos/disputas y proyección de beneficios; corte atómico, historial, rollback, y UI "Guardar y activar" funcional sin retoques post-beta. **Live OFF mientras se integra**, GO especial para operaciones de proveedor, despliegues financieros y cobro real.
- **Beta transversal NO-GO:** Vercel acceso sin SSO **confirmado solo por PO**; siguen pendientes retorno PayPal con PWA instalada/no instalada, revisión de previews expuestos, Supabase Security Advisor (incluida protección de contraseñas filtradas), privacidad/legal/retención, backup/restore, visual PO de panel desktop/móvil y pantallas de membresía, QA de cuatro insignias, RC SHA único + autorización Preview/merge/publicación. No declarar beta lanzable por tener backend sintético en verde.

## Acción exacta para el siguiente chat
1. Activar Brain OS, **leer estas rutas y auditar HEAD/CI/flags alojados**. No copiar esta conversación, no reabrir decisiones cerradas; priorizar providers sobre snapshots.
2. **NO reinstalar migración de auditoría ni reextraer badges.** Continuar revisión del control plane `supabase/functions/pazo-admin-paypal-provision/{index.ts,intake.mjs,liveHostedProvisioning.mjs,liveAuthenticatedAdminFactory.mjs}`, `supabase/functions/pazo-admin-paypal-validate/liveEdgeProvisioning.mjs` y `liveProviderReadOnly.mjs`; terminar el adaptador real de identidad merchant/plan/webhook y el gate privado, con pruebas/code review, sin liberar.
3. **Intervención mínima PO siguiente:** en detalles del plan Live existente, actualizar `Pagos pendientes de recibo automático` a desactivado (si la interfaz lo permite; PayPal soporta PATCH `payment_preferences.auto_bill_outstanding` para planes ACTIVE), confirmar sin mostrar secretos. Verificar con GET autenticado antes de declarar validado. Continuar reconciliación alojada y beta gates de `docs/PAZO_F16_BETA_RC_CRITICAL_PATH_20261020.md`; GO acotado obligatorio para escrituras de proveedor, deploy financiero, primer cobro o Preview.
4. Entregar un resumen breve de estado real, commit de código/CI y siguiente dependencia. **No prometer trabajo en segundo plano** si termina el turno.

**Punto de corte tras interrupción:** usuario reportó «Conexión interrumpida» y pidió handoff a otro chat. En esta recuperación NO se instala SQL, no se activa Live, no se despliega, no se hace merge; solamente se limpia y versiona continuidad. **Fuente histórica:** `docs/PAZO_ACTIVE_HANDOFF.md` antes de sustituir = commit `1cfcf2be387978b9eb1338de5bc4424ae39dd419`, más `docs/archive/`.
