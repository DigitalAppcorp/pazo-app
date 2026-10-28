# Design Intelligence OS — Matriz visual completa de PAZO (fase 2)

**25 oct 2026 · Auditoría de interfaces renderizadas · READ_ONLY del producto · Solo cambios documentales/QA en [PR #108](https://github.com/DigitalAppcorp/pazo-app/pull/108).**

## Evidencia trazable

- **Código auditado:** rama `audit/pazo-visual-lab-20261025`, SHA exacta `a7bd7875f5b6ff933fb60cf2864b8f8e1207287c` (capturado con `pull_request.head.sha`, no el merge sintético). El laboratorio altera componentes **solamente en su harness de pruebas**, no en la aplicación.
- **Ejecución real:** [PAZO Visual Lab #40232632578](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40232632578), **SUCCESS**; [CI #40232632494](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40232632494) **SUCCESS**; [F18 isolated #40232632492](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40232632492) **SUCCESS**.
- **Artifact:** `pazo-visual-lab-40232632578-1`, ID `12613980977`, [GitHub Actions](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40232632578), ZIP con 260 PNG, `manifest.json`, `index.html` de galería, evidencias por escena. **Retención 14 días; descargar y archivar antes de caducar.** Este documento y las ubicaciones de los casos permanecen en GitHub aun si caduca el artifact.
- **Entorno reproducido:** Chromium 141 vía Playwright 1.56.1, axe-core 4.10.3, Vite/React en loopback, `serviceWorkers=block`, movimiento reducido, ES/EN, zona de prueba America/Los_Angeles, datos sintéticos. **NO se ejecutaron pagos, mutations, credenciales reales ni consultas a una base alojada.**
- **Viewports medidos:** 320×568, 390×844, 430×932, 768×1024 y 1440×900 CSS px. 26 escenas × 5 tamaños × 2 idiomas = **260 representaciones**; **260/260 CAPTURED, 0 CAPTURE_FAILED**.

## Resultados técnicos con interpretación correcta

| Prueba / unidad | Observado | Estado de prueba | Qué NO demuestra |
|---|---:|---|---|
| Capturas de escena/viewport/idioma | **260/260** | **PASS** de captura | No significa 260 journeys completos o pantallas distintas |
| Desbordamiento horizontal de `documentElement` | **0/260** | **PASS** limitado a este selector | No prueba scroll de componentes internos ni zoom a 200% |
| Errores JS registrados en `pageerror` | **0/260** | PASS en escenas renderizadas | No prueba que todos los datos cargaron correctamente |
| HTTP(S) externo intentado | **10 intentos**, todos bloqueados por interceptor (`map-unavailable`) | PASS de política de bloqueo, no «0 solicitudes intentadas» | No prueba mapa estándar Mapbox con tiles o GPS |
| Métodos locales mutantes interceptados | **0/260** | PASS en escenarios ejecutados | No certifica ausencia de rutas GET con side effects en producción |
| Hallazgos axe-core *por ocurrencia de escena* | **170** | FAIL automático de 4 reglas, agrupado abajo | No son 170 bugs únicos |
| Navegación Tab, lector de pantalla, foco de diálogos y scroll interno | **No ejecutadas** | **NOT_TESTED** | No declarar accesibilidad WCAG global |
| Cobertura del inventario visual general | **26 escenas** de **86 superficies inventariadas** | **PARCIAL**, 60 superficies sin escena propia | Algunas escenas comparten sub-vista; no equiparar 26/86 a porcentaje de usabilidad |

### Deduplicación por regla automática

| Regla axe (WCAG relevante) | Apariciones (ES/EN × 5 tamaños) | Superficies afectadas | Interpretación |
|---|---:|---|---|
| `color-contrast` (1.4.3 AA donde aplica) | **120** | Bienvenida, registro, alta mascota, intereses, Cuidados, creación, denuncia, rescate, mapa de fallo, muro y Mi mascota | **Múltiples pares** de color inadecuados, medir contenido/estado individual antes de cerrar |
| `button-name` (4.1.2 AA) | **20** | `create-menu` y `create-post` | Botones de cerrar iconográficos sin nombre accesible |
| `select-name` (4.1.2/3.3.2 AA) | **20** | `add-pet` y `create-community` | Selects de especie/género/categoría sin nombre computable |
| `aria-prohibited-attr` (4.1.2 según rol) | **10** | `map-unavailable` | `div[aria-label="Mapa de lugares PAZO"]` sin rol semántico permitido para esa etiqueta |
| **TOTAL** | **170** | Hallazgos de una muestra sintética | Repeticiones por idioma y ancho, no 170 defectos independientes |

**Medición:** son observaciones `MEASURED` por axe-core sobre DOM simulado con captura, **no** evaluaciones manuales de una cuenta real. Los ratios siguientes son los reportados por axe al componente; no se extrapolan a todos los pixeles de ilustración/fondo.

## Hallazgos prioritarios del render y del código

### VLAB-01 — Controles sin nombre accesible al crear contenido
**S3 · Incidente REPRODUCED (axe) · Confianza alta · Test FAIL automático, lector manual NOT_TESTED.**
En `create-menu` y `create-post`, axe-core detecta `button-name` crítico en un botón de cerrar que contiene solo icono. **20 apariciones** proceden de dos escenas × 10 condiciones. Un lector no tiene una acción inequívoca. Recomendación: `aria-label` localizado y comprobar activación/cierre/restauración de foco con Tab/Escape. **No tocar UI en esta rama**.

### VLAB-02 — Formularios de mascota y comunidad: selectores no etiquetados
**S3 · Incidente REPRODUCED (axe) · Confianza alta · FAIL automático, AT manual NOT_TESTED.**
- `add-pet`: **dos** elementos `select` sin nombre accesible (rutas DOM `.space-y-2 > .grid.grid-cols-2.gap-2 > select`, `form > .grid.grid-cols-2.gap-2 > select`); heurística del harness marca 7 campos de entrada/select sin etiqueta computable en esa escena.
- `create-community`: **dos** elementos `select` sin nombre computable (DOM `div:nth-child(1) > select` y `div:nth-child(2) > select`).
Las etiquetas próximas visualmente no bastan si no se asocian por `htmlFor/id`, `label` envolvente o atributo ARIA válido. Criterio de aceptación: nombres computados ES/EN en todo el formulario y recorrido teclado continuo.

### VLAB-03 — Contraste de acciones críticas en aviso de mascota perdida
**S3 · Incidente REPRODUCED (axe) · Confianza alta en el par de color simulado · FAIL automático, uso real NOT_TESTED.**
En `lost-review`, axe-core detectó ratio cercano a **2.93:1** tanto para el nombre naranja `#EC7357` sobre blanco como para el texto del botón **Publicar alerta** en blanco sobre ese naranja. El mensaje de alerta es tarea prioritaria: **no** rebajar a defecto decorativo. Ajustar el color útil o el peso/fondo sin suprimir el lenguaje visual de rescate; volver a medir el estado normal/disabled/focus. **El umbral 4.5:1 aplica al texto normal, no 3:1 automáticamente.**

### VLAB-04 — Microtexto y contrastes repetidos en tareas normales
**S2 · Incidente REPRODUCED (axe en fixture) · Confianza alta en regla, media en contexto de uso · FAIL automático.**
- `signup`, `pet-onboarding`, `interests`: ~**4.29:1** para texto `#5C7470` sobre fondo amarillo pálido `#F1F1B5` (texto pequeño, AA normal ≥4.5:1).
- `care-empty` y `create-menu`: ~**4.4:1** para secundaria `#5C7470` sobre crema/gris claro.
- `create-community`: ~**4.38:1** en subtítulo de 13px.
- `lost-active`: ~**4.43:1** en explicación de compartir (10px).
- `report-post`: ~**4.3:1** en ID de referencia secundario.
- `wall-empty`: ~**4.21:1** en texto de 13px.
- `welcome`: ~**2.3:1** de texto de **10px** gris `#9BA9A5` sobre crema `#FAF8F5`. Este resultado concreto proviene de texto bajo el hero, **no sustituye** la medición previa del texto sobre fondo oliva; son dos observaciones diferentes.
- `pet-summary`: ~**2.39:1** en CTA/texto del aviso de mascota perdida, 8/10 combinaciones.
Resolver por tokens/pares de contexto y prioridad, **no cambiar toda la marca a colores genéricos**. Valores distintos pueden corresponder a estados diferentes y requieren prueba final en viewport.

### VLAB-05 — ARIA inválida en el contenedor de Lugares sin mapa
**S2 · Incidente REPRODUCED (axe) · Confianza alta · FAIL automático.**
En diez variantes de `map-unavailable`, `div[aria-label="Mapa de lugares PAZO"]` presenta nombre accesible no permitido sin rol. Dar al contenedor un rol semántico apropiado para mapa o retirar una etiqueta innecesaria; confirmar con árbol accesible. **Esta escena no verifica que el mapa real Mapbox cargue.**

### VLAB-06 — Formularios con datos/avisos debajo de la primera pantalla
**S2 · Incidente NEEDS_REPRO de accesibilidad de scroll · Confianza media (evidencia visual) · Test interacción NOT_TESTED.**
Al examinar galería en 390px, los formularios de `create-community` y `create-post` ocupan casi la altura completa y parte de sus acciones puede quedar bajo el scroll interno. `legal-privacy` y `legal-terms` muestran textos largos en paneles desplazables. **No se puede concluir que controles estén cortados o inaccesibles solo por la captura del primer viewport**: se requiere desplazarse dentro del modal, Tab/Shift-Tab, teclado virtual, 320px, 200% zoom y retorno de foco. `fullPage:true` en documento NO garantiza capturar todo un contenedor con `overflow-y:auto`.

### VLAB-07 — Evidencia de fixture no extrapolable al producto público
**S0 informativo / control de integridad de evidencia · alta confianza.**
- `pet-summary` muestra foto rota porque el Pet de prueba tiene `photoUrl:''`. **No es prueba de que PAZO rompa fotografías reales.**
- `feed-one` y `feed-empty` no incluyen cabecera/barra completa del shell principal; son componentes individuales, no experiencia navegable completa.
- `communities-empty` demuestra acceso sin sesión, **no** comunidades pobladas ni el botón `Unirme`.
- `map-unavailable` representa un mapa sin acceso remoto por diseño; que vea error de token no demuestra caída en producción.
- `invitation` usa `previewOnly`; la línea de «Vista previa» existe solo en QA y no equivale al copy comercial mostrado a una persona real.
- `lost-active` usa un token/URL ficticios: se pueden evaluar iconos y composición, **no enlaces reales ni WhatsApp o GPS**.
- `legal`, `denuncia`, `recuperación` son estados renderizados sin ejecutar envío, sesión o decisión judicial/legal.

## Observaciones por familia (comparación visual de la galería ES 390 y cobertura 320/1440)

| Familia | Lo que se vio | Juicio de composición | Pendiente |
|---|---|---|---|
| Bienvenida/registro/mascota/intereses | Hero ilustrado fuerte y formularios secuenciales; color oliva y estructura conservados | Preservar identidad, reparar contrastes y etiquetas; no borrar «Paso 1/3» legítimos | Foto por teclado, zoom, datos largos y error |
| Inicio y Feed | Tarjeta Post clara, pero la escena deja mucho vacío en una lista de una sola entrada | No convertir vacío sintético en «mal uso del espacio»: comprobar shell completo y estado real | Post con foto/comentarios, tabs y scroll |
| Comunidades | Empty state correcto para cuenta sin sesión; formulario de crear con grandes campos | Crear comunidad exige orden y nombres semánticos; verificar modal con contenido largo | Lista poblada, unirse/abandonar y detalle |
| Mi mascota | Acciones QR/cuidados/documentos reconocibles, texto de alerta perdida destacado | La alerta merece contraste alto; preservar distinción de zona privada | Foto real, editar, mascota perdida, QR |
| Lugares | Buscador/chips, fallo de tiles, estado de recuperación explícito | No rediseñar el mapa sobre captura sin tiles; arreglar semántica de mapa sin sacrificar full-bleed | Mapa estándar cargado, tarjetas y rutas reales en QA |
| Creación | Menú con cuatro opciones, hoja modal coherente; cierre solo iconográfico | El foco y nombre accesible del cierre son prioridades, antes de pulido cosmético | Contratos teclado/scroll y estados de envío |
| Cuidados/Documentos | Vacíos comprensibles; oferta de añadir elemento visible | Contrastes secundarios deben verificarse; paneles grandes requieren QA a 320 | Tareas pobladas, historial, subir documento |
| Rescate/denuncia | Información importante y CTAs con color coral | Revisar contraste de texto/CTA de urgencia; no perder señal de prioridad | Publicar, compartir y reportar sin escribir en producción |
| Membresía/Muro | Invitación distintiva; mural vacío muestra imagen cálida sin socios falsos | Buena frontera voluntaria; conservar arte, mejorando lectura en estados específicos | Oferta PayPal real con contratos, consentimiento y checkout solo QA |
| Legal/recuperación | Pantallas de recuperación simple y términos amplios en modal | Legibilidad y control de retorno presentes, pero scroll + foco no comprobados | Teclado, scroll, 200% zoom, enlaces accesibles |

## Separación estricta entre severidad, confianza y estado de prueba
Los hallazgos VLAB-01 a -05 están sustentados por fallo automático reproducido en un DOM **de QA**; ello **no** certifica todos los criterios WCAG ni obliga a cambiar diseño antes del gate PO. VLAB-06 requiere prueba manual específica y puede quedar resuelto si el scroll real funciona correctamente. VLAB-07 protege contra inferencias falsas. Ningún resultado de este informe justifica mutaciones directas sobre backend, pagos, SQL o producción.

## Próximo gate de cobertura — sin afirmaciones prematuras
1. Cubrir **60 superficies restantes** con fixtures de componentes reales y estados difíciles. Priorizar **Comunidades pobladas/unirse**, **Mapa estándar realmente dibujado en QA**, **perfiles públicos**, **QR público**, **notificaciones**, **soporte** y **admin**. Para mapas/cuentas protegidas usar mecanismos aislados aprobados o fixtures F18 previos, no llamadas alojadas a producción.
2. Añadir inspección de **scroll interno** para modales largos, teclado/lectores de pantalla, zoom y hitboxes. Contrast ratio requiere medir fondos compuestos y excepciones.
3. Una vez recogida evidencia representativa, registrar cada defecto con selector, estado, captura, criterio WCAG y esperado/observado en [PR #107 — auditoría general](https://github.com/DigitalAppcorp/pazo-app/pull/107), usando este archivo como evidencia complementaria.
4. Recomponer en un PR separado solo después de elegir el cambio mínimo y validar que no rompe identidad, contratos PayPal, Mapbox, barra y decisiones ya aprobadas.

**Estado final de esta fase:** LABORATORIO FULL **PASS**; cumplimiento visual global de las 86 superficies **NO CERTIFICADO**; ningún cambio al producto en producción.
