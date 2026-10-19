# PAZO — F16: migración privada Live INERTE, pendiente de autorización
Fecha: 2026-10-19. PR #44 DRAFT. **Código en GitHub, no aplicado en Supabase.**

## Qué prepara
Migración versionada: `supabase/migrations/20261019234100_pazo_f16_live_gateway_inert_private_staging.sql`.

- Siete tablas del modelo original de comerciante/plan/generación, selector de nuevas compras, bitácora admin, consentimiento/intento Live, eventos verificados, ventas y reversos.
- Dos tablas adicionales: solicitud de cancelación única por suscripción e informe de evidencia para eventual conmutación.
- Funciones privadas para consulta de períodos, reclamo de cancelación y cambio atómico/stop de nuevas compras; **ninguna** tiene permiso EXECUTE otorgado a `anon`, `authenticated` o `service_role`.
- Todas las tablas tienen RLS ENABLE + FORCE y REVOKE de acceso a cliente y servicio; ningún rol de navegador puede leer secretos de Vault.
- El selector nuevo está **forzado por CHECK a Sandbox, Live OFF, parada de emergencia activa, generación nula**, y se verifica dentro de la misma transacción SQL.
- Exige que `admin_private.paypal_gateway_runtime` siga Sandbox/Live OFF y que exista `admin_private.admin_grants` antes de instalar.
- No modifica el `paypal_gateway_runtime` anterior, las funciones Edge, la pasarela Sandbox, las suscripciones existentes, la tabla de inbox Sandbox ni `main`.

## Pruebas
`scripts/f16-live-gateway-disposable-lab.sql` ejecuta **este mismo archivo de migración**, no otra definición distinta, en PostgreSQL 17 descartable. Comprueba RLS, ausencia de grants, integridad de períodos y eventos SALE, protección de propietario/comerciante, reembolsos, idempotencia de cancelación y auditoría CAS. La simulación de cambio a Live quita restricciones **solo dentro de PostgreSQL descartable** para verificar el mecanismo futuro; esas operaciones NO están en la migración de despliegue real.

## Gobernanza de datos
Se propone conservar exclusivamente Auth UUID, aceptación/digest y clave de idempotencia, IDs PayPal opacos, entorno/generación de merchant, periodos y reversos, y evidencia administrativa con hash. Nunca payload completo, correo del pagador, tarjeta, dirección, IP, datos de localización ni credenciales. Debe acordarse retención, justificación contable, acceso/borrado, backups y excepciones por disputas **ANTES de guardar registros de compradores reales**. La retención ya acordada de 90 días cubre IDs de webhooks conciliados, no autoriza automáticamente eliminación de períodos ni consentimientos.

## Lo que no hace y siguientes gates
Este archivo **no habilita pagos ni permite siquiera ejecutar las RPC de escritura desde la función de servicio**. Faltan adaptadores backend y una futura migración/grant específicos para llamadas service-role limitadas, correlación PayPal → propietario, firma→buzón y venta→período/hold. También falta conciliación histórica del inbox Sandbox.

Antes de instalar: mostrar al PO SQL, consecuencias para datos/retención, preflight READ-ONLY del proyecto y pedir autorización específica. Después de instalar: revisar tablas vacías, grants/ACL, selector OFF y comprobar que los endpoints Sandbox conserven exactamente su versión. Cada despliegue Edge o habilitación de escritura es **otro gate independiente**.

No usar esta preparación como evidencia de que PayPal Live puede activarse hoy desde el panel.
