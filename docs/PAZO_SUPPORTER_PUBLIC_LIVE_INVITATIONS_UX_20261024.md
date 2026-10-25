## Estado de implementación F18 (25-oct-2026)

Concepto G y especificación implementados en rama para revisión técnica y visual. Ver [informe F18](PAZO_F18_IMPLEMENTATION_REVIEW_20261025.md). Los textos de planificación y permisos inferiores se preservan como fuente histórica del PR103; la orden directa posterior autorizó el desarrollo. Producción no se ha modificado ni abierto al público.

---

# PAZO — Amigo de PAZO Live público: invitaciones inteligentes y recorridos UX
**Decisiones de producto del PO:** 24-oct-2026. **Estado:** `PRODUCT_RULES_APPROVED / VISUAL_CONCEPT_G_APPROVED / FINAL_MOBILE_DESIGN_PENDING / IMPLEMENTATION_NOT_STARTED / HOSTED_NOT_CHANGED`.

> **Lectura obligatoria para cualquier agente que retome Amigo de PAZO:** este documento sustituye **como dirección futura de producto**, pero NO como estado actual de producción, al mecanismo comercial de apertura gradual `L1→L2→L3→L4`. No afirmar que Live público está activo. El PO solicitó conservar notificaciones e invitaciones; se definió el recorrido de dos intentos. Esta rama es documentación, no autorización para desplegar, fusionar ni actualizar SQL/PayPal.

## 1. Intención y separación de sistemas

PAZO es gratuito. `Amigo de PAZO` es un apoyo **voluntario de US$2.99 mensuales, renovable hasta cancelar**, con insignia, cinco fondos, muro opt-in y medallas de antigüedad. La cancelación de renovación no es automáticamente reembolso ni elimina la cobertura pagada vigente.

Separar estos servicios:
1. **Captación**: detectar uso significativo; decidir si mostrar invitación a pantalla completa y, después, UNA notificación interna de recordatorio.
2. **Oferta**: pantalla Amigo de PAZO disponible desde `Mi mascota` y desde la bandeja para cualquier cuenta elegible, incluso sin invitación ni participación previa. Su diseño visual detallado se elegirá después.
3. **Checkout Live público**: acceso condicionado por sesión verdadera, onboarding, backend, merchant, salud de worker/webhook, aceptación afirmativa/versionada y ausencia de intento anterior no conciliado. `Público` NO es `sin seguridad`.
4. **Postventa**: pagos reconciliados con PayPal, períodos y beneficios verificados, cancelaciones, reembolsos/disputas, y notificación única de agradecimiento/revisión de beneficios.

**No** permitir que el sistema de invitaciones otorgue permisos de cobro, cree checkout ni conceda beneficios. Las métricas de invitación no equivalen a dinero recibido.

## 2. Política aprobada de contacto: dos oportunidades máximas por cuenta/campaña

### Primer contacto — pantalla completa
- PAZO identifica una cuenta auténtica **con uso significativo**, no solo alta reciente. Regla inicial de producto: ha **regresado en otro día** Y completado **al menos una acción valiosa**, como publicación guardada, QR generado o cuidado registrado; también puede usarse una combinación equivalente de acciones verificadas. La ponderación definitiva y el mínimo exacto son parámetros de implementación sujetos a revisión, no atribuir puntuaciones inventadas al PO.
- **No leer contenido** de publicaciones o datos de salud/cuidado de mascotas para este scoring; solo evento de acción completada y fecha. No vender ni utilizar datos sensibles.
- Esperar un **momento tranquilo**, preferentemente al volver a Inicio tras completar una tarea, NO durante onboarding, creación de post, formularios, carga, errores, alertas de mascota perdida ni interacciones emocionalmente delicadas.
- Presentar una **invitación visual completa, ligera, local/preparable**, **sin** PayPal GET/POST como condición para renderizar su contenido: identidad PAZO, gratitud, programa voluntario, US$2.99/mes y dos opciones claras `Conocer Amigo de PAZO` y `Ahora no, seguir en PAZO`; botón X visible. No crear cobros ni marcar consentimiento.
- **Mostrar como máximo una vez** esta pantalla por cuenta y por campaña. Persistir una impresión confirmada al efectivamente presentarse; no consumirla por selección en servidor o por un fallo anterior al render. Evitar dobles impresiones entre dispositivos, reabrir PWA, sesión cambiada o concurrencia. Si hay resultado incierto, el servidor es autoridad de la campaña; no reventar frecuencia.
- Cerrar con X, `Ahora no` o app: sin cobro; no equivale a prohibición permanente ni impide pago manual posterior. `Conocer` abre oferta, nunca inicia checkout automáticamente.
- Primera invitación puede estar reflejada como registro discreto en la bandeja, **mismo contacto lógico** y sin sumar otro intento. Si se genera copia en bandeja, no añadir push/alerta emergente ni separar estadística como nueva invitación.

