# F14 / T08 — auditoría focalizada PostgreSQL local

**Resultado: PASS LOCAL del SQL corregido; retirada física hosted NO VALIDADA.**
Baseline remoto confirmado `f29937d0cad649ed72a1b03365b87bb3a6c00f63`.
Rama exclusiva RC. Laboratorio existente PostgreSQL **17.11**, sin datos reales.
No Computer Use, cambios hosted, Edge deploy, Vercel manual, main, F13 ni T11.

## Defectos reproducidos y correcciones

1. Tras preflight=true, una segunda sesión authenticated guardó la URL exacta
   con `?v=synthetic` en profiles.avatar_url. El objeto simulado fue eliminado,
   aunque recheck/complete devolvieron false: rechazar purged no evita perder
   una imagen compartida. Se añaden cinco triggers privados sobre las seis
   superficies de referencia y photo_storage_path. Los claims held bloquean
   nuevas referencias incluso expirados o después de purged. SHARE locks de
   las cinco tablas durante prepare/probe serializan creación de claim con
   escritores anteriores y posteriores. No se mantiene una transacción HTTP.
2. Un DELETE authenticated iniciado antes del commit del claim esperó el lock
   de storage.objects y luego eliminó la fila retenida: la política STABLE RLS
   había evaluado un snapshot anterior. Un BEFORE trigger VOLATILE vuelve a
   comprobar el claim después de adquirir el lock. Prohíbe reemplazar/insertar
   una versión held, incluso con BYPASSRLS; DELETE exige rol SQL y claim JWT
   service_role, claim checked/no expirado, ID/version/owner/updated_at/huella
   exactos y el preflight completo vigente. No inicia ninguna eliminación.
3. El helper anterior omitía variantes normales de URL: puerto HTTPS 443,
   segmentos . / .. codificados, userinfo y rutas signed/authenticated/render.
   Se cuenta conservadoramente su identidad, además de query/fragment/path
   codificado y variantes de navegador HTTP, esquema relativo, backslash y
   hostname codificado/trailing-dot cuando corresponden al mismo proyecto.
   Queries/fragmentos/userinfo largos tampoco pueden eludir la identidad por
   superar el anterior corte de 2048 caracteres; se eliminó ese falso negativo.
   El objeto que se puede retirar **sigue siendo una URL canónica exacta**.
4. HEAD/GET 403 se aceptaba como prueba de desaparición pública. Se extrae el
   verificador HTTP y se exige 404/410 en las cuatro comprobaciones; 403,
   respuestas ambiguas, bytes, errores y redirecciones no permiten completar.
5. Fidelidad local: se restauró la ACL USAGE-only de la secuencia identity que
   el bootstrap había ampliado a SELECT/UPDATE. No se modifica la secuencia ni
   privilegios alojados. Owners privados quedan explícitamente postgres.

Se modifica únicamente la migración **pendiente** 20261011022000; la migración
pendiente 20261010222006 y las 17 históricas aplicadas permanecen intactas.
No se relaja una política, se otorga una RPC pública o se libera un claim.

## Pruebas realmente ejecutadas

| Prueba | Evidencia |
|---|---|
| SQL versionado, ambas migraciones en orden, repetición del par | PASS, con SET ROLE postgres **NOSUPERUSER** y privilegios fuente |
| Suite histórica adaptada a rechazos más tempranos | **42 resultados PASS**, ROLLBACK; claims/roles/argumentos, snapshots, ACL, RLS/Storage/COPY, versiones, expiración, idempotencia y sentinelas ajenos |
| Referencias existentes antes del claim | **300 comprobaciones PASS**: seis columnas x 25 aliases x feed/community; updates reales sujetos a constraints y probe=NULL |
| Concurrencia | **12 escenarios PASS**, participantes psql separados y esperas reales observadas en pg_stat_activity |
| Edge/core/Storage.info/HTTP | **38 tests PASS**; Storage y HTTP simulados, sin peticiones reales |
| Build | PASS; warning heredado del chunk App >500 kB |
| Catálogo, metadata owner/search_path/SECURITY DEFINER/RLS/ACL | PASS del contrato SQL; alcance y exclusiones abajo |
| Diff, scripts Node y lint del módulo nuevo publicUrl.ts | PASS; no se afirma lint global limpio |

