# PAZO — Hoja Maestra de Desarrollo

**Documento canónico del proyecto.**  
**Última actualización:** 2026-10-08
**Estado general:** Fase 12 COMPLETADA / Gate 9 medición; Production Hardening EN CURSO. Fase 14: Gates 5–7 CERRADOS, Gate 8 A0 terminado y A1 en despliegue hosted-first (GitHub y backend Supabase PAZO aplicados; Vercel producción BLOQUEADO por permisos 403). A1 NO cerrado; A2–A4 sin autorización.

---

## 0. Cómo usar esta hoja

Antes de modificar código, base de datos o arquitectura de PAZO:

1. Leer este archivo completo.
2. Leer `docs/PAZO_MODULE_LIFECYCLE.md`.
3. Identificar el módulo/fase activo y su gate pendiente.
4. Si existe sub-ruta específica, leerla.
5. No implementar decisiones marcadas como **DECISIÓN PENDIENTE**.
6. No convertir un módulo en implementación solo por su número de fase.
7. Después de cada decisión/merge relevante, actualizar esta hoja.

La finalidad es evitar reconstruir contexto, reducir tokens y evitar desarrollar funciones sin evidencia suficiente.

### Modelo de dos carriles

PAZO trabaja con dos carriles paralelos:

- **Carril de Validación:** módulos opcionales pueden medir interés durante semanas/meses sin bloquear el proyecto.
- **Carril de Implementación:** contiene únicamente utilidades núcleo, infraestructura necesaria o módulos que ya pasaron su gate.

Por tanto, una fase en validación puede permanecer abierta mientras otra fase aprobada avanza en implementación.

---

# 1. Roles de trabajo

## Product Owner
- Brandon.
- Define prioridades, reglas funcionales y acepta/rechaza comportamiento visual.
- Hace pruebas visuales y de producto cuando se solicitan.
- Autoriza explícitamente cualquier mutación importante en Supabase.

## Implementación
Codex/local es el responsable técnico principal por defecto. ChatGPT normal puede retomar el trabajo como respaldo usando el mismo estado durable del repositorio:
- frontend React/TypeScript;
- arquitectura;
- Supabase/PostgreSQL;
- migraciones;
- RLS;
- RPCs;
- Storage;
- seguridad;
- pruebas;
- PRs y merge.

Ambos agentes deben comenzar por `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, esta hoja y la sub-ruta activa. `npm run verify` es el gate local agrupado de gobernanza + build; no sustituye pruebas runtime, visuales, de backend ni Scope Closure Reconciliation.

Las migraciones remotas, mutaciones de producción, push, merge y deploy requieren autorización explícita y vigente del Product Owner. El handoff debe dejar rama/HEAD/upstream, working tree, decisiones, verificaciones y siguiente paso suficiente para cambiar de agente sin depender del chat anterior.

No pedir al Product Owner que copie código entre herramientas salvo que sea estrictamente necesario para una prueba local.

---

# 2. Flujo obligatorio por fase

Cada fase nueva sigue este orden:

1. **Auditoría de estado real**
   - GitHub `main`;
   - Supabase real cuando aplique;
   - no asumir que un mock es funcional.

2. **Definir alcance**
   - qué entra;
   - qué NO entra;
   - decisiones de producto pendientes.

3. **Crear rama**
   - una rama por fase.

4. **Implementar sin tocar producción antes de tiempo**
   - frontend;
   - backend versionado;
   - migraciones preparadas.

5. **Preflight**
   - build;
   - diff;
   - permisos;
   - RLS;
   - concurrencia;
   - integridad.

6. **Autorización explícita**
   - antes de aplicar una migración o mutación sensible en Supabase.

7. **Pruebas**
   - SQL con `ROLLBACK` cuando aplique;
   - build;
   - prueba visual real del Product Owner.

8. **Merge**
   - PR fuera de borrador;
   - merge a `main`;
   - verificar `main`;
   - actualizar esta hoja maestra.

---

# 3. Reglas técnicas permanentes

Estas reglas no deben romperse sin una decisión explícita de arquitectura.

- La identidad social pertenece a la **mascota**, no directamente al usuario.
- Una cuenta puede tener múltiples mascotas.
- Las mascotas del mismo dueño:
  - ven sus publicaciones entre sí;
  - no necesitan seguirse;
  - no pueden crear relación Follow entre ellas.
- Follow, Like, Save, Comment y recomendaciones se ejecutan en contexto de la mascota activa.
- `interactions` es fuente de verdad para estados activos de Like/Save.
- `posts.likes` es contador derivado administrado por backend; el cliente no lo escribe.
- Los datos privados de mascota deben permanecer separados de datos públicos.
- Ningún cliente debe poder actuar usando una mascota que no pertenece al usuario autenticado.
- Todo objeto nuevo expuesto por Data API requiere grants mínimos + RLS.
- Funciones `SECURITY DEFINER` solo cuando sean realmente necesarias, con superficie de ejecución explícitamente restringida.
- Nunca exponer `service_role` ni secretos en frontend.
- No considerar un módulo “terminado” mientras siga dependiendo de `mockData` para su funcionalidad principal.
- Toda persistencia debe sobrevivir recarga `F5`.
- Operaciones optimistas deben soportar rollback y cambio rápido de mascota.
- Las pruebas de seguridad no sustituyen las pruebas visuales, y viceversa.
- Durante una fase de rediseño visual, la funcionalidad existente debe mantenerse intacta salvo aprobación explícita del Product Owner.
- Cambios puramente estéticos no deben introducir nuevas dependencias de backend, alterar contratos de datos ni modificar reglas de negocio.
- Módulos opcionales/sociales de alto coste deben pasar un gate de validación de producto antes de su implementación completa; usar `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.

---

# 4. Estado real actual

## Base real disponible

Actualmente el núcleo persistente usa, entre otras:

- `profiles`
- `pets`
- `pet_private_details`
- `pet_private_metrics`
- `posts`
- `post_comments`
- `interactions`
- `follows`
- `pet_places`
- `care_items`
- `care_completions`
- `pet_documents`

## Módulos reales

- Supabase Auth.
- Onboarding y creación de primera mascota.
- Crear mascotas adicionales.
- Editar mascota.
- Datos públicos/privados de mascota.
- Varias mascotas por cuenta.
- Cambio de mascota activa.
- Feed.
- Posts con/sin foto.
- Feed de mascotas propias + seguidas + recomendadas.
- Cold start de recomendaciones.
- Like / Unlike.
- Save / Unsave.
- Comentarios.
- Perfil público.
- Follow / Unfollow.
- Seguridad RLS/grants/RPC/Storage del núcleo.
- Persistencia de scroll entre pestañas.
- Protección contra follows entre mascotas del mismo dueño.
- Agenda/Cuidados persistente por mascota.
- Documentos privados persistentes por mascota.

## Módulos todavía mock, parciales o de demostración

- Eventos.
- Mensajería 1 a 1.
- Centro general de notificaciones.

---

# 5. Fases terminadas

## Fase 0 — Fundación
**Estado: COMPLETADA**

