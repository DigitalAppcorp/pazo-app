# PAZO F16 — E2E Sandbox Auth BOUND, vinculación ANTES del pago

**Fecha:** 2026-10-14. **Estado:** diseño operativo y coordinador server-only **PREPARADOS EN GITHUB**, probados offline; **NINGUNA nueva compra ni escritura ejecutada** en PayPal/Supabase alojados. PR #44 DRAFT; F16 EN CURSO; beta pública NO-GO.

## Objetivo específico

Comprobar **una sola vez y de extremo a extremo** que una suscripción **nueva** de PayPal Sandbox pertenece a la cuenta **Auth de prueba** verificada por PAZO y que la notificación de pago firmada se correlaciona con esa suscripción **sin** permitir suplantar a otro usuario o conceder beneficios injustificados.

Esta operación **NO está incluida** en el GO de lectura ya utilizado para consultar la anterior suscripción Sandbox CANCELLED. Esa lectura anterior verificó plan mensual USD 2.99, `plan_overridden:false`, cantidad 1, `balanceKnown:false`, pero **no** el período pagado ni el owner; jamás vincular retroactivamente su pago.

## Auditoría previa verificable de alojamiento, solo lectura

Supabase proyecto `mrybvqdebbgcayuvgkkr` dispone actualmente de:

- `supporter_private.paypal_subscription_intents`: campos `intent_id`, `owner_id`, `provider`, `plan_id`, `state`, `external_subscription_id`, `created_at`, `bound_at`. `state='pending'` implica **sin** external subscription ni `bound_at`; `bound` exige ambos. `UNIQUE(external_subscription_id)` impide que dos owners/intent reclamen la misma suscripción.
- `public.f16_paypal_create_private_intent(owner uuid,intent text)`: restringida a `service_role`, `SECURITY DEFINER`; acepta solamente `intent-<UUIDv4>` y graba plan PAZO Sandbox exacto. No confundir este RPC alojado con las RPC `f16_lab_*` DRAFT, que **NO** están instaladas.
- `public.f16_paypal_bind_private_intent(intent text,owner uuid,subscription text,plan text)`: restringida a `service_role`, exige owner de una intención previamente almacenada y vinculación única, devuelve `new_binding` o `already_bound`. **No verifica la identidad Auth por sí sola ni consulta PayPal**: esas verificaciones son obligación del backend llamante. El wrapper usa `p_paypal_custom_id=p_intent_id`, pero eso **solo es fiable cuando** ya se leyó y corroboró `custom_id` en PayPal merchant.
- `public.f16_paypal_record_verified_event` + Edge `f16-paypal-webhook` v13: almacenan referencias de eventos tras verificar firma; hay **4 eventos anteriores signed, todos pending**, 0 intents, 0 ledger, 0 reversals y 0 consentimientos. La compra anterior NO estaba vinculada a Auth. **No tocar esas filas**.
- `public.f16_paypal_read_verified_inbox(text)` de worker **no existe alojada** (SQL `DRAFT_DO_NOT_APPLY` solamente); no activar procesamiento automático ni grants.

Estas conclusiones proceden de consulta **read-only** de esquema, definiciones y permisos Supabase, no de un experimento de escritura.

## Código implementado offline para no improvisar las RPC

`supabase/functions/f16-paypal-webhook/f16BoundSandboxIntentCoordinator.mjs` es un módulo server-only, **no** endpoint Edge, UI, worker ni despliegue. Compone el preflight existente `ownerBindingPreflight.mjs` con adaptadores confiables:

