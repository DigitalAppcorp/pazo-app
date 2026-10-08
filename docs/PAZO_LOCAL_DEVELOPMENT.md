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

`local:setup` inicia Supabase, actualiza únicamente las variables locales de Supabase en `.env.local` y aplica migraciones pendientes con `--local`.

`verify:local` comprueba:

- contrato de buckets, políticas y privilegios con pgTAP;
- signup local, trigger de perfil, upload/delete de avatar, creación de mascota y consulta del Feed mediante la API real;
- lint SQL local;
- gobernanza y build de producción.

La prueba API crea un usuario y una mascota aislados y los elimina al terminar. No imprime claves.

## Contrato local de Storage

Los buckets versionados son:

- `pet-avatars` — público, imágenes de hasta 5 MB;
- `post-photos` — público, imágenes de hasta 5 MB;
- `community-avatars` — público, imágenes de hasta 5 MB;
- `community-post-photos` — público, imágenes de hasta 5 MB;
- `pet-documents` — privado, PDF/JPEG/PNG/WEBP de hasta 10 MB.

Las políticas validan usuario/propiedad y las rutas que usa el cliente. Uploads públicos usan `upsert: false`, por lo que no se concede `UPDATE` de objetos.

## Reconstrucción completa

`npx supabase db reset --local` destruye los datos del Supabase local y reconstruye el esquema desde migraciones + `supabase/seed.sql`. Es útil para validar reproducibilidad, pero requiere autorización explícita antes de ejecutarse porque elimina datos locales.

Nunca usar para este procedimiento:

- `supabase db push`;
- `supabase db reset --linked`;
- migraciones, despliegues o cambios de configuración contra producción.

## Navegador

La aplicación queda disponible en `http://127.0.0.1:5173`. Auth local acepta ese origen y no requiere confirmación de correo.