- React + TypeScript + Vite.
- Tailwind.
- React Router instalado.
- Supabase conectado.
- arquitectura base.

## Fase 1 — Perfil público y Follow
**Estado: COMPLETADA**

- perfil público real;
- navegación desde Feed;
- Follow/Unfollow persistente;
- ownership corregido.

## Fase 2 — Interacciones del Feed
**Estado: COMPLETADA**

### 2.1 Like / Save
- persistencia;
- reload;
- deduplicación;
- contadores backend;
- rollback;
- concurrencia.

### 2.2 Comentarios
- tabla real;
- carga;
- creación;
- contador;
- ownership;
- persistencia.

## Fase 3 — Registro, edición y privacidad de mascota
**Estado: COMPLETADA**

- create_pet_profile;
- datos privados separados;
- edición;
- intereses privados;
- avatar;
- métricas privadas.

## Fase 4 — Seguridad y estabilización
**Estado: COMPLETADA**

- RLS/grants endurecidos;
- posts normalizados;
- profiles protegidos;
- follows asegurados;
- interactions privados;
- Storage endurecido;
- repositorio limpiado;
- Security Advisor sin alertas SQL/RLS relevantes.

**Pendiente global de configuración:** activar Leaked Password Protection en Supabase Auth.

## Fase 5 — Múltiples mascotas
**Estado: COMPLETADA**

- cargar todas las mascotas owned;
- recordar mascota activa;
- cambiar contexto;
- Feed independiente por mascota activa;
- cold start;
- posts de mascotas hermanas visibles;
- interacciones aisladas por mascota;
- AddPet;
- scroll por pestaña;
- mismas-owner Follow oculto y bloqueado en backend.

---

# 6. Nueva Ruta Maestra — MVP social útil

## Fase 6 — Pasaporte QR, mascota perdida y avistamientos
**Estado: COMPLETADA**

### Objetivo
Convertir el sistema de rescate que hoy es visual en una utilidad real.

### Alcance
- token público revocable por mascota;
- QR realmente escaneable;
- página pública accesible sin login;
- ficha pública limitada a datos seguros;
- activar alerta de mascota perdida;
- resolver alerta;
- avistamiento público;
- notificación privada al dueño;
- persistencia;
- RLS y rate limiting básico;
- descargar/compartir QR.

### No entra todavía
- push notification del sistema operativo;
- ubicación GPS automática de quien reporta;
- mapa comunitario de alertas;
- SMS;
- email transaccional;
- red de rescates externos.

### Estado técnico final
- PR #6 implementado y validado;
- backend 6A, 6B y 6C aplicado en Supabase PAZO;
- QR real y token revocable por mascota;
- alerta perdida persistente y resoluble;
- avistamientos públicos con nombre/teléfono privados para el dueño;
- notificaciones reales y detalle accionable;
- recordatorio empático persistente de mascota perdida;
- acceso directo al avistamiento nuevo desde el recordatorio;
- notificaciones nuevas/vistas diferenciadas;
- Feed con paginación por desplazamiento en bloques de 10;
- Notificaciones con paginación por desplazamiento en bloques de 10;
- badge de no leídas calculado sin descargar todas las filas;
- recomendaciones paginadas sin solapamiento;
- RLS/ownership/privacidad validados;
- builds locales aprobados;
- prueba visual/end-to-end aprobada por Product Owner;
- datos visuales de prueba limpiados de Supabase;
- Pancho quedó con `is_lost=false` y sin ubicación de prueba;
- Advisors revisados; sin problemas nuevos introducidos por 6C.

### Definition of Done
- escanear QR desde otro dispositivo abre la mascota correcta;
- funciona sin login;
- no expone owner_id, pet_id privado, teléfono, domicilio ni información privada;
- una alerta persiste tras F5;
- un avistamiento crea registro real;
- el dueño recibe notificación real;
- resolver alerta persiste;
- RLS/advisors aprobados;
- build y prueba visual aprobados.

---

## Fase 7 — Comunidades
**Estado: COMPLETADA**

**Producto:** `docs/PAZO_PHASE_7_COMMUNITIES_MVP_SPEC.md`  
**Arquitectura:** `docs/PAZO_PHASE_7_COMMUNITIES_ARCHITECTURE.md`  
**Estado operativo:** `docs/PAZO_COMMUNITIES_CURRENT_STATE.md`

Decisión vigente:
- MVP útil real aprobado;
- membership por cuenta;
- contenido por mascota activa;
- comunidades públicas;
- creación, Join/Leave, feed, comentarios/likes y administración básica reales;
- extensiones avanzadas se validan dentro del módulo real;
- posts de comunidad no contaminan Feed global por defecto.

Gate 6: CERRADO.  
Gate 7: CERRADO.  
Gate 8: CERRADO.

Backend:
- `20261007014214 communities_mvp_core`;
- `20261007014624 fix_community_storage_policies`;
- build local PASS;
- RLS/ownership/counters PASS;
- Security Advisor sin findings nuevos atribuibles.

Estado técnico final:
- PR #18 fusionado a `main`;
- merge commit: `169b9a47453de0653a3aba27338ea80cd046e0d6`;
- build local PASS confirmado por Product Owner;
- prueba visual/end-to-end PASS;
- núcleo real y fake doors contextuales validados;
- señales legacy limpiadas;
- Security Advisor sin findings nuevos atribuibles a Comunidades.


---

## Fase 8 — Lugares, mapa y Check-ins
**Estado: COMPLETADA — GATE 8 CERRADO / GATE 9 MEDICIÓN**

### Objetivo
Hacer funcional el descubrimiento local.

### Alcance
- consumir `pet_places` reales;
- listado y detalle;
- categorías;
- búsqueda;
- mapa real;
- check-in temporal por mascota;
- contador activo;
- privacidad de ubicación;
- creación/sugerencia de lugares según decisión de producto.

### Decisiones de producto cerradas
- Mapbox GL JS;
- ubicación solo por acción explícita y uso efímero;
- no persistir GPS exacto;
- PAZO publica lugares y usuarios sugieren;
- check-in 2 horas;
- contador público + identidad de mascota solo con opt-in;
- modelos 3D GLB/glTF por categoría preparados desde arquitectura.

Gate 6: CERRADO / aprobado.  
Gate 7: CERRADO.  
Gate 8: CERRADO — Scope Closure Reconciliation PASS.

Estado técnico final:
- PR #20 fusionado a `main`;
- merge commit: `ca3fedd977e0720839a420f2e3673942871b7a61`;
- build local PASS;
- Mapbox runtime PASS;
- ubicación del dispositivo solo bajo acción explícita y uso efímero;
- 0 GPS exacto persistido;
- catálogo real inicial + lugares demo archivados;
- check-in privado/visible, expiración, cambio de lugar y checkout manual: PASS;
- aislamiento entre cuentas: PASS;
- sugerencias de lugares: PASS;
- búsqueda/filtros/detalle: PASS;
- Security Advisor sin findings nuevos atribuibles a Fase 8;
- migraciones aplicadas:
  - `20261007052747 phase_8_places_map_core`;
  - `20261007052749 phase_8_places_initial_catalog`;
  - `20261007053859 fix_place_checkin_checkout_rls`.

