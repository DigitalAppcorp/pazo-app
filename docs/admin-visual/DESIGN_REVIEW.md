# Panel ejecutivo de PAZO — revisión de diseño

## Decisión

La primera propuesta no alcanzó la elaboración solicitada. Se sustituyó por una composición implementada en la Administración real: cuatro indicadores, grupos visibles, embudo conectado y proporcional, tendencia temporal, recorridos, último paso observado, herramientas de quienes regresan y comparación de creatividades. Los informes extensos quedan en un segundo nivel desplegable.

La referencia [Navion](https://dribbble.com/shots/27099140-Navion-AI-Powered-SaaS-Product-Analytics-Dashboard) se inspeccionó visualmente mediante la imagen pública del creador. Se tomó su jerarquía y densidad como dirección, sin copiar componentes, ilustraciones o activos. PAZO conserva Quicksand, verde, crema y amarillo. Los trazos SVG representan datos o iconos; no se añadieron contornos a los controles.

## Crítica interna y correcciones

- El prototipo inicial era una colección de barras y texto. El candidato utiliza una composición de tamaños distintos, un embudo con continuidad visual y tendencias con espacio propio.
- El foco del diálogo heredaba un fondo amarillo y subrayaba todo el contenido. Se corrigió únicamente el contenedor con foco programático; los controles conservan foco visible.
- La tendencia podía encimarse con el selector de fecha. La geometría se adapta al ancho real y mantiene altura propia.
- En móvil, los filtros desplazaban los indicadores y la navegación horizontal ocultaba secciones. Los KPIs aparecen primero y un selector nativo permite acceder a todas las secciones.
- Un informe vacío repetía el mismo mensaje en varios paneles. Se consolidó el estado sin datos; las ausencias parciales siguen identificadas en su gráfico.
- Las cifras grandes se compactan en la vista ejecutiva y conservan valores exactos accesibles y en el detalle.
- Los errores de permisos borran los datos anteriores, incluso si la cuenta no cambia. Los errores de conexión permiten reintentar sin reiniciar la aplicación.

## Criterios de lectura

“Llegadas desde anuncios” cuenta solicitudes, no personas. El embudo utiliza cuentas verificadas con atribución y etapas ordenadas. No se divide una población anónima por una identificada. “Orgánico” permanece sin medición demostrable; no se convierte lo no atribuido en orgánico. Recurrentes puede incluir cualquier origen. El último paso es una pantalla observada, no una afirmación de abandono o de su causa. Crear un cuidado o confirmar compartir un QR es utilidad observada, no una compra ni una atribución causal.

La tendencia no conecta períodos sin observación. La comparación de creatividades muestra denominadores y utilidad, sin inventar gasto, ROI o significancia estadística. Los insights describen brechas observadas y orientan dónde revisar.

## Evidencia y límites

Las capturas finales y resultados se enlazan desde el informe del candidato. Se verifican ES/EN, 320/390/1440 px, contenido, espera, error, pausa, protección de cohortes, cifras grandes y recuperación de conexión. Los datos de las capturas proceden de PostgreSQL aislado y están marcados como sintéticos. La revisión es autocrítica del implementador con Design Intelligence OS; no se presenta como una auditoría independiente, aceptación del Product Owner ni estudio con usuarios.
