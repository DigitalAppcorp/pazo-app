# 03 — Hallazgos de calidad priorizados (no complacientes)

**Fuente:** `main@a01b56861cc7d7e016efb9a5d109987c4ceeb33a`. Las rutas y líneas apuntan a esa instantánea o se identifican por patrón, no a la rama experimental. `C` = CODE_INSPECTED; `V` = VISUAL_FIXTURE; `M` = CALCULATED_FROM_CSS; `H` = hipótesis NEEDS_RUNTIME. Ningún ítem implica cambio autorizado.

**Severidad:** S3 alto (acceso/tarea primaria), S2 medio (calidad o flujo acotado), S1 bajo (pulido). Se distinguen explícitamente **severidad / estado / confianza / test de ejecución**, aunque aquí se agrupan en el encabezado por legibilidad.

## P0 — corregir antes de certificar interfaces; máxima prioridad funcional

### UX-001 · Cascada CSS impide composición local
- **S3 · C · CODE_CONFIRMED · Confianza alta en fuente / efecto visual por pantalla pendiente · test NOT_TESTED.**
- **Evidencia:** `src/index.css:45-49` contiene `h1,h2,h3,h4,h5,h6,p,label {margin:2px!important}`; `OnboardingView.tsx`, `HomeView.tsx`, `PetView.tsx`, etc. usan `mt-*`, `mx-auto` y otras utilidades.
- **Consecuencia:** el override con `!important` puede vencer márgenes de utilidades locales, desplazar elementos y borrar jerarquía; una tarjeta «mal diseñada» puede ser un layout aprobado roto por CSS compartido.
- **Recomendación:** no sustituir con otro margin global fijo. Controlar ritmo por estructura y componentes; revisar primero y después **todas** las vistas que utilizan margenes. **PR #106 ya propone este arreglo, pero no está en main.**
- **Aceptación:** diff CSS comprobado, capturas comparables ES/EN en 320/390/430/768/1440, cero regresiones de títulos, centrados, safe-area, modales y formularios.

### UX-002 · Bienvenida: contraste insuficiente por color declarado
- **S3 · C+M · CODE_CONFIRMED para pares de color; FAIL teórico de pares declarados / render completo NOT_TESTED · Alta.**
- **Evidencia:** `OnboardingView.tsx:190-231`; fondo `#A2BB78`, `#9BB670`, `#A5BC72`, textos claro `#FFFFFF`/`#FFFAEB`. Contraste calculado de muestras de stops: título blanco **2.09–2.25:1**, párrafo crema **2.00–2.16:1**; mínimos WCAG 1.4.3 AA: 3:1 grande, 4.5:1 normal.
- **Consecuencia:** legibilidad deficiente si esos pares se muestran efectivamente así; el color de texto en zona exacta del gradiente debe verificarse en navegador.
- **Recomendación:** preservar dibujo y verde oliva, aumentar contraste del texto. **PR #106** propone `#183D3A` con **5.27–5.68:1** teórico contra los mismos 3 stops; no proclamar «AA certificado» hasta muestreo renderizado.
- **Aceptación:** capturas/DOM de texto renderizado y fondo real en las zonas más desfavorables, estados/zoom y tamaños del heading/documento.

### UX-003 · Galería de mascota inaccesible con Tab — flujo inicial
- **S3 · C · CODE_CONFIRMED · Alta / teclado NOT_TESTED.**
- **Evidencia:** `OnboardingView.tsx:446-455`: `<label>` de «Cambiar fotografía» que contiene `<input type="file" className="hidden">`; no hay botón de activación por teclado equivalente identificado.
- **Problema:** `display:none` retira al input del recorrido Tab. Un label no es botón navegable por defecto.
- **Aceptación:** control con nombre accesible, foco visible sin contorno decorativo, Enter/Espacio abre selector, cambio/anulación y fallo de formato anunciado.

### UX-004 · Galería de mascota inaccesible con Tab — alta adicional
- **S3 · C · CODE_CONFIRMED · Alta / teclado NOT_TESTED.**
- **Evidencia:** `AddPetModal.tsx:158-171` usa label contenedor + input file `hidden`, sin botón equivalente; modal carece además de `role=dialog` explícito.
- **Aceptación:** mismo control accesible de foto reutilizable; modal con título, foco/Tab/Escape/retorno y datos no perdidos inadvertidamente.

### UX-005 · Galería de mascota inaccesible con Tab — edición de perfil
- **S3 · C · CODE_CONFIRMED · Alta / teclado NOT_TESTED.**
- **Evidencia:** `PetView.tsx:440-455`: overlay para cambiar foto sólo aparece en hover; input `hidden`.
- **Aceptación:** acceso por teclado/táctil, acción visible también sin hover, etiqueta semántica, preview y estados.

