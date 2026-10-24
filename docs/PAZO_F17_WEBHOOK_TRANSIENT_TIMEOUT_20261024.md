# PAZO F17 — webhook readiness: timeout transitorio y mitigación local (24-oct-2026)

**Incidente real observado con lecturas no mutantes, sin datos privados publicados.** El 24-oct a las 16:01 UTC, el worker respondió HTTP 200 después de **8,719 ms**, mientras su lectura HTTP GET interna de readiness del webhook, acotada a `AbortSignal.timeout(8000)`, no llegó a producir una respuesta en los registros `function_edge_logs`. Las comprobaciones GET de las 16:00 y 16:02 UTC respondieron HTTP 200. El tick `pazo_f16_gradual_tick` anotó `webhook_unhealthy` a las 16:01:08 UTC, incidente resuelto a las 16:02:00 UTC. La campaña pasó a `paused_automatic` y requirió reanudación mediante Administración/MFA. El PO reanudó L1 a las 19:24:39 UTC; revisión posterior: `active/limited/cap1`, salud PASS, sin incidentes abiertos ni períodos pagados Live.

**Causa inmediata demostrada:** un fallo aislado de transporte/timeout durante el sondeo de disponibilidad. **Causa última de red/DNS/proveedor no determinada**; no es evidencia de una caída real de PayPal, ni de pérdida de webhooks financieros firmados. Un HTTP 200 de readiness tampoco prueba recepción de pagos; estas son protecciones separadas.

## Cambio propuesto (solo código, no desplegado)

- `webhookReadinessProbe.mjs`: conserva GET fijado al proyecto autorizado, sin redirecciones, sin caché y con comprobación estricta de `source`, `ready===true`, `mayGrantBenefits===false`.
- Ante **excepción de transporte** de la primera lectura de 8 segundos, hace **un único segundo GET** con timeout de 2.5 segundos. Una lectura exitosa y explícitamente saludable puede evitar la pausa por timeout aislado.
- Ante HTTP distinto de 200, estado `ready=false`, respuesta inesperada o JSON inválido, devuelve **false sin reintentar**.
- Ante fallos de ambas lecturas, devuelve **false**, con la misma ruta de protección `gradualTick` y pausa automática existente. No cachea un PASS, no inventa salud, no amplía cupos ni auto-reanuda.
- No se modifica `gradual_health`, el guard de checkout que verifica directamente el webhook, firma de PayPal, ledger, eventos, precio, MFA, SQL, migraciones ni configuración de producción. Worker hace la prueba únicamente después de completar el lote autenticado.
- El tiempo máximo adicional de comprobación en el caso de fallo de transporte queda acotado a **2.5 s** (8 s + 2.5 s); el tiempo de otros RPC no cambia.

## Pruebas

- Seis escenarios sintéticos offline ejecutados localmente con Node 22: **6/6 PASS** (readiness healthy, timeout aislado recuperado, timeout persistente, HTTP 503/ready=false, formato inválido, URL/clave inválidas).
- `npm run test:gradual` y workflows F16 gradual existentes deben validar la rama; no declarar CI completo antes de que GitHub informe SUCCESS.
- No se ha ejecutado un sondeo forzado en producción, ni compra, ni un deploy de este cambio.

## Gate

El PR de esta rama es una **propuesta de revisión**, no autorización para desplegar. Desplegar nueva función Edge `pazo-paypal-live-worker` requiere GO específico, comparación del bundle con la versión hospedada, CI completo y postflight de salud. Por riesgo financiero, cualquier anomalía inesperada mantiene pausa y conciliación; un timeout sostenido sigue pausando nuevas compras. No hacer `supabase db push` ni cambios de DDL sobre hosted.
