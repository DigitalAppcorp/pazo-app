## F17 — Desenfoque alineado con la burbuja activa del dock (22-oct-2026; SOLO RAMA)

**Nueva captura y decisión PO:** el efecto cristal tipo blur y el espacio inferior compacto son satisfactorios, pero el desenfoque visible debe subir hasta la altura donde **termina por arriba la burbuja verde que se mueve** entre pestañas. No agrandar la zona segura, no pintar de blanco y no difuminar el menú. El diseño de la barra y el comportamiento de Lugares no cambian.

**Implementación:** `src/index.css` mantiene `blur(20px)`, altura física de `.pazo-scroll-soft-edge`, `bottom:0`, `pointer-events:none` y `z-20` bajo el dock `z-30`. Se reemplaza únicamente la máscara porcentual por `linear-gradient(to top)` anclada a distancias reales del borde inferior **+ safe-area**: cristal perceptible (alfa 0.48) a `6.4rem`, donde asoma la burbuja activa; suave hasta `7.35rem` y completamente transparente en `8.25rem`. Así la altura visual acompaña a la bolita en distintos teléfonos sin una franja abrupta ni desenfoque excesivo de controles distantes. El CSS se aplica solo a Feed, Comunidades y Mi mascota, no Mapa. La reserva de scroll de `6rem+safe-area` se conserva sin cambios.

**Gates pendientes:** CI exacto del HEAD y validación Android para verificar inicio alineado, dock nítido y último botón accesible. No main, producción, Supabase, PayPal, proveedores ni nuevos permisos. No declarar aprobado por CI solamente.

---

## F17 — Zona segura compacta y cristal localizado cerca del dock (22-oct-2026 · SOLO RAMA)

**Evidencia del PO:** después del ajuste `bd24213c` sigue habiendo excesivo espacio vacío al final del Feed y Mi mascota. Auditoría de código identificó **dos reservas inferiores acumuladas**: `App.tsx` añade `padding-bottom:9rem+safe-area` (144px base) en el contenedor principal y cada vista social (`HomeView`, `CommunitiesView`, `PetView`) incluye `pb-6` (24px). Total previo: 168px + safe-area sin contar geometría de otros elementos. El dock real tiene una rejilla de 76px más padding vertical (aprox. 92px+safe-area). Una reserva mayor separaba visualmente las últimas tarjetas y herramientas del menú.

**Corrección en PR #81:** reducir únicamente la reserva de `<main>` a **6rem+safe-area** (96px), conservando el `pb-6` propio de los tres módulos (total ≈120px+safe-area, clearance sobre el menú sin hueco excesivo). Mantener intactos el tamaño físico del efecto de cristal, su `blur(20px)`, la barra, `z-index`, `pointer-events`, mapa y módulos financieros. Solo concentrar máscara de desenfoque en el **55% inferior de la misma capa**: transparente al 45%, débil al 56%, progresiva al 70/86% y completa en el borde inferior. Los controles de distancia moderada dejan de quedar borrosos; las últimas acciones deben poder quedar visibles por encima del dock. Sin capas de color, neblina ni corte horizontal.

**Regresión:** `scripts/closure-ui.test.mjs` comprueba ausencia de antiguas reservas 9/13rem, presencia de `pb-6` interno en las tres vistas sociales, máscara localizada, altura y blur anteriores. **Gate pendiente:** CI exacto y aceptación Android de fin de scroll y controles accesibles. No publicación en producción, merge a main, pagos, datos ni infraestructura.

---

## F17 — Menos espacio vacío sin achicar la capa de cristal (22-oct-2026; solo rama)

**Evidencia PO:** en el Preview `83fefec2` las últimas publicaciones del Feed y los controles finales de Mi mascota quedan demasiado separados del dock flotante porque `main` añade `13rem` al final del scroll. El estilo de cristal (20px blur, altura total y extensión 20px hacia arriba) fue aprobado; no hay autorización para reducirlo ni convertirlo en una capa blanca.