### Segundo y último contacto — solo notificación interna
- Si pasaron **14 días completos** desde la impresión confirmada de la primera invitación y el usuario no tiene pago/beneficios activos ni un checkout en curso/conciliación, entregar **una sola nueva notificación en la bandeja**. El PO eligió expresamente este intervalo y un segundo contacto discreto, **no otro modal**.
- No presentar overlay, banner invasivo ni push al dispositivo; tampoco email/SMS ni notificaciones fuera de la app. La entrega real puede suceder en el siguiente proceso de mantenimiento elegible; no prometer entrega exactamente al segundo de vencer los 14 días.
- Al tocarla: navegar a la misma pantalla Amigo de PAZO con su estado real. No crear automáticamente nueva suscripción. Si la app está cerrada la notificación queda en bandeja y se ve al regresar; no mostrar pantalla completa.
- Después de la segunda entrega, **ningún tercero intento promocional automático** en esa campaña, incluso si no abre la notificación, reinstala PWA o cambia de mascota. La oferta siempre permanece accesible manualmente.
- Si optó expresamente por `No recibir más invitaciones`, detener **inmediatamente** el segundo intento y no mostrar otro contacto comercial. No se debe confundir este opt-out con X o `Ahora no`.
- Pago activo, cobertura verificada, cortesía administrativa vigente o recuperación PayPal pendiente: no emitir nueva invitación promocional ni botón de compra duplicada. En cortesías, si el usuario decide apoyar voluntariamente, se debe diseñar la opción explícita separada sin generar segundo beneficio, pendiente de definición de integración.
- Invitación 1 no se dispara durante períodos críticos aunque actividad cualifique; si el candidato sale de la app sin recibirla, se puede evaluar otro momento. No usar CTA agresivos, contadores de urgencia ni promesas falsas.

### Cuentas especiales
- Una cuenta puede tener varias mascotas: **cuenta Auth es unidad de contacto y pago**, no mascotas; no repetir invitación al cambiar de mascota.
- Cuentas QA/Sandbox/admin/deleted/anonymous deben distinguirse de compradores elegibles. No utilizar la marca de cohorte `created_at >= 2026-10-23` como exclusión permanente de cuentas antiguas reales en el Live público futuro. No poner comprador falso en producción para verificar el flujo.
- Quien abre la oferta manualmente sin haber recibido primera invitación: puede acceder a compra sin fricción. **Pendiente de precisar al implementar** si esa visita consume la primera oportunidad promocional; UX recomendado: evitar mostrar después overlay a alguien que ya exploró voluntariamente la oferta y considerar solo recordatorio discreto consentido. Requiere decisión PO si se modifica la política aprobada de máximo dos contactos.

## 3. Notificaciones transaccionales, separadas del límite comercial

**Notificación A — invitación / recordatorio comercial:** primera aparición full-screen, segunda en bandeja (más posible representación pasiva de la primera). Contador comercial máximo dos. Texto claro en ES/EN; no usar mensajes de urgencia. La notificación toca y abre pantalla de oferta; se marca leída aunque el backend no habilite cobro.

**Notificación B — agradecimiento + beneficios confirmados:** entregar al comprador verificado cuando (1) venta COMPLETED real está firmada/conciliada y (2) cobertura/beneficios de la cuenta están realmente disponibles según servidor. Una sola por activación inicial, no volver a mandar por cada renovación; dedupe por evento/owner y persistencia. Contiene CTA `Revisar mis beneficios` y respuesta voluntaria `Todo funciona` / `Encontré un problema` / `Omitir`; respuesta no condiciona derechos ni activa el beneficio. Problemas a soporte privado/panel admin. Si ingreso firmado existe pero concesión de beneficios falla, registrar incidente financiero, conservar evidencia y no enviar agradecimiento que declare beneficios activos prematuramente.

**Nunca** depender de tablas de `gradual_interest` o `gradual_admission` para enviar agradecimiento por un checkout **público**. Debe enlazarse a ledger/beneficios del owner real y una outbox independiente, con reintento seguro.

## 4. Entrada de oferta y UX de carga

Fuentes: `Mi mascota → Amigo de PAZO`, primer overlay `Conocer`, notificación interna y enlaces válidos de retorno PayPal. Todos usan **la misma pantalla de cuenta/membresía**; no fabricar una segunda pantalla de pago para invitaciones. Al abrir, se consulta estado de cuenta/checkout.

