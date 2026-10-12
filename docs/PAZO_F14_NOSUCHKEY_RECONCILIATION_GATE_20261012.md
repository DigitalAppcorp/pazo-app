# PAZO F14/T08 — Corrección de NoSuchKey y gate de reconciliación

**Fecha:** 2026-10-12. **Estado:** PREPARACIÓN EN RAMA AISLADA. No deploy, no SQL alojado, no purga adicional, no cambio en `main`. Autoriza el Product Owner implementar verificador, pruebas y preparar diseño; **no** aplicar migraciones, invocar Edge ni cerrar el claim alojado.

## Evidencia alojada previa (inmutable)

- Una única llamada POST autenticada a `f14-moderation-purge` terminó en HTTP 503. Storage registró `DELETE | 200` sobre el bucket autorizado. No repetir.
- Objeto exacto `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8`, publicación `140d3769-cde2-47dc-998a-dcb3238b6f17`: fila de `storage.objects` ausente; `post-photos=0`, `pet-avatars=2`. El URL público GET no sirvió bytes.
- `Storage.info()`: HTTP **400**, `code=NoSuchKey`, `statusCode="404"`, `message="Object not found"`, `data=null`.
- GET URL pública: HTTP **400**, `code=NoSuchKey`, `statusCode="404"`, `error="not_found"`, `message="Object not found"`, sin bytes. HEAD y GET Range en URL original y cache-busted también devolvieron HTTP 400; el cuerpo estructurado se examinó específicamente en GET original, no se debe atribuir a HEAD.
- Un claim persiste con `status=held`, `checked_at` poblado y expiración nominal vencida; la restricción sigue `media_status=pending_review`; el reporte sigue `removed`.
- Edge en estado seguro tras rollback (última lectura previa: v27 ACTIVE, ambos latches `false`, `verify_jwt=true`). El flag remoto se estableció en `false` según CLI del PO. Comprobar nuevamente antes de cualquier gate futuro.
- **Resultado hasta ahora: eliminación física confirmada, F14 E2E PARCIAL.**

## Alcance autorizado de esta rama

1. `storageInfo.ts` reconoce ausencia por HTTP 404 explícito **o** HTTP 400 con `code=NoSuchKey`, `statusCode='404'` (o número 404) y mensaje exacto `Object not found`, exclusivamente con `data === null`. Otros HTTP 400, errores de autorización, 5xx y datos ambiguos fallan cerrados.
2. `publicUrl.ts` exige cuatro verificaciones: HEAD y GET Range `bytes=0-0` de URL original y URL cache-busted. GET 400 solo acredita ausencia con JSON canónico (`NoSuchKey` + 404 interno + `error=not_found` + mensaje exacto). HEAD 400 sin cuerpo **no** basta; solo se acepta si su GET emparejado también devuelve HTTP 400 con evidencia canónica. HTTP 200/206, accesos denegados, redirecciones, errores de red, JSON no canónico y URL cache-busted que sirve bytes no acreditan ausencia.
3. Conservar `index.ts` y `trialScope.ts` **sin cambios**: `F14_MEDIA_PURGE_RELEASE_APPROVED=false`, `F14_TRIAL_PURGE_APPROVED=false`, UUID y guard intactos. No crear lógica que salte `Storage.info()` ni mueva estados sin evidencia.
4. Tests positivos y negativos separados para verificar no aceptación de HTTP 400 genérico, enmascaramiento de acceso denegado ni bytes de CDN.

## Hallazgo de ciclo de vida de claims

La definición alojada de `public.f14_moderation_media_gate(...,p_stage='complete')` existe y puede marcar `pending_review→purged` mediante llamada `service_role` con todas sus invariantes (UUID y source snapshot de claim, owner, `report=removed`, referencia exacta y única, objeto ausente de Storage y `claim=held` con `checked_at`). **No invocarla directamente por SQL** para saltarse el verificador de cuatro HTTP probes ni la autenticación del moderador.

`public.f14_confirm_media_cleanup` es legacy y rechaza toda llamada. `media_claims.status` admite `held` o `invalidated`; la expiración no transforma automáticamente un claim `held`. Los triggers de protección de referencias y Storage comprueban `status='held'`, sin limitarlo al vencimiento: dejarlo indefinidamente puede inmovilizar esa ruta/objeto. `media_claim_events.event` solamente admite `created`, `rechecked` o `invalidated`, y está ligado al claim con FK. Se preservará la bitácora, nunca `DELETE` del claim.

## Reconciliación administrativa PROPUESTA (NO IMPLEMENTADA NI APROBADA PARA ALOJADO)

Preparar una operación *separada* de la Edge destructiva, **sin** llamada a `Storage.remove()` y **sin** reintentar el POST F14/T08. La operación recibe únicamente la identidad del objetivo previamente autorizado y deriva bucket/ruta/claim desde referencias persistidas. Requiere autenticación real de moderador mediante `auth.getUser` y `f14_is_moderator`; jamás aceptar `service_role` del navegador ni usar JWT suplantado.

Antes de cualquier escritura: controlar idempotencia y la identidad exacta del post y objeto inmutable; confirmar que el reporte sigue en `removed`, que el claim es el original `held` con `checked_at` y snapshot consistente, que existe una sola referencia canónica y que **no** existe objeto alguno para el bucket/path ni el UUID. Verificar **los cuatro** HTTP probes con el parser corregido y `Storage.info()` inequívocamente ausente. Nunca tratar HTTP 400 genérico como prueba.

En una **única transacción controlada del backend**, con el bloqueo de filas que exige el procedimiento SQL y revisiones de RLS/permisos, usar el mecanismo aprobado de `f14_moderation_media_gate(...,'complete')` para la transición `pending_review→purged`, revalidar postcondiciones e **invalidar** el claim original `held→invalidated` con registro de evento `invalidated` (el orden exacto/locking y la nueva RPC requieren auditoría y tests de concurrencia). Una petición repetida solo debe poder devolver el mismo estado final verificado sin nueva eliminación, nuevos claims o nuevos permisos. Ante cualquier discrepancia, abortar la transacción completa, no dejar una transición parcial.

**Pendientes antes de codificar/desplegar la reconciliación:** diseño y revisión de SQL/migración versionada; autorización explícita del PO para escritura alojada; pruebas locales en PostgreSQL con snapshot fiel de RLS/claims/triggers, carreras y rollback; auditabilidad del actor y resultado sin secretos; comprobación del único claim con datos reales de solo lectura; aprobación del contrato de HTTP y del tratamiento de `NoSuchKey`. No modificar permisos de servicio ni activar la purga general.

## Gates de entrega

- **G1 (esta rama):** tests de parsers + contratos F14 + build/CI del SHA concreto. PR a RC en borrador; sin merge automático.
- **G2 (gate separado):** diseño/revisión de reconciliación específica y migración aún no desplegada, con tests de carrera y privilegios; consentimiento de escritura explícito.
- **G3 (solo tras G2):** desplegar exclusivamente la ruta de reconciliación verificada, conservando ambos latches de purge apagados. Nunca borrar de nuevo el mismo archivo. Auditar `purged`, claim `invalidated`, evento, avatares 2, ausencia del UUID, HTTP y `verify_jwt=true`.
- **G4:** Scope Closure Reconciliation de todo F14/T08 y actualización de roadmap/handoff. F14 continúa **PARCIAL** mientras falten G2/G3/G4; F13, `main`, Vercel y lanzamiento continúan bloqueados según los gates existentes.