- `prepare({requestContext})`: obtiene owner por servidor **Auth `getUser(accessToken)`**, no por un UUID enviado por navegador. Usa generador criptográfico privado `intent-UUIDv4`; solo después solicita a `service_role` crear una intención `pending` (si se conecta un adaptador real). Devuelve únicamente `intentId` y el plan fijo para que **el servidor** prepare después una suscripción Sandbox. Sin red de PayPal, checkout, venta ni crédito.
- `bind({requestContext,intentId,subscriptionId})`: vuelve a verificar Auth, consulta **intención privada** del mismo owner, hace GET merchant de esa suscripción y exige `id`, plan y `custom_id===intentId`. **Nuevo guard:** exige además `status=APPROVAL_PENDING` para que el BOUND sea **antes** de la autorización del comprador. Entonces (y solo entonces) llama la RPC `service_role` de binding; acepta únicamente `new_binding` o `already_bound` concordantes.
- En ambos pasos, cualquier fallo devuelve un motivo sanitizado y `mayGrantBenefits:false`, `mayCountPaidMonth:false`, `entitlement:false`, `paidThrough:null`. Ningún método crea por sí mismo una suscripción PayPal o cuenta Auth, paga, cancela, guarda secretos en Git o configura credenciales en frontend.

Pruebas `src/features/supporter/testing/f16BoundSandboxIntentCoordinator.test.mjs`: owner falsificado, sesión no verificada, UUIDv4 inválido, duplicado de intención, plan/correlación incorrectos, segunda cuenta reclamando la misma suscripción, PayPal GET fallido, suscripción ya ACTIVE/CANCELLED/SUSPENDED, errores de RPC, vinculación nueva e idempotente y nula atribución de beneficios.

## Recorrido E2E real propuesto — NO EJECUTAR sin GO explícito distinto

1. **Gate PO:** autorizar exactamente **una** prueba adicional con una cuenta **Auth descartable PAZO**, un único intento de creación de intención privada `pending`, una única suscripción al **plan Sandbox PAZO existente** ($2.99 virtuales/mes), su binding privado, aprobación/cobro simulado con cuenta Personal Sandbox y **cancelación controlada** final. No crear usuario/suscripción ni llamar RPC de escritura antes del GO. Los errores de red al crear suscripción solo admiten **reintento con la MISMA clave de idempotencia**, nunca una nueva operación no autorizada.
2. **Preparación local/servidor:** identificar ambiente Sandbox en merchant y Auth; comprobar sesión de **la cuenta descartable** con `auth.getUser` de Supabase. No introducir JWT, `service_role` ni PayPal secret en navegador, Git/chat, logs o capturas; usar exclusivamente entorno privado del servidor. Evitar albergue público de una función de prueba sin auth.
3. **Persistir intención** `intent-UUIDv4` con `public.f16_paypal_create_private_intent` desde `service_role`, owner derivado de Auth. Aún no hay cobro ni `external_subscription_id`. **No falsificar un owner**.
4. **Crear una sola suscripción Sandbox** con PayPal `POST /v1/billing/subscriptions` **solo tras GO**, `plan_id=P-14V25407JP6850922NLHMDKI`, `custom_id=intent-UUIDv4`, cantidad 1, sin override, `PayPal-Request-Id` único y reusado para cualquier reintento del MISMO POST. Es operación distinta de GET y requiere autorización. No modificar plan existente ni registrar otro webhook.
5. **Antes de que el comprador apruebe**, ejecutar GET merchant de la nueva suscripción, demostrar `APPROVAL_PENDING`, ID, plan y `custom_id`; usando sesión Auth aún válida, ejecutar `public.f16_paypal_bind_private_intent` desde backend y comprobar `new_binding`. Si ya está ACTIVE/CANCELLED o el `custom_id` no coincide: **STOP, no reatribuir**.
6. **Luego** el PO aprueba en su cuenta **Personal Sandbox**; confirmar saldo/precio simulado visible. Observar nuevos webhooks firmados en inbox, registrar **solo tipos/conteos** y comprobar la venta original desde merchant/transactions. No adivinar cantidad de eventos recibidos ni comprar otra suscripción si uno se retrasa.
7. Verificar que la transacción candidata procede del **mismo owner Auth verificado, intención bound, subscription ID, plan, `custom_id` y venta `COMPLETED` de USD 2.99**, sin reversales conocidas y sin historial parcial. Si la evidencia es insuficiente, dejar `pending/hold` y detenerse. **No ejecutar** `f16_paypal_commit_verified_sale` ni activar worker/ledger/entitlement/periodo en este gate inicial.
8. **Cancelación Sandbox controlada**, solo si quedó incluida explícitamente en el GO, para evitar futuras renovaciones simuladas; confirmar por GET independiente del proveedor. Cancelar no invalida hipotéticamente una cobertura probada (P06-A), pero todavía **no se acredita** ningún período porque P05 requiere `cycle_key` comprobable. No borrar Auth ni ledger/intents fuera de SOP/retención aprobada.

