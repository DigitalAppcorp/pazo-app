# PAZO F16-P43 — Evaluación de impacto antes de recuperar/restablecer DB password

**Fecha:** 2026-10-16. **Modo:** SOLO LECTURA / SIN CAMBIOS HOSTED.

## Decisión operativa de este gate

**NO RESTABLECER LA CONTRASEÑA ACTUALMENTE.** El Product Owner autorizó
**evaluar impacto**, NO restablecerla. Se encontró una posible alternativa
de acceso temporal administrado por Supabase CLI; necesita revisión
independiente de compatibilidad, autorización y pruebas en equipo local.

P43 continúa bloqueado para generación/provisión de claves. P42/P21 OFF,
P40 vacío, ledger sin pagos, PR #44 DRAFT y F16 NO-GO. No modificar
contraseñas, permisos, secretos, roles ni configuración de conectores.

## Evidencia confirmada de lectura

1. **Supabase alojado:** 6 Edge Functions ACTIVE:
   `paypal-webhook`, `f14-moderation-purge`,
   `f14-moderation-reconcile`, `f16-paypal-webhook`,
   `f16-paypal-supporter-account` y
   `f16-paypal-operator-read`.
   Inspección de sus códigos instalados: no se hallaron referencias
   literales a `SUPABASE_DB_URL`, `DATABASE_URL`,
   `PGPASSWORD` ni `POSTGRES_PASSWORD`; sí existen referencias a
   `SUPABASE_URL` y/o `SUPABASE_SERVICE_ROLE_KEY` para API.
   **No demuestra** que dependencias importadas, secretos del proyecto,
   procesos programados ni otras aplicaciones no utilicen DB password.

2. **`pg_stat_activity`** consulta read-only puntual: cuatro conexiones
   cliente observadas, de servicios del propio Supabase:
   PostgREST (`authenticator`), pooler (`pgbouncer`), `supabase_admin`
   y exportador de métricas. Ninguna sesión externa identificable activa
   en esa instantánea. Esto **no identifica clientes ocasionales**
   y no es prueba de ausencia de dependencias.

3. **Vercel:** dos proyectos asociados a PAZO:
   `pazo-app` (`prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`) y
   `pazo-app-t83r` (`prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`).
   La consulta de nombres/metadatos de variables de ambos falló
   con **403, ámbito digitalapp no autorizado**. No se leyeron
   valores, no se puede descartar dependencia DB desde Vercel.
   **Bloqueo para GO de reset** hasta reconectar autorización o auditar
   las **nombres y destinos** de variables desde un canal privado.
   No revelar sus valores en chat ni logs.

4. **Repositorio actual:** `scripts/backup-database.ps1` **sí**
   depende de credenciales administrativas de PostgreSQL y herramientas
   `psql`, `pg_dump`, `pg_dumpall`, `pg_restore`.
   Tiene dos rutas de autenticación:
   - Credencial cifrada local `database.credential.xml` bajo carpeta
     privada, en conjunción con `connection.json`; **NO se confirmó**
     que esos archivos existan en el equipo. Su archivo no debe enviarse
     al chat ni a GitHub.
   - Opción `$SupabaseCli`: intenta preparar credenciales temporales
     usando `supabase db dump --linked --project-ref ... --dry-run --agent no`,
     verificando rol CLI. Esto aparece en el código versionado, **NO se
     ejecutó ni se probó en la sesión actual**. El resultado de dry-run
     puede incluir secretos; nunca copiarlo en consola compartida/chat
     ni activar verbose/tracing. Este procedimiento puede involucrar
     creación/uso de rol temporal administrado por Supabase.
   Un restablecimiento de password podría invalidar credenciales
   guardadas localmente y cualquier backup/scheduler que use `postgres`.

