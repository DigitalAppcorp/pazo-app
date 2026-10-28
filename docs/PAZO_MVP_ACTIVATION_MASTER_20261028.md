# PAZO — Hoja maestra de mejora del MVP y activación real

> **Estado vigente, issue147 (28-oct):** la primera experiencia142 fue rechazada por el PO. [Corrección integral y candidato final](PAZO_ISSUE147_FINAL_REPORT_20261028.md), [PAZO PR148](https://github.com/DigitalAppcorp/pazo-app/pull/148) y [Brain OS PR13](https://github.com/DigitalAppcorp/project-brain-os/pull/13) abiertos, sin merge automático. Dirección elegida: herramientas existentes de Mi mascota al guardar primer perfil, Inicio libre y sus estados integrados. **DESIGN_QA_PASS; PO_VISUAL_ACCEPTED=NOT_REQUESTED**, conforme a la autonomía estética explícita del issue147. Producción8dbf y SQL nuevo no instalado/medición OFF preservados. La única autorización pendiente del PO es publicar la mejora completa, con preflight/postflight y reversión preparados. Esta entrada supera los estados estéticos anteriores; las entradas inferiores conservan historia.

> **Estado vigente de cierre de issue142:** implementación1A/1B/PR2 terminada, pruebas e integración técnica verificadas. [Paquete único final: candidato alojado, matriz, CI, Design OS, límites y publicación preparada](PAZO_ISSUE142_FINAL_REPORT_20261028.md). Producción se conserva en8dbf4ef5; no se instaló ni activó el SQL nuevo. **La única decisión pendiente es la aceptación/publicación final del PO.** Las entradas inferiores son snapshots históricos y no sustituyen esta actualización ni autorizan lanzar automáticamente.

> **Actualización operativa posterior al snapshot:** [issue142](https://github.com/DigitalAppcorp/pazo-app/issues/142) y orden directa del PO autorizan la ejecución integral de1A alojado,1B yPR2, sus pruebas/integración y previews necesarias. Las restricciones de implementación del snapshot inferior quedan superadas para ese alcance. Publicación final reservada al PO. Main contiene1A/140 y141 en5c4635e5. Preview1A exacta verificada ES/EN móvil con frontend remoto y backend interceptado, sin producción. PR1B preparado con colecciónOFF y SQL no aplicado; PR2 en ejecución. [Contrato](PAZO_ISSUE142_ACCEPTANCE.md) y [evidencias1B](PAZO_FIRST_UTILITY_1B_20261028.md). Producción8dbf4ef5 preservada; verificar estado vivo al retomar.

**Fecha de consolidación:** 2026-10-28 (snapshot; verificar estado vivo antes de actuar).
**Tipo:** hoja maestra de producto / continuidad interagente / NO ejecutable por sí sola.
**Repositorio:** DigitalAppcorp/pazo-app.
**Participantes de la deliberación:** Product Owner (PO), Codex, asistente IA del PO y consultor ChatGPT. Las propuestas se contrastaron de forma iterativa; esta hoja registra acuerdos y decisiones, no un supuesto voto formal de los agentes.
**Decisión vigente:** tres entregas secuenciales y acotadas (PR 1A, PR 1B, PR 2). PR 1A está implementado y comprobado en rama, pendiente de decisión de integración. PR 1B y PR 2 no están autorizados a implementarse. Ningún merge ni despliegue está autorizado por esta hoja.

> **Leer primero si eres un agente nuevo:** Esta hoja conserva el PORQUÉ, las prioridades, los límites y los permisos. Para saber QUÉ está realmente en GitHub o en producción, verifica el PR, la rama main, CI, el despliegue y los controles alojados actuales. Nunca conviertas una propuesta, una prueba local o un estado histórico en autorización de escritura o release.

## 1. Origen y decisión estratégica

PAZO es una aplicación PWA para dueños de mascotas. El MVP combina perfil/identidad de mascota, pasaporte QR, cuidados y agenda, alertas, lugares, feed, comunidades y otras funciones. La visión existente [PAZO_PRODUCT_VISION.md](PAZO_PRODUCT_VISION.md) distingue el MVP de futuras verticales; esta iniciativa NO adelanta esas verticales.

Con la beta publicada y actividades de adquisición mediante anuncios reportadas por el PO, se discutió si continuar añadiendo funcionalidades mejoraba realmente el producto. Conclusión compartida: **cambiar el enfoque de construir más a conseguir que quien llega comprenda y use una utilidad real, y pueda regresar cuando la necesite**. No afirmar tracción, velocidad, conversiones ni retención sin datos.

**Resultado deseado:** una persona que se registra puede llegar a su primera acción útil sin esperas artificiales, entiende para qué le sirve PAZO y conserva la libertad de explorar. El feed social sigue siendo parte del producto; no debe dominar ni impedir el acceso a las herramientas prácticas.

**No priorizar ahora:** nuevas funciones, rediseño global de Inicio, gamificación, simulación de actividad social, pruebas A/B complejas con muestras pequeñas, promociones de PayPal adicionales en la primera sesión o promesas publicitarias no verificadas.

## 2. Hallazgos técnicos que motivaron la iniciativa

Los diagnósticos se confirmaron en el código de `src/App.tsx` anterior al PR 1A:

1. **Spinner global de feed.** `isFeedLoading` envolvía el contenido principal, bloqueando también el montaje de Comunidades, Lugares y Mi mascota aunque no dependieran del feed.
2. **Bootstrap sobredeterminado.** Tras cargar/verificar la identidad y mascotas, la inicialización esperaba conjuntamente resultados de feed, cuidados, documentos y recordatorios (`Promise.all`), de modo que una dependencia secundaria podía retrasar el acceso.
3. **Riesgo asíncrono asociado.** Al desacoplar solicitudes, las respuestas antiguas no pueden sobrescribir el estado vigente. Comparar solamente el ID de mascota no protege un recorrido **A → B → A**, ni salida y entrada a la misma cuenta si React agrupa actualizaciones. Es necesario vincular los resultados a la vigencia de la solicitud/sesión/recurso, proteger errores y finalizadores, y preservar las mutaciones autorizadas.

La existencia de estas dependencias se fundamenta en revisión del código, **no** demuestra por sí sola cuántos usuarios las sufrieron. El beneficio esperado es acceso anterior a otras funciones; una mejora de rendimiento general debe medirse, nunca suponerse.

## 3. Las seis prioridades de producto deliberadas

| Orden | Mejora | Urgencia | Cómo se atenderá |
| --- | --- | --- | --- |
| 1 | Eliminar bloqueos en la primera sesión | Inmediata | PR 1A: cargas independientes y protección de vigencia |
| 2 | Dar sentido a la llegada tras crear la primera mascota | Inmediata en producto, posterior a estabilizar | PR 2: orientación contextual no intrusiva |
| 3 | Conectar la promesa de cada anuncio con la función anunciada | Alta | PR 2: conservar intención atribuible cuando sea legítimo y posible |
| 4 | Clarificar acciones de QR, Cuidados/Agenda y Alertas | Alta | PR 2: copy/estados/acciones reales, priorizados por evidencia |
| 5 | Mejorar estados vacíos del feed sin inventar contenido | Media | PR 2 o posterior si la evidencia lo respalda |
| 6 | Medir activación real, no solamente registros | Inmediata para decidir, después de PR 1A | PR 1B: eventos exitosos y métricas interpretables |

Estas son prioridades de análisis, **no una autorización para implementar todos los puntos**. Evitar convertir el PR 2 en un rediseño amplio o promesa de alcance ilimitado.

## 4. Plan consolidado y estado

| Entrega | Propósito | Estado confirmado a 2026-10-28 | Permiso |
| --- | --- | --- | --- |
| **PR 1A — Estabilidad** | Feed solo bloquea Inicio; bootstrap de mascotas liberado de cargas secundarias; solicitudes obsoletas descartadas | [PR #140](https://github.com/DigitalAppcorp/pazo-app/pull/140) abierto, listo para revisión, sin merge ni despliegue; revisión técnica consultiva favorable | Implementación autorizada **solo para este PR**; merge/deploy no autorizados |
| **PR 1B — Primera utilidad medida** | Instrumentar resultados útiles confirmados y un embudo interpretable, aprovechando la infraestructura privada existente | Propuesta; sin implementación ni especificación final aprobada | Consultar/planear; implementar solo con orden expresa del PO |
| **PR 2 — Orientación contextual** | Guiar discretamente a herramientas relevantes tras registro y a partir del anuncio; mejorar claridad sin onboarding largo | Propuesta; no hay diseño ni código aprobados en esta iniciativa | Consultar/diseñar en la medida autorizada; implementar solo con orden expresa del PO |

**Orden:** revisar decisión de integración/despliegue de 1A de manera separada; validar comportamiento y límites; después considerar autorización de 1B; solo después concretar el alcance de 2 con Design Intelligence OS. No iniciar PR 1B ni PR 2 por inercia. Si el PO cambia el orden, registrar la autorización exacta.

### PR 1A — evidencia ya existente (no duplicar)

Fuente de detalle: [PAZO_PR1A_STABILITY_20261028.md en la rama del PR](https://github.com/DigitalAppcorp/pazo-app/blob/fix/pr1a-independent-loads-20261027/docs/PAZO_PR1A_STABILITY_20261028.md); [PR #140](https://github.com/DigitalAppcorp/pazo-app/pull/140).

- SHA revisado: `7a52ee9f1135f3ea67493e07ab872d7277dcdf47`, base del PR `c9045b9ad39443296b29f057550a677e6d9f013a`.
- Modifica orquestación de `src/App.tsx` y helper `src/lib/requestScope.ts`; no refactor general, backend/SQL/Edge ni UI/marketing.
- 21 casos nuevos y suites de regresión registradas. GitHub Actions **4 workflows / 12 jobs exitosos**; job de navegador con tres anchuras (320/390/430 px), navegación con feed pendiente, error/reintento y QR sintético.
- Pruebas incluyen A → B → A, cambio de cuenta, salida/entrada a misma cuenta, MFA y finalizadores antiguos; otras cargas recuperan sin rebootstrap global.
- **Límites declarados:** navegación en navegador con Auth/servicios simulados y peticiones externas bloqueadas, Mapbox fallback; no prueba alojada de login, compra, GPS ni PWA física; no benchmark de rendimiento. ESLint de `App.tsx` arrastra 14 errores y 6 advertencias previos sin nuevos reportados; F14 local Windows inicialmente 52/53 por CRLF y luego 53/53 con LF temporal sin modificar backend.
- Revisión del consultor en este chat: favorable como candidato técnico; no constituye aprobación formal en GitHub ni aprobación del PO para fusionar/desplegar.

**Criterios de aceptación del 1A:** poder abrir Comunidades/Lugares/Mi mascota con feed pendiente; fallos y reintentos propios de cada recurso; no mezclar datos entre mascotas/cuentas incluso A → B → A; preservar Auth, MFA, QR, PayPal, invitaciones y PWA. **Gate de despliegue independiente:** revalidar SHA/CI, revisar posibles regresiones y tener ruta de reversión. En caso de regresión relevante, detener o revertir. Nunca declarar la etapa cerrada solo por CI.

## 5. PR 1B — marco de medición propuesto, NO diseño técnico aprobado

**Problema:** los registros y las visitas no demuestran valor. El código de marketing existente (`src/features/marketing/marketingRuntime.ts`) implementa atribución propia de campaña, registro verificado y primera mascota. El resumen administrativo (`src/features/admin/adminDashboardService.ts`) incluye señales de landing, registro verificado, primera mascota y un **proxy** de actividad de pantalla a D7; proxy no es retención observada ni una persona única por hit.

**Embudo conceptual, no datos reales:**
1. Señal de llegada de anuncio compatible con la atribución existente (no equiparar hits con personas).
2. Cuenta con correo verificado (no contar mero envío de formulario).
3. Primera mascota guardada correctamente.
4. Primera **acción útil completada** y confirmada por el servicio, no mero clic o apertura.
5. Uso posterior cuando la persona necesita PAZO, con ventana/cohorte explícita y muestra suficiente.

**Candidatos de primera utilidad, pendientes de definición y factibilidad:** descarga/compartición de QR completada cuando el cliente pueda verificarlo sin fingir éxito de una app externa; cuidado registrado tras éxito del backend; otros eventos que demuestren una tarea concluida. Una alerta de mascota perdida es un caso excepcional y nunca debe incentivarse como tarea de onboarding. Registrar el QR generado o una pantalla vista como señales auxiliares, **no** como éxito final si el usuario no completó su objetivo.

Antes de escribir código en 1B: concretar catálogo mínimo de eventos, denominadores, deduplicación, elegibilidad de cohorte, definición temporal y de éxito, derechos/retención/consentimiento relevantes, test QA, idempotencia, informes agregados y criterio de reversión. **Excluir inequívocamente cuentas de prueba, Codex/QA y tráfico sintético**. No enviar identificadores de personas, URLs completas, ubicaciones sensibles, datos médicos de mascota ni eventos individuales a plataformas de anuncios. No instalar Pixel/CAPI ni ampliar recolección sin aprobación de privacidad y producto; reutilizar las salvaguardas vigentes. Medición opcional no debe bloquear Auth/registro/QR.

**Qué NO se conoce en esta hoja:** conversión real por anuncio, uso de herramientas por personas reales, retención real y causalidad. No fijar porcentajes meta o atribuir incremento a PR 1A sin línea base.

## 6. PR 2 — hipótesis de diseño y criterios de producto, NO pantalla aprobada

Al crear la primera mascota, ofrecer **una invitación breve y contextual** a una acción útil y la alternativa «Explorar PAZO». Mejor integrar esta invitación en la pantalla existente que imponer una nueva pantalla o tutorial.

- Si el anuncio prometía pasaporte QR, facilitar acceso directo al QR después de registro, respetando permisos y la mascota actual.
- Si prometía Cuidados/Agenda, facilitar esa herramienta. No atribuir intención si se perdió la campaña o no puede validarse; usar salida general neutra.
- Mantener idioma ES/EN correcto, privacidad, accesibilidad, estados cargando/error/éxito, enfoque móvil y posibilidad de cerrar/ignorar sugerencia.
- No repetir continuamente la misma orientación ni interrumpir sesiones existentes.
- QR: comprobar significado público de datos compartidos, descarga/compartición y regeneración; nunca prometer GPS o rescate garantizado.
- Cuidados: confirmar guardado real y describir recordatorios conforme al comportamiento efectivamente disponible, sin prometer push inexistente.
- Alertas: mensajes honestos sobre activación y pasos posteriores, sin prometer difusión automática que no ocurrió.
- Feed vacío: mensajes honestos y caminos a tareas existentes; nunca crear actividad falsa.
- Evitar monetizar o forzar PayPal en el primer recorrido; primero demostrar valor gratuito.

Diseño y redacción por **Design Intelligence OS** con evidencia de flujos reales, pantallas ES/EN, accesibilidad, QA móvil, estados asíncronos y respeto al sistema visual PAZO (sin nuevos contornos decorativos ni cambios radicales no aprobados). No desarrollar tres rutas permanentes complejas ni nuevos módulos solo para anuncios. Con poca muestra, observación de tareas voluntaria/consentida es más útil que A/B sofisticados.

## 7. Decisiones de gobernanza y permisos interagentes

**Regla de cierre de análisis:** investigar hasta que haya evidencia suficiente para decidir responsablemente, no hasta alcanzar unanimidad. Consenso entre agentes ≠ evidencia. Nuevas revisiones solo si aparece información nueva, un riesgo material o una premisa decisiva cuestionada; evitar bucles de acuerdo sin valor marginal.

**Permisos distintos (no se heredan):**
- **Consultar:** analizar, opinar, leer fuentes y proponer. No escribir ni cambiar estado de repositorios, ramas, registros, proveedores o producción.
- **Preparar:** únicamente lo expresamente autorizado (p. ej., documento, diseño o rama de preparación); no supone permiso para implementar.
- **Implementar:** modificar código/abrir PR solo dentro de alcance y con autorización expresa.
- **Fusionar / desplegar:** **dos decisiones independientes** del PO, cada una con su propio gate; aprobar un PR técnicamente no equivale a autorización de merge y un merge no implica GO automático de producción.

**Incidente que originó la regla:** al pedir opinión, Codex llegó a crear una rama local y actualizar un registro de continuidad antes de detenerse, aunque no cambió código, abrió PR ni desplegó. El consultor también había redactado prematuramente una orden de ejecución. Se reconoció el error y se acordó separar asesoría de acciones. Posteriormente el PO sí autorizó explícitamente implementar **PR 1A**, ya entregado.

**Estado Brain OS:** incorporar este protocolo a Project Brain OS es una **propuesta discutida y respaldada conceptualmente**, no una implementación comprobada en `DigitalAppcorp/project-brain-os`. Esta hoja no autoriza modificar ese repositorio.

## 8. Qué debe hacer el próximo agente (handoff sin pérdida de contexto)

1. Leer esta hoja, la [visión estratégica](PAZO_PRODUCT_VISION.md), [handoff activo](PAZO_ACTIVE_HANDOFF.md), [roadmap](PAZO_MASTER_ROADMAP.md) y el [PR #140](https://github.com/DigitalAppcorp/pazo-app/pull/140). Leer su informe de pruebas, no asumir que un PR abierto está integrado.
2. Verificar HEAD de main, estado actual del PR, revisiones/CI para el SHA específico, flags y despliegue alojado antes de afirmar hechos actuales.
3. Registrar decisión explícita del PO. **A la fecha de esta hoja no hay autorización para fusionar ni desplegar PR 1A; PR 1B/PR 2 no están autorizados para implementación.**
4. Si se pide continuar 1A, revisar estado vigente y criterios de aceptación; si se pide 1B, empezar por definiciones/privacidad y no reescribir la atribución; si se pide 2, consultar Design Intelligence OS y pantallas reales antes del diseño.
5. Documentar separadamente evidencia, hipótesis, restricciones, resultados y decisiones. Evitar duplicar 326+ documentos históricos o convertir este snapshot en fuente de verdad de producción.

## 9. Inventario de fuentes y conflictos de interpretación

- [PR 1A #140](https://github.com/DigitalAppcorp/pazo-app/pull/140): implementación y CI; fuente principal del avance de 1A.
- [Informe PR 1A](https://github.com/DigitalAppcorp/pazo-app/blob/fix/pr1a-independent-loads-20261027/docs/PAZO_PR1A_STABILITY_20261028.md): detalle de pruebas, límites, EOL y navegador.
- [PAZO_ACTIVE_HANDOFF.md](PAZO_ACTIVE_HANDOFF.md): registro transversal e histórico, con apartados antiguos expresamente superados.
- [PAZO_MASTER_ROADMAP.md](PAZO_MASTER_ROADMAP.md): roadmap global e historial; no confundir entradas antiguas con decisiones vigentes.
- [PAZO_PRODUCT_VISION.md](PAZO_PRODUCT_VISION.md): visión de largo plazo NO ejecutable.
- [marketingRuntime.ts](../src/features/marketing/marketingRuntime.ts) y [adminDashboardService.ts](../src/features/admin/adminDashboardService.ts): estado del diseño de tracking/reporte existente en main al redactar, verificar de nuevo antes de PR 1B.

**Jerarquía:** autorización explícita reciente del PO + estado del proveedor/código/CI actual prevalecen sobre snapshots. Este documento decide la continuidad estratégica, NO certifica estado alojado ni cambia reglas de pago, seguridad o privacidad.

---

**Cierre documental:** se conserva el consenso con distinción entre diagnóstico, implementación probada localmente, integración y producción. Próximo paso NO automático: decisión del PO sobre PR 1A. Cualquier nueva autorización deberá registrarse de forma trazable y específica.

## Issue142 — avance verificado posterior al snapshot

PR1B #143 integrado en913491839ff0b2a9b46f3696af587b5f13971aed tras seis workflows completos SUCCESS. PR2 implementado y probado ES/EN320/390/430: [decisión Design OS y evidencia](PAZO_CONTEXTUAL_FIRST_USE_PR2_20261028.md). Publicación final pendiente del paquete integral/PO; producción8dbf intacta y SQLnuevoOFF sin instalar. Historial inferior conservado.

