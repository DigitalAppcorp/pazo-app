# Issue147 — primera experiencia y revisión profesional de diseño

> **Superado por la revisión posterior del PO:** el cierre598 y su dirección sobria fueron insuficientes. La aclaración distingue pantallas ilustradas de carga/error frente al aviso independiente de orientación inicial. [Decisión y evidencia actualizadas](PAZO_ISSUE147_FINAL_REPORT_20261028.md). El texto inferior conserva el diagnóstico y exploración anteriores; no acredita aceptación del PO ni el acabado del candidato39943f15.

Autoridad: [issue147, regla vigente del28-oct-2026](https://github.com/DigitalAppcorp/pazo-app/issues/147) y orden directa del PO. UI nueva en mejora autorizada: Design OS selecciona, critica y corrige; no se solicita elección de alternativas ni aprobación estética rutinaria. Producción, SQL de1B y nueva medición siguen sin autorización de lanzamiento. Implementación en rama aislada, con PR verificable; ningún merge automático.

## Diagnóstico y causa raíz

El patrón de142 está **REJECTED** por feedback del PO. La superficie verde de primer uso duplicaba accesos existentes, competía con Inicio y desplazaba el contenido. El loader posterior usaba `h-full` después del bloque, produciendo separación excesiva; en EN320 el texto llegaba a la zona del dock. El fallo también existía con contenido y vacío: no se explica solo por el feed artificialmente detenido. Se reprodujeron24 combinaciones del runtime real local: ES/EN×320/390/430×pendiente/contenido/vacío/error, más recuperación.

La revisión anterior fue insuficiente: comprobó legibilidad, objetivos táctiles y overflow, inspeccionó solo una muestra de estados y declaró conformidad interna sin crítica sustantiva de composición. El método0.6 ya advertía que build no demuestra buen diseño; hubo una brecha de aplicación, no ausencia de todas las reglas. Su protocolo general de aprobación estética también dejaba la decisión final ordinaria al PO. No se inventa una aceptación visual anterior ni se transforma este rechazo en «todas las tarjetas están prohibidas».

## Decisión profesional

Se compararon dos estructuras implementadas en runtime aislado, no variaciones de color:

- **A, orientación breve en Inicio sin superficie nueva:** quitaba el marco verde y subordinaba Agenda a QR. Mejora parcial, descartada: todavía duplicaba herramientas, añadía otra cabecera antes de la cabecera del feed y competía con contenido/vacío/error. Sus capturas completas y patch quedan como evidencia interna; no son opciones que deba resolver el PO.
- **B, herramientas existentes tras crear la mascota — elegida:** guardar la primera mascota abre Mi mascota, donde QR y Agenda ya tienen significado, contexto y acciones reales. El encabezado existente integra únicamente «Explorar PAZO»; el contexto QR validado añade una frase breve hacia el pasaporte. No hay panel, tutorial ni modal de bienvenida. Elegir herramienta, explorar, cambiar mascota o navegar descarta la orientación; el bootstrap posterior no la repite.

Se comparó también con no añadir orientación: conservar Inicio tras crear el perfil evita UI extra, pero obliga a descubrir la ruta hacia herramientas incluso si el feed sigue pendiente. B conserva un acceso de un toque a QR/Agenda sin duplicarlos en Inicio. Esto describe el recorrido codificado, no una medición de conversión o tiempo de usuarios.

## Alcance e invariantes

Se preservan paleta, Quicksand, perfiles, dock, superficies de herramientas, navegación social y contenido auténtico. Se retira la orientación de Inicio. Espera y error del feed se alinean con su título y orden de lectura, sin alturas completas, posts ficticios ni esqueletos ornamentales; error conserva reintento local y acceso a herramientas.

QR/Agenda pasan de contenedores clicables a botones nativos, con foco visible y operación por Enter. La primera llegada enfoca QR sin abrirlo y desplaza solo si hace falta para mantener las acciones por encima de la geometría real del dock; no hay offsets por viewport. Al regresar se preserva el comportamiento normal de perfil/scroll. No se alteran SQL1B, colección, atribución, Auth/MFA, reglas financieras, ofertas, invitaciones ni datos. El copy público existente sobre QR público/GPS y Agenda sin push se conserva.

## Crítica adversarial y autocorrección

Revisión separada del diseño inicial, con pasadas de dirección de arte, interacción y frontend; no una votación. No se delegó programación ni se usa un segundo agente como firma ficticia de aprobación.

1. ¿Por qué otro bloque? A seguía duplicando jerarquía y CTA; se descartó y se reutilizó el destino real de herramientas.
2. ¿Qué pasa al resolver/fallar el feed? B libera Inicio para sus cuatro estados. Espacio vacío durante una espera forzada es deliberadamente honesto, con estado/explicación/acción juntos arriba; no se rellena con contenido ficticio. Con contenido, el post pasa a ocupar su lugar natural sin orientación encima.
3. ¿Algo parece arbitrario o compite? Se eliminó la descripción neutra redundante: los nombres y textos de herramientas ya explican su función. Explorar es salida secundaria en el encabezado, no tercer CTA promocional.
4. La primera pasada B detectó «Editar» sobre el nombre/especie a320px: se reservó espacio y permitió envolver la especie. Se recapturó, no se dispensó por ser un defecto heredado expuesto por la nueva llegada.
5. En altura568px, se verificó foco/scroll y disponibilidad de QR/Agenda fuera del dock. Las capturas esperan animaciones finitas y fuentes: un dock capturado en transición no es su estado asentado.
6. La inspección alojada rechazó la iteración08a934: el selector `nav` confundía pestañas del perfil con dock, desplazaba278px y promovía alerta/membresía en la llegada. Selector específico del dock y control de scroll0 a844 corrigen la causa. El harness actualizado falla contra08 y pasa contra el candidato final; no se dispensó porque su CI estuviera verde.
7. Se localizaron especie/edad en inglés sin reescribir datos del dueño. La captura espera imágenes decodificadas y dos frames de estilos antes de enumerar transiciones: evita registrar el color del tab anterior como acabado final.
8. La auditoría de regreso encontró una carrera funcional de primera mascota: su callback antiguo podía actualizar otra sesión. Se reprodujeron tres fallos de App y cinco contratos de servicio antes de corregirlos. El fence usa la época vigente, comprueba la sesión verificada y fija su autorización antes del RPC. No cambia SQL, AuthProvider ni reglas comerciales.

El contraste calculado de los colores sólidos usados es4.73:1 para texto secundario sobre canvas,8.80:1 para tinta sobre canvas y9.33:1 para blanco sobre tinta. Son cálculos sRGB sobre esos pares, no certificación de toda la aplicación. El informe final debe distinguir imágenes realmente inspeccionadas, cobertura funcional, datos forzados y pruebas no realizadas.

## Proceso corregido y aprendizaje

[Brain OS PR13](https://github.com/DigitalAppcorp/project-brain-os/pull/13), candidato0.7.0: un protocolo central separa UI nueva autorizada, rediseño dirigido por PO, decisión fuera de alcance y técnico sin delta visual. Exige runtime completo/estados, crítica y corrección antes del gate profesional; aceptación del PO y release permanecen campos distintos. Raíz1.4.1 intacta; no integración/instalación global automática.

13 pruebas del motor previo y11 contraejemplos del nuevo contrato PASS local y [CI exacto251ba243](https://github.com/DigitalAppcorp/project-brain-os/actions/runs/40679579376). El validador solo comprueba completitud/integridad del registro: no juzga belleza, no acredita veracidad por sí solo ni demuestra mejora porcentual del modelo. La evaluación situada de esta UI necesita las imágenes y la crítica anterior.

[Ledger PAZO](design-learning/feedback.jsonl) registra el rechazo del patrón en IMPLEMENTATION y la corrección pedida de PROCESS, con fuente recuperable. El reemplazo no recibe una aprobación ficticia del PO. La historia F13/admin se recuperó desde su rama documental, con sus límites de evidencia; no se generalizaron preferencias entre superficies.

## Estado del gate

La decisión profesional final se registra con el SHA/capturas de cierre y el informe final147. La ingeniería, el juicio visual y la autorización de lanzamiento se verifican por separado. **PO_VISUAL_ACCEPTED=NOT_REQUESTED** para esta UI nueva autorizada; no es un bloqueo. **RELEASE_AUTHORIZED=NO**. La nueva medición continúa OFF/no instalada.

[Registro situado de composición y evidencia](evidence/issue147/design-review.json) y [paquete único final](PAZO_ISSUE147_FINAL_REPORT_20261028.md): candidato `dd46582915043a0a049b3673dfc89a4400f2bfa2`, **DESIGN_QA_PASS** tras crítica, corrección y recaptura. La revisión adversarial fue una pasada separada del mismo agente; no se atribuye a un revisor independiente.
