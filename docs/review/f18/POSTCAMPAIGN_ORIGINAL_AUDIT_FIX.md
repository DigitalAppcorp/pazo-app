# F18 — Auditoría del contrato original tras inicio de campaña

## Hallazgo reproducido en producción (26 Oct 2026)

La ejecución administrativa de `pazo-admin-paypal-original-audit` terminó HTTP 200
con `complete=false`, `eventReadable=false` y
`signedEventMatches=null`. No fue una prueba negativa de PayPal.

**Causa:** `public.pazo_f16_live_service_qa_original_scope()` (F16)
rechaza toda lectura salvo cuando la campaña `lifecycle='inactive'` y
`started_at IS NULL`. Actualmente existe **una** vinculación canario
anterior al corte por fecha de registro de usuario, la campaña está
`active`, `started_at` no es null, checkout/invitaciones están OFF,
existe exactamente un CREATED firmado HELD y un financial_review abierto.

El código administrativo reutilizaba la RPC F16 de **pre-campaña**,
de modo que abortaba antes de leer PayPal o el evento. La interfaz
ocultaba `auditCode`, y su resultado genérico parecía un fallo del proveedor.

## Corrección aislada propuesta (requiere gate SQL)

1. RPC nueva `pazo_f18_live_service_original_evidence_scope`: solo
`service_role`, `STABLE`, `SECURITY DEFINER`, `search_path=''`,
`gradual_require_service()`. Lee únicamente el **canario original
vinculado**, exige generación fijada en release control, registro prebeta
del usuario, **exactamente una** intención, **exactamente un** recibo
firmado CREATED en inbox HELD, checkout/invitaciones pausadas, campaña
iniciada y financial_review abierto. No acepta argumentos.
2. El auditor reutilizable ahora distingue explícitamente el alcance
`prebeta` original (valor predeterminado, sin cambios del worker) del
`admin_postcampaign` autorizado. No modifica la antigua RPC
ni el despachador de conciliación.
3. Resultado con `auditCode` tipificado, estado de lectura del evento
y respuesta HTTP PayPal cuando existe. La UI administrativa lo explica
sin afirmar cobro/cancelación y sin exponer comprador, secretos, IDs
de PayPal, raw provider, ni debug IDs.
4. Pruebas sintéticas de 404, lectura de webhook fallida, path antiguo
intacto, filtrado de datos privados y barreras SQL.

## Gate de despliegue

- **Este PR no modifica Supabase hospedado ni Vercel hasta autorización.**
- Antes de aplicar SQL: revisar advisors/RPC grants, migración
`20261026043000`, CI/F18 PG17, conciliación exacta de archivos.
- Aplicar la migración solo tras aprobación específica, verificar
`EXECUTE` exclusivo para `service_role`, que la antigua RPC siga
rechazando campaña iniciada y que no se modificaron datos financieros.
- Desplegar solo nueva versión de la función administrativa con
`verify_jwt=true`, 19/19 archivos verificados.
- Publicar UI corregida después del backend, confirmar alias/cambios
sin variación del flujo de PayPal del consumidor.
- El Product Owner hace un solo clic con TOTP fresco para recuperar
`auditCode`, estado real del evento y HTTP desde PayPal.

**Nunca** establecer campaña en `inactive` para forzar la auditoría,
desretener el evento, autorizar un beneficio, reabrir compras, crear o
cancelar suscripciones basándose en un 404.
