# Ejecución autónoma hasta el inicio de F13

La orden maestra del PO de 2026-10-11 sustituye el límite anterior de auditoría
local: autoriza las dos migraciones F14 pendientes, en orden, y una sola foto
NUEVA descartable, después de respaldo recuperable, preflight y comprobaciones.
También autoriza cerrar los pendientes operativos viables y preparar una copia
cifrada privada en Google Drive. No autoriza medios/cuentas anteriores, purga
masiva, main, producción, beta pública, gastos ni empezar F13. Computer Use y
automatización de navegador permanecen fuera de esta ejecución.

## Punto de partida preservado

Local/remoto RC `f17bf87b3e01025e5422a5e0bbc1109eed665703`, checkout limpio,
sin commits locales sin publicar; CI #687 SUCCESS. Se reutiliza el laboratorio
y su evidencia: 42 SQL, 300 aliases, 12 concurrencias, 38 Edge/HTTP PASS LOCAL.
No se repiten Auth/baja manual/Android ni los módulos funcionales aceptados.

## Gates realmente ejecutados

| Gate | Evidencia / estado |
|---|---|
| Supabase READ ONLY | 76 tablas, 646 columnas, 345 constraints, 96 políticas, 46 triggers históricos; ambas migraciones pendientes ausentes. Cuatro funciones esenciales conservan sus huellas anteriores. |
| Inventario actual | 7 Auth, 2 profiles, 2 pets, 2 objetos Storage; 0 posts/comunidades/community posts, 1 moderador, 0 claims held/reportes pendientes/solicitudes activas, 0 lugares. Preservar TODO, no asumir que las altas recientes son descartables. |
| Autorización negativa | Cuenta sin grant de moderador: f14_is_moderator=false y cola rechazada. SQL READ ONLY/ROLLBACK; no sustituye un login API ni una prueba de moderador. |
| Acceso moderador positivo | PENDIENTE de sesión Auth real. Auto-review rechazó simular JWT del moderador para consultar su cola; no se repitió ni se usó una vía indirecta. No atribuir PASS al grant SQL solamente. |
| Vercel | PO completó login oficial CLI. Equipo digitalapp Hobby accesible. Preview exacto f17bf87 READY; HTML, entry JS, manifest y SW HTTP 200 vía vercel curl autenticado. Protección SSO all_except_custom_domains conservada; CLI generó su token oficial de acceso protegido, nunca publicado. |
| Configuración Preview | Mapbox presente; URL pública de Supabase de RC explícita; intake de baja y purga sin flags Preview, OFF. PostHog continúa OFF por código aunque exista variable histórica. No cambios de producción. |
| Buzón soporte | Perfil Gmail conectado coincide con appdigital.corp@gmail.com; no se leen conversaciones ni se envían mensajes. PO responsable diario previamente confirmado. Drive de esa misma cuenta rechaza subida por cuota llena: riesgo concreto de Gmail sin envío/recepción. No acreditar canal operativo hasta resolver cuota y comprobar entrega. |
| Herramientas backup | pg_dump/pg_dumpall/pg_restore 17.11 reales: dump y restore de esquema sintético en DB local NUEVA, owners/ACL conservados; igualdad de funciones/tablas/políticas/triggers, 0 filas Auth/Storage. NO restore de datos alojados. |
| Cifrado | age 1.3.2 oficial; ZIP Windows verificado contra digest publicado SHA256 f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7. Cifrado/descifrado de archivo sintético real PASS. No clave de respaldo real creada ni transferida. |
| Drive | Conexión lectura operativa, raíz privada/owner-only de la cuenta de soporte. Intento de subir SOLO muestra cifrada sintética rechazado 403 storageQuotaExceeded. CERO archivos subidos. PO elige después su Drive personal como destino: falta reconectar por OAuth normal y verificar owner/permisos antes de subir. No publicar el correo personal en Git, borrar por el agente ni contratar plan. |
| Paquete completo sintético | Dump sintético + objeto SDK simulado: pack-backup-age, descifrado, extracción y hashes DB/Storage PASS local. Manifest DB incompleto rechazado antes de cifrar. Sin datos alojados, sin subida, sin recuperación real certificada. |

## Corrección necesaria de T11

El exportador previo solo contaba descargas, no verificaba hashes y escribía
rutas en consola. Se corrige: proyecto fijo, clave servidor, destino nuevo
privado fuera de repo/sync conocido, contraste con inventario administrativo,
listados antes/después, comprobación de bytes, SHA256, nombres locales seguros,
manifest privado y salida solo agregada. Un fallo parcial no genera manifest
de éxito y nunca significa backup PASS. Verificador detecta alteración/rutas
manipuladas y tamaños ausentes; 11 regresiones sintéticas con SDK simulado, no Storage alojado.

`backup-database.ps1`: conexión administrativa DPAPI, solo transacciones de
lectura, archivo custom consistente con schema/data/ACL/owners, roles sin
contraseñas DB, TOC y hashes. No Docker Desktop ni secretos en argv/Actions.
`pack-backup-age.ps1`: valida exportaciones y cifra para destinatario público
del PO; zip claro permanece en directorio privado, nunca se sube; no elimina
material ni certifica descarga/restore. Scripts PowerShell parseados; runner
operativo con credenciales reales aún NO ejecutado.

