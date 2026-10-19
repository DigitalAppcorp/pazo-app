> **ITERACIÓN 3 — AJUSTE TRAS SEGUNDA CAPTURA RECHAZADA POR EL PO (18-oct-2026, noche LA):** las imágenes recién recibidas confirman que la segunda versión aún no reproducía la jerarquía visual de «Resumen general»: filtros separados en otra franja, gráficos simples, tarjetas y textos menores, ausencia de ilustración lateral y un mosaico demasiado bajo de fidelidad. El AI corrigió DIRECTAMENTE en PR #44 (solo frontend + pruebas): encabezado desktop con filtros/Actualizar/datos de prueba en una fila; sidebar e ilustración PAZO existente; jerarquía de KPI/paneles y fondo sin contornos; columna de sistema más proporcionada; anillos de alcance por módulo sobre usuarios únicos realmente medidos, no serie inventada; membresías con barras comparativas de períodos/intentos/no verificados, nunca dinero Live; horarios de consulta visibles, y responsive móvil conservado. Archivos: `AdminDashboard.tsx`, `AdminVisuals.tsx`, nuevo `AdminDashboard.css`, `adminDashboard.test.mjs`. Último commit de código/tests `38642ed954195dfb81cb60d3a95850e3fd9bb991`; comprobar **CI de último HEAD** por separado. **Gate sigue ABIERTO:** NO existe captura ni aceptación PO de ESTA tercera iteración. Antes de juzgar escala, verificar zoom navegador al 100% (`Ctrl+0`), comparar 1440 px y 390 px. No main, PayPal Live, datos, migraciones ni nuevas fuentes analíticas.

# PAZO — Gate de fidelidad visual del panel administrativo
**Snapshot de continuidad: 18-oct-2026 (capturas locales con fecha 19-oct UTC).**

## Decisión cerrada del Product Owner (no volver a presentar opciones)
El Product Owner eligió **el diseño claro «Resumen general»** de la imagen de referencia, con fondo marfil, tarjetas blancas de elevación suave y bordes amplios redondeados, texto/íconos oscuros, verde PAZO y lima. Debe sentirse como **una consola de análisis de producto profesional, visualmente rica**, no como un formulario de estadísticas ni una lista de barras.

**La referencia y la captura rechazada están en la Biblioteca de ChatGPT**:
- **REFERENCIA ELEGIDA:** archivo Library raíz `/Panel de Control PAZO en Tiempo Real (1)(1).png` (también variante `/Panel de Control PAZO en Tiempo Real (1).png`). Nombre mostrado: «Panel de Control PAZO en Tiempo Real». Es la captura ofrecida y seleccionada por el Product Owner.
- **ENTREGA RECHAZADA:** archivo Library raíz `/image(20261019-014820).png`. Muestra primera implementación del panel en navegador, sin fidelidad.
- Un nuevo chat con acceso a Files debe localizar estas **dos imágenes exactas** en Library (usar `files.list` o `files.read`), no reconstruir desde memoria ni confundir con las otras cuatro opciones.

## Auditoría comparativa (referencia vs. primer resultado rechazado)
| Elemento | Referencia elegida | Entrega rechazada | Criterio de aceptación |
| --- | --- | --- | --- |
| Escala y densidad | Cabecera «Resumen general» grande; títulos, cifras, leyendas legibles | Tipografía minúscula, sensación de zoom/espaciado vacío | Jerarquía tipográfica comparable a la referencia a ancho normal desktop y móvil |
| Lateral | Columna amplia «pazo.» + «Centro de control / Administrador», navegación iconográfica extensa, estado activo lima/verde | Lateral estrecho y minimalista, con solo cinco rutas | Sidebar claramente protagonista en desktop, iconografía coherente, navegación real, ninguna puerta falsa de admin |
| KPI superiores | 4 tarjetas de buena altura con iconos grandes en círculos, cifras grandes, mini-tendencias gráficas | 4 tarjetas bajas, solo números pequeños, sin imágenes | 4 KPI, iconos y espacio/altura similar a imagen; NO inventar % o tendencias |
| Zona central | Mosaico tres niveles: crecimiento y actividad con gráficos, sistema en columna, membresías, ranking de mascotas/usuarios, Fake Doors | Barras planas, tarjetas vacías, espacios sin dirección | Usar gráficos/paneles ricos CON DATOS VERIFICADOS; cuando no exista serie, mostrar un gráfico honesto o «sin historial», no fabricar datos |
| Inferior | Ubicaciones, tipos de publicaciones y moderación; módulo de denuncias visible | Información textual escasa y grandes blancos | Aprovechar datos reales de contenido y moderación; ubicación no debe inferirse de zona privada o posts con ubicación heredada |
| Mobile | Rediseño responsivo de consola | Solo app móvil encapsulada | El panel solo se expande a pantalla completa en desktop; en móvil tabs/barras compactos, tarjetas 1–2 columnas; resto de PAZO inalterado |
| Rendimiento y control | UI accionable | Botones «Ver» poco orientativos | No hay botones decorativos: cada control navega a módulo válido; errores/empty/loading/teclado responsive |

