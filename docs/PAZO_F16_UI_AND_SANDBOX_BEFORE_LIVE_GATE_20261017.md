# PAZO F16 — GATE PRIORITARIO: UX/UI + beneficios Sandbox ANTES DE LIVE
**Fecha:** 2026-10-17. **Origen:** corrección expresa del Product Owner: no entrar a PayPal Live ni diseñar planes reales antes de aprobar visualmente la pantalla de suscripción, las insignias, el muro y los cinco fondos, y verificar su funcionamiento en Sandbox. **Estado:** OBLIGATORIO / EN CURSO. PR #44 DRAFT.

## Decisión del Product Owner (ordena F16)
**Orden innegociable:** (1) revisión de pantallas reales → (2) ajustes visuales aprobados → (3) integración funcional Sandbox de los cuatro beneficios → (4) verificación del recorrido de suscribir/cancelar + casos negativos → (5) aceptación del PO → (6) SOLO ENTONCES preparación PayPal Live / legal / migraciones hosted. El precio/alcance ya aprobado se mantiene: **Amigo de PAZO $2.99 USD/mes, voluntario, PAZO gratuito**, insignia perfil+Feed, cinco fondos, muro por consentimiento de cada mascota, medallas tras 3/6/12 períodos pagados totalmente completados.

**En pausa inmediata:** crear o activar plan PayPal Live, solicitar IDs/secrets Live, activar checkout/pago público, activar `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED`, aplicar migraciones financieras en Supabase alojado, mover el PR a READY o desplegar sin un gate posterior. El documento anterior `docs/PAZO_F16_PAYPAL_BUSINESS_LIVE_PLAN_SETUP_20261017.md` es REFERENCIA POSTERIOR, no la siguiente tarea. PayPal Business ya está confirmado y no requiere revalidación.

## Inventario exacto verificado en rama — NO confundir pruebas con aceptación

| Superficie / beneficio | Código ya presente | Lo que no está aprobado/comprobado |
|---|---|---|
| Insignias 0/3/6/12 | 4 PNG originales en commit `77708dd`, componente `SupporterBadge.tsx`, perfil `PublicProfileView.tsx`, Feed `HomeView.tsx`; Codex verificó imágenes en tamaños 32/66 y build | Ubicación real, legibilidad, escala, superposición con fundador/avatar, diseño en scroll/móvil y reacción ante período caducado **no presentados al PO** |
| Fondos cosméticos | `SupporterProfileThemes.tsx` (5 estilos), `SupporterThemePreviewPanel.tsx`, `SupporterThemeSaveControl.tsx` | Previsualización VS perfil público, cambios guardados/reconectados, reset, contraste de Cielo estrellado, propietario y no pagador, QA visual/funcional |
| Muro | `GratitudeWallPreview.tsx`, `GratitudeWallLive.tsx`, `SupporterWallConsentSettings.tsx` | Estética real de mascotas, vacío/cargando/error, orden, medallas visuales, opt-in/opt-out real del propietario y visibilidad pública inmediata. El Live wall solo utiliza etiquetas de meses, no integra las PNG originales visualmente en tarjetas |
| Suscripción | `SandboxCheckoutQaPanel.tsx` dentro de `SupporterAccountManagement.tsx`, endpoint Sandbox QA cerrado | **No es la pantalla comercial final aprobada**. Falta revisar jerarquía/ubicación de CTA PayPal, propuesta de valor 4 beneficios, recurrencia, casilla desmarcada, regreso/pendiente/éxito/fracaso, comprobante y cancelación |
| Verificador financiero | Pruebas offline/PG17 de ciclos; P44 Sandbox anterior de aprobación/cancelación | **No existe E2E del nuevo flujo** `compra Sandbox verificada → período → beneficios → cancelación/vencimiento/reembolsos`. QA P44 histórico excluye beneficios. No acreditar por retorno PayPal |

## Gate V1 — PRESENTAR PANTALLAS, no más infraestructura

Trabajar en el mismo PR #44, sin producción, con componentes reales y un arnés local **aislado** claramente rotulado `PAZO Supporter QA — datos de demostración, no pago real`. Si se necesita un flag de laboratorio, debe ser build/dev-only y no poder usarse en producción, independiente del flag de beneficios públicos. No usar datos reales de usuarios ni PayPal Live. **No exponer RPC financiero ni relajar RLS.**

