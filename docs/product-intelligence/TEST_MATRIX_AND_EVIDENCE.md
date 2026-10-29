# Matriz de pruebas y evidencia — #153

Evidencia sintética, sin usuarios ni escrituras alojadas. La entrega no usa pagos reales, comparte archivos externamente ni suplanta una aceptación estética del PO. Los JSON e imágenes seleccionados en `evidence/` se cotejan con sus hashes al cerrar el candidato.

| Ámbito | Prueba ejecutable | Evidencia / criterio |
| --- | --- | --- |
| Catálogo y límites | `npm run test:intelligence` | Colas/lotes, dedupe, retry idéntico, offline acotado, contrato/parser estricto, gates OFF, canal #150 independiente |
| Integridad | misma suite | A→B, A→B→A, logout, contexto mascota A→B→A, upload tardío, token propietario fijado; operación vieja no añade fallo a nueva identidad |
| Anónimos | misma suite + Edge existente | Cuerpo cerrado, challenge single-use, sin ID/storage, GPC inicial/durante challenge, preview/WebDriver excluidos, no duplicar campaña previa |
| PostgreSQL 17 | `npm run test:intelligence:pg17` | DDL transaccional, OFF, RLS/roles/grants, no-admin/AAL1, límites/orden/idempotencia/concurrencia, supresión QA/retirada y cascada, cuenta eliminada y Cron #150 heredado |
| Privacidad derivable | misma prueba PG | 11 atribuidos/9 desconocidos, creativo19/1 y ventana14/7 con una cuenta anterior: no reconstruir grupo pequeño por resta |
| Semántica | PG17 | Recuento exacto de fuentes de interacciones/fake doors, exclusión de QA y retirada en fuentes reutilizadas, sin copia de respuestas ni éxito de UI |
| Dashboard nativo | `npm run test:intelligence:browser` | Administración real, RPC real en PG17 aislado, Auth controlado; ES/EN ×320/390/1440 ×contenido/pausa/protegido/error/carga/MFA; cinco preguntas, foco, overflow, retry y offline |
| Móvil lento | `npm run test:pr1a:browser` | 320/390/430, feed pendiente y cuidado fallido, herramientas accesibles, navegación offline, recuperación por servicio, QR renderizado |
| Regresiones | `npm run test:governance`, `test:behavior` y CI existente | Auth/recuperación, MFA, QR, PWA, estados/contratos y suites financieras existentes; sin activar checkout o invitación |
| Protección de base | `npm run test:intelligence:contract` | Catálogo SQL/TS, todos los gates nuevos OFF y hashes de fuentes protegidas contra main98f6d5; cero controles sin clasificar |
| Ingeniería | build + lint acotado | `npm run build` ejecuta TypeScript por proyectos y build real; `tsc --noEmit` en el root con referencias no se usa como sustituto |
| Rendimiento | `npm run test:intelligence:performance` | App real, orden contrabalanceado, mismo fixture/red, instrumentación nueva noop frente a habilitada solo en loader de prueba; no es INP ni comparación completa de builds de main |
| Staging | `PAZO_INTELLIGENCE_HOSTED_TEST=true`, `PAZO_HOSTED_ORIGIN=<preview>`, `PAZO_BEHAVIOR_OUTPUT=artifacts/issue153/staging`, `npm run test:intelligence:staging` | Assets del preview, App/onboarding/Admin nativos, backend aislado, nueva colección OFF; cinco preguntas ES/EN móvil/escritorio, retry y offline |

## Resultados del candidato

56 pruebas unitarias/Edge; 69 comprobaciones PostgreSQL nuevas más 64 de #150; 776 pruebas de gobernanza, sin fallos. Matriz final:200 comprobaciones/36 casos, cero page errors/escrituras alojadas. Además: 15 guardas históricas y 543 fuentes protegidas contra la base. Staging final: 4 casos ES/EN 390/1440 con onboarding y cinco preguntas, 0 nuevas llamadas de colección y0 escrituras alojadas. Ocho workflows verdes en el commit funcional63c81bd0; el PR muestra también la verificación del head documental final. Regresión móvil: tres anchos, cero page errors, feed pendiente no bloquea herramientas. No se afirma que cada una de las643 definiciones se haya pulsado en un navegador.

Comparación controlada:42 muestras calientes por modo/ancho, dos rondas con orden invertido. 390px: mediana baseline23,3ms/candidato23,0ms, p9533,8/34,6ms. 1440px:23,4/23,1ms, p9537,7/36,0ms. Se mide clic confiable→segundo requestAnimationFrame, con servicios250ms y envío opcional5s. Dos lotes/328bytes en total por ancho/candidato; baseline0. El tamaño es JSON de argumentos en este recorrido, no coste completo HTTP. Diferencias pequeñas de laboratorio no prueban una mejora; falta INP p75 de campo representativo y escala productiva del reporte.

## Auditoría visual

Se inspeccionaron capturas reales de Administración ES390 y EN1440 (cabecera/preguntas/herramientas), propuestas ES390, error EN390, carga ES390, MFA EN1440 y protección ES320, además de la pausa en el preview final. Se detectó que el harness nativo no incluía el enlace tipográfico de index.html: se conservó como prueba de fallback y se añadieron18 capturas de tres casos con Quicksand de la fuente de producto, recorriendo las cinco preguntas. También se inspeccionaron las recapturas primarias ES320, propuestas ES390 y social EN1440, incluida la nota de limitaciones del feed. El watermark QA pertenece al harness, no al producto. Cada captura es un viewport real con scroll del panel nativo; fullPage no equivale a desplegar todo el scroll interno. Se conserva el contexto completo y se captura la parte inferior por separado.

Correcciones: título global, propuestas aparte por módulo, unidades anónimas, errores independientes, separación vertical del bloque de propuestas. Resultado: DESIGN_QA_PASS interno; PO_VISUAL_ACCEPTED=NOT_REQUESTED; RELEASE_AUTHORIZED=false. Revisión crítica propia separada de implementación; no se finge un revisor independiente.

## Límites explícitos

Auth del navegador y proveedores son dobles controlados; las funciones SQL nuevas y permisos se ejecutan realmente en PostgreSQL 17 con esquemas de negocio sintéticos que replican las columnas inspeccionadas. No es una prueba humana MFA/PayPal ni ejecución con cuentas reales. Las limitaciones de dedupe del feed y ausencia de historial de retiros se verificaron leyendo su función alojada, sin modificarla. Mapbox sin token usa fallback y no acredita tiles/rutas reales. No se requiere ni se permite crear conversiones sintéticas en producción para cerrar esta entrega. El índice Token Savior no reflejó íntegramente este checkout: se contrastó mediante lecturas acotadas, AST y fuentes Git; no se afirma ahorro medido.
