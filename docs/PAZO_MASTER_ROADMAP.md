# PAZO — Hoja Maestra de Desarrollo

**Documento canónico del proyecto.**  
**Última actualización:** 2026-10-06  
**Estado general:** núcleo social, rescate y Comunidades estables hasta Fase 7; Fase 9A Agenda/Cuidados y Fase 9B Documentos privados están COMPLETADAS en `main`. Siguiente módulo: Fase 8 — Lugares, mapa y Check-ins.

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
- Mapa real.
- Check-ins.
- Mensajería 1 a 1.
- Centro general de notificaciones.
- Crear lugar.
- Crear comunidad.
- QR/rescate real en `main`.
- Alertas de mascota perdida reales en `main`.

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
**Estado: PLANIFICADA**

Existe `pet_places`, pero `MapView` todavía es placeholder.

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

### DECISIÓN PENDIENTE
Elegir proveedor/cartografía y reglas de ubicación:
- Mapbox / Google Maps / alternativa;
- GPS exacto vs ubicación aproximada;
- quién puede agregar lugares.

No activar ubicación precisa sin decisión explícita.

---

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

## Fase 12 — Explore/Search unificado
**Estado: PLANIFICADA**

### Objetivo
Que “Explorar” encuentre contenido real, no solo tarjetas mock.

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

### Alcance
- reportar contenido;
- reportar perfil;
- bloquear usuario/mascota;
- ocultar contenido;
- moderación;
- eliminación/cierre de cuenta;
- borrado de mascota;
- manejo de contenido eliminado;
- límites básicos contra spam;
- revisión final de datos públicos vs privados;
- política de archivos;
- auditoría de RLS completa.

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
- activar Leaked Password Protection;
- revisión de env/secrets;
- backups;
- logging/error monitoring;
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
- MapView es placeholder.
- comunidades son mock.
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

## Carril de Validación
### Comunidades
- **EXPERIMENTO ACTIVO**;
- no diseñar todavía roles/schema/feed/moderación;
- su sub-ruta canónica es `docs/PAZO_PHASE_7_COMMUNITIES_MASTER.md`;
- 7.0A APROBADA por Product Owner;
- autorizado preparar la infraestructura genérica mínima de validación con Comunidades como primer consumidor;
- no construir backend/roles/feed/moderación de Comunidades;
- siguiente trabajo: cerrar el diseño del experimento 7.0A:
  - qué promesa/hook mostrará la preview;
  - qué elementos conceptuales hacen entendible/atractivo el módulo;
  - qué significa exactamente `Me interesa`;
  - qué pregunta/opciones de intención necesitamos;
  - qué cuenta como view/revisita;
  - qué datos cambian la decisión BUILD NOW / MVP REDUCIDO / EXPERIMENTO ACTIVO / POSPUESTO;
- después de cerrar ese experimento, implementar **una sola infraestructura genérica** de tracking por cuenta;
- Comunidades será el primer consumidor.

### Mapa/Lugares
- su fake door actual no produce datos confiables con el schema real;
- no incluirlo todavía en el primer experimento de Comunidades;
- debe pasar su propia ficha/experimento antes de conectarse a la infraestructura genérica.

## Carril de Implementación
### 9A Agenda/Cuidados
- COMPLETADA;
- PR #12 fusionado a `main`.

### 9B Documentos privados
- COMPLETADA;
- backend y Storage privado aplicados;
- build, seguridad y prueba visual aprobados;
- PR #14 fusionado a `main`.

### Siguiente implementación
- no hay un módulo grande autorizado automáticamente;
- una vez cerrado el experimento 7.0A de Comunidades, la infraestructura genérica mínima de validación puede entrar como habilitador I;
- no programar Comunidades completa mientras siga en EXPERIMENTO ACTIVO.

## Regla
La numeración histórica de fases no bloquea los dos carriles. No iniciar el próximo módulo hasta cerrar sus gates correspondientes.
