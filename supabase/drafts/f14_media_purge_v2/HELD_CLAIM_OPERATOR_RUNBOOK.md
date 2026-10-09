# PAZO F14 A2 — Procedimiento de reservas de medios en revisión

**Estado:** diseño operativo verificable; no instala tareas ni autoriza borrado. Fecha: 2026-10-09. **Gate 8 abierto**, PR #35 DRAFT.

## Objetivo y alcance

La reserva de `moderation_private.media_claims` tiene estados `held` e `invalidated`, una vigencia inicial de 5 minutos y unicidad por objetivo/objeto. Un `held` vencido **no cambia automáticamente a `invalidated`**. `public.f14_recheck_media_claim` devuelve `false` si expira o deriva y **conserva** la reserva `held`; esto es deliberadamente fail-closed. La protección RLS de bucket sigue reteniendo el path mientras esté `held`, aun vencido. No inventar un cron de liberación automática.

## Comprobación no destructiva autorizada

1. Ejecutar como administrador de base de datos `supabase/drafts/f14_media_purge_v2/held_claim_reconciliation_readonly.sql`. Esta operación es un **SELECT agregado sin identificadores, rutas, bytes ni datos de denuncia**. En el backend real, usar transacción con acceso a locks de lectura (no `SET TRANSACTION READ ONLY`) y un `statement_timeout` prudente.
2. Interpretar `held_snapshot_consistent_not_delete_authorized` **solo como cantidad de instantáneas actualmente coherentes**: no autoriza purgar.
3. `held_expired`: reserva vencida pendiente de reconciliación, NO prueba que una operación Storage haya finalizado. Nunca borrar ni liberar por expiración sola.
4. `held_without_storage_metadata`: no hay fila actual para el objeto identificado; comprobar identidad/version previa, origin y logs antes de concluir borrado.
5. `held_source_drift`: `f14_media_probe` ya no produce la misma instantánea; puede deberse a URL, autor, permisos, versión, metadata o retiro de publicación. Mantener revisión manual.
6. `held_moderation_state_drift`: reporte ya no `removed` o restricción dejó `pending_review`; reconciliar el expediente, no ejecutar purga.
7. `invalidated_total`: reservas finalizadas manualmente. Los contadores no prueban borrado de bytes ni invalidación CDN.

## Incidente: una reserva quedó retenida

- No usar `remove([path])`, ni convertir `media_status` a `purged` sin prueba de ausencia del **objeto/versionId original**. La RPC antigua `f14_confirm_media_cleanup` fue revocada; la Edge `f14-moderation-purge` permanece en 503.
- No invalidar el claim con una tarea periódica si no existe un comprobante de que **ninguna operación HTTP de eliminación está en vuelo** y los escritores privilegiados están coordinados. La liberación anticipada posibilita reutilizar una ruta mientras llega un DELETE tardío.
- El examen de un expediente individual (ID/versión/ruta/autor/report) solo debe hacerse por administrador autorizado, en un entorno privado y con trazabilidad. No pegar rutas, URLs públicas, JWT, datos del reportante ni imágenes en tickets o logs abiertos.
- Resolver manualmente solo cuando exista evidencia externa suficiente de estado final de Storage, fuente, CDN/TTL y ausencia de operaciones en vuelo; de lo contrario conservar `held` y escalar. **Este runbook NO contiene SQL de actualización masiva**.
- Si el origen fue borrado por versión exacta pero sigue visible en caché, clasificar `origen ausente / caché no verificada`, no `purged`. En PAZO Free se observaron `cacheControl=max-age=3600` y 4 buckets públicos; el navegador de otro dispositivo puede seguir reteniendo bytes.

## Evidencias y pruebas reproducibles

- `held_claim_reconciliation_readonly.sql`: lectura agregada sin mutaciones.
- `supabase/tests/database/f14_held_claim_operator_diagnostics_rollback.test.sql`: fixture sintético transaccional, comprueba instantánea vigente, vencimiento y deriva y concluye con `ROLLBACK`. **PASS en Supabase alojado**, sin archivos físicos.
- `held_claim_reconciliation_readonly.test.mjs`: exige que el SELECT no incluya DML ni identidades personales, y que el fixture no haga `COMMIT` ni elimine objetos de Storage.
- `hostedClaimEvidence.mjs`: evidencia privada consistente, siempre devuelve `candidate_only` o `manual_review` con `mayDelete:false`.
- QA PO de `F14VersionProbe`: versión equivocada no borra versión actual y versión correcta desaparece del origen (PASS 4/4 con un píxel artificial); CDN HTTP 400 **inconcluso**, no repetir.

## Requisitos todavía bloqueantes para activar una purga

Un servicio servidor de acceso mínimo a evidencia privada (`service_role` no tiene `USAGE` directo de `moderation_private`); coordinación demostrable para escritores privilegiados y HTTP en vuelo; idempotencia ante timeout/reintento; borrado por `versionId` exacto con confirmación posterior y registro privado de incidencias; explicación de caché CDN/navegador y retención. No conceder permisos directos al esquema privado ni modificar `storage.objects` con triggers personalizados como atajo.

**No confundir un SOP implementado con el cierre de D3-A.** Nunca activar Edge, fusionar a `main` o publicar mientras falten esos gates.
