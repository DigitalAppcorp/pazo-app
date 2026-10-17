# PAZO F16 — Fast track período pagado idempotente (2026-10-17)

**PO:** autorizó continuar el desarrollo acelerado de **Amigo de PAZO** $2.99 USD por mes con los cuatro beneficios aprobados, conservando PAZO gratis. **PR #44 DRAFT**, rama `f13/section-titles-20261012`. Esta etapa es exclusivamente código y prueba sintética, **NO** migración alojada, PayPal Live, pago, provisionamiento de secretos o activación de beneficios.

## Trabajo verificado

1. ZIP de insignias **originales** en conversación inspeccionado localmente: SHA256 `281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5`; cuatro PNG RGBA originales 543×545; hashes originales concuerdan con `scripts/f16-stage-approved-supporter-badges.ps1`. Se prepararon derivadas de tamaño web para QA, pero **NO** se reemplazaron por imágenes inventadas. El conector GitHub actual recibe texto/base64, no el recurso montado por referencia; **ningún PNG se ha commiteado**. Lo puede resolver Codex en estación local con el ZIP ya descargado y el script existente sin modificar pagos.
2. `supabase/drafts/f16_mvp_operator_period_writer_DISPOSABLE_ONLY.sql`: primera función privada para registrar períodos conciliados, con guardas `current_database()='f14_synthetic'`, rol SQL invoker `postgres` exclusivamente, nombre de schema privado, **sin grants a anon/authenticated/service_role**, serialización por lock de fila en `auth.users`, replay idéntico devuelve IDempotent, replay alterado bloquea, diferentes ventas que se solapan bloqueadas por owner, owner desconocido o marca merchant futura bloqueada.
3. `supporter_private.f16_mvp_record_merchant_hold`: solo operador, agrega holds de disputa/reembolso; no borra ni desactiva holds y no acepta mutar una identidad de evento ya usada. La proyección pública previamente verificada oculta beneficios del mes afectado.
4. `supabase/tests/supporter/f16-mvp-private-period-writer-synthetic.sql`: prueba en transacción ROLLBACK propietario válido, idempotencia, replay conflictivo, overlap, owner inexistente, prueba futura, disputa, replay del hold e invariantes de privilegios. No genera compras, usuarios ni créditos hospedados.
5. `.github/workflows/f16-postgres-inbox-lab.yml` prueba esa instalación SOLO en PostgreSQL 17 desechable, sin tokens ni URLs de proyecto alojado.

**Evidencia de CI:** commit `4202a279d8cca2c731f45f5c7f79ea144b3c76b2`: [CI #39041408100](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39041408100) **SUCCESS** y [PG Lab #39041408102](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39041408102) **SUCCESS**. Este documento/handoff posterior puede lanzar un nuevo CI que también debe verificarse. Ninguna migración en hosted ni secret creado.

## Criterios de conectividad que siguen sin cumplir

**IMPORTANTE:** la nueva función private acepta parámetros proporcionados por su ejecutor DBA; no autentica PayPal por sí misma. No instalar en la base alojada ni invocarla directamente desde un cliente web o un webhook genérico. Antes de habilitar un operador, se necesita integrar una cadena segura:

- Webhook PayPal **Live** con firma verificada y lease único, merchant correcto, Auth owner/intent y aceptación duradera de oferta real.
- GET independiente Merchant Sale, Subscription, Plan y Transactions: el lector actual solo devuelve `REVIEW_REQUIRED` y sigue `disabled`. No existe evidencia de pago real.
- Determinación estricta del `service_start` y `service_end` de cada ciclo contractual real por el calendario autorizado y el proveedor; no usar `next_billing_time` como prueba aislada ni sumar 30 días sin consentimiento.
- Reversals: ingestión, deduplicación y conciliación después de la venta; el GET ±48 horas no descarta reembolsos futuros.
- Migración revisionada que NO traslade guardas sintéticas de manera improvisada, acceso privado con permisos mínimos y rollback; cliente Auth solo RPC de lectura limitada. Confirmar con revisión específica de ACL/RLS y aprobación de PO antes de aplicarla al Supabase alojado.
- Pantalla de oferta ES/EN, consentimiento explícito renovaciones, recibo durable, checkout y cancelación Live separados y fail-closed, QA integral con los cuatro beneficios. Luego GO concreto para **una compra Live supervisada**, no antes.

## Próxima tarea concreta, sin repetir P42

**Codex local**: sincronizar PR #44, comprobar clean worktree, ejecutar el script de staging original `scripts/f16-stage-approved-supporter-badges.ps1 -ArchivePath <archivo ZIP local>`, confirmar exactamente cuatro PNG bajo `public/supporter`, ejecutar npm pruebas/build, revisar visualmente y commitear SOLO los PNG originales a la misma rama. No activar el flag `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED`, no desplegar, no tocar PayPal ni Hosted.

**Mientras tanto** seguir con reconciliación Payment/Period y cancelación Live de manera offline, sin ampliar P42. `F16_LIVE_NO_GO`.
