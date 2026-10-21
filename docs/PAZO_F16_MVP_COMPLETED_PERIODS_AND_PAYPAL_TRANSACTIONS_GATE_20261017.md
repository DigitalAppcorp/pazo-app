# F16 MVP — Verificación de períodos COMPLETADOS y transacciones de suscripción (2026-10-17)

**GO del Product Owner:** «ok go» para proseguir el desarrollo acelerado de Amigo de PAZO US$2.99/mes con los CUATRO beneficios ya aprobados. **No** autoriza PayPal Live, escritura financiera en Supabase alojado, despliegues ni pagos reales. PR #44 DRAFT, rama `f13/section-titles-20261012`.

## Corregido: medallas de constancia

**Regla:** un período cuenta para medallas 3/6/12 solo si `service_end <= now` **y** fue cobrado, acreditado, verificable y no revertido. El mes actualmente transcurriendo sigue dando insignia y fondos pero **no cuenta como mes completado**. Se respetan cancelaciones sin reembolso durante el período ya pagado.

- `supabase/drafts/f16_mvp_verified_paid_period_source_DISPOSABLE_ONLY.sql`: conteo PG17 de `completedCycles` exige `c.service_end <= p_as_of`; `active` exige un período vigente sin hold.
- `supabase/functions/f16-paypal-webhook/pazoSupporterBenefitsV1.mjs`: mismo criterio en proyección offline server-only.
- Casos SQL en `f16-mvp-private-paid-periods-synthetic.sql` y `f16-mvp-four-benefits-pg17-synthetic.sql` cubren un tercer mes actual vs TRES períodos ya completos + cuarto actual.
- `src/features/supporter/testing/f16MvpServerBenefits.test.mjs`: casos 3 y 12 meses, pago adelantado, vencimientos, reembolsos y reclamaciones inválidas.
- CI y PG Lab de commit `b33d0502a343fa122ed569fae2e47a32816cb7be`: **CI #39040388115 SUCCESS**, **PG17 #39040388110 SUCCESS**.

## Corregido: corroboración PayPal Subscriptions v1

La API oficial de PayPal permite `GET /v1/billing/subscriptions/{id}/transactions` y reporta `COMPLETED`, `PENDING`, `FAILED`, `DECLINED`, `REFUNDED` y `PARTIALLY_REFUNDED` separados. Fuentes: https://developer.paypal.com/api/subscriptions/v1 y https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/ .

- `pazoPaypalLiveSubscriptionTransactionsProof.mjs`: validador puramente offline, exige id de transacción exacto al del evento merchant firmado, `COMPLETED`, gross US$2.99, marca temporal próxima al evento ya verificado, listado de una sola página completo y sin duplicados; **NO acredita `paidThrough`**.
- `pazoPaypalLiveSaleEvidenceReader.mjs`: antes emitía 3 GET, ahora requiere **4 GET**: Sale, Subscription, Plan y Subscription Transactions; cuarto usa ventana ±48 horas de la fecha de un evento previamente verificado y checa el listado COMPLETED. Prohíbe cambios de plan/cantidad, merchant mismatches y habilitar checkout/beneficios. Debe permanecer `enabled=false` hasta disponer de integración privada de eventos y credenciales correctamente autorizada.
- Pruebas `f16MvpPaypalSubscriptionTransactionsProof.test.mjs` y `f16MvpPaypalLiveSaleEvidenceReader.test.mjs` cubren 404, duplicados, respuesta parcial, precio distinto, moneda, reembolso, reclamos inventados y ausencia de credenciales. No se conectaron cuentas reales ni se registró dinero.
- CI y PG Lab commit `fe450aeca3187db52facfcc03fff3db961536e4b`: **CI #39040660793 SUCCESS** y **PG17 #39040660795 SUCCESS**.

**Límite importante:** listar transacciones alrededor de una fecha **NO** demuestra la ausencia de reembolsos posteriores o disputas y jamás establece por sí solo límites contractuales de servicio. Se requiere monitorización/verificación adicional de reversals y fuente definitiva de `service_start/service_end` ligada al merchant y al usuario. Esta lectura independiente es una condición, no una autorización de escritura.

## Insignias originales — paquete inspeccionado, importación pendiente

En la sesión se verificó el ZIP `pazo-supporter-insignias-4.zip`, SHA-256 exacto `281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5`, con cuatro PNG originales:

- Inicio `4f8fa4d2616ab82863d57a09975603722beea51bc5b0e7b932b72d4377d192cf`
- 3 meses `ff363fb865275019b718beb8cf6d3c432989fea408737cf56f1f6d32e4a2e211`
- 6 meses `d1b6bbde37de8ce9d965ab30bf84158e2ddc76ee13a8398cad23eb57d5dbd003`
- 12 meses `a62f7bf8d9fb78dcd50279f93780dcf36d95e61b5ed85c1414c6b120a3d319f5`

Son binarios legítimos de diseño; el conector GitHub disponible permite editar texto, pero no enviar automáticamente los bytes montados del archivo al repositorio. **No fingir que están commiteados**. El importador `scripts/f16-stage-approved-supporter-badges.ps1` ya existe y los hashes corresponden con el ZIP. El PO/Codex puede ejecutar en su checkout de Windows:
```powershell
.\scripts\f16-stage-approved-supporter-badges.ps1 -ArchivePath "C:\RUTA_PRIVADA\pazo-supporter-insignias-4.zip"
```
Luego hacer `git add public/supporter/*.png`, revisar exclusivamente los cuatro binarios, ejecutar pruebas y subirlos a PR #44. No activar Live ni flag de beneficios por instalar los PNG.

## Fase siguiente mínima

1. Importar cuatro PNG originales en PR #44 mediante Codex local.
2. Construir la **primera escritura privada** a períodos acreditados, con privilegios restringidos, correlación de evento + intent + invoice, plazo real, prueba merchant y bloqueos/reversals. Antes de modificar Hosted, revisión de permisos y GO específico.
3. Checkout/ack/cancel Live separados y cerrados por defecto, con oferta y términos de los cuatro beneficios, revisión California; E2E Sandbox del nuevo flujo, luego GO explícito primera compra supervisada.
4. QA visual final del PO. PAZO sigue gratis; membresía US$2.99/mes.

**Estado:** código offline PASS, sin preview nuevo, sin PayPal Live, sin migración hosted, sin pagos, sin beneficios desplegados. P42 writer/P21 worker continúan OFF según última revisión read-only. `F16_LIVE_NO_GO`.
