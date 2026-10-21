# PAZO F16-P42 — Private dual-channel: contrato offline PG17 + Edge Secrets

**Fecha:** 2026-10-17. **Alcance:** preparación aprobada por «ok go» tras el resultado `P43B_EPHEMERAL_DB_READ_ONLY_PASS`. **No es un GO para conexiones nuevas, permisos SQL, secretos reales, claves, dinero ni despliegues.** Rama `f13/section-titles-20261012`, PR #44 DRAFT.

## 1. Evidencia nueva reutilizable

- **Canal temporal READ ONLY:** P43B fue reportado PASS por el PO, con CLI efímera `cli_login_postgres` y SQL de preflight estructural P42. El one-shot P43B está consumido. No reutilizar su lock ni su GO; no presupone credencial futura vigente, autoridad WRITE ni transacciones parametrizadas sobre hosted.
- **PostgreSQL 17:** `scripts/f16-p42-backup-exclusion-pg17-lab.sh` — ya empleado en el PG17 desechable CI — contiene ahora un ensayo adicional con `PREPARE/EXECUTE` de `INSERT` y `DELETE WHERE key_id=$1` contra la tabla ficticia del catálogo de backup, con 32 bytes **públicos y fijos** (`a7` repetido), `enabled=false` y ventana EXACTA de 24 horas. Todo dentro de `BEGIN; ... ROLLBACK`; verificar que después queda la única fila previa, sin afectar el test de exclusión de respaldos. Guarda `GITHUB_ACTIONS`, usuario, password, DB y PG17. **PREPARE/EXECUTE no prueba todavía un driver Node `pg` con bind params en el protocolo cliente-servidor**, ni permisos del rol efímero en PAZO alojado. El SQL del experimento no es una migración.
- **Contrato Node offline puro:** `scripts/f16-p42-private-dual-channel.offline.mjs`, con tests `src/features/supporter/testing/f16P42PrivateDualChannelOffline.test.mjs`. **No puede conectarse**, crear clave aleatoria, recibir material productivo, leer token, ejecutar SQL o invocar CLI: solo acepta `P42_OFFLINE_SYNTHETIC_FIXTURE_ONLY` y bytes sintéticos fijos. Genera descriptores (NO los ejecuta) de sentencias PG con `$1,$2::bytea,$3::timestamptz,$4::timestamptz`, e inventario/alta/baja HTTPS Edge. Incluye simulación adversarial de fallo/compensación y proyección de presencia por nombre, descartando valores. Tests en glob existente `npm run test:f16:synthetic`.

## 2. Canales objetivos y controles obligatorios (diseño, NO ejecución)

### PostgreSQL: parámetros, rol administrativo y no registros

Destino único: `supporter_private.p42_activation_signing_keys`. Inserción futura `P42_V1` con parámetros **binarios reales en memoria en un driver compatible con PostgreSQL**, `enabled=false`, `not_before=T0` futuro y `not_after=T0+24h` exactas; ninguna interpolación de secretos ni `psql -c` con bytes visibles, `-v secret`, URI con password en argv, SQL Editor o variables persistentes. Confirmar permiso real de `cli_login_postgres` → `SET ROLE postgres` exclusivamente en nuevo gate **separado**, con mínima transacción hospedada autorizada y sin material sensible. `P43B READ ONLY PASS` **NO** confirma la escritura. Tener cliente TLS `verify-full` y CA real validada; controles de SSL y postgres logs, sin monitor de procesos/agent capturando secretos. La identidad del rol debe revisarse para futuro `SET ROLE` sin ampliar grants a `service_role`, `anon`, `authenticated` ni `PUBLIC`.

El retorno de metadatos permitido: `key_id, enabled, not_before, not_after` y contadores/gates/ACL; prohibido `RETURNING key_bytes`, `SELECT key_bytes`, MACs, hash del secreto o valores del buffer. `DELETE ... WHERE key_id=$1 RETURNING key_id` con rowcount EXACTO y posterior SELECT de ausencia, bajo GO de revocación. No aceptar `RETURNING *`.

### Edge Secrets: HTTP body privado, no argumentos CLI con el valor

