# PAZO — F16-P43 | Orden única para Codex: desbloqueo LOCAL seguro

**Fecha:** 2026-10-16. **Product Owner:** autorizó continuar con Codex,
instalar **herramientas locales gratuitas** y diagnosticar acceso a
Supabase/Vercel. **No autorizó** una mutación alojada, restablecer contraseña
PostgreSQL, generar/guardar claves reales, habilitar escritor/worker/checkout,
compras Sandbox/Live, conceder beneficios ni registrar pagos.

## Repositorios, proyecto, fuente de verdad

- `DigitalAppcorp/pazo-app`, rama
  `f13/section-titles-20261012`, PR #44 **DRAFT**.
- Supabase `mrybvqdebbgcayuvgkkr`; gates P42/P21 **OFF**,
  P42 signing keys **0**, P40 bindings **0**, ledger **0**.
- Antes de cualquier tarea leer `AGENTS.md`,
  `docs/PAZO_ACTIVE_HANDOFF.md`,
  `docs/PAZO_MASTER_ROADMAP.md`,
  `docs/PAZO_F16_P43_VERCEL_NOT_VERIFIED_NODE_NPX_GATE_20261016.md`,
  `docs/PAZO_F16_P43_POSTGRES_PASSWORD_RESET_IMPACT_20261016.md`,
  `scripts/f16-p43-next-prereqs-readonly.ps1` y este documento.
- Inventario reportado desde Windows:
  `NODE=AVAILABLE`, `NPM=AVAILABLE`, `SCOOP=MISSING`,
  `PSQL=MISSING`, `SUPABASE_CLI=MISSING`,
  `VERCEL_SESSION=NOT_VERIFIED`,
  `VERCEL_DIGITALAPP_TEAM=NOT_CHECKED`.
- El archivo local `PREREQUISITOS_20261016.txt` referido por el operador
  no fue leído aquí. No afirmar resultados no comprobados.
- Las decisiones `not_before` y `not_after` de la futura clave P42
  siguen **sin aprobación**. 120 segundos = vigencia del token HMAC,
  no de la clave.

## Meta de esta ejecución: preparar herramientas y diagnosticar

El operador puede dejar trabajar a Codex en su PC. Ejecutar fases
siguientes en secuencia; solo pedir intervención humana si aparece
un login, autorización del SO, permisos de acceso o una acción nueva
fuera del alcance.

### A. Confirmar rama, Node y estado Vercel

1. Confirmar checkout/branch sin destruir archivos locales.
2. Ejecutar `./scripts/f16-p43-next-prereqs-readonly.ps1`
   en PowerShell 7 y capturar solo marcadores sanitizados, especialmente
   `NODE_MAJOR`, `SUPABASE_NPX_ELIGIBLE`,
   `VERCEL_SESSION_REASON`, `VERCEL_TEAM_REASON`.
3. No publicar logs crudos de Vercel, token, email ni archivos
   locales de credenciales.
4. Si Vercel exige login, **el Product Owner inicia sesión**
   directamente en el navegador/terminal sin compartir tokens.
   Codex puede orientar al usuario y reintentar `vercel whoami`
   y `vercel teams ls` después. No crear miembros ni tokens nuevos.
5. Si la cuenta y el equipo `digitalapp` se verifican, comprobar
   **exclusivamente nombres, destinos y ramas** de variables de
   `pazo-app` y `pazo-app-t83r`, con la CLI oficial y la cuenta
   autorizada, tras validar `vercel env ls --help` y ámbito
   explícito. Nunca usar `vercel env pull`, `env add`,
   `env rm`, `deploy`, `--decrypt` ni imprimir valores.
   Si el CLI no garantiza salida sin valores, suspender esa subfase.
   Si el acceso no existe, registrar `VERCEL_ENV_METADATA_BLOCKED`
   y continuar con herramientas locales sin simular auditoría.

### B. Instalar herramientas oficiales GRATUITAS sin crear servicios

1. Si `NODE_MAJOR >= 20`, comprobar Supabase CLI mediante
   `npx --yes supabase --help` y
   `npx --yes supabase db dump --help`. Esto puede
   descargar paquete a cache npm de la PC pero **no** debe conectar
   a PAZO ni crear login/rol temporal. Preferir mecanismo efímero,
   sin cambio de `package.json` ni `npm install -g supabase`.
   Fuente:
   https://supabase.com/docs/guides/local-development/cli/getting-started
2. Si Node es anterior a 20, NO forzar npx: elegir
   distribución oficial alternativa para Windows validada por
   firma/origen; consultar al operador si requiere instalar
   un gestor de paquetes. No cambiar dependencias de PAZO
   para satisfacer la CLI.
3. Instalar **solamente cliente** PostgreSQL `psql`
   desde distribuidor oficial verificado para Windows
   https://www.postgresql.org/download/windows/
   o herramienta cliente-only oficial comprobada. Confirmar
   paquete/editor/licencia antes de aceptar instaladores.
   No instalar servidor PostgreSQL, servicio Windows, otra
   instancia, Docker obligatorio, extensiones o recursos
   cloud pagos.
4. Validar `psql --version`, disponibilidad de Supabase
   CLI (comando efímero si se usó npx) y rutas locales,
   sin iniciar sesión en Supabase ni ejecutar SQL.
5. Verificar que el certificado TLS descargado por el
   operador sigue disponible, sin imprimirlo ni copiarlo al
   repositorio.

### C. Analizar la vía de credencial administrativa temporal, SIN usarla

1. Examinar `supabase db dump --help` de la versión exacta
   instalada y `scripts/backup-database.ps1`.
2. Documentar disponibilidad **literal** de flags `--dry-run`,
   `--linked`, `--project-ref`, `--agent`. Si alguno ya no existe,
   marcar la alternativa como no validada; no inventar equivalencias.
3. **NO ejecutar** `supabase db dump` ni `--dry-run`,
   `supabase login`, `supabase link` ni `supabase db reset`.
   Esos flujos pueden emitir credenciales temporales, tocar roles
   o archivos locales, o ejecutar trabajo fuera del gate.
   Nunca enviar passwords, PAT, session tokens o material SQL secreto
   al chat, logs, scripts, GitHub o CI.
4. Proponer solamente siguiente mecanismo administrativo
   documentado y su evaluación de riesgos para aprobación
   independiente. El permiso genérico de instalación local
   NO basta para crear una credencial DB temporal.

## Evidencia de salida

Producir `RESULTADO_P43_CODEX_LOCAL_SETUP_20261016.md` solo
en carpeta local de continuidad, **sin credenciales**, con:
- versión Node y comandos/versiones `psql` / Supabase CLI
  (o impedimento exacto);
- `VERCEL_SESSION_REASON`, estado del team `digitalapp`
  y estado de inspección **solo nombres** de variables;
- existencia de flags del CLI, **no comando que los ejecute**;
- cambios locales efectuados (instalaciones, no nube);
- bloqueo preciso, propuesta para siguiente GO y evidencia de
  que no hubo mutaciones hosted.

Terminar de forma explícita con
`P43_LOCAL_TOOLING_READY_NO_HOSTED_CHANGES`
solo cuando están listos CLI y `psql` y no hubo
mutaciones; en caso contrario:
`P43_LOCAL_TOOLING_PARTIAL_NO_HOSTED_CHANGES`.

No declarar `P43_COMPLETE` ni `F16_COMPLETE`. No modificar
Supabase hosted, PayPal, Vercel ni checkout. PR #44 sigue DRAFT.
