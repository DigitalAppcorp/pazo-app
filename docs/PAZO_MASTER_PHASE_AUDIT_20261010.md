> **ACTUALIZACIÓN F15 — 2026-10-10:** las afirmaciones históricas de ausencia de manifest/SW de esta auditoría **ya fueron superadas** por implementación posterior: `public/manifest.webmanifest`, `public/sw.js`, `src/features/pwa/registerPwa.ts`, PNG generados, metadatos iOS y zoom permitido. CI `#670 SUCCESS` en `0d60dd87`. La F15 sigue PARCIAL porque la prueba de instalación real HTTPS no se realizó; el Preview fue bloqueado por cuota Vercel 402, y el mapa carece de `VITE_MAPBOX_ACCESS_TOKEN` en las variables del hosting. F13 sigue PENDIENTE por decisión PO y se debe recordar antes del lanzamiento. Esto actualiza la evidencia sin borrar el historial de auditoría anterior.

> **ACTUALIZACIÓN POSTERIOR (2026-10-10) — DECISIÓN PO:** PAZO **debe lanzarse como PWA instalable**; queda descartada la alternativa de beta solamente web móvil. Se implementó la base de instalación en la rama RC (manifest, iconos generados de la huella ya existente, SW network-only sin caché privada, registro únicamente en producción, metadatos Apple y viewport con zoom accesible). GitHub Actions **CI #667 SUCCESS** para SHA `fe1a5fc4ee164b84f630065c001d0a200ded22e2` (test:governance, PWA contract, build y lint). **NO** equivale a prueba real de instalación: verificar Android/Chrome e iOS/Safari en HTTPS autorizado al publicar. La F13 **continúa pendiente**, y el PO exige recordatorio justo antes del último GO/NO-GO; no asumir aprobación de diferirla ni completarla. Este párrafo reemplaza los apartados históricos que ofrecen beta no instalable como alternativa.

# PAZO — Auditoría transversal de fases 0–20 | 2026-10-10

**Objeto:** comparar la Ruta Maestra histórica con código y documentación del RC `release/mvp-beta-fast-track-20261010`, sin confundir una fase completa con una beta deliberadamente reducida. **Solo lectura de código y GitHub; sin ejecutar SQL, QA nueva, operaciones en Storage, main o Vercel.**

**SHA auditado:** `a778aefa10c78c0a613fff443c728ee73939e017`; `main` `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`; comparación GitHub: rama release 211 commits por delante, 0 detrás de main; no merged. **GitHub CI #652 SUCCESS** exactamente en SHA auditado (instalación, test:governance, build y lint): https://github.com/DigitalAppcorp/pazo-app/actions/runs/38076331728 . CI PASS no equivale a revisión manual de cada pantalla ni a aprobación pública.

## Inventario íntegro de la Ruta Maestra

