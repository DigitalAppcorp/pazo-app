# Hoja de ruta — que vuelvan los usuarios que ya se registraron

Fecha: 6 de noviembre de 2026. Autoriza: el PO (dueño de PAZO), que pidió resolverla **punto por punto**.
Quién programa: Claude, por autorización del PO del 3-nov-2026 (registrada en `continuidad/ESTADO.md`). Este documento es la referencia para cualquier agente que retome el trabajo.

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

## Punto 1 — Pedir los avisos justo después de registrar la mascota

**Estado: PENDIENTE (siguiente).**

- **Objetivo:** que cada persona active el push en el momento en que más le importa, con un motivo concreto y con el nombre de su mascota.
- **Hoy:** `PushControl` (`src/features/push/PushControl.tsx`) tiene la variante `offer`, que solo se usa en `CareModal` y `ActiveLostAlertPanel`.
- **Propuesta:** al terminar el registro de la primera mascota, mostrar una oferta de avisos con texto del tipo «Te avisamos si alguien ve a [nombre] o si le toca una vacuna». Que se pueda omitir sin insistir.
- **Cuidados:**
  - iOS solo permite pedir el permiso tras un toque y con la PWA instalada; si no está instalada, mostrar cómo instalarla (ya existe `ios-needs-install`).
  - Respetar «Desactivar en este teléfono» (`pazo_push_off_v1`).
  - No volver a mostrarla si la persona la omitió.
- **Listo cuando:** la oferta aparece tras la primera mascota en ES y EN, a 375 px; activar crea la suscripción; omitir no vuelve a insistir; pruebas y CI en verde; publicado y observado en un teléfono real.

## Punto 2 — Recuperar las cuentas que no confirmaron el correo

**Estado: PENDIENTE.**

- **Objetivo:** que quien se registró llegue a entrar.
- **Antes de programar:** revisar en Supabase Auth la plantilla y el remitente del correo de confirmación, y si llega a spam (Gmail entrega los correos de cuenta según el aviso de privacidad). Sin proveedor de pago nuevo sin autorización (regla 15).
- **Propuesta:** un único reenvío automático del correo de confirmación a las 24 horas si sigue sin confirmar, más un botón visible de «Reenviar correo» en la pantalla de espera. Es un correo transaccional de la propia cuenta; no son correos de marketing.
- **Listo cuando:** existe el reenvío único sin duplicados, con registro de que se envió; el botón funciona; se observa una cuenta real o de prueba marcada recibiéndolo.

## Punto 3 — Sugerir el primer cuidado al terminar el registro

**Estado: PENDIENTE.**

- **Objetivo:** que cada mascota tenga al menos un recordatorio, por ejemplo su próxima vacuna. Así cada aviso es una razón para volver.
- **Propuesta:** tras la primera mascota (y después de la oferta de avisos del punto 1), sugerir crear un cuidado con un toque, con el tipo de vacuna (`src/features/care/vaccineTypes.ts`) y la fecha. Encaja con el aviso de bienvenida («Completar el perfil»).
- **Listo cuando:** se puede crear el primer cuidado desde la sugerencia; aparece en la agenda; el recordatorio push llega en su fecha (observado).

## Punto 4 — Ver en Administración quién llegó por anuncio

**Estado: PENDIENTE. Hay una decisión del PO.**

- **Hoy:** Administración → Usuarios muestra correo, antigüedad, mascotas y días activos, pero no el origen. El origen por cuenta existe en `marketing_private.acquisition` (`source`, `medium`, `campaign`, `creative`), solo para cuentas con registro confirmado.
- **Propuesta:** una etiqueta por cuenta: «Anuncio · Meta · [campaña]» o «Sin anuncio registrado». **No usar la palabra «orgánico»**: sin dato puede ser alguien que vino por un anuncio y se registró después o desde otro teléfono.
- **Límite:** el aviso publicado dice que el origen se borra a los **14 días**, así que la etiqueta desaparece después. **Decisión del PO:** dejarlo así o ampliar el plazo, lo que exige cambiar antes el aviso de privacidad.
- **Listo cuando:** la etiqueta aparece en Usuarios solo para administradores (RPC de administración) y las pruebas de privacidad pasan.

## Punto 5 — Ver la información de la mascota desde Administración

**Estado: PENDIENTE. Hay una decisión del PO.**

- **Hoy:** Administración → Mascotas muestra el nombre, la especie y el correo del dueño, sin detalle.
- **Propuesta:** tocar una mascota abre su **perfil público** (foto, raza, edad, descripción y publicaciones), lo mismo que ve cualquier usuario.
- **Límite:** los datos privados (salud, comida, código postal, vacunas, documentos) **no**. El aviso publicado el 3-nov dice que «Administración no ve los datos de cada persona». **Decisión del PO:** si los necesita, primero hay que cambiar el aviso y avisar a los usuarios.
- **Listo cuando:** desde Mascotas se abre el perfil público, sin ningún dato privado; la prueba lo fija.

---

## Registro

| Fecha | Punto | Qué pasó |
|---|---|---|
| 2026-11-06 | — | Hoja de ruta creada a pedido del PO. Punto 1 es el siguiente. |