### UX-006 · Formularios: etiquetas visuales no asociadas y placeholder como única etiqueta
- **S3 · C · CODE_CONFIRMED en ejemplos · Alta / AT NOT_TESTED.**
- **Evidencia:** `OnboardingView.tsx:463-474,507-513` etiqueta Nombre/Edad adyacente sin `htmlFor`; `PetView.tsx:465-551` varias labels sin asociación; `AddPetModal.tsx:175-235` casi todos inputs con placeholder y sin nombre explícito; `CareModal.tsx:312-444`, `CreateCommunityModal.tsx:128-218`, `SuggestPlaceModal.tsx:116-210` muestran patrón de labels hermanos.
- **Problema:** el texto visual no garantiza nombre accesible del control; al escribir desaparece el placeholder. No basta con «hay label cerca».
- **Aceptación:** `id/htmlFor` o `label` envolvente real; verificar árbol de accesibilidad y lectura con VoiceOver/TalkBack/NVDA sobre cada formulario.

### UX-007 · Comunidades: botón interactivo dentro de otro control interactivo
- **S3 · C · CODE_CONFIRMED de estructura, H del disparo doble · Confianza alta/medio · runtime NOT_TESTED.**
- **Evidencia:** `CommunitiesView.tsx:176-245`: card `<div role="button" tabIndex=0 onKeyDown(Enter/Space)>...` contiene un `<button>` real «Unirme». El click detiene propagación; el keydown del hijo puede propagarse al padre.
- **Problema:** acción de membresía puede abrir detalle cuando se acciona con teclado. Incluso si el clic funciona, estructura anidada crea ambigüedad de foco.
- **Aceptación:** navegación y unirse son controles hermanos, Enter/Espacio en uno ejecuta solo ese; prueba con lector de pantalla/teclado.

### UX-008 · Diálogos de tareas principales no comparten contrato de accesibilidad
- **S3 · C · CODE_CONFIRMED de ausencia de rol; alcance por diálogo NEEDS_RUNTIME · Media.**
- **Evidencia:** `AddPetModal.tsx`, `CreatePostModal.tsx`, `CreateCommunityModal.tsx`, `CreateModal.tsx`, `CareModal.tsx`, `DocumentsModal.tsx`, `PassportModal.tsx`, `SuggestPlaceModal.tsx`, `SightingDetailModal.tsx` son superficies superpuestas, sin `role="dialog"` visible en componente.
- **Matiz:** podría existir control externo, pero la revisión de `App.tsx:2137-2274` muestra render directo para varios. No asumir que la ausencia de rol prueba falla de cada tecla.
- **Aceptación:** patrón dialog único: nombre, foco inicial, Tab confinado si modal, Escape cuando no sea peligroso, retorno de foco, scroll retenido y lectura con AT. Priorizar creación, documentos, cuidados y alerta perdida.

### UX-009 · Mi mascota perdida: tareas críticas deben tener feedback y protección frente a cierre accidental
- **S3 (riesgo de alto impacto) · C+H · NECESITA PRUEBA REAL · Media.**
- **Evidencia:** `AlertModal.tsx:150-176` utiliza `alert()` con `error.message`; `ActiveLostAlertPanel.tsx` tiene acciones de compartir y enlaces. Se desconoce en sesión el resultado para offline, falta de permiso, captura fallida o cierre de modal.
- **Aceptación:** prueba con mascota perdida real de QA no productiva, sin avisos públicos; estados activación/levantamiento, recuperación y mensajes confiables; nunca eliminar o cerrar un reporte solo por efecto de presentación.

## P1 — recomposición editorial, navegación y experiencias recurrentes

### UX-010 · Escala tipográfica mezclada y microtexto innecesario
- **S2 · C · CODE_CONFIRMED · Alta.**
- **Evidencia:** `src/index.css:8-25` redefine `text-xs = 15px` y `text-sm = 17px` aprox.; `HomeView.tsx:262,270` usa 9.5/8.5px; `ImmersivePlacesStage.tsx:229-236` 10px; `SuggestPlaceModal.tsx:170` nota a 9px; `PazoInstallControl.tsx:66-85` 10/11px; `ActiveLostAlertPanel.tsx:66-101` notas 10px.
- **Problema:** sin escala semántica por nivel, componentes del mismo rango de importancia lucen incoherentes. No afirmar que WCAG fija 12px; evaluar lectura y reflow.
- **Aceptación:** escala por roles (título, sección, campo, metadatos), variantes móvil/desktop, longitud ES/EN, 200% zoom y snapshot de regresión. **PR #106** solo ajusta filtros del Feed.

