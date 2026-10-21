# PAZO F16-P28 — protocolo de rotación HMAC (REVIEW ONLY, NO-GO alojado)

## Objetivo y frontera
La huella histórica debe usar HMAC-SHA256(eventId) con una clave no expuesta a clientes.
La generación del servidor y la comprobación de PostgreSQL deben referenciar **una
versión explícita e idéntica**. La clave real nunca debe formar parte del repositorio,
una migración, un payload, los logs ni la respuesta RPC.

## Protocolo propuesto
1. Provisionar versión `vN` en gestor de secretos autorizado, con control de
   acceso y auditoría separados para Edge y PostgreSQL. Registrar solo alias/versión.
2. Verificar en un preflight aislado que ambos lados derivan igual HMAC con una
   referencia sintética, sin revelar la clave real.
3. Admitir solicitudes nuevas únicamente de la versión declarada activa.
   Cada auditoría debe persistir `key_version` junto a la huella.
4. Durante rotación, bloquear nuevas solicitudes, decidir si cancelar de forma
   segura auditorías pendientes de la versión anterior, y habilitar `vN+1`
   solamente tras comprobar correspondencia. Nunca probar claves antiguas por
   fallback silencioso.
5. Revocar la versión anterior y demostrar que sus solicitudes no se pueden
   utilizar. Conservar el registro pseudónimo por el plazo aprobado; definir
   retención y eliminación de forma expresa.
6. Ante error, versión desconocida o ausencia de secreto: denegar antes de leer.
   No efectuar recuperación automática de claves ni acciones financieras.

## Riesgos abiertos
- La función PG17 actual incluye una cadena clave **sintética en código** y
  no es migrable a alojado.
- Auditoría alojada actual NO tiene columna `key_version` ni `consumed_at`.
  Cualquier ajuste requiere migración nueva con aprobación explícita.
- No hay mecanismo aprobado para compartir una clave segura entre Edge y
  PostgreSQL (Vault/pgcrypto requieren análisis de permisos y rotación).
- La prueba de rotación JS no valida sincronía real con gestor de secretos.
- Seguridad, retención y consentimiento de datos pseudónimos por revisar.

## Gate
No aplicar SQL histórico, no configurar secretos reales y no activar endpoint
hasta resolver permisos/retención, integración de gestor de secretos,
versión en registro de auditoría y pruebas adversariales concurrentes.
