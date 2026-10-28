# PAZO — HOJA MAESTRA | Analítica global e inteligencia de producto

**Fecha:** 28 de octubre de 2026  
**Estado:** **PLAN DE EJECUCIÓN DOCUMENTADO. IMPLEMENTACIÓN, NUEVA RECOGIDA Y PUBLICACIÓN AÚN NO AUTORIZADAS.**  
**Proyecto:** `DigitalAppcorp/pazo-app` · **Seguimiento único:** [issue #153](https://github.com/DigitalAppcorp/pazo-app/issues/153).  
**Decisión de producto obligatoria:** [PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md](PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md).  
**Entrada para agentes:** [AGENTS.md](../AGENTS.md).  
**Responsable de decisión y release:** Product Owner de PAZO. Codex u otro agente puede ejecutar los trabajos *solo cuando exista orden explícita de implementación*. Un plan aprobado no equivale a autorización para escribir código o captar nuevos datos.

> **Regla central:** cobertura del 100 % de las pantallas y **clasificación del 100 % de las interacciones relevantes**; **no** recogida del 100 % de clics. Registrar acciones semánticas y resultados comprobados, no convertir actividad en satisfacción por suposición.

## A. Resultado esperado, antes de pensar en herramientas

Crear un **sistema central de inteligencia de producto** integrado en **Administración → Comportamiento** (sin panel externo obligatorio) que permita responder con datos claros:

1. **Adquisición y registro:** ¿qué sucede desde que llega alguien desde un anuncio válido hasta que crea una cuenta y obtiene su primera utilidad? Separar solicitudes anónimas, cuentas verificadas y origen desconocido.
2. **Demo:** ¿qué áreas despiertan interés, qué acciones se intentan y qué indicios de intención de registro aparecen? No inventar usuarios únicos anónimos ni encadenar identidad de Demo con una cuenta sin una base legítima.
3. **Experiencia y fricción:** ¿qué tareas intentan hacer, dónde hay errores, estados sin salida, repeticiones, retrocesos o reintentos y qué resultado obtienen?
4. **Feed y comunidad:** ¿el contenido recomendado se encuentra, se muestra y conduce a participación útil? ¿Cómo se diferencian alcance, interacción y resultados negativos (por ejemplo, ocultar/denunciar) sin modificar automáticamente el ranking?
5. **Herramientas y fake doors:** ¿qué herramientas utilizan de verdad? ¿Cuántas exposiciones/expresiones de interés/intenciones reciben las propuestas de futuras funciones? No tratar interés declarado como adopción.
6. **Retorno y valor:** ¿qué actividades realizan quienes vuelven y qué resultados útiles confirmados se relacionan con esos regresos? Una sesión nueva no equivale a retención significativa por sí sola.

**Éxito de negocio:** las conclusiones deben permitir proponer una acción verificable de producto, marketing o UX. Si un dato no respalda ninguna decisión, no justificar su recogida solo por curiosidad.

## B. Estado de partida que el agente NO debe reconstruir

Verificar siempre el estado vivo de `main`, Supabase, Vercel y permisos al empezar; estos puntos son una línea base documentada, no un permiso para volver a ejecutar operaciones:

| Sistema | Estado / origen de verdad | Instrucción |
| --- | --- | --- |
| Analítica #150 | [PR #151](https://github.com/DigitalAppcorp/pazo-app/pull/151), [cierre #150](https://github.com/DigitalAppcorp/pazo-app/issues/150#issuecomment-6481866259); desplegada y activa el 28-oct-2026 | **Extender, no reinstalar.** No reiniciar fecha inicial, no duplicar cron/migraciones. |
| Registro y anuncios | `src/features/marketing/marketingRuntime.ts`, `preregRuntime.ts`; landing Edge, atribución validada y prerregistro protegido | Señal anónima ≠ visitante único ≠ cuenta. |
| Navegación autenticada | `behaviorRuntime.ts`, `useBehaviorObservation.ts`, `behaviorSummary.ts`, `BehaviorPanel.tsx`; SQL fuente `supabase/migrations/20261028210000_pazo_behavior_observation.sql`, versión alojada `20261028215020` | Pantallas permitidas actuales y eventos `screen_view/loading/error/retry`; no cada botón. |
| Primer valor / retorno | Fuente de utilidad existente y resultados autoritativos de cuidado y QR; informe #150 | Intento, apertura, guardado y confirmación externa son unidades distintas. |
| Feed y aprendizaje | `get_recommended_posts_page`, interacciones y etiquetas de intereses; código de selección `src/features/feed/selectFeedPage.ts` | El SQL alojado verificado usa intereses declarados y aprendidos; likes +3, guardados +7 en el disparador revisado. **No afirmar** que comentar o seguir aplica esos mismos pesos. No cambiarlo. |
| Fake doors | `src/services/featureExperimentService.ts` y tarjetas de validación: vista visible, «Me interesa» e intención de uso | Mantener las fuentes autoritativas; no guardar una segunda copia de las mismas respuestas. |
| Administración | `src/features/admin/components/AdminDashboard.tsx` y componentes de `src/features/marketing/Behavior*.tsx` | Preservar Campañas y Actividad, MFA y reportes existentes. |
| Privacidad | [Contrato #150](PAZO_ISSUE150_CONTRACT.md), [runbook de privacidad](PAZO_ISSUE150_PRIVACY_AND_RELEASE.md), [decisión aprobada](PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md) | 14 días, retirada, GPC, QA, muestras pequeñas, roles y seguridad. Sin grabación de sesiones. |

**Límites conocidos:** Demo no está cubierto por los recorridos #150; la analítica actual no registra cada interacción social; no hay todavía prueba de demanda/retención real suficiente; ausencia de campaña válida no demuestra origen orgánico. Fuentes distintas pueden producir números no comparables. El agente debe reconfirmar estas premisas antes de actuar.

## C. Alcance de cobertura: inventario obligatorio por pantalla y tarea

El inventario real se extrae del código **y** de pruebas de navegación auténticas en ES/EN, móvil/PWA/escritorio. La tabla siguiente es un **punto de partida, no la afirmación de que ya existe instrumentación o de que todas las acciones deben almacenarse**.

| Área que se debe recorrer | Preguntas / acciones candidatas (P = prioritaria) | Fuente inicial / cautela |
| --- | --- | --- |
| Landing, bienvenida, login | llegada desde campaña, CTA de registro, iniciar sesión, recuperar contraseña, errores por categoría **(P)** | Prerregistro #150 limitado a campañas válidas; no registrar email ni contraseñas |
| Registro y primera mascota | abrir formulario, intentar enviar, confirmación, abandono **solo si es demostrable**, crear mascota, fallo/recuperación **(P)** | Resultado confirmado en Auth/pet; no relacionar anónimos a cuentas por inferencia |
| **Demo** | entrar, áreas realmente abiertas, interacción relevante con ejemplo, CTA a registro y salida **(P)** | Sin identidad autenticada; usar solo señales agregadas seguras si superan el análisis de privacidad/antiabuso; si no, `NOT_MEASURED` |
| Inicio / feed | entrar, contenido realmente expuesto si se puede medir proporcionalmente, abrir detalle, like, guardar, comentar, seguir, ocultar, denunciar, crear publicación, error de carga y reintento **(P)** | Los cambios autoritativos de interacción existentes tienen prioridad; no duplicar eventos ni confundir impresión con lectura |
| Mi mascota / perfiles | visitar perfil propio o público permitido, editar, seguir/dejar de seguir, entrar en herramientas, tareas completadas | No recoger biografía, fotos, nombres, textos ni atributos privados |
| Comunidades | descubrir, abrir, unirse, abandonar, crear, publicar, intentos fallidos, propuestas fake door | Reutilizar registros ya persistidos y la validación existente |
| Lugares / Mapa | abrir mapa, buscar (sin texto de consulta), elegir tarjeta, solicitar ruta, sugerir lugar, error/ausencia de resultados | Sin GPS preciso, coordenadas, rutas reales ni historial de movimientos en telemetría |
| Explorar / búsqueda | abrir, enviar búsqueda (solo indicador de acción, no término), cero resultados, seleccionar resultado | No guardar búsquedas libres ni IDs de contenido sensible |
| Pasaporte QR | abrir, solicitar descarga, compartir/resultado conocido, fallo o cancelación cuando se pueda observar | Compartir resuelto por API ≠ archivo recibido por tercero |
| Agenda / cuidados / documentos | abrir, iniciar crear, guardar cuidado, completar, gestionar documento, recuperación y error **(P)** | Priorizar operaciones persistidas; no recopilar datos médicos, contenido ni documentos |
| Mascota perdida / alertas | abrir, intentar publicar, alerta confirmada, cierre/levantamiento, error | Evitar identidad, avistamiento y ubicación precisa en analítica; alta sensibilidad |
| Notificaciones / soporte / ajustes | abrir sección, acción clave cumplida, error, acceso a privacidad y retirada | No recopilar conversaciones ni texto de solicitudes |
| Apoyo/PayPal / invitaciones | solo eventos no financieros mínimos cuando exista justificación y permiso | **Sin** monto, checkout, identidad de pago, datos de tarjeta, trazas privadas; no modificar integración |
| PWA / idioma / accesibilidad | CTA instalar mostrado/pulsado/resultado del navegador si disponible; cambios de idioma agregados solo si sirven a decisiones | No inferir instalación exitosa porque se pulsó el CTA |
| Administración | **excluir de comportamiento de usuarios y conversiones**; monitoreo operativo separado | Evitar que QA y staff alteren métricas |

Para **cada pantalla y control** documentar: ruta y componente, texto ES/EN, propósito, acción exacta, tarea a la que pertenece, estado fuente, señal existente, evento propuesto (si hace falta), clase de identidad, posibilidad de confirmar éxito, sensibilidad, coste, pregunta analítica, prioridad y prueba. Clasificar cada control como `INSTRUMENTED`, `REUSE_SOURCE`, `PROPOSED`, `EXCLUDED_WITH_REASON` o `NOT_MEASURABLE_SAFELY`. Los controles de baja importancia pueden ser excluidos conscientemente.

## D. Contrato técnico para cualquier nuevo evento

No decidir una solución de captura automática o librería antes de completar la auditoría. Preferencia de diseño: eventos explícitos de negocio más un registro central tipado de controles y vistas seleccionados; complementar con captura automática **solo si una revisión demuestra que es proporcionada, configurable y segura**.

**Ficha obligatoria de un evento nuevo:**
- `event_id` o clave estable + versión de contrato, ejemplo ilustrativo `demo_entered.v1` (no indica que ya exista).
- Emisor: vista, control o **resultado de operación confirmada por el servidor**. Separar `exposure`, `intent`, `attempt`, `success`, `failure` y `retry` cuando tenga sentido.
- Pantalla/tarea y parámetros **cerrados** (sin texto libre, URL, ID de contenido, ubicación, PII o identificadores de campañas no permitidos).
- Momento exacto en que se considera válido; reglas de una vez por tarea/página, deduplicación, orden y reintentos con topes.
- Identidad permitida: anónimo agregado sin ID persistente **o** autenticado elegible, no mezcla automática.
- Fuente de verdad y política de autoridad: los éxitos se comprueban con la operación persistida, no con un botón. No duplicar fuente de interés de fake doors/feed.
- Grado de seguridad, retención, muestra mínima, permiso/retirada, coste esperado y ejemplo de uso del dato.
- Clase de resultado y explicación de lo no observable; QA separado en entorno aislado.

**Esquema conceptual mínimo:** `event_name`, `schema_version`, `screen_key`, `task_key`, `event_kind`, `outcome_category`, `server_observed_at` y referencias **efímeras y autorizadas cuando corresponda**. No asumir que todos estos campos requieren una nueva tabla: primero mapearlos a #150, fuentes existentes y resúmenes.

**Semántica de datos:** clic ≠ intención profunda; demora ≠ satisfacción; última pantalla ≠ abandono demostrado; `signup_requested` ≠ cuenta creada; una visita a Demo no demuestra que el visitante se registró; no transformar totales de acciones en porcentajes de personas. Los períodos y denominadores deben exponerse junto al resultado.

## E. Diseño y gobierno de la información

1. **Una sola fuente por hecho:** reusar interacciones, cuidados guardados, confirmaciones QR, validación de funciones y atribución existentes. Si una misma tarea tiene registro de UI y resultado de servidor, vincularlos solo dentro de la identidad autorizada y documentar la diferencia.
2. **Dos planos separados:** seguimiento de experiencia agregado para el PO y personalización del feed para el usuario. El segundo conserva sus reglas; **no** cambiar pesos, etiquetas ni añadir señales de clic automáticamente. Cualquier ajuste posterior requiere hipótesis, evaluación de calidad e instrucción nueva.
3. **Anonimato:** campañas válidas y señales anónimas solo agregadas con protección antiabuso. Para Demo, no generar huella digital, ID anónimo persistente, sesión grabada ni correlación con una cuenta por defecto. Si no puede medirse seguro el paso a registro, mostrar eventos por separado y `NOT_MEASURED` para tasa/conversión.
4. **Privacidad y derechos:** conservar/validar GPC, controles de retirada/supresión, exclusión QA/admin, separación de permisos, RLS/ACL, retención activa de 14 días, cron y política ES/EN. Revisar aplicabilidad y cambios normativos antes de ampliar finalidades; evitar afirmaciones de certificación jurídica.
5. **Poco tráfico:** `n<10` se protege según controles actuales, con supresión de grupos complementarios; cero datos ≠ error; indicar desde cuándo existe cobertura. No se promete D30/D90 con los 14 días vigentes.
6. **Prohibiciones técnicas:** sin grabación de pantalla, keylogging, rastreo de puntero, capturas de campos, palabras de búsqueda, geolocalización exacta, contenido de mensajes, perfiles personales detallados para el admin ni exportaciones crudas innecesarias.
7. **Errores y volumen:** telemetría opcional y no bloqueante; deduplicar, enviar en lotes o resumir según coste; límites por ventana y sesión, TTL y retirada. Un fallo, timeout u offline **no debe impedir** interacción, crear contenido o pagar.
8. **Rendimiento:** medir impacto en dispositivos reales o equivalentes. INP a percentil 75 de hasta 200 ms es una referencia de experiencia, no garantía: [web.dev/INP](https://web.dev/articles/inp). Exigir comparación antes/después y ausencia de degradación significativa atribuible a la instrumentación; si no hay línea base útil, declararlo y obtenerla primero.
9. **Coste:** presupuestar volumen de eventos, base de datos, Edge, consultas, almacenamiento y mantenimiento. Evitar contratar proveedores o superar cuotas sin autorización específica.

**Fuentes de revisión antes de cada release:** [CPPA — regulación vigente](https://cppa.ca.gov/regulations/ccpa_updates) y [CPPA — datos y minimización](https://cppa.ca.gov/pdf/enfadvisory202401.pdf) (aplicabilidad jurídica por evaluar), [web.dev — INP](https://web.dev/articles/inp), guías oficiales de seguridad Supabase y políticas vigentes de PAZO. No derivar una afirmación legal categórica solo de estos enlaces.

## F. Orden de ejecución por fases / entregas

Cada fase produce evidencias reproducibles y tiene un criterio de salida. **Una vez que el PO autorice explícitamente la implementación**, el agente puede preparar ramas, PRs y staging sin aprobaciones cosméticas parciales, **pero no puede publicar ni activar nueva recogida hasta el GO final separado**. Para cambios de finalidad legal, proveedor externo, presupuesto o riesgo sustancial no cubierto, escalar el bloqueo al PO.

| Fase | Trabajo y entregable verificable | Gate de cierre |
| --- | --- | --- |
| **0. Preflight** | Verificar main/deploy, #150, migraciones/Edge, línea base de actividad y cron, superficie de componentes y dependencias; preservar rollback. | Snapshot versionado y lista de sistemas protegidos; sin suposiciones. |
| **1. Inventario de experiencia** | Recorrer **todas las vistas, estados y controles** en ES/EN; revisar código + pruebas navegador con Design Intelligence OS. Crear `EVENT_COVERAGE_MATRIX` con 100 % de controles relevantes clasificados, hipótesis, fuentes y exclusiones. | Ningún control relevante queda sin clasificación; alcance crítico justificado, no eventos propuestos al azar. |
| **2. Contrato y arquitectura** | Diseñar taxonomía versionada, propiedad, esquema mínimo, compatibilidad #150, capa de envío/ingestión, antiabuso, seguridad, derechos, retención y costes; Marketing Brain OS valida preguntas/denominadores. | Design OS + Marketing OS critican el plan; matriz de amenaza/privacidad y estimación de volumen aprobables. |
| **3A. Captura de activación** | Completar eventos de login/registro/primera mascota/primer éxito, y **Demo** con la máxima cobertura segura; fallback `NOT_MEASURED` para anon no medible. | Intento y éxito diferenciados, fuente real, ninguna PII; errores y retirada probados. |
| **3B. Interacciones de producto** | Feed, perfiles, comunidades, mapa, explorar, QR, Agenda, alertas, fake doors y resto de acciones críticas, **reutilizando fuentes existentes**; sin alterar algoritmos. Dividir en PRs por dominio si es necesario. | Cada tarea crítica tiene prueba acción → resultado autoritativo → reporte, o exclusión justificada; no duplicados. |
| **4. Administración** | Ampliar **Comportamiento** con lectura por pregunta: adquisición/Demo, tareas/errores, feed/comunidad, utilidad/fake doors y retorno; filtros y diagnóstico claro. Preservar **Campañas** y **Actividad**. | Un PO sin SQL puede identificar un problema, tamaño de muestra, limitación y acción razonable; ES/EN móvil/desktop y MFA. |
| **5. Pruebas + auditoría final** | Unitaria, integración PostgreSQL17 aislada, Auth/QA/ACL/RLS, antiabuso, anonimato, logout/relogin A→B→A, GPC/supresión, idempotencia, volumen/retención, PWA/offline, visual/keyboard, rendimiento y regresión funcional. | Todo gate crítico PASS con evidencia vinculada al SHA exacto; defectos materiales corregidos, no ocultos. |
| **6. Candidato de release** | Migraciones dirigidas **preparadas OFF**, avisos ES/EN preparados, CI final, staging seguro, informe con verificaciones, límites, costes, rollback y controles de activación independientes. | **READY_FOR_PO_GO**, no producción. El PO da la única decisión de lanzamiento. |
| **7. Lanzamiento posterior al GO** | Orden seguro: preflight, privacidad publicada, migración única dirigida OFF, backend y frontend, luego nuevos gates de colección y postflight. Rollback aislado ante fallo. | Despliegue/retención/QA/privacidad y operación real verificadas; distinguir datos sintéticos de muestra real. |

**No ejecutar PRs de reescritura global:** priorizar cambios pequeños, con compatibilidad hacia atrás. Los nombres `3A/3B` son paquetes lógicos: el agente puede secuenciar varios PRs técnicos sin alterar dependencias, gates ni el alcance aprobado.

## G. Diseño obligatorio del dashboard

**Jerarquía por decisiones**, no una pared de gráficas. Mantener el estilo PAZO y Design Intelligence OS: superficies limpias, sin contornos excesivos, buena tipografía, accesibilidad y uso móvil real.

**Vistas recomendadas para comprobar en fase 4:**
1. **¿Qué pasa antes de registrarse?** llegada de anuncio, CTA, formulario, solicitud y verificación. Unidades separadas, datos desde inicio de cobertura, campaña validada frente a origen desconocido; Demo como **bloque anónimo agregado aparte**, no como funnel individual supuesto.
2. **¿Dónde se atascan las tareas?** acción iniciada, resultado confirmado, error/reintento, fallos por módulo, `NOT_MEASURED`, muestra y cobertura.
3. **¿Qué contenido despierta participación?** exposiciones medibles, interacciones sociales confirmadas, medidas de ocultar/denunciar si son pertinentes; análisis del feed **sin tocar ranking**.
4. **¿Qué herramientas y propuestas aportan valor?** uso real de QR/Agenda y fake doors diferenciando vista/interés/intención; acciones persistidas por fuente.
5. **¿Qué hacen los que vuelven?** sesiones de regreso, primera utilidad tras regreso, cohortes maduras D1/D7; **sin** D30/D90 fingidos, causalidad o tasas con unidades incompatibles.

**Requisitos de estados UI:** sin observaciones, muestra protegida, ventana inmadura, colección pausada, error, offline, cargando, reintentar, ausencia de atribución y datos incomparables. El dashboard debe **decir por qué** una cifra no aparece; no reemplazar errores por cero. Cada conclusión automática debe ir etiquetada como **hipótesis** y proponer una validación, no una causalidad.

## H. Matriz mínima de pruebas de aceptación

Los siguientes ejemplos son **escenarios de laboratorio**, nunca registros reales de producción:

| Escenario | Qué debe ocurrir |
| --- | --- |
| Anuncio reconocido → registro | Prerregistro agregado y cuenta verificada se contabilizan en sus fuentes distintas; no hay enlace ficticio ni tasa de personas derivada de solicitudes. |
| Visitante sin campaña → Demo → intenta registro | Registrar solo señales anónimas proporcionales que superen gate de privacidad; de otro modo `NOT_MEASURED` explícito. No crear perfil invisible. |
| Usuario real → Muro → like/guardar/comentar | El dato de negocio se confirma en su sistema; el resumen no cuenta dos veces una misma operación. Cambiar el análisis no cambia puntuación/feed. |
| Fake door vista → «Me interesa» → intención | Mostrar tres niveles diferentes y fuente única; un clic repetido no se trata como usuarios diferentes. |
| QR abierto → cancelación de compartir | No contabilizar entrega ni utilidad externa. |
| Agenda: intento → error → reintento → guardado | Error e intento separados; éxito confirmado solo después de persistir. La analítica falla sin bloquear guardado. |
| Mapa con ubicación/Explorar con texto | Confirmar que GPS preciso, términos y contenido de usuario **no** se transmiten ni se almacenan en eventos. |
| QA / admin / GPC / retirada | No contamina informes, no reaparece tras salir/entrar, los registros aplicables se suprimen conforme al mecanismo establecido. |
| Dos cuentas A→B→A / token actualizado | No mezcla sesiones ni registra eventos con identidad anterior, incluso con llamadas pendientes y cambio rápido. |
| Offline / red lenta / timeout / spam | No bloquea navegación; límites y colas finitas, sin bucle infinito ni abuso de Endpoint/Edge. |
| Vista móvil ES/EN + PWA + lectores/teclado | Sin pantallas inaccesibles, números pequeños ilegibles, recortes o cambios de idioma que alteren semántica. |
| Retención y costo | Purga real en laboratorio después de 14 días simulados, cron/roles sin regresión, proyección de carga/coste anotada. |
| Analytics OFF / migración OFF | No hay **nueva** escritura ni falta de consentimiento/aviso; todas las funciones del MVP siguen operativas. |
| Población 0/1/9/10 cuentas y cohortes inmaduras | Se suprimen segmentos pequeños y diferenciales; jamás aparecen estadísticas individuales o D7 prematuro. |
| PayPal/Supporter/Auth/alertas/QR/Agenda | Conservar flujo funcional y permisos; no telemetría financiera nueva ni regresiones. |

**Medidas de aceptación cuantificables:**
- **100 %** de pantallas y controles relevantes auditados, clasificados y enlazados a código/prueba o exclusión razonada.
- **100 %** de eventos críticos autorizados con prueba de emisión, deduplicación, elegibilidad y resultado en informe o fuente agregada. Si una recogida no es admisible, no forzarla: cerrar como `NOT_MEASURABLE_SAFELY` y mostrar la limitación.
- **0** nuevos campos de datos personales prohibidos; **0** capturas sin gate; **0** registros de QA en las cohortes reales; **0** regresiones críticas aceptadas.
- Tests de seguridad/privacidad, navegación, dinero y autenticación completos **PASS** en SHA final. Rendimiento comparado con baseline, sin degradación material; alertas de coste anotadas.
- Informe final y PRs contienen matriz, evidencia, limitaciones y runbook de reversión; **ningún despliegue final sin GO separado**.

## I. Documentos de entrega que un agente debe dejar

Dentro del repo, preferiblemente bajo `docs/product-intelligence/`, con nombres y enlaces estables:

1. `EVENT_COVERAGE_MATRIX.md` (o CSV/JSON versionado si ayuda al test) — todas las pantallas y controles, estado y motivo.
2. `EVENT_TAXONOMY_V1.md` — eventos, unidades, propietarios, fuentes, criterios, ejemplos no sensibles y compatibilidad.
3. `PRIVACY_SECURITY_AND_COST_REVIEW.md` — finalidades, datos prohibidos, GPC/retirada, antiabuso, retención, permisos, volumen y límites.
4. `DASHBOARD_DECISION_SPEC.md` — preguntas, métricas, denominadores, filtros, estados, diseños ES/EN y requisitos Design OS.
5. `TEST_MATRIX_AND_EVIDENCE.md` — suites, SHA exactos, fuentes de datos sintéticos, fallos y correcciones, cobertura y performance.
6. `RELEASE_RUNBOOK.md` y `FINAL_CANDIDATE_REPORT.md` — OFF/preflight, instalación dirigida, aviso, activación, reversión y lo que **no** quedó probado en producción.

Evitar duplicar reglas en cientos de documentos o reescribir decisiones históricas: vincular fuente original y anotar qué estados previos quedaron superados. Los archivos de evidencia deben evitar secretos, PII y volcados de datos reales.

## J. Instrucción de handoff para otro agente

**Al retomar:** leer en este orden `AGENTS.md` → [decisión](PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md) → **esta hoja maestra** → [issue #153](https://github.com/DigitalAppcorp/pazo-app/issues/153) → [contrato #150](PAZO_ISSUE150_CONTRACT.md). Confirmar estados vivos y diferenciar historial de vigente.

**Si no existe GO de implementación:** mantener únicamente la planificación; no editar funcionalidades ni instalar servicios. El agente puede debatir y proponer cambios críticos, pero no asumir ejecución autorizada.

**Cuando el PO entregue GO de implementación:** Codex/u otro agente puede ejecutar fases 0–6 autónomamente con los criterios fijados y una sola entrega final para revisión, elevando solo bloqueos de seguridad, legales, coste o permisos que requieren decisión real. **No ejecutar fase 7** hasta la autorización de lanzamiento específica del PO.

**Criterio de decisión posterior a datos reales:** evaluar de manera conjunta evidencia, tamaño de muestra, impacto UX, negocio y riesgos. El primer cambio de feed/personas nunca se justifica simplemente por haber capturado más clics.

**Frase rectora:** *PAZO observará la experiencia completa, almacenará solo señales justificadas y utilizará evidencia para mejorar el producto; no confundirá acciones con valor ni sacrificará privacidad/rendimiento para fabricar métricas.*