Eliminar la pantalla del gatito de **la invitación inicial**: no es requerida por PayPal, es indicador de preparación de la vista financiera existente. La **oferta real** puede precargar estatus mientras el usuario lee invitación, pero el backend **revalida absolutamente todo al pulsar pagar**; si datos no están disponibles, mostrar carga breve o error recuperable y claro, nunca beneficios/cargos supuestos. Mantener los estados explícitos `sin suscripción`, `solicitud PayPal abierta`, `verificación`, `membresía verificada`, `beneficios vencidos`, `incidencia`.

Una cuenta **sin invitación** puede comprar igual, si cumple permisos. No utilizar `Comprobar disponibilidad` como paso comercial obligatorio cuando checkout público está realmente autorizado y saludable. Si está cerrado por protección financiera, explicar el motivo sin fingir cola/cupo.

## 5. Matriz de recorrido de usuario y seguridad financiera

| Evento / situación | Acción sistema | UI visible y recuperación |
| --- | --- | --- |
| Usuario nuevo; onboarding incompleto | No promo, checkout bloqueado | Completar registro, sin cobro |
| Cuenta real con retorno en otro día y acción valiosa | Programar primera impresión en momento seguro | Invitación 1 full-screen, no PayPal ni carga obligatoria |
| X o Ahora no en primera invitación | Guardar impresión ya mostrada, esperar 14 días | Vuelve al punto anterior sin otros pasos |
| Conocer en primera invitación | Abrir única oferta y precargar estado | Precio US$2.99/mes y beneficios; consentimiento en pantalla financiera |
| Pago completo antes de 14 días | Cancelar segundo recordatorio | Mostrar beneficios y notificación transaccional confirmada |
| Checkout PayPal en curso, red incierta o beneficio pendiente | Posponer recordatorio, dedupe intento | Recuperar intento original; nunca enviar promo ni otro CREATE |
| Tras 14 días y sin pago/intent | Entregar exactamente 1 recordatorio silencioso | Notificación bandeja; tocar abre la oferta |
| Segunda invitación ignorada/cerrada | Registrar entrega como definitiva | No tercer aviso automático |
| Opt-out expreso antes o después del primer contacto | Guardar supresión persistente | No más promos; vía manual permanece |
| Desde Mi mascota sin invitación | Leer estado server-side, no crear interés obligatorio | Mostrar oferta o administración |
| Click Pagar sin checkbox | Rechazar local y server | Pedir consentimiento explícito |
| Click Pagar válido | Crear 1 consentimiento/version/clave por solicitud | PayPal aprobación pendiente, no beneficios |
| Cierra PayPal o vuelve sin aprobar | Consultar estado proveedor e intento | Continuar mismo intento, o abandonar confirmado |
| Un GET/POST expira o doble tap / 2 dispositivos | Idempotencia y exclusión owner | Revisar intento original, nunca CREATE duplicado |
| Pago firmado COMPLETED pero beneficio aún no activo | Ledger/hold/incidencia | Estado de verificación; no agradecimiento falso |
| Pago y beneficio activo | Actualizar cuenta, deduplicar transaccional | Beneficios + una notificación agradecimiento |
| Renovación mensual verificada | Extender período según evidencia | No nueva promo ni agradecimiento inicial |
| Rechazo/renovación fallida | Respeto PayPal reintentos proveedor | Informar gestión; conservar cobertura pagada hasta vencimiento |
| Cancelación del usuario | Solicitar una vez y confirmar proveedor | Fecha de cobertura y estado verificable, no reembolso automático |
| Refund/disputa | Conciliación y protección del derecho | Soporte y estado correcto; no inventar devolución |
| Mantenimiento | Bloquear solo CREATE nuevos | Gestión, conciliación, cancelación y PAZO gratis disponibles |
| Cambio de cuenta/sesión | Invalidar caché e identidad anterior | No mostrar estado ni invitación de otro usuario |

## 6. Persistencia e instrumentación — contrato futuro, no esquema aplicado

Una máquina de estados server-side por `owner_id + campaign_version`, con auditoría de `qualified_at`, `first_impression_at`, `first_action`, `second_notification_delivered_at`, `opted_out_at`, `last_offer_opened_at`, `last_payment_attempt_at`. Guardar exclusivamente metadatos mínimos para caps/dedup; nunca contenido de post, QR, cuidados ni mascota. Evitar identificar a los usuarios públicamente.

