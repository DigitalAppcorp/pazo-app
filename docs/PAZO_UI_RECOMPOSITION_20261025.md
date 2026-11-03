# PAZO — Recomposición visual y de experiencia (identidad conservada)

**25-oct-2026 · Fase R1 (propuesta implementada en rama, sin merge/despliegue)**

## Decisión del Product Owner
Conservar la identidad de PAZO: verdes `#204E4A` y afines, lima `#E1E53F`, crema, ilustraciones, superficies y sombras suaves; **cero contornos decorativos**. Recomponer para mejorar legibilidad, jerarquía, espaciamiento, alineación por contexto, formularios, navegación y adaptación entre vistas. El cambio de marca, pagos, funcionalidades y modelo de datos NO está autorizado por esta decisión.

Marco: Design Intelligence OS v0.4.0 (PR #7 de Project Brain OS). Los gustos específicos de PAZO no pasan a reglas de esa habilidad general.

## Diagnóstico — causa transversal identificada
En `src/index.css`, `@layer base` imponía `margin: 2px !important` a **todos** `h1–h6, p, label`. Este override impedía aplicar utilidades de Tailwind `mt-*, mx-auto, mb-*` y margen local. Ejemplos de superficies afectadas: título y filtros en Inicio, títulos de Comunidades y Mi mascota, pasos del onboarding, encabezados de diálogos, estados vacíos y textos de ayuda. La presencia de la regla es **confirmada por código**; el efecto visual exacto en cada pantalla es **pendiente de comparación renderizada**.

Otros factores de riesgo:
- Escala `@theme` existente redefine `text-xs` como 15 px y `text-sm` como 17 px (aprox. +3 px). Simultáneamente hay tamaños arbitrarios de 8.5, 9.5, 10, 11 y 12 px. La mezcla produce jerarquía poco predecible. **No reajustar escala global sin revisar todas las pantallas.**
- Regla global de `border-width:0!important` y foco con fondo amarillo por preferencia PO: **preservar cero contornos**, pero revisar foco visible, contraste y control de interacción local.
- Algunas vistas usan ancho de una app móvil aun en escritorio. **No expandir por inercia**; la interfaz principal es mobile-first, y administración puede requerir layout adaptativo aparte.
- La auditoría de accesibilidad anterior detectó etiquetas sin asociación, controles de foto no navegables con Tab, menú/diálogos con foco incompleto y texto técnico de pagos/errores en superficies públicas. Son trabajo posterior de revisión de componentes, no autorización para alterar backend.

## Contrato de composición
1. **Espaciado por responsabilidad:** ningún margen forzado global para elementos semánticos. El componente controla ritmo con `space-y-*`, `gap-*`, `mt-*` y `mx-auto`; contenedores exteriores controlan padding. La misma pantalla no debe tener margen de padres e hijos añadido accidentalmente.
2. **Jerarquía por tarea:** pantallas editoriales e invitaciones pueden centrar títulos; listas y formularios generalmente se alinean al inicio. No convertir preferencias de alineación en reglas universales.
3. **Typography contextual:** contrastes WCAG 2.2 AA verificables (4.5:1 texto normal, 3:1 texto grande), controles de texto secundario legibles; títulos no deben comprimir letras al punto de perder lectura. Probar expansión ES/EN.
4. **Interacción accesible:** targets al menos 24×24 CSS px o excepción 2.5.8; objetivo interno preferido 44×44 para CTA táctil cuando sea viable. Mostrar foco accesible sin contornos decorativos, usando relleno, contraste u otra señal perceptible.
5. **No filtración de instrucciones internas:** copy de interfaz para la persona usuaria; mensajes legales importantes no se omiten. Backend de PayPal, notificaciones, Storage y preferencias no cambian por retoques visuales.
6. **No inventar estructura:** chips, eyebrows, numeraciones y divisores requieren función de agrupación/estado. `AMIGO DE PAZO` es identidad de programa; `Paso 1 de 3` es secuencia auténtica. No eliminarlos por patrón automático.
7. **Proteger aprobaciones:** mantener mapa Mapbox estándar full-bleed, tarjetas y desvanecimiento, barra inferior blanca con indicador verde, apariencia de perfiles, pantalla G de crecimiento, idioma ES/EN, controles admin existentes, ilustraciones y animaciones reducidas.

## Plan de revisión por lotes
| Lote | Superficies | Composición a validar | Estado en esta rama |
| --- | --- | --- | --- |
| R1 — Base | `index.css` y tipografías compartidas | Quitar anulación global de márgenes; preservar paleta, fonts y comportamiento | **Implementado** |
| R1 — Ejemplos | Bienvenida; Feed (filtros); Amigo de PAZO G | Legibilidad de contraste/texto y respiración vertical | **Implementado, visual pendiente** |
| R2 — Primera sesión | Registro A02, agregar mascota, edición de mascota, recuperación | Etiquetas, foco, espacio entre controles, teclado y estados | **Pendiente** |
| R3 — Social | Feed/postcard, Comunidades, detalle/composer, Explorar | Jerarquía, lectura, menú, acciones independientes y vacíos | **Pendiente** |
| R4 — Servicios | Lugares/mapa/detalle, Cuidados, QR, alertas, notificaciones, soporte | Legibilidad móvil, foco de diálogos, feedback de estados | **Pendiente** |
| R5 — Finanzas/admin | Invitación/oferta/cancelación, muro, panel de administración móvil/escritorio | Contratos de copy, datos Live vs Sandbox, consentimientos y densidad | **Pendiente; no tocar cobros/backend** |

Los lotes pendientes **no** están corregidos ni aprobados por el hecho de estar inventariados. Cada lote exige comparar pantallas reales, registrar divergencias y decidir el delta seguro antes de editar.

## Delta R1 específico
- `src/index.css`: eliminar `margin:2px!important` universal para devolver responsabilidad de espaciado a componentes y utilidades. No alterar reglas de cero contornos ni escala `@theme` en este lote.
- `src/components/views/OnboardingView.tsx`: cambiar a verde oscuro el texto del hero oliva para cumplir contraste según colores de CSS. La paleta no cambia.
- `src/components/views/HomeView.tsx`: incrementar legibilidad de los dos filtros del Feed sin alterar estado ni handlers.
- `src/features/supporter/components/SupporterInvitationPrompt.css`: aire mínimo del título y aumento de textos secundarios, conservando arte, precio y botones.

## Gates — necesarios antes de aceptar el diseño
- **Referencia:** comparar el mismo estado de cada pantalla **antes vs R1** en 320×568, 390×844, 430×932, 768×1024 y 1440×900, ES/EN cuando exista. Registrar diferencias no solicitadas.
- **Funcionalidad:** nunca dar por probado un flujo porque el build pasa. Verificar onboarding, navegación, filtros, overlay de invitación, scroll y safe areas; no generar pagos ni filas reales.
- **Accesibilidad:** medir contraste final en render, Tab/Shift-Tab/Escape en superficies revisadas, 200% zoom/reflow y texto aumentado; anotaciones `PASS/FAIL/NOT_TESTED`.
- **CI:** `node --test scripts/pazo-ui-composition-foundation.test.mjs`, `npm run build`, `npm run test:governance` en entorno aislado. No hacer deploy automático y no usar scripts SQL.
- **Aprobación:** presentar antes/después al PO. Su aprobación de la identidad **no equivale** a aprobar cada nueva composición o deploy.

## Restricciones y handoff
Rama: `design/pazo-composition-foundation-20261025`, creada desde `main@a01b56861cc7d7e016efb9a5d109987c4ceeb33a`. Nunca hacer merge, deploy, SQL/Edge, cambios en PayPal, credenciales, condiciones financieras ni ajustes de activación sin GO posterior. Los archivos de continuidad del entorno local del usuario **no se han consultado ni editado**, y el historial del proyecto permanece intacto.

**Estado R1:** fuente modificada en rama aislada y comprobaciones estáticas documentables; fidelidad visual completa, QA E2E y accesibilidad en dispositivos: NOT_TESTED hasta evidencia real.
