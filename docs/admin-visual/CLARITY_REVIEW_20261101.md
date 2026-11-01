# Administración más clara — registro de diseño (1-nov-2026)

**Orden del PO (chat, 1-nov-2026):** «hay mucho texto y no entiendo mi propio panel; que sea más limpio, gráfico y entendible». Pide aplicar Design Intelligence OS y Expert Evidence Protocol.
**Carril:** rediseño dirigido por el PO. `PO_VISUAL_ACCEPTED: PENDING`. `RELEASE_AUTHORIZED: NO`. Sin SQL, sin nueva recogida, sin merge ni despliegue.

## Diagnóstico (OBSERVED en código de `main` f2325be9)

| Problema | Efecto para el PO | Decisión |
| --- | --- | --- |
| 16 secciones en lista plana | No se sabe dónde buscar | 5 grupos: general, Comunidad, Crecimiento, Dinero, Operación |
| «Comportamiento» y «Resumen» renderizaban lo mismo | Dos entradas para un mismo informe | Resumen compacto; Comportamiento conserva el detalle |
| Nota de texto bajo casi cada gráfico | La lectura se va en advertencias | Botón «i» por panel: la advertencia sigue a un toque |
| Cuentas, mascotas y módulos dentro de un desplegable | Lo básico quedaba oculto | Fila de cifras y tres paneles visibles |
| Etiqueta fija «Datos de prueba» junto a cifras reales | Sugería que todo era de prueba | Se retira; Sandbox queda separado en Membresías |
| Selector de período en pantallas que no dependen de él | Control que no cambia nada | Solo en Actividad y Campañas (`pazo_admin_overview` solo aplica `p_days` a actividad) |
| Embudo como forma orgánica con degradado | Difícil leer cifras y comparar pasos | Barras alineadas con cifra, %, diferencia y mayor brecha |

## Qué se preservó

Contratos de datos, RPC, controlador de `AdminDashboard` (hash verificado por `admin-visual-contract`), foco atrapado y Escape, cero contornos, privacidad k≥10, huecos como datos no publicables, exclusión local de señales, PayPal/MFA, Soporte, Cortesías y Mantenimiento. Toda advertencia honesta de antes sigue en la interfaz. `AdminVisuals`, `AdminDashboard.css` y `AdminLiveFinanceSummary` no cambian: los protege el contrato.

## Alternativas descartadas

- **Solo retocar estilos:** no resuelve navegación ni duplicidad.
- **Borrar las advertencias:** limpio, pero haría afirmar a los gráficos más de lo que prueban (último paso ≠ abandono, solicitud ≠ persona).
- **Tooltip solo con hover:** inaccesible en móvil y teclado; se usa botón con clic y Escape.
- **Cola «necesita tu atención» en Resumen:** sería lo más útil según el patrón de paneles operativos, pero añade lecturas nuevas (soporte, denuncias). Queda como decisión aparte.

## Crítica adversarial sobre capturas (autocrítica, no revisión independiente)

| Defecto encontrado | Corrección |
| --- | --- |
| Embudo titulado «De cuenta a utilidad» con base distinta a «Cuentas activas»: inducía a comparar poblaciones diferentes | Título «Embudo desde anuncios» y aclaración en «i» |
| Barras de Fake Doors desalineadas por ancho variable de la etiqueta | Columna de ancho fijo |
| Cuarto anillo de Actividad chocaba con la cifra central | Tres anillos y título acorde; todos los módulos en barras |
| «1 días activos» | Singular correcto |
| Panel de antigüedad medio vacío | Junto a la dona de mascotas |
| Botón de actualizar en lima: lo más llamativo de la pantalla sin ser lo más importante | Blanco; lima solo en hover y foco |
| Cuatro pesos tipográficos distintos en títulos y cifras | Unificados |
| Título y selector repetían la sección en móvil | Título solo para lector de pantalla en móvil |

Paleta de dos series validada con `validate_palette.js`: `#204E4A` + `#76902F`, separación CVD ΔE 24.3, visión normal ΔE 25.0 y contraste ≥3:1, PASS. El tono marca `#204E4A` queda fuera de la banda de luminosidad y croma del validador por decisión de identidad; la segunda serie además va punteada y con etiqueta.

## Evidencia

Palabras visibles con los mismos datos sintéticos, 1440 px, `main` frente a candidato (MEASURED): Resumen 411 → 164, Membresías 94 → 26, Supabase 79 → 31, Lugares 66 → 26, Fake Doors 170 → 76, Usuarios 182 → 147, Mascotas 68 → 53, Actividad 52 → 41, Contenido 37 → 22. Altura de Resumen 1986 → 1061 px, ahora con cifras que antes estaban en un desplegable. En Membresías el Registro Live no cargó en ninguna de las dos mediciones, y Sandbox queda plegado en el candidato. La cifra mide cantidad de texto, no comprensión.

Los resultados de pruebas de esta entrega se registran en `continuidad/ESTADO.md`. CI de GitHub: sin ejecutar. Capturas en `clarity-20261101/`.

## Segunda orden del PO (1-nov-2026): reconstruir alrededor del propósito

El PO explicó para qué existe el rastreo: Meta dice quién se registró; el rastreo propio dice dónde se quedan los demás y qué falla. Sirve para mejorar anuncios, PAZO y el futuro; las Fake Doors son para quienes ya usan PAZO. Rechaza texto y botones que no entiende (panel de preguntas e informes anidados) y pide tocar también las pantallas que no se habían cambiado. Esto sustituye la experiencia de «cinco preguntas» de #153, aprobada visualmente en su momento.

Comportamiento pasa a una sola página: Ads (antes y después de registrarse), Toda la app, Qué falla, Qué usan, Sin cuenta, con accesos rápidos. Resumen abre con los dos gráficos de Ads. Se retiran `BehaviorReadout`, `BehaviorRecommendations`, `BehaviorOutcomes`, `BehaviorFilters` y `BehaviorPanel.css`. Soporte, Mantenimiento, Cortesías y Primera utilidad muestran primero el estado; la lógica y las RPC no cambian. Ambos contratos admiten estos archivos por esta orden.

**Límite de datos (OBSERVED):** los pasos antes del registro se miden por anuncio, pero como contadores agregados. Demo y acceso (`anonymous`) no llevan anuncio: no se puede saber qué hizo en la Demo alguien que llegó de un anuncio y no se registró, ni separar ads de orgánicos sin cuenta. Cerrarlo exige nueva recogida y su aviso de privacidad: decisión separada del PO.

## Límites

`NOT_TESTED`: sesión real de administrador, datos de producción, lector de pantalla, revisión humana o de otro revisor. Las capturas usan cifras sintéticas. PayPal solo cambió en Sandbox (notas de desarrollo plegadas); la consola Live y el Registro Live no se rediseñaron: ya tienen pestañas y no pudieron verse con datos reales. Si el PO sigue sin entender el panel al abrirlo, esta hipótesis queda refutada aunque las pruebas pasen.
