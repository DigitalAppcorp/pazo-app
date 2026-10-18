# PAZO F16 — Corrección del verificador Sandbox V2 (campos opcionales)

**Fecha:** 2026-10-18. **PO:** autorizó corregir el verificador y preparar su validación en el PR #44; NO autorizó desplegar Edge, activar Live, nuevos POST PayPal, ni fusionar a main.

## Evidencia previa, únicamente lectura

- La UI de la suscripción Sandbox previa indicaba PayPal `ACTIVE`, pero `verify_payment` devolvía 503 genérico. El evento `PAYMENT.SALE.COMPLETED` llegó al inbox verificado como pendiente; esto no demuestra por sí solo un período pagado ni su vinculación completa.
- La lectura del checkout existente no generó períodos pagados acreditados en PAZO. El 503 tampoco identifica por sí mismo qué guardia interna falló.
- La implementación antigua exigía `ledger.total_pages === 1` y `total_items === transactions.length`. La referencia oficial del endpoint `GET /v1/billing/subscriptions/{id}/transactions` marca `total_pages`, `total_items` y `links` como **opcionales**. No está probado que el payload concreto hubiera omitido esos campos: es una incompatibilidad contractual verificable, no una atribución retrospectiva de causa.
- Documentación pública: https://developer.paypal.com/api/subscriptions/v1/ y https://paypal.gitbook.com/online-payments/subscriptions/api-reference/subscriptions

## Código autorizado en la rama del PR #44

- `pazoSandboxV2MerchantVerify.mjs`: no rechaza una respuesta válida por ausencia de totales opcionales. Sigue denegando páginas explícitamente distintas de 1, totales contradictorios, enlace `next` (sin importar mayúsculas), `links` malformados, listas vacías o demasiado extensas, IDs ambiguos, importes/estado no válidos, desajuste owner+intent+plan, fechas incoherentes, reembolsos y ventas sin comprobación independiente `GET /v1/payments/sale/{id}`.
- La ausencia de totales **NO demuestra cobertura histórica global**; solo se considera una venta única de la ventana acotada por la suscripción exacta y una venta individual confirmada por PayPal. Ninguna credencial, importe o fecha procede del navegador. El verificador debe seguir rechazando evidencia incompleta antes de persistir un período.
- `f16-paypal-supporter-v2-qa/index.ts`: traduce excepciones internas a categorías fijas, sin mostrar mensajes arbitrarios del proveedor, IDs, URLs, correos ni tokens. Solo se entregan al dueño Auth verificado.
- `SandboxV2AccountPanel.tsx`: presenta categorías seguras (`history`, `period`, `sale`, `provider`, `record`, `generic`); no declara compra completada cuando la función deniega el período.
- `f16SandboxV2MerchantVerifiedCycle.test.mjs`: prueba totales omitidos, metadatos presentes/incoherentes, `NEXT`, links malformados y ausencia de registros financieros en casos rechazados.

## Validación y límites

- GitHub Actions del commit funcional `2501b1d360f24a2255a9d4e978a892ea67aa9e1e`: **CI y seis laboratorios PostgreSQL: 7/7 SUCCESS**.
- **Solo commits en** `f13/section-titles-20261012`, PR #44 aún DRAFT y NO fusionado; Vercel limitado por cuota y no es dependencia.
- **Sin Edge redeploy**; permanece `f16-paypal-supporter-v2-qa` **v15 ACTIVE**, con comportamiento anterior. Ningún cambio a `main`, `PayPal Live`, dinero, cuentas, `paypal_verified_event_inbox`, grants, períodos o worker.
- El problema histórico del ID original con 404 continúa separado y no se considera conciliado ni habilita reintentos.

## Siguiente gate — autorización separada

Solicitar GO del PO para desplegar **solo** `f16-paypal-supporter-v2-qa` con el código revisado, verificando previamente el snapshot alojado y dependencias importadas. No crear suscripción, no cancelar, no activar worker ni Live. Tras desplegar, el PO regresará a la misma sesión PAZO local, confirmará la cuenta propietaria correcta y pulsará **una sola vez** `Verificar pago real Sandbox` para la suscripción ya existente. Si hay otro 503, el nuevo código fijo de diagnóstico aislará el siguiente bloqueador sin acreditar dinero.

**Marcador:** `F16_V2_MERCHANT_OPTIONAL_TOTALS_AND_SAFE_DIAGNOSTICS_CODE_PASS_7_OF_7_DEPLOY_GO_PENDING`.
