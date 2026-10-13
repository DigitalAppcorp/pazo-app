# PAZO — ACTIVE HANDOFF | Snapshot verificado 2026-10-13 UTC

> **LEER PRIMERO.** Este archivo es el estado operativo ACTUAL; reemplaza la cronología anterior (recuperable en Git antes del commit de compactación). Historial de decisiones visuales y referencias de implementación: `docs/PAZO_F13_VISUAL_CHANGESET_20261012.md`. Project Brain OS canónico: `DigitalAppcorp/project-brain-os` **v1.4.1**, `SKILL.md` + `patterns/VERIFIABLE_HANDOFF.md`. El Product Owner manda; la IA implementa directamente en GitHub, no delega normalmente a Codex/Gemini, ni entrega solo planes cuando ya se autorizó código.

## 1. Verdad remota y gates

- Repo: `DigitalAppcorp/pazo-app`. **Rama de implementación:** `f13/section-titles-20261012`; HEAD auditado ANTES de este snapshot: `1934a5d46d690b67ecd66b06bc8a3ef042583a57`. Verificar HEAD nuevamente en cada nuevo chat: la actualización de este archivo generará un commit posterior.
- **PR #44 DRAFT** [revisión](https://github.com/DigitalAppcorp/pazo-app/pull/44) hacia `release/mvp-beta-fast-track-20261010`, cuya última SHA verificada fue `f5f47b8ef10b38d89b4c4abb97320b24df0840a9`. `main` SHA observada `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`. PR no mergeado. No hacer merge a RC/main sin autorización del PO.
- **CI de HEAD del código:** SUCCESS [GitHub Actions #38342046641](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38342046641) sobre `1934a5d4` (build + verificación), y SUCCESS [#38341868940](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38341868940) sobre `81cfe14a`. Fallos de CI previos durante construcción del mapa se corrigieron; no tratarlos como bloqueo vigente. Confirmar CI del nuevo commit documental.
- **Fase activa: F13 refinamiento UX/UI, EN CURSO**, beta pública NO-GO. Código compilado **no equivale** a render real ni aprobación visual. Todas las propuestas aprobadas requieren inspección del PO en su preview Vite antes de cierre.
- Local del PO: Windows PowerShell; clon separado `$env:USERPROFILE\PAZO-F13-preview`, Vite `http://localhost:5173/`. Ha logrado configuración local de Supabase/Mapbox para pruebas anteriormente; NUNCA copiar valores de llaves a Git o handoff. **Estado actual del árbol local, sesión Auth y preview real: NO OBSERVADOS**. No asumir que está limpio, funcionando, o actualizado al HEAD.
- **No usar Vercel para QA visual**; no desplegar deliberadamente ni gastar/incrementar planes/costos. Push puede activar integraciones automáticas: no prometer que nunca hay despliegue automático.

## 2. Tarea inmediata — MAPA/LUGARES: Opción 3 aprobada

El PO envió capturas del módulo antiguo y eligió **Opción 3: mapa inmersivo con carrusel** entre varias referencias; posteriormente AUTORIZÓ PROGRAMAR. Esta autorización reemplaza el congelamiento anterior del mapa; NO autoriza mutación SQL ni proveedores de pago. **El código ya está implementado en PR #44 y CI PASS; aceptación visual pendiente.**

- **Diseño pedido:** Mapbox real cubre íntegramente el módulo entre `HeaderBar` y `BottomNav`, sin tarjeta blanca ni contornos; bordes superior/inferior/laterales se fusionan por degradados con crema `#FAF8F5`; buscador + filtros de categoría flotantes ARRIBA; tarjetas de lugares reales ABAJO con desplazamiento HORIZONTAL, swipe/snap y adelanto de tarjeta siguiente. Debe seguir siendo mapa usable bajo overlays.
- `src/features/places/components/ImmersivePlacesStage.tsx` nuevo (`b0124d57`), presenta controles overlay, carrusel de lugares, loading/error/empty, botón Sugerir real y ubicación voluntaria. `src/components/views/MapView.tsx` conserva búsqueda, filtros, `fetchPlaces`, mapa, flyTo, detalle, check-in/checkout, opt-in privacidad de presencia y fake doors; detalle seleccionado se muestra como panel scrollable encima del mapa. `src/App.tsx` quita padding y scroll externo **solo** en tab `mapa`. `src/features/places/map/MapboxMap.tsx` admite `immersive`, resize y pines de categoría propios PAZO a zoom bajo; mantiene modelos 3D ya existentes a zoom alto.
- Commits de trabajo: `b0124d57`, `9bfb5f86`, `5087b5a8`, tests `c853088d`, fix `81cfe14a`, docs `1934a5d4`. Pruebas en `scripts/closure-ui.test.mjs` y `src/features/legal/legalCopy.test.mjs` incluyen controles/filtros/carrusel y uso voluntario de GPS.
- **No inventar** fotografía, reviews, ratings, ubicación, distancia ni mascotas presentes: usar campos reales del lugar, distancia solo si usuario activa ubicación y contrato existente. No nuevos endpoints, costos, tracking de GPS ni Mapbox plan. Paleta `#204E4A` / `#E1E53F`, Quicksand, superficies glass, regla **cero contornos/focus rings** salvo campo de texto concretamente justificado.
- **Único próximo gate:** PO actualiza `PAZO-F13-preview` sin sobrescribir cambios locales, arranca Vite, abre **Mapa**, entrega capturas a anchuras ~375 y 430 px; verificar que mapa llena módulo sin esquinas, buscador/filtros funcionan y no ocultan zoom, el carrusel hace swipe, las cards muestran lugares reales, selección abre detalle con check-in, ubicarse sigue siendo opt-in, y no tapa BottomNav/safe areas. Corregir solo problemas observados. **No declarar pixel-perfect, no cerrar F13 ni publicar.**

### Comandos para el PO (únicamente tras confirmar `git status --short` vacío)
```powershell
cd "$env:USERPROFILE\PAZO-F13-preview"
git status --short
git pull --ff-only origin f13/section-titles-20261012
npm run dev
```
Abrir `http://localhost:5173/`. Si `git status` muestra cambios, NO recomendar `reset --hard`: inspeccionar primero y resguardar trabajo.

## 3. Otros bloques F13 ya implementados; aceptación visual no presumida

- El PO **rechazó** labels superiores en píldora amarilla e incluso sus sustitutos decorativos: eliminarlos, mantener títulos semánticos. Rechazó también **orbes difusos en Feed**; NO reintroducirlos.
- Home: «Su pequeño mundo.» y selector Para ti / Cerca compactados según capturas PO; frase secundaria «Historias y momentos de tu comunidad» eliminada. PostCard: acciones de denunciar/ocultar en menú de tres puntos, Seguir transparente, preservando comportamiento.
- `Cerca · Próximamente`: aviso **Opción 4 «Explora tu mundo»**, ilustración vecindario, texto corto y fake door real «Me interesa esta función». No activar feed por geolocalización real.
- Comunidades **estado vacío Opción 6**, ilustración mapa ficticio decorativo con pin/huella y CTA real «Crear la primera comunidad»; no grupos falsos. Detalle de Comunidad **Opción 4 Lifestyle**, portada real, identidad editorial abierta, un solo Admin, métricas reales, tabs integrados, composer y posts sociales; conservar permisos/membresía/moderación.
- Mensajes: **Opción 4 de aviso en desarrollo**, sin conversaciones ficticias. Notificaciones: **Opción 4 «Comunidad que cuida»**, filtros Todas/Avistamientos y alertas reales, estado vacío vectorial.
- Fuente Quicksand global; iconos SVG propios; glass; campos opcionales de mascota neutrales; espaciados y métricas perfil refinados, discreción en aviso de privacidad de onboarding. **Intereses según especie desde DB NO implementado**: actualmente no existe catálogo de intereses en DB; cualquier nueva migración/datos requiere autorización específica del PO.
- Repositorio con F13 detallado `docs/PAZO_F13_VISUAL_CHANGESET_20261012.md`; este documento tiene encabezados históricos contradictorios (por ejemplo, mapa «congelado»): PREVALECEN la aprobación más reciente Opción 3 y este snapshot. No repetir propuestas ni QA aprobadas.

## 4. Supabase alojado: hecho aprobado e instalado, NO repetir

- Proyecto `mrybvqdebbgcayuvgkkr`. PO **autorizó expresamente** aviso al propietario cuando alguien se une a su comunidad. Migración `community_join_owner_notifications` registrada por Supabase en versión **`20261013025451`**, fuente `supabase/migrations/20261013025451_community_join_owner_notifications.sql`: **YA APLICADA**.
- Trigger en `community_memberships` AFTER INSERT crea un `notifications.type=community_join` para `owner_user_id` en nueva membresía de rol member de comunidad activa. Evita aviso a dueño por alta de sí mismo y evita duplicados de inserción; no almacena identidad del que se unió. UI reconoce aviso en «Todas», navega a comunidad y marca leído.
- Verificación alojada real: constraint, trigger, función privada, RLS, prohibido INSERT cliente, **PASS**. Prueba transaccional de una unión nueva generó 1 aviso correcto y bloqueó duplicado; se revirtió y quedaron 3 membresías/0 avisos sintéticos en ese instante. **NO repetir migración ni prueba con filas nuevas**; validación visual/de segunda cuenta permanece pendiente con un ingreso voluntario futuro real.
- Sin mutaciones nuevas para mapa. Los gates históricos F14/T08 y backup/release viven en roadmap/docs específicos; NO volver a ejecutar ensayos destructivos o QA cerrada. No presentar beta como lista.

## 5. Flujo permanente y límites

- AI hace código/migraciones autorizadas/GitHub/PR/tests y publica el diff; PO revisa Vite local y decide aceptación; no proponer que Codex sea implementador por defecto.
- Ante bug corregirlo directamente dentro del scope autorizado y volver a CI; no pedir microautorización para cada retoque reversible. **Requerir aprobación distinta** para Supabase nueva, alteraciones destructivas, release, merge a RC/main y gastos.
- **No tratar verificación CI como QA visual**. Conservar los contratos ya validados. No rediseñar otros módulos mientras se valida el mapa.
- **Handoff histórico**: versión anterior de `docs/PAZO_ACTIVE_HANDOFF.md` accesible en el padre de este commit de compactación; Git conserva historia íntegra. Antes de seguir, leer `AGENTS.md`, este snapshot, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_F13_VISUAL_CHANGESET_20261012.md` y comprobar PR/HEAD/CI remoto.

## Activación sugerida en nuevo chat

«Activa Project Brain OS v1.4.1 desde `DigitalAppcorp/project-brain-os`. Yo soy Product Owner. Abre `DigitalAppcorp/pazo-app` rama `f13/section-titles-20261012`, lee `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, roadmap y F13 visual; audita HEAD/PR #44/CI. Retoma desde el gate de **validación visual del mapa Opción 3** en mi Vite local, sin repetir QA ni autorizaciones ya registradas; implementa tú los ajustes que reporte, sube a GitHub y mantén la UI de PAZO».
