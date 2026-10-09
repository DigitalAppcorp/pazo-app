# PAZO F14 A3 — PostgreSQL temporal QA (2026-10-09)

**Autorización PO:** pruebas SQL reversibles en Supabase alojado; **NO** aplicar migraciones, borrar usuarios/contenido/archivos, merge, deploy o gastos nuevos.

## Método exacto

Se probó con PostgreSQL real en la infraestructura existente, sin crear un proyecto adicional. Cada ensayo se ejecutó bajo `BEGIN` … `ROLLBACK`, creando exclusivamente `CREATE TEMP TABLE`, funciones `pg_temp` y triggers sobre **tablas temporales con UUIDs y textos sintéticos**. Los cuerpos PL/pgSQL/las instrucciones FK provinieron de los cinco archivos DRAFT del PR #38, adaptando referencias a `pg_temp` para no usar DDL ni DML sobre tablas permanentes.

**Alcance de la simulación:** valida sintaxis de las funciones seleccionadas y comportamiento de un solo proceso transaccional con fixtures. No demuestra migraciones completas sobre el catálogo de PAZO, la concurrencia física entre dos conexiones, la seguridad de JWT real, los grants finales, la integridad bajo escrituras reales ni Storage/CDN/Auth.

## Resultados ejecutados

| Caso | Resultado PostgreSQL real |
| --- | --- |
| Entrada: registrar solicitud, reintentar idempotentemente, consultar, cancelar, nueva solicitud | PASS: 2 jobs sintéticos históricos, 1 activo, 2 eventos request y 1 cancel |
| Reserva de worker: adquirir, rechazar duplicado, rechazar token erróneo, liberar, recuperar, rechazar lease antiguo | PASS: una fila lease sintética, versión final 3 |
| Archivo de terceros: comunidad con 1 post ajeno + comentario comunitario ajeno + comentario en Feed de otra cuenta | PASS: 1 post privado, 2 comentarios privados, 1 tombstone |
| Ejecutar snapshot de nuevo | PASS sin duplicar (1 post archivado) |
| Snapshot con foto/avatar no verificado | PASS rechazo esperado |
| Snapshot con comentario JSON legacy sin autor verificado | PASS rechazo esperado |
| Write fence sobre post propio de cuenta congelada | PASS rechazo esperado |
| Write fence para tercero comentando contenido congelado | PASS rechazo esperado |
| Reparentar contenido de otro usuario a cuenta congelada | PASS rechazo esperado |
| Usuario no congelado modifica su post | PASS |
| Cambio FK y trigger de comunidad archivada (solo temporal) | PASS: comunidad queda `archived`, sin dueño, **1 post ajeno preservado** |
| Intentar dejar comunidad `active` sin dueño | PASS rechazo del CHECK |
| Guard extendido en interacciones, likes de Comunidad y check-ins de Lugares | PASS para las tres rutas; otra interacción ajena permanece permitida |

**Ejecución inicial del fixture de archivo:** error de preparación de prueba (`pg_temp.deletion_jobs` no existía porque la fixture se había nombrado `a3_jobs`); se corrigió solo el nombre de la tabla TEMP y la prueba completa posterior PASS. Ninguna tabla hospedada fue alterada.

## Nuevo inventario/cobertura

- Se inspeccionaron columnas reales de `interactions`, `community_post_likes` y `pet_place_checkins`: 143 interacciones existentes (`target_type=post`), 2 likes comunitarios y 6 check-ins en la muestra actual.
- El borrador `20261009_f14_a3_write_fence_NOT_APPLIED.sql` amplía su mapa de 11 a **14 tablas**. Las nuevas ramas verifican usuario actor y propietario de post/comunidad/mascota; rechazan destinos desconocidos y `target_type` no contemplados.
- **No cobertura total todavía**: escrituras sobre rescue/QR, notificaciones, Storage API, funciones privilegiadas, Edge, configuración de cuenta y futuras variantes de interacciones.

## Verificación posterior de la base alojada

Consulta real de solo lectura tras los fixtures temporales: **6 cuentas Auth, 6 mascotas, 1 comunidad, 20 objetos Storage**. `account_private.deletion_jobs`, `account_private.deletion_worker_leases` y `public.f14_a3_request_deletion()` continúan **ausentes**. Las transacciones de prueba terminaron con `ROLLBACK`; ninguna migración A3 está aplicada. Se mantuvieron todos los datos de prueba del PO.

CI del nuevo borrador de cobertura: [GitHub Actions #38002952300](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38002952300) SUCCESS, SHA de código `14ba8b03a3286d5763967a13ce197c090c0779db`.

## Límite y siguientes gates

1. Validación exacta de **todas las migraciones A3** (objetos, roles, políticas, triggers y FK) en una base sandbox aislada con DDL real completo; estos tests TEMP no sustituyen el apply íntegro.
2. Pruebas de carrera auténtica entre 2 conexiones/concurrent writers y transición de estado del worker con advisory lock.
3. Implementar servidor real con reautenticación, bloqueo de writes de TODAS las rutas, archivo de terceros + retención, Storage API con verificación de origen/CDN, revocación JWT y Auth al final.
4. Gates separados PO para SQL alojado/worker destructivo, merge/despliegue y limpieza final de datos pre-lanzamiento. `VITE_F14_A3_REQUESTS_ENABLED` queda OFF.

**Estado:** evidencia PG TEMP PASS de los casos citados, **A3 NO COMPLETA ni lista para beta pública**.
