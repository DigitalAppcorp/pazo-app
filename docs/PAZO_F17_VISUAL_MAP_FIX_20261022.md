## Complemento de auditoría y correcciones de cierre

- La vista móvil tenía una segunda fuente de desajuste: el contenedor interior
  usaba `h-screen` (100vh) dentro de un padre `100dvh`. Se cambió
  únicamente la caja interior a `h-full min-h-0`; evita que la barra dinámica
  del navegador genere altura sobrante o recorte la parte inferior.
- Se añadió el mismo enlace pequeño de instalación también al formulario
  **Iniciar sesión**, además de A01. No se muestra si PWA instalada/standalone;
  ni en Home, Feed, Mapa o barra de navegación.
- La ilustración actual preserva rostro, pose, orejas y collar con UNA sola
  escena local, sin recortes animados. El origen es rasterizado, no vector
  verdadero: no afirmar que se logró resolución nativa profesional.
- La política ES/EN y el inventario de datos se actualizaron para mencionar
  explícitamente el proveedor temporal de teselas OpenStreetMap Foundation,
  datos técnicos de conexión/zonas mostradas y que la ilustración de
  bienvenida es local. Esto NO autoriza analítica, GPS automático ni gastos.
- La ejecución GitHub inicial de CI tras retirar el scroll falló por dos
  contratos visuales antiguos que exigían el scroll y la animación por capas;
  posteriormente se sustituyeron por aserciones del contrato nuevo y se añadió
  una prueba de regresión de viewport/instalación/mapa/modales.
  Una revisión posterior detectó y corrigió una expresión regular mal
  escapada dentro del propio test. **CI final solo PASS si GitHub confirma
  explícitamente el SHA de código**; Vercel READY no suple el gate.
  **Cierre verificado:** CI 39800270518 SUCCESS y F17 isolated security 39800270447 SUCCESS del SHA `b1cbcd35`.
- **Estado actualizado:** después de verificar CI y seguridad SUCCESS del
  SHA `b1cbcd35`, se publicó el ajuste visual en el dominio de beta elegido
  por el Product Owner, `https://pazo-app.vercel.app/`.
  Vercel PRODUCTION `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` READY y alias
  verificado. **Publicación técnica no equivale a aceptación visual en Android.**
  El PR #81 permanece DRAFT y `main` sin fusionar. No tocar PayPal.

---

# F17 · Ajustes visuales PO y mapa base · 2026-10-22

## Contexto y criterio de producto

El Product Owner compartió capturas reales de Android desde `https://pazo-app.vercel.app/`. F17 estaba desplegada, pero el lienzo del mapa aparecía gris y solo mostraba pines. La bienvenida tenía espacio excesivo arriba/abajo, scroll anidado y el collage del corgi dejaba juntas visibles. El CTA de instalación encima de Home interrumpía la navegación. Pidió retirar rótulos decorativos e igualar el centrado de tres títulos.

## Implementación en rama F17 (sin tocar main)

- **A01**: reducción de padding y espaciados en viewport móvil, escena hero flexible `min-h-0`, eliminación del scroll interno que recortaba la tarjeta, CTA y versión accesibles. Pantallas A02–A04 preservan su padding independiente.
- **Corgi original**: el arte aprobado se muestra como UNA sola imagen íntegra. Eliminados los clips independientes de cabeza y cola que evidenciaban recortes al animar. Esto **evita costuras** y conserva exactamente el rostro/pose del corgi aprobado. El archivo original sigue siendo un WebP incrustado en SVG; **no se debe afirmar vectorización ni aumento nativo de resolución**. Una nueva ilustración de alta resolución aún necesita validación visual PO antes de sustituir la imagen.
- **Instalación PWA**: no hay banner dentro de Home; control inline opcional A01, oculto en standalone/PWA instalada. El control de Ajustes queda disponible. No se fuerza ninguna instalación.
- **Mapa**: cuando la cartografía vectorial de Mapbox se mostró en blanco (aunque sus pines cargaban), se optó temporalmente por una capa de calles raster OSM directamente en el motor Mapbox GL JS, manteniendo pines, foco, ubicación opt-in y modelos glTF ya registrados. Muestra atribución visible.
- **Aviso de plataforma**: OSMF opera `https://tile.openstreetmap.org/{z}/{x}/{y}.png` como servicio comunitario *best-effort*. **Válido únicamente como contingencia de beta y tráfico mínimo**: NO tiene SLA, NO es una solución de hosting para crecer o monetizar públicamente. Sin precarga, sin descarga offline, con Referer normal, caché nativa, sin prefetch, con atribución y enlace a copyright. Antes del lanzamiento masivo se debe resolver la causa real del token/tiles de Mapbox o contratar proveedor de mapas con presupuesto/autorización PO. Fuentes: https://operations.osmfoundation.org/policies/tiles/ y https://docs.mapbox.com/help/troubleshooting/blank-tiles/.
- **Comunidades**: eliminado subtítulo “Únete, comparte y participa…” del encabezado. **Mensajes y Notificaciones**: eliminados “PAZO · COMUNIDAD” y “PAZO · TU COMUNIDAD”; el resto del contenido funcional continúa.
- **Modales** Cuidados, Pasaporte y Crear: encabezados centrados geométricamente con columnas laterales simétricas que no dependen del ancho del botón cerrar.

## Gates para aceptación visual

1. `npm run verify:prepreview` / CI y build Vercel del SHA completo PASS.
2. Pantalla A01 en Android Chrome y PWA standalone sin scroll normal a altura 640–850 CSS px; contenido y botones sin superponerse.
3. Botón discreto de instalación aparece solo cuando corresponde y no invade Inicio.
4. Lugares en Android: **calles realmente visibles**, seis resultados, pines, pan/zoom, acercamiento a tarjeta, indicadores y 3D donde corresponda. La mera existencia de pines NO aprueba el mapa.
5. Soporte/administración/payments no modificados y F16 canary intacto.
6. Publicación **beta** de código y dominio confirmada (ver arriba). Sigue pendiente la **aceptación visual real del PO** de calles visibles y calidad del corgi; no fusionar `main` ni declarar lanzamiento final antes de su revisión.

**No atribuir a las pruebas sintéticas ninguna verificación física de renderizado ni calidad de ilustración.**
