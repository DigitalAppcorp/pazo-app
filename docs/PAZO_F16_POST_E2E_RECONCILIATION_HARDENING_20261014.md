# PAZO F16 — Endurecimiento de conciliación después del E2E real (2026-10-14)

## Alcance de este gate: código y QA sintético solamente

El Product Owner indicó «ok sigamos» después del E2E Sandbox real confirmado. Se continúa ingeniería del backend financiero **sin ejecutar escrituras alojadas, Worker, cron, migraciones, PayPal Live, cobros reales ni concesión de membresías**. Supabase SQL `20261014094349` y Edge `f16-paypal-webhook` v13 permanecen intactos. No activar el checkout ni repetir evento PayPal.

## Riesgos corregidos en PR #44

1. **No atribuir pagos sin propietario Auth vinculado:** `assessPaypalSandboxPayment` requiere ahora `intent.state='bound'`, plan fijo, `verifiedOwnerBinding=true`, owner UUID y coincidencia de subscription ID + PayPal `custom_id`. `readOnlyReconciler` bloquea temprano si no existe un intent privado unido de servidor. La prueba con cuenta Personal Sandbox tiene **0 intents privados** por diseño; incluso con SALE.COMPLETED auténtico, jamás se debe acreditar a una cuenta de PAZO.
2. **No interpretar un listado parcial como todo el historial:** `paypalSandboxTransactions.read` exige `total_pages` y `total_items` enteros y coherentes, una sola página o cero registros legítimos, sin discrepancias; los campos ausentes bloquean. Los tests verifican missing/contradicciones, y se preserva la eliminación de PII.
3. **No escoger arbitrariamente un ID de pago duplicado:** tanto adaptador PayPal como conciliador bloquean repeticiones de transaction ID, incluso si parecen iguales. Esto evita ignorar un REFUNDED ante otro COMPLETED con la misma identidad.
4. **No ignorar tombstones malformados:** `knownReversalIds` debe existir y contener solo IDs válidos; en incertidumbre se devuelve `reversal_state_unknown`, sin ledger candidate.

## Pruebas y evidencia

Pruebas offline ampliadas:
- `src/features/supporter/testing/f16PaymentReconciliation.test.mjs`;
- `src/features/supporter/testing/f16ReadOnlyReconciler.test.mjs`;
- `src/features/supporter/testing/f16PaypalSandboxTransactions.test.mjs`.

El workflow `npm run test:f16:synthetic` las incluye en CI, junto con el PostgreSQL descartable. Registrar sus resultados solo al verificarlos después del commit.

## Gatillos futuros y límites explícitos

- Cuatro eventos reales ya alojados siguen `pending`: CREATED, ACTIVATED, SALE.COMPLETED, CANCELLED; esta fase **no los procesa ni purga**.
- Los 90 días del inbox solo corren tras **conciliación definitiva**. Retención de intents/pagos/reversos requiere decisión y revisión legal separadas.
- Pagos validados -> **candidato privado uncredited**, no cobertura automática. Hay que diseñar la atribución por owner Auth, el procesamiento exclusivo de eventos verificados, el pipeline ACID, reversos antes y después del pago, auditoría de periodos confirmados y política de cancelación/reembolso.
- No desplegar este código aislado sin comprobar compatibilidad de proveedor PayPal y habilitación/contabilidad, con GO del PO.
- No actualizar `wall_has_verified_entitlement`, `profiles.is_founder`, badge o muro. CI PASS no prueba dinero ni legalidad.
