# Issue147 — candidato corregido y calidad visual

Orden vigente: [147, actualización del28-oct10:30UTC](https://github.com/DigitalAppcorp/pazo-app/issues/147), contrastada de nuevo durante la ejecución. Resultado elegido por Design OS, sin solicitar alternativas ni microaprobaciones estéticas. **No hay autorización de lanzamiento, merge final de PAZO, instalación SQL ni activación de nueva medición.**

## Resultado y estado verificable

| Elemento | Referencia / estado |
| --- | --- |
| Corrección PAZO | [PR148](https://github.com/DigitalAppcorp/pazo-app/pull/148), abierto para integración final; rama `fix/issue147-contextual-composition-20261028` |
| Artefacto de producto validado | SHA `dd46582915043a0a049b3673dfc89a4400f2bfa2` |
| Preview del candidato | [Staging protegido](https://pazo-8bbqfm7ea-digitalapp.vercel.app), `dpl_9GhAAVUP6dYzSyDxudzCunBcRi5q`, READY, SHAdd465829 exacto |
| Corrección del método | [Project Brain OS PR13](https://github.com/DigitalAppcorp/project-brain-os/pull/13), candidato0.7.0, head `251ba2438ddc70206ca1378b2d77c3ae79d42d32`, CI SUCCESS; abierto, sin merge/instalación global |
| Main PAZO preservado | `9cd497114c3b9e2f654dfa8dd6dee88ebb58bdcd`; aún contiene la experiencia142 rechazada, no desplegarlo por inercia |
| Producción preservada | `8dbf4ef5fe7a926f1caee3a55ee3c60f31400c04`, `dpl_3KrqGdJmijURjdirv1W1iwhkhSW7`, READY, alias `pazo-app.vercel.app` |

Los commits finales de evidencia/continuidad del PR no alteran el código de producto del artefactodd465829; comprobar el diff de `src`, servicios, SQL, flags y configuración frente a ese SHA. Los gates del head documental final quedan en PR148 para evitar un registro autorreferencial de su propio hash.

## Qué cambió y por qué

Después de guardar la primera mascota, se abre **Mi mascota**, con sus herramientas reales. Se elimina la gran superficie de orientación en Inicio. «Explorar PAZO» se integra como salida secundaria en el encabezado existente de herramientas; QR y Agenda conservan sus propios accesos, sin duplicarlos. La intención QR solo se usa si la atribución existente la validó; no se abre un modal automáticamente. Al elegir herramienta, explorar, navegar o cambiar mascota se descarta la orientación. Volver a una cuenta existente no la repite.

Inicio queda para su contenido: espera y error se agrupan con el título, explicación y siguiente acción. No hay loader aislado junto al dock, altura completa añadida tras otro bloque, posts ficticios ni skeletons ornamentales. Error conserva reintento local; el título mantiene su posición entre estados a los anchos afectados. Contenido, filtros y vacío existentes permanecen.

QR/Agenda son ahora botones nativos y operan por teclado. El foco de primera llegada apunta al QR sin abrirlo; solo se desplaza el contenido si las acciones quedan cubiertas por el **dock flotante real**, con prueba en320×568. Se corrigió el solapamiento de Editar/identidad a320px. Las etiquetas de especie y el placeholder de edad se localizan en inglés, sin reescribir enums ni texto introducido por el dueño; el subtítulo del pasaporte explica que la ficha es pública. No se modifican SQL1B, marketing, AuthProvider/MFA, ofertas, pagos, invitaciones ni reglas del backend. La causa funcional de primera mascota descrita abajo justifica el ajuste localizado del servicio cliente.

Se reprodujeron y corrigieron tres fallos de vigencia de primera mascota en App (A→B, A→B→A y logout/login con igual ID) y cinco contratos del servicio. La finalización captura la época de cuenta; descarta callbacks, errores y staging de atribución obsoletos. El servicio verifica la sesión contra `getUser`, fija la autorización del RPC y comprueba vigencia antes/después de esperas; una petición antigua no usa el token de la siguiente cuenta. Son controles por solicitud, no solo ID. [Controles negativos y resultados](evidence/issue147/negative-control.json). No altera RLS ni AuthProvider.

## Investigación, decisiones y crítica

[Diagnóstico, contrato de diseño, alternativas y aprendizaje](PAZO_ISSUE147_DESIGN_REVIEW_20261028.md). Se recuperaron visión de PAZO, código/runtime9cd, sistema Quicksand/verde/lima, capturas y28 eventos históricos F13/admin con sus límites, y el rechazo concreto del PO. No se reconstruyeron aprobaciones inexistentes.

Se implementaron y probaron dos estructuras distintas: **A**, orientación mínima sin superficie en Inicio, descartada por duplicación de acciones/cabeceras y competencia con el feed; **B**, entrada a herramientas existentes, elegida. Se comparó con no añadir nada: evita UI extra, pero deja por descubrir la ruta hacia la primera utilidad. No se presenta al PO una elección de tarjetas/colores. [Evidencia de baseline y A](evidence/issue147/alternatives/) conserva sus matrices, capturas y patch; sus PASS funcionales no son aprobación estética.

Las pasadas adversariales separadas revisaron jerarquía, continuidad, densidad, espacio negativo, identidad, copy, CTA, estados y dock. Además del solapamiento320, la inspección alojada descubrió un error de la propia iteración: un selector `nav` ambiguo tomaba las pestañas del perfil por el dock y saltaba demasiado, mostrando alerta/membresía en la primera llegada. Se corrigió al marcador específico del dock y se añadió la comprobación de no saltar el perfil a altura844. No se ocultó el fallo porque los clics y el CI pasaran.

**Control negativo reproducible:** el harness actualizado, ejecutado contra la preview anterior08a934, falló como debía: `278 !== 0`, «first arrival must not jump past identity into loss/membership tools». Se conserva [evidencia del rechazo interno](evidence/issue147/negative-control.json). La versióndd465829 supera el mismo control y conserva scroll/foco en pantalla corta. Esto demuestra detección de ese defecto, no superioridad estadística del modelo.

La captura se corrigió también: espera fuentes, imágenes visibles decodificadas y animaciones finitas. Una imagen creada a mitad de transición o antes de cargar el avatar no acredita el acabado final. El primer ensayo alojado que esperaba el evento global `load` agotó30s en el transporte de assets/fuentes; se cambió a DOMContentLoaded con readiness explícita. Fue un límite del harness autenticado, no una medición de velocidad de PAZO. No se afirman mejoras de rendimiento o conversión.

## Matriz de verificación

| Alcance | Resultado / evidencia |
| --- | --- |
| Runtime completo, ES/EN320/390/430 |24 combinaciones de pendiente/contenido/vacío/error; seis recuperaciones; primera llegada y regreso sin orientación repetida. [Resultados](evidence/issue147/final/results.json) |
| Calidad visual situada | Capturas completas realmente inspeccionadas, con composición y crítica registradas. [Registro profesional](evidence/issue147/design-review.json), [galerías y capturas](evidence/issue147/final/) |
| Pantalla corta | ES/EN320×568, QR/Agenda por encima del dock, foco/scroll y salida libre. [Resultados](evidence/issue147/short/results.json) |
| QR, Agenda y medición1B conservada | Seis recorridos ES/EN320/390/430 del frontend alojado hacia PostgreSQL17 aislado: primera mascota real en laboratorio, intención aceptada, QR visible, cancelación no contada, compartir simulado resuelto, descarga con métrica503 y cuidado persistido con RLS/trigger. [Resultados](evidence/issue147/utility-browser.json) |
| Cargas independientes, ABA, offline y retry | Seis recorridos alojados/18 visitas a Comunidades/Lugares/Mi mascota con feed pendiente; A→B→A y recuperación. [Resultados](evidence/issue147/navigation-browser.json) |
| Orquestación/sesiones/MFA |25 tests de App/vigencia, incluido primer perfil→herramientas→Explorar mientras feed pendiente; respuesta antigua y MFA conservados |
| Primer uso/idioma/estados |24 tests, con header integrado, ausencia de CTA duplicados, espera/error utilizables, intención validada/no válida, logout, A→B→A de recibo y etiquetas sin modificar datos |
| Regresión integral | Gobernanza774, cierre incluido527, F16 sintético1196, F14 Linux53, dist/PWA4, TypeScript/build y release guard PASS |
| Backend de resultados1B |32 comprobaciones PG17 del código conservado, incluidos RLS/propiedad, concurrencia, rollback, lock de analítica, D7, pausa, retención, supresión y baja; CI PASS |

CI del códigodd465829: [principal y regresiones](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40689238669), [PG/utility/browser/composición](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40689238630), [marketing](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40689238544), [F17 seguridad](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40689238745), [F18 financiero/invitaciones](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40689238706): cinco workflows completos SUCCESS. Artifacts de composición12816810479 y utilidad12816257619, del mismo SHA, caducan11-nov-2026; evidencia final permanente versionada con [hashes](evidence/issue147/sha256.json).

ESLint global conserva166 diagnósticos heredados (148 errores/18 warnings), igual al baseline de142; no se afirma lint global limpio. Los módulos nuevos no añaden diagnósticos. El CI mantiene el tratamiento heredado no bloqueante de esa deuda; no se amplió esta intervención a una refactorización general.

## Qué demuestra y qué no

Las capturas y recorridos finales ejecutan assets reales de la preview inmutable, obtenidos mediante CLI Vercel autenticado por las protecciones existentes. **Auth/datos alojados están interceptados**, no son una prueba de login/DB reales alojados. La matriz visual fuerza los cuatro estados con datos sintéticos controlados, incluido el post de muestra; no se añade contenido ficticio al producto ni se supone que el feed habitual queda pendiente indefinidamente. Las operaciones de utilidad sí persisten en PostgreSQL17 desechable con RLS/trigger. No hubo escrituras QA alojadas, pagos ni cohortes artificiales.

Web Share se simula: no se acredita entrega externa. Una descarga iniciada no demuestra archivo guardado. Pruebas de escritorio móvil no certifican todos los dispositivos físicos, lector de pantalla, instalación PWA o teselas reales Mapbox. Se ejecutan los gates públicos de Auth/PWA y callbacks existentes sin escribir a producción. El contraste calculado de tres pares sólidos no certifica toda la app. No se inventa una puntuación de UX, causalidad o impacto de negocio.

## Design OS y decisión profesional

El PR13 corrige un único protocolo central y sus referencias/plantilla: nueva UI autorizada exige juicio, capturas completas/estados, crítica, corrección y recaptura; no voto estético rutinario del PO. Rediseños dirigidos preservan la intención aceptada.13 tests del motor y11 contraejemplos del contrato pasan en [CI251ba243](https://github.com/DigitalAppcorp/project-brain-os/actions/runs/40679579376). RECORD_COMPLETE solo comprueba integridad del registro; la calidad se sustenta en las imágenes inspeccionadas y la crítica. La batería comparativa independiente del modelo sigue NOT_EVALUATED.

El rechazo del PO se registra en [ledger PAZO](design-learning/feedback.jsonl), sin generalizar una prohibición de tarjetas. Dos eventos del mismo issue no son dos incidentes independientes. Las iteraciones rechazadas por el propio diseñador se documentan como revisión interna, sin atribuirlas al PO.

**DESIGN_QA_PASS** es la decisión profesional interna del alcance, sustentada en el registro final; **PO_VISUAL_ACCEPTED=NOT_REQUESTED**. No se exige al PO rescatar el diseño ni inspeccionarlo como gate ordinario. La revisión adversarial fue una pasada separada del mismo agente, no un segundo revisor independiente inventado. Ingeniería y permisos de release son decisiones distintas.

## Preparación para producción y siguiente gate

Main9cd y producción8dbf permanecen intactos. Supabase se verificó solo por lectura:132 migraciones, versión nueva20261028075145 ausente, tabla de resultados nueva ausente; marketing vigente enabled/14d/retención saludable. **Nueva medición no instalada ni activada.** Ningún `db push`, `migration repair`, SQL alojado nuevo o cambio comercial. Previews586/08/8f04 se usaron para evaluación y fueron sustituidas por dd465829; no son candidatos de lanzamiento.

Cuando el PO autorice **publicar la mejora completa**, ese GO cubrirá el merge final del PR148, preflight de historia/hash/retención, instalación controlada de la única SQL1B con utilidad OFF, frontend/aviso ES/EN, habilitación explícita de nueva medición y postflight/rollback. Se ejecutará autónomamente sin pedir permisos para cada subpaso ya cubierto. Seguir el [runbook preparado en142](PAZO_ISSUE142_FINAL_REPORT_20261028.md#publicación-preparada-y-reversión), revalidando estado vivo y el hash del SQL pendiente; no empujar todas las migraciones ni reparar historia en bloque.

Reversión preparada: no hacer merge de este PR si falla el gate previo; después de una publicación autorizada, apagar nueva utilidad y volver al deployment8dbf o al frontend estable validado que corresponda, conservando purga/auditoría. No DROP destructivo ni alteración de Auth/pagos para revertir UI. El PR de Brain OS tiene su propio gate de integración; no se fusionó automáticamente.

**GO técnico para el lanzamiento completo cuando llegue la autorización única del PO; NO GO para publicarlo autónomamente ahora.** No hay bloqueo de implementación que exija nuevas órdenes técnicas. La decisión estética ordinaria está resuelta por Design OS; solo resta el GO de lanzamiento y sus preflight/postflight preparados.
