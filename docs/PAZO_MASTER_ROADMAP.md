# PAZO — Hoja Maestra de Desarrollo

**Documento canónico del proyecto.**  
**Última actualización:** 2026-10-07  
**Estado general:** Fase 12 Global Search COMPLETADA / Gate 9 medición. Production Hardening ocupa temporalmente el Carril de Implementación por riesgo operativo pre-Beta.

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
ChatGPT trabaja directamente sobre GitHub y Supabase:
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
**Estado: OBLIGATORIA ANTES DE BETA PÚBLICA**

**Contrato canónico adicional:** `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`

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

## Selección del siguiente módulo

Fase 12 está COMPLETADA y pasa a Gate 9 / medición.

No existe un siguiente módulo autorizado automáticamente.

Candidatos conocidos:
- Fase 13 — Rediseño visual y sistema de interfaz: PLANIFICADA;
- Fase 14 — Confianza, moderación y privacidad: OBLIGATORIA antes de Beta pública;
- Fase 10 — Mensajería: POSPONER / REEVALUAR;
- Fase 11 — Notificaciones generales: implementar por dependencia concreta.

### Exact next action
Seleccionar el siguiente módulo mediante `docs/PAZO_MODULE_LIFECYCLE.md` antes de implementar.

## Do not do
- no reabrir Fase 12 salvo regresión o nueva decisión de producto;
- no convertir datos de Gate 9 en features automáticamente;
- no iniciar Fase 13/14/10/11 por numeración sin decisión de producto.


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

## Checkpoint vigente — QA local del MVP 2026-10-09

**Evidencia posterior a los párrafos históricos de roadmap.** El PO abrió PR #36 commit `b49ecd3` en Antigravity/localhost (frontend local, Supabase alojado) y declaró PASS en login/pantalla de recuperación, Feed/paginación, mensajes honestos, publicación, interacciones y comentarios con F5, perfiles/follows; además confirmó funcionamiento general de todos los módulos. Ver `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md` para alcance y límites. Esto **cierra el smoke funcional local, no Gate 8 de F14 ni el Release Gate público**.

**Ruta crítica ahora:** no repetir módulos; verificar PR #36/CI actual, gestionar merge solo con autorización PO, validar email real de Auth, resolver mínimo operacional F14 de reportes/eliminación y textos legales, evitar regresión de Mapa dev-only en PR #35 y obtener artefacto de release cuando sea viable sin upgrade Vercel. No abrir fases 10/11/13 por defecto.

**Regla visual firme:** cero contornos en componentes (única excepción justificada en fields de texto), incluso en estados de foco; espaciado login queda para revisión visual futura, no blocker funcional. El PO conserva modificaciones F14 sin commit en su carpeta local original; conservarlas.

**Situación GitHub al checkpoint:** `main` `ae7e63f`, PR #36 DRAFT (sin merge), PR #35 DRAFT (F14 pausada), PR #34 OPEN (rollout Lugares). La comprobación de funcionamiento local no implica que esos PRs estén listos para integrar ni que la beta pública esté autorizada.

## Actualización F14 — integración acotada hacia Beta, 2026-10-09

PR #37 (DRAFT) **no cierra Gate 8**. PR #36 fue aceptado funcionalmente en local y es base de integración. PR #37 reutiliza las RPC de reportes y colas moderadoras ya aplicadas a Supabase alojado para conectar cinco clases de denuncia a UI, sin fusionar PR #35 (F14 A2 avanzada) ni reintroducir su guard `import.meta.env.DEV` que altera el Mapa real. CI `37944094738` SUCCESS en commit `eda27bc`; QA real de reportes pendiente.

**Bloqueadores de release siguen**: retirada de medio físico/Storage/CDN D3-A; ruta íntegra de eliminación cuenta/mascota A3; matriz D3-B y textos públicos A4; confirmación/recovery email real; reconciliación de PR #34 de Lugares y PR #35 sin desactivar funciones históricamente aprobadas. No cambiar scope aprobado por llamarlo «mínimo» ni equiparar botones visibles con seguridad verificada. Ningún gasto, merge, migración ni despliegue autorizado por este checkpoint. Ver `docs/PAZO_F14_BETA_REPORTING_PILOT_20261009.md`.

