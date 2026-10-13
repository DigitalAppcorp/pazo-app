# PAZO F13 — Visual refinement approved by Product Owner (2026-10-12)

## Authority and execution
- Source: Product Owner screenshots 1–21 supplied in chat, not the previously rejected generic Figma.
- Work directly in React/TSX. AI Project Brain is implementer; **no Codex handoff**.
- GitHub working branches from `release/mvp-beta-fast-track-20261010`, draft PR to RC, **never `main` without explicit acceptance**.
- Visual validation in local Vite; Vercel not used for visual review or deliberate deployment.
- No Supabase schema/data/RLS mutations without separate authorization; no repeated approved F14/T08, T05, T06, T07/T10, T09, T11 QA.
- Match PO colors/Quicksand, zero borders/outline rings (except justified text input), and preserve functional behavior and glass-like surfaces.
- **Restricción PO prioritaria:** NO CAMBIAR LA PANTALLA DEL MAPA / LUGARES hasta que el PO lo autorice. La autorización anterior del diseño del mapa quedó expresamente suspendida.
- PO local working tree contains existing changes: avoid overwriting it; use a clean independent clone/branch after permission issue is resolved.

## Ordered delivery (independent gates)
1. **Section title labels:** PO rejected even plain replacement titles. Remove ALL category title labels (including plain replacements) entirely; retain meaningful page headings. Implemented on F13 branch.
2. **Top controls / Home feed:** after PO's 2026-10-12 feedback that even 10/9 px selector labels remain visually too large, `8c1da435` applies a deliberately MINOR reduction **10→9.5 px** for `Para ti`, **9→8.5 px** for `Cerca · Próximamente`, and selector **178×44→170×42 px**. Title placement/grid and handlers unchanged; this specific visual adjustment is pending PO approval. Do not increase all typography blindly.
3. **Pazo native icon family:** ocho símbolos principales ya personalizados + 15 iconos secundarios redibujados en `6c103d58`, en total 23; los iconos visibles en Lugares no fueron tocados. CI PASS; aceptación visual PO pendiente.
4. **MAPA/LUGARES CONGELADO POR PO (2026-10-12):** prohibido modificar pantalla Lugares, MapView, MapboxMap, superposiciones, tarjetas, controles, iconos específicos y comportamiento del mapa hasta nueva autorización explícita del Product Owner. Se revierte el rediseño de MapView introducido en `ee14658e` y se restaura desde `5016395e`: se conserva únicamente la eliminación de etiqueta superior que el PO ya solicitó. No incluir MapView en bloques de F13.
5. **My Pet missing value:** weight and diet are optional; hide blank chips and show neutral missing-value message when both absent. Implemented; visual acceptance pending.
6. **Typography:** escala nominal Tailwind +3px y +3px a 227 ocurrencias de `text-[Npx]` en 22 archivos UI sin mapa (`9ebdb5e`, `8fc837e`, `5b21d56`). CI PASS, validación visual/responsive y desbordes pendiente.
7. **Interests:** READ-ONLY audit: production public schema contains pets.interests but no interests catalog table; onboarding currently hard-codes four options (one cat-specific). Species-based DB-sourced catalog requires explicit schema/data authorization, not implemented.
8. **Profile metrics whitespace:** no ghost FollowButton slot for owned pet, and `91f640f8` reduces metrics to 23px numbers / 10–11px labels, less vertical padding, 3 columns without title collisions, local exception to broad +3px typography. Rejected previous oversized metrics screenshot 1; visual acceptance pending.
9. **Profile tab gap:** compact accessible active tabs without fake borders. Implemented; visual acceptance pending.
10. **Social profile card:** avatar+identity row, metrics nearby, translucent card, post feed full width for singleton posts. Implemented; visual acceptance pending.
11. **Glass surfaces:** `pazo-glass-card` y `pazo-glass-modal` en `src/index.css` (sin contornos, con preferencia de transparencia reducida), aplicados a 30 tarjetas de 6 vistas y 13 paneles de 11 modales. CI PASS, aprobación visual pendiente.

