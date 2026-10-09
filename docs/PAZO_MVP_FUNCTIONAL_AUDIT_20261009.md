# PAZO — Auditoría funcional del MVP | 2026-10-09

**Clasificación:** auditoría y correcciones funcionales aprobadas por el Product Owner; no redefine por sí sola el alcance comercial de los módulos ni autoriza beta pública.
**Referencia de código revisada:** `main` `ae7e63f` y rama F14 `f14/block02-moderation-mvp-20261008` `970e144`; correcciones propuestas en `mvp/functional-readiness-20261009`, PR #36 DRAFT.
**Prioridad PO:** completar experiencias ya aprobadas y comprobar valor antes de hardening distribuido. F14 A2 sigue PAUSADA / Gate 8 abierto en PR #35.

## Hallazgos por recorrido

| Recorrido / módulo | Evidencia auditada | Brecha concreta o gate |
| --- | --- | --- |
| Auth → alta de mascota | `AuthContext.tsx`, `OnboardingView.tsx`, `petService.ts`: sesión y CRUD de mascota reales. Backend `public.pets` con RLS. | **P0 corregido en PR #36:** `signUp` distinguía mal respuesta exitosa sin sesión (email pendiente), enviaba prematuramente a crear mascota y luego fallaba. Ahora se muestra confirmación de correo y solo con sesión se pasa a mascota. Alta real deja nombre/edad en blanco; la foto genérica del servicio sigue como placeholder por defecto. Tests de los tres resultados. Falta QA del correo real y revisión de recuperación de contraseña para Beta. |
| Feed → publicación → Like/Save → comentarios | `CreatePostModal.tsx`, `App.tsx`, `HomeView.tsx` usan tablas/RPC reales. Backend `posts`, `interactions`, `follows`. | **BUG DE PAGINACIÓN**: la mezcla social/recomendado puede repetir u omitir posts y un request tardío puede escribir sobre el cursor de otra mascota. PR #36 introduce selector puro, dedupe y guards; 6 tests; CI PASS en `b755480`. Falta QA de scroll y cambio de mascota en Preview. |
| Comunidades | MVP real F7, join/post/media y fake doors de extensiones con QA histórica PO aprobada. Backend `communities` y `community_posts`. | No reconstruir; smoke de publicaciones y membership al preparar beta. Extensiones experimentales no son funciones disponibles. |
| Lugares/mapa | F8 real, Mapbox, check-ins/sugerencias y markers 3D aprobados en `main`. | **PARIDAD DE RAMAS:** `main` monta `MapView` en tab Mapa; PR #35 introduce `PLACES_MAP_DEVELOPMENT_ONLY = import.meta.env.DEV` y muestra la fake door `PlacesDemandExperiment` en builds no-dev. Antes de desplegar una versión que contenga F14, resolver rollout consciente y coste de Mapbox; no convertir el núcleo aprobado en fake door de forma silenciosa. |
| Cuidados/Agenda | `careService.ts` + `CareModal.tsx`; tablas `care_items` y `care_completions` reales con RLS. F9A documentada COMPLETADA. | No rehacer el backend; smoke de alta/editar/completar y recordatorios lógicos durante QA móvil. |
| Documentos privados | `documentService.ts` + `DocumentsModal.tsx`; `pet_documents` real con RLS. F9B documentada COMPLETADA. | Compartir externamente no forma parte del MVP aprobado. Mantenerla privada, validar carga/lectura/borrado en release. |
| Rescate / notificaciones | `rescueService.ts` y `notifications` reales para avistamientos/rescate. | Las notificaciones *generales* no están implementadas; ampliar solo por dependencia. No crear un motor universal ahora. |
| Buscar / Explorar | F12 real, mascotas/comunidades/lugares y telemetría de privacidad acotada; cierre histórico PASS. | Solo smoke de deep-links al preparar RC; no rehacer F12. |
| Mensajes 1 a 1 | `INITIAL_CONVERSATIONS` y `handleSendMessage` solo mantienen estado local; no existen tablas `conversations/messages` en el esquema público observado. | **MOCK INADECUADO PARA SESIÓN REAL**: muestra solicitudes/chat falsos y badge aunque se haya iniciado sesión. PR #36 muestra aviso honesto en cuenta real y conserva chat interactivo solo en demo explícita. Backend real sigue **POSPUESTO** conforme al roadmap. |
| Configuración de privacidad / retirada | F14 A2 con reportes/moderación básicos en rama y backend; purge D3-A incompleto y Edge 503. | No reabrir ledger distribuido. Antes de **usuarios externos**: ruta operativa mínima para reportar/retirar material público, atender solicitudes de eliminación y reconciliar textos públicos/retención. No prometer borrado completo si CDN/origen siguen accesibles. |

