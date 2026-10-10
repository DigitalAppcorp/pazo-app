# PAZO MVP — Technical Release Readiness

**Corte:** 2026-10-10
**Rama:** `release/mvp-beta-fast-track-20261010`
**SHA inicial auditado:** `654f5e2fb51f11f5175990bd75aaa4f44dd8a312`
**Resultado:** **NO-GO para beta pública**; RC listo para revisión técnica condicionada.
**No se declara lanzamiento público.** F13, GO/NO-GO final, limpieza final de datos, merge y publicación corresponden al Product Owner.

## Evidencia de esta sesión

- `npm ci`: PASS; 190 paquetes instalados, 0 vulnerabilidades reportadas por npm.
- `npm run test:governance`: PASS; hardening, arquitectura, privacidad, ops, MVP (96 pruebas incluidas las de F14) y PWA (3 pruebas).
- `npm run build`: PASS (TypeScript + Vite). Vite informa que el bundle JS principal (~813 kB sin comprimir) rebasa el umbral de 500 kB; no bloqueó el build y queda como optimización POSBETA mientras no se observen fallos de carga.
- `npm run lint`: FAIL heredado, 106 errores y 6 advertencias en la base amplia (principalmente `any` y reglas React Hooks). El aviso del efecto de carga en `ModerationMediaQueue.tsx` se corrigió con una carga diferida y el lint dirigido de archivos cambiados pasa. CI trata lint como no bloqueante (`continue-on-error: true`).
- `git diff --check`: PASS antes de documentar.
- SHA remoto conocido al inicio: `654f5e2fb51f11f5175990bd75aaa4f44dd8a312`; CI #673 PASS. Se verificará de nuevo el SHA y CI tras el push final.

## Cambios de este cierre

Se endureció la reconciliación F14 en `supabase/functions/f14-moderation-purge/`: ante un timeout o reintento solo finaliza cuando Storage confirma que el objeto exacto ya no existe, la URL pública original y cache-bust dejan de responder, y el RPC service-only permite completar el claim. Si Storage sigue sirviendo el medio, Edge devuelve `202 verification_pending` y la UI conserva el estado pendiente. Se añadieron pruebas para moderador/denegación, pérdida de respuesta, objeto presente, caché aún disponible e idempotencia.

Migración preparada: `supabase/migrations/20261010222006_f14_media_purge_retry_reconciliation.sql`. **No aplicada**. Requiere prueba de sintaxis/contrato en Postgres aislado y gate explícito para aplicación hosted. Docker Engine no estaba disponible en este entorno; no se afirma validación SQL ejecutada. No usar `supabase db push` porque la historia de migraciones local no reconcilia todo el historial hosted.

## Estado por carril

