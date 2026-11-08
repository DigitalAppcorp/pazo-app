# Subhoja de regreso, perfil compartido e instalación de PAZO

Propuesta del 8 de noviembre de 2026. Complementa la [hoja principal](HOJA_DE_RUTA_REATRACCION_20261106.md). Los plazos, textos y límites de envío son propuestas para revisión. Cada bloque tendrá su propia verificación. El PO decidió publicar los cambios pendientes juntos, cuando estén completas la hoja madre y todas las subrutas.

## 1. Reutilizar el correo de confirmación y preparar la entrega de push

El [PR #213](https://github.com/DigitalAppcorp/pazo-app/pull/213) ya envía un único recordatorio con el enlace de Supabase Auth a las 24 horas si la cuenta sigue sin confirmar. El botón «Reenviar correo» continúa disponible. El plan reutiliza ese envío y su deduplicación. El texto puede acompañar a quien todavía tiene el registro pendiente: «Gracias por probar PAZO. Si quieres continuar, confirma tu correo desde este enlace».

El [PR #217](https://github.com/DigitalAppcorp/pazo-app/pull/217) mueve la activación al registro de la cuenta. En **Crear cuenta** o **Continuar con Google** desde el registro, el navegador puede solicitar su permiso si todavía está pendiente. PAZO registra el dispositivo al obtener una sesión confirmada con permiso concedido, incluso si la persona sigue en **Tu mascota** y todavía no guardó un perfil. Si el dispositivo no admite push, la persona bloqueó el permiso o no hay suscripción activa, el aviso queda dentro de PAZO para su próxima visita. En iPhone, Web Push requiere abrir PAZO desde su icono instalado. [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

Verificación. Una cuenta confirmada sin mascota se suscribe en un dispositivo que ya dio permiso. Una cuenta no confirmada usa el flujo de correo vigente. Bloquear avisos, desactivarlos en el teléfono o cerrar sesión impide nuevos envíos a ese dispositivo. Al volver a entrar se recupera la suscripción cuando el permiso sigue vigente.

## 2. Hacer que el perfil social se pueda abrir y compartir

**Candidato [#218](https://github.com/DigitalAppcorp/pazo-app/pull/218), `2550aad2`.** Chrome con datos ficticios comprobó el acceso desde la tarjeta y con teclado, la edición independiente, compartir/copiar, apertura y recarga sin sesión, regreso al perfil después del acceso en la misma pestaña y ausencia de invitación al entrar con cuenta. Se verificó la consulta de solo lectura con el rol anónimo. La vista previa externa es genérica de PAZO. No hay migración ni envíos. CI 14/14 y verificación visual adicional en Chrome a 320 × 568 aprobadas. Se conserva en borrador para la publicación conjunta, incluida su aclaración de privacidad ES/EN.

- En **Mi mascota**, tocar la foto, el nombre o el espacio principal de la tarjeta abre la misma vista social que ve un visitante. **Editar** y **Compartir perfil** tienen acciones propias y funcionan con teclado y lector de pantalla. El área que abre el perfil se implementa sin anidar botones.
- Ubicar **Compartir perfil** junto a **Editar**. Abrir el menú de compartir del dispositivo cuando esté disponible y ofrecer **Copiar enlace** como alternativa. Distinguir abrir el menú, copiar el enlace y completar el envío según lo que la plataforma permita observar.
- El enlace HTTPS debe abrir directamente el perfil social, incluso sin sesión y desde otro navegador. Reutilizar la vista social existente y proyectar solo los campos y publicaciones que ya son públicos. Las reglas de visibilidad también se aplican al abrir el enlace y a la vista previa que generan las redes. Resolver con un estado amable si el perfil ya no está disponible.
- Al pie del perfil, mostrar «¿Tienes una mascota? Crea su perfil en PAZO y compártelo con quien quieras» con **Conocer PAZO** cuando termine la comprobación de sesión y el visitante sea invitado. Ocultarlo para una cuenta autenticada. Conservar el destino si el visitante elige entrar.

Verificación. Abrir desde la tarjeta, compartir y abrir el enlace en un navegador sin sesión. Comparar con la vista que recibe una cuenta distinta. Probar edición y acciones con teclado, perfil restringido y ausencia de datos privados como correo, ubicación, historial clínico o documentos.

## 3. Ofrecer instalar PAZO tras la primera mascota

Mostrar una tarjeta del mismo estilo que **Todo listo** y **Primer cuidado**. Presentarla cuando termine el aviso de bienvenida y después de que la persona complete u omita la sugerencia de cuidado. Mostrar una sola tarjeta a la vez. Si está usando PAZO instalado o ya desestimó esta oferta en el dispositivo, omitirla. Conservar la opción de instalar desde los ajustes.

> **Ten PAZO a mano**
> Abre el perfil y la agenda de tu mascota desde un icono en tu pantalla.
>
> **Instalar PAZO** · **Ahora no**

Reutilizar `PazoInstallControl` y `installPromptBridge`. En Chrome con solicitud disponible, abrir el diálogo nativo al tocar **Instalar PAZO**. En iPhone, mostrar **Cómo instalar** con los pasos del menú Compartir. En una ventana integrada que no permita instalar, indicar cómo abrir PAZO en el navegador del teléfono. Al abrir la PWA instalada por primera vez, el permiso de avisos puede resolverse con una acción del usuario si todavía falta. [Instalación de PWA](https://web.dev/articles/customize-install) · [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

Verificación. Primera mascota en Chrome móvil y iPhone. La instalación, la salida con **Ahora no** y el caso ya instalado respetan la secuencia. Se puede entrar y continuar con el cuidado aunque la instalación se cancele.

## 4. Enviar avisos según el punto donde se quedó la persona

| Momento propuesto | Quién puede recibirlo | Mensaje | Destino |
| --- | --- | --- | --- |
| 24 h desde el registro | Correo aún sin confirmar | «Gracias por probar PAZO. Si quieres continuar, confirma tu correo desde este enlace». Reutilizar el recordatorio vigente. | Enlace de confirmación de Supabase Auth |
| 48 h desde confirmar | Cuenta en sesión en al menos un dispositivo suscrito y todavía sin mascota | «Gracias por visitar PAZO. Si te apetece, crea el perfil de tu mascota para tener su foto, su agenda y su enlace en un mismo lugar». | Continuar en **Tu mascota** |
| 3 días desde la primera mascota | Perfil social compartible y sin señal previa de copiar o compartir | Push «Comparte el perfil de tu mascota con tus amigos». En PAZO «¿Te gustaría presentarles a {mascota}? Comparte su perfil con quien quieras». | Vista social de la mascota con **Compartir perfil** |
| 7 días de inactividad | Tiene mascota y aún no ha agendado un cuidado | «Cuando te venga bien, puedes guardar la fecha de su próximo cuidado y tenerla a mano». | Agenda de la mascota |
| 14 días de inactividad | Tiene mascota y ya usa Agenda, o el aviso de cuidado dejó de aplicar | «Hace un tiempo que no pasas por PAZO. Cuando quieras, aquí tienes a mano el perfil y la agenda de tu mascota». | **Mi mascota** |

El aviso de 14 días queda como segunda fase. Abrirlo solo si los primeros avisos muestran que la gente vuelve y no aumentan las desactivaciones. Los plazos son fechas mínimas de elegibilidad. Si coinciden avisos, priorizar el paso pendiente más útil y aplicar el límite.

- Máximo propuesto de un push de regreso por cuenta cada siete días y uno por etapa. Elegir un dispositivo activo por cuenta. Ventana local propuesta de 9 a. m. a 8 p. m. cuando PAZO ya conozca la zona horaria. Si no la conoce, dejar el aviso dentro de PAZO. Los recordatorios de cuidado y avisos de seguridad mantienen sus propias reglas.
- Revisar justo antes de enviar si la cuenta avanzó, se desactivó la categoría **Consejos de PAZO**, se perdió el permiso o el perfil dejó de ser compartible. Descartar el envío cuando cambie la condición. Las reejecuciones del trabajo no duplican avisos y los que pierdan vigencia caducan.
- El texto que puede verse en la pantalla bloqueada usa la redacción genérica del aviso de privacidad. El nombre de la mascota se usa al abrir PAZO. Para mostrarlo fuera de la app habría que aprobar el cambio de privacidad y el comportamiento para dispositivos compartidos.
- Reutilizar la infraestructura de avisos. Incorporar la categoría con su interruptor, un registro mínimo para deduplicar, una pausa general para avisos de regreso y métricas agregadas. Revisar el aviso de privacidad ES/EN antes de activar la categoría. Las pruebas en producción usan cuentas controladas y autorización para cada envío de prueba.

Verificación. Simular cada etapa, cambios antes de enviar, permiso denegado, dos dispositivos, concurrencia, reintentos y enlace de retorno. Verificar en un teléfono real la recepción y el destino. Medir solicitudes aceptadas por el proveedor, aperturas observadas y paso completado dentro de siete días. Comparar con una cohorte sin avisos cuando el volumen lo permita.

## 5. Mostrar cuántas cuentas usan PAZO instalado

Tarjeta propuesta en Administración. **Cuentas que abrieron PAZO instalado · últimos 14 días**. Contar una sola vez cada cuenta verificada que abra PAZO en modo instalado, aunque lo haga varias veces o desde varios dispositivos. Mostrar debajo las cuentas activas elegibles del mismo periodo para dar contexto. Excluir pruebas y administración con `marketing_private.is_reporting_owner`.

Señales separadas para el embudo. **Aviso mostrado → tocó Instalar o Cómo instalar → instalación detectada → apertura en modo instalado**. El evento `appinstalled` aporta una señal adicional en Chromium. En iPhone se puede constatar el uso cuando la persona abre PAZO desde el icono y la app detecta modo instalado. El permiso push y el clic en el botón se miden por separado. El gráfico responde cuántas cuentas se observaron usando PAZO instalado en la ventana, porque el navegador no ofrece un inventario completo de instalaciones ni desinstalaciones. [Detección de instalación y modo de apertura](https://web.dev/learn/pwa/detection)

Guardar solo la referencia interna de cuenta, el tipo de señal y la fecha necesaria para el agregado. Proponer 14 días de retención, borrar al eliminar la cuenta y exponer únicamente totales mediante un RPC para Administración. Aprobar el aviso actualizado antes de recolectar la señal. Verificar deduplicación, expiración, acceso, Chrome, iPhone y el estado «Sin datos aún».

## Orden de trabajo y decisiones

1. Cerrar el flujo de avisos y el correo ya existentes. Validar en el punto 1 que una cuenta confirmada puede quedar suscrita antes de registrar una mascota.
2. Entregar primero la tarjeta y el enlace social. La invitación a compartir en un push depende de un destino público que ya funcione.
3. Entregar juntos la tarjeta de instalación y el conteo agregado. Validar el aviso de privacidad y la ventana de datos antes de recolectar.
4. Añadir los avisos por etapa en modo de prueba. Revisar los textos ES/EN, los plazos y la frecuencia con el PO antes de activar envíos. Probar primero el caso sin mascota y el de compartir.
5. Revisar resultados de registro completado, primera mascota, perfil compartido, apertura en PWA y retorno. Conservar los avisos que produzcan una mejora sin aumentar la desactivación.

La hoja principal mantiene los puntos 4, 4b y 5. El perfil social compartible puede servir al punto 5, que usa la vista pública desde Administración. Registrar cada entrega, su evidencia y la versión de producción en la hoja principal.
