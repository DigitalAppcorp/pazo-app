# Diseño de decisión — Administración → Comportamiento

Audiencia: Product Owner de PAZO. Objetivo: encontrar una tarea o propuesta que merezca investigación sin descifrar nombres técnicos o confundir interés con uso. Se conserva el dashboard nativo, Campañas, Actividad y MFA.

## Decisión de Design Intelligence OS

Se revisaron el sistema PAZO y el protocolo autónomo vigente de Brain `84ce94f39f461e44cf320f10319612c5eedf0f03` (root, UI/UX y Marketing). Se compararon internamente: (a) otra página con una tabla exhaustiva de eventos, (b) cinco preguntas dentro de Comportamiento, y (c) mantener solo #150. Se elige (b): conserva el contexto y permite consultar una pregunta a la vez. (a) trasladaba la taxonomía técnica al PO; (c) no respondía las nuevas preguntas. No se pide al PO seleccionar alternativas.

1. ¿Hasta dónde llegan los anuncios? Mantiene el recorrido verificado de #150, añade Demo y acceso como solicitudes sin identidad. Nunca conecta ambos como personas.
2. ¿Dónde se interrumpen las tareas? Intentos, fallos y reintentos por tarea; propone investigar hasta tres tareas con fallos visibles. Sin porcentaje de éxito entre fuentes distintas.
3. ¿El contenido genera participación? Exposición y acciones del feed/comunidad, con señales negativas separadas. No modifica ranking.
4. ¿Qué herramientas despiertan interés? Actividad de herramientas y bloque propio de propuestas por módulo. «Me interesa», intención y adopción tienen significados diferentes.
5. ¿Qué usan al volver? Mantiene D1/D7 maduro de #150 y muestra actividad posterior a una sesión observada previa. No atribuye causalidad ni fabrica D30/D90.

Cada bloque declara unidad, cobertura, muestra y limitaciones. Sin campaña válida significa origen desconocido. Ausencia de una fila no equivale a cero. Filtros por anuncio/cuenta no se aplican a Demo: no existe puente de identidad.

## Composición y crítica separada

Diseño dentro de la familia aprobada: fondos crema/blanco, verde profundo y acento amarillo, tipografía existente, superficies sin contornos añadidos, foco por color y subrayado. Las preguntas se distribuyen en cinco columnas de escritorio y dos en móvil, con la última a ancho completo. Se separan resultados de fuentes persistidas, intentos/fallos y propuestas. Botones de consulta y reintento tienen propósito inequívoco y no reinician Administración.

Pasada adversarial de la misma agente, separada de implementación; no se atribuye revisión a otra persona o agente. Defectos encontrados y corregidos: título anterior demasiado centrado en anuncios; propuestas mezcladas con actividad real; agregado de interés sin identificar qué propuesta; texto de muestra ambiguo para solicitudes anónimas; error del informe previo visible al consultar otra pregunta. Se amplió el título, se separaron propuestas, se cerró el catálogo de 11 módulos, se aclararon unidades y se aislaron estados por pregunta. La inspección posterior corrigió el espacio entre actividad y propuestas, verificó la fuente tipográfica primaria y aclaró en pantalla la deduplicación de vistas y la falta de historial de retiros. La pausa se describe sin insinuar que siempre sea una primera activación.

La inspección exige capturas reales del runtime completo con scroll de la Administración nativa, además de pruebas de interacción. Capturas que solo existen en disco no acreditan aprobación. [Evidencia e imágenes inspeccionadas](TEST_MATRIX_AND_EVIDENCE.md) y [informe final](FINAL_CANDIDATE_REPORT.md) registran el resultado de la revisión, separado de aceptación del PO y release. DESIGN_QA_PASS interno, PO_VISUAL_ACCEPTED=NOT_REQUESTED, RELEASE_AUTHORIZED=false.

## Criterio de Marketing Brain OS

Anuncio validado, solicitud anónima, cuenta verificada, primera utilidad y retorno son unidades diferentes. No se presenta ROAS/ROI, personas orgánicas probadas o satisfacción a partir de clics. Hipótesis de producto: investigar un fallo de tarea reproducible; validar una propuesta antes de construirla; contrastar exposición y participación antes de proponer cambios al feed. Ninguna hipótesis se ejecuta como campaña, gasto o cambio automático de algoritmo.

Estados obligatorios: pendiente, error/reintento local, MFA, sin conexión, extensión OFF, ausencia de observaciones/muestra protegida, cobertura nueva, ventana inmadura, origen desconocido e incompatibilidad de filtros/unidades. No se oculta la fuente previa cuando la nueva consulta falla.
