# PAZO F16 — conservar ocho eventos Sandbox + tres PAYMENT.SALE

## ACTUALIZACIÓN DE ESTADO 2026-10-14 — GATES A+B HOSTED: PASS

- Autorización PO `si` entregada expresamente por Codex para aplicar exclusivamente SQL de los 11 tipos, auditar, y **solo después** desplegar Edge Sandbox. Ejecutado y cerrado en ese orden.
- Migración registrada en Supabase con **versión real `20261014094349`**, renombrada en GitHub de la versión CLI original `20261014085430` a `supabase/migrations/20261014094349_f16_preserve_two_subscription_lifecycle_events.sql` sin cambiar contenido SQL. Postflight: restricción inbox y RPC permiten once eventos; owner, SECURITY DEFINER, search_path vacío, RLS forzado y privilegios service_role exclusivos preservados; 0 entradas financieras/eventos/cuota.
- Edge `f16-paypal-webhook` desplegada versión **13 ACTIVE**, ocho archivos idénticos a GitHub SHA `277d52e6`, latch true, solo Sandbox, JWT desactivado exclusivamente por webhook firmado; legacy v35 intacta. Smoke HTTP real [#38544817793](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38544817793) GET 405, POST no firmado 400 (PASS). Sin notificación firmada auténtica ni pagos.
- PayPal **NO modificado**: webhook con destino distinto, ocho eventos existentes y tres SALE faltantes. Script `ApplyWebhook` permanece bloqueado por revisión pendiente del host externo anterior; se requiere identificar dependencia/propiedad antes de redirigir.
- Evidencia/stop rules: `docs/PAZO_F16_ELEVEN_EVENT_HOSTED_CLOSEOUT_20261014.md`. El texto histórico inferior «no aplicar sin GO» queda superado **solo para la migración aplicada y Edge v13**, NO habilita cambios PayPal.

**Estado (2026-10-14 UTC): PREPARADO EN GITHUB, NO DESPLEGADO NI APLICADO.**
**Alcance de aprobación vigente:** el PO autorizó editar el webhook PayPal EXISTENTE, pero NO ha autorizado aún una nueva migración de Supabase ni desplegar un receptor que procese 11 tipos. Detener `ApplyWebhook` hasta ambos PASS.

## Confirmación objetiva

GET `-Check Resources` del PO contra el mismo PayPal Sandbox app:
- Plan `P-14V25407JP6850922NLHMDKI` ACTIVE USD 2.99 MONTH/1.
- Webhook `6N7889790V1467139` con destino todavía `different_host`.
- Ocho eventos actuales: seis `BILLING.SUBSCRIPTION.*` requeridos y **`BILLING.SUBSCRIPTION.CREATED`** + **`BILLING.SUBSCRIPTION.RE-ACTIVATED`**, confirmados por catálogo oficial PayPal.
- Faltan `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`. Sin duplicados ni wildcard.
- La antigua herramienta abortó **ANTES** del PATCH: `resource_preflight / webhook_events_unexpected / no_mutation_attempted`.

El destino actual es un host DISTINTO, no auditado. Redirigir cambiará el receptor de **los once** eventos. Conservar un tipo en la lista no garantiza conservar la lógica de cualquier integración anterior; validar que no hay consumidores relevantes antes de redirigir. Un POST PayPal 2xx significa entrega admitida, no necesariamente beneficio aplicado.

## Código preparado sin efectos remotos

- `src/features/supporter/testing/paypalSandboxWebhookPatchContract.mjs` ahora exige **los ocho tipos existentes concretos** sin wildcard, adicionales ajenos ni mezcla de estados; añade **solo** tres tipos SALE y verifica once después del único PATCH. Debe negarse ante otro ID, tipo inesperado o alteración concurrente.
- `supabase/functions/f16-paypal-webhook/core.mjs` ahora conserva ambos lifecycle tipos en allowlist. La verificación de firma, los límites worker/global y la escritura mínima en inbox siguen siendo obligatorios: no ACK 2xx de eventos conocidos si falla DB, nunca adquirir membresía, alterar perfil ni escribir ledger al recibir webhook.
- `supabase/functions/f16-paypal-webhook/paypalInboxAdapter.mjs` acepta el guion en `RE-ACTIVATED`, **solo** para pasarlo a la RPC con allowlist SQL; rechazo temprano de formato inválido permanece.
- **Migración CLI versionada** `supabase/migrations/20261014085430_f16_preserve_two_subscription_lifecycle_events.sql`. Amplía exclusivamente el CHECK de `supporter_private.paypal_verified_event_inbox.event_type` y la allowlist de `public.f16_paypal_record_verified_event(text,text)`, sin cambiar propietario, privilegios, RLS, idempotencia, confirmaciones ni pagos. Generada por Supabase CLI en un runner efímero [#38538453624](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38538453624); el workflow temporal fue retirado. **Nunca aplicar sin GO específico PO.**
- `.github/workflows/f16-postgres-inbox-lab.yml` aplica esta migración **solo** en PostgreSQL 17 descartable con test `supabase/tests/supporter/f16-preserved-lifecycle-events-synthetic.sql`; verifica 11 referencias firmadas desde RPC, duplicados, conflicto ID/tipo, seguridad roles/RLS y que no cambie el ledger ya existente en pruebas.
- Se instaló un **bloqueo explícito local**: `scripts/f16-paypal-sandbox-plan.ps1 -Check ApplyWebhook` se niega mediante `$F16ElevenEventBackendReady = $false` incluso antes de pedir credenciales. Este bloqueo solo debe retirarse tras postflight SQL y despliegue Edge verificados, con nueva revisión GitHub. `-Check Resources` sigue siendo read-only.

## Gate técnico siguiente (NECESITA autorización PO nueva)

1. PRE: CI general/PG PASS en HEAD, SQL actual host NO aplicado y Edge alojada `f16-paypal-webhook` v12 acepta solo nueve tipos, cuatro tablas financieras cero, presupuesto global cero, webhook PayPal aún en `different_host`.
2. **GO A**: aplicar exclusivamente la migración versionada anterior a Supabase, sin tocar PayPal. Registrar versión real Supabase, renombrar archivo a timestamp registrado si difiere, revalidar ACLs/owner/RLS, la nueva constraint y función. Ninguna prueba productiva de inserción con eventos inventados.
3. **GO B**: desplegar la misma función Edge Sandbox con 8 módulos desde HEAD validado que incluye los dos lifecycle tipos y el fix de regex, manteniendo `verify_jwt=false` solo para PayPal firmado, `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=true`, sin Live, checkout, ledger, badge ni entitlement. Smoke HTTP GET=405/unsigned POST=400, y checks host 0.
4. Solo con ambos PASS liberar el latch del script local y volver a certificar CI. Después el PO puede ejecutar el PATCH **ya previamente autorizado** para URL y 11 tipos, introduciendo sus credenciales en Windows (un solo PATCH y GET final; no retry automático). No automatizar esta fase antes de validar posible dependencia del host anterior.
5. Aun después del PATCH, exigir gate separado para un evento PayPal auténtico Sandbox, duplicado firmado y reentrega 503/conciliación. Nunca asumir acreditación, cobro real o acceso premium sin verificación bancaria/plan/propietario y worker separado.

**En este gate no se cambió Supabase alojado ni PayPal.** Desplegar core 11 sin la migración SQL dejaría eventos RE-ACTIVATED reintentando con 503 por constraint; aplicar solo migración y no desplegar core 11 dejaría ACK `verified_unhandled_event`. El orden SQL → Edge → PayPal evita ambas ventanas.

Fuentes: https://developer.paypal.com/subscriptions/webhooks/ ; https://developer.paypal.com/api/webhooks/v1/webhooks-update/ ; https://supabase.com/docs/guides/database/functions .