## Checkpoint F14 A3 (2026-10-09) — preparación autorizada, no aplicación

El PO autorizó creación de código y migraciones como borradores. PR #38 DRAFT prepara el **intake** de solicitud de cierre de cuenta, resumen de dependencias, consulta de estado y cancelación si no ha empezado procesado; protegido por un flag frontend OFF por defecto. SQL privado con RLS, grants, auditoría, 4 RPC y excepción `DO ... RAISE` explícita para impedir aplicación accidental. Tests + CI inicial PASS. **No hay worker de eliminación, ni integración de Storage/CDN/archivo de terceros/Auth; Gate 8 A3 permanece abierto**.

Leer `docs/PAZO_F14_A3_IMPLEMENTATION_DRAFT_20261009.md` y `docs/PAZO_F14_A3_DELETION_PREFLIGHT_20261009.md`. D3-A y A4 siguen siendo dependencias de beta. No confundir documentación PR o UI desactivada con entrega pública ni autorizar merge / SQL sin gate.


## F14 A3.2 — snapshot privado de aportaciones ajenas DRAFT 2026-10-09

- PR #38 contiene **dos migraciones en `supabase/drafts/`**, NO aplicadas, ambas con `BEGIN` + `DO RAISE EXCEPTION` antes de cualquier DDL para impedir aplicación accidental.
- Segundo borrador `20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql` crea tablas privadas para tombstone de Feed, posts ajenos de comunidad y comentarios de otras cuentas; snapshot idempotente, solo server-role, devuelve explícitamente `ready_to_delete_auth=false` y `ready_to_delete_media=false`; corta si detecta medios de comunidad sin migración verificada. **No elimina registros ni realiza Storage delete**.
- Checkpoints de CLI/CI: GitHub Actions `37953010063` **SUCCESS** en commit `cf333380d7de63a0dc8dd13ccd11c8eaed7cbd96`. Más adelante comprobar el SHA documental nuevo. 5 tests de estados/errores + pruebas estáticas de migraciones, además de tests del MVP.
- **A3 sigue ABIERTA:** falta worker que congele escrituras concurrentes, adapte FK/RLS de comunidades, garantice comprobación de archivo/medios y recuperación, reautenticación de backend, borrado físico Storage/CDN y Auth al final; no ejecutar scripts en Supabase sin gate explícito. El usuario autorizó código DRAFT, no apply/merge/deploy.
- La experiencia del usuario normal no cambia: `VITE_F14_A3_REQUESTS_ENABLED` OFF por defecto. No pedir prueba de borrar cuenta ni activar el flag hasta disponer de backend y aprobación.

## F14 A3.4a — coordinator/worker lease DRAFT y QA de concurrencia (2026-10-09)

- PR #38 contiene `src/features/account/deletionCoordinator.ts` (inspector puro de 12 condiciones, **destructiveExecutionAllowed=false en todas las situaciones**, secuencia propuesta sin llamadas a Storage/Auth/SQL) y pruebas de cada omisión, string truthy y lease expirado/versionado. No se usa para autorizar operaciones en navegador.
- Tercero SQL DRAFT `supabase/drafts/20261009_f14_a3_worker_lease_NOT_APPLIED.sql`: lease exclusivo/versionado para servicio, `SELECT ... FOR UPDATE`, CAS, duración 5–60s, validación y liberación; **sin borrado, sin alterar status, sin activar worker**. Una cuenta normal no recibe tokens ni grants; requiere status `reviewing` que todavía no se establece por ningún worker.
- CI del código `991fb7b9` GitHub Actions `37953868080` SUCCESS (después de reparar expectativa de test). CI del SQL `bf1610f3` run `37954129413` SUCCESS. Se añadió clasificación del archivo privado y tokens de lease en `docs/PAZO_DATA_INVENTORY.md`.
- Próximo gate técnico: integración de reautenticación desde servidor, bloqueo efectivo de writes y protección de FK; D3-A Storage/CDN permanece blocker. Ningún SQL aplicado, ninguna cuenta/pet/archivo borrado, ni merge o despliegue, ni gasto.