Evento de *impresión* solo tras render confirmado; usar handshake idempotente/lease para evitar doble pantalla entre dispositivos y recuperar reserva no mostrada. Segundo envío con outbox idempotente por owner/campaña/tipo; no crear 2 notificaciones con reintentos. Al fallar la entrega, reintentar sin contar falsamente como notificado; al perder foco durante overlay, no disparar modal repetidamente. Manejar logout, reinstalación, cambio de pet, sesiones paralelas, offline y pantalla pequeña.

Medición admin: cuentas cualificadas, overlay efectivamente mostrado, CTR Conocer, cierres X/Ahora no, supresión, segundas invitaciones creadas/entregadas/leídas, aperturas de oferta `Mi mascota` vs notificación vs overlay, oferta consultada, checkout iniciado, PayPal abandono, pagos reales conciliados, miembros verificados, reporte de beneficios. Tratar visitantes, prospectos, intentos y ventas como métricas separadas.

## 7. Condiciones de aceptación (DoD)

1. Superficies de inicio y `Mi mascota`: ningún modal durante onboarding, edición, cuidado, QR, publicaciones no guardadas, alertas/perdidos, errores; retorno suave.
2. Primera invitación se muestra como máximo una vez, solo a cuenta cualificada con señal de retorno+actividad y en momento adecuado; deja evidencia persistente tras render; nunca activa pago.
3. X y `Ahora no` son cierre, NO opt-out definitivo; botón separado de opt-out detiene toda promo.
4. Exactamente 14 días tras primera impresión validada, si no miembro/pending/optout, llega como máximo una notificación **in-app**; no más popups, no push/SMS/email.
5. Si el usuario nunca abre la segunda notificación tampoco hay una tercera; al cambiar teléfono o mascota no reinicia cupos promocionales.
6. Cualquier acceso manual a Amigo de PAZO permite checkout público si backend lo autoriza, incluso sin notificación previa. La pantalla de oferta no muestra cola/cupo ficticio.
7. Pago y beneficios persisten separados: redirección/APPROVAL_PENDING/ACTIVE sin período verificado NO significan pagado.
8. Agradecimiento se envía SOLO cuando período pagado y beneficios están listos, incluso si jamás hubo invitación; recepción no depende de `gradual_interest`.
9. Reintentos HTTP y cambio de sesión no crean notificaciones ni suscripciones dobles; cancelaciones, conciliación y soporte disponibles durante mantenimiento.
10. Pruebas UX con simulador de estados y regresión offline antes de un único E2E con comprador independiente voluntario. No probar self-payment ni falsear comprador real.
11. Todos los textos de UX finales se revisan ES/EN y accesibilidad (teclado, foco, cierre, lector pantalla, reducción de movimiento); sin contornos decorativos (norma visual PAZO).
12. Panel admin permite pausar invitaciones **sin** pausar cobros; pausar nuevos cobros **sin** interrumpir conciliación/gestión existente; auditabilidad de cada acción.

## 8. Plan de implementación y gates

**Fase A — diseño:** mostrar 3–4 variantes de pantalla completa al Product Owner. Elegir una antes de tocar UI. Verificar legibilidad, precio, periodicidad, gratuidad, salida y ausencia de presión.

**Fase B — backend promoción:** señal de uso mínimo, store persistente y privacy-safe, outbox recordatorio + dedupe, supresiones y notificaciones. Mantener separados primer render y segunda entrega. Pruebas DB/concurrencia en entorno aislado.

**Fase C — frontend:** nueva invitación sin gatito, precarga solo read, soporte `Mi mascota`/notificación; sin compra automática ni screen conflict.

**Fase D — pago público:** retirar graduales como puerta comercial, adaptar `admin_private.pazo_live_control_admits`/Edge y checkout con controles originales de PayPal, salud, aceptación, account ownership y 1 intento sin resolver. Mantener kill switch, bloqueo por incidentes, revisión/GO de despliegue por separado. Revisar SQL de gradual antes de cualquier cambio: replay histórico actualmente `NO_GO_DB_PUSH`. No forzar migraciones.

**Fase E — agradecimiento independiente:** outbox desde ledger+benefit proof; migración controlada de notificaciones antiguas sin repetirlas, feedback voluntario y gestión.

**Fase F — QA:** automáticas (incluye negativo y condiciones de carrera), E2E simulado sin cobros, inspección UI mobile, un comprador auténtico independiente que acepta Live y paga de forma voluntaria, postflight (proveedor, firma, ledger, período, benefits, inbox, cancelación). Ninguna prueba Live hasta gate explícito.

**No realizar acciones ahora:** `public` hosted, cambios DB, despliegue de functions, PayPal, Vercel, merge a main, invitar masivamente ni fabricar pagos. La última verificación anterior del flujo aún era `limited/L1_FIRST_REAL/capacity=1`; comprobar el estado alojado al iniciar implementación, nunca tomar esta especificación como prueba de que ya está publicado.

