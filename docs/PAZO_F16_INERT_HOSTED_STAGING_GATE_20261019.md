> **HOSTED F16 STAGING — 2026-10-19, GO del Product Owner ejecutado (solo infraestructura).** Cinco migraciones PostgreSQL aplicadas en `mrybvqdebbgcayuvgkkr`; versiones registradas: `20261019235351`, `20261019235426`, `20261019235455`, `20261019235525`, `20261019235552`. Todas las nueve tablas privadas están FORCE RLS, vacías y sin SELECT de anon/auth/service_role. Las funciones financieras privadas no otorgan EXECUTE a anon/auth/service_role. Solo `public.pazo_f16_live_service_binding_read(text)` otorga EXECUTE a `service_role` para lectura mínima. Ambos selectores siguen `sandbox/live_enabled=false`; nuevo selector `kill_switch=true` sin generación. Sandbox preserva 2 períodos QA y 26 eventos. No se desplegó Edge Live, no se generó dinero ni hubo merge. La captura de datos financieros Live y el gateway permanecen OFF; son pendientes independientes la autenticación provider Vault, RPC writers service-only, retención, seguridad, UX y beta HTTPS. Las descripciones de “no instalado” bajo este encabezado son **historia anterior al GO**, no estado actual.

# PAZO — F16: migración privada Live INERTE, pendiente de autorización
Fecha: 2026-10-19. PR #44 DRAFT. **Código en GitHub, no aplicado en Supabase.**

## Qué prepara
Migración versionada: `supabase/migrations/20261019235351_pazo_f16_live_gateway_inert_private_staging.sql`.

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

## Segundo archivo versionado, acceso aún denegado
`supabase/migrations/20261019235426_pazo_f16_live_intent_private_staging.sql` instala únicamente dos funciones privadas ungranted:
1. `pazo_live_intent_begin`: al iniciar un checkout futuro exige que un selector de comercio Live esté verdaderamente activo y con generación no retirada, obtiene plan desde base de datos, congela dueño/consentimiento/versión/digest e inserta una intención o recupera la misma sin crear un duplicado. No puede ser ejecutada desde Supabase browser ni actualmente desde `service_role`.
2. `pazo_live_intent_claim_once`: reserva mediante un UPDATE transaccional el derecho a crear UNA suscripción PayPal, solo para owner/intent/requestKey/generation exactos, dentro de 48 horas y antes de la primera llamada al proveedor. Una segunda llamada devuelve false; fallo o timeout posterior obliga a conciliación, no a crear otra suscripción.

La ejecución real necesita la autorización PO de DDL y otra autorización para roles/backend/grants; esta propuesta **todavía no crea ningún comprador** en Supabase alojado. Las pruebas de laboratorio usan un selector abierto solo en PostgreSQL desechable.
