# PAZO F16-P42 — propuesta de claves y RPC alojada, DESACTIVADA (NO APLICAR)

**Decisión PO, 2026-10-16:** respondió «sí» a **preparar para instalación posterior**
la infraestructura de claves y el writer P42, conservándolo desactivado. **No**
autorizó instalar tablas/RPC en Supabase alojado, crear claves reales,
habilitar firmantes, cambiar Edge, registrar datos, procesar pagos o
desplegar el worker. P28 histórico permanece diferido; F16 NO-GO.

## Artefacto exacto para revisión

`supabase/drafts/f16_p42_hosted_keys_and_disabled_writer_REVIEW_ONLY_DO_NOT_APPLY.sql`.

No está en `supabase/migrations/`; NO EJECUTAR en hosted sin nuevo GO.

- Preflight exige propietario `postgres`, P40 presente y vacío, RLS
  forzada, inbox/intent/gate P21 presentes, worker apagado, ledger vacío
  y `pgcrypto` ya instalado. DDL hosted necesita un marcador transaccional
  **no incluido** en el archivo y una nueva autorización explícita.
- Tabla privada `supporter_private.p42_activation_signing_keys`:
  `key_id`, `key_bytes`, `enabled=false`, `not_before`,
  `not_after`, `created_at`. **CERO FILAS**; no genera ni incorpora
  credenciales. RLS ENABLE+FORCE y REVOKE ALL de roles cliente/service_role.
- Tabla privada `supporter_private.p42_activation_writer_gate`:
  fila única `id=1`, `enabled=false`, `not_before=NULL`.
  RLS FORCE y REVOKE ALL.
- El MAC incluye un **dominio literal `p42|sandbox|`**, separando entornos;
  no reutilizar la misma clave en Sandbox y Live. La futura firma
  del runtime debe coincidir exactamente con este contrato.
- `public.f16_p42_register_authenticated_activation(...)`:
  SECURITY DEFINER con search_path vacío y mínimos argumentos; acepta
  solo evento de activación, sucripción BOUND del plan correcto, origen
  posterior a cutoff de clave Y gate, HMAC SHA256 del evento/suscripción/
  fecha/nonce, TTL máximo 120s, fecha dentro de ventana de clave y
  entrada única de P40. Idempotencia solo para relación idéntica.
  **REVOKE EXECUTE a PUBLIC/anon/authenticated/service_role** en
  la misma transacción. Sin claves + sin gate + sin grants = 3 bloqueos.
- No toca suscripciones existentes, ni PayPal, ni pagos, ni descuentos,
  ni períodos o beneficios.

## Política PROPUESTA de generación, custodia y rotación — aprobación pendiente

1. **Generación:** CSPRNG fuera de GitHub/ChatGPT; clave aleatoria de
   al menos 32 bytes, independiente de PayPal OAuth/JWT/Supabase keys.
   Nunca usar la cadena sintética del laboratorio como clave real.
2. **Custodia:** copia de lectura exclusiva para el receptor verificado
   en un secret store de su runtime; copia del material para verificación
   dentro de la tabla privada propiedad del rol administrativo de DB.
   No exponer jamás `key_bytes` por PostgREST, SELECT de
   `service_role`, logs, analytics, variables `VITE_*`, SQL
   versionado o herramientas de chat. Examinar accesos `postgres`,
   backups/restores y políticas de secretos antes de aprovisionar.
3. **Activación:** ninguna clave debe quedar enabled, ni compuerta
   true, ni EXECUTE concedido hasta nueva aprobación PO específica.
   El navegador no debe poder invocar la función, ni siquiera pasando
   `service_role` (que nunca sale del backend).
4. **Rotación:** introducir nueva versión deshabilitada con
   `not_before` prospectivo, entregar la misma versión al receptor
   en una ventana coordinada, revisar que se pueda reintentar sin
   atribuir eventos previos; revocar la vieja versión tras período
   de validez de 120s más margen operacional validado. Mantener
   registros de clave (ID y fechas, no material) y procedimiento
   de emergencia para desactivar gate y revocar ambas versiones.
5. **Compromiso/revocación:** si hay fuga o desincronización:
   desactivar compuerta primero, revocar versión comprometida,
   mantener escrituras y procesador de pagos deshabilitados y
   auditar eventos/retenciones. No intentar acreditar períodos
   mientras la cadena de procedencia no sea independiente y confiable.
6. **Retención:** no registrar vínculos alojados hasta cerrar
   política legal/contable, finalización contractual, holds y
   eliminación/backups P40/P41. El criterio provisional aprobado
   «suscripción activa + 3 años tras terminación confirmada» no es
   todavía una implementación de borrado ni dictamen legal.

## Adaptador de backend de contrato P42 (NO CONECTADO)

- `supabase/functions/f16-paypal-webhook/p42HostedContractRecorder.mjs`:
  desactivado por defecto, admite únicamente host Supabase configurado,
  key ID versionado `P42_V1` (sin clave), y genera HMAC SHA-256
  `p42|sandbox|keyId|eventId|subscriptionId|issuedAt|nonce`.
  No se importa en `receiver.mjs`, no invoca PayPal y no incluye
  material criptográfico en el repositorio.
- `src/features/supporter/testing/f16P42HostedContractRecorder.test.mjs`
  comprueba mediante `fetchImpl` simulado la equivalencia criptográfica
  contra HMAC de Node, rechazo de host/versión/fuente inválidos,
  ausencia de envío de claves y modo OFF.
- La firma interna identifica solamente al backend que posee la clave;
  **no convierte una venta en pago acreditado**. El secreto real debe
  obtenerse de un proveedor seguro y no insertarse en chat ni frontend.

## Prueba antes de GO

La CI ejecuta este MISMO archivo en PG17 desechable,
`supabase/tests/supporter/p42-hosted-disabled-writer-pg17-rehearsal.sql`.
Comprueba sin clave/gate/execution, RLS/grants, rechazo de HMAC
alterado, evento histórico, otro propietario, venta no ACTIVATED,
revocación e idempotencia sintética con GRANT y clave **solo dentro
de una transacción de prueba, ROLLBACK al final**.

## Gate para instalar más adelante

- Auditoría y aprobación de esta política de claves, rotación y
  custodia (especialmente roles administrativos y backups).
- Revisar P42 SQL exacto: sin secretos ni filas activas, sin granted
  EXECUTE ni cambios a gate P21, P40 o ledger. Versionar migración.
- GO inequívoco para **instalar solo la infraestructura apagada**
  (separado del GO actual de preparación).
- Postflight alojado: 0 claves, gate false, 0 bindings P40, 0 pagos,
  nadie con permiso API EXECUTE; comparar migración/historial.
- Después, independiente y explícitamente: proveer claves reales,
  conceder EXECUTE y habilitar gate, integrar y desplegar Edge,
  probar con nuevo buyer Sandbox, y gates financieros/legales de F16.

**Ninguna activación, provisión real, DDL alojada o cargo autorizado por
esta decisión.**
