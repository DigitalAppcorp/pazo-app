# F17 — backup privado y restore aislado, 24-oct-2026

**PASS LOCAL REAL.** Respaldo nuevo Database/roles/Storage, integridad,
cifrado/descifrado age, restauración desechable y comparación completa
comprobados en el Windows privado. Sustituye el bloqueo del ejecutor cloud
documentado en el commit `6f9cde7b`; aquel bloqueo no había ejecutado un backup.
PR #100 permanece DRAFT; no merge, despliegue ni modificación de producción.

## Evidencia real

| Gate | Resultado |
| --- | --- |
| Database | Cinco piezas originales distintas y SHA-256: dump custom con CREATE, roles sin passwords, inventario Storage, TOC y extension owners |
| Storage | 9 objetos; 9,276,771 bytes; descarga, relectura y SHA-256 de todos PASS; inventarios administrativos/API antes/después coincidentes |
| Datos completos actuales | Snapshot adicional en una sola transacción REPEATABLE READ READ ONLY; 147 tablas inventariadas, 146 COPY binarios, 13 secuencias observadas |
| P42 | TOC real contiene estructura, ninguna entrada TABLE DATA; ningún COPY de sus filas; fuente 0 filas y restore 0; estructura/ACL/RLS iguales |
| Secretos restantes | Roles sin cláusulas PASSWORD; Auth hashes conservados solo en paquete privado cifrado; tres registros Vault cifrados conservados byte a byte, sin revelar valores |
| Preflight real | Cinco piezas DB, nueve binarios Storage y complemento con 150 entradas SHA-256 más su manifiesto PASS |
| age | 1.3.2, identidad existente; ZIP descifrado idéntico al ZIP cifrado y extracción verificada |
| Paquete final | 10,219,547 bytes; SHA-256 `49585f612c5a600d1085c1ffcdc539d0c714193f816a12093832a56f58486f29` |
| Confidencialidad | Fuera de repositorios/sync; ACL verificadas de operador y SYSTEM; sin traslado a GitHub, chat, CI ni cloud |
| Restore | Imagen existente Supabase PostgreSQL `17.11.0.004`; contenedor NUEVO, red none, cero puertos, root readonly, datos tmpfs |
| Privilegios | Roles, membresías y GRANTED BY preservados; postgres final NOSUPERUSER; supabase_admin conserva SUPERUSER original |
| Limpieza | Tres contenedores propios detenidos/eliminados; tmpfs liberado; backups, cifrados, claves y diagnósticos privados preservados |

El paquete final contiene exactamente los bytes utilizados para el restore
real. Tras descifrarlo se verificaron las cinco piezas, todos los objetos y
cada archivo del complemento contra esos inputs. Después se ejecutó además
un segundo restore completo desde esa extracción final, en otro contenedor
nuevo, para ampliar la comparación a definiciones de vistas, reglas, tipos,
particiones, parámetros de secuencias, publications y propiedades DB: PASS.

## Comparación completa

`scripts/backup-catalog-verification.sql` y
`scripts/backup-catalog-extra-verification.sql` y
`scripts/backup-catalog-definitions-verification.sql`, fuente READ ONLY frente a
restore: **cero diferencias** en filas/secuencias, relaciones/owners/ACL/RLS,
funciones, policies, constraints, triggers, schemas, columnas, índices, grants
predeterminados, roles/membresías/grantor, settings y miembros de extensiones.
Propiedades/ACL/owner de la base y versiones/schemas/owners de extensiones
también coinciden.

- **147 tablas + 13 secuencias**, **401 funciones**, **133 policies**,
  **735 constraints**, **70 triggers**, **7 extensiones**.
- Las columnas se comparan por nombre y orden lógico; `attnum` físico tiene
  huecos por columnas borradas y no se conserva en un restore lógico.
- P42 conserva su exclusión intencional. Actualmente la diferencia de filas
  esperada es cero porque la fuente tiene cero; la ausencia de TABLE DATA y de
  COPY P42 demuestra la protección incluso sin una clave activa que omitir.
