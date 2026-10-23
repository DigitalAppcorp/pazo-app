> **ACTUALIZACIÓN DE ESTRATEGIA — 23-oct-2026.** El PO eligió la **opción B de APERTURA GRADUAL AUTOMÁTICA** (no la «opción B de selección de invitados» descrita en el apartado 7 de este archivo). La nueva especificación rectora se conserva en [`PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md). **Este archivo es historial de diseño que NO debe eliminarse**: la propuesta original de primer comprador, las dos notificaciones y sus ideas de verificación siguen vigentes como referencias. La elección de cuántas invitaciones enviar a la vez sigue **PENDIENTE**. Ningún código ni pago se autorizó por esta actualización documental.

# PAZO — Propuesta: piloto automático del primer Amigo de PAZO en PayPal Live

**Fecha:** 23-oct-2026
**Estado:** PROPUESTA DE PRODUCTO — GUARDADA, NO APROBADA PARA IMPLEMENTACIÓN
**Owner:** Product Owner de PAZO
**Área:** F16 monetización Live / validación primera venta y F17 notificaciones-administración
**Tipo:** M + I (monetización + infraestructura de notificación y verificación)
**Carácter:** primera compra auténtica por un tercero voluntario; NO simulación de cobro ni prueba ficticia
**Repositorio/continuidad:** `DigitalAppcorp/pazo-app`, PR #81 (DRAFT), `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MASTER_ROADMAP.md`

> Este documento conserva la propuesta presentada al PO y sus alternativas. **Guardar la propuesta NO equivale a aprobar el flujo, ejecutar el piloto, modificar tablas, enviar notificaciones, cambiar la lista canary ni iniciar cobros.** Las preguntas aún abiertas siguen como **DECISIÓN PENDIENTE**.

## 1. Objetivo

Conseguir el primer pago auténtico de **Amigo de PAZO, USD 2.99 al mes**, mediante una persona independiente que voluntariamente acepte una invitación dentro de PAZO. El producto debe gestionar sin contacto manual del administrador: selección/invitación, respuesta, consentimiento del cobro, recuperación de checkout abandonado, conciliación financiera real, activación de beneficios, solicitud de revisión de beneficios y consolidación de resultados en Administración.

El objetivo técnico es observar el ciclo real: **aprobación PayPal → webhook firmado → venta/periodo contabilizado y verificado → beneficios reales → revisión voluntaria**, sin conceder derechos por el regreso desde PayPal ni por estado `ACTIVE` sin venta verificada.

PAZO sigue **gratuito** para las funciones principales. La aportación es voluntaria y no condiciona el uso de la app.

## 2. Decisiones expresadas por el PO en la conversación

- El PO **quiere dos notificaciones en la bandeja de PAZO**: (1) invitación para apoyar PAZO; (2) agradecimiento posterior al pago y petición de comprobar beneficios.
- El PO busca operación totalmente automática: **sin enviar mensajes manualmente ni tener que contactar a la persona**.
- Mensaje postpago: PAZO se preocupa por la **excelencia**; invitar a revisar sus beneficios, realizar comprobaciones si puede y confirmar si todo funciona.
- Se ha solicitado **planear/guardar la propuesta**, **no** implementar, desplegar o abrir pagos públicos.
- **No se ha elegido** entre invitar a una persona por vez (opción A, recomendada) o reunir interesados mediante varias invitaciones (opción B). Tampoco se ha aprobado el periodo de 72 horas sugerido como ejemplo.

## 3. Secuencia conceptual

1. **Elegibilidad y selección:** el servidor determina candidato(s) entre cuentas reales aptas del piloto. Excluir al dueño de la cuenta comercial de PayPal y cuentas descartables/de prueba cuando puedan identificarse legítimamente, sin fingerprinting invasivo. Debe cumplirse el control privado de comprador canary; jamás confiar en parámetros de navegador.
2. **Notificación 1 en la bandeja:** el candidato recibe la invitación al apoyo voluntario. Opciones claras «Quiero participar» y «Ahora no». Abrirla no cobra y rechazarla no limita funciones gratuitas.
3. **Consentimiento informado:** «Quiero participar» abre la oferta real existente: precio **USD 2.99/mes**, renovación periódica, términos aplicables, beneficios, cancelación y aceptación expresa **antes** de ir a PayPal. El consentimiento a recibir la invitación no equivale a consentimiento de pago.
4. **PayPal Live:** el usuario decide aprobar o abandonar. Reutilizar el checkout original y sus rutas de recuperación que el PO ya validó en el dominio oficial el 23-oct-2026. Una misma persona no genera suscripciones duplicadas al reintentar.
5. **Verificación:** el backend verifica el evento firmado, el titular/plan/merchant original, la venta `COMPLETED`, su importe, la trazabilidad del periodo y la escritura durable idempotente. Proyección de beneficios únicamente desde cobertura pagada confirmada, no desde el retorno del navegador.
6. **Notificación 2:** **solo** cuando tanto el periodo pagado como los beneficios estén verificados; se agradece y se invita voluntariamente a inspeccionar los beneficios.
7. **Revisión opcional:** la persona comprueba la insignia en perfil y publicaciones, el acceso a sus beneficios y la gestión de la suscripción. Puede declarar que funciona, reportar problema o no responder.
8. **Administración:** muestra estados, conteos y evidencia sanitizada de la prueba separando resultado financiero automático y revisión del usuario. El PO ve problemas, pero no necesita enviar mensajes personales.
9. **Salida:** hasta completar y revisar la evidencia de canary, **no cambiar a `public` automáticamente**. El control de emergencia sigue disponible. El GO para habilitación pública es decisión del PO.

## 4. Textos candidatos de las dos notificaciones (ES; traducción EN antes de implementación)

### Notificación 1 — Invitación

**Emisor:** PAZO
**Título:** ¿Te gustaría ser uno de los primeros Amigos de PAZO?

**Cuerpo propuesto:**

> Estamos construyendo una comunidad mejor para nuestras mascotas.
>
> Nos encantaría invitarte a apoyar el crecimiento de PAZO con una membresía voluntaria de **$2.99 al mes**.
>
> Tu apoyo nos ayuda a seguir mejorando la aplicación, y recibirás beneficios especiales como agradecimiento.
>
> ¿Te gustaría participar?

**Acciones:** «Quiero participar» / «Ahora no».

**Destino de aceptar:** pantalla Amigo de PAZO con términos y consentimiento real. **No** generar cargo al tocar la notificación.

### Notificación 2 — Pago verificado y revisión opcional

**Emisor:** PAZO
**Título:** ¡Ya eres Amigo de PAZO!

**Cuerpo propuesto:**

> Muchas gracias por apoyar nuestra comunidad.
>
> Tu pago fue verificado y tus beneficios ya están disponibles.
>
> En PAZO buscamos ofrecer una experiencia excelente. ¿Nos ayudarías a comprobar que todo funciona correctamente?
>
> Revisa tus beneficios y, si tienes un momento, cuéntanos cómo fue tu experiencia.

**Acción principal:** «Revisar mis beneficios».

**Destino:** superficie de revisión de beneficios; no pedir información financiera o credenciales PayPal.

**Condición:** nunca enviar esta notificación si la venta está pendiente, la conciliación es incierta o la activación de beneficios no está comprobada.

## 5. Propuesta de revisión de beneficios

La pantalla presenta verificaciones simples (reusar beneficios existentes, no crear nuevos por responder):
- «Puedo ver mi insignia de Amigo de PAZO».
- «Mi insignia aparece en mi perfil».
- «Puedo acceder a mis beneficios».
- «Puedo gestionar mi membresía».

**Respuestas:** «Confirmar que todo funciona» / «Encontré un problema» / salir sin contestar.

«Encontré un problema» puede abrir el soporte privado existente y vincular el ticket a la prueba mediante identificador interno seguro, nunca mostrando ventas/suscripciones o diagnósticos a terceros.

La evaluación humana **no altera por sí sola el pago, la renovación o los beneficios**. Un reporte negativo abre incidencia; no ejecuta reembolso ni revocación automática. No responder tampoco revoca beneficios.

## 6. Ramas y errores (requisitos del flujo propuesto)

| Condición | Respuesta segura |
| --- | --- |
| Usuario ignora la invitación | No insistir; caducidad configurable **pendiente de decisión**; 72h solo ejemplo |
| Pulsa «Ahora no» | Registrar decisión mínima, respetarla y no re-invitarlo en ese piloto |
| Acepta la invitación | Mostrar oferta real y solicitar consentimiento independiente de PayPal |
| Abandona login / no paga | Mantener recuperación del intento original, sin duplicados; no marcar pagado |
| No tiene cuenta PayPal | Salida sin penalización; no forzar otra forma de pago no soportada |
| Inicia solicitud PayPal y vence la invitación | **No** liberar el cupo por el reloj: GET/conciliación y cierre seguro si corresponde |
| Pago pendiente / parcial / error de red / datos incongruentes | Fail-closed, revisión administrativa y ninguna notificación de beneficios activos |
| Venta completada pero falta proyección de beneficios | Reintentar conciliación segura; retener notificación 2 hasta acreditar ambos |
| Reintento de worker, notificación o callback | Idempotencia por usuario+campaña+etapa/evento; sin doble invitación ni duplicación de pago |
| Pago real y beneficios confirmados | Una notificación 2, disponible en bandeja, con CTA a revisión |
| Reporta problema | Ticket privado al panel y posible pausa de nuevas invitaciones según clasificación |
| Confirma que funciona | Registrar feedback separado de la prueba técnica; entregar resumen en Administración |

**Caso crítico:** un cobro o una suscripción ya iniciada no se cancela ni se sustituye unilateralmente al seleccionar al siguiente participante. Nunca abrir dos autorizaciones a la vez por error de concurrencia o expiración de una invitación.

## 7. Política de selección — decisión pendiente

**Opción A — un invitado a la vez (recomendada por simplicidad):** el servidor envía una invitación a un candidato elegible, espera aceptación/rechazo/caducidad configurada y solo selecciona al siguiente cuando no hay aprobación, cobro o conciliación sin resolver.

**Opción B — invitaciones a varios, cobro a uno:** se puede invitar a varios interesados sin autorizar un pago simultáneo; al aceptar entran en espera. Solo el servidor selecciona un comprador canary a la vez. Requiere lista de espera y expectativas transparentes.

**Sin decisión aún:** A/B, reglas exactas de elegibilidad y aleatoriedad/antigüedad, duración de invitaciones, límites de intentos y frecuencia, política de recontacto, distribución y cierre de cola. Una recomendación del asistente no es aprobación.

## 8. Arquitectura funcional a diseñar tras GO

- **Notificaciones:** reutilizar la bandeja existente, sin correos ni push adicionales por defecto. Tipos/categorías dedicados solo si no cabe en infraestructura existente. Dos eventos externos al usuario, una vez cada uno en el momento adecuado; textos ES/EN, abrir/dismiss, deep-link estable, no spam.
- **Orquestador privado:** elegir siguiente candidato y administrar estados con transiciones atómicas y protección de carreras; persistir solo lo mínimo para auditar elegibilidad, decisión, expiración y resultado.
- **Canary PayPal:** extender con permisos server-side el modo ya existente, actualmente limitado a propietario `canary_owner`; jamás pasar a público para conseguir el primer comprador ni dejar al cliente seleccionar UID/merchant/plan. Diseñar transición de candidato preservando claim de operaciones financieras anteriores.
- **Pagos/beneficios:** integrar **sin reimplementar ni debilitar** webhook verificado, worker, ledger, períodos, cancelación y recuperación existentes. Sin falsos paidThrough ni concesiones por prueba visual.
- **Opinión del usuario:** formulario muy corto y enlace a soporte. Registro mínimo, privado y vinculable a una campaña por ID interno, sin PII, textos financieros, GPS ni datos del pagador. No session replay/autocapture.
- **Dashboard:** participante(s) invitados, interesados, pendientes, intentos abandonados/conciliación, venta pagada confirmada, derecho activo real, notificación 2 entregada, respuesta del usuario, tickets; distinguir métricas provisionales de evidencia financiera.
- **Privacidad/operación:** revisar `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y actualizar `docs/PAZO_DATA_INVENTORY.md` **al aprobar datos/implementar**, definir acceso RLS/ACL, retención/limpieza, supresión de cuenta, frecuencia para evitar molestias y observabilidad sin contenido sensible.
- **Sin recursos pagados nuevos, claves nuevas ni envíos externos** por este documento.

## 9. Gates / Definition of Done tentativos (NO autorizados todavía)

1. PO elige A o B y aprueba copia, criterios de elegibilidad, caducidad, política de reintentos y gestión de incidentes.
2. Revisión de privacidad/retención y términos según los datos realmente propuestos. Diseño UI según regla permanente cero contornos.
3. Migración y RPC auditadas y versionadas, previa aprobación antes de aplicar a Supabase; modo inicial **OFF**.
4. Tests de concurrencia y cobertura: dos invitaciones no activas para mismo piloto si A, aceptación idempotente, doble click, reanudación PayPal, timeout, cancelación segura, pago incierto, webhook duplicado y beneficio no acreditado.
5. Validación móvil/desktop bilingüe en entorno aislado; notificaciones solo en bandeja; verificación de experiencia y panel.
6. GO específico del PO para piloto real y activación controlada por usuario. **Ningún cobro sin consentimiento del comprador**.
7. Primer comprador independiente legítimo: prueba Live E2E de pago/comprobante/periodo/beneficios y notificación 2. Opinión humana opcional, no requisito para conservar beneficios.
8. Gate financiero independiente para publicar membresías a todos: evidencia canary y **aprobación administrativa expresa**, nunca promoción automática.

## 10. Alcance fuera de esta propuesta

- No crear cuentas PayPal propias adicionales ni simular compra a la misma cuenta comercial.
- No exigir que el PO contacte manualmente a un usuario ni se haga pasar por un comprador.
- No cobrar sin consentimiento específico, no enviar correos/push por defecto, no compartir identificadores PayPal con participantes.
- No prometer que un interesado probará los beneficios o responderá.
- No convertir la prueba del primer usuario en apertura automática de PayPal `public`.
- No añadir beneficios diferentes a los ya aprobados para Amigo de PAZO ni obligar a pagar para usar el producto gratuito.
- No reabrir validación del mapa Mapbox Standard ni volver a probar Sandbox que el PO ya aprobó.

## 11. Próxima decisión de producto

**Única pregunta de diseño pendiente en la conversación:** ¿**opción A** (uno a la vez) o **opción B** (varios invitados, un comprador autorizado)? La opción A fue recomendada, pero el PO **aún no la eligió**.

Hasta recibir esa decisión y la autorización de implementación: **DOCUMENTED_PROPOSAL_ONLY; NO_CODE; NO_SQL; NO_EDGE; NO_PAYPAL_ACTION; NO_PUBLIC_RELEASE**.
