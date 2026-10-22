# F16-P28 — propuesta de frontera criptográfica SQL (solo revisión)

Estado: **NO-GO para Supabase alojado**. No instalar claves, RPC ni endpoint con este documento.

## Problema
La RPC de laboratorio consume `request_id` una sola vez, pero compara una
huella aportada por `service_role`; no verifica que
`event_fingerprint = HMAC_SHA256(clave, event_id)`. Un cliente privilegiado
puede intercambiar el identificador de evento sin cambiar la huella.

## Opción preferida para prueba aislada
- Emplear `pgcrypto.hmac(data, key, 'sha256')` y `encode(..., 'hex')`.
- Definir un secreto **exclusivamente sintético** en la base PG17 descartable,
  inaccesible para `anon`, `authenticated` y `service_role`.
- En la misma operación atómica, comparar HMAC calculado por PostgreSQL con
  la huella ya almacenada en el registro privado de auditoría.
- No devolver ID, importe, correo, suscripción ni datos personales; retornar
  indicador mínimo de elegibilidad sujeto a revisión de privacidad.
- En la primera lectura, consumir la autorización de forma irreversible. En
  repetición o concurrencia, denegar sin exponer datos.
- El secreto sintético nunca debe reutilizarse fuera de pruebas.
- Añadir casos negativos: evento A auditado / evento B solicitado, huella falsa,
  secreto ausente, intento repetido y dos transacciones concurrentes.

## Decisiones pendientes antes de código alojado
1. Gestionar una clave real mediante un mecanismo aprobado, con permisos
   efectivos, rotación, respaldo, auditoría y procedimiento de revocación.
2. Definir cómo el emisor Edge y PostgreSQL obtendrán exactamente la misma
   clave, sin incluirla en migraciones, repositorio, logs ni payloads.
3. Confirmar disponibilidad y esquema exacto de `pgcrypto.hmac` en cada
   ambiente, y ausencia de accesos indirectos por funciones SECURITY DEFINER.
4. Diseñar respuesta ante rotación: versión de clave por fila o expiración
   explícita de solicitudes anteriores. Nunca usar fallback silencioso.
5. Revisar retención, base legal y acceso administrativo con gobernanza.
6. Requerir aprobación separada del Product Owner para cada migración
   alojada y para habilitar el endpoint.

## Invariante
Ninguna consulta histórica sin vínculo criptográfico evento↔auditoría
**verificado dentro de la frontera de confianza de PostgreSQL**, consumo
atómico de un solo uso y autorización administrativa explícita.

No hay cambios en worker, pagos, PayPal o beneficios.