**STOP inmediato** si se intenta ejecutar Live, falta Auth confiable, no hay forma de mantener `service_role` fuera del cliente, el PayPal ID no corresponde a la intención, no existe plan aprobado, faltan webhooks firmados, hay doble venta/disputa, o habría que cambiar infraestructura/contratos sin nuevo permiso. Ningún silencio/timeout autoriza un segundo cobro o grant.

## GO recibido y ejecutor local preparado (actualización posterior, 2026-10-14)

**GO exacto del PO:** el usuario contestó **«Si»** a la solicitud explícita de **UNA cuenta Auth descartable**, **UNA** intención privada preparada y BOUND, **UNA** nueva suscripción $2.99 **virtuales** en PayPal Sandbox con aprobación Personal Sandbox y **cancelación al concluir**. No incluye PayPal Live, gastos reales, worker, beneficios, periodos `paidThrough`, migraciones, despliegues ni merge. **Aún no se ha ejecutado ninguna de esas acciones**: para ejecutarlas hay credenciales locales del operador y aprobación Personal Sandbox interactiva.

**Script local para la operación autorizada:** `scripts/f16-sandbox-auth-bound-e2e.mjs`. Depende de `@supabase/supabase-js` ya incluido en `package.json`; no es módulo frontend ni Edge desplegada. Tres llaves SOLO PRIVADAS del operador: `PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_CLIENT_SECRET`, `PAZO_F16_SUPABASE_SECRET_KEY`. La última es una **Supabase secret API key** actual `sb_secret_...` (o legacy `service_role` si se controla adecuadamente) obtenida de los ajustes API del proyecto **correcto**; otorga capacidad de administración y no se comunica por chat, GitHub, captura, ni se expone en JavaScript del navegador. Debe escribirse de forma oculta en PowerShell y mantenerse únicamente en sesión privada del operador, cerrándola al terminar.

| Comando | Efecto | Alcance |
|---|---|---|
| `node scripts/f16-sandbox-auth-bound-e2e.mjs --preflight` | **0 red, 0 writes**; imprime solo booleanos sobre las tres claves y si hay un test previo | Se puede usar sin más permisos |
| `node scripts/f16-sandbox-auth-bound-e2e.mjs --run` | Con todas las claves, prepara **UNA** cuenta Auth email de prueba `@example.com` (reservado), valida sesión real, graba UNA intención privada, crea UNA suscripción con PayPal-Request-Id único, hace GET/plan y BOUND antes de mostrar URL de aprobación Sandbox, espera Enter del usuario, verifica `ACTIVE` y **intenta cancelar** mediante PayPal POST cancel + GET | **PO ya autorizó el alcance**, pero ejecución manual únicamente después de preflight PASS y confirmación de entorno correcto |
| `node scripts/f16-sandbox-auth-bound-e2e.mjs --inspect` | GET PayPal de misma sub + transacciones de ventana limitada, RPC lectura privada y solo conteos/booleanos; no concede beneficios | Read-only tras la operación |
| `node scripts/f16-sandbox-auth-bound-e2e.mjs --cancel-only` | Recuperación y confirmación de cancelación de **LA MISMA** suscripción previamente registrada en estado local | No inicia nueva suscripción ni crea otro test |

