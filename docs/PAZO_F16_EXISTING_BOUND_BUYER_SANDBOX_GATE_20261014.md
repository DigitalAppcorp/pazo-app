# PAZO F16 — Aprobar y cancelar una única suscripción YA BOUND (GO NO CONCEDIDO)

**Estado:** script y pruebas preparados en GitHub; **no se ejecutó ninguna aprobación de comprador** ni cancelación. Se requiere decisión expresa del Product Owner para la única simulación de aprobación por su cuenta **Personal PayPal Sandbox** y la posterior cancelación del mismo recurso. No crear nueva suscripción ni activar Live.

## Evidencia real, no inferida

- El operador Windows ejecutó `scripts/f16-paypal-recover-existing-bound.mjs --bind-existing` con GO limitado de la fase anterior: `phase:bound_verified`, `createdAuthUsers:0`, `createdIntents:0`, `createdPayPalSubscriptions:0`, `mayGrantBenefits:false`, `paidThrough:null`.
- **Confirmación independiente Supabase READ ONLY:** Auth **8**; intents **1**, **BOUND=1**, **pending=0**; ledger `payment_entries=0`, reversals=0, inbox firmado **5** todos `pending`. Es la intención creada por el primer E2E, ya ligada al mismo ID externo de la misma cuenta QA; no afirma pago ni período contractual.
- Antes de BOUND, el GET merchant PayPal Sandbox confirmó `APPROVAL_PENDING`, plan USD2.99/mensual activo, cantidad uno, `plan_overridden:false`, `custom_id` y plan correctos. Debe **revalidarse antes de abrir el enlace** porque los datos pueden cambiar.

## Ejecutores locales, sin nuevas compras

- `supabase/functions/f16-paypal-webhook/f16ExistingBuyerSandboxGate.mjs`: guard funcional puro y sintético, reconoce exclusivamente `state.phase=bound_before_approval` + `state.recoveryPhase=bound_verified`, entorno/proyecto/plan exactos, `private_intent.state=bound` con mismo Auth owner y subscription ID, GET PayPal `APPROVAL_PENDING`, plan $2.99 mensual sin trial/fees/taxes, cantidad `'1'`, `plan_overridden===false` y **único** enlace `approve` GET con dominio HTTPS **www.sandbox.paypal.com** o sandbox.paypal.com. Ningún dato de usuario/ID/link en JSON de diagnóstico.
- `scripts/f16-sandbox-existing-buyer-e2e.mjs --preflight`: solo RPC privada `f16_paypal_read_private_intent`, GET merchant de suscripción/plan y consulta de credenciales OAuth Sandbox (no escribe); exige que exista marcador previo `sandbox-state.json.recover-claimed`. Resultado esperado: `phase:read_only_ready`, `boundOwnerVerified:true`, `originalSubscriptionApprovalPending:true`, `originalPlanValidated:true`, `approvalLinkAvailable:true` y `networkWrites:0`. En STOP no avanzar.
- `--approve-and-cancel`: **NO EJECUTAR SIN NUEVO GO PO**. Requiere env privado `PAZO_F16_BUYER_SANDBOX_GO=ONE_EXISTING_BOUND_APPROVAL_AND_CANCEL`, verificación remota exacta, y crea primero marcador exclusivo `sandbox-state.json.buyer-claimed` con `flag:wx`. Ningún otro usuario, plan, intención, suscripción, orden o captura puede crearse. **En PowerShell local únicamente**, imprime el enlace `approve` confidencial de PayPal Sandbox; el PO entra a **Personal Sandbox** y aprueba una sola vez. NO compartir el enlace/token en el chat. Tras Enter, GET de la misma suscripción hasta ver `ACTIVE` (o estado no confirmado); **no crea un mes pagado**. A continuación, inmediatamente intenta **una cancelación** PayPal REST `POST /v1/billing/subscriptions/{id}/cancel` SOLO si GET observó `ACTIVE` o `SUSPENDED`, y verifica `CANCELLED` con GET. Para `APPROVAL_PENDING` o `APPROVED`, no envía POST cancel. Devuelve resultados saneados; puede requerir revisión manual si la respuesta remota es incierta.
- `--cancel-only`: recuperación de esa **misma** sub si proceso fue interrumpido y se observó ACTIVE. Solo con marcador `buyer-claimed`, flag privado `PAZO_F16_BUYER_CLEANUP_GO=ONE_EXISTING_ACTIVE_CANCEL_ONLY`, GET merchant y DB BOUND, cancelación si la API permite ese estado, una llamada POST sin reintentos automáticos a ciegas. No ejecutar sin diagnóstico/control para evitar redoblar acciones.
- Código NO despliega worker/Edge, NO emite beneficios, acreditación, mes, ledger ni `paidThrough`. Incluso si PayPal reporta ACTIVE/CANCELLED, **aún hay que conciliar venta real firmada y transacción merchant**, determinar el ciclo contractual y crear contrato de ledger/entitlements bajo GO ulterior.

## Seguridad y secuencia pendiente

1. Product Owner autoriza **explícitamente**: una aprobación virtual con cuenta **Personal Sandbox**, seguida de cancelación automática supervisada de la MISMA suscripción previamente BOUND, sin compras nuevas ni Live.
2. El operador realiza `git status --short`, `git pull --ff-only origin f13/section-titles-20261012` en checkout limpio y ejecuta **solo** `--preflight`. Comparar resultado; STOP si BLOCKED.
3. Con read-only PASS y GO vigente, enviar comando para la **única** aprobación/cancelación. Mantener PowerShell abierto hasta salida `cancelled`; no repetir `--approve-and-cancel`, no borrar markers, no copiar URL al chat.
4. Consultar Supabase hosted READ ONLY: conteos/eventos de tipos PayPal y estado BOUND; inspeccionar merchant GET/transactions por referencia original **solo desde entorno privado**; no tocar eventos anteriores, no crear ledger ni beneficios sin autorización.
5. Si cancelación no confirmada, priorizar control de seguridad de esa misma sub mediante `--cancel-only` o Business Sandbox supervisado, no iniciar un segundo comprador/pago. No afirmar que una venta haya sido verificada hasta reconciliación.

**F16 EN CURSO, PR #44 DRAFT, PayPal Live NO-GO.**
