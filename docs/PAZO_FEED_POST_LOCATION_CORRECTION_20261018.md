# PAZO Feed — Corrección de ubicación fija en publicaciones (2026-10-18)

## Evidencia
Captura del Product Owner: publicaciones de distintas mascotas muestran «Los Ángeles, CA» aunque la zona introducida en el perfil pueda ser distinta. Auditoría del código halló que `CreatePostModal.tsx` insertaba literalmente `location: 'Los Ángeles, CA'`. `App.tsx` y `HomeView.tsx` ya mostraban el campo `posts.location`, por lo que el problema era de **origen de escritura**, no de renderizado.

Auditoría read-only de Supabase staging `mrybvqdebbgcayuvgkkr`: existen **4 publicaciones**, las **4** con el valor estático heredado `Los Ángeles, CA`; para **1** de ellas la zona del perfil está en desacuerdo. `pet_private_details.zone` (sólo lectura al propietario) es privada, mientras `posts.location` es social/pública. La base tiene default heredado `Los Ángeles • Local` para `posts.location`; el trigger de creación no corrige ubicación. Ninguna consulta expuso nombres/IDs de usuarios en la auditoría.

## Solución de código en PR #44 DRAFT
- `src/components/modals/CreatePostModal.tsx`: no más ciudad fija. En cada creación, nueva opción **desactivada por defecto** `Mostrar ubicación en esta publicación`; se explica que la zona será pública y que sólo se comparta ciudad/zona, no domicilio. Al marcarla, la persona puede corregir la zona prellenada desde `currentPet.zone`, que nunca se comparte silenciosamente; sin marcar envía `location:null` explícito para saltar el default SQL. Límite 90 caracteres, validación de valor no vacío solo con ubicación activada. ES/EN.
- `src/components/views/HomeView.tsx`: no pintar etiqueta ni separador vacío si la publicación no publica ubicación.
- `src/App.tsx`, `src/services/postService.ts`, `src/components/views/PublicProfileView.tsx` y mapeo de nueva publicación: `null` se normaliza a texto vacío al pasar al tipo `Post`, sin afectar paginación/ranking/cobros.
- `scripts/closure-ui.test.mjs`: pruebas de guardias contra ciudad fija, ausencia de GPS implícito, consentimiento opt-in, payload null, visual sin separador, mapeos de datos.
- `docs/PAZO_DATA_INVENTORY.md` actualizado; no nuevas tablas, API, tracker ni GPS.

## Estado y necesidad de autorización
Commit funcional `d8928e55ddc8103d9ddeedf4e1ce96af55bf50fc` — **7/7 SUCCESS** (CI/TypeScript/Vite/tests + seis laboratorios PG F16), sin cambios en Supabase. PAZO Live, main y PayPal no tocados. PR #44 DRAFT.

**NO se repararon las cuatro filas históricas**: ya quedaron incorrectamente guardadas y no se debe adivinar la ubicación original ni copiar información privada sin consentimiento individual. Con GO específico del PO: preparar y revisar migración SQL que (1) quite el default falso de `posts.location` y (2) limpie exclusivamente registros confirmados de la época anterior con ese placeholder, sustituyendo por `NULL`, no por la ubicación privada de la mascota; confirmar postflight conteo y que no afecta entradas nuevas. El script deberá acotar fecha e identidad de registros para no borrar ubicaciones reales legítimas. No ejecutar DML/DDL hasta autorización explícita.

**QA visual**: publicar sin marcar ubicación -> sólo antigüedad. Publicar tras marcar y revisar ciudad -> el Feed muestra esa ciudad. El usuario debe aprobar antes de declarar gate visual.

**Gate**: `FEED_LOCATION_NEW_POSTS_FIX_CODE_7_OF_7_PASS_OLD_DB_CLEANUP_PO_GO_REQUIRED`.
