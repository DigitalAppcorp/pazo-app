# PAZO F16-P43 — Acceso PostgreSQL seguro desde Windows (REVISIÓN SOLAMENTE)

**Fecha:** 16 de octubre de 2026. **Estado:** preparado para auditoría y
ejecución local read-only; ninguna conexión local demostrada, ninguna clave
P42 generada o provisionada, ninguna mutación hosted.

## Referencias de contrato

- Proyecto: `mrybvqdebbgcayuvgkkr`.
- Rama: `f13/section-titles-20261012`, PR #44 DRAFT.
- `AGENTS.md`: cambios de backend requieren preflight, GO específico y
  postflight; nada de reset de credenciales o nuevos costos sin PO.
- `docs/PAZO_F16_P43_SANDBOX_KEY_PROVISIONING_SECURE_HANDOFF_20261016.md`:
  PO aprobó provisión dual Sandbox, pero NO writer/worker/checkout/beneficios.
- Blob read-only auditado:
  `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`
  (blob `ac9246a0106ebefd6d425a549d9f207242760eec`).
- Modelo instalado:
  `supabase/migrations/20261016062849_f16_p42_keys_and_writer_inert.sql`.
- Documentación oficial Supabase:
  `https://supabase.com/docs/guides/database/connecting-to-postgres`,
  `https://supabase.com/docs/guides/database/connecting-to-postgres#pooler-session-mode`
  y página Connect del Dashboard.

## Decisión sobre ventanas de validez: BLOQUEADA

**No existe en documentos y handoff una fecha/hora de `not_before`
aprobada ni un `not_after`/TTL de la CLAVE aprobado.** El esquema SQL
exige `not_before timestamptz NOT NULL`; `not_after` admite NULL con
constraint de orden. Se menciona «futuro», pero NO una fecha ni política
concreta para rellenarlo.

El límite de **120 segundos** de P42 es del mensaje HMAC individual,
NO del ciclo de vida de `P42_V1` y NO autoriza elegir una expiración.
No introducir fechas temporales ni un NULL para `not_after` por defecto
sin decisión del PO y revisión de rotación/backup.

## Camino de acceso sin conocer la contraseña

1. Recuperar en **Supabase Dashboard > Connect** el host, puerto,
   `database` y usuario para *Direct connection* o *Session pooler*,
   sin copiar/pegar la URI completa si contiene contraseña.
   La conexión directa requiere IPv6 en proyectos sin add-on IPv4;
   *Session pooler* se usa en redes IPv4. Ambos deben usar puerto 5432.
2. Descargar el certificado raíz desde la configuración SSL
   del proyecto (archivo local del operador, nunca pegado aquí).
   No desactivar la validación TLS para «hacer funcionar» la conexión.
3. Buscar la **contraseña DB existente** en el gestor privado de claves,
   el administrador que configuró originalmente el proyecto o
   cualquier sistema de custodia autorizado. Supabase no permite
   deducirla del URL ni de un token JWT.
4. Si el propietario desconoce la contraseña y nadie la custodia,
   **detenerse en `DB_PASSWORD_UNAVAILABLE`**. Solicitar al PO una
   decisión administrativa separada sobre la recuperación o un
   restablecimiento planificado, previa auditoría de clientes/funciones
   que usan la contraseña. No restablecerla, crear roles ni cambiar
   grants de manera unilateral.
5. Tener PowerShell 7+ y el ejecutable local `psql`
   (PostgreSQL client tools). Usar un Windows del operador confiable,
   no un equipo multiusuario o que registre toda la sesión en vídeo.
6. Ejecutar el script en PowerShell **desde el checkout local de GitHub**:

   Para conexión directa:

   ```powershell
   ./scripts/f16-p43-db-access-readonly.ps1 `
     -Mode Direct `
     -DbHost db.mrybvqdebbgcayuvgkkr.supabase.co `
     -DbUser postgres `
     -CaCertificatePath 'C:\ruta-local\certificado-supabase.cer'
   ```

   Para *Session pooler*:

   ```powershell
   ./scripts/f16-p43-db-access-readonly.ps1 `
     -Mode SessionPooler `
     -DbHost '<HOST_EXACTO_DE_CONNECT>' `
     -DbUser postgres.mrybvqdebbgcayuvgkkr `
     -CaCertificatePath 'C:\ruta-local\certificado-supabase.cer'
   ```

   Sustituir el host de Session Pooler por el valor mostrado en
   el Dashboard; **no inventar región**. No poner contraseña en
   `-DbHost`, flags, variables `$PROFILE`, historial o URL.
7. El script invoca `Read-Host -AsSecureString`; el operador introduce
   la contraseña DB **oculta en su consola local**. La transfiere
   exclusivamente al proceso hijo `psql` mediante `PGPASSWORD`
   en su *entorno de proceso*, sin pasarla como argumento de línea
   de comandos, consulta SQL ni fichero. Forza
   `PGSSLMODE=verify-full` y `PGSSLROOTCERT` del certificado.
   Todo SQL es lectura y exige `default_transaction_read_only=on`.
   **Advertencia:** el proceso hijo necesariamente mantiene secreto en
   memoria temporal: la seguridad depende del ordenador local y del SO.
8. Esperado si el acceso está disponible:

   ```text
   P43_DB_ACCESS_READ_ONLY_PASS
   P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY
   ```

   En caso de fallo, devuelve una categoría sin mostrar stderr bruto
   ni contraseña: `AUTHENTICATION`, `NETWORK_OR_HOST`,
   `TLS_CERTIFICATE` o `PREFLIGHT_OR_ROLE`.
   Ningún fallo justifica ejecutar SQL de mutación o desactivar TLS.

## Límites operativos

**Este script NO** genera HMAC, no crea `P42_V1`, no instala secretos
Edge, no inserta en `supporter_private.p42_activation_signing_keys`,
no llama a PayPal, no crea/rota roles, no cambia contraseñas DB,
no concede EXECUTE, no enciende P42/P21, no utiliza el SQL Editor del
Dashboard ni escribe logs de credenciales.

**No ejecutar provisión dual ni inventar `not_before/not_after` hasta**
(i) acceso local read-only PASS, (ii) disponer en el MISMO entorno de
canales privados de Edge Secrets y PostgreSQL administrativo,
(iii) aprobación PO de ventana/rotación, y (iv) nuevo procedimiento de
provisión cuidadosamente auditado. No hay una vía validada en este
handoff para poner secretos simultáneamente en ambos destinos.

Resultado del Gate actual: `READ_ONLY_DB_ACCESS_PROBE_PREPARED`.
