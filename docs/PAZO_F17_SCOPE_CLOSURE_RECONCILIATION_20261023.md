# PAZO — Reconciliación de cierre F17 antes de fusionar main

**Corte técnico:** 23-oct-2026, noche de Los Ángeles (SQL UTC 24-oct 03:00). **Rama base:** `f17/beta-final-mobile-support-admin-20261022` / [PR #81](https://github.com/DigitalAppcorp/pazo-app/pull/81). **Producción ya publicada:** `https://pazo-app.vercel.app/`, Vercel `dpl_ESNkTmyXqtaybJYyUXakNjnqw8qx` READY, commit `bf78b857cfaf470d13703db0a88b6ecf3b345a73`, **aceptado visualmente por el PO**. Se prohíbe fusionar `main` sin GO posterior, alterar PayPal o repetir pruebas monetarias QA.

## Estado de scope y evidencias

| Área | Programación y ambiente | Evidencia / límite |
| --- | --- | --- |
| UI móvil, dock, scroll, Feed, Comunidades | **PASS funcional por aceptación PO** | Versión oficial validada por el PO; no reabrir ajustes visuales aprobados |
| Mapa Mapbox Standard, carrusel, navegación externa y fotografías | **PASS visual por PO** | Mapa y demás módulos revisados en versión oficial; Mapbox fallback no constituye 3D real si falla el proveedor |
| Instalación PWA y rutas SPA/callback | **PASS funcional reportado por PO; tests CI** | El PO había instalado PWA; CI/Chromium/manifest/retornos cubiertos; no afirmar prueba real de compra por callbacks |
| Soporte privado y panel administración | **DB/Edge/CI PASS** | Retención 90 días, límites y RLS; Soporte E2E autenticado completo estaba expresamente POST-BETA, no inventar ejecución posterior |
| Cortesías / beneficios otorgados por admin | **DB/CI PASS** | Regalo no representa pago ni ledger; los RPC de beneficios mantienen autoridad; UI Live visual habilitada por defecto |
| Mantenimiento y recuperación | **DB/CI PASS, mantenimiento OFF** | Kill-control protege CREATE nuevos; no interrumpir cancelaciones/worker. No activar mantenimiento para probar |
| PayPal Live | **L1 ACTIVE (capacidad 1)** | `mode=limited`, `gradual_health()=true`, `legacy_open()=0`, gate certificado; 8 Auth antiguas clasificadas QA, ninguna invitación; 0 períodos pagados, 0 HELD/incidentes |
| Primer pago Live, ledger, insignias, renovaciones/reembolsos reales | **NO OBSERVADO** | Evidencia sintética/PG17 pasa; no cobrar ni falsificar pago de usuario real para completar checklist |
| CI exacto HEAD F17 previo a reconciliación | **PASS** | Cuatro workflows asociados a `bf78b85`: 40052936772 / 40052935065 / 40052934982 / 40052934988 |
| Integración a `main` | **PENDIENTE DEL GO DEL PO** | PR #81 DRAFT, base `main` `a99f05d`, 180 archivos, 276 commits históricos; no squash arbitrario sin revisar |

## Bloqueo detectado y remediación solo del repositorio

**Riesgo real:** Supabase aplicó las últimas cuatro migraciones L1 mediante Management API con versiones **distintas** de los prefijos de nombre usados en F17. Se confirmó independientemente tanto en `supabase_migrations.schema_migrations` como en `list_migrations`. Si una operación futura usa la CLI y ve los prefijos originales como pendientes, puede intentar reinstalar tablas, funciones y políticas financieras ya existentes. **No se usará db push para este release ni se tocará el ledger.**

Se reemplazaron únicamente sus **nombres de archivo**, preservando exactamente los bytes SQL (mismo Git blob SHA-1; prueba adicional SHA-256), en el orden instalado:

| Versión vieja en rama | Versión efectiva alojada, ahora usada en filename |
| --- | --- |
| `20261023211315` | `20261023224519` |
| `20261023234845` | `20261023235424` |
| `20261023235247` | `20261024001615` |
| `20261024000800` | `20261024003716` |

Se actualizan también los lectores locales de esas rutas (stage/lab PG17 y 2 tests), y se incorpora `scripts/f17-hosted-migration-versions.test.mjs` al workflow gradual para validar que **no** estén los timestamps anteriores, que los nuevos sean únicos y que los cuatro SQL preserven sus hashes SHA-256 originales aprobados por #84/#85. No se ejecutó ninguna migración alojada ni se cambió versión/tabla/historial Supabase.

**Nota histórica:** los documentos de instalación #84/#85 citan los nombres fuente originales, válidos en el momento de aquel despliegue; esta tabla es la correspondencia canónica para el repositorio actual. Ninguna renumeración cambia cuándo, cómo ni por qué se desplegó el SQL.

## Gates exactos para decidir la fusión a main

1. CI de este PR de alineación debe terminar **PASS completo**, incluidos PG17 aislado, concurrencia, políticas/RLS, gobernanza, test sintético financiero, navegador, compilación y test de migraciones; los 4 SQL renombrados deben resultar idénticos byte por byte.
2. Revisar diff final `main...F17`: confirmar que esta reconciliación no modificó lógica de producto, DDL, secretos, precio, generación Merchant, webhook o despliegue oficial. `main` no puede avanzar silenciosamente durante una fusión.
3. Confirmar el GO del PO **para fusionar PR #81 a main**. La aprobación visual, el GO L1 y el GO de publicación Vercel anteriores **no equivalen** a un GO de merge de esta revisión masiva.
4. Inmediatamente después del eventual merge autorizado: comprobar `main` SHA/CI, que Vercel sigue apuntando al frontend aprobado (o al build equivalente si el Git integration se activa), y que Supabase sigue `L1/limited/cap1` con cero incidentes. **No lanzar `db push` contra producción** ni habilitar `public`.
5. Continuar comprobaciones de la **primera venta auténtica**, cuando un comprador real consienta: evento PayPal firmado, transacción verificada, período y beneficio; separar ese gate futuro del merge de código.

**Estado provisional:** `F17_CODE_AND_HOSTED_ACCEPTED` · `MIGRATION_VERSION_DRIFT_PATCH_PREPARED` · `POST_PATCH_CI_PENDING` · `MAIN_NOT_MERGED` · `FIRST_LIVE_PAYMENT_NOT_YET_OBSERVED`. Marketing gestionado por otro agente.
