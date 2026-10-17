# PAZO F16-P42 — Edge Secrets inventory READ ONLY, acceso privado (2026-10-17)

**Product Owner autorizó:** comprobar únicamente si existe el nombre Edge `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` mediante canal privado read-only; sin generar, establecer, revelar, eliminar ni rotar ningún secreto. **No** se autorizan POST/DELETE, nuevo PAT, despliegues, claves DB, P21/P42, compras o beneficios.

**Proyecto fijo:** `mrybvqdebbgcayuvgkkr`. **Rama:** `f13/section-titles-20261012`, PR #44 DRAFT. **Custodio:** Product Owner único. No cambia la vigencia 24 horas ni la revocación manual de una futura clave; `T0` sigue sin elegir.

## Contrato y riesgo decisivo

La [Management API oficial](https://supabase.com/docs/reference/api/v1-list-all-secrets) acepta `GET https://api.supabase.com/v1/projects/mrybvqdebbgcayuvgkkr/secrets` con permiso OAuth `secrets:read` o `edge_functions_secrets_read` de token granular. **Su respuesta JSON puede incluir el campo `value` en cada objeto**. Por tanto, NO usar GET por una herramienta que reproduzca el cuerpo en chat/CI/terminal ni imprimir inventario, otros nombres, hashes o digests.

Alternativa oficial autenticada y también de solo lectura: `supabase secrets list --project-ref <ref>` ([CLI](https://supabase.com/docs/reference/cli/supabase-secrets-list)). La CLI muestra una tabla de nombres/digests, que debe capturarse íntegramente en memoria **solo por proceso privado**, no en stdout del operador. La CLI puede hacer internamente trabajo de autenticación, pero no solicita una mutación de secretos. Un PASS de lectura **NO** acredita `edge_functions_secrets_write`, revocación ni disponibilidad de canales de provisión.

## Código y límites

- `scripts/f16-p42-edge-secrets-readonly-once.mjs`: requiere `--execute-approved-readonly --attempt-id P42-EDGE-GET-20261017-01 --private-one-shot`. **Solo Windows privado**, Node 22, CI bloqueado; nunca se importa y ejecuta automáticamente.
- **Transporte preferido:** si la estación ya dispone del token administrativo en `SUPABASE_ACCESS_TOKEN`, Node hace **exactamente un GET** con TLS validado a `api.supabase.com`, sin cuerpo, sin redirecciones, con tamaño/límite temporal y proyecto fijo. No imprime respuesta ni token. Si existe token pero falla autorización, **NO** hace fallback ni un segundo intento.
- **Sin token heredado:** reutiliza la sesión ya autenticada de Supabase CLI 2.121.0, emite **una sola** invocación `supabase secrets list --project-ref mrybvqdebbgcayuvgkkr`, retiene stdout/stderr en memoria, valida formato estructurado `NAME | DIGEST`/unicode, descarta completamente digests/nombres ajenos. No examina ficheros de login ni pide crear una credencial nueva.
- La elección del transporte ocurre ANTES de reclamar el lock. Lock exclusivo `%LOCALAPPDATA%/PAZO/CodexOps/p42-edge-readonly-once-20261017-01.lock` creado ANTES de cualquier acceso remoto; ni borrado ni reintento. No reutiliza `P43`, `P43B` o `P42-WRITE-EPHEMERAL`.
- Devuelve exclusivamente: `P42_EDGE_READ_ONLY_PASS_TARGET_NAME_ABSENT` o `P42_EDGE_READ_ONLY_PASS_TARGET_NAME_PRESENT_REVIEW_REQUIRED`; `P42_EDGE_SECRETS_READ_VERIFIED_WRITE_UNVERIFIED`; `P42_NO_KEY_GENERATION_NO_PROVISION_NO_PAYMENT`. Fallos `P42_EDGE_READ_BLOCKED_*`, sin salida cruda. La condición PRESENT es **bloqueante**: auditar origen y alcance antes de realizar cualquier operación.
- `src/features/supporter/testing/f16P42EdgeSecretsReadonlyOnce.test.mjs`: test de proyección JSON con valores sensibles ficticios, tabla CLI, coincidencia exacta, formato adversarial, lock, scope, ausencia de acciones POST/DELETE y no fuga. Se ejecuta offline con glob `npm run test:f16:synthetic`, sin conexiones ni tokens. Confirmar CI del HEAD antes de ejecutar en Windows.

## Orden operacional para Codex en la computadora Windows

1. Leer AGENTS, handoff y este gate; sincronizar PR #44 sin destruir trabajo local. Verificar `CI` y `F16 Disposable PostgreSQL Lab` del commit final. No repetir P42-DB ni otras pruebas exitosas.
2. Verificar Node 22, versión Supabase CLI 2.121.0 y sesión autenticada del custodio, sin volcar login/config/tokens/hostnames ni encender `--debug`. Confirmar que no se esté grabando terminal/procesos.
3. Confirmar la ausencia por **existencia solamente** del lock nuevo; **no** borrarlo si ya existe. No cambiar variables/token ni generar uno nuevo para superar un fallo; si no hay credencial privada utilizable, declarar BLOCKED.
4. Ejecutar **solo una vez** desde la raíz del repo:
   ```powershell
   node .\scripts\f16-p42-edge-secrets-readonly-once.mjs --execute-approved-readonly --attempt-id P42-EDGE-GET-20261017-01 --private-one-shot
   ```
5. Informar **solamente** marcadores estáticos. Nunca stdout/stderr de CLI, respuesta API, digest, token, nombres de terceros o stack traces; no registrar capturas de la salida privada. Si error o contenido inesperado, detenerse, NO repetir ni cambiar de transporte.
6. Actualizar `docs/PAZO_ACTIVE_HANDOFF.md` en la **rama** con estado verificado por Codex, método usado (HTTPS/CLI), marcador y lock consumido, sin secretos. Confirmar CI del commit documental si se registra.

## Estado a fecha de creación

**Código preparado en PR #44, CI del commit técnico pendiente de verificación. No hay evidencia de ejecución real HTTPS/CLI todavía.** Conector Supabase de ChatGPT ofrece list/get Edge Functions pero **no** lectura de Edge Secrets por Management API. Por eso no se realizó la consulta alojada desde el chat.

Conforme al último preflight anterior, claves DB P42 0, writer P42 OFF, worker P21 OFF, bindings 0, ledger 0, privilegios RPC app denegados. El gate Edge aún **UNVERIFIED** hasta resultado del operador local. No interpretar nombres ausentes como borrado de backups/snapshots o garantía de clave no accesible en otros almacenes. **P42 provisionamiento, HMAC real, PayPal Live y F16 financiero NO-GO.**
