# F16 — Configuración comercial mínima PayPal Business LIVE (2026-10-17)

**Confirmación del Product Owner:** la cuenta que recibirá los pagos de PAZO **es PayPal Business**. No solicitar nuevamente esa información. **No** se ha confirmado aún que exista una app REST **Live**, un plan Live ni un webhook Live. La existencia de Sandbox NO sustituye los recursos Live.

**Alcance exacto:** un plan de suscripción voluntaria `Amigo de PAZO`, USD **2.99 / mes**, **sin prueba gratuita**, **sin cuota inicial**, **sin plazo finito**, **sin precios variables, upgrades automáticos ni plan anual**. PAZO continúa gratis para usuarios no suscritos. Cuatro beneficios originales son entregables del lanzamiento: insignia en perfil/Feed, 5 temas de mascota, muro público solo con opt-in por mascota y medallas tras 3/6/12 períodos completamente terminados y pagados/no revertidos. Sin descripciones engañosas de features que aún están en desarrollo.

## Camino mínimo sin programar el catálogo de PayPal

Guía oficial, revisada 2026-10-01: https://developer.paypal.com/subscriptions/dashboard/use-dashboard

1. El **titular** entra en PayPal Business, `Sales > Subscriptions > Create plan` (los nombres visibles pueden variar por idioma).
2. Producto: `Amigo de PAZO`, categoría digital/software/service según el catálogo disponible. Descripción transparente de la membresía **con los cuatro beneficios**; indicar que la app básica sigue siendo gratis.
3. Plan: único `Amigo de PAZO — Mensual`, USD 2.99, cada **1 mes**, ciclos **ilimitados**, sin trial ni setup fee, sin precios/quantities configurables. Mantener desactivado cobrar automáticamente importes atrasados hasta aprobación comercial.
4. **No decidir unilateralmente** impuestos ni obligaciones fiscales: si el formulario exige ese campo y no hay decisión aprobada, se detiene la publicación para revisión; guardar borrador solo si el panel lo permite. No inventar retorno/URL PayPal ni compartir secrets.
5. Elegir **Save Draft / Guardar borrador**, NO `Turn Plan On`, hasta que el checkout/acuse/cancelación y cuatro beneficios funcionen. Este paso no crea una compra y no habilita el botón en PAZO.
6. Extraer **solo el Plan ID público no secreto** (formato `P-...`), estado DRAFT/CREATED y confirmar que proviene de la **cuenta Business real**, no de la pestaña Sandbox. Un plan en estado CREATED no pasa todavía el validador `ACTIVE` por diseño; la activación se coordina después con GO comercial.
7. Configurar de manera separada, cuando corresponda y con el titular, la **app REST Live** y su webhook Live. **Client Secret, accesos OAuth, tokens, contraseñas y webhook signature details permanecen privados**: jamás chat, GitHub, capturas o comandos con argumentos inseguros. No sobrescribir secrets y URLs ya usados en Sandbox.
8. Cuando el plan sea ACTIVADO/ACTIVE (solo tras consentimiento de PO sobre esa acción), el backend deberá ejecutar GET privado `/v1/billing/plans/{id}` y usar `pazoPaypalLivePlanContract.mjs`; cliente no confía en ningún id arbitrario/estado local.

## Lo que falta para cobrar con beneficios

- Reusar checkout Auth+owner/consent/intent idempotente ya desarrollado en QA, **pero backend Live diferente**, webhook Live con firma y merchant correcto.
- Validar transacción `COMPLETED` en PayPal y proteger reversals; transformar solo evidencia independiente en `service_start/service_end` contractuales acreditados por modelo privado, no dar premio por `BILLING.SUBSCRIPTION.ACTIVATED`.
- Terminar gestión de cuenta que **cancele online** en Live y mantenga cobertura hasta el período efectivamente pagado, comprobante de aceptación/confirmación ES/EN, renovación automática disclosures y avisos exigibles.
- Instalar migraciones revisadas con aprobación concreta del PO, demostrar E2E de esta ruta y los cuatro beneficios; GO expreso del primer cobro real supervisado y luego GO de habilitación general.

**Reglas de ejecución:** PR #44 sigue DRAFT; `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED` OFF; NO mutaciones en Supabase alojado, PayPal Live, Vercel o dinero por la simple confirmación «Business». No reabrir P42 histórico ni repetir Sandbox ya verificado. Priorizar recopilar **Plan ID Live público** y datos no sensibles de la app para integrar de inmediato.

Fuente adicional: https://developer.paypal.com/api/subscriptions/v1 y https://developer.paypal.com/subscriptions/webhooks/.
