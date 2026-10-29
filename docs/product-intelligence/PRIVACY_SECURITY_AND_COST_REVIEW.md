# Privacidad, seguridad y coste — #153

Esta revisión técnica no certifica cumplimiento legal. La orden humana autoriza fases 0–6; no autoriza publicación ni nueva recogida. #150 permanece activo con sus fechas originales. La extensión añade un gate independiente OFF, no reinstala fuentes anteriores.

## Minimización y propósito

Tareas con vocabulario cerrado y estados exposición/intención/intento/fallo/reintento/cancelación. No existe evento de éxito aceptado del navegador. Los resultados se proyectan desde registros autoritativos existentes, sin copiar respuestas de fake doors ni contenido. La sesión autenticada de #150 se reutiliza; no se añade identidad de dispositivo, cookie o almacenamiento persistente.

No se envían nombres, correos, consultas, biografías, archivos, IDs de mascotas/contenido, coordenadas, URL, importes, datos de pago, mensajes ni texto de error. Documentos/cuidados solo aportan categorías de tarea; su contenido no sale del servicio. Rescate, conversaciones, soporte privado, pagos, invitaciones y acciones administrativas se excluyen como conversiones.

Demo/acceso/registro sin campaña: contadores diarios de solicitudes aceptadas, sin ID anónimo ni enlace a cuenta, sin porcentaje de conversión a personas. El envío fija explícitamente la autorización pública para que un challenge resuelto después de registro no herede el JWT de una cuenta. Los cuatro pasos de registro con campaña válida reutilizan #150: no se duplican en el contador nuevo. No se mide orgánico probado, visitantes únicos, abandono individual o causa de una salida.

## Controles de acceso y vigencia

- Nuevas tablas en `marketing_private`: RLS ENABLE/FORCE y cero acceso directo para anon/authenticated/service_role. Funciones con `search_path=''`; RPC de tareas solo autenticado, sujeto a elegibilidad, QA confiable, exclusión, verificación de correo y gates saludables.
- Informes solo administrador + JWT `aal2`; filtros y salidas cerrados. Mínimo 10 cuentas por fila, sin exportar recorrido, owner/session/target. No se presentan totales disjuntos que permitan restar grupos ocultos. Retornos solo si tanto el subgrupo como su complemento son 0 o >=10; cero retorno no se publica como éxito.
- Supresión consistente entre Todos, atribuido, desconocido, seis anuncios y ventanas 7/14 días. Un grupo 11/9 o 19/1 no se recupera por resta desde otro filtro; se oculta conservadoramente toda la métrica afectada. La revisión adversarial añadió pruebas específicas de estas combinaciones.
- Auth A→B y A→B→A abortan colas e invalidan respuestas por generación. Capturas de operación llevan además generación del contexto de mascota; comparar solo IDs no basta. Renovar token no cambia propietario. Las solicitudes usan Authorization fijado para esa generación.
- GPC se comprueba antes de cada señal nueva y de resolver el challenge. En la futura versión activada, un acceso autenticado con GPC solicita retirada para que también quede excluido de los agregados de fuentes reutilizadas. Esa exclusión permanece hasta borrar la cuenta; desactivar GPC no la revoca automáticamente. Con los flags OFF se conserva el comportamiento publicado de #150.
- Retirada existente elimina sesiones y tareas por cascada; la exclusión permanente mínima impide recolocación. Eliminación de cuenta también cascada. Los registros comerciales originales siguen su propia política; retirada los excluye del nuevo informe, no borra automáticamente documentos o publicaciones necesarios para la aplicación.

## Anónimos y abuso

Se reutiliza exclusivamente la Edge landing y Turnstile de un solo uso: origen/hostname/acción existentes, verificación antes de presupuesto SQL y claim de digest previo. No se almacena token crudo. El proveedor Turnstile puede tratar IP y señales del navegador según su aviso previo; PAZO no los añade al contador. El addendum ES/EN preparado vincula expresamente Demo/acceso con ese apartado de protección contra abusos. El nuevo cuerpo admite solo `{experience: <enum>}`. `Sec-GPC:1` se rechaza; no se aceptan owner, sesión, UTM extra ni texto. El emisor anónimo solo opera en el canónico y excluye WebDriver. Preview/QA de esta entrega bloquea servicios alojados. Un humano anónimo con challenge válido no puede clasificarse como QA sin inventar identidad: límite explícito, no garantía de detección de toda prueba o fraude.

## Retención y presupuestos

Tareas: FK a sesiones #150, vencimiento fijo a 14 días desde inicio. Anónimos: 14 fechas de Los Ángeles. La función de purga existente se encadena y se mantiene el mismo Cron; no se crea otro job ni se reinicia cobertura. La demora normal de purga puede alcanzar el siguiente ciclo de seis horas; backups/logs tienen ciclos independientes y no se promete borrado instantáneo.

Por sesión: 64 tareas, una por task/kind, cola memoria 16 y lotes de 8; JSON <=1800 bytes en servidor. Máximo 12 sesiones/24h por cuenta, incluido #150. Dos intentos idénticos como máximo, timeout 5s, sin bucle offline ni persistencia. Cuando falla un lote se descarta el canal hasta una nueva sesión: puede perder cobertura, nunca bloquea la tarea. Máximo teórico nuevo: 768 filas/cuenta/24h y 10.752 en 14 días. Anónimos: 19 señales × 3.000 solicitudes/día, almacenadas en hasta 266 filas diarias de agregado durante la ventana. El límite de solicitudes no equivale a usuarios ni prueba ausencia de bots.

No se contratan servicios/planes. El coste absoluto futuro depende del tráfico; no se inventa una factura. La infraestructura de challenge y sus límites previos se conservan. Informe con timeout 3s; sin índices nuevos sobre fuentes comerciales hasta medir necesidad. El laboratorio pequeño no acredita comportamiento con millones de filas: si la consulta agota tiempo, muestra error recuperable y mantiene los otros informes disponibles.

## Fuentes oficiales revisadas el 28-oct-2026

[CPPA, actualización vigente desde 1-ene-2026](https://cppa.ca.gov/regulations/ccpa_updates), [CPPA, minimización de datos, abril 2024](https://cppa.ca.gov/pdf/enfadvisory202401.pdf), [web.dev, INP](https://web.dev/articles/inp). Se aplican minimización, propósito y límites de observación; no se deduce de estas fuentes que cualquier negocio o tratamiento cumpla automáticamente la ley. El umbral de referencia de INP p75 200 ms no sustituye una medición de campo representativa.

Pruebas, aislamiento y límites concretos: [matriz de evidencia](TEST_MATRIX_AND_EVIDENCE.md). Activación y reversión: [runbook](RELEASE_RUNBOOK.md).
