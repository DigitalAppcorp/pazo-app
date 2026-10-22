# PAZO — F16-P14: cancelación y descarga de términos aceptados (DRAFT)

**2026-10-15; PR #44 DRAFT; core PAZO gratuito; Amigo USD 2.99/mes opcional desactivado.**

## Código implementado

- `p14SandboxSupporterAccountHandler.mjs`: orquestador de servidor sin entrada desplegada, acciones HTTP POST `status`, `cancel` y `acknowledgement` para el mismo titular autenticado. Reutiliza el P06 Cancellation Handler y Provider para `status/cancel`, así conserva la comprobación del PayPal subscription ID/plan/custom_id por GET antes de mutar, POST cancel explícito y GET posterior para confirmar el estado; no registra pago ni concede acceso. CORS restringido a orígenes HTTPS exactos, preflight limitado a POST+Authorization+Content-Type; payload máximo 2KB, rechazo de campos no previstos y de información de otro titular.
- `supabase/drafts/f16_p14_checkout_acknowledgement_DO_NOT_APPLY.sql`: función `public.f16_p14_read_owner_checkout_acknowledgement(uuid,text)` PRIVILEGIADA solo service_role y guard de base `f14_synthetic`; read-only sobre P06 `checkout_attempts`, `offers`, `subscription_intents`. Exige misma cuenta/intent, texto publicado en el momento de aceptar, digest inmutable exacto, plan mensual de USD 2.99. Devuelve datos únicamente al servicio backend autenticado, no al navegador directo. Este borrador se probará como paso DESPUÉS del bundle P12 y NO está incorporado a una migración instalable.
- `p06CheckoutConsentStore.mjs`: nuevo `readAcknowledgementForOwner` con UUID/intent y validación fuerte, de salida minimizada.
- Acción `acknowledgement`: Auth validada en servidor + admisión de tasa, proyecta texto ES/EN exacto históricamente aceptado, versión, SHA-256 y fecha servidor ISO UTC, en documento descargable `text/plain; charset=utf-8`, `content-disposition: attachment`, `Cache-Control:no-store`. Separa de forma explícita el **consentimiento** de la prueba de pago y de la entrega automática de recibo. No expone IDs de Auth, intent, PayPal subscription ni pagos en el documento.

## Pruebas y garantías

- `f16P14SupporterAccountHandler.test.mjs`: combina GET status/POST cancel mediante servidor mock con descarga de consentimiento bajo Auth, incluso si PayPal está `CANCELLED` o el intent fue `pending`; evita filtrar documentos entre cuentas, campos arbitarios, locale no válido, uso desde orígenes desconocidos, falla cerrada y demuestra que no aparecen IDs financieros en respuesta.
- `p14-checkout-acknowledgement-synthetic.sql`: en PostgreSQL17 desechable confirma GRANT solo a service_role, lectura únicamente del owner, verificación de digest/texto/fecha, conservación de versión v1 aunque exista oferta v2, ledger cero y stub `wall_has_verified_entitlement=false`. Test nuevo en job `f16-p12-staged-install` después del bundle P12. Primer commit técnico [5e977ed](https://github.com/DigitalAppcorp/pazo-app/commit/5e977eddc19fb984075555703bd91d81801a56f6): **CI general SUCCESS, f16-p12-staged-install SUCCESS, F16 Disposable PostgreSQL Lab SUCCESS**.

## Qué falta para una cancelación online verdaderamente operativa

1. **Términos aprobados ES/EN:** P13 es solo borrador, no publicar marcadores pendientes ni ofrecer recompensas aún no operativas.
2. **GO explícito de SQL hosted Sandbox y migración versionada:** instalar P12 y P14 solo después de revisión legal, retención y permisos, con postflight de RPC. `DO_NOT_APPLY` no se puede ejecutar directamente en hosted. Cero nuevas ofertas P06 publicadas hoy.
3. **GO separado de Edge:** montar un endpoint real detrás de sesión `getUser`, el límite de tasa real y CORS de dominio aprobado; no desplegar ni integrar la ruta directamente en el receptor público de webhooks. Mantener secreto PayPal/Supabase solo en servidor.
4. **UI real de cuenta:** acceso visible y no obstructivo a «Cancelar renovación» y «Descargar aceptación» desde la app, con estado de carga/error, confirmación explícita de cancelar, sin pago verificado asumido. Cumplir la regla de diseño sin contornos y conservar estados accesibles.
5. **Entrega efectivamente realizada:** después de aceptar una oferta real, entregar automáticamente acuse durable ES/EN y mecanismo para reabrir/descargarlo. La descarga protegida actual **NO prueba entrega automática**, recepción de email ni confirmación conservable enviada.
6. **Finanzas y beneficios:** ledger/periodo contractual P05, refs de reversos/chargebacks/disputas, re-suscripción y retención contable pendientes; cancelar detiene renovaciones, pero no revoca un período pagado real. Todos los resultados siguen `paidThrough:null`, `mayGrantBenefits:false`.

**Ningún cambio hosted ni petición real PayPal durante P14.** Product Owner no ha autorizado instalación de SQL, Edge, emisión de aceptación a usuarios, PayPal buyers nuevos, Live, merge o beneficios.
