# F17 — respaldo y restore, 24-oct-2026

**BLOCKED_PRIVATE_OPERATOR_ENVIRONMENT. Backup actual y restore real NO EJECUTADOS.**

La orden directa del PO autoriza exportación READ ONLY, herramientas, cifrado
y recuperación aislada hasta finalizar; no requiere renovar ese GO. Prohíbe
transferir respaldos/secretos al chat, GitHub o servicios externos. Off-site
personal diferido; sin hosted writes, migraciones/repair/reset remotos, PayPal,
merge ni despliegues.

## Auditoría y ejecución

- `main`: `7ce277bf4ab2bf50185c77e5b8f090c375a6f8df`.
- PR #100 OPEN/DRAFT, HEAD auditado `ef4ae3012b56dc383c86ad3f6755a8a216437c1c`.
  Su evidencia CI previa sigue siendo válida para ese código, sin probar restore.
- Continuación: `f17/backup-restore-validation-20261024`, derivada de ese HEAD.
  Checkout original `/workspace/pazo-app` preservado.
- Ejecutor observado: Linux cloud `/workspace`, UID 1000. **No es** el Windows
  privado del PO. No hay herramienta de ejecución Windows conectada a esta
  sesión. Estado de sus dos carpetas locales: **no observado**.
- Revisados procedimiento del 11-oct, runbook, scripts DB/Storage/age, consulta
  de catálogos, preflight #100 y reglas de continuidad Brain OS 1.4.1.
- Node **24.19.0**, Docker **28.4.0** operativo. La comprobación del socket
  requirió acceso de red del sandbox; no fue una avería del daemon.
- PostgreSQL, psql, pg_dump y pg_restore **17.11** comprobados en imagen
  existente `postgres:17`, contenedor `--rm --network none --read-only`.
  **Solo versiones de herramientas; no restore de PAZO**. Esta imagen no
  sustituye la Supabase-compatible con todas las extensiones del origen.
- Supabase CLI **2.120.0** instalada fuera del repo en
  `/workspace/pazo-f17-tools`; `--version`, `--help` y `db dump --help` PASS.
  Caché npm en `/workspace/.npm`; `DO_NOT_TRACK=1` evita escritura de telemetría
  en el home de solo lectura. No se ejecutaron login, dry-run ni dump.
- Changelog y documentación Supabase consultados. Herramientas cloud no
  demuestran herramientas Windows ni autenticación DB funcional. Readiness de
  credenciales cloud figura desconocido; no se imprimieron ni leyeron valores.

## Defecto reproducido y corregido

Windows PowerShell 5.1 escribe BOM con `Set-Content -Encoding utf8`, usado por
`backup-database.ps1` para `database-manifest.json`. El `JSON.parse` del
preflight rechazaba ese manifiesto válido. La regresión sintética reprodujo
**10 PASS / 1 FAIL** antes de la corrección.

El lector JSON ahora admite el BOM inicial. Los hashes siguen cubriendo los
bytes originales; no se reescribe ningún respaldo ni se relajan validaciones
de archivos, enlaces o inventarios.

Validación después del cambio:

- `node scripts/f17-local-backup-preflight.test.mjs`: **11/11 PASS**.
- `node scripts/storage-backup.test.mjs`: **11/11 PASS**.
- `node --check scripts/f17-local-backup-preflight.mjs`: PASS.
- `git diff --check`: PASS.

El runner `node --test` dentro del sandbox inicialmente mostró solo resultados
por archivo. Se contrastó con ejecución directa y runner con acceso adicional:
los 21 casos originales se ejecutaron realmente. La regresión BOM se ejecutó
directamente en rojo y luego en verde. No se contaron archivos como casos.
No se repitieron pruebas P42/PG17 válidas: su exportador no cambió.

## Gates reales pendientes

| Gate | Resultado de esta ejecución |
| --- | --- |
| Equipo privado, DPAPI y destinatario/custodia age existentes | BLOCKED: equipo no conectado |
| Export nuevo Database, roles e inventario/binarios Storage | NOT EXECUTED |
| Integridad/SHA-256 reales y exclusiones de secretos | NOT EXECUTED |
| Cifrado/descifrado age real y protección local | NOT EXECUTED |
| Restore en Supabase-compatible PostgreSQL 17 aislado | NOT EXECUTED |
| Filas, relaciones, funciones/triggers, extensiones, ACL/owners/RLS | NOT EXECUTED |
| Servicios Auth/Storage por HTTP | NOT VERIFIED; separado de restore DB |
| Off-site personal | DEFERRED BY PO; sin transferencia autorizada |

No se descargaron datos privados por conectores ni se crearon respaldos cloud.
DPAPI y custodia age documentadas en Windows no están accesibles aquí. El
restore del 11-oct conserva su validez histórica, sin probar el estado actual.

## Única intervención y continuación

**Abrir esta tarea en Codex local sobre
`C:\Users\osori\PAZO-F17-backup-review`, con terminal en ese equipo.**

No copiar comandos, claves ni dumps al chat. Con el equipo conectado, inspeccionar
cambios locales sin sobrescribirlos, recuperar esta rama y usar la autenticación
existente. La autorización actual persiste. Verificar ayuda de la CLI antes del
parser de dry-run si su versión difiere. Crear destinos nuevos privados fuera
de repos/sync; conservar respaldos y clave anteriores.

Continuar export→integridad→cifrado/roundtrip→restore PG17 compatible→comparación
con fuente READ ONLY usando `backup-catalog-verification.sql`. Documentar la
diferencia esperada de filas P42 excluidas y comprobar exclusión real de
secretos. Conservar todos los demás schemas, owners/versiones de extensiones,
GRANTED BY, ACL de DB y estado final de privilegios. No omitir piezas para
superar errores ni presentar integridad o CI como restore PASS.
