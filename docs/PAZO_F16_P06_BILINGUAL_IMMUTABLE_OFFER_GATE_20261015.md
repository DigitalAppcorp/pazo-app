# PAZO F16-P06 — Recuperación del checkout: ofertas bilingües inmutables

**Checkpoint:** 2026-10-15. Rama `f13/section-titles-20261012`, [PR #44](https://github.com/DigitalAppcorp/pazo-app/pull/44) DRAFT. Producto principal PAZO gratuito; suscripción voluntaria Amigo de PAZO de **USD 2.99/mes**, aún **NO-GO** para cobros públicos.

## Evidencia verificada en GitHub

El HEAD recuperado al volver tras la interrupción fue `cb04958cb42544949431209897fe4c68a82f4f37`, cuyo último cambio instaló en el borrador P06 el trigger que prohíbe UPDATE/DELETE de ofertas ya publicadas. **CI y F16 Disposable PostgreSQL Lab: SUCCESS** en ese checkpoint.

**Continuación de este gate, confirmada por CI + PostgreSQL Lab: SUCCESS** en [`534b3368`](https://github.com/DigitalAppcorp/pazo-app/commit/534b33681ffab6bf59dee468c50ee45484a6fc20).

- `supabase/drafts/f16_p06_durable_checkout_consent_DO_NOT_APPLY.sql`: la RPC server-only que devuelve una oferta publicada requiere la **misma versión en ES y EN**, ambas publicadas, con mismo plan, USD 2.99 y frecuencia mensual. La RPC que crea la intención también exige el par bilingüe antes de insertar consentimiento. No sirve manipular un hash o mostrar una única traducción.
- `supabase/tests/supporter/p06-durable-checkout-consent-synthetic.sql`: verifica que solo ES publicada no permite ni lectura de oferta ni creación de checkout; publicar EN activa el par. Intenta modificar texto ES, revocar fecha de publicación EN y eliminar la oferta; los tres intentos se rechazan. Comprueba que las dos evidencias siguen presentes y que idempotencia del usuario, opt-in explícito, hash exacto y ningún crédito económico permanecen correctos.
- La única diferencia entre éxito del comprobador sintético y un cobro real es sustancial: las pruebas corren con un PostgreSQL desechable y textos **sintéticos**, no con términos legales aprobados y publicados para usuarios. **No se aplicó SQL a Supabase alojado ni se creó suscripción nueva en PayPal**.

## Código ya presente, no repetirlo

- `p06CheckoutConsentStore.mjs`: lector privado de oferta publicada y aceptación con idempotencia server-only.
- `p06SandboxVerifiedCheckout.mjs`: Auth verificada, consentimiento explícito y versión, creación PayPal Sandbox, GET de suscripción para confirmar plan/custom_id, bind privado y enlace de aprobación; siempre sin beneficio.
- `p06SandboxCancellationHandler.mjs` y `p06SandboxCancellationProvider.mjs`: comprobación de titular Auth, confirmación PayPal de cancelación, no afirmar `paidThrough` por el estado de suscripción.
- El inventario P05 contiene modelos offline para conciliación, ledger, período inicial y disputas. **No confundir simulaciones con período pagado acreditado**. El ledg­er alojado se había auditado con 0 filas y los eventos QA antiguos permanecían pendiente al último checkpoint; no afirmar un saldo nuevo sin auditoría fresca.

## Próximas acciones necesarias para cobrar de verdad

1. Revisar y aprobar el texto final ES/EN, acuse y cancelación, criterios de conservación y privacidad. No publicar textos sintéticos.
2. Ejecutar gate técnico de checkout end-to-end con control de claves y tasa global, solicitud/aceptación explícita, no doble suscripción tras reintentos, recuperación de respuestas ambiguas y cancelación accesible. Cada componente hasta ahora está **en GitHub**, no implica despliegue.
3. Autorización del Product Owner para migración e instalación **específica** en Supabase Sandbox, seguida de comprobación de permisos `anon/authenticated/service_role` y RLS (default grants de `public` auditados con riesgo previo).
4. Solo con evidencia PayPal y propia conciliación completa, implementar y verificar de forma atómica el ledger idempotente y el período de servicio pactado, incluyendo reembolsos, disputas, deudas y cancelaciones. Nunca basarse en el redirect de PayPal para otorgar acceso.
5. Activación progresiva de Sandbox y después revisión/aprobación independiente para Live, con prueba real controlada, no cobro no consentido ni migración de producción automática.

**Prohibiciones vigentes:** no crear/repetir buyer QA, no reprocesar ocho eventos QA históricos, no aplicar `DO_NOT_APPLY` alojado, no creditar meses o badges, no habilitar checkout Live ni confirmar lanzado/merged en main. `paidThrough=null` hasta prueba real de período y contrato; `mayGrantBenefits=false` por defecto.