**Corrección autorizada:** `src/App.tsx`: bajar solo `padding-bottom` del contenido desplazable de `13rem+safe-area` a `9rem+safe-area` (64px menos de espacio vacío con rem base 16px) y mantener la barra flotante en su capa actual. `src/index.css`: conservar exactamente `height: calc(5.75rem + clamp(84px, 13dvh, 116px) + 20px + env(safe-area-inset-bottom, 0px))` y `backdrop-filter: blur(20px)`; concentrar únicamente la máscara alfa: transparente hasta 30%, difuminado tenue desde 42%, más fuerte progresivamente hasta 100% en el fondo. Así contenido de distancia moderada mantiene nitidez y el último botón puede subir por encima del dock sin neblina ni franja dura. Se aplica solo a Feed, Comunidades y Mi mascota; Mapa/Lugares, paneles y acciones sin cambios.

**Gate:** regresiones de `scripts/closure-ui.test.mjs`, CI exacto, Preview aislado y aceptación visual Android de último botón visible y ausencia de espacio desproporcionado. **No main, producción, PayPal, Supabase ni gastos.**

---

## F17 — Microajuste aprobado: desenfoque 20 px más alto (22-oct-2026; solo rama)

**Aceptación parcial PO:** el nuevo efecto tipo cristal en Feed se ve correcto; pide únicamente iniciar el desenfoque ligeramente más arriba del menú flotante, sin exagerar altura ni alterar estilo, transparencia o nitidez del dock. Se corrigió la afirmación equivocada de falta de acceso: el repositorio sigue conectado y los cambios se ejecutan por GitHub.

**Cambio limitado:** `src/index.css`, `.pazo-scroll-soft-edge`: añadir **20 px** a la altura de la capa desde `bottom:0`, sin cambiar `blur(20px)`, máscara, stops, colores (ninguno), `z-index`, `pointer-events` ni lógica. El inicio visual del desenfoque sube levemente; la zona inferior continúa bajo el menú sin un corte horizontal. La capa sigue condicionada en `src/App.tsx` exclusivamente a `inicio`/Feed, `comunidades` y `mascota`; Mapa excluido. Prueba estática actualizada para fijar este valor.

**Gate:** CI exacto del nuevo commit, Preview independiente y aprobación visual Android. No `main`, no producción, sin cambios en datos, PayPal, Supabase, assets ni navegación.

---

## F17 — Cristal esmerilado, sin neblina ni resplandor blanco (22-oct-2026 · SOLO RAMA)

**Nueva evidencia PO:** el Preview `d90e5040` ya no presenta corte horizontal, pero el área inferior de Feed se ve cubierta por neblina/sombra blanca, no borrosa como cristal. Auditoría CSS confirmó `.pazo-scroll-soft-edge::after` con capa crema hasta `rgba(250,248,245,0.94)`: ocultaba los colores y detalles originales de la foto. El filtro real de 11px resultaba secundario.

**Cambio:** eliminado totalmente `::after`, sus tintes blancos y `isolation:isolate`. Único `::before` transparente con `backdrop-filter: blur(20px)` y `-webkit-backdrop-filter`, máscara `mask-image/-webkit-mask-image` con varios stops crecientes para que el **desenfoque** progrese hacia el borde inferior sin pintar encima. La capa mantiene `pointer-events:none` y `z-20`, continúa tras el dock flotante `z-30` que nunca se difumina. Se monta solo en Feed, Comunidades, Mi mascota, no Mapa. Se conserva el clearance de scroll de 13rem+safe-area para que los botones sigan accesibles. No se tocaron lógica, navegación, modelos, pagos ni backend.

**Regresión:** `scripts/closure-ui.test.mjs` prohíbe la capa crema, exige backdrop blur real, stops progresivos y muestreo no aislado. **GATE**: aprobar CI SHA exacto y validación visual Android de borrosidad real sin neblina; no aceptar UX automáticamente por CI. Sin merge, sin producción, sin cambios Supabase/PayPal.

---

## F17 — Corrección del corte duro en el degradado social (22-oct-2026; SOLO RAMA)

**Evidencia PO:** captura Android del Feed del Preview `17916b0c`: banda difusa rectangular interrumpida abruptamente por una línea horizontal, seguida de imagen completamente nítida antes del dock flotante. **Causa exacta:** la capa CSS `.pazo-scroll-soft-edge` tenía `bottom:calc(5.75rem + safe-area)` y se acababa antes del menú, dejando una segunda franja sin ningún efecto.

