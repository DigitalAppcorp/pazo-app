# PAZO F16 — Reembolso parcial y múltiple: bloqueo seguro

**Fecha:** 14 de octubre de 2026. **Estado:** corrección OFFLINE y pruebas PASS; **no autorizada política P06, no autorizado deployment financiero**. Rama `f13/section-titles-20261012`, PR #44 Draft.

## Defecto comprobado

La tabla existente `supporter_private.paypal_payment_reversals` mantiene **una sola fila por `external_payment_id`**, con clave primaria sobre el ID de venta original. La función `supporter_private.f16_private_record_reversal` rechaza una segunda reversión del mismo pago si cambia `reversal_kind` o `provider_verified_at`.

Por tanto, una devolución parcial y otra posterior que complete el importe no pueden representarse como dos eventos financieros independientes en el modelo actual. Tampoco se conservan el identificador único del refund ni sus centavos para sumar importes sin duplicar. La API oficial de PayPal distingue `PARTIALLY_REFUNDED` y `REFUNDED`; eso **no significa** que el ledger actual pueda contabilizarlos por separado.

## Corrección aplicada solo en código offline

- `privateProviderProofFlow.mjs`: después de verificar fuente PayPal, sale original, suscripción, owner Auth y estado de transacción, los candidatos `partially_refunded` se niegan con `partial_refund_ledger_not_ready`. El evento vuelve a la ruta privada de release/retry/quarantine con `retention_hold`; **no** se marca como `processed` ni se concede entitlement.
- `privateLabRpcStores.mjs`: en segunda frontera, incluso una llamada directa al adaptador rechaza `partially_refunded` antes de `rpcClient.rpc`. El SQL DRAFT del laboratorio **todavía tiene** la posibilidad de aceptar un parcial si `service_role` lo invoca directamente; por tanto, **no es desplegable como política de refund** hasta endurecer el SQL oficial y/o instalar un ledger multievento.
- `src/features/supporter/testing/f16PrivateProviderProofFlow.test.mjs` y `f16PrivateLabRpcStores.test.mjs`: prueban que un parcial no llega al commit y no concede beneficios.
- `supabase/tests/supporter/f16-multi-refund-schema-limit-synthetic.sql`: en PG17 descartable representa dos eventos REFUNDED separados para la misma venta, uno `partially_refunded` y otro `refunded`. Comprueba que la segunda llamada al procedimiento SQL actual falla por evidencia incompatible y deja el segundo evento sin ACK; finaliza mediante `ROLLBACK`. **Es una prueba del límite conocido, no una solución SQL.**

**Evidencia técnica en GitHub:** [CI general PASS #38641407793](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38641407793) y [PostgreSQL 17 PASS #38641407912](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38641407912) para SHA `b02c24e8` (antes del guard redundante posterior del adaptador); verificar CI también del HEAD actual.

## Diseño recomendado para evaluación, no aprobado ni migrado

1. Modelo append-only privado de **eventos de refund** con clave única `provider_refund_id` y enlace al `original_sale_id`. Guardar solo centavos, USD, estado confirmado, fecha y correlación del webhook, sin identidad del pagador ni payload completo.
2. Un **hold por venta** separado de los eventos, que pueda existir aunque la venta no haya llegado aún (refund-before-sale) y que impida una acreditación pagada mientras existan estados de refund/disputa desconocidos.
3. Un agregado contable derivado de **refunds distintos y finalizados**, deduplicados por refund ID y nunca únicamente por sale ID; comparación exacta entre suma verificada y USD 2.99, bloqueando inconsistencias (incluida una suma mayor al importe original). Transición `partial → full` basada en evidencia, no en sobrescribir historia.
4. El ACK de cada webhook debe ser atómico con la evidencia persistida, bajo lease vigente y restricciones ACL. Un refund no confirmado o parcial sin política decidida permanece protegido en el inbox.
5. Resolver en P06 si una devolución parcial afecta la cobertura de ese mes, la pérdida de insignias y tratamiento de disputas; una decisión legal/comercial aparte resolverá retención y borrado de cada registro.
6. **No desplegar** las RPCs previas `f16_paypal_commit_verified_sale/reversal` (carecen de lease) ni las funciones LAB con reembolsos parciales habilitados.

## Estado hosted, límites y siguiente paso

Cuatro eventos auténticos PayPal Sandbox de una compra de prueba no vinculada a Auth permanecen **pending**, sin intents, pagos, reversos ni beneficios acreditados; no fueron modificados. El checkout y PayPal Live continúan inactivos. No se ejecutaron peticiones nuevas a PayPal con credenciales reales.

**Siguiente gate:** revisar/aprobar P06 y la propuesta de estructura multievento; solo después versionar una migración con Supabase CLI, en una transacción que revoque las antiguas rutas sin lease, y obtener otro GO específico del PO para aplicar cambios hosted. La fase F16 sigue EN CURSO y la beta pública NO-GO.

**Referencias proveedor:** [PayPal Subscriptions — transaction status](https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/), [Refund resource — Payments v1 deprecated](https://developer.paypal.com/api/deprecated/payments/v1/definitions/refund-2), [Subscriptions webhooks](https://developer.paypal.com/subscriptions/webhooks).
