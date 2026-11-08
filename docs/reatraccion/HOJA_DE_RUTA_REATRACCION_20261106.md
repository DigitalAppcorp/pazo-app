# Hoja de ruta — que vuelvan los usuarios que ya se registraron

Fecha: 6 de noviembre de 2026. Autoriza: el PO (dueño de PAZO), que pidió resolverla **punto por punto**.
Quién programa: Claude, por autorización del PO del 3-nov-2026 (registrada en `continuidad/ESTADO.md`). Este documento es la referencia para cualquier agente que retome el trabajo.

**Decisión vigente del PO (8-nov-2026): publicación conjunta.** Los puntos restantes y todas las subrutas se preparan, prueban y revisan por separado. La publicación pendiente se hace cuando el conjunto esté completo; no se publica ni se activa cada bloque por su cuenta. Los puntos ya publicados conservan su estado.

[Subhoja de regreso, perfil compartido e instalación de PAZO](SUBHOJA_REGRESO_PERFIL_PWA.md). Incluye avisos según el avance, el enlace al perfil social, la tarjeta para instalar PAZO y la medición en Administración.

## Cómo retomar

1. Leer esta hoja completa y el registro local `continuidad/ESTADO.md` (fuera del repositorio, en la computadora del PO).
2. Trabajar **un punto a la vez**, en el orden de abajo. Al cerrar un punto, actualizar su estado aquí (PR, commit, despliegue y lo observado).
3. Reglas que no cambian:
   - **Despliegue:** se implementa el punto completo y se publica **una sola vez** en Vercel. Unir a `main` no despliega (`vercel.json` `git.deploymentEnabled=false`). Cada publicación necesita el GO explícito del PO en el chat.
   - **Privacidad:** nada puede contradecir el aviso publicado (`src/features/legal/legalCopy.ts`). Si un punto cambia qué datos se ven o cuánto se guardan, primero hay que cambiar el aviso, con aprobación del PO.
   - **Panel de administración:** gráficos y preguntas de negocio; las explicaciones van solo detrás del botón «i».
   - **Cuentas de prueba y administradores fuera de las cifras:** usar siempre `marketing_private.is_reporting_owner`.
   - **Cero contornos** (regla 21 de `AGENTS.md`).

## Punto de partida (6-nov-2026, producción)

Cuentas reales, sin administración ni pruebas: **7**.

| Situación | Cuentas |
|---|---|
| Se registraron y **nunca confirmaron el correo** | 4 |
| Confirmaron, sin mascota | 1 |
| Confirmaron con mascota y vieron su QR (0 lo descargaron) | 2 |
| Crearon un cuidado o recordatorio | 0 |
| **Con avisos push activos** | **0** |
| Con origen de anuncio registrado | 1 (Meta, campaña `pazo_la_en_202611`) |