| Fase | Denominación | Estado del roadmap / hallazgo verificable | Tratamiento beta |
|---|---|---|---|
| 0 | Fundación | COMPLETADA — stack React/TypeScript/Vite, Tailwind, Supabase y routing en código | Incorporada |
| 1 | Perfil/Follow | COMPLETADA según master; perfiles y botón Follow en RC; QA histórica aceptada | Incorporada |
| 2 | Like/Save/comentarios | COMPLETADA según master; servicios y contratos, QA histórica de Feed | Incorporada |
| 3 | Mascota/edición/privacidad | COMPLETADA según master; `petService`, Auth + storage | Incorporada |
| 4 | Seguridad/estabilización | COMPLETADA en núcleo; RLS/grants documentados; **Leaked Password Protection** pendiente de configuración (deuda conocida) | Núcleo incorporado; configuración pendiente/deuda según plan |
| 5 | Múltiples mascotas | COMPLETADA según master; QA histórica aceptada | Incorporada |
| 6 | QR, pérdida, avistamientos | COMPLETADA, PR #6 integrado; backend/rescate real y notificaciones de rescate | Incorporada |
| 7 | Comunidades | COMPLETADA Gate 8/PR #18, incluidas fake doors de extensiones | Incorporada; ampliaciones no |
| 8 | Lugares, Mapbox, check-in, 3D | COMPLETADA Gate 8/PR #20 y #22 con QA PO; glTF presentes en RC | Incorporada; servicios premium no |
| 9A | Cuidados | COMPLETADA, PR #12; persistencia owner-only y QA | Incorporada |
| 9B | Documentos privados | COMPLETADA, PR #14; archivo privado real/Storage, sin compartir externamente | Incorporada |
| 10 | Mensajería | PLANIFICADA; `MessagesModal` muestra «en desarrollo» para cuentas reales; demo es mock | Fuera de la beta real |
| 11 | Notificaciones generales | PLANIFICADA; ya hay subconjunto real de rescate; no motor general universal | Fuera; rescate sí |
| 12 | Buscar/Explorar | COMPLETADA Gate 8/PR #28 y telemetría acotada | Incorporada |
| **13** | **Rediseño visual integral / sistema UI** | **PLANIFICADA, NO ejecutada como fase completa**; `docs/PAZO_UI_QUALITY_GATE.md` es propuesta, no DoD F13. Reglas de estilo parciales/QA de módulos no equivalen a auditoría visual completa de todas las pantallas | **Diferimiento recomendado a posbeta**, coherente con «sin cosméticos» y MVP fast-track; registrar decisión de alcance del PO, NO marcar COMPLETADA |
| **14** | **Confianza, moderación y privacidad** | **EN CURSO, alcance MVP reducido**: reportes/ocultación y operador asignado; Privacy/Terms ES/EN escritos. **NO cierre integral**: eliminación cuenta E2E Codex pendiente; `VITE_F14_MEDIA_PURGE_ENABLED` OFF y Storage/CDN físico no garantizado; otros ítems de la fase amplia (bloquear usuarios, appeals estructurales, políticas extensas) no acreditados como completados | **Gate operativo crítico:** prueba de baja Codex; reconocer en políticas que ocultar no borra fotos y operar revisiones manuales reales |
| **15** | **PWA, performance y preparación de beta** | **PLANIFICADA/PARCIAL**: hay build CI, manejo de errores y móvil QA histórica; **NO hay manifest.webmanifest/manifest.json, registro de SW ni plugin PWA en árbol RC**. `index.html` incluye `maximum-scale=1,user-scalable=no` que restringe zoom; no se certificó instalación PWA, accesibilidad integral ni prueba de entorno público | **Decisión explícita PO requerida**: beta web móvil (sin prometer instalación) o exigir PWA instalable antes de beta. Service worker/offline avanzado y perf refactor no obligatorios por defecto |
| 16 | Monetización | BACKLOG; PayPal UI inactivo | Posbeta |
| 17 | Matches | BACKLOG | Posbeta |
| 18 | Adopciones | BACKLOG | Posbeta |
| 19 | Servicios/groomers/veterinarias | BACKLOG | Posbeta |
| 20 | Tiendas/negocios/publicidad | BACKLOG | Posbeta |

**Cobertura:** fases 0–20, incluidas 9A/9B (21 números de fase y dos subfases de 9). No declarar fases 10, 11, 13, 14 completa ni 15 completa por el mero PASS de CI.

## Hallazgos de lanzamiento que requieren disposición explícita