## F14 A3.4b — write fence / FK D2 proposal, 2026-10-09

- PO continúa autorizando **solo código y migraciones DRAFT**, no DB apply, merge, deploy, eliminación ni gastos. PR #38 sigue DRAFT / feature flag `VITE_F14_A3_REQUESTS_ENABLED` OFF.
- Inventario Supabase **READ ONLY** de propietarios/FKs/triggers/RLS: las tablas públicas de comunidades, posts, seguidores, cuidados y documentos tienen relaciones con Auth y mascotas, algunas `ON DELETE CASCADE`. `community_private.ensure_owner_membership()` actualmente rechaza comunidad sin dueño incluso archivada; esta dependencia fue inspeccionada directamente.
- Migración DRAFT `supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql` con aborto SQL transaccional, guard de BEFORE INSERT/UPDATE/DELETE sobre **11 tablas** (post/comment/mascota/comunidad/membresía/follows/cuidados/documentos) y chequeo owner de fila vieja/nueva/relaciones; locks transaccionales ordenados. **Cobertura incompleta**: aún faltan interacciones, rescatistas, check-ins, QR, Storage API, RLS/RPC especiales, Auth y un cambio de estado atómico que use los mismos locks. Ningún trigger aplicado.
- Migración DRAFT `supabase/drafts/20261009_f14_a3_community_fk_NOT_APPLIED.sql` prepara `communities.owner_user_id` nullable únicamente para `archived`, `ON DELETE SET NULL` a Auth, ajuste de constraint trigger de membresía, y `RESTRICT` para FKs de autor de `community_posts`. **NO aplicar:** puede cambiar reglas de borrado de mascotas/usuarios; requiere pruebas en DB aislada y revisión de views, RPC y medios. No borrado de contribuciones ajenas.
- Contratos detallados `docs/PAZO_F14_A3_WRITE_FENCE_20261009.md` y `docs/PAZO_F14_A3_COMMUNITY_FK_PROPOSAL_20261009.md`. Tests estáticos/versionado en `scripts/f14-a3-draft.test.mjs`; código de cambios no ejecuta ninguna eliminación ni SQL en remoto.
- Próximo trabajo: ampliar matriz de cobertura, diseñar transición server-only al estado de congelación usando locks compatibles, pruebas aisladas de FK/RLS e integrar D3-A/Storage. **A3 sigue abierta**, no prometer eliminación real de cuentas.

## A3 — checkpoint de cierre técnico sin activación, 2026-10-09

PO pidió terminar desarrollo. Se reparó un SQL inválido de `f14_a3_worker_snapshot_contributions` y se añadió validador de delimitadores en todos los SQL DRAFT; CI #37956473862 SUCCESS. `src/features/account/mediaManifest.ts` + pruebas negativas verifican rutas de Storage, propiedad, objetos compartidos, concurrencia y evidencia de CDN; devuelve `deletionAuthorized=false` en todos los casos; CI #37956829331 SUCCESS.

**No confundir esto con un trabajador físico de eliminación**. Sigue SIN implementar lo señalado en `docs/PAZO_F14_A3_RELEASE_GATE_20261009.md`: SQL aislado, transición worker, reauth backend, freeze total, archivo/retención E2E, D3-A Storage/CDN, Auth final, políticas y release. La UI A3 permanece OFF; PR #38 DRAFT y branch `main` intacta. No pedir al PO borrar ninguna cuenta con esta versión.

## 2026-10-09 — Hosted SQL QA read-only A3

