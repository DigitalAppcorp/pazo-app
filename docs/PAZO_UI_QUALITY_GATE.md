# PAZO — UI Quality Gate | propuesta revisable

**Estado:** PROPUESTO en PR #36; no implica aprobación visual ni autorización de rediseño integral/F13.  
**Referencias obligatorias:** AGENTS.md, alcance MVP vigente, pantallas aprobadas por Product Owner, contrato de arquitectura, privacidad y patrones existentes. La regla generalizable se propone por separado en Project Brain OS PR #3, `patterns/INTERFACE_QUALITY_GATE.md`. **No instalar Impeccable, Emil Kowalski ni Taste Skill por defecto**: son posibles fuentes de revisión, no autoridades sobre PAZO.

## Identidad visual observada en el código
Fuente: `src/index.css` y pantallas existentes. Tipografía Palo Seco, verde `#204E4A`, acento `#E1E53F`, fondos `#EFECE4` y `#FAF8F5`, texto secundario `#5C7470`; tarjetas redondeadas, sombras suaves, gráficos e iconografía propios. Este inventario **no crea nuevos tokens ni aprueba cambios**; preservar primero el comportamiento y estilo aprobados.

### Decisión visual firme del Product Owner — CERO CONTORNOS (2026-10-09)
- Ningún botón, tarjeta, modal, contenedor, enlace, chip o superficie similar debe dibujar borde, outline, stroke, ring de teclado, ni sombra que forme un contorno. **No reinterpretar «cero contornos» como «cero contornos salvo al hacer Tab».**
- Son admisibles las sombras suaves de elevación existentes, siempre que no se conviertan en aro/borde.
- **Excepción restringida:** solo un campo de entrada de texto que verdaderamente lo necesite puede usar un contorno localizado. No se crean excepciones globales ni por defecto.
- Accesibilidad mediante cambio de fondo/superficie, contraste y, cuando resulte apropiado, subrayado al hacer foco; verificar su percepción real con teclado. Evitar introducir una nueva estética para «mejorar» accesibilidad.
- La regla del PO prevalece sobre recomendaciones de Impeccable, Emil Kowalski, Taste Skill y el patrón genérico de Brain OS. Nunca instalar estilos/rings recomendados por terceros de forma automática.

## Checklist pequeño para cada interfaz nueva o modificada
1. **Utilidad real:** acciones hacen lo que prometen; contenido demo aislado; fake doors indican «En desarrollo». Nada de pantallas ficticias en cuentas reales.
2. **Estados del recorrido:** inicial, carga, vacío, éxito, error + reintento, disabled/enviando, cancelación y permisos cuando apliquen. Diferenciar fallo de consulta y falta real de datos.
3. **Estructura visual:** jerarquía, tipografía, espaciado, contraste, densidad, iconos y consistencia con componentes existentes. No convertir las referencias del video en plantilla genérica para toda la app.
4. **Accesibilidad móvil y teclado:** touch targets adecuados, formularios etiquetados, Tab/Enter/Escape, foco perceptible, estado anunciado, localización ES/EN y `prefers-reduced-motion` sin bloquear tareas.
5. **Microinteracciones:** feedback claro, transiciones cortas y con propósito; ninguna animación ornamental obligatoria ni SDK nuevo por inercia.
6. **Regresiones:** captura before/after y prueba de tarea principal; un cambio visual no puede romper formularios, Feed, mapa, documentos ni pantallas validadas por PO.
7. **Evidencia separada:** código auditado ≠ tests/build PASS ≠ navegador Preview comprobado ≠ aceptación del PO ≠ producción. No declarar «terminado» por solo CI.

## Primera aplicación: pantallas ya tocadas en PR #36
- **Onboarding:** alta, validaciones, confirmación por correo, error de red, primera mascota.
- **Recuperación:** formulario, contraseñas distintas, enlace vencido, éxito y vuelta a login.
- **Feed:** cargar, estado vacío correcto, error/reintento, like/save, scroll, cambio de mascota; los mensajes simulados no pueden mostrarse como reales.

## Hallazgo verificable de fuente
`src/index.css` fuerza `outline: none !important` globalmente sobre controles y elimina el foco nativo. Un primer intento añadió un `box-shadow` de foco que **contradecía la regla del PO**; se retiró antes de merge. Ahora se implementa foco de teclado mediante contraste de superficie amarilla y subrayado para acciones, o fondo suave para campos de entrada, **sin aro, border, outline ni box-shadow de contorno**. Se mantiene `prefers-reduced-motion`. **Pendiente QA visual y de teclado**.

El mismo CSS fuerza `margin: 2px !important` en textos: posible fuente de inconsistencias de jerarquía; **no cambiar sin aprobación visual**.

## Límites y coste
- No rediseñar PAZO, no activar F13, no modificar decisiones UX aprobadas por este documento.
- Ninguna instalación de 3 skills, librería de animación, fuente, integración, pago o despliegue automático.
- Cambios agrupados en PR #36; mantener CI y QA visual distintos. Vercel scope `digitalapp` 403 y build-rate-limit en ambos contextos: no inventar Preview.
- Para la beta, una prueba mobile y desktop con teclado/reduced-motion y escenarios reales después de recuperar un entorno autorizado.
