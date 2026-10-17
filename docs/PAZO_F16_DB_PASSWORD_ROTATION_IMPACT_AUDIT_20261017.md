# PAZO F16 — Auditoría de dependencias ante cambio de contraseña PostgreSQL

**Fecha:** 2026-10-17. **Proyecto:** Supabase `mrybvqdebbgcayuvgkkr`. **PR:** #44 DRAFT.
**Alcance:** solo lectura de metadatos Vercel, código GitHub, 8 funciones Edge DESPLEGADAS y catálogo PostgreSQL. **No se cambió contraseña, claves API, sesión de usuario, configuración SSL, secretos P42 ni grants.**

## Resultado

**Riesgo para app desplegada: BAJO CON EVIDENCIA DISPONIBLE, NO CERO. Riesgo para respaldo/operación: CONDICIONAL Y SIN CERRAR. Restablecimiento: NO RECOMENDADO AÚN como mero atajo al gate de custodia P42.**

### Dependencias verificadas

1. **Vercel:** proyectos `pazo-app-t83r` (12 variables, production/preview) y `pazo-app` (2 variables, production/preview). Se consultaron **solo nombres, tipo, destino; decrypt=false**. No se encontró `DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_DB_URL`, `PGPASSWORD`, `PGHOST` ni claves de conexión PostgreSQL directa entre esos nombres. Ambos son Vite; ambos sin vínculos de Vercel Connectors. Se observaron variables `VITE_SUPABASE_URL`, publishable/anon keys y PostHog/Mapbox según proyecto. Estas corresponden a HTTP APIs y no demuestran uso de contraseña PostgreSQL. No se leyeron valores.
2. **Supabase Edge real, 8 functions ACTIVE:** `paypal-webhook`, `f14-moderation-purge`, `f14-moderation-reconcile`, `f16-paypal-webhook`, `f16-paypal-supporter-account`, `f16-paypal-operator-read`, `f16-paypal-supporter`, `f16-paypal-sandbox-sale-review`. Se recuperaron y examinaron contenidos desplegados: uso de `supabase-js`/APIs HTTP; **sin referencias detectadas** a `DATABASE_URL/POSTGRES_URL/SUPABASE_DB_URL/PGPASSWORD/PGHOST` o importación directa `pg/postgres`. Esto es inspección estática del código actual, no cobertura universal de dependencias dinámicas o despliegues futuros.
3. **Backend PostgreSQL:** instantánea `pg_stat_activity` mostró clientes de plataforma, pooler y una sesión `postgres`; sin dependencia de una app PAZO identificada con nombre. `cron.job` inexistente, 0 servers FDW, 0 user mappings, 0 logical subscriptions, 0 `vault.secrets` y 0 nombres Vault de conexión. El conteo de publicaciones lógicas normales es 1 (no supone cliente externo). **Una instantánea no prueba que no haya clientes nocturnos, externos, locales o esporádicos.**
4. **Repositorio:** `src/lib/publicConfig.ts` se configura por `VITE_SUPABASE_URL`/publishable key, no `DATABASE_URL`. `package.json` usa cliente `supabase-js`; no driver `pg` en el manifiesto. Index de las funciones alojadas utiliza cliente Supabase / API. Los workflows CI de GitHub usan `127.0.0.1:55441` y `f14_synthetic`, credentials sintéticas, **no** la contraseña hosted.
5. **Excepción operacional importante:** `scripts/backup-database.ps1` usa **psql + pg_dump + pg_dumpall** para conectarse directamente al Postgres alojado. Opción de autenticación A: archivos privados locales `%LOCALAPPDATA%/PAZO/CodexOps/connection.json` + `database.credential.xml` (DPAPI); una contraseña guardada aquí quedaría obsoleta tras reset. Opción B: `SupabaseCli db dump --linked --dry-run --agent no` para credenciales efímeras. **No se dispone de acceso a los archivos privados Windows ni a programador de tareas**, por lo que no está verificado si la opción A está configurada o programada y si falla realmente. El script usa `PGSSLMODE=require`; este nivel no cumple el requisito posterior de `verify-full` para transferir material de clave P42.
6. **Otros scripts de operador:** `scripts/f16-p42-session-pooler-tls-readonly-once.ps1` requiere contraseña introducida en equipo privado; intento previo bloqueado porque no se conocía. `scripts/f16-p43-ephemeral-readonly-preflight.mjs` utiliza credenciales efímeras de CLI en un gate histórico de un solo intento: no reutilizarlo sin nuevo permiso. Scripts de administración/backup pueden necesitar actualizar credenciales aunque la app siga funcionando.

