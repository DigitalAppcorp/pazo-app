# PAZO — F13 splash animado aprobado | especificación de implementación

**Aprobación PO:** preview `pazo_splash_preview.gif` / MP4 mostrado en chat, respuesta del PO **«listo, me gusta»** y continuación **«excelente»** para versión final.

## Apariencia y comportamiento

- Identidad: **concepto 4** elegido por Product Owner, isotipo perro+gato abrazados, tres almohadillas superiores y logotipo `pazo`.
- Colores: fondo verde profundo `#204E4A`; perro/letras crema `#FAF8F5`; gato coral `#EC7357`; huella lima `#E1E53F`.
- Secuencia basada en preview: aparecen perro y gato acercándose, caen los tres puntos de la huella, entran las letras **p**, **a**, **z**, **o** en cascada, la pantalla se desvanece a crema.
- Duración: **2.5 s** del temporizador *ya existente* en `App.tsx`, sin añadir temporizador paralelo, petición de datos, navegación, bloqueo extra ni dependencia externa.
- Modelo: formas vectoriales reales `<svg><path>` reconstruidas a partir de los canales del logo elegido; no GIF, MP4 ni PNG en runtime. El GIF/MP4 entregado al PO es **solo el prototipo audiovisual de referencia**.
- Reducido movimiento: sin animaciones ni pantalla de espera obligatoria de 2.5 s (ventana reducida a 150 ms); sin efectos infinitos.
- Responsive: composición vertical centrada, safe-area inferior, etiqueta de versión conservada; sin bordes, outlines ni strokes nuevos.
- Accesibilidad: un único status accesible para la transición; SVG decorativo con `aria-hidden`.
- El bypass existente para enlaces de rescate públicos permanece **antes** del splash. Los estados Auth, recuperación y bootstrap siguen intactos al terminar.

## Scope de código

- `src/features/splash/PazoSplashArtwork.tsx`: isotipo y letras 100% SVG con paths independientes.
- `src/features/splash/PazoSplash.tsx`: componente visual/estado accesible y versión.
- `src/features/splash/pazoSplash.css`: animación aislada y fallback reduced-motion.
- `src/App.tsx`: reemplaza el antiguo splash de letras giratorias, **reutiliza** `showSplash`, sin rediseñar otros módulos.

## Gates

1. GitHub Actions gobernanza + build/TypeScript + check de arquitectura. No declarar PASS hasta resultado del PR.
2. Merge únicamente en la rama `release/mvp-beta-fast-track-20261010` tras CI, no `main`.
3. Vista en navegador con el SHA de release (T12) queda pendiente si Vercel rate limit no permite Preview. La animación elegida está aprobada visualmente como **prototipo**, no dar por validado el render de CSS final hasta visualización en dispositivo.
4. Sin modificaciones a DB, storage, API, Edge, variables de entorno ni a PWA manifest. El icono de instalación tiene su propio gate de marca separado (no cambiarlo de forma implícita).
