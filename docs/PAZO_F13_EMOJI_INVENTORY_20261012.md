# PAZO — F13 inventario y sustitución vectorial de emojis

**Auditoría RC:** 2026-10-12. **Base:** `release/mvp-beta-fast-track-20261010` en commit `488f88ac1b7eafb9bd6d302ad934a7fb3dfa0b3b`.

## Objetivo autorizado

Eliminar pictogramas Unicode/emoji **del texto redactado por PAZO** y sustituirlos por ilustraciones SVG dibujadas para PAZO: siluetas suaves, formas rellenas, cero trazos/bordes, palette verde `#204E4A`, lima `#E1E53F`, crema `#FAF8F5` y coral `#EC7357`. No usar fuente emoji del sistema ni instalar librerías de iconos.

## Cobertura de detección

Árbol Git completo y auditado en la RC, **98 archivos de texto de `src/`, `public/` y `index.html`** con extensiones TS/TSX, JS/JSX, CSS, HTML, JSON, mjs, webmanifest (incluidas pruebas y archivos legacy). Regla Unicode `Extended_Pictographic`/indicadores regionales, variation selectors y keycaps.

**Resultado base:** 12 líneas, 15 apariciones de pictogramas, **12 glifos distintos**, en 6 archivos.

## Inventario origen → alternativa PAZO

| Archivo y línea originales | Símbolo | Papel en la UI | Vector PAZO |
| --- | --- | --- | --- |
| `src/components/modals/CreatePostModal.tsx:253` | 📷 | Selector de fotografía real | `camera` (cámara con huella) |
| `src/components/modals/CreateModal - copia.tsx:178` | 📷 | Selector en vista legacy, no montada | `camera` (mismo componente) |
| `src/components/modals/MessagesModal.tsx:148` | 🛡️ | Texto informativo de seguridad | `shield` (escudo de mascotas) |
| `src/components/views/OnboardingView.tsx:198` | ★ | Identidad y bienvenida | `star` (destello de marca) |
| `src/components/views/OnboardingView.tsx:421` | 📷 | Cambiar fotografía de mascota | `camera` |
| `src/components/views/OnboardingView.tsx:538,548` | 🔒 | Campos privados | `lock` (candado) |
| `src/components/views/PetView.tsx:530` | ♥ | Contador de likes | `like` (corazón-huella) |
| `src/data/mockData.ts:50` | 🌿 ✨ | Pie de foto DEMO post-1 | `leaf` + `sparkle` |
| `src/data/mockData.ts:69` | 💛 | Respuesta DEMO c-2 | `warm-heart` |
| `src/data/mockData.ts:82` | 🌾 🐇 | Pie de foto DEMO post-2 | `meadow` + `rabbit` |
| `src/data/mockData.ts:106` | 🐕 🐾 | Pie de foto DEMO post-3 | `dog` + `paw` |

Las apariciones repetidas de fotografía y candado reutilizan el mismo icono especializado; el catálogo contiene **12 diseños** originales, uno por concepto distinto. En datos DEMO los glifos salen de los textos estáticos y pasan a metadatos decorativos `DEMO_POST_MOTIFS` y `DEMO_COMMENT_MOTIFS`, renderizados junto al texto en Feed / «Mis publicaciones»; el contenido sigue siendo legible sin iconos.

## Archivos de implementación

- `src/components/icons/PazoMotifIcons.tsx`: SVG React autorales, paths rellenos sin `stroke`; aria-hidden cuando acompañan texto legible.
- `src/components/views/OnboardingView.tsx`, `PetView.tsx`, `HomeView.tsx`, `src/components/modals/MessagesModal.tsx`, `CreatePostModal.tsx` y archivo legacy de CreateModal: sustitución por componentes.
- `src/data/mockData.ts`: quitar glifos de captions de demostración y asociarlos a motivos vectoriales.
- `scripts/check-no-ui-emojis.mjs`, `package.json`: contrato automático integrado en `npm run test:governance`. Falla si se introduce un emoji en código de UI.

## Límite deliberado

**No modificar, filtrar ni censurar texto generado por usuarios.** Sus publicaciones/comentarios proceden de Supabase y pueden contener emojis elegidos por ellos; la orden se aplica al texto que la app misma escribe, no al contenido que pertenece a otras personas. No alterar Auth, RLS, Storage, SQL, backend, Mapbox, flujos, datos reales, Vercel ni `main`.

## Gates

1. PR aislado contra RC, CI de gobernanza/build/lint dirigido. **CI / render en navegador pendientes hasta ejecución real.**
2. PO revisa los SVG en la app cuando haya entorno autorizado. No deducir aprobación visual de TypeScript/build.
3. Solo después, integrar en RC y efectuar smoke T12 una sola vez cuando concluya F13.
