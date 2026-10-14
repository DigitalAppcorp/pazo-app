# PAZO F16 — Runbook de despliegue SEGURO del nuevo receptor PayPal Sandbox

**Estado:** DESPLIEGUE INERTE AUTORIZADO, EJECUTADO Y VERIFICADO; ACTUALIZACIÓN/ACTIVACIÓN DE PAYPAL NO-GO. Se requiere GO independiente para secretos, activar receptor, cambiar webhook y permitir pagos.

## Gate PO: despliegue INERTE ejecutado, resto sigue NO-GO (2026-10-14 UTC)

**Aprobación PO específica consumida:** desplegar SOLAMENTE `f16-paypal-webhook` desactivada para comprobar respuesta HTTP 503. Ejecutado en Supabase Free sin nuevo proyecto/plan/adicionales. La nueva Edge aparece `ACTIVE v1` (ID `b0da866f-aae3-4785-99a3-6a6314e3c3c8`), pero su `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false` cancela cualquier solicitud antes de leer secretos o webhooks. `supabase/config.toml enabled=false` sigue para evitar despliegues automáticos; `verify_jwt=false` solo porque el proveedor no lleva JWT y la futura lógica tendrá que verificar firma.

**HTTP real verificado:** workflow de un único uso `38512959544` SUCCESS: GET sin autorización, datos ni secretos a la nueva función → **503** y `f16_receiver_not_released`; el workflow de prueba fue borrado tras pasar para no realizar invocaciones repetidas. **Postflight:** cuatro tablas F16 con 0 filas, muro `false`, otras tres Edge con las mismas versiones (v30/v42/v29). No se hizo ningún cambio en PayPal, su webhook ID/URL/eventos, Edge secrets ni `profiles.is_founder`.

**Los pasos 2, 4, 5, 6 y 7 inferiores siguen PENDIENTES y requieren aprobaciones independientes; el paso 3 de despliegue inerte ya pasó.** La cuota actual del plan Free contiene 500 000 invocaciones/mes, y la documentación actual establece máximo 100 funciones/proyecto Free; un 503 cuenta como invocación. No se conoce un cobro específico por crear esta cuarta función.

## Estado comprobado

- Supabase project: `mrybvqdebbgcayuvgkkr`. Inbox, intenciones, pagos y reversos privados ya están instalados y vacíos, y su acceso está restringido al servidor. No hay períodos acreditados ni beneficios pagados.
- Edge existente: `paypal-webhook` v30, **no utilizar** como destino; puede escribir `profiles.is_founder` desde `ACTIVE`. Nuevo slug `f16-paypal-webhook` **DESPLEGADO v1 PERO INERTE**, HTTP 503 validado.
- PayPal Sandbox: plan `P-14V25407JP6850922NLHMDKI`; webhook existente `6N7889790V1467139` apunta a un destino de dashboard, no a la nueva Edge Function. Falta sumar eventos de venta/reembolso/reversión. **No actualizar todavía**.
- Código F16: `supabase/functions/f16-paypal-webhook/index.ts` con `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`; `supabase/config.toml` con `enabled=false`, `verify_jwt=false`. El endpoint no acepta eventos hasta una modificación de código específicamente aprobada.

## Orden de gate propuesto; requiere autorizaciones específicas

1. **Preflight de costo y seguridad:** comprobar en Supabase plan/cuotas y límites de Edge Functions; el número de llamadas del webhook puede generar uso facturable, especialmente en reintentos/abuso. No habilitar ningún servicio nuevo, plan ni aumento de gasto sin aprobación. Verificar CI y PostgreSQL F16 SUCCESS para el HEAD concreto y una política de protección ante tráfico malicioso.
2. **Secretos de servidor:** definir exclusivamente en Supabase Edge secrets: `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID=6N7889790V1467139`, `PAYPAL_PLAN_ID=P-14V25407JP6850922NLHMDKI`, `SUPABASE_URL` del proyecto y `SUPABASE_SERVICE_ROLE_KEY` de servidor. Confirmar existencia y alcance sin revelar valores ni registrarlos en GitHub/chats. Nunca introducir credenciales Live para F16.
3. **Despliegue aislado de receptor inerte (GO independiente):** desplegar **solo** nuevo slug `f16-paypal-webhook` con sus importaciones locales; `verify_jwt=false` porque PayPal no manda JWT. Probar que responde 503 con latch OFF; comprobar que las funciones existentes (especialmente `paypal-webhook` v30 y F14) no cambian. No modificar destino PayPal.
4. **Activación controlada de receptor (GO independiente):** revisión final de verificación criptográfica/paypal postback y límite de tráfico; cambiar en PR el latch/config tras aprobación, desplegar solo el nuevo slug; comprobar firma inválida 401, ausencia de datos en inbox, 503 ante proveedor/DB caídos y registro idempotente tras firma real. Nunca usar payload inventado para certificar una firma real.
5. **Corrección del webhook Sandbox (GO independiente):** actualizar **el registro existente** `6N7889790V1467139`, no crear un webhook duplicado: URL exacta `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-webhook`; eventos `BILLING.SUBSCRIPTION.*` ya existentes y añadir `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`. Verificar configuración con lectura autenticada, sin exponer la URL si contiene tokens.
6. **Prueba real de PayPal Sandbox:** usar comprador Sandbox descartable consentido; firma SUCCESS validada por API oficial, inserción de solo ID y tipo, duplicados no acreditados, reembolso real y webhook fuera de orden, fallas del proveedor/DB y recuperación con idempotencia. Comparar cuenta Auth + intención + plan $2.99, pero **no activar entitlement** hasta verificar período pagado + reversos.
7. **Scope closure y habilitación de beneficios (otro GO):** retención legal y limpieza de ledger/intent, account deletion F14, cobertura mensual y expiración, reversiones/chargebacks, consentimiento del muro, UI cancelación y política ES/EN. No modificar `profiles.is_founder`.

## Reversión segura

- Si la Edge rechaza o no confirma entrega, **no** apuntar de nuevo a `paypal-webhook` v30 insegura.
- Desactivar recepción de eventos Sandbox y volver el nuevo receptor a un estado 503 con latch OFF, sin borrar la inbox ni pagos/reversos duraderos, sin tocar Live.
- Conservar IDs para reconsulta y reintentos, revisar estados sin divulgar payload ni credenciales; no borrar evidencia financiera ni forzar membresías.
- Revertir solo el despliegue/configuración específicamente afectado, previa comprobación del SQL y los registros existentes. Una operación de rollback de la base no está aprobada por este runbook.

## Criterios medibles del gate receptor

- 0 escrituras a `profiles.is_founder`, 0 entitlements y 0 cobros Live.
- Sandbox-only; secret/env ausente → 503; firma inválida → 401; body excesivo → 413; DB no durable → 503, repetición firmada válida → 200 sin duplicado.
- Firma valida contra webhook ID correcto y cuerpo original, usando únicamente dominios Sandbox PayPal. Ninguna ruta controlada por el usuario recibe la service-role key.
- Flujo de registros privados: 1 ID por evento, RLS forzada, prohibición de acceso cliente y sin PII ni cuerpo del webhook.
- Mostrar evidencia de consola y CI sin tokens, JWTs ni datos de comprador.

**Referencia:** `docs/PAZO_F16_SANDBOX_RELEASE_GATE_20261014.md` y `docs/PAZO_ACTIVE_HANDOFF.md`. La autorización actual para SQL **no** habilita este runbook.
