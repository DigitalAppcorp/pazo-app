# F16-P06 — origen del frontend QA confirmado por PO (2026-10-16)

## Decisión del PO y evidencia

- PO proporcionó como ubicación donde inicia sesión: `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app/#`.
- Browser conectado observó una **pestaña abierta de PAZO** con esa URL, título `Pazo • Su mundo, más cerca` y pantalla autenticada que muestra la sección `Gestionar Amigo de PAZO`. Esto confirma que la ruta está abierta en el navegador del PO; **no equivale** a auditoría de Vercel deployments, protegidos por 403 del conector. No se publica ningún nuevo preview, ni se edita Vercel.
- La parte `#` de la URL es un **fragmento de cliente**, no el origen, no debe incorporarse a `Origin` ni a callbacks PayPal. Se confirma el origen HTTPS exacto:
  `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app`.

## Tres ajustes específicos de checkout, SOLO tras verificación por PO

No sobrescribir `PAZO_F16_APP_ORIGIN` ni otras variables globales: los secrets de Supabase son **compartidos entre funciones** y el valor actual de ese secret no se conoce; cambiarlo podría afectar módulos preexistentes. Se prepararon **nuevos nombres privados y exclusivos para P06**:

| Edge Secret name | Valor exacto para Sandbox QA |
|---|---|
| `PAZO_F16_P06_QA_APP_ORIGIN` | `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app` |
| `PAZO_F16_P06_QA_RETURN_URL` | `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app/` |
| `PAZO_F16_P06_QA_CANCEL_URL` | `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app/` |

**Retorno y cancelación tienen deliberadamente la misma raíz disponible**: no hay evidencia verificada de rutas de callback dedicadas en ese build actual; la UI **no puede inferir pago ni cancelación a partir del regreso**. El estado se consulta posteriormente desde la gestión de suscripción, verificando al proveedor por el backend. No introducir `?query`, `#fragment`, credenciales, localhost ni URLs de PayPal Live. Si la URL expira o se sustituye, **no seguir** la prueba sin un nuevo origen explícito del PO.

## Código y pruebas

- `supabase/functions/f16-paypal-supporter/index.ts` ahora utiliza exclusivamente estos tres nombres `PAZO_F16_P06_QA_*` al construir el checkout. No lee ni cambia `PAZO_F16_APP_ORIGIN` o los callbacks globales anteriores. La protección `QA_CHECKOUT_RELEASE_APPROVED = false`, `PAZO_F16_PAYPAL_ENV=sandbox`, `PAZO_F16_P06_QA_ENABLE` (sin configurar/false), la coincidencia del Auth UID privado y el control de mismo origen HTTPS se mantienen.
- Prueba `src/features/supporter/testing/f16P06QaOriginIsolation.test.mjs` comprueba el origen aprobado, exclusión de `#`, namespacing, no dependencia del secret global, y bloqueo estático.
- Supabase Dashboard visto mediante browser **solo en nombres** y sin divulgar valor de secrets: `PAZO_F16_P06_QA_OWNER_ID` visible tras declaración `LISTO` del PO, `PAZO_F16_P06_QA_ENABLE` no visible, `PAZO_F16_APP_ORIGIN` ya existente, PayPal Sandbox client/env/plan names presentes, pero no se han verificado valores, expiración, ni correlación de merchant/plan. **Los tres nuevos nombres** aún no se han configurado en el Dashboard.
- Conector Vercel recibió 403 al consultar deployment bajo scope `digitalapp`; no se reintenta una operación mutante ni se inventa un nuevo alias.

## Fase siguiente y límites

El PO debe colocar **únicamente** esos tres valores en `Supabase → Edge Functions → Secrets`, sin cambiar `PAZO_F16_P06_QA_OWNER_ID`, `PAZO_F16_APP_ORIGIN`, `PAZO_F16_P06_QA_ENABLE`, credenciales PayPal u otras variables. No enviarlos como tokens, ni crear un nuevo PayPal subscription.