**Corrección:** el overlay social `z-20` ahora continúa **hasta `bottom:0`** por detrás del menú `z-30` (que sigue nítido y con cavidad intacta). La altura incluye la zona del dock + una franja superior de difuminado. Máscara del `backdrop-filter` de 11px y color crema con varias paradas alfa progresivas, sin terminación visible entre la foto y el menú. `pointer-events:none` impide bloquear interacciones. Se mantienen únicamente `inicio|comunidades|mascota`, excluyendo mapa, y la reserva inferior de scroll de 13rem para que los últimos botones de Mi mascota sean accesibles.

**Gates:** `scripts/closure-ui.test.mjs` prohíbe volver a posicionar el overlay encima del dock, valida `bottom:0`, máscara, progresividad, orden DOM, tabs y toques. CI SHA exacto + comprobación visual Android pendientes; no aprobar UX por solo CI. Sin merge, producción, cambios financieros ni Supabase.

---

## F17 — Desenfoque inferior progresivo del contenido social (22-oct-2026; SOLO RAMA)

**Decisión PO:** Feed, Comunidades y Mi mascota desvanecen progresivamente publicaciones, tarjetas y controles al acercarse a la zona superior del menú flotante. La capa difumina el contenido con `backdrop-filter` + máscara alfa vertical y añade un degradado crema suave como respaldo. **El dock flotante permanece completamente nítido, su cavidad conserva transparencia y sus botones funcionan igual.** El módulo Lugares/Mapa queda expresamente excluido.

**Implementación:** una única capa `data-pazo-scroll-soft-edge` como hermana de `<main>`, entre el scroll y `<BottomNav>`, renderizada solo para `inicio|comunidades|mascota`; CSS `z-index:20`, menú `z-30`, `pointer-events:none`, altura sensible al viewport y borde inferior por encima del dock. `main` mantiene su scroll, pero extiende el espacio final a `13rem+safe-area` para que botones importantes puedan subir por encima del difuminado al llegar al final. Sin cambio de lógica de Feed/comunidades/perfil, ni de datos, ni de navegación.

**Regresión:** `scripts/closure-ui.test.mjs` comprueba tres módulos, exclusión de Mapa, orden DOM/z-index, máscara, difuminado, pointer-events y clearance. Pendiente prueba CI del SHA exacto y aceptación visual Android; no merge ni producción sin GO, sin cambios de Supabase/PayPal ni proveedores.

---

## F17 — Corrección visual del carrusel de Lugares (22-oct-2026; solo rama)

PO observó solapamiento de las tarjetas con el dock flotante al desplazarlas verticalmente. Causa: scroll vertical artificial dentro del rail y espaciador inferior de 9rem. Corregido en `ImmersivePlacesStage.tsx`: banda horizontal única, sin scroll vertical ni espaciador, posicionada por encima del dock según safe-area; se conservan fotografía, selección, títulos compactos y dock global. Contrato actualizado en `scripts/closure-ui.test.mjs`. **Pendiente:** CI SHA exacto y aceptación visual Android. No fusionar ni publicar en producción sin GO.

---

## F17 — Restitución tipográfica precisa de Lugares a partir de comparativa Android (22-oct-2026 · SOLO RAMA)

El PO comparó captura actual vs aspecto original y aclaró que la orden de ampliar textos correspondía **únicamente** al modal de detalles (Cómo llegar, check-in, reglas), NO al lienzo exterior de Lugares. Diagnóstico con GitHub: en el commit histórico `3e74e102` el título del rail era `text-[15px]`, el contador `text-[11px]`, los filtros `text-[11px]`, los nombres de tarjeta `text-[14px]` y la categoría/presencia `text-[10px]`. En la versión reciente se habían sustituido varios por `text-lg` / `text-xs`, que PAZO redefinió globalmente en `src/index.css` a tamaños superiores, agrandándolos sin intención del PO.

**Corrección aplicada** exclusivamente en `ImmersivePlacesStage.tsx`: restituir exactamente los tamaños numéricos anteriores para título, resultados, filtros y metadatos de tarjetas; títulos de establecimiento permanecen en 14px. Quitar cápsula blanca grande del título conservando separación y encabezado fijo, scroll de tarjetas y safe-area del dock. `MapView.tsx` y la tipografía incrementada del diálogo de detalles permanecen intactos. Nueva prueba `closure-ui.test.mjs` fija estos tamaños y evita que vuelvan a heredar `@theme --text-xs/--text-lg`.