## F13 — Ambient Feed + exhaustive yellow heading pills audit (2026-10-12)

- **SUPERSEDED BY PO VISUAL REJECTION (2026-10-12):** The previous three animated orbs in Home/Feed were rejected as visually unattractive. Commit `a1e3ad47` restores `src/components/views/HomeView.tsx` byte-for-byte to pre-orbs state `a7ad3d84` (blob `5e9dcca2357f5f8207854ccacac4696f4daaee84`). **DO NOT restore/add Feed orbs without renewed explicit PO approval**. Public profile orbs remain unchanged.
- Audited **all 43 `src/**/*.tsx` files** and all three `src/**/*.css` files for hard-coded yellow/coral pills, uppercase eyebrows and title-like badges. The eight remaining decorative yellow title pills removed in commit `63090d44`:
  - `src/App.tsx`: Pazo Acceso / login eyebrow.
  - `src/components/modals/MessagesModal.tsx`: Mensajería 1 a 1 eyebrow.
  - `src/components/views/OnboardingView.tsx`: promo hero badge Identidad/Comunidad/Cuidado; Tu cuenta; Agregar mascota; Privacidad; Tu comunidad (5).
  - `src/components/views/CommunityDetailView.tsx`: Ayúdanos a priorizar promotional title pill.
- Kept real page headings (e.g. `Iniciar Sesión`, `Hablemos.`, `Comencemos.`), instructional steps, event handlers, badges with **functional semantics** (Admin/Founder/Perro, new/unread, recommended, active check-in, archived, privacy status) and yellow primary action buttons; removing these would misrepresent product state.
- **PO freeze exception:** `src/components/views/MapView.tsx` contains an `Ayúdanos a priorizar` yellow/transparent mini-label in future-place-feature area; deliberately **not edited** because **ALL changes to Lugares/Mapa remain unauthorized**. MapboxMap/PlaceFeatureExperiment unchanged.
- This is a code audit and branch implementation only. CI/build and Product Owner's visual comparison are separate gates; do not assert no yellow pixels anywhere.

## F13 — Onboarding species selector refinement (2026-10-12)

- PO screenshot of `Especie` selector rejected old four buttons as disproportionate. Commit `a1e3ad47` updates **only the selector in `src/components/views/OnboardingView.tsx`**: four equal-width 74px-high mini-cards, responsive grid, centered 23px PAZO animal glyphs, 12px labels, 18px corner radius, translucent idle surface, dark green/lime selected state, soft shadow and `aria-pressed` selection. Preserve `setPetSpecies` behavior and existing species IDs; no backend/data changes.
- Validation: CI pending or verified separately; actual PO visual acceptance pending. **Map remains frozen.**

## F13 — Consolidación del registro y aviso de privacidad (PO aprobado, 2026-10-12)

- **Decisión PO:** eliminar la pantalla A04 «Tú decides» como paso independiente: era meramente informativa y el botón «Guardar y continuar» no guardaba ajustes.
- **Implementado:** A02 registro cuenta (paso 1/3) → A03 agregar mascota (paso 2/3, con resumen bilingüe de privacidad y acción real `Consultar privacidad` que abre la política existente) → A04 zona/intereses (paso 3/3, antes A05). Back: A04 → A03. Bienvenida A01 sin numerar; al iniciar sesión una cuenta sin mascota entra en A03 como antes.
- El nuevo resumen advierte que nombre/especie/foto de mascota pueden ser visibles y que no se incluyan datos privados. Wording conservador según `PublicProfileView`, `petService` y `legalCopy`; sin prometer privacidad configurable que no existe.
- Se conserva la persistencia real **solo al pulsar el botón final** `Crear perfil y entrar`: llama al `handleFinishOnboarding`/RPC existente, con datos previos de mascota/zona/intereses intactos; ningún contrato de DB/Storage cambia.
- El formulario A03 admite scroll vertical y el resumen puede abrir el modal de privacidad preexistente; verificar teclado/móvil/ES+EN y validación visual PO.
- **Impacto de datos:** ninguna nueva captura, colección, evento, tabla o política; `docs/PAZO_DATA_INVENTORY.md` sin cambio de categorías.
- **Map/Lugares congelado**; no modificar `MapView`/Mapbox. CI de código y aceptación visual constituyen gates independientes.

