# PAZO — Acceso con Google (#172)

**Estado: candidato en PR, apagado.** Sin merge, despliegue ni cambios en Google o Supabase alojado. Se enciende con `VITE_PAZO_GOOGLE_AUTH_ENABLED=true`; sin ese valor la pantalla sigue mostrando «Google · próximamente».

## Decisiones

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Edad 18+ | En registro, el checkbox se exige antes de salir a Google. Una cuenta nueva que llega sin él pasa por una pantalla de confirmación antes de crear su perfil | Google no comparte la edad y el botón de login también puede crear cuentas |
| Dónde se guarda | `user_metadata.pazo_adult_attested_at`, solo fecha | Es autodeclaración, como el checkbox actual. No es prueba de edad |
| Quién la necesita | Solo cuentas con Google como único proveedor | Una cuenta de correo ya la confirmó al registrarse |
| Conversión | Solo una cuenta exclusivamente Google creada en los últimos 10 minutos entra al embudo, y no se envía atribución antes de confirmar 18+ | Un login o una vinculación no son un registro nuevo |
| Flujo OAuth | Se conserva el flujo implícito actual, con `?auth=google` y limpieza de URL al volver | Cambiar a PKCE afecta a todo el cliente, incluida la recuperación por correo. Revisarlo aparte |
| Alcance | `email profile`, los predeterminados de Supabase, con `prompt=select_account` | Mínimo necesario y evita la cuenta equivocada en equipos compartidos |

Google es otro método de inicio de sesión. No sustituye el MFA de Administración: una sesión de Google es AAL1 y las operaciones sensibles siguen exigiendo su verificación.

## Datos nuevos

Supabase Auth recibe de Google correo, estado de verificación, nombre, foto e identificador de cuenta, y los conserva en `auth.identities` y `user_metadata`. PAZO no los copia a perfil, analítica ni Meta. La URL de retorno no llega a analítica porque se limpia al recibir la sesión. La política pública debe mencionarlo antes de encender: ver gates.

## Prueba con Google real (1-nov-2026)

Ejecutada por el PO con una cuenta suya, contra Supabase **local** y `scripts/google-auth-real-lab.mjs`. Proyecto Google `pazo-513404`, en modo de prueba, con un cliente cuyo único retorno es local.

| Comprobación | Resultado |
| --- | --- |
| El botón llega a Google con la app PAZO y `prompt=select_account` | PASS |
| Retorno con URL limpia `http://127.0.0.1:5398/` | PASS |
| Cuenta nueva: proveedor solo Google, correo confirmado, `email_confirmed_at >= created_at` | PASS |
| Pantalla de 18+ antes del perfil, y su marca guardada al confirmar | PASS |
| Segundo acceso: misma cuenta, una identidad, sin volver a pedir edad | PASS |
| Sin secreto de cliente en los registros de Auth, según búsqueda de texto | PASS |

**No cubre:** Supabase alojado, cuenta existente con correo y contraseña contra Google real, cancelación real, PWA instalada, primera mascota y atribución real. La base local no tiene las tablas de PAZO, así que la app se detuvo en la carga de mascotas, como se esperaba.

Google pidió `email profile`, y `openid` no apareció en la URL de autorización.

## Gates antes de encender en producción

Requieren GO del PO y no se ejecutaron.

1. **Aviso legal ES/EN:** aprobar y aplicar el [borrador](GOOGLE_PRIVACY_NOTICE_DRAFT_172.md), con su fecha de publicación. Las páginas públicas `/privacy` y `/terms` llegan con este PR y deben estar desplegadas antes de configurar los enlaces en Google.
2. **Google Cloud:** en el proyecto `pazo-513404`, cliente OAuth web de producción, enlaces legales en la marca, alcances `email profile`, y URI de redirección `https://mrybvqdebbgcayuvgkkr.supabase.co/auth/v1/callback`. No reutilizar el cliente `PAZO local QA`. Conservar el secreto solo en Google y Supabase, nunca en chat o GitHub. Si la pantalla sigue en modo de prueba, solo entran usuarios de prueba.
3. **Supabase Auth:** activar Google con esas credenciales y añadir `https://pazo-app.vercel.app/?auth=google` a las URL permitidas. Mantener la confirmación de correo activa: la atribución la exige. **Sin este paso, encender el botón lleva a una respuesta de error de Supabase**, por eso va antes que la variable.
4. **Prueba real:** cuenta nueva, cuenta existente con el mismo correo, cancelación y retorno en PWA instalada, con cuentas autorizadas.
5. **Encender:** `VITE_PAZO_GOOGLE_AUTH_ENABLED=true` y despliegue, con su propio GO.

**Reversión:** apagar la variable y desplegar. Las cuentas ya creadas con Google no podrán volver a entrar por ese botón hasta reactivarlo.

## Límites conocidos

- Quien responde «No tengo 18 años» sale sin perfil ni atribución, pero su registro de Auth queda: el cliente no puede borrarlo. Definir la limpieza en el servidor antes de crecer.
- Una cuenta solo-Google no tiene contraseña. «¿Olvidaste tu contraseña?» puede enviarle un enlace y le crearía una; no se probó con Google real.
- Sin una Edge Function nueva: se reutiliza la atribución ya desplegada, que exige `mailer_autoconfirm=false`.

## Integración con Meta #171

Meta sigue OFF y este PR no toca sus archivos. Al integrar #171:

1. Rebasar #170 y #171 sobre `main` después de este PR, resolviendo `AuthContext.tsx` a mano.
2. Pedir el comprobante del evento solo cuando la URL ya esté limpia: el cargador del Pixel rechaza URLs con parámetros y este flujo las limpia al recibir la sesión.
3. `CompleteRegistration` solo para cuentas nuevas tras confirmar 18+. Reutilizar `isNewGoogleAccount`, sin contar `SIGNED_IN`.
4. Revisar en `meta_try_enqueue_candidate` que `signup_verified_at=email_confirmed_at` se cumpla con Google. El orden de esas fechas se valida en el laboratorio GoTrue de este PR, pero el outbox de Meta no se probó con cuentas Google.

## Reproducir

```bash
npm run test:google-auth
```

```bash
npm run test:google-auth:browser
```

El laboratorio GoTrue corre en `.github/workflows/google-auth.yml`.
