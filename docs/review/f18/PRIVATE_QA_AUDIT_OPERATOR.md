# PAZO F18 — Ejecución privada de auditoría PayPal, una sola vez

## Objetivo

Obtener evidencia del **contrato original** mediante la acción existente
`qa_audit` del trabajador privado: plan, consulta de suscripción y GET del
evento de PayPal. No iniciar otro checkout ni cancelar o confirmar un pago.
El diagnóstico inicial del 2026-10-26 03:02:38 UTC fue 404
`RESOURCE_NOT_FOUND` en la suscripción original. Un 404 **no** demuestra
cancelación ni ausencia de actividad financiera.

## Condiciones para ejecutar

- Solo el operador autorizado, en un equipo/entorno seguro que **ya posea**
  el invocador privado vigente en su almacén de secretos aprobado.
- Nunca imprimir, pegar en GitHub, mensajes, terminal compartida o historial
  de comandos el invocador ni credenciales PayPal. No buscarlo mediante SQL
  ni copiarlo desde la base de datos al chat.
- No establecer un valor ficticio, rotar credenciales, crear accesos anónimos
  ni eludir la admisión del trabajador.
- Verificar que el incidente #112 continúa aislado y que no hay operación
  de reconciliación en paralelo.
- `qa_audit` realiza GET externos de evidencia. La admisión/finalización
  del lote del worker puede actualizar **metadatos operativos de lease**;
  **no** es una transacción SQL estrictamente sin escrituras.
- La acción es exclusivamente `qa_audit`, no `qa_reconcile` o `drain`.

## PowerShell (Windows), dentro del repositorio PAZO

Si el entorno seguro ya suministra `PAZO_F18_WORKER_INVOKER` a la sesión
de proceso sin exposición:

```powershell
$env:PAZO_F18_QA_AUDIT_ONCE = "AUTHORIZED"
node .\scripts\f18-paypal-qa-audit-once.mjs
Remove-Item Env:PAZO_F18_QA_AUDIT_ONCE -ErrorAction SilentlyContinue
Remove-Item Env:PAZO_F18_WORKER_INVOKER -ErrorAction SilentlyContinue
```

Si el token no está disponible, **detenerse**. El comando devuelve
`private_invoker_not_available` y no llama a PayPal. No compartir el
secreto para desbloquear el procedimiento.

## Interpretación

- `invocationSucceeded=true`: se ejecutó la acción `qa_audit` y se
  obtuvo su resultado depurado. **No** implica `evidenceComplete=true`.
- `evidenceComplete=false`, `providerHttpStatus=404`: no existe
  verificación completa de la suscripción original; revisar de manera
  independiente `eventReadable` y `signedEventMatches`.
- `eventReadable=true` y `signedEventMatches=true` prueban que el evento
  original aún es consultable y coincide con el comprobante firmado. **No**
  prueban pago.
- Un error de red, 403, `audit_not_executed` o un estado desconocido no
  autoriza cierre ni nuevo cobro.
- El comando jamás imprime el PayPal debug ID, cuerpo del proveedor,
  identificadores personales ni la credencial de invocación.

## Gates posteriores

1. Registrar solo los campos depurados en el incidente #112, sin datos privados.
2. Mantener HELD / financial_review, checkout OFF e invitaciones OFF hasta
   evidencia financiera suficiente y reconciliación individual autorizada.
3. El PR preventivo #115 es independiente: no liberar un HELD porque haya
   pasado CI del código.
4. No automatizar reintentos ni habilitar producción a partir de un 404.
