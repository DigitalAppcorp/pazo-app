> **Continuación22-oct:** inspección individual41/41 completada; hallazgo de visibilidad de muro corregido en SQL preparado, aún no instalado en este checkpoint. HIBP solo Pro, sin upgrade autorizado. Evidencia vigente: `PAZO_PUBLIC_RPC_SECURITY_REVIEW_20261022.md`. Las tareas anteriores pendientes de inspección quedan superadas; no es certificación financiera ni GO.

# PAZO Beta — Auditoría de seguridad alojada | 2026-10-20 UTC

Estado: **PRE-BETA REVIEW / SIN AUTORIZACIÓN DE PUBLICACIÓN**. Consulta de solo lectura contra Supabase `mrybvqdebbgcayuvgkkr` después del checkpoint F16. No se revocaron permisos, no se alteraron tablas, Auth ni credenciales.

## Avisos del Supabase Security Advisor
- `rls_enabled_no_policy`: 38 INFO; muchas tablas de esquemas privados usan RLS sin policies como mecanismo deny-all. No agregar policies a ciegas.
- `anon_security_definer_function_executable`: 4 WARN. Se inspeccionó con `pg_get_functiondef` el cuerpo actual de las cuatro funciones y los grants de anon/authenticated.
- `authenticated_security_definer_function_executable`: 38 WARN. **No se ha auditado individualmente el contrato de las 38**; priorizar las que escriben datos, exponen identidades o cambian autorizaciones.
- `auth_leaked_password_protection`: 1 WARN: protección de contraseñas filtradas no habilitada según el Advisor. Requiere revisión/activación manual desde Supabase Auth por el PO, si está disponible en el plan actual, sin comprar ningún add-on. Reconsultar Advisor después; no inferir protección de una captura del formulario.

## Clasificación detallada de las cuatro RPC accesibles por anon
| RPC | Evidencia del cuerpo alojado | Decisión |
|---|---|---|
| `public.f14_content_visible(text,uuid)` | Booleano mediante `moderation_private.is_removed`, que consulta restricciones por kind e ID. Ambas definer con `search_path=''`. | La lectura pública de visibilidad puede ser necesaria para contenido público. Revisar abuso/sondeo de IDs antes de publicar; no revocar sin comprobar clientes. |
| `public.pazo_supporter_public_badges_batch(uuid[])` | Exige entre 1 y 48 IDs no nulos, DISTINCT, solo pet_id/badge/milestone; delega en RPC de beneficios. | Pública intencional para Feed; conservar hasta verificar frontend, límites de volumen y costo. |
| `public.pazo_supporter_public_pet_benefits(uuid)` | Devuelve únicamente badge, theme y milestone; comprueba pet.owner y proyección privada de QA pagada. | Pública intencional para mostrar insignias/tema; examinar enumeración y coste antes de beta. |
| `public.pazo_supporter_public_wall(integer)` | Límite validado 1..48, requiere `wall_consents.revoked_at IS NULL`, owner coincidente, badge verificada; retorna nombre, foto y hito de mascota. | Pública por diseño solo con opt-in; confirmar retirada del consentimiento/reversos y caché antes de beta. |

**Riesgo residual:** esta lectura de definiciones no es pentest, ni demuestra seguridad de cada RPC subyacente. Las cuatro públicas parecen intencionales, pero el estatus es `REVIEW`, no certificación global. No cambiar un definer por invoker sin test de lectura pública y contratos.

## Revisión estructural adicional de definer authenticated (20 oct UTC)
- 38/38 funciones catalogadas por PostgreSQL. Una búsqueda de referencias sintácticas a `auth.uid`, `pazo_is_admin`, `f14_is_moderator` u ownership devolvió 35 con referencia y **3 sin referencia obvia**: dos RPC públicas de visibilidad/insignias ya revisadas y `f14_storage_media_path_unclaimed`, que es auth-only y devuelve un booleano sobre claims de medios. Esta búsqueda no sustituye inspección lógica ni descarta bypass.
- Cinco RPC de panel de analítica (`pazo_admin_overview/users/audience/experiments/voters`) comprueban `public.pazo_is_admin()`; tres RPC de lecturas de moderación (`f14_moderation_queue`, `f14_pending_media`, `f14_media_task`) comprueban `public.f14_is_moderator()`. La función de consulta de media `f14_storage_media_path_unclaimed` no comprueba usuario individual y amerita revisión específica de superficie y llamadas antes del release.
- SQL fue **solo lectura**; no se modificaron grants de `anon` o `authenticated`.

## Release blockers reales
1. Activar o documentar formalmente la excepción de protección de contraseñas filtradas; revalidar aviso.
2. Verificar superficies `authenticated` SECURITY DEFINER con prioridad a write/moderación/admin.
3. Capturas y aceptación visual PO de F16 (Mi membresía/Amigo de PAZO), cuatro beneficios, panel admin responsive y acceso PWA.
4. CI y build del SHA final, HTTPS PWA instalada/no instalada, legal efectivo, rollback y autorización PO para Preview final/merge.
5. Beta pública gratis puede salir con altas financieras deshabilitadas y Live OFF; la ruta de cobrar Live pertenece a un release posterior independiente.

## Observaciones de infra
- `pazo-app-t83r`: revisión read-only de 20 deployments recientes no encontró commits `db241725`, `f6a2736`, `5ca845f`, `ebbaafd`, `49c2531`; último SHA mostrado `a218ab3` (Preview READY). Esto **no comprueba** por sí solo la bandera efectiva de supresión automática de Preview.
- Entorno Vercel Production metadata: flags `VITE_PAZO_F16_SANDBOX_QA_UI` y `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED` aparecen únicamente en Preview de la rama F13; no están enumerados como variables Production. El build final debe fijarlos explícitamente en `false`.

Referencias:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- `docs/PAZO_MVP_TO_LIVE_EXECUTION_ROUTE_20261019.md`