**Estado:** solo código/CI de rama F17 PR #81. El fondo del mapa Mapbox vectorial/3D y las seis ilustraciones locales siguen como gate visual independiente; no confundir con esta corrección de tipografía. Nada de `main`, producción, PayPal, Supabase, nuevas APIs, gastos ni alteraciones de permisos. Próximo gate: CI SHA exacto, Preview independiente y aceptación en Android.

---

## F17 — Android QA: modal de experimentos y mapa sin base (22-oct-2026, PR #81; SOLO RAMA)

**Evidencia PO:** fotografías correctas y glTF de uno de los seis lugares visibles, pero cartografía de fondo completamente gris en Preview SHA `85c28e40`; el título «Lugares disponibles» queda cortado tras desplazar el carrusel; control blanco Mapbox se solapa con botón amarillo de ubicación; créditos Wikimedia demasiado grandes. Al desplazarse al final del detalle, «Funciones en desarrollo» aparece a escala desequilibrada y desaparece la cabecera/cierre del modal. **El usuario NO aprobó esta experiencia.**

**Código nuevo:** modal detalle dividido en header/close fijo y scroll exclusivo de cuerpo, manteniendo check-in y fake doors con idénticas acciones/tracking; jerarquía de tipografía del bloque de experimentos reducida y tarjetas ajustadas a 10–13px explícitos. Rail de Lugares ahora separa su encabezado fijo del scroll vertical de tarjetas, con espaciador de 9rem + safe-area al final del contenido para que el dock no cubra la última tarjeta. Créditos visibles sobre las fotos reducidos a 9px; barra de zoom nativa Mapbox retirada únicamente de la vista inmersiva para no superponerse al control de ubicación. El fondo de Mapbox se conserva; un error recuperable de tesela NO desmonta el canvas. `mapFailure` reconoce HTTP 401/403 incluso cuando la librería no expone URL. Tras fallos de los dos estilos vectoriales, mapa OSM de emergencia se identifica con un mensaje claro; esto **NO representa relieve 3D**.

**Estado/mapa:** se han visto imágenes/3D locales sobre un fondo gris; falta distinguir si la causa es restricción URL del token, permiso de estilo o descarga de tiles en el navegador Android. El token público existe en Vercel para Preview y producción; su autorización efectiva por origen NO se confirmó. La solución final requiere respuesta 200 de estilo + mosaicos + DEM y aceptación del PO; un CI verde no prueba el render visual. Ninguna clave rota, proveedor nuevo, gasto, DB, Edge o pago modificado. Revisar restricciones de referer/domain de Mapbox en el panel sin compartir token.

**Gate:** validar SHA final en CI, luego Preview separado (sin tocar producción) y Android real: cartografía 3D, seis modelos por categoría, cabecera y botón de cierre siempre visibles, todas las tarjetas accesibles, créditos legibles y barra flotante sin tapar. No merge ni producción hasta aprobación expresa.

---

## F17 — Captura Android: raster sin relieve, marcadores ausentes y carrusel recortado (22-oct-2026, SOLO RAMA)

Evidencia del PO: Preview SHA `3707e485`, calles exageradas/relieve 3D ausente, modelos originales no visibles, crédito OSM gigante, área de tarjetas excesiva y recortada. Diagnóstico de código: el error de una sola tesela degradaba directamente Mapbox Standard a raster OSM; el fondo de OSM NO es 3D y la capa nativa glTF solo arrancaba desde zoom 13.25, sin anotaciones DOM independientes. Además, el rail de Lugares tenía altura limitada 300px *incluyendo* padding inferior de 7rem, que recortaba títulos y fotos de sus tarjetas.

**Corrección en PR #81:** secuencia Mapbox Standard 3D → segundo estilo vectorial Streets v12 → raster SOLO como emergencia después de problemas del vector; altura de terreno desde la fuente DEM del proveedor existente en estilos vectoriales con `setTerrain`. Se preservan los seis archivos `public/models/places/*.gltf`, su `model-id` por categoría y selección real; capa 3D desde zoom 12.5. Marcadores de categoría locales ligados a los seis lugares son accesibles, pulsables e independientes de `style.load`, para que no desaparezcan cuando fallan las capas o el token de Mapbox. Errores individuales en raster no eliminan todo el mapa. Los modelos nativos tienen precedencia visual a zoom cercano. Se elimina crédito OSM duplicado de tamaño excesivo: la atribución del motor Mapbox continúa activa. Carrusel horizontal compactado, rail de alto natural limitado y margen de dock como espaciador DENTRO del scroll, no restado de su altura visible. Se conserva dock flotante, fotos reales/ilustrativas licenciadas, check-in, foco, ubicación opcional y navegación.