| Área | Estado | Evidencia / siguiente acción |
|---|---|---|
| Básicos Auth, Feed, comunidades, cuidados y lugares | PASS previo del PO; no se repitieron | No hay regresión conocida en el diff focalizado. |
| Eliminación manual de cuenta | PASS E2E anterior, cerrado | No repetir ni reabrir. UI solo registra solicitudes; intake público sigue apagado por defecto. Operador debe mantener cola/canal según SOP. No hay purga general de CDN/backups certificada. |
| F14 retirada física | GATE REQUIRED | Edge hosted v5 verificada activa con latch fijo `F14_MEDIA_PURGE_RELEASE_APPROVED=false`, JWT requerido; no se llamó ni desplegó. La nueva migración no está aplicada, no hubo prueba de objeto. Alcance del contrato actual: Feed y post de Comunidad; comentario/perfil mascota/medios externos requieren revisión manual. No declarar `purged`. Gate: revisión SQL aislada, aprobación exacta para aplicar migración y ensayo de un único medio nuevo descartable. |
| Supabase RLS / moderación | PASS read-only, con warnings documentados | Las cuatro tablas privadas revisadas no conceden `USAGE` del esquema ni SELECT/INSERT directo a `anon`/`authenticated`; RPC servidor comprueba moderador. Helper público `f14_content_visible` devuelve booleano y alimenta cinco políticas; revocarlo rompería lecturas. Advisor informa tablas privadas RLS sin políticas (INFO), funciones SECURITY DEFINER y Leaked Password Protection apagada. Sin cambios hosted. |
| Auth / contraseña | GATE de configuración | LPP no está disponible en el plan Free; documentar y decidir mejora de contraseña/preparación de plan antes de una beta pública. No se cambió plan ni configuración. Redirect URL de recovery necesita allowlist exacta para Preview/host y no se verificó aquí. |
| Privacidad/Terms | Texto preparado, no aprobado para publicación | ES/EN reflejan operador declarado, proveedores, GPS voluntario y límites de eliminación; `LEGAL_RELEASE_READY=true` significa texto elaborado. `PAZO_LEGAL_EFFECTIVE_DATE=null`; se fija al publicar. No inventar plazos ni declarar eliminación inmediata CDN/backups. Confirmar precisión operativa y atención de solicitudes antes del release. |
| PWA | PASS estático/local; HTTPS GATE REQUIRED | Manifest, iconos 192/512/maskable/Apple y SW network-only; test PWA PASS. Preview HTTPS e instalación real en Android/Chrome e iOS/Safari no comprobados. Revalidar navegación/logout/cambio de cuenta en Preview. |
| Vercel Preview | BLOCKED por acceso | Preferido `pazo-app-t83r`. Conector devuelve 403 por alcance digitalapp y no hay CLI `vercel` en PATH ni local. No se verificó URL, protección, variables ni Preview para este SHA. GitHub no expuso check de Vercel asociado al SHA; no se hizo deployment adicional. Reautorizar/reconectar integración y reutilizar Preview automático existente antes de crear uno. |
| Mapbox / entorno | GATE REQUIRED | Nombres esperados: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`; solo se inspeccionó `.env.example`, no los valores del hosting. Confirmar presencia y proyecto destino en Preview por canal seguro; ningún secreto en `VITE_*`. |
| F13 | POSBETA/decisión PO | Continúa pendiente. Recordarla justo antes del gate final. |

## Límites de medios y recuperación

Las pruebas cubren códigos de respuesta y contratos, no borrado real hosted. Storage object ausente no demuestra purga universal de CDN, mirrors, enlaces compartidos ni backups. Las políticas de Storage públicas permiten lecturas de objetos públicos y la invalidación CDN puede tardar; verificar URL original y cache-bust solo aporta la evidencia de esa prueba puntual. No alterar datos existentes. Para un futuro ensayo, crear/subir un objeto nuevo y descartable, vinculado a un post de prueba sin terceros; guardar el ID/claim solo en el canal operativo privado, mantener el latch global apagado salvo gate acotado y acordado, revisar la URL, objeto, status y reconciliación, y dejar el latch apagado al terminar.

## Release, rollback y gates humanos

No mergear a `main`, no publicar producción, no activar PostHog, intake público de baja, Edge purge ni A3 automático. Antes del GO: (1) validar SQL aislado; (2) obtener gate exacto para aplicar esta migración hosted; (3) acordar el ensayo destructivo de un solo objeto nuevo si procede; (4) restablecer conexión a Vercel y verificar Preview protegido del SHA exacto; (5) confirmar env public variables y Mapbox, Auth redirect URLs, política final/operación; (6) smoke de instalación Android/iOS; (7) recordar F13 al PO; (8) revisión de limpieza de datos, merge y publicación por PO/ChatGPT.

Rollback de código: revertir commit(s) de RC y push normal a la misma rama. Si se aplica la migración en una fase futura, preparar antes una migración inversa revisada que restaure el gate anterior y mantenga Edge apagada; no editar historial remoto ni ejecutar rollback improvisado. Hoy no hay cambios hosted que revertir.

**Disposición:** no hay vulnerabilidad crítica reproducible pendiente demostrada por esta auditoría; sí quedan gates concretos de acceso Preview, validación/aplicación de migración y prueba física de un solo medio. Por ello el resultado es **NO-GO público** y **RC técnicamente revisable**, no «listo para lanzamiento».