5. **Documentación Supabase actual consultada:**
   - [Recuperar/resetear DB password](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB):
     se gestiona en Dashboard > Database > Settings.
   - [Pooler después de reset](https://supabase.com/docs/guides/troubleshooting/supavisor-error-password-authentication-failed-after-password-rotation):
     el pooler puede cachear credenciales, causando `28P01`
     transitorio incluso con contraseña nueva; verificar conexión
     directa, volver a intentar sin rotaciones sucesivas y pedir
     soporte si persiste.
   - [Rol `cli_login_postgres`](https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae):
     Supabase documenta roles temporales creados automáticamente por CLI
     para acceso cuando no se suministra DB password. **No confundir**
     con un acceso ya configurado para este proyecto; hay que verificar
     versión, flags, autenticación y permisos de la CLI local.
   - [Acceso temporal/JIT](https://supabase.com/docs/guides/platform/temporary-access):
     mecanismo alternativo por token de cuenta, **desactivado por
     defecto** y dependiente de versión/configuración. No habilitar sin
     autorización separada. Esta opción es **distinta** de la ruta
     específica CLI de roles temporales.
   - [Conexión directa / pooler](https://supabase.com/docs/guides/database/connecting-to-postgres):
     preferir TLS, host y usuario exactos, no pasar password en URI/CLI.

## Matriz de impacto de reset

| Consumidor / ruta | Evidencia | Riesgo si cambia contraseña |
| --- | --- | --- |
| Acceso local `psql` por `postgres` | Aún no establecido | Nueva contraseña obligatoria |
| Respaldo `scripts/backup-database.ps1` | Dependencia DB directa confirmada en código | Potencial fallo hasta actualizar credencial/usar ruta CLI; frecuencia real pendiente |
| Edge Functions Supabase | 6 activas, sin patrón directo en fuentes instaladas | Menor evidencia de dependencia de password, pero no garantía sobre librerías/externos |
| Vercel `pazo-app` y `pazo-app-t83r` | Proyectos encontrados, variables **403** | **Desconocido y bloqueante** para reset |
| Pooler Supavisor | Conexión vista y documentación oficial | `28P01` transitorio por caché después del reset |
| PostgREST/infra propia Supabase | Conexiones vistas | No asumir que reinicios/cache son inocuos; observar salud posteriormente |
| Clientes fuera de GitHub/Vercel, jobs programados | Sin inventario concluyente | **Desconocido** |

## Camino de menor riesgo recomendado (sin mutar)

A. **No resetear.** Codex debe verificar localmente presencia/versión de
   `supabase`, `psql` y conexión actual con `supabase projects list`
   / `supabase db dump --help` **sin ejecutar un dump ni generar token**.
   El primer comando puede contactar Management API pero no modifica DB.
   Examinar en privado si existe ya `database.credential.xml`
   **solo por existencia**, sin leer/copiar secreto a chats/logs.

B. Estudiar en entorno local controlado el flujo de rol temporal CLI,
   contrastando flags `--dry-run` y `--agent` con versión instalada.
   **No ejecutar una solicitud que emita credenciales temporales o cree
   roles** hasta decidir si requiere nuevo GO de seguridad y asegurar
   salida privada; evitar registrar texto de dry-run. Si la ruta es
   válida, podría evitar resetear password principal.

C. Auditar los **nombres y destinos, sin valores**, de variables de
   ambos proyectos Vercel desde cuenta con permisos del team.
   También revisar programadores/backup y otras apps del usuario.
   El conector Vercel actual devolvió 403, NO fingir inventario completo.

D. Si falla toda alternativa de credencial existente/CLI, preparar
   cambio programado con **GO exclusivo PO**. Predefinir ventana
   de mantenimiento, contactos, clientes afectados, pruebas de salud,
   copia segura de credenciales nuevas y actualizaciones de consumidores.
   No rotar inmediatamente ni varias veces; considerar caché pooler.

E. Instalar `psql` local antes de validar una conexión, usar
   `scripts/f16-p43-db-access-readonly.ps1` con password oculto y
   `sslmode=verify-full`/CA. La prueba esperada es
   `P43_DB_ACCESS_READ_ONLY_PASS` +
   `P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY`.
   **Jamás** generar/provisionar secreto P42 basándose solo en un
   reset o en un preflight: `not_before` exacto y política
   `not_after` siguen **sin aprobación**.

## Puerta de continuación

**GATE P43-DB-PASSWORD IMPACT = REVIEW_COMPLETED_WITH_OPEN_DEPENDENCIES**.
Sin autorización para cambiar contraseña ni mutar rol, secret, Edge,
webhook, checkout, worker, ledger o beneficios.

Faltan:
- auditoría Vercel 403 y clientes/jobs externos;
- verificar autenticación temporal CLI con controles de confidencialidad;
- acceso administrativo local probado/psql instalado;
- la decisión separada de validez de clave P42.

**Nota de procedencia:** el operador informó previamente que
`RESULTADO.md` está en una ruta local Windows; el archivo local
**NO** se abrió en ChatGPT. No atribuirle datos no reportados.
