# PAZO F17 — Diseño de atribución y cohortes privado, inerte y sin instalación

**Estado:** `LOCAL_DDL_DRAFT_ONLY / COLLECTION_OFF / NO_MIGRATION_APPLIED`  
**Autorización:** «ok go» para preparar backend, migración y pruebas. **NO** autoriza instalar DDL, habilitar tracking, modificar producción, recolectar datos ni gastar en Meta.  
**Base:** PR #91, `feat/f17-marketing-firstparty-20261023`, campaña #89 tope $350.

## Entregado en este incremento
- Fuente SQL **preparada**: `supabase/drafts/marketing/pazo_first_party_attribution_v1.sql`; se mantiene fuera de `supabase/migrations` deliberadamente para que despliegues automáticos nunca la recojan.
- `marketing_private`: esquema NO incluido en `supabase/config.toml [api].schemas` (solo public/graphql_public). Tabla de compuerta `enabled=false`, una atribución por owner (`auth.users` CASCADE), seis creatividades allowlist y timestamps de consentimiento/confirmación. Índice por fecha.
- **Sin SELECT, INSERT, UPDATE, DELETE ni EXECUTE** para `PUBLIC`, `anon`, `authenticated` ni `service_role`. Tablas `ENABLE + FORCE RLS` sin policies. Writer `SECURITY INVOKER`, de uso únicamente interno privilegiado, que en OFF no escribe, sin API activa.
- Excluir automáticamente usuarios en `supporter_private.gradual_qa_accounts`, `supporter_private.f16_sandbox_qa_owners`, `admin_private.admin_grants` y perfiles founder de todos los informes; no duplicar/cargar el padrón QA.
- Derivar primera mascota 7 días después del registro desde `public.pets`; D7 solo como **proxy de apertura de pantalla** desde `admin_private.app_activity_daily`, NO retención significativa. Excluir cohortes D7 inmaduras.
- FK con `ON DELETE CASCADE` elimina la atribución cuando Auth elimina la cuenta. Definir retención para cuentas supervivientes y backups antes de activar.
- Prueba sintética de seguridad y cohortes: `supabase/tests/marketing/private-attribution-pg17.sql` y workflow dedicado PostgreSQL17/Node (ninguna conexión hosted); pruebas también comprueban gate OFF y ausencia de API. No se procesan datos reales ni pagos.

## Importante: límite de CLI local
Esta sesión no tiene binario de Supabase CLI ni acceso a la red npm para instalarlo. Su regla exige **crear un archivo de migración mediante `supabase migration new pazo_marketing_firstparty_attribution` antes de copiar el DDL al nombre generado**. Por eso este SQL es un borrador versionado por Git, **no** una migración nombrada/incluida en la carpeta ejecutable. No se inventa un timestamp oficial ni se marca la migración como creada.

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
**Gate T — técnico:** herramienta CLI en entorno con acceso autorizado; crear migration new, copiar SQL draft con verificación de checksum, ejecutar PG17 synthetic y CI global, validar orden de migraciones. No aplicar a Supabase alojado sin GO del PO.
**Gate P — privacidad:** retención, consent/versioning, exclusiones, eliminación y Privacy Policy aprobados.
**Gate L — lanzamiento:** aprobar acceso controlado, instalar versión inerte, verificar hosted readbacks RLS/ACL/0 rows/off, después autorización independiente para cualquier writer o anuncio.

## Seguridad comercial
$350 total solo plan presupuestario; presupuesto Meta **sin gastar**. No incorporar clientes QA, no campañas, sin modificación del sitio oficial ni de PayPal.
