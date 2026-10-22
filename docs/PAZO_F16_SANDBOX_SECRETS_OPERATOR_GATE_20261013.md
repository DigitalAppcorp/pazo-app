# PAZO F16 — Configuración aprobada de secretos PayPal Sandbox

## Gate OAuth Sandbox real verificado (2026-10-14 UTC)

El PO aprobó la verificación OAuth **únicamente de Sandbox** y se ejecutó desde Supabase Edge, usando directamente las credenciales `PAZO_F16_PAYPAL_*` previamente guardadas. La solicitud se dirigió a `https://api-m.sandbox.paypal.com/v1/oauth2/token` con `grant_type=client_credentials`. **PASS real de servidor:** PayPal emitió una respuesta OAuth con un access token y tipo Bearer válidos. No se expusieron ni almacenaron client ID, client secret o token, no se inició checkout ni se envió solicitud Live.

Evidencia: [GitHub Actions OAuth #38519508312 — rerun SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38519508312). El diagnóstico temporal de Edge estuvo limitado por reto, expiración y una sola solicitud por instancia, y nunca aceptó webhooks. **Se restauró la Edge a v10**, misma lógica que la v7 namespaced, con `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`; [HTTP GET/POST 503 #38519702384 PASS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38519702384). Se eliminó el workflow temporal tras el resultado.

Postflight Supabase: cuatro tablas financieras F16 0 filas, `wall_has_verified_entitlement(NULL)=false`, las otras tres Edge sin cambios (v35/v47/v34). Las claves `PAYPAL_*` genéricas legacy, secretos y webhook de PayPal no se modificaron.

**Límite:** autenticación exitosa **NO** demuestra que el plan y el webhook pertenezcan a la app merchant Sandbox, ni verifica firmas de entrega reales. Debe autorizarse una consulta de **solo lectura** para comprobar esa correspondencia; todavía no se autorizaron activación de webhook, cobros ni membresías.


**Gate del PO:** autorizó configurar los cinco secretos **exclusivos F16**, sin activar Edge, mover webhook, cambiar el plan, cobrar ni conceder membresías.

**Estado de ejecución:** usuario confirmó cinco secretos guardados en Supabase; valores y OAuth aún no verificados técnicamente. El conector Supabase de ChatGPT permite auditar funciones, pero actualmente **no dispone de acciones para escribir ni listar secretos Edge**. No declarar la configuración completada sin comprobación posterior en la interfaz. Nunca pedir credenciales en este chat ni ponerlas en GitHub, CI, documentos, screenshots o consola.

## Confirmación posterior: Edge F16 namespaced v7 publicada (2026-10-14 UTC)

El PO autorizó exclusivamente **redeploy inerte** con el nuevo lector de `PAZO_F16_PAYPAL_*`; se aplicó **versión 7** a `f16-paypal-webhook` (sin tocar otras funciones, secretos ni PayPal). `get_edge_function` confirmó código de preflight namespaced y `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`; HTTP externo real GET y POST vacío devolvieron **503** con `f16_receiver_not_released` en [GitHub Actions #38518547361](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38518547361). El workflow de prueba ya fue eliminado. Tablas F16 con 0 registros, `wall_has_verified_entitlement(NULL)=false`.

**Sin verificar aún:** los valores de los cinco secretos y que el Client ID/Secret autentiquen realmente con PayPal Sandbox; el conector no puede leerlos. La próxima validación OAuth requiere otro gate y nunca debe exponer el token. El receptor sigue sin procesar webhooks ni pagos.

## Confirmación del Product Owner — cinco secretos guardados (2026-10-13 LA)

El usuario confirmó expresamente: **«listo, implementadas las 5»**. Se registra como **confirmación del operador de que guardó cinco variables en Supabase**. El conector Supabase actual no lista ni revela secretos; por lo tanto, la existencia, los valores, la cuenta mercantil Sandbox y el éxito de OAuth **NO ESTÁN VERIFICADOS TÉCNICAMENTE**. No usar esta confirmación como prueba de autenticación PayPal o autorización de recepción.

### Preflight posterior a su confirmación

- Hosted `f16-paypal-webhook`: versión **6** según `list_edge_functions`, `verify_jwt=false`. Fuente alojada inspeccionada con `get_edge_function`: `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`, responde `f16_receiver_not_released`; **inactiva para procesar webhooks**. Su `receiver.mjs` todavía lee nombres genéricos `PAYPAL_*` porque es código de despliegue anterior.
- Branch GitHub `f13/section-titles-20261012`: `receiver.mjs` y `sandboxConfigPreflight.mjs` exigen los **nombres aislados** `PAZO_F16_PAYPAL_*`; no se ha redeplegado este nuevo código, y el latch permanece apagado.
- En Supabase alojado, las cuatro tablas F16 siguen con **0 filas** y `wall_has_verified_entitlement(NULL)=false`.
- Los secretos genéricos que usa `paypal-webhook` legacy v35 y la URL/eventos en PayPal **no se han modificado en esta operación por el asistente**.

**Siguiente gate de despliegue, requiere autorización PO independiente:** publicar la versión namespaced manteniendo explícitamente `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`; probar 503 y cero escrituras sin acceder a credenciales. Un gate separado posterior deberá verificar en servidor el OAuth de Sandbox de forma protegida y sin mostrar secretos; activar el webhook, modificar el destino PayPal, procesar cobros o dar membresías no están autorizados.

## Dónde se introducen

- [Supabase — PAZO, Edge Function Secrets](https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/functions/secrets)
- [PayPal Developer — Apps & Credentials](https://developer.paypal.com/dashboard/applications/sandbox)

Abrir la aplicación **Sandbox** existente de PayPal que es dueña del plan `P-14V25407JP6850922NLHMDKI` y el webhook `6N7889790V1467139`. Confirmar que pertenecen a la misma REST app y cuenta merchant Sandbox. No crear otra aplicación, no pasar a Live y no crear un webhook adicional por defecto.

En la pantalla **Edge Function Secrets** del proyecto `mrybvqdebbgcayuvgkkr`, usar **Key**, **Value**, **Add another** y **Save**. Crear o revisar exactamente lo siguiente, sin modificar los nombres genéricos antiguos:

| Key en Supabase | Value |
| --- | --- |
| `PAZO_F16_PAYPAL_ENV` | `sandbox` |
| `PAZO_F16_PAYPAL_WEBHOOK_ID` | `6N7889790V1467139` |
| `PAZO_F16_PAYPAL_PLAN_ID` | `P-14V25407JP6850922NLHMDKI` |
| `PAZO_F16_PAYPAL_CLIENT_ID` | Client ID de la aplicación REST **Sandbox existente** en PayPal Developer |
| `PAZO_F16_PAYPAL_CLIENT_SECRET` | Client Secret de **esa misma aplicación Sandbox** |

## Salvaguardas

- **NO modificar** `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` ni `PAYPAL_PLAN_ID`: la Edge `paypal-webhook` antigua v30 **también los lee** y son compartidos por el proyecto.
- **NO crear** `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY`: el runtime los aporta automáticamente y `SUPABASE_` es prefijo reservado.
- Los valores de Client ID y Client Secret **no deben copiarse al chat**. Tampoco capturas donde se vean, ni logs, ni `.env` versionados.
- Supabase requiere rol de **Owner o Administrator** para crear/editar secretos. Una función desplegada puede leer un secreto nuevo inmediatamente, sin redeploy; **F16 seguirá dando 503** gracias al latch `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`.
- Los secretos F16 namespaced también están disponibles dentro del proyecto para otras funciones: se mantienen diferentes para evitar colisiones. No hay aislamiento criptográfico por función.
- Si ya existe alguna key F16, revisar su nombre y cuenta Sandbox; no sobrescribir sin saber a qué app pertenece.

## Después de guardar

1. Confirmar en Supabase **solo que aparecen los cinco nombres exactos**, sin enviar sus valores.
2. Responder al chat únicamente `Listo, cinco nombres guardados` (nunca credenciales ni valores).
3. El asistente validará el estado de las funciones y confirmará que no cambió ningún dato financiero. Como el conector no permite leer secretos, la existencia de nombres solo puede ser comprobada por un operador o por un diagnóstico servidor después de un gate separado.
4. **El siguiente GO es independiente:** actualización inerte para sincronizar en hosted el código que lee `PAZO_F16_PAYPAL_*`, o diagnóstico protegido de OAuth Sandbox sin divulgar credenciales; activar receptor y corregir webhook son gates posteriores distintos.

## Fuentes verificadas

- [Supabase, Environment variables y Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets) — Dashboard, roles requeridos, prefijo reservado e inyección de keys.
- [PayPal, Get started with REST API — Apps & Credentials](https://developer.paypal.com/api/get-started/) — obtención de Client ID/Secret y distinción Sandbox/Live.
- [Runbook de activación F16](PAZO_F16_WEBHOOK_SANDBOX_DEPLOY_RUNBOOK_20261014.md) — despliegue, rollback y pruebas Sandbox.
