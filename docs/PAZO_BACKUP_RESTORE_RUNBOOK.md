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

## 4. Backup lógico de Database

Prerequisitos:
- Supabase CLI actual;
- Docker Desktop;
- conexión de database obtenida desde Supabase Dashboard > Connect.

Crear una carpeta fuera del repo o bajo una ruta ignorada, por ejemplo:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $HOME "pazo-backups\$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
```

Guardar temporalmente la connection string en una variable de sesión:

```powershell
$env:PAZO_DB_URL = "postgresql://..."
```

No pegar esa URL en Git, documentación pública o capturas.

Exportar:

```powershell
supabase db dump --db-url "$env:PAZO_DB_URL" -f "$backup\roles.sql" --role-only
supabase db dump --db-url "$env:PAZO_DB_URL" -f "$backup\schema.sql"
supabase db dump --db-url "$env:PAZO_DB_URL" -f "$backup\data.sql" --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Después:

```powershell
Get-ChildItem $backup
Remove-Item Env:PAZO_DB_URL
```

Un backup no cuenta como PASS si alguno de los archivos está vacío o el comando terminó con error.

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

**Destino elegido:** Google Drive privado bajo el control del Product Owner. Carpeta sugerida `PAZO/Backups`; la ubicación concreta/ID y la capacidad disponible deben verificarse en su propia cuenta antes de cualquier subida. No se ha comprobado que Drive esté conectado a los agentes, no se ha creado una carpeta ni se ha subido respaldo alguno. No se autoriza contratar almacenamiento de pago.

**Confidencialidad obligatoria:**

1. Exportar datos DB y objetos Storage **a una carpeta temporal local FUERA de cualquier carpeta sincronizada con Drive**; no conectar un `pg_dump` o exportación de fotos privadas directamente con la carpeta de Drive.
2. Verificar resultados y rutas, y empaquetar DB, objetos binarios de Storage preservando bucket/path, metadatos mínimos del respaldo e inventario de configuración *sin credenciales*. Cifrar el paquete **antes** de subirlo con un método probado de cifrado local fuerte (por ejemplo, archivo `.7z` AES-256 con cifrado de nombres, si el ejecutor dispone de 7-Zip). El ZIP nativo de Windows sin cifrado no cumple.
3. El PO conserva **fuera de GitHub, Drive y este chat** una contraseña de cifrado única, robusta y recuperable; no introducirla en código, registro de terminal, Git, prompts ni capturas. Codex nunca debe imprimirla ni leerla de documentos del repositorio. No subir una copia cuya contraseña pueda perderse.
4. Subir **solo el archivo ya cifrado** a una carpeta privada de Drive. No crear enlaces públicos, carpetas compartidas ni usar cuentas ajenas; verificar que Drive registra el archivo completo, que coincide el tamaño y el SHA-256 del archivo cifrado, y que puede descargarse.
5. Extraer y comprobar el archivo cifrado con autorización del PO en una carpeta local aislada, sin sincronización, y ejecutar restore drill no destructivo en destino aislado compatible. La validez del cifrado, los hashes o un SQL no vacío **no demuestran por sí solos** recuperación funcional de DB, Auth, políticas RLS ni Storage. Limpiar los temporales sin borrar datos de Supabase y seguir política local de privacidad.
6. Registrar únicamente fecha UTC, rama/commit, tamaño, hashes del paquete cifrado, conteos, destino privado descrito genéricamente, resultado de descifrado/restore PASS/FAIL y límites encontrados; nunca guardar nombres, emails, claves, URLs firmadas ni bucket paths privados en documentación pública.

**Gate de T11:** Google Drive **ELEGIDO**, no un backup aprobado. Queda PENDIENTE exportación real, cifrado local, Drive upload privado verificado, descarga y prueba de restauración. Los scripts `PAZO_BACKUP_RESTORE_RUNBOOK.md` anteriores son una guía que se debe validar con herramientas realmente instaladas y credenciales proporcionadas localmente por el PO. Codex puede auditar/preparar el procedimiento en Windows cuando vuelva su acceso; no asumir control remoto del ordenador ni copiar secretos al chat. No hacer merge, borrar datos, publicar beta ni crear proyectos/servicios facturables por esta elección.

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