La CLI `supabase secrets set NAME=VALUE` acepta secretos en argumentos del proceso, y `--env-file` implica archivo de secretos; **ninguna de las dos formas satisface por sí sola la condición de no exposición** de PAZO. Existe Management API oficial HTTPS:
- Alta: `POST https://api.supabase.com/v1/projects/mrybvqdebbgcayuvgkkr/secrets` con JSON de un objeto `{name, value}` dentro de array, nombre fijo `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. Contrato oficial: https://supabase.com/docs/reference/api/v1-bulk-create-secrets .
- Lista: `GET` en el mismo path, **proyectar localmente exclusivamente presencia de ese nombre**, sin imprimir payload ni valores/digests. https://supabase.com/docs/reference/api/v1-list-all-secrets .
- Revocación: `DELETE` en el mismo path, JSON de array con **únicamente nombre fijo**. https://supabase.com/docs/reference/api/v1-bulk-delete-secrets .

La API usa token administrativo con permisos de **Edge Function Secrets write/read**; el token no es la contraseña PostgreSQL ni la secret key de aplicación. **No producir ni pedir token adicional ahora**. En una implementación futura, sólo una sesión local privada de Owner enviaría JSON por cuerpo HTTPS con autenticación en header, en memoria, sin argv, `.env`, chat, captura, debug, proxies registradores ni logs de cuerpos/respuestas. Revisar antes los detalles de esquema `POST` del contrato vigente y los scopes del token, y probar con transporte simulado que el body privado nunca se registra. **No implementar el cliente remoto con este GO**. Los nuevos secretos quedan inmediatamente disponibles para las Edge Functions del proyecto sin redeploy (no hay aislamiento por prefijo); auditar consumidores antes de un GO de provisión. Una respuesta HTTP 201, aislada, no demuestra disponibilidad/ausencia verificada en todos los destinos.

### Compensación ante incertidumbre

No hay transacción ACID entre Edge y PostgreSQL. Preflight de ambos canales **antes de generar bytes**; un buffer CSPRNG futuro único; escribir Edge y después INSERT PostgreSQL bajo GO único; si PostgreSQL falla, eliminar el secret Edge inmediatamente, verificar ausencia. Si uno de los envíos/timeouts produce estado ambiguo, detener: **no repetir el POST, INSERT ni generar otra clave**; reconciliar sólo metadatos y tratarlo como bloqueo. No habilitar writer/worker, RPC EXECUTE o compras para «reparar» la operación. Para cleanup, ambos almacenes requieren retiradas y lectura independiente, con permiso separado o expresamente incluido en el futuro GO real. Aun con ambas respuestas, bytes en backups/instantáneas previas y memoria del operador pueden permanecer.

**Simulación incluida:** `simulateDualStore()` contempla `EDGE_CREATE`, `DB_INSERT` con compensación, `EDGE_COMPENSATE` incierta, `DB_REVOKE` incierta y un estado candidato de revocación sintética; **no es prueba de red ni borrado real**.

## 3. Política de custodia EXISTENTE, no inventar

Se conserva la decisión del PO de un **custodio único** (PO mismo), con riesgo de indisponibilidad humana; no imponer automáticamente suplente que había sido descartado por decisión posterior. Antes de cualquier provisión: confirmar que podrá ejecutar revocación manual a `Texp=T0+24h`, dos vías privadas de recuperación, alertas si solicita, pruebas reales de `unset` Edge y `DELETE` administrativo, respaldo sin keys, riesgo de copias/snapshots/retención. **T0 no está fijado** y tampoco hay autorización para elegirlo. No crear recordatorio sin hora elegida. La expiración lógica de la RPC ya se corrigió en hosted (patch absoluto); no reejecutar.

La tabla `supporter_private.p42_activation_signing_keys` hoy tiene 0 claves conforme al último preflight P43B. El script de backup lógico ya usa `--exclude-table-data=supporter_private.p42_activation_signing_keys` y laboratorio lo ensaya. **No** garantiza exclusión de backups físicos/plataforma, snapshots ni exports de terceros.

## 4. Puertas de seguridad siguientes

1. **Confirmar CI + PG17 disposable** para el nuevo commit. Si falla, revisar sin tocar hosted. Cualquier PASS es **SYNTHETIC_ONLY**.
2. Diseñar y probar **transporte privado en entorno simulado** para una futura sesión con token y driver PG (sin conectar PAZO ni incluir `pg` en frontend); probar que no hay secretos en argv, logs, salida o trazas. Requiere autorización nueva sólo si instala paquetes/crea cuenta/cambia costos o usa recursos hosted.
3. **GO separado** para preflight del canal real de WRITE — autenticación temporal fresca, prueba de privilegios y operación inocua acotada, sin material de clave ni acceso Edge escritura real; debe declararse antes qué efecto administrativo tendrá. No usar los one-shot P43/P43B consumidos.
4. **GO ulterior de provisión/compensación/revocación de `P42_V1`** real en dos almacenes, con T0 UTC, riesgo custodio único, Edge y DB listos e inventario de backup. Nunca derivarlo de «ok go» de diseño.

**Estado:** `P42_PRIVATE_DUAL_CHANNEL_SYNTHETIC_PREPARATION_ONLY`; sin clave real, sin conexión hosted nueva, Edge no alterado, ninguna escritura de P42, PR #44 DRAFT, F16 NO-GO. No autorizar pagos, beneficios, checkout o workers por pruebas.
