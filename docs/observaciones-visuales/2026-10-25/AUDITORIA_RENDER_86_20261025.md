# PAZO — Auditoría renderizada de 86 escenarios, cinco tamaños y dos idiomas

**Fecha:** 25 de octubre de 2026. **Tipo:** evidencia visual QA sintética + análisis de componentes reales de PAZO. **Fuente auditada:** `audit/pazo-visual-lab-20261025@8b988c808e01bcb20dbb9dd54f2c85c19829de9b`. **Producto/producción:** intactos.

## Evidencia y resultado verificados

- [Ejecución final Chromium #40236610159 — SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40236610159). Cinco jobs independientes: 320, 390, 430, 768 y 1440 CSS px, ES/EN.
- **86 escenarios declarados × 5 tamaños × 2 idiomas = 860/860 capturas correctas, 0 fallos y 0 errores JS registrados.** Estas escenas reutilizan componentes y estados: NO son necesariamente las 86 superficies del inventario original 1:1 ni 86 journeys completados.
- **102 capturas adicionales del final de regiones con scroll interno**, además de la primera pantalla. Scroll visual no prueba navegación Tab ni lector de pantalla.
- **0/860 desbordamientos horizontales del documento** medidos por `documentElement.scrollWidth`; no prueba scroll horizontal de todos los componentes ni reflow a zoom elevado.
- **130 intentos de HTTP externo bloqueados por Playwright; 0 operaciones locales mutantes observadas.** El escenario Mapbox sin acceso a tiles es deliberado, no evidencia de caída real.
- **574 apariciones de violaciones axe-core** (reglas repetidas por idioma/tamaño), no 574 defectos únicos: `color-contrast` 442, `button-name` 30, `select-name` 50, `aria-prohibited-attr` 20, `nested-interactive` 10, `label` 20, `scrollable-region-focusable` 2.

### Artifact verificable por viewport

| Viewport | Evidencia en GitHub Actions | Cobertura |
|---|---|---|
| 320×568 | Artifact `12615621497` | 172/172 escenas × idioma |
| 390×844 | Artifact `12615441951` | 172/172 |
| 430×932 | Artifact `12615232534` | 172/172 |
| 768×1024 | Artifact `12615840796` | 172/172 |
| 1440×900 | Artifact `12614917941` | 172/172 |

Todos los artifacts están vinculados a [la ejecución #40236610159](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40236610159). Incluyen `manifest.json`, galería HTML y PNG por caso. Retención configurada de 14 días. Las imágenes originales no se subieron como commits permanentes al repositorio.

## Dictamen crítico de Design Intelligence OS

**Resultado: composición y accesibilidad parcialmente conformes; NO se aprueba una auditoría global.**

1. **S3 · Formularios:** `AddPetModal`, `CreateCommunityModal` y edición contienen selects/inputs sin nombre accesible verificable. Atender semántica antes de pulir fondos/sombras.
2. **S3 · Acciones:** cierre iconográfico en algunos modales y anidación de elementos interactivos. Los estados con dos acciones deben diferenciar su rol y recorrido Tab.
3. **S3 · Rescate:** el CTA coral de publicar alerta se percibe emocionalmente apropiado, pero texto blanco sobre `#EC7357` ronda 2.93:1 en fixture; es una acción de alto impacto y exige revisión de contraste normal y foco.
4. **S2 · Microtipografía y contraste:** numerosos textos secundarios fallan 4.5:1 en los estados medidos. No cambiar la paleta completa: corregir pares foreground/background por contexto.
5. **S2 · Densidad:** creación, cuidados, documentos y administración exigen revisar zonas táctiles y scroll interno. En administración la jerga técnica es legítima; no en copys comerciales.
6. **S2 · Estado y verdad:** no reutilizar mensajes del backend o del PO como copy público. La invitación Amigo de PAZO y la separación de cobro deben mantenerse.
7. **Riesgo no reproducido:** QR/token, mapa cargado, soporte autenticado y operaciones de administración requieren QA aislado más avanzado; NO presentar los estados bloqueados como fallos de producción.

## Registro de observaciones por escenario

Las filas documentan lo **renderizado en un componente real con datos de laboratorio**. La observación es un criterio de revisión (no una prueba de uso individual). Para capturas por fila abrir la galería del artifact del viewport y buscar el identificador estable, p. ej. `create-community-390-es.png`.

### acceso

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `welcome` | component | Título/nota del hero: contraste a revisar (axe); ilustración propia coherente. |
| `signup` | component | Contraste de ayuda/condiciones, foco y mensaje de validación. |
| `pet-onboarding` | component | Foto vía teclado y nombres accesibles; labels persistentes. |
| `interests` | component | Prioridad y contraste de instrucciones; chips de selección. |
| `password-expired` | synthetic | El enlace caducado ofrece salida; validar aviso para lector. |
| `password-ready` | synthetic | Form bien ordenado; probar error y validación sin enviar datos. |

### social

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `feed-one` | synthetic | Solo componente aislado: no juzgar espacio vacío como Feed completo. |
| `feed-empty` | synthetic | Salida y acción siguiente visibles en estado sin posts. |
| `communities-empty` | component | Es estado sin sesión, no comunidad poblada. |
| `search-disabled` | component | Validar nombre del input y acceso no autenticado. |
| `feed-three` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-long` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-liked` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-saved` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-comments` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-recommended` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-deleted-author` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `feed-nearby` | synthetic | Evaluar densidad, truncación, estados de interacción y foco (fixture sintético). |
| `communities-populated` | synthetic | Nombres de comunidades truncados y abrir/unirse como acciones diferentes. |
| `community-feature` | synthetic | Fake door honesta; no ejecutar votos en QA. |
| `search-active` | synthetic | Estado sin resultados; buscar y cerrar accesibles. |
| `search-filter-people` | synthetic | Estado sin resultados; buscar y cerrar accesibles. |

### mascota

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `pet-summary` | synthetic | Foto sintética vacía causa imagen rota en QA; no extrapolar. |
| `add-pet` | synthetic | Selectores sin nombre; siete campos sospechosos en heurística. |
| `pet-two` | synthetic | Conservar diferencia entre perfil privado y social; revisar campos y menú. |
| `pet-lost` | synthetic | Conservar diferencia entre perfil privado y social; revisar campos y menú. |
| `pet-posts` | synthetic | Conservar diferencia entre perfil privado y social; revisar campos y menú. |
| `pet-settings` | synthetic | Menú alto con subgrupos; verificar foco, jerarquía y salida. |
| `pet-edit` | synthetic | Varios campos sin nombre accesible; maquetación estrecha al 320. |
| `pet-picker` | synthetic | Cambiar mascota con caret; probar botón accesible con nombre completo. |

### creacion

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `create-menu` | synthetic | Cierre por icono sin nombre accesible (axe: button-name). |
| `create-post` | synthetic | Cierre, campos, scroll del modal y estados de publicación. |
| `create-community` | synthetic | Selectores de categoría/especie sin nombre accesible (axe). |

### servicios

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `care-empty` | synthetic | Revisar contraste de instrucciones y CTA de alta. |
| `documents-empty` | synthetic | Mantener carga documental privada y botón real de subida. |
| `care-loading` | synthetic | Estado/fecha/CTA relevantes; scroll y feedback por validar con teclado. |
| `care-error` | synthetic | Estado/fecha/CTA relevantes; scroll y feedback por validar con teclado. |
| `care-active` | synthetic | Estado/fecha/CTA relevantes; scroll y feedback por validar con teclado. |
| `care-history` | synthetic | Fecha y tarea realizadas deben distinguirse de pendientes. |
| `care-create` | synthetic | Formulario de alta se desplaza internamente; chequear campo fecha/foco. |
| `documents-loading` | synthetic | Privacidad, etiquetas y recuperación de estado de archivos. |
| `documents-error` | synthetic | Privacidad, etiquetas y recuperación de estado de archivos. |
| `documents-single` | synthetic | Privacidad, etiquetas y recuperación de estado de archivos. |
| `documents-many` | synthetic | Muchos CTA Ver/Editar/Eliminar: riesgo de objetivos densos. |
| `documents-uploading` | synthetic | Privacidad, etiquetas y recuperación de estado de archivos. |

### lugares

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `map-unavailable` | blocked | Solo fallo de tiles/mapa; no sirve para evaluar Mapbox cargado. |
| `map-auth-blocked` | blocked | Estado de red bloqueada: NO evaluación de mapa real. |
| `map-suggest` | synthetic | Revisar jerarquía, estado, hitbox y texto contextual; no extrapolar del fixture. |
| `place-feature-choice` | synthetic | Revisar jerarquía, estado, hitbox y texto contextual; no extrapolar del fixture. |
| `place-feature-door` | synthetic | Fake door honesta; no ejecutar votos en QA. |

### navegacion

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `nav` | synthetic | Iconos de tabs sin rótulo visible inactivo; reconocimiento por probar. |
| `nav-communities` | synthetic | Barra flotante aprobada: nombre/foco y posición de cada tab. |
| `nav-map` | synthetic | Barra flotante aprobada: nombre/foco y posición de cada tab. |
| `nav-pet` | synthetic | Barra flotante aprobada: nombre/foco y posición de cada tab. |

### membresia

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `invitation` | component | Conservar brote/huella y CTA voluntario; preview no equivale a pago. |
| `wall-empty` | synthetic | Vacío honesto con ilustración, sin inventar miembros. |
| `offer-layout` | synthetic | Checkout expresamente deshabilitado: solo jerarquía de oferta. |
| `benefits-no-pet` | synthetic | Vista con QA simulado; no implica beneficio verificado. |
| `benefits-pet` | synthetic | Vista con QA simulado; no implica beneficio verificado. |
| `wall-error` | synthetic | Consentimiento y estado sin datos: no inventar mascotas. |

### rescate

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `lost-review` | synthetic | Texto blanco sobre coral ~2.93:1 en CTA de publicar alerta. |
| `lost-active` | synthetic | Prioridad de información crítica, texto pequeño de compartir. |
| `lost-review-long` | synthetic | Texto extenso puede empujar CTA abajo; revisar scroll y confirmación. |
| `lost-active-error` | synthetic | Revisar jerarquía, estado, hitbox y texto contextual; no extrapolar del fixture. |
| `public-rescue-unavailable` | blocked | Revisar jerarquía, estado, hitbox y texto contextual; no extrapolar del fixture. |
| `passport-unavailable` | blocked | Revisar jerarquía, estado, hitbox y texto contextual; no extrapolar del fixture. |
| `sighting-unavailable` | blocked | Revisar jerarquía, estado, hitbox y texto contextual; no extrapolar del fixture. |

### legal

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `legal-privacy` | component | Contenido largo requiere scroll/foco comprobados manualmente. |
| `legal-terms` | component | Desplazamiento interno y foco; no resumir disposiciones contractuales. |

### moderacion

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `report-post` | synthetic | Motivo/texto legibles; no ejecutar denuncia en QA. |
| `report-comment` | synthetic | Denuncia no enviada; motivo y foco a verificar. |

### notificaciones

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `notifications-empty` | synthetic | Prioridad, leído/no leído y filtros por tipo. |
| `notifications-unread` | synthetic | Prioridad, leído/no leído y filtros por tipo. |
| `notifications-mixed` | synthetic | Prioridad, leído/no leído y filtros por tipo. |
| `notifications-community` | synthetic | Fixture categoría 'comunidad' bajo filtro 'Avistamientos': revisar semántica. |

### mensajes

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `messages-empty` | synthetic | Placeholder o conversación ficticia; no implica servicio disponible. |
| `messages-inbox` | synthetic | Conversaciones de prueba, sin afirmaciones de mensajería activa. |
| `messages-request` | synthetic | Placeholder o conversación ficticia; no implica servicio disponible. |

### administracion

| Escenario | Tipo de evidencia | Observación y siguiente comprobación |
|---|---|---|
| `admin-summary` | synthetic | Datos de prueba; comprobar escaneo y navegación móvil/escritorio. |
| `admin-users` | synthetic | Datos de prueba; comprobar escaneo y navegación móvil/escritorio. |
| `admin-pets` | synthetic | Datos de prueba; comprobar escaneo y navegación móvil/escritorio. |
| `admin-finance` | synthetic | Separación Live/Sandbox esencial; números son ficción QA. |
| `admin-ideas` | synthetic | Datos de prueba; comprobar escaneo y navegación móvil/escritorio. |
| `admin-infra` | synthetic | Datos de prueba; comprobar escaneo y navegación móvil/escritorio. |
| `admin-maintenance` | blocked | Datos de prueba; comprobar escaneo y navegación móvil/escritorio. |
| `admin-paypal` | blocked | Copy técnico válido solo para admin; controles no operativos en QA. |

## Límites que impiden proclamar ‘86 pantallas de producción auditadas’

- Muchas filas son **variaciones de estado del mismo componente**; otras son pantallas sin sesión, con mocks de lectura o errores de red deliberados. Se compararon React/CSS y fixtures, no sesiones privadas de personas reales.
- La medición axe no sustituye lectores de pantalla, navegación por teclado completa, accesibilidad de menú/modal, zoom 200%, transferencias de foco o pruebas de usuario.
- El shell del Feed está aislado en algunas escenas; Mapbox estándar con mosaicos reales, pagos, historial financiero Live y eventos con datos reales están fuera de esta ejecución.
- Revisión del inventario original y asociación 1:1 con las 86 superficies: [PR #107 — inventario](https://github.com/DigitalAppcorp/pazo-app/pull/107). No alterar artificialmente esa lista para alcanzar una cifra de capturas.

## Integridad y siguiente gate

**Cambios al producto: cero.** Este PR aporta herramientas QA y documentación; PR #106 de recomposición sigue separado. Las correcciones deben nacer de hallazgos reproducidos y evidencias comparables, bajo autorización específica del PO. No habilitar despliegues, PayPal Live o bases reales para realizar capturas.
