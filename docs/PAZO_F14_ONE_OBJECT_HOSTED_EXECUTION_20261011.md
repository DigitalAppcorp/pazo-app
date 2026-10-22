# PAZO F14 / T08 — Ensayo alojado de una sola fotografía (procedimiento autorizado)

**Autorización del Product Owner recibida el 2026-10-11:** un único borrado irreversible del archivo sintético de la pelota roja, con despliegue experimental limitado, verificación y reversión inmediata. Esta autorización **NO** permite purga global, tocar archivos anteriores, modificar `main`, lanzar beta ni desplegar Vercel.

**Origen verificado:** Supabase `mrybvqdebbgcayuvgkkr`, rama RC `release/mvp-beta-fast-track-20261010`, Edge `f14-moderation-purge` **v7 actualmente desplegada** por ChatGPT con cinco archivos exactos del HEAD RC `f6cdf1bf12bfca3f85e2bdb46585fe406472a360`. Estado desplegado: `verify_jwt=true`, `F14_MEDIA_PURGE_RELEASE_APPROVED=false` y `F14_TRIAL_PURGE_APPROVED=false`; purga desactivada. El CI de `f6cdf1b` terminó SUCCESS.

## Único objetivo autorizado

- `kind=feed_post`.
- Post: `140d3769-cde2-47dc-998a-dcb3238b6f17`.
- Objeto Storage inmutable: `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8`.
- Bucket: `post-photos`.
- Ruta exacta: `81a68aa4-5cf1-4f24-8465-e9ec77ed4eba/ddd3c362-9cda-4fb1-a781-cd9cb4daa341/62a45ff7-849d-4a78-a0ca-0220450edc52.png`.
- Controles ya verificados: denuncia `removed`, `content_restrictions.media_status=pending_review`, `f14_content_visible=false`; `moderation_private.f14_media_probe(...)` devolvió no nulo, `Storage.info().data.id` confirmado por Codex con SDK oficial (PASS, no repetir).
- Baseline: `storage.objects`: 1 foto en `post-photos`, 2 avatares preexistentes en `pet-avatars`, 0 `media_claims`. No se ha intentado borrar el objeto.

## Gate operativo previo (obligatorio)

1. **No activar si no existe capacidad real para invocar** la función como un moderador PAZO autenticado y para **desactivar inmediatamente** la función en la misma sesión de trabajo; no exponer JWT, service key, contraseñas ni rutas en logs. Esta conexión de ChatGPT permite `deploy_edge_function` pero **no** `invoke` ni gestionar `F14_TRIAL_PURGE_ENABLED`: por ello no puede completar el ciclo por sí sola.
2. Elegir el entorno operador oficial capaz de usar Supabase CLI con acceso **autorizado** al proyecto y el SDK / sesión de un moderador real. No usar claves públicas como identidad de moderador, no crear usuarios/moderadores alternos ni cambiar permisos. Si checkout Git está bloqueado, usar archivos exactos mediante conector GitHub o checkout aislado, sin tocar el checkout viejo.
3. Guardar copia exacta verificable del código **v7 desactivado** de la función, con archivos `index.ts`, `core.ts`, `storageInfo.ts`, `publicUrl.ts`, `trialScope.ts`. Probar que es posible revertir y probar que el operador puede gestionar el flag de prueba `F14_TRIAL_PURGE_ENABLED` en secretos sin imprimirlo. Si faltan estos poderes, **BLOCKED: no habilitar nada**.
4. Antes de habilitar, repetir exclusivamente las lecturas mínimas de estado real: target `feed_post` con reporte `removed`, restriction `pending_review`, URL canónica que corresponde al objeto exacto y owner coincidente; foto 1 y avatares 2. No asumir que la instantánea anterior sigue vigente. El preflight `f14_media_probe` debe permanecer válido y no debe haber referencias compartidas ni claims en conflicto. Cualquier discrepancia implica **STOP, sin delete**.

## Ejecución temporal estricta

1. Mantener `F14_MEDIA_PURGE_RELEASE_APPROVED=false` **sin excepciones**. La rama RC mantiene `F14_TRIAL_PURGE_APPROVED=false`; crear exclusivamente una **variante de runtime temporal NO COMMIT** que cambie ese único literal a `true` en `index.ts`, conservando sin alteración el resto de los cinco archivos y especialmente `trialScope.ts` / guard del `Storage.info().data.id`. Verificar diff, compilar y comprobar no se habilitó ruta general. Nunca desplegar una variante `release=true`.
2. Preparar la variable de Edge **server-side** `F14_TRIAL_PURGE_ENABLED=true` de forma autorizada; no usar `VITE_*`, ni añadir claves a Git. Si esta operación no se puede ejecutar o revertir, abortar. Conectar para desplegar por vía oficial con `verify_jwt=true`; el cambio será temporal.
3. Con una sesión **genuina** de PAZO reconocida por `f14_is_moderator()`, invocar **una sola vez** `f14-moderation-purge` con body exclusivo `{kind:'feed_post',id:'140d3769-cde2-47dc-998a-dcb3238b6f17'}`. El servicio valida JWT, rol, target, bucket, `Storage.info().data.id`, prepare/recheck claim, propiedad, referencias, versión/locks y completa solo tras Storage.info ausente y HTTP 404/410. No suplantar JWT, no imprimir ni exportar credenciales. No hacer clic repetidamente ni probar otro ID.
4. Interpretar resultados sin inventar PASS: `200/status=origin_removed_cdn_uncertain` exige además la auditoría final; `202/verification_pending` indica origen posiblemente ausente pero CDN no probado, **no reintentar eliminación automáticamente**; `409/503`, timeout o respuesta ambigua = STOP y reconciliar con lecturas, no ampliar permisos.
5. **Siempre, incluso en errores:** establecer `F14_TRIAL_PURGE_ENABLED=false` y redeplegar inmediatamente los cinco archivos exactos **v7 con ambos latches false**, `verify_jwt=true`; comprobar desplegado apagado antes de finalizar. Si no puede verificarse la desactivación, incidente abierto y escalar al PO, no dejar ejecución silenciosa.

## Evidencia de cierre sin acceso a secretos

- Verificar `storage.objects` no contiene la fila de UUID `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8`, `Storage.info()` reporta 404 **explícito**, nunca 401/403/5xx; verificar URL original y con `?pazo_verify=<nonce>` usando **HEAD + GET Range**: únicamente 404/410 confirma inaccesibilidad. No afirmar eliminación global del CDN/backups.
- Verificar `content_restrictions.media_status='purged'` **solo si** el RPC backend de verificación lo registró; jamás forzar UPDATE SQL para maquillar PASS. Verificar reporte preservado y `public.f14_content_visible=false`.
- Verificar `pet-avatars` conserva exactamente 2 objetos preexistentes, con IDs/versiones sin alteración; `post-photos` ya no contiene el objeto sintético. Si Storage/HTTP status y DB no coinciden, **PARCIAL/PENDIENTE**, no PASS.
- Documentar resultado y rama RC actual en `docs/PAZO_ACTIVE_HANDOFF.md` con commit + CI y comunicar a este chat. No tocar `main`, no iniciar F13 hasta gate posterior.

**Ruta de emergencia:** Si cualquier requisito administrativo, invocación autenticada o rollback no puede hacerse desde el entorno ejecutor, dejar Edge v7 desactivada y la foto intacta; estado BLOQUEADO operativo, sin ruta alternativa destructiva improvisada. No usar `DELETE FROM storage.objects`, borrar carpetas completas, subir de plan, habilitar Vercel ni manipular reclamos directamente.
