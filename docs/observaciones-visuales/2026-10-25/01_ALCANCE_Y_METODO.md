# 01 — Alcance, método y autoridad de Design Intelligence OS

## Qué se considera «auditar cada pantalla»
PAZO no consta de un conjunto cerrado de rutas HTML; en `src/App.tsx:1619-2276` conviven rutas especiales, tabs, overlays, modos condicionales, perfiles públicos, estados vacíos/de error, permisos y UI de administración. Por ello un **inventario de superficies** incluye **pantallas + sub-vistas + overlays + estados principales**, no solo archivos que terminan en `View.tsx`. El [inventario](02_INVENTARIO_DE_PANTALLAS.md) describe los accesos visibles y distingue fuentes verificables de pruebas pendientes.

No se fingirá inspección renderizada donde solo hay código. El conjunto de capturas almacenadas en `docs/review/f18/` corresponde principalmente a F18: invitación G, oferta y controles/admin. No es un registro fotográfico de toda PAZO.

## Matriz operativa (v0.4.0)
Aplicar los módulos: `DESIGN_REASONING` (tarea, contexto, tradeoff), `AUDIENCE_BOUNDARY` + `UX_CONTENT` (copy destinado al usuario), `DESIGN_MEMORY` (decisiones), `CREATIVE_EXPLORATION` (alternativas situadas), `REFERENCE_ANALYSIS` (transferir principios, NO clonar), `CHANGE_INTEGRITY` (delta e invariantes), `AUDIT_QA`, `QUALITY_GATES`, `READ_ONLY_AUDIT`, `MEASUREMENT_PROTOCOL` y `ACCESSIBILITY`.

**Separación por capas para cada superficie**
1. **Tarea y utilidad:** quién llega, por qué, qué espera, cuál es la acción primaria y cómo sale.
2. **Arquitectura de información:** orden, agrupación, ubicación y economía de etiquetas/textos; no añadir «SECCIÓN 03» sin función.
3. **Dirección artística:** identidad, composición, alineación contextual, peso de imagen, tono/espacios. Ni alineación izquierda ni centro son dogmas.
4. **Contenido público:** verdad del negocio, orientación, consentimiento, recuperación, filtración de lenguaje de desarrollo.
5. **Comportamiento:** acciones, estados vacío/espera/éxito/fallo, feedback, foco, teclado, scroll, zoom, tamaño de pulsación.
6. **Adaptación:** PWA mobile-first en 320/390/430 CSS px, escritorio como marco móvil salvo admin, safe areas y expansión ES/EN.
7. **Integridad y riesgo:** decisiones visuales PO, privacidad, autorizaciones, seguridad PayPal, no-pérdida de datos.

## Semántica de evidencia
- `VISUAL_FIXTURE`: captura del repositorio **realmente abierta** en esta auditoría; sigue siendo un fixture que no prueba producción ni interacciones.
- `CODE_INSPECTED`: fuente React/CSS examinada; permite hallazgo estructural exacto, no concluir cómo se ve cada píxel o funciona Tab.
- `CALCULATED_FROM_CSS`: medida numérica reproducida desde colores declarados, no muestreo del render.
- `REPORTED`: información declarada por usuario, informe externo o nota del repositorio, no reproducida.
- `INFERRED`: hipótesis de experiencia fundada en código o captura, debe contrastarse.
- `NOT_TESTED`: falta navegador interactivo, dispositivo, datos o prueba.
- `UNAVAILABLE`: superficie no alcanzable con acceso disponible; no equivale a ausencia de defectos.

**Incidente** y **prueba** son ejes diferentes:
- Severidad **S4** = crítico / riesgo grave de seguridad o pérdida de acceso; **S3** = alto / tarea principal obstaculizada; **S2** = medio / usabilidad, copy o accesibilidad acotada; **S1** = bajo / pulido; **S0** = informativo.
- Estado: `CODE_CONFIRMED`, `VISUAL_CONFIRMED`, `NEEDS_RUNTIME`, `REPORTED`, `NOT_EVALUATED`, `CLOSED_BY_EVIDENCE`.
- Confianza: alta/media/baja según prueba.
- Resultado de test: `PASS`, `FAIL`, `INCONCLUSIVE`, `NOT_TESTED` (una fuente de código que demuestra una estructura no implica que un test del flujo haya sido ejecutado).
Nunca sumar los S como «nota estética».

