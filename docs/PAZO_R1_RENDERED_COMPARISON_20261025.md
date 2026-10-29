# PAZO — Gate visual R1: comparación reproducible antes/después

**25 de octubre de 2026.** Auditoría y corrección controlada de composición según Design Intelligence OS v0.4.0.  
**Baseline:** `main@a01b56861cc7d7e016efb9a5d109987c4ceeb33a`  
**R1 renderizada:** `design/pazo-composition-foundation-20261025@f355e3acbfec587052ef2a4c5527d0bf01e20451`  
**Despliegue:** NINGUNO; **no se integró a main**, sin PayPal/Supabase/Vercel alojados.

## Evidencia realmente ejecutada
- [Visual Comparison #40239500004 — SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40239500004), con `scripts/pazo-r1-visual-compare.mjs` y el mismo `visual-comparison.html` copiado al árbol main temporal y a la rama.
- GitHub Actions artifact **`pazo-r1-before-after-40239500004`**, ID `12616006553`: galería `index.html`, `manifest.json` con geometría CSS y `screenshots/baseline` vs `screenshots/proposal`. Retención prevista: 14 días.
- **6 superficies piloto × 5 viewports × ES/EN = 60 pares, 120 PNG, 0 errores de captura, 0 diferencias de estado por los datos sintéticos**. Anchuras y alturas: 320×568, 390×844, 430×932, 768×1024 y 1440×900.
- **Ningún desbordamiento horizontal nuevo de `documentElement` en la matriz**. Se analizaron posiciones, alto/ancho, márgenes y tamaño de fuente de hasta 28 elementos semánticos por escena (no certificación de todo el DOM).
- [CI #40239500065 — SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40239500065), incluye build/gates; [F18 public supporter isolated #40239499980 — SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40239499980). La prueba estática de R1 corrió en la comparación (PASS).
- Chromium en dos servidores Vite loopback, **todas las peticiones externas bloqueadas**, sin cuentas ni operaciones alojadas; la invitación corre con `previewOnly`, **NO activa membresía**.

## Hallazgos de la comparación visual

| Pantalla | Observación antes → después | Resultado / límite |
|---|---|---|
| Bienvenida A01 | Titular/párrafo blanco o crema sobre oliva → verde oscuro `#183D3A`; margen local del párrafo recuperado | **Mejora de contraste calculado** (~5.27–5.68:1 con los tres stops CSS). PASS de geometría, render visto. No equivale a WCAG del sitio entero |
| Registro A02 | Los márgenes dejan de depender de `2px !important`; labels/formulario recuperan ritmo local | Sin desbordamiento horizontal nuevo. **Problema previo en 320px** descrito abajo |
| Alta inicial de mascota A03 | Ancho y margen de campos corregidos por cascada; contenido vertical responde a los mismos fixtures | Sin nueva regresión horizontal; hay scroll interno a 320. Keyboard/AT pendientes |
| Feed con un post | Filtros «Para ti» y «Cerca · Próximamente» aumentan de 9.5/8.5px a 12/11.5px | Legibilidad mejorada; no se cambia lógica ni tracking. Fixture no incluye shell global |
| Comunidades vacías sin sesión | Espacio propio del título `mt-2` recuperado y tarjeta con margen limpio | No debe confundirse con comunidades pobladas o «Unirme» |
| Invitación Amigo de PAZO (preview) | Identidad/artista/CTA y precio preservados, secundario más legible, titular con `line-height:1.13` | La primera prueba detectó un recorte del opt-out a 1440×900; **corregido** abajo |

### Regresión real detectada y subsanada
El incremento de interlineado y tamaño secundario de la invitación hacía que **«No recibir futuras invitaciones» quedara parcialmente fuera del viewport de 1440×900**, cuando en baseline cabía. El problema era visible en la primera galería y la medición detectó una región de scroll adicional.

Se ajustó **solo la distribución vertical para desktop de altura intermedia** (min-width 1024; height 701–950): márgenes de h2 y separación de precio/acciones, manteniendo el título más legible y sin borrar CTA o arte. El capturador agregó una guardia expresa: si el opt-out era visible en baseline y queda oculto en R1 a 1440px, falla el job.

**Resultado final:** baseline `optoutVisible=true` → R1 `optoutVisible=true`; número de regiones con scroll no aumentó en las 60 comparaciones. PASS de gate automático y revisión del screenshot.

### Problema anterior descubierto, no introducido por R1
En **registro A02 a 320×568**, tanto baseline como R1 muestran el bloque inferior con botones Google/Apple deshabilitados y el enlace «¿Ya tienes cuenta? Iniciar sesión» fuera de la primera pantalla; la medición automática no encontró ninguna región vertical desplazable en ese fixture. El contenedor A02 usa `flex h-full justify-between`, mientras el marco de QA tiene `overflow-hidden`. **Esto representa un riesgo S3 de acceso al enlace para iniciar sesión** si se reproduce en el shell PWA real. No afirmar bloqueo real sin prueba de navegador/Tab del flujo.

**Siguiente acción R2:** validar en el shell real a 320×568 con teclado y lector; permitir desplazamiento vertical en el formulario si hace falta, sin romper cabecera, posición de acciones ni safe area. Esta reparación **no se mezcló en R1** porque requiere confirmar la estructura navegable del onboarding.

### Otro límite de la invitación móvil
A 320×568, opt-out no se ve en el primer viewport pero existe región vertical desplazable en ambos renders (`scrollRegions=1`). Esto **no prueba inaccesibilidad**, pero exige comprobar scroll y Tab hasta la opción; no mover acciones aleatoriamente por salvar una captura.

## Estado de las pruebas
| Control | Resultado |
|---|---|
| Cambios de estilo R1 implementados en rama | **PASS** |
| Comparación 60 pares / 120 PNG | **PASS** |
| Errores de script/render | **0** |
| Desbordamiento horizontal nuevo en documento | **0/60** |
| Opt-out desktop 1440×900 | **PASS tras corrección** |
| CI general y F18 | **SUCCESS** |
| Teclado real, lector de pantalla, reflow a zoom 200%, campos poblados, flujo de registro completo | **NOT_TESTED** |
| Aceptación visual expresa del Product Owner | **PENDIENTE** |
| Merge/main, despliegue | **NO AUTORIZADOS/NO REALIZADOS** |

## Recomendación independiente de diseño
**R1 está técnicamente lista para revisión visual del Product Owner, pero no para presumir UX integral aprobada.** Eliminar un `!important` global aporta consistencia y recupera la responsabilidad compositiva de cada pantalla, pero en 6 escenas piloto no se verifica toda la aplicación.

Conservar los aspectos aprobados: verde/lima, mascota ilustrada, barra blanca y orbe, Mapbox inmersivo, composición narrativa de invitación y ausencia de contornos decorativos. Para R2 priorizar formularios y foco accesible, comenzando por el riesgo de recorte en registro 320px. El laboratorio #108 contiene 86 escenarios sintéticos previos, pero usa fuente **main**, no certifica los cambios R1 sin una comparación específica.

**Próximo gate:** decisión PO basada en la galería original de GitHub Actions. No fusionar/desplegar automáticamente; cualquier integración requiere instrucción separada.
