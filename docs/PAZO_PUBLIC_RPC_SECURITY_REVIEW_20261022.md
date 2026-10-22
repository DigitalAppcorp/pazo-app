# Auditoría de RPC privilegiadas públicas — 22-oct-2026

## Alcance y evidencia

Catálogo alojado de solo lectura: **41 SECURITY DEFINER** en `public` con EXECUTE
para authenticated;37 auth-only y4 también anon. Se leyeron íntegramente las41
definiciones y los helpers/policies relevantes, no solo búsqueda de auth.uid.
**41/41 search_path vacío**, referencias calificadas. Fingerprint SHA256 del
snapshot de definiciones/settings/signatures (sin datos ni claves):
`192af94d1c6dc5177b6863723146e92f1e12835ac81939be163e59637686cc11`.

Esto cierra la inspección individual pendiente del Advisor; no es pentest ni
certifica toda la autorización runtime. No identidades/MFA simuladas alojadas,
no datos de clientes consultados o exportados. Los grants no se revocan a ciegas.

## Hallazgo y corrección

**Reproducido en PG17:** con cobertura Live verificada sintética y opt-in, una
mascota restringida por moderación seguía en `pazo_supporter_public_wall`. Los
lectores SECURITY DEFINER omitían la policy restrictiva de pets. Migración
`20261022021500_pazo_f16_public_benefits_visibility.sql` agrega el mismo contrato
`f14_content_visible('pet_profile',id)` al lector de beneficios, antes de resolver
Live/QA. El muro ya exige badge de ese lector, por lo que tampoco devuelve
nombre/foto/hito del perfil retirado. No borra historial ni pago, y una revisión
que restablezca el perfil conserva sus beneficios verificados y opt-in.

La sospecha inicial de bypass del límite48 mediante matrices **fue descartada**:
array_position ya rechazaba matrices con SQLSTATE0A000. Se hizo explícita la
validación de dimensión/cardinality para obtener22023, manteniendo el rechazo,
no para corregir un bypass inexistente. Vectores0/49, NULL y elementosNULL se
rechazan;48 elementos y deduplicación siguen funcionando.

Estado de este checkpoint: código+PG17 PASS, **SQL aún NO APLICADO**; se instalará
solo tras CI exacto y ensayo transaccional alojado, con postflight. Fuentes
previas2/2 coinciden con el catálogo inspeccionado. CREATE OR REPLACE conserva
ACL, sin grants nuevos ni cambios de datos, retención, selector o proveedor.

## Inspección de contratos

| RPC | Comprobación del cuerpo alojado |
| --- | --- |
| `f14_can_interact(uuid)` | UID actual; consulta solo relación bilateral del actor; booleano. |
| `f14_content_visible(text,uuid)` | Lectura pública intencional de visibilidad; booleano sin identidad/payload. |
| `f14_is_moderator()` | UID actual contra grant privado; booleano. |
| `f14_media_task(text,uuid)` | Grant moderador antes de leer tarea pendiente; tipos cerrados. |
| `f14_moderation_queue(integer,integer)` | Grant moderador; límite1..30; solo cola de reportes. |
| `f14_my_blocked_accounts()` | Solo relaciones donde participa auth.uid(). |
| `f14_pending_media(integer)` | Grant moderador; límite1..30. |
| `f14_review_report(uuid,text,text)` | Grant moderador antes de lock/escritura; acciones/notas acotadas; audit. |
| `f14_storage_media_path_unclaimed(text,text)` | Guard booleano de retención; no acceso a objeto/claim ni escritura. Ver policies aparte. |
| `f14_submit_report(text,uuid,text,text)` | Actor del JWT, contenido visible existente, límite5/24h serializado; no actor elegido por cliente. |
| `pazo_admin_audience(text,integer)` | Admin vigente; módulo/límite validados. Emails solo al admin autorizado. |
| `pazo_admin_experiments()` | Admin vigente; agregados de catálogo cerrado. |
| `pazo_admin_live_finance_summary()` | UID+admin vigente; agregados de períodos/holds; no saldos PayPal. |
| `pazo_admin_live_readiness()` | UID+admin vigente; booleanos sin claves/identidades. |
| `pazo_admin_live_release_status()` | UID+admin vigente; modo/revisión/readiness, sin activar selector. |
| `pazo_admin_overview(integer)` | Admin vigente; ventanas7/30/90; métricas agregadas. |
| `pazo_admin_paypal_audit()` | UID+grant vigente; últimos30 cambios privados de configuración. |
| `pazo_admin_paypal_save_credentials(text,text,text)` | UID+grant; exclusivamente Sandbox; Vault server-only; Live rechazado. |
| `pazo_admin_paypal_save_draft(text,text,integer,text,text)` | UID+grant; formato/importe/origin validados; invalida verificación, no activa Live. |
| `pazo_admin_paypal_settings()` | UID+grant; metadata y presencia de secretos, nunca contenido Vault. |
| `pazo_admin_users(integer,integer)` | Admin vigente; paginación1..50; directorio privado al admin. |
| `pazo_admin_voters(text,integer)` | Admin vigente; módulo/límite acotados; audiencia privada al admin. |
| `pazo_community_accept_transfer(uuid)` | Candidato=UID actual/admin de comunidad; solicitud baja+oferta vigente+owner bloqueados; cambio atómico. |
| `pazo_community_decline_transfer(uuid)` | Solo candidato UID actual; oferta pending/no vencida. |
| `pazo_community_offer_transfer(uuid,uuid)` | Owner UID actual+solicitud de baja; candidato ya admin, distinto; locks y vencimiento7d. |
| `pazo_community_set_admin(uuid,uuid)` | Owner UID actual+solicitud de baja; miembro existente/UID válido; no autopromoción. |
| `pazo_community_transfer_offer(uuid)` | Solo owner/candidato UID actual; oferta vigente vinculada a baja. |
| `pazo_deletion_cancel()` | Auth existente; cancela solo solicitud propia requested. |
| `pazo_deletion_request()` | Auth existente; crea/reabre solo solicitud propia; no elimina cuenta. |
| `pazo_deletion_status()` | Auth existente; solo estado/fecha propia. |
| `pazo_ensure_my_profile()` | Auth existente; solo ID propio con valores iniciales false; no founders/admin. |
| `pazo_is_admin()` | UID actual contra grant privado; booleano. |
| `pazo_supporter_my_account_status()` | Auth confirmado/no anónimo; cobertura propia real; QA separado allowlist. |
| `pazo_supporter_public_badges_batch(uuid[])` | Público intencional: solo pet/badge/hito, DISTINCT y límite48. Forma unidimensional explícita en parche. |
| `pazo_supporter_public_pet_benefits(uuid)` | Público intencional: badge/tema/hito, owner actual/períodos/holds. PARCHE de visibilidad moderada requerido. |
| `pazo_supporter_public_wall(integer)` | Público intencional: opt-in vigente+owner actual+badge; límite48. Se beneficia del filtro corregido del lector anterior. |
| `pazo_supporter_set_pet_theme(uuid,text)` | Auth confirmado, mascota propia bloqueada, tema cerrado+cobertura; retirada permitida tras vencimiento. |
| `pazo_track_activity(text)` | UID actual; módulo cerrado; clave día/módulo evita repetición; no contenido/email/GPS. |
| `pazo_wall_consent_disable(uuid)` | Auth existente+mascota propia bloqueada; retira solo permiso propio. |
| `pazo_wall_consent_enable(uuid,text)` | Auth existente+mascota propia bloqueada+cobertura verificada+notice exacto; opt-in idempotente. |
| `pazo_wall_my_consents()` | Auth existente; pet.owner y owner_at_grant=UID actual. |