- Snapshot de datos realizado el 24-oct alrededor de **16:46 UTC**. La fuente
  sigue evolucionando. PostgreSQL no congela secuencias mediante MVCC: se
  preservan exactamente los valores/is_called observados en la evidencia.
- El primer laboratorio exitoso fue creado a 16:38:34 UTC y la comparación final
  pasó a 16:49:59 UTC: ventana observada aproximada **11m25s**, incluidos ajustes
  y captura del complemento. No constituye un RTO de servicios Auth/Storage.

## Defectos encontrados y resueltos

1. La credencial CLI temporal dejó de autenticar una conexión nueva de roles
   después del dump largo. Se conservó el dump válido y se renovó el acceso por
   la CLI existente, sin reset/rotación. Exportador corregido para roles antes
   del dump; no repite una exportación válida para ocultar un fallo.
2. La virtualización AppData de Codex Windows hace diferir `fs.realpath` de la
   ruta solicitada sin junction/symlink. Preflight canoniza la raíz **después**
   de rechazar enlaces y antes de validar archivos; mantiene los hashes.
3. `pg_dump` omite datos internos de `pg_net`; además cron/worker cambian durante
   lecturas independientes. Se preservaron todos los datos mediante el
   complemento coherente de todas las tablas, incluidos internos de extensión.
   No se descartaron diferencias operativas para declarar PASS.
4. Dos schemas GraphQL conservan grants iniciales que el dump no reprodujo.
   El complemento aplica exactamente los grants de la fuente y su grantor;
   comparación posterior sin permisos faltantes ni adicionales.
5. Export de padres particionados usa SELECT FROM ONLY; sus particiones se
   exportan por separado. COPY enumera columnas y omite únicamente columnas
   generadas del input; PostgreSQL las regenera. Los ocho campos generados y
   todas las filas finales coinciden con la fuente. Originales preservados.
6. `pg_net` requiere preload. Su worker se dirigió a la DB control vacía y
   `pg_cron` a `launch_active_jobs=off`. No se ejecutaron jobs restaurados ni
   HTTP. Un primer laboratorio fallido hizo rollback de la elevación temporal
   antes de eliminarse; el ensayo exitoso empezó en otro contenedor nuevo.

Procedimiento reproducible y límites del complemento:
[`PAZO_F17_RECOVERY_SUPPLEMENT_20261024.md`](PAZO_F17_RECOVERY_SUPPLEMENT_20261024.md).

## Pruebas pertinentes

- Preflight Windows: **12 PASS, 1 SKIP**. Se reprodujo primero en rojo el
  rechazo por casing; regresión en verde. El único SKIP corresponde a creación
  de file symlink denegada por Windows (EPERM); el rechazo de directory junction
  se ejecutó y pasó. CI Linux ejecuta la prueba file symlink.
- Storage: **11/11 PASS**; complemento: **5/5 PASS**, incluidos tampering,
  exclusión P42, traversal, archivos inesperados y COPY inválido con hash válido.
- Sintaxis JavaScript/PowerShell y `git diff --check`: PASS.
- La evidencia CI del commit final se consulta en PR #100; se registra por
  separado del ensayo real, que nunca se ejecuta con datos privados en CI.

## Alcance cerrado y límites preservados

**Backup/restore privado actualizado PASS**. No es cierre global de F17/T11,
replay histórico de migraciones ni autorización de producción. No hosted
DDL/DML de negocio, db push/repair/reset remoto, PayPal, merge o despliegue.
La CLI pudo gestionar su login administrativo temporal existente.

DB y Storage no constituyen un snapshot atómico entre servicios; no hubo
deriva observada de inventarios. Recuperación HTTP de Auth/Storage, sesiones,
secretos/configuración externos y descifrado operativo de Vault dependiente
de su clave de plataforma **no certificados** por conservar sus tablas.
Off-site personal y custodia independiente de la identidad siguen diferidos;
no se pidió reconexión Drive ni se transfirió nada.