Fuentes:
- producto: `docs/PAZO_PHASE_8_PLACES_MVP_SPEC.md`;
- arquitectura: `docs/PAZO_PHASE_8_PLACES_ARCHITECTURE.md`;
- estado: `docs/PAZO_PHASE_8_PLACES_MASTER.md`.

---


### Corrección de cierre — FINALIZADA
- PR #22 fusionado a `main`;
- merge commit: `f775ce75f680a7059dbb7ccef9084816a1c3a299`;
- 6 fake doors contextuales implementadas;
- Supabase registry `20261007072355 place_extension_experiments`: APPLIED;
- runtime `Me interesa` + F5: PASS;
- 6 modelos glTF low-poly por categoría: implementados;
- veterinaria 3D: PASS después del fix de visibilidad;
- parque/sendero: PASS;
- build local Product Owner: PASS;
- backend QA: PASS;
- Security Advisor: sin findings nuevos atribuibles a Fase 8;
- `main` verificado después del merge;
- Scope Closure Reconciliation: PASS.

Fase 8 queda cerrada. Sus extensiones experimentales pasan a medición post-lanzamiento; no se construyen automáticamente por existir interés.

### Ajuste de rollout — 2026-10-07
- Fase 8 sigue técnicamente COMPLETADA.
- Rollout público de Mapa/Lugares: PAUSADO.
- Mapa real: desarrollo local únicamente.
- App publicada: fake door de demanda `places_map`.
- Tracking: views + interés único por cuenta usando el framework genérico.
- No solicitar ubicación ni cargar Mapbox en builds publicados durante el experimento.
- Contrato: `docs/PAZO_PLACES_DEMAND_EXPERIMENT.md`.
- Resultado operativo actual: **EXPERIMENTO ACTIVO / Gate 9**.


## Fase 9 — Cuidados y documentos privados

**Priorización:** `docs/PAZO_MVP_MODULE_PRIORITY.md`

### 9A — Agenda/Cuidados
**Estado: COMPLETADA**

**Sub-ruta de producto:** `docs/PAZO_PHASE_9A_CARE_MASTER.md`  
**Arquitectura técnica:** `docs/PAZO_PHASE_9A_CARE_ARCHITECTURE.md`

Decisión:
- BUILD NOW;
- utilidad individual;
- no depende de masa crítica;
- producto MVP especificado, arquitectado, implementado y validado.

Alcance funcional:
- cuidados persistentes por mascota;
- próximos/hoy/vencidos;
- completar/deshacer;
- historial real;
- edición/eliminación;
- recurrencia simple;
- reminder interno;
- privacidad owner-only.

### Estado técnico final
- PR #12 fusionado a `main`;
- commit de merge: `1876f7f02a452e58597a1c8151af77bc26c519f2`;
- build local aprobado por Product Owner;
- prueba visual/end-to-end aprobada por Product Owner;
- migración 9A aplicada a Supabase y registrada como `20261006054510 care_agenda`;
- `care_items` + `care_completions` reales;
- RLS/grants owner-only aplicados y auditados;
- completar/deshacer/archivar atómicos;
- frontend sin mock de Agenda;
- crear, editar, archivar, completar y deshacer persistentes;
- estados Próximo/Hoy/Vencido;
- historial paginado en bloques de 20;
- reminders internos según `Recordarme` y timezone;
- contador/resumen actualiza en carga, F5, mutaciones y cambio de mascota;
- banner superior reservado a rescate/avistamientos;
- feedback `Completando…` y bloqueo de doble clic en completion;
- pruebas SQL/RLS con `ROLLBACK` aprobadas: owner/non-owner, one-off, recurrencia, double-complete, undo, archive e historial;
- Advisors post-apply revisados sin hallazgos nuevos de seguridad atribuibles a 9A.

### 9B — Documentos privados
**Estado: COMPLETADA**

**Sub-ruta de producto:** `docs/PAZO_PHASE_9B_DOCUMENTS_MASTER.md`  
**Arquitectura técnica:** `docs/PAZO_PHASE_9B_DOCUMENTS_ARCHITECTURE.md`

Gates 0–7 cerrados. Resultado Gate 5: **MVP REDUCIDO**.

Núcleo aprobado: documentos privados owner-only. Compartir externamente queda fuera del MVP y se reevalúa después.

### Estado técnico final
- PR #14 fusionado a `main`;
- commit de merge: `6f833b779ef1a62d7321bc50dbab8c220f92a1d3`;
- build local PASS confirmado por Product Owner;
- prueba visual/end-to-end aprobada por Product Owner;
- tipos reales `PetDocument`;
- mocks `INITIAL_DOCS` y `PrivateDoc` retirados;
- `documentService.ts` y `DocumentsModal.tsx` reales;
- carga inicial, contador, F5, cambio de mascota y paginación reales;
- upload/preview/download/edit/delete reales;
- lifecycle recuperable `uploading/active/deleting`;
- migración base aplicada y registrada como `20261006090551 private_pet_documents`;
- hardening de políticas aplicado y registrado como `20261006090654 fix_private_document_storage_policies`;
- bucket privado `pet-documents` verificado con límite 10 MB y MIME PDF/JPEG/PNG/WEBP;
- wrappers públicos SECURITY INVOKER + helpers privilegiados en `document_private`;
- RLS/grants owner-only verificados;
- upload arbitrario sin reserva bloqueado;
- pruebas transaccionales DB/RLS aprobadas con `ROLLBACK`;
- aislamiento owner/non-owner aprobado;
- Security Advisor sin hallazgos nuevos atribuibles a 9B;
- prueba real de Storage API aprobada: upload, preview, download, edit, delete, F5 y multi-pet;
- bug visual de delete diferido corregido con reintentos de finalize + retiro inmediato de UI + reconciliación en background;
- compartir externamente permanece fuera del MVP.

Se separa de Agenda por mayor superficie de seguridad.

Alcance futuro:
- metadata persistente;
- Storage privado;
- upload;
- preview/descarga;
- categorías;
- URLs firmadas temporales;
- eliminación;
- aislamiento fuerte por propietario.

### No entra
- diagnóstico médico;
- telemedicina;
- recomendaciones clínicas automáticas.

---

## Fase 10 — Mensajería 1 a 1
**Estado: PLANIFICADA**

`MessagesModal` usa conversaciones mock.

### Objetivo
Mensajería persistente entre cuentas/mascotas.

### Alcance
- conversaciones;
- participantes;
- solicitudes;
- aceptar/rechazar;
- mensajes;
- unread;
- timestamps;
- RLS;
- Realtime después de persistencia estable;
- bloqueo básico de abuso.

### Regla
No almacenar mensajes como estado local como fuente de verdad.

---

## Fase 11 — Sistema general de notificaciones
**Estado: PLANIFICADA**

