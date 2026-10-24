> **F17 ejecución 24-oct-2026 — BLOCKED_PRIVATE_OPERATOR_ENVIRONMENT:** PO ya autoriza export READ ONLY, cifrado y restore aislado; esta sesión cloud no tiene terminal en el Windows privado ni DPAPI/custodia age. Backup actual y restore real NO EJECUTADOS. No exportar datos a cloud ni pedir secretos al chat. Única intervención: abrir esta tarea con terminal local en el worktree Windows. Supabase CLI2.120.0 y herramientas PG17.11 probadas aquí; no prueba su estado en Windows. Corregido BOM del preflight; 22/22 tests sintéticos PASS. [Evidencia y continuación](PAZO_F17_BACKUP_RESTORE_EXECUTION_20261024.md).

> **F17 posterior al merge #99:** existe un verificador local de integridad del respaldo actual (solo hashes/contenido, no restore ni hospedado). El backup con restore PASS del 11-oct NO es un snapshot actualizado al 23-oct. [Detalle](PAZO_F17_CURRENT_BACKUP_PREFLIGHT_20261023.md).

> **ESTADO ACTUAL — 2026-10-11:** backup DB/roles/Storage real, cifrado/roundtrip y restore completo offline PASS LOCAL. T11 PARCIAL: PO difiere reconexión/subida a Drive para hacerla después; descarga externa, custodia independiente de clave y prueba de servicio Auth/Storage aún no certificadas. Acceso administrativo CLI resuelto sin reset; autorización de respaldo y ensayo F14 existente. [Evidencia real](PAZO_REAL_BACKUP_LOCAL_RECOVERY_20261011.md).

> **GATE F16-P42 (2026-10-16, SIN PROVISIÓN):** `scripts/backup-database.ps1` actualmente ejecuta un `pg_dump` completo sin omitir los datos de `supporter_private.p42_activation_signing_keys`. Si una clave real `P42_V1` se aprovisionara, un respaldo nuevo durante su ventana de 24 horas podría conservar `key_bytes` más allá de la revocación manual. **No se ha creado esa clave.** Antes de un GO futuro hay que validar en PostgreSQL desechable una exclusión de datos P42 que preserve el esquema/restauración (candidato PostgreSQL 17: `--exclude-table-data=supporter_private.p42_activation_signing_keys`), inventariar respaldos locales/off-site y aprobar expresamente el cambio. **No suspender ni modificar backups reales solo por esta advertencia.** Evidencia: [preflight P42](PAZO_F16_P42_MANUAL_OPERATOR_PREFLIGHT_20261016.md). F16 NO-GO; este documento no habilita claves, SQL alojado ni pagos.

> **EVIDENCIA P42 PG17 (2026-10-16):** prueba en GitHub Actions `38925576845` SUCCESS confirmó que un `pg_dump --exclude-table-data=supporter_private.p42_activation_signing_keys` puede preservar esquema/RLS de la tabla, omitir fila sintética y restaurar otros datos en PostgreSQL descartable. Evidencia en [P42 backup PG17](PAZO_F16_P42_BACKUP_EXCLUSION_PG17_VERIFICATION_20261016.md). **No se ha aplicado esa exclusión al script Windows real `scripts/backup-database.ps1`.** La exposición potencial de `key_bytes` en futuros dumps reales continúa BLOQUEADA; tampoco se ha verificado la restauración completa de PAZO con ese cambio. Nada de esto autoriza provisión P42 ni interrupción de respaldos existentes.

