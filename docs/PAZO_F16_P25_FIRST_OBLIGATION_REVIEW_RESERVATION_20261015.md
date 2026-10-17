# PAZO — F16-P25: primera obligación contractual con reserva única de revisión

**2026-10-15. PR #44 DRAFT.** «ok siguamos» autoriza desarrollo técnico en código/lab, no escritura alojada de datos financieros. Mantener PAZO gratuito; Amigo voluntario US$2.99 mensual no está disponible para nuevas compras.

## Decisión del contrato ya tomada

La política aprobada anteriormente define la primera obligación de PAZO, ordinal **0**, como intervalo prospectivo entre activación y próxima factura observada por el comerciante, si un primer cargo regular resulta verificado. La imputación de pagos atrasados corresponde al ciclo original, **nunca crea un mes extra**. Los detalles están en `PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md` y `PAZO_F16_P05_LATE_PAYMENT_POLICY_APPROVED_20261014.md`.

## Implementación específica

El borrador no alojado `supabase/drafts/f16_p25_first_obligation_review_reservation_DO_NOT_APPLY.sql` agrega una tabla **solo para revisión** de obligación ordinal 0 y un RPC `service_role` privado. La función necesita un evento SALE.COMPLETED con lease P21 vivo y un P06 aceptado, publicado y firmado con SHA256, vinculado a la intención privada mediante la RPC P24. Solo puede reservar un único evento y venta para la primera obligación de un intent; protege la venta de ser usada por otra intención/usuario. La identidad del cliente y referencias no salen en el resultado de la RPC, únicamente un estado de revisión seguro.

**No registra pagos:** la tabla y la RPC no tienen campo de período ni estado `paid`. `mayRecordPayment=false`, `mayCreatePaidPeriod=false`, `mayGrantBenefits=false`, `paidThrough=null`. El identificador de venta es aportado por el futuro proceso privilegiado y no está respaldado por PayPal en esta propia función; incluso cuando el test lo acepta como reserva, **NO** significa pago/retención/ciclo comprobado.

La arquitectura de multirreembolsos anterior (`supabase/queries/f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql`) continúa siendo un laboratorio separado con sales/refunds y restricciones de suma; **P25 no concede ni activa esas funciones**. No se modifica el ledger alojado antiguo ni se integra el flujo de cobros.

## Pruebas y evidencia

La CI instala P21/P24/P25 en PostgreSQL 17 desechable, utilizando fixtures sintéticas de ofertas y compras; prueba que el trabajador apagado jamás reserva, rechaza un legacy sin P06, no admite token inválido/terminado, repite la misma obligación sin duplicar, bloquea otra venta para el mismo intento, y bloquea la venta de otro intent. Comprueba ACL/force RLS y ausencia de cambios en el ledger. La tabla de reembolsos que faltaba en la fixture original P05 se creó exclusivamente dentro de la transacción de test, y **no hubo alteración hosted**.

Commit técnico [5bec073](https://github.com/DigitalAppcorp/pazo-app/commit/5bec073b9a4d5678ee30f7b3102147f7d7fc3b6c) — **CI SUCCESS y F16 Disposable PostgreSQL Lab SUCCESS**.

Postflight de Supabase real, solo lectura: P21 `enabled=false/not_before=NULL`, 8 eventos QA pending sin token, 0 ledger payments, 0 reversals, 0 offers, 0 P06 consents, P25 tabla/RPC **ausentes**. Sin nuevo PayPal buyer, sin Edge deploy, sin activar beneficios ni hacer merge.

## Pendientes para la facturación real

1. Obtener sale ID mediante GET firmado/merchant y lease, no como prueba declarada desde el navegador o una devolución inyectada.
2. Vincular la evidencia verificable de primer cargo REGULAR a aceptación real de términos, ciclo contractual exacto, saldo anterior/retry y ausencia de refunds/disputas cuya cobertura no haya sido demostrada.
3. Definir asiento contable idempotente bajo transacción/lease con compatibilidad frente a reversos futuros, compensaciones y prohibición de coberturas duplicadas; mantener tabla existente segura. Los laboratorios anteriores ya contienen piezas aprovechables, pero no son un worker de producción.
4. Aprobar y publicar ES/EN definitivos conforme obligaciones de renovación, acuse conservable y política de retención.
5. Requerir GO individual para aplicar P22/P24/P25 a Supabase Sandbox, activar worker con cutoff prospectivo, crear buyer nuevo, habilitar checkout/beneficios, Live o merge. El PO conserva control.

**Siguiente punto:** F16-P26: conectar evidencia merchant auténtica a la reserva de revisión y diseñar ledger transaccional sin falsos períodos.