Fase 6 introduce la primera notificación real de rescate. Esta fase generaliza el sistema.

### Alcance
- Follow;
- comentarios;
- mensajes;
- comunidades;
- cuidados;
- rescate;
- unread;
- marcar leída;
- deep links internos;
- preferencias.

### Segunda etapa
- Push Web/PWA una vez estable la bandeja persistente.

---

## Fase 12 — Global Search / Explore
**Estado: COMPLETADA — GATE 8 CERRADO / GATE 9 MEDICIÓN**

### Objetivo
Que “Explorar” encuentre contenido real y navegue a entidades reales, sin prometer capacidades que todavía no existen.

**Sub-ruta activa:** `docs/PAZO_PHASE_12_EXPLORE_MASTER.md`

Gate 0 — auditoría real: CERRADO.  
Gate 1 — valor: CERRADO.  
Gate 2 — coste/dependencias: CERRADO.  
Gate 2.5 — Idea Bank: CERRADO.  
Gate 3 — experimento mínimo: CERRADO sin código adicional.  
Gate 5 — decisión: MVP REDUCIDO.  
Gate 6 — especificación: CERRADO.  
Gate 7 — CERRADO.  
Gate 8 — CERRADO.  
Gate 9 — MEDICIÓN.  
Supabase / build / runtime / Product Owner acceptance: PASS.

### Alcance
- mascotas;
- comunidades;
- lugares;
- eventos si ya existen;
- búsqueda;
- filtros;
- paginación;
- recomendación contextual;
- navegación a perfiles reales.

---

## Fase 13 — Rediseño visual y sistema de interfaz
**Estado: PLANIFICADA**

### Objetivo
Elevar la calidad visual de PAZO sin alterar las funcionalidades ya aprobadas.

Esta fase permite rediseñar pantallas completas o componentes individuales manteniendo intactos sus contratos funcionales.

### Alcance
- auditoría visual completa de todas las pantallas;
- jerarquía visual;
- tipografía;
- espaciado;
- grid;
- márgenes;
- botones;
- inputs;
- tarjetas;
- contenedores;
- modales;
- navegación;
- header;
- tabs;
- estados seleccionados;
- estados vacíos;
- loaders;
- errores;
- feedback visual;
- iconografía;
- sombras;
- bordes;
- radios;
- densidad visual;
- responsive móvil/escritorio;
- microinteracciones y animaciones;
- consistencia entre módulos;
- creación o consolidación de design tokens;
- componentes UI reutilizables cuando reduzcan inconsistencias.

### Regla principal
**Rediseño visual ≠ cambio funcional.**

Durante esta fase:
- no cambiar reglas de negocio;
- no cambiar ownership ni RLS;
- no cambiar contratos de Supabase;
- no cambiar qué hace un botón;
- no eliminar funciones existentes;
- no introducir nuevas funcionalidades sin aprobación explícita;
- no modificar flujos UX funcionales solo porque “se verían mejor”.

Si una propuesta visual requiere cambiar comportamiento, navegación, información mostrada o estructura funcional, debe registrarse como **DECISIÓN PENDIENTE** y aprobarse por separado.

### Método de trabajo
El rediseño debe hacerse por bloques y no como cambio masivo ciego:

1. definir sistema visual base;
2. aprobar componentes principales;
3. rediseñar navegación y layout global;
4. rediseñar Feed;
5. perfiles;
6. Explore;
7. mapa/lugares;
8. cuidados;
9. mensajería;
10. modales y flujos secundarios;
11. estados vacíos/error/loading;
12. revisión responsive y accesibilidad.

Cada bloque se prueba antes de continuar para evitar propagar una dirección visual incorrecta a toda la app.

### Pendientes visuales heredados de Fase 6
- animación de un perrito en estado de alerta al activar/buscar una mascota perdida;
- títulos visuales personalizados para cada tipo de alerta/notificación;
- revisar la presentación final de etiquetas, encabezados y jerarquía visual del sistema de rescate.

Estos puntos son exclusivamente estéticos y no bloquean la funcionalidad de rescate.

### Definition of Done
- todas las pantallas incluidas en Beta siguen una misma línea gráfica;
- no quedan estilos claramente pertenecientes a prototipos anteriores;
- botones, inputs, cards y contenedores tienen reglas consistentes;
- mobile y desktop mantienen buena jerarquía;
- funcionalidades existentes siguen pasando las mismas pruebas;
- no aparecen regresiones de Feed, navegación, formularios o modales;
- Product Owner aprueba visualmente la interfaz final.

---

## Fase 14 — Confianza, moderación y privacidad
**Estado: EN CURSO (planificación/documentación) — Gate 5 CERRADO / Gate 6 CERRADO / Gate 7 CERRADO / Gate 8 NO AUTORIZADO PARA IMPLEMENTAR.** Sigue siendo obligatoria antes de Beta pública.

**Sub-ruta maestra:** `docs/PAZO_F14_MASTER.md` — decisiones D1, D2, D3-A, D3-B, contrato arquitectónico y plan por bloques A0–A4.
**Contrato canónico adicional:** `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`
**Única autorización vigente en Gate 8:** Bloque 00 documental LOCAL (actualizar y verificar documentación); NO código funcional, migraciones, push, merge, deploy ni producción.

### Alcance
- reportar contenido;
- reportar perfil;
- bloquear usuario/mascota;
- ocultar contenido;
- moderación;
- eliminación/cierre de cuenta;
- borrado de mascota;
- manejo de contenido eliminado;
- procedimiento de contenido ilegal/abusivo;
- proceso para copyright/IP/UGC;
- límites básicos contra spam;
- revisión final de datos públicos vs privados vs sensibles;
- política de archivos;
- data inventory;
- retention/deletion matrix;
- procedimiento si PAZO obtiene conocimiento de una cuenta menor de edad;
- Privacy Policy real;
- Terms of Use reales;
- inventario de terceros/proveedores y datos enviados;
- auditoría de tracking/analytics;
- auditoría de RLS completa.

### Regla
No habilitar session replay/autocapture ni recolectar DOB/ID/GPS exacto para analytics por defecto. Cualquier excepción requiere una decisión explícita de privacidad/producto.

---

## Fase 15 — PWA, rendimiento y preparación de Beta
**Estado: PLANIFICADA**

### Alcance
- manifest;
- instalación;
- iconos;
- service worker según necesidad;
- estados offline seguros;
- lazy loading/code splitting;
- reducir bundle;
- imágenes;
- accesibilidad;
- errores y estados vacíos;
- responsive;
- performance;
- Leaked Password Protection cuando el plan/beneficio lo justifique;
- revisión de env/secrets;
- backups;
- restore drill no destructivo;
- logging/error monitoring;
- verificación de PostHog live ingestion/alerts;
- verificación de Vercel/Mapbox usage y spend controls;
- auditoría final de cookies/storage/client identifiers;
- pruebas de producción.

### Definition of Done
La aplicación puede entregarse a usuarios beta sin depender de mocks en el núcleo seleccionado para lanzamiento.

---

# 7. Gate — MVP/Beta

