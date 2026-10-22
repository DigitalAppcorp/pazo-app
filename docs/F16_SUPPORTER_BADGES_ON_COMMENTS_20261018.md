# PAZO F16 — Insignias verificadas sobre autores de comentarios

**Fecha:** 2026-10-18. **Product Owner:** observó que la mascota `feliciano` tenía la insignia en su publicación, pero no en sus comentarios sobre posts de otros. Orden funcional: cuando una mascota esté verificada como Amigo de PAZO, mostrar la mini-insignia oficial de acuerdo con el hito vigente en las publicaciones y en **cada comentario que escriba**, también en Comunidades.

## Cambio
- `src/types/pazo.ts`: `PostComment`, `CommunityPostComment` y `CommunityPost` llevan evidencia opcional `supporterBadge` como estado de pantalla, sin adjudicación financiera desde cliente.
- `src/features/supporter/verifiedFeedPostBadges.ts`: se compartió la validación estricta de `pazo_supporter_public_badges_batch` para autorías de Feed y comentarios; deduplicación, batches 48, obligación de respuesta completa, fechas/hitos server-only. `attachVerifiedCommentBadges` nunca transfiere el estado del dueño del post al comentarista. `preloadVerifiedFeedBadgeArt` permite predecodificar imágenes antes del render del comentario.
- `src/App.tsx`: lectura de `post_comments` y sus insignias en una unidad antes de mostrar el hilo, y preflight de insignia del actor antes del comentario optimista, de forma que el autor verificado aparezca con medalla **en su primer render**. Revalida además comentarios abiertos al minuto y al regresar a la pestaña; fallo de RPC retira claims locales de badges sin borrar comentarios.
- `src/components/views/HomeView.tsx`: mini insignia de 20px en esquina inferior derecha del avatar del comentarista; también si el post original está eliminado pero los comentarios sobreviven. Sin desplazar texto ni la sección de denuncia, respetando cero contornos.
- `src/components/views/CommunityDetailView.tsx`: mismo tratamiento en comentarios existentes y publicaciones de Comunidades, tanto en autores como en hilos conservados de posts eliminados. Los comentarios solo se muestran con insignias ya resueltas; sin segundo fetch post-render.
- **Resiliencia:** si la autoridad pública de badges o el archivo PNG fallan, nunca se fingen medallas, pero el error cosmético NO bloquea leer o enviar comentarios, ni ocultar completamente publicaciones de Comunidades. Se puede recargar / revalidar.
- `src/features/supporter/testing/f16SupporterProductExperience.test.mjs`: comprobar Pet ID de comentarista correcto, mismo autor varias veces, no miembro, huérfano/preservado, respuesta duplicada/incompleta, batches 48+12, wiring de feed y comunidades.

## Validación
Commit funcional `46aca598a33a902e6c5b60d49b3bd0dbbedc2c8e` — **GitHub Actions 7/7 SUCCESS**: CI TypeScript/Vite/tests + seis PG labs. UI todavía requiere QA real del PO en Vite; CI no equivale a aceptación visual. PR #44 continúa DRAFT y sin merge. Sin cambios SQL, Edge, PayPal Sandbox/Live, cobros, períodos, contabilidad ni `main`.

**QA propuesto:** sincronizar clon limpio; abrir Feed, expandir comentarios de post ajeno y confirmar que `feliciano` lleva medalla en su avatar desde primer render, incluida al comentar de nuevo. Revisar comentario de no miembro sin medalla, hilo de post eliminado y comentarios de publicación dentro de Comunidades. No es necesario otro pago.

**Gate:** `F16_SUPPORTER_COMMENT_BADGES_CODE_7_OF_7_PASS_VITE_PO_QA_PENDING`.
