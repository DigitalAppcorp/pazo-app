> VIGENTE: decisión del Product Owner, atribución interna AUTOMÁTICA sin casilla en registro. Cualquier propuesta de opt-in UI o cadena `pazo-marketing-optin-v1` más abajo es histórica y queda reemplazada por `docs/PAZO_MARKETING_AUTOMATIC_INTERNAL_ATTRIBUTION_20261023.md`. Privacidad/retención y activación siguen pendientes.

# PAZO F17 — Diseño de atribución y cohortes privado, inerte y sin instalación

**Estado:** `CLI_NAMED_MIGRATION_IN_DRAFT_PR / COLLECTION_OFF / NO_MIGRATION_APPLIED`  
**Autorización:** «ok go» para preparar backend, migración y pruebas. **NO** autoriza instalar DDL, habilitar tracking, modificar producción, recolectar datos ni gastar en Meta.  
**Base:** PR #91, `feat/f17-marketing-firstparty-20261023`, campaña #89 tope $350.

## Entregado en este incremento
- Fuente SQL **preparada**: `supabase/migrations/20261024020632_pazo_marketing_firstparty_attribution.sql`; se conserva en rama separada y PR DRAFT, sin merge ni deploy.
- `marketing_private`: esquema NO incluido en `supabase/config.toml [api].schemas` (solo public/graphql_public). Tabla de compuerta `enabled=false`, una atribución por owner (`auth.users` CASCADE), seis creatividades allowlist y timestamps de consentimiento/confirmación. Índice por fecha.
- **Tablas privadas cerradas** a `PUBLIC`, `anon`, `authenticated` y `service_role`, con `ENABLE + FORCE RLS`. Funciones internas cerradas; el único puente explícito `public.pazo_marketing_record_verified_v1` es `SECURITY DEFINER` con **EXECUTE exclusivamente a `service_role`**, y gate de escritura OFF. Esta excepción se limita al puente API desde un servidor que compruebe Auth; nadie en el navegador recibe la clave.
- Excluir automáticamente usuarios en `supporter_private.gradual_qa_accounts`, `supporter_private.f16_sandbox_qa_owners`, `admin_private.admin_grants` y perfiles founder de todos los informes; no duplicar/cargar el padrón QA.
- Derivar primera mascota 7 días después del registro desde `public.pets`; D7 solo como **proxy de apertura de pantalla** desde `admin_private.app_activity_daily`, NO retención significativa. Excluir cohortes D7 inmaduras.
- FK con `ON DELETE CASCADE` elimina la atribución cuando Auth elimina la cuenta. Definir retención para cuentas supervivientes y backups antes de activar.
- Prueba sintética de seguridad y cohortes: `supabase/tests/marketing/private-attribution-pg17.sql` y workflow dedicado PostgreSQL17/Node (ninguna conexión hosted); pruebas también comprueban gate OFF y ausencia de API. No se procesan datos reales ni pagos.

## Migración versionada — solo GitHub, sin aplicación hospedada

La sesión de agente carece de Supabase CLI en su contenedor, pero el job aislado de GitHub Actions ejecutó la CLI oficial **v2.121.0** y generó el nombre `20261024020632_pazo_marketing_firstparty_attribution.sql` (run `40052740127`). Copiamos el SQL ya probado al archivo versionado con ese nombre en el PR #91; el borrador duplicado fue retirado. Esta operación fue **GitHub-only** y no se ejecutó `supabase db push`, `apply_migration`, ni SQL sobre Supabase alojado.

La migración puede contener DDL ejecutable, pero el **PR permanece DRAFT y sin fusionar**. Su contenido y política de retención requieren revisión/GO separados antes de instalación. Las pruebas PostgreSQL 17 verifican solo una instancia desechable.

## Problemas y decisiones antes de habilitar
1. Aprobar política de captura/conservación (p.ej. 90 días) de campaña/creatividad vinculadas a UID, borrado de cuenta y backups. La redacción de Privacy Policy debe reflejar el procesamiento real.
2. Resolver consentimiento/opt-in válido, retrocompatibilidad, revocación, base legal y prueba de consentimiento; el borrador incluye metadatos, **pero no prueba** que el opt-in sea legítimo.
3. Servicio privado que verifique sesión/usuario, generación de intent y consentimiento sin confiar en `p_owner` arbitrario del cliente. Jamás conceder EXECUTE a roles API por comodidad.
4. Reducir errores de atribución por confirmación de correo en otra pestaña/dispositivo; el POC client-side actual guarda en `sessionStorage`, no en backend.
5. Separar first pet within 7d (activación) de primera acción útil real y retention D7; integrar un evento auditado de valor en un siguiente gate.
6. Auditar diferencias entre F17 actual y PR #91, y volver a correr pruebas tras la migración creada con CLI.
7. El diseño de QA bebe de `gradual_qa_accounts`, tabla instalada bajo F16. En local de cero primero versionar/habilitar esa dependencia, o usar fixture sintética como el PG test; no recrear QA productivo a partir de umbrales de fecha.
8. Aun tras aplicar el DDL con gate OFF, ningún sistema escribirá hasta instalar y autorizar expresamente el puente privado de ingesta. No enviar Pixel/CAPI/GA4/PostHog.

