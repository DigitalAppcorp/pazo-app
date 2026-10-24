# PAZO — Migraciones históricas fase 2 (23-oct-2026)

**Rama derivada de:** `2a754923654d87241c746e334b60b7bb5a6d57f7` (PR #95). **No hay merge a main ni escrituras a producción.**

## Resultados de recuperación
- 20 SQL completos recuperados de las 20 filas exclusivamente alojadas en `supabase_migrations.schema_migrations.statements`, bajo versión y nombre remotos exactos.
- 5 pares compartían nombre y diferían en formato/comentarios: comparación léxica token a token (incluidos cuerpos PL/pgSQL y literales) positiva; el SQL restaurado al archivo canónico es **textualmente idéntico al alojado**. Los 5 originales persisten en la historia Git y SHA de blob en el manifiesto.
- Prueba offline SHA-256 para 25 migraciones en `scripts/f17-historical-migration-phase2.test.mjs`; inventario en `docs/PAZO_HISTORICAL_MIGRATION_PHASE2_MANIFEST_20261023.json`.
- Las 20 nuevas son 2 del módulo Lugares/validación, 16 de F14/moderación y 2 de F16/lectura/auditoría.
- Se conserva la auditoría fase 1 de 23 SQL exactos del PR #95.

## Pendientes de alto impacto (NO GO para db push)
- 8 fuentes Git originales aún sin versión remota: `feed_like_save_integrity`, `post_comments_source_of_truth`, `pet_registration_editing`, `security_stabilization`, `prevent_same_owner_follows`, `rescue_passport_alerts`, `sighting_contact_details`, `feed_scroll_pagination`.
- Se verificó por SELECT la existencia de 15 tablas/funciones representativas de ellas, **no** identidad completa ni instalación histórica.
- Equivalencia léxica **no reemplaza** validación semántica, catálogo de funciones/RLS ni replay ordenado con extensiones/roles reales en PostgreSQL desechable.
- Recuperar archivos no es instalar migraciones ni editar la tabla histórica. **No ejecutar `supabase db push`, `supabase migration repair`, `supabase db reset --linked`, SQL/DDL/DML hospedado ni desplegar sin GO del PO.**
- PR #95 permanece en borrador y sin fusionar; este trabajo debe seguir como PR DRAFT dependiente, sin merge a `main`.
- El SQL histórico F14 y F16 debe someterse a revisión específica de privilegios/RLS y funciones `SECURITY DEFINER` antes de reproducir el estado desde cero.

## Próximo gate
Auditar las 8 originales sin registro alojado, recuperar evidencia del proceso de instalación y validar un replay reproducible en PostgreSQL aislado; entonces evaluar si es admisible eliminar el bloqueo de producción.

## Verificaciones posteriores al commit inicial

- GitHub Actions en commit `b2da806c9fdcaf5cf960fc0d4dd9e4cdf8b6f97f`: nueve workflows CI/sintéticos **SUCCESS**, incluidos CI, F17 seguridad y siete laboratorios F16.
- Comparación GitHub `supabase/migrations` vs `list_migrations` en Supabase de solo lectura: **130 archivos locales únicos, 122 versiones alojadas únicas, 122 coincidencias exactas de versión, 0 faltantes remotas y 8 faltantes locales en la base**.
- Inspección de objetos mediante `pg_catalog` (solo SELECT), extraídos de las 8 migraciones exclusivamente locales: **83 referencias únicas de creación**, todas presentes: 6 tablas, 15 índices, 22 funciones, 9 triggers, 31 políticas. La existencia no prueba integridad de definición ni secuencia de aplicación.
- Las 6 tablas verificadas tienen `relrowsecurity=true`, sin `FORCE RLS`; de las 22 funciones inspeccionadas, ninguna pública `SECURITY DEFINER` tenía privilegio EXECUTE de `anon`. Hay definers en esquemas privados que requieren revisión por firmas, `search_path` y políticas actuales.
- **La prueba de restauración integral de 130 migraciones en Supabase/PostgreSQL aislado sigue PENDIENTE**: los laboratorios CI validados no constituyen ese replay histórico.
- Estado del commit inicial: PR #97 DRAFT sin merge, basado en #95; ningún cambio en producción. CI del commit documental posterior debe verificarse por separado.

