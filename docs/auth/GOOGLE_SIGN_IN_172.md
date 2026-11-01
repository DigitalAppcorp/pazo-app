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
| Alcance | `openid email profile`, los predeterminados, con `prompt=select_account` | Mínimo necesario y evita la cuenta equivocada en equipos compartidos |

Google es otro método de inicio de sesión. No sustituye el MFA de Administración: una sesión de Google es AAL1 y las operaciones sensibles siguen exigiendo su verificación.

## Datos nuevos

Supabase Auth recibe de Google correo, estado de verificación, nombre, foto e identificador de cuenta, y los conserva en `auth.identities` y `user_metadata`. PAZO no los copia a perfil, analítica ni Meta. La URL de retorno no llega a analítica porque se limpia al recibir la sesión. La política pública debe mencionarlo antes de encender: ver gates.

## Gates antes de encender en producción

Requieren GO del PO y no se ejecutaron.

1. **Aviso legal ES/EN:** añadir a «Servicios utilizados» el inicio de sesión con Google y los datos anteriores, con su fecha de publicación.
2. **Google Cloud:** cliente OAuth web de PAZO, pantalla de consentimiento con marca PAZO y enlaces legales, alcances `openid email profile`, y URI de redirección `https://mrybvqdebbgcayuvgkkr.supabase.co/auth/v1/callback`. Conservar el secreto solo en Google y Supabase, nunca en chat o GitHub. Si la pantalla sigue en modo de prueba, solo entran usuarios de prueba.
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