Diagnóstico:
- La fuga más grande es el correo sin confirmar.
- Sin push no hay forma de llamar a nadie de vuelta. Hoy PAZO solo ofrece los avisos en la campana (`NotificationsModal`), al crear un cuidado (`CareModal`) y en la alerta de mascota perdida (`ActiveLostAlertPanel`). **Nunca al registrar la primera mascota.**
- Nadie creó un recordatorio, que es la razón natural para volver.
- Ya está arreglado (PR #210, publicado el 6-nov): los avisos se perdían al cerrar sesión y no volvían.

Cómo saber si funciona: cuentas reales con push activo (`push_private.subscriptions`), proporción de correos confirmados, cuidados creados (`marketing_private.utility_outcomes.care_created_at`) y regreso al día 7 (`return_d7_at`).

---

## Punto 1 — Activar los avisos desde el registro de la cuenta

**Estado: PUBLICADO en [PR #212](https://github.com/DigitalAppcorp/pazo-app/pull/212), `main` `a854593d`, Vercel `dpl_GRkeRRKXPkLbAJD51J3YTwf939c4`.** Oferta y cierre verificados en navegador; queda observar la activación desde la oferta de primera mascota en un teléfono físico.

**Corrección publicada el 8-nov-2026 en [PR #217](https://github.com/DigitalAppcorp/pazo-app/pull/217), `main` `186eb2db`, Vercel `dpl_4jzQhWMJ2nPwM5mCDQAKQw8SudJW`.** Al crear la cuenta, con correo o Google, el navegador puede pedir su permiso si aún no está decidido. PAZO registra el dispositivo al obtener una sesión confirmada con permiso concedido, incluso con cero mascotas. Al salir se desvincula el dispositivo y al entrar se recupera la suscripción con el permiso guardado. Se respeta «Desactivar en este teléfono». CI 14/14 y pruebas de Chrome con permiso simulado pasaron. Se comprobó la carga de la app publicada en Chrome. Pendiente prueba en teléfono físico. La invitación tras la primera mascota descrita abajo pertenece a #212.

- **Objetivo:** que cada persona active el push en el momento en que más le importa, con un motivo concreto y con el nombre de su mascota.
- **Hoy:** `PushControl` (`src/features/push/PushControl.tsx`) tiene la variante `offer`, que solo se usa en `CareModal` y `ActiveLostAlertPanel`.
- **Decidido por el PO (6-nov-2026):**
  - La invitación explica **sin tecnicismos** que PAZO necesita avisar para recordar vacunas y cuidados, y para contar al momento si la mascota se pierde y alguien la ve o la encuentra. Título «Cuidemos juntos a [mascota]», botones «Sí, avísame» y «Ahora no». Aparece después de «Todo listo», que no cambia.
  - Si la persona dice «Ahora no», **la agenda y la alerta de mascota perdida** lo vuelven a explicar en su momento: «Activa las notificaciones para que podamos avisarte de tu recordatorio» y «…para que te avisemos en cuanto alguien vea a [mascota]». Ese recordatorio aparece mientras los avisos sigan apagados.
  - No se habla de «la» mascota: puede ser macho o hembra, así que se usa su nombre.
- **Cuidados:**
  - iOS solo permite pedir el permiso tras un toque y con la PWA instalada; si no está instalada, mostrar cómo instalarla (ya existe `ios-needs-install`).
  - Respetar «Desactivar en este teléfono» (`pazo_push_off_v1`).
  - No volver a mostrarla si la persona la omitió.
- **Listo cuando:** la oferta aparece tras la primera mascota en ES y EN, a 375 px; activar crea la suscripción; omitir no vuelve a insistir; pruebas y CI en verde; publicado y observado en un teléfono real.

## Punto 1b — Barra de progreso en el registro

**Estado: PUBLICADO en [PR #212](https://github.com/DigitalAppcorp/pazo-app/pull/212), `main` `a854593d`, en el mismo despliegue que el punto 1.** Verificado en ES y EN a 375 px. Pedido por el PO el 6-nov-2026: el registro parecía una lista larga de tareas.

- Cuatro tramos, uno por pantalla: Tu cuenta, Confirma tu correo, Tu mascota y Tu zona (`src/features/onboarding/OnboardingProgress.tsx`). Los tramos cruzados en verde, el actual en lima. Se conserva «Paso X de 3», del que dependen pruebas de navegador.

## Punto 2 — Recuperar las cuentas que no confirmaron el correo

**Estado: PUBLICADO Y VERIFICADO en [PR #213](https://github.com/DigitalAppcorp/pazo-app/pull/213), `main` `3cc9d548`, Vercel `dpl_HQnPezsFjej9w25zJcLES2JPYd7J`.** El recordatorio único usa Supabase Auth y elimina su marca a los 14 días. Dos cuentas reales confirmaron y accedieron después del reenvío automático: en ambos casos coinciden la ejecución programada, una llamada de reenvío exitosa y el uso posterior del enlace. La evidencia es de confirmación; no identifica la carpeta del mensaje. En PR #212, la pantalla «Revisa tu correo» ya pide mirar spam y la pestaña Promociones de Gmail (el PO sospecha que entraron al correo y no lo vieron).

- **Objetivo:** que quien se registró llegue a entrar.
- **Antes de programar:** revisar en Supabase Auth la plantilla y el remitente del correo de confirmación, y si llega a spam (Gmail entrega los correos de cuenta según el aviso de privacidad). Sin proveedor de pago nuevo sin autorización (regla 15).
- **Propuesta:** un único reenvío automático del correo de confirmación a las 24 horas si sigue sin confirmar, más un botón visible de «Reenviar correo» en la pantalla de espera. Es un correo transaccional de la propia cuenta; no son correos de marketing.
- **Listo cuando:** existe el reenvío único sin duplicados, con registro de que se envió; el botón funciona; se observa una cuenta real o de prueba marcada recibiéndolo.

## Punto 3 — Sugerir el primer cuidado al terminar el registro

**Estado: PUBLICADO en [PR #216](https://github.com/DigitalAppcorp/pazo-app/pull/216), `main` `520da6ca`, Vercel `dpl_5xmxSVosc1uXMRbCT5X76DFPpFwE`.** Los 12 workflows pasaron para el candidato, y los cinco archivos del cambio coinciden con los probados. La sugerencia, el guardado y su aparición en Agenda se comprobaron en Chrome ES/EN con PostgreSQL aislado. El dominio de producción sirve el despliegue y Chrome carga la app. Falta observar el aviso de cuidado en su fecha en un teléfono físico.

- **Objetivo:** que cada mascota tenga al menos un recordatorio, por ejemplo su próxima vacuna. Así cada aviso es una razón para volver.
- **Propuesta:** tras la primera mascota (y después de la oferta de avisos del punto 1), sugerir crear un cuidado con un toque, con el tipo de vacuna (`src/features/care/vaccineTypes.ts`) y la fecha. Encaja con el aviso de bienvenida («Completar el perfil»).
- **Listo cuando:** se puede crear el primer cuidado desde la sugerencia; aparece en la agenda; el recordatorio push llega en su fecha (observado).

## Punto 4 — Ver en Administración quién llegó por anuncio

**Estado: IMPLEMENTADO EN CANDIDATO [PR #219](https://github.com/DigitalAppcorp/pazo-app/pull/219).** Usuarios muestra «Anuncio · Meta · campaña» o «Sin anuncio registrado». Se conservó el plazo vigente de 14 días. Verificados el permiso de Administración y el ocultamiento tras vencer.

- **Hoy:** Administración → Usuarios muestra correo, antigüedad, mascotas y días activos, pero no el origen. El origen por cuenta existe en `marketing_private.acquisition` (`source`, `medium`, `campaign`, `creative`), solo para cuentas con registro confirmado.
- **Propuesta:** una etiqueta por cuenta: «Anuncio · Meta · [campaña]» o «Sin anuncio registrado». **No usar la palabra «orgánico»**: sin dato puede ser alguien que vino por un anuncio y se registró después o desde otro teléfono.
- **Límite:** el aviso publicado dice que el origen se borra a los **14 días**, así que la etiqueta desaparece después. **Decisión del PO:** dejarlo así o ampliar el plazo, lo que exige cambiar antes el aviso de privacidad.
- **Listo cuando:** la etiqueta aparece en Usuarios solo para administradores (RPC de administración) y las pruebas de privacidad pasan.

## Punto 4b — Que el origen del anuncio sobreviva al cambio de navegador

**Estado: IMPLEMENTADO EN CANDIDATO [PR #219](https://github.com/DigitalAppcorp/pazo-app/pull/219).** Chrome envía el código validado al alta por correo. PostgreSQL aislado comprobó que una confirmación sin contexto local lo promueve una vez, que el código no permanece en los metadatos y que la limpieza retira los vencidos. Captura apagada y aviso de privacidad preparado para la entrega conjunta. Agregado el 6-nov-2026, a partir de una pregunta del PO.

- **Hipótesis del PO, descartada:** que «sin dato» sea gente que rechaza el seguimiento de Meta. El registro propio del origen **no depende** de esa casilla: `marketingRuntime.ts` crea el registrador con `enabled: true` siempre. La casilla de Meta solo decide si se le comunica el registro a Meta.
- **Causas reales:**
  1. El origen solo se asocia a la cuenta **después de confirmar el correo** (`signupVerified` en `src/features/marketing/attribution.ts`). Sin confirmación no hay origen; lo cubre el punto 2.
  2. El código del anuncio vive en `localStorage` del navegador donde se abrió el anuncio, durante 72 h (`MARKETING_ATTRIBUTION_TTL_MS`). Un anuncio de Meta abre PAZO dentro de Instagram o Facebook. El enlace del correo de confirmación suele abrirse en otro navegador (Gmail, Chrome o Safari), sin ese código, y la cuenta queda «sin dato» aunque viniera del anuncio. Es probable, pero no está comprobado con los datos actuales.
- **Propuesta:** al pedir el registro, guardar en el servidor el código de campaña ya validado (lista cerrada, sin IP, URL ni identificadores externos), atado a la cuenta pendiente. Pasarlo a `marketing_private.acquisition` cuando el servidor vea el correo confirmado, y borrarlo si no se confirma en 72 h.
- **Decisión del PO:** el aviso publicado dice que el origen se asocia a la cuenta «solo después de confirmar el registro». Guardarlo antes, aunque solo se use tras confirmar, exige ajustar antes ese texto.
- **Listo cuando:** una cuenta de prueba marcada que llega por un enlace de campaña y confirma el correo en otro navegador queda con su origen; las pendientes sin confirmar se borran a las 72 h; las pruebas de privacidad pasan.

## Punto 5 — Ver la información de la mascota desde Administración

**Estado: IMPLEMENTADO EN CANDIDATO [PR #219](https://github.com/DigitalAppcorp/pazo-app/pull/219).** Chrome verificó que se puede abrir con teclado el mismo perfil social público desde Mascotas. Abre en otra pestaña y conserva el contexto de Administración.

- **Hoy:** Administración → Mascotas muestra el nombre, la especie y el correo del dueño, sin detalle.
- **Propuesta:** tocar una mascota abre su **perfil público** (foto, raza, edad, descripción y publicaciones), lo mismo que ve cualquier usuario.
- **Límite:** los datos privados (salud, comida, código postal, vacunas, documentos) **no**. El aviso publicado el 3-nov dice que «Administración no ve los datos de cada persona». **Decisión del PO:** si los necesita, primero hay que cambiar el aviso y avisar a los usuarios.
- **Listo cuando:** desde Mascotas se abre el perfil público, sin ningún dato privado; la prueba lo fija.

---

## Registro

| Fecha | Punto | Qué pasó |
|---|---|---|
| 2026-11-06 | — | Hoja de ruta creada a pedido del PO. Punto 1 es el siguiente. |
| 2026-11-06 | 4b | Agregado: el origen se pierde al confirmar el correo en otro navegador; descartado que dependa de la casilla de Meta. |
| 2026-11-06 | 1 | En curso: rama `feat/push-offer-first-pet-20261106`. |
| 2026-11-06 | 1, 1b, 2 | El PO pidió invitación sin tecnicismos, recordatorio en agenda y mascota perdida tras «Ahora no», barra de progreso y aviso de spam. Todo en PR #212. |
| 2026-11-06 | — | Prueba frágil detectada (no es de esta hoja, pero bloquea su CI): «D7 mature calendar cohort» en `scripts/behavior-pg17.mjs` (jobs `behavior` e `intelligence`). Usa `now()-interval '10 days'` y `now()-interval '1 day'`; cuando esos instantes caen a ambos lados de un cambio de horario de Los Ángeles, entre las 07:00 y las 08:00 UTC quedan en otro día de calendario y falla. **Pendiente:** anclar los datos de la prueba a la medianoche de Los Ángeles. |
| 2026-11-08 | 1, 1b, 2 | Publicación reconciliada con #212 y #213; dos confirmaciones reales después del recordatorio. Punto 3 en preparación. |
| 2026-11-08 | 3 | #216 publicado en producción. Falta observación del push de cuidado en teléfono físico. |
| 2026-11-08 | 1 | PO pidió activación durante el alta y restauración al volver. Candidato #217 probado en Chrome con datos sintéticos. |
| 2026-11-08 | 1 | PO aclaró que la activación debe empezar en el alta de cuenta, antes de guardar una mascota. #217 y la subhoja se ajustan a ese alcance. |
| 2026-11-08 | 1 | #217 publicado. Activación durante el alta de cuenta y recuperación al entrar. Pendiente prueba física. |
| 2026-11-08 | Subhoja 2 | Candidato [#218](https://github.com/DigitalAppcorp/pazo-app/pull/218): perfil social compartible probado en Chrome. Sin cambios alojados. |
| 2026-11-08 | 4, 4b, 5 | [PR #219](https://github.com/DigitalAppcorp/pazo-app/pull/219) integra los puntos pendientes. Verificación local con Chrome y PostgreSQL. Revisar CI y prueba física antes de publicar el paquete. |