## Orden de trabajo orientado a validar producto

1. **P0 — Correcciones con evidencia:** preservar páginas de Feed al mezclar fuentes y eliminar chats ficticios de sesiones reales. PR #36; exigir CI y QA acotada sin repetir suites ya aprobadas.
2. **P0 — Coherencia de lanzamiento:** decidir explícitamente cómo publicar el núcleo real de Lugares que F8 ya aprobó; el guard dev-only existe en PR #35 pero no en `main`. No quitar guard sin tener en cuenta costes de Mapbox y entorno objetivo.
3. **P1 — Recorrido end-to-end real:** registro/inicio → crear mascota → publicar y recibir interacciones → Comunidad → Lugares → Cuidados/Documentos → alerta/notificación. Reutilizar QA histórica y probar solo integraciones nuevas, cambios o brechas no cubiertas.
4. **P1 — Salida beta proporcional:** errores de red, recuperación de cuenta, estados sin datos, móvil y mínima operación humana de retirada/solicitudes antes de publicar externamente. No reabrir fencing avanzado por defecto.
5. **P2 — Pospuesto por decisión vigente:** mensajería real, notificaciones genéricas sin dependencia, monetización, extensiones fake door y rediseños masivos.

## Evidencia / exclusiones de este checkpoint

- GitHub Actions CI run `37927084599` **SUCCESS** en `b755480`; includes governance (6 tests Node nuevos) y build. Las pruebas locales independientes del selector también fueron **6/6 PASS**. Esto verifica lógica, no UX real.
- Supabase PAZO, lectura de metadatos: RLS habilitado en `pets`, `posts`, `care_items`, `care_completions`, `pet_documents`, `communities`, `community_posts`, `pet_places`, `notifications`. No se enviaron queries de datos personales ni se modificó SQL.
- No se cambió esquema, RLS, costos, Storage, Edge, Preview/Production ni `main`. PR #35 continúa PAUSADO y PR #36 DRAFT. No fusionar o desplegar sin aprobación vigente.
- Cualquier nueva intervención sobre módulos no aprobados requiere su gate de producto, conforme a `docs/PAZO_MODULE_LIFECYCLE.md`. Esta matriz no equivale a haber probado UX ni a Beta lista.

## Checkpoint 2026-10-09 — registro con confirmación por email

- **Detectado y corregido:** `signUp()` asumía que respuesta sin error significaba sesión autenticada y adelantaba a `A03`. Con confirmación por correo, `data.session` puede ser `null` pese a la respuesta correcta. La nueva clasificación `authenticated / verify_email / failed` mantiene al usuario en A02 con instrucciones de confirmación; no intenta RPC de creación de mascota sin sesión.
- Deshabilitado doble submit de registro durante petición. Limpiada contraseña del estado al completar registro/entrar al paso de confirmación. Nombre y edad de mascota dejaron de prellenarse con `Luna / 3 años`; la imagen de onboarding ahora es un icono vacío hasta elegir archivo (el servicio conserva su placeholder foto cuando no se sube ninguna).
- Pruebas Node nuevas: respuesta con sesión, sin sesión y con error (tres casos); `npm run test:mvp` se ejecuta como parte de governance. CI `37928358071` **SUCCESS** para commit `504f422` (incluye build). No se inspeccionó correo real ni disponibilidad/allowlist del redirect de Supabase, así que no declarar la confirmación E2E completada.
- **No se aplicó DDL, no se alteraron usuarios reales ni se desplegó Preview.** Vercel acceso al equipo `digitalapp` sigue **403**; no cambiar alcance de equipo ni hacer deploy para esquivar el error.

## Checkpoint — recuperación de contraseña (2026-10-09)

- **Implementación:** `AuthContext.requestPasswordReset` llama `supabase.auth.resetPasswordForEmail` con retorno relativo al mismo origin `/?auth=recovery`; el listener `PASSWORD_RECOVERY` y el marcador permiten mostrar `PasswordRecoveryView` cuando se restaura la sesión. `updateUser({ password })` valida la contraseña conforme al mismo contrato que el registro y exige confirmación visual; permite salir y cerrar sesión para iniciar de nuevo. Añadido «¿Olvidaste tu contraseña?» en login con aviso no enumerativo («Si existe una cuenta...»).
- **Pruebas:** casos Node de URL marcador, redirección y política de contraseña integrados en `npm run test:mvp`, más las pruebas existentes del selector Feed y registro. GitHub Actions run `37930372739` **SUCCESS** (governance y build) en commit `815cbda`; se resolvieron errores TS de nuevos eventos mediante lista de telemetría permitida, sin registrar emails ni contraseñas.
- **No es QA extremo a extremo:** no se ha recibido/clicado un correo real, comprobado retorno de Supabase Auth ni confirmado la allowlist de redirect URLs, dominio/correo del proveedor y respuesta a tokens caducados con un navegador. La conexión Vercel devuelve **403 en scope `digitalapp`**; el Preview del HEAD no está certificado. No mandar correos a usuarios de prueba ni cambiar Auth config sin gate explícito.
- **P1 pendiente de este flujo:** comprobar correo de recuperación y correo de confirmación de registro desde un dominio autorizado; revisar `Auth > URL Configuration` (Site URL + Redirect URL `https://<dominio-autorizado>/**` o equivalente acotado) al preparar Preview/Release; confirmar UI móvil, primer inicio y error de enlace vencido. No deducir validación E2E desde CI.
- **Estado:** PR #36 DRAFT, PR #35 F14 PAUSADO; sin merge, SQL, Storage, Vercel Production ni gastos. Prioridad MVP, no ampliar F14 hardening.