No llamar “MVP listo” hasta que:

- Fases 6 a 15 definidas como requeridas para Beta estén completadas o explícitamente descartadas por Product Owner;
- no existan mocks visibles en funcionalidades incluidas en Beta;
- RLS esté auditado;
- build de producción pase;
- flujo nuevo usuario → mascota → Feed → social → recuperación de cuenta funcione;
- manejo de errores básico exista;
- privacidad esté revisada;
- pruebas reales en móvil estén aprobadas.

---

# 8. Expansión posterior al MVP

Estas funciones pertenecen al concepto original de PAZO, pero no deben entrar automáticamente en una fase sin especificación funcional.

## Fase 16 — Monetización base
**Estado: BACKLOG**

- membresías;
- beneficios;
- PayPal o pasarela definitiva;
- estados de suscripción;
- entitlement backend;
- restaurar compras;
- cancelación;
- fundador/premium.

Antes de implementar, decidir producto y precios.

## Fase 17 — Parejas / Matches de mascotas
**Estado: BACKLOG**

Idea original:
- descubrir perfiles;
- match;
- pago/membresía para funciones premium.

### DECISIONES PENDIENTES
- propósito exacto del match;
- seguridad;
- filtros;
- consentimiento;
- qué parte es paga.

## Fase 18 — Adopciones
**Estado: BACKLOG**

- organizaciones/perfiles autorizados;
- animales disponibles;
- filtros;
- solicitudes;
- estados;
- moderación y verificación.

## Fase 19 — Servicios para mascotas
**Estado: BACKLOG**

- paseadores;
- grooming;
- veterinarias;
- perfiles de negocio;
- panel profesional;
- disponibilidad/citas;
- reseñas;
- verificación.

Debe dividirse en subfases antes de programar.

## Fase 20 — Tiendas / negocios / publicidad
**Estado: BACKLOG**

- tiendas;
- catálogo;
- negocio local;
- anuncios/promoted content;
- herramientas comerciales.

No mezclar e-commerce completo con el MVP social sin decisión explícita.

---

# 9. Deuda conocida / limpieza

No convertir esta lista en una fase automáticamente; resolver cuando corresponda.

- `README.md` sigue siendo el README genérico de Vite.
- `src/data/mockData.ts` todavía alimenta módulos incompletos.
- existe `CreateModal - copia.tsx`, probable archivo duplicado a retirar después de verificar uso.
- `INITIAL_PETS` sigue sirviendo como fallback inicial en memoria; revisar cuando se termine la eliminación de mocks.
- Agenda/Cuidados y Documentos privados son reales y persistentes.
- Messages son mock/local.
- algunos flujos del menú Crear anuncian “próximamente”.
- bundle ya ha mostrado warning de chunk >500 kB; atender en Fase 15.
- Leaked Password Protection pendiente en Supabase Auth.
- Fase 6 cerrada; PR #6 fusionado al completar esta actualización.

---

# 10. Regla de estado de fases

Usar únicamente:

- **COMPLETADA** — merged en main + backend aplicado + pruebas aprobadas.
- **EN CURSO** — se está implementando.
- **SIGUIENTE** — primera fase autorizada para comenzar.
- **PLANIFICADA** — definida pero no autorizada todavía.
- **PAUSADA** — trabajo existente, detenido conscientemente.
- **BACKLOG** — idea futura que requiere definición.
- **DECISIÓN PENDIENTE** — prohibido inventar comportamiento.

---

# 11. Próximo paso exacto

## Fase seleccionada explícitamente

Fase 12 está COMPLETADA y permanece en Gate 9 / medición.
La Fase 14 fue seleccionada por el Product Owner; Gate 5 (MVP REDUCIDO), Gate 6 (scope) y Gate 7 (arquitectura) están CERRADOS. Su alcance y A0–A4 se documentan en `docs/PAZO_F14_MASTER.md`.
Production Hardening continúa EN CURSO de forma separada; no atribuirle cierre.

Otras fases: Fase 13 PLANIFICADA; Fase 10 POSPONER/REEVALUAR; Fase 11 por dependencia concreta. Ninguna obtiene autorización automática.

### Exact next action
Ejecutar y verificar EXCLUSIVAMENTE la consolidación documental local de Gate 8 / Bloque 00, tras comprobar el HEAD y working tree reales. Solicitar autorización independiente antes del Bloque 01. No iniciar implementación por el hecho de haber aprobado el diseño.

## Do not do
- no reabrir Fase 12 salvo regresión o nueva decisión de producto;
- no convertir datos de Gate 9 en features automáticamente;
- no iniciar Fase 13/10/11 automáticamente; Fase 14 no tiene permiso para código, migraciones ni despliegue bajo la autorización A0.


---

# Production Hardening — infraestructura pre-Beta
**Estado: EN CURSO**

**PR #30 / tranche implementado:** MERGED to `main` at `c179182c79c587c7727277a966cc09704002ce10`; Architecture/Privacy Reconciliation PASS; Product Owner validation PASS; governance CI PASS.

Sub-ruta:
`docs/PAZO_PRODUCTION_HARDENING_MASTER.md`

Prioridad:
- P0 webhook PayPal + entitlement seguro;
- P0 retirar pitch prematuro;
- P1 Error Boundary + CI + observabilidad;
- P1 modernizar claves/Auth;
- P1 alertas de salud/costos;
- P2 anti-abuse, ruido operacional, restore drill y analytics.

Esta fase de infraestructura está autorizada por el Product Owner y no constituye autorización para decidir automáticamente precio o beneficios de la membresía.


---

## Actualización operativa 2026-10-08 — MVP hosted-first
- Decisión expresa del Product Owner: suspender temporalmente local-first hasta el lanzamiento oficial; eliminar pasos manuales de descargas/parches en favor de conectores GitHub/Supabase/Vercel, conservando gates, seguridad y autorizaciones de alcance.
- F14 A1: código en rama GitHub `f14/block01-hosted-mvp-20261008` desde respaldo `c4f466f`, sin merge en `main` ni PR #34; Supabase PAZO aplicó migración `f14_account_blocks_hidden_posts` versión remota `20261008112333`; archivo repo `20261008090000_f14_account_blocks_hidden_posts.sql` (versiones distintas, reconciliar).
- Vercel `pazo-app-t83r`: preview Git SHA `62c3f88` READY; despliegue/proción a producción rechazados 403 (scope `digitalapp`). `pazo-app` también generó preview automático por integración, NO se publicó como producción.
- A1 pendiente: desbloquear permisos Vercel del equipo `digitalapp`, desplegar/prometer únicamente `pazo-app-t83r`, comprobar funcionamiento en línea y API directa entre cuentas. No cerrar A1 ni avanzar a A2 mientras falten estas pruebas.