- PO autorizó pruebas SQL controladas/reversibles, NO ejecución de migraciones ni eliminación.
- Se probaron en Supabase transacciones READ ONLY con ROLLBACK: 6 cuentas, 1 post ajeno en comunidad, 6 comentarios Feed ajenos y 1 documento privado. La única comunidad bloqueada por media; 5 comentarios JSON legacy en 3 posts; 13 posts Feed con foto, 2 posts de Comunidad con foto, 6 perfiles de mascota con foto.
- Preflight mejorado detecta media/legacy y bloquea 5 de 6 cuentas hasta revisión. SQL de snapshot falla cerrado ante comentarios JSON de autoría no reconciliada. Conteo CASE sobre JSON no-array probado por SELECT real. PR #38 código + tests CI #38002029845 PASS.
- FKs reales peligrosas 5/5 coinciden; anon carece de SELECT de communities; authenticated sin JWT no ve comunidades; no existen tablas ni RPC A3. Ningún DDL/DML ni Storage/Auth write remoto.
- Evidencia completa: docs/PAZO_F14_A3_HOSTED_READONLY_QA_20261009.md. Queda pendiente DDL/pgTAP en sandbox y todo el worker; Gate A3 abierto, sin merge/deploy y feature flag OFF.

## 2026-10-09 — F14 A3 PostgreSQL TEMP QA (reversible y sin apply)

- PO autorizó pruebas SQL reversibles en Supabase hospedado. Se probaron funciones de intake/estado/cancelación, worker lease/CAS, snapshot de aportes de terceros, write fence y FK de comunidad **adaptadas a pg_temp**, con datos exclusivamente sintéticos y `BEGIN ... ROLLBACK`. Ver `docs/PAZO_F14_A3_TEMP_PG_QA_20261009.md`.
- PASS: idempotencia de solicitudes (2 jobs históricos/1 activo), lease versión 3/rechazo de claim simultáneo, archivo privado 1 post/2 comentarios/1 tombstone, bloqueos al detectar media/legacy, write fence de posts y comentarios ajenos, transición de comunidad archivada sin perder post ajeno.
- SQL DRAFT `f14_a3_write_fence` extendido de **11 a 14 tablas** añadiendo `interactions`, `community_post_likes`, `pet_place_checkins`. Pruebas TEMP verificaron 3 rechazos y 1 acción no relacionada permitida. Código CI `38002952300` PASS.
- Verificación post-QA: Supabase alojado mantiene 6 cuentas, 6 mascotas, 1 comunidad, 20 objetos; jobs/leases/RPC A3 ausentes. **No hay migraciones A3 aplicadas, ni borrado Storage/Auth ni cambios a contenido real.**
- **Pendiente crítico**: DDL completo en sandbox aislado, concurrencia entre 2 conexiones, rutas residuales de escritura, worker operativo/reautenticación/Storage/CDN/retención/Auth final. No activar A3 ni fusionar PR. Estas pruebas no certifican seguridad JWT/RLS de nuevos objetos.

## 2026-10-09 — F14 A3 review worker + durable CAS journal DRAFT

- Nuevo motor `supabase/functions/f14-a3-account-deletion/worker.ts` + adaptador RPC `adapter.ts`, sin Edge entrypoint/deploy: revisión con evidencias server-only, lease revalidada antes/después de gates, check de estado reviewing, reintentos seguros, sanear errores y nunca autorización irreversible. Cuando faltan verificadores, retorna blocked.
- Nueva sexta migración bloqueada `supabase/drafts/20261009_f14_a3_worker_checkpoint_NOT_APPLIED.sql`: RPC service_role y journal privado CAS/versiones y eventos mínimos; no content DELETE.
- SQL real **TEMP + ROLLBACK**: 2 eventos de journal en revisión 2, rechazo de tokens viejos y revision 0 repetida; sin objetos permanentes. CI motor #38003551960, checkpoint #38003843415 y adaptador #38003932473 SUCCESS. Un primer CI falló por ruta de test inválida y fue corregido antes del checkpoint final.
- Evidencia/alcance: `docs/PAZO_F14_A3_WORKER_REVIEW_20261009.md`. **Worker destructivo NO construido**, aun sin sesión reciente JWT real, all-writes freeze, paths exactos Storage/CDN, Auth final ni E2E. A3 permanece abierta y UI OFF. PO no autorizó migraciones ni despliegue.