**GATE SIN CERRAR:** Mapbox Standard y Streets dependen de que el token actual permita el dominio del Preview (posible 403 por restricción de referer); no asumir que la corrección visual de código resuelve la autorización de un tercero. Si ambos estilos vectoriales son denegados, no se puede ofrecer relieve 3D con el raster OSM; corregir scopes/restricciones del token desde Mapbox con el PO, sin revelar ni sustituir credenciales ni contratar otro servicio. CI exacto del SHA final, revisión en Android (modelo glTF visible tras tocar lugar + acercar; cartografía realmente 3D; tarjeta completa + scroll final) y GO explícito requeridos. Sin cambios en producción, SQL/Edge, PayPal, `main` ni nuevo presupuesto.

---

## F17 — Dock flotante global, scroll seguro y detalle legible (22-oct-2026, SOLO RAMA)

Aprobado por PO: escalar tipografía exclusivamente dentro del modal de detalles de Lugares (dirección, especies, reglas, check-in y Cómo llegar), sin alterar la escala de títulos/filtros fuera de él. Se conserva portal a document.body para centrado real. El menú inferior es una capa flotante con fondo exterior transparente en TODOS los módulos y cavidad real sobre la burbuja móvil; solo los controles de la barra interceptan toques. App.tsx reserva 7rem + env(safe-area-inset-bottom) al final del scroll no-mapa para que Mi mascota, Comunidades y Feed no oculten acciones. Lugares tiene ahora rail inferior vertical desplazable (además del carrusel horizontal), con la misma reserva al final; la última tarjeta puede subir totalmente sobre el dock y las tarjetas siguen viéndose por detrás durante el desplazamiento. La atribución del mapa y el botón voluntario de ubicación se desplazan bajo los filtros, fuera del carrusel.

Se conserva Mapbox Standard 3D como estilo primario y los modelos PAZO; solamente se suaviza saturación/contraste del respaldo raster OSM cuando Mapbox falla (ese respaldo no es 3D). Para las seis fotos Commons ya licenciadas, el componente prueba la miniatura directa y, si falla, un único enlace Special:FilePath de ESA MISMA foto antes de mostrar el fondo sin imagen; fotos propias reales siempre prevalecen y cinco siguen claramente identificadas como ilustrativas. Sin proveedores pagados, SQL, credenciales, migraciones ni cambios financieros.

**Evidencia:** código y regresiones versionados en PR #81. **PENDIENTE:** CI exacto del último SHA y validación real en Android de scroll final, cavidad, legibilidad, carga de las seis fotos y mapa 3D. No se autoriza despliegue Preview adicional, merge ni producción hasta GO específico del Product Owner.

---

## F17 — Correcciones tras capturas reales del PO, 22-oct-2026 (rama solamente)

Capturas Android mostraron detalle de Lugares limitado al mapa y texto fijo demasiado pequeño; raster OpenStreetMap con carreteras demasiado contrastadas; fotografías de Wikimedia Commons no visibles por miniaturas /640px; y barra inferior con franja sólida entre las tarjetas. Código corregido: portal al body para modal centrado a escala PAZO con cierre Escape; Mapbox Standard 3D suave y fallback raster solo ante fallos; rutas de miniatura Commons /500px con créditos condicionados a que haya imagen; navegación flotante y transparente sobre tarjetas cuando Mapa está activo, preservando la máscara de la burbuja. Sin alterar PayPal ni Supabase.

**GATE:** código y tests en rama F17; CI, carga fotográfica real, estilo 3D en Android y aceptación PO por verificar. No publicado en producción, no nuevo Preview, no merge a main. No certificar funcionalidad visual solo con pruebas estáticas.

---

## F17 — FOTO REAL SIN GOOGLE API, SOLO RAMA, 22-oct-2026

