# PAZO — Biblioteca de capturas para agentes de video

**Acceso directo**: [Catálogo visual](CATALOGO.md) · [Manifest JSON](manifest.json) · [Pendientes de cobertura](COBERTURA.md).

Esta biblioteca reúne **270 PNG del cliente de PAZO**: 118 evidencias históricas de QA y 152 nuevas capturas navegando el cliente publicado con APIs sintéticas. No se recrearon interfaces ficticias. Todas están fuera de Administración. Una captura de QA no equivale automáticamente a una captura actual de producción.

## Directorio

- `captures/2026-10-30/`: **152 capturas del cliente publicado** en ES/EN, móvil 1170×2532 px y escritorio 2880×1800 px, con datos sintéticos y manifiesto detallado.
- `snapshots/2026-10-28/canonical/`: bienvenida móvil/escritorio y avisos de primera utilidad.
- `snapshots/2026-10-28/navigation/`: Comunidades, Mapa y Mi mascota, ES/EN, anchos 320/390/430.
- `snapshots/2026-10-28/utility/`: pasaporte QR, Agenda, primera experiencia.
- `snapshots/2026-10-28/visual/`: estados content/empty/pending/error/recovered, Home y llegada.
- `snapshots/2026-10-28/short/`: estados compactos de 320px.
- `snapshots/2026-10-28/historical/`: prueba anterior de Comunidades, solo referencia histórica.

## Para cualquier agente (Video OS, Marketing Brain, Design OS)

1. Primero abrir `docs/screen-library/manifest.json`. Filtrar por `group`, `language`, `viewport_width` y el nombre de pantalla/estado en `path`.
2. Usar directamente la imagen del repositorio mediante el `path` del manifest, por ejemplo `docs/screen-library/captures/2026-10-30/es-390/pet-passport.png`; si se necesita URL: `https://raw.githubusercontent.com/DigitalAppcorp/pazo-app/main/<path>`.
3. Revisar `provenance` y fecha; no representar una captura sintética o histórica como sesión real de un usuario ni como la UI publicada hoy sin validación visual.
4. **No inventar ni reconstruir** las pantallas que faltan: consultar `COBERTURA.md`. Para producción final de un video, pedir captura nueva solo del estado ausente.
5. Nunca usar imágenes administrativas, credenciales, información de mascotas o personas reales, pagos, tokens o datos privados de producción.

## Avisos de calidad para video

- Las seis capturas históricas de **Mapa** en `navigation/` muestran un error de carga y **no son aptas para representar Lugares en un anuncio**. Están señaladas `video_ready: false` en el manifiesto. La falla de esa evidencia no prueba un error del mapa publicado hoy.
- Las capturas de QA pueden usar mascotas/edades/especies distintas entre pantallas. No montar como recorrido continuo los activos de fixtures incongruentes, ni fingir que representan un usuario real.
- Las composiciones `gallery-*.png` son resúmenes de auditoría, no capturas individuales listas para edición.
- El estado `video_ready: null` significa **pendiente de revisión**, no aprobado. Para material promocional confirmar fecha, contenido, ausencia de PII, funcionamiento visual y continuidad.

## Capturas nuevas del cliente publicado — 30/10/2026

- **152 imágenes** nuevas (ES/EN; **390×844 CSS / 1170×2532 píxeles** en móvil y **1440×900 CSS / 2880×1800 píxeles** en escritorio), capturadas con Playwright navegando el **cliente publicado** y **datos API sintéticos**; **sin capturar sesiones ni datos de usuarios reales**.
- [Catálogo de esta sesión](captures/2026-10-30/README.md) · [Manifiesto detallado](captures/2026-10-30/manifest.json) · [Incidencias y acciones no capturadas](captures/2026-10-30/issues.json).
- Incluye acceso, Demo, primera mascota, feed, perfil, QR, Agenda, documentos, alertas, crear publicaciones, menú, búsqueda, mensajes, notificaciones y herramientas. Esta sesión todavía **NO es una auditoría completa de todas las subpantallas**.
- **Mapa**: las imágenes nuevas usan API de ejemplo sin ubicaciones y muestran lienzo sin contenido; están explícitamente `video_ready:false`. No sirven como material promocional de un mapa operativo.
- Las imágenes del 28/10 permanecen como referencias históricas separadas. El [manifest central](manifest.json) permite buscar ambas colecciones por ID, idioma, pantalla, estado y resolución.
- Todo agente debe elegir `video_ready` después de QA visual; `null` = pendiente, nunca sinónimo de aprobado.

## Control de versiones

Las evidencias históricas proceden del **28 de octubre de 2026** (dos del 26 de octubre), separadas de las **152 capturas nuevas del 30 de octubre**, obtenidas con el cliente hospedado y backend sintético. No se considera exhaustiva la cobertura ni comprobado cada recorrido de datos reales. Verificar cualquier captura concreta antes de publicación comercial.

**Alcance:** pantalla de acceso, demo y producto público/usuario. **Exclusión absoluta:** Administración. Evitar cambios en la aplicación o infraestructura para mantener el banco de imágenes.
