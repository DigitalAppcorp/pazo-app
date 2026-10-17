# PAZO F16-P28 — gestor de secretos: preflight alojado de solo lectura

Estado: REVIEW ONLY / NO-GO. No se han creado secretos ni migraciones nuevas.

## Evidencia observada
- GitHub Actions de 17a39da: CI y PostgreSQL descartable SUCCESS.
- En Supabase alojado: extensión pgcrypto instalada en esquema `extensions`;
  extensión supabase_vault instalada en esquema `vault`.
- La presencia de extensiones NO demuestra que una clave esté provisionada,
  ni que Edge y PostgreSQL puedan acceder a ella de forma segura.

## Diseño recomendado para revisión
- Clave HMAC aleatoria, generada fuera del repositorio y separada por
  ambiente; nunca en SQL de migración, fixtures alojados, headers de cliente
  ni mensajes de error.
- Versionar alias/identificador en tabla privada de auditoría sin guardar
  el material secreto; exactamente una versión activa.
- El código de Edge debe tomar la clave solo de un almacén de secretos
  autorizado, mientras PostgreSQL debe verificar su HMAC desde una
  frontera privada revisada y auditable.
- Si se evalúa Vault, verificar primero permisos efectivos para consultar
  el secreto, minimización de privilegios, filtración por SECURITY DEFINER,
  política de rotación y plan de recuperación. No asumir que Vault y los
  secretos de funciones Edge son el mismo almacén.
- Rotación: bloquear nuevas lecturas, provisionar vN+1, comprobar HMAC
  con evento ficticio, activar atómicamente una versión, revocar vN,
  cancelar solicitudes incompatibles y guardar evidencias sin secretos.
- Fallo cerrado ante cualquier clave faltante, alias desconocido, clave
  revocada, discrepancia o indisponibilidad del gestor.

## Aprobaciones pendientes
1. Revisión de privacidad y retención para huellas y auditorías.
2. Modelo efectivo de privilegios y custodia del secreto.
3. Plan de sincronización Edge/Postgres sin transmitir claves al cliente.
4. Migración independiente para key_version y consumed_at en tabla alojada.
5. RPC final validada en PG17 con pruebas adversariales, concurrencia y
   rechazo de reutilización; autorización explícita PO antes de instalar.
6. Aprobación específica y separada para cualquier endpoint habilitado.

No desplegar funciones, claves reales, lector histórico, cobros ni beneficios.
