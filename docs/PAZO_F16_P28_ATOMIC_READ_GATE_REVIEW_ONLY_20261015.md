# F16-P28 — diseño de cierre para lectura histórica de un solo uso (LAB ONLY)

Estado: propuesta técnica, **NO-GO hosted**. Autorización para DDL/despliegue adicional: no concedida.

## Hallazgos verificados
- CI 38849102639 y laboratorio PG17 38849102542: PASS.
- La auditoría alojada actual confirma persistencia inicial por request_id y event_fingerprint; no registra consumo, no permite reintento de la misma solicitud y no prueba por sí misma la relación matemática HMAC(event_id).
- La RPC histórica de laboratorio acepta p_event_id, p_request_id, p_event_fingerprint arbitrarios de service_role. La coincidencia en audit(request_id,fingerprint) NO implica que fingerprint=HMAC(event_id).
- El lector de servidor ahora recalcula HMAC, lo que protege ese camino de ejecución, **pero no cualquier otra llamada privilegiada a la RPC**.
- El diseño actual devuelve metadatos al servicio, aunque la respuesta pública esté redactada. Para reducir superficie, evaluar devolver únicamente un indicador booleano de elegibilidad.

## Propuesta separada
1. Mantener el endpoint deshabilitado y secreto HMAC fuera de la BD.
2. Reemplazar la RPC de consulta por **una sola RPC atómica** que consume request_id una sola vez, comprueba la fila auditada y elegibilidad antes de emitir un resultado mínimo. No permitir segunda ejecución ni concurrencia; usar UPDATE ... WHERE consumed_at IS NULL ... RETURNING en transacción.
3. Nunca aceptar huella del operador: derivar HMAC dentro de servicio y pasarla solo desde composición cerrada. Documentar que service_role es frontera de confianza y que el SQL no autentica esa correspondencia.
4. Si se requiere garantía DB independiente de callers service_role, diseñar verificación HMAC dentro de la BD con clave administrada allí **o** un mecanismo de token firmado verificable por la BD. Esto requiere análisis de gestión de secretos, rotación y permisos; ninguna opción está aprobada.
5. Pruebas adversariales obligatorias: evento A auditado → evento B denegado a través del servicio; repetición mismo requestId denegada; dos sesiones simultáneas exactamente una respuesta exitosa; fallos de conexión y reintentos denegados; roles anon/authenticated sin EXECUTE.
6. Ensayar toda migración en PostgreSQL descartable y solicitar autorización PO específica antes de alojarla.

## Restricciones
No tocar worker P21, PayPal, tabla de pagos, atribución de beneficios ni habilitar endpoints. No reutilizar la actual SQL de laboratorio como migración alojada.
