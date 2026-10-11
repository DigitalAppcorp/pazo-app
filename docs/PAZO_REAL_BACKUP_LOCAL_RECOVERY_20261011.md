# Respaldo real y recuperación local — 2026-10-11

**DB/roles/Storage exportados y cifrados; restore DB real PASS LOCAL. T11 parcial.**
El PO deja expresamente la reconexión/subida a Drive para después. No se subió
ningún respaldo. F14 hosted y retirada física siguen pendientes, ejecutor OFF.
Baseline RC `d31da0cfde686cf59cde368d07b58d213f19d3fe`, CI #688 SUCCESS.

## Accesos verificados sin modificar proveedores

- CLI Vercel 63.1.2: `digitalappcorp`, equipo `digitalapp` Hobby, acceso directo
  a `pazo-app-t83r` PASS. La lista vacía del conector no niega este acceso.
- Conector Vercel de esta conversación: equipos vacíos y proyecto 403.
  MCP nativo nuevo: OAuth y descubrimiento de herramientas PASS por protocolo
  oficial app-server; llamada READ ONLY exige un thread cargado y devuelve
  `thread not found` en este contexto. **Permiso directo del MCP nuevo sobre el
  proyecto no acreditado**; no crear otro chat/agente ni extraer tokens para
  simularlo. Recargar el contexto MCP en una sesión posterior; CLI operativa.
- CLI Supabase 2.120.0 ya autenticada: proyecto correcto visible. La vía
  oficial `db dump --linked --project-ref ... --dry-run` entrega una conexión
  administrativa temporal. Exportar con PostgreSQL nativo usando esas
  variables solo en memoria y el mismo rol postgres de la CLI; no ejecutar
  el shell generado, resetear passwords, leer tokens o usar Docker para el
  dump. La CLI puede gestionar su login temporal; las consultas/exports de
  negocio se ejecutaron READ ONLY, sin DDL/data writes de PAZO alojado.
- Clave servidor existente obtenida por API oficial y guardada con DPAPI,
  ACL de operador/SYSTEM, fuera de repo/Drive/chat. No clave frontend,
  creación/rotación de claves ni credenciales en argv, CI o documentación.
- Drive sigue mostrando owner de la cuenta de soporte en dos lecturas
  posteriores al aviso de reconexión. No asumir cuenta personal por ese aviso
  ni subir a la cuenta incorrecta. PO difiere explícitamente esta tarea.

## Recuperación realmente ejecutada

1. `pg_dump`/`pg_dumpall`/`pg_restore` 17.11: archivo custom completo, roles sin
   passwords de DB, inventario Storage, TOC y manifest SHA-256. Auth y todas
   las extensiones permanecen en el archivo; ningún esquema omitido.
2. SDK oficial Storage: 2 objetos, 486020 bytes; inventario administrativo,
   listados antes/después, tamaños y SHA-256 PASS. Solo lecturas/descargas.
3. age 1.3.2: paquete real cifrado, descifrado, extracción y hashes de las
   cinco piezas DB y los binarios Storage PASS. Identidad privada local
   separada del paquete; custodia independiente del PO aún pendiente.
4. Restore completo en contenedor NUEVO de la imagen oficial ya instalada
   `public.ecr.aws/supabase/postgres:17.11.0.004`, red `none`, cero puertos,
   root filesystem readonly, PostgreSQL/datos en tmpfs. Se inició el runtime
   existente mediante CLI, sin Computer Use/navegador. No se utilizó ni
   sobrescribió la DB del stack local anterior.
5. Bootstrap `supabase_admin` como en la fuente. Original roles.sql intacto;
   copia adaptada omite únicamente su CREATE ROLE porque initdb ya lo creó.
   GRANTED BY original conservado; no ignorar errores de membresía PG17.
6. Extensiones precreadas con owner/version/schema originales antes de
   restaurar el resto. Elevación postgres SUPERUSER solo durante esa
   preparación local atómica; estado final NOSUPERUSER como fuente. No
   modificar catálogos internos ni privilegios alojados para reparar owners.