1. **F13 no fue ejecutada y no debe perderse**: el PO validó el diseño actual para sus recorridos de trabajo, pero una remodelación integral de UI no está aprobada como terminada. El MVP fast-track evita trabajo cosmético prebeta. Clasificación correcta: `PLANIFICADA / propuesta de POSBETA`; no marcar `COMPLETADA`.
2. **F15 no es PWA instalable demostrada**: el árbol RC no incluye manifest ni SW; `vite.config.ts` usa `react()` sin plugin de PWA y `index.html` no enlaza manifest. El criterio de instalación pertenece a la fase 15 y no se puede dar por cumplido. Si se opta por beta web primero, etiquetarla así y dejar F15 restante para después; si la promesa de beta es PWA instalable, hay trabajo adicional real, independiente de Codex.
3. **F14 no está cerrada integralmente**: la eliminación manual E2E de la única cuenta descartable es de Codex, pero el proceso separado de purga de medios moderados sigue apagado por diseño (`VITE_F14_MEDIA_PURGE_ENABLED`). El texto legal debe comunicar ese límite y el operador debe tener protocolo efectivo para denunciar/ocultar contenido y responder solicitudes. No afirmar que enlaces ya distribuidos son revocados.
4. **Fecha legal antes de publicación:** `src/features/legal/legalCopy.ts` declara `PAZO_LEGAL_EFFECTIVE_DATE='2026-10-10'`, texto «vigente desde...» y `LEGAL_RELEASE_READY=true`, aunque no hubo despliegue ni aceptación pública. El gate previo decía asignar fecha **al publicar**. Rectificar al momento del release o reformular como «fecha prevista» mientras no esté disponible públicamente; flag text-ready no es gate de operación.
5. **F15 accesibilidad básica:** el meta viewport `maximum-scale=1,user-scalable=no` en `index.html` bloquea zoom en navegadores compatibles. Es un defecto concreto a decidir/corregir de forma acotada, no demanda rediseño F13.
6. **F4 deuda de configuración:** Leaked Password Protection sigue históricamente pendiente en Auth; verificar decisión/capacidad del plan al abordar el gate de configuración de producción. No inventar que está activo.
7. **F10/11 sin engaños:** mensajería debe permanecer claramente «en desarrollo» para cuentas reales; notificaciones de rescate sí son reales pero no representan todo F11. Fake doors identificadas como tales.
8. **Gate textual del roadmap:** `docs/PAZO_MASTER_ROADMAP.md` sección «Gate MVP/Beta» exige que las fases 6–15 consideradas requeridas se completen o sean **explícitamente descartadas por PO**. Un fast-track no justifica alterar silenciosamente esa condición. Esta auditoría no se atribuye autorizaciones nuevas del PO.

## Evaluación objetiva de release

- **Certificado:** CI #652 en `a778aefa`; núcleo de fases completadas documentadas, PostHog OFF, permisos moderador DB según handoff, pruebas funcionales históricas aceptadas.
- **Reservado exclusivamente a Codex:** E2E de eliminación de **su** cuenta QA descartable, conservación de otras cuentas/datos y estado verificado. No tocar ese carril.
- **Abierto independiente de Codex:** clasificación de F13, alcance de F15 (beta web vs PWA instalable), validación de moderación/medios al alcance prometido, fecha legal no publicada, zoom accesible. Estos hallazgos no son «nueva fase sorpresa»: surgen de requisitos originales no conciliados formalmente. Resolver proporcionalmente, sin expansión especulativa.
- **Acción de publicación:** solo con aprobación específica PO para merge/deploy, tras prueba de baja Codex y condiciones realmente necesarias según modalidad elegida.

## Fuentes revisadas

- `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MVP_RELEASE_GATES_20261010.md`.
- Subrutas F7, F8, F9B, F12; `docs/PAZO_MVP_MODULE_PRIORITY.md`, `docs/PAZO_UI_QUALITY_GATE.md`, `docs/PAZO_MVP_FUNCTIONAL_AUDIT_20261009.md`.
- `src/components/modals/MessagesModal.tsx`, `src/features/moderation/ModerationMediaQueue.tsx`, `src/features/legal/legalCopy.ts`, `index.html`, `vite.config.ts`, repositorio `tree?recursive=1` para ausencia de manifest.
- No se consultó el contenido privado de Auth/Storage ni se ejecutaron nuevas pruebas E2E. Hallazgos de código no equivalen a QA en navegador.
