# #161 — confiabilidad, atribución y exclusión local

## Causa demostrada y límite intencional

La secuencia del incidente puede generar dos solicitudes anónimas: `App.tsx` emite `login_open` al mostrar el acceso sin sesión y `login_attempt` **antes** de esperar a `signIn`. El segundo evento significa formulario enviado, no autenticación exitosa. `observeAnonymous` no conoce la identidad anterior al logout y no tenía una preferencia de exclusión persistente. La deduplicación es por señal y carga de página; otra carga puede generar otra solicitud de la misma persona.

La consulta de producción de solo lectura del **29-oct-2026 11:53:55 UTC** confirmó 44 solicitudes de campaña desde el 26-oct, cero filas de adquisición, sesiones, eventos, tareas y pre-registro, y `login_open=1`/`login_attempt=1` el 29-oct. No se consultaron identidades para reconstruir esas solicitudes. La atribución de las dos acciones al PO procede de su relato: los agregados no permiten demostrar quién las originó.

No se encontró un join SQL que atribuya esas dos señales a Meta. El resumen de inteligencia ya separaba las solicitudes anónimas y las ocultaba al filtrar cuentas o creatividades. La causa corregida es la falta de una exclusión operativa después de logout y una terminología que podía hacer parecer el envío del formulario un resultado o prospecto nuevo.

## Auditoría del contrato completo

| Fuente y recorrido | Unidad real | Correlación permitida / límite |
| --- | --- | --- |
| `marketingRuntime` → challenge → Edge landing → `landing_daily` | Solicitudes aceptadas con UTM de campaña allowlisted | Etiqueta de campaña; no visitante único, clic de Meta demostrado ni vínculo individual con una cuenta |
| `observeAnonymous` → Edge landing → `pazo_intelligence_experience_v1` → `experience_daily` | Solicitudes por día y señal | Sin UTM, identidad o sesión anónima. Login enviado no es éxito. Demo no es uso real de herramientas |
| `observePrereg` → Edge landing → `prereg_daily` | Solicitudes por paso y creatividad | Agregados separados; no una trayectoria individual ni registros verificados |
| Auth `signUp` → staging local ligado al owner → confirmación → Edge attribution → `acquisition` | Cuenta verificada con atribución first-party aceptada | Cuenta/UTM verificadas bajo las guardas existentes; no prueba causal de Meta. Un `signIn` no crea un recibo de `signup_requested` |
| `behaviorRecorder` → RPC → sesiones/eventos | Sesiones observadas, pantallas y cuentas elegibles | Sesión se renueva por límites existentes; no personas anónimas. Última pantalla no demuestra abandono |
| `beginTask` → RPC → `task_events` | Cuenta/tarea/estado acotado | Intento, fallo y reintento separados; no éxito inventado por el cliente |
| `firstUtility` y registros operativos confirmados → informes | Cuentas con resultados guardados | Una utilidad exige un resultado confirmado. Los registros pueden borrarse o variar; no se suman como personas distintas |
| Resúmenes #150/#153 y nueva proyección ejecutiva | Cuentas, sesiones, solicitudes, cohortes y ventanas explícitas | No divide solicitudes anónimas por cuentas verificadas; orgánico y vínculo solicitud→cuenta permanecen sin medición comprobable |

La elegibilidad de producción excluye fundadores, `admin_grants`, QA declarada en metadata confiable y las listas QA existentes. Por ello la actividad administrativa **identificada** ya estaba protegida. Los contadores anónimos no reciben esos identificadores y no deben intentar recuperarlos.

## Cambio proporcional

En el mismo dashboard, **Mi actividad en los informes → Excluir señales de este navegador** guarda únicamente `pazo_analytics_excluded_v1=1` en `localStorage`. El control es explícito, reversible y accesible desde Administración. No guarda UUID, owner, token, fecha, UTM, huella o identificador anónimo. No envía la preferencia al servidor ni introduce una plataforma externa.

