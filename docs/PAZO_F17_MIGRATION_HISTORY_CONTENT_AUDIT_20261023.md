# PAZO F17 — Integridad del SQL histórico completo (auditoría fase 3)

**Corte:** 23 de octubre de 2026 (PDT). **Operación:** consultas `SELECT` únicamente a Supabase + comparación de SHA Git; cambios únicamente en rama aislada basada en PR #97. No migraciones alojadas, no `migration repair`, no `db push`, no cambios en PayPal/Vercel/producción.

## Resultado verificado sobre las 122 versiones remotas

| Clasificación | Número | Decisión |
|---|---:|---|
| SQL idéntico byte por byte entre `statements` y archivo Git | **96** | Evidencia fuerte de identidad de fuente histórica |
| SQL con diferencia textual pero secuencia de tokens equivalente | **24** | Conservar SQL operativo; no renombrar ni sustituir por texto sin transacción |
| `statements` contiene solo una descripción, no el SQL ejecutable | **2** | **Requiere evidencia independiente del SQL aplicado**; conservar archivo Git ejecutable |
| Archivos Git sin registro remoto correspondiente | **8** | Evidencia prehistórica pendiente; no asumir que se aplicaron íntegros |

Las **24 equivalencias léxicas** se contrastaron individualmente comparando tokens SQL, incluyendo literales y cuerpos `$...$` anidados, ignorando exclusivamente comentarios/espacios y `BEGIN;`/`COMMIT;` exteriores cuando el método de instalación no los almacenó. **No se probó equivalencia semántica mediante replay.**

### Dos registros históricos que NO contienen SQL ejecutable

- `20261022220000_pazo_live_canonical_origin_guarded`: `statements` almacena una descripción de 62 bytes frente a un archivo SQL Git de unos 7,7 KB.
- `20261022222000_pazo_f17_pet_onboarding_integrity`: descripción alojada de 87 bytes frente a un SQL Git de unos 3,5 KB.

**NO** sobrescribir archivos ejecutables con notas alojadas; **NO** reejecutar los archivos originales para aparentar sincronía. El historial alojado documenta que se registró una versión, no el texto real que se ejecutó para estas dos entradas. Se necesita evidencia del instalador y comparación del catálogo funcional actual.

## Baseline cronológico: búsqueda forense de historia de Git

- Commit raíz de PAZO [`0a820136`](https://github.com/DigitalAppcorp/pazo-app/commit/0a82013658ce76b3b785e8d612136f4acb6ccac4), 3-oct-2026: árbol completo de 78 elementos, **sin migraciones SQL ni baseline del esquema de aplicación**; sí config de Supabase.
- Primer SQL versionado hallado [`a201cac3`](https://github.com/DigitalAppcorp/pazo-app/commit/a201cac31f62f7094d734b7461f6e0f4f59d86c4), 5-oct-2026, `feed_like_save_integrity`; requiere tablas preexistentes `posts` e `interactions`.
- `supabase/history/f14_applied/README.md` admite expresamente que el repositorio carece del esquema fundacional.
- `docs/PAZO_REAL_BACKUP_LOCAL_RECOVERY_20261011.md` reporta copia restaurada (11-oct) pero posterior a las ocho migraciones, almacenada **localmente y cifrada, fuera del repositorio**, no un backup previo al 5-oct. Su contenido real no fue inspeccionado aquí. No puede inventarse una base cronológica a partir de ese respaldo posterior.

## Replay forense — comportamiento de CI correctamente definido

El experimento con `supabase/tests/f14/catalog-baseline.sql` **no representa el estado inicial de octubre 5**: contiene el trigger F5 `trg_validate_follow_relationship` mientras el SQL F4 intenta cambiar el tipo de `follows.follower_id`. PostgreSQL 17 rechazó correctamente esa operación después de ejecutar las primeras tres fuentes sobre el fixture F14.

La prueba GitHub Actions a partir de ahora debe verificar la **detección del conflicto cronológico esperado**, no representar el fallo conocido como intento de restauración completa. Una prueba verde con conflicto esperado confirma el diagnóstico y **NO** convierte el replay en PASS. Se conserva evidencia del run fallido anterior #40060715328.

## Siguientes controles, SIN GO a producción

1. Investigar el instalador/log/versionamiento de las dos entradas con descripción histórica, comparando SQL Git con catálogo actual, propietarios y RLS sin mutaciones.
2. Identificar fuente de un baseline **previo al 5-oct**. Un dump posterior de 11-oct permite restaurar un estado posterior, no reconstruir el orden perdido.
3. Resolver las ocho versiones locales no registradas con evidencia individual. No `migration repair` por existencia de objetos.
4. Si se propone archivarlas fuera de `supabase/migrations`, preservar SQL y SHA, revisar referencias en código y asegurar un guard de publicación explícito; no ejecutar archivado a ciegas.
5. Reproducción en PostgreSQL aislado con baseline probado, comprobación de catálogo/RLS/ACL y aprobación Product Owner antes de cualquier cambio hospedado.

**Estado final de esta auditoría: `NO_GO_DB_PUSH / NO_MIGRATION_REPAIR / NO_PRODUCTION_WRITE / NO_MAIN_MERGE`.**
