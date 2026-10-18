# PAZO F16 — Insignia del Feed desde el primer render del post
**Fecha:** 2026-10-18. **PO:** reclamó que la mini-insignia se incorporaba segundos después de las publicaciones aunque «Sugerencia» aparecía inmediatamente. Preguntó si ChatGPT podía hacerlo directamente (sí: implementado sin Codex).

## Causa raíz comprobada en código
- `App.tsx` obtiene, pagina y publica posts con `setPosts(enrichedPage)`.
- La versión anterior de `HomeView.tsx` consultaba luego `pazo_supporter_public_badges_batch` en un useEffect. Eso causaba un segundo render tardío para insertar la medalla junto al avatar.
- `SupporterBadge.tsx` ya tenía `loading=eager`, pero no garantizaba que el recurso PNG estuviera decodificado antes del primer frame.
- La solución no requiere cambiar el algoritmo de Feed, ni su orden/ranking, ni datos de pagos ni esquemas.

## Implementación en PR #44 DRAFT
- `src/types/pazo.ts`: `Post.supporterBadge?: {badge:boolean;milestone:0|3|6|12}` representa **evidencia pública verificada**, no permiso financiero.
- `src/features/supporter/verifiedFeedPostBadges.ts`: resolver de lotes (hasta 48 mascotas por consulta) para RPC alojada `pazo_supporter_public_badges_batch`; validación estricta de UUID, conjunto completo, unicidad, booleano y 0/3/6/12; errores o respuestas incompletas rechazan publicación de página, **sin mostrar un post pagado como gratuito por una espera parcial**. No hay persistencia ni cache de pagos.
- `preloadVerifiedFeedBadgeArt` decodifica primero los PNG oficiales 0/3/6/12 que efectivamente corresponden a la página; deduplica descargas/decodificaciones y falla sin pintar un post con PNG diferido si la imagen está inaccesible. No precarga medallas de no pagadores.
- `App.tsx`: para cada página de Feed resuelve en paralelo interacciones y la evidencia de insignias, prepara PNG, luego publica **una sola vez** `Post[]` enriquecido con ambos. No hay nuevo endpoint SQL; **son consultas separadas de red, pero se combinan antes del primer render**. La paginación/cursor solo se confirma al completar la página. El error usa el retry existente. `handlePostCreated` resuelve y decodifica antes de insertar el post creado en el Feed local; no hace un segundo checkout ni un segundo INSERT de post.
- `HomeView.tsx`: quitado por completo `useEffect` de consulta tardía y almacenamiento local `verifiedFeedBadges`; cada tarjeta recibe `post.supporterBadge`. Mini-medalla de 20 px permanece overlay inferior derecho del avatar, no empuja «Sugerencia».
- `App.tsx` conserva revalidación cada 60s y al recuperar la pestaña; a través de la misma RPC y predecodificación, actualiza inscripciones de forma atómica. Si la comprobación falla, se oculta el claim de insignia: el servidor conserva autoridad y nunca se otorga una membresía basada en cliente.
- `f16SupporterProductExperience.test.mjs`: verifica que no hay consulta de badges en `HomeView`, que `App` espera badge+PNG antes de `setPosts`, que el helper valida estrictamente, maneja lotes 48+12, y rechaza evidencia ausente/falsa/duplicada.

## Validación y alcance
**Commit funcional `08ce300b828ac50092d9873bd4a382ce0b5138df`**: GitHub Actions **7/7 SUCCESS**: CI (incluye TypeScript, Vite, tests) y seis PG labs. No CI visual sustituye el E2E de navegador. La rama continúa DRAFT, sin merge a main.
- No se llamó Supabase DDL/DML, no migraciones, no cambios Edge, no PayPal Sandbox/Live, no pagos ni entitlements nuevos.
- **Gate siguiente:** PO sincroniza su clon local limpio y reinicia Vite QA. Confirmar en cold load/red lenta controlada: feliciano aparece con mini-medalla en su **primer frame visible** y el chip Sugerencia no se mueve; creación de post propio y scroll paginado; al cambiar membresía, verificación periódica respeta backend; errores de red muestran reintento en vez de faltar un derecho aparentemente.
- PublicProfileView mantiene su consulta per-pet al abrir perfil; este cambio resuelve específicamente el **Feed** y la creación de nuevas publicaciones. Unificar el primer paint del perfil público requiere otro alcance y QA separado; **no declarar todo el sistema de perfiles validado**.
- El uso de RPC previa a render es una optimización UX sin nuevo backend; si el PO exige un solo roundtrip de red (no solo primera pintura unificada), requerirá diseñar una nueva consulta/vista de Feed y obtener GO separado para migración.
**Gate:** `F16_FEED_BADGE_FIRST_RENDER_CODE_7_OF_7_PASS_WAIT_PO_BROWSER_COLD_LOAD`.