La preferencia persiste al salir de la cuenta y al limpiar el staging de atribución. No se liga a una cuenta. El flujo actual de eliminación solicita revisión y no elimina inmediatamente: su código y comportamiento se conservan; no se afirma haber borrado una cuenta real como prueba. Abarca los envíos opcionales de landing, pre-registro, Demo/acceso, atribución, utilidad QR, navegación y tareas. La revocación no reproduce observaciones excluidas. Cambiarla invalida campañas locales pendientes, recibos tardíos y colas; cada challenge/completado comprueba vigencia propia, no solo el valor final de la preferencia. El evento `storage` actualiza otras pestañas del mismo origen.

GPC sigue siendo un veto independiente. Si no se puede leer/guardar el almacenamiento, se informa y se detienen esos envíos de forma conservadora. Los informes de lectura siguen accesibles. No se modifican Auth, MFA, PayPal, invitaciones, feed, fake doors, avisos de primera utilización o retención.

El modelo de almacenamiento por origen y la propagación entre documentos se contrastaron con el [estándar HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html). Es una preferencia funcional local, no un mecanismo fiable de identidad, exclusión del lado servidor o bloqueo distribuido.

## Interpretación visual

Las etiquetas ES/EN son “Pantalla de acceso abierta (solicitudes)” / “Login screen opened (requests)” y “Formulario de inicio de sesión enviado (solicitudes)” / “Login form submitted (requests)”. La sección se llama “Demo y acceso sin sesión”, sin presuponer que precede a un registro. Los KPIs y el embudo conservan el diseño; se explicita **Solicitud → cuenta: sin vínculo comprobable** y se rotulan las llegadas como solicitudes de campaña. Un cero en sesiones registradas no demuestra ausencia de visitas. No se publica el pequeño recuento del incidente en el panel: permanecen los mínimos existentes.

## Privacidad y límites que permanecen

- No es posible enlazar cada llegada publicitaria con su recorrido sin un mecanismo adicional de correlación. No se añade: el vínculo queda sin medición comprobable.
- La preferencia solo afecta a su origen/perfil de navegador. Otro dispositivo, otro navegador, modo privado, borrado del almacenamiento o un contenedor PWA aislado requieren configurarla de nuevo. Si la PWA comparte almacenamiento del mismo origen, comparte la preferencia; no se garantiza entre contenedores separados.
- En un navegador compartido también se excluyen los envíos de sus otras cuentas y visitas sin sesión. No se usa una heurística que excluya a todos los visitantes que abren login.
- Los registros operativos guardados por otras cuentas pueden seguir contándose en los informes del servicio: el control afecta a envíos del navegador, no a su funcionamiento, registros de seguridad/Auth o al procesamiento de datos ya existente.
- Un envío que ya alcanzó al servidor antes del cambio puede haberse aceptado. No se promete retirarlo ni se borran agregados históricos. La cancelación y vigencia impiden nuevos envíos pendientes y contaminación de estado local.
- El historial anónimo anterior a la exclusión puede incluir tráfico propio, automatizado no detectable o repeticiones. No se resta arbitrariamente ni se etiqueta retroactivamente como visitante, adquisición, éxito o abandono.
- La exclusión reduce cobertura; datos incompletos no se convierten en ceros o estimaciones. No se hacen afirmaciones nuevas de rendimiento.

## Verificación y release

Resultados actuales y capturas se registran en el informe del candidato. Las pruebas causales incluyen módulos reales, formulario y aplicación reales, Edge y PostgreSQL aislados; Auth, dominios de producto y proveedor de challenge son dobles controlados. El origen con apariencia oficial se intercepta completamente antes de navegar: no es una prueba contra producción ni una sesión humana real.

No hay migración nueva por #161. Las dos migraciones anteriores del candidato siguen preparadas, sin instalar en producción. Los eventos/vocabulario, tablas privadas, permisos, mínimos, retención de 14 días y gates publicados permanecen sin cambios. La publicación de la exclusión y del panel requiere el GO final de release; la autorización de implementación de #161 no lo sustituye.