## F13 — Publicaciones Feed: acciones compactas (2026-10-12, PO)

- PO mostró captura de desborde de «Seguir» y «Denunciar» en cabecera PostCard, y autorizó menú de 3 puntos para «Denunciar» y «Ocultar».
- Código `71f44cb7` en `src/components/views/HomeView.tsx`: distribución horizontal de cabecera con `min-w-0`, información de mascota truncable y etiqueta de recomendación adaptativa; `Seguir` permanece visible si corresponde y `Denunciar` se mueve al menú `···`. No alterar acciones de comentario/like/save.
- «Ocultar publicación» no existía como contrato de backend. Se implementa **solo para este feed en memoria React**, sin escribir Supabase ni fingir preferencia permanente: quita la tarjeta de la lista en la vista actual, muestra aviso «Publicación oculta en este feed» y permite **Deshacer**. Se reinicia al montar otra vez el feed. Reportar mantiene el flujo real `ReportDialog` y los checks `canReport`/no propias.
- Menú `role=menu` con nombres ES/EN, `aria-expanded`, cierre por botón, fuera o Escape; se evita `overflow-hidden` del artículo para que el panel no se corte en los bordes; foto conserva su recorte propio.
- Prueba `scripts/closure-ui.test.mjs` `50a0a1f1` ejercita aparición del menú, Report condicional, ocultamiento local y deshacer.
- No se modificó ningún servicio, SQL, esquema Supabase, mapa/Lugares o rama `main`. **CI de HEAD y aceptación visual PO son gates independientes.**

## F13 — Feed «Seguir» transparente (PO 2026-10-13)

- PO screenshot validated three-dot action menu but rejected dark-green solid **Seguir** in feed header.
- Add an explicit `variant="feed"` to the existing `FollowButton` component, used **only in HomeView PostCard**. This variant renders a fully transparent resting background and dark-green text (`#204E4A`), no shadow or border, with a subtle translucent hover. Keep current click handling, visibility, text, dimensions, follow API and loading state unchanged.
- **Do not modify** the styling of follow buttons in the public profile or other UI, or the three-dot menu.
- Map/Places frozen; no data/database changes. CI does not constitute PO visual approval.

## F13 — Perfil público PAZO opción 4, Comunidad / Lifestyle (PO aprobado, 2026-10-13)

**Decisión UX:** el PO seleccionó la opción visual 4 pero expresamente **SIN FOTO DE PORTADA**; área superior limpia para futuras insignias sin crear espacios vacíos ni simular insignias, **bio solo cuando existe**, Seguir **verde sólido** (el feed conserva Seguir transparente), contadores con iconos y pestañas como mockup. Acciones secundarias en menú de tres puntos.

