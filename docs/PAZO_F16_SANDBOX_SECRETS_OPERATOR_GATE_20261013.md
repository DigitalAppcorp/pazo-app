# PAZO F16 — Configuración aprobada de secretos PayPal Sandbox

**Gate del PO:** autorizó configurar los cinco secretos **exclusivos F16**, sin activar Edge, mover webhook, cambiar el plan, cobrar ni conceder membresías.

**Estado de ejecución:** preparación y guía completadas, **ingreso de secretos en Supabase PENDIENTE**. El conector Supabase de ChatGPT permite auditar funciones, pero actualmente **no dispone de acciones para escribir ni listar secretos Edge**. No declarar la configuración completada sin comprobación posterior en la interfaz. Nunca pedir credenciales en este chat ni ponerlas en GitHub, CI, documentos, screenshots o consola.

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
