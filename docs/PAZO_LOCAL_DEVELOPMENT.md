# PAZO — Desarrollo local reproducible

Este runbook levanta PAZO contra Supabase local sin usar producción ni ejecutar comandos `--linked`.

## Prerrequisitos

- Docker Desktop activo.
- Node.js y dependencias instaladas con `npm install`.
- Supabase CLI disponible mediante la dependencia/caché local de `npx`.

## Inicio diario

```powershell
npm run local:setup
npm run verify:local
npm run dev:local
```

`local:setup` genera el workdir ignorado `.local-supabase/`, inicia Supabase desde ese workdir, actualiza únicamente las variables locales necesarias en `.env.local` y aplica migraciones pendientes con `--local`.

La aplicación sigue usando `http://127.0.0.1:54321`. El token PostHog puede permanecer guardado localmente, pero localhost no envía eventos salvo que se active de forma consciente con `VITE_ENABLE_LOCAL_POSTHOG=true`.

`verify:local` comprueba:

- contrato de buckets, políticas y privilegios con pgTAP;
- signup local, trigger de perfil, creación de mascota, Feed directo + RPC y lecturas de módulos mediante la API real;
- rechazo de una ruta Storage ajena y upload/delete/descarga sobre los cinco buckets;
- lint SQL local;
- gobernanza y build de producción.

La prueba API crea un usuario y una mascota aislados y los elimina al terminar. No imprime claves.

## Separación de migraciones

- `supabase/migrations/` conserva la historia canónica que debe reconciliarse con GitHub/producción antes de un release;
- `supabase/local_migrations/` contiene el baseline y el contrato necesarios para reconstruir PAZO local;
- `.local-supabase/` se genera combinando el baseline local con cualquier migración canónica posterior al baseline;
- ninguna operación remota debe apuntar al workdir generado.

Esta separación evita que el baseline local sea interpretado accidentalmente como una migración pendiente de producción.

## Contrato local de Storage

Los buckets versionados son:

- `pet-avatars` — público, imágenes de hasta 5 MB;
- `post-photos` — público, imágenes de hasta 5 MB;
- `community-avatars` — público, imágenes de hasta 5 MB;
- `community-post-photos` — público, imágenes de hasta 5 MB;
- `pet-documents` — privado, PDF/JPEG/PNG/WEBP de hasta 10 MB.

Las políticas validan usuario/propiedad y las rutas que usa el cliente. Uploads públicos usan `upsert: false`, por lo que no se concede `UPDATE` de objetos.

## Reconstrucción completa

Para verificar una reconstrucción completa sin borrar cuentas ni datos del stack diario:

```powershell
npm run local:test:cold
```

El comando crea otro proyecto Supabase con puertos alternos dentro de un subdirectorio desechable e ignorado, aplica todas las migraciones locales sobre una base vacía, ejecuta pgTAP y el flujo API completo, y elimina únicamente ese stack temporal al finalizar.

`npx supabase db reset --local` sobre el stack diario sigue siendo destructivo y requiere autorización explícita.

Nunca usar para este procedimiento:

- `supabase db push`;
- `supabase db reset --linked`;
- `supabase migration repair` contra un proyecto remoto;
- migraciones, despliegues o cambios de configuración contra producción.

## Navegador

La aplicación queda disponible en `http://127.0.0.1:5173`. Auth local acepta ese origen y no requiere confirmación de correo.
