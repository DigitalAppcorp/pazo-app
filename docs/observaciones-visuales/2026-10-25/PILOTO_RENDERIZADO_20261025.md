# Ejecución real del laboratorio — Piloto Chromium/axe, 25-oct-2026

**Estado:** PILOTO DE CAPTURA PASS, AUDITORÍA VISUAL GLOBAL NOT_TESTED.  
**Ejecutado:** [GitHub Actions #40231717673](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40231717673).  
**Artifact:** `pazo-visual-lab-40231717673-1`, ID `12613622067` (capturas/manifest/galería; caducidad 14 días).  
**Fuente auditada exacta:** `audit/pazo-visual-lab-20261025@b65531aa5c9ce6d006cfef2d4929296ff4b071f5`. Actions/checkout fijado a `pull_request.head.sha` para evitar atribuir evidencia al merge temporal de GitHub.  
**Entorno:** Vite local 127.0.0.1:5189, Playwright 1.56.1 + Chromium 141, axe-core 4.10.3, service workers bloqueados, todas las solicitudes HTTP fuera de loopback rechazadas, sin datos reales.

## Resultados reproducidos
| Control | Resultado observado | Estado de prueba |
| --- | --- | --- |
| Escenas capturadas | **18/18** | PASS captura |
| Escenas fallidas | **0** | PASS captura |
| Idiomas | ES y EN | PASS captura |
| Tamaño | 390×844 | PASS cobertura piloto, demás NOT_TESTED |
| Escenas distintas | 9 de 18 programadas; inventario general objetivo 86 superficies | LIMITADO |
| Overflow horizontal | **0/18** escenas (prueba simple de documento) | PASS limitado; no prueba overlays o reflow 200% |
| Solicitudes externas | **0 observadas**; interceptor de bloqueo instalado | PASS aislamiento en escenas ejecutadas |
| Métodos locales no-GET | **0 observados**; interceptor rechaza | PASS aislamiento |
| Reglas automáticas axe-core | **12 grupos de violaciones**, 10 `color-contrast` y 2 `select-name` (ES/EN por escena) | HALLAZGOS AUTOMÁTICOS, no certificados globales |
| Pruebas manuales teclado y lector | No ejecutadas | NOT_TESTED |
| Pagos, transacciones y DB real | No invocados | NO ES PARTE DEL PILOTO |

Los **12** son hallazgos agrupados por regla y captura, no 12 defectos distintos del producto: el mismo problema puede repetirse en ES y EN. Los 18 PNGs muestran componentes React reales, con datos sintéticos o estados explícitos. No confundir prueba del componente con flujo completo autenticado.

## Evidencia automática por escena (390 ES, repetida en EN)
| Escena | axe | Dato observable | Interpretación |
| --- | --- | --- | --- |
| `welcome` | `color-contrast` (serious) | axe estimó un contraste de ~2.3:1 en texto sobre fondo de bienvenida | Probable incumplimiento 1.4.3 AA; repetir condiciones renderizadas y aplicar el cambio del PR #106 solo después de validar |
| `signup` | `color-contrast` (serious) | ~4.29:1 en texto de 13px | Inferior a 4.5:1 si no aplica excepción; revisar estado real |
| `pet-onboarding` | `color-contrast` (serious) | ~4.29 y ~3.73:1 en fragmentos; **2** inputs sin nombre explícito según heurística adicional | Revisar etiquetas verdaderas y fuentes de color; también falta prueba con AT |
| `feed-one` | Sin hallazgos axe en reglas ejecutadas | Post sintético sin foto ni RPC de impresiones | **No** implica Feed WCAG PASS |
| `communities-empty` | Sin hallazgos axe en reglas ejecutadas | Estado sin sesión, no lista poblada | **No** prueba tarjeta con botón «Unirme» |
| `pet-summary` | `color-contrast` (serious) | Texto de un aviso con ~2.39:1; se usó foto vacía sintética que muestra placeholder roto | Revisar contraste; **foto rota NO es fallo de producción** demostrado |
| `add-pet` | `select-name` (critical) | **2 selects** sin nombre accesible, **7** inputs/selects marcados por heurística de nombre | Defecto importante del formulario; validar árbol de accesibilidad y corregir en PR de UX separado |
| `care-empty` | `color-contrast` (serious) | Texto ~4.4:1 | Medición acotada, no cumple 4.5:1 si texto normal; revisar CSS real |
| `invitation` | Sin violaciones axe en reglas ejecutadas | `previewOnly` muestra aviso de previsualización en el diálogo, no la invitación comercial auténtica | Conserva dirección artística; debe compararse con fixture F18/live real sin compras |

Los valores de contraste ~ son reportes **automatizados por axe** en su render aislado, no mediciones manuales definitivas ni certificación del sitio.

## Revisión visual humana asistida (muestra piloto)
- En `welcome`: dibujo e identidad conservados; contraste entre titular blanco y fondo oliva dificulta lectura. Ninguna razón para sustituir ilustración o verde; ajustar par de colores y verificar.
- En `feed-one`: se observa un post legible pero sin barra de navegación global por tratarse de un componente de fixture. No afirmar que así queda el Feed real en la PWA.
- En `pet-summary`: la información se concentra en varios bloques, con títulos importantes y tarjeta de aviso perdida de alta prominencia. La imagen de prueba deliberadamente carece de URL, así que no inferir que las fotos reales fallen.
- En `invitation`: composición, ilustración y salida siguen funcionando visualmente en estado preview. La línea «Vista previa» no debe confundirse con copia comercial.

## Problemas hallados y solucionados EN EL LABORATORIO (no en PAZO)
1. Ruta de Vite mal concatenada en la primera iteración: 18 CAPTURE_FAILED. Se corrigió y se añadió prueba de contrato.
2. Portal de invitación inserta el diálogo fuera del wrapper de React: el detector de texto vacío lo consideraba fallo. Se corrigió el detector; 18 CAPTURED en la ejecución validada.
3. `GITHUB_SHA` de PR refleja merge temporal: checkout y metadatos ahora usan la SHA exacta de rama. El piloto final demuestra `source_sha=b65531aa5c9ce6d006cfef2d4929296ff4b071f5`.

## Próximo gate
- Inspeccionar imágenes en el artifact antes de cambios en producto. Priorizar `welcome`, `pet-onboarding` y `add-pet`.
- Completar FULL **18 escenas × 5 tamaños × ES/EN** en clon local seguro o, tras GO para integrar, desde `workflow_dispatch`; no asumir ejecutado ahora.
- Añadir escenas sintéticas de estados completos y widgets auténticos hasta cubrir el inventario de 86 superficies y journeys; la cobertura actual todavía es piloto.
- Registrar regresiones y soluciones propuestas en [auditoría madre PR #107](https://github.com/DigitalAppcorp/pazo-app/pull/107). Aplicar correcciones solo mediante PR distinto con nueva autorización.

**Mutaciones en PAZO producción, DB, backend, PayPal, Vercel y `main`: cero.** El laboratorio sólo añadió código QA y documentación a su rama/PR.
