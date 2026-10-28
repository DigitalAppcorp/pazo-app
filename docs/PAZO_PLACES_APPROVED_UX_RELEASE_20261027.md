# Lugares — integración de la UX aprobada

27 octubre 2026, America/Guatemala. PO: «Listo, me gusta, implementalo a produccion». Aprobación de propuesta02 + corrección de idioma03; integración, merge y despliegue frontend autorizados. No autoriza desarrollar las seis funciones futuras ni cambios de DB, Auth, pagos o marketing. Base main `a946469e4838d1d5a3817758b8db4aa276b866b4`; producción de partida `9df24a1d52de28788aa212764ffe23c3721e0222` / `dpl_47U5Q21kxWGDiiyLh5hU62Yurp3c` READY.

## Resultado aprobado y alcance

Ficha inferior sobre el mapa, fotografía lateral, identidad propia de Lugares dentro de PAZO. Fotos se abre desde la fotografía; Opiniones tras la descripción; Actividades junto al contexto de visita; Guardar en la cabecera; Rutas junto a Cómo llegar sólo en parques/senderos; Promociones sólo en negocios. Cada destino explica que está en desarrollo, permite interés explícito e intención opcional después. No reseñas, eventos, descuentos ni fotos de visitantes ficticios. Navegación jerárquica liquid, sentido inverso al volver y movimiento reducido. La tipografía, paleta y las fotos acreditadas se conservan.

La localización de especies, descripción y reglas incluye equivalentes ingleses revisados de los seis lugares del catálogo conocido, por coincidencia exacta del texto fuente. Español, nombres, direcciones y datos originales intactos. Contenido futuro/desconocido conserva su fuente; no se hace traducción automática ni se aplican reglas de otro lugar. El contrato de traducciones completo del catálogo podrá evolucionar por separado.

## Integridad y medición

`MapView` conserva sus doce funciones de carga/interacción/comprobación de presencia: hashes de inicializadores AST idénticos. Ocho archivos protegidos (servicios de lugares, presencia, telemetría, validación, mapa, fotografía, App y Supabase) idénticos tras normalizar EOL. Sin SQL, Edge, flags o dependencias nuevas. Se retira sólo el helper de etiqueta de categoría que quedó sin uso al sustituir el header antiguo.

Las seis claves `places_*`, `source=place_detail_<categoría>`, elegibilidad y contratos de vista/interés/intención se conservan. Vista sólo con el destino visible al50%; interés sólo por acción explícita y con deduplicación existente. La intención no se muestra a visitantes sin sesión. Cambiar ubicación/contexto modifica la población expuesta: no atribuir causalmente diferencias de tasa al diseño ni mezclar denominadores antiguos y nuevos.

Código nuevo en `src/features/places/`, conforme al contrato de arquitectura. Se integra el componente aprobado con servicios reales, se retiran del producto los controles de preview/postMessage y se conserva el foco de teclado por superficie, según la regla permanente sin contornos. No se copian mocks ni fixtures al producto.

## Verificación y límites

- Build, TypeScript, gobernanza, guard de release y dist/PWA PASS; lint de archivos nuevos PASS. Deuda legacy de lint de MapView preexistente, no se alteran sus controladores para resolverla.
- 44 pruebas de cierre UI PASS. Se actualizan contratos de presentación que exigían las antiguas tarjetas/escala para verificar la ficha aprobada, el header fijo y el scroll independiente. Se mantiene cobertura del mapa, fotos, direcciones, presencia y administración.
- 33 comprobaciones de navegador sobre el MapView/componente reales y servicios aislados: seis destinos, interés único, intención opcional, errores/reintento, visitante, presencia privada/inicio/visibilidad/salida, ambos sentidos liquid/rápido/reduced/Escape y ES/EN320/390/1440 sin overflow; cero errores JS y cero solicitudes Supabase desde ese harness.
- 41 comprobaciones adicionales de idioma en los seis lugares ES/EN PASS.
- Comparación contra preview aprobada en390px, Información y Fotos: posiciones y tamaños de ficha, título, imagen y contenido coinciden dentro de1px. No se actualizó el baseline para ocultar divergencias.
- El harness no certifica escrituras autenticadas de producción ni GPS de dispositivo físico. Servicios y esquema reales conservados; producción exige postflight de SHA/alias y recorrido público tras el despliegue.

Evidencia resumida y aprobación en `docs/places-ux-20261027/`. Pendiente en este candidato: CI del SHA exacto, merge, Vercel READY y postflight. La aprobación visual no se sustituye por resultados de pruebas; procede directamente del PO sobre la propuesta02/idioma03.

## Scope closure reconciliation

Seis accesos/ubicaciones, copy, idioma, arte nativo y liquid: integrados. Mapa, búsqueda/filtros, ubicación, selección, fotos con créditos, Cómo llegar, presencia/check-in/privacidad, sugerencias, claves y servicios: preservados. Desarrollo de funciones anunciadas, DB/migraciones, proveedor, pagos, Auth y marketing: fuera del cambio. La fase sólo se cierra tras merge y postflight.
