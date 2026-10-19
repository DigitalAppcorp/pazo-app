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