**Implementación del código, commit `2fb0f0d6`:**
- `src/components/views/PublicProfileView.tsx`: cabecera sticky en 3 columnas con Regresar, título Perfil centrado y menú `···` únicamente cuando se permite denunciar mascota ajena; Denunciar perfil ya no flota bajo Seguir. Menú accesible (`role=menu`, `aria-expanded`, Escape, click fuera) que invoca el `ReportDialog` preexistente; ninguna opción «Compartir»/«Copiar» sin contrato real.
- Identidad mascota: avatar real, nombre, especie, raza opcional y estado Perdido preexistente. Sin portada; `get_pet_founder_status` conserva badge Fundador solo cuando el dato exista, dejando un punto de extensión para insignias futuras **sin reserva vertical vacía ni fake-door**.
- `bio` obtenida del campo `pets.bio` existente y mostrada solo si contiene texto; no introducir bio de ejemplo, textos inventados ni rellenar perfiles viejos.
- Botón `FollowButton variant="profile"` permanece verde sólido para «Seguir», permanece visible para «Siguiendo»; contadores siguen los recuentos reales de la tabla `follows`, y publicaciones reales. Estadísticas 3 columnas con IconDocument/IconCommunity/IconHeart y tipografía responsive.
- Tabs Publicaciones / Información con iconografía e idénticos callbacks/datos originales. Lista de publicaciones reales y empty state existentes, información Edad/Género, superficies suaves sin bordes.
- `src/components/views/PetView.tsx` ya tenía edición y guardado real de `bio` por `updatePetProfile` RPC; se mejoró a `textarea` bilingüe de dos líneas, máximo 240 caracteres, texto opcional y advertencia de visibilidad pública, sin nuevos datos, SQL ni migración.
- `scripts/closure-ui.test.mjs` incluye test de la cabecera/menú según titular/permisos y conexión del campo de biografía con el formulario; commit `162f28a0`. La compilación en GitHub del commit de implementación fue SUCCESS; el test adicional está sujeto al CI del HEAD actual.
- **Aprobación visual del PO pendiente**: probar perfil de mascota ajena/propia, perfiles con y sin bio, Fundador/Perdido, ES/EN, menú y Seguir/Siguiendo, tabs en móvil 320/375px.
- **Restricciones:** `MapView.tsx`/Mapbox/Lugares congelados. No se mutó Supabase, no Vercel para visual, no se fusiona RC/main sin aprobación PO.

## F13 — Opción 4: discrepancia visual detectada por PO y segunda implementación (2026-10-13)

- **EVIDENCIA:** PO comparó screenshot real de primer intento con el mockup «OPCIÓN 4 · COMUNIDAD/LIFESTYLE» y rechazó ese intento por falta de semejanza, pese a CI PASS. **No declarar como aprobado** el commit `2fb0f0d6` ni todo F13.
- **Referencia visual autorizada:** composición social cálida con retrato circular protagonista, nombre grande **debajo**, chip de especie, bio únicamente si está guardada; CTA verde sólido con icono de persona+; métricas en cápsula horizontal con iconos, tabs redondeadas con iconos, publicaciones cálidas y menú de tres puntos para acciones reales.
- **EXCEPCIÓN deliberada:** el mockup generado incluía una foto de perro de portada, pero el PO eligió expresamente **SIN PORTADA (1C)** posteriormente. No usar fotos ficticias, no añadir portada, no rellenar bio (2C), no inventar insignias ni espacio fijo. Conservar la insignia Fundador real y futura extensión vacía.
- **Implementación corregida** `78a339a6`: `PublicProfileView.tsx` sustituye layout «avatar cuadrado + nombre al lado» por **avatar circular de 132–156px**, nombre principal 34–48px debajo, fondo cálido claro y estatísticas tipo pill, tabs totalmente redondas con iconos estilo mockup, post cards con menú `···` (solo si reportable: real `ReportDialog feed_post`). Datos, privacidad, eventos y permisos conservados.
- **CTA** `8d592e03`: `FollowButton variant="profile"` usa botón verde sólido con icono de usuario+ y más altura; `Siguiendo` tiene superficie atenuada sin contorno; la variante `feed` TRANSPARENTE aprobada sigue intacta.
- **Prueba** `ce2e0965` añade comprobaciones de estructura de la opción 4 y del cableado del menú/post, sin crear datos ni dependencias. CI y revisión visual PO separados; no afirmar comparación de navegador contra mockup sin screenshot posterior.
- Bio editable del propio perfil ya implementada/persistida en `PetView` con `updatePetProfile`; la captura del PO mostró que `bretman` no tiene bio visible, por lo que no se inventó texto.
- **Restricción inamovible:** mapa/Lugares congelado, Supabase sin escrituras/migraciones, no main ni Vercel para QA.

## F13 — Tercera implementación: reconstrucción completa según mockup 4 (PO 2026-10-13)