## Normas y umbrales
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA, no confundir diseño recomendado con obligación normativa.
- [1.4.3 contraste textual](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): texto normal **≥4.5:1**, grande **≥3:1**; revisar tamaño real/excepciones.
- [1.4.11 contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): **≥3:1** donde se requiere para componentes e información gráfica, con excepciones.
- [2.5.8 objetivos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): **24×24 CSS px o excepción por espaciado/criterio**; una ilustración/icono de 20 px no mide su hitbox.
- [2.4.7 foco visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.4.11 foco no oculto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [3.3.2 etiquetas/instrucciones](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [4.1.2 nombre/rol/valor](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html), [3.3.1 identificación de errores](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [1.4.4 resize](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
- Los estándares no fijan «todo texto secundario ≥12 px» de manera universal. 8.5px es indicio de ilegibilidad y prioridad UX, **no** atribuir automáticamente a WCAG un mínimo de tamaño absoluto que no establece.
- WCAG-EM 2.0 describe métodos de muestreo/evaluación; esta revisión **no es auditoría formal de conformidad de todo el sitio**.

## Línea base y comparación
| Dimensión | Referencia |
| --- | --- |
| Código/estilo | [`main@a01b5686`](https://github.com/DigitalAppcorp/pazo-app/tree/a01b56861cc7d7e016efb9a5d109987c4ceeb33a) |
| Reglas globales | [`src/index.css`](../../../src/index.css): escalas, margin forzado, foco, superficies y barra |
| Composición raíz | [`src/App.tsx`](../../../src/App.tsx): marco móvil ≤430 px, rutas/tablas modales |
| Preferencias F13 | [`docs/PAZO_F13_VISUAL_CHANGESET_20261012.md`](../../PAZO_F13_VISUAL_CHANGESET_20261012.md): revisar cronología; decisiones antiguas de mapa congelado superadas por aprobación posterior de diseño inmersivo |
| Preferencias F18 | [`docs/PAZO_SUPPORTER_INVITATION_DESIGN_OPTIONS_20261024.md`](../../PAZO_SUPPORTER_INVITATION_DESIGN_OPTIONS_20261024.md): concepto G, invitación no pago; el documento mezcla historia antes y después de implementación |
| Cambios NO integrados | [PR #106](https://github.com/DigitalAppcorp/pazo-app/pull/106): corrige margin global y tipografía en ejemplos, **no** está en main |
| Arte visual realmente visto | capturas `docs/review/f18/` nombradas en [04](04_DIRECCION_VISUAL_Y_CONTENIDO.md) |

## Modelo de medición de contraste usado en esta revisión
Para sRGB HEX opaco, componer primero las transparencias sobre el fondo real; normalizar cada canal a 0…1; linealizar `c/12.92` para `c<=0.04045` o `((c+0.055)/1.055)^2.4` en caso contrario; `L=0.2126R+0.7152G+0.0722B`; `ratio=(L_max+0.05)/(L_min+0.05)`. Sobre ilustraciones/gradientes/transparencias el valor calculado en un stop **no prueba el ratio del conjunto renderizado**. Todos los valores deben conservar HEX, fuente/estado y limitaciones.

## Material no revisado de forma suficiente
- Capturas ES/EN para la mayoría de pantallas fuera de F18: **no disponibles en el inventario examinado**.
- Salida de Playwright/Chromium interactivo de esta sesión, lector de pantalla, tamaño táctil medido con DOM, zoom/reflow y auditoría multi-dispositivo: **NOT_TESTED**.
- Seguridad de backends, RLS, webhooks y consentimiento legal final: **FUERA DEL ALCANCE VISUAL**; no concluir PASS.
- Datos de analítica real o preferencias de personas usuarias: **no consultados**.

El informe usa vocabulario de riesgo real: puede afirmar «componente sin role=dialog» si así está en fuente, pero no «los usuarios no pueden usarlo» sin reproducir el caso.
