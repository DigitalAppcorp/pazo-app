# Comunidades — integración visual aprobada, en revisión

Estado: implementación en rama `feat/community-contextual-navigation-20261026`, base `5036f6d7024ace157c7dad96afc270ba4728d327`. El PO aprobó la propuesta visual direccion-08 y autorizó integrarla en el código real preservando Supabase. **No fusionada ni publicada; aprobación de la integración aún pendiente.**

## Comportamiento

- Cuatro destinos: Publicaciones, Actividades (Agenda/Retos), Preguntas y Miembros (personas/Reconocimientos). Acerca de conserva descripción, reglas, categoría/especie/zona y conteo de publicaciones; pertenencia y edición/archivo originales. Administrar contextual al propietario lleva a información, miembros y herramientas avanzadas.
- Publicación abre el formulario original en diálogo nativo con Escape, foco confinado y retorno al activador. Cerrar conserva el borrador; éxito cierra el diálogo. Estados de publicación, revisión de medios y errores originales conservados.
- Selector con una sola cápsula medida, curva liquid original y460ms. Portada cambia altura en520ms. Paneles opacos se desplazan horizontalmente: seleccionar derecha→salida izquierda/entrada derecha, inverso al volver. Copia saliente inert/aria-hidden sin IDs; se retira al cancelar/terminar. Movimiento reducido cancela la animación incluso si cambia durante ella. No fundido entre secciones.
- Los cinco destinos futuros siguen siendo **fake doors**, no funciones simuladas. Mismo texto contextual aprobado, separación párrafo/CTA22px y cajas centradas. ES/EN; interés guardado, intención opcional existente, carga, fallo/reintento, visitante, archivado y rol no admitido.

## Contratos preservados

El controlador legacy `CommunityDetailView` conserva los15manejadores y la lógica de llamadas a servicios. Solo se añaden estado visible de fallo/reintento a `loadCommunity` y cierre del compositor tras éxito a `handleCreatePost`. Componentes nuevos bajo `src/features/communities/components/`; CSS acotado al workspace. No nuevos services globales, dependencias, configuración pública, fixtures de producción ni cambios de SQL.

`communityService.ts`, `featureExperimentService.ts`, cliente Supabase, Storage, moderación y titularidad permanecen intactos. Los límites de UI no sustituyen autorización backend. Los identificadores `communities_events/challenges/qa/badges/admin_tools` y `community_info_owner/member` se mantienen literalmente porque RLS restringe esos valores. El nombre legacy `community_info_*` ya no describe la ubicación visual; no renombrarlo sin migración/revisión separada.

Medición conserva unidad cuenta/módulo y sesión existentes; no se añade comunidad, texto de posts, mascota, GPS o nuevos eventos. Por ello no atribuye interés a una comunidad concreta. Vista solo al alcanzar50% visible, interés explícito e intención después de guardarlo. Administradores que no sean propietarios/miembros admitidos por la política actual ven una explicación sin CTA ni medición; no se les conceden permisos artificiales ni se cambian políticas en esta integración.

## Verificación

- `npm run build`: PASS (TypeScript y Vite). Permanece advertencia de tamaño del bundle compartido; sin dependencia nueva.
- `npm run test:governance`: PASS, incluyendo hardening, arquitectura, privacidad, operaciones, MVP, PWA, cierre y regla de emojis; bloque de cierre520/520.
-14pruebas focales de titularidad/salida PASS; ESLint de ambos componentes nuevos PASS; `git diff --check` PASS.
- Actualizadas tres expectativas antiguas que exigían3tabs/hero viejo/lista agrupada. Añadida prueba del workspace real para4destinos ES/EN, callbacks, control de selección y acceso owner. Ranking sigue exigiendo11fake doors y presencia en registro backend.
-21comprobaciones de navegador sobre componentes reales con **servicios sustituidos solo en un harness externo al producto**: borrador/Escape/publicación, edición,5intereses/intenciones, owner/member/visitor/admin/archivado, pertenencia, fallos/reintento,320/390/1440 ES/EN, desplazamiento y movimiento reducido. Además like/comentario/abrir-cerrar denuncia/eliminar confirmados localmente.
- Capturas ES/EN390 inspeccionadas. Harness inicial no cargaba la fuente porque no usa el index.html productivo (que ya carga Quicksand); se añadió solo al harness la fuente local existente. Correcciones del harness: selector Guardar, respuesta completa de comentarios y resultado tipado de borrar; no defectos del servicio real. Primera carga del servidor acotada tras Tailwind explorar workspace amplio.

Evidencia local reproducible en `continuidad/community-integration-20261026/`; resumen portable en [artefactos](community-navigation-20261026/integration-checks.json), [contratos](community-navigation-20261026/contract-proof.json), [acciones](community-navigation-20261026/original-actions.json), [ES](community-navigation-20261026/integrated-es-390.png), [EN](community-navigation-20261026/integrated-en-390.png).

## Revisión y límites

Visor local `http://127.0.0.1:5322/review.html` importa el código real de esta rama y utiliza datos/control de servicios aislados: no registra votos, publicaciones ni cobros alojados. Preview conceptual aprobada5320 conservada para comparar. No se afirma prueba end-to-end con sesión Supabase real ni despliegue. No SQL, migraciones aplicadas, Edge, PayPal, main o producción modificados. Revisión de integración y autorización de publicación son pasos posteriores; no se bloquea la rama esperando credenciales ni se hacen escrituras reales como QA.
