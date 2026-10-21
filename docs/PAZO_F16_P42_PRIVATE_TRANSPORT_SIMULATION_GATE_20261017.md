# PAZO F16-P42 — Gate de transporte privado SIMULADO (sin provisión)

**Fecha:** 2026-10-17. **Rama:** `f13/section-titles-20261012`; **PR #44:** DRAFT. **Alcance autorizado:** únicamente preparación, código y pruebas sintéticas; ninguna credencial real, ni modificación de servicios alojados. **Estado financiero:** F16 NO-GO.

## Precedencia / trabajo reutilizado

- Documento vigente: `docs/PAZO_F16_P42_PRIVATE_DUAL_CHANNEL_OFFLINE_GATE_20261017.md`. **No repetir** la preparación anterior ni las pruebas P43B de acceso read-only; su intento único ya fue consumido y comunicado PASS por el Product Owner.
- `scripts/f16-p42-private-dual-channel.offline.mjs` fija proyecto, nombre Edge, `P42_V1`, ventana UTC exacta de 24h, SQL parametrizado y cuerpos JSON sintéticos.
- PostgreSQL real para futuras escrituras sigue **NO VERIFICADO**; el acceso read-only P43B no concede autoridad administrativa WRITE. La credencial temporal ya utilizada no debe reemitirse sin GO independiente.
- El último preflight reportó **cero** claves P42 y writer/worker OFF. La simulación nueva no vuelve a consultar hosted y por tanto no afirma estado hosted actualizado.

## Entrega de este gate

- `scripts/f16-p42-private-transport-lab.mjs` ejercita un flujo Edge `POST / GET / DELETE` y PostgreSQL `INSERT / SELECT metadatos / DELETE`, de forma **completamente local y simulada**, sin `fetch`, driver DB, sockets, CLI, `process.env`, generación aleatoria, logs ni fuentes externas.
- La cabecera de autorización se modela con literal **público fijo de laboratorio**, jamás con token Supabase real. El módulo **no** implementa ni transporta un token real. Sólo acepta `P42_OFFLINE_SYNTHETIC_FIXTURE_ONLY` y los 32 bytes de demostración `a7`.
- Los accesos SQL modelan `{text, values}` con `$1..` y `bytea`, sin construir SQL con material secreto. La API HTTPS modela JSON en body; nunca se registran `Authorization`, cuerpos, parámetros ni respuestas completas.
- Un `POST` o `INSERT` con timeout después de aparente escritura deja estado `BLOCKED_*_OUTCOME_UNCERTAIN`: nunca hay reintento ciego ni segunda clave. Si la DB rechaza de forma inequívoca, el mock ensaya compensación Edge y confirma ausencia; una compensación que falla permanece `BLOCKED_EDGE_COMPENSATION_UNCERTAIN`.
- El modo `PREPARE_AND_MANUALLY_REVOKE` es una **invocación de laboratorio deliberada**, no cron/worker. Modela retirar secreto Edge, borrar `P42_V1` por ID, y constatar ausencia independiente. Un fallo de cualquiera impide declarar revocación. El modo normal `PREPARE_ONLY` no revoca ni habilita nada.
- `src/features/supporter/testing/f16P42PrivateTransportLab.test.mjs` verifica 12 casos, salidas sanitizadas, ausencia de librerías de red y no repetición después de respuestas ambiguas. Se incorpora al glob existente de `npm run test:f16:synthetic`; sin modificar CI, dependencias, esquema ni frontend.

## Resultados y límites de evidencia

- **Prueba local aislada del prototipo de transporte: 12/12 PASS**, Node 22, con el módulo de contrato preexistente reproducido de su fuente GitHub en un sandbox local. **La versión subida a GitHub debe comprobarse por CI del nuevo HEAD**; el PASS local no sustituye la comprobación de CI.
- No se realizó handshake HTTPS, autenticación OAuth/PAT real, ACL Owner/Admin, `PGSSLMODE=verify-full` real, `SET ROLE`, llamadas Supabase Management API ni transacción PostgreSQL real.
- El secreto Edge tiene ámbito del **proyecto**, no por función; añadirlo algún día puede exponerlo a consumidores Edge preexistentes. Antes de cualquier clave: inventario de funciones lectoras y permisos, observabilidad/retención, backups y snapshots.
- No hay ACID entre Supabase Secrets y PostgreSQL. La simulación sólo comprueba semántica de fallo, no disponibilidad real de dos destinos.
- El campo `not_after = T0 + 24h` limita uso futuro, **no** elimina físicamente bytes; revocación **manual** a cargo del PO como custodio único, según decisión más reciente. T0 sigue sin elegirse.
- El mock elimina el buffer fijo con `fill(0)` en `finally`, sin afirmar borrado garantizado de strings JS o memoria del proveedor. No generar secretos reales para validar este gate.
- CI puede ejecutar este test con `node --test src/features/supporter/testing/f16P42PrivateTransportLab.test.mjs` y `npm run test:f16:synthetic`.

## Contratos oficiales consultados

- [Supabase — bulk create secrets](https://supabase.com/docs/reference/api/v1-bulk-create-secrets): `POST /v1/projects/{ref}/secrets`.
- [Supabase — list all secrets](https://supabase.com/docs/reference/api/v1-list-all-secrets): `GET /v1/projects/{ref}/secrets`. El cliente real futuro no debe publicar respuesta bruta.
- [Supabase — bulk delete secrets](https://supabase.com/docs/reference/api/v1-bulk-delete-secrets): `DELETE /v1/projects/{ref}/secrets` con arreglo de nombres.
- [Supabase — Edge Function secrets](https://supabase.com/docs/guides/functions/secrets): permisos y alcance proyecto; secret nuevo disponible sin redeploy, sujeto a consumidores.

## Próxima puerta (NO ejecutada)

**P42_PRIVATE_TRANSPORT_SYNTHETIC_ONLY — preparado para verificar CI.**

1. Confirmar CI del commit final de este gate y reabrir únicamente defectos propios del diff.
2. Diseñar por separado el cliente operacional privado y **auditar previamente** aislamiento del proceso, custodia del token administrativo, CA TLS y ACL PostgreSQL. Este mock no debe desplegarse ni reconvertirse automáticamente en cliente de producción.
3. Pedir **GO nuevo, delimitado y explícito**, para un preflight inocuo de capacidad WRITE hosted sin secretos reales. No usar el antiguo lock/GO P43B.
4. Reservar un **GO todavía posterior** para generación, entrega, compensación y revocación de material P42 real, después de fijar T0 UTC y las condiciones de custodia. Ese GO tampoco habilita cobros, ledger, beneficios, P21 ni P42 writer.

**Marcador:** `P42_TRANSPORT_MOCK_LOCAL_12_OF_12_PASS_GITHUB_CI_PENDING_HOSTED_NO_GO`.
