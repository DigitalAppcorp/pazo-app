# PAZO F16 — Gate de instalación de cuota global de webhooks Sandbox

**Estado: PREPARADO Y VALIDADO EN LABORATORIO. NO INSTALADO EN SUPABASE.**
**Autorización PO vigente:** crear y verificar código, pruebas y migración en GitHub. NO autorizó ejecutar DDL alojado, cambiar PayPal, desplegar Edge, activar checkout, crear cargos ni entregar membresías.

## Artefactos y dependencia estricta

- Migración CLI versionada: `supabase/migrations/20261014070015_f16_global_webhook_admission.sql`. Nombre generado con Supabase CLI 2.120.0 en GitHub Actions de un solo uso [#38525547649](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38525547649); el generador temporal se eliminó.
- `supabase/queries/f16_global_admission_preflight_READ_ONLY.sql`: confirma solo existencia/ACL/RLS/propietario, sin leer personas ni transacciones. Pre-migración debe devolver tabla/rpc ausentes; pos-migración debe comprobar `t|t|t|t|f|f|t` para los siete indicadores en orden.
- `.github/workflows/f16-postgres-inbox-lab.yml` aplica la **misma migración** contra PostgreSQL 17 descartable e inspecciona ACL/RLS, límite diario y minuto, y 40 intentos simultáneos.
- Código F16 preparado: `globalAdmissionAdapter.mjs` + `workerAdmissionGate.mjs`, con dependencia cerrada en `receiver.mjs` y `core.mjs`. Ninguno está desplegado en el receptor alojado v10.

## Contrato de la migración

- Crea SOLO `supporter_private.f16_webhook_request_budget`, privada, con 2 filas (`minute`, `day`), enteros agregados sin identificadores de cliente, evento, pago ni IP; RLS activada y forzada, sin privilegios de tabla para `anon`, `authenticated` ni `service_role`.
- Crea SOLO `public.f16_paypal_try_admit_global()`: `SECURITY DEFINER`, propietario postgres, `search_path = ''`, permisos EXECUTE revocados a PUBLIC/anon/authenticated y otorgados únicamente a service_role. La función de nombre fijo no acepta argumentos controlados por el usuario.
- Utiliza `pg_try_advisory_xact_lock` para rechazar contención sin esperar; ventanas de minuto/día UTC y cotas provisionales de **30 intentos/minuto y 2,000/día para TODO el receptor**, no por usuario, sin crear tablas históricas.
- Una cuota agotada, la ausencia de la RPC o fallo de DB produce 503 reintentable **sin llamar a PayPal ni devolver ACK 2xx**. El presupuesto se consume antes de verificar firmas: un atacante con cabeceras válidas de forma puede agotar la cuota aunque no posea una firma real.
- **No es firewall ni tope de consumo Supabase**: incluso los rechazos cuentan como invocaciones Edge. Un ataque puede provocar reintentos, retrasos o pérdida de notificaciones si no existe reconciliación independiente. Es una medida de limitación del trabajo costoso saliente, no de disponibilidad garantizada.

## Secuencia de autorización futura — separada

1. Antes de cualquier mutación, registrar en la conversación un **GO explícito del PO solo para aplicar esta migración**, después de verificar el HEAD CI, catálogo Supabase, cuotas Free, y la lista de migraciones alojadas. Comprobar que el nombre CLI `20261014070015` no fue aplicado ni colisionó y que `supporter_private` existe.
2. Tomar evidencia de preflight READ ONLY y control de acceso. Nunca recopilar claves ni datos de comprador, ni mover el webhook a la Edge inerte.
3. Solo tras GO, aplicar **exactamente** el contenido versionado a PAZO alojado siguiendo el procedimiento Supabase autorizado. Postflight lectura: función y tabla existen, RLS forzada, owner `postgres`, ninguna ejecución `anon/authenticated`, ejecución `service_role`, sin tocar tablas financieras, consentimientos ni `profiles.is_founder`.
4. La aplicación **NO activa el receptor**: debe continuar versión alojada v10 con latch `false` y respuesta 503. Requerirá otro GO para desplegar bundle F16 completo y activarlo; y un GO diferente para reparar el webhook preexistente (dominio incorrecto y 3 eventos faltantes).
5. Antes del GO de recepción, ensayar reentrega auténtica de PayPal Sandbox, idempotencia de inbox y reconciliación ante cuota agotada/503. No certificar con el simulador de eventos. Con presupuesto de 30/minuto, un pico de entregas legítimas puede ser rechazado; el PO debe aprobar explícitamente los umbrales operativos.

## Reversión y límites operativos

**Rollback conservador después de una futura instalación:** mantener el receptor desactivado; no redirigir eventos al endpoint antiguo `paypal-webhook`. Si el SQL falla en una transacción antes de COMMIT, revertir toda la transacción; si se aplicó correctamente, **no borrar de inmediato** tabla y función tras una prueba fallida de Edge. Conservar el estado agregado hasta decidir y autorizar una reversión DDL independiente y comprobar que no existen entregas pendientes.

**Plan Free:** según documentación Supabase vigente, 500,000 invocaciones Edge mensuales compartidas por organización; no cobra excedentes en Free, pero puede restringir uso abusivo. Spend Cap es de Pro, no de Free. Revisar manualmente Usage/Edge Function Invocations antes y después de cualquier prueba; 50/75/90% son umbrales de observación propuestos, **no alarmas configuradas**. No crear infraestructura, dominios, cuentas ni servicios de pago sin GO.

**GO de esta fase = preparar artefactos y certificar CI del HEAD. NO-GO para mutaciones alojadas, PayPal Live, pagos, checkout, badges o entitlement.**

Fuentes: https://supabase.com/docs/guides/deployment/database-migrations ; https://supabase.com/docs/guides/platform/cost-control ; https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations .
