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


## Gate de restauración / ocho migraciones antiguas — evidencia nueva (23-oct PDT / 24-oct UTC)

**Estado exacto: `FORENSIC_REPLAY_BLOCKED_BY_LATE_BASELINE` — NO GO `db push`.**

- **Último commit del PR #97 revisado:** `a8b417af5b225afb7fced923c03fd3c46efada48`; PR sigue DRAFT sin integrar. Los nueve workflows tradicionales de CI, seguridad F17 y laboratorios F16 estuvieron PASS sobre la implementación de fase 2 (`0b23b4c`). La prueba histórica nueva no se confunde con ese PASS.
- **Workflow específico:** `F17 historical eight-local migration replay (disposable PG17)`, run [40060715328](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40060715328), **FAIL esperado como bloqueo detectado**, no certificado de replay.
- **Infra real del laboratorio:** PostgreSQL 17.11 descartable en GitHub Actions, `f14_synthetic`/localhost, catálogo restaurado desde `supabase/tests/f14/catalog-baseline.sql`. Guardas de usuario, DB, versión, puerto y rol exclusivamente sintético. Nunca se usó una conexión/credencial de Supabase alojado.
- **Resultados:** `feed_like_save_integrity`, `post_comments_source_of_truth` y `pet_registration_editing` ejecutaron sus SQL originales hasta COMMIT en ese laboratorio. `security_stabilization` **se bloqueó**, las cuatro siguientes no se ejecutaron en ese run. Un primer intento con rol `postgres` falló en la tercera por titularidad de `storage.objects` en el fixture; se corrigió **solo el rol de ejecución del laboratorio**, no la fuente SQL original ni privilegios hospedados.
- **Bloqueo de dependencia temporal comprobado:** `security_stabilization` intenta `ALTER TABLE public.follows ALTER COLUMN follower_id TYPE uuid`; el fixture posterior F14 ya trae `trg_validate_follow_relationship`, creado por la migración posterior `prevent_same_owner_follows`. PostgreSQL rechazó el cambio de tipo con `cannot alter type of a column used in a trigger definition`. Es una **incompatibilidad del fixture posterior con el orden histórico**, no prueba de defecto de la aplicación actual. Prohibido eliminar temporalmente ese trigger de la producción para forzar replay.
- **Dependencia anterior faltante:** el primer SQL (Oct 5) presupone `public.interactions` y `public.posts`. No hay una fuente migratoria anterior con las estructuras fundacionales. Por tanto, la reconstrucción **desde un PostgreSQL Supabase vacío** no está certificada; el catálogo F14, tomado días después, **no es una línea base cronológicamente fiel**.
- **Comprobación hospedada READ-ONLY complementaria:** 83 objetos referenciados por DDL CREATE de las ocho fuentes existen (6 tablas, 15 índices, 22 funciones, 9 triggers, 31 políticas); 6 tablas con RLS activo. Entre las 22 funciones analizadas, 9 son `SECURITY DEFINER`; las 9 fijan `search_path=""` y ninguna concede EXECUTE a `anon`/ `authenticated` en la versión actual. Estos checks NO prueban las definiciones ni autorizan reescrituras de historia.
- **Siguiente objetivo forense:** reconstruir a partir de fuentes verificables el **esquema fundacional anterior a la primera migración Oct 5** (tipos y dueños de tablas base; roles Auth/Storage y grants), crear una línea base exclusivamente desechable para PG17 y aplicar las ocho en orden sobre ese *estado anterior*, seguido del resto del historial y comparación final. No inventar DDL inicial a partir de objetos tardíos sin marcarlo como hipótesis. No usar `supabase migration repair` ni borrar las ocho fuentes para esconder el desfase.
- **Condición de desbloqueo:** replay completo en laboratorio + concordancia del catálogo y revisión explícita + GO independiente del Product Owner para cualquier escritura alojada. Hasta entonces **ninguna operación de producción / main / PayPal / Vercel**.
