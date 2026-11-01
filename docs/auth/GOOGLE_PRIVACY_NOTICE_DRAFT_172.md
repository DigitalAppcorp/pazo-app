# PAZO — Borrador de aviso legal para acceso con Google (#172)

**BORRADOR. No publicado ni aprobado.** `src/features/legal/legalCopy.ts` no cambia hasta tu GO, y este texto describe el acceso con Google solo si se activa. No es asesoría legal; requiere revisión de una persona competente.

## Cambios propuestos a la política de privacidad

### 1. Sección «Cuenta y contenido» / «Account and content»

Cambiar solo la primera frase.

| | Actual | Propuesta |
| --- | --- | --- |
| ES | PAZO usa correo electrónico para autenticar la cuenta. | PAZO usa tu correo electrónico para autenticar la cuenta, con contraseña o mediante Google si eliges esa opción. |
| EN | PAZO uses an email address for account authentication. | PAZO uses your email address for account authentication, with a password or through Google if you choose that option. |

### 2. Sección nueva, después de «Cuenta y contenido»

**ES — Acceso con Google**

> Si eliges Continuar con Google, Google confirma tu identidad y comparte con Supabase, nuestro proveedor de autenticación, tu correo electrónico y si está verificado, tu nombre, tu foto de perfil y un identificador de tu cuenta de Google. PAZO usa estos datos para crear tu cuenta, permitirte entrar y reconocerla si vuelves. No los usa para completar tu perfil público ni para analítica. PAZO no recibe tu contraseña de Google. Si ya tienes una cuenta de PAZO con el mismo correo verificado, Google se añade como otra forma de entrar a esa cuenta. Google no nos comparte tu edad, por lo que te pedimos confirmar que tienes 18 años o más, y guardamos la fecha de esa confirmación. Estos datos se conservan mientras la cuenta esté activa, según la sección de conservación. Puedes retirar el acceso de PAZO desde tu cuenta de Google; eso no elimina tu cuenta de PAZO. Para solicitarlo, incluso si decidiste no continuar por no tener 18 años, escribe al correo de privacidad.

**EN — Sign in with Google**

> If you choose Continue with Google, Google confirms your identity and shares with Supabase, our authentication provider, your email address and whether it is verified, your name, your profile photo and an identifier for your Google account. PAZO uses this data to create your account, sign you in and recognize you when you return. It does not use it to complete your public profile or for analytics. PAZO does not receive your Google password. If you already have a PAZO account with the same verified email, Google is added as another way to sign in to that account. Google does not share your age with us, so we ask you to confirm that you are 18 or older and we store the date of that confirmation. This data is kept while the account is active, as described in the retention section. You can remove PAZO's access from your Google account; this does not delete your PAZO account. To request deletion, including if you chose not to continue because you are under 18, write to the privacy email.

### 3. Sección «Servicios utilizados» / «Service providers»

Añadir después de la frase sobre Gmail.

- **ES:** Si eliges Continuar con Google, Google también procesa tu inicio de sesión y sabe que accediste a PAZO.
- **EN:** If you choose Continue with Google, Google also processes your sign-in and knows that you accessed PAZO.

## Cambio propuesto a los términos

Sección «Edad mínima» / «Minimum age».

| | Actual | Propuesta |
| --- | --- | --- |
| ES | La declaración de edad en el registro no representa una verificación de identidad. | La declaración de edad al registrarte, también si usas Google, no representa una verificación de identidad. |
| EN | The age declaration at registration is not identity verification. | The age declaration at registration, including when you use Google, is not identity verification. |

## Fecha

Requiere una fecha efectiva real al publicar, y `PAZO_MARKETING_PRIVACY_EFFECTIVE_DATE` debe reflejarla si cambia el texto vigente. Publicar el aviso **antes o junto con** encender el botón, nunca después.

## Por qué cada afirmación es verdadera, y qué falta comprobar

| Afirmación | Evidencia |
| --- | --- |
| Datos que comparte Google | Claves observadas en la prueba real: `email`, `email_verified`, `name`, `full_name`, `picture`, `avatar_url`, `sub`, `provider_id`, `iss`, `phone_verified` |
| No completa el perfil público ni analítica | `src/` no lee `user_metadata`; las migraciones activas no copian `raw_user_meta_data`. **Falta confirmar en producción, con una lectura, que ningún trigger antiguo en `auth.users` lo haga** |
| Cuenta existente se vincula | Probado con GoTrue real y proveedor falso. **Sin probar con Google real** |
| Fecha de 18+ guardada | Prueba real: `pazo_adult_attested_at` |
| Retirar acceso no elimina la cuenta | Comportamiento de Google esperado. **No se probó** |
| Google sabe que accediste | Inherente al flujo OAuth |

**Conflictos que debes resolver antes de publicar:**

1. **Solicitud de eliminación.** El aviso promete atenderla por correo. Hace falta el proceso para quien rechaza 18+, porque su registro de Auth queda.
2. **Contraseña en cuentas de Google.** «¿Olvidaste tu contraseña?» podría crearle una a una cuenta solo de Google. Si se confirma, añadirlo al aviso o bloquearlo.
3. **Meta #171.** Este aviso no cubre compartir datos con Meta, que sigue con su propio borrador y aprobación. «No los usa para analítica» se refiere a los datos de Google; si #171 envía el hash del correo de una cuenta Google, los textos deben reconciliarse antes.

## Requisito de Google que hoy no se cumple

La pantalla de consentimiento de Google pide enlaces públicos a la política de privacidad y a los términos para salir del modo de prueba. **PAZO no tiene esas URL**: los textos solo se abren en un diálogo dentro de la app, y no hay ruta ni página pública. Hay que crear esas páginas antes de la verificación. Revisar también en Google Cloud los requisitos de dominio para `pazo-app.vercel.app`, y que la pantalla de Google mostrará el dominio de Supabase salvo que se configure uno propio, lo que puede tener costo.
