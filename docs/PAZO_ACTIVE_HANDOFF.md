# PAZO — ACTIVE HANDOFF / SNAPSHOT OPERATIVO

**Verificado:** 2026-10-08 (última verificación remota; migraciones fechadas en UTC 2026-10-09). Actualizar branch/CI/db antes de escribir código.
**Sistema de trabajo:** [Project Brain OS v1.4.1](https://github.com/DigitalAppcorp/project-brain-os), `SKILL.md` + `patterns/VERIFIABLE_HANDOFF.md`.
**Product Owner:** define visión, prioridades y aceptación visual; IA/ChatGPT realiza análisis, arquitectura, código, GitHub, Supabase, QA técnico y handoffs.
**MODO TEMPORAL:** `hosted-first` para MVP en Preview controlado, sin pedir terminal/descargas ni delegar a otra IA; al lanzar reevaluar local-first.

## 1. Fuente de verdad, Git y alcance

- Repositorio: `DigitalAppcorp/pazo-app`.
- **Rama activa F14 A2:** `f14/block02-moderation-mvp-20261008`. Último HEAD auditado ANTES de commits documentales de este ciclo: **`594e1c916d4aa4d26e7fd9c2513800803347e5ca`**. Consultar HEAD/CI de nuevo en el siguiente chat.
- `main` observado: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90` (distinto de la rama F14).
- Único PR abierto observado: **#34** `product/places-demand-validation`, sobre Lugares y **no relacionado** con F14. No se encontró PR F14 abierto en esta consulta; verificar de nuevo.
- Dos checks sobre HEAD `594e1c9`: **SUCCESS** (`Vercel – pazo-app` y `Vercel – pazo-app-t83r`). Preview F14: https://vercel.com/digitalapp/pazo-app-t83r/55Qz33nsAyzbBBkgrFraRAAyr8qc . El resultado CI no prueba que el usuario haya ejecutado el botón de QA.
- **No merge a main ni publicación oficial de PAZO**. Los deploys automáticos de rama/Preview no equivalen a lanzamiento.
- Working tree local de Antigravity, commits locales no empujados: **desconocidos** en este punto; no inferir que GitHub contiene trabajo local no observado. Pedir solo si el trabajo siguiente depende de ello.
- Reglas: `AGENTS.md`, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_F14_MASTER.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_DATA_INVENTORY.md`, `docs/PAZO_ARCHITECTURE_CONTRACT.md`.
- Este snapshot sustituye el estado cronológico anterior; historial íntegro archivado en `docs/archive/PAZO_ACTIVE_HANDOFF_THROUGH_20261009.md`. Consultar archivo solo si falta evidencia específica.

## 2. Estado de producto y etapa

PAZO es una red social de mascotas orientada inicialmente a Los Ángeles, 18+, con núcleo real: Feed, perfiles públicos de mascotas, Comunidades, Lugares/mapa, búsqueda global y utilidades para mascotas. Producto: **ayudar primero, validar uso/aceptación antes de monetizar**; extensiones de insignias, eventos, servicios y patrocinios sujetas a su gate. No confundir MVP validatorio con alcance futuro completo.

**Módulo activo:** F14 (confianza, moderación y privacidad), Bloque 02 **A2 EN CURSO, Gate 8 ABIERTO**. F14 A3/A4 no autorizados. Fases 8 Lugares y 12 Búsqueda ya figuran cerradas en sus documentos; no reabrir sin evidencia.

## 3. Evidencia pasada que NO hay que repetir

- **Denunciar → Descartar**: PO lo probó con sesión real en Preview; reporte y acción verificados en Supabase. Fixture temporal limpiada por ID exacto.
- **Denunciar → Despublicar**: PO lo probó con sesión real; `report.status=removed`, acción auditada, restricción creada; consultas SQL como `anon`/`authenticated` ocultaron la publicación retirada y mantuvieron otras legibles. Fixture de texto sin medios eliminada de forma controlada.
- **Clasificación de medios:** migración alojada `20261009010551_f14_media_status_presence_guard` PASS. Publicaciones Feed/Comunidad sin fotos no crean falsas tareas de archivo; con medios sí; perfil de mascota conservador.
- **Reservas privadas de medios:** migración `20261009014616_f14_media_claim_preflight` aplicada. Tablas `moderation_private.media_claims/media_claim_events`; RPCs `f14_prepare_media_claim` y `f14_recheck_media_claim` `service_role` únicamente. Pruebas reversibles para rutas nuevas/históricas, idempotencia, expiración, drift, referencias compartidas, host externo. Candidato `candidate_only`, NUNCA autorización para borrar.
- **Bloqueo de escrituras sobre rutas reservadas:** migración `20261009040957_f14_storage_held_media_guard` instalada; políticas RESTRICTIVE para INSERT/DELETE de usuario autenticado sobre rutas de Feed/Comunidad con reserva activa; conserva políticas originales, no aplica a `service_role`, no es CAS completo entre servicios.
- **Autorización Auth REAL (PO screenshots)**: dos cuentas distintas, `Normal` y `Moderadora`, **6/6 PASS ambas**, con versión estricta del comprobador que exige SQLSTATE `42501` en accesos prohibidos (commit `38a2bcc`). No pedir de nuevo esa prueba. Runner CLI de dos JWT independientes es evidencia separada y no fue ejecutado; la prueba visual de navegador sí pasó.
- Inspector V2 de medios/estudio de rutas/29 casos sintéticos preparado; no implica borrado seguro.
- Estas pruebas NO equivalen a validación global de CDN, retención o contenido con archivos. A2 NO cerrado.

## 4. Backend/Storage comprobado justo antes del handoff

**Supabase PAZO:** proyecto `mrybvqdebbgcayuvgkkr` (endpoint hospedado, no BD local). Consulta de solo lectura más reciente:
- 0 denuncias, 0 restricciones, 0 reservas, 0 eventos de reservas;
- 1 moderador;
- **20 objetos Storage**. Una auditoría anterior tenía 19: objeto adicional no atribuido, **no tocarlo ni asumir que es de prueba**.
- Buckets: `post-photos`, `pet-avatars`, `community-post-photos`, `community-avatars` (públicos) y `pet-documents` (privado). No borrar documentos.
- Edge `f14-moderation-purge` desplegada en versión 1 como **stub HTTP 503 sin código de eliminación**. No activarla.
- Restricciones SQL sobre post no invalidan URLs públicas ya conocidas. La documentación oficial de Supabase indica que eliminación de bytes se hace mediante Storage API, nunca SQL DELETE en `storage.objects`; la propagación Smart CDN puede tardar ~60 s y cachés del navegador pueden persistir.
- No existe aún confirmación segura de eliminación por objeto+versión/claim, ni un CAS transaccional efectivo que abarque DB + Storage API, ni verificación de borrado CDN. **NO declarar media `purged` usando `f14_confirm_media_cleanup(kind,id)`**: es insuficiente.

## 5. ÚLTIMA ACEPTACIÓN VISUAL — STORAGE SINTÉTICO: PASS

**2026-10-08 local, confirmación del Product Owner con captura real del Preview F14.** El panel `Prueba aislada de Storage F14` mostró:
- PASS cuenta autenticada;
- PASS imagen artificial de 1 píxel creada;
- PASS archivo localizado por Storage API;
- PASS eliminación del archivo sintético y ausencia confirmada por Storage API.

**Verificación adicional directamente en Supabase (solo lectura):** `storage.objects` mantiene 20 objetos, `post-photos/%/f14-storage-probe-%` tiene **0**, `moderation_private.media_claims` 0, eventos 0, reportes 0 y restricciones 0. No se generó un nuevo borrado ni se modificó contenido de usuarios. Una sexta mascota aparece en recuento agregado de `pets` (anteriormente cinco); procedencia desconocida, NO tratarla como fixture ni limpiarla.

**Gate visual aislado CERRADO.** No volver a pedir al PO que pulse el botón. **A2 global permanece ABIERTO**: esto no prueba `service_role`, claim real, carrera entre DB/Storage, objeto de contenido retirado ni CDN.

### Auditoría técnica posterior, sin mutaciones de Supabase

- El Storage RLS actual tiene `RESTRICTIVE` para `INSERT` y `DELETE` sobre rutas reservadas de Feed/Comunidad. **No existe actualmente una política permisiva UPDATE**; sobrescribir vía upsert autenticado ya carece de esa autorización. Falta garantizar de forma explícita `UPDATE` si en el futuro se conceden permisos, y estudiar operaciones de servicio/MOVE/COPY.
- `service_role` bypass RLS; el claim de cinco minutos y locks transaccionales NO constituyen CAS entre Supabase DB y Storage HTTP.
- Supabase documenta purge manual de CDN en plan Pro o superior; no se autoriza upgrade. Caché CDN y caché navegador requieren tratamiento separado.
- Diseño fail-closed y retención preliminar versionados en `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md`. Solo diseño; **no hay endpoint destructor ni nueva migración aplicada**.
- El asesor de Supabase informa advertencias `SECURITY DEFINER` en RPCs F14, incluida función auxiliar RLS expuesta; se requiere análisis de permisos/alcance antes de migrar, sin asumir explotación ni eliminar grants precipitadamente.

## 6. Autorizaciones, límites y forma de colaborar

La última indicación del PO: **«tienes toda la autorización en todos los pasos que no necesiten una aprobación visual mía»**. Esto permite avanzar autónomamente en F14 A2 con auditoría técnica, cambios de código en rama, verificaciones reversibles y mantenimiento documental, sin micro-preguntar cada paso. El PO solo debe probar flujo visual/decisiones de producto; GPT es responsable técnico y no delega a otra IA.

**No interpretar autorización general como permiso para**: borrar fotografías/documentos de usuarios, desplegar purga real, borrar/modificar otras cuentas, crear recursos pagados, desplegar producción oficial, cambiar políticas de retención de forma sustantiva, merge de `main` ni saltar a F14 A3/A4. Respetar aprobaciones remotas de `AGENTS.md`: explicar siempre alcance/risgo de mutaciones sensibles y pedir aprobación específica si aplica. No repetir debates aprobados o pedir claves/JWTs al usuario.

Trabajo con conectores GitHub/Supabase/Vercel; no exigir PowerShell/descarga/Antigravity cuando se pueda hacer directamente. Español claro, directo, enfoque producto+seguridad, pocas listas, sin emojis decorativos. Conservar un historial verificable y ahorrar tokens. No inventar decisiones. Al reportar: separar CI, SQL role simulations, sesión Auth real, QA visual, deploy y release.

## 7. SIGUIENTE GATE F14 A2 — confirmar seguridad de medios ANTES de purga

**AI Project Brain ejecuta sin más validación visual por ahora:** auditar firma/versionado de Storage, operaciones UPDATE/UPSERT/MOVE/COPY y restricciones `service_role`; desarrollar contrato y tests **no destructivos** de confirmación vinculada a `claim_id + objeto + versión`. El diseño actual está en `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md`. No inventar CAS nativo en `.remove([path])`: si no existe exclusión demostrable, el borrado automático queda deshabilitado y se propone revisión manual.

**No hacer todavía:** activar Edge 503, invocar `f14_confirm_media_cleanup(kind,id)`, borrar media real, alterar CDN/retención de proveedores, aplicar migraciones remotas sin gate expreso, publicar Vercel Production, mergear `main`, iniciar A3/A4 o crear recursos pagos.

**Evidencia ya suficiente:** el ciclo de imagen sintética autenticada y su limpieza. **Pendiente antes de cierre A2:** protocolo de concurrencia y evidencia de no reaparición, URL pública/cache, matriz D3-B aplicable y pruebas finales de seguridad/aceptación sin retestar lo aprobado.

**Git/CI:** la rama sigue `f14/block02-moderation-mvp-20261008`; HEAD previo al inicio de esta verificación `594e1c916d4aa4d26e7fd9c2513800803347e5ca` con dos checks Vercel success; posteriores commits documentales pueden mover HEAD, consultar de nuevo. Vercel API al leer despliegues bajo `digitalapp` devolvió 403; NO cambiar de proyecto ni hacer deploy para rodearlo.
