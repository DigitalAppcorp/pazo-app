# PAZO · Visual Lab v0.1 — captura real, datos sintéticos y cero operaciones comerciales

**Estado:** herramienta propuesta en rama / PR; no es una certificación de 86 pantallas ni un deploy de PAZO.

## Objetivo
Generar imágenes **renderizadas por Chromium** a partir de componentes reales de PAZO, con datos sintéticos, en un servidor Vite LOCAL y **sin acceso de red a Supabase, PayPal, Mapbox ni usuarios reales**. Cada captura se acompaña de un manifiesto verificable y hallazgos automáticos axe-core (si se carga la librería). Luego Design Intelligence OS realiza crítica humana/asistida de cada escena y mantiene hallazgos en [observaciones visuales PR #107](https://github.com/DigitalAppcorp/pazo-app/pull/107), sin confundir tests automáticos con aprobación estética.

## Arquitectura y archivos
- `supabase/tests/visual/browser-harness.html`: superficie de desarrollo local que monta React real, no imita las pantallas con imágenes. Comprueba `import.meta.env.DEV` y hostname loopback.
- `scripts/visual-lab/cases.mjs`: registro explícito de escenas, **tipo de evidencia** (component / synthetic / blocked), idiomas y viewports.
- `scripts/visual-lab/capture.mjs`: Playwright/Chromium, aislamiento de HTTP externo, capturas y mediciones automáticas + accesibilidad axe.
- `scripts/visual-lab/contract.test.mjs`: pruebas de invariantes que aseguran aislamiento, rutas y que no se atribuya cobertura inexistente.
- `.github/workflows/pazo-visual-lab.yml`: en PR, corre **piloto** cuando cambian los archivos del lab; una vez integrado a main y con aprobación independiente puede dispararse manualmente con alcance `full`. No habilita Vercel ni escrituras remotas.
- Archivos de salida en GitHub Actions **Artifacts**, no commits binarios automáticos. GitHub conserva artifacts por 14 días; los reportes relevantes deben revisarse y documentarse en el PR de observaciones antes de caducar.

## Escenas iniciales (18, no 86)
`welcome`, `signup`, `pet-onboarding`, `interests`, `feed-one`, `feed-empty`, `communities-empty`, `search-disabled`, `pet-summary`, `create-menu`, `create-post`, `create-community`, `add-pet`, `care-empty`, `documents-empty`, `map-unavailable`, `nav`, `invitation`.

**Lectura correcta**: `feed-one` utiliza una publicación ficticia sin propietario real y deliberadamente **no** ejecuta RPC de impresiones (`currentPetId` indefinido). `communities-empty` es estado sin sesión, NO la lista poblada. `map-unavailable` aborta las fuentes remotas y representa un error de mapa, **NO mapa 3D operativo**. `invitation` usa el componente verdadero de la invitación. Las capturas F18 existentes en `docs/review/f18/` completan oferta/admin visuales ya inspeccionados, pero no tienen por qué coincidir con este SHA. El resto del [inventario de 86 superficies](https://github.com/DigitalAppcorp/pazo-app/blob/audit/pazo-observaciones-visuales-20261025/docs/observaciones-visuales/2026-10-25/02_INVENTARIO_DE_PANTALLAS.md) permanece sin capturar/renderizar.

## Cómo ejecutar en GitHub
1. Revisar el PR de Visual Lab en su rama; no hacer merge de forma automática.
2. En la pestaña **Checks** del PR, consultar el workflow *PAZO Visual Lab (synthetic screenshots)* ejecutado por `pull_request` (piloto, 9 escenas × 390 × ES/EN).
3. Abrir su ejecución en **Actions**, bajar el artifact `pazo-visual-lab-<run>` y abrir `index.html` en el ordenador; `manifest.json` incluye por escena `CAPTURED`, `CAPTURE_FAILED`, axe y límites.
4. Para generar todas las escenas y anchos, se requiere que el workflow exista en la rama predeterminada **y GO específico para integrar el PR**. GitHub `workflow_dispatch` habitualmente solo está disponible si el workflow existe en la rama predeterminada. Seleccionar `scope=full` tras el gate. **No integrar automáticamente para obtener la galería**.

### Ejecución local alternativa, sin merge
En un clon de la rama y SOLO con las herramientas ya instaladas:

```powershell
npm ci
npm install --prefix "$env:TEMP\pazo-visual-tools" --no-package-lock --no-audit --no-fund --ignore-scripts playwright@1.56.1 axe-core@4.10.3
node "$env:TEMP\pazo-visual-tools\node_modules\playwright\cli.js" install chromium
$env:PAZO_PLAYWRIGHT_MODULE="$env:TEMP\pazo-visual-tools\node_modules\playwright"
$env:PAZO_AXE_CORE_PATH="$env:TEMP\pazo-visual-tools\node_modules\axe-core\axe.min.js"
$env:VITE_SUPABASE_URL="https://mrybvqdebbgcayuvgkkr.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_SYNTHETIC_VISUAL_LAB_NO_NETWORK"
npm run dev -- --host 127.0.0.1 --port 5189 --strictPort
```

En otra terminal del mismo clon:

```powershell
node --test scripts/visual-lab/contract.test.mjs
node scripts/visual-lab/capture.mjs --scope=full
```

El navegador rechaza TODA petición externa. El host de Supabase es solamente el requerido por la validación de configuración pública existente; el key es sintético e inválido y no se utiliza para ninguna autenticación real. No usar credenciales, tokens reales ni usuarios de producción.

## Evidencia y requisitos de calidad
Cada fila de `manifest.json` incluye escena, nivel de fidelidad, tamaño, idioma, SHA, si hay overflow horizontal, inputs que requieren comprobación de nombre accesible, hallazgos axe, errores y capturas disponibles. **Los resultados axe son señales automáticas, no sustituyen Tab, zoom, lector de pantalla ni juicio profesional.** Si el navegador no renderiza una escena se declara `CAPTURE_FAILED`; NO se sustituye con un mock genérico que parezca que el test pasó.

## Extensión progresiva
Agregar escenas solamente cuando se pueda reproducir **un estado real de componente** sin depender de escrituras remotas. Las siguientes son:
- Comunidades con datos falsos mediante lectura interceptada, detalle, crear/editar y mensajes.
- Lugares con datos de mapa sintéticos que no hagan peticiones Mapbox, sin representar erróneamente 3D cargado.
- Perfil público/QR público/alerta con tokens falsos y sin hacer reportes reales.
- Estados cargando/fallo/éxito/no permiso de Feed, Cuidados, Documentos y soporte.
- Panel administrativo con fixture local que no invoque RPC reales; reutilizar/adaptar el laboratorio F18, sin Docker/SQL alojado.
- Cobros y contratos: exclusivamente UI sin consentimiento ni CREATE; nunca hacer E2E de pago bajo la excusa de screenshot.

Cada ampliación requiere confirmar identidad y UX aprobada. La calidad no se mide por el número bruto de PNGs.

## Riesgos y salvaguardas
- Workflow usa permisos GitHub `contents:read` y `actions/upload-artifact`; **no tiene pasos de deploy, commit, SQL, escritura a Supabase ni PayPal**.
- Interceptor Playwright bloquea TODA petición externa; service workers bloqueados. Las pantallas que necesiten Mapbox/servidor auténtico se marcan incompletas en vez de reclamar fidelidad.
- No hay secretos en variables de entorno; no usar sesión persistente, cookies exportadas, datos reales o URL de retorno de PayPal con token.
- Instalar Playwright en GitHub Actions utiliza minutos de ejecución de Actions; no crea VPS ni activa suscripciones, pero puede consumir cuota de CI. El piloto se limita a un PR y `concurrency cancel-in-progress`.
- Vite prueba escena aislada, **NO reemplaza** revisar el flujo de aplicación con navegación, estado y sesión real. La cobertura completa necesita pruebas posteriores de interacción con entorno QA seguro.
- Capturas comparables requieren mismo SHA, fixture, viewport, zoom, idioma y fecha; no comparar una captura de código de PR #106 con producción como si fueran el mismo baseline.

## Salida
`artifacts/visual-lab/index.html` galería offline; `manifest.json` con trazabilidad; `screenshots/<grupo>/<escena>/*.png` y avisos. Los archivos se recuperan desde GitHub Actions cuando el trabajo se ejecuta. **No crear archivos JSON de métricas financieras reales.**

**Gate de aceptación:** inspeccionar capturas, evidencia de aislamiento y errores; después autorizar una fase distinta de recomposición de UI. No modificar PAZO productivo por el mero hecho de encontrar defectos.
