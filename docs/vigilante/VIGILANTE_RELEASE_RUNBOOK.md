# Vigilante — publicación, activación y reversión

Estado: **preparado, sin publicar.** Nada de esto se ejecuta sin el GO final explícito del PO.
Regla del PO: una sola publicación al final de la implementación completa. Unir a `main` no despliega (`vercel.json` `git.deploymentEnabled=false`).

## Piezas

| Pieza | Dónde | Estado |
|---|---|---|
| Catálogo de notificaciones (paso 0) | PR #202 | En `main`, sin desplegar |
| Captura de datos (paso 1) | PR #203 | Borrador |
| Autor oficial, Fundador, nombres reservados (paso 2) | PR #204 | Borrador, sobre #203 |
| Push de alertas, bandeja y motor (pasos 3–5) | PR sobre #204 | Borrador |
| Edge `pazo-push-worker` | textos fijos nuevos (`health_alert`, `admin_vigilante_*`) | Requiere redespliegue |
| Edge `pazo-vigilante-worker` | nuevo, `verify_jwt=false` | Requiere despliegue |

## Migraciones, en este orden (aplicación dirigida, nunca `db push` global)

1. `20261103200000_pazo_care_vaccine_type.sql`
2. `20261103201000_pazo_vigilante_private_details.sql`
3. `20261103202000_pazo_welcome_notification.sql` — crea un aviso de bienvenida por cuenta existente.
4. `20261103210000_pazo_official_author.sql` — marca como fundadora la cuenta administradora.
5. `20261103220000_pazo_health_alert_push.sql`
6. `20261103230000_pazo_vigilante_engine.sql` — instala el Vigilante **APAGADO** y programa `pazo_vigilante_tick_v1` cada 10 min (no hace nada mientras esté apagado).

Todas son aditivas. Probadas en orden en PostgreSQL 17 aislado (`npm run test:vigilante:pg17`, workflow `vigilante.yml`).

## Procedimiento de publicación (tras el GO final)

1. Confirmar CI verde de la cadena de PR y que ninguna de las seis versiones figura en `list_migrations`.
2. Aplicar las seis migraciones una por una con `apply_migration`, en el orden de arriba. Registrar el mapeo versión fuente → versión hospedada en este documento.
3. Verificar después de cada una: tablas, funciones y CHECK nuevos; `select enabled from vigilante_private.settings` = `false`; `cron.job` contiene `pazo_vigilante_tick_v1`.
4. Desplegar Edge: `pazo-push-worker` (textos fijos nuevos) y `pazo-vigilante-worker`.
5. Unir los PR en orden (#203 → #204 → pasos 3–5) a `main` y hacer **un** despliegue manual de Vercel.
6. **Antes de activar:** publicar el aviso de privacidad actualizado (código postal del hogar, salud y comida de la mascota, alertas de salud). Bloqueante.
7. Postflight: crear mascota (bienvenida), registrar vacuna con tipo, editar mascota con código postal, ver el feed sin publicaciones oficiales, abrir Administración → Vigilante (apagado, sin pendientes).

## Activación (decisión separada del PO)

1. Administración → Vigilante → interruptor **encendido** (`pazo_vigilante_set_enabled(true)`).
2. Esperar un ciclo (≤10 min): las fuentes muestran "última lectura" sin fallos.
3. Ningún aviso sale sin aprobación: revisar la bandeja; probar primero con "Enviarme una prueba".
4. AirNow queda apagado (requiere clave gratuita); el humo se cubre con las alertas de calidad del aire del NWS.

## Reversión

| Nivel | Acción | Efecto |
|---|---|---|
| 1. Apagar | Interruptor del panel o `update vigilante_private.settings set enabled=false` | Sin lecturas, borradores ni publicaciones. El resto de PAZO sigue igual. |
| 2. Cancelar una alerta | Bandeja → Últimos 14 días → Cancelar | Detiene los push pendientes, borra avisos no leídos y retira la publicación del feed. |
| 3. Push | `update push_private.release_gate set enabled=false` | Ningún push; la campana sigue funcionando. |
| 4. App | Volver al despliegue anterior de Vercel | La base es compatible hacia atrás (todo aditivo). |
| 5. Esquema | `supabase/rollbacks/vigilante_20261103_FULL_REVIEW_REQUIRED.sql` | Borra datos del Vigilante y del paso 1. Solo con GO explícito y respaldo. |

## Dependencias y límites conocidos

- **Huella del teléfono para editar:** el servidor acepta un segundo factor reciente (`totp` o `webauthn`, 5 minutos). Hoy la app pide el código TOTP del autenticador, que ya usa el panel. La passkey requiere confirmar que Supabase Auth del proyecto la ofrece como factor; hasta entonces el respaldo aprobado (Google Authenticator) es el camino.
- **Diseño de insignias:** las insignias Oficial y Fundador son provisionales (orden a ChatGPT en `ORDEN_CHATGPT_INSIGNIAS.md`).
- **Página pública de un aviso:** compartir abre la app; una página pública por aviso queda fuera de este alcance.
- **Brotes:** el Condado de LA no publica un feed estructurado; se cargan con el modo manual (enlace oficial + vacuna + zona).
- **iPhone:** el push solo llega con la PWA instalada; sin entrega en iPhone observada todavía.
- **Horas de silencio:** calculadas en hora de Los Ángeles para todas las cuentas (mercado de lanzamiento).
