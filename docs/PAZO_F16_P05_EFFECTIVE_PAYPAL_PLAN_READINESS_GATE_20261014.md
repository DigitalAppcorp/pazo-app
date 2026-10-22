# PAZO F16-P05 — Lectura real de términos PayPal, lista para prueba Sandbox vinculada

**Fecha:** 2026-10-14. **Estado:** implementación y validación sintética offline, no consulta autenticada a PayPal real; P05 continúa SIN aprobación. PR #44 DRAFT, F16 EN CURSO, beta pública NO-GO.

## Hallazgo de documentación oficial

PayPal Subscriptions v1 expone `GET /v1/billing/plans/{id}` y `GET /v1/billing/subscriptions/{id}`. La respuesta de la **suscripción individual** incluye el campo opcional `plan_overridden`: cuando es verdadero, las condiciones de esa suscripción pueden diferir de las del plan general. `quantity` también puede afectar la comparación con el precio de referencia. La respuesta `billing_info.last_failed_payment.next_payment_retry_time` sitúa la hora de reintento **dentro de la información del último pago fallido**. Otros campos relevantes son `outstanding_balance`, `failed_payments_count`, `last_payment`, `cycle_executions` y `next_billing_time`. Los atributos de precio del plan podrían cambiar y PayPal documenta el impacto temporal de tales cambios.

**No podemos afirmar «esta suscripción siempre costó 2.99 al mes» consultando únicamente el plan activo actual.** Tampoco podemos inferir `paid_through` de `next_billing_time` o asumir que una recuperación de deuda inaugura un ciclo nuevo.

Documentación verificada el 14-oct-2026:
- [PayPal: Show subscription details](https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/).
- [PayPal: Subscription definition — plan_overridden y billing_info](https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/).
- [PayPal: Subscriptions v1 API](https://developer.paypal.com/api/subscriptions/v1).
- [PayPal: Payment failure retry](https://developer.paypal.com/subscriptions/payment-failure-retry/).

## Cambio de ingeniería implementado OFFLINE

**Nuevo adaptador SANDBOX de lectura exclusiva:**
`supabase/functions/f16-paypal-webhook/p05PaypalSandboxBillingSnapshotReader.mjs`.
Con un `subscription_id` validado y credenciales merchant que **nunca expone**, construye tres solicitudes de servidor a host fijo `api-m.sandbox.paypal.com`: OAuth2 `POST /v1/oauth2/token` (únicamente para autenticar), `GET /v1/billing/subscriptions/{id}` y `GET /v1/billing/plans/{plan_id}` usando exclusivamente el plan PAZO esperado. No crea ni cambia planes, compras, refunds o cuentas. Si los GET fallan, el adaptador no devuelve un estado elegible.

- Comprueba que la suscripción consultada y el plan correspondan a IDs esperados, y retorna únicamente un snapshot mínimo (plan, frecuencia, precio, calendario, deuda, fallos, reintentos, `plan_overridden`, quantity). No devuelve email, nombre, payer ID, approval links, tokens o payload bruto.
- Distingue campos **ausentes = desconocidos** de saldos `0.00` comprobados; campos mal formados o divisa diferente no se convierten en evidencia positiva.
- La función existente `p05BillingEvidenceLab.mjs` ahora **rechaza `plan_overridden:true` y `plan_overridden` omitido**, además de cantidad distinta a `1`. Solo `false` explícito significa que el plan general no fue sobreescrito; la prueba real decidirá si el proveedor devuelve este campo. En caso de omisión no se inventa un valor.
- `p05CycleAttributionRisksLab.mjs` usa la ubicación correcta del campo de reintento en `billing_info.last_failed_payment`.
- Los analizadores P05 existentes permanecen sin salida operativa: `coverageReady:false`, `paidThrough:null`, `mayGrantBenefits:false`, `mayCreatePaidPeriod:false`, no se cuenta ningún mes conmemorativo.

**Nueva integración probada con `fetchImpl` simulado:** `src/features/supporter/testing/f16P05PaypalSandboxBillingSnapshotReader.test.mjs`. Verifica allowlist estricta de endpoints/métodos, autenticación inyectada, eliminación de PII/credenciales, nested retry real, comparación de plan vs subscription, fail-closed para overrides/missing override/quantity, respuestas incompletas, URLs no válidas y conexión con los auditores anteriores. **Las pruebas no llamaron la API PayPal verdadera.**

## Un único próximo paso realista para salir del gate P05

1. Autorizar por separado una lectura GET de un **Sandbox merchant real** para verificar la presencia, semántica y disponibilidad de los campos `plan_overridden`, `billing_info`, `cycle_executions` y plan vigente. Distinguir una lectura del ensayo que involucre compra/creación de suscripción: compra nueva requiere otro GO PO explícito.
2. Comprobar con una **nueva suscripción Sandbox realmente ligada al Auth PAZO** cuál venta corresponde a cuál ciclo contractual, con evidencia de ciclo e intent privado. Los cuatro webhooks firmados anteriores NO tenían Auth BOUND y NO deben reatribuirse.
3. Definir y aprobar P05: `cycle_key` y ancla mensual, pago atrasado atribuido al ciclo histórico con prueba independiente, no crear mes adicional por deuda recuperada, conducta en cobros combinados/cancelaciones y fechas 29/30/31. Aplicar P06 ya aprobado **solo sobre el ciclo correcto**.
4. Cerrar retención financiera P01–P04/P09 y política de eliminación antes de habilitar worker, periodos reales o publicidad de beneficios.

**No existe GO actual** para acceder a credenciales PayPal reales, crear intenciones alojadas, ejecutar pruebas de compra, nuevas migraciones Supabase, desplegar Edge/worker/cron, habilitar checkout/entitlements/Live, merge o Vercel. PR #44 sigue Draft.