### Consecuencias de cambiar la contraseña del rol `postgres`

- **No se espera** una ruptura directa de los dos frontends Vercel ni de las ocho Edge Functions revisadas, porque se basan en credenciales API y no identificamos referencias al password `postgres`.
- **Puede fallar** cualquier conexión directa persistente o programada con el password antiguo: cliente `psql`, administrador local, herramienta de respaldo, IDE, VPS, servicios externos no auditados. Puede haber errores transitorios de autenticación del pooler tras la rotación, documentados por Supabase.
- Cambiar contraseña **no es cambio de `anon`/publishable key, JWT, OAuth Google o service_role API key**. Tampoco actualiza automáticamente credenciales almacenadas fuera de Supabase.
- No hay evidencia suficiente para afirmar riesgo **cero**. No se inspeccionaron equipos locales, Hostinger/VPS, otras aplicaciones externas, sesiones fuera de la instantánea, ni snapshots antiguos de Vercel.

### ¿Es necesario rotarla para P42? Alternativas

**El SQL Editor fue adecuado para parchear UNA función sin insertar secretos; NO ES apropiado para pegar el secreto HMAC P42 en SQL literal, DML o editor con historial.** El script `P42_V1` requiere dos destinos (Edge Secrets y fila de DB en el mismo control privado) y revocación; introducir `key_bytes` en una consulta editable/loggeable crea exposición. Tampoco restablecer contraseña Postgres con `ALTER ROLE` desde el editor; usar el control **Database > Settings** del Dashboard si se aprueba una rotación.

Supabase documenta **temporary access** con token de dashboard/PAT, que puede autenticarse como rol PostgreSQL *sin reemplazar contraseña existente*, pero está **desactivado por defecto** y requiere **SSL enforcement, mapeo explícito a rol, restricciones/fecha de caducidad y aprobación nueva**. Activar SSL enforcement puede reiniciar DB; investigar estado y efectos ANTES de un GO. No compartir token con agentes/chat, ni activar JIT por simple conveniencia. El acceso efímero CLI P43 histórico no debe repetirse por el GO actual.

### Decisión de seguridad recomendada

1. **No resetear** la contraseña todavía; no está demostrado que haga falta para la app ni conviene romper respaldos/operación que no podemos observar desde chat.
2. Verificar en privado si el script de backup Windows está programado y si existen archivos de credenciales DPAPI **por existencia, sin mostrar ni leer valores**; inventariar conexión VPS/IDE manual si procede.
3. Evaluar **mecanismo oficial de acceso temporal y revocable** como opción preferida al cambio de contraseña permanente, solo con nuevo GO y auditoría previa de SSL enforcement, mapping y revocación, sin credenciales en chat. De no ser viable, aprobar **rotación planificada por Dashboard**, actualizar todas las credenciales afectadas y probar backup y app postflight.
4. **No provisionar** P42 real, no Edge `set/unset`, no DB write de signing material, no GRANT/worker/checkout/ledger/beneficios/Live con este gate.

### Fuentes oficiales

- https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/platform/temporary-access
- https://supabase.com/docs/guides/database/psql
- `scripts/backup-database.ps1`, `src/lib/publicConfig.ts`, `supabase/functions/*/index.ts`, `.github/workflows/`, Vercel project env metadata (decrypted=false) y SELECTs catálogo DB.