> **UPDATE P42 — CORRECCIÓN DEL EXPORTADOR WINDOWS (2026-10-16):** por GO específico del PO, `scripts/backup-database.ps1` **AHORA EXCLUYE únicamente las FILAS** de `supporter_private.p42_activation_signing_keys` con `--exclude-table-data=supporter_private.p42_activation_signing_keys` en su `pg_dump`. Mantiene estructura, demás datos, backups Storage y manifiesto. Prueba sintética ampliada de export/restore PG17, integridad relacional/índices/ACL/RLS y chequeo estático de argumento Windows **PASS** en [PG17 #38926912820](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38926912820) y [CI #38926912803](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38926912803), commit `5474577b`. Informe: [evidencia P42](PAZO_F16_P42_BACKUP_EXCLUSION_PG17_VERIFICATION_20261016.md). **Prevalece sobre los avisos históricos de que el script no estaba corregido.** NO se generó ni provisionó clave; ningún dump real se ejecutó; backups antiguos y otros mecanismos NO están automáticamente protegidos ni borrados. P42/F16 NO-GO hasta completar los demás gates.

# PAZO — Backup & Restore Runbook

**Estado:** ACTIVO / pre-Beta  
**Tier actual:** Supabase Free  
**Objetivo:** mantener una copia off-site recuperable sin exigir upgrade pagado.

## 1. Riesgo actual

Supabase recomienda que proyectos Free exporten regularmente sus datos con `supabase db dump` y mantengan copias off-site.

Los backups de base de datos NO restauran objetos eliminados de Supabase Storage. PAZO debe tratar:

1. Database;
2. Storage objects;
3. repo/migrations/configuración;

como tres superficies de recuperación separadas.

Baseline 2026-10-07:
- database: ~17 MB;
- Storage: ~26 MB;
- volumen suficientemente pequeño para un procedimiento manual periódico.

## 2. Frecuencia pre-Beta

Mientras PAZO siga en validación privada:
- backup lógico DB: antes de migraciones de riesgo y al menos semanal;
- backup Storage: al menos semanal y antes de operaciones masivas;
- repo: GitHub/main es la fuente versionada de código/migraciones.

Antes de Beta pública:
- automatizar o formalizar una frecuencia acorde a RPO/RTO;
- ejecutar un restore drill no destructivo;
- documentar la ubicación off-site y retención.

## 3. Secretos

Nunca guardar en Git:
- database password;
- service-role / secret key;
- access tokens.

Usar variables de entorno locales o un secret manager.

## 4. Backup lógico de Database — método nativo actual

PostgreSQL 17.11 oficial instalado; Docker no es necesario para exportar.
El método actual reutiliza la CLI Supabase administrativa ya autenticada con
`-SupabaseCli <bin-oficial>`: parsea exclusivamente exports literales del
dry-run oficial, nunca ejecuta su shell ni muestra la conexión. Clave SDK
existente recuperada por API oficial y protegida con DPAPI fuera de Git/Drive.
Alternativa manual: entradas ocultas del ayudante local
'Preparar-acceso-privado-PAZO.ps1', sin conectar ni publicar credenciales.
No usar claves frontend, secretos en argv, URLs con contraseña, transcript ni
Actions alojados para exportar datos privados. Consultar Dashboard > Connect;
directa o Session Pooler puerto 5432, no Transaction Pooler 6543.

'scripts/backup-database.ps1 -PostgresBin <bin-oficial> -OutputDirectory <directorio-nuevo-privado>'
lee esa credencial solo en memoria, establece conexiones READ ONLY y exporta
'database.dump' custom completo, 'roles.sql' sin passwords de roles,
'storage-inventory.json', TOC con `--create`, 'extension-owners.json' y hashes.
Cinco piezas distintas obligatorias, más manifest. No excluir silenciosamente Auth,
Storage, políticas, grants, ownership o extensiones que causen un error.
Un fallo conserva los diagnósticos privados y NO certifica backup. La carpeta
debe estar fuera de repo/sync, con ACL de operador/SYSTEM; no sobrescribir
exportaciones anteriores. El inventario y dump son lecturas independientes:
verificar deriva antes/después; no prometer snapshot atómico DB+Storage.

Prueba ejecutada: dump/restore REAL en imagen oficial Supabase Postgres
17.11.0.004 ya instalada, contenedor nuevo offline/red none/cero puertos,
datos en tmpfs. 81 tablas + 3 secuencias, 197 funciones, 96 políticas,
353 constraints y 47 triggers: datos, owners/ACL/RLS y extensiones coinciden.
No equivale a levantar servicios Auth/Storage ni login/reupload HTTP.

Orden fiel de recuperación: bootstrap supabase_admin como en la fuente;
roles originales adaptando solo su CREATE ROLE ya satisfecho por initdb;
no eliminar GRANTED BY. Listar TOC con `pg_restore --list --create` para
restaurar creación/ACL/propiedades DB, luego schemas. Precrear extensiones
con owner/schema/version de extension-owners.json, después restaurar el
resto con --single-transaction --exit-on-error. La preparación puede exigir
SUPERUSER transitorio exclusivamente en el aislado; debe terminar con
postgres NOSUPERUSER y los grants originales. No cambiar catálogos internos,
omitir vault ni ignorar errores. Comparar el resultado con la fuente READ
ONLY usando scripts/backup-catalog-verification.sql en archivos privados.
Guardar logs/huellas solo privados, no CI alojado. Los contenedores propios
se detuvieron y sus tmpfs liberaron; archivos y clave siguen preservados.

## 5. Storage

Database backup y Storage son independientes.

Buckets actuales de PAZO:
- community-avatars;
- community-post-photos;
- pet-avatars;
- pet-documents;
- post-photos.

Para recuperación real se necesita copiar los objetos binarios fuera de Supabase, preservando bucket + path.

Nunca hacer público `pet-documents` para facilitar un backup.

La herramienta/script de Storage debe ejecutarse solo desde un entorno local/seguro usando una secret/service key temporalmente en variables de entorno.

## 6. Metadata de verificación

Cada backup debe guardar un pequeño manifest con:
- fecha UTC;
- commit de `main`;
- tamaño de cada SQL;
- buckets;
- object count por bucket;
- bytes totales;
- resultado PASS/FAIL.

No incluir secretos en el manifest.

## T11 — Google Drive aprobado como destino off-site (decisión PO 2026-10-11)

**Destino elegido:** Google Drive privado bajo el control del Product Owner. Carpeta sugerida `PAZO/Backups`; la ubicación concreta/ID y la capacidad disponible deben verificarse en su propia cuenta antes de cualquier subida. El conector está conectado a la cuenta de soporte, pero su subida sintética cifrada falló por cuota llena. El PO designó posteriormente su cuenta personal como destino: reconectar por OAuth y verificar ownership/permisos antes de subir. No se creó carpeta ni se subió archivo alguno. No se autoriza contratar almacenamiento de pago.

**Confidencialidad obligatoria:**

1. Exportar datos DB y objetos Storage **a una carpeta temporal local FUERA de cualquier carpeta sincronizada con Drive**; no conectar un `pg_dump` o exportación de fotos privadas directamente con la carpeta de Drive.
2. Verificar resultados y rutas, y empaquetar DB, objetos binarios de Storage preservando bucket/path, metadatos mínimos del respaldo e inventario de configuración *sin credenciales*. Cifrar el paquete **antes** de subirlo con un método probado de cifrado local fuerte (age 1.3.2 oficial, probado con roundtrip sintético). El ZIP nativo de Windows sin cifrado no cumple.
3. El PO conserva **fuera de GitHub, Drive y este chat** la identidad privada age recuperable correspondiente al destinatario público; no introducirla en código, registro de terminal, Git, prompts ni capturas. Codex nunca debe imprimirla ni leerla de documentos del repositorio. No subir una copia cuya clave privada pueda perderse. El empaquetador solo recibe el destinatario público.
4. Subir **solo el archivo ya cifrado** a una carpeta privada de Drive. No crear enlaces públicos, carpetas compartidas ni usar cuentas ajenas; verificar que Drive registra el archivo completo, que coincide el tamaño y el SHA-256 del archivo cifrado, y que puede descargarse.
5. Extraer y comprobar el archivo cifrado con autorización del PO en una carpeta local aislada, sin sincronización, y ejecutar restore drill no destructivo en destino aislado compatible. La validez del cifrado, los hashes o un SQL no vacío **no demuestran por sí solos** recuperación funcional de DB, Auth, políticas RLS ni Storage. Limpiar los temporales sin borrar datos de Supabase y seguir política local de privacidad.
6. Registrar únicamente fecha UTC, rama/commit, tamaño, hashes del paquete cifrado, conteos, destino privado descrito genéricamente, resultado de descifrado/restore PASS/FAIL y límites encontrados; nunca guardar nombres, emails, claves, URLs firmadas ni bucket paths privados en documentación pública.

**Gate de T11:** exportación real, cifrado/descifrado y restore DB/roles/ACL
PASS LOCAL; binarios Storage descargados/verificados. Drive upload privado,
descarga y custodia independiente de clave PENDIENTES DEL PO, quien dejó
expresamente la reconexión/subida para después. No volver a solicitarla ni
subir a la cuenta de soporte. No declarar recuperación completa del servicio
Auth/Storage por conservar sus tablas. No merge, borrados alojados, beta ni
servicios facturables por esta elección.

## 7. Off-site

Una copia en la misma computadora no es suficiente.

Mantener al menos una copia separada del entorno principal, por ejemplo:
- almacenamiento cifrado personal;
- disco externo cifrado;
- proveedor cloud aprobado.

No añadir un proveedor pagado recurrente sin aprobación explícita del Product Owner.

## 8. Restore drill

No restaurar sobre producción para “probar”.

El drill debe usar un destino aislado compatible. Si crear un proyecto/branch temporal tiene costo, obtener aprobación antes.

Validar como mínimo:
- schema;
- migraciones/funciones;
- RLS/policies;
- filas clave;
- auth strategy;
- Storage paths/objetos;
- acceso a documentos privados.

Registrar:
- fecha;
- duración;
- fallos;
- pasos manuales;
- RPO/RTO observado.

## 9. Qué NO está cubierto automáticamente

Un dump no garantiza por sí solo:
- secretos/API keys;
- Auth provider settings;
- Edge Function secrets;
- DNS/custom domains;
- PostHog/Mapbox/PayPal settings;
- objetos Storage si no se exportaron por separado.

Esos elementos pertenecen al provider/config inventory.

## 10. Gate

Antes de Beta pública:
- backup DB real: PASS;
- backup Storage real: PASS;
- copia off-site confirmada;
- restore drill no destructivo: PASS;
- runbook actualizado con cualquier diferencia encontrada.

## Exportación Storage y cifrado disponibles

'scripts/backup-storage.mjs' requiere URL del proyecto fijo, secret/service_role
solo en variable temporal servidor, 'PAZO_STORAGE_INVENTORY_FILE' del export DB
y directorio nuevo privado. Compara inventario administrativo y listados API,
descarga mediante SDK oficial, verifica tamaños/SHA256 y deriva del listado,
sin imprimir rutas. Nombres locales SHA256; bucket/path quedan en manifest
privado para restaurar por SDK. Nunca hacer público un bucket para respaldarlo.
No confundir hash local con garantía de snapshot atómico o restauración física.

'scripts/pack-backup-age.ps1' requiere las cinco entradas distintas del
manifest DB, hashes válidos y verificación Storage; crea ZIP claro solo dentro
de la carpeta privada y cifra a un destinatario público age del PO. Mantener
la identidad privada fuera de repo, Drive y chat. Ni el empaquetador ni CI
suben datos, modifican Supabase, eliminan originales o certifican recuperación.
Prueba local real: DB/roles/Storage reales → age → descifrar → extraer →
hashes PASS; manifest antiguo sin extension owners rechazado antes de cifrar.
No convertir ese resultado local en T11 off-site PASS.

La restauración real debe comprobar estructuras, filas, ownership/ACL/RLS,
funciones F14 y todos los binarios con hashes en aislado, sin redes/servicios
Auth/Storage productivos ni envíos. Transferir solo el ciphertext a la cuenta
personal verificada, descargarlo y repetir la integridad/descifrado/restore.
Registrar RPO/RTO medidos y diferencias de extensiones/servicios explícitas.
El destino personal del respaldo no repara la cuota del correo de soporte.