### UX-011 · Barra inferior: iconografía obligada a comunicar sin etiqueta visible
- **S2 · C+H · NEEDS_RUNTIME, confianza media.**
- **Evidencia:** `BottomNav.tsx:44-61` establece `opacity-0` en etiquetas inactivas (visibles con foco); 5 accesos, área por botón, indicador animado.
- **Riesgo:** descubribilidad de Comunidades/Mapa/Mi mascota; no es ausencia de `aria-label` (sí existe).
- **Aceptación:** tarea de reconocimiento sin instrucción previa, teclado/touch; comparar etiqueta visible o microetiqueta equilibrada sin destruir la barra aprobada.

### UX-012 · Global focus style: un mismo indicador no sirve a todas las superficies
- **S2 · C+H · CODE_CONFIRMED / contraste y foco runtime pendientes · Media.**
- **Evidencia:** `index.css:435-451`: `:focus-visible` global remueve outline/shadow, impone amarillo/verde con `!important` a enlaces/botones y fondo crema en inputs.
- **Problema:** «cero contornos» no equivale a «un solo foco amarillo es adecuado en todas las vistas»; sobre fondos lima/translúcidos/OS dark hay riesgo de indicador poco perceptible y conflicto con estados de selección.
- **Aceptación:** focos visibles en todos los contrastes/contextos, zoom, teclado; adaptar indicadores a componente mediante relleno, cambio de elevación o subrayado, nunca imponer contorno decorativo.

### UX-013 · Feed: campo de comentarios sin etiqueta accesible
- **S2 · C · CODE_CONFIRMED · Alta.**
- **Evidencia:** `HomeView.tsx:630-636`: input con placeholder «Anadir un comentario…», sin `aria-label` ni `label`; acción Enviar cercana.
- **Aceptación:** nombre computado específico de post o genérico inequívoco, mantener envío Enter y aviso de guardado/error, revisar autocorrección ES.

### UX-014 · Menús `role=menu` sin contrato completo de teclado
- **S2 · C+H · NEEDS_RUNTIME · Media.**
- **Evidencia:** `HomeView.tsx:495-536`, `PublicProfileView.tsx:263-295`, menús en post. El menú del Feed se abre y cierra con Escape/click afuera; no se aprecia patrón completo de foco/arrows/home/end.
- **Matiz:** para solo dos acciones podría convenir un popover normal con botones en vez de `role=menu`. No es argumento para colocar bordes.
- **Aceptación:** Tab/Enter/Escape, foco que no se pierde, nombre/estado; patrón WAI-ARIA coherente o controles convencionales.

### UX-015 · Detalle de lugares: foco parcial
- **S2–S3 según reproducción · C+H · CODE_CONFIRMED que usa autoFocus, NEEDS_RUNTIME de trampa/retorno · Media.**
- **Evidencia:** `MapView.tsx:429-475`: `role=dialog aria-modal`, `autoFocus` en cerrar; Escape existe en el componente. No se identifica en el detalle un ciclo completo de foco ni retorno al marcador/tarjeta original.
- **Aceptación:** al abrir, foco en título/cerrar; Tab permanece en detalle, cerrar/escape restaura a tarjeta/pin, gestos mapa no atrapan teclado.

### UX-016 · Cabecera: cinco acciones comprimidas en 320px
- **S2 · C+H · NEEDS_RUNTIME · Media.**
- **Evidencia:** `HeaderBar.tsx:23-64`: logo, ES/EN, búsqueda, mensajes y avisos, iconos con hitbox 40px; `App.tsx:1704-1707` marco máximo 430px.
- **Riesgo:** saturación horizontal, badges superpuestos y truncación a 320; no decidir eliminación de funciones sin captar uso.
- **Aceptación:** 320/390/430 con números de 2 dígitos en badges, ES/EN, lector y zoom; distinguir 40px reales de criterio WCAG 24px.

### UX-017 · Textos secundarios del mapa, check-in y atribuciones
- **S2 · C+H · NEEDS_RUNTIME · Media.**
- **Evidencia:** `ImmersivePlacesStage.tsx:166-245`, textos de 10–11px, fotografías y atribución, filtros horizontales.
- **Riesgo:** información de lugar y foto se vuelve ilegible o compite con gestos. Se conserva Mapbox estándar y se revisa sobre mapa cargado/vacío.
- **Aceptación:** 320/390, scroll lateral no bloquea mapa, iconos/CTA/comprobación de rutas, créditos legibles y no engañosos.

