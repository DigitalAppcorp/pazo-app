# PAZO — Biblioteca visual para agentes de video y diseño

> **Estado: PENDIENTE DE CAPTURAS.** Este directorio es la puerta de entrada documental; todavía NO contiene capturas verificadas. Implementación y matriz completa: [issue #167](https://github.com/DigitalAppcorp/pazo-app/issues/167).

## Para encontrar una pantalla
1. Consultar primero `docs/visual-library/catalog.json` **cuando exista**. Filtrar por módulo, pantalla, estado, idioma (`es`/`en`) y viewport.
2. Abrir el archivo PNG indicado en `file` (ruta relativa al repositorio) y comprobar el `source_env` y `app_commit`.
3. Usar el PNG original descargado de GitHub para el guion, storyboard o montaje del video. **No recrear PAZO localmente** solo para localizar una captura ya catalogada.
4. Si no existe o está desactualizada, informar el hueco y pedir nueva captura real. **No generar un mock ni etiquetar una ilustración como screenshot real.**

## Estructura prevista
```text
docs/visual-library/
  README.md                 # Entrada para personas y agentes
  AGENTS.md                 # Norma de reutilización
  catalog.json              # Índice estructurado y verificable
  coverage.md               # Cobertura / huecos
  capture-guide.md          # Reproducibilidad y QA
  screens/
    <module>/<screen>/<state>__<locale>__<viewport>.png
```

## Alcance
Todas las pantallas de usuario final y estados visibles de PAZO: sesión, onboarding, feed, mascotas, QR, agenda, alertas, lugares/mapa, comunidades, explorar, notificaciones, opciones de cuenta, demo y flujos de apoyo; también modales, pasos, estados vacíos/error/carga y variantes visuales significativas. **Administración está excluida explícitamente.** Las imágenes deben ser capturas auténticas de la app, con fixtures seguros para situaciones que requieran datos.

## Contrato mínimo de un registro del catálogo
```json
{
  "id": "passport-qr-ready-es-390",
  "module": "passport",
  "screen": "qr",
  "state": "ready",
  "locale": "es",
  "viewport": "390x844",
  "source_env": "production",
  "source_url_or_route": "/...",
  "app_commit": "<sha>",
  "captured_at": "<ISO-8601>",
  "privacy_safe": true,
  "file": "docs/visual-library/screens/passport/qr/ready__es__390x844.png",
  "sha256": "<hex>",
  "status": "verified",
  "notes": ""
}
```
El bloque es un **ejemplo de formato**, no un registro válido. Solo incorporar entradas cuando existan imágenes comprobadas.

## Criterio de publicación
No publicar capturas con cuentas privadas, pagos reales, email personal, tokens, contenido de terceros o paneles de Administración. El índice debe contrastarse con un inventario generado a partir del código y recorridos reales: una URL puede contener múltiples estados distintos. La tarea no se considerará terminada hasta que cada ruta en el catálogo se pueda abrir en GitHub y pase la revisión visual.