**La URL PayPal de aprobación contiene un token**; se muestra **únicamente en la consola local** después de BOUND, y no debe compartirse en el chat. Se abre localmente en la cuenta **Personal Sandbox**, nunca en Live o en la Business. Si no se aprueba, pulsar Enter y el script intentará cancelar. No pegar la URL en Git/ChatGPT/capturas.

**Idempotencia y recuperación:** antes de crear cuenta o llamar PayPal, el programa crea una reserva local dentro de `%LOCALAPPDATA%\\PAZO-F16-E2E\\sandbox-state.json`, con ID opaco de prueba, ciclo de vida y referencia PayPal cuando se obtenga. **No contiene passwords, claves, tokens de Auth, email o buyer.** La presencia del archivo bloquea volver a ejecutar `--run` para no duplicar compras. Si PayPal responde de forma incierta al POST, **no se reintenta** el POST con otro ID: detenerse y revisar el comercio Sandbox antes de cualquier medida. Si ya hay subscription ID y no se confirmó CANCELLED, correr `--cancel-only`; si tampoco confirma, detenerse y cancelar mediante la Business Sandbox con asistencia del PO. Una cuenta Auth de prueba permanece como registro hasta SOP de eliminación aprobado; este GO no autoriza eliminarla por SQL improvisado.

**Precauciones de privacidad:** URL Supabase y plan constantes, creación admin local server-only con `auth.admin.createUser` y usuario reservado `@example.com`, contraseña aleatoria efímera (no impresa), `auth.signInWithPassword` y `auth.getUser(access_token)` real. `service_role` no llega al browser; supabase RPC `service_role` únicamente en Node local. Error sanitized, no guardar JWT, password, URL de aprobación ni nombre del comprador. No interpretar la venta virtual como `cycle_key`, `paidThrough` o perks. No escribir `paypal_payment_entries` ni marcar inbox processed.

**Fase siguiente de ejecución:** PO podrá correr primero el **preflight** después de actualizar su checkout limpio de Windows. Una vez los tres booleanos de credenciales sean `true` y `previousTestExists:false`, seguirá `--run` con supervisión del alcance. No preparar varios usuarios ni pruebas paralelas para compensar un error.

## Criterios de PASS / qué no probará

**PASS de vinculación E2E (no de cobertura):** cuenta Auth de prueba verificada, intención única `pending` antes de crear suscripción, GET merchant `APPROVAL_PENDING`/plan/`custom_id` exactos, transición BOUND confirmada antes de aprobación, comprador Personal Sandbox aprueba una vez, Webhook firmado y venta PayPal completada se corresponden con esa misma suscripción, y consulta privada confirma que no hay beneficios/periodos otorgados automáticamente.

**NO PASS P05 completo:** una sola venta `COMPLETED` no demuestra `cycle_key` contractual, `periodStart`, `periodEnd`, `paidThrough` ni cantidad de meses; PayPal recupera fallos y puede acumular deuda. **P05-L comercial ya aprobada**: imputar pagos atrasados al ciclo original solo con evidencia merchant suficiente, jamás otorgar mes extra; si no hay prueba, revisión. **P06-A–E comercial aprobada** pero aún no operativa.

**Gates separados posteriores:** prueba de atribución calendarizada en meses 28/29/30/31, política de cobros combinados y restauración, permisos/funciones de worker con lease, retención de intents y ledger, P07/P08, activación de beneficios, PayPal Live, publicación beta, merge y Vercel.

**Estado tras nueva aprobación:** código local y documentación preparados, **GO del Product Owner concedido**, ejecución aún pendiente de la sesión privada de Windows y la aprobación Personal Sandbox; **sin nuevas cuentas, compras, RPC hosted de escritura ni despliegues por parte del asistente**. Tras completar la ejecución, contrastar los estados reales con consultas privadas read-only y decidir siguientes gates P05 sin atribuir meses por intuición.