7. Igualdad fuente READ ONLY vs restore: **81 tablas + 3 secuencias, 197
   funciones, 96 políticas, 353 constraints y 47 triggers**. Cero diferencias
   de huellas de todas las filas/secuencias, funciones/owners/ACL, relaciones
   y RLS, constraints/triggers, cinco extensiones/owners y propiedades/ACL DB.
   Se expanden ACL implícitas y ordenan grants; no confundir NULL/default ni
   orden JSON/ACL con permisos distintos. Comparaciones privadas, no hashes
   de usuarios publicados. Vault conserva estructura real y tiene 0 secretos.
8. Clone adicional del restore: ambas migraciones pendientes aplicadas en
   orden con postgres NOSUPERUSER PASS LOCAL; 200 funciones/53 triggers/96
   políticas después, cero cambios en huellas de las filas/secuencias copiadas.
   Compatibilidad nueva sobre copia fiel; no repetir las suites ya aprobadas.
9. Laboratorios propios detenidos al terminar; tmpfs liberado, originales,
   cifrado, diagnósticos privados y clave preservados. No borrados alojados.

## Defectos del procedimiento corregidos

- Login temporal CLI no hereda SELECT: debe usar el rol administrativo
  postgres concedido por el proveedor, como su propio `pg_dump --role=postgres`.
- Archivo y TOC necesitan `--create`: un listado sin esa opción omite las
  entradas DATABASE, ACL y propiedades y produce una recuperación incompleta.
- CREATE EXTENSION de un dump no preserva automáticamente su propietario.
  Nuevo `extension-owners.json`, obligatorio y cifrado dentro del paquete,
  permite precrear correctamente; sin ello algunas funciones/views tenían
  owner/grantor supabase_admin en lugar de postgres. Corrección solo local.
- Manifest antiguo de cuatro piezas rechazado antes de empaquetar/cifrar;
  cinco entradas distintas y hashes exigidos. Originales/intentonas previas
  preservados, sin alteraciones silenciosas.
- Verificación reusable `scripts/backup-catalog-verification.sql`: secuencias
  comparadas con last_value/is_called, no whole-row JSON ni log_cnt WAL.
  CI solo ejecuta esa consulta sobre su servicio sintético, sin datos alojados.

## Límites y siguientes gates

No copia externa, descarga desde Drive ni custodia independiente acreditada.
Restauración DB/ACL/datos real PASS y binarios extraídos verificables; **no**
se restauró un servicio completo Auth/Storage con pruebas HTTP/login/reupload
de documentos privados. No afirmar PASS Storage hosted ni recuperación de
sesiones/tokens del proveedor por conservar Auth tables.

F14 mantiene PASS LOCAL; las dos versiones alojadas siguen ausentes. Falta
completar protección/operación del rollout: Drive pendiente del PO, sesión
Auth real del moderador y soporte efectivo (cuota llena). No volver a simular
el JWT moderador que auto-review rechazó. Ensayo de una sola foto NUEVA y
SDK/HTTP/CDN aún NO ejecutado; global OFF, opción B mientras tanto.

T05 visual PO PASS; 3D sobre lugares reales pendiente por catálogo vacío.
T06 recuperación PO PASS. T07/T10 operador/manual previa PASS pero canal y
cola positiva pendientes; intake OFF. T09 Android PO PASS, iPhone físico
pendiente. T12 HTTP/CI parcial y smoke integrado final pendiente. T17 login
previo/fail-closed conservados, no nuevo login del SHA final certificado.
F13 no iniciada; main, producción, Vercel deploy manual y datos anteriores
intactos. No MVP completado ni lanzamiento autorizado.

Verificación local de cambios: PowerShell parser, build, paquete real positivo
y rechazo de manifest sin owners PASS. `test:ops`: 9/11 en el sandbox por
EPERM de realpath, tanto con Temp del sistema como del workspace; **11/11
PASS fuera del sandbox**, sin modificar controles ni acceder a proveedores.
Consultar GitHub Actions del SHA publicado para la verificación remota.

Referencias: [CLI Supabase](https://supabase.com/docs/reference/cli/supabase-db-dump),
[pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html),
[pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html),
[GRANT/bootstrap](https://www.postgresql.org/docs/17/sql-grant.html),
[Docker CLI](https://docs.docker.com/desktop/features/desktop-cli/).
