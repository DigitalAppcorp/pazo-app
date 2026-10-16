# F16-P37 — activación: bloqueo del contrato inbox (NO-GO alojado)

2026-10-15. El adaptador P37 de laboratorio consume una prueba de claim de
activación con campos `id,type,processingState,subscriptionId,signatureVerified,
source,leaseCurrent`. Son datos sintéticos de interfaz; **no existen como
resultado íntegro de la RPC P21 alojada**.

La RPC P21 `f16_p05_draft_read_claimed_event(event_id,claim_token)` devuelve
solamente `id,type,verifiedAt,processingState` bajo gate y lease.
No devuelve `subscriptionId`, certificación `signatureVerified`, ni
`source/leaseCurrent`. Aunque un evento se encuentre en inbox verificado,
el lector no acredita por sí solo la identidad de la suscripción.

Antes de integrar P37 en el servidor:
1. Auditar esquema real de firma verificada, evento de activación y vínculo
   Auth-owner/intent/subscription (sin devolver datos personales).
2. Diseñar nueva RPC de lectura de activación con claim vigente, cutoff y
   validación de origen verificado; prohibir suplantación de subscriptionId.
3. Probar en PG17 que sin lease, con claim de otro evento, evento no firmado,
   dueño incorrecto o suscripción distinta se devuelve NULL.
4. Revalidar PayPal Merchant GET con ID exacto y prueba independiente de
   suscripción. Una simple respuesta de mock no equivale a firma PayPal.
5. Solicitar GO independiente para SQL hosted, worker y lecturas reales.

P37 está deshabilitado por defecto y devuelve null si el contrato no
incluye esta evidencia; no pasar datos inventados desde el caller.
P28 diferido; no cambios financieros, DDL ni pagos autorizados.