Hasta nuevo GO explícito: no deploy v3, no cambiar fuente `QA_CHECKOUT_RELEASE_APPROVED = false`, no activar el flag QA, no habilitar UI frontend, no comprar, no reconocer beneficios ni usar Live. Antes de una prueba real de compras, realizar smoke authenticated-deny y comprobar a un comprador PayPal Sandbox individual con el plan Sandbox correcto; no fiarse de la redirección.

**Resultado:** `F16_P06_QA_APP_ORIGIN_BROWSER_CONFIRMED_ISOLATED_REDIRECTS_PREPARED_SECRETS_PENDING_HARD_NO_GO`.


## Comprobación posterior al LISTO: tres nombres presentes, compra OFF (2026-10-16)

- PO respondió **«LISTO»** después de crear las **tres** variables de origen, retorno y cancelación QA en Supabase. **Browser conectado** inspeccionó exclusivamente nombres en la página oficial `/dashboard/project/mrybvqdebbgcayuvgkkr/functions/secrets`. Observación positiva para `PAZO_F16_P06_QA_APP_ORIGIN`, `PAZO_F16_P06_QA_RETURN_URL`, `PAZO_F16_P06_QA_CANCEL_URL` y `PAZO_F16_P06_QA_OWNER_ID`. `PAZO_F16_P06_QA_ENABLE` **no figura**. No acceder/emitir valores de secretos, no afirmar coincidencia de valores (Dashboard no los deja ver).
- Se verificó la **función realmente alojada** mediante `get_edge_function`: `f16-paypal-supporter` **v3 ACTIVE, verify_jwt=true, 11 archivos**; mantiene `const QA_CHECKOUT_RELEASE_APPROVED = false` antes de `compose()` y por ello toda compra sigue **NO-GO**. Esta v3 **NO** contiene el uso de `PAZO_F16_P06_QA_APP_ORIGIN`, `PAZO_F16_P06_QA_RETURN_URL`, `PAZO_F16_P06_QA_CANCEL_URL`, ni CORS con `apikey`: el parche está **en rama GitHub, sin desplegar**. Por tanto la mera creación de secrets no activa nada ni prueba el funcionamiento del regreso PayPal.
- Otros Edge alojados a fecha de lectura: `f16-paypal-webhook` v16 JWT false, `f16-paypal-supporter-account` v7 JWT true, `f16-paypal-operator-read` v4 JWT false. No atribuir cambios de versión a este chat ni sobrescribir estas funciones. Revisar versión destino al momento de deploy por posible actividad concurrente.
- SQL alojado **solo lectura**: cuenta QA Auth confirmada 1, intents/attempts/pagos de esa cuenta 0, ofertas P06 publicadas 2, ledger global 0, keys P42 0, writer P42 OFF, P21 worker OFF.
- QA frontend Vercel URL proporcionada y pestaña abierta por PO: `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app/#`; su **origin** canónico está definido sin hash. Conector Vercel continúa sin acceso a scope; no crear preview ni cambiar build sin nueva autorización.
- **Siguiente gate unificado solicitado al PO:** (1) revisar el HEAD exacto, mantener backend únicamente Sandbox y un UID Auth allowlisted; (2) desplegar versión siguiente del checkout con CORS corregido y 3 variables QA, dejando inicialmente `QA_CHECKOUT_RELEASE_APPROVED=false`; (3) smoke con JWT del comprador PAZO y lectura de oferta, configurar `PAZO_F16_P06_QA_ENABLE=true` de forma privada solo tras preflight; (4) tras nueva aprobación explícita, un único POST de creación PayPal Sandbox desde la UI por comprador PayPal Sandbox, sin dinero real, sin beneficios automáticos. Si 401/403/503 inesperado, PayPal no coincide o falla la lectura, **STOP** y QA OFF. No se permite un POST de compra al provider por solo haber guardado secrets.
- **Estado:** `F16_P06_QA_REDIRECT_SECRET_NAMES_CONFIRMED_HOSTED_V3_STATIC_OFF_NEW_CODE_NOT_DEPLOYED`; F16 Live NO-GO, PR #44 Draft.