### UX-018 · Ofertas y membresía: filtración de ingeniería en copy público
- **S2 · C+V · VISUAL_CONFIRMED en oferta F18 · Alta.**
- **Evidencia:** `SupporterLiveCheckoutPanel.tsx:126-130` comunica cambio del «dominio de regreso de PayPal»; `:160-163` «Solo un pago confirmado y verificado…»; visible también en `docs/review/f18/offer-es.png`.
- **No confundir:** el precio, renovación, consentimiento y errores reales **sí** pertenecen al UX legal de pago. El asunto es cuándo y a quién corresponde explicar la arquitectura interna.
- **Aceptación:** pitch limpio, términos claros, estado pendiente informado donde ocurre, no mostrar endpoint/webhook/dominio a usuario no técnico; ausencia de cobros duplicados debe garantizar backend real, no copy tranquilizador.

### UX-019 · Comunidades: rutas privadas de Storage expuestas en errores públicos
- **S2 · C · CODE_CONFIRMED · Alta.**
- **Evidencia:** `CommunityDetailView.tsx:230-237,358-361,620-625`: mensajes al usuario concatenan `COMMUNITY_MEDIA_BUCKET/error.storagePath` y muestran ruta pública de revisión.
- **Riesgo:** texto intimidante para usuario no técnico, posible revelación innecesaria de rutas (riesgo de privacidad específico requiere inspección de path real); `alert()` interrumpe.
- **Aceptación:** mensaje orientado a revisión/no reintentar/contactar soporte con ID apto, detalles técnicos solo en admin/log seguro; conserva información de «pendiente» para prevenir duplicados.

### UX-020 · Errores crudos en varios flujos
- **S2 · C · CODE_CONFIRMED · Alta.**
- **Evidencia:** `AddPetModal.tsx:122-125`, `PetView.tsx:245-247`, `AlertModal.tsx:150-177`, `PublicRescueView.tsx:91` y otros concatenan `error.message` directamente a `alert()`.
- **Problema:** inconsistencia de tono, jerga accidental, riesgo de mensajes sensibles y recuperación deficiente. No ocultar causas a soporte técnico; clasificar mensajes por audiencia.
- **Aceptación:** UX error codes del dominio, título corto + qué pasó + qué puede hacer, `role=alert` / UI inline según prioridad; logging seguro no público.

### UX-021 · Panel de administración: navegación densa y mezcla de estados
- **S2 · C+V · VISUAL_FIXTURE en PayPal/admin · Alta respecto a captura, media sobre administración global.**
- **Evidencia:** `AdminDashboard.tsx:14-31,160-226` muchas secciones; `docs/review/f18/admin-controls-320-es.png` muestra tarjetas y bloques verticales densos; `admin-summary-1440-es.png` contiene extensa parrilla de cifras y acciones.
- **Matiz crítico:** jerga técnica legítima para administradores; la separación Sandbox/Live está explícita en `AdminDashboard.tsx:255-258,347,549`. No pedir simplificación que oculte incidencia real o MFA.
- **Aceptación:** primer contacto muestra resumen/urgencias, secciones agrupadas por objetivo, responsive y filtros accesibles, ningún botón operativo ambiguo; distinguir fixture de producción real.

### UX-022 · Búsqueda global y formularios contextuales: names no consistentes
- **S2 · C · CODE_CONFIRMED de patrones / AT pendiente · Media.**
- **Evidencia:** `GlobalSearchView.tsx:252-263` autofocus y placeholder, sin etiqueta claramente enlazada en input; `SupportRequestDialog.tsx:116-125` labels visuales adyacentes; `AdminSupportInbox.tsx:72-81` labels hermanos.
- **Aceptación:** nombres accesibles en entradas con `htmlFor`, `aria-label` o label envolvente, foco, mensajes de búsqueda vacía/reintento y filtro.

### UX-023 · Inconsistencia de idioma en ruta QR pública
- **S2 · C · CODE_CONFIRMED · Alta.**
- **Evidencia:** `PublicRescueView.tsx:91,103-175`: varias cadenas fijas solo en español («Pasaporte QR», «Tu nombre», etc.) mientras PAZO expone ES/EN. El QR público puede abrirse sin sesión con idioma del visitante.
- **Aceptación:** locale detectado/controlable, nombres/contactos y errores ES/EN, no traducir de forma automática datos reales del reporte, comprobar fallback.

## P2 — pulido medido, sin impulsar rediseños por gusto

