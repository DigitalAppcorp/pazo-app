# PAZO F16 — Espera de membresía con gatito y estambre
Fecha: 2026-10-19. Producto: PAZO. PO pidió evitar la pantalla incompleta y la aparición tardía del botón PayPal, con animación de gatito.

## Decisión UX
- El usuario ve desde la primera carga de «Amigo de PAZO» una superficie de preparación completa, un gatito que juega con una bola de estambre y el texto «Preparando tu espacio…». No se muestra la oferta incompleta ni «Consultando cuenta…» de los componentes internos.
- Solo cuando (a) el hook server-authoritative `useSupporterMembershipStatus` terminó y (b), en Vite Sandbox, el listado privado V2 terminó, la pantalla muestra el estado real: primera invitación para `none`; «Pagar con PayPal» si `bound`; beneficios propios si la cobertura está verificada.
- El contenido y `SandboxV2AccountPanel` permanecen montados bajo `hidden` durante preflight para que la consulta efectivamente termine. Nunca asumir «none» por timeout/error de red.
- La consulta PayPal GET de inspección puede continuar en segundo plano sin retrasar artificialmente el botón de reanudar: ya no se deshabilita por `qaRecoveryStage==='checking'`. Los controles financieros/idempotencia del servidor siguen vigentes.
- Si hay error de membresía/consulta de la cuenta, se mantiene la pantalla de preparación con error corto y botón «Intentar de nuevo»; si ambos siguen pendientes más de 12 s, aparece el mismo reintento con «Está tardando más de lo esperado». Volver a PAZO está disponible en todos los estados.
- Gatito dibujado con SVG `fill` y detalles de estambre animados con CSS scoped; sin imágenes externas, sin dependencias, sin nuevos endpoints, sin API calls de la animación, sin bordes de tarjeta ni botones. Pausa animación por `prefers-reduced-motion`. ES/EN, estados `role=status/alert`, `aria-busy`, diálogo nombrado y ocultación semántica de la oferta prematura.
- Archivos: `src/features/supporter/components/SupporterPreparingScreen.tsx`, `SupporterPreparingScreen.css`, `src/index.css` y `SupporterAccountManagement.tsx`.
- Test: `src/features/supporter/testing/f16SupporterPreparationGate.test.mjs`.

## Restricciones y pruebas pendientes
No modificar PayPal Live, Supabase DB/Edge, identidad, cobros ni autorización de reintentos. Cambio puramente UI, manteniendo el PR #44 DRAFT.
No confundir CI PASS con aceptación visual: PO debe comprobar en Vite móvil ancho 390px y escritorio, cuenta nueva, cuenta pendiente, membresía activa, falla lenta y reduced-motion; gate visual pendiente.

## Corrección de la segunda carga visible — 19 de octubre

El PO mostró captura donde, después de salir la animación, la oferta revelaba «Consultando las condiciones…» sin botón PayPal. Causa: `SandboxCheckoutQaPanel` solicitaba la oferta publicada `action:'offer'` recién después de que `qaV2AccountState==='none'` permitía pintar `SupporterOfferB`. La primera implementación esperaba solo membresía y lista de cuentas. No servía para el UX solicitado.

Arreglo frontend en PR #44:
- `SandboxCheckoutQaPanel` notifica al padre `onOfferState` (`loading|ready|blocked`) y soporta `refreshRevision` solo para releer las condiciones publicadas, nunca crear suscripción automáticamente.
- `SupporterAccountManagement` incluye `qaOfferState` en el preflight **solo cuando** hace falta un checkout nuevo (`qaV2AccountState==='none'`) o nuevo consentimiento de reintento (`qaPayAction==='retry_ready'`). Los casos de suscripción `bound` no consultan la oferta innecesariamente.
- La oferta está montada detrás del overlay para que cargue; cabecera y `main` quedan ocultos por `display:none` hasta `phase==='ready'`. En fallo de oferta, pantalla del gatito indica problema y ofrece reintentar; no revela un segundo spinner ni el botón sin condiciones.
- El reintento de condiciones relee exclusivamente la oferta, no PayPal checkout. Nunca interpreta un timeout o respuesta fallida como cuenta sin membresía. No hay cambios en Supabase, PayPal Live, main, precios ni controles de cobro.
- Pruebas de contrato actualizadas en `f16SupporterPreparationGate.test.mjs` y `f16SupporterProductExperience.test.mjs`.
- Gate: compilación/CI y prueba visual local pendientes, no confundir commits con aceptación visual.

