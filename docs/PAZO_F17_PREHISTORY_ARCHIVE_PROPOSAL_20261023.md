# PAZO — Propuesta de archivado histórico NO ejecutable — F17 fase 4

**Decisión propuesta:** mantener las ocho migraciones de octubre 5 no registradas en Supabase como **fuentes de archivo**, sin ejecutarlas automáticamente. Esta rama no modifica ninguna versión alojada, no toca main, producción, Vercel ni PayPal. El Product Owner debe revisar explícitamente antes de fusionarla.

## Fundamento
- Registro alojado real: **122** versiones de migración (consulta Supabase de solo lectura).
- Antes de este cambio: **130** archivos ejecutables locales; ocho no existen como versiones en `supabase_migrations.schema_migrations`.
- El commit raíz del repo, 3 de octubre, no incluye DDL fundacional de PAZO; el primer SQL histórico depende de tablas anteriores como `posts` e `interactions`.
- Auditoría del catálogo actual: 83 objetos DDL (incluyendo funciones, RLS, tablas, índices y triggers) detectados, pero la existencia NO certifica origen cronológico, totalidad ni definiciones originales.
- El snapshot F14 posterior trae un trigger creado por F5, por lo que reejecutar F4 sobre él falla. No confundir esta reproducción diagnóstica con un restore desde cero.

## Operación en Git reversible
- Mover exactamente ocho blobs SQL por Git SHA, **sin modificar un byte**, desde `supabase/migrations/` a `supabase/history/pre_migration_untracked/`. La ruta archivada NO es escaneada por CLI como migración normal.
- `docs/PAZO_F17_PREHISTORY_ARCHIVE_MANIFEST_20261023.json`: rutas antiguas, nuevas, tamaños y SHA inmutables.
- Probar: ocho archivados idénticos, 122 activos únicos equivalentes al snapshot alojado, 96 fuentes SQL byte idénticas, 24 equivalencias léxicas y 2 entradas descriptor voluntarias registradas por el propio instalador histórico.
- Ajustar la prueba de conflicto cronológico para leer las fuentes **archivadas** y seguir mostrando `replay no certificado`. No reescribir la migración F4 para ocultar el trigger posterior.

## Límites que NO cambian
1. **NO ejecutar `supabase db push`**, aunque las versiones coincidan: CLI `--dry-run` al entorno de producción y gate de operación no acreditados.
2. No insertar filas sintéticas en `supabase_migrations.schema_migrations`, no usar `supabase migration repair`, no borrar objetos ni ejecutar SQL antiguo sobre producción.
3. El estado de los objetos alojados no sustituye la base fundacional: nueva instalación aún requiere baseline o snapshot íntegro con restauración aprobada.
4. Archivo histórico del 5 de octubre no forma parte de una ruta de bootstrap limpia. La ruta de recuperación sigue siendo el procedimiento de respaldo/restore validado y protegido, no un replay ciego de estas 122 versiones.
5. Este PR DRAFT **no autoriza merge a main** ni habilita pipelines de despliegue automático. Un futuro nuevo SQL necesita un gate propio, auditoría y autorización.
