# PAZO F16 — Evidencia del proveedor LIVE y puente privado (19-oct-2026)

**Estado:** code-only en PR #44, ningún despliegue Live. HEAD de código auditado `bc0f6e3`, CI/7 PG17 labs 8/8 SUCCESS.

El contrato real de PayPal usa `GET /v1/billing/subscriptions/{id}` para comprobar el plan y la vinculación `custom_id`, y `GET /v1/billing/subscriptions/{id}/transactions?start_time=...&end_time=...` para comprobar la venta contra su ID exacto, estatus `COMPLETED`, USD 2.99 y hora. Según especificación PayPal, el detalle de transacción puede contener email/nombre del comprador; el lector **descarta esos campos**. Si faltan páginas, identidad, monto o estado, falla y no acredita períodos.

La composición sintética de webhooks primero verifica firma oficial PayPal Live, luego identifica el subscription ID del evento, recupera el owner/intent/generation del binding privado, vuelve a confirmar suscripción con el comerciante original y solo entonces registra el identificador mínimo del evento. La respuesta nunca concede beneficios. Una venta futura debe validarse de nuevo y recibir prueba independiente del ciclo de servicio antes de escribir período.

Se añadió `public.pazo_f16_live_service_binding_read(text)` en un archivo de migración **no aplicado**, con `GRANT EXECUTE` exclusivo de `service_role` y comprobación adicional del JWT de rol; el RPC devuelve únicamente owner UUID, intent, plan, subscription y merchant generation. Ningún rol tiene SELECT sobre las tablas privadas.

**Límites reales:**
- La firma y el GET de pruebas usan un `fetchImpl` simulado; la API real Live no fue llamada.
- No hay sesión de usuario conectada ni identidad comercial Live, webhook Live publicado ni venta de dinero real.
- `servicePeriodVerified=false` y `mayGrantBenefits=false` aun cuando se verifique un estado `COMPLETED`. La regla de período acreditable requiere correlación con el ciclo de facturación de PayPal y datos reales.
- `PARTIALLY_REFUNDED` requiere política de beneficios/contabilidad: se identifica como `holdReviewRequired`, nunca se revoca automáticamente desde el lector.
- La retención de consentimiento, auditoría y transacciones no está aprobada. Los 90 días aplican a IDs de webhook ya conciliados, no a todos los registros financieros.

Fuentes API: <https://developer.paypal.com/api/subscriptions/v1>, <https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/> y <https://developer.paypal.com/subscriptions/webhooks>. Consulta de estructura y estados, no prueba de comerciante.

**Gate siguiente:** autorización PO *explícita* para migraciones estructurales ya revisadas, con segundo gate para writer/Edge/Live. La versión pública permanece Sandbox/off.