- **Instrucción correctiva inequívoca:** «No quiero que adaptes la pantalla a la que ya tenía. Quiero que la rediseñes, deja la página tal cual la opción 4, con datos reales y sin portada». Los dos enfoques anteriores `2fb0f0d6` / `78a339a6` fueron rechazados visualmente. No deben tratarse como versiones aprobadas.
- **Cambio estructural real** `ef90d7f5`: se eliminó TODO el render anterior de `PublicProfileView.tsx` y se reconstruyó el cuerpo visual. No queda la tarjeta contenedora única que agrupaba avatar+nombre+follow+estadísticas. El layout usa lienzo crema continuo, cabecera de tres puntos, detalles decorativos puntuales cálidos (sin portada ni fotos falsas), avatar circular 148–168px sobre el lienzo, nombre grande debajo, especie, bio real opcional, CTA perfil Seguir verde con persona+, estadísticas COMO CÁPSULA INDEPENDIENTE, tabs segmentadas, publicaciones sociales en cards independientes de radio amplio y menú real de denunciar; pestaña Información con dos bloques suaves. Se mantiene fetch original, ReportDialog, permiso de reporte, post-data, follow y badges existentes.
- Se retiró el fallback visual de foto de perro de Unsplash en ausencia de `photo_url`: el componente representa un icono PAZO en su lugar, sin inventar datos/fotografías. `bio` continúa apareciendo solo con valor; el campo de edición real ya usa RPC existente.
- **No portada, por elección PO 1C**: el mockup referencia tiene una fotografía decorativa grande de perro pero la decisión posterior de PO es no incluir portada. Esta es la única diferencia estructural de contenido respecto al mockup.
- Código y test sujeto a CI / visual PO separados. QA requerido: 320/375/430 px, avatar con/sin fotografía, fundador / perdido / bio vacío, active Follow, 3 dot menu, report correcto, propias/no propias y tabs reales.
- `MapView` y Lugares congelados; no Supabase ni main ni Vercel visual.

## F13 — Mensajería en desarrollo, diseño opción 4 «Comunidad que conecta» (PO autorizado, 2026-10-13)

- **Decisión PO:** conservar mensajes fuera del MVP, pero reemplazar modal informativo genérico con presentación editorial de comunidad/lifestyle; este cambio solo rediseña la pantalla de «En desarrollo», no reactiva mensajería.
- **Código `681bc2be`** en `src/components/modals/MessagesModal.tsx`: sección de aviso de cuentas reales `!isDemo` con SVG original de perro/gato, burbujas de conversación y huella, tarjeta crema de esquinas suaves, título bilingüe «Cada amistad comienza con un hola» / «Every friendship starts with hello», estado explícito «En desarrollo», descripción honesta y única acción de cerrar/volver a PAZO. El botón X conserva su acción.
- **Restricciones de integridad:** `isDemo` y su interfaz anterior permanecen separados; usuarios reales no ven fake inbox ni mensajes de prueba; no habilitar `onSendMessage`, redes, chats, citas de lanzamiento ni instrumentación silenciosa. Cero escrituras de DB, ninguna dependencia nueva.
- **Accesibilidad/responsive:** `role=dialog`, `aria-modal`, `aria-describedby`, controles con 44px o más, colores legibles, `max-height` con scroll vertical para pantallas pequeñas, ilustración `aria-hidden`. Sin bordes, contornos ni anillos.
- **Pruebas `ae901df8`:** ES/EN, contenido real de desarrollo, no revelar conversaciones sintéticas, `onClose` en X y CTA, no llamar `onSendMessage`. Código CI PASS; prueba y aceptación visual PO se verifican por separado.
- Mapa/Lugares congelado; F13 y PR #44 continúan abiertos hasta aprobación PO, sin merge.

## F13 — Avisos/Notificaciones opción 4 «Comunidad que cuida» (PO aprobado, 2026-10-13)

