# PAZO F16-P06 — Orden única a Codex local: Vercel QA sin despliegue

**Fecha:** 2026-10-16. **Aprobación Product Owner:** «OK» a continuar por Codex **en su computadora** para preparar el frontend QA de PayPal Sandbox. Alcance: inspección de Vercel y compilación **local**. El GO NO habilita nuevo preview manual, Vercel Production, PayPal POST, checkout P06, cobros Live, periodos/beneficios, grants SQL, Edge Secrets, cambios al webhook, P43 ni P42. Si hay un preview automático preexistente válido, solo informarlo; no crear uno.

## Fuente de verdad

- Repositorio: `DigitalAppcorp/pazo-app`.
- Rama: `f13/section-titles-20261012`; PR #44 **DRAFT**; HEAD al redactar: `87fd1dc2ad9d2bb4a7682f78c1cbab30e967462b`. No asumir que no habrá nuevos commits: comprobar remoto y anotar SHA efectivo.
- Leer `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_F16_P06_QA_RETURN_ORIGIN_CONFIRMED_20261016.md` y este documento antes de actuar. La instrucción vigente de usuario **no publicar preview de forma manual** es vinculante. Puede haber despliegues automáticos hechos por Vercel; no inducirlos con un push innecesario.
- Supabase PAZO: `mrybvqdebbgcayuvgkkr`. Edge checkout `f16-paypal-supporter` **v4 ACTIVE** con JWT y **`QA_CHECKOUT_RELEASE_APPROVED = false`**. Ofertas de prueba ES/EN publicadas. **0** checkout attempts, **0** ledger, worker P21 OFF, P42 writer OFF, claves P42 0. Los secrets `PAZO_F16_P06_QA_OWNER_ID`, `PAZO_F16_P06_QA_APP_ORIGIN`, `PAZO_F16_P06_QA_RETURN_URL`, `PAZO_F16_P06_QA_CANCEL_URL` figuran en el panel, **valores no auditados**; QA_ENABLE aún ausente. No cambiarlos.
- URL actualmente usada por PO: `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app/#` (origin sin fragmento).
- Equipo Vercel: `digitalapp`; proyecto esperado `pazo-app-t83r` (ID `prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`). Hay además `pazo-app`; **no confundirlos**. Conector de este chat recibió `403` al leer project scope; el Vercel CLI local había sido autenticado previamente según informe del PO.
- QA frontend: `src/features/supporter/components/SandboxCheckoutQaPanel.tsx`, montado desde `SupporterAccountManagement.tsx` solo con `import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true'`. Es una **variable pública de compilación**: su presencia no garantiza seguridad por sí sola. El backend permite compras únicamente después de autorización independiente, nunca en este gate.

## Ejecución única de Codex en Windows

### 1. Preflight git SIN perder cambios locales

- Identifica el checkout local correcto por `git remote -v`, `git branch --show-current`, `git status --porcelain` y `git rev-parse HEAD`. Si el repo no es `DigitalAppcorp/pazo-app`, o está sucio y la operación requiere cambiar de rama, **NO sobrescribir ni limpiar archivos**; indicar bloqueo.
- Si la rama local ya es `f13/section-titles-20261012`, obtener las referencias remotas de esa rama y hacer `git pull --ff-only` **solo cuando el working tree esté limpio**, sin merge/rebase, para incluir el checkout corregido. Si no es esa rama y no puede conmutarse sin riesgo, `BLOCKED_BRANCH`. No hacer commit/push automático.
- Registrar HEAD efectivo en **informe local solamente**, sin imprimir outputs crudos sensibles. Confirmar que `SandboxCheckoutQaPanel` existe y que el backend de checkout en repo todavía tiene `QA_CHECKOUT_RELEASE_APPROVED = false`.

### 2. Revisar Vercel con CLI LOCAL, exclusivamente lectura