PO descartó Google Places Photos como requisito. Se prepararon seis fotos
fotográficas diferentes con Wikimedia Commons sin costo: Runyon Canyon
corresponde al parque real; las otras cinco son ilustrativas por categoría
y tienen etiqueta “Ilustrativa”. Los créditos de fotógrafo y licencia
son enlaces accesibles en tarjeta, y el campo de backend `photo_url`
prevalece siempre. Nuevo tercero externo Wikimedia declarado en la
política de privacidad ES/EN y el inventario de datos. Se añadió test
`scripts/f17-curated-place-photos.test.mjs`, y documentación
`docs/PAZO_F17_PLACES_PHOTO_SOURCES_20261022.md`.
Sin API pagada, credenciales, migraciones ni cambio PayPal. CI y aceptación
visual en móvil pendientes. **No publicar en Vercel ni merge a main sin GO.**

---

## ACTUALIZACIÓN F17 — Lugares y Feed, 22-oct-2026 (RAMA, NO PRODUCCIÓN)

**Scope aprobado por PO y versionado en PR #81**, revisión de código anterior `a12579c1fd59`: contenedor exterior de búsqueda/filtros transparente, fade lateral en scroll de categorías, botón **Cómo llegar** desde detalle de lugar (iOS Apple Maps; Android/enlace web Google Maps), iconos circulares mayores para like/comentarios/guardado en Feed. Los handlers y métricas existentes se preservan. Foto genérica de carretera eliminada: cada tarjeta solo muestra `pet_places.photo_url` real o indica que todavía no hay foto. **Los 6 lugares alojados tienen `photo_url` vacío**: no declarar fotos de establecimientos ya resueltas.

**Google Places Photos NO activo:** Google Places API/Place IDs de esos establecimientos no están configurados en PAZO; requiere servicio con facturación y atribución/uso compatibles. Prohibido generar cargos, añadir claves cliente, copiar imágenes de Google Maps manualmente o fingir fotos sin autorización adicional del PO. Alternativa con costo fijo controlable: fotos autorizadas por negocio y Storage existente. Regla cero contornos respetada; ningún SQL/Edge/Vercel modificado. La versión publicada en `https://pazo-app.vercel.app/` **no incluye todavía estos cambios**. Validación requerida: CI exacto del último SHA, prueba móvil/Preview aprobada por PO, decisión sobre fotos; NO despliegue ni merge a `main` sin GO.

**Implementación y detalles:** `docs/PAZO_F17_PLACES_FEED_POLISH_20261022.md`. Mantener estado financiero previo en el historial inferior (sin alteraciones de PayPal).

---

# PAZO · PAYPAL LIVE — ESTADO HOSPEDADO AL 22-OCT-2026 (ACTUAL)

> Fuente de verdad vigente. El historial F17 visual debajo es anterior a la reparación de pagos y **no debe usarse** para decidir nuevos cambios financieros.

