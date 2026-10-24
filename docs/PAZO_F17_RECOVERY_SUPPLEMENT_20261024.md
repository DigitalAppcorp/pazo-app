# F17 — complemento de recuperación verificable, 24-oct-2026

El respaldo actual es **dump custom + roles + metadatos + Storage + complemento
de datos**. Restaurar solo el dump no reproduce los datos internos de pg_net
ni los grants iniciales de dos schemas GraphQL observados en este proyecto.
El paquete completo conserva los originales; no altera un dump existente.

## Contenido privado

`recovery-final/` contiene 146 archivos COPY binarios con nombres SHA-256 de
la identidad de tabla, `data-inventory.json`, los dos catálogos fuente privados,
`restore.sql` y `recovery-manifest.json`. Este último cubre **150 archivos**
con tamaño/SHA-256. Nunca subir estos archivos ni fingerprints a GitHub/CI.
La quinta pieza DB sigue siendo `extension-owners.json`; el complemento es
adicional, no reemplaza ninguna de las cinco piezas obligatorias.

La identidad de tabla queda solo en el inventario privado. COPY incluye filas
en una transacción REPEATABLE READ READ ONLY, padres mediante ONLY y particiones
por separado. P42 no tiene archivo de filas. Columnas generadas se excluyen del
input, con listas explícitas de columnas, y se verifican después de regenerar.
Las secuencias se guardan según last_value/is_called observados; no son MVCC.

## Herramientas versionadas

- `backup-database.ps1`: cinco piezas, roles sin passwords antes del dump para
  evitar vencimiento del login temporal en una conexión posterior.
- `backup-catalog-verification.sql`, `backup-catalog-extra-verification.sql` y
  `backup-catalog-definitions-verification.sql`:
  evidencia READ ONLY privada; grants implícitos normalizados y columnas por
  ordinal lógico, sin confundir OIDs/attnum internos con pérdida de datos.
- `export-recovery-data-snapshot.ps1`: recibe rutas de CLI/PG, directorio de
  catálogos iniciales y destino nuevo privado; prepara conexión como el exporter
  existente y exporta COPY/catálogos bajo una sola transacción de lectura.
- `normalize-recovery-copy.mjs`: prepara **otro directorio nuevo** con solo
  inputs de recuperación. Acepta listas explícitas del exporter y permite el
  formato inicial SELECT * mediante eliminación binaria de campos generados,
  conservando los originales. No imprime filas ni interpreta sus valores.
- `prepare-recovery-supplement.mjs`: recibe directorio final y directorio del
  catálogo del restore base; genera restore.sql y manifiesto sin sobrescribir.
  Rechaza deriva de tablas/owners y conserva los grantors de schemas fuente.
- `verify-recovery-supplement.mjs`: hashes, archivos exactos, COPY, columnas e
  inventario completo/P42; invocado también por preflight y packer cuando existe
  recovery-final. Su PASS de integridad mantiene `restoreVerified=false`.
- `compare-backup-catalogs.mjs`: directorio de catálogos restaurados y directorio
  fuente opcional (recovery-final); resumen de diferencias sin filas ni hashes.
  Para definiciones, colocar source-definitions.private.json y
  restored-definitions.private.json en el directorio del restore; exigir
  definitionComparison=CHECKED además de cero diferencias.

Los ayudantes parametrizados consolidan el procedimiento local ejecutado. La
evidencia de esta recuperación es el resultado sobre los inputs privados
restaurados y su igualdad exacta tras descifrar; sintaxis/tests de herramientas
no sustituyen ese resultado.

## Orden de recuperación aislada

1. Verificar preflight y suplemento; montar **la extracción descifrada** readonly
   como `/evidence` en un contenedor NUEVO Supabase PG17 compatible, network none,
   sin puertos y datos tmpfs. Nunca apuntar restore.sql a un destino alojado.
2. Bootstrap supabase_admin; adaptar solo su CREATE ROLE ya satisfecho. Aplicar
   roles originales, GRANTED BY incluido, con ON_ERROR_STOP. Crear DB control.
3. Restaurar creación/propiedades/ACL DB, luego schemas, desde TOC con CREATE.
   Precrear extensiones con owner/version/schema de extension-owners; elevación
   postgres limitada a la transacción local y finalizar NOSUPERUSER.
4. Restaurar el resto del dump con --single-transaction --exit-on-error,
   sin --no-owner ni --no-privileges. pg_cron precargado con
   `cron.launch_active_jobs=off`; pg_net precargado con
   `pg_net.database_name=restore_control`, sin extensión en esa DB control.
5. Aplicar `/evidence/recovery-final/restore.sql` con psql ON_ERROR_STOP.
   SOLO el aislado: transacción, TRUNCATE de todas las tablas propias del
   snapshot, COPY explícitos, setval observados, grants fuente y COMMIT.
   session_replication_role=replica se limita al import local para impedir
   efectos de triggers, luego vuelve a origin; comparación completa obligatoria.
6. Ejecutar los tres catálogos contra el restore y comparar con los guardados en
   recovery-final. Incluir todas las tablas/secuencias y metadatos, P42 vacío,
   privilegios finales y binarios Storage. No ignorar diferencias del worker.
7. Detener/eliminar únicamente los laboratorios propios; conservar originales,
   cifrados, identidad y diagnósticos privados. No ejecutar jobs ni servicios
   Auth/Storage ni asumir que Vault descifra sin su clave de plataforma.

La primera construcción del complemento conservó intentos parciales privados y
un import con rollback por columnas generadas. El complemento final verificado
contiene inputs válidos y la comparación completa PASS; ningún fallo se ignoró.
Referencia: [ejecución real](PAZO_F17_BACKUP_RESTORE_EXECUTION_20261024.md).