## Guards de Storage y RLS sin policies

`f14_storage_media_path_unclaimed` no selecciona por owner: es un guard de
retención adicional, deliberadamente reutilizable por policies restrictivas
INSERT/UPDATE/DELETE/copia. Devuelve solo si existe un claim held para un path.
No otorga acceso a objeto ni permite mutación; se inspeccionaron las policies
permisivas reales de Storage: exigen carpeta de UID y, cuando corresponde,
comunidad/autor/documento/mascota propios. Conservar este guard y sus grants;
quitarlo rompería protección de archivos durante moderación. La lectura directa
del booleano no revela payload/owner/URL ni cambia claims.

Consulta real adicional: **ninguna tabla public con RLS carece de policies**.
Los casos sin policies están en esquemas privados o Auth/Storage gestionados.
Los privados inspeccionados niegan SELECT anon/authenticated; deny-all es
intencional. No añadir policies PUBLIC. Tablas gestionadas de Storage pueden
tener grants y RLS sin policy: continúa denegación predeterminada; no alterar
infraestructura del proveedor para ocultar un INFO.

## Contraseñas filtradas y plan actual

Auth real: HIBP=false. La documentación oficial limita leaked password protection
a Pro o superior: https://supabase.com/docs/guides/auth/password-security.
PAZO usa plan Free según runbook; no se contrata upgrade/add-on ni se afirma que
un flag habilitaría una prestación no disponible. MFA TOTP de administración
continúa activo; frontend mantiene política de contraseña ya aceptada. No se
reabre QA Auth aprobado ni se cambia su política en esta auditoría.

La ausencia de HIBP se documenta como riesgo residual del plan actual que el PO
debe conocer en su GO final, no como protección activa ni compra implícita.
No se sustituye por enviar contraseñas a otro servicio. La excepción de
lanzamiento no se presume aceptada por este documento.

## Verificación y reversión

Laboratorio gateway PG17 completo PASS, incluido caso que reproduce fuente
anterior dentro de savepoint, rollback que restaura el parche, lectura anon real
que oculta el perfil, rol authenticated tras restablecer visibilidad, retirada
de consentimiento, ausencia de perfil y límites de lote. Sin nuevas ventas o
PayPal remoto. Governance PASS; última suite frontend1,813/build/dist PASS.

DDL se ensayará con BEGIN/ROLLBACK en hosted; al aplicarlo, verificar prosrc2/2,
ACL conservadas y estado financiero OFF. Si un ensayo falla no se confirma la
transacción. Después de instalar, resolver por roll-forward; no restaurar un
lector que expone perfiles retirados para declarar un rollback exitoso. Los
controles financieros de stop/rollback de P4 no cambian.