- **Producto:** https://pazo-app.vercel.app/ , proyecto Vercel `pazo-app` `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, producción **READY** `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA real frontend `1b2340523b80234a41a0a6ffac489bc32f5a2937`. PR #81 **DRAFT**, rama `f17/beta-final-mobile-support-admin-20261022`, main sin merge.
- **Supabase:** `mrybvqdebbgcayuvgkkr`. Instaladas migraciones **`20261022220000`** (origin canónico transaccional) y **`20261022222000`** (A03 onboarding completado tras mascota realmente creada). Ambas pasaron ensayos ROLLBACK y COMMIT, con postflight alojado. No reinstalar.
- **PayPal Live:** la configuración certificada y la única dirección de regreso válida ahora es `https://pazo-app.vercel.app`. El antiguo `pazo-app-t83r.vercel.app` ya no figura en las cinco funciones financieras en PostgreSQL. Artefacto con CHECK estricta y validación actual `true`; precio `299` centavos USD mensual, credenciales Vault válidas e INALTERADAS, webhook sin cambios, control `mode=canary` revisión 1, switch Live TRUE / kill FALSE, **0 intents/0 períodos pagados**. No activar público sin primera venta firmada, confirmación de cancelación y GO del PO.
- **Edge desplegado:** `pazo-paypal-live-account` v6 (JWT), `pazo-paypal-live-checkout` v4 (JWT), `pazo-admin-paypal-release` v2 (JWT); `pazo-admin-paypal-bootstrap` v7 (JWT), `pazo-admin-paypal-live-inspect` v5 (JWT), `pazo-admin-paypal-vault` v3 (JWT). Ajustadas CORS/guards de origen exacto sin wildcard, MFA permanece obligatorio, sin rotar credenciales. Webhook y worker financieros NO redeplegados.
- **Comprobaciones:** HTTP público real de 7 rutas oficiales incluidas `/paypal/return` y `/paypal/cancel` PASS en GitHub run **39856221792**. CI + F17 security PASS para la última implementación de onboarding `5fe2ea56e04be0f7cc8d2b9f6df07e4f4be3c3d3` (runs **39859246850**, **39859246887**); bootstrap preflight **39859246846** PASS. Artefacto certificado + worker activo/heartbeat reciente + canary original operator permitido = TRUE al último check SQL, pero **NO** hubo pago Live real.
- **Onboarding:** antes todos los 5 perfiles tenían `onboarding_completed=false` pese a existir mascotas; 4 perfiles con mascotas reales se reconciliaron a TRUE, el perfil sin mascota quedó FALSE; `public.create_pet_profile` ahora actualiza el propio perfil tras la creación satisfactoria sin modificar RLS/privilegios.
- **Panel Live:** frontend publicado ofrece pantalla limpia de estado/precio/retorno/webhook/MFA/control y herramientas avanzadas separadas. Esta iteración corrigió conexión y visibilidad, no implementó una **rotación completa** de plan/credenciales ni hizo editable un precio de una suscripción existente. PayPal requiere plan nuevo para otro importe; proteger generaciones históricas. No volver a pedir credenciales ya válidas.
- **Siguiente gate REAL:** la cuenta original del operador canary (no cuenta normal) debe iniciar desde la app, aprobar personalmente **una suscripción Live de $2.99** y regresar; el asistente verifica webhook firmado, período pagado, beneficios, conciliación y cancelación. NO fabricar transacciones ni poner `mode=public` hasta cumplir toda la evidencia y GO específico del PO. Una cuenta normal seguirá bloqueada correctamente en canary. No prometer que el flujo PayPal extremo-a-extremo está PASS solo por las pruebas HTTP.
- **Módulos no financieros:** F17 Soporte/cortesías/mantenimiento instalados con RLS; mantenimiento OFF. Mapa y corgi pendientes de aceptación visual final del PO en Android. No modificar main sin aprobación.

---

# PAZO · ACTIVE HANDOFF — 22-oct-2026 · visual F17

