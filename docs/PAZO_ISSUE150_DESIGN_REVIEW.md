# #150 — Design Intelligence OS: decisión y auditoría

Superficie: Administración / Comportamiento. Dirección: nueva UI dentro de alcance autorizado. PO_VISUAL_ACCEPTED=NOT_REQUESTED; no se inventa aceptación. Método cargado desde project-brain-os84ce94f, especialidad UI/UX0.7.0, protocolo visual y aprendizaje del147. Se aplicaron también el router de visualización de datos y la revisión React; sin nueva librería, identidad o navegación global.

## Alineación con el encargo y feedback

El PO necesita ahorrar tiempo tomando decisiones, no estudiar instrumentación. Su aclaración durante la ejecución exige un dashboard limpio, profesional y comprensible como para una empresa tecnológica. Por ello se diseñaron dos entradas por pregunta: **«¿Hasta dónde llegan los anuncios?»** y **«¿Qué usan al volver?»**. La lectura rápida explica el hallazgo con numerador y base; anuncios tienen nombres reconocibles en lugar de UTMs. «Botón Crear cuenta» sustituye CTA y «Día7» explica D7. Las notas de privacidad/unidades permanecen junto al dato que podrían malinterpretar; la implementación técnica completa vive en los documentos, no en instrucciones al PO.

Prerregistro separado del embudo autenticado. No denominar orgánico a unknown ni afirmar abandono por una última pantalla. Pantallas de error/carga del informe pertenecen a su sección: no son avisos de onboarding. Campañas y Actividad se conservan; la consulta de Comportamiento funciona aunque fallen sus consultas. No rediseño global ni modificación de botones/pagos/invitaciones aprobados.

## Alternativas evaluadas y descartadas

1. Pared de tarjetas y gráficos del mismo peso: descartada porque oculta las dos preguntas y mezcla señales anónimas con cuentas.
2. Panel técnico único con todos los enums y rutas: descartado porque exige interpretar datos antes de decidir; demasiado scroll, jerga y comparaciones ambiguas.
3. No añadir sección y ampliar únicamente Campañas: insuficiente para retorno sin atribución y navegación agregada. Se preserva Campañas y se incorpora una sección específica, con jerarquía compartida.

Elegida: lectura por pregunta, síntesis fundada, filtros sencillos y después evidencia detallada. Barras horizontales con valores directos y porcentajes del paso anterior; listas de transiciones y resultados útiles, sin Sankey/heatmap decorativo. Verde PAZO focal, neutros para contexto, amarillo para selección/acción y terracota solo en error. Tipografía y tokens existentes, sin bordes/contornos nuevos; foco mediante superficie. Datos visibles sin hover y móvil en orden de lectura natural.

## Crítica adversarial y correcciones

- Primera captura320: hero demasiado alto; reducidos título, copy y espaciado. Después, el feedback del PO motivó dividir por preguntas y añadir una lectura ejecutiva.
- Nombres de creatividad parecían identificadores internos: sustituidos por Pasaporte QR / Perfil de mascota / Comunidad + idioma; campaña con nombre legible.
- Lista de hipótesis inicialmente genérica y repetitiva: sustituida por recomendaciones breves con evidencia de solicitudes, mayor tramo comparable y regreso. Falta de muestra se expresa como límite, no como diagnóstico inventado.
- Riesgo semántico: una semana desde abrir PAZO no es una semana desde primera utilidad. Se muestran por separado, con denominadores maduros propios. El embudo ahora exige orden mascota → vista → utilidad.
- Riesgo visual de guiones interpretados como cero: lectura rápida los explica y los estados de muestra/pausa/error tienen contenido distinto.
- Capturas aisladas podían aparentar datos reales: todo el paquete final de QA incorpora una etiqueta explícita de datos sintéticos/backend aislado. Nunca se ofrece la muestra como métrica de producción.
- Fallo del harness remoto: devolver [] como overview válido activaba el error boundary anterior. Se corrigió la simulación a503 y se verificó que Comportamiento sigue funcionando aunque fallen otras consultas. No se ocultó como un PASS inicial del producto.

Pasada adversarial separada del mismo agente; no se contrató ni simuló un segundo diseñador. No se afirma certificación artística objetiva, WCAG formal o mejora de conversión. El criterio fue lectura/jerarquía concretas, runtime completo, recuperación, foco y fidelidad al encargo, además de pruebas.

## Evidencia inspeccionada

Matriz48: ES/EN ×320/390/430/1440 ×contenido/pausado/insuficiente/error/cargando/MFA, con144 comprobaciones y0 pageerrors en el laboratorio. Capturas adicionales de embudo, rutas y regreso; navegación entre las dos preguntas, filtro/origen, reintento local y foco. Backend real PostgreSQL17 aislado, Auth controlada. Se inspeccionaron cuadros completos320 y1440 en ambas lenguas y estados, y capturas alojadas390/1440 con fuente Palo Seco real. La primera iteración se conserva operativamente para comparación.

Staging inmutable86c6d363: navegación App → primera mascota → Mi mascota → Administración → Comportamiento, ES/EN390/1440 y recuperación del informe; backend PG17 interceptado, sin escrituras QA alojadas. Se vio la composición completa y los tramos intermedios, no solo un recorte de tarjeta. Las imágenes actuales se empaquetan con manifiesto y fuente en el informe final. El CI repite la matriz en checkout limpio.

DESIGN_QA_PASS interno para esta superficie, sujeto a los gates funcionales/seguridad del informe final. RELEASE_AUTHORIZED=false; este gate no instala SQL, activa datos ni publica frontend en producción. La pregunta voluntaria de motivos se descarta por ahora: no es necesaria para observar comportamiento y añadiría fricción sin evidencia de muestra.
