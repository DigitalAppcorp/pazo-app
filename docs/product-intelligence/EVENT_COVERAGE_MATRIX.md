# Cobertura #153

Inventario de 118 archivos TSX y 643 definiciones de controles. Los elementos repetidos de listas cuentan como una definición; no son usuarios ni clics. Cero controles sin clasificar.

Matriz completa y verificable: [JSON](EVENT_COVERAGE_MATRIX.json), con componente, línea, etiqueta ES/EN literal o expresión del código, handler, propósito, fuente, identidad, autoridad, privacidad, coste, prioridad y prueba. Las etiquetas dinámicas se verifican además en navegación ES/EN.

Clasificación: {"EXCLUDED_WITH_REASON":546,"INSTRUMENTED": 34,"REUSE_SOURCE":63}. PROPOSED representa el ámbito de instrumentación propuesto en la auditoría inicial; su ejecución y cobertura real deben contrastarse con el catálogo y pruebas finales, no implica que cada campo de formulario emita eventos.

El inventario distingue plantillas compartidas de instancias. Excluir un campo no excluye la tarea de envío. Feed/fake doors reutilizan fuentes existentes; exposición no significa lectura, interés no significa adopción. Administración, pagos, secretos y contenido sensible quedan fuera de conversiones. No se afirma que las anotaciones agrupadas sean una auditoría manual de cada píxel.

Regenerar: node scripts/intelligence-inventory.mjs && node scripts/intelligence-classify.mjs. Política explícita en el segundo script; no existe autocaptura en producción. Validación de rutas y estados: TEST_MATRIX_AND_EVIDENCE.md.
