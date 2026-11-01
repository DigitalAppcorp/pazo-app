# PAZO — Publicación de atribución, Google y Meta

Fusionar no despliega (`git.deploymentEnabled=false`) ni cambia producción. Cada paso se verifica antes del siguiente. No usar `supabase db push`.

## Estado de producción (1-nov-2026)

Todo publicado por orden del titular, incluido el Pixel antes de demostrar la deduplicación. Los pasos 1 a 6 ya están hechos: no repetirlos.

- Vercel `dpl_G2gXMR2VtY7JC5GhBYCppm7zRkPf`, con los cuatro interruptores de build activos. Gate Meta en `true`.
- SQL adicional: fuente `20261101130000` instalada como `20261101062705`. `pg_net` enviaba `{}` y el worker devolvía 400 a cada llamada.
- Primer registro real: atribución `pazo_la_en_202611`/`app_v2_en`, evento `76c6420a-3a1d-4fad-a7ba-3b0a85378e27`, en `sent`. Meta muestra 1 de navegador y 1 de servidor en PAZO Web.
- **Deduplicación sin demostrar.** La pestaña de Meta indica que sigue analizando los datos. Antes de leer conversiones, revisar Deduplicación de eventos en Administrador de eventos. Si Meta no deduplica, apagar `VITE_PAZO_META_PIXEL_ENABLED` y desplegar.
- Sin probar con cuenta real: rechazo de consentimiento, GPC, retirada, cuenta existente y PWA.

## Interruptores

| Interruptor | Dónde | Inicial | Efecto |
| --- | --- | --- | --- |
| `meta_release_gate_candidate.enabled` | Base de datos | `false` | Sin él no hay consentimiento aceptado, evento ni envío. Es el corte principal |
| `VITE_PAZO_GOOGLE_AUTH_ENABLED` | Build | apagado | Botón de Google y texto legal de Google |
| `VITE_PAZO_META_ENABLED` | Build | apagado | Pantalla de consentimiento, retirada y texto legal de Meta |
| `VITE_PAZO_META_PIXEL_ENABLED` | Build | apagado | SDK en el navegador. Mantener apagado mientras la deduplicación no esté demostrada |
| `VITE_PAZO_PRIVACY_EFFECTIVE_DATE` | Build | sin valor | Fecha real de publicación del texto |

## Orden

1. **SQL:** aplicar solo, por `apply_migration`, `20261031032812_pazo_ads2_campaign_contract`, `20261101120000_pazo_meta_conversions` y `20261101120100_pazo_meta_worker_dispatch`. Registrar la versión alojada. Comprobar: gate en `false`, 0 filas de outbox, cuatro flags previos y sus fechas intactos, salud 14 días, PayPal sin cambios.
2. **Edge, con el gate apagado:** `pazo-marketing-attribution` y `pazo-marketing-landing` (contrato #168); `pazo-meta-grant`, `pazo-meta-receipt` y `pazo-meta-consent` con `verify_jwt=true`; `pazo-meta-worker` con `verify_jwt=false`. Comprobar que el worker rechaza una llamada sin credencial.
3. **Primer despliegue, todo apagado:** `/privacy` y `/terms` públicas. Verificar ES/EN sin sesión, Feed, Lugares, Agenda, QR, Alertas, Demo, Administración, PayPal y MFA.
4. **Google:** cliente de producción en `pazo-513404` con retorno `https://mrybvqdebbgcayuvgkkr.supabase.co/auth/v1/callback`; activar Google en Supabase y permitir `https://pazo-app.vercel.app/?auth=google`. Mantener confirmación de correo. El titular introduce el secreto. Después activar `VITE_PAZO_GOOGLE_AUTH_ENABLED` y `VITE_PAZO_PRIVACY_EFFECTIVE_DATE` y desplegar. Probar cuenta nueva, cuenta existente, cancelación y PWA.
5. **Meta, solo con la decisión del titular sobre revisión legal:** comprobar el token de `META_CAPI_ACCESS_TOKEN`, activar `VITE_PAZO_META_ENABLED` con Pixel apagado, desplegar, y luego poner el gate en `true`. Verificar un registro autorizado de principio a fin.
6. **Pixel:** solo con deduplicación demostrada en Meta.

## Reversión

| Problema | Acción |
| --- | --- |
| Meta | `UPDATE marketing_private.meta_release_gate_candidate SET enabled=false`. Efecto inmediato, sin desplegar. Después `SELECT cron.unschedule('pazo_meta_worker_v1')` si hace falta |
| Google | Quitar la variable y desplegar; desactivar el proveedor en Supabase para cerrar también el acceso directo |
| App | `vercel promote` o `vercel rollback` al despliegue anterior, que debe anotarse antes de empezar |
| SQL | No revertir con borrados. Las tablas Meta nuevas no afectan a nada con el gate apagado |

Tras revertir Meta, volver a un texto legal coherente: apagar `VITE_PAZO_META_ENABLED` y desplegar.

## Límites conocidos

- Quien rechaza 18+ conserva un registro de Auth sin perfil; se atiende por el correo de privacidad.
- Si la URL tiene parámetros cuando se pide el comprobante, ese registro no carga Pixel y queda CAPI.
- La consulta de consentimiento solo aparece en la sesión de la cuenta nueva; si se recarga antes, no se pide de nuevo ni hay conversión.
- `meta_try_enqueue_candidate` exige confirmación en los últimos 15 minutos.