### F14 A2 iniciada — 2026-10-08
Por aprobación explícita del Product Owner, se inició la preparación de **reportes y moderación** en la rama independiente `f14/block02-moderation-mvp-20261008`, sin esperar la publicación bloqueada de Vercel B01. La implementación hospedada de A1 aún no está completamente aceptada. A2 no está implementada en Supabase hosted: SQL propuesto permanece en `supabase/drafts/`, **no aplicado**. El alcance completo exige cinco tipos de denuncia, autoridad y cola privadas, retirada real de API y medios públicos de Storage; su evidencia de seguridad, permisos iniciales y aprobación visual siguen pendientes. No iniciar A3/A4 automáticamente.


### F14 A2 — activación de backend hospedado (2026-10-08)
La migración `f14_reports_moderation` se aplicó a Supabase PAZO, versión real `20261008120333`. Cinco políticas restrictivas implementan retirada a nivel API; `moderation_private` contiene registro privado de denuncias, concesiones de moderador, decisiones y restricciones. **No hay moderadores asignados ni contenido retirado**. La Edge Function de limpieza existe con JWT y código inerte que devuelve 503, sin borrar archivos. La versión de purga propuesta reside solo en `supabase/drafts/`, no en la ruta de funciones desplegables. A2 continúa abierto hasta pruebas API, primer moderador autorizado, validación de almacenamiento/CDN y aceptación UI; publicación Vercel diferida. A3/A4 sin permiso.


### F14 A2 — rol inicial asignado
La cuenta verificada `appdigital.corp@gmail.com` recibió por autorización explícita del PO la única concesión de moderador PAZO en `moderation_private.moderator_grants` del proyecto hospedado. Verificación: 1 moderador, 0 otros, 0 denuncias y 0 restricciones de contenido. No añade permisos de administrador a GitHub, Vercel ni Supabase; limpieza Storage desactivada. Restan pruebas de seguridad API, UI preview y retiro de medios antes de cierre de A2. El PO mantiene aplazada la publicación oficial de Vercel.


### Gate F14 A2 — Seguridad de reportes/roles parcialmente validada
Pruebas hospedadas de contexto SQL (revertidas): PASS para permisos de moderador único, denegación a cuenta estándar y anon, lectura social pública legítima y validación de los cinco tipos de reporte con objetivos inexistentes. **No probaron JWT reales ni reportes efectivos**. Auditoría RLS halló falta de verificación explícita de visibilidad del post padre al consultar comentarios: borrador de corrección en `supabase/drafts/20261008_f14_comment_parent_guard.sql`, dry-run SQL PASS, **no aplicado**. Requiere aprobación del PO y nuevas pruebas antes de cerrar A2. Storage DELETE sigue deshabilitado.


### F14 A2 — RLS comment parent fix applied / verified
PO approved and hosted Supabase applied `f14_comment_parent_guard` (version `20261008122907`). Both policies are restrictive and require a SELECT-visible parent post. SQL role simulations, anonymous/authenticated read smoke, transactional Feed post withdrawal and pet profile withdrawal (including a third-party comment) PASS. Transient restrictions rolled back; no reports or real withdrawals created. No Community comments existed to run a data-driven scenario; keep that test open. Media purge still in disabled stub, Vercel production deferred, A2 open until signed JWT API and complete moderation functionality are checked. A3/A4 not authorized.


### F14 A2 — Audit of existing column permissions (2026-10-08)
A proposed rescue grant migration was **cancelled as unnecessary** after discovering intentional column-specific grants to `authenticated` despite `has_table_privilege=FALSE`. Verified via reversible SQL as `authenticated`: own pet, RPC `create_community`, membership, Feed and Community posts/comments succeed; cross-owner pet updates and private columns are denied. Zero synthetic records remain. **No production permission changes were made.** HTTP/JWT and UI tests still pending, Storage disabled, A2 open. No A3/A4 approval.


### F14 A2 — approved live report test closed and cleaned (2026-10-08)
A real-user-session Preview report was successfully dismissed through the moderator queue, hosted Supabase status and action audit verified. All explicitly identified trial pet, post, report, action and same-owner impression records removed after dependency audit and reversible dry-run; exact post-delete counts zero. No production Vercel deployment, no other user records changed. Backend moderator permission still active. A2 remains open for independent JWT denial, real depublishing tests and protected media/CDN purging procedure (currently intentionally disabled). A3/A4 not yet authorized.


### F14 A2 — Live depublish validation completed (2026-10-08/09 UTC)
Real Preview moderator action `Despublicar` -> SQL `status=removed` + action audit + RLS restriction PASS. Anonymous and authenticated SQL role tests confirm removed post invisible; other posts visible. PO-authorized exact trial pet/post/report/action/restriction/impression cleanup succeeded after guarded ROLLBACK dry-run; zero trial records, zero total reports/restrictions, 1 moderator, 14 posts and 5 pets persist. No images, no Storage mutations. **Backlog: no-media content currently receives spurious `pending_review` media status**; correct with separate approved migration before broader rollout. Independent non-moderator real signed JWT tests and media Storage/CDN remain open; A3/A4 not authorized.


### F14 A2 — phantom media queue fix staged (2026-10-08)
Prepared and SQL rollback-tested presence-aware media classification on `f14_review_report`; text-only Feed/Community posts would not become false media-review tasks, but profile media review remains conservative. Versioned draft and five-case reversible suite, along with matching moderator UI messaging, are on A2 branch. **Await separate PO authorization before Supabase apply**; no Storage purge or Vercel production. A2 open.


### F14 A2 — no-photo media classification applied (2026-10-09)
After explicit PO approval, migration `f14_media_status_presence_guard`, server `20261009010551`, updated `f14_review_report` so text-only Feed/Community posts do not become pending media deletion tasks; photo-bearing content remains queued, pet profiles stay conservatively queued. Five-case hosted-function rollback validation PASS. SQL is now canonical at `supabase/migrations/20261009010551_f14_media_status_presence_guard.sql`, no longer a draft. No Storage deletion or production deployment. A2 pending independent JWT validation, Storage/CDN safety and retention policy.


### F14 A2 — Media deletion secure-draft gate (2026-10-08)
Audit + V2 draft only: proof-driven path inspection for current and verified legacy Feed photos, Community media, and conservative pet avatars; 30+ local synthetic Node cases and a genuine JWT read-only test script staged. Actual signed JWT test needs securely injected independent user session and has NOT PASSED. No delete/claim/confirmation RPC implemented, no production deploy; Edge stays 503. Request new PO gate before metadata/claim migration and separate gate before irreversible Storage removal. Full plan: supabase/drafts/f14_media_purge_v2/README.md. A2 open, A3/A4 unauthorized.


### F14 A2 — preflight/claim reversible Gate (2026-10-08)
Draft private claims table + object fingerprint/id/lease, service-only prepare/recheck and audit, current/legacy Feed and Community path proofs, SQL transactional revalidation. Multiple BEGIN/ROLLBACK tests PASS, no objects or schema persisted. Claim is a candidate, NOT permission to delete; user/JWT HTTP, cross-service race-safe CAS confirmation, real Storage API verification/CDN and D3-B remain future gates. SQL draft `supabase/drafts/20261009_f14_media_claim_preflight.sql`, separate PO approval before hosted apply. Edge 503 unchanged; A2 open, A3/A4 not authorized.