> **Source of truth:** remote GitHub branch + actual provider state. This concise live snapshot replaces the former 113 KB chronological handoff, recoverable **verbatim through Git history at commit `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**. Earlier statements about pending SQL or old production domain are historical.

## Identity, authority and controls
- **PO:** user; ChatGPT is primary implementer, per `DigitalAppcorp/project-brain-os` SKILL v1.4.1 and `AGENTS.md`. No Codex or other AI needed.
- **Repo:** `DigitalAppcorp/pazo-app`, base `main` `a99f05d2dab3baf5a4bc26b8fb64d790e7c4be2d`. Active F17 branch `f17/beta-final-mobile-support-admin-20261022`, PR **#81 DRAFT**. Code snapshot preceding this doc: `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Do not merge to main without PO approval.
- **Canonical app URL:** `https://pazo-app.vercel.app/`, Vercel project **`pazo-app`** `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI` (distinct from `pazo-app-t83r`). User-approved F17 beta UI fixes are **published technically**: production `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` READY, exact code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Domain alias was verified to point to that deployment. Prior production `dpl_7rPxM5BzSaz3YJrDDu6NMpY1bfWT` is rollback reference. **Physical Android/Mapbox visual acceptance is still NOT confirmed**.
- **Preview of visual corrections:** `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` READY, code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`, `https://pazo-52wyg1fcj-digitalapp.vercel.app/` (may require Vercel-authenticated browser; MCP bypass permission denied).
- **GitHub CI:** **PASS for production code SHA `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**: `CI` SUCCESS run 39800270518 and `F17 beta isolated backend security` SUCCESS run 39800270447. Prior CI failures were stale tests still demanding intrusive banner/Mapbox vector style; corrected without disabling protections. Newer commits modify only documentation and should not be mistaken for distinct published code. Do not claim physical browser validation from CI.

## Backend F17 hosted — ALREADY INSTALLED, not part of current visual patch
- Supabase `mrybvqdebbgcayuvgkkr`. Migrated with approved reversible preflight + one transactional COMMIT: `20261022103706` private support, `20261022103707` gifted benefits, `20261022103708` maintenance guards. 3 registered migrations, 5 FORCE RLS tables, daily `pazo_support_retention_daily` deletes resolved cases after 90 days. DO NOT reinstall.
- Edge `f16-paypal-supporter-v2-qa` v27 active with JWT verification. No further Edge changes needed for UI-only iteration. Mantenimiento OFF revision 0 last inspected; do not enable. PayPal Live **canary**, revision1, `live_enabled=true`, `kill_switch=false`, 0 Live paid periods last read. Credentials already valid in metadata. Do not request secrets or run a real sale. No changes to financial switch or main.
- Support, gifting and maintenance were code/runtime installed in previous release; do not accidentally invalidate them. Their operational physical QA remains independent from this visual ticket.

## PO screenshots / F17 visual task
Exact requested repairs after physical Android screenshots:
1. Welcome A01 excessive top/bottom gaps and internal scroll clipped corgi card: reduced paddings, hero flexible `min-h-0`, static footer actions; outer app shell now `h-full min-h-0` nested under `100dvh` rather than `h-screen`.
2. Preserve **same** smiling orange-white seated corgi, closed eyes, tongue out, green collar/yellow tag; SVG holds **one complete local WebP scene** (no separately animated head, tail, mouth). **IMPORTANT:** still raster 295×310; not a genuine hi-res redraw/vector; PO quality acceptance remains open. Do not silently replace with generic dog.
3. Removed intrusive Home install banner. Discreet opt-in `PazoInstallControl placement="welcome"` on A01 AND login; device display-mode installation detection; settings control persists.
4. Broken/blank real Mapbox streets: temporary Mapbox GL style using visible OSM raster tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, existing PAZO places/3D-models and camera retained; attribution visible above place cards. **OSMF community tile endpoint only for very small beta**, best-effort/no SLA; must switch provider or resolve Mapbox API token/styles before scale/public ad campaign. Cannot claim real tile visibility on Android until PO screenshot.
5. Removed Comunidades intro subtitle and the overlines `PAZO · COMUNIDAD` / `PAZO · TU COMUNIDAD` from Messages/Notifications.
6. Geometrically centered titles Cuidados de mascota, Pasaporte de mascota, Crear y Compartir with matched 32px spacer/close grid. New regression tests in `scripts/closure-ui.test.mjs` plus aligned `scripts/f17-beta-extension-contract.test.mjs`.

## Evidence and next gate
- Vercel PREVIEW `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` and PRODUCTION `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` were READY for production code SHA `b1cbcd35`. Both are build/runtime deployment evidence, not physical device proof.
- GitHub synthetic/local past: 1,818 general, 16 extra, 40 mocked-browser checks for previous F17 baseline; not proof for this latest visual SHA.
- Policies updated ES/EN and `docs/PAZO_DATA_INVENTORY.md` to disclose OSMF direct tile requests/location-area technical metadata. See `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`.
- **NEXT STEP:** user tests the already-published F17 beta at `https://pazo-app.vercel.app/` on the **actual Android phone**: A01 no scroll/clipping at 640–850px CSS, corgi quality/likeness, discreet PWA install on Welcome/Login and hidden in standalone, **real visible street tiles under pins in Lugares**, center-aligned modal titles and removed text. Evidence is a screenshot or a bug report; PO decides visual acceptance. If streets still gray, inspect real tile requests/token/network, do not invent a PASS. Before **formal beta sign-off or merging main**, obtain PO visual GO; public scale requires a paid/tile provider or Mapbox root-cause repair. Keep PayPal/DB unchanged.
- Local Antigravity working tree/unpushed commits: **unknown**; do not infer clean local state. Avoid duplicate tests and backend changes.

## Activation for new chat
"Activa Project Brain OS v1.4.1; lee `DigitalAppcorp/pazo-app/AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`; revalida PR #81 HEAD/CI, Vercel preview/production alias. Continúa aceptación visual del F17 publicado; no reimplementes SQL ni PayPal ni hagas más despliegues/merge a main sin el siguiente GO."
