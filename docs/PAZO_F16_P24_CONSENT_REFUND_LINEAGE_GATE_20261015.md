# PAZO F16-P24 — Consentimiento original por claim y reembolsos asociados

**2026-10-15. PR #44 DRAFT.** El PO dijo «ok sigue» para avanzar técnica, sin otorgar autorización adicional de Supabase hosted/PayPal.

## Por qué se implementó

Las pruebas F16-P22/P23 identificaron el evento firmado y el intento BOUND, y comprobaron ventanas de transacciones y una instantánea de disputas, pero **no podían demostrar consentimiento original del contrato P06 ni el linaje de refunds de una venta concreta**. PayPal distingue refund de SALE (API heredada v1) y refund de CAPTURE (API v2); sus IDs no deben intercambiarse. Ver [legacy Refund definition](https://developer.paypal.com/api/deprecated/payments/v1/definitions/refund-2) y [Payments v2 refunds](https://developer.paypal.com/api/payments/v2/definitions/refund/).

## Entregables versionados

- `supabase/drafts/f16_p24_claim_scoped_consent_lineage_DO_NOT_APPLY.sql`: **SOLO LAB.** Añade RPC de lectura segura `public.f16_p24_read_claimed_original_consent(text,uuid,text,text)` bajo `SECURITY DEFINER`, `search_path=''`, permiso EXECUTE service_role únicamente. Exige reserva válida/expiración futura del evento firmado SALE.COMPLETED, gate P21 ON con cutoff prospectivo, intento BOUND con owner exacto, consentimiento P06 y referencia de oferta publicada inmutable con SHA256 correcto y precio USD 2.99/mes. Valida publicación/consentimiento antes de provider create/bind/evento. **No es una instalación hosted**, y no incluye el texto completo de términos, datos de tarjeta ni acceso genérico a usuarios.
- `supabase/tests/supporter/p24-p06-contract-fixture.sql`: tabla sintética que refleja un subconjunto de las columnas ya existentes en hosted P06 y rellena únicamente datos ficticios bajo transaction. La fixture usa digest ficticio para probar comparaciones; NO es una oferta legítima ni un seed.
- `supabase/tests/supporter/p24-consent-lineage-synthetic.sql`: se ejecuta íntegramente dentro de PG17 descartable. Comprueba restricciones de rol/owner/lease, bloqueo por gate OFF, consentimiento ausente en el buyer histórico, SHA incorrecto, publicación ausente, lease falso y terminado y ledger cero. Todo se revierte; sin crear personas, facturas o PayPal requests.
- `supabase/functions/f16-paypal-webhook/p24RefundLineageLab.mjs` y `src/features/supporter/testing/f16P24RefundLineageLab.test.mjs`: algoritmo **puramente sintético**, sin red, que revisa múltiples refunds con eventos firmados únicos, referencias correctas a la venta original, estados y importes USD 1..299 centavos, acumulado ≤299 centavos, UTC y temporalidad. Reembolsos parciales y totales, estado pending, refunds sin firma o SALE/capture cruzados siempre demandan revisión; incluso un resultado consistente **NO** acredita mensualidad ni beneficios. Falta código de proveedor PayPal original GET y autenticidad de callbacks merchant.

## Evidencia

[Commit e3bdca5](https://github.com/DigitalAppcorp/pazo-app/commit/e3bdca58cb6a0a43951a593131205a7a9b19e61c): **CI general SUCCESS; F16 Disposable PostgreSQL Lab SUCCESS; P21/P22/P24 rehearsal SUCCESS**. Prueba hosted solo lectura: gate P21 `enabled=false`, `not_before=NULL`, ocho eventos antiguos intactos, `payments=0`, `reversals=0`, `offers=0`, `consents=0`, RPC P24 no instalada. PR sin merge, Edge sin nuevo deploy manual, backend no ejecuta estos módulos.

## Gates hasta cobros reales

1. Revisión y aprobación legal de oferta ES/EN P13 y términos P06, renovación automática, cancelación online, acuse entregado, retención de consentimientos y registros financieros.
2. Instalar el RPC P22/P24 solo si PO lo autoriza, después de revisar SQL de ambiente real; habilitar worker en nuevo gate con fecha prospectiva aprobada. No usar las ocho notificaciones QA antiguas.
3. Conectar lector auténtico merchant PayPal Sandbox para SALE legacy y refunds, transacciones completas, disputas y lifecycle firmado con scope de negocio demostrado. Los resultados P24 no afirman que un evento esté firmado ni que el comercio no tenga chargebacks ocultos.
4. Probar atribución del primer período y renovaciones usando obligación contractual verificable (no sumar 30 días a venta ni confiar solo en `next_billing_time`); asiento contable idempotente con reserva vigente, compensación de reembolsos y lógica de entitlement revocable.
5. Un único nuevo buyer descartable y checkout Sandbox solo tras GO explícito, sin publicar promesas que el producto no cumple. Live y merge requieren aprobación aparte.

**Estado actual:** PAZO gratuito. Amigo US$2.99/mes OFF, `paidThrough=null`, `mayRecordPayment=false`, `mayGrantBenefits=false`.
