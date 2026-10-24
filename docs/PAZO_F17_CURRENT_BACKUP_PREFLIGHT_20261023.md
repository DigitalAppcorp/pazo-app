# F17 — Preflight local para respaldo actual (no significa restore completo)

Actualización 24-oct: el PO ya autorizó export y restore privados. Ejecución
bloqueada por ausencia de terminal en su Windows privado desde esta sesión
cloud; no transferir datos para suplirlo. Corregido rechazo de BOM inicial
emitido por PowerShell 5.1; hashes conservan bytes originales. Preflight 11/11
y Storage 11/11 PASS sintéticos. [Gates y continuidad](PAZO_F17_BACKUP_RESTORE_EXECUTION_20261024.md).

Estado: código de validación propuesto en PR DRAFT después del merge de PR #99. No se ha generado ni inspeccionado un respaldo nuevo, y no se han ejecutado operaciones hospedadas.

El respaldo real restaurado en PostgreSQL 17 el 11 de octubre está documentado y fue positivo **para esa fotografía**. No demuestra que exista o funcione un respaldo del estado actual del 23 de octubre, ni permite reproducir de cero las 122 migraciones históricas. Recuperar el estado actual debe partir de una exportación reciente y verificable, no de recrear una línea base inventada.

## Preflight seguro para el operador autorizado

Luego de una exportación Database y Storage con los scripts existentes, en el equipo privado del operador, fuera de la carpeta del repositorio y de carpetas sincronizadas, ejecutar:

    node scripts/f17-local-backup-preflight.mjs --backup-dir "C:\\DirectorioPrivado\\BackupPazo"

La ruta es **solo un ejemplo**. Nunca enviar archivos dump, rutas privadas, credenciales, manifiestos con nombres de Storage ni claves age al chat, GitHub, CI o un sitio web.

El comando verifica **sin red** cinco piezas Database, hashes SHA-256, tamaños, cabecera PGDMP, proyecto fijo, JSON de extensiones, integridad de binarios Storage y coincidencia de inventarios de bucket/objeto/tamaño. Rechaza rutas enlazadas y contenido modificado. Los tests de CI usan únicamente archivos sintéticos.

**Resultado positivo significa solo integridad de contenido en disco.** La herramienta marca permanentemente FALSE para restore, offsite, actualidad respecto al hosted, servicio Auth, replay completo y autorización de producción. El encabezado PGDMP no demuestra que el dump sea restaurable. Tampoco comprueba por sí solo la exclusión de las filas P42: esa protección sigue en el exportador autorizado con su test independiente.

Un respaldo **actual** necesitará, con autorización específica del operador, exportación privada nueva, cifrado age y clave recuperable, Storage, copia off-site personal (T11 todavía diferido), restauración en PG17 descartable y comparación de RLS/ACL/owners/datos; validar Auth/Storage HTTP de forma separada. La conexión de Google Drive personal sigue aplazada por decisión del PO.

La ruta de operación que continúa PROHIBIDA es supabase db push / migration repair / db reset --linked / DDL-DML alojado. No completar la fase por CI PASS, y no fusionar este PR sin aprobación posterior.