## Estado técnico EXACTO al checkpoint
- Repo `DigitalAppcorp/pazo-app`. PR [#44](https://github.com/DigitalAppcorp/pazo-app/pull/44) **DRAFT**, rama `f13/section-titles-20261012`, base `release/mvp-beta-fast-track-20261010`. `main` sin merge.
- **El PR ya contiene una SEGUNDA ITERACIÓN DEL FRONTEND**, posterior a la entrega rechazada: `src/features/admin/components/AdminDashboard.tsx` y nuevo `src/features/admin/components/AdminVisuals.tsx`, con iconos SVG, KPI ~132px, tipografía mayor, sidebar ~265px, rutas reales para Usuarios/Mascotas/Membresías/Actividad/Contenido/Fake Doors/Lugares/Denuncias/Supabase, donas de datos y cohortes medibles. La captura rechazada **no** representa necesariamente esta segunda versión.
- Commit antes de este nuevo handoff: `874c89ebf7061dc39e1c8288e2c1642ae7163e00`, **GitHub Actions 7/7 PASS** (CI + seis labs). Los commits posteriores de documentación deben revalidarse, no heredan mágicamente aquel PASS.
- Backend privado administrativo Supabase staging project ref `mrybvqdebbgcayuvgkkr`, migración `20261018234721` aplicada y positiva; `admin_private.admin_grants`, `admin_private.app_activity_daily`, RPCs `pazo_admin_overview/users/experiments/voters/audience`. En inspección read-only del handoff: **1 grant administrador, 8 Auth, 5 mascotas; cero eventos registrados en las tres tablas de fake doors**. Estas cifras son snapshot, no números fijos.
- API/servicio `src/features/admin/adminDashboardService.ts`. El mockup tiene datos **ilustrativos**, no reales: 1,248 usuarios, 1,892 mascotas, 86 membresías, $257.14, supuestos porcentajes, series históricas, mapas y «Tiempo real». **NO USAR** como KPIs reales. PayPal Sandbox `US$2.99` confirmado en laboratorio NO equivale a recaudación Live.
- Diseño PAZO: Quicksand/Nunito, verde `#204E4A`, acento `#E1E53F`, marfil `#FAF8F5`, sin contornos/bordes/rings. Mantener seguridad: únicamente administrador con `pazo_is_admin` puede leer datos privados; no añadir acceso a moderadores por defecto.

## GATE ACTUAL (una sola acción siguiente)
`ADMIN_SECOND_VISUAL_REWORK_CODE_CI_PASS_PO_RUNTIME_COMPARISON_PENDING`.

**Lo primero en el siguiente chat:** leer `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, este archivo, obtener HEAD ACTUAL del PR #44 y tests ACTUALES, recuperar referencia/captura de Library, y **validar visualmente la SEGUNDA implementación** en Vite (ancho escritorio 1440–1536px y móvil ~390px). La captura anterior ya fue RECHAZADA; **no** preguntar qué opción de diseño quiere ni regresar al primer layout. Si el Product Owner aún no ha abierto la segunda versión, darle comandos exactos de Antigravity para actualizar rama limpia y reiniciar Vite, pedir captura actual. Si la ve y reporta diferencias, actuar sobre esos defectos específicos, sin repetir una reescritura o decisión de diseño.

Comandos de inspección SOLO si el clon no tiene cambios locales:
```powershell
cd C:\Users\osori\PAZO-F13-preview
git branch --show-current
git status --short
git pull --ff-only origin f13/section-titles-20261012
.\scripts\f16-run-real-sandbox-qa.ps1
```
Si `git status --short` reporta cambios, **NO tirar cambios**; inspeccionar antes. El entorno local del PO no es inspeccionable desde GitHub. No realizar pagos nuevos para validar un diseño.

## Criterios de cierre y prohibiciones
- **CI/build ≠ aceptación visual**. El PO debe aprobar lo que ve en una captura REAL tras pull a versión nueva. Solo entonces se podrá marcar gate visual PASS; Phase/PR no completa hasta todos los gates y merge autorizado.
- No cambiar `main` ni PayPal Live ni migraciones/retención/privacidad sin los gates correspondientes. No agregar tracking invasivo ni copiar datos privados a mapas.
- Si faltan series históricas, disponibilidad/uptime oficial o facturación Supabase/PayPal Live, mostrar «sin fuente», no gráficos simulados.
- No delegar programación a Codex/Gemini por defecto: el AI ejecuta GitHub/Supabase y usuario usa Antigravity para previsualización cuando haga falta.
- Documento histórico completo preservado en `docs/archive/PAZO_ACTIVE_HANDOFF_HISTORY_20261018.md`; detalles generales del panel en `docs/PAZO_ADMIN_CONTROL_CENTER_20261018.md`.

**Fuente de verdad:** repositorio y proveedores verificados; el siguiente chat debe reauditar HEAD/CI, no copiar ciegamente este SHA.