Verificación de estos cambios: `test:ops` 11/11, `test:governance` y build
PASS local; empaquetado/cifrado/descifrado/extracción/hashes sintéticos PASS y
rechazo de manifest DB incompleto PASS. El CI incluye las regresiones Storage,
parser PowerShell sin credenciales y laboratorio F14 existente. Consultar el
run del SHA publicado; CI no conecta a Supabase alojado ni realiza un backup.

## Estado T05–T12 / T17

| Tarea | Estado verificable y siguiente dependencia |
|---|---|
| T05 | PASS visual Mapbox del PO conservado; acceso HTTP Preview desbloqueado. 3D real BLOQUEADO por 0 lugares; no inventar ubicaciones para pasar. |
| T06 | PASS E2E del PO conservado; sin repetición ni cambios Auth. |
| T07 | SOP/E2E manual previo y operador PASS; intake Preview OFF. BLOQUEADO por cuota llena de cuenta de soporte y sesión real del moderador/cola. Activar solo tras comprobar atención, entrega y cola; no borrar cuentas. |
| T08/F14 | PASS LOCAL reutilizado. Aplicación SQL alojada, SDK Storage, foto nueva y activación BLOQUEADOS por respaldo recuperable/acceso servidor aún no preparado. Autorización PO YA concedida, no pedirla de nuevo. |
| T09 | Android standalone PASS del PO conservado; recursos HTTP actuales accesibles. iPhone físico BLOQUEADO; no emulación como PASS. |
| T10 | Operador/protocolo/textos ES/EN existentes, buzón conectado y negativa SQL verificados. BLOQUEADO el canal efectivo por cuota y operación positiva de cola pendiente; no certificación jurídica. Advisor revisado sin cambios indiscriminados. |
| T11 | BLOQUEADO: credenciales exportación/SDK aún no guardadas y OAuth Drive personal aún no confirmado. Tooling sintético validado; cero backup alojado/copia offsite/restore de datos reales. La cuota del soporte queda como bloqueo separado de T07/T10. |
| T12 | PARCIAL HTTP/configuración/CI; recorrido final login/moderación/intake tras cambios reales PENDIENTE. Sin automatización de navegador ni re-test completo. |
| T17 | Fail-closed y login E2E previo del PO conservados; frontend Preview del SHA de referencia accesible y proyecto correcto presente en entry. No nuevo login real del último SHA acreditado. |

Advisor: tablas privadas RLS sin políticas públicas son deny-by-default;
f14_content_visible devuelve booleano usado por políticas de lectura, no abrir
las tablas privadas. RPCs SECURITY DEFINER con authenticated tienen contratos
de sujeto/grant; conservar grants intencionales. Leaked-password protection
permanece OFF/plan superior, sin upgrade. No convertir avisos en bugs ni
certificar seguridad integral por ausencia de errores.

Referencias oficiales: [PostgreSQL pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html),
[pg_dumpall](https://www.postgresql.org/docs/17/app-pg-dumpall.html),
[Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[age](https://github.com/FiloSottile/age),
[Advisor SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Google documenta que la cuota de Drive/Gmail/Photos es compartida y que una
cuenta llena no puede enviar/recibir correo: [gestión de almacenamiento](https://support.google.com/mail/answer/6374270).
Cambiar el destino del respaldo no acredita recuperación del buzón de soporte.

## Recuperación antes de aplicación F14 (todavía no ejecutada)

1. Exportar DB/roles/Storage reales, verificar hashes/conteos contra catálogo,
   cifrar, restaurar en aislado y comprobar que las funciones/ACL relevantes
   son recuperables. Guardar originales exactos de funciones reemplazadas,
   ACL/ownership e historial en el paquete privado.
2. Reconciliar nuevamente ambas versiones, dependencias, cero aplicación
   parcial y claims/restricciones vigentes. Procedimiento oficial debe
   preservar las versiones de los archivos; no db push del historial entero.
3. Aplicar una migración atómica por vez con timeout de lock acotado, verificar
   historial/definiciones/owner/ACL/RLS después de cada una. Mantener ejecutor
   global OFF. No relajar RLS/guards para hacer pasar Storage.
4. Error antes de COMMIT: ROLLBACK. Error compatible tras COMMIT: mantener
   ejecutor OFF y reparar solo el defecto mediante migración auditada. Reversión
   de funciones/guards requiere revisar TODOS los claims; nunca quitar una
   retención tras una retirada parcial ni restaurar metadata Storage por SQL.
5. Ensayo: una sola foto nueva de cuenta controlada y JWT real de moderador,
   identidad privada, denuncia/despublicación, prepare/recheck/preflight,
   remove SDK exacto servidor, Storage.info 404 y HEAD/GET Range originales y
   cache-busted 404/410, complete/purged y retry sin segundo remove. Revisar
   rol SQL efectivo y operaciones metadata de Storage. Comparar huellas de
   todo lo anterior; fallo = pendiente, no purga verificada.
6. Activación gradual solo tras ensayo PASS, con desactivación inmediata y sin
   barrido retroactivo. Un rollback frontend no recupera bytes borrados; origen
   se recupera desde copia binaria por API con gate específico.

F13 no iniciada. Main/producción intactos. Mientras falte respaldo recuperable,
foto física, sesión operadora o gates de dispositivos, **NO MVP COMPLETADO / NO
LISTO PARA LANZAMIENTO**. Continuar desde las dependencias humanas concretas,
sin reiniciar la auditoría local F14.