### UX-024 · Amigo de PAZO G: excelente eje de intención, pero secundarios microtipográficos
- **S1–S2 · C+V · VISUAL_CONFIRMED · Alta.**
- **Evidencia:** `SupporterInvitationPrompt.css:26-35,77-88,143-149` marca 9px, eyebrow 10px, optout 11px, título line-height 1.08; visible `growth-390-es.png` y `growth-1440-es.png`.
- **Aceptar lo bueno:** ilustración del brote en huella, centro compositivo, precio transparente y CTA «Conocer» → oferta, dos salidas honestas. No «modernizar» con cards/hero genéricos.
- **Aceptación:** tipografía secundaria legible sin perder equilibrio; a 320px el opt-out puede requerir scroll, validar accesibilidad. PR #106 propone ajuste acotado.

### UX-025 · Detalle de foto real en Lugares debe evitar falsas equivalencias
- **S1 / control de integridad · C · CODE_INSPECTED parcial · Media.**
- **Evidencia:** `places/components/PlaceCardPhoto.tsx`, `places/curatedPlacePhotography.ts`; distinción entre foto real y categoría. Evitar imagen Unsplash genérica presentada como el establecimiento.
- **Aceptación:** fuente/licencia/crédito correcto, imagen exacta o ilustración genérica explícita, fallback que no inventa identidad.

### UX-026 · Alertas/datos sensibles: microtexto compite con urgencia
- **S2 · C+H · NEEDS_RUNTIME · Media.**
- **Evidencia:** `ActiveLostAlertPanel.tsx:55-101` usa 10–11px para información y opciones de compartir; `LostAlertReview.tsx:42-50` añade mini-textos.
- **Aceptación:** antes de confirmar un aviso, detalles/fecha/ubicación legibles a zoom; priorizar acción sobre decoración, no forzar un CTA visual verde si implica riesgo urgente.

### UX-027 · Descripciones de foto/lectores de pantalla y badges
- **S2 · C+H · NEEDS_RUNTIME · Media.**
- **Evidencia:** `HomeView.tsx:460,606` badges en `span` con `pointer-events-none` y aria-label en contenido no enfocable; `PublicProfileView.tsx:335-352` idem. El nombre puede o no anunciarse dependiendo árbol semántico final.
- **Aceptación:** comprobar lectura y redundancia; insignia verificada o estado perdido no deben transmitirse solo por color/gráfico.

### UX-028 · Documentación/desarrollo: decisiones viejas se interpretan como vigentes
- **S2 · C documental · CODE_CONFIRMED · Alta.**
- **Evidencia:** `AGENTS.md` arranca con «F18 sin merge»; PR #104/#105 figuran ya fusionados en GitHub; `PAZO_F13_VISUAL_CHANGESET_20261012.md` incluye «mapa congelado» y una autorización posterior de mapa inmersivo.
- **Riesgo:** agente cambia diseño equivocado al obedecer un contexto obsoleto; no es un defecto visual directo del usuario.
- **Aceptación:** registrar contrato de intención vigente y superseded con SHA de verdad; no borrar historial ni crear nueva norma universal basada en gusto PAZO.

## Riesgos de verificación (no se declaran fallos observados)
- `PublicProfileView` en perfil sin bio/foto, dueño vs externo, insignia vs cuenta sin membresía: necesidad de capturas con fixtures; no datos inventados.
- `MessagesModal` rama placeholder vs mensajería disponible: ver condiciones de ruta antes de recomendar eliminar textos.
- `DocumentsModal` botón de subir archivo es **teclado-accesible por diseño** (input hidden activado por `<button>` real). No clasificar TODOS los file inputs `hidden` como fallidos sin analizar botón activador.
- `ModeratorQueue`, `AdminDashboard`, `ReportDialog` y `SupportRequestDialog` implementan al menos parte de trampa/retorno de foco; no equipararlos a AddPetModal sin comprobar.
- El texto técnico del panel PayPal **es legítimo para su audiencia administradora**: no aplicar filtración de copy indiscriminadamente.
- La captura `admin-summary-1440-es.png` usa «Fixture MFA» y números ficticios de evaluación: **NO afirmar** que PAZO tiene 2 miembros de pago ni 4 pagos reales a partir del fixture.

## Contrato final para cada corrección posterior
`ID | problema | evidencia base | escenario/usuario | decisión aprobada a preservar | delta mínimo | criterio WCAG/UX | aceptación en desktop/móvil ES/EN | prueba PASS/FAIL/NOT_TESTED | aprobación PO`. Hasta tener un nuevo GO, todas las soluciones aquí son **propuestas**.
