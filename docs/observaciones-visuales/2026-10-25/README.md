# PAZO — Auditoría integral de interfaces (Design Intelligence OS v0.4.0)

**Fecha:** 25-oct-2026 · **Tipo:** evaluación independiente y crítica del producto · **Autoridad:** Product Owner, decisiones específicas del proyecto y [Design Intelligence OS v0.4.0](https://github.com/DigitalAppcorp/project-brain-os/blob/feat/ui-ux-frontend-skill-20261025/knowledge/ui-ux-frontend/SKILL.md) · **Estado:** informe de auditoría, NO certificación visual/WCAG y NO autorización de implementación.

## Control de versión y límites
- **Producto auditado:** `DigitalAppcorp/pazo-app`, **`main@a01b56861cc7d7e016efb9a5d109987c4ceeb33a`**. Distinguir este código de la rama experimental `design/pazo-composition-foundation-20261025`, [PR #106](https://github.com/DigitalAppcorp/pazo-app/pull/106), abierta **DRAFT**.
- **Rama documental única:** `audit/pazo-observaciones-visuales-20261025`, nacida de ese SHA de `main`. **No altera archivos de aplicación ni mezcla correcciones del PR #106**. Se crea un PR borrador aparte.
- **Identidad invariante:** verde bosque, lima, crema, ilustraciones, redondeos/sombras suaves, cero contornos decorativos, mapa estándar Mapbox, barra de navegación con identidad propia, PWA mobile-first y panel de administración adaptativo. «Cero contornos» NO debe eliminar indicadores de foco perceptibles.
- **Evidencias inspeccionadas:** archivos React/CSS, rutas activadas por App, documentación de decisiones F13/F18, imágenes de revisión F18 en `docs/review/f18/`, snapshot de estado en GitHub, estado de PR #106 y reportes de CI anteriores. Imágenes F18 representan **fixtures/capturas de estados determinados**, no evidencia de todos los módulos ni de cifras financieras de producción.
- **Sin pruebas de interacción real:** no se ejecutaron clicks, login, pagos, E2E autenticados, sesiones con teclado/lector de pantalla, revisión DOM/renderizada de todas las vistas ni toma de nuevas capturas a escala. **No afirmar que el 100% de las pantallas pasó inspección visual renderizada.**
- **Sin lectura de datos privados ni mutaciones:** no se consultan cuentas reales, ni se manipulan membresías; ninguna modificación a App/SQL/PayPal/Edge/Vercel/producción.

## Índice del expediente
1. [01_ALCANCE_Y_METODO.md](01_ALCANCE_Y_METODO.md): capas, evidencia, métricas, grados de certeza y límites.
2. [02_INVENTARIO_DE_PANTALLAS.md](02_INVENTARIO_DE_PANTALLAS.md): recorrido exhaustivo del inventario de vistas, sub-vistas, overlay y estados detectables en código, con observación y tarea de prueba por superficie.
3. [03_HALLAZGOS_PRIORIZADOS.md](03_HALLAZGOS_PRIORIZADOS.md): defectos concretos con rutas/líneas, causalidad plausible, severidad, incertidumbre y criterio de aceptación.
4. [04_DIRECCION_VISUAL_Y_CONTENIDO.md](04_DIRECCION_VISUAL_Y_CONTENIDO.md): crítica de las capturas realmente inspeccionadas, sistema compositivo, copy y decisiones que se conservan.
5. [05_GATES_DE_VALIDACION.md](05_GATES_DE_VALIDACION.md): matriz de viewport, estados, teclado, WCAG, regresión y secuencia de aprobación.

## Dictamen ejecutivo
**NO APROBACIÓN GLOBAL.** La identidad y algunas experiencias son sólidas, pero hay un problema sistémico de composición y numerosos controles con riesgos detectables en código. La auditoría no respalda un rediseño estético indiscriminado: la solución es **recomposición del sistema + reparación progresiva de interacciones**.

### Causas transversales, no parches cosméticos
1. **Cascada CSS invasiva:** `src/index.css:45-49` impone `margin: 2px !important` a `h1-h6, p, label`, neutralizando márgenes locales `mt-*, mx-auto` y alterando centrado/ritmo. El PR #106 propone quitar esa regla; **falta revisión visual real de la regresión transversal**.
2. **Escalas mezcladas:** `src/index.css:8-25` redefine la escala nominal; distintos componentes usan arbitrarios de 8.5/9/10/11/12 px. La mezcla dificulta jerarquía consistente.
3. **Frontera de audiencia:** algunos mensajes públicos revelan rutas de almacenamiento o configuración PayPal en vez de comunicar acciones/estados pertinentes.
4. **Interacciones sin contrato común:** composición de enlaces/botones, formularios con etiquetas desconectadas, archivos invisibles al teclado y overlay sin flujo de foco consistente.
5. **Aprobación ≠ evidencia:** un diseño aprobado y un CI correcto no confirman legibilidad, hitboxes, navegación de teclado ni conservación de intención entre iteraciones.

### Semáforo por capa
| Capa | Dictamen | Razón |
| --- | --- | --- |
| Identidad y marca | **Conservar** | Componentes/lenguaje visual distintivos para PAZO |
| Dirección de arte invitación G | **Conservar con ajuste medido** | Metáfora clara y decisiones voluntarias; secundarios pequeños |
| Composición global | **Recomponer** | Override de márgenes confirmado y tamaño textual no normalizado |
| Accesibilidad de formularios | **No conforme parcialmente en código** | Labels, selector de fotos, mensajes sin asociación/anuncio |
| Navegación y menús | **Riesgo alto** | Tarjeta/botón anidado; menú ARIA incompleto; labels ocultos |
| Lugares/mapa | **Conservar dirección, verificar overlay** | Full bleed, rutas y fallbacks; foco de detalle sin contrato integral |
| Membresía/PayPal | **Separación UX correcta, copy sin depurar** | Invitación ≠ checkout; filtración técnica en oferta |
| Moderación y administración | **Funcionalmente bien compartimentadas, densidad a revisar** | Muchos estados/tablas; QA visual solo de algunas pantallas |
| QA de cada vista real | **NOT_TESTED como conjunto** | Inspección de código amplia, capturas reales de F18 limitadas |

## Recomendación vinculante de proceso (NO autorización)
- **Gate 0:** conservar producción intacta y no fusionar PR #106 sin capturas antes/después, teclado y build.
- **Gate 1:** resolver regresiones sistémicas de CSS y asegurar foco/labels en formularios principales.
- **Gate 2:** recomponer bloques funcionales por pantalla con contratos de intención; preservar Mapbox/contratos de pagos/privacidad.
- **Gate 3:** medir resultados en viewports, español/inglés y estados reales o fixtures autorizados; revisar con el PO.
- No confiar en «el agente cree que se ve mejor» como evidencia. Cada modificación futura necesita GO independiente.

**Resumen de cobertura:** se catalogaron rutas principales, formularios y paneles. **`CODE_INSPECTED` significa revisión del archivo**, no prueba visual de uso; `VISUAL_FIXTURE` solo corresponde a capturas F18 vinculadas. Páginas derivadas de datos reales requieren una segunda auditoría visual antes de afirmar cobertura integral.