## Checkpoint — identidad de cuenta durante fallos de red (2026-10-09)

- Se detectó en `src/App.tsx` que `fetchOwnedPets(user.id)` rechazado devolvía la pantalla de onboarding por la combinación de `isOnboardingActive` inicial y `isAuthenticated`; podía hacer pensar a un usuario con cuenta real que debía registrarse nuevamente.
- **Corrección funcional en PR #36:** estado de carga asociado a `user.id`; spinner explícito durante la consulta inicial; pantalla de error con **Reintentar** sin cerrar sesión ni crear mascota; solo una lista de mascotas correctamente consultada y vacía desencadena A03. Se descarta la respuesta tardía si la sesión/cuenta cambia o el componente desmonta. Errores de datos secundarios no borran una identidad de mascota ya confirmada.
- **Checks:** commit `446b2c5b7403a423d9a9e570dd9ad53514043399`; GitHub Actions run `37931428416` **SUCCESS** (governance, Build y Lint). **No equivale a QA visual**, aún no se ha simulado el fallo de red en navegador.
- **Bloqueo Preview con evidencia nueva:** en el status de commit de GitHub, Vercel reporta dos contexts de failure (`Vercel – pazo-app` y `Vercel – pazo-app-t83r`) con destination `https://vercel.com/digitalapp?upgradeToPro=build-rate-limit`. La conexión Vercel con scope `digitalapp` también sigue devolviendo **403**. No abrir builds adicionales ni contratar Pro por este motivo: consolidar commits y esperar al siguiente gate de entorno autorizado.
- No se modificaron tablas Supabase/RLS, no se desplegó Preview/Production, ni se hizo merge; PR #36 sigue DRAFT y PR #35 F14 sigue PAUSADA. La beta sigue pendiente de correo real + rutas, smoke móvil y estado mínimo de privacidad/reportes.

## Checkpoint — Feed con recuperación frente a errores de red (2026-10-09)

- **Bug P0 confirmado por revisión de código:** la consulta inicial fallida quedaba convertida en `posts=[]` y `hasMoreFeed=false` sin mensaje; al cargar más contenido la página mutaba los cursores **antes** de terminar el enriquecimiento, con posible salto al reintentar. La consulta fallida de follows se ignoraba, ocultando contenido seguido.
- **Corrección PR #36:** cursor inmutable con `advanceFeedCursors`; se confirma solo tras obtener/enriquecer correctamente la página. Error inicial muestra mensaje y Reintentar; error en `loadMore` muestra reintento manual sin bucle de requests automáticos; cuando la respuesta válida está vacía aparece estado vacío honesto. Fallo en follows ya no simula un Feed parcial exitoso. Se incluyeron cinco pruebas unitarias de transición, offsets, agotamiento independiente e inmutabilidad, además de seis existentes de mezcla de fuentes.
- **Scope:** No se cambió algoritmo de recomendaciones, SQL, RLS, diseño integral ni backend. El Feed sigue necesitando QA móvil en Preview y prueba de red interrumpida con autenticación real. No confundir tests de transición con QA de backend.


## Decisión visual vinculante — regla de cero contornos (2026-10-09)

Product Owner reafirmó explícitamente que **botones, contenedores y superficies similares no pueden llevar contornos** ni siquiera durante `focus-visible`; los `fields` de escritura permiten excepción solo si verdaderamente necesaria, por control y no global. Se elimina el primer anillo de foco de `src/index.css` introducido en el piloto de calidad y se sustituye por foco mediante relleno/contraste y subrayado, conservando `prefers-reduced-motion`. Formalizado en `AGENTS.md` regla 21 y `docs/PAZO_UI_QUALITY_GATE.md`. Esta corrección es solo frontend; no se cambian contratos de producto, backend, Preview ni producción; QA visual por teclado sigue pendiente.
