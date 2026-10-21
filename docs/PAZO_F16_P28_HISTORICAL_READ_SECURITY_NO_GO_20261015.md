# F16-P28 — preflight de instalación de lectura histórica (NO-GO)
Fecha: 2026-10-15. PR #44, rama f13/section-titles-20261012.

## Estado comprobado
- CI del commit 7c5e175: general y laboratorio PostgreSQL SUCCESS.
- Auditoría privada HMAC alojada instalada; lectura histórica aún NO instalada.
- Endpoint operador alojado v2 fijado en enabled=false, worker P21 OFF y sin habilitación de pagos.

## Riesgo pendiente — identidad de evento
La RPC propuesta f16_p28_read_historical_candidate_exact acepta
p_event_id y p_event_fingerprint y compara la huella contra la fila
p28_historical_read_audit para p_request_id. **La base de datos no
recalcula ni verifica por sí misma que la huella corresponda al
p_event_id pedido.** Un consumidor privilegiado que suministre una
huella registrada y un event ID distinto podría recibir metadatos de
otro evento elegible. Las pruebas anteriores solamente verificaron
que las huellas suministradas coincidieran entre ambos argumentos,
no la correspondencia criptográfica con el evento.

Este no es un bug de autorización para anon/authenticated (la RPC
está restringida a service_role), pero impide afirmar que existe
atadura criptográfica end-to-end y no debe habilitarse una ruta
que permita peticiones de ID arbitrarias sin mitigación explícita.

## Condiciones de desbloqueo
1. Diseñar y probar validación criptográfica de correspondencia
   evento↔huella bajo frontera de confianza: HMAC recalculado por
   servicio privilegiado que no acepte huellas del solicitante, o
   verificación DB con secreto protegido y gestión/rotación aprobada.
2. Prueba adversarial concreta: auditoría válida del evento A,
   intentar leer evento B con la misma requestId/huella => NEGADO.
3. Definir si una solicitud auditada permite una sola lectura;
   hoy se permite reutilizar el mismo par requestId/huella.
4. Reconciliar auditoría y lector sin modificar inbox, worker ni ledger.
5. PO GO específico para cualquier nuevo DDL hosted / despliegue y
   autorización separada para activar lecturas.

No instalar el borrador del laboratorio (incluye guard disposable)
en Supabase alojado. No habilitar worker, PayPal, ni beneficios.