### F14 A2 — preflight media claims applied (2026-10-09 UTC)
Hosted PAZO migration `f14_media_claim_preflight` version `20261009014616` applied under PO authorization; canonicized in git. Private claim/event tables, service-only preflight and recheck, five-minute expiring candidate lease, no deletion or purged status. Live backend trials with BEGIN/ROLLBACK PASS; four existing confirmed nonmoderator accounts make independent role testing possible without new Auth users, but genuine signed JWT test STILL PENDING user session access. Blocks: Storage object CAS / deletion confirmation, CDN, D3-B. 503 Edge remains blocked. A2 not closed.


### F14 A2 — two browser role screenshots, strict QA retest required (2026-10-08 local)

PO provided two authentic-session UI PASS screenshots (normal / moderator), with moderator actions visible. Original test flaw found: any RPC failure wrongly counted as permission denied. Preview-only diagnostic patched to require specific SQLSTATE `42501` for denied queue/media/preflight claims; account type is displayed. Updated tests needed on both sessions before declaring complete signed-JWT HTTP authorization. No production deployment, Storage DELETE or other backend mutations.


### F14 A2 — strict browser permission tests passed (2026-10-08 local)
PO submitted normal-account and moderator-account Preview screenshots, both **6/6 PASS** after UI verifier was hardened to require PostgREST SQLSTATE `42501` for forbidden actions; role correctly displayed in both. Mark **real-session browser permissions PASS**, while independent raw signed JWT runner and Storage deletion audits remain separate and unexecuted. DB check 0 claims/events/reports/restrictions, 1 moderator, 20 Storage objects; deployed Edge still 503. Next gate: prove exact-object lifecycle/Storage concurrency with isolated bytes, strong claim-bound confirmation and CDN/retention plan. A2 open. Do not delete media, merge main or deploy production.


### F14 A2 — Held media Storage RLS protection applied (2026-10-09 UTC)
Supabase migration `20261009040957_f14_storage_held_media_guard` adds two RESTRICTIVE authenticated INSERT/DELETE policies covering only active claimed paths in `post-photos` or `community-post-photos`, preserving existing grants and permissions. Held/unheld/expired synthetic cases PASS with ROLLBACK. 20 existing objects untouched; 0 claims. Adds defense in depth but DOES NOT solve service_role or HTTP race, so no automatic deletion. A2 open, Storage/CDN and D3-B still pending.


### F14 A2 — next real-user Storage test staged (2026-10-09)
Preview-only opt-in F14StorageProbe creates one unique synthetic 1px image in the signed-in user's post-photos folder, checks its metadata via Storage API, removes only that synthetic fixture, then confirms absence; interrupted cleanup can be retried without uploading a second test file. Requires PO visual action; must not be called a completed live test until screenshot. Does not enable moderated image purge or certify CDN/cache CAS. A2 open.


### Checkpoint handoff compacto F14 A2 — 2026-10-08
Snapshot actual: `docs/PAZO_ACTIVE_HANDOFF.md` (historial completo movido a `docs/archive/PAZO_ACTIVE_HANDOFF_THROUGH_20261009.md`). Rama `f14/block02-moderation-mvp-20261008`, HEAD observado antes del handoff `2e6dd13`, CI ambos PASS. Migración de hold sobre rutas `20261009040957` aplicada, zero claims/reports/restrictions, 1 moderador y 20 Storage objects al auditar. Dos cuentas Auth real 6/6 PASS en permissions. Prueba visual **pendiente**: botón `Crear, verificar y limpiar archivo de prueba` en Preview-only F14StorageProbe. No suponer que build PASS equivale a ejecución del botón; no activar purga real 503, no merge a main y no cerrar A2. Leer handoff para el siguiente paso y autorización.


### F14 A2 — Gate RLS UPDATE/TTL/recheck fail-closed, 2026-10-08

- Prueba aislada `F14StorageProbe` con imagen artificial de 1 píxel: **PO visual PASS**; post-verificación Storage: 0 archivos `f14-storage-probe-*`, 20 objetos restantes. No repetir.
- Tres pruebas RLS en Supabase hospedado con `BEGIN/ROLLBACK`: estructura del `UPDATE` restrictivo PASS; reproducción de fallo real de protección que caduca a los 5 minutos PASS; candidato que mantiene `held` tras vencimiento y no auto-invalida en recheck de expiry/drift PASS. Sólo objetos/metadatos sintéticos, sin bytes ni borrado.
- Límite comprobado: `service_role` bypass RLS incluso con `held`. **No se ha demostrado CAS entre PostgreSQL y Storage API**; no autorizar purga automática o invocar `f14_confirm_media_cleanup`.
- Único borrador para próxima autorización expresa: `supabase/drafts/20261009_f14_storage_held_media_update_guard.sql` — helper de bloqueo `held` sin liberación por TTL, regla `RESTRICTIVE UPDATE` y `f14_recheck_media_claim` fail-closed. **NO APLICADO** en producción. No cambia planes, archivos, retention D3-B, CDN, ni función Edge 503.
- Estado DB después de pruebas: Storage 20, claims 0, reports 0, restrictions 0, política UPDATE nueva ausente, helper/recheck productivos siguen originales. F14 A2 **Gate 8 ABIERTO**. PR #34/main y F14 A3/A4 sin cambios.
- Vercel marcó `failure` por **build-rate-limit** tras commits; no inferir compilación. Sin aprobación de upgrade. `npm run verify` del HEAD actual pendiente.
- **Next exact gate:** permiso expreso PO antes de apply de la migración acotada, después pruebas RLS/rol/grants y auditoría del bypass service-role / API MOVE-COPY-UPSERT y operaciones en vuelo. Purga seguirá 503 hasta prueba independiente y gate de eliminación específico.



### F14 A2 — checkpoint alojado después de aprobación de hardening

La migración exclusivamente defensiva **`20261009054411_f14_held_media_fail_closed_recheck_update_guard`** fue aprobada y aplicada en Supabase PAZO. Conserva rutas reservadas `held` bloqueadas pasada la expiración, añade política `RESTRICTIVE UPDATE` y evita invalidaciones automáticas de `f14_recheck_media_claim`. Migración Git canónica versionada. Sin Storage DELETE, sin activar Edge, sin cambio de plan, sin merge ni lanzamiento.

SQL/RLS transaccional post-apply PASS para UPDATE held/free/expirado, recheck/drift, grants, INSERT held/free y lectura `anon`/auth de medios públicos. El SQL DELETE directo fue rechazado por protección del proveedor; prueba de DELETE real por Storage API aún no realizada. Recuento: 20 objetos Storage y 0 claims/reportes/restricciones. Edge `f14-moderation-purge` sigue stub HTTP 503.

El test de precondiciones `COPY` detectó que una ruta held pública continúa SELECT-visible y la copia a ruta libre podría estar permitida según permisos SQL; **COPY HTTP no probado**, no confundir la defensa RLS con revocación de URLs públicas. Riesgo service-role/carreras entre API y DB sigue abierto. Recuperación de claims requiere protocolo explícito, no liberación automática por TTL. Documento: `supabase/drafts/f14_media_purge_v2/HELD_CLAIM_RECOVERY_AND_COPY_AUDIT.md`.

