# PAZO F14 A3 — Worker de revisión servidor y journal CAS

**Fecha:** 2026-10-09. PR #38 DRAFT. **No desplegado** y **no realiza eliminaciones**.

## Implementación

- `supabase/functions/f14-a3-account-deletion/worker.ts`: motor de revisión server-only. Inspecciona diez gates en orden, valida el estado reviewing y la reserva vigente antes/después de inspeccionar, utiliza evidencia nueva en cada reintento, graba resultado sanitizado de cada paso e interrumpe ante faltante/error. El resultado más avanzado es review_required, con irreversibleAllowed=false incluso si todos los gates pasan.
- `supabase/functions/f14-a3-account-deletion/adapter.ts`: adaptador server-only para RPC privilegiadas. Verifica por servidor estado, lease, revisión y actualización con compare-and-set. Los verificadores de gate se inyectan desde el servidor; faltando uno, retorna missing_evidence y bloquea. No acepta bools de navegador ni promueve contenido/identidades a logs. Hay un handler index.ts en código de borrador, pero la función está DESHABILITADA por configuración y variable de servidor, y NO existe Edge deploy de este worker.
- `supabase/drafts/20261009_f14_a3_worker_checkpoint_NOT_APPLIED.sql`: **sexta migración DRAFT** con BEGIN y RAISE EXCEPTION intencional antes de DDL. Tablas privadas de checkpoint y eventos (job, revisión, gate, outcome, código de error sin datos personales); RPC service_role-only para estado, versión y journal. Exige lease actual bajo FOR UPDATE y CAS para bloquear doble grabación; ninguna función de borrado.

## Evidencia verificada

- Tests Node de worker: fallo cerrado para estado/claim inválido, lease vencido durante inspección, ausencia de evidencia, errores saneados, duplicidad/conflicto CAS, reintentos que revisan de nuevo y resultado no destructivo con todo verificado.
- Tests Node de adaptador: RPC y parámetros correctos, no se creen permisos de eliminación, puertas sin verificador fallan cerradas, datos malformados/errores no devuelven secretos.
- PostgreSQL real con transacción temporal + ROLLBACK: las tres RPC del journal adaptadas a pg_temp se compilaron; 2 eventos registrados sintéticamente con revisión 2; rechaza token erróneo y expected_revision antigua. No afectó producción ni instaló tablas.
- GitHub Actions [#38003551960](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38003551960) PASS del motor, [#38003843415](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38003843415) PASS de la migración tras corregir una URL en test, [#38003932473](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38003932473) PASS del adaptador.

## Límites y siguiente gate

- Sigue sin existir transición backend confiable de requested a reviewing (incluye reautenticación server-side), servicio Edge invocable, freeze integral de escrituras, validadores independientes para los diez gates, mitigación de Auth/JWT, Storage API/CDN ni borrado final. La revisión **no es un worker destructivo completo**.
- No generar ni contratar proyecto Supabase adicional ni activar migraciones sin autorización nueva. Tests sintéticos de una transacción no son tests de carrera real entre dos conexiones.
- UI A3 OFF. PR #38 DRAFT, PR #37 y #36 DRAFT; main y Supabase hospedado intactos. Nunca presentar review_required como cuenta eliminada.

## A3.4d — Entrada HTTP interna preparada, DESHABILITADA (2026-10-09)

- `supabase/functions/f14-a3-account-deletion/http.ts` valida método POST, secreto de invocación del servidor (comparación hash SHA-256), Content-Type JSON, cuerpo máximo 1024 bytes, formato de job/lease y errores sanitizados. Nunca concede CORS ni devuelve datos privados o secretos; tampoco tiene operaciones de borrado.
- `index.ts` envuelve el motor de revisión y un cliente service-role creado SOLO en servidor. El modo por defecto es apagado salvo PAZO_A3_REVIEW_WORKER_ENABLED=true y secreto servidor PAZO_A3_REVIEW_INVOKE_SECRET de 32+ caracteres; aun activado, NO hay verificadores de seguridad aprobados registrados, por lo que siempre bloquea ante evidencia ausente. No solicitar ni crear estas variables hasta gate de despliegue.
- `supabase/config.toml`: [functions.f14-a3-account-deletion] enabled=false, verify_jwt=true. Dos barreras de desactivación independientes. NO se ha publicado ningún endpoint ni configurado un secreto.
- `http.test.mjs` prueba flag OFF, llamada sin secreto/autenticación, cuerpo grande, peticiones inválidas, ausencia de CORS, resultado bloqueado y eliminación de detalles de errores. Se necesita prueba Deno/Supabase Edge real antes de cualquier deployment. CI no sustituye el test de gateway JWT.