Producir evidencia navegable y capturas comparables móvil (360–390 px) y desktop (aprox 1280 px) de:
1. **Oferta principal** en su ubicación ya acordada (entrada discreta desde bienvenida) y pantalla interna con $2.99/mes, los 4 beneficios, PAZO gratis sin membresía y CTA PayPal; mostrar variantes de jerarquía visual ANTES de programar rediseños elegidos.
2. **Insignias**: inicial, 3, 6, 12 meses en avatar grande y encabezado del Feed con/fuera de fundador, sin perder la fotografía o el nombre; ver texto ES/EN.
3. **Cinco fondos**: cómo se ve una mascota en perfil real, selección, guardar y restaurar, con iluminación y legibilidad, animaciones respetando reduced-motion.
4. **Muro público**: 0 entradas, 1 entrada, varias y vista móvil, detalle de autorización de una mascota, retiro de consentimiento, estado sin cobertura, tarjeta con insignia sin exponer datos personales.
5. **Administrar membresía**: pago pendiente, período confirmado, fecha de vigencia, cancelación confirmada que conserva período pagado, período vencido, error de proveedor, acceso al acuse y salir.
6. **Recorrido completo** de un propietario con mascota: bienvenida → oferta → consentimiento → sandbox → regresar → verificar cobertura → insignia/fondos/muro → cancelar → caducar.

**Entrega V1:** capturas o enlace local navegable + lista de desajustes observados + propuestas puntuales; presentar **al Product Owner** para escoger cambios. **STOP obligatorio a nuevos rediseños sin aprobación visual**. UI sin contornos/borders/outline/rings por decisión PO; mantener identidad actual, toque móvil, estados ES/EN, fuente y controles accesibles con foco por contraste.

## Gate V2 — integrar comportamiento Sandbox de CUATRO BENEFICIOS

Después de que el PO apruebe la UI:
- Crear cuenta de prueba descartable y mascota de prueba con propietario autenticado solo si el entorno de QA y el procedimiento permiten creación (no usar cuenta personal ni confundir Sandbox con Live). No reusar compra P44 porque los términos de esa transacción **excluyen beneficios**.
- Aceptar copy prospectivo específico de los cuatro beneficios, casilla de renovación automática desmarcada; registrar aceptación versionada y acuse. Plan y fondos Sandbox separados de producción.
- Obtener `PAYMENT.SALE.COMPLETED` firmado/merchant GET/owner-intent real de Sandbox. Vincularlo únicamente al ledger de **QA aislado**, con períodos contractuales comprobados: no beneficio por approval/redirect/`ACTIVE` sin pago. Probar idempotencia y evitar tarjetas duplicadas.
- Ver en **la app real QA**, no solo en test unitario, que aparecen insignia inicial en perfil/Feed, guarda/restaura cada fondo, solo mascota autorizada sale al muro, y funciona cancelación de próxima renovación conservando período pagado.
- El hito de 3/6/12 se prueba con **datos sintéticos controlados de períodos completados** en PostgreSQL desechable, nunca como tres pagos reales fingidos ni modificando el historial de PayPal. Probar también gratis, pago pendiente/fallido, refund parcial/total, disputa, expiración, doble webhook, cancelación y opt-out inmediato.
- No volver a ejecutar pruebas históricas completas P42/P43/P43B; únicamente pruebas dirigidas al nuevo flujo y regresiones UI afectadas.
- Un PASS de CI/PG17 no es PASS de navegador ni aprobación PO. Registrar por separado: código, pruebas, navegador, comparación diseño y decisión PO.

## Salida / GO de UX + Sandbox
Se permite empezar preparación del comercio **Live únicamente después** de:
- [ ] PO aprueba visualmente la pantalla de oferta y botón PayPal
- [ ] PO aprueba las insignias en Feed/perfil, cinco fondos y muro con ejemplos reales de pantalla
- [ ] Capturas QA en móvil/desktop muestran estados vacíos, errores y cancelación
- [ ] Una transacción genuina PayPal Sandbox de la **nueva oferta con beneficios** permite acreditación y recompensa por propietario de prueba; caso negativo de pago no validado no concede
- [ ] Opt-in y opt-out por mascota funcionan frente a galería pública
- [ ] Cancelación Sandbox detiene renovación y respeta la mensualidad pagada
- [ ] Evidencia CI/PG17 y navegador disponible, sin alterar PAZO real
- [ ] Aprobación expresa PO de continuar a LIVE

**Siguiente acción al continuar:** construir evidencia visual de las pantallas existentes y propuesta concreta para la oferta/pago; presentarlas al PO ANTES de cualquier tarea Live. No exigir al usuario crear un plan Live ahora.

**Marcador:** `F16_UI_AND_SANDBOX_BENEFITS_REVIEW_REQUIRED_BEFORE_LIVE`.
