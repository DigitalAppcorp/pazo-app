# PAZO — Biblioteca de capturas para agentes de video

**Acceso directo**: [Catálogo visual](CATALOGO.md) · [Manifest JSON](manifest.json) · [Pendientes de cobertura](COBERTURA.md).

Esta biblioteca guarda **imágenes reales de evidencias de QA existentes**, sin crear pantallas ficticias. Todas están fuera de Administración. Una captura de QA no equivale automáticamente a una captura actual de producción.

## Directorio

- `snapshots/2026-10-28/canonical/`: bienvenida móvil/escritorio y avisos de primera utilidad.
- `snapshots/2026-10-28/navigation/`: Comunidades, Mapa y Mi mascota, ES/EN, anchos 320/390/430.
- `snapshots/2026-10-28/utility/`: pasaporte QR, Agenda, primera experiencia.
- `snapshots/2026-10-28/visual/`: estados content/empty/pending/error/recovered, Home y llegada.
- `snapshots/2026-10-28/short/`: estados compactos de 320px.
- `snapshots/2026-10-28/historical/`: prueba anterior de Comunidades, solo referencia histórica.

## Para cualquier agente (Video OS, Marketing Brain, Design OS)

1. Primero abrir `docs/screen-library/manifest.json`. Filtrar por `group`, `language`, `viewport_width` y el nombre de pantalla/estado en `path`.
2. Usar directamente la imagen del repositorio mediante el `path` del manifest, por ejemplo `docs/screen-library/snapshots/2026-10-28/navigation/es-390-Mapa.png`; si se necesita URL: `https://raw.githubusercontent.com/DigitalAppcorp/pazo-app/main/<path>`.
3. Revisar `provenance` y fecha; no representar una captura sintética o histórica como sesión real de un usuario ni como la UI publicada hoy sin validación visual.
4. **No inventar ni reconstruir** las pantallas que faltan: consultar `COBERTURA.md`. Para producción final de un video, pedir captura nueva solo del estado ausente.
5. Nunca usar imágenes administrativas, credenciales, información de mascotas o personas reales, pagos, tokens o datos privados de producción.

## Control de versiones

El conjunto incorporado procede de evidencias del **28 de octubre de 2026** (y dos imágenes históricas del 26 de octubre). Se conservan inmutables con su origen para trazabilidad. No se ha podido verificar aquí que todas coincidan con la publicación del 30 de octubre; se necesita una pasada nueva antes de declarar cobertura completa.

**Alcance:** pantalla de acceso, demo y producto público/usuario. **Exclusión absoluta:** Administración. Evitar cambios en la aplicación o infraestructura para mantener el banco de imágenes.
