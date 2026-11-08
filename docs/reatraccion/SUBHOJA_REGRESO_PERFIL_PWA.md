# Subhoja de regreso, perfil compartido e instalación de PAZO

Propuesta del 8 de noviembre de 2026. Complementa la [hoja principal](HOJA_DE_RUTA_REATRACCION_20261106.md). Los plazos, textos y límites de envío son propuestas para revisión. Cada bloque tendrá su propia verificación. El PO decidió publicar los cambios pendientes juntos, cuando estén completas la hoja madre y todas las subrutas.

## 1. Reutilizar el correo de confirmación y preparar la entrega de push

El [PR #213](https://github.com/DigitalAppcorp/pazo-app/pull/213) ya envía un único recordatorio con el enlace de Supabase Auth a las 24 horas si la cuenta sigue sin confirmar. El botón «Reenviar correo» continúa disponible. El plan reutiliza ese envío y su deduplicación. El texto puede acompañar a quien todavía tiene el registro pendiente: «Gracias por probar PAZO. Si quieres continuar, confirma tu correo desde este enlace».

El [PR #217](https://github.com/DigitalAppcorp/pazo-app/pull/217) mueve la activación al registro de la cuenta. En **Crear cuenta** o **Continuar con Google** desde el registro, el navegador puede solicitar su permiso si todavía está pendiente. PAZO registra el dispositivo al obtener una sesión confirmada con permiso concedido, incluso si la persona sigue en **Tu mascota** y todavía no guardó un perfil. Si el dispositivo no admite push, la persona bloqueó el permiso o no hay suscripción activa, el aviso queda dentro de PAZO para su próxima visita. En iPhone, Web Push requiere abrir PAZO desde su icono instalado. [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

Verificación. Una cuenta confirmada sin mascota se suscribe en un dispositivo que ya dio permiso. Una cuenta no confirmada usa el flujo de correo vigente. Bloquear avisos, desactivarlos en el teléfono o cerrar sesión impide nuevos envíos a ese dispositivo. Al volver a entrar se recupera la suscripción cuando el permiso sigue vigente.

## 2. Hacer que el perfil social se pueda abrir y compartir

**Candidato integrado [#219](https://github.com/DigitalAppcorp/pazo-app/pull/219), `7b9de9ed`.** En **Mi mascota** se conserva el botón junto a Editar. El perfil público queda sin ese botón. El enlace `/mascota/{id}` entrega a los rastreadores la foto pública, el nombre, la descripción y la marca PAZO mediante Open Graph en el HTML. Chrome verificó el HTML, el destino, los enlaces anteriores y que un perfil no disponible no genere tarjeta. Revisar la presentación real en las redes tras publicar.

- En **Mi mascota**, tocar la foto, el nombre o el espacio principal de la tarjeta abre la misma vista social que ve un visitante. **Editar** y **Compartir perfil** tienen acciones propias y funcionan con teclado y lector de pantalla. El área que abre el perfil se implementa sin anidar botones.
- Ubicar **Compartir perfil** junto a **Editar**. Abrir el menú de compartir del dispositivo cuando esté disponible y ofrecer **Copiar enlace** como alternativa. Distinguir abrir el menú, copiar el enlace y completar el envío según lo que la plataforma permita observar.
- El enlace HTTPS debe abrir directamente el perfil social, incluso sin sesión y desde otro navegador. Reutilizar la vista social existente y proyectar solo los campos y publicaciones que ya son públicos. Las reglas de visibilidad también se aplican al abrir el enlace y a la vista previa que generan las redes. Resolver con un estado amable si el perfil ya no está disponible.
- Al pie del perfil, mostrar «¿Tienes una mascota? Crea su perfil en PAZO y compártelo con quien quieras» con **Conocer PAZO** cuando termine la comprobación de sesión y el visitante sea invitado. Ocultarlo para una cuenta autenticada. Conservar el destino si el visitante elige entrar.

Verificación. Abrir desde la tarjeta, compartir y abrir el enlace en un navegador sin sesión. Comparar con la vista que recibe una cuenta distinta. Probar edición y acciones con teclado, perfil restringido y ausencia de datos privados como correo, ubicación, historial clínico o documentos.

## 3. Ofrecer instalar PAZO tras la primera mascota

**Candidato [#219](https://github.com/DigitalAppcorp/pazo-app/pull/219), `ddb25a07`.** Aviso probado en seis flujos Chrome/PG17 aislados. Verificados el orden con bienvenida/cuidado, aviso nativo simulado, Safari/in-app, «Ahora no» y omisión en modo instalado. Reservado para la publicación conjunta.

Mostrar una tarjeta del mismo estilo que **Todo listo** y **Primer cuidado**. Presentarla cuando termine el aviso de bienvenida y después de que la persona complete u omita la sugerencia de cuidado. Mostrar una sola tarjeta a la vez. Si está usando PAZO instalado o ya desestimó esta oferta en el dispositivo, omitirla. Conservar la opción de instalar desde los ajustes.

> **Ten PAZO a mano**
> Abre el perfil y la agenda de tu mascota desde un icono en tu pantalla.
>
> **Instalar PAZO** · **Ahora no**

Reutilizar `PazoInstallControl` y `installPromptBridge`. En Chrome con solicitud disponible, abrir el diálogo nativo al tocar **Instalar PAZO**. En iPhone, mostrar **Cómo instalar** con los pasos del menú Compartir. En una ventana integrada que no permita instalar, indicar cómo abrir PAZO en el navegador del teléfono. Al abrir la PWA instalada por primera vez, el permiso de avisos puede resolverse con una acción del usuario si todavía falta. [Instalación de PWA](https://web.dev/articles/customize-install) · [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

Verificación. Primera mascota en Chrome móvil y iPhone. La instalación, la salida con **Ahora no** y el caso ya instalado respetan la secuencia. Se puede entrar y continuar con el cuidado aunque la instalación se cancele.

## 4. Enviar avisos según el punto donde se quedó la persona

**Candidato integrado [#219](https://github.com/DigitalAppcorp/pazo-app/pull/219), `7b9de9ed`.** PostgreSQL aislado verificó elegibilidad, horarios, deduplicación y descarte de avisos que ya no aplican. La fase de 14 días sigue apagada. Después de la primera prueba en teléfono, se corrigieron los dos destinos: Chrome verificó el panel de compartir y el formulario de primera mascota al abrir PAZO y con PAZO ya abierto. CI del candidato corregido: 15/15, incluida la repetición en Chrome. Pendiente la segunda prueba física.

| Momento propuesto | Quién puede recibirlo | Mensaje | Destino |
| --- | --- | --- | --- |
| 24 h desde el registro | Correo aún sin confirmar | «Gracias por probar PAZO. Si quieres continuar, confirma tu correo desde este enlace». Reutilizar el recordatorio vigente. | Enlace de confirmación de Supabase Auth |
| 48 h desde confirmar | Cuenta en sesión en al menos un dispositivo suscrito y todavía sin mascota | «Gracias por visitar PAZO. Crea el perfil de tu mascota y ten su foto y su agenda en un solo lugar». | Formulario de **primera mascota** |
| 3 días desde la primera mascota | Perfil social compartible y sin señal previa de copiar o compartir | Push «Comparte el perfil de tu mascota. Presenta a tu mascota a tus amigos con su enlace de PAZO». En PAZO «Presenta a {mascota}». | **Mi mascota** con el panel **Compartir perfil** abierto |
| 7 días de inactividad | Tiene mascota y aún no ha agendado un cuidado | «Cuando te venga bien, puedes guardar la fecha de su próximo cuidado y tenerla a mano». | Agenda de la mascota |
| 14 días de inactividad | Tiene mascota y ya usa Agenda, o el aviso de cuidado dejó de aplicar | «Hace un tiempo que no pasas por PAZO. Cuando quieras, aquí tienes a mano el perfil y la agenda de tu mascota». | **Mi mascota** |

El aviso de 14 días queda como segunda fase. Abrirlo solo si los primeros avisos muestran que la gente vuelve y no aumentan las desactivaciones. Los plazos son fechas mínimas de elegibilidad. Si coinciden avisos, priorizar el paso pendiente más útil y aplicar el límite.

- Máximo propuesto de un push de regreso por cuenta cada siete días y uno por etapa. Elegir un dispositivo activo por cuenta. Ventana local propuesta de 9 a. m. a 8 p. m. cuando PAZO ya conozca la zona horaria. Si no la conoce, dejar el aviso dentro de PAZO. Los recordatorios de cuidado y avisos de seguridad mantienen sus propias reglas.
- Revisar justo antes de enviar si la cuenta avanzó, se desactivó la categoría **Consejos de PAZO**, se perdió el permiso o el perfil dejó de ser compartible. Descartar el envío cuando cambie la condición. Las reejecuciones del trabajo no duplican avisos y los que pierdan vigencia caducan.
- El texto que puede verse en la pantalla bloqueada usa la redacción genérica del aviso de privacidad. El nombre de la mascota se usa al abrir PAZO. Para mostrarlo fuera de la app habría que aprobar el cambio de privacidad y el comportamiento para dispositivos compartidos.
- Reutilizar la infraestructura de avisos. Incorporar la categoría con su interruptor, un registro mínimo para deduplicar, una pausa general para avisos de regreso y métricas agregadas. Revisar el aviso de privacidad ES/EN antes de activar la categoría. Las pruebas en producción usan cuentas controladas y autorización para cada envío de prueba.

Verificación. Simular cada etapa, cambios antes de enviar, permiso denegado, dos dispositivos, concurrencia, reintentos y enlace de retorno. Verificar en un teléfono real la recepción y el destino. Medir solicitudes aceptadas por el proveedor, aperturas observadas y paso completado dentro de siete días. Comparar con una cohorte sin avisos cuando el volumen lo permita.

## 5. Contar cuentas con y sin instalación detectada

**Candidato [#219](https://github.com/DigitalAppcorp/pazo-app/pull/219).** PostgreSQL aislado comprobó deduplicación, acceso de Administración, exclusiones y borrado con la cuenta. Chrome verificó ambas cifras con datos ficticios y el estado apagado. CI integrado 15/15. Medición apagada y sin cambios alojados.

**Decisión del PO:** mostrar solo dos cifras en Administración: **Con instalación detectada** y **Sin instalación detectada**. Contar una vez cada cuenta confirmada elegible y excluir QA y Administración. No presentar embudo, actividad por periodo, lista de personas ni desgloses por dispositivo.

Marcar la cuenta cuando el navegador emita `appinstalled` o cuando la persona abra PAZO en modo instalado, también desde el icono en iPhone. Aceptar el diálogo no cuenta. Una instalación anterior puede quedar sin detectar hasta que se abra la PWA, y el navegador no informa de forma fiable las desinstalaciones. [Detección de instalación](https://web.dev/learn/pwa/detection)

Guardar una sola marca interna sin fecha ni historial y borrarla al eliminar la cuenta. Respetar GPC y el control de medición. La recolección empieza apagada; la aclaración de privacidad ES/EN y el encendido corresponden a la publicación conjunta.

Verificación: confirmar deduplicación, permisos, eliminación con la cuenta, modo instalado, evento nativo, aceptación sin instalación y estado «Sin datos aún».

## Orden de trabajo y decisiones

1. Cerrar el flujo de avisos y el correo ya existentes. Validar en el punto 1 que una cuenta confirmada puede quedar suscrita antes de registrar una mascota.
2. Entregar primero la tarjeta y el enlace social. La invitación a compartir en un push depende de un destino público que ya funcione.
3. Entregar juntos la tarjeta de instalación y el conteo agregado. Validar el aviso de privacidad antes de activar el conteo.
4. Añadir los avisos por etapa en modo de prueba. Revisar los textos ES/EN, los plazos y la frecuencia con el PO antes de activar envíos. Probar primero el caso sin mascota y el de compartir.
5. Revisar resultados de registro completado, primera mascota, perfil compartido, apertura en PWA y retorno. Conservar los avisos que produzcan una mejora sin aumentar la desactivación.

El candidato integrado incluye los puntos 4, 4b y 5 de la hoja principal. Desde Administración se abre la misma vista pública. Registrar cada entrega, su evidencia y la versión de producción en la hoja principal.