## Gates siguientes
**Gate T — técnico:** CLI de nombre generado y archivo agregado a PR, pendiente revisión final de checksum/orden y CI exacto de HEAD antes de cualquier GO de instalación; no aplicar a Supabase alojado sin GO del PO.
**Gate P — privacidad:** retención, consent/versioning, exclusiones, eliminación y Privacy Policy aprobados.
**Gate L — lanzamiento:** aprobar acceso controlado, instalar versión inerte, verificar hosted readbacks RLS/ACL/0 rows/off, después autorización independiente para cualquier writer o anuncio.

## Seguridad comercial
$350 total solo plan presupuestario; presupuesto Meta **sin gastar**. No incorporar clientes QA, no campañas, sin modificación del sitio oficial ni de PayPal.

## Incremento: contrato de ingesta privada, sin despliegue
- `supabase/functions/pazo-marketing-attribution/index.ts`: `MARKETING_INTAKE_RELEASED=false`, sin rutas operativas ni acceso a proveedores; la aplicación conserva `PAZO_MARKETING_COLLECTION_ENABLED=false`.
- `intakeCore.mjs`: mismo-origin estricto, bearer obligatorio, JSON de tamaño limitado por lectura en streaming (768 bytes), campos UTM/consent con lista cerrada, fecha válida/TTL, Auth confirmado, cuenta creada después del contacto y UUID tomado **solo** del resultado Auth de servidor. No lee ni registra PII. Solicitudes sin opt-in se rechazan.
- `intakeAdapter.mjs`: acceso server-side a Supabase Auth `GET /auth/v1/user` con token de usuario; posterior RPC service-only. La ruta y clave de proyecto se validan contra el proyecto canónico. No se suministran secretos al cliente. Esta integración no funciona ni toca Supabase mientras el handler esté OFF.
- `marketing_private.record_verified_acquisition` **registra `consent_recorded_at` con hora del servidor**, no recibe fecha de consentimiento del navegador. El RPC público está restringido a `service_role`; PostgreSQL17 prueba permisos, apagado, QA, idempotencia, cohortes y borrado de cuenta.
- **Limitación real**: `consent.granted=true` es una afirmación explícita del cliente autenticado, no un comprobante independiente de clic/UI. Se necesita decisión y revisión de UX/Privacy Policy, consentimiento revocable y validación legal antes de activar; también se requiere cierre de retención y tratamiento de backups.
- **No declarar medición Live, activación, D7 real ni instalación**. Los resultados de suites en GitHub dependen del HEAD del PR; retener CI final verificable.

## Verificación de esta etapa
- Auth server `GET /auth/v1/user`, validación de JWT no basada en decodificación local; puente service-only validado por PG17.
- Marketing `intakeCore.mjs` e `intakeAdapter.mjs` con suites de rechazo (no consentimiento, cuenta antigua, origen ajeno, tamaño de body, fraude de UID), además de UTM/embudo local.
- Gate HTTP `MARKETING_INTAKE_RELEASED=false`; gate cliente `PAZO_MARKETING_COLLECTION_ENABLED=false`; gate DB `collection_gate.enabled=false`.
- El paso final será crear prueba E2E consentida y revisar política/retención antes de cualquier ingestión alojada. Nada de Pixel o gasto de campaña.

## Retención y revocación — gate preparado (23-oct-2026, sin activar)
- Revisión formal propuesta en `docs/PAZO_MARKETING_PRIVACY_RETENTION_REVIEW_20261023.md`. `30 días` es **recomendación**, no decisión del PO ni plazo operativo. El límite duro del esquema es 90 días; `retention_days=0` al instalar, `policy_version=NULL` y `collection_gate.enabled=false`. La base rechaza activar la captura sin retención positiva y versión de política.
- El lector de cohortes oculta filas fuera de la ventana configurada. Para eliminación física, `marketing_private.prune_expired()` y puente `public.pazo_marketing_prune_v1()` (service_role únicamente) eliminan filas caducadas cuando **alguien los ejecute**. **Ningún scheduler instalado**: no afirmar purga periódica todavía.
- `public.pazo_marketing_withdraw_v1(p_owner)`, `service_role` únicamente, elimina la atribución de una cuenta; la futura UI de Ajustes y su endpoint deben obtener el owner desde Auth verificado. Una solicitud de baja no es un Auth DELETE consumado.
- Cuando `auth.users` se elimina efectivamente, `ON DELETE CASCADE` retira la atribución de esa cuenta; backups/PITR y copias externas conservan su propio ciclo y deben revisarse antes de declarar eliminación completa.
- Suites de PostgreSQL 17 agregan denegaciones a roles cliente, imposibilidad de activar retención cero, revocación idempotente y purga sintética. Sin efecto alojado.