- **Decisión PO:** Avisos ya está desarrollado y funcional; se aprueba rediseño visual completo, Opción 4 cálida/PAZO lifestyle, sin inventar alertas ni alterar funcionamiento.
- **Código f03fcb03:** nueva presentación de src/components/modals/NotificationsModal.tsx: lienzo crema, cabecera «Siempre cerca de tu comunidad», filtros reales Todas/Avistamientos, ilustración vectorial original perro descansando junto a una campana únicamente cuando la sección no tiene avisos cargados, título «¡Todo en calma!», tarjetas suaves con categoría, título, contenido, fecha/tiempo, indicador de no leído y acceso contextual existente.
- **Contratos preservados:** getNotificationSightingId decide apertura; onOpenNotification se ejecuta exclusivamente para avistamientos navegables, notificaciones informativas continúan disabled. onClose, onScroll + onLoadMore, hasMore y isLoadingMore siguen. Si la sección está vacía pero hay más páginas, «Ver avisos anteriores» invoca el mismo callback onLoadMore; ningún endpoint nuevo.
- **ES/EN y accesibilidad:** role=dialog, aria-modal, aria-describedby, aria-pressed para filtros, targets de 44px, estado de carga, scrolling móvil y SVG aria-hidden. Sin nuevas librerías, datos falsos, tracking ni contornos visuales de botones/tarjetas.
- **Pruebas def85882:** estado vacío en dos idiomas, filtro, cierre, apertura de avistamiento, bloqueo de notificación sin destino, scroll y paginación manual: CI SUCCESS (#38333808283). El código también CI SUCCESS (#38333718441). La validación visual de PO en Vite permanece PENDIENTE.
- **Restricciones:** Mapa/Lugares congelado; no Supabase, Vercel deliberado, main, migraciones ni merge. PR #44 DRAFT.

## F13 — Solo aviso «Cerca · Próximamente»: opción 4 «Explora tu mundo» (PO aprobado, 2026-10-13)

- **Alcance PO explícito:** modificar ÚNICAMENTE el aviso/tarjeta visible al elegir «Cerca · Próximamente» en Inicio. No rediseñar encabezado «Su pequeño mundo», pestañas Para ti/Cerca, publicaciones, navegación inferior ni Lugares/Mapa.
- **Código f87d29cc:** único archivo de UI modificado `src/components/views/HomeView.tsx`. Se sustituyó solo el JSX de la rama `feedFilter === 'nearby'` y se añadió `NearbyNeighborhoodArtwork`, SVG decorativo original de casas, árboles, perro, gato y dos pines no georreferenciados. Tarjeta cálida con superficie glass ligera, sin bordes.
- Copy aprobado: etiqueta textual simple «Próximamente en PAZO» (no pill amarilla), título «Un mundo de mascotas a tu alrededor», descripción corta que plantea una posibilidad futura sin prometer que está activa; versión inglesa incluida.
- **Contrato de validación preservado:** mismos callbacks `handleSelectNearby` y `handleNearbyInterest`, mismo insert existente `feature_nearby_interested`, mismos estados `hasVotedNearby`, `isSubmittingNearby`, `canReport`, sin nuevas llamadas de ubicación, trackers, tablas ni alteración de Supabase. CTA «Me interesa esta función» o bloqueo de cuenta, feedback de voto e inglés.
- **Pruebas 400db79a:** se actualiza prueba T04 para el texto real, y se verifica comportamiento ES/EN de avatar/artwork, interés deshabilitado para demo, que el aviso desaparezca al volver «Para ti» y que los identificadores de experimento existentes sigan intactos. GitHub CI SUCCESS #38334840145.
- **Gate pendiente:** screenshot local del PO en Vite. NO confundir CI/build PASS con aceptación visual. PR #44 DRAFT, RC/main sin merge, Lugares/Mapa congelado.

## F13 — Comunidades Opción 6 «Mapa con pines» (2026-10-13, PO autorizado)

- **Selección visual PO:** de seis mockups generados el PO eligió exactamente **Opción 6 — Estilo mapa con pines** y autorizó implementación fiel de referencia, con estado vacío «Todavía no hay comunidades.», mapa ILUSTRADO de calles blancas/zonas verdes, casitas, árboles, pin central verde oscuro con huella blanca, pequeños motivos de comunidad, y CTA sólido «Crear la primera comunidad». El header PAZO y navegación global NO se rehacen.
- **Código `9e45ae18`:** el estado `communities.length === 0` en `src/components/views/CommunitiesView.tsx` se sustituyó por `src/features/communities/components/CommunitiesEmptyState.tsx`, componente puramente visual con SVG original (no Mapbox, ni mapas reales ni ubicaciones de usuarios), superficie glass crema/blanca, proporción y radios inspirados en el mockup. Texto bilingüe de ausencia de comunidades + CTA verde. Se conserva el botón amarillo «Crear» en la parte superior y su apertura del mismo `CreateCommunityModal`.
- **Funcionalidad:** CTA de tarjeta usa `onCreate={() => setIsCreateCommunityOpen(true)}`; permiso `canCreate={Boolean(currentPet) && canUseCommunities}`. Modal de creación, load communities, navegación a detalle, join/leave, miembros y listados existentes quedan sin modificar; solo rama del estado vacío cambia.
- **Pruebas `b41bbc28`:** arte/mapa representativo sin datos falsos, textos ES/EN, habilitar/deshabilitar botón según permisos, callback, preservación de acciones de comunidades ya existentes. CI/build y aprobación visual local PO son gates diferentes; QA de reproducción exacta se hará en Vite con screenshot real y sin afirmar que la referencia y runtime son idénticos todavía.
- **Restricción PO vigente:** Mapa/Lugares **congelado**; la ilustración de comunidad no llama proveedores Maps. Cero mutación de Supabase, migraciones, Vercel deliberado o merges de RC/main. PR #44 continúa DRAFT.

## F13 — Detalle de comunidad: rediseño integral Opción 4 «Comunidad Lifestyle PAZO» (PO aprobado, 2026-10-13)

- **Orden PO:** no crear un mockup ni un parche visual: programar la propuesta **Opción 4 — Comunidad Lifestyle PAZO** en la vista real de detalle de una comunidad; preservar portada, datos, acciones y permisos existentes.
- **Código `490b04b3`:** `src/features/communities/components/CommunityLifestyleHero.tsx` nuevo, exclusivamente visual/de dominio: portada con imagen REAL de `community.imageUrl` (si falta, espacio verde con icono PAZO, sin foto falsa), superficie crema que se funde con el hero mediante SVG orgánico, botón de regreso en portada, estado archivado real, nombre grande en área abierta **sin tarjeta rígida de identidad**, categoría/especie/zona de datos, descripción real, badge Admin SOLO si rol owner, contadores de `community.membersCount` y `posts.length` con iconos. Unirse/Salir usa `handleMembership` existente para no-owner; propietario no recibe un botón «Administrador» sin acción que duplique badge.
- `CommunityDetailView.tsx` ahora compone hero de dominio, nav unificado 3 tabs (`posts/info/members`) con `aria-pressed`, composer social con avatar circular, texto editable, subida de foto y botón Publicar, todo conectado a los handlers existentes.
- **Código `43025c3d`:** composición de publicaciones ya reales más editorial/social (avatar circular, imagen de publicación más protagonista, reacciones y comentarios en secciones suaves); Información glass cálido y miembros con avatar redondo. Se conservan los fake doors `CommunityFeatureExperimentCard` actuales dentro de Información, edición/archivado/transferencias, reportes, eliminar y avisos de limpieza multimedia.
- **Reglas:** NO inventar posts/miembros/eventos/insignias ni incorporar URLs externas decorativas; no cambiar servicios, esquemas ni Supabase. No tocar `MapView.tsx` ni Lugares/Mapa. Respetar cero contornos en componentes nuevos; Quicksand/colores establecidos.
- **Test `0c3f52bc`:** arte/portada/metadata reales, admin, join/leave/archivado, CTA Back, tabs y presencia de handlers críticos; gate CI separado de QA visual. El primer render está pendiente de captura local del PO; **NO declarar coincidencia pixel-perfect con la Opción 4 ni cierre de F13 sin aceptación visual**.
- **PR #44** sigue DRAFT hacia RC `release/mvp-beta-fast-track-20261010`; sin merge a `main`, Vercel, migraciones o DB writes.

> **ESTADO ACTUAL — ACTIVADA.** Product Owner aprobó instalar la migración; Supabase la registra con versión `20261013025451`. Catálogo + prueba SQL transaccional de única notificación, ant duplicado y rollback: PASS. No hay datos sintéticos persistidos. Los párrafos de «MIGRACIÓN PENDIENTE» que siguen describen el Gate histórico anterior y **ya no son bloqueos activos**. La prueba visual del cliente continúa pendiente.

## F13 — Notificar al dueño cuando una mascota se une a comunidad (2026-10-12)

**Scope expresamente solicitado por Product Owner:** aviso funcional persistente en apartado Notificaciones al propietario de la comunidad por cada inserción legítima de un nuevo miembro; no confundir administradores con propietario. Ninguna notificación ficticia en cuentas reales.

- **Backend detectado en read-only:** `community_memberships` INSERT mediante `joinCommunity`; `notifications` ya tiene RLS solo destinatario y sin INSERT cliente, pero el CHECK de `type` solo admite `sighting/system`. No existía trigger de ingreso; nueva función server-side necesaria para evitar falsificación por frontend.
- **Frontend implementado:** fuente `getNotificationCommunityId` tipada a `community_join`; card existente «Siempre cerca de tu comunidad» presenta el evento en **Todas** con icono Comunidad, y al tocarlo usa navegación existente `communityTargetId/key` para abrir detalle. La función existente `markNotificationRead` sigue marcando como leído, y unread count proviene de `notifications`. Filtro Avistamientos y su ruta no se alteran.
- **Migration PENDIENTE `supabase/migrations/20261013025451_community_join_owner_notifications.sql`:** ampliar CHECK `notifications.type`; añadir función trigger `community_private.notify_owner_on_member_join()` SECURITY DEFINER con `search_path=''`, sólo AFTER INSERT de `community_memberships`; `NEW.role='member'`, comunidad active y dueño no nulo distinto de `NEW.user_id`; inserta una notificación con `user_id=owner_user_id` y `source_id=community_id`. PK de membresías impide reintento duplicado de mismo ingreso. Una salida y reingreso legítimo crea un segundo aviso (nuevo evento). Sin backfill, sin permiso INSERT para usuarios, sin Realtime/servicio adicional.
- **Privacidad:** mensaje almacena solo la pertenencia de un nuevo integrante y nombre de comunidad (máximo 80 caracteres), no nombre/UUID del miembro, ni GPS, correo, ni analítica; `pet_id=NULL` para no retener una mascota que podría eliminarse después. `user_id` es exclusivamente destinatario y protegido por RLS.
- **Gate:** GH CI/test de frontend y contrato SQL no valida ejecución alojada. Requiere autorización PO separada para aplicar DDL a Supabase. Luego validar una única unión descartable con dueño distinto, notificación a solo ese dueño, contador al reabrir, click deep-link, marca leído, no alerta al self/owner, sin reabrir pruebas de fases ya PASS. No ejecutar SQL hosted hasta aprobación explícita.
- **Congelados:** Lugares/Mapa, `main`, RC, Vercel. PR #44 permanece DRAFT.

## Stage acceptance
- Each block: code diff review, TS build/affected checks, browser comparison with supplied screenshots and Product Owner visual acceptance.
- A GitHub push/CI pass is not visual approval or F13 completion.
- Next action: PO revisa en Vite local el diseño, tipografía móvil, iconos, perfiles, modales glass y desbordes. CI PASS no implica visual PASS.
- Intereses por especie: NO hay catálogo DB. Queda bloqueado en Gate de modelo de datos y autorización independiente; no inventar semillas ni modificar esquema.
