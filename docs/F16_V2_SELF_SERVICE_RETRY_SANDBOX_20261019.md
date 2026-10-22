# PAZO F16 — Reintento autónomo de checkout abandonado (solo Sandbox)
Fecha: 2026-10-19. Producto: PAZO. PO ordenó «hazlo» ante bloqueo después de abandonar login de PayPal.

## Estado
Implementado en PR #44 DRAFT, rama `f13/section-titles-20261012`. Sin cambios en main, PayPal Live, ni beneficios Live.
- SQL `supabase/migrations/20261019092000_f16_sandbox_v2_automatic_reconciled_retry.sql` **aplicada en Supabase Sandbox**, crea RPC de lectura de eventos CREATED para inicial + retry y RPC de concesión atómica de grants solo `service_role`, con bloqueo por owner, todos los registros previos append-only, sin falsa venta ni paidThrough.
- Edge `f16-paypal-supporter-v2-qa` **v19 ACTIVE**, `verify_jwt=true`; nueva acción `recover_retry` y recheck PayPal *antes de* `retry_begin` / provider-create. Las funciones existentes de PayPal Live y P06 no se modificaron.
- Frontend oferta `SupporterAccountManagement` con botón único `Pagar con PayPal`. Si `APPROVAL_PENDING` y PayPal permite recuperar, redirige al enlace original sin segundo POST. Si la solicitud terminó/PayPal confirmó ausencia con las evidencias requeridas, ofrece aceptar de nuevo los términos y efectuar un checkout único de prueba. Si no hay evidencia suficiente, informa resultado sin simular compra.
- `pazoSandboxV2RetryMerchantProof.mjs`: para terminal `CANCELLED/EXPIRED`, exige GET exacto con plan+custom_id, lista de transacciones cero y completa, signed CREATED y consulta completa de eventos; para GET `404`, exige además inventario comercial completo negativo en la misma app y eventos de PayPal completos sin activación/venta del ID. Consulta estado dos veces, revisa hasta 30 días y genera solo hash del conjunto verificado. El 404 **aislado** no da autorización. Si faltan datos, la operación falla cerrada.
- SQL rechaza pago o activación previos, owner no confirmado, intent no latest, plan distinto, pruebas >2 minutos, período demasiado antiguo, reintentos sin cerrar, grants inconsistentes y acceso público; bloquea concurrencia con advisory lock.
- Compra repetida exige **nuevo consentimiento explícito** por cada solicitud y vuelve a verificar el proveedor inmediatamente antes del POST. Si se paga, la acreditación continúa requiriendo venta merchant verificada, no redirección.

## Comprobaciones
CI + seis laboratorios: **7/7 SUCCESS** en commit `e387e466476ddfaf55785cc4963c3b4de3e1da44`. Pruebas `src/features/supporter/testing/f16SelfServiceRetryProof.test.mjs` cubren ausencia/terminal positivos y bloqueos: SALE, ACTIVATED, mismatch, inventario parcial, 404 solo, datos tardíos, paginación.
La instalación SQL no crea grants por sí sola. Después de desplegar, verificar mediante SQL de solo lectura que los conteos originales de `retries`, `grants` y `paid_periods` no cambien, así como ACL y versión Edge.

## Gates pendientes
- **NO afirmar E2E_PASS** hasta probar con la misma cuenta existente en localhost:5173: abandonar antes de aprobar, pulsar Pagar con PayPal, reusar original o pasar a formulario de nuevo consentimiento; aprobar personalmente en PayPal Sandbox, regresar, verificar UNA suscripción pagada/activada y ausencia de doble venta.
- La semántica de `MERCHANT_CONFIRMED_ABSENT` es exclusivamente QA Sandbox. No portar a Live automáticamente; requiere política antifraude, reconciliación comercial de largo plazo y ventana de caducidad en producción.
- Si PayPal no devuelve inventario/eventos íntegros para ese usuario o el webhook CREATED firmado no se correlaciona, la recuperación continúa bloqueada por diseño y debe investigarse la evidencia concreta, no habilitar bypass de pago.
- Si la solicitud sigue `APPROVAL_PENDING` pero perdió el enlace, la ruta no cancela ni recrea automáticamente (necesita confirmación explícita); el usuario puede abrir controles de la misma solicitud. Mejorar esta rama tras E2E inicial.
- Mantener control en Lab/Sandbox. No merge de #44 ni activar Live sin gates nuevos.