## 9. Código actual a evaluar antes de cambiar

- `src/features/supporter/components/SupporterInvitationPrompt.tsx`: existe, pero **solo QA preview** en `PetView`; está diseñada actualmente como tarjeta flotante, no como la nueva primera invitación full-screen.
- `src/components/views/PetView.tsx`: acceso `Amigo de PAZO` desde Mi mascota y preview QA; debe conservar acceso manual.
- `src/features/supporter/components/SupporterAccountManagement.tsx`: ruta central del programa y overlay de preparación gato; cambiar solo la experiencia de entrada tras elegir diseño, no sacrificar recuperación.
- `src/features/supporter/components/SupporterLiveCheckoutPanel.tsx`: checkbox, oferta, PayPal y fail-closed; preservar idempotencia de checkout.
- `src/features/supporter/gradual/useGradualStatus.ts`, `GradualCampaignPanel.tsx`: acoplan invitación/cola; reemplazar solo cuando la nueva comunicación esté lista.
- `src/components/modals/NotificationsModal.tsx`, `src/features/notifications/supporterNotification.ts`, `src/App.tsx`: bandeja/routing; mantener segundo aviso y agradecimiento.
- `supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs` y `supabase/functions/pazo-paypal-live-worker/gradualMaintenance.mjs`: hoy verifican `limited` y salud; desacoplar promoción de admisión financiera.
- `public.pazo_gradual_my_status`, `public.pazo_gradual_interest`, `supporter_private.gradual_pump`, `supporter_private.gradual_notice` y `admin_private.pazo_live_control_admits`: fuentes actuales acopladas a cohortes. El primer agradecimiento en ruta pública no debe exigir `gradual_interest`.

**Especificaciones históricas:** `docs/PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md`, `docs/PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`: preservar como historial técnico, **no** ejecutar esa apertura gradual como plan nuevo.

## 10. Ideas de dirección visual, aún no aprobadas

- **A — Medalla protagonista**: insignia 3D PAZO, mensaje de gratitud y precio visible. Cercano a la oferta actual, alta continuidad de marca.
- **B — La mascota protagonista**: avatar/foto real del usuario si existe y carga con permiso; composición personalizada y texto no invasivo. Si no hay foto, ilustración oficial PAZO, nunca foto falsa.
- **C — Nota personal de PAZO**: carta amigable/editorial, valor de comunidad, animación de entrada mínima. Precio y voluntariedad claramente visibles.
- **D — Cuatro beneficios en vistazo**: insignia central y mosaico legible de beneficios, mayor claridad racional, riesgo de saturación móvil.

**Elección visual APROBADA por el PO:** **G — Crecimiento de PAZO** del tablero comparativo de ocho conceptos, seleccionada literalmente con «la g». Hero de brote pequeño luminoso que nace de tierra con una marca de huella en la base, entorno verde bosque profundo y partículas de luz discretas; mensaje de propósito «Ayúdanos a seguir creciendo». Composición vertical móvil inmersiva y limpia, sin apariencia de modal genérico ni medalla gigante como protagonista. Abajo: explicación breve de apoyo voluntario, **US$2.99 al mes**, CTA «Conocer Amigo de PAZO», opción visible «Ahora no, seguir en PAZO» y X de cierre. PAZO básico siempre gratis. **No asociar la ilustración a promesas ambientales que PAZO no hace**: la semilla simboliza el desarrollo de la app y la comunidad. Mantener UI sin contornos decorativos, accesible y con animación sutil opcional que respete reduced-motion. La imagen del tablero es referencia de concepto, NO arte final ni aprobación automática de su copy/píxeles. Los detalles finales de móvil y microcopy siguen por revisar.

**Variantes históricas A–D y selección G:** [comparativa actualizada](PAZO_SUPPORTER_INVITATION_DESIGN_OPTIONS_20261024.md). Ninguna elección implica permiso de desarrollo, merge o despliegue.

## 11. Cómo continuar este handoff

1. Leer esta especificación **antes** de implementar cambios de promo/payment.
2. Presentar opciones visuales al PO y registrar su elección literal; no atribuirle decisiones no tomadas.
3. Auditar el estado alojado actual en modo read-only y comparar con código Git. Si no hay repo/file, pedirlo; no inventar estado.
4. Proponer PR dividido por backend/notificación/frontend/public payment, con pruebas y cambios explícitos, evitando merge/deploy sin GO.
5. Mantener marketing de adquisición con otro agente, sin cambiar briefs.