Las dos carreras se reprodujeron **antes** de corregirlas. La regresión incluye
escritor-before-claim, claim-before-writer, referencia después de preflight y
recheck, DELETE con snapshot RLS anterior, dos completions simultáneos,
REPEATABLE READ rechazado, service_role sin bypass del trigger, versión
retenida protegida y rollback parcial que conserva el preflight.

Infraestructura reproducible en `supabase/tests/f14/`, scripts
`f14-postgres-catalog.mjs` / `f14-postgres-concurrency.mjs`; job GitHub Actions
`f14-postgres` usa un contenedor PG17 aislado y **ningún secreto hosted**.
CI debe verificarse contra el SHA publicado, no inferirse del build local.

## Fidelidad y dependencias

Se reutilizó el snapshot READ ONLY y bootstrap exitoso, sin mocks reducidos.
Comparación semántica: 76 tablas/646 columnas y sus ACL, 345 constraints/96 FK,
243 índices, 96 políticas, 46 triggers históricos, 10 enums, 2 secuencias,
15 roles, 25 opciones de membresía, 12 schemas/default ACL y 116 funciones
históricas sin cambios coinciden. Las dos funciones reemplazadas, tres helpers
y seis triggers nuevos tienen pruebas específicas. Source owner de DB postgres;
el rol local de montaje f14_admin es adicional y no representa un usuario API.

Diferencias declaradas: grantors administrativos de membresías, slots físicos
de columnas previamente borradas en tres tablas, orden de dos funciones y la
pseudorrestricción del constraint trigger (presente vía trigger original).
RLS/owner/ACL/privilegios efectivos, defaults y restricciones no se omitieron.
No se reproducen procesos Auth/Storage, DDL gestionado del proveedor, Vault,
pg_stat_statements, GUC administrativos/role settings ni la misma librería ICU
de Windows/Linux; no se encontró dependencia runtime F14 de esas extensiones.
Ver README del laboratorio para fuente, huellas y limitaciones exactas.

Consulta alojada **BEGIN READ ONLY / ROLLBACK** posterior: ambas migraciones
siguen ausentes (0) y ninguno de los tres helpers nuevos está instalado (0).
No se extrajeron filas, perfiles, imágenes, credenciales ni tokens.

## Riesgos y decisión T08

**Continuar A hacia un ensayo autorizado; para la beta mantener B hasta que
ese gate pase.** A tiene una base SQL local reproducible para solicitar revisión
y autorización de aplicación, pero no está autorizada para activarse ni está
certificada frente al Storage alojado. B significa moderación/despublicación y
operación manual conservadora; no implica permiso de borrar objetos.

Storage hosted debe verificar la compatibilidad del nuevo trigger: rol de su
transacción, operaciones de metadata/updated_at, orden de eliminación y sus
triggers gestionados. Un contrato diferente debe fallar cerrado y dejar el
medio pendiente. SHARE locks pueden bloquear escrituras; timeout/deadlock exige
rollback/reintento, nunca bypass. Quarantine held es persistente; cualquier
liberación manual requiere revisión aparte. Hosts/proxies externos no tienen
identidad certificada y deben enviarse a revisión manual, no declararse prueba
de exclusividad. Ningún PASS local garantiza eliminación de CDN, copias o backups.

## Ensayo hosted mínimo posterior, con gate independiente del PO

1. Cotejar HEAD e historial/ACL hosted; el PO autoriza por separado aplicar
   **solo** las dos migraciones pendientes, en orden, y el ensayo acotado.
2. Crear un único medio NUEVO descartable de una cuenta controlada; conservar
   privadamente bucket/path/ID/version/owner y una referencia canónica única.
   No usar el avatar/archivo anterior ni cuentas originales como descartables.
3. Denunciar/despublicar ese target, preparar/recheck/preflight del claim real.
   Verificar que otra cuenta no pueda agregar avatar/alias ni alterar Storage.
4. Mediante ejecutor revisado y limitado a ese único target, autenticación real
   de moderador y SDK Storage servidor, hacer **una** retirada. Edge/global
   purge permanecen OFF fuera del ensayo. No eliminar por SQL ni poner secretos
   de servicio en frontend. Compatibilidad fallida: detener, no sortear guards.
5. Probar Storage.info con 404 inequívoco, HEAD y GET Range originales y
   cache-busted con 404/410, complete/purged y retry sin otro remove. Comprobar
   que el resto del inventario permanece intacto y guardar evidencia mínima.
6. Activación A/despliegue/flags/beta requiere otra aprobación; este documento
   no autoriza ninguna de esas operaciones.
