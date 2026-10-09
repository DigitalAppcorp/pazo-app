# PAZO — Auditoría funcional del MVP | 2026-10-09

**Clasificación:** auditoría y correcciones funcionales aprobadas por el Product Owner; no redefine por sí sola el alcance comercial de los módulos ni autoriza beta pública.
**Referencia de código revisada:** \`main\` \`ae7e63f\` y rama F14 \`f14/block02-moderation-mvp-20261008\` \`970e144\`; correcciones propuestas en \`mvp/functional-readiness-20261009\`, PR #36 DRAFT.
**Prioridad PO:** completar experiencias ya aprobadas y comprobar valor antes de hardening distribuido. F14 A2 sigue PAUSADA / Gate 8 abierto en PR #35.

## Hallazgos por recorrido

| Recorrido / módulo | Evidencia auditada | Brecha concreta o gate |
| --- | --- | --- |
| Auth → alta de mascota | \`AuthContext.tsx\`, \`OnboardingView.tsx\`, \`petService.ts\`: sesión y CRUD de mascota reales. Backend \`public.pets\` con RLS. | Estado inicial incluye mascotas de demo para la experiencia anónima; verificar en smoke RC que nunca se confundan con datos de una cuenta real. Recuperación de contraseña es gate a revisar antes de abrir beta. |
| Feed → publicación → Like/Save → comentarios | \`CreatePostModal.tsx\`, \`App.tsx\`, \`HomeView.tsx\` usan tablas/RPC reales. Backend \`posts\`, \`interactions\`, \`follows\`. | **BUG DE PAGINACIÓN**: la mezcla social/recomendado puede repetir u omitir posts y un request tardío puede escribir sobre el cursor de otra mascota. PR #36 introduce selector puro, dedupe y guards; 6 tests; CI PASS en \`b755480\`. Falta QA de scroll y cambio de mascota en Preview. |
| Comunidades | MVP real F7, join/post/media y fake doors de extensiones con QA histórica PO aprobada. Backend \`communities\` y \`community_posts\`. | No reconstruir; smoke de publicaciones y membership al preparar beta. Extensiones experimentales no son funciones disponibles. |
| Lugares/mapa | F8 real, Mapbox, check-ins/sugerencias y markers 3D aprobados en \`main\`. | **PARIDAD DE RAMAS:** \`main\` monta \`MapView\` en tab Mapa; PR #35 introduce \`PLACES_MAP_DEVELOPMENT_ONLY = import.meta.env.DEV\` y muestra la fake door \`PlacesDemandExperiment\` en builds no-dev. Antes de desplegar una versión que contenga F14, resolver rollout consciente y coste de Mapbox; no convertir el núcleo aprobado en fake door de forma silenciosa. |
| Cuidados/Agenda | \`careService.ts\` + \`CareModal.tsx\`; tablas \`care_items\` y \`care_completions\` reales con RLS. F9A documentada COMPLETADA. | No rehacer el backend; smoke de alta/editar/completar y recordatorios lógicos durante QA móvil. |
| Documentos privados | \`documentService.ts\` + \`DocumentsModal.tsx\`; \`pet_documents\` real con RLS. F9B documentada COMPLETADA. | Compartir externamente no forma parte del MVP aprobado. Mantenerla privada, validar carga/lectura/borrado en release. |
| Rescate / notificaciones | \`rescueService.ts\` y \`notifications\` reales para avistamientos/rescate. | Las notificaciones *generales* no están implementadas; ampliar solo por dependencia. No crear un motor universal ahora. |
| Buscar / Explorar | F12 real, mascotas/comunidades/lugares y telemetría de privacidad acotada; cierre histórico PASS. | Solo smoke de deep-links al preparar RC; no rehacer F12. |
| Mensajes 1 a 1 | \`INITIAL_CONVERSATIONS\` y \`handleSendMessage\` solo mantienen estado local; no existen tablas \`conversations/messages\` en el esquema público observado. | **MOCK INADECUADO PARA SESIÓN REAL**: muestra solicitudes/chat falsos y badge aunque se haya iniciado sesión. PR #36 muestra aviso honesto en cuenta real y conserva chat interactivo solo en demo explícita. Backend real sigue **POSPUESTO** conforme al roadmap. |
| Configuración de privacidad / retirada | F14 A2 con reportes/moderación básicos en rama y backend; purge D3-A incompleto y Edge 503. | No reabrir ledger distribuido. Antes de **usuarios externos**: ruta operativa mínima para reportar/retirar material público, atender solicitudes de eliminación y reconciliar textos públicos/retención. No prometer borrado completo si CDN/origen siguen accesibles. |

## Orden de trabajo orientado a validar producto

1. **P0 — Correcciones con evidencia:** preservar páginas de Feed al mezclar fuentes y eliminar chats ficticios de sesiones reales. PR #36; exigir CI y QA acotada sin repetir suites ya aprobadas.
2. **P0 — Coherencia de lanzamiento:** decidir explícitamente cómo publicar el núcleo real de Lugares que F8 ya aprobó; el guard dev-only existe en PR #35 pero no en \`main\`. No quitar guard sin tener en cuenta costes de Mapbox y entorno objetivo.
3. **P1 — Recorrido end-to-end real:** registro/inicio → crear mascota → publicar y recibir interacciones → Comunidad → Lugares → Cuidados/Documentos → alerta/notificación. Reutilizar QA histórica y probar solo integraciones nuevas, cambios o brechas no cubiertas.
4. **P1 — Salida beta proporcional:** errores de red, recuperación de cuenta, estados sin datos, móvil y mínima operación humana de retirada/solicitudes antes de publicar externamente. No reabrir fencing avanzado por defecto.
5. **P2 — Pospuesto por decisión vigente:** mensajería real, notificaciones genéricas sin dependencia, monetización, extensiones fake door y rediseños masivos.

## Evidencia / exclusiones de este checkpoint

- GitHub Actions CI run \`37927084599\` **SUCCESS** en \`b755480\`; includes governance (6 tests Node nuevos) y build. Las pruebas locales independientes del selector también fueron **6/6 PASS**. Esto verifica lógica, no UX real.
- Supabase PAZO, lectura de metadatos: RLS habilitado en \`pets\`, \`posts\`, \`care_items\`, \`care_completions\`, \`pet_documents\`, \`communities\`, \`community_posts\`, \`pet_places\`, \`notifications\`. No se enviaron queries de datos personales ni se modificó SQL.
- No se cambió esquema, RLS, costos, Storage, Edge, Preview/Production ni \`main\`. PR #35 continúa PAUSADO y PR #36 DRAFT. No fusionar o desplegar sin aprobación vigente.
- Cualquier nueva intervención sobre módulos no aprobados requiere su gate de producto, conforme a \`docs/PAZO_MODULE_LIFECYCLE.md\`. Esta matriz no equivale a haber probado UX ni a Beta lista.