- Ejecutar `vercel --version`, `vercel whoami`, `vercel teams ls`, `vercel project inspect --help`, `vercel list --help`, `vercel inspect --help` usando flags admitidos por la versión local. No imprimir/compartir salida completa: puede contener emails u otros identificadores.
- Confirmar que sesión CLI tiene acceso al equipo **`digitalapp`** y que el proyecto vinculado al origen aprobado es `pazo-app-t83r`, no `pazo-app`. Usar `--scope digitalapp` explícito. Nunca relinkear proyecto o cambiar su conexión Git por conveniencia.
- Consultar **metadatos** del deployment existente `pazo-app-t83r-dbm658bgd-digitalapp.vercel.app`: estado READY, repo/branch/commit asociado si la CLI lo muestra. No descargar valores de variables, ni usar `vercel env pull`, `vercel env add`, `vercel env rm`, `vercel env update`, `vercel deploy`, `vercel --prod`, `vercel promote` ni `vercel rollback`. `vercel project inspect`, `vercel list`, `vercel inspect` son solo lectura.
- Si existe un deployment **ya creado automáticamente** para PR #44 y su metadata coincide con rama/HEAD esperados, reportarlo como candidato; no declarar que incluye el flag QA a menos que su configuración/build lo demuestre. Si no existe, marcar `AUTOMATIC_QA_PREVIEW_NOT_VERIFIED`. **No crear un despliegue solo para obtener un URL**.
- Si la sesión exige login interactivo, permitir que el PO lo haga directamente. Nunca capturar cookies, PAT, tokens o contraseñas. Si Vercel continúa 403 en CLI, informar `VERCEL_SCOPE_BLOCKED` y seguir únicamente con build local.

### 3. Validación reproducible SOLO en PC

- Ejecutar `node --version`, `npm --version`, `npm ci` **solo si el repo no tiene cambios locales inesperados**, `npm run test:f16:synthetic` y `npm run build`. Esto puede crear `node_modules` y `dist` locales; no subirlos ni modificar infraestructura.
- Para una **segunda compilación QA local**, configurar `VITE_PAZO_F16_SANDBOX_QA_UI=true` **solamente en el proceso de compilación actual de PowerShell**, restaurándolo en `finally`, y ejecutar `npm run build`. Confirmar mediante código y artefacto local que el panel de prueba aparece solo con el flag. Nunca establecer esa variable en Production/Preview de Vercel en este paso.
- Si faltan configuraciones públicas locales necesarias para abrir la app (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, Mapbox...), informar solamente categorías faltantes. Nunca copiar secretos server ni tokens de sesión desde navegador o Vercel; no cambiar un archivo `.env` persistente para forzar la prueba. Los publishable keys solo pueden usarse si ya están configurados localmente.
- Opcional: `npm run dev -- --host 127.0.0.1` si Codex necesita inspeccionar la UI QA local. Es un servidor estrictamente loopback, no cloud, no tunneling y **nunca se debe presionar «Probar suscripción»**. El backend cerrado devolverá error si se invoca. No intentar JWT autenticado desde el chat o logs.
- No modificar código salvo corrección local estrictamente necesaria para superar una prueba QA; si se descubre un fallo, documentar y pedir autorización antes de subir cambios remotos que podrían desencadenar preview automático.

### 4. Informe sanitizado, UNA SOLA VEZ

Guardar en carpeta local `continuidad/RESULTADO_F16_P06_CODEX_VERCEL_QA_LOCAL_20261016.md` estas etiquetas **sin credenciales ni emails**:

```text
REPO_BRANCH=PASS|BLOCKED
HEAD_SHORT=<solo abreviado, no secreto>
VERCEL_TEAM_SCOPE=PASS|BLOCKED|NOT_VERIFIED
VERCEL_PROJECT_ID_MATCH=PASS|BLOCKED|NOT_VERIFIED
EXISTING_DEPLOYMENT_READY=YES|NO|NOT_VERIFIED
EXISTING_DEPLOYMENT_SOURCE_MATCH=YES|NO|NOT_VERIFIED
QA_AUTOMATIC_DEPLOYMENT=EXISTS|NOT_VERIFIED
F16_TESTS=PASS|FAIL|NOT_RUN
DEFAULT_BUILD=PASS|FAIL|NOT_RUN
QA_LOCAL_BUILD=PASS|FAIL|NOT_RUN
QA_FRONTEND_FLAG_ISOLATED=PASS|BLOCKED
CLOUD_CHANGES=0
PAYPAL_POSTS=0
NEXT_GATE=...
```

- Imprimir exclusivamente el resumen sanitizado en la terminal. Evitar volcados de CLI y no subir el informe local a GitHub.
- Si no hubo cambios de nube y las pruebas/build local pasaron: terminar `P06_CODEX_LOCAL_QA_READY_NO_DEPLOY`. En otro caso `P06_CODEX_LOCAL_QA_BLOCKED_NO_DEPLOY` y descripción precisa.
- **STOP** aquí. Codex no habilita `PAZO_F16_P06_QA_ENABLE`, no modifica el latch `QA_CHECKOUT_RELEASE_APPROVED=false`, no despliega frontend ni backend, no ejecuta PayPal ni acredita pagos. El siguiente GO de PO decidirá entre usar un despliegue automático existente y habilitar una compra Sandbox restringida, o autorizar separadamente un despliegue específico, sin Live ni beneficios.
