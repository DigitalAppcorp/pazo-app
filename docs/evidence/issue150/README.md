# Evidencia #150 — todos los ejemplos son sintéticos

No contiene métricas de personas reales, tokens, cuentas QA alojadas ni sesiones del navegador.

Para revisar la experiencia:

- [Escritorio en español](staging/es-1440-overview.png).
- [Móvil en español](staging/es-390-overview.png).
- [Embudo en español](staging/es-1440-funnel.png).
- [Regreso en inglés](staging/en-1440-return.png).
- [Matriz320 ES](browser/gallery-es-320.png) y [matriz1440 EN](browser/gallery-en-1440.png).

Las imágenes de staging corresponden al frontend inmutable2b623bb8, con servicios Auth/dominio controlados y consultas reales al PostgreSQL17 aislado de las pruebas. La etiqueta QA aparece en cada captura. Los contadores del ejemplo proceden del mismo SQL preparado, no de números dibujados en la UI. El ejemplo completo está en [example-synthetic.json](example-synthetic.json).

La matriz local demuestra estados/idiomas/anchos del frontend; la corrección final que excluye acciones útiles posteriores de los puntos sin continuación se verifica en PostgreSQL y capturas finales alojadas. El CI repite la matriz sobre la migración final. Ver los ámbitos exactos en [verification.json](verification.json), [prueba alojada](staging/results.json) y [instrumentación encendida solo en laboratorio](enabled/results.json).

[deployment](deployments.json), [hashes de assets](staging/assets.json), [migración preparada](migration.json), [base de133 versiones alojadas](hosted-baseline.json) y [producción conservada](production-preserved.json). [hashes.json](hashes.json) verifica los archivos; no se incluye a sí mismo.