## A3.4d — Internal HTTP review runner disabled (2026-10-09)

- PR #38 agrega `http.ts`, `index.ts` y pruebas para invocación interna de revisión. HTTP requiere token de servicio secreto, body JSON limitado, no CORS y no expone operaciones físicas. `supabase/config.toml` mantiene la función `enabled=false`, `verify_jwt=true`; además runtime exige PAZO_A3_REVIEW_WORKER_ENABLED=true, ausente por defecto. Ningún Edge desplegado.
- Backend de revisión no dispone aún de verificadores externos aprobados; el adaptador retorna missing_evidence por defecto y no existe eliminación física. Las nuevas variables de entorno y coste de despliegue NO se han configurado ni solicitado.
- Cambios bajo Gate A3 DRAFT; F14 sigue ABIERTA. Evidencia ampliada en docs/PAZO_F14_A3_WORKER_REVIEW_20261009.md.

## A3.4e — verificadores de servicio limitados, 2026-10-09

- El worker servidor de PR #38 ahora inyecta `createA3ReadOnlyChecks()` mediante `adapter.ts` e `index.ts`. Se verifican exclusivamente **(1)** `worker_lease_valid` consultando `public.f14_a3_worker_validate_lease` con el token/versión exactos, y **(2)** `legacy_authorship_reconciled` consultando una RPC SQL borrador que solo devuelve true cuando la cuenta NO tiene ningún JSON de comentarios legacy sin reconciliar. No se acepta un valor `'true'`, `1`, error RPC ni evidencia de navegador.
- Séptima migración **NO_APLICADA** `supabase/drafts/20261009_f14_a3_worker_legacy_clear_NOT_APPLIED.sql`, con `BEGIN/DO RAISE EXCEPTION` intencional antes de DDL, `SECURITY DEFINER`, grants solo `service_role` y sin DML. Se probó la función **adaptada a pg_temp** con fixtures sintéticos y `ROLLBACK`: array vacío/SQL NULL/JSON null permitido; comentario JSON no vacío y objeto desconocido bloqueados; estado no reviewing y rol authenticated rechazados. Esto NO prueba permisos RPC aplicados de verdad.
- Las otras ocho verificaciones no tienen provider: el primer gate `recent_reauthentication` **se bloquea siempre**. No se puede completar una revisión ni borrar cuenta por este código. No activar `PAZO_A3_REVIEW_WORKER_ENABLED` ni `VITE_F14_A3_REQUESTS_ENABLED`.
- Supabase actual recomienda para llamadas servicio-a-servicio secret key con validación server `auth: 'secret'` y `verify_jwt=false` (https://supabase.com/docs/guides/functions/auth), mientras el borrador A3 conserva por defensa en profundidad `verify_jwt=true` y header interno `x-a3-worker-key`. **No desplegar sin reconciliar esta incompatibilidad de formatos y hacer pruebas reales de gateway con credenciales de servicio**. No degradar simplemente a `verify_jwt=false` sin configurar primero el autenticador oficial y probar denegaciones.
- CI código `151d48bb` [#38004703115](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38004703115) SUCCESS; SQL draft `01042a3d` [#38004748138](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38004748138) SUCCESS.
- Verificación posterior READ ONLY: 6 cuentas Auth, 6 mascotas, 20 objetos Storage; `f14_a3_request_deletion()` y `f14_a3_worker_legacy_clear(uuid)` siguen ausentes. Sin apply, merge, deploy, borrados ni gastos. A3 / Gate 8 ABIERTOS.