**Siguiente:** auditoría de escritores privilegiados y MOVE/COPY/UPSERT con fixtures aisladas, diseño fail-closed de recuperación/confirmación+CDN; detenerse ante eliminación irreversible o nuevo gate de producto/visual. F14 A2 Gate 8 sigue ABIERTO; F14 A3/A4 sin autorización, `main` y PR de Lugares no alterados.


### F14 A2 — seguridad COPY + confirmación exacta pendiente (checkpoint 2026-10-09 UTC)

Por autorización técnica PO, dos migraciones adicionales **aplicadas a Supabase PAZO** con sus SQL canónicos:

- `20261009055801_f14_held_media_copy_source_operation_guard`: deniega `SELECT` de origen `held` a `authenticated` solo para COPY REST/S3, preservando lecturas ordinarias. Pruebas reversible e instalada PASS para varios nombres de operación y lectura de control. No simula tráfico HTTP real ni evita descargar la URL pública.
- `20261009055955_f14_disable_unverified_media_purge_confirmation`: función antigua `f14_confirm_media_cleanup` deshabilitada para todos, incluyendo `service_role`, para que no marque `purged` sin evidencia objeto/versión. Rollback e instalado PASS.

Backend post-apply: 20 objetos intactos, claims/reportes/restricciones cero, Edge desactivada HTTP 503. F14 A2 **Gate 8 ABIERTO** hasta serialización de escritores privilegiados, recuperación segura de holds, CDN/D3-B, HTTP QA aislada y confirmación de eliminación exacta. A3/A4, `main` y publicación oficial intactos. CI último HEAD no certificado, Vercel rate-limit histórico.


### F14 A2 — seguridad efectiva, revisión manual operativa (2026-10-09 UTC)

Después de migraciones `20261009054411`, `20261009055801` y `20261009055955`, Supabase aplicó **`20261009061213_f14_reject_unverified_purged_status`**: trigger de restricciones prohíbe `media_status='purged'` sin protocolo seguro. Ensayos DDL reversibles y sobre trigger instalado PASS. Storage 20 intactos, claims y restricciones 0. Código y test canónicos en repositorio.

UI moderadora A2 corregida: retiró el botón que invocaba la purga HTTP 503 y sus falsas señales de éxito; ahora expresa `revisión manual pendiente`, no confirmación de eliminación, con recarga de cola de solo lectura. Regla estática nueva prohíbe regresión a la invocación de la Edge destructiva. TSX transpila sin errores de sintaxis en comprobación aislada, sin afirmar `npm run verify` o prueba visual.

**Gate siguiente:** recuperar capacidad de compilación/Preview gratuito, `npm run verify` y prueba visual PO de la cola de revisión; auditoría restante de carreras reales service-role/Storage, recuperación de claims y CDN/D3-B. No habilitar purga que no puede certificar el objeto/version; conservar revisión manual como comportamiento seguro. A2 **ABIERTO**, A3/A4 y main no alterados.


### F14 A2 — PR draft y CI PASS

GitHub PR #35 DRAFT creado, no merge. Workflow CI `37892668372` sobre `da619f9`: SUCCESS (governance + build + lint legacy no bloqueante). Vercel todavía limita nuevas compilaciones.

Supabase `20261009061213_f14_reject_unverified_purged_status` aplicada: bloquea confirmación `purged` no sustentada; pruebas SQL reversibles antes/después PASS. Nueva UI de medios en revisión manual, retirando botón de eliminación no operativo. A2 sigue abierto hasta aprobación visual de nuevo panel y decisión sobre limitación de eliminación física/CDN. No A3/A4 ni merge.


### F14 A2 — validación visual de revisión de medios aceptada (2026-10-09)

El PO compartió captura real de `Revisión de archivos` en Vercel Preview `a650dd8`, validación visual PASS: mensajes correctos, cola vacía, botón de actualizar y ausencia de acción destructiva. No implica prueba de refresco ni de una cola con registros. No repetir esta pantalla ni Auth/Storage sintético ya validados.

Reconciliación Gate 8 documentada en `docs/PAZO_F14_A2_SCOPE_CLOSURE.md`. D3-A continúa requiriendo borrado verificable en origen/Storage cuando procede: esta UI de revisión manual no cierra A2 sin resolver las garantías de concurrencia, identidad objeto/version y CDN, o sin modificación explícita del alcance por PO. PR #35 sigue DRAFT, no merge, A3/A4 no autorizados.


### F14 A2 — prueba de eliminación por versión exacta preparada

Nueva pista verificada en documentación Supabase: selector `versionId` para versión actual o archivada. Inspector de preflight puro y suite en CI; nuevo panel de QA Preview solo de píxel sintético y acción explícita (prueba de versión equivocada + exacta). **La prueba Auth/HTTP nueva aún requiere PO**, distinta de la prueba Storage ya aprobada. Ninguna imagen de usuarios ha sido modificada. F14 A2 continúa abierto por concurrencia `service_role`/HTTP, CDN y DoD D3-A; PR #35 DRAFT, sin fusionar `main` ni iniciar A3/A4.


### F14 A2 — Pruebas de expediente positivo con rollback, gate de integración pendiente

El usuario autorizó continuar autónomamente el trabajo técnico para completar F14, **sin suponer pruebas ni garantías no demostradas**. Se ejecutaron en Supabase PAZO fixtures transaccionales sintéticos para Feed y Comunidad, con `BEGIN/ROLLBACK`: consulta de evidencia `hosted_claim_evidence_readonly.sql` PASS con post/report/claim/objeto metadata y re-probe coincidentes; al quitar las referencias a imagen de la publicación la revalidación devolvió JSONB null y el contador de ruta de Comunidad descendió a 0. No quedaron datos persistentes ni bytes de prueba. Regresiones Node adicionales para fuente ausente y transacción compatible con `FOR SHARE`; CI run `37902465901` SUCCESS en `ce5c0b2`. El fixture SQL largo no pudo guardarse en GitHub por un control de seguridad del conector, así que la evidencia alojada no equivale a CI SQL reproducible.

**Bloqueo de arquitectura confirmado:** el backend habitual `service_role` no tiene `USAGE` en `moderation_private`, correctamente. Requeriría una interfaz de lectura limitada a servicio, con autorización y pruebas de permisos, no abrir el esquema. Intentar preparar una RPC de lectura en GitHub fue bloqueado por controles de seguridad del sistema; no se eludió ni instaló. Se mantuvieron 20 objetos Storage, cero reservas/reportes/restricciones, purge Edge 503, estado `purged` protegido. El Preview nuevo de `F14VersionProbe` aún no está disponible por cuota de Vercel. **Gate 8 y D3-A siguen ABIERTOS**; no declarar F14 completada, no pasar a implementación A3/A4 sin cerrar A2, no main/Production/upgrade/borrado real.
